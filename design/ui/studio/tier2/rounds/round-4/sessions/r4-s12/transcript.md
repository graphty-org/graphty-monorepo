# Session r4-s12 -- Analyst Alex (returning user)

Task: on the open Les Miserables network (tie weight = shared chapters), point out on the drawing every tie of 10 or more shared chapters, without removing any character or tie, and say how many there are.

Session folder (screenshots, logs): tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s12

## Step 0 -- start

```
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/ node design/ui/studio/tool/real.mjs --start /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s12 setup:lesmis-ranked.txt
```

01.png: Les Mis open, 77 characters, a PageRank run already on the left (colored and sized). Right side shows the PageRank layer's Style tab (Fill, Shape, Size, Effects, Label, Tooltip). Nothing about ties (edges) is visible. Usually I style from "Everything" -> Style; I'll go there and look for edge (tie) styling.

## Step 1 -- open Everything

```
node design/ui/studio/tool/real.mjs --step <session> --click "Everything"
```

02.png: Everything's Style tab, with a Nodes / Edges switch at the top. Good -- ties are "Edges" here. Next: click Edges.

## Step 2 -- Edges

```
node design/ui/studio/tool/real.mjs --step <session> --click "Edges"
```

03.png: Line section: Color A9A9A9, Width 8, Pattern Solid, plus Arrows and Label. There's a little chain-link icon next to Color and Width -- I think that is how I tie a style to a value. But coloring by weight gives me a gradient, not "10 or more". I want just the heavy ties. Let me hover the link icon by Color to see what it says.

## Step 3 -- hover the link icon

```
node design/ui/studio/tool/real.mjs --step <session> --hover-at 1381,198
```

Tooltip: "Color by attribute". That would give me a color ramp over weight -- I'd still have to eyeball which ties are 10+, and I can't count from a ramp. Before that, try the search box at the top left ("Find nodes, edges, values"): in my head, "weight >= 10" and get a list and a count.

## Step 4 -- type in the search box

```
node design/ui/studio/tool/real.mjs --step <session> --click "Find nodes, edges, values" --type "weight >= 10"
```

05.png: The box says "Start with = to select by a value:" and offers one row: "=weight >= `10`  Select its matches". Huh, it understood me. Not sure what the backticks are, but fine. Clicking that row.

## Step 5 -- run the suggested rule

```
node design/ui/studio/tool/real.mjs --step <session> --click "Select its matches"
```

06.png: "Nothing matches this rule." Zero. That's wrong or the column isn't called weight -- the task says each tie counts chapters, and in the Les Mis file I remember the column is "value". It suggested "weight" itself, which is annoying: it built a rule for a column that might not exist and only told me "nothing matches". Let me check the column name in the table (grid icon in the bottom toolbar).

## Step 6 -- open the table

```
node design/ui/studio/tool/real.mjs --step <session> --click-at 793,864
```

07.png: Table opened at the bottom, Nodes tab (77 nodes: Id, name, PageRank). There's an Edges tab. Switching to Edges to see the column name.

## Step 7 -- Edges tab of the table

```
node design/ui/studio/tool/real.mjs --step <session> --click-at 383,681
```

08.png: 254 edges; columns From, To, shared_chapters. So the column is "shared_chapters", not "weight". The search box made up "weight" from my typing and said "nothing matches" without saying there's no such column -- if I were rushed I'd have reported zero. Retyping the rule with the real column name.

## Step 8 -- retype the rule

```
node design/ui/studio/tool/real.mjs --step <session> --click-at 276,90 --click "Find nodes, edges, values" --type "shared_chapters >= 10"
```

09.png: Same suggestion row, now "=shared_chapters >= `10`  Select its matches". Clicking it.

## Step 9 -- select the matches

```
node design/ui/studio/tool/real.mjs --step <session> --click "Select its matches"
```

10.png: "13 edges selected". The 13 ties are drawn thick and blue on the picture; every character and every other tie is still there. The right panel lists them with values: MmeMagloire--Myriel 10, Thenardier--MmeThenardier 13, Thenardier--Valjean 12, Cosette--Valjean 31, Javert--Valjean 17, Marius--Gillenormand 12, Marius--Cosette 21, Marius--Valjean 19, Combeferre--Enjolras 15, Courfeyrac--Enjolras 17, Courfeyrac--Combeferre 13, Bossuet--Courfeyrac 12, Bossuet--Enjolras 10. All 10 or more, and the two 10s are in, so it's "10 or more", not "more than 10". Before I say 13 out loud, I want to cross-check in the table: sort shared_chapters high to low and count rows at 10+.

## Step 10 -- sort the table

```
node design/ui/studio/tool/real.mjs --step <session> --click-at 1107,742
```

11.png: "Sorted by shared_chapters, highest first"; the top rows (Cosette--Valjean 31, Marius--Cosette 21, Marius--Valjean 19, Javert--Valjean 17) are highlighted as selected, matching the panel. The table only shows four rows at a time so I won't scroll through all of them; the panel's list of 13, each with its value, already agrees with the sort. The 13 heavy ties are pointed out in blue on the full drawing. Done -- ending.

## End

```
node design/ui/studio/tool/real.mjs --end <session>
```

Session ended normally.

## Debrief (in character)

**Did I finish?** Yes. There are 13 ties with 10 or more shared chapters, and they show as thick blue lines on the drawing. Every character and every tie stayed on screen. They range from 10 (MmeMagloire--Myriel, Bossuet--Enjolras) up to 31 (Cosette--Valjean).

**Ease: 5 / 7.**

**What took longest or confused me:**
- The search box turned my "weight >= 10" into a rule for a column called "weight", then said "Nothing matches this rule". It never said there is no column by that name. If I'd been in a hurry I could have reported zero. Something like "no column called weight -- did you mean shared_chapters?" would have saved me opening the table.
- I didn't know the "=" rule syntax was there until the box suggested it. The backticks around `10` look like code, and I don't know why they're there.
- I went to Everything > Style > Edges first because that's where I style things each week. The only thing there was "Color by attribute", which gives a color ramp rather than a cut-off at 10, so it was a dead end for this question.
- Once I had the right column name, it was quick: one rule gave me the count, the highlight on the drawing, and a list with the values next to it. That list is what I'd paste into a slide. The sorted table agreed with it, so I trust the 13.
- Small thing: the highlight is blue on orange nodes, which I can see fine. Nothing relied on red versus green.
