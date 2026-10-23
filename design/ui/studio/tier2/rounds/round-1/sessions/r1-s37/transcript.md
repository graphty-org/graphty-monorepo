# Session r1-s37 -- Elena (returning), T4 office: people.csv + messages.csv

Build: the frozen build named in tier2/criteria.md (tier2-r1d4-946256efb), served with REAL_DIST.

## Step 1 -- start

Command: `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/ tool/with-browser.sh node tool/real.mjs --start tier2/rounds/round-1/sessions/r1-s37 empty`

Screenshot 01.png. Elena: "OK, the start screen I remember. Open project or file, the samples on
the right. There is also 'New from data...' -- I don't remember that one, but 'data' sounds like my
spreadsheets. First the usage-data box at the bottom; I'll say no thanks."

## Step 2 -- dismiss the usage box

Command: `node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s37 --click "No thanks"`

Screenshot 02.png. The box is gone. Elena: "Last time I opened a sample. Now I have two spreadsheets.
'Open project or file' would take one file, I think. 'New from data...' sounds like building
something from my own data, so I'll try that."

## Step 3 -- New from data...

Command: `node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s37 --click "New from data..."`

Screenshot 03.png. A page "Open as a new graph" with a "Tables" list on the left that has a plus,
"Drop a file here, or choose a file...", a Direction dropdown ("As the file says"), and Load greyed
out ("Choose a file first"). Elena: "'Tables', plural, with a plus -- that looks like I can give it
more than one. I'll start with the people list and choose a file."

## Step 4 -- choose people.csv

Command: `node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s37 --click "choose a file..." --upload tool/files/people.csv`

Screenshot 04.png. Left: "Nodes: people.csv, 12 rows" with a green check. Right: "people: 12 nodes",
"Each row is: a node / an edge", id is the Key, name and team are Attributes, a preview of all 12
staff. Footer: "12 node rows read; the load makes 12 nodes and 0 edges." Elena: "Nice, it guessed
these are the people (nodes, I guess that's the dots). 0 edges is expected -- the emails are in the
other file. Now the plus next to 'Tables' to add messages.csv."

## Step 5 -- hover the plus

Command: `node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s37 --hover-at 271,107`

Screenshot 05.png. Tooltip "Add a table". (The pointer stays an arrow, not a hand, over it -- small
thing.) Elena: "Yes, that's it. Click it."

## Step 6 -- Add a table

Command: `node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s37 --click "Add a table"`

Screenshot 06.png. A small menu: "File...", "From a URL...", "Paste...". Elena: "File, the messages
spreadsheet."

## Step 7 -- add messages.csv

Command: `node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s37 --click "File..." --upload tool/files/messages.csv`

Screenshot 07.png. Left: "Edges: messages.csv, 23 rows, 1 left out" with a warning triangle.
Heading: "people and messages: 12 nodes, 22 edges". from = From, to = To, emails = Attribute (whole
number). "Weight: none (each edge counts 1)". Footer: "12 node rows and 23 edge rows read; the load
makes 12 nodes and 22 edges. 1 edge row names a node missing from the node rows. Show the 1 unmatched
row [Add] [Leave out]". Elena: "Wait -- 23 rows but only 22 edges, so one email line would be
dropped. I was told to make sure every link arrived. Let me see which row before I decide."

## Step 8 -- show the unmatched row

Command: `node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s37 --click "Show the 1 unmatched row"`

Screenshot 08.png. "1 unmatched row: p13 has no node row". Line 24: p11 -> p13 (no node row), 6
emails. Below: "[Add] [Leave out]", and Leave out looks like the one already picked (it has the
outline). Elena: "So Kemi (p11) emailed somebody called p13 six times, and p13 is not on the staff
list. That's exactly the 'anything that did not fit' they asked about. I'd rather keep the link
than lose it -- p13 is probably someone new or outside. Add."

## Step 9 -- Add

Command: `node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s37 --click "Add"`

Screenshot 09.png. Now "13 nodes, 23 edges", messages.csv has a green check and "23 rows", footer
"the load makes 13 nodes and 23 edges". Elena: "Good, every row counts now. One more thing:
'Weight: none (each edge counts 1)'. The emails column is how often people write -- that seems like
it should matter. The dropdown under 'emails' says Attribute; let me see what else it can be."

## Step 10 -- try the dropdown by name

Command: `node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s37 --click "Attribute"`

Screenshot 10.png. The tool said nothing on screen is called "Attribute" (the dropdown's own name is
something else); nothing changed. Elena: "I'll just click on the box itself."

## Step 11 -- open the emails dropdown

Command: `node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s37 --click-at 728,203`

Screenshot 11.png. The list: From, To, Weight, Date or time, Edge id, Attribute (checked). Elena:
"Weight -- that matches the line 'Weight: none'. More emails, stronger link. I'll pick Weight."

## Step 12 -- Weight

Command: `node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s37 --click "Weight"`

Screenshot 12.png. "Weight: emails", then "Higher means: Not set / Closer / Farther / Capacity" and
the sentence "Choose what a higher weight means. Until you do, a path counts every edge as one step,
and PageRank and communities read a higher weight as closer." Elena: "I don't know what PageRank is,
and 'Capacity' means nothing to me here. But more emails means two people are closer -- that one I
can answer. Closer."

## Step 13 -- Closer

Command: `node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s37 --click "Closer"`

Screenshot 13.png. "Weight: emails (closer)" and "A higher weight means a closer tie, such as more
emails between two people." Elena: "That sentence is my exact situation, reassuring. Direction says
'As the file says' -- I'll leave it alone. Still 13 nodes and 23 edges. Load."

## Step 14 -- Load

Command: `node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s37 --click "Load"`

Screenshot 14.png. The network is drawn: title "people and messages", right panel "Graph, From 2
files", Overview: Nodes 13, Edges 23, Direction Directed, Loaded weight emails (closer), Components
1, Edges per node 1 to 6. I count 13 dots with arrows between them. No names on the dots. Elena: "13
and 23, matches what the setup screen promised -- 12 staff plus that p13, and every email row.
But the dots have no names. One dot sits off on its own at the top, hanging off one other -- I bet
that's p13. Let me click it."

## Step 15 -- click the lone dot

Command: `node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s37 --click-at 895,118`

Screenshot 15.png. It turns gold. Right panel: "p13, Node", Summary: id p13, Degree 1. Elena: "Yes,
p13 -- no name, no team, just the code, because it wasn't on the staff list. Makes sense. Now the
one it hangs off should be Kemi Bello. I want to see that the staff names and teams came in."

## Step 16 -- click the dot p13 hangs off

Command: `node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s37 --click-at 918,338`

Screenshot 16.png. Panel: heading "p11", Summary id p11, name Kemi Bello, team Operations, Degree 4.
Elena: "There she is, with her name and team, so the staff list joined up with the emails. Small
gripe: the heading says 'p11' and not 'Kemi Bello' -- I had to read down to see who it is, and the
dots have no names at all. Last check: did the email counts come along? I'll click the line from
Kemi up to p13; it should say 6."

## Step 17 -- click the line from Kemi to p13

Command: `node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s37 --click-at 906,228`

Screenshot 17.png. The line turns blue. Panel: "p11 -> p13, Edge", From p11, To p13, emails 6.
Elena: "6, matches the spreadsheet. Everyone is in, all 23 email rows are in, and the counts came
along. I'm done."

## End

Command: `node tool/real.mjs --end tier2/rounds/round-1/sessions/r1-s37`

## Debrief (in character)

**Did I finish?** Yes. One network, drawn: 13 dots and 23 lines. The 12 staff came in with their
names and teams, every one of the 23 email rows is a line, and the email counts are on the lines.

**What did not fit:** one email row (Kemi Bello, p11, emailed "p13" 6 times) names someone who is
not on the staff list. The setup screen caught it before loading, showed me the exact row, and
let me choose Add or Leave out. It was set to Leave out, which would have quietly given me 22
lines instead of 23 if I had just pressed Load; the warning triangle and "1 left out" are what
stopped me. I chose Add, so p13 is in the picture as a dot with only its code, no name or team.

**Ease: 6 of 7.** "New from data..." and the plus next to "Tables" were easy to find and the
counts at the bottom ("the load makes 13 nodes and 23 edges") told me exactly what I would get
before I pressed Load. That is the part I would show a colleague.

**What confused me or slowed me down:**

- The dots have no names on them, and when I click one the heading is the code ("p11"), not the
  person ("Kemi Bello"); a line says "p11 -> p13". I had to read down the panel to find out who
  anyone was. With a name column right there in the staff list I expected names.
- "Weight: none (each edge counts 1)" made me go looking, and I had to know to change "Attribute"
  to "Weight" in a dropdown. The "Higher means" choice was fine once I read "such as more emails
  between two people", but the first sentence talks about PageRank, communities and paths, and
  "Capacity" meant nothing to me.
- After loading, every line looks the same thickness even though I said more emails means closer;
  I am not sure the weight did anything I can see.
- The default for the unmatched row is "Leave out". If I had been in a hurry I would have lost a
  link without noticing.
- Tiny: the plus next to "Tables" has no label until you hover it.
