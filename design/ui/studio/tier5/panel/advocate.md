# Tier 5 panel: User Advocate proposal (selection cards)

For Explorer Elena (first-time) and Analyst Alex (weekly, knows Gephi). Built on mock J and a walk
of build 13ab62a0bbe7 (screenshots: main checkout `tmp/design-studio/tier5/panel/advocate/s1/`).

## What the live app does today (evidence)

1. **The two surfaces already use two different pickers for one act.** Style "Which nodes" lists
   `Data` then `Structure: Node id` (`05.png`); Data place "Filters +" lists `Nodes: Node id, name,
...` then `Structure: Largest component ...` (`10.png`). Same question, two orders, two lists.
2. **A value the app shows cannot be picked.** The Values tab shows "Degree 3 to 8"; typing
   "deg" in either picker gives "Nothing found" (`06.png`, `15.png`). Alex's first question ("who
   is most connected?") dead-ends here.
3. **Editing a card moves the Properties panel away.** Ticking a Select filter replaced the open
   layer's Properties with "5 nodes selected" (`12.png`): the reader loses the thing they were
   editing.
4. Analyze already groups algorithms under reader-facing headings ("Rank nodes and edges", ...)
   with one-line descriptions (`13.png`). The field picker should reuse those headings, not invent
   new ones.

## Answers to the owner's open questions

**Open the data table automatically while picking? No.** A panel that opens by itself changes the
layout under the pointer and takes the canvas, the reader's main check. Instead: every step's count
chip and the group total select their members when clicked (my standing rule: a count that stands
for members selects them), and the card's "..." row offers **Open in table**, which opens the table
filtered to matches and sorted by the card's value. It stays open next time if the reader opened it (a
reader preference).

**Suspend node/edge styling and paint group colors while picking? Yes, while a selection editor
is open, on both surfaces.** Why: with styling on, a group color can equal a community color
already on the canvas: a picture that looks right and answers wrong. Conditions:

- Styling returns on Done, Escape, or leaving the place; nothing is saved.
- Non-matching elements draw gray `#808080`, never hidden.
- The legend shows group swatches and counts while picking: the mode names itself.
- An eye toggle in the editor header (tooltip "Show styles") returns the styled view.

**Run algorithms in the cards or outside? Outside, as J says.** One betweenness value everywhere
(card, Values tab, table, legend). A card-private run that disagrees with the panel teaches
distrust of every number. Picking a field that has not run starts the normal
run (under about 1 s: just runs; above: a "Run (about 6 min)" button on the card). The run then
appears where Analyze's runs already appear; **no second Runs list inside the editor**. The only run
owned by a step is "computed on this group so far", shown as a chip on that step.

## Dropdown contents and order

**Start with**: a two-segment control `All | None` (Figma uses segments for two choices, not a
menu). It defaults from the first verb (Add: None, otherwise All), so the default removes nothing.

**Verbs**: three icon buttons at the foot of each group, at the act, not a default fixed afterwards:
Figma's boolean-operation icons in Figma's order: **Union = Add, Subtract = Except, Intersect =
Keep**. The tooltip carries the word and what it does. No Exclude (XOR). A step's verb can change
later from its row icon (the same three).

**Field picker** (one component for both surfaces, fixing finding 1). Search focused. Empty query
order:

1. Data: attributes in file order, with kind glyph and value summary (as today).
2. Analyze's own headings, in Analyze's order ("Rank nodes and edges", "Find groups", "Paths and
   distance", ...). Within each, computed values first (dot), then not-yet-run (clock with
   estimate). Degree is always listed (finding 2).
3. Added (user-registered algorithms).
4. Structure: within k hops of, connected to, on a path between, linked to at least N of, shares a
   value with, edges within / leaving, Data source (only with two or more sources), Time window.

Entries name the value first ("community -- Louvain").

**Test controls** (no word-menu for kind):

- number, time, ordered: `By value | By position` segments over a histogram brush with two boxes
  (the owner's 2026-10-31 decision). "Has a value / Has no value" leaves the menu and becomes the
  "not measured: K" chip with its include toggle.
- category: counted checklist with search; by size moves to the "..." row. No "Is any of" select:
  the verb already says include or except. One fact, drawn once.
- tags: `Any | All` segments over the checklist ("none of" is Except).
- flag: `Yes | No` segments.
- hierarchy: the cut control, then the category checklist.

**Reference picker**: Selected node, Focus, Picked nodes, This group so far, named sets, then a node
by typed name; a target button beside it. Selected first: Elena asks "around this one".

**Computed on** (`Whole graph | So far`): hidden unless the algorithm can recompute on a subset and
the two sizes differ; then it shows on the card, not behind "...", because it changes the answer.

## What must match Figma and graphty

- Step rows are Layers-panel rows: 32 px, verb icon, value chip, short test, count right, eye on
  hover (the style layers list already uses the eye), drag to reorder, click opens the card inline
  below, one card open at a time (tier 4 R4).
- Card body keeps the owner-approved condition card's anatomy (field name, count chip, remove X,
  range with two boxes); nothing approved is restyled.
- Reuse today's "5 of 24" count chip and Done.
- Group colors come from graphty's group palette so the legend, table row marks and canvas agree.
- Every hotkey shows on its button; keyboard order: verb buttons, rows, card controls.

## Risks

1. **"Group" is already a screen word** (`glossary.md`: one part of a partition; "never a
   container"). A selection branch called "Group 2" holding "Community of Valjean" puts two meanings
   in one line. The branch needs another noun or none: a swatch plus an editable name defaulted from
   its first step. Content designer to settle.
2. **Two verb sets meet on the Data place**: a card effect `Filter out` holding a `Keep` step reads
   as a double negative. The effect stays in the card header; steps show icons first, words in
   tooltips.
3. **Order now matters inside a group** (so-far steps), against the tier 4 "order never matters"
   rule for filter cards. Keep order-free across cards; show J's order icon only on steps that read
   "so far".
4. **Scope creep hides the simple path.** Several-reference combine, hierarchy cuts, link scores,
   bound binding all go behind "...".
5. **The suspended-style mode must end.** A reader who leaves with group colors still drawn believes
   their styles are lost. Test: open, pick, switch place, return.
6. **Editor focus must not jump** (finding 3): selecting through a card keeps the editor's panel.

## Re-tests for the dry run

- Alex: "the most connected people who are also staff" (no field name given).
- Elena: "color the people within two steps of <name>" from a fresh layer.
- Both: open a selection, close it; styles back? (end-state check, not their words.)
