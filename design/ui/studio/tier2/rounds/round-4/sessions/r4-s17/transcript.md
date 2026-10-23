# Session r4-s17 -- Analyst Alex (returning user)

Task: in friends.csv (already open), find the chain from Chloe to Milo with the fewest people in between: who, in order, and how many introductions.

Session folder: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s17

## Step 1 -- start
Command: `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/ node design/ui/studio/tool/real.mjs --start <session> setup:friends-ranked.txt`
Screenshot 01.png. Alex: "Right, friends.csv, sized and colored by PageRank from last time. No names on the dots though. Shortest path is a standard thing -- it should be under the analysis button (the flask) in the toolbar, same place I ran rankings."

## Step 2 -- open Analyze
Command: `--step <session> --click-at 615,864` (button "Analyze")
Screenshot 02.png. Alex: "The analysis list with a filter box. Long list of rankings. I'll just type 'path' instead of scrolling."

## Step 3 -- filter "path"
Command: `--step <session> --type "path"`
Screenshot 03.png. Alex: "There it is: 'Shortest path -- the fewest steps, or the shortest path by weight, between two nodes.' Fewest steps is what I want. Clicking it."

## Step 4 -- choose Shortest path
Command: `--step <session> --click-at 500,630`
Screenshot 04.png. Alex: "A From / To form. Follow is set to All, weight None -- good, introductions go both ways and I want the fewest people, not the weights. The From box already has the cursor; typing Chloe."

## Step 5 -- type Chloe
Command: `--step <session> --type "Chloe"`
Screenshot 05.png. Alex: "One match, Chloe. Picking it."

## Step 6 -- pick Chloe
Command: `--step <session> --click-at 490,609`
Screenshot 06.png. Alex: "From is Chloe, and the cursor jumped to To on its own. Nice. Typing Milo."

## Step 7 -- type Milo
Command: `--step <session> --type "Milo"`
Screenshot 07.png. Alex: "Milo is suggested. Picking it, then Find path."

## Step 8 -- pick Milo
Command: `--step <session> --click-at 485,663`
Screenshot 08.png. Alex: "Chloe to Milo, All directions, weight None. Find path has focus. Clicking it."

## Step 9 -- Find path
Command: `--step <session> --click "Find path"`
Screenshot 09.png. Alex: "That's it. Path drawn in black on the canvas, and the right panel lists it: Summary 'Path 5 nodes, 4 edges'; Nodes in order Chloe 1, Ava 2, Ivan 3, Kofi 4, Milo 5. Left list now has 'Shortest path -- 4 hops'. Made with: From Chloe, To Milo, Follow All, Weight None -- the settings are recorded, which is what I'd want if my manager asks. My PageRank coloring is still there underneath. I'm done; ending."

## Step 10 -- first --end
Command: `--end <session>` (exit 3). Follow-up request: "Ben now wants to be introduced to Nora the same way. Who is in that chain, in order, and how many introductions does it take?"
Alex: "Same thing again for Ben to Nora. I'll open Analyze again -- hopefully Shortest path is under Recent now."

## Step 11 -- reopen Analyze
Command: `--step <session> --click "Analyze"`
Screenshot 10.png. Alex: "Shortest path is at the top of Recent. Clicking it."

## Step 12 -- Shortest path form again
Command: `--step <session> --click-at 500,448`
Screenshot 11.png. Alex: "Fresh form, empty From and To, same All / None defaults. Cursor in From. Typing Ben."

## Step 13 -- type Ben
Command: `--step <session> --type "Ben"`
Screenshot 12.png. Alex: "Ben suggested. Pick him; the cursor should jump to To like before, so I'll type Nora straight after."

## Step 14 -- pick Ben, type Nora
Command: `--step <session> --click-at 485,609 --type "Nora"`
Screenshot 13.png. Alex: "Ben in From, Nora suggested in To. Pick Nora, then Find path."

## Step 15 -- pick Nora, Find path
Command: `--step <session> --click-at 486,663 --click "Find path"`
Screenshot 14.png. Alex: "Ben, Theo, Ravi, Pia, Nora -- 5 nodes, 4 edges, 4 hops, ran 3:12:36. New path drawn in black. One thing: the Chloe-to-Milo path is gone. The left list still shows a single 'Shortest path -- 4 hops' row, and the canvas only shows the Ben route. So the second run replaced the first rather than sitting beside it. Fine today since I wrote the first answer down, but if I'd wanted both on one slide I'd be annoyed. Ending."

## Step 16 -- --end
Command: `--end <session>` (exit 0, session ended).

## Wrap-up (Alex, in character)

**Finished?** Yes, both requests.

- Chloe to Milo: Chloe -> Ava -> Ivan -> Kofi -> Milo. 4 introductions (3 people in between).
- Ben to Nora: Ben -> Theo -> Ravi -> Pia -> Nora. 4 introductions (3 people in between).

**Ease: 6 / 7.**

"That was quick. Typing 'path' in the Analyze filter found Shortest path immediately, and the From / To boxes autocomplete names, so I never had to hunt for unlabeled dots on the canvas. The defaults (Follow All, weight None) were right for 'fewest people', and the form even told me 'weight' had no meaning set, so it was ignoring it. The result panel gives the nodes in order, numbered, plus what settings produced it -- exactly what I'd paste into a note.

What confused me or bugged me:
- The count is in two units: '4 hops' in the list, '5 nodes, 4 edges' in the panel. Neither says 'introductions' or 'people in between', so I had to do the edges-equals-introductions translation myself. Easy for me, but someone else could answer 5.
- Running the second path replaced the first. There's only ever one 'Shortest path' row, so Chloe-Milo was gone once I did Ben-Nora. If I wanted to compare or show both, I'd have to rerun.
- Nodes still have no names on the canvas, so the black path is only readable through the side panel.
- The arrows on the edges made me wonder for a second whether 'All' was right; the toggle made it clear enough."
