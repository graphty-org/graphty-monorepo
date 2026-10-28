Grade: S
False done: no
Wrong turns: 1
Merged: no

# Grade: r1-s56 (task T51 B, persona Alex)

Participant model: claude-opus-5-5 (the participant log records Opus in all 41 model entries;
nothing in the transcript says Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
Leaks: none. `leaks.json` read the participant's log (17 tool calls) and lists no file opened
outside its own folder. No downloads or saved files.
Merge: the file replaced the start page's demo (`work.json` end sources: sources.graphml only), so
every count below is the file's own.

## Against the success definition

T51 B asks the reader to open sources.graphml, draw people, companies and agencies each in their
own color, and say which color is the companies. Success: three distinct colors on `kind`, every
node of a value in its value's color, the companies' color read from the key or the panel, the
ties and every other look unchanged.

- The binding: `styles.json` shows the Everything node layer with `encode.node.color` reading
  `data.kind`, palette okabe-ito, ordinal, painting all 24 nodes (`noValue` 0). One color per
  value, on Everything: a stack that counts as S.
- The drawing: `key.json` draws 14 nodes `#e69f00` (orange), 6 `#56b4e9` (sky blue), 4 `#009e73`
  (green), which is `kind`'s person 14, company 6, agency 4. Three distinct colors.
- The answer: "the companies are the LIGHT BLUE nodes ... per the legend 'Color: kind'". The key
  over the drawing reads "Color: kind" with company in sky blue (`#56b4e9`), and the answer key
  accepts light blue. It was read from the key at the step it was said (step 8, `08.png`).
- Nothing else changed: the 59 ties stay `#a9a9a9`; `styles.json` `changes.changed` is empty.
  The "gone" and "added" lists are the start page's demo replaced by the file's starting layers,
  not the participant's doing. Size 1 and Icosphere on Everything are the starting values.
- Final screen (`08.png`): three colors on the drawing, the key "Color: kind" with person,
  company and agency, and the Color line reading "kind" with three squares. The participant's
  closing claim matches the screen and the style tree.

The participant called agency "teal green"; the answer key accepts green or teal, and no agency
color was asked.

## Steps

7 steps against the key's 5. 1. "Open a file" with sources.graphml. 2. Load. 3. The inspector's
Style tab (wrong turn: it holds the canvas background, lighting and labels, nothing about node
color, `04.png`). 4. Everything. 5. Hover over the link icon beside Color (tooltip "Node color by
attribute", `06.png`). 6. The link icon (`07.png`). 7. `kind` (three colors, the key opens,
`08.png`).

The hover in step 5 is a look before a click, not a wrong turn: the icon has no visible words and
the tooltip was the only way to learn what it does.

Priming: Alex knows Gephi and the briefing names Gephi; his guess that the link icon meant "drive
it from a column" came from Gephi's partition coloring, so the icon's discoverability here does
not stand in for a newcomer's.

## Problems

1. Severity 2, behavior. With the graph open, the inspector's Style tab is a natural first place to
   look for node color, and it shows only canvas settings (background, lighting, labels) with no
   pointer to where node color lives (step 3, `04.png`). The participant chose "Everything 24"
   only because 24 matched the node count. The same detour was taken on the other T51 B session
   (r1-s54), so this is now seen twice on one half.
2. Severity 2, wording. The way to color by a column is a bare link icon beside the Color field,
   found only by hovering for its tooltip (steps 5 and 6, `06.png`, `07.png`). The participant
   compared it with Gephi's named "Partition" tab. The answer key records the icon and tooltip.
3. Severity 1, wording. "Style layers" read as developer language to the participant, and
   "Everything" gives no hint that it is the layer for every node's own look until it is opened
   and its note ("Everything styles all 24 nodes: it is the base layer") appears (step 4,
   `05.png`).
4. Severity 1, behavior. The key over the drawing sits at the top left of the canvas and can cover
   a node there, so a count of colors on screen can miss one; the answer key records this. Here it
   did not change the answer.

No build defect beyond what the answer key already records was seen on this route, so no repro
was made.

## What worked

- "It never leaves your computer." under "Open a file" and "Local only" in the header answered the
  participant's data question before he asked it (step 1, `01.png`).
- The import preview showed "24 nodes, 59 edges" and the `kind` column with its values before Load
  (step 2, `02.png`).
- The column list under the link icon read "kind -- 3 values", and one click colored the drawing
  and opened a titled key; the participant read the companies' color from it, not from the
  drawing, and judged the palette easy to tell apart.
