# Content Designer: the selection cards (tier 5 panel)

The cards replace a style layer's "Which nodes / Which edges" and the Data place's Filters. A
selection is a list of groups; the result is everything in any group. Each group has "Start with"
and ordered Add / Keep / Except steps, one condition card per step (mock J). Walk: build
13ab62a0bbe7, volunteers.graphml, `tmp/design-studio/tier5/panel/content/s1/` (main checkout).

## What the live app says today

- One act, three menus. A style layer's "Add a condition" lists "Data", then "Structure" (Node id).
  Filters "+" lists "Nodes" (Node id first), then "Structure" (Largest component). The Filters
  card's own "Add a condition" finds nothing for "comp" (17.png). "deg" finds nothing anywhere,
  though the inspector shows Degree 3 to 8 (12.png, 16.png).
- The "Hovered" layer shows "The rule leaves none" in red at rest (05.png). Zero hovered nodes is
  normal, not an error.
- "Nodes that pass every condition" is a sentence at rest, and groups make it false. Cut it.
- The test menu: Between / Highest / Has a value / Has no value (11.png). "Highest" retires under
  the owner's "by value | by position" switch.

## Terms: four collisions to settle first

1. **"group" is taken.** The glossary's group is one part of a partition. The category card lists
   community groups inside the selection's group: "Keep community: Valjean's group" inside "Group
   A". Proposal: **"Rule A", "Rule B"** with the rule's swatch, and "+ Rule". The glossary's rule
   set is a predicate, which each group is, and "Create rule set" keeps one. Fallback: letter and
   swatch only, no noun.
2. **"Focus" is taken**: the decided doors' focused node is the keyboard walk's, and the glossary
   rejects "Focus" for Fade others. The mock's Focus (hovered, else selected) becomes the reference
   **"Hovered or selected"**, matching the existing "Hovered" and "Selected" layers.
3. **"picked nodes" is a second selection noun.** Use the canvas selection, **"Selected (N)"**, any
   size; Shift+click already extends it.
4. **"whole graph" is not a glossary term.** "Computed on" uses the surface's scope word:
   **"Filtered graph | This rule"** in a style layer, **"Full graph | This rule"** in Filters. Sizes
   go in the tooltip. A "named selection" is a **set**, so the reference heading is "Sets".

"Structure" is also an algorithm family heading. Rename the reference presets' heading **"Relative
to"**; Node id goes under Data, Largest component under its family.

## Owner's open questions

**Open the data table automatically?** No. A panel that opens itself moves controls under the
pointer, and the table is view-only. The card's count chip is the door: a click opens the table
filtered to matches, with a rule-color column; tooltip "Show in table". No words at rest.

**Suspend styling and apply rule colors while picking?** Yes, while a selection card is open, on
live data. The canvas legend's title says **"Preview: Which nodes"** with swatches and counts ("A
12", "B 5", "No match 7"). Done or Escape restores the layers. Without that title the preview
breaks the live-claims rule: readers will think their styles were deleted. One legend toggle shows
the styled graph while editing.

**Algorithms in the cards or outside?** Outside, as in mock J. A card names a result by the run's
exact title in the Results list ("Betweenness", "Louvain (resolution 2)"), per the 2026-09-29
rule. Picking a field that has not run starts the ordinary run; a slow one shows **"Run (about 6
min)"**. A run computed on "This rule" lists in Results as "<Method> (Rule A, step 2)" and goes
with its step. Changing Settings in a card makes a new run; it never rewrites a run a style layer
reads.

## Dropdowns: contents and order

- **Start with**: segmented **"No nodes | All nodes"** ("No edges | All edges" on Edges); unset, it
  shows the implied value.
- **Step verb** (the rule's "+"): **Add, Except, Keep**, Figma's boolean order (Union, Subtract,
  Intersect) and icons. Tooltips "Add (union)", "Except (subtract)", "Keep (intersect)" plus key
  chip; aliases union, subtract, intersect, remove, only. No Exclude (XOR) until a task needs it.
- **Value picker**, one component on both surfaces. Placeholder **"Find attributes, results"**
  (today's "Find an attribute" would lie). Order with nothing typed:
    1. Data: attributes, Node id last.
    2. Results: what has run, with a "computed" dot.
    3. One heading per family not yet run (Centrality, Community, Path, Structure, Flow,
       Prediction); a clock and estimate only above the live budget.
    4. Added: user-registered algorithms.
    5. Relative to: within k hops of, connected to, on a shortest path between, touching, "while
       <reference> has nodes".

    Value first ("triangles -- Clustering"); a single-field result is its method ("Degree"). Detail
    right-aligned as today ("3 values", "2 to 52"). Graph values are never entries.

- **Test**, default first:
    - number: Between / Has a value / Has no value; a range gets segmented **"Value | Position"**
      (owner's words) on the histogram, Position with "# | %".
    - date: Before / After / Between (tier 4).
    - category: Is any of / Is none of / Group size / Same group as.
    - tags: Any of / All of / None of / Tag count.
    - flag: segmented "Yes | No", not a menu.
- **Reference**: "None" (optional options only), Selected (N), Hovered or selected, This rule, then
  Sets, then nodes by typing. Beside it a target button, tooltip "Pick on canvas", Escape disarms.

## Counts and readiness

- One form, "N of M nodes", never the mock's "24 / 77 n". Each rule shows its count; the total
  beside "Which nodes" is the union. A step's change shows as a fading chip "24 -> 18".
- "Not ready" chip with the reason in its tooltip; "Passes none" in neutral ink, never red; later
  steps show "Waits for step 1".
- **"Not measured: 3"** with an include toggle; a declared `missing` word replaces it
  ("Unreached: 3").
- The element sends codes and params; every string is the app's, in `style/words.ts`.

## Must match Figma and graphty

- Rules are Layers panel rows: swatch, name, count, eye (turns the rule off), drag to reorder
  steps.
- Steps rest as one summary line, the approved Style card's held-card summary.
- Section "+" on the right, as in the Properties panel; rare options under "...".
- Bounds use Figma's variable-binding hexagon.
- Keep today's remove X, Done and right-aligned dimmed count.
- A Filters card keeps its outcome segment, Select | Filter to | Filter out, above its rules.

## Risks

- Except inside a Filter out card is a double negative; Keep beside Filter to names one act twice.
  Test on T65-like tasks before more wording.
- Three rules of three steps blow the inspector budget (about 30 words, 40 at most): one line per
  rule at rest, expand only the rule being edited.
- Preview is a new state; without the legend title it is a severity 3 trust failure.
- Study-tool hover findings were unreliable in tier 4; script "Hovered or selected" checks with
  clicks.
- "Rule" may be read as Find's typed-rule syntax; watch in the dry run.
