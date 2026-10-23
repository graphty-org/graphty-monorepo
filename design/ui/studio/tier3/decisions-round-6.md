# Tier 3, owner review of the fifth build: the studio's decisions

The owner reviewed the fifth tier 3 build (frozen as `.study-builds/tier3-i5-71743cf67b`) and sent
about fifty notes on the style panel. The studio answered each one in six groups, with two
proposals and a red-team and accessibility critique per group. This file records what the Design
Director decided, and why. The design itself (`tier3/design.md`) is updated to match.

Nothing here needs the owner's approval: every graphty-element change below is additive (a new
option, field, method or code whose default keeps today's behavior), and no published format
changes shape. Where a choice was close, the reason says what tipped it.

Several notes were defects, and the build has already fixed these (commits on
`design/studio-tier3`):

| Note                                                              | Fixed by                                                                                       |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| A hidden layer painted again after Louvain ran                    | graphty-element: every repaint uses the stack as drawn, not as stored (7f36cec26b)             |
| Running Leiden again after deleting its layer made nothing        | the app: running again brings the layer back (04bcc4cccd)                                      |
| "Opacity cannot be changed" by Degree                             | graphty-element: a value from a run is accepted on a layer that paints everything (7f47d03d33) |
| Edge text overlapped with "Hide overlapping labels" on            | graphty-element: decluttering covers edge labels too (0b21c5d650)                              |
| Adding static text also added a size                              | the app: adding text writes only the words (c14fa87ca2)                                        |
| The popover jumped on "Clamp outliers" and "Use one value"        | compact-mantine: an open pop-out keeps its place as it grows (8eba193112)                      |
| The "-" beside Background color did nothing                       | compact-mantine and the app (0fcada9ac4, c34e2cdb48)                                           |
| The right arrow under the histogram could not be dragged back out | graphty-element and the app (34fcc2dc1c, be99f06a85)                                           |

The decisions below say what the rest of the design becomes.

---

## 1. The layer list

**What decides a layer's icon?**

- Decision: the icon says only what the layer paints: a dot for nodes, a line for edges, a dot on
  a line for both, a folder glyph for a folder. Everything and Selected paint both, so they share
  the third. The icon gets a tooltip ("Paints nodes and edges"), the kind is part of the row's
  accessible name, and the Style tab header writes it in words under the name ("Nodes and
  edges"), so keyboard and touch readers can read it too.
- Why: Figma, Photoshop and QGIS all use the row icon for what a layer is, never where it came
  from. The source of a layer is already its name, and showing provenance would break "every
  layer is equal". The words in the header fix the owner's real problem: nothing explained the
  icon.

**A hidden layer painted again after another run.** Fixed in graphty-element (above). The test
reads what each edge was painted, not `explain()`, which already left the hidden layer out while
the canvas still painted it. A hidden row stays hidden through runs, undo, notes and data changes.

**"Add layer" made a "New layer" that vanished and could not be renamed.**

- Decision: Add layer makes a real layer at once, as one undo step:
    - Named "Layer 1", "Layer 2" and so on: the lowest number no row is already called.
    - It opens in rename with the name selected. Enter keeps what was typed; Escape or a click
      elsewhere keeps "Layer N". Neither deletes it.
    - It paints nodes and edges, every one ("Every node and edge. 77 nodes, 254 edges"), and writes
      nothing until a property is set. It has no legend entry while it sets nothing.
    - It lives until Delete or Undo. After Undo, focus returns to the list's "+".
    - Rename later by double-click, F2, or the row menu's Rename.
- Why: Photoshop and Figma both make a real, named layer immediately; no tool deletes a layer for
  being empty. A temporary draft was a third row state that nothing else in the app has.
- graphty-element: `styles.addRow` accepts a row that writes nothing. `addRow` has not been
  released, so this needs no new public field.

**Narrowing a new layer to Nodes only.** The edge settings it already had are kept (a kind change
never loses work), and the kind choice says so: "Edges: 3 settings kept, not drawn", with Clear.
Nothing is kept out of sight.

**Should "Add layer" also be where you run an algorithm?**

- Decision: the list's "+" menu holds every way to make a row: Layer, Folder, and "Analyze..."
  with its key, Shift+A. Analyze... opens the same Analyze popover as the toolbar button. There is
  no list of algorithms inside "+".
- Why: readers look for "where do layers come from" at the list's "+", as the owner did. One
  command with two doors keeps one Analyze. Escape returns focus to "+", and Shift+A never fires
  while a text field has focus.

**Leiden's layer was deleted; running Leiden again made nothing.**

- Decision: a run and its layer are separate things, and Analyze says which state you are in. Its
  button reads, for the run it will actually reuse:
    - "Run" when there is no run yet.
    - "Update Leiden layer" when the run and its layer both exist.
    - "Add Leiden layer" when the run exists and its layer was deleted. If the run is current, the
      layer comes back from the stored result without computing again; if its settings changed, it
      runs and then adds the layer.
    - The delete notice reads "Deleted Leiden layer. Its results are kept." with Undo, and Ctrl+Z
      works too.
- Why: running again just to get a picture back costs seconds on a large graph and can renumber
  Louvain or Leiden groups, silently changing every other layer that reads them. The button label
  tells the truth before the click.
- graphty-element: the run start takes `restoreLayer` and adds any of the run's suggested layers
  that are missing, in the same undo step; the run reports which of its layers exist. Both
  additive.

**"Analyze in the toolbar (Shift+A) to add results here".**

- Decision: removed. "Add data to start" stays when there is no graph.
- Why: the list is never empty (Everything, Selected and Hovered are always there), and "+" now
  offers Analyze where the hint pointed.

---

## 2. One group, every property (Louvain's "Group 1", "Group 2", ...)

**Each group can only change color. What about shape or text per group?**

- Decision: a group can set any property its layer can. The binding popover of any property that
  varies by a category lists the groups. Clicking a group (or Enter) opens that group's detail in
  the same popover: Name, then one field for every property this layer varies by that category,
  each with the control its kind needs (color chit, number, shape or pattern glyph grid, words),
  and "+ Set another property for Core team". Back or Escape returns to the list.
- Setting another property for one group binds that property by the same category, with an entry
  for this group only. The other groups keep the layer's own value for it: the property row
  still shows that one value ("Circle"), with a second line "Box for 1 community". Editing that
  row changes it for every group without its own entry. The element stores it once.
- If the property already varies by a different value (Shape by Department), "Set another
  property" does not silently replace it: the menu item is shown with its reason, "Shape already
  varies by Department".
- Several groups at once: Shift- or Ctrl-click (Shift+arrow keys) selects groups, the detail
  shows "3 groups" and "Mixed" where they differ, and one change writes them all as one undo
  step. A color drag writes once, when it ends.
- "New layer for Core team" stays, for a group that needs its own place in the stack, its own eye,
  or a rule. It now carries every setting the group has, and the new layer is placed directly
  above its source so the drawing does not change.
- Why: the color-only list was the owner's "critical gap". QGIS gives each category a whole
  symbol; Cytoscape gives each property its own table. Readers need both views, and the element
  already keeps a value table per property, so one list over those tables gives both without a
  second store.
- The rule for the rest of the app: any per-value or per-item control offers a control for every
  kind of property its parent offers. Every place the app branches on "color" either has a branch
  for the other kinds or a written reason in `coverage.ts`, and the coverage test catches the next
  one. This also fixes the "No value" field, which gives a shape or text binding a number box.
- graphty-element (additive): a binding's `otherwise` value for groups without an entry; one read
  of a category's groups with every channel's entry, count, name and hidden state; one write of
  several groups and channels in one undo step; overflow choices (Other, cycle) for shape, pattern
  and arrow schemes, not only color; legend swatches that carry every channel a value paints; a
  group's hidden state and Other fold applied to every binding of that category on the layer,
  including a property bound later.

**Dozens or hundreds of groups.**

- Decision: the list shows the largest 8 groups, then "475 more". Opening it gives a scrolling
  list with search (names and raw values), sort (largest, name, value), and "Fold groups under
  [3] into Other". When a node is selected, its group is pinned at the top, marked "has Valjean".
  "Select these" on a group selects it on the canvas. Where a palette runs out, groups that share
  a color also differ in a second cue (the cycles of color and shape are offset), never color
  alone.
- Why: with hundreds of groups the canvas is how readers find "the one I care about"; search and
  size order cover the rest. QGIS and Cytoscape both use one scrolling list, no paging.
- Keyboard and screen reader: the list is a grid with multi-select (not a plain list or a listbox
  with buttons inside, which screen readers flatten), arrow keys move, type-ahead jumps, and each
  row reads like "Core team, 41 nodes, color orange, shape star".

**Can groups be renamed?**

- Decision: yes. A group's name is a value label: the reader's name for a value, stored by
  graphty-element with the data, shown the same everywhere (key, popover, Values tab, rules,
  find). Rename with F2, the row menu, or the Name field in the group's detail (no double-click,
  because a single click already opens the group). An empty name returns to the default.
    - Default names: "Group 3" only for values the element marks as arbitrary codes (a community
      number); a data column's values show as they are ("2019", not "Group 2019").
    - A re-run moves each name to the new group sharing the most members. If two named groups merge,
      the larger overlap keeps its name and the other is reported as gone.
    - The rule editor accepts a name and stores the value. Exports keep the values.
- Why: the name must follow the group across a re-run, and only the element knows which new group
  is the old one; storing it in the app would copy that matching. Like Tableau aliases and Stata
  value labels, a name is not a data edit and not a style setting, so a rule never breaks.
- graphty-element (additive): `data.setValueLabel` and `data.valueLabels`, saved with the
  project; a `label` on each group and legend swatch.

---

## 3. "Color from data" and the other value popovers

**The Palette field was empty although a palette was painting (Closeness, Louvain).**

- Decision: inside a binding, every field shows what it paints now. The palette select reads
  "Viridis"; in its menu the default carries a "Default" tag, and a screen reader hears "Palette,
  Viridis, default". A minus appears once the reader picks something else, and its tooltip names
  what comes back ("Back to the default palette, Viridis"). Each group's chip shows its painted
  color.
- Why: the owner's "no inherited values shown" rule is about properties the layer does not set,
  which belong to the layers beneath. Once a layer varies a property, the palette, scale and range
  are this layer's paint; leaving them blank hid what the layer draws. This is the owner's own
  complaint, so it is the owner's call already made. Figma never shows an empty field in a fill.
- graphty-element (additive): the preview reports the palette in use and which parts it filled
  from its defaults.

**The arrows under the histogram.**

- Decision: the histogram always shows all of the data. The two arrows are where the lowest and
  highest colors start; bars past an arrow are drawn in the end color with a hatch (so not by
  color alone), and a line under it always reads "9 below, 12 above take the end colors". Each
  arrow carries its value. One "Ends" select replaces "Clamp outliers": Fit the data, Values, or
  Percentiles (starting at 2nd and 98th). Dragging an arrow on Fit the data switches to Values in
  one undo step. The Ends minus returns to Fit the data.
    - The histogram's axis follows the scale (a log scale gets a log axis), so heavy-tailed values
      such as betweenness keep room to place an arrow. A typed end beyond the data shows its flag
      at the axis edge with the value, rather than squashing the bars.
    - Keyboard: each arrow is a slider; arrow keys move a hundredth of the range, Page Up and Down a
      tenth, Home and End go to the data's ends. When values tie so that a percentile end changes
      nothing, the line says so.
- Why: the arrows were also the axis ends, so narrowing them shrank the axis and they could never
  move out again. Power BI, Tableau and Cytoscape all set the ends of a ramp against the data's
  full range. The element already stores both a value range and a percentile range, so the saved
  format does not change.

**The popover moved when content changed.** Fixed in compact-mantine. The rule for every popover:
placement is chosen when it opens; after that the edge facing its anchor stays put, it grows away
from the anchor, and past the window edge it scrolls inside.

**"Opacity cannot be changed" and "Pattern could not be changed".**

- Decision:
    - The opacity refusal was an element defect, now fixed.
    - Pattern (and shape, and arrow kind) by a number: one rule for data columns and run results
      alike. A number on a property with a fixed set of choices is drawn in steps: equal-count
      steps, one per choice, at most 5, using an ordered pattern set (sparse to dense) so the order
      can be read. The picker row reads "Edge betweenness, in 4 steps".
    - Every failure notice carries the element's reason in words ("Opacity can't vary by Degree
      here: ..."), and where the element can say beforehand that a value will not fit, the picker
      lists it under "2 that do not fit opacity", wrapped, never cut.
- Why: the picker offered a binding that then failed; the element gave runs and columns two
  different answers to one question.

**Pattern count plus Pattern made the lines disappear.**

- Decision: graphty-element fits its default output range to each property's own limits (a
  pattern count is at least 2; it was offering 0 to 1). The app sets opacity's range to 20% to
  100%, a presentation choice another consumer may set differently; the element's default stays
  the full 0 to 1.
- Why: a range outside what a property accepts is an element defect; how faint the faintest edge
  should be is a choice.

**"Degree" vs "Rank of Degree".**

- Decision: Degree is the count of connections; its rank orders nodes with 1 for the most
  connected; its percentile is the share ranked at or below. For color, size, width and other look
  properties, the picker lists each measure once ("Degree"): spreading values evenly is the Equal
  counts scale, and rank runs backwards (rank 1 would get the low color). Text, rules and the
  Values tab still offer the derived forms, named one way everywhere: "Degree rank (1 = highest)"
  and "Degree percentile".
- Why: three near-identical choices before seeing anything; the element already names these
  fields, so it needs nothing new.

**How do I add and save my own gradients and palettes?**

- Decision: a pen beside the palette opens "Edit colors": the gradient editor for a ramp, or a
  list of colors with Add and Paste colors for categories. Edited colors belong to that binding
  (the select reads "Custom"). "Save as palette..." names it and saves it in the project, listed
  under "This project" at the top of the palette select. Editing a saved palette recolors every
  binding that uses it, and its menu says "Used by 3 layers". Deleting one in use copies its
  colors into those bindings, so nothing changes on the canvas. A personal list across projects is
  held until a study shows readers reusing a palette in a second project.
- Why: Figma keeps styles in the file and Tableau and Datawrapper let you make a palette in the
  middle of work. Starting in the project means a shared file looks the same when someone else
  opens it.
- graphty-element (additive): project palettes (list, add, rename, update, remove, each one undo
  step), saved in the style document as a new optional field.

---

## 4. Which elements a layer affects

**A new layer's elements.** Both and Everything, as the owner asked (section 1).

**Choosing elements through drop-downs in the sidebar is confusing.**

- Decision: the sidebar shows the rule as one sentence with its count ("Nodes where Degree is at
  least 5. 31 nodes"). Clicking it opens a popover beside the panel (320 px wide). Inside: the
  kind (Nodes, Edges, Both), a find field, then conditions. A condition picks the attribute first
  (Data, then each run, then State and Saved sets), and the tests offered follow its type:
    - Number: is between (with the histogram and two handles, plus the numbers in words), at least,
      at most, is, in the top N, in the bottom N, has a value.
    - Category: is one of, is not one of (a checklist with counts and search), in the largest N
      groups.
    - Text: contains, is, starts with, ends with, matches pattern.
    - Yes or no: is yes, is no.
    - A number column with few distinct values offers both the number and the category tests.
    - "Match all / any of these" sits above the conditions.
- Changes apply live, as one undo step for the whole popover. Done, a click outside, or focus
  leaving keeps them; Escape restores the rule it opened on. Typing is applied after a short
  pause, and the count is announced when the edit settles, not on every key.
- Every rule the element can hold reads as a sentence and opens here, including the rules on run
  layers and on "New layer for" layers. A rule the controls cannot show (nested groups, a degree
  or neighborhood rule) opens as a read-only sentence with "Replace with conditions".
- Why: the old editor made readers choose a "kind of rule" before choosing anything about the
  data, which is exactly the owner's confusion. Airtable, Notion and Cytoscape all pick the field
  first and offer tests by its type, as the owner suggested.
- graphty-element (additive): each readable value says which tests it can be given; the histogram
  takes a run's value as well as a data column; a "largest N groups" rule leaf; a `ties` choice on
  "top N". The rule language is documented as open to new leaf kinds, so new leaves are additive.

**"Hovered" makes no sense: I can't hover something and click menus.**

- Decision: "is hovered" and "is selected" become yes-or-no attributes under "State" in the
  attribute list, not kinds of rule. When a rule reads hover, the popover offers "Preview on the
  selection", which holds the hover state on the selected elements while the popover is open, so
  the look can be edited and seen (as Chrome DevTools can force :hover).
- Why: keeping them as attributes lets any layer combine them ("selected nodes in community 3 get
  a halo"), so the pinned Selected and Hovered rows stay ordinary layers.
- graphty-element (additive): a view-only forced state, never saved, with no history entry.

**"Named", "Members of a set", "Expression": how do I use them?**

- Decision:
    - Named becomes "Specific elements...", the first entry of the attribute list: search by name,
      chips by name (with the id when two share a name), and "Add the current selection (3)". Past
      50 elements the chips fold into one ("30,000 nodes, Show"). On a Both layer it keeps the node
      and edge lists both.
    - Members of a set: each saved set appears as "In <set>" with "is in / is not in", and the group
      is not listed when there are no sets. The workspace has no command to save a set yet, so
      today readers will not see it. A "Save as set" command is not added now: nothing in the tasks
      needs it.
    - Expression moves behind "Write a rule" at the foot of the popover, a text field for the
      element's existing query syntax only. No new rule text language is created (that would be a
      published format).
- Why: Named was a bare box of raw ids; sets were a door to nowhere; Expression was a peer of the
  simple path with no help.

**"Top 10 by Community size" selected nothing.**

- Decision: every node in a community carries that community's size, so the largest community's
  nodes all tie, and taking them would exceed 10, so none were taken. Now:
    - A tie choice under the condition: "If values tie at the cut: Take all tied | Take fewer". The
      app chooses "Take all tied"; the element's default stays "Take fewer".
    - The count line always explains: "17 nodes: you asked for 10; 7 more tie at 17". When a tie
      makes the result far larger than asked, the line says so plainly.
    - "In the largest N groups" on a category picks whole communities, with the same tie choice. When
      a number is the same for every member of a group, the condition offers it: "Community size is
      one value per community. Use: Community is in the 10 largest groups".
- Why: nobody else silently returns nothing (SQL's WITH TIES, Tableau's Top N); the reader almost
  always meant the largest communities.
- graphty-element (additive): `ties` on the top-N leaf; the result as a coded fact (the existing
  English sentence is kept and marked for removal in the next planned major); a declared "one value
  per group of <category>" on run fields, never detected by scanning.

**After cycling choices on a Leiden layer, "Which elements" stopped working on every layer.**

- Decision: treated as a defect with an unknown cause. The engineer reproduces it with real input
  (run Leiden, delete its layer, run Leiden again, cycle the choices, open Which elements) before
  fixing it. Separately, each panel gets an error boundary, so one panel that fails shows "This
  panel could not be shown" with Reload panel instead of breaking every layer.

**A rule on an edge value on a Both layer.** The element already lets a rule say whether nodes
follow ("at their ends") or are left alone ("all"). The popover shows it: "Nodes: at their ends |
all". "None" is added to the element as a third value (additive).

---

## 5. Properties in the Style tab

**"Band" + "Band width" + "Band opacity"; four items for an arrowhead. Must I have all of them?**

- Decision: one "+" item per thing drawn: Glow, Halo, Outline, Band, Motion, the two arrowheads,
  Pattern. Picking one adds its row with its main value (a color, or an arrowhead's shape) and
  opens its popover, which holds the rest (width, opacity, size, strength). A row shows its main
  value and, as secondary text, any other setting it makes ("Opacity 60%", or "Opacity by
  Betweenness"), and that text is part of the row's accessible description.
    - No setting is required. A layer may set only an arrowhead's size, because a layer beneath may
      draw the head. When nothing on any layer draws the thing for these elements, the row says so:
      "Draws nothing: no arrowhead on these 254 edges". Everything's base rows never carry this
      line, and one cause is named per row (a hidden layer outranks a missing part).
- Why: Figma's effects and strokes are one entry each, with their parameters in a popover;
  Cytoscape's flat list is the one people find overwhelming.
- graphty-element (additive): each channel descriptor says which channel it modifies (one field,
  so the app keeps no table), and one batched call per layer reports what draws nothing,
  resolved over the whole stack and cached until the stack or data changes.

**What to call the ends.**

- Decision: the section is "Arrowheads" (replacing "Ends"), with "Target end" and "Source end".
  Their tooltips keep the graph-theory word: "Target end (the head): where each edge meets its
  target node". Head, tail, start, end, marker and arrow all find them in search.
- Why: graph theory says head and tail; Graphviz says arrowhead and arrowtail; Cytoscape and yEd,
  and every edge file, say source and target. "Tail arrowhead" contradicts itself, and readers'
  files already name the columns source and target. "End" also works for text at an end.

**Edge text: Caption vs Text; text at the end did not show; a row too wide; a popover too big;
a look that changed one label.**

- Decision:
    - One noun, Label, in three places: "Label" (on the line, above, or below), "Label at target
      end", "Label at source end". The word "Caption" is gone, and the edge Position no longer lists
      a node's compass points. No edge tooltip is offered: the element has none.
    - End labels draw whether or not the end has an arrowhead, through a new element option that is
      off by default; the app turns it on. That is why "End" never showed: Les Miserables has no
      arrowheads.
    - A text row is: the look chit (opens the label's settings), the words field, the vary glyph
      inside the field's end, and the minus. The place shows in words on a second line ("At target
      end") only when the entry sets one. The entry's eye goes: hiding a label written beneath is
      "No label" from Text's "+", an ordinary setting with a minus, like Hide in Visibility.
    - The label popover shows five fields: Look, Size, Position, Text color, Background. "More"
      adds any of the others one at a time (Type, Box, Letters, Placement, Motion and distance,
      Badge), and only fields that are set appear.
    - A look belongs to one label. The look picker adds "Use on every label on this layer", one undo
      step.
    - Edge labels take part in "Hide overlapping labels" (fixed).
- Why: the reader sees one thing (text on an edge), so one noun. Most of the 49 popover fields are
  rare; the five are the ones studies and the owner reached for. A layer-wide look row would be a
  second home with a hidden write.

**Why both "Shown" and "Hidden"?**

- Decision: Visibility's "+" offers "Hide" and "Show". The row reads one word, "Hidden" or
  "Shown", with its minus. Show's menu line says what it is for: "Show elements a layer beneath
  hides". The tree eye's tooltip becomes "Turn this layer off".
- Why: Shown exists only to undo a layer beneath that hides, which a two-word select never said.
  Show is always offered, so a layer can be authored before the layer it overrides exists.

**How do I change the outline's width?**

- Decision: every outline on screen shares one width (the renderer draws all outlines in one pass).
  The width is a graph setting, "Outline width", in Graph settings only. The Outline popover's help
  line says "For a ring of a different width per layer, use Halo." A per-layer outline width is not
  built.
- Why: a width inside one layer's popover that changes every layer would break "every layer is
  equal". Halo already has a size per layer.
- graphty-element (additive): an `outlineWidth` graph option; the outline and halo notes as codes,
  not English sentences.

**Number fields: "type a number"? Does Figma have arrows?**

- Decision: Figma has no stepper arrows. Number fields work like Figma's: drag the row's name
  left or right to change the value (the cursor shows it), Up and Down change by one step, Shift
  by ten, and arithmetic like `12*2` works. One drag is one undo step; Escape during a drag
  restores the start. A click on the name still focuses the field. The drag speed follows the
  property's step, so opacity does not cross its whole range in two pixels. Alt+drag is not used:
  Linux window managers take it.
- graphty-element (additive): each channel says its step. compact-mantine: the drag handle on a
  field's name, for every number field.

**Why no arrowheads by default anymore?**

- Decision: keep the element's default: arrowheads follow the data's direction. Les Miserables is
  undirected (characters who appear in the same chapter), so it draws none; it used to draw them
  by mistake. Arrowheads can still be added. When they are, on a graph that is undirected, mixed or
  of unknown direction, the Arrowheads section says so: "This graph is undirected: arrows point
  from each edge's first node to its second, in your file's order."

**"Bob: Bob" in the legend, and Bob showed only Nodes.** A layer that sets nothing has no legend
entry, and a new layer paints Both, so both groups show (section 1).

---

## 6. The graph panel and Values tabs

**2D/3D and Layout appear in the graph Style tab and in the toolbar.**

- Decision: removed from the Style tab. The toolbar is their one home (the 2D/3D switch also leaves
  VR and AR properly, which the panel copy did not). The graph Style tab keeps only properties of
  the canvas: Background, Lighting, Same size at any depth, Labels, Outline width.
- Why: Figma's panel with nothing selected holds only file properties; view and layout are toolbar
  commands. Readers went to the toolbar first in earlier studies.

**"Headlight color" exists even when headlight is off; its "-" does nothing.**

- Decision: the field was "Highlight color", read as "Headlight". It is removed from the panel: it
  changes nothing already drawn and is not saved, so a reader could never see it work. A route's
  or set's color is changed on that run's own layer, in its Fill row. The app keeps its own
  highlight color as a fixed presentation choice.
- To check before the next build: whether a reader's edit to a run's highlight layer survives the
  next run. If the next run deletes it, that is an element defect, fixed with an option whose
  default keeps today's behavior.

**Settings that do nothing in the current view.**

- Decision: a setting shows only where it changes the drawing. graphty-element says whether each
  graph setting is in effect (for example "ignored in 2D"); the app hides the ones that are not.
  If the focused field is hidden, focus moves to the next row and the change is announced once.
  The graph's Values tab lists "2 settings apply only in 3D", so they can still be found.
- The "-" beside a color appears only once it differs from the starting value, and returns it to
  the default graphty-element publishes (the app no longer hard-codes white).

**The Values tab of a layer that matches everything shows only counts.**

- Decision: every layer's Values tab, Everything included, has the same structure:
    - Covers: "Nodes, every one, 77", "Edges, every one, 254".
    - Where its look shows: one row per property the layer sets, "Node color: on 0 of 77 nodes",
      with "covered by Louvain, 77" underneath (the top 3 covering layers, then "N more"). Each row
      selects those elements.
    - Labels: labeled, drawn, hidden by overlap.
    - Then, for layers that read values, the histograms, groups and members as designed.
    - The special one-sentence Everything Values tab is deleted.
- Why: a layer that matches everything has nothing to say about which elements; what it can answer
  is "why don't I see my look?", the question the owner hit when Louvain covered the base color.
- graphty-element (additive): per property, which layers cover this one and on how many elements,
  capped with a remainder count.

**Les Miserables says "Undirected". Isn't it directed?**

- Decision: it is undirected: the file says so, and the data is chapter co-appearance, which is
  symmetric. The row reads "Undirected" with an (i): "The file says its edges have no direction.
  Arrowheads added in Style point from each edge's first-listed node to its second." When the
  direction was set on the Data page instead, the (i) says that. Mixed and unknown direction get
  their own words.

**"Edges per node 1 to 36, mean 6.597" should be separate statistics.**

- Decision: a Degree section ((i): "how many edges meet a node"): a histogram, then Lowest, Median,
  Mean (one decimal), Highest, each on its own row. A directed graph gets All, In and Out. The
  histogram uses bins the element chooses with a fixed budget, so a graph with degrees in the
  thousands does not draw thousands of bars. Transitivity, which the element already publishes, is
  shown too. The same distribution rows replace one-line ranges in the layer and attribute Values
  tabs.
- graphty-element (additive): in- and out-degree histograms for directed graphs; binned degree
  histograms with a bin budget.

---

## What to watch on the next build

- Does anyone expect the icon to say where a layer came from?
- Does an empty "Layer 1" read as broken, or as empty?
- Do readers find per-group settings from the group list, and do they still use "New layer for"?
- Do readers find "+" > Analyze before the toolbar button?
