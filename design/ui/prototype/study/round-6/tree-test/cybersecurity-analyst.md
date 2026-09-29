# Tree test, round 6: Priya (threat hunter in a corporate SOC)

Persona: `../../personas/cybersecurity-analyst.md`. Simulated participant, not a real person.

Session: the label variant, taken first, so the rail place reads "Runs (rail)" instead of
"Results (rail)". Only tasks 1 to 4 of this session count for the label; the other 12 answers are
a check that the main tree's results repeat. Tasks were answered in this order: 8, 3, 13, 5, 1,
10, 16, 6, 12, 2, 14, 9, 4, 15, 11, 7.

Opening remark, before any task: "It's a list of menus. Fine. Where's the query box? The closest
thing is Quick actions, 'type what you want'. I'll keep that in my back pocket."

## Answers

**tt-1. A second way of ranking which characters matter, to check the first.**
Opened: Main menu > Algorithms > Centrality. Final pick: Main menu > Algorithms > Centrality.
Went back up: no. Confidence: 6.
"Ranking who matters is centrality; I'd pick betweenness or PageRank, whichever wasn't run."

**tt-2. How Valjean scored and where he places, on the measure of who holds the groups together.**
Opened: Bottom table > Search. Final pick: Bottom table > Search ("Valjean").
Went back up: no. Confidence: 5.
"I search for the name I know, same as a hostname. If the row has the score column, I'm done;
rank I'd get from sorting."

**tt-3. Where a colleague finds how an earlier calculation was set up, to repeat it exactly.**
Opened: Runs (rail) > An opened run > Settings. Final pick: Runs (rail) > An opened run > Settings.
Went back up: no. Confidence: 6.
"'Every run with its settings and date' -- that's the closest thing to my notebook in here."

**tt-4. Every character's score in one list, highest first.**
Opened: Bottom table > Nodes tab, then Column header menu. Final pick: Bottom table > Column header
menu (sort). Went back up: no. Confidence: 6.
"Table, sort descending. That's how I work everything."

**tt-5. Making sure a bigger transfer counts as more expensive on a cheapest-route search.**
Opened: Main menu > Algorithms > Path; saw Shortest path with nothing about weights; went back to
the top; Data > Sources > Its columns. Final pick: Data > Sources > Its columns.
Went back up: yes. Confidence: 3.
"The path list doesn't say anything about the weight, so the meaning of the amount has to live on
the amount column. If the field's defined wrong, the path is fiction anyway."

**tt-6. A picture of the network for the co-author's paper.**
Opened: Main menu > File > Export... Final pick: Main menu > File > Export...
Went back up: no. Confidence: 7.
"Export. I just want to know it keeps the legend."

**tt-7. A colleague's file of the colors and sizes their team always uses.**
Opened: Main menu > File > Open...; read "opens a file as a new project", backed out; Right panel,
with nothing selected > Style stack > Add a layer (+) > From a recipe or file... Final pick: that.
Went back up: yes. Confidence: 5.
"It's a style file, not data. 'Your data stays here' is the line that sold me. I don't know what
a recipe is and I didn't go looking."

**tt-8. Next month's transfers file, so everything set up carries over.**
Opened: Data > Sources > Update with new data... Final pick: Data > Sources > Update with new
data... Went back up: no. Confidence: 6.
"This is the one I actually care about. Same hunt, next month's export. 'Update', not 'Open'."

**tt-9. Two groups in colors that cannot be told apart.**
Opened: Canvas > Legend > Each entry's swatch. Final pick: Canvas > Legend > Each entry's swatch.
Went back up: no. Confidence: 6.
"Colors with a legend -- click the legend. 'Unused colors first' is right."

**tt-10. Accounts that take in far more money than they send out.**
Opened: Bottom table > Nodes tab, then Column header menu; saw "new column: Money in minus out".
Final pick: Bottom table > Column header menu (new column, Money in minus out).
Went back up: no. Confidence: 5.
"In Splunk that's a stats sum by dest minus sum by src. Here it's a column. Good, I'd sort it after."

**tt-11. Total money moved along a selected route.**
Opened: Right panel, with a set, a group or a path selected > Members; it only says count; went
back; Bottom table > Footer. Final pick: Bottom table > Footer.
Went back up: yes. Confidence: 4.
"Members is a count, I want a sum. A footer total on the selected rows is what I'd expect from a
spreadsheet, it just took me a second to think of it."

**tt-12. How the biggest group differs from the rest of the network.**
Opened: Right panel, with a set, a group or a path selected > Compare with the rest. Final pick:
same. Went back up: no. Confidence: 5.
"Baseline versus the cluster. It says it in plain words. Does 'group' mean cluster here? I'm
assuming yes."

**tt-13. A stray click cleared the 18 characters picked out.**
Opened: Main menu > Edit > Undo. Final pick: Main menu > Edit > Undo (Ctrl+Z).
Went back up: no. Confidence: 6.
"Ctrl+Z. If that doesn't bring a selection back, it should."

**tt-14. Three narrowing steps, the second one wrong; take out only that one.**
Opened: Filter chip > Filter steps. Final pick: Filter chip > Filter steps.
Went back up: no. Confidence: 6.
"Each step with its own delete. That's what I want from a search pipeline."

**tt-15. Making sure one hidden character name always shows.**
Opened: Right panel, with nothing selected > Style stack; saw nothing about labels; went back;
Right panel, with a node selected > Show label anyway. Final pick: Show label anyway.
Went back up: yes. Confidence: 5.
"I thought labels were styling. Then I found it on the node itself. I wouldn't have looked at
the legend for that."

**tt-16. Where money went next after it left one account in early August.**
Opened: Filter chip > Add a step (to set the date range first); realised that narrows the whole
graph, not the trail from one account; went back; Right panel, with a node selected > Header
actions: Neighbors (hops, direction, from a date). Final pick: that.
Went back up: yes. Confidence: 4.
"This is lateral movement with money. I wanted a timeline. Neighbors with direction and a from
date is close; I'd need to see the hops in time order before I trusted it."

## Scored against the key

Scored after the answers were fixed; no answer was changed. "Direct" means correct without going
back up the tree. This is one simulated participant: a failed task is a strong signal, a passed
task a weak one.

| Task | Final pick | Correct | Direct | Confidence |
|---|---|---|---|---:|
| tt-1 | Main menu > Algorithms > Centrality | yes | yes | 6 |
| tt-2 | Bottom table > Search | yes | yes | 5 |
| tt-3 | Runs (rail) > An opened run > Settings | yes | yes | 6 |
| tt-4 | Bottom table > Column header menu (sort) | yes | yes | 6 |
| tt-5 | Data > Sources > Its columns | no (counted separately) | no | 3 |
| tt-6 | Main menu > File > Export... | yes | yes | 7 |
| tt-7 | Style stack > Add a layer (+) > From a recipe or file... | yes | no (visited File > Open... first, counted separately) | 5 |
| tt-8 | Data > Sources > Update with new data... | yes | yes | 6 |
| tt-9 | Canvas > Legend > Each entry's swatch | yes | yes | 6 |
| tt-10 | Bottom table > Column header menu (new column) | yes | yes | 5 |
| tt-11 | Bottom table > Footer | yes | no (visited path Members first, counted separately) | 4 |
| tt-12 | Right panel, group selected > Compare with the rest | yes | yes | 5 |
| tt-13 | Main menu > Edit > Undo | yes (no under the notice-only key) | yes | 6 |
| tt-14 | Filter chip > Filter steps | yes | yes | 6 |
| tt-15 | Right panel, node selected > Show label anyway | yes | no | 5 |
| tt-16 | Right panel, node selected > Header actions (Neighbors) | yes | no | 4 |

Totals: 15 of 16 correct, 11 of 16 direct. Label tasks (1 to 4, "Runs"): 4 correct, 4 direct.

Under round 5's key: tt-5 would be correct but not direct (the column); tt-10 would be wrong (the
table's New column was not in the key); tt-13 via Edit > Undo is wrong under the notice-only key.

First top-level place opened, per task: tt-1 Main menu; tt-2 Bottom table; tt-3 Runs (rail); tt-4
Bottom table; tt-5 Main menu; tt-6 Main menu; tt-7 Main menu; tt-8 Data; tt-9 Canvas; tt-10 Bottom
table; tt-11 Right panel (set, group or path); tt-12 Right panel (set, group or path); tt-13 Main
menu; tt-14 Filter chip; tt-15 Right panel (nothing selected); tt-16 Filter chip.

What the misses say, in her terms: she looks for what a bigger amount means on the data column,
because to her a field's meaning belongs with the field; the path entries in the menu and the
algorithm list say nothing about a weight, so nothing pulled her there. And a time question
("early August") sends her to the filter before the node, because every search she runs starts
with a time range.
