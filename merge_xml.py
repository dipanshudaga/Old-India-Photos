import xmltodict, json, glob, os

# find all feed XMLs inside feeds/
feeds_dir = os.path.join(os.getcwd(), "feeds")
files = sorted(glob.glob(os.path.join(feeds_dir, "feed_*.xml")))

if not files:
    print("❌ No feed XML files found inside /feeds folder.")
    exit(1)

all_entries = []
for f in files:
    print(f"Processing {os.path.basename(f)} ...")
    with open(f, "r", encoding="utf-8") as fh:
        data = xmltodict.parse(fh.read())
        entries = data.get("feed", {}).get("entry", [])
        if isinstance(entries, dict):
            entries = [entries]
        all_entries.extend(entries)

print(f"\n✅ Total posts combined: {len(all_entries)}")

# save combined JSON next to feeds folder
out_path = os.path.join(os.getcwd(), "feed.json")
with open(out_path, "w", encoding="utf-8") as fo:
    json.dump(all_entries, fo, ensure_ascii=False, indent=2)

print(f"✅ Saved combined file at: {out_path}")
