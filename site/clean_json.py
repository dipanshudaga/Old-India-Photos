import json
import re

# Stop words to remove from tags
STOP_WORDS = {
    'a', 'an', 'the', 'in', 'on', 'at', 'of', 'to', 'for', 'with', 'from', 'by',
    'view', 'during', 'been', 'were', 'was', 'are', 'is', 'and', 'or', 'but',
    'this', 'that', 'these', 'those'
}

def clean_title_from_folder(folder_name):
    """Extract and clean title from folder name"""
    # Remove date prefix
    title = re.sub(r'^\d{4}-\d{2}-\d{2}\s+', '', folder_name)
    
    # Remove Part variations
    title = re.sub(r'\s*[-–—]?\s*Part\s*[-–—]?\s*[IVX0-9]+', ' ', title, flags=re.IGNORECASE)
    
    # Clean up extra spaces
    title = ' '.join(title.split())
    
    return title.strip()

def is_valid_description(description):
    """Check if description is meaningful"""
    if not description or not isinstance(description, str):
        return False
    
    # Minimum 20 words
    words = description.split()
    if len(words) < 20:
        return False
    
    # Check for proper sentences
    has_capital = any(c.isupper() for c in description)
    has_punctuation = any(c in '.!?' for c in description)
    
    if not (has_capital and has_punctuation):
        return False
    
    return True

def clean_tags(tags):
    """Remove stop words and clean tags"""
    if not tags:
        return []
    
    cleaned = []
    seen = set()
    
    for tag in tags:
        if not tag:
            continue
        
        # Skip stop words
        if tag.lower() in STOP_WORDS:
            continue
        
        # Remove duplicates
        if tag.lower() not in seen:
            cleaned.append(tag)
            seen.add(tag.lower())
    
    return cleaned

def clean_json_data(input_file, output_file):
    """Clean the entire JSON file"""
    print(f"Reading {input_file}...")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"Found {len(data)} entries. Cleaning...")
    
    cleaned_count = 0
    for item in data:
        # Update title from folder name
        if 'folder' in item:
            new_title = clean_title_from_folder(item['folder'])
            item['title'] = new_title
            cleaned_count += 1
        
        # Clean tags
        if 'tag' in item:
            item['tag'] = clean_tags(item['tag'])
        
        # Validate and clean description
        if 'post_description' in item:
            if not is_valid_description(item['post_description']):
                item['post_description'] = ""
    
    print(f"Cleaned {cleaned_count} titles")
    print(f"Writing to {output_file}...")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print("Done!")
    print(f"\nSummary:")
    print(f"- Total entries: {len(data)}")
    print(f"- Titles updated: {cleaned_count}")
    print(f"- Output saved to: {output_file}")

if __name__ == "__main__":
    input_file = "index.json"
    output_file = "index_cleaned.json"
    
    try:
        clean_json_data(input_file, output_file)
    except FileNotFoundError:
        print(f"Error: Could not find {input_file}")
        print("Please make sure the file exists in the same directory as this script.")
    except json.JSONDecodeError:
        print(f"Error: {input_file} is not a valid JSON file")
    except Exception as e:
        print(f"Error: {e}")