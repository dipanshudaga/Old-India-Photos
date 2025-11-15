const fs = require('fs');

// Configuration
const BUCKET_NAME = 'old-india-photos'; // Change this to your bucket name
const REGION = 'ap-south-1'; // Change to your region
const S3_BASE_URL = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com`;

function updateJSONWithS3URLs(inputFile, outputFile) {
    console.log('Reading JSON file...');
    
    const jsonData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    
    console.log(`Found ${jsonData.length} entries. Updating URLs...`);
    
    let updatedCount = 0;
    
    jsonData.forEach(item => {
        // Update thumbs paths
        if (item.thumbs && Array.isArray(item.thumbs)) {
            item.thumbs = item.thumbs.map(thumb => {
                // Convert local path to S3 URL
                // From: "thumbs/image.jpg"
                // To: "https://bucket.s3.region.amazonaws.com/thumbs/image.jpg"
                if (!thumb.startsWith('http')) {
                    updatedCount++;
                    return `${S3_BASE_URL}/${thumb}`;
                }
                return thumb;
            });
        }
        
        // Update images paths (if you upload full images later)
        if (item.images && Array.isArray(item.images)) {
            item.images = item.images.map(img => {
                if (!img.startsWith('http')) {
                    return `${S3_BASE_URL}/${img}`;
                }
                return img;
            });
        }
    });
    
    // Write updated JSON
    console.log('Writing updated JSON...');
    fs.writeFileSync(outputFile, JSON.stringify(jsonData, null, 2), 'utf8');
    
    console.log('\n✅ Done!');
    console.log(`\nSummary:`);
    console.log(`- Total entries: ${jsonData.length}`);
    console.log(`- URLs updated: ${updatedCount}`);
    console.log(`- Output saved to: ${outputFile}`);
    console.log(`\nS3 Base URL: ${S3_BASE_URL}`);
}

// Usage
const inputFile = 'index.json';
const outputFile = 'index_s3.json';

if (!fs.existsSync(inputFile)) {
    console.error(`Error: ${inputFile} not found!`);
    process.exit(1);
}

updateJSONWithS3URLs(inputFile, outputFile);