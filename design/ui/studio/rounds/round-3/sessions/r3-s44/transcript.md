# Session r3-s44 -- Jordan (marketing network analyst), task T7 prompt B (running club)

Task as given: "A friend's list of who in your running club knows whom is already drawn in it. Have
the program put the people in order of how much the whole club depends on them, and tell us the top
three, in order, and what the order was based on."

## Step 01 -- start

    node tool/real.mjs --start rounds/round-3/sessions/r3-s44 setup:rounds/round-3/setups/T7-B.txt

Saw: a drawing of 20 blue dots with arrows, no names on them. Header says "friends", "Local only"
(good -- that answers my does-it-leave-my-laptop question before I asked it). Right panel: Nodes 20,
Edges 41, Directed, Density, Components 1. Left panel: a search box, "Selection", "Everything", and a
hint at the bottom: "Analyze (flask icon) in the toolbar (Shift+A) to add results here". No names on
the dots, which bugs me -- I can't sanity-check anyone.

"How much the whole club depends on them" -- that's a bridge/connector question to me, betweenness,
not just who has the most friends. The hint points at the flask, so that's where I go.

## Step 02 -- open Analyze

    node tool/real.mjs --step rounds/round-3/sessions/r3-s44 --click-at 680,864

Saw: a list headed "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness,
PageRank (with a "Start here" tag), Eigenvector, Katz, HITS, All-pairs distance, and some greyed
items below. Each has a one-line plain description, which I appreciate -- no formulas.

Hesitation: the app wants me to "Start here" on PageRank. But "how much the whole club depends on
them" is not "connected to well-connected people" -- that's the PageRank-is-popularity thing. The
club depends on the connectors, the ones who "sit on the most shortest paths between others". That's
Betweenness, the bridge metric I'd use in Gephi anyway. Going with Betweenness and ignoring the
Start-here nudge.

## Step 03 -- choose Betweenness

    node tool/real.mjs --step rounds/round-3/sessions/r3-s44 --click "Betweenness"

Saw: a small card "Betweenness -- Which nodes sit on the most shortest paths between others.", a
collapsed "Advanced" (not touching that), "Under a second" and a blue Run button. Nice that it
tells me how long it'll take up front. Defaults are fine. Pressing Run.

## Step 04 -- Run

    node tool/real.mjs --step rounds/round-3/sessions/r3-s44 --click "Run"

Saw: instant. The dots went orange-to-dark-brown and a key appeared at top left: "Color:
Betweenness, 2.583 ... 51.27". The left panel now has a "Betweenness 20" row. Two darkest dots are
in the lower middle. Fine -- but a color ramp is not an order. I can't tell the third-darkest from
the fourth by eye, and the dots still have no names. "Where's the table?" There's a "Data" icon on
the far left rail. Trying that.

## Step 05 -- Data tab

    node tool/real.mjs --step rounds/round-3/sessions/r3-s44 --click "Data"

Saw: not a table. It's "Sources: friends.csv, 41 rows, 41 edges" and "Attributes: Nodes -- id;
Edges -- weight". Betweenness isn't even listed as an attribute here, which is odd since I just
computed it. Dead end #1. Going back to the Graph side and clicking the "Betweenness 20" row I saw
there -- maybe that opens the list.

## Step 06 -- back to Graph

    node tool/real.mjs --step rounds/round-3/sessions/r3-s44 --click "Graph"

(Tool note: "Graph" matched 3 controls, took the rail button.) Back to the left panel with the
"Betweenness 20" row. Clicking that row.

## Step 07 -- click the Betweenness row

    node tool/real.mjs --step rounds/round-3/sessions/r3-s44 --click-at 165,156

Saw: the row highlights with an eye icon; the right panel switches to "Betweenness -- Measure from
Betweenness, Oct 7" with Style (Fill/Color/Shape/Effects/Label/Tooltip) and a "Values" tab. Style
is about painting -- I want numbers. "Values" sounds like it. Clicking Values.

## Step 08 -- Values tab

    node tool/real.mjs --step rounds/round-3/sessions/r3-s44 --click "Values"

Saw: there it is. A small histogram (2.583 to 51.27, "20 of 20 have a value ... median 11.2"), then
"Top 10": Ava 51.27, Ivan 40.02, Sana 21.35, Kofi 18.31, Jada 16.1, Theo 15.71, Ravi 14.28,
Lena 13.37, Quinn 12.55, Hana 11.95. Below, "Made with: Analysis Betweenness, Ran Oct 7".

That's the ranked list, and it says what made it -- I can trace the number to a named method. Ava and
Ivan are well clear of everyone; Sana is third and there's a big drop after Ivan. Before I believe it,
I want to see Ava light up on the map -- clicking her name.

## Step 09 -- click Ava

    node tool/real.mjs --step rounds/round-3/sessions/r3-s44 --click "Ava"

Saw: the darkest dot in the lower middle got a yellow ring, Selection shows 1, and the right panel
became Ava's card: "id Ava; Results: Betweenness 51.27, #1 of 20; Degree 6". So the top of the list
is the darkest dot, sitting where the left and right halves of the ring meet -- that's a connector,
which matches what I'd expect. "#1 of 20" is a nice touch, that's a sentence I can say out loud. I
believe it. Done.

    node tool/real.mjs --end rounds/round-3/sessions/r3-s44

## Wrap-up (in character)

**Did I finish?** Yes. Top three by betweenness -- "who sits on the most shortest paths between the
others", i.e. the connectors the club would fall apart without:

1. Ava -- 51.27
2. Ivan -- 40.02
3. Sana -- 21.35

The order is based on Betweenness, run from the Analyze (flask) menu with the default settings.

**Ease: 5 of 7.** Getting the number was quick -- the flask hint pointed me there, the menu has
plain-language one-liners, it told me "Under a second" before I ran it, and the Top 10 with "Made
with: Betweenness" is exactly the traceable list I want. It lost points on finding the list.

**What confused me / where I hesitated:**

- After Run, all I got was a color ramp on unlabeled dots. Nothing said "your ranking is over here".
  I had to guess: I tried the "Data" tab first, expecting a table, and got sources and attribute
  names instead -- and Betweenness wasn't even listed among the node attributes I'd just computed.
- The list lives behind clicking the "Betweenness" row in the left panel, then the "Values" tab on
  the right. Two clicks I only found by poking around. Style is the default tab there; for a result
  I just asked for, the numbers should come first.
- "Start here" on PageRank nudged me toward the wrong measure for this question. Someone less sure
  of the difference would have taken it and reported a popularity order, not a dependence order.
- No names on the dots, so I couldn't sanity-check anyone on the map until I clicked a name in the
  list.
- Top 10 only. For the brief I'd want all 20 (or top 40 in real life) as a CSV. I didn't see an
  export near the list. Not needed for this question, but it's the thing that keeps me in Gephi.
- Ava's card shows Degree 6 although I never ran Degree -- fine, but where did it come from?

Off-topic grumble: this is a 20-person running club. My real files are 50,000 accounts from
whatever Brandwatch feels like exporting this month, now that Instagram half-vanished from it. I'd
want to know how "Under a second" scales before I trust this with one of those.
