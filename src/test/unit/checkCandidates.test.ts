import * as assert from 'assert';
import {
  Catalog,
  CandidateRow,
  checkCandidate,
  formatRows,
  OwnAssociations,
} from '../../tooling/checkCandidates';

const ICONS = new Set([
  'folder-robot',
  'folder-robot-open',
  'folder-job',
  'folder-job-open',
  'folder-lonely',
  'agent',
  'copilot',
  'copilot_light',
]);

const CATALOG: Catalog = {
  folderNames: new Map([
    ['agents', 'folder-robot'],
    ['jobs', 'folder-job'],
  ]),
  fileExtensions: new Map([['prompt.md', 'prompt']]),
  fileNames: new Map([['agents.md', 'agent']]),
  iconExists: (name) => ICONS.has(name),
};

const OWN: OwnAssociations = {
  files: { '*.agent.md': 'agent', '.claudeignore': 'claude' },
  folders: { cron: 'job' },
  cloneFolderNames: ['installer'],
};

/** kind と status だけを比べやすい形にする */
const summary = (rows: CandidateRow[]): string[] =>
  rows.map((row) => row.kind + ' ' + row.key + ' ' + row.status + ' ' + (row.current ?? ''));

suite('checkCandidate: 名前の照合', () => {
  test('*. で始まる名前は拡張子として照合する', () => {
    assert.deepStrictEqual(summary(checkCandidate('*.mock.cts', CATALOG, OWN)), [
      'fileExtension *.mock.cts free ',
    ]);
  });

  test('**. で始まる名前も拡張子として照合する', () => {
    assert.deepStrictEqual(summary(checkCandidate('**.prompt.md', CATALOG, OWN)), [
      'fileExtension **.prompt.md builtIn prompt',
    ]);
  });

  test('それ以外の名前は、フォルダ名とファイル名の両方で照合する', () => {
    assert.deepStrictEqual(summary(checkCandidate('agents', CATALOG, OWN)), [
      'folder agents builtIn robot',
      'fileName agents free ',
    ]);
  });

  test('MIT の対応済みのフォルダは、folder- を外したアイコン名で示す（association の値と同じ形）', () => {
    assert.strictEqual(checkCandidate('jobs', CATALOG, OWN)[0].current, 'job');
  });

  test('大文字は小文字にしてから照合する（MIT と同じ）', () => {
    assert.deepStrictEqual(summary(checkCandidate('AGENTS.md', CATALOG, OWN)), [
      'folder agents.md free ',
      'fileName agents.md builtIn agent',
    ]);
  });

  test('本拡張機能で追加済みの名前は ours になる', () => {
    assert.deepStrictEqual(summary(checkCandidate('*.agent.md', CATALOG, OWN)), [
      'fileExtension *.agent.md ours agent',
    ]);
    assert.deepStrictEqual(summary(checkCandidate('cron', CATALOG, OWN)).slice(0, 1), [
      'folder cron ours job',
    ]);
    assert.deepStrictEqual(summary(checkCandidate('.claudeignore', CATALOG, OWN)).slice(1), [
      'fileName .claudeignore ours claude',
    ]);
  });

  test('色違いの専用アイコンに割り当てたフォルダ名も ours になる', () => {
    assert.deepStrictEqual(summary(checkCandidate('installer', CATALOG, OWN)).slice(0, 1), [
      'folder installer ours (customClones)',
    ]);
  });

  test('MIT でも本拡張機能でも対応済みなら、MIT を優先して示す（テストで落ちるべき重複）', () => {
    const own: OwnAssociations = { ...OWN, folders: { agents: 'robot' } };
    assert.strictEqual(checkCandidate('agents', CATALOG, own)[0].status, 'builtIn');
  });
});

suite('checkCandidate: 割り当てたいアイコンの確認（名前=アイコン）', () => {
  test('= の後ろは照合するキーに含めない', () => {
    assert.deepStrictEqual(summary(checkCandidate('cronjob=job', CATALOG, OWN)), [
      'folder cronjob free ',
      'fileName cronjob free ',
    ]);
  });

  test('フォルダは、閉じた状態と開いた状態のアイコンが両方あれば問題なし', () => {
    assert.deepStrictEqual(checkCandidate('cronjob=job', CATALOG, OWN)[0].iconProblems, []);
  });

  test('フォルダのアイコンが無ければ、無いファイルを示す', () => {
    assert.deepStrictEqual(checkCandidate('cronjob=nope', CATALOG, OWN)[0].iconProblems, [
      'folder-nope.svg が無い',
      'folder-nope-open.svg が無い',
    ]);
    assert.deepStrictEqual(checkCandidate('x=lonely', CATALOG, OWN)[0].iconProblems, [
      'folder-lonely-open.svg が無い',
    ]);
  });

  test('ファイルのアイコンが無ければ示す', () => {
    assert.deepStrictEqual(checkCandidate('*.x.ts=nope', CATALOG, OWN)[0].iconProblems, [
      'nope.svg が無い',
    ]);
  });

  test('ライトテーマ用の版があるファイルのアイコンは、association では使われないことを示す', () => {
    assert.deepStrictEqual(checkCandidate('*.agent.md=copilot', CATALOG, OWN)[0].iconProblems, [
      'copilot_light.svg があるが、association ではライトテーマでも copilot が使われる',
    ]);
    assert.deepStrictEqual(checkCandidate('*.agent.md=agent', CATALOG, OWN)[0].iconProblems, []);
  });

  test('名前だけの時はアイコンを確認しない', () => {
    assert.deepStrictEqual(checkCandidate('*.x.ts', CATALOG, OWN)[0].iconProblems, []);
  });
});

suite('formatRows', () => {
  test('1 行に 1 件、種類・状態・アイコンの問題を並べる', () => {
    const rows = [
      ...checkCandidate('*.mock.cts', CATALOG, OWN),
      ...checkCandidate('*.agent.md=copilot', CATALOG, OWN),
      ...checkCandidate('**.prompt.md', CATALOG, OWN),
    ];
    assert.strictEqual(
      formatRows(rows),
      [
        '*.mock.cts   拡張子   未対応',
        '*.agent.md   拡張子   本拡張機能で追加済み → agent',
        '  ! copilot_light.svg があるが、association ではライトテーマでも copilot が使われる',
        '**.prompt.md 拡張子   MIT で対応済み → prompt',
      ].join('\n')
    );
  });

  test('フォルダ名とファイル名は種類の欄で区別する', () => {
    assert.strictEqual(
      formatRows(checkCandidate('agents', CATALOG, OWN)),
      ['agents フォルダ  MIT で対応済み → robot', 'agents ファイル名 未対応'].join('\n')
    );
  });
});
