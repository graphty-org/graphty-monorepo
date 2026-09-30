# Real change or noise -- Analyst Alex

**Task, as the moderator gave it:** "April's transfers replaced March's in your case project, and
the ring's group looks different now. Tell me whether the accounts really changed, or whether it
only came out differently this time."

**Participant:** Alex, operations data analyst. Runs Louvain in NetworkX, has been burned by
Louvain giving different groups on a rerun, believes "same number, same group".

**Pages used:** the weekly-return screen at the compare-pick, compare and follow-up states; the
comparison screen (PageRank, two data versions); version history. Renders:
`shots/record/r6-alex-rcn-wr-rerun.png`, `shots/record/r6-alex-rcn-wr-compare-pick.png`,
`shots/record/r6-alex-rcn-wr-compare.png`, `shots/record/r6-alex-rcn-wr-compare-tall.png`,
`shots/record/r6-alex-rcn-wr-followup.png`, `shots/record/r6-alex-rcn-version-history.png`,
`shots/record/r6-alex-rcn-comparison-versions.png`.

## Think-aloud

**1. The project, April loaded.**
"OK, Case 0314. 3,093 accounts, 8,370 transfers, last import April data, today. Fine. Louvain says
'current', 65 groups. Last month it was 35, I think -- I'd have to check. 65 is a lot more. That's
the first thing that makes me nervous: did the groups really almost double, or is this the
Louvain-gives-you-different-answers thing again?"

"The legend down here says 'Other, 58 communities, 2,070' and then '19 carried on from March's 8 to
35, 39 new'. I read that twice. 19 carried on from... March's 8 to 35? Is that a range? Community
numbers 8 through 35? I think it means some numbering thing. I'm skipping it."

"Where's the ring? The ring group isn't in the legend. It's in the grey 'Other' pile, I guess. So
on the picture I can't even see my group. I'd have to know its number."

**2. Looking for 'what changed'.**
"My instinct is Version history -- that's where the old data is." (Goes to Data, Versions.)
"Right, April data current, March data under it. 'What changed, against March data.' 65
communities (was 35) -- with a yellow 'large change' badge. Well, that's the question, isn't it?
Is it a large change or is it Louvain being Louvain? The badge just says large. It doesn't say
compared to what. If I'd stopped here I'd have told my manager 'large change' and been wrong or
right by luck."

"There's a 'Compare with...' button at the bottom of the April entry. OK, that's probably it. But
wait, the project name up top here says 'Payments network review', not 'Case 0314, mule ring', and
the March version is dated Apr 2 here and the picker later says Apr 3. Am I in the same project?
Small thing, but this is exactly what makes me distrust numbers."

(Moderator note: he also looked for it on the result itself.) "On the Louvain row in Results
there's a little icon on the right when it's highlighted, two arrows. I wouldn't have known that
was 'compare' without hovering. I'd have right-clicked the row first, honestly."

**3. The picker.**
"'Compare Louvain communities with'. Earlier runs: March data, Apr 3, 35. Good, that's the one --
35 groups, matches. Then 'Partitions on April data': weakly connected components, kind attribute.
Don't need those."

"'Both runs keep the 5 seeded re-runs made with them (seeds 12 to 16); the comparison reads those
and runs nothing.' OK -- seeds. I like seeds. That's the first thing in any tool that's told me
Louvain was rerun with a seed. And 'runs nothing' means it won't hang on me. Good."

**4. The comparison.**
"Two pictures, March and April. Lots of black rings -- selected. 'Community 33: 22 selected' on
March, '32 selected' on April. Little half-rings for 'only in March', 'only in April'. Honestly the
pictures don't tell me much, it's two hairballs with circles on them. I'm going to the numbers."

"Right panel. Groups: '35 groups in March, 65 in April: 39 new, 9 lost.' And '26 of the new groups
are single accounts with no April transfers.' Oh. OK. So a big chunk of the jump from 35 to 65 is
just 26 dead accounts, each its own group. That's not the ring, that's junk. That alone takes the
'large change' badge down a peg. Version history should have said that next to the badge -- well,
it sort of did, in small grey text."

"Agreement: '3 in 10 pairs of accounts that shared a group in March still share one in April, on
the 2,961 accounts in both.' Then 'two runs on March's data: 6 in 10'. 'Two runs on April's data:
7 to 8 in 10'."

(Pause.) "Hang on. Two runs on the same March data only agree 6 in 10? So Louvain on the exact same
file moves four in ten pairs around. That's -- that's my whole problem with Louvain, in one line.
OK. But March-to-April is 3 in 10, which is worse than 6 in 10. So the months differ more than
rerunning does. That's the answer at the whole-graph level: something did change, beyond the dice."

"But I don't know if 3 against 6 is a lot. Is that significant? It's half. I'd say 'about twice
as much disagreement as a rerun gives'. I think that's fair. I'd rather it just said that, but I
get why it doesn't -- I'd want to check it myself anyway."

"And why is April a range, '7 to 8 in 10', and March just '6 in 10'? Five reruns each, right?
Either give me a range on both or a number on both. Now I'm wondering what's different."

"'Without the 26 silent in April: 3 in 10.' Same number. So the dead accounts aren't what's
driving it. Good to know, I suppose."

**5. The ring's group.**
"Community 33. How do I know that's the ring? ... 'Watchlist members in it: 7 of 9.' OK, 7 of my 9
watchlist accounts are in there. That's the ring. The row was already selected for me; if it
weren't I'd have sorted the table looking for... what? The table doesn't show watchlist count. I'd
have gone down it by number and not known which. Lucky it's preselected."

"Also -- Community 33 in March and Community 33 in April -- the same number means the same group,
right? The legend in version history said names and colors are kept by overlap, so I'll believe
it."

"'March to April: 22 to 32.' 'New in April: 7.' 'Holds in April's 5 re-runs: 1.00.' So in every
rerun on April those 32 stay together. That's solid. That group is not an accident of one run."

"But -- 22 plus 7 is 29, not 32. So three came from somewhere else, from other March groups? And
did anyone leave? The table says change +10, new 7. I can't tell if it's 'gained 10, lost 0' or
'gained 13, lost 3'. For a mule ring that matters -- somebody dropping out of the ring is a story."

"And 'holds in April's re-runs' -- what about March's? If the March 22 were wobbly in March's
reruns, then 'it grew from 22' is shakier than it looks. There's no March column. The whole-graph
line gave me both months; the group line gives me one."

"'Holds 1.00', the column says '0 to 1'. Fine. Is 0.44 for Community 25 bad? No idea where the line
is. For the ring it's 1.00 so I don't care today."

**6. Where did the new seven come from.**
"There's 'Create set' and 'Add note...'. There's no link on 'new in April 7' -- I'd want to click
the 7 and see them. I'd guess Create set, then go select them." (Follow-up screen.) "OK, 7
selected, their edges: amounts around $9,800 each, going to ACC-893168, a merchant, and to
ring accounts. Sum $228,362. That's the ring moving money through new accounts. That, I believe.
That's a real change, and it's in the transfers, not in the algorithm."

"But I lost the comparison panel to get here. If I click Done, it said Done keeps nothing. Did I
save first? I'd hit Save comparison just in case -- and on this screen Done is the blue button and
Save is the outline one, so the screen is nudging me to throw it away. On the PageRank comparison
screen it's the other way round: Save is blue. Pick one."

**7. The PageRank comparison, for contrast.**
"This one is a scatter plot instead of two pictures, Spearman 0.76, top-50 overlap 49. And it
says 'PageRank gives the same result every run, so a re-run cannot tell change from noise.' OK --
that's honest. But it's a different-looking screen for the same kind of question. I'd have to
learn two."

## His answer to the moderator

"Mostly real. Two runs on the same month only keep about 6 in 10 pairs together, and March to April
keeps 3 in 10, so the months differ more than rerunning does. Part of the jump from 35 to 65 groups
is 26 dead accounts on their own. The ring's group -- Community 33, with 7 of my 9 watchlist
accounts -- went from 22 to 32, 7 of those are new accounts, and it stays together in all 5 April
reruns. The new accounts are pushing about $228k through the ring and a merchant. What I can't
tell you from the screen is whether anyone left the group, where the other three came from, or
whether the March version of it was stable in March's reruns."

**Single Ease Question (1-7): 4.** "I got an answer, but I had to do the maths in my head -- 3
against 6, 22 plus 7 -- and the badge in version history would have led me wrong if I'd stopped
there."

**Would he use this instead of his current tool?** "For this question, yes, probably. In NetworkX
I'd have to write a loop over five seeds, compute some agreement score, match groups by overlap
across months, and I'd still be in Gephi for the picture. Here the rerun baseline is just sitting
next to the number, and it ran nothing. That's the part I'd pay for. But I'd want the comparison
table in Excel -- I don't see an export on it, there's a '...' I'd try -- and I'd want 'who left'
and the March stability before I put Community 33 in a deck."

## Findings

| Screen | What happened | Severity (1 low - 4 blocks) |
|---|---|---|
| Version history | The "large change" badge on 65 communities (was 35) states a verdict with no rerun baseline; stopping there gives a wrong-or-lucky answer. | 3 |
| Comparison (Louvain), Community 33 | Change +10 with 7 new does not add up for him; no "left" or "moved in from other groups" count, so he cannot say whether anyone dropped out of the ring. | 3 |
| Comparison (Louvain), Community 33 | Stability is given only for April's reruns; no March stability, so "grew from 22" rests on an unqualified March group. | 2 |
| Comparison (Louvain), Agreement | April baseline is a range ("7 to 8 in 10"), March a single number; he suspects the two were computed differently. | 2 |
| Comparison (Louvain), Agreement | He reads 3 against 6 correctly but must do the "about twice the disagreement" step himself, and is not sure whether it counts as a lot. | 2 |
| Comparison (Louvain), difference table | Finding the ring's group depends on it being preselected; the table has no watchlist column, so he could not have found Community 33 on his own. | 2 |
| Comparison (Louvain), Community 33 | "new in April 7" is not clickable; he wants to click the 7 and see them. | 2 |
| Comparison (Louvain) vs Comparison (PageRank) | Button emphasis is reversed: Done primary on the Louvain surface, Save comparison primary on the PageRank one. On the Louvain one the screen nudges him to discard. | 2 |
| Version history vs weekly return | Project name ("Payments network review" vs "Case 0314, mule ring") and March version date (Apr 2 vs Apr 3) differ between screens; dents trust in the numbers. | 2 |
| Results, Louvain row | Compare with... is an unlabelled icon shown only on the highlighted row; he would right-click first. | 1 |
| Canvas legend | "19 carried on from March's 8 to 35, 39 new" is unreadable to him; the ring's group is hidden in grey "Other". | 2 |
| Comparison (Louvain), split canvas | Two hairballs with rings add little; he goes straight to the numbers. | 1 |

**What landed:** seeds named in the picker ("seeds 12 to 16") and "runs nothing"; the rerun baseline
sitting beside the month-to-month number; "26 of the new groups are single accounts with no April
transfers" explaining most of the jump; "holds in April's 5 re-runs 1.00"; the follow-up transfer
table with a column sum.
