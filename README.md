# repo-template-vscode-extensions

VS Code 拡張機能を作る時のテンプレート。GitHub の Template repository として使う。
[ai-extension-recommender](https://github.com/shou6/ai-extension-recommender) の開発基盤から、機能に依存しない部分を取り出した。

## 使い方

```bash
gh repo create shou6/<name> --template shou6/repo-template-vscode-extensions --private --clone
cd <name>
npm install
npm run init -- <name> "<Display Name>"
npm install
npm test
```

`<name>` は拡張機能の ID になる。小文字・数字・ハイフンだけで書く（例：`table-helper`）。
`npm run init` は次のことを行う。2 回目の `npm install` は、`package-lock.json` の名前を合わせるため。

- 仮の名前を置き換える
  - `my-extension` → `<name>`
  - `My Extension` → `<Display Name>`
  - `myExtension`（コマンドの接頭辞）→ `<name>` の camelCase
- この README を、`.template/` にある拡張機能用の README（英語と日本語）に入れ替える
- 初期化にだけ使うファイル（`scripts/init.js` とそのテスト、`npm run init`）を消す

初期化の後に、次を手で直す。

- [ ] `README.md` と `README.ja.md` に拡張機能の説明を書く
- [ ] `package.json` の `description`（`package.nls.json` と `package.nls.ja.json`）、`categories`、`keywords`
- [ ] `CLAUDE.md` の冒頭に拡張機能の説明を書く
- [ ] `.claude/rules/commit-message.md` の scope 一覧をプロジェクトに合わせる
- [ ] `LICENSE` の年と名義を確認する
- [ ] サンプルの Hello World（`src/hello.ts`、`src/test/unit/hello.test.ts`、`package.json` のコマンド、翻訳）を本来の機能に置き換える
- [ ] 公開前に `resources/icon.png` を差し替える（今は仮のアイコン）

## 含まれるもの

### 拡張機能の開発基盤

| ファイル | 役割 |
| --- | --- |
| `package.json` | scripts、devDependencies、公開パッケージの許可リスト（`files`） |
| `esbuild.js` | `src/extension.ts` を `dist/extension.js` にバンドルする |
| `tsconfig.json` / `eslint.config.mjs` | 型検査（`strict`）と lint |
| `.mocharc.json` / `.vscode-test.mjs` | 単体テスト（Node 上）と統合テスト（VS Code 上）の設定 |
| `.vscode/launch.json` / `tasks.json` | F5 で Extension Development Host を起動する |
| `src/extension.ts` / `src/hello.ts` | サンプルの Hello World コマンド |
| `l10n/` / `package.nls*.json` | 英語と日本語の画面の文字列 |
| `scripts/try-extension.js` | `npm run try`：単体テスト → VSIX 生成 → 中身の検査 → 手元の VS Code へ入れ直し |
| `scripts/verify-package.js` | `npm run verify:package`：VSIX に入るファイルを許可リストで検査する |
| `scripts/generate-icon.js` | `npm run icon`：仮アイコンを生成する |
| `.github/workflows/ci.yml` | lint、単体テスト、VSIX 生成、3 OS での統合テスト |
| `.github/workflows/release.yml` | タグの push で VSIX を GitHub Release に添付する |
| `docs/publishing.md` | Marketplace への公開の手順 |

テストで検査していること。

- 翻訳の抜けと、使われなくなった訳（`l10n.test.ts`）
- 公開パッケージの許可リスト、アイコン、CHANGELOG、バージョンの形式（`packaging.test.ts`）
- 統合テストの VS Code が macOS の CI でも起動できること（`userDataDir.test.ts`）
- `package.json` に書いたコマンドがすべて登録されていること（統合テスト）

### 共通の設定

| ファイル | 役割 |
| --- | --- |
| `.editorconfig` | 文字コード UTF-8、改行 LF、インデント 2 スペース |
| `.gitattributes` | 改行コードを LF に統一。`.bat` と `.ps1` は CRLF |
| `.gitignore` | `.env`、`node_modules`、ビルド成果物、`.vsix`、OS のごみファイル |
| `.prettierrc` | Prettier の設定 |
| `.textlintrc` | 日本語文書の校正ルール（ja-technical-writing、jtf-style） |
| `.markdownlint-cli2.jsonc` | Markdown の lint 設定 |
| `CLAUDE.md` | Claude Code 向けの開発ルール |
| `.claude/settings.json` | Claude Code の権限と textlint MCP の有効化 |
| `.claude/rules/commit-message.md` | コミットメッセージ規約 |
| `.claude/.gitignore` | Claude Code のローカルファイルを除外 |
| `.automation/` | 自発提案スキルの状態ファイル（まだ手作業リスト、提案ログ） |
| `LICENSE` | MIT |

## 前提

- Node.js 24、VS Code 1.138 以上
- textlint と markdownlint は Claude Code のユーザー共通 hook（`~/.claude/scripts/`）が実行する。このリポジトリには hook 本体を含めない
