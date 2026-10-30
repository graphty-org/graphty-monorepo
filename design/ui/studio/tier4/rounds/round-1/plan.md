# Tier 4 round 1 plan: returning users managing their data

Round 1 runs on the frozen study build 79ed770292, served from `/home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1d3-79ed770292` with `REAL_DIST=<that folder>`
on every `tool/real.mjs` command (the first line of `../../criteria.md`). The bars, how they are
scored and what the round can conclude are in `../../criteria.md`; who takes which task is
`../../roster.md`, "Who takes which task", and where each task half starts is its "Where each
session starts" table. This plan changes neither.

- 28 sessions, 9 tasks: the core tasks (T61, T62, T65, T67) at 4 pointer sessions, two per half;
  T60, T63, T64, T66 and T68 at 2, one per half; Sam's two keyboard-only sessions (T61 A and T65 A)
  last, counted only in bar 5.
- T60 and T61 start on the empty start screen; every other task starts from the person's saved
  project (a `setup:` file in `../../../rounds/tier-4/setups/`, never shown to the participant).
  Sam's starts add `--keys`, which refuses every pointer step. Spreadsheets and network files reach
  the app by the participant's own `--upload`; T60's address is typed or pasted by the participant.
- T61 and T65 sessions get the task's follow-up after the participant's first `--end`, word for word
  from `../../tasks.md`; the tool gives it.
- Run order is the table's: the core tasks first, A and B alternating, then the rest, then Sam; at
  most 8 sessions at once.
- A session that ends with no `01.png` or on a model API error is re-run from a clean folder as
  `<id>b`, which takes this row.

| Session | Task | Half: dataset | Persona | Start |
| ------- | ---- | ------------- | ------- | ----- |
| r1-s01 | T61 | A: food bank, pantries.csv + deliveries.csv | Grace | `empty` |
| r1-s02 | T61 | B: river gauges, gauges.csv + flows.csv | Maren | `empty` |
| r1-s03 | T61 | A: food bank, pantries.csv + deliveries.csv | Alex | `empty` |
| r1-s04 | T61 | B: river gauges, gauges.csv + flows.csv | Tom | `empty` |
| r1-s05 | T62 | A: food bank sites, pantries.csv | Grace | `setup:pantries.txt` |
| r1-s06 | T62 | B: river gauges, gauges.csv | Maren | `setup:gauges.txt` |
| r1-s07 | T62 | A: food bank sites, pantries.csv | Alex | `setup:pantries.txt` |
| r1-s08 | T62 | B: river gauges, gauges.csv | Tom | `setup:gauges.txt` |
| r1-s09 | T65 | A: volunteers, volunteers.graphml | Grace | `setup:volunteers.txt` |
| r1-s10 | T65 | B: river gauges, gauges + flows (tidied) | Tom | `setup:gauges-tidy.txt` |
| r1-s11 | T65 | A: volunteers, volunteers.graphml | Dana | `setup:volunteers.txt` |
| r1-s12 | T65 | B: river gauges, gauges + flows (tidied) | Alex | `setup:gauges-tidy.txt` |
| r1-s13 | T67 | A: food bank sites, pantries.csv | Grace | `setup:pantries.txt` |
| r1-s14 | T67 | B: river gauges, gauges.csv | Maren | `setup:gauges.txt` |
| r1-s15 | T67 | A: food bank sites, pantries.csv | Alex | `setup:pantries.txt` |
| r1-s16 | T67 | B: river gauges, gauges.csv | Tom | `setup:gauges.txt` |
| r1-s17 | T60 | A: sources network, sources.graphml from its address | Ruth | `empty` |
| r1-s18 | T60 | B: yeast genes, yeast-galactose.graphml from its address | Maren | `empty` |
| r1-s19 | T63 | A: food bank, pantries + deliveries | Dana | `setup:pantries-joined.txt` |
| r1-s20 | T63 | B: river gauges, gauges + flows | Tom | `setup:gauges-joined.txt` |
| r1-s21 | T64 | A: food bank, pantries + deliveries | Alex | `setup:pantries-joined.txt` |
| r1-s22 | T64 | B: river gauges, gauges + flows | Maren | `setup:gauges-joined.txt` |
| r1-s23 | T66 | A: food bank, pantries + deliveries | Dana | `setup:pantries-joined.txt` |
| r1-s24 | T66 | B: river gauges, gauges + flows | Maren | `setup:gauges-joined.txt` |
| r1-s25 | T68 | A: food bank, pantries + deliveries (spreadsheets) | Dana | `setup:pantries-narrowed.txt` |
| r1-s26 | T68 | B: river gauges, gauges + flows (GraphML) | Tom | `setup:gauges-narrowed.txt` |
| r1-s27 | T61 | A: food bank, pantries.csv + deliveries.csv | Sam | `empty --keys` |
| r1-s28 | T65 | A: volunteers, volunteers.graphml | Sam | `setup:volunteers.txt --keys` |
