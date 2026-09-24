// association に足したい名前が、MIT（devDependency の material-icon-theme）で未対応かを調べる。
// 使い方: npm run check:candidates -- cronjob "*.agent.md=copilot" agents
//
// `名前=アイコン` の形にすると、そのアイコンが使えるかも確かめる。
// 追加した後の重複の検査は単体テストが行う。これは追加する前の下調べに使う。
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const candidates = process.argv.slice(2);
if (candidates.length === 0) {
  console.error('使い方: npm run check:candidates -- <名前>[=<アイコン>] ...');
  process.exit(1);
}

// 照合は out/ の実装を使う（単体テストで検証済み）。まだコンパイルされていなければ先に行う
const helperPath = path.join(root, 'out', 'tooling', 'checkCandidates.js');
if (!fs.existsSync(helperPath)) {
  const compile = spawnSync('npm run compile-tests', { cwd: root, stdio: 'inherit', shell: true });
  if (compile.status !== 0) {
    process.exit(compile.status ?? 1);
  }
}
const { checkCandidate, formatRows } = require(helperPath);

// 全アイコンパック（パックなしを含む）のどれかで MIT が割り当てている名前
const mit = require('material-icon-theme');
const iconsDir = path.join(
  path.dirname(require.resolve('material-icon-theme/package.json')),
  'icons'
);
const catalog = {
  folderNames: new Map(),
  fileExtensions: new Map(),
  fileNames: new Map(),
  iconExists: (name) => fs.existsSync(path.join(iconsDir, name + '.svg')),
};
for (const pack of [...mit.availableIconPacks, '']) {
  const manifest = mit.generateManifest({ activeIconPack: pack });
  for (const key of ['folderNames', 'fileExtensions', 'fileNames']) {
    for (const [name, icon] of Object.entries(manifest[key] ?? {})) {
      catalog[key].set(name.toLowerCase(), icon);
    }
  }
}

const defaults = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).contributes
  .configurationDefaults;
const own = {
  files: defaults['material-icon-theme.files.associations'] ?? {},
  folders: defaults['material-icon-theme.folders.associations'] ?? {},
  cloneFolderNames: (defaults['material-icon-theme.folders.customClones'] ?? []).flatMap(
    (clone) => clone.folderNames ?? []
  ),
};

console.log(
  'material-icon-theme ' + require('material-icon-theme/package.json').version + ' と照合\n'
);
console.log(formatRows(candidates.flatMap((arg) => checkCandidate(arg, catalog, own))));
