import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

// out/test/integration から見たプロジェクトルート
const ROOT = path.resolve(__dirname, '../../..');

const MATERIAL_ICON_THEME = 'PKief.material-icon-theme';

interface FolderClone {
  name: string;
  folderNames?: string[];
}

interface Manifest {
  name: string;
  publisher: string;
  contributes?: { configurationDefaults?: Record<string, unknown> };
}

interface IconTheme {
  iconDefinitions: Record<string, { iconPath: string }>;
  folderNames: Record<string, string>;
  fileExtensions: Record<string, string>;
  fileNames: Record<string, string>;
}

function readManifest(): Manifest {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as Manifest;
}

function extensionId(): string {
  const manifest = readManifest();
  return manifest.publisher + '.' + manifest.name;
}

function declared(section: 'files' | 'folders'): Record<string, string> {
  return (
    (readManifest().contributes?.configurationDefaults?.[
      'material-icon-theme.' + section + '.associations'
    ] as Record<string, string> | undefined) ?? {}
  );
}

function declaredFolderClones(): FolderClone[] {
  return (
    (readManifest().contributes?.configurationDefaults?.[
      'material-icon-theme.folders.customClones'
    ] as FolderClone[] | undefined) ?? []
  );
}

/** MIT が設定を反映して書き出したアイコンテーマの定義と、その場所 */
async function generatedIconTheme(): Promise<{ theme: IconTheme; dir: string }> {
  const mit = vscode.extensions.getExtension(MATERIAL_ICON_THEME);
  assert.ok(mit, MATERIAL_ICON_THEME + ' が入っていない');
  // 有効化の中で設定の変更を検知し、アイコンテーマの定義を書き直す
  await mit.activate();
  const themes = (mit.packageJSON as { contributes: { iconThemes: { path: string }[] } })
    .contributes.iconThemes;
  const file = path.join(mit.extensionPath, themes[0].path);
  return {
    theme: JSON.parse(fs.readFileSync(file, 'utf8')) as IconTheme,
    dir: path.dirname(file),
  };
}

suite('Extension', () => {
  test('拡張機能が読み込まれている', () => {
    assert.ok(vscode.extensions.getExtension(extensionId()), '見つからない: ' + extensionId());
  });

  test('MIT の設定の既定値に、追加した association が入っている', () => {
    const config = vscode.workspace.getConfiguration('material-icon-theme');
    for (const section of ['files', 'folders'] as const) {
      const defaults = config.inspect<Record<string, string>>(
        section + '.associations'
      )?.defaultValue;
      const expected = declared(section);
      assert.ok(Object.keys(expected).length > 0, section + ' の association が無い');
      assert.deepStrictEqual(
        Object.entries(expected).filter(([name, icon]) => defaults?.[name] !== icon),
        [],
        section
      );
    }
  });

  test('MIT が生成したアイコンテーマに、追加したフォルダの association が反映されている', async () => {
    const { theme } = await generatedIconTheme();
    const expected = declared('folders');
    assert.ok(Object.keys(expected).length > 0, 'フォルダの association が無い');
    assert.deepStrictEqual(
      Object.entries(expected).filter(
        ([name, icon]) => theme.folderNames[name] !== 'folder-' + icon
      ),
      []
    );
  });

  test('MIT が生成したアイコンテーマに、追加したファイルの association が反映されている', async () => {
    const { theme } = await generatedIconTheme();
    const expected = declared('files');
    assert.ok(Object.keys(expected).length > 0, 'ファイルの association が無い');
    assert.deepStrictEqual(
      Object.entries(expected).filter(([key, icon]) =>
        key.startsWith('*.')
          ? theme.fileExtensions[key.slice(2)] !== icon
          : theme.fileNames[key] !== icon
      ),
      []
    );
  });

  test('MIT が色違いの専用アイコンを生成し、フォルダに割り当てている', async () => {
    const { theme, dir } = await generatedIconTheme();
    const clones = declaredFolderClones();
    assert.ok(clones.length > 0, '専用アイコンが無い');
    for (const clone of clones) {
      const icon = 'folder-' + clone.name;
      const definition = theme.iconDefinitions[icon];
      assert.ok(definition, icon + ' がアイコンテーマに無い');
      assert.ok(fs.existsSync(path.join(dir, definition.iconPath)), icon + ' の SVG が無い');
      assert.deepStrictEqual(
        (clone.folderNames ?? []).filter((name) => theme.folderNames[name] !== icon),
        [],
        clone.name
      );
    }
  });
});
