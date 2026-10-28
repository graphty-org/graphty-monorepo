# Session r1-s23 -- Elena (returning), task T18, dataset A (running club, friends.csv)

Build: 946256efb876 (frozen, served from /home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/)
Tool: `node design/ui/studio/tool/real.mjs`, session folder `rounds/round-1/sessions/r1-s23`.

Task as given: Chloe wants to be introduced to Milo through people who already run together. Work out
the chain from Chloe to Milo with the fewest people in between: who is in it, in order, and how many
introductions it takes.

## Steps

### Start

Command: `REAL_DIST=.../tier2-r1d4-946256efb/ node ../tool/real.mjs --start <S> setup:friends-ranked.txt`
Screenshot: 01.png

Elena: OK, my running club file is open. It already has those orange dots sized by "PageRank" -- I
think that's the "who matters most" thing I did last time. No names on the dots though. I need Chloe
and Milo. Last time I used the find box to jump to a name, so I'll type Chloe there.

### Step 2

Command: `--step <S> --click "Find nodes, edges, values" --type "Chloe"`
Screenshot: 02.png
Result: the list under the find box shows Nodes 1 (Chloe) and Edges 4: Ava -> Chloe, Ben -> Chloe,
Chloe -> Dev, Chloe -> Farah. Nothing on the picture lit up that I can see.

Elena: Good, she's there, and it already tells me who she's linked to: Ava, Ben, Dev, Farah. I'll
click Chloe so I get her list of connections on the right, like last time, and see where she is.

### Step 3

Command: `--step <S> --click "Chloe"` (tool: ambiguous, 5 matches, took the first, the node "Chloe")
Screenshot: 03.png
Result: a dot near the bottom middle gets a yellow ring. The right side now says Chloe, Node, with
Summary (id Chloe, Degree 4 with a little arrow) and Results (PageRank 0.0555, #4 of 20).

Elena: There she is, the yellow one at the bottom. Four connections. Now where's Milo? I'll look him
up the same way and see who he's connected to, then see if anybody overlaps.

### Step 4

Command: `--step <S> --click "Find nodes, edges, values" --type "Milo"`
Screenshot: 04.png
Result: Milo found. Edges 4: Kofi -> Milo, Lena -> Milo, Milo -> Nora, Milo -> Omar.

Elena: Milo's people are Kofi, Lena, Nora, Omar. Chloe's are Ava, Ben, Dev, Farah. Nobody in common,
so it's at least two people in between. Ugh, this could take a while by hand. Let me click Milo first
so I can see where he sits compared to Chloe.

### Step 5

Command: `--step <S> --click "option=Milo"` -- tool: nothing on screen is called that (my wording; no screenshot change worth noting, 05.png)

### Step 6

Command: `--step <S> --click-at 109,153` (option "Milo")
Screenshot: 06.png
Result: Milo is the yellow-ringed dot at the top right. Right side: Milo, Degree 4, PageRank #3 of 20.

Elena: So Chloe is bottom middle and Milo is way up top right -- across the whole loop. Doing this by
hand means opening friends of friends of friends. Last time the program ranked people for me from the
little flask button at the bottom. Maybe it can also work out how to get from one person to another.
I'll open that.

### Step 7-8

Commands: `--step <S> --hover-at 680,864` (button "Analyze", tooltip "Analyze Shift+A"), then `--click-at 680,864`
Screenshots: 07.png, 08.png
Result: a list opens with a "Filter analyses" box, Recent: PageRank, then "Rank nodes and edges":
Degree, Betweenness, Edge betweenness, Closeness, PageRank (Start here), Eigenvector, Katz, HITS,
All-pairs distance... It scrolls further.

Elena: Lots of words I don't know. "Betweenness... which nodes sit on the most shortest paths" -- that's
ranking again, not what I want. There's a filter box at the top. I'll just type what I'm after:
"chain".

### Step 9

Command: `--step <S> --type "chain"`
Screenshot: 09.png
Result: "No analysis matches "chain"".

Elena: Nothing. Probably my word, not theirs. The descriptions kept saying "shortest paths" -- that
sounds like what I want, fewest people in between. I'll try "shortest".

### Step 10

Command: `--step <S> --key Control+a --type "shortest"`
Screenshot: 10.png
Result: list narrows to Betweenness, Edge betweenness, All-pairs distance, and under "Find paths and
edge sets": "Shortest path (Start here) -- The fewest steps, or the shortest route by weight, between
two nodes."

Elena: "Shortest path -- the fewest steps between two..." That's it. "Start here" even. Clicking it.

### Step 11

Command: `--step <S> --click-at 566,806` (option "Shortest path")
Screenshot: 11.png
Result: a "Shortest path" form: From (already says Milo), To ("Where the path ends"), Follow: Out / All
(All is picked), Weight: "Not read -- weight's meaning is not set, and a path needs a distance."
with a None dropdown, Advanced (closed), and a blue "Find path" button.

Elena: Nice, it already put Milo in because I had him clicked. But I want it from Chloe to Milo. I'll
clear the From box and put Chloe there, then Milo in To. The "Weight -- not read, a path needs a
distance" line I don't understand at all; it's set to None, I'll leave it. Follow "All" -- leaving
that too.

### Step 12

Command: `--step <S> --click-at 824,578 --type "Chloe"` (button "Clear From", then typing)
Screenshot: 12.png
Result: From says Chloe, with a suggestion "Chloe" dropping down under it (covering the To box).

Elena: It's suggesting Chloe. I'll pick her from the list.

### Step 13

Command: `--step <S> --click-at 555,609` (option "Chloe")
Screenshot: 13.png
Result: From = Chloe; the To box now has a blue outline (looks like the cursor moved there).

Elena: From is Chloe. The To box is lit up, so I'll type Milo straight in.

### Step 14

Command: `--step <S> --type "Milo"`
Screenshot: 14.png
Result: To says Milo with a "Milo" suggestion below.

Elena: Picking Milo from the suggestion, then I'll hit Find path.

### Step 15

Command: `--step <S> --click-at 550,663` (option "Milo")
Screenshot: 15.png
Result: From Chloe, To Milo, Follow All, Weight None. Find path button has a focus ring.

Elena: Chloe to Milo. Find path.

### Step 16

Command: `--step <S> --click "Find path"`
Screenshot: 16.png
Result: the list closes. Five dots turn black with thick black lines between them, running from the
bottom middle up to the top right. The key at the top left now says "Shortest path -- On the path"
above the PageRank bars. The left list has a new row "Shortest path -- 4 hops". The right side says
Shortest path, Summary: Path 5 nodes, 4 edges; "Nodes in order": Chloe 1, Ava 2, Ivan 3, Kofi 4,
Milo 5; then "Made with": From Chloe, To Milo, Follow All, Weight None, the same "Not read --
weight's meaning is not set..." line, and Advanced run settings. Milo's dot still has the yellow
ring from when I clicked him, so his dot looks a muddy olive instead of black.

Elena: Ooh, there it is, drawn right on the picture. And the right side just lists them in order:
Chloe, Ava, Ivan, Kofi, Milo. So three people in between -- Ava, Ivan and Kofi -- and "4 hops", which
I read as four introductions: Chloe to Ava, Ava to Ivan, Ivan to Kofi, Kofi to Milo. Funny, Chloe and
Ava's line had the arrow pointing at Chloe in the find list, but "All" was already picked, so I guess
it doesn't care which way. That's my answer. I'm done.

### End

Command: `--end <S>`

## Debrief (in character)

**Did I finish?** Yes. The chain is Chloe -> Ava -> Ivan -> Kofi -> Milo: three people in between
(Ava, Ivan, Kofi), four introductions.

**Ease: 5 out of 7.**

**What confused me:**

- I typed "chain" into the analysis list first and got "No analysis matches". I only found it
  because the descriptions above kept saying "shortest paths" and I borrowed their word. If I hadn't
  read those little grey lines I'd have been stuck reading friends lists by hand.
- The analysis list opens on a long column of ranking things (Betweenness, Katz, HITS...). The one I
  needed was further down, under a heading I never saw until I filtered.
- The From box was already filled with Milo because I'd clicked him last. Handy, but backwards for
  what I wanted; I had to clear it and start over.
- "Weight: Not read -- weight's meaning is not set, and a path needs a distance." No idea what that
  means or whether I needed to do something about it. I left it on None and it seemed fine, but it
  read like a warning.
- "Follow: Out / All" -- didn't know what it meant; I left it. Later I noticed the find list showed
  "Ava -> Chloe" with an arrow pointing at Chloe, so I'm not totally sure whether the direction of
  the arrows should have mattered for introductions.
- "4 hops" in the left list vs "5 nodes, 4 edges" on the right -- I worked out that four steps is
  four introductions, but I had to count it myself to be sure.
- Milo's dot kept its yellow ring from earlier, so on the picture he looks olive, not black like the
  rest of the chain. I almost thought he wasn't part of it until I read the list.

**What I liked:** the right side listed the people in order with numbers. That's the sentence I'd
paste into Slack.
