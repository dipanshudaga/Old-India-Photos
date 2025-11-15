#!/usr/bin/env python3
"""
v2 — Merge oldindianphotos_images_meta.json (per-image metadata) into index.json (site index).

Improvements vs v1:
- tqdm progress bars.
- 'Part' awareness: Part I/II/III/IV (roman & digits) extracted from index folder/title and post_title,
  used for scoring bonus and image position tie-breaks.
- Synonym map for places/terms (Bombay↔Mumbai, Calcutta↔Kolkata, etc.).
- Decade mapping: exact years in index get mapped to a decade tag (1911 -> '1910s') for label/overlap boosts.
- Optional overrides.csv to force a post_url (and optional image_pos) for stubborn rows.
- Stronger weighting for date/labels, improved image tie-break.

Outputs:
  - index.merged.json
  - merge_review.csv
  - merge_report.txt

Usage:
  pip install tqdm
  python merge_feed_to_index_v2.py \
      --index site/index/index.json \
      --meta oldindianphotos_images_meta.json \
      --out site/index/index.merged.json \
      --overrides overrides.csv
"""

import json, re, csv, sys, math
from pathlib import Path
from difflib import SequenceMatcher
from collections import defaultdict
from urllib.parse import urlparse
from typing import Dict, Any, List, Tuple, Optional
from tqdm import tqdm
import argparse

# ---------- CLI ----------
ap = argparse.ArgumentParser()
ap.add_argument("--index", default="site/index.json")
ap.add_argument("--meta", default="oldindianphotos_images_meta.json")
ap.add_argument("--out", default="site/index/index.merged.json")
ap.add_argument("--review", default="merge_review.csv")
ap.add_argument("--report", default="merge_report.txt")
ap.add_argument("--overrides", default=None, help="CSV with folder,title,post_url,image_pos (optional)")
ap.add_argument("--post-threshold", type=float, default=0.50, help="Min score to accept a post match")
ap.add_argument("--img-threshold", type=float, default=0.32, help="Min score to accept an image within a matched post")
args = ap.parse_args()

INDEX_PATH = Path(args.index)
META_PATH = Path(args.meta)
OUT_PATH = Path(args.out)
REVIEW_PATH = Path(args.review)
REPORT_PATH = Path(args.report)
OVERRIDES_PATH = Path(args.overrides) if args.overrides else None

if not INDEX_PATH.exists():
    sys.exit(f"index not found: {INDEX_PATH}")
if not META_PATH.exists():
    sys.exit(f"meta not found: {META_PATH}")
if OVERRIDES_PATH and not OVERRIDES_PATH.exists():
    sys.exit(f"overrides not found: {OVERRIDES_PATH}")

# ---------- constants & helpers ----------
ALLOWED_HOSTS = {
    "bp.blogspot.com","1.bp.blogspot.com","2.bp.blogspot.com","3.bp.blogspot.com","4.bp.blogspot.com",
    "blogger.googleusercontent.com",
    "lh3.googleusercontent.com","lh4.googleusercontent.com","lh5.googleusercontent.com","lh6.googleusercontent.com",
    "live.staticflickr.com"
}
IMG_EXT_RE = re.compile(r'\.(jpg|jpeg|png|webp|gif)(?:\?|$)', re.I)

# Place/term synonyms (extend as needed)
SYNONYMS = {
    "bombay": "mumbai",
    "calcutta": "kolkata",
    "benaras": "varanasi",
    "benares": "varanasi",
    "poona": "pune",
    "madras": "chennai",
    "baroda": "vadodara",
    "cawnpore": "kanpur",
    "trivandrum": "thiruvananthapuram",
    "travancore": "kerala",
    "mysore": "mysuru",
    "banaras": "varanasi",
    # common alternates
    "hindu": "indian",
    "hindustan": "india",
}

ROMAN_MAP = {"i":1,"ii":2,"iii":3,"iv":4,"v":5,"vi":6,"vii":7,"viii":8,"ix":9,"x":10}

def normalize(s: Optional[str]) -> str:
    return re.sub(r"\s+"," ",(s or "").strip())

def only_ascii(s: str) -> str:
    return re.sub(r"[^\x20-\x7E]+"," ",s or "")

def apply_synonyms_tokenwise(text: str) -> str:
    toks = re.sub(r"[^a-z0-9\s]"," ", text.lower()).split()
    out = [SYNONYMS.get(t, t) for t in toks]
    return " ".join(out)

def slugify(text: str) -> str:
    s = normalize(text).lower()
    # Keep "part" tokens; v1 removed them which hurt matching
    s = re.sub(r"^\d{4}-\d{2}-\d{2}\s+", "", s)  # drop leading date in folder
    s = re.sub(r"[^a-z0-9\s]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    s = apply_synonyms_tokenwise(s)
    return s

def tokens(s: str) -> List[str]:
    return [t for t in re.sub(r"[^a-z0-9\s]"," ", s.lower()).split() if len(t)>2]

def jaccard(a: str, b: str) -> float:
    A,B=set(tokens(a)), set(tokens(b))
    if not A or not B: return 0.0
    return len(A&B)/len(A|B)

def fuzzy(a: str, b: str) -> float:
    return SequenceMatcher(None, normalize(a).lower(), normalize(b).lower()).ratio()

def extract_part_number(text: str) -> Optional[int]:
    """Find Part indicators: 'Part 3', 'Part - III', '(Part II)' etc."""
    s = text.lower()
    m = re.search(r'\bpart\b\s*[-:]?\s*(\d{1,2})\b', s)
    if m:
        try: return int(m.group(1))
        except: pass
    m = re.search(r'\bpart\b\s*[-:]?\s*(i|ii|iii|iv|v|vi|vii|viii|ix|x)\b', s)
    if m:
        return ROMAN_MAP.get(m.group(1), None)
    return None

def extract_year_month_from_post_url(u: str) -> Tuple[Optional[str], Optional[str]]:
    m = re.search(r"/(\d{4})/(\d{2})/", u)
    return (m.group(1), m.group(2)) if m else (None, None)

def year_month_from_index_date(d: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    # expects "YYYY-MM-DD"
    if not d or not re.match(r"\d{4}-\d{2}-\d{2}", d): return (None,None)
    return d[:4], d[5:7]

def decade_tag(year: Optional[str]) -> Optional[str]:
    if not year or not re.match(r"^\d{4}$", year): return None
    return f"{year[:3]}0s"

def number_from_orig_filename(s: Optional[str]) -> Optional[int]:
    m = re.search(r"(\d{1,3})\.(?:jpg|jpeg|png|webp|gif)$", (s or "").lower())
    return int(m.group(1)) if m else None

def filename_tokens_from_path(p: str) -> List[str]:
    base = Path(p).name
    base = re.sub(r"\.(jpg|jpeg|png|webp|gif)$","", base, flags=re.I)
    return tokens(base)

def host_ok(u: str) -> bool:
    try:
        h = urlparse(u).netloc
        if h in ALLOWED_HOSTS: return True
        if IMG_EXT_RE.search(u): return True
        return False
    except Exception:
        return False

def prefer_original(u: str) -> float:
    # Prefer /s0 & ?imgmax=0
    s = 0.0
    if "/s0/" in u: s += 0.2
    if "imgmax=0" in u: s += 0.2
    return s

# ---------- load data ----------
index: List[Dict[str,Any]] = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
meta: List[Dict[str,Any]]  = json.loads(META_PATH.read_text(encoding="utf-8"))

# overrides: map (folder,title) -> {post_url, image_pos?}
overrides = {}
if OVERRIDES_PATH:
    with OVERRIDES_PATH.open("r", encoding="utf-8") as f:
        r = csv.DictReader(f)
        for row in r:
            key = (normalize(row.get("folder","")), normalize(row.get("title","")))
            ov = {"post_url": normalize(row.get("post_url","")), "image_pos": None}
            try:
                if row.get("image_pos"):
                    ov["image_pos"] = int(row["image_pos"])
            except:
                pass
            overrides[key] = ov

# group meta by post_url
from collections import defaultdict
post_map: Dict[str, Dict[str,Any]] = defaultdict(lambda: {
    "post_title":"", "post_date":"", "labels":[], "source":"", "description":"", "images":[]
})

for row in meta:
    u = row.get("image_url")
    if not u or not host_ok(u):  # filter junk
        continue
    pu = normalize(row.get("post_url",""))
    post = post_map[pu]
    if not post["post_title"]:     post["post_title"] = normalize(row.get("post_title",""))
    if not post["post_date"]:      post["post_date"] = normalize(row.get("post_date",""))
    if not post["labels"]:         post["labels"] = row.get("labels") or []
    if not post["source"]:         post["source"] = normalize(row.get("source",""))
    if not post["description"]:    post["description"] = normalize(row.get("description",""))
    post["images"].append({
        "url": u,
        "alt": row.get("alt",""),
        "caption": row.get("caption",""),
        "pos": int(row.get("position_in_post") or 0)
    })

# order images by pos for stability
for p in post_map.values():
    p["images"].sort(key=lambda x: (x["pos"] if x["pos"] else 999999, x["url"]))

# compile list of posts with features
posts: List[Dict[str,Any]] = []
for pu, p in post_map.items():
    y, m = extract_year_month_from_post_url(pu)
    posts.append({
        "post_url": pu,
        "post_title": p["post_title"],
        "post_slug": slugify(p["post_title"]),
        "post_date": p["post_date"],
        "post_y": y, "post_m": m,
        "post_decade": decade_tag(y) if y else None,
        "labels": [apply_synonyms_tokenwise(l) for l in (p["labels"] or [])],
        "source": p["source"],
        "description": p["description"],
        "images": p["images"],
        "post_part": extract_part_number(p["post_title"])
    })

# ---------- scoring ----------
def post_score(index_row: Dict[str,Any], cand: Dict[str,Any]) -> Tuple[float, Dict[str,float]]:
    idx_folder = slugify(index_row.get("folder",""))
    idx_title  = slugify(index_row.get("title",""))
    # strongest of two
    jac = max(jaccard(idx_folder, cand["post_title"]),
              jaccard(idx_title,  cand["post_title"]))
    fuz = max(fuzzy(idx_folder,  cand["post_title"]),
              fuzzy(idx_title,   cand["post_title"]))

    # date boost
    iy, im = year_month_from_index_date(index_row.get("date"))
    dy = 0.0
    if iy and cand["post_y"] and iy == cand["post_y"]:
        dy += 0.10
        if im and cand["post_m"] and im == cand["post_m"]:
            dy += 0.05

    # decade overlap (if index year maps to decade and post labels have decade tokens)
    dec = decade_tag(iy) if iy else None
    dboost = 0.0
    if dec and (dec in " ".join(cand["labels"]).lower() or (cand["post_decade"] and cand["post_decade"] == dec)):
        dboost = 0.06

    # label overlap with synonyms
    idx_tags = [apply_synonyms_tokenwise(t) for t in (index_row.get("tags") or [])]
    lab = cand["labels"]
    lob = 0.0
    if idx_tags and lab:
        inter = len(set(idx_tags) & set(lab))
        if inter:
            lob = min(0.10 + 0.03*inter, 0.20)

    # Part matching bonus
    idx_part = extract_part_number(index_row.get("folder","") + " " + (index_row.get("title","") or ""))
    pbonus = 0.0
    if idx_part and cand["post_part"] and idx_part == cand["post_part"]:
        pbonus = 0.10

    # blend
    score = (0.45*jac) + (0.35*fuz) + dy + dboost + lob + pbonus
    return score, {"jac":jac,"fuz":fuz,"dy":dy,"dboost":dboost,"lob":lob,"pbonus":pbonus}

def image_score(index_row: Dict[str,Any], image: Dict[str,Any], guessed_pos: Optional[int]) -> float:
    s = 0.0
    # position match
    if image["pos"] and guessed_pos and image["pos"] == guessed_pos:
        s += 0.58
    elif image["pos"] and guessed_pos:
        dist = abs(image["pos"] - guessed_pos)
        s += max(0.0, 0.46 - 0.09*dist)

    # filename token overlap
    idx_file_tokens = filename_tokens_from_path(index_row.get("file","") or "")
    img_file_tokens = filename_tokens_from_path(urlparse(image["url"]).path)
    if idx_file_tokens and img_file_tokens:
        inter = len(set(idx_file_tokens) & set(img_file_tokens))
        if inter:
            s += min(0.36, 0.18 + 0.10*inter)

    # prefer originals
    s += prefer_original(image["url"])
    return s

# ---------- merge ----------
merged: List[Dict[str,Any]] = []
review_rows: List[Dict[str,Any]] = []
matched = 0
unmatched = 0

print(f"🔍 Matching {len(index)} index entries against {len(posts)} posts…")
for item in tqdm(index, desc="Merging", unit="rows"):
    # Overrides?
    key = (normalize(item.get("folder","")), normalize(item.get("title","")))
    if key in overrides and overrides[key].get("post_url"):
        # forced mapping
        forced_url = overrides[key]["post_url"]
        forced_pos = overrides[key].get("image_pos")

        # find post in our map
        cand = next((p for p in posts if p["post_url"] == forced_url), None)
        if not cand:
            # write as review if override refers to unknown post
            out = dict(item); out.update({
                "image_url": None, "post_url": forced_url, "post_title": None,
                "post_labels": None, "post_source": None, "post_description": None,
                "match_confidence": 0.0
            })
            merged.append(out); unmatched += 1
            review_rows.append({
                "id": item.get("id"),
                "folder": item.get("folder"),
                "title": item.get("title"),
                "date": item.get("date"),
                "reason": "override_post_not_found",
                "post_url_suggested": forced_url
            })
            continue

        # choose image in that post
        best_img = None
        best_score = -1.0
        guessed_pos = forced_pos or number_from_orig_filename(item.get("orig_filename"))
        for im in cand["images"]:
            sc = image_score(item, im, guessed_pos)
            if sc > best_score:
                best_img, best_score = im, sc

        out = dict(item)
        out.update({
            "image_url": (best_img["url"] if best_img else None),
            "post_url": cand["post_url"],
            "post_title": cand["post_title"],
            "post_labels": cand["labels"],
            "post_source": cand["source"],
            "post_description": cand["description"],
            "match_confidence": 1.0 if best_img else 0.8
        })
        merged.append(out)
        matched += 1 if best_img else 0
        if not best_img:
            review_rows.append({
                "id": item.get("id"),
                "folder": item.get("folder"),
                "title": item.get("title"),
                "date": item.get("date"),
                "reason": "override_post_found_but_no_image",
                "post_url_suggested": cand["post_url"]
            })
        continue

    # Normal flow: score all posts and pick best
    best_post = None
    best_p_score = -1.0
    best_dbg = {}

    for cand in posts:
        sc, dbg = post_score(item, cand)
        if sc > best_p_score:
            best_post, best_p_score, best_dbg = cand, sc, dbg

    # below threshold → review
    if not best_post or best_p_score < args.post_threshold:
        out = dict(item)
        out.update({
            "image_url": None, "post_url": None, "post_title": None,
            "post_labels": None, "post_source": None, "post_description": None,
            "match_confidence": round(best_p_score,4)
        })
        merged.append(out)
        unmatched += 1
        review_rows.append({
            "id": item.get("id"),
            "folder": item.get("folder"),
            "title": item.get("title"),
            "date": item.get("date"),
            "reason": "post_low_confidence",
            "post_score": f"{best_p_score:.3f}",
            "post_title_suggested": best_post["post_title"] if best_post else "",
            "post_url_suggested": best_post["post_url"] if best_post else ""
        })
        continue

    # choose image within post
    guessed_pos = number_from_orig_filename(item.get("orig_filename"))
    best_img = None
    best_i_score = -1.0
    for im in best_post["images"]:
        sc = image_score(item, im, guessed_pos)
        if sc > best_i_score:
            best_img, best_i_score = im, sc

    if not best_img or best_i_score < args.img_threshold:
        out = dict(item)
        out.update({
            "image_url": None,
            "post_url": best_post["post_url"],
            "post_title": best_post["post_title"],
            "post_labels": best_post["labels"],
            "post_source": best_post["source"],
            "post_description": best_post["description"],
            "match_confidence": round(best_p_score,4)
        })
        merged.append(out)
        unmatched += 1
        review_rows.append({
            "id": item.get("id"),
            "folder": item.get("folder"),
            "title": item.get("title"),
            "date": item.get("date"),
            "reason": "image_low_confidence",
            "post_score": f"{best_p_score:.3f}",
            "img_score": f"{best_i_score:.3f}",
            "post_title_suggested": best_post["post_title"],
            "post_url_suggested": best_post["post_url"]
        })
        continue

    # success
    out = dict(item)
    out.update({
        "image_url": best_img["url"],
        "post_url": best_post["post_url"],
        "post_title": best_post["post_title"],
        "post_labels": best_post["labels"],
        "post_source": best_post["source"],
        "post_description": best_post["description"],
        "match_confidence": round(min(1.0, (best_p_score*0.65 + best_i_score*0.35)),4)
    })
    merged.append(out)
    matched += 1

# ---------- write outputs ----------
OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
OUT_PATH.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")

with REVIEW_PATH.open("w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=[
        "id","folder","title","date","reason","post_score","img_score","post_title_suggested","post_url_suggested"
    ])
    w.writeheader()
    for r in review_rows:
        if "post_score" not in r: r["post_score"] = ""
        if "img_score" not in r: r["img_score"] = ""
        w.writerow(r)

REPORT_PATH.write_text(
    "\n".join([
        f"Index rows: {len(index)}",
        f"Posts discovered in meta: {len(posts)}",
        f"Matched: {matched}",
        f"Needs review: {unmatched}",
        f"Post threshold: {args.post_threshold}",
        f"Image threshold: {args.img_threshold}",
    ]) + "\n",
    encoding="utf-8"
)

print(f"✅ Wrote {OUT_PATH}")
print(f"📝 Review CSV: {REVIEW_PATH}")
print(f"📊 Report: {REPORT_PATH}")
