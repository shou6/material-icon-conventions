/**
 * `npm run check:candidates` の中身（scripts/check-candidates.js が使う）。
 * association に足したい名前が MIT で未対応か、割り当てたいアイコンが使えるかを、追加する前に調べる。
 * MIT の読み込みはスクリプト側で行い、ここは渡された一覧との照合だけを行う。
 */

/** MIT が持つ association（キーは小文字）とアイコン */
export interface Catalog {
  folderNames: Map<string, string>;
  fileExtensions: Map<string, string>;
  fileNames: Map<string, string>;
  iconExists(name: string): boolean;
}

/** 本拡張機能が package.json で追加している分 */
export interface OwnAssociations {
  files: Record<string, string>;
  folders: Record<string, string>;
  /** 色違いの専用アイコンに割り当てたフォルダ名 */
  cloneFolderNames: string[];
}

export type CandidateKind = 'folder' | 'fileExtension' | 'fileName';

export type CandidateStatus = 'free' | 'builtIn' | 'ours';

export interface CandidateRow {
  /** 照合したキー（小文字） */
  key: string;
  kind: CandidateKind;
  status: CandidateStatus;
  /** 対応済みの時、今割り当てられているアイコン */
  current?: string;
  /** 割り当てたいアイコンを指定した時の問題点。無ければ空 */
  iconProblems: string[];
}

const EXTENSION_PREFIX = /^\*{1,2}\./;

const KIND_LABELS: Record<CandidateKind, string> = {
  folder: 'フォルダ',
  fileExtension: '拡張子',
  fileName: 'ファイル名',
};

/**
 * `名前` か `名前=アイコン` を照合する。`*.` か `**.` で始まる名前は拡張子、
 * それ以外はフォルダ名とファイル名の両方として照合する（`.wxt` のようにどちらもあり得るため）
 */
export function checkCandidate(
  arg: string,
  catalog: Catalog,
  own: OwnAssociations
): CandidateRow[] {
  const separator = arg.indexOf('=');
  const key = (separator === -1 ? arg : arg.slice(0, separator)).toLowerCase();
  const icon = separator === -1 ? undefined : arg.slice(separator + 1).toLowerCase();
  const kinds: CandidateKind[] = EXTENSION_PREFIX.test(key)
    ? ['fileExtension']
    : ['folder', 'fileName'];
  return kinds.map((kind) => ({
    key,
    kind,
    ...lookup(key, kind, catalog, own),
    iconProblems: icon === undefined ? [] : iconProblems(icon, kind, catalog),
  }));
}

function lookup(
  key: string,
  kind: CandidateKind,
  catalog: Catalog,
  own: OwnAssociations
): { status: CandidateStatus; current?: string } {
  if (kind === 'folder') {
    const builtIn = catalog.folderNames.get(key);
    if (builtIn !== undefined) {
      return { status: 'builtIn', current: builtIn.replace(/^folder-/, '') };
    }
    const ours = lowerKeys(own.folders).get(key);
    if (ours !== undefined) {
      return { status: 'ours', current: ours };
    }
    if (own.cloneFolderNames.some((name) => name.toLowerCase() === key)) {
      return { status: 'ours', current: '(customClones)' };
    }
    return { status: 'free' };
  }
  if (kind === 'fileExtension') {
    const extension = key.replace(EXTENSION_PREFIX, '');
    const builtIn = catalog.fileExtensions.get(extension);
    if (builtIn !== undefined) {
      return { status: 'builtIn', current: builtIn };
    }
    const ours = Object.entries(own.files).find(
      ([name]) =>
        EXTENSION_PREFIX.test(name) &&
        name.replace(EXTENSION_PREFIX, '').toLowerCase() === extension
    );
    return ours ? { status: 'ours', current: ours[1] } : { status: 'free' };
  }
  const builtIn = catalog.fileNames.get(key);
  if (builtIn !== undefined) {
    return { status: 'builtIn', current: builtIn };
  }
  const ours = Object.entries(own.files).find(
    ([name]) => !EXTENSION_PREFIX.test(name) && name.toLowerCase() === key
  );
  return ours ? { status: 'ours', current: ours[1] } : { status: 'free' };
}

function lowerKeys(record: Record<string, string>): Map<string, string> {
  return new Map(Object.entries(record).map(([name, icon]) => [name.toLowerCase(), icon]));
}

/**
 * 割り当てたいアイコンが使えるか。フォルダは開いた状態のアイコンも要る。
 * ファイルは、ライトテーマ用の版（x_light）があっても association では使われない（MIT のソースで確認）
 */
function iconProblems(icon: string, kind: CandidateKind, catalog: Catalog): string[] {
  if (kind === 'folder') {
    return ['folder-' + icon, 'folder-' + icon + '-open']
      .filter((name) => !catalog.iconExists(name))
      .map((name) => name + '.svg が無い');
  }
  if (!catalog.iconExists(icon)) {
    return [icon + '.svg が無い'];
  }
  if (catalog.iconExists(icon + '_light')) {
    return [icon + '_light.svg があるが、association ではライトテーマでも ' + icon + ' が使われる'];
  }
  return [];
}

/** 1 行に 1 件。アイコンの問題はその下に `  ! ` を付けて並べる */
export function formatRows(rows: CandidateRow[]): string {
  const keyWidth = Math.max(0, ...rows.map((row) => row.key.length));
  const kindWidth = Math.max(...Object.values(KIND_LABELS).map((label) => label.length));
  return rows
    .flatMap((row) => [
      row.key.padEnd(keyWidth) +
        ' ' +
        KIND_LABELS[row.kind].padEnd(kindWidth) +
        ' ' +
        statusText(row),
      ...row.iconProblems.map((problem) => '  ! ' + problem),
    ])
    .join('\n');
}

function statusText(row: CandidateRow): string {
  switch (row.status) {
    case 'free':
      return '未対応';
    case 'builtIn':
      return 'MIT で対応済み → ' + row.current;
    case 'ours':
      return '本拡張機能で追加済み → ' + row.current;
  }
}
