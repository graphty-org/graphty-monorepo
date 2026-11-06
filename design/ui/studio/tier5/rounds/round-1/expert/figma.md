# Figma product designer walkthrough, tier 5 round 1

Date: 2026-11-03. Build 1e123d7d33, served from the frozen copy
`/home/apowers/Projects/graphty-monorepo/.study-builds/tier5-r1d1-1e123d7d33` (`REAL_DIST`),
1440 x 900, light theme. Eight `real.mjs` sessions under `figma/` next to this file, all ended.
Each session's `route.jsonl` replays it, so every finding below has a scripted repro and a
screenshot, and each names the `decided.md` line or spec row it departs from where one exists.

- `w1`: volunteers (`setup:volunteers.txt`), style host. A new layer's value picker (typed), a
  yes-or-no step, Or... with an untouched number step, Condition... in each group, the group and
  title panes, both "..." menus, Done and the inspector outline at rest, By position, Styled, the
  Table toggle, Cancel.
- `w2`: volunteers, filter host. A new card, the filter's value picker (Results), a yes-or-no
  step, Done, a second card on Edges, the data table's Edges tab.
- `w3`: the colleague's project (`setup:volunteers-thanks.txt`). The two-step card at rest and
  opened, the hours step, Clear.
- `w4`: river gauges (`setup:gauges-clean.txt`). Within hops, the reference picker at rest and
  typed.
- `w5`: sources (`setup:sources.txt`). A category checklist, Except on a yes-or-no step, the
  inspector outline at rest.
- `w6`: yeast (`setup:yeast.txt`), filter host. Largest component (headless title pane), a
  Degree step, the card after Done and after focus leaves.
- `w7`: volunteers with shifts (`setup:volunteers-shifts.txt`). Degree with Advanced > Edges
  where shifts.
- `w8`: 50,000 staff (`setup:staff-50k.txt`), filter host. The bounded checklist, its search.

## Result

**No severity 3 or 4 finding.** Nine severity 2 findings. One (finding 9, the inspector outline's
missing verb column) is the calm-first check's finding 6 and counts in bar 9. The other eight count
in bar 7, against an allowance of 5, so bar 7 fails on this walk unless three are fixed or given a
reason in `decided.md`. Finding 1 is the one to fix first: it shows in both hosts and in every
task that types into a step's value field.

Two candidates from the void round's walk on this same build did not reproduce and are dropped:

- The filter's value picker lists the project's PageRank run under Results, as the style host does
  (`w2/04.png`).
- The reference picker and the edge-value picker stay under their fields while typed (`w4/05.png`,
  `w7/05.png`). Only the step's value field jumps (finding 1).

Where the build follows Figma's paved path or graphty's own model:

- The step's "..." menu matches Figma's layer menu in words and keys (Turn off, Duplicate, Move
  up, Move down, Delete) and adds Narrow instead (`w1/25.png`).
- Except is a switch with Subtract in its label's tooltip (`w1/19.png`); turned on, the row writes
  "Except" in the 40 px verb column of the workspace outline (`w5/06.png`).
- A category step is a counted checklist; at 50,000 nodes it holds 8 rows, "32 more" and a
  "Search 40" field, and a search offers "Check 3" (`w8/02.png`, `w8/04.png`).
- Group colors | Styled and the Table toggle behave the same in both hosts; Cancel puts the rule
  back as it was when the workspace opened (`w1/38.png`).
- "so far" is drawn only where it differs from the header count, as `decided.md` line 681 says
  (`w1/13.png` draws it, `w6/06.png` does not).

Bar 6: no "links", "ties", "Filter to" or "Filter out" on any screen walked. "Select 16" in the
title "..." menu (`w1/23.png`) is the one-time command `decided.md` line 402 put there. The one
sentence at rest is finding 7.

## Findings

| #   | Sev | Screen | Finding | Evidence | Owner |
| --- | --- | ------ | ------- | -------- | ----- |
| 1 | 2 | Step value field, both hosts | Once anything is typed in the value picker's search, the list moves up about 96 px, over its own field and over the header's Styled, Table, Clear, Cancel and Done. `decided.md` line 734: "Pickers under fields never flip up over the header", and `WhichPicker.tsx` line 1483 turns flip off, so the move is not Mantine's flip (cause not traced). The reference and edge-value pickers stay under their fields. Figma keeps a dropdown under its field. A reader must close the list to see the field or reach Done. | `w1/04.png` (untyped "ro": under the field) then `w1/05.png` ("trai": over the header); filter host `w2/05.png`; gauges `w4/02.png`; yeast `w6/02.png` | graphty app (`workspace/style/WhichPicker.tsx`) |
| 2 | 2 | Step pane, yes-or-no value | A yes-or-no test is a second dropdown, "Value..." under the attribute's dropdown, with Yes and No and no counts. `decided.md` line 55: "Tests are visible segments chosen by kind"; only the number and time tests were narrowed to a Select (lines 604-606); the spec's control table asks for Yes \| No with the count beside each (`selection-groups/spec.md` line 461). The category checklist on the same kind of pane does show counts. Figma draws a two-way choice as a segment. | `w1/06.png`, `w1/07.png` (open, no counts); filter host `w2/06.png`; `w5/04.png` | graphty app (`workspace/selection/StepPane.tsx`) |
| 3 | 2 | Filter card with two steps, reopened project | At rest the colleague's card reads only "trained Yes  14 of 24": its second step (hours min 10) is not drawn and nothing marks that there is more. A click expands it to its outline. `decided.md` line 573: "The sidebar shows a read-only outline at rest. One line per step". The card built in this session stays expanded after Done (`w6/08.png`), so the collapsed state comes from reopening. Figma marks a layer with children by a caret. T77 asks the reader to change the hidden step. | `w3/03.png` (rest), `w3/05.png` (clicked open); compare `w6/08.png` | graphty app (`workspace/data-place/Filters.tsx`) |
| 4 | 2 | Or group, untouched number step | A new Or group's untouched hours step draws its brush filled from 2 to 52 while it reads "0 so far" and the group B counts 0. In a narrowing step the same full brush is honest, because an untouched range passes everything ("15 so far", `w1/17.png`); in an Add step it adds nothing, so the drawing says the opposite of the count. Spec section 5: an untouched range is no test, "boxes outlined". Figma draws an unset property as a placeholder. | `w1/10.png` against `w1/17.png` | graphty app (step pane's HistogramRow value while untouched) |
| 5 | 2 | Step pane, By position | By position is one number box and the caption "of all nodes" at about 9 px. No "# / %", no top / bottom and no histogram, which the spec's control table lists (`selection-groups/spec.md` line 456); nothing else reaches the lowest N. Its base is fixed to all nodes: "hours top 5" after "trained Yes" keeps 4, and the step pane offers no Advanced to compute on So far. | `w1/32.png`, `w1/33.png` (A counts 4), `w1/crop-33-position.png` | graphty app (step pane); graphty-element already ranks by position |
| 6 | 2 | Clear on a filter card | Clear renames the card "a selection" in the sidebar, the outline title and the header, and the top bar drops its edge count. `decided.md` lines 631-632: Clear keeps the card's name. Confirmed in the void round; still open. | `w3/06.png` then `w3/07.png` | graphty app; backlog T77A.10 |
| 7 | 2 | New card before a value | A new yes-or-no card is named "trained pick yes or no" until a value is picked, in the sidebar, the outline title and the header. A new category card is named by its attribute alone, "dept" (`w8/02.png`), so the two kinds name an untested card two ways, and one of them is an instruction drawn at rest (bar 6). The name comes from `graphty/src/workspace/style/cards.ts` line 951. Name it by the attribute alone, as the category card is. | `w2/06.png` against `w8/02.png` | graphty app (`workspace/style/cards.ts`); backlog T70A.15 |
| 8 | 2 | Preview with the Table toggled off | Hiding the matches strip makes the preview taller and the graph larger, so it is cut at the preview's right and left edges: the top-right node and the right cluster's outer nodes leave the preview, and a node at the left edge is cut in half. Toggling the strip back restores the fit. `decided.md` line 799 records "Fit after the Table toggles was not reproduced on Les Miserables"; this reproduces it on volunteers. Figma keeps the zoom when a panel hides; the drawing never grows. Mechanism to check: the canvas resize keeps the vertical field of view, so a taller canvas magnifies. | `w1/34.png` (strip on), `w1/35.png` and `w1/36.png` (strip off, cut), `w1/37.png` (on again) | graphty-element (camera on canvas resize) or the app's preview not refitting; check first |
| 9 | 2 | Inspector outline at rest | The inspector's read-only outline has no 40 px verb column: "Except on_record Yes" starts its value at x 1267 while "kind agency, company" starts at x 1225; "Add role" starts its value at x 1254 against x 1246 for the other steps. `decided.md` line 393: "At rest a step row is a verb WORD in a 40 px column". The workspace outline draws the column (`w5/06.png`, `w1/15.png`). | `w5/07.png`, `w1/27.png`, `w1/crop-27-outline.png` | graphty app; calm-first finding 6, counts in bar 9 |
| 10 | 1 | Advanced > Edges where | The edge test is drawn exactly as the step's own test, a second "By value" select and histogram, under a 9 px "Edges" caption, with no indent or frame. Two identical histograms stack in one pane. Choosing "Edges where ..." does not open the edge-value picker; it needs a second click, unlike "Condition...". Watch in T78's sessions. | `w7/04.png`, `w7/07.png`, `w7/08.png` | graphty app |
| 11 | 1 | Except switch, Styled | The tooltip "Except (Subtract)" shows over the word, not over the switch; Styled has no tooltip. | `w1/18.png` (switch: none), `w1/19.png` (word), `w1/20.png` (Styled: none) | graphty app |
| 12 | 1 | Matches strip | Columns truncate ("volunt...") while the phone column has spare width, and the last column is cut at the strip's edge ("Pa", "telem"). `decided.md` line 582: columns sized to content. The step's own computed value (Degree) is not a column; that is recorded as not fixed (`decided.md` line 762). | `w7/08.png`, `w1/10.png`, `w4/02.png` | graphty app |
| 13 | 1 | Value picker untyped | The list stops about 290 px down with about 470 px of empty column below, and cuts the "Results" heading at its foot. | `w1/03.png`, `w2/03.png` | graphty app (`WhichPicker.tsx`) |
| 14 | 1 | Step and group panes | Captions at about 9 px, below the 11/16 rule: "of all nodes", "Edges", "32 more". | `w1/crop-33-position.png`, `w7/03.png`, `w8/02.png` | graphty app |
| 15 | 1 | Number and category tests | Spec section 5's drawings are not built: no log axis on a skewed Degree (yeast, `w6/05.png`), no mean and median ticks, integer values drawn as hairlines (`w7/03.png`), and no faint size bar in the category checklist (`w5/02.png`). | as listed | graphty app or compact-mantine HistogramRow |
| 16 | 1 | Reference picker | The first entries have no heading and sit flush at x 909 while "Nodes 11" is indented to x 929; the disabled "So far" is the same grey as a heading. | `w4/04.png` | graphty app |
| 17 | 1 | Workspace outline | The "No match" row's chit is a hollow grey square drawn as a checkbox. | `w1/08.png` | graphty app |
| 18 | 1 | Searched checklist at 50,000 | Searched, the list shrinks to its 3 matches; spec 4.3 holds the height of its 8 rows. | `w8/04.png` | graphty app |
| 19 | 1 | Headless title pane | A card named after its only step draws its rows 6 px higher than a step pane (Except at y 124 against y 130, the field at y 154 against y 160), so the pane jumps when a second step is added. | `w6/03.png` against `w6/05.png` | graphty app |
| 20 | 1 | Step pane fields | Selects are white and outlined; number boxes and the checklist search are grey and filled. If compact-mantine's Figma spec draws them so, this is 0. | `w1/13.png`, `w8/04.png` | compact-mantine if its spec differs; else none |

Watch item, decided and not counted: "Condition..." adds a narrowing step in the first group
(`w1/17.png`: Except switch) but a widening "Add" step in an Or group (`w1/15.png`: "Add role").
That is the spec's rule (`selection-groups/spec.md` lines 375-377, the group's default verb), and
the row and pane say "Add". The same word adds opposite effects in two groups; watch T71 and T72
sessions for a reader who expected "and".

## Fix list (the severity 2 items, one change each)

1. Keep the step's value list under its field while typed; find why it moves although flip is off.
2. Draw a yes-or-no test as a Yes | No segment with each count.
3. Draw a multi-step filter card's outline at rest, one line per step, also after reopening.
4. Draw an untouched range in an Add step as empty: outlined track, no fill.
5. Give By position "# / %", top / bottom and Computed on, and its caption 11 px.
6. Keep a filter card's name on Clear.
7. Name an untested card by its attribute alone, as the category card already is.
8. Keep the preview's drawing at its size when the strip hides (or refit), after finding which
   package resizes it.
9. Give the inspector outline the workspace outline's 40 px verb column (counted in bar 9).
