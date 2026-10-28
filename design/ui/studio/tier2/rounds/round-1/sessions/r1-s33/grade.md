# Grade: session r1-s33 -- Grace, back with two office spreadsheets, joins staff and emails into one network (people.csv + messages.csv)

**Grade: S** (success). Both files were loaded as one drawn network, 12 people and 22 links, and
Grace named the one row that did not fit: line 24 of messages.csv, from p11 to p13, 6 emails,
left out because p13 is not on the staff list. That is the answer key's success definition for
half A ("either choice is correct if the participant says which row did not fit"). She followed
the success path step for step with no wrong turn.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes,
started empty. This is the frozen build named in the criteria. Every step ran and every screenshot
matches its command. The session is not void.

## What the last screens show

- `11.png` (last): the Data page. Header and title "people and messages". Sources: "people.csv and
  messages.csv / 12 nodes, 22 edges", with people.csv, messages.csv and "1 row left out" (warning
  triangle) under it. Attributes: Nodes id, name, team; Edges emails. The drawing has 12 nodes
  with arrows. The inspector shows node p12: name Lars Nilsen, team Director, Degree 6.
- `10.png`: the "1 row left out" inspector, subtitle "Left out of people.csv and messages.csv",
  "Left out" first: "1 edge row was left out: it names a node missing from the node rows." and
  "Line 24: p13 has no node row; from p11, to p13, emails 6", then "Added" Nodes 12, Edges 22.
  This matches the answer key's `rounds/r1d4/pilot/T4A/11.png`.
- `07.png`: before Load, "12 node rows and 23 edge rows read; the load makes 12 nodes and 22
  edges.", "1 edge row names a node missing from the node rows.", Add / Leave out, the unmatched
  row at line 24, and the Tables list's "Edges: messages.csv / 23 rows, 1 left out".

## Measures

- **Steps:** 10 after the start (`02.png` to `11.png`). The success path is 9 (No thanks, New from
  data, choose a file, Add a table, File, Show the unmatched row, Load, Data, the left-out row);
  the tenth, a click on the busiest node to check names arrived, is a check, not a detour.
- **Wrong turns: 0.** Her history names "Open project or file..." as how she opened a single list
  before; she weighed it at step 2 and chose "New from data..." instead, so the habit was not
  followed and is not scored as a broken habit.
- **First move:** "New from data..." (after dismissing the usage-data box).
- **Recovery:** not applicable.

## Claims

- "12 people ... 22 links, 23 rows minus the p13 one I left out" (`08.png`, `09.png`): true on
  screen.
- "Line 24: p13 has no node row; from p11, to p13, emails 6" (`10.png`): true.
- "Everything I had in Excel is here" -- id, name, team, emails (`09.png`): true; the Attributes
  list shows all four columns.
- "Arrows, so it's treating emails as going one way, which is right": true; the load used "As
  the file says" and the Overview's answer-key value is Directed.
- **False "done" claims: none.**

## Problems

1. **The emails count is not read as the weight, and the import page does not say how to make it
   one (severity 2).** `07.png`: the emails column is detected as a "whole number" attribute, and
   the line above the table reads "Weight: none (each edge counts 1)". Grade: "My emails column is
   obviously how strong the tie is, and I didn't see how to make it count. I'd want it to ask, or
   say how." She noticed and set it aside; it did not touch this task (which asks only that every
   person and link arrived), but a later weighted run on this graph would treat every tie as 1
   with no warning she can recall. Held at 2: no wrong result was reported in this session.
2. **The node inspector is titled with the id, not the name (severity 2).** `11.png`: heading
   "p12", with "Lars Nilsen" only as a row under Summary, though the program loaded a name column.
   Grace: "on a slide or when I'm hunting for someone, the id is useless to me."
3. **No names drawn on the dots after a load (severity 1).** `08.png` to `11.png`: 12 unlabeled
   dots; she had to click one to learn who it was. Opinion-level here: the task did not ask for
   names on the drawing.
4. **"Add" beside the unmatched row does not say what it would do (severity 1).** `07.png`: Add
   and Leave out, with no hint that Add makes p13 a node with no name. She avoided it for that
   reason. The answer key notes Leave out has a tooltip ("Skip the rows whose end names no node");
   she did not hover either button, so whether Add's tooltip would have answered her is untested
   here.
5. **The start screen does not say which entry takes more than one file (severity 1).** `01.png`:
   "Open project or file..." and "New from data..." side by side; she guessed right from the
   wording. Opinion-level: no wrong turn resulted.

## Tool and run

No tool fault. Step 5 used `--click-at 271,107` for the "+" beside Tables; the tool named it
"Add a table", the success path's control, and the menu opened as expected (`05.png`). Step 11's
`--click-at 774,436` hit node p12 as reported.
