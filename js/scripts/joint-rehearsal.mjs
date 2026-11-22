import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const readJson = async (name) => JSON.parse(await readFile(path.join(root, name), 'utf8'));
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const node = await readJson(`js/reports/release-node${process.versions.node.split('.')[0]}.json`);
const python = await readJson('python/reports/release-rehearsal.json');
assert.equal(node.result, 'PASS');
assert.equal(python.result, 'PASS');
assert.equal(node.sourceCommit, head);
assert.equal(python.sourceCommit, head);
const nodeBytes = await readFile(path.join(root, 'js/artifacts', node.artifact));
assert.equal(createHash('sha256').update(nodeBytes).digest('hex'), node.sha256);
const nodeContract = await readJson('js/dist/resources/manifest.json');
const pythonContract = JSON.parse(
  execFileSync('git', ['show', `${head}:python/src/a2a_schema_contract/resources/source.json`], {
    cwd: root,
    encoding: 'utf8',
  }),
);
assert.equal(nodeContract.commit, pythonContract.commit);
assert.equal(nodeContract.extensionUri, pythonContract.extensionUri);
const report = {
  result: 'PASS',
  sourceCommit: head,
  contractCommit: nodeContract.commit,
  extensionUri: nodeContract.extensionUri,
  node: { version: node.version, artifact: node.artifact, sha256: node.sha256 },
  python: { wheel: python.wheel, sdist: python.sdist, sourceDateEpoch: python.sourceDateEpoch },
  scope: 'Independent package rehearsals from the same immutable source and contract identity.',
  exclusions: 'Does not establish cross-language parity, registry ownership or release readiness.',
  publication: 'No tag, registry upload, release or provenance attestation was created.',
};
await writeFile(
  path.join(root, 'python/reports/joint-rehearsal.json'),
  JSON.stringify(report, null, 2) + '\n',
);
console.log(JSON.stringify(report));
