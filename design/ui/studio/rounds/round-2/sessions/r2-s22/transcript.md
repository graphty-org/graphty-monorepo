# Session r2-s22 -- Morgan (screen-reader analyst), T12 Prompt A (Les Miserables)

Screen-reader mode: no screenshots read; keyboard, typing and the tool's focus/live lines only.

```
node tool/real.mjs --start rounds/round-2/sessions/r2-s22 empty --sr
focus: nothing (the page itself)
```

**Start:** Nothing is focused and nothing was spoken. The page is silent. I'll press Tab to find the first control.

**Before:** Page silent. Tab to find the first control.

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Tab
focus: button "Main menu"
(a screenshot was kept for the graders)
```

**Before:** Focus on 'Main menu'. Keep tabbing to learn what's on the page (tab 1).

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Tab
focus: button "Local only"
(a screenshot was kept for the graders)
```

**Before:** Focus on 'Main menu'. Keep tabbing to learn what's on the page (tab 2).

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Tab
focus: button "Open project or file... Ctrl+O"
(a screenshot was kept for the graders)
```

**Before:** Focus on 'Main menu'. Keep tabbing to learn what's on the page (tab 3).

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Tab
focus: button "New from data..."
(a screenshot was kept for the graders)
```

**Before:** Focus on 'Main menu'. Keep tabbing to learn what's on the page (tab 4).

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Tab
focus: button "Open the Les Miserables sample"
(a screenshot was kept for the graders)
```

**Before:** Focus on 'Main menu'. Keep tabbing to learn what's on the page (tab 5).

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Tab
focus: button "Open the Zachary's karate club sample"
(a screenshot was kept for the graders)
```

**Before:** Focus on 'Main menu'. Keep tabbing to learn what's on the page (tab 6).

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Tab
focus: button "Open the College football sample"
(a screenshot was kept for the graders)
```

**Before:** Tabs told me: Local only, Open project or file, New from data, then three sample buttons. I passed Les Miserables; Shift+Tab twice to return to it.

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Shift+Tab --key Shift+Tab
focus: button "Open the Zachary's karate club sample"
focus: button "Open the Les Miserables sample"
(a screenshot was kept for the graders)
```

**Before:** On 'Open the Les Miserables sample'. Press Enter to open it.

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Enter
focus: Canvas (no name)
live: status (polite): "No nodes to draw"
live: status (polite): "Reading Les Miserables"
(a screenshot was kept for the graders)
```

**Before:** Focus landed on an unnamed Canvas; it said 'No nodes to draw' then 'Reading Les Miserables'. Wait a moment for it to finish loading.

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --wait 3000
focus: Canvas (no name)
(a screenshot was kept for the graders)
```

**Before:** Still an unnamed canvas, and nothing told me it finished loading or how big it is. Tab to see what comes after the canvas.

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Tab
focus: button "Analyze"
(a screenshot was kept for the graders)
```

**Before:** Keep tabbing past 'Analyze' to map the workspace, looking for a find or node list (tab 1).

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Tab
focus: button "From Les Miserables"
(a screenshot was kept for the graders)
```

**Before:** Keep tabbing past 'Analyze' to map the workspace, looking for a find or node list (tab 2).

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Tab
focus: button "Graph actions"
(a screenshot was kept for the graders)
```

**Before:** Keep tabbing past 'Analyze' to map the workspace, looking for a find or node list (tab 3).

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Tab
focus: tab "Values" selected
(a screenshot was kept for the graders)
```

**Before:** Keep tabbing past 'Analyze' to map the workspace, looking for a find or node list (tab 4).

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Tab
focus: button "Collapse Overview" expanded
(a screenshot was kept for the graders)
```

**Before:** Keep tabbing past 'Analyze' to map the workspace, looking for a find or node list (tab 5).

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Tab
focus: separator "Resize inspector" value "240"
(a screenshot was kept for the graders)
```

**Before:** Past the inspector's 'Values' tab and Overview. No find box yet; keep tabbing (tab 1).

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Tab
focus: nothing (the page itself)
(a screenshot was kept for the graders)
```

**Before:** Past the inspector's 'Values' tab and Overview. No find box yet; keep tabbing (tab 2).

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Tab
focus: button "Main menu"
(a screenshot was kept for the graders)
```

**Before:** Past the inspector's 'Values' tab and Overview. No find box yet; keep tabbing (tab 3).

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Tab
focus: button "Project: Les Miserables"
(a screenshot was kept for the graders)
```

**Before:** Past the inspector's 'Values' tab and Overview. No find box yet; keep tabbing (tab 4).

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Tab
focus: button "Undo"
(a screenshot was kept for the graders)
```

**Before:** Past the inspector's 'Values' tab and Overview. No find box yet; keep tabbing (tab 5).

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Tab
focus: button "Redo" disabled
(a screenshot was kept for the graders)
```

**Before:** Past the inspector's 'Values' tab and Overview. No find box yet; keep tabbing (tab 6).

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Tab
focus: button "Local only"
(a screenshot was kept for the graders)
```

**Before:** Full tab cycle: Main menu, Project, Undo, Redo, Local only, canvas, Analyze, From Les Miserables, Graph actions, Values tab, Collapse Overview, Resize inspector. No find box. Try Control+F in case the app has its own find.

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Control+f
focus: button "Local only"
(a screenshot was kept for the graders)
```

**Before:** Control+F did nothing the app announced. Tab to the canvas and then 'Graph actions' to see if a find is in that menu.

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Tab --key Tab --key Tab --key Tab
focus: button "Graph"
focus: combobox "Find"
focus: treeitem "Selection"
focus: separator "Resize left panel" value "240"
(a screenshot was kept for the graders)
```

**Before:** Different this time: a 'Graph' button, a 'Find' combobox, a tree with 'Selection', then 'Resize left panel'. Maybe Control+F opened a left panel. Shift+Tab back to Find and type Javert.

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Shift+Tab --key Shift+Tab --type Javert
focus: treeitem "Selection"
focus: combobox "Find"
focus: combobox "Find" value "Javert" expanded
(a screenshot was kept for the graders)
```

**Before:** Find says 'Javert', expanded, but no count of matches was spoken. ArrowDown into the list.

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key ArrowDown
focus: combobox "Find" value "Javert" expanded
(a screenshot was kept for the graders)
```

**Before:** ArrowDown said nothing new -- no option read out. Press Enter and hope it picks Javert.

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Enter
focus: group "Summary values"
(a screenshot was kept for the graders)
```

**Before:** Enter moved me to a group 'Summary values' -- no 'Javert selected' spoken. Maybe it is his details. Tab to read inside it.

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Tab
focus: button "Degree 17"
(a screenshot was kept for the graders)
```

**Before:** 'Degree 17' -- probably Javert's, though nothing confirmed the name. Tab on to read the rest of his values (tab 1).

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Tab
focus: separator "Resize inspector" value "240"
(a screenshot was kept for the graders)
```

**Before:** 'Degree 17' -- probably Javert's, though nothing confirmed the name. Tab on to read the rest of his values (tab 2).

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Tab
focus: nothing (the page itself)
(a screenshot was kept for the graders)
```

**Before:** 'Degree 17' -- probably Javert's, though nothing confirmed the name. Tab on to read the rest of his values (tab 3).

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Tab
focus: button "Main menu"
(a screenshot was kept for the graders)
```

**Before:** 'Degree 17' -- probably Javert's, though nothing confirmed the name. Tab on to read the rest of his values (tab 4).

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Tab
focus: button "Project: Les Miserables"
(a screenshot was kept for the graders)
```

**Before:** 'Degree 17' -- probably Javert's, though nothing confirmed the name. Tab on to read the rest of his values (tab 5).

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Tab
focus: button "Undo"
(a screenshot was kept for the graders)
```

**Before:** 'Degree 17' -- probably Javert's, though nothing confirmed the name. Tab on to read the rest of his values (tab 6).

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Tab
focus: button "Redo" disabled
(a screenshot was kept for the graders)
```

**Before:** Only one value was reachable: 'Degree 17'. It's a button, so maybe it lists who he's tied to. Shift+Tab back to it.

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab
focus: button "Undo"
focus: button "Project: Les Miserables"
focus: button "Main menu"
focus: nothing (the page itself)
focus: separator "Resize inspector" value "240"
focus: button "Degree 17"
(a screenshot was kept for the graders)
```

**Before:** On 'Degree 17'. Press Enter to see whether it lists his neighbors.

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Enter
focus: region "Javert's 17 connections"
(a screenshot was kept for the graders)
```

**Before:** Region 'Javert's 17 connections' -- first confirmation it is Javert. Tab into the list to read names (tab 1).

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Tab
focus: button "Babet"
(a screenshot was kept for the graders)
```

**Before:** Region 'Javert's 17 connections' -- first confirmation it is Javert. Tab into the list to read names (tab 2).

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Tab
focus: button "Bamatabois"
(a screenshot was kept for the graders)
```

**Before:** Region 'Javert's 17 connections' -- first confirmation it is Javert. Tab into the list to read names (tab 3).

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Tab
focus: button "Claquesous"
(a screenshot was kept for the graders)
```

**Before:** Region 'Javert's 17 connections' -- first confirmation it is Javert. Tab into the list to read names (tab 4).

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Tab
focus: button "Cosette"
(a screenshot was kept for the graders)
```

**Before:** Names in alphabetical order, one button each: Babet, Bamatabois, Claquesous, Cosette. Keep tabbing through the rest of the list.

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s22 --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab
focus: button "Enjolras"
focus: button "Fantine"
focus: button "Fauchelevent"
focus: button "Gavroche"
focus: button "Gueulemer"
focus: button "MmeThenardier"
focus: button "Montparnasse"
focus: button "Simplice"
focus: button "Thenardier"
focus: button "Toussaint"
focus: button "Valjean"
focus: button "Woman1"
focus: button "Woman2"
focus: separator "Resize inspector" value "240"
focus: nothing (the page itself)
(a screenshot was kept for the graders)
```

**Before:** I count 17 names, which matches "Javert's 17 connections". Done; ending the session.

```
node tool/real.mjs --end rounds/round-2/sessions/r2-s22
session ended: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s22
```

## Answer

Javert shares chapters with 17 characters: Babet, Bamatabois, Claquesous, Cosette, Enjolras,
Fantine, Fauchelevent, Gavroche, Gueulemer, MmeThenardier, Montparnasse, Simplice, Thenardier,
Toussaint, Valjean, Woman1, Woman2. (I counted the list myself; it matches the region's title.)

What the program told me about him: degree 17. That is the only value I could reach by keyboard.

## Debrief (in character, Morgan)

- **Finished?** Yes, both parts: the names and the count. The "read what the program knows about
  him" part only partly -- the one value I could tab to was "Degree 17". If the panel holds
  anything else (a group, a centrality, how many chapters each tie is), Tab never landed on it,
  and with only keys and no browse mode I cannot tell whether it is there.
- **Rating:** 4 of 7. The end was good; the start was a coin toss.
- **What worked:** the start page reads cleanly -- "Open the Les Miserables sample" is a plain
  button. Once I reached "Degree 17", pressing it gave me a region named "Javert's 17
  connections" and a list of named buttons in alphabetical order. That is exactly the shape I
  want: a count and a list I can walk.
- **What confused me:**
  - After opening the sample, focus sat on an unnamed "Canvas" and the app said "No nodes to
    draw" then "Reading Les Miserables" -- and never said it had finished, nor how many characters
    and ties it loaded. I had to guess when it was ready.
  - My first full lap of Tab never reached a find box. Only after I pressed Control+F (which
    announced nothing) did a second lap show "Graph", "Find" and a "Selection" tree. I do not know
    whether Control+F opened that panel or whether I simply missed it; either way, nothing told me.
  - In Find, typing "Javert" and pressing ArrowDown read no option and no match count. I pressed
    Enter blind. It worked, but focus jumped to a group "Summary values" without saying whose
    values. Nothing said "Javert selected" until I opened the connections region.
  - "Degree 17" as a button is not something I would have guessed opens the neighbor list; I
    pressed it because it was the only thing there. "Degree" also comes without a definition --
    on a weighted graph I want to know whether that is a count of characters or a sum of chapters.
  - The ties' weights (how many chapters each pair shares) were not spoken in the list, so "shares
    chapters with" is answered as "who", not "how much".
  - Tab wraps through "nothing (the page itself)" once per lap, a dead stop with no name.
