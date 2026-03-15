const sharp = require('sharp');

async function removeBackground() {
    try {
        const inputPath = '/Users/andre/KoinyLocal/logokoiny.png';
        const outputPath = '/Users/andre/KoinyLocal/logokoiny_transparent.png';

        // We can use a threshold approach with sharp or just 'transparent' a color if it was raw, 
        // but sharp's best way to remove a specific background color is often via a mask or 
        // by using the alpha channel.

        // Simpler: Use sharp to ensure it's RGBA, then use a simple mask.
        // However, since I can't easily iterate pixels in sharp without 'raw' buffers, 
        // let's just use the 'flatten' or 'extractChannel' if it's simple, 
        // but here we want to REPLACE white with transparent.

        const image = sharp(inputPath);
        const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // If the pixel is very white (threshold 250)
            if (r > 245 && g > 245 && b > 245) {
                data[i + 3] = 0; // Alpha to 0
            }
        }

        await sharp(data, {
            raw: {
                width: info.width,
                height: info.height,
                channels: 4
            }
        })
            .png()
            .toFile(outputPath);

        console.log('Successfully created logokoiny_transparent.png');
    } catch (err) {
        console.error('Error processing image:', err);
    }
}

removeBackground();
