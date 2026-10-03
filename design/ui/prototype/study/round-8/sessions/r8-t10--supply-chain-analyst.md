# Session: show every character's name (supply chain analyst)

Participant: Dana Okafor, supply chain risk analyst (simulated persona, study/personas/supply-chain-analyst.md).

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Right now only a few characters have their names written on the drawing. Get every
character's name written next to its dot."

Start screen: shots/tasks/r8-t10/01.png. Renders: tmp/round-8-sessions/r8-t10--supply-chain-analyst/.
All commands were run from design/ui/prototype; the prefix
`timeout 120 node app-b/study.mjs --try <render> task:r8-t10` is shortened to `try NN`.

## Transcript

**Start screen.** "A home page. Samples on the right, Les Miserables, 77 characters. A banner at
the bottom about usage data -- no thanks. 'Files are read on this computer and never uploaded' --
fine, that's the first thing IT would ask, but it's a novel, so I don't care today."

1. `try 01 --click "No thanks" --click "Les Miserables"`
   "OK, it opened. Lots going on. A list on the left: Selection, Notes, 'Labels show... 1 node',
   PageRank, Louvain, Shortest paths, Density, Link prediction... I don't know what PageRank or
   Louvain are and I'm not going to click them. About fifteen dots have names. 'Labels' is the
   only word that sounds like names. It says 1 node, which doesn't match what I see, but let's go."

2. `try 02 ... --click "Labels show"`
   "A black bar at the bottom: 'Labels shown anyway (this file): Valjean. Opens in the inspector
   (not available yet).' So that row is only Valjean, and it doesn't open. Not available yet --
   then why show it to me? Dead end. The right panel still says PageRank."

3. `try 03 ... --click "Label"` (the 'Label +' line in the right-hand panel)
   "There's a 'Label' with a plus on the right. Clicked. Nothing happened. And this panel is
   about PageRank anyway, which I never chose."

4. `try 04 ... --click "Everything"`
   "Bottom of the list says 'Everything'. Right panel now: 'Everything, built-in row. Paints 77
   nodes, 254 edges.' 77 -- that's all the characters. This is the right place, I think. Fill,
   Shape, Effects, Label, Tooltip."

5. `try 05 ... --click "Everything" --click "Label"`
   "Click Label. Nothing. The plus doesn't open anything."

6. `try 06 ... --hover "Add label"` -> "nothing on screen is called 'Add label'"
7. `try 07 ... --click "+"` -> "nothing on screen is called '+'"
8. `try 08 ... --hover "Label"` -> no tooltip
   "I can't even find out what that plus is called. No tooltip."

9. `try 09 ... --click "Everything" --click "Effects"`
   "Do any of these open? Effects -- no. So these plus rows are all dead for me. In Excel the
   plus would at least expand."

10. `try 10 ... --hover "More"` / `"More actions"` -> tooltip "More actions Shift+F10";
    `try 10 ... --click "Everything" --click "More actions"`
    "Three dots on the Everything panel. Rename, Select members, Analyze, Compare, Create set,
    Lock, Add note, Delete... Nothing about names or labels."

11. `try 11 ... --click "List options"`
    "Dots above the list: New folder, Show rows removed, Collapse all. No."

12. `try 12 ... --click "Menu"` (opened "Main menu")
    "Main menu, top left. New project, Save, Export, Select where, Settings, Help. No View menu,
    nothing about labels. But the right side switched to 'Co-appearances' with tabs Style,
    Layout, Data -- the whole drawing. Maybe its Style tab has names."

13. `try 13 ... --click "Main menu" --key Escape --click "Style"`
    "Closed the menu, clicked Style -- and it jumped back to PageRank. The whole-drawing panel
    only shows while the menu is open?"

14. `try 14 ... --click "Co-appearances" --click "Style"` -> could not click Style (a dropdown
    covered it: 'Co-appearances 77 nodes, Compare graphs..., New graph from...')
15. `try 15 ... --click "Co-appearances" --key Escape --click "Style"`
    "Escape, Style -- PageRank again. Every time I close something it goes back to PageRank.
    That's really annoying."

16. `try 16 ... --click "Main menu" --click "Settings..."`
    "Settings: my name, theme, number format, privacy, performance, headset. Headset? Not
    labels."

17. `try 17 ... --hover "Show labels"` / `"Names"` -> nothing on screen is called that;
    `--hover "Labels"` -> tooltip "Labels shown anyway (this file) Double-click to rename"
    "Nothing is called 'show labels' or 'names'. The only 'labels' thing is the Valjean row that
    isn't available. I give up. I'd ask whoever set this up."

## Outcome

- Succeeded? No. "I never got the names on. The one row with 'labels' in it was only Valjean
  and said 'not available yet'; the 'Label' plus on the right did nothing when I clicked it."
- Single Ease Question: 2 of 7. "Showing names is the most basic thing. In Power BI it's a
  data-labels toggle. Here I had to guess between 'Everything', 'PageRank' and a plus that
  doesn't open."
- Would she use it instead of her current tool? No. "If I can't turn names on in five minutes,
  I'm not putting my supplier list in it. And the panel kept flipping back to something called
  PageRank I never picked -- I don't trust a screen that changes what I'm editing. Good that the
  data stays on my computer; that's the only thing I'd tell IT."

## What tripped her (observed)

- The only row named for labels covers one node, and clicking it says it opens "in the inspector
  (not available yet)" -- a dead end exactly where she looked first.
- The "Label +" line in the right panel, for "Everything" and for PageRank alike, did nothing
  when clicked, and the plus has no tooltip or name she could find.
- On a fresh open the right panel shows PageRank, which she never chose; closing any menu or
  dropdown returned it to PageRank, so the whole-graph Style tab was never reachable for her.
- No word on screen matched her vocabulary: "names", "show labels", "data labels".
- Jargon in the list (PageRank, Louvain, Link prediction) she refused to click.
