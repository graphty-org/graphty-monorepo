# Content Designer: the selection cards (tier 5 panel)

The cards replace two surfaces: a style layer's "Which nodes / Which edges" and the Data place's
Filters. A selection is a list of groups, and the result is everything in any group. Each group has
a "Start with" row and ordered Add / Keep / Except steps, one condition card per step (mock J).
Walk: build 13ab62a0bbe7, volunteers.graphml, screenshots in
`tmp/design-studio/tier5/panel/content/s1/` (main checkout).

## What the live app says today (the words the cards inherit)

- The two pickers already disagree. In a style layer, "Add a condition" lists the headings "Data",
  then "Structure" (Node id). Filters "+" lists the headings "Nodes" (Node id first), then
  "Structure" (Largest component). In the same Filters card, "Add a condition" finds nothing for
  "comp" (17.png), although Filters "+" offers that entry. "deg" finds nothing on either surface,
  yet the inspector shows Degree 3 to 8 (12.png, 16.png). This is one act with three menus.
- The "Hovered" layer shows "The rule leaves none" in red at rest (05.png). Zero hovered nodes is the
  normal state, not an error.
- "Nodes that pass every condition" is a sentence at rest. Groups make it wrong (the result is any
  group, and every step inside a group), and the owner wants no UI sentences. Cut it.
- The test menu reads Between / Highest / Has a value / Has no value (11.png). "Highest" retires
  under the owner's "by value | by position" switch.

## Terms: four collisions to settle before building

1. **"group" is taken.** In the glossary a group is one part of a partition ("Never a container or
   a command"). The category card lists community groups inside the selection's group, so "Keep
   community: Valjean's group" would sit inside "Group A". Proposal: call the selection's group a
   **rule**, written "Rule A", "Rule B" with the rule's color swatch, and "+ Rule". The glossary
   already defines a rule set as a predicate; each group is exactly that, and "Create rule set"
   keeps one. Fallback if the Director rejects "rule": only the letter and swatch, with no noun.
2. **"Focus" is taken.** The decided doors define a focused node: the keyboard walk's node,
   distinct from the selection. The glossary also rejects "Focus" for Fade others. The mock's Focus
   means "the hovered node, else the selected node". Word it as the reference **"Hovered or
   selected"**, which matches the existing layers "Hovered" and "Selected".
3. **"picked nodes" is a new noun for a second selection.** Use the canvas selection,
   **"Selected (N)"**, whatever its size. Shift+click already extends it. Drop "picked" and "the
   selected node" as two entries.
4. **"whole graph" is not a glossary term.** The "Computed on" segment uses the surface's scope
   word: **"Filtered graph | This rule"** in a style layer, and **"Full graph | This rule"** in
   Filters (Filters run before the filtered graph exists). The segment's tooltip carries the sizes.
   "Named selection" is a **set** (glossary), so the reference heading is "Sets".

The "Structure" heading also collides: it is an algorithm family heading in the glossary. Rename the
reference presets' heading **"Relative to"**. Move Node id under Data, and Largest component under
its family.

## Owner's open questions

**Open the data table automatically while picking?** No. A panel that opens on its own moves
controls under the pointer, and the table is view-only. Make the card's count chip the door: a
click opens the table filtered to the matches, with a rule-color column. The tooltip is "Show in
table". This is one click, it is reversible, and it adds no words at rest.

**Suspend node and edge styling and apply rule colors while picking?** Yes, while a selection card
is open for editing, and on live data. The canvas legend's title must say what is drawn,
**"Preview: Which nodes"**, and list the swatches with counts ("A 12", "B 5", "No match 7"). Done
or Escape restores the layers. Without that title the preview breaks the live-claims rule: readers
would think their styles were deleted, as the earlier "hidden" rows did. Give the legend one toggle
to see the styled graph while editing.

**Run algorithms in the cards or outside?** Outside, as mock J says. In the card, a result is named
by the run's exact title as the Results list shows it ("Betweenness", "Louvain (resolution 2)"),
under the rule decided on 2026-09-29. Picking a field that has not run starts the ordinary run. A
slow run shows **"Run (about 6 min)"**. A run computed on "This rule" lists in Results as
"<Method> (Rule A, step 2)" and goes with its step. The card's Settings row changes the parameters
and makes a new run name. It never silently rewrites a run that a style layer reads.

## Dropdowns: contents and order

- **Start with**: a segmented control **"No nodes | All nodes"** ("No edges | All edges" on
  Edges). With no choice made it shows the implied value, with no extra words.
- **Step verb** (the rule's "+"): **Add, Except, Keep**, in Figma's boolean order (Union,
  Subtract, Intersect) with Figma's icons. Tooltips: "Add (union)", "Except (subtract)", "Keep
  (intersect)", plus the key chip. The search aliases are union, subtract, intersect, remove and
  only. Exclude (XOR) is left out until a task needs it.
- **Value picker**: one component for both surfaces. Placeholder: **"Find attributes, results"**
  (it returns both; today's "Find an attribute" would lie). Order with nothing typed:
    1. Data: attributes, Node id last.
    2. Results: what has run, with a "computed" dot.
    3. One heading per algorithm family that has not run (Centrality, Community, Path, Structure,
       Flow, Prediction), with a clock and an estimate only above the live budget.
    4. Added: algorithms a user registered.
    5. Relative to: within k hops of, connected to, on a shortest path between, touching, and
       "while <reference> has nodes".

    Entries name the value first ("triangles -- Clustering"). A single-field result is just its
    method ("Degree"). Detail sits right-aligned as today ("3 values", "2 to 52"). Graph values are
    never entries.

- **Test**, by kind, default first:
    - number: Between / Has a value / Has no value. Range tests get the segmented **"Value |
      Position"** (the owner's words) on the histogram, and Position takes "# | %".
    - date: Before / After / Between (decided in tier 4).
    - category: Is any of / Is none of / Group size / Same group as.
    - tags: Any of / All of / None of / Tag count.
    - flag: a segmented "Yes | No", not a menu.
- **Reference**: "None" (only when the option is optional), Selected (N), Hovered or selected, This
  rule, then Sets, then nodes by typing. Next to it is a pick-from-canvas target button, with the
  tooltip "Pick on canvas" and Escape to disarm.

## Counts and readiness words

- Use the one form, "N of M nodes", everywhere. Not the mock's "24 / 77 n".
- A rule shows its own count. The total beside "Which nodes" shows the union.
- A step's change shows as a fading chip, "24 -> 18".
- Readiness:
    - "Not ready" chip, with the reason in its tooltip.
    - "Passes none" in neutral ink, never red.
    - Steps after a step that is not ready show "Waits for step 1".
- Missing values: chip **"Not measured: 3"** with an include toggle. When a field declares a
  `missing` value, its word replaces "Not measured" (for example "Unreached: 3").
- The element sends codes and params only. Every string above is the app's, in `style/words.ts`.

## Must match Figma and graphty

- Rules are Layers panel rows: a swatch, the name, the count, the eye (turns the rule off), and a
  drag handle to reorder steps.
- Steps rest as one summary line, which is the approved Style card's held-card summary.
- Sections take "+" on the right, as the Properties panel does. The card's rarely used options go
  under "...".
- Bounds use Figma's variable-binding hexagon.
- Keep today's remove X, Done, and the right-aligned dimmed count.
- Each Filters card keeps its outcome segment, Select | Filter to | Filter out, above its rules.

## Risks

- Except inside a Filter out card is a double negative, and Keep beside Filter to names one act
  twice. Test both on T65-like tasks before wording more.
- Words at rest: three rules of three steps blow the inspector budget (about 30 words, 40 at most).
  At rest, show one line per rule and expand only the rule being edited.
- The preview mode is a new state. If the legend title is missing, the result is a severity 3
  trust failure.
- Hover findings from the study tool were unreliable in tier 4, so script the "Hovered or selected"
  checks with clicks.
- "Rule" may be read as the typed-rule syntax in Find. Watch for that in the dry run.
