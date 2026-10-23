# Session r2-s20 -- Jordan (regular analyst), task T17, dataset B (Les Miserables)

Build: 8f0d5a6f7791 (frozen at /home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/)

```
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/ node real.mjs --start r2-s20 setup:lesmis-ranked.txt
commit 8f0d5a6f77911a0093a614457ac3c9db5fde3235, build 8f0d5a6f7791 graphty@0.8.61
.../r2-s20/01.png
```

**Jordan (01.png):** Les Miserables is open, colored and sized by a PageRank run I apparently did. I need only the pairs who share 5+ chapters. That's a number on the ties -- I have never done anything by tie numbers here. First I'll check Data to see what the tie column is called.

**Jordan:** Opening Data in the left rail to see what the ties carry.

```
node real.mjs --step r2-s20 --click Data 
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s20/02.png
```

**Jordan:** 02.png: Data shows 77 nodes, 254 edges, edges have shared_chapters, and a 'Filters' row with a plus. Like Gephi's filters -- I'll click that plus.

```
node real.mjs --step r2-s20 --click-at 276\,285 
at 276,285: button "Add filter step"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s20/03.png
```

**Jordan:** 03.png: a 'New filter step' panel on the right: Keep 'an attribute's value', Attribute empty. I'll open the Attribute list and pick shared_chapters.

```
node real.mjs --step r2-s20 --click Attribute 
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s20/04.png
```

**Jordan:** 04.png: the list shows Nodes id/name and Edges shared_chapters. Picking shared_chapters under Edges.

```
node real.mjs --step r2-s20 --click-at 1270\,319 
at 1270,319: option "shared_chapters"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s20/05.png
```

**Jordan:** 05.png: now Is = 'at least' and an empty Value box; the hint says it keeps edges that pass and the nodes at their ends -- exactly what I want. Clicking Value.

```
node real.mjs --step r2-s20 --click Value 
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s20/06.png
```

**Jordan:** Typing 5.

```
node real.mjs --step r2-s20 --type 5 
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s20/07.png
```

**Jordan:** 07.png: Value 5, 'Add step' is now blue. Clicking it.

```
node real.mjs --step r2-s20 --click Add\ step 
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s20/08.png
```

**Jordan:** 08.png: the drawing shrank; top bar and right panel both say 26 of 77 nodes (51 of 254 edges). So 26 characters. Now to bring everyone back I'll untick the checkbox beside the filter step on the left.

```
node real.mjs --step r2-s20 --click-at 274\,327 
at 274,327: input "Apply step: shared_chapters is at least 5"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s20/09.png
```

**Jordan (09.png):** Everyone is back -- 77 nodes, 254 edges, the step says "off" and is still there to reuse. Telling the facilitator: "Done. 26 characters share 5 or more chapters with someone; all 77 are back."

```
node real.mjs --end r2-s20
(exit 3) follow-up: "Now the same for pairs who share 8 or more chapters: how many characters are in the drawing then? Bring every character back when you are done."
```

**Jordan:** Follow-up: 8 or more. Rather than make a new step, I'll click on my existing step's text to see if I can change 5 to 8.

```
node real.mjs --step r2-s20 --click-at 185\,319 
at 185,319: treeitem "shared_chapters is at least 5"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s20/10.png
```

**Jordan:** 10.png: the step opens on the right with Value 5 and a 'Save and turn on' button. Nice. I'll click into Value, select it and type 8.

```
node real.mjs --step r2-s20 --click Value 
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s20/11.png
```

**Jordan:** Selecting the 5.

```
node real.mjs --step r2-s20 --key Control+a 
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s20/12.png
```

**Jordan:** Typing 8.

```
node real.mjs --step r2-s20 --type 8 
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s20/13.png
```

**Jordan:** 13.png: Value now reads 8. Clicking 'Save and turn on'.

```
node real.mjs --step r2-s20 --click Save\ and\ turn\ on 
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s20/14.png
```

**Jordan:** 14.png: 17 of 77 nodes, 19 of 254 edges, step now reads 'at least 8'. Answer: 17 characters. Unticking the step again to bring everyone back.

```
node real.mjs --step r2-s20 --click-at 274\,327 
at 274,327: input "Apply step: shared_chapters is at least 8"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s20/15.png
```

**Jordan (15.png):** All 77 characters and 254 ties are back, step off and kept. Telling the facilitator: "17 characters share 8 or more chapters with someone; everyone is back."

```
node real.mjs --end r2-s20
session ended: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s20
(exit 0)
```

## Debrief (Jordan, in character)

- **Did I finish?** Yes, both parts. 5 or more chapters: 26 of 77 characters (51 of 254 ties). 8 or more: 17 of 77 characters (19 of 254 ties). Both times I brought all 77 back.
- **Ease:** 6 of 7.
- **What worked:** I'd never touched tie numbers in this program, but the Data tab listed shared_chapters right under Edges and had a "Filters" row with a plus -- that's the word I'd look for coming from Gephi. The form defaulted to "at least", and the line "Keeps edges that pass and the nodes at their ends" told me in advance it would drop characters left with no ties, which is the count I was asked for. The "26 of 77 nodes" in the top bar and "Nodes showing" on the right gave me the number without counting dots. Changing 5 to 8 by clicking the step and "Save and turn on" was quicker than building a new one, and a checkbox to switch everything back is what I'd expect.
- **What confused me / small gripes:**
  - Getting started took a guess. With the Graph tab open there was no sign that filtering existed; I only found it because I went to Data to look up the column name. A first-timer who stays on Graph could miss it.
  - The legend still says "PageRank on 77 nodes" while only 26 are drawn. I'd want to know whether the colors and sizes were worked out on the whole cast or just on who's left. For an essay figure that matters.
  - The checkbox tick is small, and nothing on it says "turn off" until I read "off" underneath after clicking. I worked it out, but I wasn't sure it wouldn't delete the step.
  - When the step is turned on, the right panel jumps from the step's form to the Graph overview. That was handy for the count, but it also meant the step's settings disappeared from view.
