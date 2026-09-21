// 拡張機能の仮アイコン（resources/icon.png）を生成する。
// 使い方: npm run icon
//
// Marketplace のアイコンは 128px 以上の PNG でなければならない（SVG は受け付けられない）。
// 画像ライブラリに依存せず、Node 標準の zlib だけで PNG を書き出す。
// 図案は角丸の四角を 2 つ重ねただけの仮のもの。公開前に本来のアイコンへ差し替えるか、
// 下の色と colorAt() を書き換えて作り直す。
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 256;
/** 縁をなめらかにするため、1 画素を SS x SS に分けて塗り、平均を取る */
const SS = 4;

const BACKGROUND = [0x1f, 0x29, 0x37];
const FOREGROUND = [0x60, 0xa5, 0xfa];

/** 角丸の四角の内側か */
function inRoundedRect(x, y, left, top, width, height, radius) {
  if (x < left || y < top || x > left + width || y > top + height) {
    return false;
  }
  const cx = Math.min(Math.max(x, left + radius), left + width - radius);
  const cy = Math.min(Math.max(y, top + radius), top + height - radius);
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}

/** 座標 (x, y) の色。透明なら null。上に描くものほど先に判定する */
function colorAt(x, y) {
  if (!inRoundedRect(x, y, 0, 0, SIZE, SIZE, 56)) {
    return null;
  }
  if (inRoundedRect(x, y, 64, 64, 128, 128, 24)) {
    return FOREGROUND;
  }
  return BACKGROUND;
}

function renderPixels() {
  const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
  for (let py = 0; py < SIZE; py++) {
    const row = py * (SIZE * 4 + 1);
    raw[row] = 0; // フィルタなし
    for (let px = 0; px < SIZE; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const color = colorAt(px + (sx + 0.5) / SS, py + (sy + 0.5) / SS);
          if (color) {
            r += color[0];
            g += color[1];
            b += color[2];
            a += 1;
          }
        }
      }
      const offset = row + 1 + px * 4;
      raw[offset] = a ? Math.round(r / a) : 0;
      raw[offset + 1] = a ? Math.round(g / a) : 0;
      raw[offset + 2] = a ? Math.round(b / a) : 0;
      raw[offset + 3] = Math.round((a / (SS * SS)) * 255);
    }
  }
  return raw;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) {
    c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

const header = Buffer.alloc(13);
header.writeUInt32BE(SIZE, 0);
header.writeUInt32BE(SIZE, 4);
header[8] = 8; // ビット深度
header[9] = 6; // RGBA
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', header),
  chunk('IDAT', zlib.deflateSync(renderPixels(), { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = path.resolve(__dirname, '../resources/icon.png');
fs.writeFileSync(out, png);
console.log('wrote ' + out + ' (' + SIZE + 'x' + SIZE + ', ' + png.length + ' bytes)');
