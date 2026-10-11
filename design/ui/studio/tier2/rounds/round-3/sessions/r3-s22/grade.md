# Grade: session r3-s22 -- T21 B (team), Ruth (tier 1 graduate)

**Grade: S.** False "done": none. Wrong turns: 0.

Build checked by `session.json` buildStamp `26f3bb968e43 graphty@0.8.61`, the frozen build named
in `criteria.md`. Setup ran to its end (`setup.log`), and no tool fault is recorded. Not void.

## Against the answer key

| Key value | On screen | Where |
| --- | --- | --- |
| Before: Hal first (0.1293), 12 people | Top 10 "Hal 0.1293", "12 of 12 have a value" | `02.png` |
| Replace: team-v2.csv, "Was 12 nodes, 16 edges; now 14, 21" | Same, read before confirming | `06.png` |
| After Replace: run marked out of date, key keeps the old range | "Size: PageRank, out of date", 0.03273 to 0.1293; row says 12 with the history icon | `07.png` |
| After Rerun: Di first (0.1339), then Hal 0.1305, Ed 0.1245; 14 of 14; key 0.02333 to 0.1339; row 14 | All held; Ran changed from 5:31:56 PM to 5:33:18 PM | `09.png`, `14.png` |

The last screenshot (`14.png`) shows the rerun's Values (Di 0.1339 first, 14 of 14), the row at
14, and "Saved team in this browser." `work.json` keeps the run and all three style layers and
lists team.csv under "gone": that is the replacement, not lost work.

Final answer: 14 people (21 ties), first before Hal (0.1293), first now Di (0.1339), Hal second at
0.1305. All three parts match the key. The participant read the "first before" name ahead of the
replacement and read the "first now" name only after Rerun, so there was no `stale-read`.

## Route

The participant used the source inspector's "..." route: Values, Data, a left click on team.csv,
"Source actions", "Replace with file...", Replace, PageRank, Rerun. That is 8 steps to the answer,
the walked route for this menu. After that came three optional checks (the Nodes table, a search
for "Mo", Save). They added nothing wrong and undid nothing, so they are not detours.

## Problems

| Severity | Problem | Evidence |
| --- | --- | --- |
| 2 | Replace is hard to find. It sits behind a "..." in the source inspector, two clicks into a Data rail the participant had never opened, and was found by guessing. | Transcript steps 3 to 5, "What confused me" |
| 2 | Between Replace and Rerun, the run row still says "12", with only a changed icon and no words. "Out of date" appears only in the key's titles until the run is opened. | `07.png`; transcript step 7 |
| 1 | The two new people, Mo and Nia, are drawn as unexplained saturated blue dots until Rerun, with no names. The participant guessed they were the new people and did not read them as a highlight. They had to search to see the names. | `07.png`; transcript steps 7 and 11 |
| 1 | The same value is shown at two precisions: the table shows Abe as 0.04 and the panel shows 0.03959. The participant asked which one to quote. | `10.png`, `14.png`; transcript step 10 |
| 1 | Plain Save opened "Save team as", and the participant thought the project had already been saved. The top bar says "Local only", so a name dialog is correct for a project that was never saved. Nothing on screen tied that dialog to that state. Opinion only. | `13.png`; transcript step 13 |
| 0 | The participant quoted the "Not set" line ("PageRank reads a higher weight as closer until I choose") as their reason to leave the weight alone, because the old run counted it the same way. The reasoning is correct. This is recorded because the key asks for it. | `06.png`; transcript step 6 |

Not seen in this session: no participant read the moved drawing as lost work, and no participant
read the source inspector's counts heading as "added".
