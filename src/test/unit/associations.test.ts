import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { builtInAssociations, iconExists } from '../support/materialIconTheme';

// out/test/unit から見たプロジェクトルート
const ROOT = path.resolve(__dirname, '../../..');

const FILES = 'material-icon-theme.files.associations';
const FOLDERS = 'material-icon-theme.folders.associations';
const FOLDER_CLONES = 'material-icon-theme.folders.customClones';

/** MIT の folders.customClones の 1 件。既存のフォルダアイコン base を color で塗り替えた専用アイコンを作る */
interface FolderClone {
  name: string;
  base: string;
  color: string;
  lightColor?: string;
  folderNames?: string[];
}

interface Manifest {
  main?: string;
  extensionDependencies?: string[];
  contributes?: { configurationDefaults?: Record<string, unknown> };
}

function readManifestText(): string {
  return fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8');
}

function defaults(): Record<string, unknown> {
  const manifest = JSON.parse(readManifestText()) as Manifest;
  return manifest.contributes?.configurationDefaults ?? {};
}

function associations(key: string): Record<string, string> {
  return (defaults()[key] as Record<string, string> | undefined) ?? {};
}

function folderClones(): FolderClone[] {
  return (defaults()[FOLDER_CLONES] as FolderClone[] | undefined) ?? [];
}

/** 専用アイコンに割り当てるフォルダ名をすべて */
function cloneFolderNames(): string[] {
  return folderClones().flatMap((clone) => clone.folderNames ?? []);
}

/** `*.mock.ts` のようにワイルドカードで始まるキーか。それ以外は完全一致のファイル名として扱われる */
function isExtensionKey(key: string): boolean {
  return /^\*{1,2}\./.test(key);
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

  test('postgres フォルダは database のアイコンになる', () => {
    assert.strictEqual(associations(FOLDERS)['postgres'], 'database');
  });

  test('WXT が作る .wxt フォルダは temp のアイコンになる', () => {
    assert.strictEqual(associations(FOLDERS)['.wxt'], 'temp');
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

  test('ble.sh の設定ファイル .blerc は console のアイコンになる', () => {
    assert.strictEqual(associations(FILES)['.blerc'], 'console');
  });

  test('Python の Mako テンプレートは python-misc のアイコンになる（template は既定のファイルと同じ灰色で区別しにくい）', () => {
    assert.strictEqual(associations(FILES)['*.mako'], 'python-misc');
  });
});

suite('色違いの専用アイコン: 仕様の代表例', () => {
  const clone = (name: string): FolderClone | undefined =>
    folderClones().find((c) => c.name === name);

  test('installer フォルダは、packages を元にした専用アイコンになる', () => {
    assert.strictEqual(clone('installer')?.base, 'packages');
    assert.deepStrictEqual(clone('installer')?.folderNames, ['installer', 'installers']);
  });

  test('WXT の entrypoints フォルダは、app を元にした専用アイコンになる', () => {
    assert.strictEqual(clone('entrypoints')?.base, 'app');
    assert.deepStrictEqual(clone('entrypoints')?.folderNames, ['entrypoints']);
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
      [...Object.keys(associations(FOLDERS)), ...cloneFolderNames()].filter((name) =>
        builtIn.has(name)
      ),
      []
    );
  });

  test('ファイルの拡張子とファイル名は、MIT のどのアイコンパックでも未対応のものだけ', () => {
    const { fileExtensions, fileNames } = builtInAssociations();
    assert.deepStrictEqual(
      Object.keys(associations(FILES)).filter((key) =>
        isExtensionKey(key) ? fileExtensions.has(extensionOf(key)) : fileNames.has(key)
      ),
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

  test('ファイルのキーは *.拡張子 かファイル名の形（MIT は *.mock.* のようなグロブを解釈しない）', () => {
    assert.deepStrictEqual(
      Object.keys(associations(FILES)).filter(
        (key) => !/^\*\.[a-z0-9][a-z0-9.-]*$/.test(key) && !/^[a-z0-9._-]+$/.test(key)
      ),
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

suite('色違いの専用アイコン: MIT との整合', () => {
  test('元にするフォルダアイコンは、閉じた状態と開いた状態の両方が MIT にある', () => {
    const missing = folderClones().flatMap((clone) =>
      ['folder-' + clone.base, 'folder-' + clone.base + '-open'].filter((name) => !iconExists(name))
    );
    assert.ok(folderClones().length > 0, FOLDER_CLONES + ' が空');
    assert.deepStrictEqual(missing, []);
  });

  test('専用アイコンの名前は、MIT の既存アイコンと衝突せず、互いに重複しない', () => {
    const names = folderClones().map((clone) => clone.name);
    assert.deepStrictEqual(
      names.filter((name) => iconExists('folder-' + name)),
      [],
      'MIT に同名のアイコンがある'
    );
    assert.deepStrictEqual(
      names.filter((name, i) => names.indexOf(name) !== i),
      [],
      '重複'
    );
  });

  test('色は MIT が受け付ける形（#RRGGBB か、Material のパレット名）', () => {
    const palette = /^[a-z]+(-[a-z]+)*-(50|[1-9]00|A[1-7]00)$/;
    const invalid = folderClones().flatMap((clone) =>
      [clone.color, clone.lightColor]
        .filter((color): color is string => color !== undefined)
        .filter((color) => !/^#[0-9a-f]{6}$/i.test(color) && !palette.test(color))
    );
    assert.deepStrictEqual(invalid, []);
  });

  test('割り当てるフォルダ名は小文字で、association や他の専用アイコンと重複しない', () => {
    const names = [...Object.keys(associations(FOLDERS)), ...cloneFolderNames()];
    assert.deepStrictEqual(
      names.filter((name) => name !== name.toLowerCase()),
      [],
      '小文字でない'
    );
    assert.deepStrictEqual(
      names.filter((name, i) => names.indexOf(name) !== i),
      [],
      '重複'
    );
  });
});
