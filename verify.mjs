import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';
import { setFlagsFromString } from 'node:v8';

const [kit, originalPath, alternativePath] = process.argv.slice(2);
if (!kit || !originalPath) throw new Error('Usage: node verify.mjs <kit directory> <original solve.js>');
setFlagsFromString('--no-incremental-marking');

const load = (path) => import(pathToFileURL(resolve(path)));
const { run } = await import('./solve.js');
const { run: reference } = await load(resolve(kit, 'baselines/csv-reader/solve.js'));
const { run: original } = await load(originalPath);
const alternative = alternativePath ? (await load(alternativePath)).run : null;
const practice = JSON.parse(readFileSync(resolve(kit, 'practice/input/cases.json'), 'utf8'));

let checked = 0;
let mismatches = 0;
function compare(input, label) {
  const want = reference(input);
  const got = run(input);
  checked++;
  if (alternative && !isDeepStrictEqual(alternative(input), want)) {
    throw new Error('Alternative scanner disagrees with the reference on ' + label);
  }
  if (isDeepStrictEqual(got, want)) return true;
  if (mismatches++ < 12) {
    const part = ['columns', 'rows', 'errors'].find((key) => !isDeepStrictEqual(got[key], want[key]));
    let index = 0;
    while (index < want[part]?.length && isDeepStrictEqual(got[part]?.[index], want[part][index])) index++;
    console.error(JSON.stringify({ label, input: input.text.slice(0, 140), header: input.header, part, index,
      actual: got[part]?.[index], expected: want[part]?.[index],
      actualLength: got[part]?.length, expectedLength: want[part]?.length }).slice(0, 1600));
  }
  return false;
}

const practicePassed = practice.filter(({ input, id }) => compare(input, id)).length;
const alphabet = ['a', ',', '\n', '\r', '"', '💡'];
for (const header of [false, true]) {
  for (const text of ['\uFEFF', '\uFEFF,', '\uFEFF"x"foo\rbar', '\uFEFFa,\ud800\r\n\udfff,b']) {
    compare({ text, header }, 'edge');
  }
  function visit(text, depth) {
    compare({ text, header }, 'exhaustive');
    if (depth > 0) for (const token of alphabet) visit(text + token, depth - 1);
  }
  visit('', 6);
}

let state = 427661;
function random() {
  state = (Math.imul(1664525, state) + 1013904223) >>> 0;
  return state >>> 8;
}
const atoms = [...alphabet, '日本語', '\ufeff', '\ud800', '\0', 'a long plain field'];
for (let i = 0; i < 2000; i++) {
  const length = random() % 300;
  let text = '';
  for (let j = 0; j < length; j++) text += atoms[random() % atoms.length];
  compare({ text, header: Boolean(i % 2) }, 'generated');
}
console.log(JSON.stringify({ node: process.version, practicePassed, totalPractice: practice.length, checked, mismatches }));

if (mismatches === 0) {
  const parsers = alternative ? [original, run, reference, alternative] : [original, run, reference];
  const samples = parsers.map(() => []);
  const expected = practice.map(({ input }) => reference(input));
  for (let round = 0; round < 11; round++) {
    for (let offset = 0; offset < parsers.length; offset++) {
      const index = (round + offset) % parsers.length;
      const before = process.cpuUsage();
      const result = JSON.stringify(practice.map(({ input }) => parsers[index](input)));
      const usage = process.cpuUsage(before);
      if (!isDeepStrictEqual(JSON.parse(result), expected)) throw new Error('Benchmark output differed from the reference');
      if (round > 1) samples[index].push(usage.user + usage.system);
    }
  }
  const [originalCpuUs, candidateCpuUs, referenceCpuUs, codeUnitScanCpuUs] = samples.map((s) => s.sort((a, b) => a - b)[4]);
  console.log(JSON.stringify({ measurement: 'CPU microseconds, parse plus compact serialization', originalCpuUs, candidateCpuUs,
    referenceCpuUs, codeUnitScanCpuUs, improvementPercent: 100 * (originalCpuUs - candidateCpuUs) / originalCpuUs }));
}
if (mismatches) process.exitCode = 1;
