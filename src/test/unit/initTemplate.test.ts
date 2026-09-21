import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  initTemplate,
  InitOptions,
  PLACEHOLDER_PATTERN,
  replacePlaceholders,
  toCamelCase,
  validateName,
} from '../../tooling/initTemplate';

// out/test/unit から見たプロジェクトルート
const ROOT = path.resolve(__dirname, '../../..');

/** コピーしないフォルダ。out/ は初期化で消えることを確かめるため、別に作る */
const SKIP = new Set(['.git', 'node_modules', 'out', 'dist', '.vscode-test']);

const OPTIONS: InitOptions = { name: 'table-helper', displayName: 'Table Helper' };

/** リポジトリを一時ディレクトリにコピーする。本物のリポジトリは書き換えない */
function copyRepository(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'init-template-'));
  fs.cpSync(ROOT, dir, {
    recursive: true,
    filter: (source) => !SKIP.has(path.basename(source)) || source === ROOT,
  });
  fs.mkdirSync(path.join(dir, 'out', 'tooling'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'out', 'tooling', 'initTemplate.js'), '');
  return dir;
}

/** バイナリを除いた全ファイル（相対パス） */
function textFiles(dir: string, base = dir): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return textFiles(full, base);
    }
    return /\.(png|jpe?g|gif|ico|vsix)$/i.test(entry.name) ? [] : [path.relative(base, full)];
  });
}

function read(dir: string, file: string): string {
  return fs.readFileSync(path.join(dir, file), 'utf8');
}

suite('validateName', () => {
  test('小文字・数字・ハイフンの名前を受け付ける', () => {
    for (const name of ['table-helper', 'foo', 'foo2', 'a-b-c']) {
      assert.strictEqual(validateName(name), undefined, name);
    }
  });

  test('npm と Marketplace で使えない形の名前を拒否する', () => {
    for (const name of [
      '',
      'TableHelper',
      '2foo',
      '-foo',
      'foo-',
      'foo--bar',
      'foo_bar',
      'foo bar',
    ]) {
      assert.ok(validateName(name), JSON.stringify(name));
    }
  });
});

suite('toCamelCase', () => {
  test('ハイフン区切りの名前を、コマンドの接頭辞に使う camelCase にする', () => {
    assert.strictEqual(toCamelCase('table-helper'), 'tableHelper');
    assert.strictEqual(toCamelCase('a-b-c'), 'aBC');
    assert.strictEqual(toCamelCase('foo'), 'foo');
  });
});

suite('replacePlaceholders', () => {
  test('名前、表示名、コマンドの接頭辞を置き換える', () => {
    const text = 'my-extension / My Extension / myExtension.helloWorld';
    assert.strictEqual(
      replacePlaceholders(text, OPTIONS),
      'table-helper / Table Helper / tableHelper.helloWorld'
    );
  });

  test('置き換えた結果を、もう一度置き換えない', () => {
    const options = { name: 'my-extension-pro', displayName: 'My Extension Pro' };
    assert.strictEqual(
      replacePlaceholders('my-extension, My Extension', options),
      'my-extension-pro, My Extension Pro'
    );
  });
});

suite('initTemplate', () => {
  test('package.json の名前、表示名、コマンド、リポジトリの URL を置き換える', () => {
    const dir = copyRepository();
    initTemplate(dir, OPTIONS);
    const pkg = JSON.parse(read(dir, 'package.json')) as {
      name: string;
      displayName: string;
      repository: { url: string };
      contributes: { commands: { command: string; category: string }[] };
      scripts: Record<string, string>;
    };
    assert.strictEqual(pkg.name, 'table-helper');
    assert.strictEqual(pkg.displayName, 'Table Helper');
    assert.match(pkg.repository.url, /\/table-helper\.git$/);
    assert.deepStrictEqual(
      pkg.contributes.commands.map((c) => [c.command, c.category]),
      [['tableHelper.helloWorld', 'Table Helper']]
    );
  });

  test('テンプレート以外のどのファイルにも、仮の名前が残らない', () => {
    const dir = copyRepository();
    initTemplate(dir, OPTIONS);
    const left = textFiles(dir).filter((file) => PLACEHOLDER_PATTERN.test(read(dir, file)));
    assert.deepStrictEqual(left, []);
  });

  test('README をテンプレートの説明から、拡張機能の README に入れ替える', () => {
    const dir = copyRepository();
    const english = read(dir, '.template/README.md');
    const japanese = read(dir, '.template/README.ja.md');
    initTemplate(dir, OPTIONS);
    assert.strictEqual(read(dir, 'README.md'), replacePlaceholders(english, OPTIONS));
    assert.strictEqual(read(dir, 'README.ja.md'), replacePlaceholders(japanese, OPTIONS));
    assert.ok(!fs.existsSync(path.join(dir, '.template')));
  });

  test('初期化にだけ使うファイルと npm run init を消す', () => {
    const dir = copyRepository();
    initTemplate(dir, OPTIONS);
    for (const file of [
      'scripts/init.js',
      'src/tooling/initTemplate.ts',
      'src/test/unit/initTemplate.test.ts',
      // 古いコンパイル結果が残ると、消したテストを mocha が動かしてしまう
      'out',
    ]) {
      assert.ok(!fs.existsSync(path.join(dir, file)), file + ' が残っている');
    }
    const pkg = JSON.parse(read(dir, 'package.json')) as { scripts: Record<string, string> };
    assert.strictEqual(pkg.scripts.init, undefined);
    assert.ok(pkg.scripts.compile, 'ほかの scripts まで消えている');
  });

  test('初期化済みのリポジトリでもう一度実行すると、何も変えずに例外にする', () => {
    const dir = copyRepository();
    initTemplate(dir, OPTIONS);
    const before = read(dir, 'package.json');
    assert.throws(() => initTemplate(dir, { name: 'other', displayName: 'Other' }));
    assert.strictEqual(read(dir, 'package.json'), before);
  });

  test('名前か表示名が不正なら、何も変えずに例外にする', () => {
    const dir = copyRepository();
    const before = read(dir, 'package.json');
    assert.throws(() => initTemplate(dir, { name: 'Bad Name', displayName: 'Bad' }));
    assert.throws(() => initTemplate(dir, { name: 'good-name', displayName: '  ' }));
    assert.strictEqual(read(dir, 'package.json'), before);
    assert.ok(fs.existsSync(path.join(dir, '.template')));
  });
});

suite('package.json: init スクリプト', () => {
  test('npm run init で scripts/init.js を実行する', () => {
    const pkg = JSON.parse(read(ROOT, 'package.json')) as { scripts?: Record<string, string> };
    assert.match(pkg.scripts?.init ?? '', /scripts\/init\.js/);
  });
});
