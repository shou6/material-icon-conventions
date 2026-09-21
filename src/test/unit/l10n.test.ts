import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

// out/test/unit から見たプロジェクトルート
const ROOT = path.resolve(__dirname, '../../..');

function readJson(file: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8')) as Record<string, unknown>;
}

suite('日本語の翻訳', () => {
  test('package.json の %key% はすべて、英語と日本語の両方に定義がある', () => {
    const packageJson = fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8');
    const keys = [...new Set([...packageJson.matchAll(/"%([^%"]+)%"/g)].map((m) => m[1]))];
    assert.ok(keys.length > 0, 'package.json が %key% を使っていない');
    const english = readJson('package.nls.json');
    const japanese = readJson('package.nls.ja.json');
    assert.deepStrictEqual(
      keys.filter((key) => typeof english[key] !== 'string'),
      [],
      'package.nls.json に無い'
    );
    assert.deepStrictEqual(
      keys.filter((key) => typeof japanese[key] !== 'string'),
      [],
      'package.nls.ja.json に無い'
    );
  });

  test('package.nls.json と package.nls.ja.json に、使われていないキーが無い', () => {
    const packageJson = fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8');
    const keys = new Set([...packageJson.matchAll(/"%([^%"]+)%"/g)].map((m) => m[1]));
    for (const file of ['package.nls.json', 'package.nls.ja.json']) {
      assert.deepStrictEqual(
        Object.keys(readJson(file)).filter((key) => !keys.has(key)),
        [],
        file
      );
    }
  });

  test('翻訳ファイルが公開パッケージに含まれている', () => {
    const pkg = readJson('package.json') as { files?: string[] };
    for (const entry of ['package.nls.json', 'package.nls.ja.json']) {
      assert.ok((pkg.files ?? []).includes(entry), entry + ' が files に無い');
    }
  });
});
