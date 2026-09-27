import { writeFileSync } from 'node:fs';
import { OPENAPI_PATH, renderOpenApiYaml } from '../src/openapi';

/** docs/openapi.yaml を src/openapi.ts の定義から作り直す (`pnpm run openapi`)。 */
writeFileSync(OPENAPI_PATH, renderOpenApiYaml());
console.log(`wrote ${OPENAPI_PATH}`);
