# Session r3-s27 -- Dana Okafor (returning user)

Task: friends.csv is open. Find the chain from Chloe to Milo with the fewest people in between: who, in order, and how many introductions.

## Start

`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/ node design/ui/studio/tool/real.mjs --start <session> setup:friends-ranked.txt` -> 01.png

01: The running club list is open, a PageRank ranking colors and sizes the dots. No names on the dots. There is a search box "Find nodes, edges, values" top left, and a toolbar at the bottom (flask icon, a chart icon, 3D, magnifier). I'll type Chloe in the search box first -- that's what I always try.

## Step 2
`--step --click "Find nodes, edges, values" --type "Chloe"` -> 02.png

Search found Chloe: 1 node, 4 links -- Ava -> Chloe, Ben -> Chloe, Chloe -> Dev, Chloe -> Farah. Good, a table-ish list. I could chase Milo by hand link by link, but last time the flask button at the bottom was where the analysis lived. I'll open it and see if there's a "shortest chain between two people" kind of thing.

## Step 3
`--step --click-at 680,864` (button "Analyze") -> 03.png

A long list of rankings with one-line explanations -- Degree, Betweenness, Closeness, Katz... all "rank" things. I don't want a ranking, I want a chain from one person to another. There's a "Filter analyses" box, so I'll type "shortest".

## Step 4
`--step --type "shortest"` -> 04.png

"Shortest path -- The fewest steps ... between two nodes." That's the one, plain sentence. Clicking it.

## Step 5
`--step --click-at 566,806` (option "Shortest path") -> 05.png

A small form: From, To, Follow (Out / All, All is on), Weight None ("each edge counts as 1" -- fine, every introduction counts the same). Introductions go either way between friends, so All is right. I'll type Chloe in From.

## Step 6
`--step --click "Where the path starts" --type "Chloe"` -> 06.png

A dropdown offers "Chloe". Picking it, then typing Milo in To.

## Step 7
`--step --click-at 554,609 --click "Where the path ends" --type "Milo"` -> 07.png

From is Chloe. To shows Milo in the list. Picking Milo, then Find path.

## Step 8
`--step --click-at 550,663 --click "Find path"` -> 08.png

Done in one click. The path is drawn in black on the picture and, better, there's a table on the right: "Path 5 nodes, 4 edges", "Nodes in order": Chloe 1, Ava 2, Ivan 3, Kofi 4, Milo 5. The left list also shows "Shortest path 4 hops". The "Made with" box repeats what I asked (From Chloe, To Milo, Follow All, Weight None) so I can trust it was the run I meant. That's my answer; ending.

## End attempt 1
`--end` -> answered with a further request: "Ben now wants to be introduced to Nora the same way. Who is in that chain, in order, and how many introductions does it take?"

## Step 9
Same thing again with different names. I'll go back to the Analyze button; hopefully Shortest path is now under Recent.
`--step --click "Analyze"` -> 09.png

Shortest path is at the top under Recent. Clicking it.

## Step 10
`--step --click-at 566,448` (Recent: Shortest path) -> 10.png

Blank form again, Follow All still on. Fine -- a fresh form for new names. Typing Ben in From.

## Step 11
`--step --click "Where the path starts" --type "Ben"` -> 11.png

Ben offered. Picking it, then Nora in To.

## Step 12
`--step --click-at 549,609 --click "Where the path ends" --type "Nora"` -> 12.png

Nora offered. Picking it, Find path.

## Step 13
`--step --click-at 551,663 --click "Find path"` -> 13.png

Answer on the right: Nodes in order -- Ben 1, Theo 2, Ravi 3, Pia 4, Nora 5. "5 nodes, 4 edges", left list "Shortest path 4 hops", Made with From Ben To Nora. One thing I notice: the left list still has only ONE "Shortest path" row. My Chloe-to-Milo answer seems to have been replaced by this one rather than kept beside it. I wrote it down, so fine today, but if I wanted both in front of the VP I'd be annoyed -- I didn't ask it to throw the first one away. Ending.

## End
`--end` -> session ended.

## In my words (Dana)

- Finished: yes, both.
  - Chloe to Milo: Chloe -> Ava -> Ivan -> Kofi -> Milo. 4 introductions, 3 people in between (Ava, Ivan, Kofi).
  - Ben to Nora: Ben -> Theo -> Ravi -> Pia -> Nora. 4 introductions, 3 people in between (Theo, Ravi, Pia).
- Ease: 6 out of 7.
- What worked: typing "shortest" in the analysis filter found it right away, and the one-line "fewest steps between two nodes" told me what it does without any jargon. The From/To boxes suggest names as you type. The "Nodes in order" list with numbers is exactly the table I want -- I don't have to read a picture.
- What confused me / bothered me:
  - The dots have no names on them, so the black path on the picture is useless on its own; only the right-hand list tells me who is who.
  - Running the second chain replaced the first one in the left list -- there's still a single "Shortest path" row. I didn't ask to throw away Chloe-to-Milo. If I wanted both side by side for a meeting, I'd have to redo one.
  - "4 hops" on the left vs "5 nodes, 4 edges" on the right -- I worked out that hops = introductions, but "edges" and "hops" are two words for the same thing.
  - "Follow: Out / All" -- I guessed All because introductions go both ways; one line on what Out means would help.
  - Small grey labels in the side panel (Summary, Made with) are hard to read without my glasses.
