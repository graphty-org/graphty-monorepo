# Session r2-s05 transcript (Dev, the student)

Step 1. Started the app.
Command: real.mjs --start <folder> setup:connected-sources-open.txt
Output: "the drawing is still moving"; 01.png

Step 2. Saw network with 14 selected. Clicked Assistant. Chat panel, "It can be wrong", chip "Selection 14" above the box.
Command: --step --click "Assistant"  -> 02.png

Step 3. Asking question 1 (AI question 1 of my 8).
Command: --step --click "Ask about this graph" --type "Which one source do most of the connections between everyone else go through?" --click "Send"
 -> 03.png: "Sending to Google", Stop button showing.

Step 4. Waiting. Command: --step --wait 10000
 -> 04.png: "4 steps", still "Sending to Google". Undo arrow became active.

Step 5. Waiting. Command: --step --wait 10000
 -> 05.png: Answer: "Among your selected sources, Victor Szabo (s10) sits on the most connections across the full network with the highest betweenness centrality. Within connections restricted solely to the selected group, Ines Moreau (s11) mediates the most paths." "Computed Bridges for 24 nodes", "Computed Bridges for 14 nodes", Open run, Undo.
 Note: wait, "among your selected"? I did not select anything. Reporter wants everyone, so the 14 may be cutting people out.

Step 6. Clear the selection chip. Command: --step --click-at 159,800
 -> 06.png: chip now "Whole graph 24 / 59" with "Use selection". Canvas rings unchanged.

Step 7. AI question 2, whole graph, both facts.
Command: --step --click "Ask about this graph" --type "Looking at the whole graph, everyone: which one source do most of the connections between everyone else go through? And how many of the sources who are on the record gave donations?" --click "Send" --wait 10000
 -> 07.png: "3 steps", "Sending to Google". The chip went back to "Selection 14" after sending. Confusing: did my message go as whole graph or not?

Step 8. Waiting. Command: --step --wait 10000
 -> 08.png: Answer 2: "Across the entire graph, s20 has the highest betweenness centrality, lying on the most shortest paths between other nodes. Of the 12 sources who are on the record, 7 gave donations." Chip "7", "Show in table". Bottom still "Selection 14".
 Note: s20 is a code not a name. So Victor Szabo was only the answer for the 14.

Step 9. Check the 7 without spending AI. Command: --step --click "Show in table"
 -> 09.png: Table opened, 7 rows green, selection now 7 (on_record Yes (7), donations 300 to 18,000). Rows s01-s10 visible; Yes with 0 donations (Eileen Park, City Planning Office) are not green. Victor Szabo is on_record No.

Step 10. Scroll table for s20. Command: --step --wheel 760,700,350
 -> 10.png: s20 = Silverline Media, company, donations 11,000, on_record No. Green rows here: s16 Keith Ramos, s17 Friends of the Waterfront, s21 Rhoda Adeyemi. Yes with 0: s14, s19.

Step 11. Scroll to the bottom. Command: --step --wheel 760,700,600
 -> 11.png: Last rows s15-s24. s22 State Ethics Commission Yes with 0. Counted on_record Yes: s02 s05 s06 s08 s09 s11 s14 s16 s17 s19 s21 s22 = 12 (s11 was only a sliver behind the header; it counts as the 7th green because the panel says 7 selected, person 6, company 1). Green with donations above 0: s02 s05 s06 s11 s16 s17 s21 = 7.

## End of session (in character, Dev)

Did I finish? Yes, I think so. I used 2 of my 8 AI questions.

Fact 1: Most of the connections between everyone else go through s20, which the table says is Silverline Media (a company). The AI says it has the highest betweenness centrality across the whole graph, lying on the most shortest paths between other nodes.

Fact 2: Of the 12 sources on the record, 7 gave donations (Rita Vance, Della Whitfield, Marcus Lee, s11, Keith Ramos, Friends of the Waterfront, Rhoda Adeyemi). I checked that count against the table myself. s11 is Ines Moreau going by the AI's first answer; I never read that table row.

The sentence I would pass on: "Across all 24 sources, Silverline Media sits on the most shortest paths between the others, and 7 of the 12 on-the-record sources gave donations." I did not see the actual betweenness number, and I took Silverline being top from the AI without checking it.

Ease: 5 out of 7.

What confused me:
- The first answer was only "among your selected sources". I had not selected anything, the reporter left 14 selected, and that made it say Victor Szabo. If I had not read that one word I would have told her the wrong person. The "Selection 14" chip above the box is small and does not say it will narrow the answer.
- After I switched to "Whole graph" and sent, the chip jumped back to "Selection 14" while the answer was coming. I could not tell whether my message went out for the whole graph. The answer said "entire graph", so I believed it, but any next question would quietly be about the selection again.
- The first answer mixed two things (full network and the selected group) with two different names, and neither was plainly the answer to what I asked.
- The second answer gave "s20", a code, not a name. I had to find the name in the table myself. The first answer gave names, so it was odd.
- "Show in table" replaced the reporter's 14-node selection with the 7. I did not expect that to change what she left, and I do not know if I can get it back (undo arrow, maybe?).
- "betweenness centrality" is a word from my tutorial so that was fine, but "Bridges" in "Computed Bridges for 24 nodes" is a different word and I had to guess they were the same thing.

## Follow-up

Facilitator: "Someone will check these. Where did each fact come from, how sure are you of each, and what did you look at to be sure?"

Looked again first (steps after the end of the session, no AI questions used): 12.png the screen as I left it; 13.png opened "3 steps" under the second answer and scrolled the table to s11; 14.png clicked the first "Query data" (nothing more opened) and dragged the table's scrollbar right, which showed two betweenness columns I had never seen; 15.png and 16.png scrolled top and bottom to read all 24 rows.

Dev: Okay, wait, I should say up front that when I finished I had only really checked one of these two. Since you said someone will check, I went back and looked properly.

Fact 1: Silverline Media (s20, a company) is the source most connections between everyone else go through.
- Where it came from: the AI's second answer, the one where I asked about the whole graph. It said "s20" and I got the name from the table, row s20.
- What I looked at: when I finished, nothing. I just took it from the AI, I said so. Just now I found a column at the far right of the table, "Betweenness (visible)", which you only reach by scrolling sideways. I read all 24 rows. Silverline Media is the highest at 67.68. Next are Port Authority (s12) 61.64, the first row s01 46.94, and Victor Szabo (s10) 45.4. I matched s20 to its number by the email on the same row, news@silverline.example.
- How sure: pretty sure it is the top one by betweenness, now that I read the number and not just the AI. Three things I would flag. It is close: 67.68 against 61.64, so "the one source" is a bit strong and Port Authority is nearly level. It is the top source, not literally "most" of the connections; I have no number that says more than half go through it. And the column says "(visible)", which I am guessing means all 24 because all 24 rows have a value and the first answer said "Computed Bridges for 24 nodes". The second answer's steps only say "Query data" three times, with no new computing, so I think it read the column made during my first question. I did not work out betweenness myself.
- Do not use Victor Szabo. That was only the top of the 14 the reporter had selected.

Fact 2: 7 of the 12 on-the-record sources gave donations.
- Where it came from: the AI's second answer, and then the table. The opened steps show the chips 12 and 7 from its queries.
- What I looked at: I read the on_record and donations columns for all 24 rows myself. on_record Yes: s02 s05 s06 s08 s09 s11 s14 s16 s17 s19 s21 s22 = 12. Of those, above 0: s02 12,000, s05 4,500, s06 800, s11 2,000, s16 7,000, s17 18,000, s21 300 = 7. Yes with 0: s08 s09 s14 s19 s22 = 5. The side panel for the 7 also says on_record Yes (7), donations 300 to 18,000, mean 6,371, and my seven add to 44,600, which divided by 7 is 6,371.
- Correction: at the end I said s11 was Ines Moreau going by the AI, and that I had only seen a sliver of the row. I have now read the row: s11 Ines Moreau, person, 2,000, Yes.
- How sure: very sure, as far as the table goes. It counted out by hand, not just by the AI.

For both: everything is from what is in the file the reporter left open. I took on_record and donations as they are written, and I took 0 to mean no donation. I did not check the file against anything outside it, and I did not check the links between sources.

The sentence I would pass on now: "Across all 24 sources, Silverline Media has the highest betweenness (67.68), just ahead of Port Authority (61.64), and 7 of the 12 on-the-record sources gave donations."

Also, the selection is still the 7 from "Show in table", not the reporter's 14. I have not tried to get it back.
