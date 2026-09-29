# First-click test -- Analyst Alex

Participant: Alex, an operations data analyst who does the maths in NetworkX and the pictures in
Gephi. Each answer is the one thing he would click first, looking only at a still screen, with
how sure he is (1 = a guess, 7 = certain). His answers were written before they were checked
against the intended targets and were not changed afterwards.

| Prompt | Screen | First click | Sure (1-7) | Hit the target? |
|---|---|---|---|---|
| Picture of the network for the paper | Les Miserables, nothing selected | The three-line menu, top left | 4 | Yes |
| Repeat the earlier bridges calculation exactly | Les Miserables, nothing selected | "Bridges ... done" under Results | 5 | Yes |
| Rank the characters a second way | Les Miserables, nothing selected | The + next to Results | 4 | Yes |
| Groups 2 and 3 look alike; recolor one | Les Miserables, nothing selected | The orange swatch for group 2 in the legend | 5 | Yes |
| Get back a selection a stray click cleared | Les Miserables, nothing selected | The three-line menu, looking for Edit > Undo | 3 | Yes (by the menu; he was after Undo) |
| What is painting Valjean this color | Les Miserables, Valjean selected | "Group color" under Appearance | 5 | Yes |
| Where Valjean's betweenness comes from | Les Miserables, Valjean selected | "betweenness 0.57, highest" under Results | 5 | Yes |
| Bring in next month's transfers file | Transfers, nothing selected | The file chip "transfers-2026..." under the project name | 4 | No |
| Accounts taking in far more than they send | Transfers, nothing selected | The Table strip at the bottom | 3 | No |
| Cheapest route, big transfers cost more | Transfers, nothing selected | The route-looking icon next to the arrow on the floating toolbar | 3 | Yes |
| Has anything left the computer | Transfers, nothing selected | "Nothing has been sent from this project" under the name | 6 | Yes |
| Ribosome and Spliceosome blues look alike | Protein interactions, nothing selected | The Ribosome swatch in the legend | 5 | Yes |
| Bring in the lab's colors-and-sizes file | Protein interactions, nothing selected | The three-line menu, top left | 3 | Yes |
| How Ribosome differs from the rest | Protein interactions, nothing selected | "Ribosome" in the legend | 3 | Yes |

Score: 12 of 14 on target.

## In his words, prompt by prompt

**Picture for the paper.** "I'm looking for Export. There's no Export anywhere. The three dots
over the table are for the table, so... the hamburger, top left. That's where File lives in
everything else." Sure: 4.

**Repeat the bridges run.** "Bridges, under Results, says done. I click that and I expect to see
what it was run with. If it doesn't show me the settings I've got nothing to give my colleague."
Sure: 5.

**Rank a second way.** "I'd rather type 'betweenness' somewhere. The search icons up there are for
graphs and the table, not algorithms, I think. So the plus on Results -- a result is what I want
to add." Sure: 4.

**Groups 2 and 3.** "Group 3 isn't even in the legend, it's in '6 more'. Group 2 is right there,
orange. I click the orange square. If it's not a colour picker I'll try the Group color line on
the right." Sure: 5.

**Lost selection.** "Ctrl-Z, honestly. If I have to click, there's no undo button I can see, so
the menu, top left, hoping for Edit and Undo. I'm not confident undo covers selections -- in Gephi
it doesn't." Sure: 3. Note: he went to the menu for Undo, not for a "previous selection" command;
he did not expect one to exist.

**Why Valjean is this colour.** "He's orange, group 2 is orange. Appearance, Group color. That's
the one painting him." Sure: 5.

**Valjean's betweenness.** "Results, betweenness 0.57. Click that and it should tell me normalised
or not, weighted or not. I'd check it against NetworkX before I trust 0.57." Sure: 5.

**Next month's file.** "That little chip with the file name, transfers-2026-dot-dot-dot. That's
the file this is built on, so that's where I swap in April. If it only shows me the file name I'd
go to Data on the left next." Sure: 4.

**Takes in far more than it sends.** "That's in-money minus out-money. I want it as a table so I
can sort it. Table strip at the bottom. I don't know an algorithm called that, so I wouldn't go
looking in Results." Sure: 3.

**Cheapest route, weighted.** "The squiggly icon next to the arrow looks like a route. That's my
guess for shortest path. But the panel on the right says 'amount not used yet', which bugs me --
if the route ignores amounts it's useless for this. That Change link is my second click." Sure: 3.

**Has anything left the computer.** "Right under the name: nothing has been sent from this
project. That's what I'd show IT. I'd want it to say what 'sent' means, though." Sure: 6.

**Ribosome versus Spliceosome.** "Those two blues are the same to me anyway. Click the Ribosome
square in the legend." Sure: 5.

**The lab's colour file.** "A file coming in. Top-left menu, look for Import. I thought about the
plus on Style stack, but 'style stack' sounds like it builds a rule, not loads a file." Sure: 3.

**How Ribosome differs.** "Click Ribosome in the legend and hope it selects them and the numbers
on the right change to just that group. Or there's 'Change overview', maybe that does groups."
Sure: 3.

## Where he missed, and what he would have needed

- **Next month's file.** The file-name chip under the project name looks like the place the data
  file lives, so it is where he tried to swap it. Nothing on screen said the chip is only a label,
  or that bringing in a new file with everything carried over happens under Data or the project
  name.
- **In versus out money.** He read this as a table-sorting job, not an analysis to run, because he
  does not know a named measure for it. The Results + and the lightning button did not read to him
  as places for "compute a new number per account".

## Things he said that are not about the targets

- He never recognised the lightning button as "quick actions"; he did not mention it once.
- "Amount not used yet" in the Transfers statistics worried him on the route task: he read it as
  the tool ignoring the transfer amounts.
- On the protein screen, the two blues in the legend are indistinguishable to him before he is
  asked anything.
