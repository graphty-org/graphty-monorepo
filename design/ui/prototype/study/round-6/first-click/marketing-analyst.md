# First-click test -- Jordan, marketing network analyst

Jordan is a growth-marketing analyst who does "the network stuff" one or two
days a week. She uses Gephi and NodeXL, reads labels and legends closely, skips
helper text, reaches for buttons named after a task before buttons named after
an algorithm, and avoids anything that sounds as if it overwrites her work.
Each prompt was answered from a single still screen: her one first click, and
how sure she was (1 = a guess, 7 = certain). Her answers were marked against
the intended targets afterwards and were not changed.

## Answers

| Prompt | Screen | First click | Sure (1-7) | Correct? |
|---|---|---|---|---|
| Picture of the network for a co-author's paper | Les Miserables, at rest | The camera icon beside "The whole novel" under Views | 3 | No |
| Repeat the earlier bridges calculation exactly | Les Miserables, at rest | "Bridges off" in the Style stack | 4 | No (the style layer, not the run's record) |
| Rank the characters a second way | Les Miserables, at rest | Results on the left rail | 3 | Yes |
| Get back the characters a stray click cleared | Undo notice | "Bring it back" on the dark notice | 6 | Yes under both undo designs |
| Where Valjean's betweenness comes from | Valjean selected | The "betweenness 0.57, highest" row under Results in the right panel | 5 | Yes |
| Bring in next month's transfers file so the setup carries over | Transfers, at rest | "Change..." on the Loaded line in Statistics | 4 | No (counted separately: the Loaded line) |
| Accounts taking in far more money than they send | Transfers, at rest | Quick actions on the floating toolbar | 4 | Yes |
| Cheapest route between two accounts, bigger transfer costs more | Transfers, at rest | Quick actions on the floating toolbar | 3 | Yes |
| Has anything from this project left the computer? | Transfers, at rest | The underlined line "Nothing has been sent from this project" | 6 | Yes |
| Change one of two blues (Ribosome, Spliceosome) | Protein interactions, at rest | The Spliceosome swatch in the legend | 5 | Yes |
| Bring in the lab's file of standard colors and sizes | Protein interactions, at rest | The palette icon beside "Graph" in the right panel | 4 | No |
| How the Ribosome module differs from the rest | Protein interactions, at rest | "Ribosome" in the legend | 4 | Yes |
| Make one protein's name always show | Protein interactions, at rest | The magnifier beside "Graphs" in the left panel | 4 | No (not a listed target) |
| Run again with one setting changed, keep this run to compare | Betweenness run open | "Compare with..." | 4 | No (counted separately: it compares runs that already exist) |

Score: 8 of 14 correct (the undo prompt scored correct under both undo
designs, since she clicked the notice, not Ctrl+Z).

## What she said, prompt by prompt

**Picture for the paper.** "Picture... there's no Export anywhere I can see.
Those little camera icons under Views -- a camera is a snapshot, right? I'd
click the one on 'The whole novel' since that's the whole thing. If that just
moves the view around I'd go try the hamburger at the top left. Honestly I'm
used to hitting export and getting the wrong thing anyway." Sure: 3.

**Repeat the bridges calculation.** "There's literally a row that says
Bridges, over on the right. It says 'off', so I guess it's there and I can open
it and see the settings. I didn't even notice a Results history, I'm reading
the word Bridges." Sure: 4.

**Rank a second way.** "The table is sorted by degree, and degree just tells me
who's big. I want the bridge people. There's no second score in the table, so
it has to be computed somewhere -- Results on the left, with the flask. I'm not
sure Results is where you start something rather than look at something you
already ran, though. The lightning bolt doesn't say anything, so no." Sure: 3.

**Undo the cleared selection.** "It says 'Selection cleared (18 nodes)' and
'Bring it back'. Done. I'd click that before it disappears. I probably
wouldn't think of Cmd-Z in a web tool, half of them just undo the text box."
Sure: 6.

**Valjean's betweenness.** "On the right it says betweenness 0.57, highest. I'd
click that and hope it tells me the method. If it just highlights the column I
won't be happy -- I need to say where the number came from." Sure: 5.

**Next month's file.** "Statistics says 'Loaded: transfers-2026-03.csv' and
then 'Change...'. That's where the file is, so that's where I'd swap it. The
little file chip at the top left I read as a label, not a button. I'm a bit
worried 'Change' means everything resets, but I'd try it." Sure: 4.

**Money in versus money out.** "Quick actions. It's the only thing on here
with words that sounds like 'do something for me'. I'd expect to find
something like 'in versus out' in there. Otherwise I'd want the table, which is
collapsed down at the bottom." Sure: 4.

**Cheapest route.** "Also Quick actions, I think. The squiggle icon next to
the arrow might be paths, but I don't know that. And it says 'amount not used
yet' over on the right, which bugs me -- if a bigger transfer is supposed to
cost more, it needs the amount. I'd probably end up there second." Sure: 3.

**Did anything leave the computer?** "It says it right under the name:
'Nothing has been sent from this project', and it's underlined, so I'd click
it to get the details for IT. The left bar also says 'Nothing is sent'. This is
the first tool where I didn't have to go hunting for that. Legal would still
want it in writing." Sure: 6.

**Two blues.** "Ribosome and Spliceosome, yeah, those are the same blue on a
projector. I'd click the Spliceosome square in the key and expect a color
picker. The Spliceosome one is darker so I'd change that one." Sure: 5.

**The lab's style file.** "Colors and sizes... the painter's palette icon next
to 'Graph' on the right. That's the colors icon in every app. I wouldn't think
of the plus on Style stack, that looks like adding one thing, not importing a
file." Sure: 4.

**How Ribosome differs.** "Click Ribosome in the key and see what comes up. I'd
want it to pick out all 56 of them. Whether it compares them to the rest, no
idea -- probably I'd end up in the table." Sure: 4.

**A protein with no name showing.** "I know the name, so I'd search for it.
There's a magnifier next to Graphs on the left, that's the only search I see.
I see the key says '7 more hidden where they overlap' but I read that as an
explanation, not something to click." Sure: 4.

**Run again, keep this one.** "'Re-run' sounds like it runs over the top of
this one and I lose it. You said 'compare the two', and there's a button called
'Compare with...', so I'd go there and hope it lets me set up the second run.
If it only lists runs I already have, that's annoying." Sure: 4.

## Where she went wrong, and why

- **Export has no word on the screen.** With no "Export" anywhere, she took
  the camera icon on a saved view as "take a picture". The main menu was her
  fallback, not her first idea.
- **A label that matches the task wins.** "Bridges off" in the Style stack and
  "Change..." beside the loaded file name both contain the words the prompt
  used (bridges, the file), so she clicked them over the correct but
  unlabelled or less literal targets (Results history, the file chip).
- **The file chip does not read as a button.** She saw the file name under the
  project name as a label only.
- **Re-run sounds destructive.** She avoided it because nothing says it keeps
  the current run, and went to "Compare with..." because it matched the word
  "compare".
- **The palette icon reads as "colors".** For a style file from her lab, the
  palette beside Graph was the obvious door; the Style stack's plus read as
  adding a single layer.
- **"7 more hidden" reads as a note, not a list.** She looked for search
  instead; the only search she found was beside Graphs.
- **What worked:** the "Nothing has been sent" line (she volunteered that it
  answered her usual first worry), the "Bring it back" notice, the betweenness
  row on the selected node, legend swatches, and "Quick actions" as the one
  labelled task button.

## Off-topic

"This is the part where I say our Brandwatch contract renews next month and
nobody's going to let me add another tool unless I can show the VP one slide
that it did something Brandwatch can't. And Brandwatch still doesn't have
Instagram half the time."
