import { deflateRawSync, inflateRawSync } from 'node:zlib';
export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
export function zip(files) {
  const bodies = [], directory = []; let offset = 0;
  for (const { name, bytes } of files) {
    const filename = Buffer.from(name), compressed = deflateRawSync(bytes), crc = crc32(bytes);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x800, 6); header.writeUInt16LE(8, 8); header.writeUInt16LE(33, 12);
    header.writeUInt32LE(crc, 14); header.writeUInt32LE(compressed.length, 18); header.writeUInt32LE(bytes.length, 22); header.writeUInt16LE(filename.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x800, 8); central.writeUInt16LE(8, 10); central.writeUInt16LE(33, 14);
    central.writeUInt32LE(crc, 16); central.writeUInt32LE(compressed.length, 20); central.writeUInt32LE(bytes.length, 24); central.writeUInt16LE(filename.length, 28); central.writeUInt32LE(offset, 42);
    bodies.push(header, filename, compressed); directory.push(central, filename); offset += header.length + filename.length + compressed.length;
  }
  const index = Buffer.concat(directory), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(index.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...bodies, index, end]);
}
export function unzip(bytes) {
  const files = new Map(); let position = 0;
  while (bytes.readUInt32LE(position) === 0x04034b50) {
    const size = bytes.readUInt32LE(position + 18), length = bytes.readUInt16LE(position + 26), extra = bytes.readUInt16LE(position + 28);
    const name = bytes.subarray(position + 30, position + 30 + length).toString('utf8'), start = position + 30 + length + extra;
    const data = inflateRawSync(bytes.subarray(start, start + size));
    if (crc32(data) !== bytes.readUInt32LE(position + 14)) throw new Error('Package CRC mismatch: ' + name);
    files.set(name, data); position = start + size;
  }
  return files;
}
