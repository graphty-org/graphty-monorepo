# Session r1-s03 -- Alex (regular analyst), task T20 A (bus stops)

Build 16dcf3494700, served from /home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1-16dcf3494/. Start: empty.

```
node design/ui/studio/tool/real.mjs --start design/ui/studio/tier2/rounds/round-1/sessions/r1-s03 empty
commit 34bfb1177289b3e485470d136042c8cd2218bd43, build 16dcf3494700 graphty@0.8.56
.../r1-s03/01.png
```

**Alex (01.png):** Same start screen as every week. It says files are read on this computer and never uploaded -- good, that's what I need for a colleague's file. There's the usage-data box again; I'll say no thanks, then "Open project or file..." and pick bus-stops.csv.

**Alex:** Dismiss the usage box, then open the colleague's file.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s03 '--click' 'No thanks' '--click' 'Open project or file' '--upload' 'bus-stops.csv'
a file chooser is open (answer it with --upload <file>)
chose the file bus-stops.csv
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s03/02.png
```

**Alex:** (02.png) It loaded straight in: 10 nodes, 17 edges, directed -- that matches 17 links between 10 stops. But it never asked me what the minutes column is. No stop names drawn either. I'll look at Data on the left rail to see what it made of the minutes column.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s03 '--click' 'Data'
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s03/03.png
```

**Alex:** (03.png) Data shows the source, 17 rows, and under Edges a number column 'minutes'. I want to tell it that minutes is the cost of a link. I'll click 'minutes' and see what it offers.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s03 '--click' 'minutes'
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s03/04.png
```

**Alex:** (04.png) The minutes panel: Edges, a blue 'Amount' tag and 'From the file', range 2 to 15. 'Amount' looks like it might be clickable -- maybe that's where you say what kind of number it is. Clicking it.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s03 '--click' 'Amount'
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s03/05.png
```

(Tooling note, not Alex: the next attempted step, a click at 1419,74, was sent through a shared helper script that another session had just overwritten with its own session folder, so the click landed in session r1-s01 at its 03.png instead of here. Nothing happened in this session; the step is repeated below with a helper only this session uses.)

**Alex:** (05.png) Nothing -- 'Amount' is just a label. There's a '...' at the top right of the minutes panel; maybe the settings for the column hide there.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s03 '--click-at' '1419,74'
at 1419,74: button "Attribute actions"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s03/06.png
```

**Alex:** (06.png) Only 'Filter to...' and 'Show in table'. Not it. In Gephi you set this at import, so I'll close this and click the source file entry under Sources -- maybe the import settings live there.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s03 '--key' 'Escape' '--click' 'bus-stops.c'
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s03/07.png
```

**Alex:** (07.png) The source just says 10 nodes, 17 edges added -- no import settings. A table opened at the bottom: Depot to Market 4, Market to Library 6, Library to Harbor 5, Depot to School 9... good, the minutes are there. Maybe the shortest-route thing asks which column to use. I'll open the analysis button in the toolbar like every week.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s03 '--click-at' '679,624'
at 679,624: button "Analyze"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s03/08.png
```

**Alex:** (08.png) The usual analysis list. I'd type the name rather than scroll: 'shortest'.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s03 '--type' 'shortest'
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s03/09.png
```

**Alex:** (09.png) 'Shortest path -- the fewest steps, or the lightest route, between two nodes.' Lightest route sounds like it uses a number. Opening it.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s03 '--click' 'Shortest path'
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s03/10.png
```

**Alex:** (10.png) From, To, and 'Weight: None'. So it did NOT pick up minutes on its own -- if I'd just hit Find path it would count stops. I'll open the Weight list and see what's in there.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s03 '--click' 'Weight'
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s03/11.png
```

**Alex:** (11.png) Options: None, or 'minutes (farther)'. Huh -- so it already thinks more minutes is farther? I never told it that. That's what I want, though. Picking it.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s03 '--click' 'minutes (farther)'
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s03/12.png
```

**Alex:** (12.png) Weight now says minutes. Now From: Depot.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s03 '--click' 'From' '--type' 'Depot'
ambiguous: "From" matches 2 controls (button "From", combobox ""); took the first
nothing that takes text has focus (focus is on button "From"); typed nothing, not "Depot"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s03/13.png
```

**Alex:** (13.png) Whoops, I hit the table's From column header instead -- the table sorted and the route box closed. I'll reopen the analysis button, go back to Shortest path and see if it kept my minutes choice.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s03 '--click' 'Analyze' '--type' 'shortest' '--click' 'Shortest path'
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s03/14.png
```

**Alex:** (14.png) It forgot: Weight is back to None. So picking minutes here is only for this one run -- not what I'd call 'every calculation'. I'll do the route first and hunt for a lasting setting after. Weight to minutes again, then click into the From box and type Depot.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s03 '--click' 'Weight' '--click' 'minutes (farther)' '--click-at' '667,408' '--type' 'Depot'
at 667,408: combobox
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s03/15.png
```

**Alex:** (15.png) Depot suggested; weight shows minutes (farther). Pick Depot, then the To box, Harbor.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s03 '--key' 'Enter' '--click-at' '667,462' '--type' 'Harbor' '--key' 'Enter'
at 667,462: combobox
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s03/16.png
```

**Alex:** (16.png) Depot to Harbor, weight minutes. Find path.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s03 '--click' 'Find path'
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s03/17.png
```

**Alex:** (17.png) There it is: Depot, Market, Park, Clinic, Harbor -- 5 stops, 4 links, 'Total distance 14'. And under 'Made with' it says 'Weight: minutes (farther)'. That's the receipt that it used the minutes. Sanity check: Depot-Market is 4 and Clinic-Harbor is 3 in the table, so the middle two add to 7; plausible. 'Distance 14' with no unit bugs me a bit -- it's 14 minutes. Now the 'every calculation' part: picking it each run isn't that. I'll look for a setting on the whole graph -- Graph on the left rail, then the '...' on the right panel.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s03 '--click' 'role=button:Graph' '--click-at' '1419,74'
at 1419,74: button "Path actions"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s03/18.png
```

**Alex:** (18.png) That menu was for the path result (move up/down, delete). Not it. I'll close it and click 'Everything' to get the whole-graph panel, then try its '...'.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s03 '--key' 'Escape' '--click' 'Everything' '--click-at' '1419,74'
at 1419,74: tablist "Style Values"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s03/19.png
```

**Alex:** (19.png) Everything is just styling -- color, size, shape. At the very start the right panel said 'Graph, From bus-stops.csv' with a '...' -- I'll click the 'bus-stops.csv' heading at the top left to get that panel back and open its '...'.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s03 '--click-at' '150,61' '--click-at' '1419,74'
at 150,61: span "bus-stops.csv"
at 1419,74: tablist "Style Values"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s03/20.png
```

**Alex:** (20.png) The heading isn't clickable; still on Everything. Main menu, top left, maybe there's a graph or import settings entry.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s03 '--click' 'Main menu'
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s03/21.png
```

**Alex:** (21.png) Menu: new project, open, save, export, settings, help. Nothing about columns. The start screen had 'New from data...' that I've never used -- sounds like an import with options, which is where Gephi asks this. I'll go back to start and try it. The route is easy to redo.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s03 '--click' 'Back to start'
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s03/22.png
```

**Alex:** (22.png) Good, it warns me. I already have the answer written down (Depot, Market, Park, Clinic, Harbor, 14), so Discard is fine. Then 'New from data...'.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s03 '--click' 'Discard' '--click' 'New from data'
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s03/23.png
```

**Alex:** (23.png) 'Open as a new graph' -- Tables, a direction setting, Load. This looks like the proper import screen. Choose a file: bus-stops.csv.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s03 '--click' 'choose a file' '--upload' 'bus-stops.csv'
ambiguous: "choose a file" matches 2 controls (button "choose a file...", p "Choose a file first"); took the first
a file chooser is open (answer it with --upload <file>)
chose the file bus-stops.csv
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s03/24.png
```

**Alex:** (24.png) This is it. 'Weight: none (each edge counts 1)' -- so the plain open treated every link as 1. Each column has a role: from is From -> node, to is To -> node, minutes is just 'Attribute'. I'll open the minutes dropdown.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s03 '--click' 'minutes'
ambiguous: "minutes" matches 2 controls (button "minutes", combobox "Attribute"); took the first
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s03/25.png
```

**Alex:** (25.png) I sorted the preview by minutes instead. Clicking the 'Attribute' dropdown under minutes itself.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s03 '--click-at' '728,225'
at 728,225: combobox
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s03/26.png
```

**Alex:** (26.png) Roles: From, To, Weight, Date or time, Edge id, Attribute. 'Weight' is the Gephi word for exactly this. Picking Weight.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s03 '--click' 'Weight'
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s03/27.png
```

**Alex:** (27.png) Now 'Weight: minutes' and a new row 'Higher means: Not set / Closer / Farther / Capacity', with a note that with Not set 'paths ignore it; PageRank and communities read it as larger = closer'. That's exactly the trap -- PageRank would treat a 15-minute link as a strong tie. More minutes is a longer trip, so: Farther.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s03 '--click' 'Farther'
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s03/28.png
```

**Alex:** (28.png) Farther is on; the note now reads 'smaller = closer'. Good. Still 10 nodes, 17 edges. I'll leave direction as the file says, same as before, and Load.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s03 '--click' 'Load'
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s03/29.png
```

**Alex:** (29.png) The overview now has a line 'Loaded weight: minutes (farther)' that wasn't there the first time. That's the graph-wide setting. Now Shortest path again -- I want to see if Weight starts on minutes by itself this time.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s03 '--click' 'Analyze' '--type' 'shortest' '--click' 'Shortest path'
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s03/30.png
```

**Alex:** (30.png) Weight already says 'minutes (farther, loaded)' without me touching it. That's what I wanted. Depot to Harbor, Find path.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s03 '--click-at' '667,408' '--type' 'Depot' '--key' 'Enter' '--click-at' '667,462' '--type' 'Harbor' '--key' 'Enter' '--click' 'Find path'
at 667,408: combobox
at 667,462: combobox
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s03/31.png
```

**Alex:** (31.png) Same route: Depot, Market, Park, Clinic, Harbor, 'Total distance 14', and 'Made with... Weight: minutes (farther)', and the Weight box says 'minutes (farther, loaded)'. The edge table got a 'Shortest path' Yes/No column. I want to see each leg's minutes to check the 14 adds up -- scrolling the table.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s03 '--wheel' '750,820,300'
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s03/32.png
```
