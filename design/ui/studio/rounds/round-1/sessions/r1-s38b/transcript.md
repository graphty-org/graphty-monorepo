# Session r1-s38b -- Jordan (marketing network analyst), running club ranking (friends.csv)

Task: a friend's list of who in my running club knows whom is already drawn. Have the program put
the people in order of how much the whole club depends on them; give the top three, in order, and
what the order was based on.

Start: setup (No thanks; Open project or file...; upload friends.csv). The setup ran without error.

## Steps

### 01.png -- start

Command: `--start rounds/round-1/sessions/r1-s38b setup:<setup file>`

What I saw: the network is already drawn, 20 blue balls with arrows and no names on them. The
right panel says 20 nodes, 41 edges, Directed, 1 component. The top bar says "Local only" with a
lock, which is nice: I assume nothing goes to a server, though it doesn't spell that out. There is
a search box, plus "Selection" and "Everything" on the left. At the bottom left is a hint:
"Analyze (Shift+A) to add results here".

Think-aloud: "OK, the hairball, but a small one. No names on anything. There's no 'Find
influencers' button. The only thing that sounds like ranking is that Analyze hint, so I'll try
it."

### 02.png -- Analyze list

Command: `--step --key Shift+A`

What I saw: a popup list under "Rank nodes and edges": Degree, Betweenness, Edge betweenness,
Closeness, PageRank (tagged "Start here"), Eigenvector, Katz, HITS, All-pairs distance, then
grayed-out Depth-first order and Most flow. Each one has a one-line description.

Think-aloud: "Algorithm names, not task words. But at least each one has a line under it. 'How
much the whole club depends on them' is the bridge people, the ones in between. Betweenness says
'which nodes sit on the most shortest paths between others', and that's the one. PageRank says
'Start here', but that measures being connected to well-connected people, which is popularity. I'm
ignoring the nudge." Hesitated briefly over the "Start here" badge.

### 03.png -- Betweenness card

Command: `--step --click "Betweenness"`

What I saw: a small card with the description repeated, "Under a second", and a Run button.

Think-aloud: "It tells me how long it takes. Good, that's what I want from every tool."

### 04.png -- result on the map

Command: `--step --click "Run"`

What I saw: every node turned orange, and two in the lower middle are dark brown. A legend at the
top left reads "Color: Bridges, 2.583 to 51.27". A new "Bridges" row with "20" appeared in the
left list.

Think-aloud: "It calls it 'Bridges' now. That's actually my word, so fine. But the two dark ones
don't have names, and I can't put an unlabeled brown dot in a brief. Let me click that Bridges
row."

### 05.png -- ranked list

Command: `--step --click "Bridges"`

What I saw: the right panel switched to "Bridges, Measure from Bridges, Oct 6". It has a Values
histogram that is twenty bars of identical height, with "20 of 20 have a value, 2.583 to 51.27,
median 11.2". Below that is a Top 10: Ava 51.27, Ivan 40.02, Sana 21.35, Kofi 18.31, Jada 16.1,
Theo 15.71, Ravi 14.28, Lena 13.37, Quinn 12.55, Hana 11.95. "Made with" shows Analysis: Bridges,
Ran: Oct 6.

Think-aloud: "There it is. Ava, Ivan, Sana. Ava is way ahead. That histogram is useless, though:
every bar is the same height, so it tells me nothing about the spread. And 'Made with: Bridges'
isn't a method. If my VP asks what 'Bridges' is, the panel doesn't say Betweenness anywhere any
more. I only know because I picked it from the list. Five minutes from now I won't remember
whether 51.27 is a raw count or something normalized."

Off-topic, in character: "This is the kind of thing Brandwatch would bury behind three dashboards
and a Boolean query. And they still don't have our Instagram data."

### End

Command: `--end rounds/round-1/sessions/r1-s38b`

## Answer

Top three, in order: **Ava (51.27), Ivan (40.02), Sana (21.35)**. The order is based on
betweenness, which the app labels "Bridges": how often a person sits on the shortest paths
between other people in the club.

## Debrief (in character)

- **Did I finish?** Yes, in four steps after the file was open.
- **Difficulty:** 2 out of 7.
- **What confused me:**
    - The list I picked from says "Betweenness", but everything after it says "Bridges": the
      legend, the row in the left list and "Made with". Nothing on the result names the method
      I chose or says what the number means (raw or normalized, what the units are). I would not
      trust myself to explain 51.27 to a VP from this screen.
    - The "Start here" badge on PageRank pushes the popularity measure for a question about who
      the club depends on. A less sure person would have taken it and reported a different top
      three.
    - The Values histogram shows twenty equal bars, which looks broken. I expected it to show
      that Ava and Ivan stand far above everyone else.
    - The map gives no names. The dark nodes are the answer, but I couldn't tell who they were
      until I opened the side panel.
    - The Analyze list uses algorithm names, not task words. The one-line descriptions saved it.
- **What worked:** "Under a second" before running, the instant result, a Top 10 with names and
  numbers, and "Local only" in the header.
- **What I'd try next:** get that Top 10 out as a CSV for the brief. I didn't see an export on
  the panel.
