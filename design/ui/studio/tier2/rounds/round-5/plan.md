# Tier 2 round 5 plan

## Three claims from round 4, each checked by one script before anyone fixes it

Round 4 left three problems that only one session or one walkthrough had seen. Each was run once,
on round 4's build 5277e2cbe1bd (graphty@0.8.64, frozen at
`/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/`), with
`tool/real.mjs` and nothing else, on 2026-10-11. Every `session.json` below reads `buildStamp:
5277e2cbe1bd graphty@0.8.64`. The screenshots are in `claims/<folder>/`, numbered as `real.mjs`
saved them.

All three reproduced, so all three are fixed in their owning package in this round.

| Claim                                                                       | Reproduced | Fix belongs in                    |
| --------------------------------------------------------------------------- | ---------- | --------------------------------- |
| A rule on a column that does not exist answers only "Nothing matches this rule" | Yes        | graphty-element, then graphty app |
| Escape on a selection layer's Color swatch clears the selection, focus to the page | Yes        | graphty app                       |
| A drawn name takes a click aimed at the tie under it                        | Yes        | graphty-element (a question for it) and graphty app |

Every command below runs from `design/ui/studio/tool` with
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/` set.

### A rule naming a column that does not exist (`claims/a-unknown-column/`)

Les Miserables' edge column is `shared_chapters`; there is no `weight`.

```bash
S=../tmp/t2r4-7/a-unknown-column
node real.mjs --start $S setup:lesmis-ranked.txt                                   # 01.png
node real.mjs --step $S --click "Find nodes, edges, values" --type "weight >= 10"  # 02.png
node real.mjs --step $S --click "Select its matches"                               # 03.png
node real.mjs --end $S
```

- `02.png`: the find box rewrites the text as the rule "=weight >= `10`" and offers it as "Select
  its matches". Nothing says the data has no column called `weight`.
- `03.png`: run, the box reads only "Nothing matches this rule", the same words a real rule with
  no matches gets. Nothing is selected.

**Reproduced.** Mechanism: graphty-element's selector compiler parses a rule on any column and,
by its own comment (`session/styles/selector.ts`), "matches NOTHING" for one that does not exist;
it reports the columns it reads in `CompiledSelector.paths` and leaves resolving them to the
caller, which the selection path does not do. The app's `FindBox.tsx` then shows "Nothing matches
this rule" for any empty result. Fix: the element refuses the rule with the existing
`E_UNKNOWN_ATTRIBUTE` (with candidate columns) before it runs and before it is offered, and the app
writes "No column named weight" with the columns there are.

### Escape on a selection layer's Color swatch (`claims/b-swatch-escape/`)

Done by pointer; the walkthrough that found it used keys only. The focus is the same either way.

```bash
S=../tmp/t2r4-7/b-swatch-escape
node real.mjs --start $S setup:friends-ranked.txt                                         # 01.png
node real.mjs --step $S --click "Find nodes, edges, values" --type '=weight >= `4`' --key Enter  # 02.png
node real.mjs --step $S --click "role=tab:Style"                                          # 03.png
node real.mjs --step $S --click "Add to Line"                                             # 04.png
node real.mjs --step $S --click "role=menuitem:Color" --read                              # 05.png
node real.mjs --step $S --key Escape --read                                               # 06.png
node real.mjs --end $S
```

- `03.png`: "12 edges selected", the selection's Style tab.
- `05.png`: a new layer "weight >= `4`"; focus ring on the Color swatch row; `--read` reads the
  inspector's layer panel.
- `06.png`: one Escape. A toast "Selection cleared: 12 edges", the ties lose their selection band,
  the inspector switches to "Graph" (Values tab), and `--read` reads the whole page: focus fell to
  the page.

**Reproduced.** Which handler takes the key: no control in the style panel handles Escape (the
swatch is a plain button, `CompactColorInput` in compact-mantine, and no popover is open), so the
keydown reaches the window listener in `graphty/src/workspace/keys/useCommandKeys.ts`. Escape
there is blocked only while typing in a field or while a menu, list or dialog shows; a focused
button is neither, so it runs the `selection.clear` command (`workspace/frame/commands.ts`). The
cleared selection changes what the inspector shows, the panel holding the focused swatch
unmounts, and focus goes to the page. Fix in the app: an Escape pressed inside the inspector's
panel is the panel's (innermost first) and never reaches the global clear; where the inspector
does change, focus goes to its heading.

### A drawn name over the Station-Stadium tie (`claims/c-tie-click/`)

The setup draws every stop's name on a white chip. Station is at about (777,117), Stadium at
(726,221); the straight tie between them runs under the "Stadium" chip, whose box is about
x 684-768, y 168-196. The Stadium sphere's top is at about y 199.

```bash
S=../tmp/t2r4-7/c-tie-click
node real.mjs --start $S setup:bus-stops-ranked-names.txt   # 01.png
node real.mjs --step $S --hover-at 751,169                   # 02.png  midpoint of the two centers
node real.mjs --step $S --click-at 751,169                   # 03.png
node real.mjs --step $S --key Escape --hover-at 744,185      # 04.png  on the tie, inside the chip
node real.mjs --step $S --click-at 744,185                   # 05.png
node real.mjs --step $S --key Escape --hover-at 765,141      # 06.png  on the tie, above the chip
node real.mjs --step $S --click-at 765,141                   # 07.png
node real.mjs --end $S
```

- The midpoint (751,169) and a point on the tie inside the chip (744,185) both print `node
  "Stadium"` on hover and click, with `cursor: pointer`; `03.png` and `05.png` show Stadium
  selected (ring, inspector "Stadium, Node"). Neither point is on the sphere: the drawn name took
  the click.
- The same tie above the chip (765,141) prints `edge with id "15"`; `07.png` shows the tie selected
  and the inspector "Station -> Stadium", minutes 4.

**Reproduced: the label, not the dot, takes the click.** Mechanism: the app turns on
`label.pickable` for every label line it adds (`graphty/src/workspace/style/row.ts`,
`appLabelLook`), so a click on a name selects its node, and the chip is drawn on top
(`onTop: true`). In graphty-element (`Node.ts`, where the label is made), a label plane is
pickable even when `pickable` is unset: it then answers no node but still stops the ray, so a tie
under a name cannot be clicked there either way. Questions for graphty-element, to decide this
round: whether a label that is not `pickable` should let a click through to what lies under it
(an additive change would be a new option; changing today's default is a breaking change for the
owner), and whether a pickable label should yield to an edge that the click is closer to. Where
names are placed stays on the owner's list.
