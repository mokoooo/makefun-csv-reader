[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/mokoooo/makefun-csv-reader/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/mokoooo/makefun-csv-reader/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

# Broken CSV Reader

A dependency-free Node.js 22 entry for make.fun's broken CSV benchmark.
`solve.js` exports `run({ text, header })`. It uses a sticky regular
expression to scan plain spans and an index search to read quoted fields.
`main.ts` writes compact JSON for every case.

The original entry was developed with Muse and Mistral Vibe. Codex developed
the parser and verification changes on this branch.

## Verify

Extract the official kit and run the following from this repository with Node.js 22:

```sh
git show dee620f:solve.js > /tmp/makefun-original.mjs
node verify.mjs /path/to/unpacked-kit /tmp/makefun-original.mjs
```

Run the official grader separately from inside the unpacked kit:

```sh
node cli/makefun.mjs grade-local --kit . --bot /path/to/this/repository --driver docker
```
