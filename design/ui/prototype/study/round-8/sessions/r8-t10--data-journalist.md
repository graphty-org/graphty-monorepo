# Session: label every character (Les Miserables) -- the reporter (Ruth)

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Right now only a few characters have their names written on the drawing. Get every
character's name written next to its dot."

Start screen: shots/tasks/r8-t10/01.png (the start page, with samples on the right and a usage-data
banner at the bottom).

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t10--data-journalist/. In the commands, P stands for that folder's full path.

## Steps, thinking aloud

1. `timeout 120 node app-b/study.mjs --try P/01.png task:r8-t10 --click "No thanks" --click "Les Miserables"`
   "A banner wants my usage data. No thanks: nothing leaves my laptop. Then the Les Miserables
   sample." The graph opens. About thirteen names show (Valjean, Javert, Cosette, Fantine, Myriel,
   Marius, Gavroche...), and the rest are bare dots. There's a long list on the left with rows
   called Selection, Notes, 'Labels show... 1 node', PageRank, Louvain, Shortest paths and more.
   The right panel shows PageRank. "Lots going on. 'Labels' is the word I want."

2. `... --click "Labels show"` (02.png)
   A message at the bottom says: "Labels shown anyway (this file): Valjean. Opens in the inspector
   (not available yet)". "So that row is only Valjean, and I can't open it anyway. And '1 node'
   doesn't match the dozen names I can see. Dead end."

3. `... --click "Label"` (03.png), with PageRank still showing on the right.
   "There's a Label row on the right with a plus." Nothing happens. "Also, that panel is about
   'PageRank', which I don't need. Why would names go under a ranking?"

4. `... --click "Add label"` (04.png): "nothing on screen is called 'Add label'".
   `... --hover "Label"` (05.png): no hint appears.
   "The plus gives me no hint."

5. `... --click "Everything"` (06.png)
   "Near the bottom there's a row called 'Everything'. That sounds like all the dots." The right
   panel now says "Everything, Built-in row, Paints 77 nodes, 254 edges", with Fill and Shape
   settings and Effects / Label / Tooltip rows, each with a plus. "77 characters. This is the
   one."

6. `... --click "Everything" --click "Label"` (07.png): nothing happens again. "Clicking the word
   does nothing. Only the plus does."

7. `... --click "Everything" --hover "Add"` (08.png): the tooltip on the first plus says "Add to
   Effects". "Ah, so the one by Label must be 'Add to Label'."

8. `... --click "Everything" --click "Add to Label"` (09.png)
   A small menu: "Label line" and "Show labels". "I don't know what a 'label line' is. 'Show
   labels' is the one I want."

9. `... --click "Add to Label" --click "Show labels"` (10.png)
   A new line appears, "Show labels", with an EMPTY checkbox and a cylinder icon. The drawing does
   not change. "I asked it to show labels, and it gave me a box to tick instead. Two steps for one
   thing."

10. `... --click "Show labels" --click "Show labels"` (11.png)
    The box is now ticked. The drawing looks exactly as before: the same dozen names, and the rest
    are still bare dots. "Did it work? I can't tell. If every name were on, this would be a mess
    of text. It isn't."

11. `... --hover "Show labels"` (12.png): no hint on the row or the cylinder.
    `... --click "Labels show"` (13.png): the left row still says '1 node' and repeats the
    Valjean message. "Nothing on the left changed either."

12. `... --hover "Labels"` (14.png): the tooltip says "Labels shown anyway (this file)
    Double-click to rename". `... --hover "Names"` (15.png): nothing is called that.
    "No labels switch anywhere else. I'm stopping."

## Outcome

- Did I succeed? I don't know. I ticked "Show labels" on the row that says it paints all 77
  characters, so I think that's the right switch. But the picture never changed, so I can't show
  my editor that it worked. I'd call it a failure until I see the names.
- Single Ease Question: 2 out of 7.
- Would I use this instead of my current tool? Not yet. I'd expect "show names" to be one switch
  that changes the picture right away, and to be where I'm looking, which is on the drawing or by
  the word Labels. Here it took finding a row called "Everything" (which never mentions names),
  finding that only the plus works and not the word next to it, choosing from a menu, and ticking
  a second box. And then nothing visibly happened. The row called "Labels" turned out to be about
  one character, Valjean, even though about a dozen names were on screen, so its count doesn't
  match what I see. That's the kind of thing I can't explain to an editor.

## What tripped me up, in my words

- The left-hand "Labels" row is the obvious place to start. It talks about "1 node" and Valjean,
  and says it's "not available yet".
- Clicking "Label" in the right panel does nothing. Only the small plus does, and it has no name
  until you hover over the neighboring plus.
- Adding "Show labels" gives you an unticked box, so the action takes two steps.
- After ticking it, there's no change on the drawing and no message that says "77 names shown".
- "Label line" in the menu means nothing to me.
- The "Everything" row doesn't sound like where names would be set.
