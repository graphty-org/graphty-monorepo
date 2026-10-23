# Session r2-s29 -- Dev (returning student), task T18 prompt A (running club, friends.csv)

Commands run from the session folder with
`T=design/ui/studio/tool`, `S=design/ui/studio/tier2/rounds/round-2/sessions/r2-s29`,
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/`.

## Start

`REAL_DIST=... node $T/real.mjs --start $S setup:friends-ranked.txt`

01.png -- The club file is open from last time: orange balls sized by PageRank, no names on them. "Okay, it remembers my ranking. But I need a chain from Chloe to Milo... I don't even see names. Last time the rankings lived under the beaker button in the toolbar, so I'll try that first."

## Step 2

`node $T/real.mjs --step $S --click-at 680,864`

02.png -- A list of analyses with a filter box at the top: PageRank, Degree, Betweenness, Closeness... all rankings. "These are all 'rank nodes'. I want a chain between two people. Let me type what I want into the filter box."

## Step 3

`node $T/real.mjs --step $S --type "chain"`

03.png -- "Oh nice, 'chain' found it: 'Shortest path -- The fewest steps, or the shortest path by weight, between two nodes.' Fewest steps is exactly what I want. Clicking it."

## Step 4

`node $T/real.mjs --step $S --click "Shortest path"`

04.png -- A form: From, To, Follow (Out / All, All is on), Weight "None" with "Each edge counts as 1". "Each edge counts as 1 -- that's fewest introductions, good, I don't want the weight column here. 'All' I guess means either direction, which is right for people who run together. I'll put Chloe in From."

## Step 5

`node $T/real.mjs --step $S --click "Where the path starts" --type "Chloe"`

05.png -- A suggestion "Chloe" drops down under the box. "There she is. Picking her."

## Step 6

`node $T/real.mjs --step $S --click-at 555,593`

06.png -- Chloe is in From and the cursor jumped to To on its own. "Handy. Now Milo."

## Step 7

`node $T/real.mjs --step $S --type "Milo"`

07.png -- "Milo" suggestion appears. "Pick him, then Find path."

## Step 8

`node $T/real.mjs --step $S --click-at 550,647 --click "Find path"`

08.png -- "Oh nice, that's it." The path is drawn in black on the map, the left list has "Shortest path 4 hops", and the right panel says Path: 5 nodes, 4 edges; Nodes in order: Chloe 1, Ava 2, Ivan 3, Kofi 4, Milo 5. Under "Made with" it shows From Chloe, To Milo, Follow All, Weight None, "Each edge counts as 1". "That's my proof for the instructor -- it says exactly what it used, and it matches what I meant: every tie counts the same, either direction. I can't see the names on the black dots in the drawing, but the list is in order, so I trust it. Four ties, so four introductions: Chloe to Ava, Ava to Ivan, Ivan to Kofi, Kofi to Milo, with three people in between."

Essay sentence: "The chain with the fewest people in between runs Chloe - Ava - Ivan - Kofi - Milo: three go-betweens and four introductions."

Main prompt done. Follow-up (given as written in the task): "Ben now wants to be introduced to Nora the same way. Who is in that chain, in order, and how many introductions does it take?"

"Same thing, different people. Back to the beaker button."

## Step 9

`node $T/real.mjs --step $S --click "Analyze"`

09.png -- "Shortest path" is now at the top under Recent. "Easy, clicking it."

## Step 10

`node $T/real.mjs --step $S --click-at 565,448`

10.png -- Same form, empty again, Follow still All, Weight None. "Wait, will this replace my Chloe one? Doesn't matter much, I already wrote it down. Ben in From."

## Step 11

`node $T/real.mjs --step $S --click "Where the path starts" --type "Ben"`

11.png -- "Ben" suggested. "Pick Ben, then type Nora in To like last time."

## Step 12

`node $T/real.mjs --step $S --click-at 549,593 --type "Nora"`

12.png -- Ben in From, "Nora" suggested under To. "Pick Nora, Find path."

## Step 13

`node $T/real.mjs --step $S --click-at 551,647 --click "Find path"`

13.png -- New black path: Ben, Theo, Ravi, Pia, Nora, "Path 5 nodes, 4 edges", Made with From Ben, To Nora, Follow All, Weight None. "Same shape as before: four ties, so four introductions, with Theo, Ravi and Pia in between." The left list still has just one "Shortest path 4 hops" row, and the Chloe chain is gone from the right panel and the map. "Wait -- so it replaced my Chloe one instead of keeping both. I'd wanted both for the write-up. I wrote Chloe's down already, so fine, but I'd have liked a second row I could click back to. I didn't look for a way to keep both."

Essay sentence: "Ben reaches Nora through Theo, Ravi and Pia: four introductions."

## End

`node $T/real.mjs --end $S` -- the first `--end` printed the follow-up request as the next step (I had already done it, reading it from the task sheet), so I ran `--end` again and it closed.

## Debrief (in character)

- **Did I finish?** Yes, both. Chloe to Milo: Chloe - Ava - Ivan - Kofi - Milo, three people in between, four introductions. Ben to Nora: Ben - Theo - Ravi - Pia - Nora, four introductions.
- **Ease: 6 / 7.** I typed "chain" into the analysis filter on a guess and it went straight to "Shortest path", which said "the fewest steps" right under the name. Picking people by typing their names was quick, and the answer panel listed them in order with numbers, plus a "Made with" box showing exactly what it used (every tie counts as 1, either direction). That box is the proof I wanted for my instructor.
- **What confused me / what I'd change:**
  - I can't see any names on the map, so I couldn't match the black dots to people without the side list. I believed the list, but for the figure I'd need to turn names on.
  - "Follow: Out / All" -- I guessed All meant "either direction". It was already on, so I left it, but I wasn't sure what "Out" would do to friends who "run together".
  - "4 hops" in the left list and "5 nodes, 4 edges" on the right are the same answer said two ways; I had to work out myself that edges = introductions and people in between = nodes minus 2.
  - Running the second chain quietly replaced the first. I'd expected the Chloe one to stay as its own row so I could show both.
  - The Weight box said '"weight" has no meaning set' -- I didn't need weight here, so I skipped it, but that sentence went over my head.
