# Session r2-s51 -- Dana Okafor (supply chain risk analyst), T7 Prompt B (running club)

Task as given: "A friend's list of who in your running club knows whom is already drawn in it. Have the program put the people in order of how much the whole club depends on them, and tell us the top three, in order, and what the order was based on."

## Step 1 -- start

Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s51 setup:rounds/round-2/setups/T7-B.txt` -> 01.png

Saw: A drawing of 20 blue balls with arrows, no names on any of them. Left panel: a search box "Find nodes, edges, values", "Selection", "Everything". Right panel: Overview (Nodes 20, Edges 41, Directed, Density, Components 1, Edges per node). Bottom toolbar: a flask icon, a chart-looking icon, "3D", a magnifier. Bottom-left hint: "Analyze (flask) in the toolbar (Shift+A) to add results here".
Dana: "No names on the dots. Whatever. That hint says Analyze adds results -- that sounds like where a ranking would come from. I'll click the flask."

## Step 2 -- open Analyze

Command: `--step --click "Analyze"` -> 02.png

Saw: A menu "Rank nodes and edges": Degree, Betweenness ("Which nodes sit on the most shortest paths between others"), Edge betweenness, Closeness, PageRank (tagged "Start here"), Eigenvector, Katz, HITS, All-pairs distance, ... Grey 11px subtitles -- had to squint.
Hesitated: "Start here" on PageRank pulls my eye, but I don't know what PageRank means for people. "How much the whole club depends on them" is a chokepoint question, and betweenness is the chokepoint word from the webinar. The subtitle -- sits between others -- is what I mean.
Dana: "Betweenness. That's chokepoints. Clicking it."

## Step 3 -- Betweenness card

Command: `--step --click "Betweenness"` -> 03.png

Saw: A small card: "Betweenness -- Which nodes sit on the most shortest paths between others", a collapsed "Advanced", "Under a second", and a blue "Run" button.
Dana: "Not touching Advanced. Run."

## Step 4 -- Run

Command: `--step --click "Run"` -> 04.png

Saw: All dots turned orange, a couple darker brown (one near the bottom middle, one just right of it). A legend top-left "Color: Bridges 2.583 -- 51.27". Left panel gained a row "Bridges 20".
Hesitated: It called it "Bridges", not Betweenness -- I assume same thing. Shades of orange are no good for a top three; the two darkest are close and I cannot tell third. Still no names on the dots. I need the list.
Dana: "Nice heat map, but I need a table. Clicking 'Bridges' on the left."

## Step 5 -- click Bridges row

Command: `--step --click "Bridges"` -> 05.png

Saw: The Bridges row highlighted with an eye icon. Right panel switched to "Bridges -- Measure from Bridges, Oct 7" with tabs Style / Values; Style is open showing Fill Color = Bridges, Shape, Effects, Label, Tooltip.
Dana: "Style is not what I want. 'Values' sounds like the numbers. Clicking Values."

## Step 6 -- Values tab

Command: `--step --click "Values"` -> 06.png

Saw: A small bar strip of the values (2.583 to 51.27, "20 of 20 have a value ... median 11.2"), then a "Top 10" list with names and numbers: Ava 51.27, Ivan 40.02, Sana 21.35, Kofi 18.31, Jada 16.1, Theo 15.71, Ravi 14.28, Lena 13.37, Quinn 12.55, Hana 11.95. Below: "Made with -- Analysis: Betweenness, Ran: Oct 7".
Dana: "There's my table. Ava, Ivan, Sana. And it tells me it was Betweenness -- good, the 'Bridges' name was confusing me but 'Made with Betweenness' settles it. Done."

Part done: ranking produced and top three read off the screen.

## End

Command: `node tool/real.mjs --end rounds/round-2/sessions/r2-s51`

## Debrief (in character, Dana)

**Did I finish?** Yes. Top three, in order: **Ava (51.27), Ivan (40.02), Sana (21.35)**. The order is based on **betweenness** -- how often each person sits on the shortest route between two other club members, i.e. who the club's connections funnel through (my "chokepoints"). The app labeled the result "Bridges"; the panel's "Made with: Analysis Betweenness" confirms the method.

**Ease: 6 of 7.** Five clicks: Analyze, Betweenness, Run, the result row, Values. I got there quickly because I already knew the word "betweenness" from a webinar; someone who did not would have had to guess among ten names (Degree, Closeness, PageRank, Eigenvector, Katz, HITS...) using the tiny subtitles.

**What confused me / where I hesitated:**

- PageRank is tagged "Start here". For a question about who the club depends on, that steers people away from betweenness. I nearly clicked it out of trust in the tag.
- I picked "Betweenness" and the result came back named "Bridges". For a moment I wondered whether I had run the wrong thing; only the "Made with" line at the bottom of the Values tab told me it was the same.
- After Run, all I got was dots in shades of orange with no names on them. Two dark ones, no way to tell who is third. The table was two clicks away (the result row on the left, then "Values" on the right); nothing pointed me to it. Clicking the row opened "Style" first, not the numbers.
- The subtitles in the Analyze menu and the "20 of 20 have a value..." line are small grey text; I had to lean in.
- The numbers (51.27, 40.02) have no unit or explanation -- fine for a ranking, but I could not tell a VP what 51 means.
- I could not see a way to get the Top 10 out as a table for a slide (did not look hard; not part of this task).
