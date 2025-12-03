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

// Auto-categorization buckets
const categories = {
    'Places - Cities': [],
    'Places - States & Regions': [],
    'Places - Countries': [],
    'People - Leaders & Icons': [],
    'People - Royalty & Princely States': [], // Added new category
    'People - Groups & Society': [],
    'Architecture & Buildings': [],
    'Transportation': [], // Added new category
    'Time Periods': [],
    'Culture & Arts': [],
    'Historical Events': [],
    'Nature & Geography': [],
    'Other Themes': []
};

// Comprehensive Tag to Category Map
// Generated based on analysis of unique tags
const tagCategoryMap = {
    // --- PLACES: CITIES & TOWNS ---
    'Calcutta': 'Places - Cities', 'Kolkata': 'Places - Cities', 'Delhi': 'Places - Cities',
    'Mumbai': 'Places - Cities', 'Bombay': 'Places - Cities', 'Madras': 'Places - Cities',
    'Chennai': 'Places - Cities', 'Bangalore': 'Places - Cities', 'Hyderabad': 'Places - Cities',
    'Lahore': 'Places - Cities', 'Karachi': 'Places - Cities', 'Dhaka': 'Places - Cities',
    'Simla': 'Places - Cities', 'Shimla': 'Places - Cities', 'Darjeeling': 'Places - Cities',
    'Agra': 'Places - Cities', 'Varanasi': 'Places - Cities', 'Benare': 'Places - Cities',
    'Lucknow': 'Places - Cities', 'Jaipur': 'Places - Cities', 'Udaipur': 'Places - Cities',
    'Srinagar': 'Places - Cities', 'Amritsar': 'Places - Cities', 'Peshawar': 'Places - Cities',
    'Rawalpindi': 'Places - Cities', 'Quetta': 'Places - Cities', 'Murree': 'Places - Cities',
    'Colombo': 'Places - Cities', 'Kandy': 'Places - Cities', 'Rangoon': 'Places - Cities',
    'Mandalay': 'Places - Cities', 'Poona': 'Places - Cities', 'Pune': 'Places - Cities',
    'Allahabad': 'Places - Cities', 'Cawnpore': 'Places - Cities', 'Kanpur': 'Places - Cities',
    'Nagpur': 'Places - Cities', 'Indore': 'Places - Cities', 'Baroda': 'Places - Cities',
    'Vadodara': 'Places - Cities', 'Mysore': 'Places - Cities', 'Ooty': 'Places - Cities',
    'Ootacamund': 'Places - Cities', 'Nainital': 'Places - Cities', 'Mussoorie': 'Places - Cities',
    'Dalhousie': 'Places - Cities', 'Howrah': 'Places - Cities', 'Chandannagar': 'Places - Cities',
    'Serampore': 'Places - Cities', 'Barrackpore': 'Places - Cities', 'Dum Dum': 'Places - Cities',
    'Alipore': 'Places - Cities', 'Chowringhee': 'Places - Cities', 'Kalighat': 'Places - Cities',
    'Chitpur': 'Places - Cities', 'Ballygunge': 'Places - Cities', 'Kidderpore': 'Places - Cities',
    'Fort William': 'Places - Cities', 'Eden Garden': 'Places - Cities', 'Maidan': 'Places - Cities',
    'Chandni Chowk': 'Places - Cities', 'Connaught Place': 'Places - Cities', 'Red Fort': 'Places - Cities',
    'Qutub Minar': 'Places - Cities', 'India Gate': 'Places - Cities', 'Rashtrapati Bhavan': 'Places - Cities',
    'Gateway of India': 'Places - Cities', 'Marine Drive': 'Places - Cities', 'Malabar Hill': 'Places - Cities',
    'Colaba': 'Places - Cities', 'Victoria Terminus': 'Places - Cities', 'Crawford Market': 'Places - Cities',
    'Juhu': 'Places - Cities', 'Bandra': 'Places - Cities', 'Dadar': 'Places - Cities',
    'Byculla': 'Places - Cities', 'Parel': 'Places - Cities', 'Mazagaon': 'Places - Cities',
    'Fort St. George': 'Places - Cities', 'Marina Beach': 'Places - Cities', 'Mount Road': 'Places - Cities',
    'Triplicane': 'Places - Cities', 'Mylapore': 'Places - Cities', 'Egmore': 'Places - Cities',
    'Adyar': 'Places - Cities', 'Guindy': 'Places - Cities', 'Charminar': 'Places - Cities',
    'Golconda': 'Places - Cities', 'Secunderabad': 'Places - Cities', 'Hussain Sagar': 'Places - Cities',
    'Lalbagh': 'Places - Cities', 'Cubbon Park': 'Places - Cities', 'Ulsoor': 'Places - Cities',
    'Malleswaram': 'Places - Cities', 'Basavanagudi': 'Places - Cities', 'Frazer Town': 'Places - Cities',
    'Whitefield': 'Places - Cities', 'Amber': 'Places - Cities', 'Amer': 'Places - Cities',
    'Jodhpur': 'Places - Cities', 'Jaisalmer': 'Places - Cities', 'Bikaner': 'Places - Cities',
    'Ajmer': 'Places - Cities', 'Pushkar': 'Places - Cities', 'Chittorgarh': 'Places - Cities',
    'Mount Abu': 'Places - Cities', 'Gwalior': 'Places - Cities', 'Bhopal': 'Places - Cities',
    'Jabalpur': 'Places - Cities', 'Sanchi': 'Places - Cities', 'Khajuraho': 'Places - Cities',
    'Orchha': 'Places - Cities', 'Mandu': 'Places - Cities', 'Ujjain': 'Places - Cities',
    'Pachmarhi': 'Places - Cities', 'Aurangabad': 'Places - Cities', 'Daulatabad': 'Places - Cities',
    'Ellora': 'Places - Cities', 'Ajanta': 'Places - Cities', 'Nashik': 'Places - Cities',
    'Mahabaleshwar': 'Places - Cities', 'Matheran': 'Places - Cities', 'Lonavala': 'Places - Cities',
    'Khandala': 'Places - Cities', 'Alibag': 'Places - Cities', 'Ratnagiri': 'Places - Cities',
    'Goa': 'Places - Cities', 'Panjim': 'Places - Cities', 'Margao': 'Places - Cities',
    'Vasco': 'Places - Cities', 'Old Goa': 'Places - Cities', 'Cochin': 'Places - Cities',
    'Kochi': 'Places - Cities', 'Trivandrum': 'Places - Cities', 'Thiruvananthapuram': 'Places - Cities',
    'Alleppey': 'Places - Cities', 'Alappuzha': 'Places - Cities', 'Munnar': 'Places - Cities',
    'Thekkady': 'Places - Cities', 'Kovalam': 'Places - Cities', 'Varkala': 'Places - Cities',
    'Madurai': 'Places - Cities', 'Trichy': 'Places - Cities', 'Tanjore': 'Places - Cities',
    'Thanjavur': 'Places - Cities', 'Rameswaram': 'Places - Cities', 'Kanyakumari': 'Places - Cities',
    'Pondicherry': 'Places - Cities', 'Puducherry': 'Places - Cities', 'Mahabalipuram': 'Places - Cities',
    'Kanchipuram': 'Places - Cities', 'Vellore': 'Places - Cities', 'Salem': 'Places - Cities',
    'Coimbatore': 'Places - Cities', 'Tirupati': 'Places - Cities', 'Vijayawada': 'Places - Cities',
    'Visakhapatnam': 'Places - Cities', 'Vizag': 'Places - Cities', 'Puri': 'Places - Cities',
    'Bhubaneswar': 'Places - Cities', 'Konark': 'Places - Cities', 'Cuttack': 'Places - Cities',
    'Patna': 'Places - Cities', 'Gaya': 'Places - Cities', 'Bodh Gaya': 'Places - Cities',
    'Nalanda': 'Places - Cities', 'Rajgir': 'Places - Cities', 'Vaishali': 'Places - Cities',
    'Ranchi': 'Places - Cities', 'Jamshedpur': 'Places - Cities', 'Dhanbad': 'Places - Cities',
    'Guwahati': 'Places - Cities', 'Shillong': 'Places - Cities', 'Cherrapunji': 'Places - Cities',
    'Kohima': 'Places - Cities', 'Imphal': 'Places - Cities', 'Aizawl': 'Places - Cities',
    'Agartala': 'Places - Cities', 'Gangtok': 'Places - Cities', 'Kathmandu': 'Places - Cities',
    'Patan': 'Places - Cities', 'Bhaktapur': 'Places - Cities', 'Pokhara': 'Places - Cities',
    'Lumbini': 'Places - Cities', 'Thimphu': 'Places - Cities', 'Paro': 'Places - Cities',
    'Kabul': 'Places - Cities', 'Kandahar': 'Places - Cities', 'Herat': 'Places - Cities',
    'Jalalabad': 'Places - Cities', 'Ghazni': 'Places - Cities', 'Balkh': 'Places - Cities',
    'Bamiyan': 'Places - Cities', 'Taxila': 'Places - Cities', 'Mohenjo-daro': 'Places - Cities',
    'Harappa': 'Places - Cities', 'Multan': 'Places - Cities', 'Bahawalpur': 'Places - Cities',
    'Sukkur': 'Places - Cities', 'Hyderabad (Pakistan)': 'Places - Cities', 'Gilgit': 'Places - Cities',
    'Skardu': 'Places - Cities', 'Hunza': 'Places - Cities', 'Chitral': 'Places - Cities',
    'Swat': 'Places - Cities', 'Khyber': 'Places - Cities', 'Bolan': 'Places - Cities',

    // --- PLACES: STATES & REGIONS ---
    'Bengal': 'Places - States & Regions', 'West Bengal': 'Places - States & Regions',
    'Punjab': 'Places - States & Regions', 'Sindh': 'Places - States & Regions',
    'Sind': 'Places - States & Regions', 'Kashmir': 'Places - States & Regions',
    'Jammu': 'Places - States & Regions', 'Ladakh': 'Places - States & Regions',
    'Rajputana': 'Places - States & Regions', 'Rajasthan': 'Places - States & Regions',
    'Gujarat': 'Places - States & Regions', 'Maharashtra': 'Places - States & Regions',
    'Bombay Presidency': 'Places - States & Regions', 'Madras Presidency': 'Places - States & Regions',
    'Bengal Presidency': 'Places - States & Regions', 'United Provinces': 'Places - States & Regions',
    'Central Provinces': 'Places - States & Regions', 'North-West Frontier Province': 'Places - States & Regions',
    'NWFP': 'Places - States & Regions', 'Balochistan': 'Places - States & Regions',
    'Assam': 'Places - States & Regions', 'Bihar': 'Places - States & Regions',
    'Orissa': 'Places - States & Regions', 'Odisha': 'Places - States & Regions',
    'Kerala': 'Places - States & Regions', 'Travancore': 'Places - States & Regions',
    'Mysore State': 'Places - States & Regions', 'Karnataka': 'Places - States & Regions',
    'Tamil Nadu': 'Places - States & Regions', 'Andhra Pradesh': 'Places - States & Regions',
    'Telangana': 'Places - States & Regions', 'Nizam\'s Dominions': 'Places - States & Regions',
    'Deccan': 'Places - States & Regions', 'Konkan': 'Places - States & Regions',
    'Malabar': 'Places - States & Regions', 'Coromandel': 'Places - States & Regions',
    'Himalaya': 'Places - States & Regions', 'Himalayas': 'Places - States & Regions',
    'Karakoram': 'Places - States & Regions', 'Hindu Kush': 'Places - States & Regions',
    'Nilgiris': 'Places - States & Regions', 'Western Ghats': 'Places - States & Regions',
    'Eastern Ghats': 'Places - States & Regions', 'Sundarbans': 'Places - States & Regions',
    'Thar Desert': 'Places - States & Regions', 'Rann of Kutch': 'Places - States & Regions',

    // --- PLACES: COUNTRIES ---
    'India': 'Places - Countries', 'Pakistan': 'Places - Countries', 'Bangladesh': 'Places - Countries',
    'Sri Lanka': 'Places - Countries', 'Ceylon': 'Places - Countries', 'Nepal': 'Places - Countries',
    'Bhutan': 'Places - Countries', 'Burma': 'Places - Countries', 'Myanmar': 'Places - Countries',
    'Afghanistan': 'Places - Countries', 'Tibet': 'Places - Countries', 'China': 'Places - Countries',
    'Sikkim': 'Places - Countries', // Was a separate kingdom

    // --- PEOPLE: LEADERS & ICONS ---
    'Gandhi': 'People - Leaders & Icons', 'Mahatma Gandhi': 'People - Leaders & Icons',
    'Nehru': 'People - Leaders & Icons', 'Jawaharlal Nehru': 'People - Leaders & Icons',
    'Jinnah': 'People - Leaders & Icons', 'Muhammad Ali Jinnah': 'People - Leaders & Icons',
    'Bose': 'People - Leaders & Icons', 'Subhas Chandra Bose': 'People - Leaders & Icons',
    'Netaji': 'People - Leaders & Icons', 'Patel': 'People - Leaders & Icons',
    'Vallabhbhai Patel': 'People - Leaders & Icons', 'Sardar Patel': 'People - Leaders & Icons',
    'Ambedkar': 'People - Leaders & Icons', 'B. R. Ambedkar': 'People - Leaders & Icons',
    'Tagore': 'People - Leaders & Icons', 'Rabindranath Tagore': 'People - Leaders & Icons',
    'Vivekananda': 'People - Leaders & Icons', 'Swami Vivekananda': 'People - Leaders & Icons',
    'Ramakrishna': 'People - Leaders & Icons', 'Sarada Devi': 'People - Leaders & Icons',
    'Aurobindo': 'People - Leaders & Icons', 'Sri Aurobindo': 'People - Leaders & Icons',
    'Tilak': 'People - Leaders & Icons', 'Bal Gangadhar Tilak': 'People - Leaders & Icons',
    'Gokhale': 'People - Leaders & Icons', 'Gopal Krishna Gokhale': 'People - Leaders & Icons',
    'Lajpat Rai': 'People - Leaders & Icons', 'Lala Lajpat Rai': 'People - Leaders & Icons',
    'Bhagat Singh': 'People - Leaders & Icons', 'Azad': 'People - Leaders & Icons',
    'Chandra Shekhar Azad': 'People - Leaders & Icons', 'Rajguru': 'People - Leaders & Icons',
    'Sukhdev': 'People - Leaders & Icons', 'Savarkar': 'People - Leaders & Icons',
    'Vinayak Damodar Savarkar': 'People - Leaders & Icons', 'Annie Besant': 'People - Leaders & Icons',
    'Sarojini Naidu': 'People - Leaders & Icons', 'Indira Gandhi': 'People - Leaders & Icons',
    'Rajiv Gandhi': 'People - Leaders & Icons', 'Sanjay Gandhi': 'People - Leaders & Icons',
    'Morarji Desai': 'People - Leaders & Icons', 'Lal Bahadur Shastri': 'People - Leaders & Icons',
    'Mountbatten': 'People - Leaders & Icons', 'Lord Mountbatten': 'People - Leaders & Icons',
    'Lady Mountbatten': 'People - Leaders & Icons', 'Curzon': 'People - Leaders & Icons',
    'Lord Curzon': 'People - Leaders & Icons', 'Dalhousie': 'People - Leaders & Icons',
    'Lord Dalhousie': 'People - Leaders & Icons', 'Canning': 'People - Leaders & Icons',
    'Lord Canning': 'People - Leaders & Icons', 'Ripon': 'People - Leaders & Icons',
    'Lord Ripon': 'People - Leaders & Icons', 'Lytton': 'People - Leaders & Icons',
    'Lord Lytton': 'People - Leaders & Icons', 'Dufferin': 'People - Leaders & Icons',
    'Lord Dufferin': 'People - Leaders & Icons', 'Minto': 'People - Leaders & Icons',
    'Lord Minto': 'People - Leaders & Icons', 'Hardinge': 'People - Leaders & Icons',
    'Lord Hardinge': 'People - Leaders & Icons', 'Chelmsford': 'People - Leaders & Icons',
    'Lord Chelmsford': 'People - Leaders & Icons', 'Reading': 'People - Leaders & Icons',
    'Lord Reading': 'People - Leaders & Icons', 'Irwin': 'People - Leaders & Icons',
    'Lord Irwin': 'People - Leaders & Icons', 'Willingdon': 'People - Leaders & Icons',
    'Lord Willingdon': 'People - Leaders & Icons', 'Linlithgow': 'People - Leaders & Icons',
    'Lord Linlithgow': 'People - Leaders & Icons', 'Wavell': 'People - Leaders & Icons',
    'Lord Wavell': 'People - Leaders & Icons', 'Queen Victoria': 'People - Leaders & Icons',
    'King Edward VII': 'People - Leaders & Icons', 'King George V': 'People - Leaders & Icons',
    'Queen Mary': 'People - Leaders & Icons', 'King George VI': 'People - Leaders & Icons',
    'Queen Elizabeth II': 'People - Leaders & Icons', 'Prince of Wales': 'People - Leaders & Icons',
    'Duke of Connaught': 'People - Leaders & Icons', 'Duke of Windsor': 'People - Leaders & Icons',

    // --- PEOPLE: ROYALTY & PRINCELY STATES ---
    'Maharaja': 'People - Royalty & Princely States', 'Maharana': 'People - Royalty & Princely States',
    'Maharao': 'People - Royalty & Princely States', 'Raja': 'People - Royalty & Princely States',
    'Rana': 'People - Royalty & Princely States', 'Rao': 'People - Royalty & Princely States',
    'Nawab': 'People - Royalty & Princely States', 'Nizam': 'People - Royalty & Princely States',
    'Sultan': 'People - Royalty & Princely States', 'Begum': 'People - Royalty & Princely States',
    'Maharani': 'People - Royalty & Princely States', 'Rani': 'People - Royalty & Princely States',
    'Princess': 'People - Royalty & Princely States', 'Prince': 'People - Royalty & Princely States',
    'Yuvaraj': 'People - Royalty & Princely States', 'Thakur': 'People - Royalty & Princely States',
    'Zamindar': 'People - Royalty & Princely States', 'Jagirdar': 'People - Royalty & Princely States',
    'Talukdar': 'People - Royalty & Princely States', 'Gaekwad': 'People - Royalty & Princely States',
    'Scindia': 'People - Royalty & Princely States', 'Holkar': 'People - Royalty & Princely States',
    'Peshwa': 'People - Royalty & Princely States', 'Wodeyar': 'People - Royalty & Princely States',
    'Travancore Royal Family': 'People - Royalty & Princely States', 'Jaipur Royal Family': 'People - Royalty & Princely States',
    'Jodhpur Royal Family': 'People - Royalty & Princely States', 'Udaipur Royal Family': 'People - Royalty & Princely States',
    'Kashmir Royal Family': 'People - Royalty & Princely States', 'Patiala Royal Family': 'People - Royalty & Princely States',
    'Kapurthala Royal Family': 'People - Royalty & Princely States', 'Hyderabad Royal Family': 'People - Royalty & Princely States',
    'Bhopal Royal Family': 'People - Royalty & Princely States', 'Rampur Royal Family': 'People - Royalty & Princely States',
    'Mysore Royal Family': 'People - Royalty & Princely States', 'Baroda Royal Family': 'People - Royalty & Princely States',
    'Gwalior Royal Family': 'People - Royalty & Princely States', 'Indore Royal Family': 'People - Royalty & Princely States',

    // --- PEOPLE: GROUPS & SOCIETY ---
    'Women': 'People - Groups & Society', 'Men': 'People - Groups & Society',
    'Children': 'People - Groups & Society', 'Family': 'People - Groups & Society',
    'Group': 'People - Groups & Society', 'Portrait': 'People - Groups & Society',
    'Crowd': 'People - Groups & Society', 'People': 'People - Groups & Society',
    'Villagers': 'People - Groups & Society', 'Tribal': 'People - Groups & Society',
    'Adivasi': 'People - Groups & Society', 'Naga': 'People - Groups & Society',
    'Bhil': 'People - Groups & Society', 'Gond': 'People - Groups & Society',
    'Santhal': 'People - Groups & Society', 'Toda': 'People - Groups & Society',
    'Sadhu': 'People - Groups & Society', 'Fakir': 'People - Groups & Society',
    'Brahmin': 'People - Groups & Society', 'Priest': 'People - Groups & Society',
    'Monk': 'People - Groups & Society', 'Nun': 'People - Groups & Society',
    'Soldier': 'People - Groups & Society', 'Sepoy': 'People - Groups & Society',
    'Officer': 'People - Groups & Society', 'Police': 'People - Groups & Society',
    'Servant': 'People - Groups & Society', 'Ayah': 'People - Groups & Society',
    'Bearer': 'People - Groups & Society', 'Coolie': 'People - Groups & Society',
    'Worker': 'People - Groups & Society', 'Farmer': 'People - Groups & Society',
    'Peasant': 'People - Groups & Society', 'Artisan': 'People - Groups & Society',
    'Craftsman': 'People - Groups & Society', 'Weaver': 'People - Groups & Society',
    'Potter': 'People - Groups & Society', 'Blacksmith': 'People - Groups & Society',
    'Goldsmith': 'People - Groups & Society', 'Carpenter': 'People - Groups & Society',
    'Barber': 'People - Groups & Society', 'Washerman': 'People - Groups & Society',
    'Dhobi': 'People - Groups & Society', 'Sweeper': 'People - Groups & Society',
    'Merchant': 'People - Groups & Society', 'Trader': 'People - Groups & Society',
    'Shopkeeper': 'People - Groups & Society', 'Vendor': 'People - Groups & Society',
    'Student': 'People - Groups & Society', 'Teacher': 'People - Groups & Society',
    'Doctor': 'People - Groups & Society', 'Nurse': 'People - Groups & Society',
    'Lawyer': 'People - Groups & Society', 'Judge': 'People - Groups & Society',
    'Artist': 'People - Groups & Society', 'Musician': 'People - Groups & Society',
    'Dancer': 'People - Groups & Society', 'Actor': 'People - Groups & Society',
    'Actress': 'People - Groups & Society', 'Singer': 'People - Groups & Society',
    'Writer': 'People - Groups & Society', 'Poet': 'People - Groups & Society',
    'Scientist': 'People - Groups & Society', 'Engineer': 'People - Groups & Society',
    'Sportsman': 'People - Groups & Society', 'Cricketer': 'People - Groups & Society',
    'Hockey Player': 'People - Groups & Society', 'Footballer': 'People - Groups & Society',
    'Athlete': 'People - Groups & Society', 'Hunter': 'People - Groups & Society',
    'Fisherman': 'People - Groups & Society', 'Boatman': 'People - Groups & Society',
    'Driver': 'People - Groups & Society', 'Pilot': 'People - Groups & Society',
    'Sailor': 'People - Groups & Society', 'Beggar': 'People - Groups & Society',
    'Refugee': 'People - Groups & Society', 'Prisoner': 'People - Groups & Society',
    'Slave': 'People - Groups & Society', 'Eunuch': 'People - Groups & Society',
    'Hijra': 'People - Groups & Society', 'Devadasi': 'People - Groups & Society',
    'Nautch Girl': 'People - Groups & Society', 'Geisha': 'People - Groups & Society',
    'Courtesan': 'People - Groups & Society', 'Prostitute': 'People - Groups & Society',
    'Widow': 'People - Groups & Society', 'Orphan': 'People - Groups & Society',

    // --- ARCHITECTURE & BUILDINGS ---
    'Temple': 'Architecture & Buildings', 'Mosque': 'Architecture & Buildings',
    'Masjid': 'Architecture & Buildings', 'Church': 'Architecture & Buildings',
    'Cathedral': 'Architecture & Buildings', 'Gurudwara': 'Architecture & Buildings',
    'Synagogue': 'Architecture & Buildings', 'Stupa': 'Architecture & Buildings',
    'Pagoda': 'Architecture & Buildings', 'Shrine': 'Architecture & Buildings',
    'Dargah': 'Architecture & Buildings', 'Tomb': 'Architecture & Buildings',
    'Mausoleum': 'Architecture & Buildings', 'Cenotaph': 'Architecture & Buildings',
    'Ghat': 'Architecture & Buildings', 'Fort': 'Architecture & Buildings',
    'Palace': 'Architecture & Buildings', 'Haveli': 'Architecture & Buildings',
    'Bungalow': 'Architecture & Buildings', 'Mansion': 'Architecture & Buildings',
    'House': 'Architecture & Buildings', 'Hut': 'Architecture & Buildings',
    'Cottage': 'Architecture & Buildings', 'Building': 'Architecture & Buildings',
    'Monument': 'Architecture & Buildings', 'Memorial': 'Architecture & Buildings',
    'Statue': 'Architecture & Buildings', 'Sculpture': 'Architecture & Buildings',
    'Pillar': 'Architecture & Buildings', 'Column': 'Architecture & Buildings',
    'Arch': 'Architecture & Buildings', 'Gate': 'Architecture & Buildings',
    'Gateway': 'Architecture & Buildings', 'Bridge': 'Architecture & Buildings',
    'Dam': 'Architecture & Buildings', 'Canal': 'Architecture & Buildings',
    'Reservoir': 'Architecture & Buildings', 'Tank': 'Architecture & Buildings',
    'Well': 'Architecture & Buildings', 'Stepwell': 'Architecture & Buildings',
    'Baoli': 'Architecture & Buildings', 'Fountain': 'Architecture & Buildings',
    'Clock Tower': 'Architecture & Buildings', 'Lighthouse': 'Architecture & Buildings',
    'Railway Station': 'Architecture & Buildings', 'Airport': 'Architecture & Buildings',
    'Harbor': 'Architecture & Buildings', 'Port': 'Architecture & Buildings',
    'Dock': 'Architecture & Buildings', 'Factory': 'Architecture & Buildings',
    'Mill': 'Architecture & Buildings', 'Mine': 'Architecture & Buildings',
    'Power Station': 'Architecture & Buildings', 'Hospital': 'Architecture & Buildings',
    'School': 'Architecture & Buildings', 'College': 'Architecture & Buildings',
    'University': 'Architecture & Buildings', 'Library': 'Architecture & Buildings',
    'Museum': 'Architecture & Buildings', 'Theater': 'Architecture & Buildings',
    'Cinema': 'Architecture & Buildings', 'Hotel': 'Architecture & Buildings',
    'Club': 'Architecture & Buildings', 'Gymkhana': 'Architecture & Buildings',
    'Market': 'Architecture & Buildings', 'Bazaar': 'Architecture & Buildings',
    'Shop': 'Architecture & Buildings', 'Office': 'Architecture & Buildings',
    'Bank': 'Architecture & Buildings', 'Post Office': 'Architecture & Buildings',
    'Court': 'Architecture & Buildings', 'Jail': 'Architecture & Buildings',
    'Prison': 'Architecture & Buildings', 'Barracks': 'Architecture & Buildings',
    'Cantonment': 'Architecture & Buildings', 'Residency': 'Architecture & Buildings',
    'Embassy': 'Architecture & Buildings', 'Consulate': 'Architecture & Buildings',
    'Parliament': 'Architecture & Buildings', 'Assembly': 'Architecture & Buildings',
    'Secretariat': 'Architecture & Buildings', 'Town Hall': 'Architecture & Buildings',

    // --- TRANSPORTATION ---
    'Train': 'Transportation', 'Railway': 'Transportation', 'Locomotive': 'Transportation',
    'Engine': 'Transportation', 'Carriage': 'Transportation', 'Wagon': 'Transportation',
    'Tram': 'Transportation', 'Bus': 'Transportation', 'Truck': 'Transportation',
    'Lorry': 'Transportation', 'Car': 'Transportation', 'Automobile': 'Transportation',
    'Motorcycle': 'Transportation', 'Bicycle': 'Transportation', 'Cycle': 'Transportation',
    'Rickshaw': 'Transportation', 'Tonga': 'Transportation', 'Buggy': 'Transportation',
    'Cart': 'Transportation', 'Bullock Cart': 'Transportation', 'Camel Cart': 'Transportation',
    'Horse Carriage': 'Transportation', 'Elephant': 'Transportation', 'Camel': 'Transportation',
    'Horse': 'Transportation', 'Palanquin': 'Transportation', 'Doli': 'Transportation',
    'Boat': 'Transportation', 'Ship': 'Transportation', 'Steamer': 'Transportation',
    'Ferry': 'Transportation', 'Yacht': 'Transportation', 'Canoe': 'Transportation',
    'Airplane': 'Transportation', 'Aeroplane': 'Transportation', 'Aircraft': 'Transportation',
    'Flight': 'Transportation', 'Airship': 'Transportation', 'Balloon': 'Transportation',

    // --- NATURE & GEOGRAPHY ---
    'River': 'Nature & Geography', 'Lake': 'Nature & Geography', 'Pond': 'Nature & Geography',
    'Sea': 'Nature & Geography', 'Ocean': 'Nature & Geography', 'Bay': 'Nature & Geography',
    'Gulf': 'Nature & Geography', 'Strait': 'Nature & Geography', 'Creek': 'Nature & Geography',
    'Waterfall': 'Nature & Geography', 'Spring': 'Nature & Geography', 'Mountain': 'Nature & Geography',
    'Hill': 'Nature & Geography', 'Peak': 'Nature & Geography', 'Valley': 'Nature & Geography',
    'Pass': 'Nature & Geography', 'Plateau': 'Nature & Geography', 'Plain': 'Nature & Geography',
    'Desert': 'Nature & Geography', 'Dune': 'Nature & Geography', 'Forest': 'Nature & Geography',
    'Jungle': 'Nature & Geography', 'Woods': 'Nature & Geography', 'Grove': 'Nature & Geography',
    'Garden': 'Nature & Geography', 'Park': 'Nature & Geography', 'Field': 'Nature & Geography',
    'Farm': 'Nature & Geography', 'Plantation': 'Nature & Geography', 'Orchard': 'Nature & Geography',
    'Tree': 'Nature & Geography', 'Flower': 'Nature & Geography', 'Plant': 'Nature & Geography',
    'Animal': 'Nature & Geography', 'Bird': 'Nature & Geography', 'Fish': 'Nature & Geography',
    'Insect': 'Nature & Geography', 'Reptile': 'Nature & Geography', 'Tiger': 'Nature & Geography',
    'Lion': 'Nature & Geography', 'Leopard': 'Nature & Geography', 'Elephant': 'Nature & Geography',
    'Rhino': 'Nature & Geography', 'Bear': 'Nature & Geography', 'Deer': 'Nature & Geography',
    'Monkey': 'Nature & Geography', 'Snake': 'Nature & Geography', 'Crocodile': 'Nature & Geography',
    'Peacock': 'Nature & Geography', 'Parrot': 'Nature & Geography', 'Eagle': 'Nature & Geography',
    'Vulture': 'Nature & Geography', 'Crow': 'Nature & Geography', 'Pigeon': 'Nature & Geography',
    'Cow': 'Nature & Geography', 'Bull': 'Nature & Geography', 'Buffalo': 'Nature & Geography',
    'Goat': 'Nature & Geography', 'Sheep': 'Nature & Geography', 'Dog': 'Nature & Geography',
    'Cat': 'Nature & Geography', 'Horse': 'Nature & Geography', 'Donkey': 'Nature & Geography',
    'Mule': 'Nature & Geography', 'Camel': 'Nature & Geography', 'Pig': 'Nature & Geography',

    // --- CULTURE & ARTS ---
    'Music': 'Culture & Arts', 'Dance': 'Culture & Arts', 'Song': 'Culture & Arts',
    'Instrument': 'Culture & Arts', 'Sitar': 'Culture & Arts', 'Veena': 'Culture & Arts',
    'Tabla': 'Culture & Arts', 'Flute': 'Culture & Arts', 'Drum': 'Culture & Arts',
    'Painting': 'Culture & Arts', 'Drawing': 'Culture & Arts', 'Sketch': 'Culture & Arts',
    'Sculpture': 'Culture & Arts', 'Carving': 'Culture & Arts', 'Pottery': 'Culture & Arts',
    'Textile': 'Culture & Arts', 'Embroidery': 'Culture & Arts', 'Jewelry': 'Culture & Arts',
    'Costume': 'Culture & Arts', 'Fashion': 'Culture & Arts', 'Cinema': 'Culture & Arts',
    'Movie': 'Culture & Arts', 'Film': 'Culture & Arts', 'Theater': 'Culture & Arts',
    'Drama': 'Culture & Arts', 'Play': 'Culture & Arts', 'Puppet': 'Culture & Arts',
    'Circus': 'Culture & Arts', 'Magic': 'Culture & Arts', 'Festival': 'Culture & Arts',
    'Fair': 'Culture & Arts', 'Mela': 'Culture & Arts', 'Diwali': 'Culture & Arts',
    'Holi': 'Culture & Arts', 'Eid': 'Culture & Arts', 'Christmas': 'Culture & Arts',
    'Durga Puja': 'Culture & Arts', 'Ganesh Chaturthi': 'Culture & Arts', 'Dussehra': 'Culture & Arts',
    'Muharram': 'Culture & Arts', 'Wedding': 'Culture & Arts', 'Marriage': 'Culture & Arts',
    'Funeral': 'Culture & Arts', 'Cremation': 'Culture & Arts', 'Burial': 'Culture & Arts',
    'Ritual': 'Culture & Arts', 'Ceremony': 'Culture & Arts', 'Prayer': 'Culture & Arts',
    'Worship': 'Culture & Arts', 'Puja': 'Culture & Arts', 'Namaz': 'Culture & Arts',
    'Yoga': 'Culture & Arts', 'Meditation': 'Culture & Arts', 'Sport': 'Culture & Arts',
    'Game': 'Culture & Arts', 'Cricket': 'Culture & Arts', 'Hockey': 'Culture & Arts',
    'Football': 'Culture & Arts', 'Tennis': 'Culture & Arts', 'Polo': 'Culture & Arts',
    'Hunting': 'Culture & Arts', 'Shikar': 'Culture & Arts', 'Fishing': 'Culture & Arts',
    'Wrestling': 'Culture & Arts', 'Kushti': 'Culture & Arts', 'Kite': 'Culture & Arts',

    // --- HISTORICAL EVENTS ---
    'War': 'Historical Events', 'Battle': 'Historical Events', 'Siege': 'Historical Events',
    'Mutiny': 'Historical Events', 'Revolt': 'Historical Events', 'Rebellion': 'Historical Events',
    'Uprising': 'Historical Events', 'Revolution': 'Historical Events', 'Movement': 'Historical Events',
    'Protest': 'Historical Events', 'Strike': 'Historical Events', 'March': 'Historical Events',
    'Satyagraha': 'Historical Events', 'Independence': 'Historical Events', 'Partition': 'Historical Events',
    'Freedom': 'Historical Events', 'Liberty': 'Historical Events', 'Republic': 'Historical Events',
    'Constitution': 'Historical Events', 'Election': 'Historical Events', 'Coronation': 'Historical Events',
    'Durbar': 'Historical Events', 'Jubilee': 'Historical Events', 'Visit': 'Historical Events',
    'Tour': 'Historical Events', 'Treaty': 'Historical Events', 'Agreement': 'Historical Events',
    'Conference': 'Historical Events', 'Summit': 'Historical Events', 'Meeting': 'Historical Events',
    'Famine': 'Historical Events', 'Drought': 'Historical Events', 'Flood': 'Historical Events',
    'Earthquake': 'Historical Events', 'Cyclone': 'Historical Events', 'Plague': 'Historical Events',
    'Epidemic': 'Historical Events', 'Riot': 'Historical Events', 'Massacre': 'Historical Events',
    'Genocide': 'Historical Events', 'Bomb': 'Historical Events', 'Explosion': 'Historical Events',
    'Fire': 'Historical Events', 'Accident': 'Historical Events', 'Crash': 'Historical Events',
    'World War I': 'Historical Events', 'WWI': 'Historical Events', 'World War II': 'Historical Events',
    'WWII': 'Historical Events', '1857': 'Historical Events', '1947': 'Historical Events'
};

// Fallback keyword lists for tags not in the map
const keywordCategories = {
    'Places - Cities': ['city', 'town', 'village', 'nagar', 'pur', 'bad', 'road', 'street', 'lane', 'chowk', 'bazaar', 'market'],
    'Places - States & Regions': ['state', 'province', 'region', 'district', 'presidency', 'territory'],
    'Places - Countries': ['country', 'nation', 'land'],
    'People - Leaders & Icons': ['gandhi', 'nehru', 'jinnah', 'bose', 'patel', 'ambedkar', 'tagore', 'lord', 'lady', 'sir', 'king', 'queen', 'prince', 'princess', 'duke', 'duchess'],
    'People - Royalty & Princely States': ['maharaja', 'maharana', 'maharao', 'raja', 'rana', 'rao', 'nawab', 'nizam', 'sultan', 'begum', 'maharani', 'rani', 'yuvaraj', 'thakur', 'gaekwad', 'scindia', 'holkar', 'peshwa', 'wodeyar'],
    'People - Groups & Society': ['man', 'woman', 'child', 'boy', 'girl', 'baby', 'family', 'group', 'crowd', 'people', 'villager', 'tribal', 'caste', 'worker', 'farmer', 'soldier', 'officer', 'servant', 'student', 'teacher', 'doctor', 'artist', 'musician', 'dancer'],
    'Architecture & Buildings': ['temple', 'mosque', 'church', 'tomb', 'fort', 'palace', 'building', 'house', 'bridge', 'dam', 'canal', 'station', 'school', 'college', 'hospital', 'hotel', 'club', 'office', 'shop'],
    'Transportation': ['train', 'railway', 'bus', 'car', 'truck', 'cycle', 'rickshaw', 'cart', 'boat', 'ship', 'plane', 'flight'],
    'Nature & Geography': ['river', 'lake', 'sea', 'mountain', 'hill', 'forest', 'garden', 'park', 'tree', 'flower', 'animal', 'bird', 'tiger', 'lion', 'elephant', 'horse', 'dog'],
    'Culture & Arts': ['music', 'dance', 'song', 'painting', 'sculpture', 'cinema', 'movie', 'film', 'theater', 'festival', 'wedding', 'ritual', 'prayer', 'sport', 'game'],
    'Historical Events': ['war', 'battle', 'mutiny', 'revolt', 'independence', 'partition', 'famine', 'flood', 'earthquake', 'riot', 'durbar']
};

function categorizeTag(tag) {
    const cleanTag = tag.trim();
    const lowerTag = cleanTag.toLowerCase();

    // 1. Check exact match in static map
    if (tagCategoryMap[cleanTag]) {
        return tagCategoryMap[cleanTag];
    }

    // 2. Check case-insensitive match in static map
    for (const [key, category] of Object.entries(tagCategoryMap)) {
        if (key.toLowerCase() === lowerTag) {
            return category;
        }
    }

    // 3. Time Periods (Regex)
    if (/^\d{4}s?$/.test(cleanTag) || /\d{2}th Century/i.test(cleanTag) || /century/i.test(cleanTag) || cleanTag === 'Date Unknown') {
        return 'Time Periods';
    }

    // 4. Fallback: Keyword matching
    for (const [category, keywords] of Object.entries(keywordCategories)) {
        for (const keyword of keywords) {
            if (lowerTag.includes(keyword)) {
                return category;
            }
        }
    }

    // 5. Default
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