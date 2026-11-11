# Material Icon Conventions

Material Icon Theme（MIT）が未対応の命名規則に、MIT の既存アイコンを割り当てる VS Code 拡張機能。Marketplace 公開を目指す。

実行時のコードを持たない宣言だけの拡張機能（`main` なし）。association と色違いの専用アイコン（MIT の `folders.customClones`）は、`package.json` の `configurationDefaults` に書く。仕様は [docs/spec.md](docs/spec.md)。TypeScript はテストと開発用スクリプトにだけ使う。

開発の規則とコミットメッセージの規約は次のファイルにある。

@.claude/rules/development.md
@.claude/rules/commit-message.md

## 作業の流れ（必須）

実装と検証は手元（Windows）で行う。GitHub の Issue から始め、PR を CI の成功で自動マージする。

1. **Issue から始める。** 対応する Issue がない作業は、先に Issue を作る（`.github/ISSUE_TEMPLATE/` に従う）。バグも直す前に Issue を作る
2. ブランチを切る：`<種別>/<Issue番号>-<短い説明>`（種別：`feat` / `fix` / `docs` / `chore`）
3. Issue の範囲だけを TDD で実装する。仕様で分からない点は推測せず、Issue にコメントして `needs:user` ラベルを付けて止まる
4. `npm run compile`、`npm run test:unit`、`npm run test:integration:local` を通す
5. コミットして push し、PR を作る。本文は `.github/pull_request_template.md` に従い、`Closes #<Issue番号>` と検証の結果を書く
6. ドラフトにするかは下記「PR の種類」で決める。通常の PR は、CI が通ると自動でマージされる
7. CI の結果を見届ける。失敗したら原因を直して同じブランチに push する。テストを消す、スキップするなどで通さない。原因が PR の範囲外にあるときや判断が要るときは、PR にコメントして止まる
8. 作業中に見つけた範囲外の問題は直さず、新しい Issue を作って PR の本文に番号を書く

main への直接の push はしない。マージは CI に任せ、Claude は `gh pr merge` を実行しない（dependabot-review スキルで、ユーザーが取り込みを了承したときを除く）。

### PR の種類

main の ruleset は CI の 4 つのジョブ（`Lint, unit tests and package` と 3 つの OS の `Integration tests`）を必須にしている。`.github/workflows/ci.yml` の merge ジョブは、ドラフトでない PR で全部のジョブが通るとスカッシュマージし、`Closes #` の Issue を閉じてブランチを消す。

**ドラフトで作る PR**（ユーザーの確認が要るもの。ドラフトの間はマージされない）

- アイコンの割り当てや見え方に関わる変更（ユーザーがエクスプローラーで確かめる）。Claude は画面を見られないため、ユーザーが `npm run try` か F5 で確かめる
- 方針の判断が要る変更（依存の追加、CLAUDE.md・`.claude/`・CI・ruleset の変更など）。ユーザーが直接指示したものは除く
- リリース（バージョンを上げる PR）

ドラフトにしたときは、PR 本文の「手元で確認してほしい点」に手順と見るポイントを書く。ユーザーが確かめて Ready for review にすると、CI が動き、通ればマージされる。

**クラウドでは実行できない作業が残るドラフトには `needs:user` ラベルを付ける。**Windows でしか再現しない手順（`npm run test:integration:local` など）や、手元のファイル・認証情報が要る操作など、環境の都合で実行できなかったコマンドがあるときにあたる。「手元で確認してほしい点」に、実行するコマンドと期待する結果を書く。見た目や操作を確かめてもらうだけのドラフトには付けない。ユーザーは手元での作業を済ませたらラベルを外し、Ready for review にする。

**通常の PR で作るもの**：ロジック、テスト、ドキュメントの変更など、`npm run compile`、`npm run test:unit`、`npm run test:integration:local` で確かめきれるもの。

### Dependabot

Dependabot の PR は、ci.yml の merge ジョブと `.github/workflows/dependabot-triage.yml` が振り分ける。

- devDependencies と GitHub Actions のメジャーでない更新は、CI が通れば ci.yml の merge ジョブがマージする
- それ以外（dependencies とメジャー更新）は `deps:review` ラベルが付く。dependabot-review スキルで影響を調べてから取り込む。dependencies は VSIX に入るため、取り込んだら Marketplace への更新が要るかをユーザーに伝える

### 公開リポジトリでの注意

このリポジトリは公開している。Issue、PR、コミットメッセージは誰でも読める。

- `docs/`（git の管理外）の要件定義や実装計画の中身を、Issue や PR に書き写さない。必要なら「要件定義 4 節の決定に沿う」のように場所だけを示す
- 秘密情報、個人のパス、手元の環境の詳細を書かない

### GitHub の操作

`gh` を使う。Issue は `gh issue create --template`、PR は `gh pr create --body-file` で作る。

## スキル

`.claude/skills/` にある。

| スキル | 使うとき |
| --- | --- |
| dependabot-review | `deps:review` の付いた Dependabot の PR の影響を調べる |
| vscode-marketplace-publish | リリースと Marketplace への公開 |
| extension-icon-create | アイコンを作り直す |
| vscode-extension-extend-dependency | Material Icon Theme の設定の読み方の調査、依存先の新版への対応 |
| yomiyasu | README.ja.md など、日本語の文章を推敲する |

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

- TDD で進める。先にテストを書いて失敗を確認し、その後に実装する（`.claude/rules/development.md`）
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
