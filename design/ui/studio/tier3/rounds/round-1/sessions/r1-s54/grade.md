Grade: S
False done: no
Wrong turns: 1
Merged: no

# Grade: r1-s54 (task T51 B, persona Grace)

Participant model: claude-opus-5-5 (the participant log records Opus in all 42 model entries;
nothing in the transcript says Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
Leaks: none. `leaks.json` read the participant's log (17 tool calls) and lists no file opened
outside its own folder. No downloads or saved files.

## Against the success definition

T51 B asks the reader to open sources.graphml, draw people, companies and agencies each in their
own color, and say which color is the companies. Success: three distinct colors on `kind`, every
node of a value in its value's color, the companies' color read from the key or the panel, the
ties and every other look unchanged.

- The binding: `styles.json` shows the Everything layer with `encode.node.color` reading
  `data.kind`, palette okabe-ito, ordinal, painting all 24 nodes (`noValue` 0). One color per
  value, on Everything: a stack that counts as S.
- The drawing: `key.json` draws 14 nodes `#e69f00` (orange), 6 `#56b4e9` (sky blue), 4 `#009e73`
  (green), which is `kind`'s person 14, company 6, agency 4. Three distinct colors.
- The answer: "the companies are light blue". The key over the drawing reads "Color: kind" with
  company in sky blue (`#56b4e9`), and the answer key accepts light blue. It was read from the key
  at the step it was said (step 8, `08.png`, transcript: "a key appeared top-left: ... company
  light blue").
- Nothing else changed: the 59 ties stay `#a9a9a9`; `styles.json` `changes.changed` is empty.
  The "gone" and "added" lists are the start page's demo replaced by the file's starting layers,
  not the participant's doing. Size 1 and Icosphere on Everything are the starting values.
- Final screen (`08.png`): three colors on the drawing, the key "Color: kind" with person,
  company and agency, and the Color line reading "kind" with three squares. The participant's
  closing claim matches the screen and the style tree.

The participant's rough count ("about 7 light blue, 5 green") is off by one each (6 and 4); no
count was asked, so it changes no grade.

## Steps

7 steps against the key's 5. 1. "Open a file" with sources.graphml. 2. Load. 3. The inspector's
Style tab (wrong turn: it holds the canvas background, lighting and labels, nothing about node
colors, `04.png`). 4. Everything. 5. Hover over the link icon beside Color (tooltip "Node color by
attribute"). 6. The link icon. 7. `kind` (three colors, the key opens).

The hover in step 5 is a look before a click, not a wrong turn: the icon has no visible words and
the tooltip was the only way to learn what it does.

## Problems

1. Severity 2, behavior. With the graph open, the inspector's Style tab is a natural first place to
   look for node color, and it shows only canvas settings (Background, Lighting, Outline width,
   Labels) with no pointer to where node color lives (step 3, `04.png`). The participant then had
   to guess that "Everything 24" in the layer list meant "all my dots".
2. Severity 2, wording. The way to color by a column is a bare link icon beside the Color field,
   found only by hovering for its tooltip (steps 5 and 6, `06.png`, `07.png`). The answer key
   records the icon and tooltip; a reader who does not hover has no visible cue.
3. Severity 1, behavior. The key over the drawing covers the top-left node (in `04.png` a node sits
   at about 537,160; in `08.png` that spot is under the key), so the screen shows 13 orange where 14
   are drawn. The answer key records this; here it did not change the answer.
4. Severity 1, wording. "Everything" with no hint that it is the layer for every node's own look,
   until the layer is opened and its note ("Everything styles all 24 nodes: it is the base layer")
   appears (step 4, `05.png`).

No build defect beyond what the answer key already records was seen on this route, so no repro
was made.

## What worked

- The preview after choosing the file named the `kind` column with its three values before Load,
  so the participant knew which column to use from the start (step 1, `02.png`).
- The column list under the link icon read "kind -- 3 values", and one click colored the drawing
  and opened a key with plain value names (steps 6 and 7, `07.png`, `08.png`).
- The key gave the answer directly; the participant read the companies' color from it, not from
  the drawing.
