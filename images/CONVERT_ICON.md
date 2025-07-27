# Icon Conversion Required

This file is a placeholder. Please convert the SVG icon to PNG format.

## SVG Source
The source SVG file is located at: images/icon.svg

## Required Output
- File: images/icon.png  
- Size: 128x128 pixels
- Format: PNG with transparency
- Background: Transparent

## Conversion Options

### Online Tools
- convertio.co
- cloudconvert.com
- svgtopng.com

### Command Line (if available)
```bash
# Using Inkscape
inkscape --export-type=png --export-width=128 --export-height=128 images/icon.svg --export-filename=images/icon.png

# Using ImageMagick
convert -background transparent -size 128x128 images/icon.svg images/icon.png
```

### Node.js (install sharp first)
```bash
npm install sharp
node -e "const sharp = require('sharp'); sharp('images/icon.svg').resize(128, 128).png().toFile('images/icon.png');"
```

Once converted, delete this file and ensure images/icon.png exists.
