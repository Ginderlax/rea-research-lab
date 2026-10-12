import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const commit = '6193dc03311b631b9727b560d24369e683dc396e';
const selected = [
  ['classic-schema.ts', 'packages/grafana-schema/src/raw/dashboard/x/types.gen.ts'],
  ['schema-package.json', 'packages/grafana-schema/package.json'],
  ['LICENSE_APACHE2', 'packages/grafana-schema/LICENSE_APACHE2'],
  ['dashboard-kind.cue', 'kinds/dashboard/dashboard_kind.cue'],
  ['json-model.md', 'docs/sources/visualizations/dashboards/build-dashboards/view-dashboard-json-model/index.md'],
  ['variables.md', 'docs/sources/visualizations/dashboards/variables/_index.md'],
  ['v1-openapi.json', 'packages/grafana-openapi/src/apis/dashboard.grafana.app-v1beta1.json'],
  ['original-textbox.json', 'apps/dashboard/pkg/migration/conversion/testdata/input/migrated_dev_dashboards/feature-templating/v1beta1.testdata-variables-textbox.v42.json'],
  ['original-v1-resource.json', 'pkg/services/store/kind/dashboard/testdata/k8s-wrapper.json'],
  ['original-v2-text.json', 'devenv/dev-dashboards/panel-text/text-options.json'],
  ['LICENSE', 'LICENSE'],
];
await mkdir(path.join(root, 'fixtures/vendor'), { recursive: true });
const sources = [];
for (const [name, sourcePath] of selected) {
  const url = `https://raw.githubusercontent.com/grafana/grafana/${commit}/${sourcePath}`;
  const response = await fetch(url); if (!response.ok) throw new Error(`${response.status}: ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer()), destination = path.join(root, 'fixtures/vendor', name);
  // Never replace a previously retained official artifact with different bytes.
  const previous = await readFile(destination).catch(error => { if (error.code !== 'ENOENT') throw error; });
  if (previous && !previous.equals(bytes)) throw new Error(`Preserved source differs: ${name}`);
  await writeFile(destination, bytes);
  sources.push({ file: `fixtures/vendor/${name}`, path: sourcePath, url, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
await writeFile(path.join(root, 'fixtures/sources.json'), JSON.stringify({ candidateTag: 'v13.2.3', commit, acquiredAt: new Date().toISOString(), sources, boundary: 'Pinned official source files and fixtures, not an acquired or executed complete Grafana installation. V1 OpenAPI spec is Unstructured. Classic generated TypeScript types establish structural typing only.' }, null, 2) + '\n');
console.log(`Preserved ${sources.length} pinned Grafana sources.`);
