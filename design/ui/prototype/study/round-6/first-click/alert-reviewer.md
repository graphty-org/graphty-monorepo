# First-click test: Nadia, level-1 alert reviewer

Participant: Nadia, transaction monitoring analyst, fourteen months in, no graph tool experience.
She clicks what is in front of her and reads labels literally. Confidence is 1 (pure guess) to 7
(certain). Answers were given before the correct targets were seen; the scoring column was added
afterwards and the answers were not changed.

| Prompt | Screen | First click | Conf. | Scored |
|---|---|---|---|---|
| 1. Picture of the network for the paper | Les Miserables, at rest | The little camera icon beside "The whole novel" under Views | 4 | Wrong |
| 2. See how the earlier bridges calculation was set up | Les Miserables, at rest | "Bridges off" in the Style stack on the right | 4 | Wrong (the style layer, not the run's record) |
| 3. Rank the characters a second way | Les Miserables, at rest | The "degree" column header in the table | 3 | Wrong |
| 4. Get back the cleared picked-out characters | Undo notice | "Bring it back" on the black notice | 6 | Correct in both undo designs |
| 5. Where Valjean's betweenness comes from | Valjean selected | The "betweenness 0.57, highest" row under Results on the right | 5 | Correct |
| 6. Bring in next month's transfers file | Transfers, at rest | "Change..." on the Loaded line on the right | 4 | Wrong (the Loaded line's Change...) |
| 7. Accounts taking in far more than they send | Transfers, at rest | The Table strip at the bottom | 3 | Correct |
| 8. Cheapest route, bigger transfer costs more | Transfers, at rest | "Change..." after "amount not used yet" | 3 | Wrong (the Loaded line's Change...) |
| 9. Has anything left the computer | Transfers, at rest | "Nothing has been sent from this project" under the name | 6 | Correct |
| 10. Change Ribosome or Spliceosome's blue | Protein interactions, at rest | The Spliceosome swatch in the legend | 5 | Correct |
| 11. Bring in the lab's colors-and-sizes file | Protein interactions, at rest | The palette icon beside "Graph" on the right | 3 | Wrong |
| 12. How Ribosome differs from the rest | Protein interactions, at rest | "Ribosome" in the legend | 3 | Correct |
| 13. Make one protein's name always show | Protein interactions, at rest | The magnifier beside "Graphs" on the left, to type the protein's name | 4 | Wrong (not a listed target) |
| 14. Run again with one setting changed, keep this one | Betweenness run open | "Compare with..." | 3 | Wrong (it compares runs that already exist) |

Score: 6 of 14 correct. Prompt 4 scores the same under both undo designs, because the first
thing she reached for was the notice's button, not Ctrl+Z.

## What she said, prompt by prompt

1. "A picture? That's a camera. Views, camera, I click the camera. If that's not a screenshot I
   don't know what it is. Otherwise I'd just do Win+Shift+S like I do for every alert file."
2. "It says Bridges right there. Bridges, off. I'd click that and hope it tells me the settings.
   I don't know what a 'style stack' is. I didn't look at the left strip."
3. "Rank a second way is sort by a different column. It's a table. I click the header, like
   Excel. Sorted by degree now, so I click something else. There's only three columns though,
   so I'm not sure there is a second way already."
4. "There's a button that literally says Bring it back. Easy. I might have hit Ctrl+Z first on
   a normal day, but the button's right in the middle of the screen."
5. "Results, betweenness, 0.57, highest. That's the number. Click the number and I'd expect it
   to show me how it was worked out. QA would ask me the same thing."
6. "New file replaces old file. It says Loaded: transfers-2026-03.csv, Change... So Change.
   I did see the file name thing top left but Change is a word, the chip is just a name."
7. "Money in versus money out -- that's totals, and totals go in a spreadsheet. The Table at
   the bottom is the closest thing to a spreadsheet here. Quick actions could be anything."
8. "It says amount not used yet. Well I want it used. So Change... next to that. I have no idea
   what a route between two accounts is in this thing. The squiggly icon on the toolbar might
   be it, but I'm not guessing icons."
9. "'Nothing has been sent from this project.' It's underlined, so I click it and screenshot
   whatever comes up for IT. The left strip also says nothing is sent, but that's the
   assistant, I think."
10. "The legend. Spliceosome's the darker one. Click the little square and hope a colour
    picker comes up."
11. "Colours and sizes -- the paint palette icon up there by Graph. That's where colours live,
    I'd assume. I don't see an 'import' anywhere. Or maybe the file chip, but that's the data."
12. "Compare Ribosome with the rest... click Ribosome in the legend, I guess, and see what
    happens. Low confidence. This isn't my kind of question."
13. "Which dot is it? I've no idea. First thing I do with anything is search, so the
    magnifying glass top left. Type the name, find it, then work out the label. The '7 more
    hidden' line I read but didn't think it was clickable."
14. "Run again but keep this one to compare -- the button says Compare with. Re-run sounds like
    it would overwrite this one, and I don't want to lose what QA might ask about. So Compare
    with."

## What stands out from her session

- She reads visible words and matches them to the prompt. Where a word on screen matches a
  word in the prompt ("Bridges", "amount", "Compare", "Change"), she takes it, even when it is
  the wrong thing. Three of her eight misses are that kind of word match.
- She never once clicked the left strip (Graph, Data, Results, Notes). She read it as
  navigation for pages she had not asked for, not as a place to look for actions.
- She treats "Change..." as the one editable thing on the transfers screen and sent two
  unrelated tasks there (the new month's file and the weighted route).
- Anything to do with a picture or with a total goes to her habits outside the tool: the
  Windows screenshot key and a table.
- She was afraid "Re-run" would overwrite the run she has. That fear, not the label, is why
  she chose "Compare with...".
