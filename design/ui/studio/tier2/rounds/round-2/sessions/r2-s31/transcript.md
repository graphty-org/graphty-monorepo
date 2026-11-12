# Session r2-s31 -- Tom (returning), task T18 prompt A (running club, friends.csv)

Build: 8f0d5a6f7791 (frozen copy tier2-r2d4-8f0d5a6f7). Tool run from design/ui/studio/tool.

## Start

`REAL_DIST=.../.study-builds/tier2-r2d4-8f0d5a6f7/ node real.mjs --start ../tier2/rounds/round-2/sessions/r2-s31 setup:friends-ranked.txt` -> 01.png

01.png: the friends list is open, the PageRank ranking I did before is on (orange dots, bigger and darker = more important). No names on the dots. Search box at top left says "Find nodes, edges, values". I need Chloe and Milo. Nothing says "chain" or "introduction" anywhere. I'll start with the search box and type Chloe to at least find her.

## Step 1

`node real.mjs --step <s> --click "Find nodes, edges, values" --type "Chloe"` -> 02.png

02.png: it found Chloe, one person, and four ties: Ava -> Chloe, Ben -> Chloe, Chloe -> Dev, Chloe -> Farah. So Chloe runs with Ava, Ben, Dev and Farah. Good, that is a list I can read. Milo is not one of them, so it is at least two hops. I could do this by hand, one person at a time, but the last time the analysis button (the flask at the bottom) did the work for me. Before I start counting by hand, I'll see whether that button has something for "who connects these two".

## Step 2

`node real.mjs --step <s> --hover-icon 1` -> 03.png (pointer rested on the top-left menu by accident; tooltip "Main menu: open, save, export, settings"). Nothing changed.

## Step 3

The flask at the bottom of the picture is the analysis button I used to rank people. Clicking it.

`node real.mjs --step <s> --click-at 679,863`
-> 04.png

04.png: the analysis list opened, with a "Filter analyses" box at the top. It is long: Degree, Betweenness, Edge betweenness, Closeness, PageRank, Eigenvector, Katz, HITS, All-pairs distance... I don't know most of these and I'm not going to read them all. "Betweenness" says "shortest paths between others", which is about everybody, not my two people. I'll type a plain word in the filter box to see if anything is about getting from one person to another. Trying "between", since that is what I want: who is in between Chloe and Milo.

## Step 4

`node real.mjs --step <s> --type "between"`
-> 05.png

05.png: four left. Under "Find paths and edge sets": "Shortest path -- Start here -- The fewest steps, or the shortest path by weight, between two nodes." "The fewest steps between two" is my question in their words. There is also "Guided route -- Select 2 nodes first", greyed. I'll take Shortest path, it says Start here.

## Step 5

`node real.mjs --step <s> --click "Shortest path"`
-> 06.png

06.png: a small form. "From: Where the path starts", "To: Where the path ends", "Follow: Out / All" (All is already picked), "Weight" with a sentence "Each edge counts as 1..." and None, then "Advanced" and a blue "Find path". From and To I understand. "Follow Out or All" I don't really, and I don't change settings I don't understand, so I leave it. Weight None -- "each counts as 1" sounds like counting people, which is what I want. Typing Chloe in From.

## Step 6

`node real.mjs --step <s> --click "Where the path starts" --type "Chloe"`
-> 07.png

07.png: a little list dropped down under From with "Chloe" in it. Picking her from the list.

## Step 7

`node real.mjs --step <s> --click-at 554,593`
-> 08.png

08.png: From now says Chloe and the cursor moved to To on its own. Typing Milo there.

## Step 8

`node real.mjs --step <s> --click "Where the path ends" --type "Milo"` -> 09.png

09.png: Milo shows up in the drop-down under To. Picking him.

## Step 9

`node real.mjs --step <s> --click-at 550,647`
-> 10.png

10.png: From Chloe, To Milo. Follow is still on All, Weight still None. I'm leaving those alone. Pressing "Find path".

## Step 10

`node real.mjs --step <s> --click "Find path"`
-> 11.png

11.png: that's the answer, and it's written down, not just drawn. On the right: "Path 5 nodes, 4 edges", then "Nodes in order": Chloe 1, Ava 2, Ivan 3, Kofi 4, Milo 5. The picture has five black dots joined by thick black lines, and the box at top left says "Shortest path -- On the path" in black. On the left a new line "Shortest path 4 hops" above my PageRank. It also lists what I asked: From Chloe, To Milo, Follow All, Weight None.

I check it against what I saw at the start: Ava was one of Chloe's four (Ava -> Chloe), so the first link is real. Some arrows on the path point the "wrong" way (Ava -> Chloe, not Chloe -> Ava). I left Follow on All, and the question is about people who run together, so I'd count a tie either way. I'd mention that to whoever asked, though.

My answer: Chloe -> Ava -> Ivan -> Kofi -> Milo. Three people in between (Ava, Ivan, Kofi), four introductions. The screen says "4 edges" and "4 hops" rather than "introductions", but counting the steps along the list is four.

Main question done. Then I'm told: "Ben now wants to be introduced to Nora the same way. Who is in that chain, in order, and how many introductions does it take?" I'll do it the same way, from the flask button.

## Step 11 (follow-up: Ben to Nora)

`node real.mjs --step <s> --click-at 679,863`
-> 12.png

12.png: the list again, and "Shortest path" is now at the top under "Recent". Handy. Clicking it.

## Step 12

`node real.mjs --step <s> --click-at 565,448`
-> 13.png

13.png: the same form, empty again. The Chloe-Milo answer is still showing on the right, which I've already written down. Typing Ben in From.

## Step 13

`node real.mjs --step <s> --click "Where the path starts" --type "Ben"`
-> 14.png

14.png: Ben in the drop-down. Picking him, then typing Nora in To.

## Step 14

`node real.mjs --step <s> --click-at 549,593 --click "Where the path ends" --type "Nora"`
-> 15.png

15.png: From Ben, and Nora in the drop-down under To. Picking Nora and pressing Find path; Follow is still All and Weight None, same as before.

## Step 15

`node real.mjs --step <s> --click-at 551,647 --click "Find path"`
-> 16.png

16.png: new answer on the right. "Path 5 nodes, 4 edges", "Nodes in order": Ben 1, Theo 2, Ravi 3, Pia 4, Nora 5. "From Ben, To Nora" under Made with. A different set of five black dots on the left side of the picture. I check the first link: Ben -> Chloe was in the list earlier, but Theo wasn't one of Chloe's, so that's no help; I take the list as given.

One thing I notice: the left still has just one "Shortest path 4 hops" line. The Chloe-Milo answer isn't on the screen anymore -- the new one took its place. I wrote the first one down already, so it's fine today, but if the PI asked me next week for both I'd have to do it again. I'd ask about that.

My answer to the second question: Ben -> Theo -> Ravi -> Pia -> Nora. Three people in between (Theo, Ravi, Pia), four introductions.

## End

`node real.mjs --end <s>` (first call printed the follow-up request word for word, which I had already done in steps 11-15; ran `--end` a second time to close)

## In character, at the end

- **Did I finish?** Yes, both. Chloe -> Ava -> Ivan -> Kofi -> Milo, four introductions with three people in between. Ben -> Theo -> Ravi -> Pia -> Nora, also four introductions with three people in between.
- **Ease: 6 out of 7.** Once I typed "between" in the analysis box, "Shortest path -- The fewest steps ... between two nodes" was my question in plain words, and the answer came back as a numbered list of names, which is what I'd read out. Second time was quicker because it sat under "Recent".
- **What confused me or slowed me down:**
  - The analysis list is long and opens on rankings. I only found the right one because I typed a word into the filter. If I'd typed "chain" or "introduce" I don't know whether it would have shown up.
  - "Follow: Out / All". I didn't know what that meant and left it on All. Some arrows on my answer point backwards (Ava -> Chloe), so I'm trusting that "All" means either direction counts. Nothing on the screen told me that in words.
  - The screen says "4 edges" and "4 hops"; I had to work out myself that that's four introductions and three people in between. Not hard, but those are their words, not mine.
  - Running it a second time replaced the first answer. I didn't lose anything because I'd written it down, but I'd want to know whether the Chloe-Milo one is kept anywhere.
  - The dots have no names on them, so in the picture I can't tell who the black dots are; I relied entirely on the list on the right.
