# Session: why Valjean looks the way he does, and why a ranking does nothing -- Jordan (marketing network analyst)

Task as given: "Valjean is drawn dark brown and large. Work out what makes him dark and large. Then a ranking you made earlier seems to change nothing when you switch it on -- work out what is going on."

All commands run from design/ui/prototype. Renders are in tmp/round-7-sessions/t34--marketing-analyst/.

## Start screen (shots/tasks/t34/01.png)

"OK, Les Mis. There's a legend box up top: Color: PageRank, Size: Degree. So honestly the first half might be answered before I touch anything -- dark is high PageRank, big is lots of connections. But I don't trust a legend until I can see where it comes from. Left side is a list: PageRank, Louvain, Shortest paths, Watchlist, a 'For the report' folder with Betweenness in it, and the Betweenness one has a crossed-out eye. That's probably the ranking 'I made earlier'. I don't see a Degree row anywhere though. And down at the bottom: '1 hidden row still paints.' What does that mean? Hidden but still painting sounds like a bug report, not a feature."

## Step 1 -- click Valjean

    timeout 120 node app-b/study.mjs --try .../01.png task:t34 --click "Valjean"

"Oh, nice. Right panel: 'Why this look'. Notes -> label below, PageRank -> Color, Degree -> Size (Degree is grayed and italic), Group 2 -> label above, Selection -> Color and Size, Everything -> Shape. That is exactly what I'd want if a VP asked 'why is that one brown'. Valjean, 36 connections, under the map too. So: brown = PageRank, big = Degree. But Degree is gray -- I'm guessing that's the hidden row."

"Slight worry: Selection also says Color and Size. Did clicking him change his look? Can't tell from here. Moving on."

## Step 2 -- click Degree in that list

    timeout 120 node app-b/study.mjs --try .../02.png task:t34 --click "Valjean" --click "Degree"

"Yep. A Degree row popped into the list on the left, dimmed, between Watchlist and the report folder, with the note 'hidden row still paints; it shows dimmed here'. Right panel: Degree, size 0.5 to 3, paints 77 nodes. So somebody hid the Degree row from the list but it's still sizing everything. Fine -- that's the answer to part one. Dark brown = PageRank is high, large = Degree, which is a row that was hidden from the list but not switched off. I'd never have found that from the list alone; the 'Why this look' panel did it."

## Step 3 -- click Betweenness

    timeout 120 node app-b/study.mjs --try .../03.png task:t34 --click "Betweenness"

"Row lights up... but the right panel still says PageRank. Huh. Did I click the wrong thing? The highlight is clearly on Betweenness. Either this panel only follows certain clicks or it's broken. That's the kind of thing that makes me double-check every number afterwards."

## Step 4 -- hover the crossed-out eye on Betweenness

    timeout 120 node app-b/study.mjs --try .../04.png task:t34 --hover "Show Betweenness"

"Tooltip: 'Show Betweenness. Alt-click or Alt+Space: show only this row.' OK, so the eye switches it on. The show-only trick is good to know but I'd forget it."

## Step 5 -- switch Betweenness on

    timeout 120 node app-b/study.mjs --try .../05.png task:t34 --click "Show Betweenness"

"Eye is open now. Map: identical. Legend: still Color PageRank. No message, no toast, nothing. So this is the 'switch it on and nothing changes' thing. My gut says PageRank is also coloring, and it wins. Betweenness is blue-ish in its little swatch and the map is all orange, so whatever's on top is PageRank."

## Step 6 -- select Betweenness after switching it on

    timeout 120 node app-b/study.mjs --try .../06.png task:t34 --click "Show Betweenness" --click "Betweenness"

"I want the panel to tell me 'covered by PageRank' or something. It still shows PageRank's settings. It does say on PageRank: 'Covers Louvain for Color'. So the tool knows about covering -- it just doesn't mention Betweenness. Louvain sits below PageRank in the list and gets covered, Betweenness sits even further down, so... same deal? That's me reasoning it out, the screen never says it."

## Step 7 -- switch it on, then ask Valjean again

    timeout 120 node app-b/study.mjs --try .../07.png task:t34 --click "Show Betweenness" --click "Valjean"

"I wanted 'Why this look' to list Betweenness as covered. Instead the Betweenness eye is crossed out again -- clicking a node seems to have undone my switch? -- and the list doesn't mention Betweenness at all. Annoying. If it showed 'Betweenness -> Color (covered by PageRank)' I'd be done in two seconds."

## Step 8 -- switch Betweenness on and hide PageRank

    timeout 120 node app-b/study.mjs --try .../08.png task:t34 --click "Show Betweenness" --click "Hide PageRank"

"Test the theory: hide PageRank, Betweenness should show through. PageRank eye crossed out, Betweenness eye has no icon now... and the map is still orange, legend still says PageRank. OK, now I'm lost. Either hiding doesn't stop painting -- which is what that '1 hidden row still paints' line hints at -- or the map just doesn't refresh. Which is it? If hiding doesn't switch anything off, what does?"

## Step 9 -- hover Betweenness for any explanation

    timeout 120 node app-b/study.mjs --try .../09.png task:t34 --click "Show Betweenness" --hover "Betweenness"

"No tooltip. Nothing. I'm stopping here."

(Aside: "This is the Brandwatch thing all over again -- the dashboard says one thing, the export says another, and nobody can tell you which one is real. Last quarter I sent a VP a slide colored by the wrong metric because somebody had left a filter on. Same vibe.")

## Wrap-up

**Did I succeed?** Half. Part one, yes, and confidently: Valjean is dark brown because the PageRank row colors him (he has the top PageRank) and large because a Degree row sizes him -- that Degree row was hidden from the list but still paints. The 'Why this look' panel on the node gave me that straight. Part two, only by guessing: I think Betweenness does nothing because PageRank sits higher in the list and also paints color, so it covers Betweenness, the same way the panel says it 'Covers Louvain for Color'. But the app never told me that about Betweenness, selecting Betweenness kept showing PageRank's settings, and when I hid PageRank to test it the map still did not change. So I can't say I proved it.

**Single Ease Question:** 4 out of 7. The first half was a 6; the second half was a 2.

**Would I use this instead of my current tool?** Not yet. The 'Why this look' panel is something Gephi simply doesn't have, and it's the thing I'd actually want when a VP asks 'why is that one brown'. But a ranking that silently does nothing, a hidden row that still paints, and a hide button that seemingly changes nothing are exactly how I end up presenting the wrong metric. Fix it so the panel says 'covered by PageRank' on the covered row (and on the node), and I'd seriously consider it.
