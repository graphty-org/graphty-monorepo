# Session r1-s38 -- Jordan (marketing network analyst), running club ties

Participant: Jordan, a growth-marketing analyst who does "the network stuff" one or two days a
week. Sceptical, reads labels and legends, skims helper text.

Prompt: "You have never used this program before. A friend's list of who in your running club
knows whom is already drawn in it. Have the program put the people in order of how much the whole
club depends on them, and tell us the top three, in order, and what the order was based on."

Start: the friends.csv links spreadsheet already drawn (hidden setup: No thanks, Open project or
file..., upload friends.csv). The start waited about 25 minutes for a free browser slot before the
first screenshot.

## Steps

### 01.png -- the start

Command: `--start rounds/round-1/sessions/r1-s38 setup:rounds/round-1/setups/T7-B.txt`

Saw: a blue ball-and-stick drawing of 20 dots and arrows, no names on the dots. Top bar: "friends",
undo/redo, a lock and "Local only". Left: "Graph friends.csv", a search box, "Selection",
"Everything", and at the bottom "Analyze (Shift+A) to add results here". Right: Overview -- 20
nodes, 41 edges, Directed, density 0.1079, 1 component, edges per node 3 to 6. A floating toolbar
at the bottom with five icons, the first a flask.

Think-aloud: "'Local only' up there -- good, that answers my 'does this leave my laptop' question
before I asked it. No names on the dots, so the picture alone won't tell me anybody. The bottom
left says Analyze, and there's a flask icon -- flask usually means 'run something'. Try that."

### 02.png -- the Analyze list

Command: `--step ... --click-at 659,864` (printed: button "Analyze")

Saw: a popover with "Filter analyses" and a group "Rank nodes and