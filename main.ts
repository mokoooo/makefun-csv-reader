import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setFlagsFromString } from 'node:v8';

type Case = { id: string; input: { text: string; header: boolean } };

async function main() {
  setFlagsFromString('--no-incremental-marking');
  const { run } = await import('./solve.js');
  const inputDir = process.env.MAKEFUN_INPUT_DIR || '/input';
  const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
  const cases = JSON.parse(readFileSync(join(inputDir, 'cases.json'), 'utf8')) as Case[];
  writeFileSync(join(outputDir, 'answers.json'), JSON.stringify(cases.map(({ input }) => run(input))));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
