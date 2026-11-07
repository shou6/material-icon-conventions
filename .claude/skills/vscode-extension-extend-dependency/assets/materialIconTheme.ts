import * as fs from 'fs';
import { createRequire } from 'module';
import * as path from 'path';

/**
 * devDependency の material-icon-theme（npm 版）から、MIT 本体が持つ association とアイコンを調べる。
 * 型定義は ESM として書かれていて CommonJS のテストから import できないので、使う部分だけ型を付けて読む。
 */
interface MaterialIconThemeModule {
  availableIconPacks: string[];
  generateManifest(config?: { activeIconPack?: string }): {
    folderNames?: Record<string, string>;
    fileExtensions?: Record<string, string>;
    fileNames?: Record<string, string>;
  };
}

const load = createRequire(__filename);
const mit = load('material-icon-theme') as MaterialIconThemeModule;
const iconsDir = path.join(path.dirname(load.resolve('material-icon-theme/package.json')), 'icons');

interface BuiltInAssociations {
  folderNames: Set<string>;
  fileExtensions: Set<string>;
  fileNames: Set<string>;
}

let cache: BuiltInAssociations | undefined;

/**
 * 全アイコンパック（パックなしを含む）のどれかで、MIT が既に割り当てている名前。
 * パックごとに manifest を作るので数秒かかる。結果は使い回す
 */
export function builtInAssociations(): BuiltInAssociations {
  if (cache) {
    return cache;
  }
  const result: BuiltInAssociations = {
    folderNames: new Set<string>(),
    fileExtensions: new Set<string>(),
    fileNames: new Set<string>(),
  };
  for (const pack of [...mit.availableIconPacks, '']) {
    const manifest = mit.generateManifest({ activeIconPack: pack });
    for (const key of ['folderNames', 'fileExtensions', 'fileNames'] as const) {
      Object.keys(manifest[key] ?? {}).forEach((name) => result[key].add(name));
    }
  }
  cache = result;
  return result;
}

/** MIT に同名の SVG アイコンがあるか（例: 'test-ts'、'folder-test'） */
export function iconExists(name: string): boolean {
  return fs.existsSync(path.join(iconsDir, name + '.svg'));
}
