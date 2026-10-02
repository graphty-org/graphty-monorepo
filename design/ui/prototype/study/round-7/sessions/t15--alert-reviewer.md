# Session: apply a colleague's recipe -- alert reviewer (Nadia)

Task as given: "A colleague in another team emailed you their team's colors and analysis steps,
saved from their own copy of graphty, with none of their data. Put them to use on the transfers
you have open, and make sure everything in them landed on something."

Start screen: shots/tasks/t15/01.png. Renders: tmp/round-7-sessions/t15--alert-reviewer/NN.png.
All commands run from design/ui/prototype; each replays from the start screen.

## Transcript

**01 (start screen).** "A file from another team. Colors and steps. I'd look for Import or Open.
The graph is a gray blob, list on the left says Selection, Notes, Everything."

**02.** `timeout 120 node app-b/study.mjs --try .../02.png task:t15 --hover "Menu"`
Tooltip: "Main menu". "Top-left menu, that's where files live."

**03.** `--click "Main menu"`
New project, Open..., Open recent, Select where..., Settings, Keyboard shortcuts, Help.
"Open... would open THEIR project instead of mine, I think. No 'Import'. Not touching it."

**04.** `--click "Style"`
Right panel Style tab: Background, Print-safe colors, Layout method, Seed. "Colors are style, but
nothing here takes someone else's file."

**05.** `--hover "More"`
Picked the right panel's dots: "More actions (Shift+F10)". "I wanted the dots by the search
box on the left, got the one on the right. Fine."

**06.** `--click "More actions"`
Select all visible, Invert selection, Fit, Re-run layout, Unpin all, Add node, Add note,
Clear graph data. "Nothing about bringing anything in. And 'Clear graph data' sits right there --
not going near it."

**07.** `--click "Views"`
"No saved views." "A saved setup from someone else sounds like a view. Nope, empty."

**08.** `--click "Views" --hover "Views actions"` -> nothing on screen is called "Views actions".

**09.** `--click "Views" --hover "More"` -> tooltip "More for views".

**10.** `--click "Views" --click "More for views"`
Only "Export tour video... Save a view first". "Not mine."

**11-12.** `--hover "More for"`, then `--hover` "More for layers" / "More for the graph" /
"Graph actions" / "More for graph` -> each: nothing on screen is called that.
"I just want the three dots next to the search box on the left and I can't find what it's
called." (A real user would click it directly; I could not reach it by any name I tried.)

**13.** `--click "Analyze"`
Analyze picker: Louvain, PageRank, Shortest path, Links (count)... "Their 'analysis steps' --
maybe I load them here. It's a list of methods, one at a time. Not a file."

**14.** `--click "Analyze" --type "import"` -> screen unchanged (no typing). "Search box didn't
take anything. Anyway this is for picking a method, not loading a file."

**15.** `--click "Transfers, March 2026"`
Project menu: Rename, Save, Save as..., Export..., **Apply recipe or style file...**, Version
history, Close project. "There it is. Took me five places to find it. I would not have looked
under the project name -- that's where I rename things."

**16.** `... --click "Apply recipe or style file..."`
Dialog "Apply recipe: Mule ring triage", file mule-ring-triage.graphty, saved Mar 28 2026.
"Brings: styles, 1 set, 3 runs. You supply: a network with an account column." Rows it adds:
Watchlist (Outline, 19 accounts), Personalized PageRank from Watchlist (Color, Weight: loaded
weight), Max flow Watchlist to merchants (Flow edges), Cycles up to 4 transfers (Cycle edges,
speech bubble 1), riskScore (Color), alertRule (Label). Header "4 of 4 matched by name and type".
"Six rows, '4 of 4 matched'. Four of WHAT? There are six lines. Which two don't count? Watchlist
says 19 accounts -- the email said none of their data, so are those their accounts or mine? Are
they on my screen? It doesn't say. And 'loaded weight' -- loaded from where?"

**17.** `... --click "Show all"`
Now each row shows its match: fee -> fee, time -> timestamp, riskScore -> riskScore, alertRule ->
alertRule. "OK, the four are columns. Their 'time' went to my 'timestamp' -- right guess. But the
Watchlist's 19 accounts still say nothing about whether any of them exist in my month. That's the
one I'd actually care about. Bubble '1' on Cycles is probably a note from them; I can't open it
from here. Says one undo step, so I'll apply and check."

**18.** `... --click "Apply"`
Toast: "Mule ring triage added 6 rows on top of the tree [Undo]". "What tree? My list on the left
still says Selection, Notes, Everything. Graph is still gray. The bubble at the top still says
'Nothing is colored or sized by a row'. So did it do anything?"

**19.** `... --click "Apply" --key Escape --click "Graph"`
Screen now shows Louvain (35 groups) and Links in (count) rows, colored dots, Louvain run
"Sep 28". "Whoa -- now there's color, but it's Louvain and 'Links in'. That's not what their file
had. None of Watchlist, PageRank, Max flow, Cycles, riskScore, alertRule is in my list. Did Escape
undo their stuff and bring back something else? I have no idea what just happened to my
project."

**20.** `... --click "Apply" --click "Everything"`
List still Selection, Notes, Everything. Everything's style says Color 6366F1 (purple) but the
dots are gray. "Six rows added, zero rows I can see."

**21.** `... --click "Apply" --click "Transfers"`
Graph dropdown: just "Transfers 3,000 nodes" and "Compare graphs...". "Only one graph, so they
didn't go somewhere else. I'm done."

Stopped here: gave up.

## Outcome

- **Succeeded?** No. I found the apply dialog and pressed Apply, but I cannot see any of the six
  things from their file in my list or on the graph, so I can't say anything "landed". The
  dialog's "4 of 4 matched" told me about columns, not about whether the Watchlist's 19 accounts
  exist in my data, which is the part I'd have to defend.
- **Single Ease Question:** 2 of 7. Five wrong places before finding it under the project name,
  then a confirmation that nothing on screen backs up.
- **Would I use this instead of my current tool?** No. I don't have a graph tool -- I have the
  case system and a spreadsheet. Sarah's team sending me their setup would only help if I could
  apply it in one click and then see, row by row, what it hit on my alert's account. Here the
  dialog said "added 6 rows" and my screen says "nothing is colored". QA would ask what I looked
  at, and I couldn't tell them. It also took longer than clearing an alert.

## Problems seen (in her words, then plainly)

1. "Took me five places to find it." The way to bring in someone else's colors and steps lives
   only in the project-name menu, next to Rename and Save; not in the main menu (which has
   Open...), not in Style, not in the graph's More actions, not in Views.
2. "Four of WHAT?" The header "4 of 4 matched" sits over six rows; it counts column matches, not
   rows, and doesn't say so until Show all.
3. "Are those their accounts or mine?" The Watchlist row says 19 accounts but not how many are in
   the open data -- the one check the task asked for.
4. "Loaded weight -- loaded from where?" Unexplained term in the PageRank row.
5. "Added 6 rows" but the list, the canvas and the "Nothing is colored or sized by a row" chip
   all stay unchanged after Apply.
6. Pressing Escape after Apply produced a different set of rows (Louvain, Links in) and color --
   not the colleague's rows -- with no message saying what happened.
7. "Everything" lists its fill as 6366F1 (purple) while every dot on the canvas is gray.
8. The three-dot button next to the left search box could not be found by any name tried.
