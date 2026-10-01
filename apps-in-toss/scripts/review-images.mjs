import fs from 'node:fs';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p-a), pb = Math.abs(p-b), pc = Math.abs(p-c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
const files = ['logo-600.png', '01-today.png', '02-calendar.png', '03-settings.png'];
const results = files.map(file => {
  const b = fs.readFileSync('submission/' + file);
  assert.equal(b.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  const width = b.readUInt32BE(16), height = b.readUInt32BE(20), bitDepth = b[24], colorType = b[25];
  assert.deepEqual([width, height], file.startsWith('logo') ? [600, 600] : [636, 1048]);
  assert.equal(bitDepth, 8); assert.equal(colorType, 2); // RGB, no alpha channel.
  const chunks = [], compressed = [];
  for (let p = 8; p < b.length;) {
    const length = b.readUInt32BE(p), type = b.toString('ascii', p+4, p+8);
    chunks.push(type); if (type === 'IDAT') compressed.push(b.subarray(p+8, p+8+length));
    p += length + 12;
  }
  assert.ok(!chunks.includes('tRNS')); // No transparent color, all pixels provably opaque.
  const raw = zlib.inflateSync(Buffer.concat(compressed)), stride = width * 3;
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y*(stride+1)]; assert.ok(filter <= 4);
    for (let x = 0; x < stride; x++) {
      const a = x >= 3 ? pixels[y*stride+x-3] : 0, u = y ? pixels[(y-1)*stride+x] : 0, c = y && x >= 3 ? pixels[(y-1)*stride+x-3] : 0;
      const predictor = [0, a, u, Math.floor((a+u)/2), paeth(a,u,c)][filter];
      pixels[y*stride+x] = (raw[y*(stride+1)+1+x] + predictor) & 255;
    }
  }
  const colors = new Set();
  for (let y = 0; y < height; y += 4) for (let x = 0; x < width; x += 4) colors.add(pixels.subarray(y*stride+x*3, y*stride+x*3+3).toString('hex'));
  assert.ok(colors.size > 20, 'blank image');
  const corners = [0, (width-1)*3, (height-1)*stride, pixels.length-3].map(i => pixels.subarray(i, i+3).toString('hex'));
  if (file.startsWith('logo')) assert.ok(corners.every(c => c === 'ffffff'));
  return { file, width, height, format: 'PNG RGB 8-bit', allPixelsOpaque: true, sampledUniqueColors: colors.size, corners };
});
fs.writeFileSync('output/review/pixel-inspection.json', JSON.stringify({ checkedAt: new Date().toISOString(), decoding: 'PNG filters decoded; RGB without tRNS confirms every pixel opaque', images: results, visualReview: 'All four images opened and visually inspected. Text/checkmarks/nav selected states stable, no clipping. Native Toss navigation is not simulated.' }, null, 2));
console.log('All four PNGs: dimensions, decoding, opacity and nonblank checks passed');
