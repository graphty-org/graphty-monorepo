# Tier 3 report: first use and styling

Written 2026-10-21 by the Design Director, for a reader who did not watch the study.

## The short version

**Round 1 has not run.** No participant session has started, so no bar has a result yet. The build under study (758b8e8081) passed its last readiness walk with nothing blocking a task. The study tool that scores the round failed its own readiness check: it measures half of the accessibility bar at one window size only, while reporting both sizes as covered. The round is stopped there on purpose, rather than run on a tool that would pass something it never looked at.

What tier 3 has produced so far is the product itself and what the walks found in it:

- a combined Style panel built into the real graphty app;
- three design iterations, each reviewed by experts;
- an owner review of the fifth build;
- seven bulk-editing iterations;
- eight readiness passes ("dry runs") on seven frozen builds, which took the count of blocking or result-spoiling defects from 124 to 0.

Measured on the frozen build before the round, two bars would fail today:

- **Accessibility:** contrast in the light theme, and three other axe rules.
- **Words at rest:** four screens over their limits.

## What was tested

**The question.** Can a person who has never used graphty open it, bring in data, and make the drawing say something:

- one color for everything;
- a subset picked by its data;
- sizes that follow a number;
- names on the drawing;
- ties styled apart from people;
- clusters the program finds;
- many layers changed at once;
- a change taken back;
- reading what someone else's color picks out.

**What is studied.** The combined Style panel:

- A layer tree on the left: layers and folders, in paint order.
- A selected layer's Style area, with a Node tab and an Edge tab. Each tab opens with a collapsible "Which nodes" picker and has the property lines below it.
- The picker is built from typed condition cards, all of which must hold: number range, category values, text that contains or starts with, yes or no, has or has no value.
- Selecting a folder or several layers shows the same tabs and fields for all of them. A field whose layers differ shows a purple "Layer" token.

**Tasks.** Fifteen tasks, T37 to T51. Each has two halves on different datasets: Les Miserables, College football, a volunteers file, a news-sources file, a yeast gene network, a neighbors CSV, karate club, and two saved projects made by a "colleague".

- Round 1 plans 12 of them. T37 (a first look), T42 (a number threshold on people) and T44 (names on the drawing) do not run in round 1.
- So **round 1 cannot pass by design.** Its report gives each bar as held, failed or not scored.
- The core tasks are T39 (one color), T40 (pick by letters in a name), T47 (every cluster at once, colors kept) and T48 (cluster colors on only some people).

**Participants.** Nine composite first-time personas: Dev (student), Grace (nonprofit data), Ruth (reporter), Elena (product manager), Tom (lab manager), Nadia (bank alert reviewer), Alex (knows Gephi), Maren (knows Cytoscape) and Sam (keyboard only). Alex's and Maren's results are reported apart and never carry a core task alone.

**Sessions.** 56 are planned: the four core tasks at 6 each and eight tasks at 4 each. Every one starts on the empty start screen, and Sam's sessions refuse every pointer step. Briefings for all 56 are written and read. Run: 0. Void: 0. Re-run on Sonnet: 0.

**Builds.** All tier 3 work is on the branch `design/studio-tier3`.

- Design iterations were frozen as `tier3-i1-68a2140049`, `tier3-i2-2faecd941b` and `tier3-i3-617b43b270`; the owner-reviewed fifth build as `tier3-i5-71743cf67b`; the bulk-editing build as `tier3-bulk7-457aa9f0f2`.
- Readiness passes ran on 58556989e8, ed4351b258, 5bd16cda6e, 6dd0b00bd7 and e3c5bca8e6.
- After the merge from the golden integration branch (f9d8b44b9), they ran on 7d87760756, 6de5f95d12 and 758b8e8081.
- Round 1 is frozen on **758b8e8081**, served from `.study-builds/tier3-r1d2-758b8e8081`.

**Expert walkthroughs and audits.**

- Five simulated experts walked each design iteration (`iterations/{1,2,3}/`):
    - a Figma product designer;
    - a visual designer;
    - an accessibility specialist (keyboard, screen reader, axe and 200% zoom);
    - a design engineer running a screenshot audit;
    - an information architect checking every style and picking route.
- A researcher, a user advocate and a red team reviewed the success criteria five times before they were frozen.
- The round's own expert walkthroughs and audit run with the round, so they have not run on 758b8e8081.

**What a simulated participant can and cannot tell us.** Every participant is one model playing a persona.

- A failure is strong evidence. The model reads every word on screen and never tires, so if it cannot finish, a person likely will not either.
- A pass is weak. The model has the same blind spots in all nine personas, it reads labels a person would skim, and two sessions on the same prompt are not independent.
- So a design problem counts as confirmed only across two different task halves, or one session plus a scripted repro.
- Results are compared between rounds, never to published norms. Anything that passes still needs real people to confirm it.

## Results per round against the frozen bars

### Round 1 (build 758b8e8081): not run

| #   | Bar                              | Target                                                                                     | Result                                                                                                                                                                                  |
| --- | -------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Task success                     | At least 80% S or SD per task, each half 2 of 3                                            | Not scored: no sessions                                                                                                                                                                 |
| 2   | False "done"                     | 0                                                                                          | Not scored                                                                                                                                                                              |
| 3   | Wrong turns                      | Median at most 2 per task                                                                  | Not scored                                                                                                                                                                              |
| 4   | Time to first styled graph (T39) | Median at most 10 steps                                                                    | Not scored                                                                                                                                                                              |
| 5   | Severity 3 and 4 open            | 0 confirmed                                                                                | Not scored. At least 2 are open from the start, both rated 3 before the round: the folder's chain icon paints every cluster one color, and a node's own Fill "+" makes a one-node layer |
| 6   | Accessibility                    | axe 0 serious or critical, unique names, focus kept, typing lands; both sizes, both themes | Would fail (details below). 900 x 700 not measured                                                                                                                                      |
| 7   | Keyboard (Sam)                   | 3 of 4 S or SD, 0 confirmed blocks                                                         | Not scored                                                                                                                                                                              |
| 8   | Words at rest                    | No screen above its recorded limit                                                         | Would fail: four screens over their limits (below)                                                                                                                                      |

The bar 6 and bar 8 results are measurements taken on the frozen build before the round, not a scored round. Bar 6 was measured at 1440 x 900 only:

- Light theme: `color-contrast` serious on every screen after the start page.
- Both themes: `scrollable-region-focusable` on the open shape list and the find results.
- Both themes: `target-size` on a node's own Style tab, the number card and the has-no-value card.
- Start screen: Samples, Docs and GitHub each name more than one control.

Bar 8, words counted against each screen's limit:

| Screen                       | Words                                                            | Limit |
| ---------------------------- | ---------------------------------------------------------------- | ----- |
| A sample just opened         | 75 (18 of them are a false private-window notice, see finding 7) | 50    |
| Everything's Node tab        | 53                                                               | 47    |
| A layer with a condition     | 45                                                               | 39    |
| A layer with four conditions | 51                                                               | 42    |

When round 1 runs, its headline will read "not passable in round 1: three tasks not run by plan".

### Readiness passes before round 1

These are not rounds. Pilots walk every task's success path and its common detours, and for Sam's halves the whole task by keyboard. Every problem they report is sorted. The bar here is narrow: no crash, no blocked task, no result a grader would misread.

| Build                               | Date           | Lines         | Fix now                        | Of which regressions from the last fixes |
| ----------------------------------- | -------------- | ------------- | ------------------------------ | ---------------------------------------- |
| 58556989e8, ed4351b258, 5bd16cda6e  | 2026-10-17..18 | 490, 366, 324 | not recorded per pass          | --                                       |
| 6dd0b00bd7                          | 2026-10-18     | 283           | broad bar (polish included)    | --                                       |
| e3c5bca8e6                          | 2026-10-19     | 369           | 124, 2 blocking                | 37                                       |
| 7d87760756 (after the golden merge) | 2026-10-20     | 495           | 10 (4 crash, 4 block, 2 spoil) | 8, all from the merge                    |
| 6de5f95d12                          | 2026-10-20     | 228           | 2 (spoil)                      | 0                                        |
| 758b8e8081                          | 2026-10-21     | 141           | 0                              | 0                                        |

The first five passes used a broad "fix now" bar that included polish. From 2026-10-20 the bar was narrowed to crash, block and spoiled grading, and everything else went to the backlog.

## What was learned, most important first

1. **The fix loop created more defects than it removed until the bar was narrowed.**
    - On e3c5bca8e6, 37 of 124 must-fix lines (30%) were caused by the previous pass's fixes.
    - 26 of those came from two commits: one that framed the drawing when the key arrived (16 walks jumped), and one that opened the "Which nodes" picker with its list closed (10).
    - Each fix flipped one switch that neighboring routes also relied on.
    - After the bar was narrowed and every route crossing a flipped switch was walked again, the next three passes found 10, 2 and 0 must-fix lines, with 0 regressions from the studio's own fixes.
2. **A merge from upstream is a fix pass nobody triaged.**
    - All 10 must-fix lines on 7d87760756 came from the golden merge, not from the studio's fixes.
    - The worst: a colleague's saved project opened with its data but no look at all (T50, both halves), because a style channel had been renamed upstream.
    - Saved files are only opened when a task brings one. So a merge into a frozen build now needs one walk that opens a file the previous build saved.
3. **The two must-fix defects that survived were in graphty-element, and in both, two halves of one action disagreed.**
    - Making a layer from a selection accepted a state that editing the layer then refused: a find-box layer refused its first condition.
    - Undo across a file reopened over itself restored the layers but not the drawing.
    - Both are fixed in the element.
4. **The most-walked remaining problem is the drawing moving when nobody asked** (23 walks on 758b8e8081).
    - Mechanism, in graphty-element: with a selection held, the camera re-centers on the selection every frame. That cancels the correction the camera makes when the key appears, so the drawing slides about 140 px, half the key's width.
    - Two settled rules meet there: the owner's glide to a picked node, and "the drawing moves only when the reader asks". Neither said which wins after the pick.
    - It is now settled: a held selection asks for nothing after the pick.
    - It stays in the backlog, not fixed, because Fit recovers it and grading reads the style tree.
5. **A rule the tool does not enforce is only a wish.**
    - Three criteria reviews found the same tool work unbuilt: screens missing from the scripted walk, the typing check, and the record of what each screen says out loud.
    - Each was built only after it became a refusal in the round's entry check, with a planted failure that proves it.
    - The bar 6 gap that stops round 1 now is the same kind: the walk records every screen at 900 x 700 as walked, and the entry check trusts that record.
6. **Light-theme contrast fails on every screen after the start page.** This is the largest accessibility result so far. The dark-theme walks the design iterations relied on could not show it.
7. **The headless browser looks like a private window to the app.**
    - Every opened graph shows "This looks like a private window: your work is gone when it closes.", because headless Chromium reports a small storage quota.
    - A person in a normal window would not see it, but every simulated participant would, and it adds 18 words to the first screen.

## What was changed, by package

Counts are commits on the studio branch since tier 3 began (2026-10-11).

- **graphty-element (104 commits).** All changes are additive, recorded in `../owner-decisions.md` under "decided by the team".
    - Built:
        - the style tree (layers and folders, pins, locks);
        - one row that paints both nodes and edges;
        - starting rows (Everything, Selected, Hovered) and run placement, as consumer options with neutral defaults;
        - every readable value listed for rules and bindings, with value counts;
        - a has-value rule;
        - several layers as the groups of one binding;
        - labels sized in screen pixels, as an option;
        - published hover and click events.
    - Readiness fixes:
        - a saved project reads a renamed channel;
        - a reload keeps hand-picked edge layers;
        - an empty layer takes its first rule;
        - Undo across a reopened file redraws from the layers.
    - Confirmed: each readiness fix held on every walk of the next pass.
- **graphty app (230 commits).** The combined Style panel:
    - the layer tree, the Node and Edge tabs, and the condition-card picker;
    - bulk editing with the purple "Layer" token and the "Color from each layer" dialog;
    - the key;
    - the table naming a community run's groups as the key does;
    - the words and arrangement throughout.

    Confirmed by the next pass, except the reverted fixes listed below.

- **compact-mantine (85 commits).** The shared controls the panel uses:
    - one look for every style field;
    - the bound value and token pill;
    - the color picker: it holds the prior color, says aloud why it refuses text, and Enter closes it;
    - lists and menus: they open on the value in force and say when typing matches nothing;
    - the tree's single Tab stop;
    - focus rings drawn when focus is set by program;
    - color names that match the color.

    Confirmed by the next pass, except the color-word change listed below.

- **The study tool (`../tool/`).** After its first readiness check failed:
    - the scripted walk now gets past the start page;
    - the wording check catches irregular word forms and phrases;
    - bar 4's limit is 10, as the criteria say;
    - the check that the key matches the drawing has a script;
    - the entry check refuses every planted bad round.

    Its second check still fails on bar 6 at 900 x 700.

**Rejected after re-walk and reverted** (`rejected-fixes.md`):

- calling a crimson red (it turned a pink red too);
- a node called by its label everywhere;
- table sort hints (a tooltip swallowed Escape and cleared the selection);
- a focused heading's ring;
- showing the layer list on select;
- one click opening the Which line's list;
- one name per control;
- F6 moving round five regions;
- the find box's letter case;
- Escape in the inspector.

Each is to be fixed again in the shared part, not per control.

## What was deferred, and why

- **T37, T42 and T44** do not run in round 1, because the owner allowed one round for now. T42 and T44 run at 4 sessions each in a later round. A find-box rule using `>` makes a raw, uneditable threshold card and must be fixed before T42 runs (`>=` works).
- **The backlog** (`backlog.md`): 41 entries from the last pass, and more from earlier ones.
    - These are friction, wording, cosmetic and keyboard-only problems a participant gets past. Examples: the drawing moving, the Which line opening without its list, layers made the same way named differently, F6 missing the top bar, focus left behind after Samples, controls that share a name.
    - They are fixed between rounds, in batches with tests. Fixing them inside the readiness loop is what produced the regressions in finding 1.
- **The bar 6 and bar 8 failures** measured before the round are not fixed before round 1. Round 1 cannot pass anyway, and fixing them would change the build and restart the readiness walks. The round reports them as failed, and they lead the fix list after it.
- **The ten rejected fixes** above, until they can be made in their shared part.

## Decisions waiting on the owner

Only changes that would break graphty-element's published behavior or change a default are listed here. The details, and the additive alternative each one already has, are in `../owner-decisions.md`. None blocks the study.

1. **The breaking pieces of unified styles** (2026-10-12):
    - a layer painting both kinds widens the `target` a consumer reads back;
    - starting rows and runs-on-top as defaults, and deprecating `selectionStyle`;
    - the default selection halo (1.13:1 where 3:1 is needed) and label badge contrast;
    - label and edge motion following the reader's reduced-motion setting by default;
    - collapsible Nodes and Edges groups, only if the panel still scrolls at 900 x 700.
2. **Default label size** (2026-10-12): a new label is about 8 px tall at the default framing. `sizeUnit: "screen"` exists as an option; making it, or a larger number, the default changes every label.
3. **Default label font fallback** (2026-10-13): the default is a bare "Verdana", so machines without it draw a serif.
4. **A bare name in a rule reading a run's result when no column has it** (2026-10-17), and whether `selectorRule` reads comparisons by default.
5. **Kelly's palette for 10 to 19 groups** when a binding names no palette (2026-10-17).
6. **Labels drawn over the edges in front of them by default** (2026-10-17).
7. **Turning "Hide overlapping labels" on or off as an undo step** (2026-10-18).
8. **A value beyond a written domain drawn past the range's end** (2026-10-19).
9. **The camera saved in a project file** (2026-10-08, carried over from tier 2).
10. **To confirm:** a compact-mantine fold's content is no longer a named region (2026-10-08). It changes the accessibility tree. The owner's 2026-10-10 decision that the breaking rows ship as a minor probably covers it, but the file does not say so.

## Next steps

1. **Fix the study tool.** These are tool changes only, so there is no new build.
    - Check axe, shared names, focus and typing at 900 x 700 as well as 1440 x 900, with a planted failure at 900 x 700.
    - Give the session browser a normal storage quota, so the private-window notice does not appear.
    - Stop `bars.mjs` holding an idle browser slot when wrapped.
    - Serve waiting starts in arrival order.
    - Strip the stray markup and the study-team note from the persona files' briefing text.

    Then run the tool's readiness check a third time.

2. **Walk the 13 planned halves the entry check does not yet accept on 758b8e8081:**
    - detours walks on T38 A and B, T41 B, T43 B, T46 B, T47 A, T49 A and T51 A;
    - success and detours walks on T43 A;
    - Sam's keyboard-only walks on T39 A, T40 A, T47 B and T48 A.
3. **Settle the wording check.** 44 words and 14 phrases are shared between the prompts and the screens. Keep the unavoidable ones on purpose (dataset names on the start page), and reword the rest or mark them as primed.
4. **Run the entry check, then round 1.**
    - Run the 56 sessions, at most four at once.
    - Run the expert walkthroughs and screenshot audit at both sizes and in both themes.
    - Grade, check that each key matches its drawing, score, and have two skeptics check the results.
    - Report each bar as held, failed or not scored.
5. **After round 1, and only with the owner's go for another round**, fix in this order, each followed by a re-walk of every route its change crosses:
    - the light-theme contrast and the other bar 6 items, in compact-mantine;
    - the screens over their word limits;
    - the drawing moving with a selection held, in graphty-element's camera code;
    - the raw `>` threshold card;
    - then the backlog, most widespread first.
