# Session: show every character's name -- screen-reader analyst (Morgan Reyes)

Task as given by the moderator: "You have never used this program before. You will practice on the
ready-made network of characters from the novel Les Miserables that comes with the program, not on
your own data. Right now only a few characters have their names written on the drawing. Get every
character's name written next to its dot."

Start screen: shots/tasks/r8-t10/01.png. Renders: tmp/round-8-sessions/r8-t10--screen-reader-analyst/.
All commands were run from design/ui/prototype. `$S` below is
`tmp/round-8-sessions/r8-t10--screen-reader-analyst` (absolute path passed in the real runs).

## Outcome

- Succeeded: yes, but I only know that because I asked the moderator. Nothing the app told me in
  text confirmed it.
- Single Ease Question: 3 of 7.
- Would I use this instead of my current tool: no, not for this. In NetworkX labels are a keyword
  argument, and I never need to "see" them anyway. The reason I would ever want them drawn is to
  hand a picture to a sighted colleague, and for that I need the tool to tell me in words that the
  picture now has 77 names on it. It did not.

## Think-aloud, step by step

### 1. Start screen (01.png)

"Page has a heading 'Start', 'Recent projects', 'Samples'. Good, headings. There is a dialog at the
bottom about usage data -- 'Your data is yours, but please help us.' Fine, I say no. 'Files are
read on this computer and never uploaded' -- that is the first thing I wanted to hear, and it is
there before I asked. Under Samples: 'Les Miserables, 77 characters'. That is the one."

```
timeout 120 node app-b/study.mjs --try $S/02.png task:r8-t10 --click "No thanks" --click "Les Miserables"
```

### 2. The graph is open (02.png)

"Lots of rows in a list on the left. Selection, Notes 4 items, 'Labels show...' -- cut off --
'1 node'. PageRank, Louvain, Shortest paths, and so on, Everything at the bottom. The truncated row
is the only one with the word 'label' in it, and it says one node. Only a few names are drawn, the
moderator said. Close enough. I'll open that."

```
timeout 120 node app-b/study.mjs --try $S/03.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Labels show"
```

### 3. The labels row is a dead end (03.png)

"It tells me: 'Labels shown anyway (this file): Valjean. Opens in the inspector (not available
yet).' So that row is the one name that is forced on. 'Not available yet.' Enthusiastic. That is
dead end number one. Also, the moderator said a few names are drawn, and this says one node. So
the other names come from somewhere else and this row does not explain where."

"The right-hand side was talking about PageRank with sections Fill, Shape, Effects, Label,
Tooltip. Label is there but it belongs to PageRank, and I do not want my names tied to a measure.
There is a row called 'Everything' at the bottom of the list. That sounds like the whole graph."

```
timeout 120 node app-b/study.mjs --try $S/04.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything"
```

### 4. Everything (04.png)

"'Everything. Built-in row. Paints 77 nodes, 254 edges. Covered by PageRank for Color on 77 of 77
nodes.' Good -- that is the count I wanted, said in words. Fill, Shape with 'Faceted sphere', Size
1, then Effects, Label, Tooltip. Label is what I want."

```
timeout 120 node app-b/study.mjs --try $S/05.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Label"
```

"Nothing. 'Label' is just a heading, not a control. Silence. That is my second dead end in a row,
which is normally where I go look for an export. I'll give it one Tab first: the next thing after
Label should be its button."

```
timeout 120 node app-b/study.mjs --try $S/06.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Add label"
timeout 120 node app-b/study.mjs --try $S/07.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --hover "Add Label"
timeout 120 node app-b/study.mjs --try $S/08.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Add"
```

"Tabbing through: 'Add to Effects, button', 'Add to Label, button', 'Add to Tooltip, button'. At
least the plus buttons have names. 'Add to Label' is a strange phrase -- I am not adding to a label,
I am adding a label -- but it is a real button, and I can use a real button."

```
timeout 120 node app-b/study.mjs --try $S/09.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Add to Label"
```

### 5. The Label menu (09.png)

"A menu with two items: 'Label line' and 'Show labels'. 'Show labels' says exactly what the
moderator asked. Taking it."

```
timeout 120 node app-b/study.mjs --try $S/10.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Add to Label" --click "Show labels"
timeout 120 node app-b/study.mjs --try $S/11.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Add to Label" --click "Show labels" --click "Show labels"
```

"It added a row: 'Show labels, checkbox, not checked.' So the menu item did not show labels, it
added a switch for showing labels. I check it. 'Checked.' And then -- nothing is said. No count, no
'77 labels shown'. Next to it there is an icon with no name I can find (I tried 'column', 'Bind',
'Data' -- 'Data' only got me the Data tab and the Data button, and the icon's tooltip is empty) and
a 'Remove Show labels' button."

```
timeout 120 node app-b/study.mjs --try $S/12.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Add to Label" --click "Show labels" --click "Show labels" --hover "Show labels from"
timeout 120 node app-b/study.mjs --try $S/13.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Add to Label" --click "Show labels" --click "Show labels" --hover "Remove"
timeout 120 node app-b/study.mjs --try $S/14-column.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Add to Label" --click "Show labels" --click "Show labels" --hover "column"
timeout 120 node app-b/study.mjs --try $S/14-Bind.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Add to Label" --click "Show labels" --click "Show labels" --hover "Bind"
timeout 120 node app-b/study.mjs --try $S/14-Data.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Add to Label" --click "Show labels" --click "Show labels" --hover "Data"
```

"So: the box is checked. Did it do anything? The labels row in the list still says '1 node'. A
checkbox called 'Show labels' that is checked, with nothing that says what text it shows, makes me
suspicious. Show which label? There was a column called 'label' in this data and the tool has not
said it is using it. I don't trust a checkbox that has no value attached."

(Moderator note from the render, not something Morgan could know: in 11.png the drawing is
unchanged -- the same handful of names as before. Checking "Show labels" alone did not draw the
names.)

### 6. Back to 'Label line' (15.png, 16.png)

"The other menu item was 'Label line'. A line of text. That might be where I say what the text is.
Try it on a fresh start."

```
timeout 120 node app-b/study.mjs --try $S/15.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Add to Label" --click "Label line"
```

"New row: 'Above', with a field 'Pick an attribute', and a list opens: 'Typed text', then 'nodes',
'In use (2)': 'label -- Name, Label', 'group -- Color (group)'; 'Other attributes': betweenness,
degree; 'Results': Louvain, PageRank; 'Notes': Latest note, Note count. That is a real list with
group headings. 'label', used for 'Name, Label'. That is the characters' names."

```
timeout 120 node app-b/study.mjs --try $S/16.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Add to Label" --click "Label line" --click "label"
```

"'Above: label.' Fine. Again nothing is said about the result. The row in the list still says
'Labels show... 1 node' -- which I now understand is a different thing, the names forced on, but I
had to work that out. I have used my one question for this task: is every name written now?"

Moderator (from 16.png): "Yes -- every dot has its name above it now."

"Then I succeeded, and I would not have known it without asking. That is the pattern I am tired
of."

## What got in the way, in Morgan's words

1. "The only row in the list with 'label' in its name is about one forced name, and opening it
   says 'not available yet'. First thing I tried, dead end."
2. "'Label' in the inspector is a heading that does nothing; the button is 'Add to Label', which
   is an odd name for adding a label."
3. "There are two ways in the Label menu, 'Show labels' and 'Label line'. 'Show labels' is the one
   whose name matches what I wanted, and it gave me a checkbox that -- I am told -- did not draw any
   names. I cannot tell those two apart by their names, and I picked the wrong one."
4. "When it worked, nothing told me. No '77 names shown'. I need that sentence somewhere I can go
   back and read, not a picture."
5. "An icon next to the checkbox has no name at all."

## What worked

- "Files are read on this computer and never uploaded" on the very first screen.
- "Paints 77 nodes, 254 edges" on the Everything row: the size, in words, without running anything.
- The attribute picker is a grouped list with names and with what each attribute is already used
  for ('Name, Label'). That told me which column held the names.
