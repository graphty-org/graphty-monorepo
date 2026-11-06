# T74 A pilot (volunteers): targeted re-pilot on build 1e123d7d33

Build: 1e123d7d33, served from the frozen copy named in `criteria.md`. Start: the volunteers setup
(the PageRank layer the earlier session made is in place). Two routes were walked, each in its own
session: the success path by pointer, and the same path by keyboard only, which is the one route the
Fill "+" change touched for this task. The detours are not re-walked in a targeted re-pilot.

## Success path by pointer

Folder: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T74A/success

Replayed the previous pass's 14 steps (+ > Layer; Which nodes; type "page"; Enter; the mode select;
By position; type 5; Enter; Done; Fill +; type FFA500, Enter; Escape; hover Undo). Every step's
screen matched.

- 10.png: "PageRank: Influence top 5", 5 of 24; the table lists James Carter, Priya Nair, Hannah
  Weiss, Seun Okoro and Ben Adler (PageRank 0.05452 to 0.05862), as the answer key says.
- 12.png: Fill's new Color line shows an empty swatch and an empty hex box, as decided ("a
  just-added color line shows no color until one is picked").
- 14.png: exactly five nodes drawn orange; the other 19 keep their PageRank colors; the legend
  reads "Color: Layer 1, 5 of 24 nodes".

The one miss on the words "By value" (the mode select is named "PageRank test") is the known one in
the answer key; it is counted, not new.

Result: reached; no mismatch with the answer key.

## Success path by keyboard (Fill +)

Folder: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T74A/touched-6

Keyboard-only, screen-reader session. Replayed the earlier keyboard route: steps 1 to 13 (to Done,
"Done, 5 of 24", focus back on "Edit Which nodes", then Tab to "Add to node fill") matched. Step 14
(Enter on Fill +, type "orange", Enter) differed as the fix intends:

- Before: the new box was named "Node color, not set, drawn #6366F1 indigo" and held 6366F1.
- Now: it is named "Node color, not set" and is empty; "Node color added: pick a value" is
  announced; after "orange" and Enter it reads "Node color, set here, orange" value FFA500 and
  announces "Node color now orange, on 5 nodes" (15.png: five orange nodes).

Then by hand: Tab goes to "Node color by attribute" (16.png); Shift+Tab back to the hex box and
Escape keep focus there and leave FFA500 in force (17.png); Escape again, then Tab, reaches "Node
color by attribute" again (18.png: still five orange). Focus never fell to the page body during
the walk (only at the start, before the first key, as the setup leaves it).

Result: reached by keyboard.

## Defects

None that crash, block the task or spoil its grading.
