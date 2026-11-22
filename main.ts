import { setFlagsFromString } from 'node:v8';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

async function main() {
  setFlagsFromString('--no-incremental-marking');
  const { run } = await import('./solve.js');

  const inputDir = process.env.MAKEFUN_INPUT_DIR || '/input';
  const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

  const casesPath = join(inputDir, 'cases.json');
  const cases = JSON.parse(readFileSync(casesPath, 'utf-8')) as { id: string; input: any }[];

  const answers = cases.map(c => run(c.input));

  const outputPath = join(outputDir, 'answers.json');
  writeFileSync(outputPath, JSON.stringify(answers, null, 2), 'utf-8');
}

main().catch(console.error);
