#!/usr/bin/env python3
"""
Deep-scan METADATA-ONLY scraper for https://www.oldindianphotos.in/

Goal: collect metadata for ALL images (~7–8k) without downloading files.

How:
- Discover ALL posts via Blogger JSON feeds (500/page). Fallback to crawl if needed.
- For each post, fetch desktop HTML and mobile (?m=1).
- Extract image URLs aggressively via regex (not just <img>):
    * Any URLs ending with .jpg/.jpeg/.png/.webp/.gif
    * Any URLs on Blogger/Google image hosts (bp.blogspot.com, *.googleusercontent.com), even w/o extension
    * og:image / twitter:image meta, CSS url(...)
- Expand album links (Google Photos / Picasa / Flickr) by fetching album pages and regex-extracting direct image URLs.
- Canonicalize Blogger/Google image URLs to originals (/s0/ + imgmax=0).
- Dedupe globally across size variants and duplicates.
- Emit ONE JSON ARRAY file, one object PER IMAGE:
  { serial, post_url, post_title, post_date, labels, source, description,
    image_url, alt, caption, position_in_post, album_url }

Usage:
  python scrape_oldindianphotos_images_meta_deepscan.py -o oldindianphotos_images_meta.json
"""

import argparse, json, re, time, sys
from urllib.parse import urljoin, urlparse, urlunparse, parse_qsl, urlencode
import requests
from bs4 import BeautifulSoup
from tqdm import tqdm

BASE = "https://www.oldindianphotos.in/"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; old-india-photos-meta/1.0)"}

# File extensions we consider images
IMG_EXT_RE = re.compile(r'\.(?:jpg|jpeg|png|webp|gif)(?:\?[^"\']*)?$', re.I)

# Hosts that often serve Blogger/Google images (sometimes without extensions)
BLOGGER_HOSTS = {
    "bp.blogspot.com",
    "1.bp.blogspot.com", "2.bp.blogspot.com", "3.bp.blogspot.com", "4.bp.blogspot.com",
    "blogger.googleusercontent.com",
    "lh3.googleusercontent.com", "lh4.googleusercontent.com", "lh5.googleusercontent.com", "lh6.googleusercontent.com",
}

# Album/galleries we attempt to expand
ALBUM_HOST_HINTS = (
    "photos.google.com", "photos.app.goo.gl", "picasaweb.google.com",
    "plus.google.com", "flickr.com"
)

# HTTP session with mild retries
def make_session():
    s = requests.Session()
    s.headers.update(HEADERS)
    adapter = requests.adapters.HTTPAdapter(max_retries=3, pool_connections=30, pool_maxsize=30)
    s.mount("http://", adapter)
    s.mount("https://", adapter)
    return s

SESSION = make_session()

def fetch(url, expect_json=False, timeout=35, backoff=3):
    """GET with light retry/backoff."""
    for i in range(backoff):
        try:
            r = SESSION.get(url, timeout=timeout)
            if r.status_code in (429, 500, 502, 503, 504):
                time.sleep(0.7 * (i + 1)); continue
            r.raise_for_status()
            return r.json() if expect_json else r.text
        except Exception:
            time.sleep(0.5 * (i + 1))
    raise RuntimeError(f"Failed to fetch: {url}")

def normalize_page_url(u: str) -> str:
    p = urlparse(u)
    return urlunparse((p.scheme, p.netloc, p.path, "", "", ""))

def blogger_best(u: str) -> str:
    """Normalize Blogger/Google image URL to original (try /s0 + ?imgmax=0)."""
    if not u:
        return u
    # Fix some encoded URLs inside CSS url("...") etc.
    u = u.strip().strip('\'"')
    # Upgrade known size segments to /s0/
    u2 = re.sub(r'/s\d+/', '/s0/', u)
    u2 = re.sub(r'/w\d+-h\d+(-p)?/', '/s0/', u2)
    p = urlparse(u2)
    if p.netloc in BLOGGER_HOSTS:
        qs = dict(parse_qsl(p.query))
        if "imgmax" not in qs:
            qs["imgmax"] = "0"
        u2 = urlunparse(p._replace(query=urlencode(qs)))
    return u2

# ----------------- Discovery -----------------

def discover_posts_via_feed():
    urls = []
    start = 1
    page_size = 500
    while True:
        feed_url = f"{BASE}feeds/posts/default?alt=json&max-results={page_size}&start-index={start}"
        try:
            data = fetch(feed_url, expect_json=True)
        except Exception:
            break
        entries = data.get("feed", {}).get("entry", [])
        if not entries:
            break
        for e in entries:
            links = e.get("link", []) or []
            perm = next((l.get("href") for l in links if l.get("rel") == "alternate"), None)
            if perm:
                urls.append(normalize_page_url(perm))
        start += page_size
        time.sleep(0.25)
    # Dedupe preserve order
    seen, ordered = set(), []
    for u in urls:
        if u not in seen:
            seen.add(u); ordered.append(u)
    return ordered

def discover_posts_via_crawl():
    seen = set(); to_visit = [BASE]; posts = []
    pagelink_re = re.compile(r"(Older Posts|Older|Next|Newer)", re.I)
    while to_visit:
        page = to_visit.pop(0)
        try:
            html = fetch(page)
        except Exception:
            continue
        soup = BeautifulSoup(html, "html5lib")
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if re.search(r"/\d{4}/\d{2}/.+\.html$", href):
                u = normalize_page_url(urljoin(page, href))
                if u not in seen:
                    seen.add(u); posts.append(u)
        older = soup.find("a", string=pagelink_re)
        if older and older.get("href"):
            nxt = normalize_page_url(urljoin(page, older["href"]))
            if nxt not in to_visit:
                to_visit.append(nxt)
        time.sleep(0.05)
    return posts

def discover_all_posts():
    urls = discover_posts_via_feed()
    if not urls:
        urls = discover_posts_via_crawl()
    return urls

# ----------------- Post metadata -----------------

def extract_post_metadata(soup):
    """title, date, labels, source, description (clean text)."""
    title_el = (soup.find(["h1","h2","h3"], class_=re.compile("post-title|entry-title", re.I))
                or soup.find(["h1","h2","h3"]))
    title = title_el.get_text(strip=True) if title_el else ""

    date_text = ""
    date_el = soup.find(class_=re.compile("date", re.I)) or soup.find(string=re.compile(r"\b\d{4}\b"))
    if date_el:
        date_text = date_el.get_text(strip=True) if hasattr(date_el, "get_text") else str(date_el).strip()

    labels = []
    label_container = soup.find("span", class_=re.compile("label", re.I))
    if not label_container:
        lbl = soup.find(string=re.compile(r"Labels?:", re.I))
        if lbl: label_container = lbl.parent
    if label_container:
        labels = [a.get_text(strip=True) for a in label_container.find_all("a")]

    source = ""
    for key in ("Source:", "Credit:"):
        el = soup.find(string=re.compile(rf"^{key}", re.I))
        if el:
            parent = el.parent
            source = parent.get_text(" ", strip=True) if parent else el.strip()
            break

    post_body = (soup.find("div", class_=re.compile("post-body|entry-content", re.I))
                 or soup.find("article")
                 or soup.find("div", id=re.compile("content", re.I)))
    description = ""
    if post_body:
        for tag in post_body.find_all(["script","style"]):
            tag.decompose()
        for lbl in post_body.find_all(string=re.compile("Labels?:|Source:|Credit:", re.I)):
            if lbl.parent: lbl.parent.decompose()
        description = post_body.get_text(" ", strip=True)

    return title, date_text, labels, source, description, (post_body or soup)

# ----------------- Image URL extraction -----------------

def extract_all_image_urls_from_raw_html(raw_html):
    """
    Aggressive regex-based collector:
      - <img ... src=...>, srcset URLs
      - og:image / twitter:image meta
      - CSS url(...)
      - any <a href="..."> pointing to an image or Blogger/Google image host
      - any absolute URL ending with image extensions
    """
    urls = set()

    # <img ...> src / data-* (quick regex scan)
    for m in re.finditer(r'<img[^>]+(?:src|data-src|data-original|data-lazy-src)=["\']([^"\']+)["\']', raw_html, re.I):
        urls.add(m.group(1))

    # srcset candidates
    for m in re.finditer(r'srcset=["\']([^"\']+)["\']', raw_html, re.I):
        for part in m.group(1).split(","):
            u = part.strip().split(" ")[0]
            if u: urls.add(u)

    # og:image / twitter:image
    for m in re.finditer(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', raw_html, re.I):
        urls.add(m.group(1))
    for m in re.finditer(r'<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)["\']', raw_html, re.I):
        urls.add(m.group(1))

    # CSS url(...)
    for m in re.finditer(r'url\(([^)]+)\)', raw_html, re.I):
        u = m.group(1).strip(' "\'')
        if u and not u.startswith("data:"):
            urls.add(u)

    # <a href="...">
    for m in re.finditer(r'<a[^>]+href=["\']([^"\']+)["\']', raw_html, re.I):
        u = m.group(1)
        urls.add(u)

    # Filter: keep absolute URLs that are either images by ext OR from Blogger hosts
    canon = []
    seen = set()
    for u in urls:
        if not u:
            continue
        # Make absolute if protocol-relative
        if u.startswith("//"):
            u = "https:" + u
        # We only trust http(s)
        if not u.startswith("http"):
            continue
        host = urlparse(u).netloc
        if host in BLOGGER_HOSTS or IMG_EXT_RE.search(u):
            bu = blogger_best(u)
            if bu not in seen:
                seen.add(bu); canon.append(bu)

    return canon

def extract_album_links(soup, base_url):
    """Find outbound album/gallery links we should expand."""
    out = []
    for a in soup.find_all("a", href=True):
        href = urljoin(base_url, a["href"])
        host = urlparse(href).netloc
        if any(h in host for h in ALBUM_HOST_HINTS):
            out.append(href)
    # dedupe
    seen, ordered = set(), []
    for u in out:
        if u not in seen:
            seen.add(u); ordered.append(u)
    return ordered

def extract_album_images(album_url):
    """Fetch public album page and regex-extract direct image URLs."""
    try:
        raw = fetch(album_url, expect_json=False, timeout=45)
    except Exception:
        return []
    urls = set()

    # Direct image extensions
    for m in re.finditer(r'https?://[^"\']+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^"\']*)?', raw, re.I):
        urls.add(m.group(0))

    # Blogger/Google image hosts (may not have extension)
    for m in re.finditer(r'https?://(?:[0-9]\.)?bp\.blogspot\.com/[^"\']+', raw, re.I):
        urls.add(m.group(0))
    for m in re.finditer(r'https?://(?:lh[3-6]|blogger)\.googleusercontent\.com/[^"\']+', raw, re.I):
        urls.add(m.group(0))

    # Flickr static images
    for m in re.finditer(r'https?://live\.staticflickr\.com/[^"\']+\.(?:jpg|jpeg|png|webp|gif)', raw, re.I):
        urls.add(m.group(0))

    # Normalize & dedupe
    canon = []
    seen = set()
    for u in sorted((blogger_best(u) for u in urls), key=len):
        if u not in seen:
            seen.add(u); canon.append(u)
    return canon

# ----------------- Per-post processing -----------------

def process_post(post_url, post_delay=0.25):
    """Return dict with post metadata and list of canonical image URLs (deep scan)."""
    html = fetch(post_url)
    soup = BeautifulSoup(html, "html5lib")

    title, date_text, labels, source, description, content_root = extract_post_metadata(soup)

    # Collect from desktop raw HTML
    candidates = extract_all_image_urls_from_raw_html(html)

    # Collect from mobile variant (?m=1) which often has simpler markup
    try:
        m_html = fetch(post_url + "?m=1")
        candidates += extract_all_image_urls_from_raw_html(m_html)
    except Exception:
        pass

    # Album expansion (Google Photos / Picasa / Flickr)
    album_links = extract_album_links(soup, post_url)
    expanded = []
    for au in album_links:
        expanded += extract_album_images(au)
    candidates += expanded

    # Per-post dedupe preserve order
    seen, ordered = set(), []
    for u in candidates:
        if u not in seen:
            seen.add(u); ordered.append(u)

    # Light heuristic for alt/caption/position (best-effort, optional)
    # We won't try to map every URL back to an <img> (deep-scan uses regex),
    # but we will assign a simple position index.
    images = []
    for i, u in enumerate(ordered, start=1):
        images.append({
            "image_url": u,
            "alt": "",
            "caption": "",
            "position_in_post": i,
            "album_url": None
        })
    # Mark album source for known expanded URLs
    album_set = set(expanded)
    if album_set:
        for im in images:
            if im["image_url"] in album_set:
                im["album_url"] = album_links[0] if album_links else None

    time.sleep(post_delay)
    return {
        "post_url": normalize_page_url(post_url),
        "post_title": title,
        "post_date": date_text,
        "labels": labels,
        "source": source,
        "description": description,
        "images": images,
    }

# ----------------- Main -----------------

def main():
    ap = argparse.ArgumentParser(description="Deep-scan metadata-only scraper for oldindianphotos.in")
    ap.add_argument("-o","--out", default="oldindianphotos_images_meta.json", help="Output JSON (single array, one object per IMAGE)")
    ap.add_argument("--limit-posts", type=int, default=0, help="Limit posts (0=all)")
    ap.add_argument("--post-delay", type=float, default=0.25, help="Delay between post fetches")
    args = ap.parse_args()

    print("Discovering posts via Blogger feeds…")
    posts = discover_all_posts()
    print(f"Found {len(posts)} posts")
    if args.limit_posts > 0:
        posts = posts[:args.limit_posts]
        print(f"Limiting to first {len(posts)} posts")

    # Iterate posts and emit a flat list: one dict per image
    all_images = []
    global_seen = set()  # dedupe globally by canonical URL
    serial = 0

    for p_url in tqdm(posts, desc="Deep-scanning posts"):
        try:
            info = process_post(p_url, post_delay=args.post_delay)
        except Exception:
            # On failure, continue to next post
            continue

        # Flatten images to one object per image with post metadata
        for im in info["images"]:
            url_can = blogger_best(im["image_url"])
            if url_can in global_seen:
                continue
            global_seen.add(url_can)
            serial += 1
            all_images.append({
                "serial": serial,
                "post_url": info["post_url"],
                "post_title": info["post_title"],
                "post_date": info["post_date"],
                "labels": info["labels"],
                "source": info["source"],
                "description": info["description"],
                "image_url": url_can,
                "alt": im.get("alt", ""),
                "caption": im.get("caption", ""),
                "position_in_post": im.get("position_in_post"),
                "album_url": im.get("album_url"),
            })

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(all_images, f, ensure_ascii=False, indent=2)

    print("—" * 60)
    print(f"✅ Saved: {args.out}")
    print(f"🧮 Posts scanned: {len(posts)} | Images (unique): {len(all_images)}")

if __name__ == "__main__":
    main()
