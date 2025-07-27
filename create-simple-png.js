const fs = require('fs');

// Create a simple 128x128 PNG icon with basic graphics
// This creates a minimal PNG file programmatically

function createSimplePNG() {
  // PNG file signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // Image dimensions
  const width = 128;
  const height = 128;
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);     // Width
  ihdrData.writeUInt32BE(height, 4);    // Height
  ihdrData.writeUInt8(8, 8);            // Bit depth
  ihdrData.writeUInt8(6, 9);            // Color type (RGBA)
  ihdrData.writeUInt8(0, 10);           // Compression
  ihdrData.writeUInt8(0, 11);           // Filter
  ihdrData.writeUInt8(0, 12);           // Interlace
  
  const ihdrCrc = crc32(Buffer.concat([Buffer.from('IHDR'), ihdrData]));
  const ihdrChunk = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x0D]), // Length
    Buffer.from('IHDR'),
    ihdrData,
    Buffer.from([ihdrCrc >>> 24, (ihdrCrc >>> 16) & 0xFF, (ihdrCrc >>> 8) & 0xFF, ihdrCrc & 0xFF])
  ]);
  
  // Create simple image data (green circle on transparent background)
  const imageData = Buffer.alloc(width * height * 4); // RGBA
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 50;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      
      if (distance <= radius) {
        imageData[index] = 46;      // R (green)
        imageData[index + 1] = 125; // G
        imageData[index + 2] = 50;  // B
        imageData[index + 3] = 255; // A (opaque)
      } else {
        imageData[index] = 0;       // R
        imageData[index + 1] = 0;   // G
        imageData[index + 2] = 0;   // B
        imageData[index + 3] = 0;   // A (transparent)
      }
    }
  }
  
  // Compress image data (simplified)
  const compressedData = Buffer.concat([Buffer.from([0x78, 0x9C]), imageData, Buffer.from([0x00, 0x00, 0x00, 0x00])]);
  
  // IDAT chunk
  const idatCrc = crc32(Buffer.concat([Buffer.from('IDAT'), compressedData]));
  const idatChunk = Buffer.concat([
    Buffer.from([(compressedData.length >>> 24) & 0xFF, (compressedData.length >>> 16) & 0xFF, (compressedData.length >>> 8) & 0xFF, compressedData.length & 0xFF]),
    Buffer.from('IDAT'),
    compressedData,
    Buffer.from([idatCrc >>> 24, (idatCrc >>> 16) & 0xFF, (idatCrc >>> 8) & 0xFF, idatCrc & 0xFF])
  ]);
  
  // IEND chunk
  const iendCrc = crc32(Buffer.from('IEND'));
  const iendChunk = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x00]), // Length
    Buffer.from('IEND'),
    Buffer.from([iendCrc >>> 24, (iendCrc >>> 16) & 0xFF, (iendCrc >>> 8) & 0xFF, iendCrc & 0xFF])
  ]);
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Simple CRC32 implementation
function crc32(data) {
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Create and save the PNG
try {
  const pngData = createSimplePNG();
  fs.writeFileSync('images/icon.png', pngData);
  console.log('✅ Created simple PNG icon at images/icon.png');
} catch (error) {
  console.error('❌ Failed to create PNG:', error.message);
}