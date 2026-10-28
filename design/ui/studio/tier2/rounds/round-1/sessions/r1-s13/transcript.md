# Session r1-s13 -- Elena (returning), task T17 prompt A (running club, friends.csv)

Build: 946256efb876 (frozen copy tier2-r1d4-946256efb). Tool: design/ui/studio/tool/real.mjs.

```
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/ node real.mjs --start <session> setup:friends-ranked.txt
-> 01.png
```

## Steps

-   1. I see the running club drawn as orange balls with arrows, and a PageRank thing on the left from last time. I need only pairs who ran 4+ times. The runs count is about the lines, so I'll look at Data on the left rail where the spreadsheet stuff was.

    ```
    --step --click "Data"
    /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s13/02.png
    ```

-   2. Data shows friends.csv, 20 nodes, 41 edges, and Edges have a 'weight' -- that must be the runs count. There's a 'Filters' heading with a plus. That sounds like what I want; I'll press the plus.

    ```
    --step --click-at 276,197
    at 276,197: button "Add filter step"
    ```

/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s13/03.png

```

- 3. A 'New filter step' panel opened on the right: Keep 'an attribute's value', then an empty Attribute box. I want the runs number, so I'll open Attribute.

```

--step --click "Attribute"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s13/04.png

```

- 4. The list shows Nodes: id and Edges: weight. Weight is the runs count, so I pick weight under Edges.

```

--step --click-at 1245,295
at 1245,295: option "weight"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s13/05.png

```

- 5. Now it reads 'weight' 'Is at least' and an empty Value, and the small print says it keeps lines that pass and the people at their ends. That's exactly what I want. I'll type 4.

```

--step --click "Value" --type "4"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s13/06.png

```

- 6. The 4 is in and the blue 'Add step' button lit up. Nothing changed in the drawing yet, so I guess I have to press Add step.

```

--step --click "Add step"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s13/07.png

```

- 7. It worked: lots of lines vanished, the top bar says '19 of 20 nodes', the filter row says 'weight is at least 4, 20 to 19 nodes', and the right side says Edges showing 12 of 41. So 19 people are still in it. I'm a little surprised only one person dropped out, but the pairs left are sparse and I can count roughly 19 balls, so I believe it. Answer: 19 people. Now to bring everyone back I'll untick the checkbox next to the filter.

```

--step --click-at 273,239
at 273,239: input "Apply step: weight is at least 4"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s13/08.png

```

- 8. Everyone is back: all the lines, Nodes 20, Edges 41, the '19 of 20' in the top bar is gone and the filter row says 'off'. First part done: 19 people for 4 or more runs, whole club back. [Follow-up given: 'Your club now asks the same for pairs who ran together 5 or more times. How many people are in the drawing then? Bring the whole club back when you are done.'] I'd rather change my existing filter than make a new one, so I'll click on the 'weight is at least 4' row to see if I can edit it.

```

--step --click-at 160,231
at 160,231: treeitem "weight is at least 4"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s13/09.png

```

- 9. Good, the same form came back on the right with Value 4 and a 'Save and turn on' button. I'll replace the 4 with 5.

```

--step --click "Value" --key Control+a --type "5"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s13/10.png

```

- 10. Value now says 5. I'll press 'Save and turn on'.

```

--step --click "Save and turn on"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s13/11.png

```

- 11. Now it says 'weight is at least 5, 20 to 10 nodes', the top says '10 of 20 nodes' and 5 of 41 lines. I can count 10 balls (two overlap at the bottom). So 10 people for 5 or more runs. Unticking the box again to bring the whole club back.

```

--step --click-at 273,239
at 273,239: input "Apply step: weight is at least 5"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s13/12.png

```

- 12. The whole club is back: all lines, Nodes 20, Edges 41, the filter row says 'off' and the count in the top bar is gone. Done with both parts.

```

--end
session ended: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s13

```

## At the end (in character)

**Did I finish?** Yes, both parts. Pairs who ran 4 or more times: 19 people still in the drawing
(12 of the 41 pairs). Pairs who ran 5 or more times: 10 people (5 pairs). Each time I brought the
whole club back by unticking the box next to the filter, and the drawing showed all 20 people and
41 lines again.

**Ease:** 6 out of 7.

**What went well.** The Data side listed "weight" under Edges, which I guessed was the runs count,
and the "Filters" heading with a plus was right there. The form read almost like a sentence
("Keep an attribute's value ... weight ... is at least ... 4"), and the small note "Keeps edges
that pass and the nodes at their ends" told me in advance that people with no strong pair would
drop out. After it ran, the top bar said "19 of 20 nodes" and the filter row said "20 to 19
nodes", so I did not have to count balls. Changing 4 to 5 was easy: clicking the row brought the
same form back.

**What confused me or slowed me down.**
- I had to know that "weight" means "how many runs together". The app calls it weight; my file's
column means runs. I guessed right because it was the only number on the lines.
- Nothing happened to the drawing when I typed 4 -- I had to press "Add step". "Step" made me
wonder for a second whether I was building some multi-part recipe rather than just hiding lines.
- "Nodes" and "edges" are the program's words; I think of people and pairs (or dots and lines).
- I was briefly surprised that only one person dropped out at 4 or more; I trusted the number
because the top bar and the filter row agreed.
- To bring everyone back I unticked a small checkbox; it worked and the row said "off", but I was
not sure at first whether unticking would delete my filter or just pause it. It just paused it,
which is what I wanted.
```
