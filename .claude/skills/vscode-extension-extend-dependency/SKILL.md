---
name: vscode-extension-extend-dependency
description: ほかの VS Code 拡張機能（Material Icon Theme など）に依存し、その設定や機能を拡張する拡張機能を作る。configurationDefaults で依存先の設定に既定値を渡す方式の検討、依存先のソースで設定の読み方を確かめる調査、依存先の npm パッケージで既存の対応と照合するテスト、extensionDependencies がある時の統合テスト（Windows の EPERM 対策）、依存先の新版の検知までを扱う。「〇〇拡張を拡張したい」「〇〇の設定を追加で提供したい」「extensionDependencies」と言われた時に使う。
---

# ほかの拡張機能を拡張する拡張機能

依存先（例：Material Icon Theme）を fork せず、独立した拡張機能として足りない部分を補う。
仕様の案に書かれた例は例として扱う。中身（何を足すか）の精査は Claude が行い、根拠付きで提案する。

## 1. 方式を決める

### 宣言だけで済むか

依存先の設定に既定値を足すだけなら、`package.json` だけで実現できる。

```json
{
  "extensionDependencies": ["<publisher>.<name>"],
  "contributes": {
    "configurationDefaults": {
      "<依存先の設定キー>": { "...": "..." }
    }
  }
}
```

- `configurationDefaults` は、ほかの拡張機能の設定にも既定値を渡せる（scope が `application` と `machine` の設定は除く）
- 配列やオブジェクトの設定もそのまま渡せる（例：MIT の `folders.customClones`）
- 実行時のコードが要らなければ `main` をなくす。バンドラ、画面の文字列の翻訳、エントリポイントの検査も外せる
- 固定の値で表せないもの（実行時に決まるパスなど）は宣言では渡せない。`settings.json` を書き換える方式になるので、ユーザーに確認する

### 依存先のソースで確かめること

推測で決めず、依存先のリポジトリを一時ディレクトリに浅く clone して読む。

```bash
git clone --depth 1 -q <依存先のリポジトリ> <一時ディレクトリ>/dep
```

| 確かめること | 例（MIT v5.38 で分かったこと） |
| --- | --- |
| 設定の値をどう読むか | `inspect()` から「ワークスペース → ユーザー → 既定値」の順に 1 つだけ採用し、既定値と合成しない |
| キーの書式 | ファイルは `*.拡張子` か完全一致のファイル名。`*.mock.*` のようなグロブは不可。小文字に変換して照合 |
| 設定の変更をいつ反映するか | 有効化時と `onDidChangeConfiguration` で作り直す |
| 生成物をどこに書くか | 自分のインストール先に書く（普段のウィンドウと F5 のウィンドウで共有される） |

「ユーザーが自分で設定していると既定値が使われない」は、多くの場合は意図どおりの動作。
不具合として報告せず、README に明記する。

## 2. 依存先の npm パッケージで照合するテスト

依存先が npm にも公開されていれば、devDependency に入れて単体テストで照合する。

- 追加する名前が、依存先で未対応か。依存先の選択肢（MIT のアイコンパックなど）ごとに結果が変わるなら、全部の組み合わせで照合する
- 参照する資産（アイコンなど）が実在するか
- キーの書式、小文字、重複（`JSON.parse` は重複キーを黙って上書きするので、生の文字列で数える）

注意点。

- 依存先の型定義が ESM で、CommonJS のテストから import できないことがある。`createRequire(__filename)` で読み、使う部分だけ型を付ける（`assets/materialIconTheme.ts`）
- 照合用のデータ作りが遅い時は結果を使い回し、`suiteSetup` で `this.timeout()` を延ばす
- 仕様の代表例（「testdata は test のアイコン」など）もテストに書き、TDD の失敗の確認に使う

## 3. extensionDependencies がある時の統合テスト

`@vscode/test-cli` は `extensionDependencies` を `.vscode-test/extensions` に自動で入れる。
Windows では、そのワークスペースを VS Code で開いたままだと、インストール中の rename が EPERM で失敗する。

- ワークスペースの外なら成功する。`files.watcherExclude` では直らない
- CI では起きない

対策として、依存先を一時ディレクトリに入れてから統合テストを動かす仕組みを入れる。`assets/` のファイルをそのまま使える。

| ファイル | 置き場所 | 役割 |
| --- | --- | --- |
| `localIntegration.ts` | `src/tooling/` | 入れる先の決定と、CLI の引数の組み立て（`extensionDependencies` から決める） |
| `localIntegration.test.ts` | `src/test/unit/` | 上の単体テスト |
| `test-integration-local.js` | `scripts/` | VS Code の CLI で依存先を入れ、環境変数を付けて `vscode-test` を動かす |
| `.vscode-test.mjs` | ルート | 環境変数があれば `--extensions-dir` と `skipExtensionDependencies` を差し替える |

`package.json` に `"test:integration:local": "node scripts/test-integration-local.js"` を足す。
`test-integration-local.js` は `src/tooling/tryExtension.ts` の `toShellCommand` を使う。なければ同等の関数を用意する。

### タイムアウト

依存先が有効化の中で重い処理をすると、mocha の既定の 2 秒を超える。
`.vscode-test.mjs` に `mocha: { timeout: 30_000 }` を入れる。
まっさらな環境の遅さを再現するには、user-data-dir と extensions-dir の両方を消してから実行する。

### 統合テストで確かめること

- 依存先の設定の `inspect().defaultValue` に、渡した既定値が入っている
- 依存先の生成物（MIT ならアイコンテーマの JSON）に反映されている。`getExtension(<依存先>).activate()` を待ってから読む

## 4. 依存先の新版を検知する

依存先が新版で同じ対応を足すと、こちらの追加分と重複する。Dependabot で依存先の npm パッケージだけを見張る。

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: monthly # 依存先のリリース間隔に合わせる（npm view <pkg> time で調べる）
    allow:
      - dependency-name: <依存先の npm パッケージ>
    commit-message:
      prefix: chore
      prefix-development: chore
      include: scope
```

新版の PR で CI が失敗すれば、重複に気付ける。

## 5. 動作確認のときの注意

- F5 の開発用ウィンドウは、普段の拡張機能をそのまま使う。依存先が入っていないと読み込まれない
- 依存先が自分のインストール先に生成物を書く場合、F5 の結果が普段のウィンドウに残ることがある。「Developer: Reload Window」で戻る
- F5 のウィンドウがすぐ閉じる時は、拡張機能ホストの異常終了を疑う。元のウィンドウの「デバッグ コンソール」か、`%APPDATA%\Code\logs\<日時>\main.log` の `exited with code` を見る
