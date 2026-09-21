/**
 * 手元で統合テストを動かすための手順（scripts/test-integration-local.js と .vscode-test.mjs が使う）。
 * テストで失敗を確認するための仮の実装。
 */

/** 依存する拡張機能を入れたディレクトリを、統合テストに渡す環境変数 */
export const EXTENSIONS_DIR_ENV = 'VSCODE_TEST_EXTENSIONS_DIR';

export function localExtensionsDir(_tmpdir?: string): string {
  return '';
}

export function localCliUserDataDir(_tmpdir?: string): string {
  return '';
}

export function installDependencyArgs(
  _manifest: { extensionDependencies?: string[] },
  _extensionsDir: string,
  _userDataDir: string
): string[] {
  return [];
}

export function extensionsDirOverride(_env: Record<string, string | undefined>): {
  launchArgs: string[];
  skipExtensionDependencies: boolean;
} {
  return { launchArgs: [], skipExtensionDependencies: false };
}
