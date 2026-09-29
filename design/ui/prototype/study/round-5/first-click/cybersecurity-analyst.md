# First-click test: Priya, threat hunter in a corporate SOC

Priya is a threat hunter at a bank. She thinks in Splunk queries and tables, leans on the keyboard,
skims headings and numbers, and will not click anything labelled Assistant or Share. Each answer
is the first thing she would click, looking only at a still screenshot, with her confidence from
1 (a guess) to 7 (certain). Her answers were written before she saw the intended targets, and
none was changed after.

## Answers

| Prompt | Screen | First click | Sure (1-7) | Matches target |
|---|---|---|---|---|
| Picture of the network for a paper | Les Miserables, nothing selected | The three-line menu button, top left | 4 | Yes |
| Repeat the bridges calculation exactly | Les Miserables, nothing selected | "Bridges  done" under Results, right panel | 5 | Yes |
| Rank the characters a second way | Les Miserables, nothing selected | The "..." at the right end of the table header | 3 | No |
| Groups 2 and 3 look alike; recolor one | Les Miserables, nothing selected | The orange swatch next to "2" in the legend | 5 | Yes |
| Get back a selection a stray click cleared | Les Miserables, nothing selected | Ctrl+Z (no click) | 3 | No |
| What is painting Valjean this color | Les Miserables, Valjean selected | "Group color" under Appearance, right panel | 5 | Yes |
| Where Valjean's betweenness comes from | Les Miserables, Valjean selected | "betweenness 0.57, highest" under Results, right panel | 4 | Yes |
| Bring in next month's transfers file | Transfers, nothing selected | The file chip "transfers-2026..." under the project name | 4 | No |
| Accounts taking in far more than they send | Transfers, nothing selected | The "Table" strip at the bottom | 3 | No |
| Cheapest route, bigger transfer costs more | Transfers, nothing selected | "Change..." after "amount not used yet" in Statistics | 4 | No (logged separately) |
| Has anything left the computer | Transfers, nothing selected | "Nothing has been sent from this project" under the name | 7 | Yes |
| Ribosome and Spliceosome blues look alike | Protein interactions, nothing selected | The Ribosome swatch in the legend | 6 | Yes |
| Bring in the lab's colors-and-sizes file | Protein interactions, nothing selected | The "+" next to Style stack | 3 | No |
| How Ribosome differs from the rest | Protein interactions, nothing selected | The "Table" strip at the bottom | 3 | Yes |

7 of 14 match the intended targets.

## In her words

**Picture for the paper.** "No Export button anywhere. It's a web app, so File lives under the
hamburger. That's where I'd go. If it's not there I'm taking a screenshot."

**Repeat bridges.** "There's a heading called Results and one thing under it, Bridges, done. That's
the run. I click it and expect to see what parameters it used. If it only shows me the answer
again, that's no good to a colleague."

**Rank a second way.** "Ranking is a sort. The table is already sorted by degree, so I want another
column to sort by. The dots on the table header is where 'add column' usually lives. I didn't read
the plus next to Results as 'run something new'; it looks like it's for adding another bridges."

**Recolor group 2 or 3.** "Legend, the swatch. Group 3 isn't even in the legend, it's in '6 more',
so I'd change 2. Annoying that the one I need is hidden."

**Stray click cleared my selection.** "Ctrl+Z. Every tool I use, that's undo. I don't see an undo
button, and I'm not going to go looking in a menu before I've tried the key. If Ctrl+Z undoes
something else, like a style change, I'd be irritated."

**What is painting Valjean.** "Right panel says Appearance with a list. Group color is the one
that's a color. It's highlighted, and so is Size and Base style, so I'd click Group color and
hope it tells me which rule matched him."

**Betweenness.** "Results, betweenness 0.57, highest. Click that. I'd want the settings and when it
ran, same as I'd want a search's time range. The column header in the table would be my second
try."

**Next month's file.** "There's a little chip with the file name, transfers-2026-something. That's
the file. I click it and expect 'replace with...'. That's the whole point for me: same queries, new
month's export. If the chip is just a label, I'd try Data next."

**Money in versus money out.** "Where's the query box? There isn't one. So I'm going to the table,
sort by incoming, sort by outgoing. Though it says 'amount not used yet', so I'm not even sure the
table has money in it, just counts. That worries me: my manager asked about money, not number of
transfers."

**Cheapest route by amount.** "It literally says 'amount not used yet. Change...'. That's the
weight. I'd set amount there first, then find the path tool. The one on the toolbar with the
squiggle might be paths, but I'd set the weight first."

**Anything left the computer.** "Top left, 'Nothing has been sent from this project', with a lock.
And the rail says 'Assistant Off. Nothing is sent.' That's the first thing I'd have asked. Good.
I'd still want to know how it knows, but it answers the question."

**Ribosome and Spliceosome.** "Legend, Ribosome swatch. Easy."

**Lab's style file.** "Colors and sizes is styling, so the plus by Style stack. I'd expect 'add
layer' and hope one of the options is 'from file'. Not confident. It might be under the hamburger
as Import."

**How Ribosome differs.** "Open the table and filter to module = Ribosome, compare the numbers
against everything else. I'm not going to read that off the picture."

## What tripped her

- **No visible undo.** She reached for Ctrl+Z out of habit. A second-level history (previous
  selection) in a menu is not somewhere she would look first.
- **"Run something new" is not where she expects it.** She read the plus beside Results as "another
  of the same" and went to the table to add a column. For her, a new ranking is a new column.
- **The file chip looks like the file.** On the transfers screen the chip under the project name
  is the most file-like object on the screen, so it is where she went to swap in next month's
  export.
- **"Amount not used yet" is loud.** It pulled both money questions toward it. On the money
  in/out question it also made her doubt whether the table even holds amounts.
- **No query box.** On two of the transfers prompts her first reaction was to look for somewhere
  to type a query, and when there wasn't one she fell back to the table.
- **The privacy line worked.** She found it with full confidence and it answered her first
  question before she had to ask it.
