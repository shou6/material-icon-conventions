/**
 * `npm run init` の中身（scripts/init.js が使う）。
 * テンプレートから作ったリポジトリを、新しい拡張機能の名前で初期化する。
 */
import * as fs from 'fs';
import * as path from 'path';

export interface InitOptions {
  /** 拡張機能の ID（package.json の name）。例: table-helper */
  name: string;
  /** Marketplace やコマンドパレットに出る名前。例: Table Helper */
  displayName: string;
}

/** テンプレートに書いてある仮の名前 */
const PLACEHOLDERS = {
  name: 'my-extension',
  displayName: 'My Extension',
  commandPrefix: 'myExtension',
};

/** 仮の名前のどれかに一致する */
export const PLACEHOLDER_PATTERN = new RegExp(Object.values(PLACEHOLDERS).join('|'));

/** 拡張機能用の README を置いているフォルダ。初期化で README と入れ替える */
const TEMPLATE_DIR = '.template';

/** 初期化にだけ使い、終わったら消すもの */
const INIT_ONLY = [
  TEMPLATE_DIR,
  'scripts/init.js',
  'src/tooling/initTemplate.ts',
  'src/test/unit/initTemplate.test.ts',
  // 古いコンパイル結果が残ると、消したテストを mocha が動かしてしまう
  'out',
];

/** 置き換えの対象にしないフォルダ */
const SKIP_DIRS = new Set(['.git', 'node_modules', 'out', 'dist', '.vscode-test']);

/** 置き換えの対象にしないファイル（バイナリ） */
const BINARY = /\.(png|jpe?g|gif|ico|vsix)$/i;

/** 名前が使えない形なら、その理由を返す */
export function validateName(name: string): string | undefined {
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name)) {
    return (
      '名前は小文字の英字で始め、小文字・数字・ハイフンだけで書いてください' +
      '（ハイフンは連続させず、末尾にも置かない）: ' +
      JSON.stringify(name)
    );
  }
  return undefined;
}

/** table-helper → tableHelper */
export function toCamelCase(name: string): string {
  return name.replace(/-([a-z0-9])/g, (_, ch: string) => ch.toUpperCase());
}

/** 仮の名前を置き換える。1 回で置き換えるので、置き換えた結果がもう一度置き換わることはない */
export function replacePlaceholders(text: string, options: InitOptions): string {
  const values: Record<string, string> = {
    [PLACEHOLDERS.name]: options.name,
    [PLACEHOLDERS.displayName]: options.displayName,
    [PLACEHOLDERS.commandPrefix]: toCamelCase(options.name),
  };
  return text.replace(new RegExp(PLACEHOLDER_PATTERN.source, 'g'), (match) => values[match]);
}

/** package.json から npm run init の行を消す。整形を崩さないよう、行単位で消す */
function removeInitScript(packageJson: string): string {
  return packageJson.replace(/^[ \t]*"init": "[^"\n]*",?\r?\n/m, '');
}

function listTextFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return SKIP_DIRS.has(entry.name) ? [] : listTextFiles(full);
    }
    return BINARY.test(entry.name) ? [] : [full];
  });
}

export function initTemplate(root: string, options: InitOptions): void {
  const error = validateName(options.name);
  if (error) {
    throw new Error(error);
  }
  if (options.displayName.trim() === '') {
    throw new Error('表示名が空です');
  }
  const templateDir = path.join(root, TEMPLATE_DIR);
  if (!fs.existsSync(templateDir)) {
    throw new Error(TEMPLATE_DIR + '/ がありません。このリポジトリは初期化済みです');
  }

  for (const readme of ['README.md', 'README.ja.md']) {
    fs.copyFileSync(path.join(templateDir, readme), path.join(root, readme));
  }
  for (const entry of INIT_ONLY) {
    fs.rmSync(path.join(root, entry), { recursive: true, force: true });
  }

  const packageJson = path.join(root, 'package.json');
  fs.writeFileSync(packageJson, removeInitScript(fs.readFileSync(packageJson, 'utf8')));

  for (const file of listTextFiles(root)) {
    const text = fs.readFileSync(file, 'utf8');
    const replaced = replacePlaceholders(text, options);
    if (replaced !== text) {
      fs.writeFileSync(file, replaced);
    }
  }
}
