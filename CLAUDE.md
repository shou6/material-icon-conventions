# Material Icon Conventions

Material Icon Theme（MIT）が未対応の命名規則に、MIT の既存アイコンを割り当てる VS Code 拡張機能。Marketplace 公開を目指す。

実行時のコードを持たない宣言だけの拡張機能（`main` なし）。association と色違いの専用アイコン（MIT の `folders.customClones`）は、`package.json` の `configurationDefaults` に書く。仕様は [docs/spec.md](docs/spec.md)。TypeScript はテストと開発用スクリプトにだけ使う。

## コマンド

```bash
npm run compile         # 型検査 + lint
npm run watch           # tsc の型検査を watch
npm run check-types     # tsc --noEmit
npm run lint            # eslint src
npm run format          # prettier --write
npm run test:unit       # 単体テストだけを Node 上で実行（数秒。TDD のループはこれを使う）
npm test                # 単体テスト + VS Code 上の統合テスト（初回は VS Code のダウンロードで時間がかかる）
npm run test:integration:local  # 手元用の統合テスト。MIT を一時ディレクトリに入れてから実行する
npm run vsix            # vsce package で .vsix を生成
npm run try             # 単体テスト → VSIX 生成 → 中身の検査 → 入れ直し。手元の VS Code で試す時に使う
npm run lint:md         # Markdown の lint
npm run verify:package  # 公開パッケージに入るファイルが意図したものだけかを検査する
npm run icon            # 仮アイコン resources/icon.png を作り直す
npm run check:candidates -- cronjob "*.agent.md=agent"  # 追加したい名前が MIT で未対応か、アイコンが使えるかを調べる
```

- `README.md` は英語で書く（Marketplace のページにそのまま表示される）。日本語の説明は `README.ja.md`。片方を直したらもう片方も直す
- リリースと公開の手順は [docs/publishing.md](docs/publishing.md)。Marketplace への公開は手作業で、`vsce publish` は使わない
- 開発中の動作確認は VS Code で F5（Run Extension）を押し、Extension Development Host で行う。ビルドは不要。VSIX を普段の環境で試すなら `npm run try`
- テストは Mocha（`suite` / `test`）。`src/test/unit/` は vscode 非依存の単体テスト、`src/test/integration/` は `@vscode/test-cli` で VS Code 上で動かす統合テスト
- テストの `suite(...)` の直下で関数を呼ばない。そこで例外が出ると mocha ごと落ち、失敗件数すら表示されない。テストデータは直接組み立てるか、`test` の中で作る
- Windows では `npm` と `code` の実体が `.cmd` で、`spawn` から直接は起動できない（EINVAL）。シェル経由にする場合は、引数の配列と併用せず 1 行の文字列で渡す（Node がエスケープしないため）

## 構成

```text
src/
├── tooling/            npm run try などの開発用スクリプトの中身（単体テストする）
└── test/
    ├── unit/           単体テスト（vscode 非依存）
    ├── integration/    VS Code 上で動かす統合テスト
    └── support/        テストの補助（materialIconTheme.ts は npm の MIT から既存の association とアイコンを調べる）
scripts/                npm scripts から呼ぶ Node スクリプト
resources/              アイコン
```

## 開発ルール

- TDD で進める。先にテストを書いて失敗を確認し、その後に実装する（グローバル設定を参照）
- association を足す前に `npm run check:candidates` で候補を下調べする。足す時は、MIT の全アイコンパックで未対応か、アイコンが実在するかを単体テストが検査する。MIT を更新したら `material-icon-theme`（devDependency）も上げてテストし直す。README の一覧（英日）と docs/spec.md も直す
- `vscode` モジュールに依存しない層は純粋関数にし、単体テストできる形を保つ
- 外部プロセスやネットワークはインタフェースで抽象化し、テストではフェイクに差し替える
- `strict` を維持し、`any` を使わない
- `package.json` の文字列は `%key%` にし、`package.nls.json` と `package.nls.ja.json` の両方へ定義する
- 公開パッケージに入れるファイルは `package.json` の `files`（許可リスト）で決まる。実行時に必要なファイルを足したら `files` にも足す。`.vscodeignore` は置かない
- コミット前に `npm run compile` と `npm test` を通す
- `npm test` は extensionDependencies の MIT を `.vscode-test/extensions` に自動で入れる。手元ではこのワークスペースを VS Code で開いていると、その rename が EPERM で失敗する（ワークスペースの外なら成功する）。手元では `npm run test:integration:local` を使う
- コミットメッセージは `.claude/rules/commit-message.md` に従う

## 環境

- Node.js 24、VS Code 1.138 以上
- ドキュメントは日本語。`.md` の保存時に markdownlint と textlint が hook で走る
