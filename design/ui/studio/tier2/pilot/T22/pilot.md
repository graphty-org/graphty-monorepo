# Pilot: make the ones that meet a condition stand out

Both versions of the task were walked on the success path in the answer key, with real.mjs, on
build ca8b3b916c22 (graphty 0.8.55). Session A (bus stops) is in `A/`, session B (Les Miserables)
in `B/`. Both reached the end state the answer key describes.

## A: bus stops, links of 10 minutes or more

| Shot | Step | What the screen shows |
| ---- | ---- | --------------------- |
| `A/01.png` | start (bus-stops.csv open) | 10 stops, 17 links, no names drawn, Graph overview in the inspector |
| `A/02.png` | `--key /` | the find box takes focus |
| `A/03.png` | `--type "=minutes >= 10"` | gray hint "Rule: press Enter to select matches" -- the bare number is not flagged yet |
| `A/04.png` | `--key Enter` | red "Put numbers in backticks: weight > `3`" under the box; nothing selected |
| `A/05.png` | `--key Control+a --type "=minutes >= \`10\`"` | gray "Rule: press Enter to select matches" |
| `A/06.png` | `--key Enter` | inspector "0 nodes, 3 edges", Selection 3, three lines drawn dark and thicker, all 10 stops still drawn. Matches the key |
| `A/07.png` | `--click "Everything"` | the Everything style page opens; Selection still reads 3 and the three lines stay marked |
| `A/08.png`, `A/09.png` | `--click "Selection"`, then the inspector's menu | Selection's Style page: Highlight color FFD700 at 40%, size 1.45. The menu point opened nothing (the click landed on the tab list) |

Result: reached. Count 3 read from the inspector header and from the Selection row.

## B: Les Miserables, ties of 10 or more shared chapters

| Shot | Step | What the screen shows |
| ---- | ---- | --------------------- |
| `B/01.png` | start (sample open) | 77 characters, 254 ties |
| `B/02.png` | `--key / --type "=shared_chapters >= \`10\`"` | gray "Rule: press Enter to select matches" |
| `B/03.png` | `--key Enter` | inspector "0 nodes, 13 edges", Selection 13, all 77 characters still drawn. Matches the key |
| `B/04.png` | (focus still in the box) `--type "="` | a bare "=" also shows "Rule: press Enter to select matches"; no column names are offered |
| `B/05.png` | `--key Escape --key Escape` | box cleared, selection kept (13) |

Result: reached. Count 13 read from the inspector header.

## Findings

None of these stops a participant on the success path.

1. **Answer key out of date (clicking Everything).** The key says clicking Everything replaces
   the selection, so marking first and adding names second loses the marking. On this build it
   does not: after clicking Everything, Selection still reads 3 and the lines stay marked
   (`A/07.png`). The "Known on this build" note and the "marking lost once and redone" detour
   under SD should be rechecked and dropped if it no longer happens.
2. **The hint approves a rule the box will refuse.** While `=minutes >= 10` (a bare number) or a
   lone `=` is typed, the gray line says "Rule: press Enter to select matches" (`A/03.png`,
   `B/04.png`); the backticks complaint appears only after Enter (`A/04.png`). The answer key
   reads as if the refusal shows under the box while typing; it shows after Enter. A participant
   who types a bare number is told to press Enter, then told it is wrong. App: check the rule as
   it is typed, or at least do not say "press Enter to select matches" for a rule that will fail.
3. **Nothing shows which names a rule can use.** Typing `=` offers no column names, so the
   participant has to know `minutes` and `shared_chapters` from elsewhere (the Data page, an
   edge's values). The task words give "minutes" and "chapters", not `shared_chapters`. Graders
   should record where participants go to find the column name; it is likely to be the main
   detour in B.
4. **Marked lines are hard to see on a dense drawing.** In B the 13 marked ties are thin
   dark-olive lines among 254 gray ones (`B/03.png`); several are hard to pick out in the dense
   middle. The Selection highlight is gold (FFD700) at 40%, but the lines are drawn dark olive,
   not gold (`A/08.png`), which suggests the edge color and opacity are not blended the way the
   control describes. Worth a look in graphty-element's edge highlight rendering; it does not
   change the grade, since the key accepts "drawn dark".
5. **"Edges among them 0" for an edge-only selection.** The Selection summary reads Nodes 0,
   Edges 13, Edges among them 0 (`B/03.png`). For a selection made only of edges, "Edges among
   them 0" next to "Edges 13" reads as a contradiction.
6. **Overview text overflows (unrelated to the task).** The Les Miserables overview row reads
   "Undirected, from the file: directed 0", cut off at the panel edge, and "Edges per ..." is
   truncated (`B/01.png`).

## Tool note

`--click "Find nodes, edges, values"` (the placeholder text) misses: "nothing on screen is called
...". The box's name is "Find". A participant script that names the box by what it shows will
miss it; `--key /` or `--click "Find"` works.

## Re-walk, 2026-10-07 (after the tier 2 fixes)

Walked again with `tool/real.mjs` on a frozen copy of the served build (graphty 0.8.55 at commit 4c8d9eb2a plus the uncommitted fixes then in the worktree), both datasets,
from the same setups. Screenshots and the printed steps are in `rewalk/A/` and `rewalk/B/`
(`steps.log`); `../rewalk.sh T22A T22B` repeats it. No step printed a script error, a console
error, a failed request or "the drawing is still moving".

**Result: reached on both datasets**: A "3 edges selected", Summary Edges 3, the three slow links
drawn with a gold band (`rewalk/A/06.png`); B "13 edges selected", Edges 13 (`rewalk/B/05.png`).

| Earlier observation | Now |
|---|---|
| The hint approved a bare number until Enter | Typing `=minutes >= 10` shows "Put numbers in backticks: weight > `3`" at once, before Enter (`rewalk/A/03.png`) |
| Nothing showed which names a rule can use | A lone "=" lists Columns: id, name (node columns), shared_chapters (edge column), and "Type a rule after =, such as weight > `3`" (`rewalk/B/03.png`) |
| Marked lines drawn dark olive, not the gold the Selection style names | Drawn as a gold band over the line (`rewalk/A/06.png`, `rewalk/B/05.png`); on the dense B drawing the 13 ties are still thin |
| "Edges among them 0" beside "Edges 13" | The Summary lists only Edges 13; the header reads "13 edges selected" |
| The tool missed `--click "Find nodes, edges, values"` | It focuses the find box (`rewalk/A/02.png`) |

The answer key still quotes the old header ("0 nodes, 3 edges"); the screen now says "3 edges
selected".

## Re-pilot on the rebuilt app

The original pilot steps were walked again, in the same order and from the same starts, with
`tool/real.mjs` on a frozen copy of the served build (graphty 0.8.55, build 75cbc3a9a0e9, commit
c16465e7a plus the uncommitted work then in the worktree). Session A is in `A-2/`, session B in
`B-2/`, each with `steps.log`. No step printed a miss, a script error, a console error, a failed
request or "the drawing is still moving".

**Result: reached on both versions.** A: "3 edges selected", Summary Edges 3, the three slow links
drawn with a gold band, all 10 stops still drawn (`A-2/06.png`). B: "13 edges selected", Edges 13,
all 77 characters still drawn (`B-2/03.png`).

| Shot | Step | What the screen shows |
| ---- | ---- | --------------------- |
| `A-2/03.png` | `--type "=minutes >= 10"` | red "Put numbers in backticks: weight > `3`" while typing, before Enter |
| `A-2/04.png`, `A-2/05.png` | `--key Enter`, then the rule retyped with backticks | nothing selected on the bare number; the backticked rule is accepted |
| `A-2/06.png` | `--key Enter` | "3 edges selected", Selection 3, gold band on the three links |
| `A-2/07.png` | `--click "Everything"` | Everything's Style page opens; Selection still 3, the links stay marked |
| `A-2/08.png` | `--click "Selection"` | Selection's Style page: Highlight FFD700 at 40%, size 1.45 |
| `B-2/02.png`, `B-2/03.png` | `--key / --type "=shared_chapters >= \`10\`"`, `--key Enter` | "13 edges selected" |
| `B-2/04.png` | `--type "="` | Columns: id, name (node columns), shared_chapters (edge column), and "Type a rule after =, such as weight > `3`"; the selection (13) is kept |
| `B-2/05.png` | `--key Escape --key Escape` | box cleared, selection kept (13) |

| Original finding | Now |
| ---------------- | --- |
| 1. Clicking Everything was said to replace the selection | It does not: Selection still 3 (`A-2/07.png`). The answer key's warning and the "marking lost and redone" detour can be dropped |
| 2. The hint approved a bare number until Enter | Fixed: the backticks complaint shows while typing (`A-2/03.png`) |
| 3. Nothing showed which names a rule can use | Fixed: a lone "=" lists the columns with their kind (`B-2/04.png`) |
| 4. Marked lines drawn dark olive, hard to see | Drawn as a gold band (`A-2/06.png`). On the dense B drawing the 13 ties are still thin gold lines, several hard to pick out in the middle (`B-2/03.png`) |
| 5. "Edges among them 0" beside "Edges 13" | Fixed: the Summary lists only Edges 13 |
| 6. Overview rows cut off at the panel edge | Still cut off, now with an ellipsis: "Undirected, from the ..." and "1 to 36, mean ..." (`B-2/01.png`) |

Still open for the answer key: it quotes the old inspector header ("0 nodes, 3 edges"); the screen
now says "3 edges selected" (and "13 edges selected" in B).
