import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { OPENAPI_PATH, renderOpenApiYaml } from './openapi';

describe('docs/openapi.yaml', () => {
  it('src/openapi.ts の定義から生成したものと一致する (ずれたら pnpm run openapi)', () => {
    expect(readFileSync(OPENAPI_PATH, 'utf8')).toBe(renderOpenApiYaml());
  });
});
