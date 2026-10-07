# Session r3-s38 -- Nadia (level-1 alert reviewer), task T6 "What did I get?", dataset Les Miserables

Task as given: get the ready-made Les Miserables network on screen and work out how many
characters, how many connections, whether every character can be reached from every other, and
what facts are recorded about each character and each connection.

## Start

Command: `node design/ui/studio/tool/real.mjs --start <session> empty`

01.png: Dark start page. Left: "Open project or file...", "New from data...". Middle: "Recent
projects" (empty). Right: "Samples" with Les Miserables (77 characters) at the top. A usage-data
banner sits at the bottom with "Share usage data" / "No thanks".

Nadia: "OK, there's the Les Miserables one right there, and it already says 77 characters. That's
one answer before I've even opened it. First I'll get rid of the data-sharing box -- bank laptop,
the answer is always no."

## Step 1

Command: `--step --click "No thanks"`

02.png: banner gone (presumably; same start page). Nadia: "Now open the sample."

## Step 2

Command: `--step --click "Les Miserables"`

03.png: The network is drawn (blue dots, gray lines) in the middle. Left panel: "Graph Les
Miserables", a search box "Find nodes, edges, values", "Selection", "Everything", and at the
bottom "Analyze in the toolbar (Shift+A) to add results here". Right panel: "Graph / From Les
Miserables", tabs "Style" and "Values" (Values open), "Overview": Nodes 77, Edges 254, a line
"Undirected, from the file: directed 0", Density 0.08681, Components 1, "Edges per ..." (cut off)
"1 to 36, mean 6.597". Bottom toolbar: flask icon, chart icon, "3D", magnifier.

Nadia: "Good -- it just tells me. 77 nodes, so 77 characters, matches the sample card. 254 edges,
so 254 connections. 'Components 1' -- I think that means it's all one piece, so everyone can get
to everyone. I'm fairly sure, but nobody explained 'components'; if QA asked me I'd want it said
in plain words. The line 'Undirected, from the file: directed 0' I don't get -- directed zero?
Is that a count of something? And 'Edges per ...' is cut off; I'm guessing edges per node, 1 to
36. The drawing does look like one connected blob, nothing floating loose, so that backs up the
'1'.

Now what's recorded about each character. In my system I'd click the account. I'll click the
busiest-looking dot in the middle."

Hesitation: "Components" and the "directed 0" line; the truncated "Edges per ..." label.

## Step 3

Command: `--step --click-at 768,447` (tool: node "Valjean")

04.png: The dot turns yellow-outlined. Right panel now "Valjean / Node", Values tab, "Summary":
id Valjean, name Valjean, Degree 36 (with a ">" arrow). Left panel: "Selection 1".

Nadia: "Valjean, of course. So per character it keeps an id and a name -- both just 'Valjean',
which is a bit redundant -- and 'Degree 36'. Degree I'm guessing is how many connections he has,
which matches the '1 to 36' max from before. Is Degree something in the file or something the
program worked out? Can't tell. That's exactly what QA would ask: what's recorded versus what's
calculated.

Now the connections. Clicking a thin line will be fiddly. There's a 'Data' button on the far
left -- in my world 'data' means a table. Let me try that, it's what I'd do with a spreadsheet."

Hesitation: id vs name duplication; whether Degree is stored data or computed.

## Step 4

Command: `--step --click "Data"`

05.png: Left panel switches to "Les Miserables": "Sources" -- "Les Mis... 77 nodes, 254 edges",
under it "Node t... 77 rows, 77 nodes" and "Ed... 254 rows, 254 edges" (names cut off).
"Attributes" -- Nodes: id, name (text icons); Edges: shared_chapters (a # icon). The right panel
still shows Valjean.

Nadia: "This is the bit I wanted. Same counts again: 77 nodes, 254 edges, and it says 77 rows and
254 rows, so it's like two sheets -- one for characters, one for connections. Per character: id
and name. Per connection: 'shared_chapters', with a hash sign, so a number. And 'Degree' isn't
listed here, so that must be something the program calculates, not something in the file. That
answers my question from before, sort of by elimination.

The labels are cut off ('Node t...', 'Ed...') which is annoying but I can guess node table / edge
table. I'd like to see one actual connection's value before I write it down -- let me click
shared_chapters and see if it shows me the numbers."

Hesitation: truncated source names; had to infer that Degree is calculated because it is absent here.

## Step 5

Command: `--step --click "shared_chapters"`

06.png: shared_chapters highlighted in the left list. Right panel: "shared_chapters / Attribute",
Summary: Table Edges, two tags "Amount" and "From the file", Has a value 100%, Distinct values 17,
Range 1 to 31.

Nadia: "There we go. 'From the file' -- so that's real recorded data, not worked out. Every
connection has it (100%), it goes from 1 to 31. I read it as how many chapters the two characters
share. That's the one fact about each connection. And since the character ones (id, name) are
listed in the same place, I'll take it those are from the file too, while Degree isn't.

The only thing I'm still not 100% on is the 'can everyone reach everyone' part. 'Components 1'
on the first screen. Let me go back there and hover over the word to see if it explains itself.
I'll click on an empty bit of the picture to get the overview back."

## Step 6

Command: `--step --click-at 1100,700` (tool: empty canvas)

07.png: Right panel back to "Graph / From Les Miserables" Overview (Nodes 77, Edges 254,
"Undirected, from the file: directed 0", Density 0.08681, Components 1, "Edges per ..." 1 to 36,
mean 6.597). Left still shows the Data view.

Nadia: "Overview's back. Hovering 'Components' to see if it tells me what it means."

## Step 7

Command: `--step --hover "Components"` (tool: ambiguous, 2 matches -- group "Components 1" and
span "Components"; took the first) -> `tooltip: null`

08.png: no change, no tooltip.

## Step 8

Command: `--step --hover-at 1267,300` (tool: group "Components 1") -> `tooltip: null`

09.png: no change, no tooltip on the word.

Nadia: "Nothing. No explanation on hover. Fine -- I'm going with it: one component means one
connected piece, so yes, every character can reach every other one through some chain. The
picture agrees: there's no dot sitting off on its own. I've got everything I was asked for. I'm
not going to go hunting for a help page for a word."

Hesitation: no tooltip or plain-language gloss on "Components"; she answers from inference plus
the drawing, not from the app telling her.

## End

Command: `--end`

## Debrief (in character)

**Did you finish?** Yes.

- Characters: 77 (on the sample card before opening, then "Nodes 77", then "77 rows, 77 nodes").
- Connections: 254 ("Edges 254", "254 rows, 254 edges").
- Can everyone reach everyone: yes -- "Components 1", and the drawing shows nothing cut off. I'm
  about 85 percent sure of what "Components" means; the app never said it in words.
- Recorded per character: id and name (both just the name, e.g. "Valjean"). The app also shows a
  "Degree" (36 for Valjean) when you click a character, but it isn't in the Data list, so I take
  it to be calculated, not recorded.
- Recorded per connection: shared_chapters, a number from 1 to 31, every connection has one,
  marked "From the file". I read it as the number of chapters the two share.

**Ease: 6 out of 7.** Fast -- under a couple of minutes, which is an alert's worth of time. The
counts were on screen the moment it opened and the Data button laid out the "two sheets" the way
I think about data.

**What confused me:**

1. "Components 1" -- no tooltip, no plain wording. If QA asked "how do you know everyone's
   connected?" I'd be pointing at a word I'm guessing at.
2. "Undirected, from the file: directed 0" -- I can't parse it. Directed zero of what? It reads
   like two facts jammed into one line.
3. "Edges per ..." is cut off in the overview, and "Node t..." / "Ed..." are cut off in the
   Data list. Guessable, but I shouldn't have to guess.
4. When I clicked Valjean, "Degree" sat right under id and name as if it were the same kind of
   fact. Only by going to Data did I find it's not in the file. The attribute page says "From the
   file" -- I'd want the character's own panel to say which lines are from the file and which are
   worked out.
5. id and name are both "Valjean" -- not wrong, just made me wonder if I was missing something.

Export test (her habit): not tried; nothing in this task needed to go into a file.
