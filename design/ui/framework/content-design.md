# Content design

**Job.** Voice and tone, copy conventions, marks and where each shows, word budgets, and the
message catalogue until a strings module exists. **Not here:** what a concept is called
(`glossary.md`); undo labels, which graphty-element's command definitions publish. **Owner:**
content designer. **Ceiling:** 25 KB. **Validated by:** reader testing of the message catalogue.

**Status: stub.** `glossary.md` section 3 (UI-copy conventions) and the "Where" column and state-line
rule of its section 10 move here when this document is written.

## Received from the conceptual model

Read in `research/archive/conceptual-model-long-form.md` under the section named.

- **The state line** (7.1). One line beside a value, at most two tokens: the first state that
  applies, in a fixed order, then the scope when it differs from the filtered graph. It offers the
  verb of its first token only and ends in Details. The screen never says "stale" or "scoped".
- **Filter strings** (5.2). The filter chip reads "Filtered: 1,204 of 5,310 nodes" or "Working set:
  40 of 5,310 nodes"; the status line carries only what is not drawn ("300,000 not drawn").
- **Style strings** (6.1). "412 at opacity 0" on a layer that takes elements to opacity 0.
  **Withdrawn:** "covered by <layer>", "partly covered" and "N covered", because graphty-element
  suppresses a suggested layer rather than covering it (`conceptual-model.md` 5.1).

## New strings from the studio

- A working-set step's additions: "+37 by Select neighbors, 2 hops, from 3 nodes".
- A suppressed automatic paint: "Colour is set by <layer>. Apply anyway" (waits on
  `one-way-doors.md` 26).
- The recipe binding report: per slot "bound", "matched by hand" or "missing attribute", and per
  step "skipped: needs <attribute>".

## Received from the information architecture

Moved out of `information-architecture.md`. Full text in
`research/archive/information-architecture-long-form.md` under the section named.

- **Notices** (2). One notice at a time, for something that finished elsewhere: a run finished or
  failed ("Go to result", "Re-run"); a load's progress with how the file is being read ("Reading
  edges.csv as an edge list: source = from, target = to", with Re-map and Cancel); the counts that
  end a load, Add data, Join or Combine, with Details; "N results out of date" with Re-run all;
  after a Delete, how many objects were detached, with Undo; after Open, how many references could
  not be reconnected, with Details.
- **Chip readings** (9). "All nodes" at rest; "Filtered: 1,204 of 5,310 nodes"; "Working set: 40
  of 5,310 nodes"; "Window: Mar 2024, 812 of 5,310 nodes"; a step over items, "Matches: verdict is
  not false positive, 28 of 40".
- **Counts under a filter** (rule 4). A kept object's count reads "shown of total" ("12 of 40").
- **Import report first lines** (4). "Read as edge list (CSV): source = from, target = to; 5,310
  nodes, 20,112 edges"; "187 of 200 ids found"; "412 ids occur as both user and item; kept as
  separate nodes" (pending `one-way-doors.md` 4).
- **Rank and scope in values** (4). "#3"; tooltip "rank 3 of 5,310; 3.4 SD above the mean; on:
  full graph".
- **Query outcomes** (4). "No path: in components 3 and 17"; "0 matches"; "first 100".
- **Mark priority** (10). A list row carries at most one mark, the most urgent: Failed, running,
  Out of date, scope differs, approximate. With every mark on, a result row counted 17 to 20 words.
- **Counted states** (13). Word budgets and counts: the graph's inspector at rest 26 directed, 21
  undirected (budget 32; heaviest ordinary case 30, 35 with every edge mark); the whole screen at
  rest 51 against a budget of 50, the extra word being the legend title a painted run adds
  (recorded in `principles.md`'s conflict ledger); filtered above the drawing limit 39; the Results
  panel at rest 17 against 8; one node 21, 40 nodes selected 22, a rule set under a filter 23, a
  named group 20, two selected sets 11, five selected sets 11 (budget 40 each). These counts were
  taken with the rail opening on Results and with the withdrawn catalogue families, and must be
  recounted against `information-architecture.md`.

## Sources

- `research/archive/conceptual-model-long-form.md` 5.2, 6.1, 7.1
- `glossary.md` sections 3 and 10
- Richards, _Content Design_, 2017, cited for its method
