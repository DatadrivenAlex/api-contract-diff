import { readFile } from 'node:fs/promises';
import { compare } from './compare.js';

async function main() {
  const [oldFile, newFile, ...extra] = process.argv.slice(2);
  if (!oldFile || !newFile || extra.length) {
    console.error('Usage: node dist/cli.js OLD.json NEW.json');
    process.exitCode = 2; return;
  }
  try {
    const oldSpec: unknown = JSON.parse(await readFile(oldFile, 'utf8'));
    const newSpec: unknown = JSON.parse(await readFile(newFile, 'utf8'));
    const findings = compare(oldSpec, newSpec);
    console.log(JSON.stringify({findings}, null, 2));
    if (findings.some(f => f.severity === 'breaking')) process.exitCode = 1;
  } catch (err) {
    console.error(`Cannot compare: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 2;
  }
}
void main();
