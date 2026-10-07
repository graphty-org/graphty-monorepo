# Grade: session r2-s52 -- Grace (nonprofit operations analyst), circles of characters, Les Miserables

Build: commit 4a7a1a7fb, graphty 0.8.53 (session.json). Graded from the last screenshot (08.png),
the transcript and the earlier screenshots. No files were downloaded (the task asks for none).

## Grade: S (success)

- **Grouping run:** Louvain, run with the default resolution; the left list shows the run row
  "Communities 6" and the legend reads "Color: Communities" with Group 1 to Group 6 (06.png).
- **Number of groups:** 6, as the screen shows it (06.png, 08.png). Stated correctly.
- **Largest group's size:** Group 1, 20, read from the row counts (20, 17, 11, 11, 10, 8) and
  confirmed by Values, Summary "Size 20" (08.png). Stated correctly. Her check that the sizes add
  to 77 is also true.
- **Three members:** Valjean, Fauchelevent and MlleBaptistine, each shown in Group 1's Members list
  in 08.png before she named them.
- **Failure codes:** none. **Build-decided:** no. **Void:** no.

## Counts

| | This session | Reference |
|---|---|---|
| Steps (real.mjs) | 8 after the start (usage card and sample together, Analyze, type, Louvain, Run, Group 1, Values) | 9 on round 2's build (Group 1 opens on Style, so Values needs its own step) |
| Wrong turns | 0 | -- |

Opening Group 1 on its Style tab and switching to Values is on the path (the answer key says so).
She skipped the run row's Summary and Sizes and read the sizes from the row counts instead; that is
a shortcut, not a wrong turn. Ease (her own): 6 of 7.

## False "done"

None. Every claim she made (6 groups, Group 1 largest at 20, everyone placed, the three names) is
what 06.png and 08.png show.

## Problems

Severity 0-4 (Nielsen). One participant, so each behavior and opinion finding is unconfirmed until
a second. No build defect was found, so no repro script was needed.

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 2 | behavior | A group's Members list stops at "First 10" of 20 with no visible way to see the rest or copy them out. Not needed for this task, but Grace said her real work (a list for the development director) would stall here. | Step 8, 08.png (Summary "Size 20", Members "First 10", 10 names, nothing after). |
| 2 | 2 | behavior | Clicking a group row opens its Style tab (a color picker); who is in the group is one more tab away under Values. She wanted the members and got a color first. | Steps 7-8, 07.png, 08.png. Same as the answer key's round 2 note. |
| 3 | 1 | behavior | The Analyze menu opens on "Rank nodes and edges"; "Find groups" is out of sight below Katz and HITS. She reached it only by typing "group" in the filter; a reader who does not type must scroll. | Steps 3-4, 03.png, 04.png. |
| 4 | 1 | wording | Method and setting names are jargon (Louvain, Leiden, Girvan-Newman, "Resolution"); she chose by the "Start here" tag and the one-line description, not the name. | Steps 4-5, 04.png, 05.png. |
| 5 | 1 | behavior | After the run the drawing is colored but carries no names, so the drawing alone cannot answer "who is in this group". | Step 6, 06.png. |
| 6 | 0 | opinion | "Group" (legend, rows) and "Communities" (run row, "Made by") name the same thing; she would say "groups" on a slide. Held one level down as opinion. | 06.png, 08.png. |

What worked, for the record: the sample on the start page with "77 characters"; the empty-panel
hint naming the flask button and Shift+A; the filter box in Analyze landing on "Find groups"; the
"Start here" tag on Louvain; group sizes listed beside the rows and adding up to the node count.
