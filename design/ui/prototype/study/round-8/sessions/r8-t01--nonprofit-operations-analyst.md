# Session: first sitting with the Les Miserables sample -- Grace, nonprofit operations analyst

Task as given: "You have never used this program before. A friend said it turns a list of
connections into a picture that shows who matters and how people cluster. You have no file of
your own today, so you will practice on the ready-made network of characters from the novel Les
Miserables that comes with the program. In one sitting: get that network on screen, have the
program work out something about the characters (for example who matters most, or which of them
belong together), make the drawing show that result in its colors or sizes, get the characters'
names written on the drawing, and finish with a picture file you could paste into a document. Say
out loud when you think each part is done."

Start screen: shots/tasks/r8-t01/01.png. Renders: tmp/round-8-sessions/r8-t01--nonprofit-operations-analyst/NN.png.
Every command was run from design/ui/prototype with `timeout 120 node app-b/study.mjs --try <dir>/NN.png task:r8-t01 ...`;
only the steps after `task:r8-t01` are listed below.

## Think-aloud

**01 (start screen).** "Files are read on this computer and never uploaded." Good, that is the
first thing I look for with donor names. There's a box asking to share usage data -- no thanks.
The Les Miserables sample is right there, "77 characters". Easy.

**02** `--click "No thanks" --click "Les Miserables"`
The network is on screen. 77 characters. **Part 1 done.** But it is already colored and the list
on the left is full of things: PageRank, Louvain, Shortest paths, Density, Link prediction, "Top 9
by de...", Watchlist, "For the report". I didn't do any of that. The card said it "opens with
worked examples", so I guess this is someone else's homework. I don't know what PageRank or
Louvain mean. I want to make it work something out myself. Flask icon at the bottom -- let me
rest on it.

**03** `... --hover "Analyze"` -> tooltip "Analyze Shift+A". Matches the "from Analyze" link on the right.

**04** `... --click "Analyze"`
A list. "PageRank -- Start here", but PageRank is already on the drawing. "Degree -- How many
edges each node has". That is what I'd call "most connected" and what I could explain to my
board. Picking Degree.

**05** `... --click "Degree"`
A Top 10: Valjean 36, Gavroche 22, Marius 19, Javert 17... This I understand. **Part 2 done -- it
worked out who is most connected.** But the box at the top-left of the drawing still says "Color:
PageRank", and Degree does not appear in the left list next to the others. There's a Style tab.

**06** `... --click "Style"`
"Paints 77 nodes". Size "0.5 to 3" -- so bigger dots for more connections? I look at the picture
and every dot is the same size. I want color anyway.

**07** `... --click "Fill"` -- nothing happened.
**08** `... --hover "Add fill"` -> nothing on screen is called that.
**09** `... --hover "+"` -> nothing; `--hover "Add"` -> tooltip "Add to Fill".

**10** `... --click "Add to Fill"`
Color "808080". That's a code for one gray, I think. That would make everyone the same. The
picture didn't change anyway. There's a little cylinder icon next to it.

**11** guessed names for the cylinder: "data" (hit the Data tab instead, no tooltip), "Use a
value", "From a value", "Bind" -> nothing; "Color by" -> tooltip "Color by attribute". OK, that's
the one, though "attribute" is not my word.

**12** `... --click "Color by attribute"`
A list: label, group, degree, betweenness, Louvain, PageRank, Note count. degree says it is already
used for "Size (Degree)" -- which I could not see.

**13** `... --click "degree"`
"Color by degree", Orange to brown. Then a lot I don't need: Scale, Linear, Clamp, Typed, Detach,
"Suggested layers", "Mute categories under this scale". I'll leave them. The legend still says
PageRank and the box behind still says 808080.

**14** `... --key Escape`
Closed it. Nothing changed. Color still 808080, legend still "Color: PageRank", every dot still
orange to brown, which is also what PageRank looked like, so the picture can't tell me either. Did
it save? I honestly can't tell. **Part 3: not sure.** I'll settle for the PageRank coloring that
was already there -- the Analyze list called it "which nodes are connected to other
well-connected nodes", close enough to "who matters" -- but I didn't make it.

**15** `... --click "Labels"` (the "Labels show... 1 node" row)
Message: "Labels shown anyway (this file): Valjean. Opens in the inspector (not available yet)".
Dead end.

**16** `... --click "Add to Label"` -> menu "Label line", "Show labels".
**17** `... --click "Show labels"` -> a "Show labels" checkbox, unticked.
**18** `... --click "Show labels"` (the checkbox; the tool said it matched both the checkbox and its
text, clicked the checkbox)
Ticked. Picture is the same: still only about a dozen names. Third setting in a row that changes
nothing I can see. **Part 4: not done**, though the main characters are named.

**19** `... --click "Menu"` (opened "Main menu")
New project, Open, Save, Export..., Version history. Export is where I'd expect it.

**20** `... --click "Main menu" --click "Export..."`
Image .png, a preview, and: "64 labels hidden to avoid overlap: show list." So THAT is why
ticking "Show labels" did nothing -- 64 of the 77 names were being hidden. It should have told me
on the drawing, not here at the end. "Saved to this computer only; nothing is uploaded." Good.
Preset "To share -- PNG, 2x".

**21** `... --click "Export"` (the button)
"Exported les-miserables.png to Downloads." **Part 5 done.** And now the right side shows PageRank
again and Degree is nowhere. My Degree coloring either never happened or got thrown away. The
picture I'm pasting is colored by what the sample came with, not by what I asked for.

## Outcome

- Did I succeed? Partly. Got it on screen: yes. Worked something out: yes, Degree, with a Top 10 I
  could read. Drawing shows MY result: no, as far as I can tell; it still shows PageRank, which was
  already there. Names on the drawing: only the 13 it chose; the other 64 are hidden and I only
  found out why in the Export box. Picture file: yes, easy.
- Single Ease Question: **3 of 7.** Opening the sample and exporting were easy. The middle --
  turning a result into colors and names -- was guesswork, and nothing I changed showed up.
- Would I use this instead of what I use now (Excel and slides)? Not yet. I like that it says
  nothing is uploaded, and the Top 10 list is exactly what my development director would want.
  But I couldn't make the picture change, and I couldn't tell whether I had. If I can't explain to
  my board why the dots are the colors they are, I can't put it on a slide. I'd try it once more
  with my own export, with someone showing me the coloring step.

## Problems as Grace experienced them

1. Choosing a measure (Degree) and then "Color by attribute -> degree" left the legend reading
   "Color: PageRank" and the fill box reading "808080"; no visible change, no confirmation. I
   could not tell whether the coloring happened. Degree never appeared in the left list, and after
   Export the right panel showed PageRank again. (renders 13, 14, 21)
2. The sample opens already colored by PageRank with a long list of finished analyses, so the
   drawing's colors before and after my change looked the same; I couldn't use the picture to check
   my work. (02, 14)
3. Size "0.5 to 3" by degree is listed, but all dots look the same size. (06)
4. "Show labels" ticked with no change; the reason (64 labels hidden to avoid overlap) appears only
   in the Export dialog. (18, 20)
5. "Labels shown anyway" row says "not available yet". (15)
6. Icon-only controls with no words: the + beside Fill and the cylinder ("Color by attribute");
   clicking the word "Fill" does nothing. (07-11)
7. Jargon: PageRank, Louvain, attribute, Clamp, Typed, Detach, Suggested layers, "Paints 77 nodes".
   "Degree -- how many edges each node has" was the only plain choice. (04, 13)
