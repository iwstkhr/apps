import { writeFileSync } from 'node:fs';
import { OPENAPI_PATH, renderOpenApiYaml } from '../src/openapi';

/** Regenerate docs/openapi.yaml from the definitions in src/openapi.ts (`pnpm run openapi`). */
writeFileSync(OPENAPI_PATH, renderOpenApiYaml());
console.log(`wrote ${OPENAPI_PATH}`);
