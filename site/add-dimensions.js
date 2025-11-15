const fs = require('fs');
const path = require('path');
const { default: sizeOf } = require('image-size');

async function addImageDimensions(inputFile, outputFile) {
    console.log('Reading JSON file...');
    
    const jsonData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    
    console.log(`Found ${jsonData.length} entries. Processing images...`);
    
    let processedCount = 0;
    let errorCount = 0;
    
    for (const item of jsonData) {
        if (!item.thumbs || !Array.isArray(item.thumbs)) {
            continue;
        }
        
        // Initialize arrays for dimensions
        item.thumbWidths = [];
        item.thumbHeights = [];
        
        // Process each thumbnail
        for (const thumbPath of item.thumbs) {
            try {
                // Get dimensions
                const dimensions = sizeOf(thumbPath);
                item.thumbWidths.push(dimensions.width);
                item.thumbHeights.push(dimensions.height);
                processedCount++;
            } catch (error) {
                console.error(`Error processing ${thumbPath}:`, error.message);
                // Add null for failed images
                item.thumbWidths.push(null);
                item.thumbHeights.push(null);
                errorCount++;
            }
        }
    }
    
    // Write updated JSON
    console.log('Writing updated JSON...');
    fs.writeFileSync(outputFile, JSON.stringify(jsonData, null, 2), 'utf8');
    
    console.log('\n✅ Done!');
    console.log(`\nSummary:`);
    console.log(`- Total entries: ${jsonData.length}`);
    console.log(`- Images processed: ${processedCount}`);
    console.log(`- Errors: ${errorCount}`);
    console.log(`- Output saved to: ${outputFile}`);
}

// Usage
const inputFile = 'index.json';
const outputFile = 'index_with_dimensions.json';

// Check if input file exists
if (!fs.existsSync(inputFile)) {
    console.error(`Error: ${inputFile} not found!`);
    console.log('Please make sure index.json is in the same directory as this script.');
    process.exit(1);
}

addImageDimensions(inputFile, outputFile)
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });