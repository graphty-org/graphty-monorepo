# Iteration 1: the style panel walked as a Figma product designer

An expert walkthrough of the first build of the unified style panel (the layer tree on the left,
the Style tab on the right), judged against how Figma's right sidebar solves the same control
problems: controls, menus, cardinality, density and consistency. Severity runs from 0 (not a
problem) to 4 (blocks the work). Each finding names its screenshot and the package that owns the
fix; where the cause was read in source, the file is named.

## What was walked

- The production build served at https://dev.ato.ms:9373, build stamp `cfa6408d84a4` (one commit
  behind the branch head, which only adds words for the halo, band, label and visibility channels).
  Driven with Playwright in its own browser context through the studio's browser gate, at
  1440 x 900, then 900 x 700.
- Les Miserables from Samples; then, through graphty-element's session as the owner-review stories
  do: the starting rows, an Annotations folder holding Key people (four characters in orange, size
  2), Degree, Edge betweenness, Louvain with community 3 recolored green, and a route from Myriel to
  Marius. Everything after that was clicks, keys and hovers.
- Screenshots (local, not committed): `design/ui/studio/tier3/build/figma-i1/`. Names below are
  relative to that folder.

## Summary

22 findings: 4 at severity 3, 14 at severity 2, 4 at severity 1. The grammar the design took from
Figma mostly arrived: a set field carries its minus at rest, the minus says what comes back,
Delete clears a focused select, the eye and lock left the panel header, and label looks read like
Figma's text styles. What did not arrive is the frame around it: rows made by a run behave
differently from rows a reader makes, value rows lose their names, popovers cover the panel they
belong to, and the clear and mixed states each have more than one look.

## Severity 3

1. **Rows made by a run have no Which elements section.** Key people (made by hand) opens with
   Which elements; Connections, Communities, Bridge edges and both route rows open straight on
   Nodes or Edges, so a reader cannot see or change what a run's layer paints. The settled model
   says provenance never changes behavior, and in Figma every object of one kind shows the same
   sections. Cause: `graphty/src/workspace/style/StylePanel.tsx` line 149 shows the section only
   when every layer's `source.by` is `"user"`. Owner: graphty app; graphty-element if a run
   layer's rule cannot be read back as an editable rule. Evidence: `s2-all-06-route.png`,
   `s2-all-27-degree.png` against `s2-all-09-key-rest.png`.

2. **A route arrives as two rows.** The tree holds "Shortest route (edges)" and "Shortest route
   (nodes)", each with its own panel, eye and lock. Decision 1.8 makes a route one layer that paints
   both kinds; Selected, Everything and a hand-made layer already do. Two rows for one result is
   two places to recolor it. Owner: graphty-element (the run's starting layers are two one-kind
   layers, not one row that paints both). Evidence: `s2-all-01-tree-rest.png`.

3. **Category rows lose their names.** In Louvain's color popover each row is a full-width hex
   field, an eye and "...". The community name and count exist (the rows' accessible names are
   "3, 11", "1, 20") but the hex field squeezes them to nothing, so the reader cannot tell
   community 3 from community 5 except by its color. Figma's Selection colors and variable rows
   are a 14 px chip plus a name. Cause: `BindingPopover.tsx` around line 728 puts a whole color
   input in the row's chit slot. Owner: graphty app; compact-mantine if it lacks a chip-only color
   control (a swatch button that opens the picker). Evidence: `s2-all-32-communities-pop.png`,
   `crop-category-rows.png`.

4. **The key at rest is six rows about an empty layer.** With nothing selected, the key opens with
   six "Selected" blocks (0.4, 1.45, a yellow chit, 1, 2.5, a blue chit) for a layer that paints 0
   nodes and 0 edges, ahead of the rows that describe the canvas. The branch head adds words for
   these channels, which renames the blocks but does not remove them. Owner: graphty-element
   (`styles.legend()` returns blocks for a layer that matches nothing; give them a count fact the
   key can drop on); graphty app for the words. Evidence: `s2-all-01-tree-rest.png`.

## Severity 2

5. **Popovers cover the panel instead of opening beside it.** Figma opens a 240 px popover with its
   right edge on the panel's left border, top aligned with the row. Here the color ramp
   (`s2-all-28-degree-ramp.png`) and category popover overlap the panel and hide the Text, Tooltip
   and Effects titles; the vary picker covers the Size field and its label
   (`s2-all-18-vary-picker.png`); the shape grid opens over the panel (`s2-all-17-shape-open.png`);
   Label settings is a full-height 280 px column over the top bar and the inspector's own header
   and tabs, with 49 fields scrolling past the window (`s2-all-24-label-settings.png`). Color
   settings is placed nearly right (`s2-all-20-color-settings.png`). Owner: compact-mantine (one
   placement for every panel popover), then graphty app.

6. **Setting a field changes its width.** An unset field runs to the panel's edge; once set it
   shrinks 25 px to make room for its minus, so the row jumps on every set and clear. In the paired
   Color | Width row the minus lands between the two fields and the bound value is cut to
   "Edge ...". Figma's grid always reserves the 24 px icon column (16 | 88 | 8 | 88 | 8 | 24 | 8).
   Owner: graphty app (`PropertyRow.tsx`), or compact-mantine if the grid belongs there. Evidence:
   `crop-set-vs-unset.png`, `s2-all-34-bridge.png`.

7. **Three looks for one Clear.** Core fields clear with a minus outside the field; a label's Look
   and Size, the ramp's Scale and Graph settings' colors clear with an "x"; a recolored category
   clears with a minus inside its field. The design's rule is one command, Clear, on a minus.
   Owner: graphty app (`LabelSection.tsx`, `BindingPopover.tsx`, graph settings). Evidence:
   `s2-all-23-label-entry.png`, `s2-all-28-degree-ramp.png`, `crop-category-rows.png`,
   `s3-probe-08-graph-settings-style.png`.

8. **Mixed shows a color that is not there.** With Key people and Connections selected, Color reads
   "MIXED" beside a purple chit (the node default, which neither row paints); number fields spell it
   "Mixed". Figma shows Mixed with no swatch and one spelling. Owner: compact-mantine
   (`CompactColorInput`'s mixed state). Evidence: `s3-probe-07-multi-key-degree.png`,
   `s2-all-05-selected.png`.

9. **Menus with one item.** The Text "+" offers only Label (Tooltip became its own list with its own
   "+"), and a category's "..." offers only "New layer for 3". Figma never makes a reader open a
   one-item menu: a "+" with one kind adds that kind. Either fold Tooltip into Text's menu as the
   design said, or let Text's "+" go straight to the source picker. Owner: graphty app. Evidence:
   `s2-all-21-text-menu.png`, `s2-all-33-communities-3-menu.png`.

10. **The shape grid cannot be read by name.** Names truncate to shared stems: "Pentago..." three
    times, "Elongat..." three times, "Triangul..." twice. Figma's icon grids carry a tooltip per
    item; add one, and give names room (three columns). Owner: compact-mantine (the glyph grid
    select). Evidence: `s2-all-17-shape-open.png`.

11. **The vary picker rows carry no fact.** Rows are a glyph and a name only, so Degree, Degree rank
    and Degree percentile are told apart by name alone, and "Degree in degree" and "Degree out
    degree" are offered on an undirected graph. Figma's variable picker shows each value
    right-aligned in secondary text; the design asked for one fact per row ("1 to 36"). Owner:
    graphty app for the fact (the attribute descriptors have it); graphty-element for whether
    in and out degree are published for an undirected graph. Evidence: `s2-all-18-vary-picker.png`.

12. **The ramp is still read, not seen.** Bars are one orange instead of the color each value gets
    (on Linear and on Log), the two domain fields under the palette have no labels, and clamping is
    a checkbox rather than brackets on the axis. This is the owner's question about a visual
    gradient, not yet answered by the build. Owner: compact-mantine (ramp editor). Evidence:
    `s2-all-28-degree-ramp.png`, `s2-all-30-degree-log.png`.

13. **Label entry writes values the reader did not pick.** Adding a label and choosing "name" also
    sets Look "Card" and Size 72, each with its clear "x", and the key gains a "Key people 72" row.
    The design writes only what the reader chooses and shows the look's values as placeholders.
    Owner: graphty app (`LabelSection.tsx`), graphty-element if the defaults come from it.
    Evidence: `s2-all-23-label-entry.png`.

14. **"Painted over" says by nothing.** Tree rows read "Connections Painted..." cut off; the hover
    tooltip says "Painted over" without the layer (the design: "Painted over by Degree"), and the
    row's accessible name leaves it out. Owner: graphty app. Evidence:
    `s3-probe-02-painted-over-hover.png`.

15. **Row commands are missing.** The row menu (right-click and the header's "...") has Rename,
    Pin, Unpin and Delete only; Duplicate, Move to folder and Select what it paints are absent, and
    the header has no Select what it paints button (Figma's "Select matching layers" in the type
    row). Owner: graphty app. Evidence: `s2-all-03-tree-context-menu.png`,
    `s3-probe-01-row-menu-key.png`.

16. **Graph settings opens on Values.** The "Graph settings" door lands on the Graph's Overview,
    because the inspector keeps the tab it last had. On the Style tab, the layout block (Method,
    Spring length, Gravity) has no section title beside Canvas and Labels, and the panel scrolls
    sideways. Owner: graphty app. Evidence: `s2-all-39-graph-settings.png`,
    `s3-probe-08-graph-settings-style.png`.

17. **Opacity hides behind a gear as a fraction.** Node color's settings popover holds one field,
    Opacity "1". Figma's paint row shows opacity as a percentage inline after the hex, so a Figma
    user looks there first. Owner: compact-mantine (`CompactColorInput`'s opacity part), then
    graphty app. Evidence: `s2-all-20-color-settings.png`.

18. **Effects entries take two lines.** Halo and Band each have a caption line above a hex field;
    Figma's effect row is one line with icon and name in the button, which opens its settings.
    Owner: graphty app (`Effects.tsx`). Evidence: `s2-all-05-selected.png`.

## Severity 1

19. A paintbrush glyph on every layer row repeats "this is a layer" beside the node and edge marks
    that carry the kind; Figma's row has one type glyph. Owner: graphty app.
    `s2-all-01-tree-rest.png`.
20. After a Clear, Undo reads "Undid changing Size on Key people." rather than naming the clear.
    Owner: graphty app (history words). `s2-all-17-shape-open.png`.
21. "Shape" and "Size" labels sit 2 px apart vertically. Owner: graphty app.
    `s2-all-04-everything.png`.
22. The draft's Nodes | Edges | Both control has no option chosen and its hint is the only text in
    the panel; acceptable, but the first click could preselect the kind of the current selection.
    Owner: graphty app. `s2-all-38-draft.png`.

## Checked and working

- A set field's minus is always drawn; its tooltip reads "Clear: back to 1, from Node defaults";
  after Clear the field shows the beneath value as gray placeholder text and one Undo brings it
  back (`s2-all-12-key-minus-tooltip.png`, `s2-all-13-key-size-cleared.png`).
- Delete and Backspace clear a focused shape select; emptying a number and pressing Tab clears it;
  tab order is field, vary glyph, minus (`s3-probe-05-shape-after-delete.png`).
- Escape in the vary picker returns focus to the vary glyph; "Fixed size" at its top undoes the
  binding, as Figma's Detach does.
- The panel header holds name, kind and "...", with no eye or lock.
- Effects "+" opens an icon menu (Outline, Glow, Halo); label looks open as previews (Default,
  Card, Dark, Pill, Callout), Figma's text styles.
- The folder panel lists its rows with eyes and its Selection colors; two rows selected read
  "2 layers" with Mixed; Add layer makes a draft that writes nothing until a property is set.
- Which elements on a hand-made layer: Nodes | Edges | Both, a find field, a rule select, chips
  and Done, with its count (`s3-probe-03-which-editor.png`).
- At 900 x 700, Selected and Key people with a label fit without scrolling
  (`s3-probe-09-small-selected.png`, `s3-probe-10-small-key-label.png`).

## What to take from Figma next

Four of Figma's right-sidebar rules would remove five of the findings above (3, 5, 6, 8, 9): always reserve the
24 px icon column; open every popover beside the panel at the row's height; draw a color as a
14 px chip button wherever space is short (value tables, Selection colors, Mixed); and never show
a menu of one.
