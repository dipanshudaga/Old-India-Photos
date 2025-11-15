const fs = require('fs');

console.log('📊 Analyzing tags from index.json...\n');

// Read JSON
const data = JSON.parse(fs.readFileSync('index.json', 'utf8'));

// Extract all unique tags with counts
const tagCounts = {};
data.forEach(item => {
    if (item.tag && Array.isArray(item.tag)) {
        item.tag.forEach(tag => {
            if (tag && tag.trim()) {
                const cleanTag = tag.trim();
                tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
            }
        });
    }
});

// Sort by frequency
const sortedTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }));

console.log(`Total unique tags: ${sortedTags.length}\n`);
console.log('Top 30 most frequent tags:');
console.log('═══════════════════════════════════════════════════\n');
sortedTags.slice(0, 30).forEach(({ tag, count }, i) => {
    console.log(`${(i + 1).toString().padStart(2)}. ${tag.padEnd(40)} ${count} photos`);
});

// Auto-categorization
const categories = {
    'Places - Cities': [],
    'Places - States & Regions': [],
    'Places - Countries': [],
    'People - Leaders & Icons': [],
    'People - Groups & Society': [],
    'Architecture & Buildings': [],
    'Time Periods': [],
    'Culture & Arts': [],
    'Historical Events': [],
    'Nature & Geography': [],
    'Other Themes': []
};

// Comprehensive Indian cities list
const cities = new Set([
    'Calcutta', 'Kolkata', 'Delhi', 'Mumbai', 'Bombay', 'Chennai', 'Madras',
    'Hyderabad', 'Bangalore', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Varanasi',
    'Banaras', 'Kanpur', 'Nagpur', 'Indore', 'Patna', 'Vadodara', 'Baroda',
    'Agra', 'Nashik', 'Meerut', 'Srinagar', 'Amritsar', 'Allahabad', 'Prayagraj',
    'Coimbatore', 'Madurai', 'Chandigarh', 'Guwahati', 'Mysore', 'Aligarh',
    'Tiruchirappalli', 'Trichy', 'Bhubaneswar', 'Kochi', 'Cochin', 'Dehradun',
    'Jammu', 'Mangalore', 'Belgaum', 'Udaipur', 'Darjeeling', 'Simla', 'Shimla',
    'Secunderabad', 'Daulatabad', 'Colombo', 'Lahore', 'Karachi', 'Dhaka',
    'Peshawar', 'Murree', 'Quetta', 'Rawalpindi'
]);

// Indian states and regions
const states = new Set([
    'Maharashtra', 'Tamil Nadu', 'Gujarat', 'Rajasthan', 'Karnataka', 'Kerala',
    'Punjab', 'Haryana', 'Bihar', 'West Bengal', 'Bengal', 'Madhya Pradesh',
    'Uttar Pradesh', 'Andhra Pradesh', 'Telangana', 'Assam', 'Odisha', 'Orissa',
    'Jharkhand', 'Himachal Pradesh', 'Uttarakhand', 'Chhattisgarh', 'Goa',
    'Sikkim', 'Manipur', 'Meghalaya', 'Tripura', 'Nagaland', 'Arunachal Pradesh',
    'Mizoram', 'Jammu and Kashmir', 'Kashmir', 'Ladakh', 'Punjab and Haryana',
    'Andaman and Nikobar', 'Pondicherry'
]);

// Countries
const countries = new Set([
    'India', 'Pakistan', 'Bangladesh', 'Sri Lanka', 'Ceylon', 'Nepal', 'Bhutan',
    'Afghanistan', 'Burma', 'Myanmar', 'Tibet'
]);

// Historical figures (exact and partial matches)
const historicalFigures = [
    'Mahatma Gandhi', 'Gandhi', 'Jawaharlal Nehru', 'Nehru', 'Subhas Chandra Bose',
    'Bose', 'Netaji', 'Rabindranath Tagore', 'Tagore', 'Vallabhbhai Patel', 'Patel',
    'Lal Bahadur Shastri', 'Shastri', 'B. R. Ambedkar', 'Ambedkar', 'Jinnah',
    'King George', 'Swami Vivekananda', 'Vivekananda', 'Ramakrishna', 'Khan Abdul Ghaffar Khan',
    'Mountbatten', 'Gertrude Bell', 'Raja Deen Dayal', 'Bourne and Shepherd'
];

// People groups
const peopleGroups = new Set([
    'Women', 'Children', 'Royals', 'Tribals', 'Family', 'Common People', 'Soldiers',
    'Sadhu', 'Group Photo', 'Portrait', 'Profession', 'Occupation', 'Famous People in India'
]);

// Architecture keywords
const architectureKeywords = [
    'Temple', 'Fort', 'Mosque', 'Church', 'Tomb', 'Architecture', 'Statue',
    'Sculpture', 'Taj Mahal', 'Monument', 'Building', 'Palace', 'Gate'
];

// Culture keywords
const cultureKeywords = [
    'Movie', 'Cinema', 'Film', 'Music', 'Dance', 'Entertainment', 'Fashion',
    'Record', 'Video', 'Documentary', 'Theatre', 'Art', 'Painting'
];

// Event keywords
const eventKeywords = [
    'War', 'Independence', 'Partition', 'Mutiny', 'Riot', 'Famine', 'British Raj',
    'Politics', 'Revolution', 'Movement', 'Freedom Fighter', 'Battle'
];

// Nature keywords
const natureKeywords = [
    'River', 'Ganges', 'Ganga', 'Himalaya', 'Mountain', 'Sea', 'Ocean', 'Nature',
    'Landscape', 'Animal', 'Wildlife', 'Forest', 'Garden'
];

// Categorize function
function categorizeTag(tag) {
    const lower = tag.toLowerCase();
    
    // Time periods - must check first
    if (/^\d{4}s?$/.test(tag) || /\d{2}th Century/.test(tag) || tag === 'Date Unknown') {
        return 'Time Periods';
    }
    
    // Cities - check exact match or contains
    for (let city of cities) {
        if (lower === city.toLowerCase() || lower.includes(city.toLowerCase())) {
            return 'Places - Cities';
        }
    }
    
    // States
    for (let state of states) {
        if (lower === state.toLowerCase() || tag === state) {
            return 'Places - States & Regions';
        }
    }
    
    // Countries
    for (let country of countries) {
        if (lower === country.toLowerCase()) {
            return 'Places - Countries';
        }
    }
    
    // Historical figures
    for (let figure of historicalFigures) {
        if (lower.includes(figure.toLowerCase())) {
            return 'People - Leaders & Icons';
        }
    }
    
    // People groups
    if (peopleGroups.has(tag)) {
        return 'People - Groups & Society';
    }
    
    // Architecture
    for (let keyword of architectureKeywords) {
        if (lower.includes(keyword.toLowerCase())) {
            return 'Architecture & Buildings';
        }
    }
    
    // Culture
    for (let keyword of cultureKeywords) {
        if (lower.includes(keyword.toLowerCase())) {
            return 'Culture & Arts';
        }
    }
    
    // Events
    for (let keyword of eventKeywords) {
        if (lower.includes(keyword.toLowerCase())) {
            return 'Historical Events';
        }
    }
    
    // Nature
    for (let keyword of natureKeywords) {
        if (lower.includes(keyword.toLowerCase())) {
            return 'Nature & Geography';
        }
    }
    
    // Default
    return 'Other Themes';
}

// Categorize all tags
sortedTags.forEach(({ tag, count }) => {
    const category = categorizeTag(tag);
    categories[category].push({ tag, count });
});

// Print categorized results
console.log('\n\n═══════════════════════════════════════════════════');
console.log('📁 CATEGORIZED TAGS');
console.log('═══════════════════════════════════════════════════\n');

Object.entries(categories).forEach(([category, tags]) => {
    if (tags.length > 0) {
        console.log(`\n${category} (${tags.length} tags):`);
        console.log('─────────────────────────────────────────────────');
        tags.slice(0, 15).forEach(({ tag, count }) => {
            console.log(`  ${tag.padEnd(40)} ${count.toString().padStart(5)} photos`);
        });
        if (tags.length > 15) {
            console.log(`  ... and ${tags.length - 15} more tags`);
        }
    }
});

// Create output for frontend
const output = {
    popular: sortedTags.slice(0, 20).map(t => t.tag),
    categories: {}
};

Object.entries(categories).forEach(([category, tags]) => {
    if (tags.length > 0) {
        output.categories[category] = tags.map(t => t.tag);
    }
});

// Save to file
fs.writeFileSync('tag-categories.json', JSON.stringify(output, null, 2));

// Verification: Check if all tags are categorized
console.log('\n\n🔍 VERIFICATION CHECK');
console.log('═══════════════════════════════════════════════════\n');

const totalCategorized = Object.values(categories).reduce((sum, tags) => sum + tags.length, 0);
const uncategorizedTags = [];

// Check each tag
sortedTags.forEach(({ tag, count }) => {
    let found = false;
    for (let category of Object.values(categories)) {
        if (category.some(t => t.tag === tag)) {
            found = true;
            break;
        }
    }
    if (!found) {
        uncategorizedTags.push({ tag, count });
    }
});

if (totalCategorized === sortedTags.length && uncategorizedTags.length === 0) {
    console.log('✅ SUCCESS: All tags categorized!');
    console.log(`   Total tags: ${sortedTags.length}`);
    console.log(`   Categorized: ${totalCategorized}`);
} else {
    console.log('⚠️  WARNING: Some tags not categorized!');
    console.log(`   Total tags: ${sortedTags.length}`);
    console.log(`   Categorized: ${totalCategorized}`);
    console.log(`   Missing: ${uncategorizedTags.length}\n`);
    
    if (uncategorizedTags.length > 0) {
        console.log('Uncategorized tags:');
        console.log('─────────────────────────────────────────────────');
        uncategorizedTags.slice(0, 50).forEach(({ tag, count }) => {
            console.log(`  ${tag.padEnd(40)} ${count.toString().padStart(5)} photos`);
        });
        if (uncategorizedTags.length > 50) {
            console.log(`  ... and ${uncategorizedTags.length - 50} more`);
        }
    }
}

console.log('\n✅ Done!');
console.log('─────────────────────────────────────────────────');
console.log(`📊 Total tags: ${sortedTags.length}`);
console.log(`🔥 Popular tags (top 20): ${output.popular.length}`);
console.log(`📁 Categories: ${Object.keys(output.categories).length}`);
console.log('\n💾 Output saved to: tag-categories.json');
console.log('─────────────────────────────────────────────────\n');