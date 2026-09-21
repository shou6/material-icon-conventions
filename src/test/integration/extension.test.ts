import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

// out/test/integration から見たプロジェクトルート
const ROOT = path.resolve(__dirname, '../../..');

const MATERIAL_ICON_THEME = 'PKief.material-icon-theme';

interface Manifest {
  name: string;
  publisher: string;
  contributes?: { configurationDefaults?: Record<string, Record<string, string> | undefined> };
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
    readManifest().contributes?.configurationDefaults?.[
      'material-icon-theme.' + section + '.associations'
    ] ?? {}
  );
}

/** MIT が設定を反映して書き出したアイコンテーマの定義 */
async function generatedIconTheme(): Promise<{
  folderNames: Record<string, string>;
  fileExtensions: Record<string, string>;
}> {
  const mit = vscode.extensions.getExtension(MATERIAL_ICON_THEME);
  assert.ok(mit, MATERIAL_ICON_THEME + ' が入っていない');
  // 有効化の中で設定の変更を検知し、アイコンテーマの定義を書き直す
  await mit.activate();
  const themes = (mit.packageJSON as { contributes: { iconThemes: { path: string }[] } })
    .contributes.iconThemes;
  const file = path.join(mit.extensionPath, themes[0].path);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as {
    folderNames: Record<string, string>;
    fileExtensions: Record<string, string>;
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
    const theme = await generatedIconTheme();
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
    const theme = await generatedIconTheme();
    const expected = declared('files');
    assert.ok(Object.keys(expected).length > 0, 'ファイルの association が無い');
    assert.deepStrictEqual(
      Object.entries(expected).filter(
        ([key, icon]) => theme.fileExtensions[key.replace(/^\*\./, '')] !== icon
      ),
      []
    );
  });
});
