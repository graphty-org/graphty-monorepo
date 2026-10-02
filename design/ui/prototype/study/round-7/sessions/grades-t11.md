# Grades: compare March's rings with April's

The task: "Last month you picked out rings of accounts in March's data. April's data is in now.
How much did the rings change between the two months, and which ones grew the most?"

The intended path: open the graph switcher (the "Transfers" dropdown at the top of the left
panel) and choose Compare graphs..., or choose Compare with another run... from the "..." menu
on the Louvain row. The comparison opens with March's Louvain run on the left and April's on
the right. Read the agreement (0.449, against 0.759 to 0.768 for reruns of March on the same
data), the community counts (35 and 65: 26 matched pairs, 13 new groups holding 773 accounts,
26 one-account groups, 9 gone) and the largest size changes (Community 1 297 to 359, Community
27 52 to 107). Then press Keep as row, or say why not.

Grading rule: success means the comparison was opened, those three blocks were read correctly,
and the comparison was kept as a row or the participant said why not. Success with difficulty
means the same end after a wrong turn (the Analyze picker, the table, or any other detour), a
long search or a hover hint. Failure means comparing by eye between two separate drawings, or
reading the agreement as a share of accounts that stayed put. Grades go by what was on screen
and what they concluded, not by how they rated themselves.

## Results

| Participant | Their own verdict | Grade | Why |
|---|---|---|---|
| Fraud analyst | success with difficulty | success with difficulty | Title menu, then the Data panel, then the switcher, then Compare graphs... (04.png). Read all three blocks correctly; Community 1 most by count, Community 27 doubled. Pressed Keep as row and saw "Added Louvain: March vs April to the Graph tree" (07.png). Said "about half agreement where a rerun would be about three-quarters" -- loose, but tied to the rerun band, not to a share of accounts. |
| Expert network scientist | success with difficulty | success with difficulty | Title menu, the Data panel, then "Add data to this graph", which she rejected because it would merge the months, then the switcher and Compare graphs... (07.png). Read all three blocks and checked that the counts add up. Did not keep it ("I guess saves the comparison. I did not try it; I have my answer"). Then followed the "April data" link out of the comparison (09.png), which is a skeleton defect, below. |
| Marketing analyst | success with difficulty | success with difficulty | About four minutes in the Data panel: opened the March file's mapping, the graph "..." menu, then Add > File..., which offered March again under "Open as a new graph". Then the switcher and Compare graphs... (09.png). Read all three blocks, separated the 26 one-account groups from the 39 real ones. Pressed Keep as row (11.png). |
| Bioinformatics researcher | success with difficulty | success with difficulty | One look at the title menu, then the switcher and Compare graphs... (03.png) -- the shortest route anyone took. Read all three blocks correctly and reported both absolute and relative growth. Never mentioned Keep as row. Ended in an unrelated project after the "April data" link (06.png); the answer was already given and correct. |
| Business analyst | success | success with difficulty | Title menu, then the Data panel, then the switcher and Compare graphs... (05.png). Read all three blocks correctly and wrote the cleanest one-line answer of the round. Did not keep it, and said why: "'Keep as row', which I don't know what that means." Two detours before the switcher, so with difficulty. |
| ML engineer | success with difficulty | success with difficulty | The longest search: title menu, the Data panel, the March file's import editor, the app menu's Open recent, then a click on "from Louvain, Sep 28" that opened the Analyze picker, then Add > File..., and finally Compare with another run... from the Louvain row's "..." menu (13.png). Read all three blocks correctly and added that the 13 new groups are missing from the growth list. Never pressed Keep as row. |

Totals: 0 success, 6 success with difficulty, 0 failure, 0 gave up. Nobody compared by eye.
Nobody read 0.449 as a percentage. All six used the rerun band to say the change was real and
not just Louvain randomness. The comparison screen works. Getting to it does not. Their ease
scores were 4, 4, 5, 5, 5 and 5 out of 7, and every one of them took the point off for finding
the screen, not for reading it.

## Findings

Severity is Nielsen's scale: 4 catastrophe, 3 major, 2 minor, 1 cosmetic.

1. **No one went to Compare first (6 of 6); all six opened the project title menu.** Four then
   went to the Data panel to load April, and two of them went through Add > File..., which
   offered the March file again under "Open as a new graph". The switcher's Compare graphs...
   was found only by elimination, and it lists one graph only. The run row's Compare with another
   run... was found by one person, after the most detours. The task is about two months of
   data, and the first places people look (the project menu, Sources) say nothing about April or
   about comparing. Severity 3.

2. **April's data and run appear only inside the comparison (6 of 6 surprised).** Every
   participant said some form of "somebody already loaded April". The switcher lists one graph,
   Sources lists only March files, and Open recent has no April. That is partly a seeding
   problem in the task: it says April "is in", but the skeleton never shows where. The real gap
   is that nothing outside the comparison says a second dataset or run exists. Severity 3.

3. **April's run settings cannot be checked (4 of 6 asked: the expert, bioinformatics, ML,
   business analyst).** They wanted to know whether April used the same weight, seed and filter
   as March, and said 0.449 means nothing until they do. The run picker does not show settings,
   and the "April data" link did not open them. Severity 3. The comparison is only trustworthy
   when both sides were run the same way.

4. **The "April data" link leaves the comparison and lands in an unrelated project (2 of 2 who
   clicked it).** In the skeleton it routes to the run row's earlier-result state, which is
   drawn on the Les Miserables sample. So the wrong project is a skeleton defect, not a design
   finding. The intent behind both clicks (show me how April was made) is a real need, covered
   by finding 3. Fix the route before the next round. Severity 2 as a skeleton defect.

5. **The agreement measure has no name (5 of 6: everyone except the fraud analyst).** All five
   wanted to know whether it is adjusted Rand or NMI, because they need to cite it. The 0-to-1
   scale and the rerun band were enough for everyone to read it correctly, and nobody read it as
   a percentage. Severity 2.

6. **Keep as row is unclear (kept by 2 of 6; 2 said "row" or "Graph tree" meant nothing to
   them, and a third could only guess).** The fraud analyst and the marketing analyst pressed it
   and understood only "it saved it somewhere". The business analyst left it alone because the
   label meant nothing to him. The expert guessed that it saves the comparison and did not try
   it. The other two never mentioned it. No one asked for a row. They
   asked for a CSV of the size-change table (4 of 6). Severity 2.

7. **The size-change list has no change or percent column and does not say how it is sorted
   (6 of 6 did the subtraction themselves).** Everyone gave two "grew most" answers, Community 1
   by count and Community 27 by rate, and four said the rate is the one that matters for rings.
   The ML engineer noted that the 13 new groups (773 accounts) are not in the list at all.
   Severity 2.

8. **Clicking a community in the size-change list shows no visible selection (6 of 6 who
   clicked).** The toast says "Select Community 27 on both sides", but both 3,000-node drawings
   look unchanged at this size. Everyone wanted the list of the 55 accounts that joined, not a
   highlight. The two drawings side by side were called "useless" or "soup" by four
   participants. Severity 2. A list of who joined, left or moved is the next step people
   expected, and the drawings do not stand in for it.

9. **The filter note in the Data panel raised doubt about the numbers (4 of 6).** When the Data
   panel showed "812 of 3,000 nodes" under an "amount is at least 1,000" filter, people asked
   whether Louvain ran on 812 or 3,000 accounts. The comparison says 3,000, but nobody connected
   the two. Severity 1 for this task. It matters wherever a number is quoted.

## Method notes

- All six participants were on the same skeleton build and started from the same screen. With
  six sessions, a finding seen by 4 or more is solid. Findings 6 and 9 rest on fewer voices and
  should be checked again next round.
- No grade changed because of the skeleton defect in finding 4. Both participants who hit it had
  already given a correct answer.
