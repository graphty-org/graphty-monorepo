# Session r1-s01 -- Dev (returning student), task T20 A (bus stops)

Build: 16dcf3494700, served from `/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1-16dcf3494/`.

Task as given: a colleague sent bus-stops.csv (each row a bus link between two stops and the minutes it
takes). Bring it in so every calculation treats more minutes as a longer trip, then find the quickest
way from Depot to Harbor: which stops in order, and how many minutes in all. Show where the program
says it used the minutes.

```
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1-16dcf3494/ node design/ui/studio/tool/real.mjs --start design/ui/studio/tier2/rounds/round-1/sessions/r1-s01 empty
commit 34bfb1177289b3e485470d136042c8cd2218bd43, build 16dcf3494700 graphty@0.8.56
.../r1-s01/01.png
```

**Dev (01.png):** Okay, the start screen, same as last time. There's the "your data" box at the bottom again -- I'll say no thanks like before, then open the file the way I opened the class spreadsheet.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s01 --click "No thanks"
.../r1-s01/02.png
```

**Dev (02.png):** Box gone. Last time I used "Open project or file..." for the class sheet, so I'll do that again and pick bus-stops.csv.

**Dev:** (05.png) Nothing -- 'Amount' is just a label. There's a '...' at the top right of the minutes panel; maybe the settings for the column hide there.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s01 --click-at 1419\,74
at 1419,74: main "Start Open project or file... Ctrl+O New from data"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s01/03.png
```

**Dev:** Opening the file the same way as the first assignment.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s01 --click Open\ project\ or\ file... --upload bus-stops.csv
a file chooser is open (answer it with --upload <file>)
chose the file bus-stops.csv
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s01/04.png
```

**Dev (04.png):** Oh, it just drew it straight away -- 10 stops, 17 links, "Directed". It didn't ask me anything about the minutes, same as my class sheet's third column last time. Wait, I need it to know the minutes mean a longer trip. No names on the dots either. Let me look at the Data tab on the left to see if it even read the minutes column.

**Dev:** Checking the Data tab to see what it did with the minutes.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s01 --click Data
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s01/05.png
```

(03.png is the moment the file chooser opened, saved by the tool before the upload.)

**Dev (05.png):** Okay, Data shows the file: 17 rows, and under Edges there's "minutes" with a # sign, so it read it as a number at least. But does it know more minutes = longer? I'll click "minutes" and see if there's something about how it's used.

**Dev:** Clicking the minutes column under Edges.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s01 --click minutes
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s01/06.png
```

**Dev (06.png):** Right side now says minutes, Edges, range 2 to 15, and two little blue tags: "Amount" and "From the file". Amount... is that how it's going to use it? An amount sounds like "more of something", not "longer". The tag looks clickable, so I'll try clicking "Amount".

**Dev:** Clicking the Amount tag.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s01 --click Amount
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s01/07.png
```

**Dev (07.png):** Nothing changed. So it's just a label. Let me hover over "Amount" in case it explains what that means.

**Dev:** Hovering Amount for a hint.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s01 --hover Amount
tooltip: null
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s01/08.png
```

**Dev (08.png):** No hint at all. There's a "..." up in the corner of the minutes panel. Software always hides settings in those, so I'll try it.

**Dev:** Opening the ... menu next to minutes.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s01 --click-at 1419\,73
at 1419,73: button "Attribute actions"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s01/09.png
```

**Dev (09.png):** Just "Filter to..." and "Show in table". Nothing about how it reads the number. That's two tries on the minutes column. Hmm, maybe it's about how the file was brought in -- the Sources row "bus-stops.c... 17 rows". I'll close this menu and click the file under Sources.

**Dev:** Closing the menu, clicking the file under Sources.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s01 --key Escape --click-at 150\,136
at 150,136: treeitem "bus-stops.csv"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s01/10.png
```

**Dev (10.png):** The file panel just says it added 10 nodes and 17 edges. A table opened at the bottom though -- From, To, minutes: Depot to Market 4, Market to Library 6, Library to Harbor 5, Depot to School 9. Good, I can add those up myself later to check. Nothing here about how it reads minutes, so I'll do what I did last time: the analysis button in the toolbar (the flask), and look for a "route" or "quickest way" thing. If its answer looks wrong I'll hunt for a setting.

**Dev:** Opening the analysis button (flask) in the toolbar.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s01 --click-at 679\,624
at 679,624: button "Analyze"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s01/11.png
```

**Dev (11.png):** The analyses list, like last time: Degree, Betweenness, PageRank "Start here"... it's a long list of rankings. I want a route, not a ranking. There's a filter box at the top -- I'll type "route".

**Dev:** Typing route into the analysis filter.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s01 --type route
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s01/12.png
```

**Dev (12.png):** "Shortest path -- The fewest steps, or the lightest route, between two nodes." That's the one. "Lightest route" is a weird word for minutes though -- lightest? But it says "or", so maybe it can use my minutes. Clicking it.

**Dev:** Clicking Shortest path.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s01 --click Shortest\ path
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s01/13.png
```

**Dev (13.png):** From, To, and "Weight: None". Okay, "Weight" -- the Gephi tutorial talked about weight columns, so I think that's where my minutes go. First I'll type Depot in From.

**Dev:** Typing Depot into From.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s01 --click From --type Depot
ambiguous: "From" matches 2 controls (button "From", combobox ""); took the first
nothing that takes text has focus (focus is on button "From"); typed nothing, not "Depot"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s01/14.png
```

**Dev (14.png):** Oops -- I hit the "From" column header in the table instead of the box, so the table sorted and the Shortest path box closed. (Facilitator note: the click by name landed on the table header that shares the label; my mistake in aiming, not the app's.) Bonus: sorted table shows Depot to Market 4, Depot to School 9, Depot to Station 15, Clinic to Harbor 3. Reopening Shortest path and clicking straight into the From text box.

**Dev:** Reopening Shortest path and typing Depot in the From box.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s01 --click Analyze --type route --click Shortest\ path --click Type\ a\ node\'s\ name --type Depot
ambiguous: "Type a node's name" matches 2 controls (combobox "", combobox ""); took the first
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s01/15.png
```

**Dev (15.png):** It suggests "Depot". Picking it, then typing Harbor in the To box.

**Dev:** Choosing Depot, then typing Harbor in To.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s01 --click-at 555\,439 --click Type\ a\ node\'s\ name --type Harbor
at 555,439: option "Depot"
ambiguous: "Type a node's name" matches 2 controls (combobox "Depot", combobox ""); took the first
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s01/16.png
```

**Dev (16.png):** Ugh, it went into the From box again: "DepotHarbor". (Facilitator note: the two boxes share the same hint text, so my click by name took the first one; aiming slip.) Clearing From with the little x, typing Depot again.

**Dev:** Clearing From and typing Depot again.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s01 --click-at 824\,408 --click Type\ a\ node\'s\ name --type Depot
at 824,408: button "Clear From"
ambiguous: "Type a node's name" matches 2 controls (combobox "", combobox ""); took the first
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s01/17.png
```

**Dev (17.png):** Depot is suggested again. Picking it, and this time I'll click right on the To box underneath.

**Dev:** Choosing Depot, clicking the To box, typing Harbor.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s01 --click-at 555\,439 --click Type\ a\ node\'s\ name#2 --type Harbor
at 555,439: option "Depot"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s01/18.png
```

**Dev (18.png):** Depot in From, Harbor suggested in To. Picking Harbor. Then the Weight menu -- I'll open it and see if minutes is in there.

**Dev:** Choosing Harbor, opening the Weight menu.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s01 --click-at 557\,493 --click Weight
at 557,493: option "Harbor"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s01/19.png
```

**Dev (19.png):** Oh nice -- "minutes (farther)". So it already thinks more minutes = farther. That's exactly what I need. Picking it and pressing Find path.

**Dev:** Choosing minutes (farther), then Find path.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s01 --click minutes\ \(farther\) --click Find\ path
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s01/20.png
```

**Dev (20.png):** Oh nice, that's it! Orange route on the drawing, and the right side says: Path 5 nodes, 4 edges, "Total distance 14", Nodes in order: Depot, Market, Park, Clinic, Harbor. And under "Made with" it says "Weight: minutes (farther)", Source Depot, Target Harbor -- that's the proof for my instructor. The table got a "Shortest path" Yes/No column too. Clinic to Harbor is 3 and Depot to Market is 4. Let me check the other two legs: I'll sort the table by that "Shortest path" column so the Yes rows come together.

**Dev:** Sorting the table by the Shortest path column.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s01 --click-at 617\,742
at 617,742: button "Shortest path"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s01/21.png
```

**Dev (21.png):** Sorted, the four Yes rows are together: Depot to Market 4, Market to Park 3, Park to Clinic 4, Clinic to Harbor 3. 4 + 3 + 4 + 3 = 14. That matches "Total distance 14". And the obvious-looking way, Depot to Market to Library to Harbor, is 4 + 6 + 5 = 15, so going through Park and Clinic really is quicker. Common sense agrees. I'm done.

```
node design/ui/studio/tool/real.mjs --end design/ui/studio/tier2/rounds/round-1/sessions/r1-s01
session ended: .../r1-s01
```

## At the end, in Dev's words

**Did I finish?** Yes. The quickest way from Depot to Harbor is Depot, Market, Park, Clinic, Harbor:
14 minutes in all (4 + 3 + 4 + 3). The place the program says it used the minutes is the right-hand
panel of the Shortest path result, under "Made with": "Weight: minutes (farther)", with Source
Depot and Target Harbor, and a Weight menu still set to "minutes (farther)". Essay sentence: "Using
travel minutes as the cost of each link, the quickest route from Depot to Harbor is Depot - Market -
Park - Clinic - Harbor, 14 minutes in total, one minute quicker than the route through Library."

**Ease: 5 out of 7.** Once I found Shortest path it was easy and the proof was right there. The
hard part was the start.

**What confused me:**

- When I opened the file it never asked me anything about the minutes column, so I couldn't "bring
  it in" the way the task said. I went looking in the Data tab: the minutes column only showed two
  tags, "Amount" and "From the file". Clicking "Amount" did nothing and hovering it showed no hint,
  and the column's "..." menu only had "Filter to..." and "Show in table". So I never found a way to
  say "more minutes = longer" when bringing the file in. I only found out it already thought that
  when I opened the Weight menu in Shortest path and saw "minutes (farther)".
- "Amount" made me nervous: an amount sounds like "more is more", not "more is farther". The tag
  and the "(farther)" in the Weight menu don't obviously say the same thing.
- I still don't know if "every calculation" uses the minutes, or only Shortest path because I picked
  it there. Weight started at "None", so I'd guess the others don't unless I pick it each time.
- The Shortest path description says "the lightest route". Lightest is a strange word for minutes;
  I almost didn't trust it.
- The From and To boxes have the same hint text ("Type a node's name"), and the To box sits right
  under From's suggestion list; I typed Harbor into From once by mistake and got "DepotHarbor".
- The dots have no names on the drawing, so the orange route only made sense with the list on the
  right.
