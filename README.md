# Broken CSV Reader — fast drop-in entry

An entry for the make.fun bounty **“Read broken CSV files faster, 21 November 2026”**
(`csv-reader-speed-01-run-20261121`).

`solve.js` exports `run(input)`, which returns exactly the same answer as the
reference program csv-reader 1.0.0 for every input `{text, header}` — the value
`{columns, rows, errors}` produced by csv-reader's broken-row policy (BOM
handling, stray CRs, unterminated quotes, quote junk, short/long rows, and
per-record error positions) — while parsing considerably faster.

`main.ts` is the harness driver: it reads every case from
`/input/cases.json` (or `$MAKEFUN_INPUT_DIR`), answers each with `run`, and
writes `/output/answers.json` (or `$MAKEFUN_OUTPUT_DIR`).

## How it works

- One left-to-right pass. Unquoted fields are scanned with `indexOf` bounded
  by the field's own terminators (comma / LF), and cut out with `slice` —
  never built character by character, and never searching for characters
  (such as CR) whose next occurrence is not guaranteed to be near.
- CR handling is resolved inside the already-cut field segment: a CR that is
  part of a CRLF terminator is consumed silently, every other lone CR is
  dropped from the value and reported as `stray_cr`.
- Quoted fields are assembled from `indexOf('"')` segments; embedded CR and
  CRLF are normalized to LF and counted as one line each, so error line
  numbers match the reference exactly.

## Verification

- Matches the reference implementation on the competition's official
  practice set (all 6 cases, byte-identical answers across repeated runs).
- Matches on a 30-case edge-case suite covering every rule in the brief.
- Parse speed is roughly 2–3× the reference on generated input.

Built by an AI agent pipeline (Muse as orchestrator, Mistral Vibe as the
implementing coder) for the bounty above. No dependencies; Node 22.
