import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { builtInAssociations, iconExists } from '../support/materialIconTheme';

// out/test/unit から見たプロジェクトルート
const ROOT = path.resolve(__dirname, '../../..');

const FILES = 'material-icon-theme.files.associations';
const FOLDERS = 'material-icon-theme.folders.associations';

interface Manifest {
  main?: string;
  extensionDependencies?: string[];
  contributes?: { configurationDefaults?: Record<string, Record<string, string> | undefined> };
}

function readManifestText(): string {
  return fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8');
}

function associations(key: string): Record<string, string> {
  const manifest = JSON.parse(readManifestText()) as Manifest;
  return manifest.contributes?.configurationDefaults?.[key] ?? {};
}

/** `*.mock.ts` → `mock.ts`。MIT は先頭の `*.` か `**.` を外して拡張子として扱う */
function extensionOf(key: string): string {
  return key.replace(/^\*{1,2}\./, '');
}

suite('package.json: 宣言だけの拡張機能', () => {
  const manifest = (): Manifest => JSON.parse(readManifestText()) as Manifest;

  test('Material Icon Theme に依存する', () => {
    assert.deepStrictEqual(manifest().extensionDependencies, ['PKief.material-icon-theme']);
  });

  test('実行時のコードを持たない（main が無い）', () => {
    assert.strictEqual(manifest().main, undefined);
  });

  test('ファイルとフォルダの association を、両方とも提供している', () => {
    assert.ok(Object.keys(associations(FILES)).length > 0, FILES + ' が空');
    assert.ok(Object.keys(associations(FOLDERS)).length > 0, FOLDERS + ' が空');
  });
});

suite('association: 仕様の代表例', () => {
  test('Go の testdata フォルダは test のアイコンになる', () => {
    assert.strictEqual(associations(FOLDERS)['testdata'], 'test');
  });

  test('stubs フォルダは mock のアイコンになる', () => {
    assert.strictEqual(associations(FOLDERS)['stubs'], 'mock');
  });

  test('*.mock.ts はテスト用の TypeScript のアイコンになる', () => {
    assert.strictEqual(associations(FILES)['*.mock.ts'], 'test-ts');
  });

  test('*.mock.tsx はテスト用の JSX のアイコンになる', () => {
    assert.strictEqual(associations(FILES)['*.mock.tsx'], 'test-jsx');
  });

  test('*.fixture.js はテスト用の JavaScript のアイコンになる', () => {
    assert.strictEqual(associations(FILES)['*.fixture.js'], 'test-js');
  });
});

suite('association: MIT との整合', () => {
  suiteSetup(function () {
    // 全アイコンパックの manifest を作るのに数秒かかる。ここで一度だけ作っておく
    this.timeout(60_000);
    builtInAssociations();
  });

  test('フォルダ名は、MIT のどのアイコンパックでも未対応のものだけ', () => {
    const builtIn = builtInAssociations().folderNames;
    assert.deepStrictEqual(
      Object.keys(associations(FOLDERS)).filter((name) => builtIn.has(name)),
      []
    );
  });

  test('ファイルの拡張子は、MIT のどのアイコンパックでも未対応のものだけ', () => {
    const builtIn = builtInAssociations().fileExtensions;
    assert.deepStrictEqual(
      Object.keys(associations(FILES)).filter((key) => builtIn.has(extensionOf(key))),
      []
    );
  });

  test('フォルダのアイコンは、閉じた状態と開いた状態の両方が MIT にある', () => {
    const missing = Object.values(associations(FOLDERS)).flatMap((icon) =>
      ['folder-' + icon, 'folder-' + icon + '-open'].filter((name) => !iconExists(name))
    );
    assert.deepStrictEqual([...new Set(missing)], []);
  });

  test('ファイルのアイコンは MIT にある', () => {
    const missing = Object.values(associations(FILES)).filter((icon) => !iconExists(icon));
    assert.deepStrictEqual([...new Set(missing)], []);
  });

  test('ファイルのキーは *.拡張子 の形（MIT は *.mock.* のようなグロブを解釈しない）', () => {
    assert.deepStrictEqual(
      Object.keys(associations(FILES)).filter((key) => !/^\*\.[a-z0-9][a-z0-9.-]*$/.test(key)),
      []
    );
  });

  test('キーと値はすべて小文字（MIT は小文字にしてから照合する）', () => {
    for (const key of [FILES, FOLDERS]) {
      const entries = Object.entries(associations(key));
      assert.deepStrictEqual(
        entries.filter(
          ([name, icon]) => name !== name.toLowerCase() || icon !== icon.toLowerCase()
        ),
        [],
        key
      );
    }
  });

  test('同じキーを 2 回書いていない（JSON.parse は後の値で黙って上書きする）', () => {
    const text = readManifestText();
    for (const key of [FILES, FOLDERS]) {
      const start = text.indexOf('"' + key + '"');
      assert.ok(start !== -1, key + ' が無い');
      const block = text.slice(start, text.indexOf('}', start));
      const names = [...block.matchAll(/"([^"]+)"\s*:\s*"/g)].map((m) => m[1]);
      assert.deepStrictEqual(
        names.filter((name, i) => names.indexOf(name) !== i),
        [],
        key
      );
    }
  });
});
