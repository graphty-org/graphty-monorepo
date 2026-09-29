# First-click test -- Morgan Reyes, screen-reader analyst

Morgan is blind and works by screen reader. For this test the moderator read out each screen the
way NVDA would reach it (headings first, then the names of the controls under each), and Morgan
named the one control they would go to first. Confidence is 1 (a guess) to 7 (certain). Answers
were given before the correct targets were revealed and were not changed afterwards.

## Answers

| Prompt | Screen | First click | Sure (1-7) | Correct? |
|---|---|---|---|---|
| Picture of the network for the paper | Les Miserables, at rest | The main menu button (top of the rail) | 3 | yes |
| Colleague wants to repeat the bridges calculation | Les Miserables, at rest | Results on the rail | 4 | yes |
| Rank the characters a second way | Les Miserables, at rest | Results on the rail | 4 | yes |
| Get back the characters a stray click cleared | Les Miserables, notice showing | Ctrl+Z | 4 | yes if Ctrl+Z restores; no in the notice-only design |
| Where Valjean's betweenness comes from | Les Miserables, Valjean selected | "betweenness 0.57, highest" under Results | 6 | yes |
| Bring in next month's transfers file | Transfers, at rest | The file button under the project name ("transfers-2026...") | 4 | yes |
| Accounts that take in far more than they send | Transfers, at rest | "Change..." after "amount not used yet" in the Loaded line | 4 | no (logged separately) |
| Cheapest route, bigger transfer costs more | Transfers, at rest | "Change..." after "amount not used yet" in the Loaded line | 5 | no (logged separately) |
| Has anything left the computer | Transfers, at rest | "Nothing has been sent from this project" | 6 | yes |
| Ribosome and Spliceosome look the same | Protein interactions, at rest | "Spliceosome" in the Module color legend | 4 | yes |
| Bring in the lab's colors-and-sizes file | Protein interactions, at rest | The add button on the Style stack heading | 3 | yes |
| How is Ribosome different from the rest | Protein interactions, at rest | The Table strip at the bottom | 4 | yes |
| Make one protein's name always show | Protein interactions, at rest | The Table strip at the bottom (find the protein's row) | 4 | yes |
| Run again with one setting changed, keep this one | Les Miserables, Betweenness run open | "Re-run" | 4 | yes |

Score: 11 of 14 with the Ctrl+Z restore design, 10 of 14 with the notice-only design. Both
misses on the transfers screen are the same control, "Change..." on the Loaded line.

## Morgan, in their own words, prompt by prompt

**Picture for the paper.** "Same answer as last time. I don't make pictures, my co-author does.
Export lives in a menu, and the first thing in the tab order is main menu. If export isn't in
there I send my co-author the file and let them do it." 3.

**Repeat the bridges run.** "Headings: Graphs, Sets and paths, Views, Overview, Style stack. No
Results heading this time. The only thing that says bridges is 'Bridges, off' in the Style stack,
and a style stack is colours -- that's not where a calculation's settings live. So the Results
button on the rail. If it opens and doesn't give me the settings, it's a rumour." 4.

**Rank a second way.** "Results again. Ranking by something else means computing something else.
I thought about the degree column header, but sorting a column isn't a second ranking, it's the
same one in a different order." 4.

**Get the selection back.** "I'm told a notice says 'Selection cleared, 18 nodes, Bring it back'.
Fine, if it was spoken I heard it once. But a notice floating over the drawing is somewhere I have
to go hunting for, and by the time I've found it it may be gone. Ctrl+Z is under my fingers. The
line above the table saying 'showing the selection just cleared' is the part I'd trust, because
it stays put." 4. (Correct only if Ctrl+Z restores the selection; wrong in the design where only
the notice can bring it back.)

**Betweenness for Valjean.** "Results, betweenness, 0.57, highest. Open that. 0.57 matches
NetworkX normalised on the undirected graph. If opening it doesn't say normalised and undirected,
I'll still check it myself." 6.

**Next month's file.** "The file button under the project name, transfers-2026 something. It's
the file, so that's where you replace the file. There's also 'Change...' on the Loaded line; that
one sounds like changing how this file was read, not swapping in a new one." 4.

**Money in versus money out.** "The Loaded line tells me 'amount not used yet'. Every question
about money needs the amount. In NetworkX that's in-degree and out-degree with weight equals
amount, and here the tool says it isn't using the amount. So I fix that first: 'Change...'. I'd
expect to be sent on to the calculation afterwards; I wouldn't know where else to start." 4.

**Cheapest route.** "Same reason, more so. Bigger transfer costs more -- that's the amount as the
edge weight, and the tool just said it isn't using the amount. 'Change...'. There might be a path
button on the toolbar, but the toolbar is icons and I'm not going to guess which icon is paths."
5.

**Has anything left the computer.** "'Nothing has been sent from this project' is the first
line under the project name. That's the one line I'd want on every tool. I'd open it to see
whether it's a promise or a link to the details. Also the rail says 'Assistant off, nothing is
sent', which is the same thing twice." 6.

**Ribosome and Spliceosome.** "Colour isn't my problem, but I know which is which by name,
because the legend lists them by name with counts. Spliceosome, 32. That's the thing to change.
Or 'Module color' in the Style stack; I'd go to the named item first." 4.

**The lab's standard colors and sizes.** "Style stack, add. A lab's file of colours and sizes is
style. There's also an unlabeled-sounding palette button beside Graph -- if its name is just
'palette' I skip it. Low confidence; I'd listen to what the add menu offers." 3.

**How Ribosome differs.** "The table. That's how I compare anything: group by module, look at
the numbers. The Table strip says 300 nodes, 1,262 edges. 'Change overview...' made me pause --
an overview of one module might be it -- but I'd start with rows I can read." 4.

**A protein's name always showing.** "Labels are for the drawing, which I never see. But I'd find
the protein in the table first, because that's how I find anything, and then look for something
about its label on the thing that opens. The legend says '7 more hidden where they overlap', which
told me there are hidden names, but not which ones until I go in." 4.

**Run again, keep this one.** "'Re-run' is right there next to 'Compare with...'. Re-run is what I
want, but I'd want to be told it makes a new run and doesn't overwrite this one -- 'keep this
one' is the whole point, and nothing on the screen says Re-run keeps it. 'Compare with...' is for
after I have two." 4.
