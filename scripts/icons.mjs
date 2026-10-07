import fs from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import { crc32 } from './zip.mjs';
function chunk(type, data) {
  const label = Buffer.from(type), result = Buffer.alloc(12 + data.length);
  result.writeUInt32BE(data.length); label.copy(result, 4); data.copy(result, 8); result.writeUInt32BE(crc32(Buffer.concat([label, data])), 8 + data.length); return result;
}
for (const size of [16, 32, 48, 128]) {
  const pixels = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const px = (x + .5) / size, py = (y + .5) / size, index = y * (size * 4 + 1) + 1 + x * 4;
    const corner = Math.hypot(Math.max(.17 - px, 0, px - .83), Math.max(.17 - py, 0, py - .83)) < .13;
    const bubble = px > .19 && px < .81 && py > .2 && py < .72;
    const tail = py >= .72 && py < .86 && px > .27 && px < .49 - (py - .72);
    const u = px > .32 && px < .69 && py > .31 && py < .62 && (px < .4 || px > .61 || py > .54);
    const color = u ? [19, 37, 51, 255] : bubble || tail ? [145, 233, 190, 255] : corner ? [25, 44, 66, 255] : [0, 0, 0, 0];
    pixels.set(color, index);
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(size); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 6;
  await fs.writeFile(new URL('../extension/icons/' + size + '.png', import.meta.url), Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]));
}
console.log('Generated extension icons.');
