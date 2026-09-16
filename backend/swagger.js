import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { swaggerSpec } from './docs/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(here, 'docs', 'openapi.json');

fs.writeFileSync(target, JSON.stringify(swaggerSpec, null, 2));

const paths = Object.keys(swaggerSpec.paths);
const operations = paths.reduce(
  (total, key) =>
    total + Object.keys(swaggerSpec.paths[key]).filter((k) => k !== 'parameters').length,
  0,
);

console.log(`wrote ${target}`);
console.log(`${paths.length} paths, ${operations} operations`);
