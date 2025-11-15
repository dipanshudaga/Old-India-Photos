#!/usr/bin/env python3
# process_images.py — streamlined, default paths, smart title/year/tag extraction
from pathlib import Path
import os, re, json, shutil, sys
from PIL import Image, UnidentifiedImageError
from tqdm import tqdm

# ===== CONFIG (defaults) =====
INPUT_ROOT = Path("/Users/dipanshudaga/My Projects/Scraped Photos").expanduser().resolve()
OUT_ROOT = Path("site").resolve()
IMAGE_DIR = OUT_ROOT / "images"
THUMB_DIR = OUT_ROOT / "thumbs"
THUMB_MAX = 400
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}
OVERWRITE = True
LIMIT = 0  # 0 = all

# ===== KeyBERT if available =====
try:
    from keybert import KeyBERT
    KB_MODEL = KeyBERT(model='all-MiniLM-L6-v2')
    KB_AVAILABLE = True
except Exception:
    KB_MODEL = None
    KB_AVAILABLE = False

# ===== regex helpers =====
date_prefix_re = re.compile(r'^\s*(?P<date>\d{4}-\d{2}-\d{2})\s+(?P<title>.+)$')
# detect trailing year tokens (e.g., 1865 or 1860s)
year_end_re = re.compile(r'(?P<title>.+?)\s+(\(?)(?P<year>1[6-9]\d{2}|18\d{2}|19\d{2}|20\d{2}|\d{3,4}s)(\)?)\s*$', re.IGNORECASE)
# detect year anywhere (c1860s, c.1860s, 1865, 1860s)
_YEAR_RE = re.compile(r'(?i)\b(?:c\.?\s*)?(?P<yr>(?:\d{4}|\d{3,4}s))\b')

_STOPWORDS = {
    'the','and','for','from','with','that','this','there','their',
    'a','an','in','on','of','to','by','as','at','is','are','was','were','be','been',
    'circa','photo','photos','photograph','photographs','various','albumen','c','century',
    'india','indian','part'
}

# ===== title/year/tag functions =====
def extract_year_anywhere(text):
    if not text:
        return None
    m = _YEAR_RE.search(text)
    if not m:
        return None
    yr = m.group('yr').lower()
    return yr

def clean_title(foldername: str):
    s = foldername.strip()
    date = None
    mdate = re.match(r'^\s*(\d{4}-\d{2}-\d{2})\s+(.*)$', s)
    if mdate:
        date = mdate.group(1); s = mdate.group(2).strip()
    year_found = extract_year_anywhere(s)
    if not year_found:
        m2 = re.search(r'\(?\b(1[6-9]\d{2}|18\d{2}|19\d{2}|20\d{2}|\d{3,4}s)\b\)?\s*$', s, re.IGNORECASE)
        if m2:
            year_found = m2.group(1).lower()
    if year_found:
        s = re.sub(r'[\s,:\-]*\(?\b' + re.escape(year_found) + r'\b\)?\s*$', '', s, flags=re.IGNORECASE)
    s = re.sub(r'[\-\–\—\:\;\,\_]+$','', s).strip()
    s = re.sub(r'\s+', ' ', s).strip()
    return s, date, year_found

def slug_for_folder_keep_part(foldername: str):
    s = foldername.strip()
    m = date_prefix_re.match(s)
    if m:
        s = m.group("title").strip()
    s = re.sub(r'\s+\(?\d{4}\)?\s*$', '', s).strip()
    s = re.sub(r'[^A-Za-z0-9\s\-]', '', s).strip().lower()
    s = re.sub(r'[\s\-]+', '_', s)
    return s or "untitled"

def display_title_strip_part(title_text: str, year_text: str):
    s = (title_text or "").strip()
    s = re.sub(r'(?i)\bpart[\s_-]*[ivx\d]+\b', '', s)
    s = re.sub(r'(?i)\bpart\b', '', s)
    s = re.sub(r'\s+', ' ', s).strip()
    s = re.sub(r'[\-\–\—\:\;\,\_]+$','', s).strip()
    if year_text:
        s = f"{s} {year_text}".strip()
    return s

def heuristic_tags(title, max_tags=6):
    if not title: return []
    s = re.sub(r'\(.*?\)', ' ', title)
    s = re.sub(r'[^A-Za-z0-9\s\-]', ' ', s)
    tokens=[]
    for token in re.split(r'[\s\-/|,]+', s):
        t = token.strip()
        if not t: continue
        low = t.lower()
        if re.fullmatch(r'\d{3,4}s?|\d{2,4}s?', low): continue
        if low in _STOPWORDS or len(low)<=3: continue
        if low.endswith('s') and len(low)>4: low = low[:-1]
        tokens.append(low)
    seen=set(); out=[]
    for p in tokens:
        if p not in seen:
            seen.add(p); out.append(p)
            if len(out)>=max_tags: break
    return out

def smart_tags_keybert(title, max_tags=6):
    if not title or KB_MODEL is None:
        return heuristic_tags(title, max_tags)
    kw = KB_MODEL.extract_keywords(title, keyphrase_ngram_range=(1,2), stop_words='english', top_n=max_tags)
    tags=[]
    for word,score in kw:
        clean_word = re.sub(r'[^A-Za-z0-9\s\-]', '', word).strip().lower()
        if clean_word and clean_word not in _STOPWORDS and len(clean_word)>2:
            tags.append(clean_word)
    return list(dict.fromkeys(tags))[:max_tags]

def filter_tags_remove_part(tags_list):
    return [t for t in (tags_list or []) if not re.match(r'(?i)^part[\divx\-]*$', t)]

# ===== prepare output dirs =====
if not INPUT_ROOT.exists() or not INPUT_ROOT.is_dir():
    sys.exit(1)

if OVERWRITE and OUT_ROOT.exists():
    shutil.rmtree(OUT_ROOT)
OUT_ROOT.mkdir(parents=True, exist_ok=True)
IMAGE_DIR.mkdir(parents=True, exist_ok=True)
THUMB_DIR.mkdir(parents=True, exist_ok=True)

# ===== main processing =====
folders = sorted([d for d in INPUT_ROOT.iterdir() if d.is_dir()])
index=[]; global_id=0

for folder in tqdm(folders, desc="folders", unit="f"):
    folder_name = folder.name
    title_raw, date, year = clean_title(folder_name)
    display_title_base = display_title_strip_part(title_raw, year)
    tags_raw = (smart_tags_keybert(title_raw) if KB_AVAILABLE else heuristic_tags(title_raw))
    tags_filtered = filter_tags_remove_part(tags_raw)
    # include year as tag if present and not already
    if year:
        y_norm = year.lower()
        if y_norm not in tags_filtered:
            tags_filtered.insert(0, y_norm)

    files = sorted([p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in ALLOWED_EXT])
    if not files: continue

    for p in files:
        global_id += 1
        orig_fname = p.name
        post_slug = slug_for_folder_keep_part(folder_name)
        image_name_flat = f"{post_slug}__{orig_fname}"
        thumb_name_flat = image_name_flat
        if not thumb_name_flat.lower().endswith(('.jpg', '.jpeg')):
            thumb_name_flat = Path(thumb_name_flat).with_suffix('.jpg').name

        dest_full = IMAGE_DIR / image_name_flat
        dest_thumb = THUMB_DIR / thumb_name_flat

        if dest_full.exists():
            base = dest_full.stem + f"_{global_id}"
            dest_full = dest_full.with_name(base + dest_full.suffix)
            image_name_flat = dest_full.name
            thumb_name_flat = Path(image_name_flat).with_suffix('.jpg').name
            dest_thumb = THUMB_DIR / thumb_name_flat

        try:
            shutil.copy2(str(p), str(dest_full))
        except Exception:
            continue

        try:
            with Image.open(dest_full) as im:
                im = im.convert("RGB")
                im.thumbnail((THUMB_MAX, THUMB_MAX))
                dest_thumb.parent.mkdir(parents=True, exist_ok=True)
                im.save(dest_thumb, "JPEG", quality=85)
        except UnidentifiedImageError:
            try: dest_full.unlink(missing_ok=True)
            except: pass
            continue
        except Exception:
            continue

        rel_file = f"images/{image_name_flat}"
        rel_thumb = f"thumbs/{Path(dest_thumb).name}"
        entry = {
            "id": global_id,
            "title": display_title_base,
            "folder": folder_name,
            "orig_filename": orig_fname,
            "file": rel_file,
            "thumb": rel_thumb,
            "tags": tags_filtered,
            "date": date,
            "year": year
        }
        index.append(entry)

        if LIMIT and global_id >= LIMIT:
            break
    if LIMIT and global_id >= LIMIT:
        break

with open(OUT_ROOT / "index.json", "w", encoding="utf-8") as fh:
    json.dump(index, fh, ensure_ascii=False, indent=2)

# minimal output
print(f"OK {len(index)} images -> {OUT_ROOT}")
