// テンプレートから作ったリポジトリを、新しい拡張機能の名前で初期化する。
// 使い方: npm run init -- <name> "<Display Name>"
//   例:   npm run init -- table-helper "Table Helper"
//
// 仮の名前（my-extension、My Extension、myExtension）を置き換え、README を拡張機能用のものに入れ替え、
// 初期化にだけ使うファイル（このスクリプトを含む）を消す。
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const [name, displayName] = process.argv.slice(2);

if (!name || !displayName) {
  console.error('使い方: npm run init -- <name> "<Display Name>"');
  console.error('  例:   npm run init -- table-helper "Table Helper"');
  process.exit(1);
}

// 処理の中身は out/ の実装を使う（単体テストで検証済み）。まだコンパイルされていなければ先に行う
const helperPath = path.join(root, 'out', 'tooling', 'initTemplate.js');
if (!fs.existsSync(helperPath)) {
  const compile = spawnSync('npm run compile-tests', { cwd: root, stdio: 'inherit', shell: true });
  if (compile.status !== 0) {
    process.exit(compile.status ?? 1);
  }
}
const { initTemplate } = require(helperPath);

try {
  initTemplate(root, { name, displayName });
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}

console.log(
  [
    '',
    name + '（' + displayName + '）として初期化しました。',
    '',
    '次にすること:',
    '  npm install   package-lock.json の名前を合わせる',
    '  npm test      単体テストと統合テストが通ることを確かめる',
    '  README.md、README.ja.md、CLAUDE.md に拡張機能の説明を書く',
  ].join('\n')
);
