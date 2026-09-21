# 公開の手順

Marketplace へ公開するまでの手順と、公開後の更新の手順をまとめる。
2026-09-21 時点の [公式ドキュメント](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) に基づく。

## 1. 方針

| 項目 | 方針 |
| --- | --- |
| VSIX の生成 | タグを push すると GitHub Actions が全チェックを通し、VSIX を GitHub Release に添付する |
| Marketplace への公開 | その VSIX を管理画面から手でアップロードする |
| 自動公開 | 行わない（理由は 5 節） |

手でのアップロードは Personal Access Token（PAT）が要らない。
2026-12-01 の Azure DevOps の global PAT 廃止の影響も受けない。

## 2. 初回だけ行うこと

### 2.1 Publisher を用意する

Publisher `shou6` は作成済み。別の Publisher で公開する時だけ、次の手順で作る。

1. Microsoft アカウントで <https://marketplace.visualstudio.com/manage> にログインする
2. 初回は「We need a few more details」という画面が出る。これは Publisher ではなく、開発者向けプロフィールの登録である
3. 「Create publisher」を選ぶ
4. ID を入れる。`package.json` の `publisher` と同じ値でなければならない
5. Name（表示名）を入れて作成する。ほかの欄は空欄でよい

ID は後から変更できない。Name とほかの欄は、管理画面の Details タブで後から変更できる。

個人の名前やメールアドレスを表に出さないための注意。

- 開発者向けプロフィールの名前の欄には、Microsoft アカウントの本名が最初から入っている。公開されたくなければ書き換えてから進む
- Publisher の作成画面の「About you」の欄は、入力するとすべて発行者のプロフィールページで公開される。Support の欄に個人のメールアドレスを入れない
- サポートの窓口は、`package.json` の `bugs` に設定したイシューの URL が拡張機能のページで使われる

アカウントの保全についての注意。

- Publisher のアカウントを乗っ取られると、利用者全員の PC に悪意のある更新を配れてしまう。Microsoft アカウントの二段階認証を必ず有効にする
- 管理画面の Members タブで、別のアカウントを所有者として追加できる。アクセスを失った時の備えに使える

### 2.2 リポジトリを公開する

README と `package.json` のリンクは GitHub のリポジトリを指している。
リポジトリが Private のままだと、Marketplace のページからのリンクが 404 になる。

公開する前に、コミット履歴へ秘密情報が入っていないことを確かめる。

```bash
git log --all -p | grep -nE "ghp_|github_pat_|sk-ant-|AKIA[0-9A-Z]{16}|BEGIN [A-Z ]*PRIVATE KEY"
git log --all --name-only --pretty=format: | sort -u | grep -iE "\.env|\.pem$|\.key$|\.log$|^logs/"
```

### 2.3 アイコンとスクリーンショットを用意する

`resources/icon.png` は `npm run icon` で作った仮のアイコンである。公開前に差し替える。
128px 以上の正方形の PNG でなければならない（単体テストで検査している）。

README に画像を載せる時は次の点を守る。Marketplace が拒否するためで、単体テストでも検査している。

- PNG か JPEG にする。SVG は使えない
- URL は `https://` にする。リポジトリ内の相対パスでもよい（vsce が GitHub の URL に直す）
- 画面に、公開したくないプロジェクト名などが写っていないことを確かめる

## 3. リリースの手順

1. `package.json` の `version` を上げる。形式は `major.minor.patch` だけで、`-beta` のような接尾辞は使えない
2. `CHANGELOG.md` に、そのバージョンの項目を足す。無いと単体テストが失敗する
3. main にマージする
4. タグを打って push する

   ```bash
   git tag v0.0.1
   git push origin v0.0.1
   ```

5. GitHub Actions の Release が終わるのを待つ。タグと `version` が一致しないと失敗する
6. GitHub の Releases から `material-icon-conventions-0.0.1.vsix` をダウンロードする
7. 手元でインストールして動作を確かめる

   ```bash
   code --install-extension material-icon-conventions-0.0.1.vsix
   ```

8. <https://marketplace.visualstudio.com/manage> で VSIX をアップロードする
   - 初回：「New extension」から「Visual Studio Code」を選ぶ
   - 2 回目以降：拡張機能の「…」メニューから「Update」を選ぶ
9. 検証が終わると公開される。数分かかる

## 4. 公開前の確認

CI が次のことを検査している。手で確かめる必要はない。

- 型検査、lint、整形、Markdown の lint
- 単体テストと、VS Code 上の統合テスト（Windows、macOS、Linux）
- 日本語訳に抜けが無いこと
- 公開パッケージに入るファイルが、意図したものだけであること（`npm run verify:package`）

手で確かめること。

- [ ] F5 で起動し、主な機能が動く
- [ ] 表示言語を英語にした VS Code でも、画面の文言が崩れていない
- [ ] アイコンを仮のものから差し替えた

## 5. 自動公開を行わない理由

VSIX の生成までを自動化し、公開は手で行う。理由は次のとおり。

- `vsce publish` の PAT による認証は、2026-12-01 の global PAT 廃止で使えなくなる
- 後継は Microsoft Entra ID による認証（`vsce publish --azure-credential`）である
- Entra ID 方式には Azure のサブスクリプション、マネージド ID、フェデレーション資格情報の設定が要る
- 公式ドキュメントの手順は Azure DevOps のパイプライン向けで、GitHub Actions からの手順は載っていない
- 個人の拡張機能で、リリースの頻度が低いうちは、手でのアップロードの手間は小さい

リリースの頻度が上がったら、Entra ID 方式を検討する。
その時は `release.yml` の最後に公開のステップを足すだけで済む。

## 6. 公開を取り下げる時

管理画面で拡張機能の「…」メニューから「Unpublish」を選ぶ。
一覧からは消えるが、すでにインストールした人の環境からは消えない。
公開した VSIX の中身は取り消せないので、入れるファイルは `package.json` の `files` で管理している。
