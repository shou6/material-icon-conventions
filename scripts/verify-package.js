// 公開パッケージ（VSIX）に入るファイルが、意図したものだけであることを確かめる。
// 使い方: node scripts/verify-package.js
//
// 実際に起きた問題: 除外リスト方式だった時、動作確認のログ（利用者のプロジェクトの技術スタックや
// 依存パッケージ名を含む）がパッケージに入っていた。公開したパッケージは取り消せないので、
// package.json の files（許可リスト）に加えて、vsce が実際に入れるファイルの一覧でも検査する。
const { execFileSync } = require('child_process');
const path = require('path');

/** パッケージに入ってよいファイル */
const ALLOWED = [
  /^package\.json$/,
  /^package\.nls(\.[a-z-]+)?\.json$/,
  /^README\.md$/,
  /^CHANGELOG\.md$/,
  /^LICENSE(\.txt|\.md)?$/,
  /^resources\/[\w.-]+\.(png|svg)$/,
];

const root = path.resolve(__dirname, '..');
const vsce = path.join(root, 'node_modules', '@vscode', 'vsce', 'vsce');
const output = execFileSync(process.execPath, [vsce, 'ls'], { cwd: root, encoding: 'utf8' });
const files = output
  .split(/\r?\n/)
  .map((line) => line.trim().replace(/\\/g, '/'))
  .filter((line) => line !== '' && !line.startsWith('>') && !/^\s*(INFO|WARNING)\b/.test(line));

const unexpected = files.filter((file) => !ALLOWED.some((pattern) => pattern.test(file)));
const required = [
  'package.json',
  'README.md',
  'LICENSE',
  'resources/icon.png',
];
const missing = required.filter((file) => !files.includes(file));

console.log('Files in the package (' + files.length + '):');
for (const file of files) {
  console.log('  ' + file);
}

if (unexpected.length > 0 || missing.length > 0) {
  if (unexpected.length > 0) {
    console.error('\nUnexpected files in the package:\n  ' + unexpected.join('\n  '));
  }
  if (missing.length > 0) {
    console.error('\nMissing from the package:\n  ' + missing.join('\n  '));
  }
  process.exit(1);
}
console.log('\nOK: the package contains only the expected files.');
