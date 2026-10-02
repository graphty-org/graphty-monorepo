# First-click test, round 7 -- grades

Sixteen simulated participants, fourteen prompts, one first click each. A click is correct when it
lands on a target the answer key accepts for that screen. Grades were checked against the
participant-view renders in shots/tasks/<prompt>/01.png; icon-only controls were confirmed by
hovering them in the skeleton (the selection bar's second icon is "Path between (P)", the toolbar's
second icon is "Pause layout" while the layout runs, the toolbar's fourth icon is "Legend (L)").

Y = correct, n = wrong. Simulated participants only: treat every rate as a direction, not a measure.

## Per-prompt success rates

| Prompt | What the participant had to find | Correct | Rate | Spec criterion |
|---|---|---|---|---|
| fc01 | A colleague's note about one community | 12 / 16 | 75% | Misses inside the tree: 4 of 16 first clicks (25%), 4 of the 10 clicks that went into the tree (40%). See note 1 |
| fc02 | The path between two selected nodes | 16 / 16 | 100% | -- |
| fc03 | Stop the layout moving | 16 / 16 | 100% | Layout icon reached by 16 / 16, well above "about half" |
| fc04 | Go back to a saved view | 16 / 16 | 100% | View target reached by 16 / 16 -- but all 16 used the Views rail button, none the toolbar's View (cube) icon. See note 3 |
| fc05 | Show what the colors mean | 15 / 16 | 94% | No one clicked the PageRank row |
| fc06 | Make a group's edges dashed | 16 / 16 | 100% | -- |
| fc07 | Label every node with its name | 16 / 16 | 100% | Target 85%: met |
| fc08 | Weighted count of shared chapters | 14 / 16 | 88% | -- |
| fc09 | Money received, in currency | 16 / 16 | 100% | -- |
| fc10 | Bring in a downloaded nested export | 16 / 16 | 100% | No one picked the Research network sample |
| fc11 | Replace this month's data under everything built on it | 13 / 16 | 81% | -- |
| fc12 | Use a colleague's style file | 15 / 16 (all three targets); 0 / 16 (project name alone) | 94% / 0% | See note 2 |
| fc13 | Find one attribute among 69 | 16 / 16 | 100% | -- |
| fc14 | Door swipes that matched no known person or building | 15 / 16 | 94% | -- |

Overall: 212 of 224 first clicks correct (95%).

## Grades by participant

| Participant | 01 | 02 | 03 | 04 | 05 | 06 | 07 | 08 | 09 | 10 | 11 | 12 | 13 | 14 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| alert-reviewer | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| analyst-alex | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| bioinformatics-researcher | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| cybersecurity-analyst | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| expert-emma | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| explorer-elena | n | Y | Y | Y | Y | Y | Y | n | Y | Y | n | Y | Y | n |
| fraud-analyst | n | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| genomics-cytoscape-user | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| gephi-holdout | Y | Y | Y | Y | n | Y | Y | Y | Y | Y | n | Y | Y | Y |
| intelligence-analyst | n | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| knowledge-engineer | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | n | Y | Y |
| marketing-analyst | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| ml-engineer-recsys | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| recipe-recipient | Y | Y | Y | Y | Y | Y | Y | n | Y | Y | n | Y | Y | Y |
| screen-reader-analyst | n | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| supply-chain-analyst | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |

## Where each prompt's clicks went

**fc01 (note about one community).** Notes rail button: 6 (alert-reviewer, analyst-alex,
gephi-holdout, marketing-analyst, recipe-recipient, supply-chain-analyst). Note-count bubble on
the Louvain row: 6 (bioinformatics-researcher, cybersecurity-analyst, expert-emma,
genomics-cytoscape-user, knowledge-engineer, ml-engineer-recsys). WRONG -- the built-in Notes row
in the tree (count 4): 4 (explorer-elena, fraud-analyst, intelligence-analyst,
screen-reader-analyst). That row is a style row: it selects the noted nodes and edges and opens a
Style tab ("Paints 3 nodes, 1 edge (noted)"), with no note text and nothing about a community.
alert-reviewer (Notes rail) and analyst-alex (Notes rail) saw the Louvain bubble but did not know
what Louvain meant or did not trust it; explorer-elena (Notes row) said the same; screen-reader-analyst picked the row because the bubble would read as a bare "1".

**fc05 (what the colors mean).** Legend button: 15. WRONG: gephi-holdout pointed at "the legend
box already on the canvas". There is no legend on this screen (the legend is off and the toolbar's
Legend button is unpressed); the box exists on the at-rest screens shown for fc01, fc04 and fc07.
This is most likely a participant mixing up screens, not a design finding -- it is graded wrong
and should not be read as evidence about the legend.

**fc08 (weighted chapters).** Total value: 14. WRONG: Links (count) -- explorer-elena,
recipe-recipient, both at confidence 2 to 3. Even among the correct answers, alert-reviewer said
nothing on screen ties "value" to chapters ("If QA asked me why, I couldn't answer"). The same
pair on the money domain (fc09) was 16 / 16, so the problem is the attribute name "value", not
the measure names.

**fc11 (replace the data).** Data rail button: 13. WRONG: the project name menu -- explorer-elena,
recipe-recipient (it holds Save, Export and Apply recipe or style file, nothing that replaces
data); the main menu -- gephi-holdout (its Open... starts a new project). alert-reviewer and
analyst-alex, both correct, named the project name and the "from 2 tables" link as rival guesses,
and alert-reviewer feared losing the coloring whatever she clicked.

**fc12 (colleague's style file).** Main menu: 15. Project name: 0. Data rail: 0. WRONG:
knowledge-engineer clicked the tree's List options ("...") menu, which holds New folder, Show
hidden rows and Collapse all. Four participants said they were looking for File > Import.
No one went to the project name, where Apply recipe or style file... lives; the main menu's
Open... reaches it, so the prompt passes only on the broader key.

**fc14 (unmatched swipes).** "from 3 tables" provenance link in the inspector header: 9. Data rail
button: 6. WRONG: explorer-elena, the "Isolated nodes 14" line in the summary (isolated nodes are
people or buildings with no swipes, not swipes with no match -- alert-reviewer made that
distinction unprompted).

**fc02, fc03, fc04, fc06, fc07, fc09, fc10, fc13.** Every participant chose the same correct
target: the selection bar's Path between icon (matched to the Shortest paths row's icon by 6
participants), the Pause layout icon, the Views rail button, the Edges switch, the Label "+", Total
amount in, Open project or file..., and the Find attribute box.

## Notes for synthesis

1. **fc01 tree criterion.** The specification brings a "Rows with notes" chip back if more than a
   third of first clicks miss inside the tree. Counted against all first clicks the miss rate is
   25% (4 / 16), under the bar. Counted against clicks that went into the tree it is 40% (4 / 10),
   over it. The criterion should say which denominator it means; either way the built-in Notes row
   is the trap, drawing 4 of 16 with its word "Notes" and a count. A caveat on the six correct
   bubble clicks: that bubble counts the one note about Louvain itself; Community 3's two notes are
   the hollow "2 inside" mark beside it. The key counts the bubble correct, but a participant who
   clicks it reaches the Louvain run's notes first, not the community's.
2. **fc12 project name.** 0 / 16 first clicks reached the project name, the only place Apply
   recipe or style file... lives on this screen. The prompt passes at 94% only because the main
   menu's Open... also accepts a style file. If the main menu route is the designed path, this is
   fine; if the project-name item is meant to be found, it is not found at all.
3. **fc03 and fc04 label criterion.** The Layout icon passes (16 / 16, though "Pause" is a
   universal glyph and tests recognition of pause, not of "layout"). The View (cube) icon was not
   tested in effect: every participant took the labeled Views rail button instead, so this round
   gives no evidence for or against the cube icon.
4. **Low confidence where clicks were right.** fc12 (median confidence 3), fc14 (3), fc05 (3) and
   fc08 (4) were mostly correct but guessed; fc02, fc09 and fc13 were correct and confident (5 to
   6).
5. **Repeat misses.** explorer-elena missed 4 prompts (fc01, fc08, fc11, fc14) and
   recipe-recipient 2 (fc08, fc11); both are the least technical participants and both missed the
   same two prompts, which makes fc08's "value" and fc11's project-name pull the two findings that
   more than one voice supports.
