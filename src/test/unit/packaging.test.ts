import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

// out/test/unit から見たプロジェクトルート
const ROOT = path.resolve(__dirname, '../../..');

/**
 * 公開パッケージ（VSIX）に意図しないファイルを入れないための歯止め。
 * 元にしたプロジェクトで実際に起きた問題: 除外リスト方式（.vscodeignore）だった時、動作確認のログ
 * （logs/*.log）がパッケージに入っていた。公開したパッケージは取り消せないので、許可リスト方式に固定する。
 */
suite('公開パッケージの中身', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
    files?: string[];
    main?: string;
  };

  test('package.json の files で、含めるものだけを列挙している（許可リスト方式）', () => {
    assert.ok(Array.isArray(pkg.files) && pkg.files.length > 0, 'files が無い');
  });

  test('.vscodeignore を置かない（files と併用できず、除外リスト方式に戻ってしまう）', () => {
    assert.ok(!fs.existsSync(path.join(ROOT, '.vscodeignore')));
  });

  test('files に広すぎる指定や、含めてはいけないフォルダが無い', () => {
    for (const entry of pkg.files ?? []) {
      assert.ok(!/^(\*\*|\*|\.|\.\/)?\/?\**$/.test(entry), '広すぎる指定: ' + entry);
      assert.ok(
        !/^(logs|src|out|docs|scripts|node_modules|\.claude|\.automation|\.vscode|\.template)(\/|$)/.test(
          entry
        ),
        '含めてはいけない: ' + entry
      );
    }
  });

  test('エントリポイントは files に含まれている', () => {
    assert.ok(pkg.main, 'main が無い');
    const main = path.posix.normalize(pkg.main ?? '');
    assert.ok((pkg.files ?? []).includes(main), main + ' が files に無い');
  });
});

/** Marketplace に公開するための条件 */
suite('Marketplace 公開の準備', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
    name: string;
    version: string;
    publisher?: string;
    license?: string;
    icon?: string;
    repository?: { url?: string };
    bugs?: { url?: string };
    files?: string[];
  };

  test('publisher、license、repository、bugs が設定されている', () => {
    assert.ok(manifest.publisher, 'publisher が無い');
    assert.strictEqual(manifest.license, 'MIT');
    const repository = 'github.com/' + manifest.publisher + '/' + manifest.name;
    assert.ok(
      (manifest.repository?.url ?? '').includes(repository),
      'repository が ' + repository + ' を指していない: ' + manifest.repository?.url
    );
    assert.match(manifest.bugs?.url ?? '', /\/issues$/);
  });

  test('アイコンは 128px 以上の PNG で、公開パッケージに含まれる（SVG は Marketplace が受け付けない）', () => {
    assert.ok(manifest.icon, 'icon が無い');
    const icon = fs.readFileSync(path.join(ROOT, manifest.icon ?? ''));
    // PNG の署名と、IHDR チャンクの幅・高さ
    assert.deepStrictEqual(
      [...icon.subarray(0, 8)],
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    );
    const width = icon.readUInt32BE(16);
    const height = icon.readUInt32BE(20);
    assert.ok(width >= 128 && height >= 128, width + 'x' + height);
    assert.strictEqual(width, height, '正方形でない');
    assert.ok(
      (manifest.files ?? []).some(
        (entry) =>
          entry === manifest.icon || entry === path.posix.dirname(manifest.icon ?? '') + '/**'
      ),
      'アイコンが files に含まれていない'
    );
  });

  test('CHANGELOG に、今のバージョンの項目がある', () => {
    const changelog = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8');
    assert.ok(
      changelog.includes('## [' + manifest.version + ']') ||
        changelog.includes('## ' + manifest.version),
      'CHANGELOG.md に ' + manifest.version + ' の項目が無い'
    );
  });

  test('バージョンは major.minor.patch の形（Marketplace は pre-release のタグを受け付けない）', () => {
    assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  });

  test('README と CHANGELOG に SVG の画像や http の画像が無い（Marketplace が拒否する）', () => {
    for (const file of ['README.md', 'CHANGELOG.md']) {
      const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
      const images = [...text.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)].map((m) => m[1]);
      for (const url of images) {
        assert.ok(!/\.svg(\?|#|$)/i.test(url), file + ': SVG の画像: ' + url);
        assert.ok(!/^http:\/\//i.test(url), file + ': https でない画像: ' + url);
      }
    }
  });
});
