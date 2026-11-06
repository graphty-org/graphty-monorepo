Grade: S
False done: 0
Wrong turns: 0
Overwhelm: 2 -- the new step row after Condition... -- "a new empty "Value..." row with the list of columns open again ... The buttons beside it said "Condition..." and "Or...", but nothing on the new row said "and""

# r1-s21 grade (task T72A, persona Ruth, participant model opus)

Build 1e123d7d33 (tier5-r1d1-1e123d7d33), 1440 x 900, pointer. Steps: 21 against the answer
key's 15 (+6; 22 if the table scroll is counted). Tool refusal: none. Leaks: none (`leaks.json`
read two transcripts, 43 calls, no leak). The transcripts record the participant model as
claude-opus-5-5.

## End state against the success definition

The last screenshot (18.png) and the end-state records match T72 A's success, on the answer key's
"also success" route (a second step with on_record No instead of the Except switch):

- Layer "Orgs off record" in the Style layers list with count 7; the property pane reads "Which
  nodes 7 of 24", outline "kind agency, company / on_record No"; Fill color FF8000 (orange).
- `styles.json`: the layer's rule keeps `data.kind` in company, agency, then keeps
  `data.on_record` exactly "false"; `set: { node.color: "#FF8000" }`, matched 7, painted 7,
  visible 7 of 24.
- `key.json`: "Color: Orgs off record, 7 of 24 nodes"; 7 nodes drawn #ff8000, the other 17 keep
  the default #6366f1.
- Named in the transcript: Harlan Development, Northgate Capital, Bayview Holdings, Port Authority,
  Zoning Board, Silverline Media, Riverside Partners -- the key's seven. Reported count 7.

Route: the key's path with a second step (on_record, Value..., No) in place of Value..., Yes and
the Except switch, plus extra steps: opening the node table, maximizing and scrolling it to count
by hand before starting (steps 2-4), closing it and returning to Graph (step 5), renaming the
layer (step 8), and clicking into the color box before typing (step 17).

Wrong turns 0: the table was used for the participant's own count and to check the result, not
abandoned; no menu was closed empty, no step undone or removed.

False done 0: the claim of done at step 18 matches the screen and the records.

Follow-up: answered in the transcript (rating 2; least sure at step 11, right after Condition...,
where the new empty row gave no sign whether it narrows or widens).

## Problems

1. **A new step's row does not say it narrows** (severity 2, behavior). Step 11 (11.png): after
   Condition... the outline shows "kind agency, company" above an empty "Value..." row; nothing on
   the row or the header says the new step keeps only what both match. The participant "picked
   on_record and No on faith" and relaxed only when the header fell from 10 of 24 to 7 of 24 (step
   14, 14.png). It is part of the selection editor and the moment she named as least sure.
2. **The color box offers no color names or swatches at sight** (severity 1, behavior). Steps
   16-17 (16.png, 17.png): the new Fill line is an empty hex box; the participant thought she had
   to know a hex code, though the box also takes a color name. Not part of the selection editor;
   backlog.
3. **Orange nodes carry no names** (severity 0, opinion). 18.png: the participant noted the
   graphic would need labels; the task did not ask for them.
