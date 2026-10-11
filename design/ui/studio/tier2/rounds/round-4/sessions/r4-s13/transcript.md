# Session r4-s13 transcript

Participant: Nadia, level-1 alert reviewer, returning user. Task: find the chain from Chloe to Milo
with the fewest people in between in friends.csv, who is in it, in order, and how many introductions.

Session folder (screenshots): tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s13
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/

## Step 0 -- start

    node design/ui/studio/tool/real.mjs --start <session> setup:friends-ranked.txt

01.png: friends.csv is open, colored and sized by PageRank, no names on the dots. Find box at the
top left, "Selection", "PageRank 20", "Everything" in the left list. Right panel shows PageRank style.

## Step 1

Thought: no names on the dots. I type Chloe into the find box, like always.

    node design/ui/studio/tool/real.mjs --step <session> --click "Find nodes, edges, values" --type "Chloe"

02.png: Nodes 1: Chloe. Edges 4: Ava -> Chloe, Ben -> Chloe, Chloe -> Dev, Chloe -> Farah.
Chloe's direct ties: Ava, Ben, Dev, Farah.

## Step 2

Thought: now the other end. Replace the text with Milo.

    node design/ui/studio/tool/real.mjs --step <session> --key Control+a --type "Milo"

03.png: Milo's ties: Kofi, Lena, Nora, Omar. None of them is one of Chloe's four, so it is at least
three introductions. Reading list after list could take a while. The analysis button (flask) in the
toolbar is where I rank people; maybe it can work out a chain.

## Step 3

    node design/ui/studio/tool/real.mjs --step <session> --click-at 615,864

04.png: the Analyze list opened with a "Filter analyses" box focused. Ranking analyses (Degree,
Betweenness, PageRank...). I type "path" to look for something that works out a chain.

## Step 4

    node design/ui/studio/tool/real.mjs --step <session> --type "path"

05.png: "Shortest path -- The fewest steps, or the shortest path by weight, between two nodes." Also
"Guided route -- Select 2 nodes first". Shortest path is what I want. Clicking it.

## Step 5

    node design/ui/studio/tool/real.mjs --step <session> --click-at 500,630

06.png: a Shortest path form: From ("Where the path starts", focused), To, Follow Out / All (All on),
Weight None ("Each edge counts as 1"), Advanced, Find path. Fewest people means weight None; All
means either direction, fine for introductions. Typing Chloe into From.

## Step 6

    node design/ui/studio/tool/real.mjs --step <session> --type "Chloe"

07.png: a dropdown under From offers "Chloe". Picking it.

## Step 7

    node design/ui/studio/tool/real.mjs --step <session> --click-at 490,609

08.png: From holds Chloe; focus moved to To on its own. Typing Milo.

## Step 8

    node design/ui/studio/tool/real.mjs --step <session> --type "Milo"

09.png: dropdown offers "Milo". Picking it.

## Step 9

    node design/ui/studio/tool/real.mjs --step <session> --click-at 486,663

10.png: From Chloe, To Milo, Follow All, Weight None, Find path has focus. Clicking Find path.

## Step 10

    node design/ui/studio/tool/real.mjs --step <session> --click "Find path"

11.png: the chain is drawn in black and a "Shortest path 4 hops" row appeared in the left list.
Right panel, Values: Summary "Path 5 nodes, 4 edges"; Nodes in order: 1 Chloe, 2 Ava, 3 Ivan,
4 Kofi, 5 Milo; Made with: Shortest path, From Chloe, To Milo, Follow All, Weight None. It matches
what I read by hand: Ava is one of Chloe's four, Kofi is one of Milo's four. Done.

## Step 11 -- end, and a follow-up request

    node design/ui/studio/tool/real.mjs --end <session>

The session did not end; it gave a new request: "Ben now wants to be introduced to Nora the same
way. Who is in that chain, in order, and how many introductions does it take?" Opening Analyze again.

    node design/ui/studio/tool/real.mjs --step <session> --click "Analyze"

12.png: Analyze list open; "Shortest path" is first under Recent. Clicking it.

## Step 12

    node design/ui/studio/tool/real.mjs --step <session> --click-at 500,448

13.png: a fresh Shortest path form, From focused, Follow All, Weight None. Typing Ben.

## Step 13

    node design/ui/studio/tool/real.mjs --step <session> --type "Ben"

14.png: dropdown offers "Ben". Pick it, then type Nora (focus moved to To last time).

## Step 14

    node design/ui/studio/tool/real.mjs --step <session> --click-at 484,609 --type "Nora"

15.png: From Ben, To shows "Nora" with "Nora" offered. Pick it and click Find path.

## Step 15

    node design/ui/studio/tool/real.mjs --step <session> --click-at 486,663 --click "Find path"

16.png: new chain drawn in black. Values: "Path 5 nodes, 4 edges"; Nodes in order: 1 Ben, 2 Theo,
3 Ravi, 4 Pia, 5 Nora; Made with From Ben, To Nora, Follow All, Weight None. The left list still has
just one "Shortest path 4 hops" row and the Chloe-Milo picture is gone, so the new run seems to have
replaced the first one rather than added a second. I had already written the first chain down.

## Step 16

    node design/ui/studio/tool/real.mjs --end <session>

Session ended.

## In my own words (Nadia)

**Did I finish?** Yes, both.

- Chloe to Milo: Chloe -> Ava -> Ivan -> Kofi -> Milo. Three people in between, four introductions.
- Ben to Nora: Ben -> Theo -> Ravi -> Pia -> Nora. Three people in between, four introductions.

**Ease: 6 out of 7.** I started the way I always do, typing names into the find box and reading the
lists. Both ends had four connections and none of them overlapped, and I could see this would turn
into the list-after-list routine. So I typed "path" into the analysis list and got "Shortest path".
From and To each take a name, focus moves on by itself, and the answer comes back as a numbered
list: who is in the chain, in order. That is exactly what QA wants written down. The second chain
took about a minute, because Shortest path was waiting under Recent.

**What confused me or slowed me down:**

- I would never have found it from the analysis list as it first opens. That list is all ranking,
  and Shortest path only showed up once I typed "path". If I hadn't guessed that word, I would have
  gone back to reading lists of connections.
- The answer says "5 nodes, 4 edges" and the row on the left says "4 hops". I had to work out for
  myself that 4 edges means 4 introductions. "Hops" is a word I am never sure of: one hop from what?
- Follow "Out / All" and the Weight line ("weight" has no meaning set) made me stop and think. I
  left them as they were because "each edge counts as 1" sounded like the fewest people.
- When I ran the second chain, the first one disappeared from the picture and from the left list.
  I am not sure whether it is saved anywhere. If I needed both chains in the alert file, I would
  have to screenshot the first one before running the second.
- The canvas has no names on the dots, so the black line on its own tells me nothing. The numbered
  list on the right is what I would copy into the file.
