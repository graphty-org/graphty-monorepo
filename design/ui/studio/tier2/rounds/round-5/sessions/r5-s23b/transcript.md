# Session r5-s23b -- Elena, returning user

Task: find the chain from Chloe to Milo with the fewest people in between, in friends.csv (already open).

Session folder: tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s23b
All commands: `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ node design/ui/studio/tool/real.mjs --step <folder> ...`

## 01.png (start)
Elena: "OK, my running club list is up. Orange dots of different sizes, some arrows, a little PageRank legend top left. No names on any dot. I remember the find box -- I'll type Chloe there."

## Step 1 -> 02.png
Command: `--click "Find nodes, edges, values" --type "Chloe"`
Elena: "Found her. And it lists her lines: Ava, Ben, Dev, Farah. So those are her running buddies. Milo isn't one of them. Let me click Chloe to see where she is."

## Step 2 -> 03.png
Command: `--click "Chloe"` -- refused as ambiguous (the node row and her four line rows all contain "Chloe"); nothing changed.

## Step 3 -> 04.png
Command: `--click "Chloe#1"` (the node row)
Elena: "There she is, the glowing one at the bottom, overlapping another dot. Panel says Degree 4. I could hop friend by friend, but there must be a 'how do I get from here to there' thing. I don't remember one. Maybe the little beaker button at the bottom -- that's where I ranked people last time, I think."

## Step 4 -> 05.png
Command: `--click-at 615,864` (the beaker, "Analyze")
Elena: "A long list. Lots of words I don't know -- Betweenness, Katz, HITS. 'Shortest paths' shows up in the small print but those rank people. There's a filter box at the top; I'll type 'path'."

## Step 5 -> 06.png
Command: `--type "path"`
Elena: "Oh nice -- 'Shortest path. The fewest steps ... between two nodes.' Says 'Start here' too. That's literally my question. Clicking it."

## Step 6 -> 07.png
Command: `--click-at 500,630` (Shortest path)
Elena: "It already put Chloe in From -- because I'd clicked her. 'To' has a blinking box. Follow Out/All and Weight -- no idea, leaving them alone. Typing Milo."

## Step 7 -> 08.png
Command: `--type "Milo"`
Elena: "A little dropdown with Milo. Picking him."

## Step 8 -> 09.png
Command: `--click-at 486,663` (Milo in the list)
Elena: "From Chloe, To Milo. The blue 'Find path' button is lit up. Go."

## Step 9 -> 10.png
Command: `--click "Find path"`
Elena: "Ooh, the chain turned black on the picture, and the right side lists it in order: Chloe 1, Ava 2, Ivan 3, Kofi 4, Milo 5. Says '5 nodes, 4 edges', and on the left '4 hops'. So three people in between -- Ava, Ivan, Kofi -- and four handoffs: Chloe to Ava, Ava to Ivan, Ivan to Kofi, Kofi to Milo. I didn't touch the Out/All thing; it said All, and friends go both ways, so I think that's right. That's my answer."

## --end (first)
Command: `--end` -- not ended; next request: "Ben now wants to be introduced to Nora the same way. Who is in that chain, in order, and how many introductions does it take?"
Elena: "OK, same again for Ben and Nora. I'll go back to the beaker and do Shortest path again."

## Step 10 -> 11.png
Command: `--click "Analyze"`
Elena: "Shortest path is right at the top under Recent. Handy."

## Step 11 -> 12.png
Command: `--click-at 500,448` (Shortest path under Recent)
Elena: "Same form. It filled Chloe in From again -- I need Ben there. The To box is blinking, so Nora first, then I'll swap Chloe out."

## Step 12 -> 13.png
Command: `--type "Nora"`
Elena: "Nora's in the list. Picking her."

## Step 13 -> 14.png
Command: `--click-at 486,663` (Nora)
Elena: "To says Nora. From still says Chloe -- I'll hit the little x in that box and put Ben in."

## Step 14 -> 15.png
Command: `--click-at 759,578` ("Clear From")
Elena: "Empty now, cursor's in it. Typing Ben."

## Step 15 -> 16.png
Command: `--type "Ben"`
Elena: "Ben in the dropdown. Click."

## Step 16 -> 17.png
Command: `--click-at 484,609` (Ben)
Elena: "Ben to Nora, All, same as before. Find path."

## Step 17 -> 18.png
Command: `--click "Find path"`
Elena: "New black chain, up the left side. List says Ben 1, Theo 2, Ravi 3, Pia 4, Nora 5 -- 5 nodes, 4 edges, 4 hops again. So Theo, Ravi and Pia in between, four introductions: Ben to Theo, Theo to Ravi, Ravi to Pia, Pia to Nora. Huh -- the Chloe-to-Milo one is gone from the picture and the left list only has one 'Shortest path'. Fine, I'd already written it down, but if I wanted both on a slide I'm not sure how."

## --end (second)
Command: `--end` -- session ended.

## Afterwards, in Elena's words
- Did I finish? Yes, both.
  - Chloe to Milo: Chloe -> Ava -> Ivan -> Kofi -> Milo. Three people in between, four introductions.
  - Ben to Nora: Ben -> Theo -> Ravi -> Pia -> Nora. Three people in between, four introductions.
- Ease: 6 out of 7.
- What confused me:
  - I didn't remember a "path" tool. The beaker list is long and full of words I don't know (Betweenness, Katz, HITS); I only found Shortest path because I typed "path" into its filter box.
  - Out / All under "Follow" -- no idea what it means. I left it on All and hoped that's right for friends.
  - "5 nodes, 4 edges" on the right and "4 hops" on the left -- I worked out that's the same thing, but I had to count. Nothing just said "4 introductions".
  - The second time, it filled From with Chloe again (left over from earlier); I had to clear it myself.
  - Running the second path made the first one disappear from the picture. I had already noted it, so OK, but I wasn't expecting that.
  - Clicking Chloe in the find results the first time didn't work because her name was in every row under her.
