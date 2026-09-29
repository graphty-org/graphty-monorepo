# First-click test -- Morgan Reyes, screen-reader analyst

Morgan is blind and works by screen reader. For this test the moderator read out each screen the
way NVDA would reach it (headings first, then the names of the controls under each), and Morgan
named the one control they would go to first. Confidence is 1 (a guess) to 7 (certain). Answers
were given before the correct targets were revealed and were not changed afterwards.

## Answers

| Prompt | Screen | First click | Sure (1-7) | Correct? |
|---|---|---|---|---|
| Picture of the network for the paper | Les Miserables, at rest | The main menu button (top of the rail) | 3 | yes |
| Colleague wants to repeat the bridges calculation | Les Miserables, at rest | "Bridges, done" under Results | 5 | yes |
| Rank the characters a second way | Les Miserables, at rest | The add button on the Results heading | 5 | yes |
| Groups 2 and 3 hard to tell apart | Les Miserables, at rest | "Group color" in the Style stack | 3 | yes |
| Get a cleared selection back | Les Miserables, at rest | Ctrl+Z (Undo) | 3 | no |
| What is painting Valjean this color | Les Miserables, Valjean selected | "Group color, color" under Appearance | 5 | yes |
| Where Valjean's betweenness comes from | Les Miserables, Valjean selected | "betweenness 0.57, highest" under Results | 6 | yes |
| Bring in next month's transfers file | Transfers, at rest | The file button under the project name ("transfers-2026...") | 3 | no |
| Accounts that take in far more than they send | Transfers, at rest | The add button on the Results heading | 4 | yes |
| Cheapest route, bigger transfer costs more | Transfers, at rest | "Change..." after "amount not used yet" in the Loaded line | 4 | no (logged separately) |
| Has anything left the computer | Transfers, at rest | "Nothing has been sent from this project" | 6 | yes |
| Ribosome and Spliceosome look the same | Protein interactions, at rest | "Spliceosome" in the Module color legend | 4 | yes |
| Bring in the lab's colors-and-sizes file | Protein interactions, at rest | The add button on the Style stack heading | 3 | no |
| How is Ribosome different from the rest | Protein interactions, at rest | The Table strip at the bottom | 4 | yes |

Score: 10 of 14 correct.

## Morgan, in their own words, prompt by prompt

**Picture for the paper.** "I don't make pictures. My co-author does. If I have to, I look for
export, and export lives in a menu. First thing in the tab order is something called main menu,
so that. If it's not there I'm asking my co-author." 3.

**Repeat the bridges run.** "There's a heading called Results and one thing under it: Bridges,
done. That's the only place the settings could be. If it opens and doesn't tell me the settings,
it's a rumour." 5.

**Rank a second way.** "Results, plus. That's add a result. I'd want betweenness next to degree,
and I'd want it to say whether it's normalised." 5.

**Groups 2 and 3.** "Colour. Not my problem, usually. But the Style stack has 'Group color', so
that's where group colours come from. There's also a legend, and it lists 2, 8, 4, 1 and then
'6 more' -- group 3 isn't even in it without opening that. So the style row." 3.

**Get the selection back.** "Ctrl+Z. Every tool on earth, Ctrl+Z. I don't hear an undo button
anywhere, so I'd press the key and hope it doesn't undo something else instead. If a selection
isn't undoable, somebody should tell me where it went." 3. (Marked wrong: the target is the main
menu, Edit, Previous selection. Morgan would not have looked in a menu for this.)

**What paints Valjean.** "Appearance heading, four rows. Size, Group color, Bridges off, Base
style. He's a colour, so Group color. Good that it says 'color' after the name -- at my speed
that's what I need, the property as a word." 5.

**Betweenness for Valjean.** "Results, betweenness, 0.57, highest. That's where I'd go and I'd
open it. 0.57 means normalised, NetworkX gives about that for Valjean. If opening it doesn't say
normalised and undirected, I'd still distrust it." 6.

**Next month's file.** "Under the project name there's a button that's the file name,
transfers-2026-something. That's the file. Click it, I'd expect replace or add. There's also a
Data tab on the rail, but a thing named after the actual file sounds more direct." 3. (Marked
wrong: the targets are Data, the project name or the main menu.)

**Take in more than they send.** "In-strength minus out-strength, weighted by amount. That's an
algorithm, so Results, plus. Though it says amount is not used yet, which worries me." 4.

**Cheapest route with amounts.** "The statistics block literally says 'direction followed, amount
not used yet. Change...'. The whole question is about using amount as the weight. So Change. I'd
fix the weights before I ask for any route, otherwise I get the wrong route and don't know it." 4.
(Logged separately, not counted correct. Morgan would argue: that line is the only place on the
screen that mentions the weight at all, and a path tool that silently uses no weight is exactly
what they distrust.)

**Anything left the computer.** "It says it right under the project name: nothing has been sent
from this project. And the Assistant says off, nothing is sent. Best thing on the screen. I'd
click the first one to see what it counts as 'sent'." 6.

**Ribosome and Spliceosome.** "Legend, Module color, Spliceosome. Or the Module color row. I'd go
to the legend because the name is right there. I can't tell the blues apart either, for what
it's worth -- I'm just reading that they're both 'blue' in whatever the tooltip says." 4.

**Lab's colors-and-sizes file.** "Colours and sizes are style. Style stack, plus -- I'd expect
add a layer, and one of the choices to be 'from file'. Data sounds like the network data, not
the look of it." 3. (Marked wrong: the targets are the main menu, Recipes, or Data. The word
"Recipes" means nothing to Morgan; they would not have guessed a style file lives there.)

**How Ribosome differs.** "The table. There's a strip at the bottom that says Table, 300 nodes,
1,262 edges. Open it, filter by module, compare. I do better with tables." 4.

## What Morgan took away

- The things that worked were the ones that say what they are in text: "Nothing has been sent
  from this project", "Results: Bridges, done", "betweenness 0.57, highest", "Group color,
  color". Those were quick and fairly sure.
- The misses were all about where a verb lives. Getting a selection back is Undo to Morgan, not
  a menu item. A file named after the data sounds like where the data comes in. A file of colours
  sounds like style, not "recipes". And a weight is set where the screen says the weight is
  unused, not in a path tool Morgan never heard mentioned.
- "The Loaded line tells me amount is not used. Then you tell me that's the wrong place to change
  it for a route. Pick one. If the path tool uses amount, say so on the path tool."
- "The legend hides group 3 behind '6 more'. If my colleague says group 3, I have to open
  something before I can even find it."
- Would they use this instead of their scripts? "For checking what a figure is coloured by, and
  for the 'nothing was sent' line, maybe. For the numbers, not until the result tells me its
  settings."
