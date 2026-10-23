# Session r5-s49b -- Explorer Elena, returning user

Task: Ava is planning a party and wants to invite the people she runs with, and the people they run with. How many people is that, not counting Ava? Then change the drawing so it has only Ava and those people.

Build: /home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ (setup:friends-ranked.txt, started for me)

## 01.png (start)
I see friends.csv open, orange dots of different sizes with arrows, no names on them. A PageRank row on the left. I remember the find box -- I'll type Ava there.

### Step 1
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ node design/ui/studio/tool/real.mjs --step tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s49b --click "Find nodes, edges, values" --type "Ava"`
02.png: The find box shows Ava and six lines: Ava -> Ben, Chloe, Dev, and Sana, Theo, Ivan -> Ava. So six people she runs with. Now I need their friends too. I'll click Ava to see her on the right.

### Step 2
`--click "Ava"` -- refused as ambiguous (the list rows all contain Ava), nothing happened.
`--click "Ava#1"`
04.png: Ava is the little dot near the middle, glowing. Right side says Degree 6 and PageRank #20 of 20 -- huh, so Ava is the least popular runner, the smallest dot. Funny for the party planner. There's a little arrow next to Degree 6; last time I read connections on the right, so I'll open that.

### Step 3
`--click "Degree"`
05.png: "Ava and 6 connections", her six runners lit up yellow on the picture. There's a Hops 1 / 2 / 3 thing -- 2 sounds like "the people they run with". Follow is on All, which I think means both ways. I'll click 2.

### Step 4
`--click "2"` -- refused as ambiguous (also matched Dev's weight 2), nothing happened.
`--click "role=radio:2"`
07.png: Now it says "Ava and 14 connections", and Selection on the left says 15 (Ava plus 14, adds up). The list is Ben, Chloe, Dev, Eli, Farah, Gus, Hana, Ivan, Jada, Kofi, Quinn, Ravi, Sana, Theo. So 14 people besides Ava. Now to make the drawing only these -- there's a "Filter to neighbors" button right there. Clicking it.

### Step 5
`--click "Filter to neighbors"`
08.png: The five dots at the top right are gone. Top bar now says "15 of 20 nodes" -- Ava plus her 14. The legend says "PageRank, full graph". The button went grey, so I guess it's applied. That's what Ava wanted. I'm done; ending.

### End
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ node design/ui/studio/tool/real.mjs --end tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s49b` -- session ended, no further request.

## Debrief (in character)

- **Did I finish?** Yes. 14 people, not counting Ava (Ben, Chloe, Dev, Eli, Farah, Gus, Hana, Ivan, Jada, Kofi, Quinn, Ravi, Sana, Theo). The drawing now shows only those 15 -- the top bar says "15 of 20 nodes".
- **Ease:** 6 of 7. Find box, click Ava, the little arrow by "Degree 6", then "2", then the filter button. Pretty quick.
- **What confused me:**
  - I would never have guessed that the "Degree 6" row with a tiny arrow is where the "people she's connected to" view lives. I only went there because I remembered reading connections on the right last time. I don't know what "Degree" means.
  - "Hops" -- I guessed 2 meant friends-of-friends because 1 showed only her six. It worked but the word is odd.
  - "Follow: Out / In / All" -- I left it on All. I'm not sure if "runs with" should be one direction; the arrows on the lines worry me a bit. If it had been on Out I might have gotten a different number and not known.
  - Ava came out "#20 of 20" and the smallest dot, so I figured she's the least popular runner in the club. Kind of sad for the party host.
  - After filtering, the button went grey and nothing told me how to get the other five back; I assume undo would.
