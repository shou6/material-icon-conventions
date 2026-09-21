import { createRequire } from 'module';
import { defineConfig } from '@vscode/test-cli';

// out/ は tsc が出す CommonJS なので、ESM のこのファイルからは createRequire で読む。
// pretest（npm run compile-tests）で必ず先にコンパイルされる。
const require = createRequire(import.meta.url);
let testLaunchArgs;
try {
  ({ testLaunchArgs } = require('./out/test/support/userDataDir.js'));
} catch {
  throw new Error(
    'Run "npm run compile-tests" first (out/test/support/userDataDir.js is missing).'
  );
}

export default defineConfig({
  files: 'out/test/integration/**/*.test.js',
  // 既定のリポジトリ直下だと、GitHub Actions の macOS でソケットのパスが 103 文字の上限を超え、
  // VS Code が EINVAL で起動できなかった。一時ディレクトリの下に短い名前で作る
  launchArgs: testLaunchArgs(),
  // 初回は MIT の有効化でアイコンテーマと色違いの専用アイコンを生成するため、既定の 2 秒を超える
  mocha: { timeout: 30_000 },
});
