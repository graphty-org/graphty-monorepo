# Is this file worth an afternoon? -- Dana Okafor, supply chain risk analyst

Task as given: "A colleague sent this file. Is it worth an afternoon?"

The file: ppi-core-300-evidence.tsv, a tab-separated file of 2,298 rows with four columns
(protein_a, protein_b, source, confidence). 150 of the confidence values are "NA".

Screens seen, in order (study view, 1440 x 900): the start screen, the open dialog with the
confidence column's menu open, the open dialog with the repeated-pairs menu open, the loaded
project. Also opened: the "Where your data goes" page linked from the start screen.

## Think-aloud

**Start screen.** "OK, 'Open a graph'. Graph meaning a chart? No -- the little pictures are those
dot-and-line things, like the Power BI network visual. Fine. First thing I read is the grey line:
'Files stay on this computer. graphty reads them in this browser and uploads nothing.' Good. That
is literally the first question IT asks me, so I'm glad it is the first line. And there's a link,
'Where your data goes'. Let me open that before I put anything in here."

**Where your data goes.** "Oh, this is actually useful. 'It is written so you can forward it to
whoever approves software where you work.' There's a 'Print or save as PDF' button. That is the
thing I would attach to the security ticket. 'In short': no upload, no account, no server, data
leaves only through 'Connect to data source' and the 'Assistant', both off. Projects kept in this
browser on this computer only. OK -- the IT question is answered better than most vendors answer
it. It won't get me through the review by itself, they will still want to know who makes this and
whether it's on the approved list, but it is a start. The table is readable. Back."

"Samples: karate club, Les Miserables, protein interactions, bank transfers. None of these is
anything like mine. I'm not clicking them. 'Open...' -- that's import. My colleague's file is on
my desktop. I'd drag it in."

**Open dialog, first view.** "Title says 'Open ppi-core-300-evidence.tsv'. PPI... protein
something. Hang on, this is a biology file? My colleague sent me a biology file? Whatever, I'll
treat it like any export. Left side: Format 'TSV, tab, header row' -- right. 'Each row is: An
edge'. I don't know what an edge is. I'd guess it means a connection, because the next line is
'Ends: protein_a -- protein_b'. So it guessed that the first two columns are the two things being
connected. That's the bit I care about: it guessed, and it put the guess where I can see it and
change it. Good. 'Direction: Undirected' -- I'll leave that alone."

"Right side, 'Issues 2', yellow. First one: 'confidence is read as text: 150 of 2,298 scores are
NA'. OK, I know this one. This is my SAP export with blank lead times. And it shows me the actual
rows -- line 29, 31, 44, 52, 64 -- with NA in the last column. That's what I'd do in Excel with a
filter, and it's already done. The menu that's open is clear enough: 'Number, NA as missing --
2,298 edges; 150 of them with no confidence', or 'leave out the rows with NA -- 2,148 edges', or
keep it as text. I'd pick 'NA as missing'. I don't want to drop 150 rows without knowing why they
are NA. The counts next to each choice are what sold me -- I know what each option costs before I
click."

"Small thing: this menu is white text on a dark box and the second line of each option is small
and grey. On my laptop without my glasses I'd be squinting. Readable at my desk."

**Open dialog, second view.** "Now 'Issues 1'. '865 pairs appear more than once. Each row is one
evidence source for a pair (parallel edges).' Parallel edges, no idea. But the sentence before it
I get: the same pair shows up in several rows because several sources reported it. That's
exactly my supplier master: the same supplier under the ERP name and the Ariba name, the same part
listed by two buyers. The choices: 'Keep each: 2,298 edges' -- one per row -- or 'Combine into one:
1,262 edges, one per pair with its highest confidence. The source column is not kept.' Hmm.
Highest? Who decided highest? For me that would be like combining two quotes and keeping the
cheaper one without asking. I'd want to pick: highest, lowest, average, or count them. And
'source column is not kept' -- I'd lose where it came from. So I'd keep each, which is what it's
already on. At least it told me what I lose. Most tools just do it."

"There's also 'Weight: confidence, not used yet' at the bottom. Not sure what weight means here.
Skipping. 'What will load: 300 nodes, 2,298 edges, 150 with no confidence. 2 proteins have no
partner in the file: GSK3B, NOTCH1. They are loaded unconnected.' I like that it names the two.
That's the kind of thing I'd find a week later and look stupid in front of the VP. 'Recent: Human
protein interactions (300 proteins), Sep 21' -- somebody opened this before on this machine? Or
it remembers. Fine. Load."

**Loaded project.** "OK, there's the picture. A blob with a few clumps around it and some names in
the middle -- UBC, UBB, AKT1, MYC, TP53. It says at the bottom left 'Labels: the 12 proteins with
the most partners'. So the labels are the most-connected ones. That's a reason for the ranking,
and it's in words. I'd call those the chokepoints, if these were suppliers."

"Right side, 'Statistics'. The top paragraph is great: 'Loaded: ppi-core-300-evidence.tsv,
undirected, NA read as missing, repeated pairs kept, no numeric edge column.' That's my audit
trail -- if I put a number on a slide somebody will ask 'what did you do to the data', and here
it is. Then: Nodes 300, Edges 2,298 (rows), Linked pairs 1,262. Good, it reconciles to what the
dialog said. Density 0.0281 -- no idea, not my word. Connected components 3 (2 isolates) -- I
don't know 'component', but '2 isolates' plus the two names from the dialog, I get it: two loners
and one big group. Degree distribution, a tiny bar chart -- I don't know that word either, and I
won't hover to find out."

"Left side: 'Graphs', 'Sets and paths', 'Views'. Across the far left: Graph, Data, Results,
Notes. 'Assistant: Off. Nothing is sent.' I appreciate that it says 'off' right there. 'Nothing
has been sent from this project' under the title, underlined -- same message again. Three
times now. Honestly, good -- IT would like that."

"What I'd do next: search. There's a magnifier next to 'Graphs' -- is that search for proteins or
search for graphs? Not sure. There's 'Table' at the bottom with '300 nodes, 2,298 edges (rows)'.
That's where I'd go -- give me the list sorted by number of partners and I can decide. I don't
see an Excel button. 'Quick actions' might have 'remove this one and see what breaks', which is
the only thing I'd really want. I don't know yet."

**So, is the file worth an afternoon?** "Honestly, for me: no, and it's not the tool's fault. It's
a protein file. I can see it's clean enough -- 300 of them, one big connected group, two with no
partners, 150 missing scores, most pairs reported by more than one source. That's a real answer to
'is it worth an afternoon': I got it in about two minutes without writing a formula, and I could
write it back to my colleague in one email. If it were our supplier-part file, that same summary
would be exactly what I want before I sink an afternoon: how many, how many orphans, how many
duplicates, how many blanks."

"What's missing for me: nothing in here talks about countries or regions, and there's no map --
fair, the file has no locations, so I'm not blaming it. And I still don't know whether I can get
a table out to Power BI. That's the one that decides whether I'd use it at work."

## Single Ease Question

**5 of 7.** Getting the file in and knowing what was in it was easy, and the tool warned me about
the two things that would have bitten me later (the NA scores and the repeated pairs) with counts
I could check. It loses points for words I don't know doing important jobs ("edge", "parallel
edges", "components", "degree", "weight"), for the "combine into one" option picking the highest
confidence for me with no other choice, and for small grey text in the dark menus.

## Would I use this instead of my current tool?

Not instead of. Maybe beside. For "is this file any good" it beats Excel -- the Excel version of
that check is a pivot, a COUNTIF for NA and a remove-duplicates I'd have to undo, maybe twenty
minutes, and here it was two. It is also the first graph tool that told me up front, in words I
could forward, that my supplier list stays on my laptop; that page is going into the IT ticket.
But my VP lives in Power BI, I saw no way to get a table out to it, and my real problem is the
Tier 2 data I don't have, which no tool fixes. If "Export..." gives me a CSV of the table with
the counts, I'd put it through IT. If it only gives me a picture, it stays a side tool.

## Observations for the study team

- The "Where your data goes" link and its PDF button answered the persona's first blocker
  (IT approval, supplier data under NDA) before she loaded anything. She said she would attach it
  to the security review ticket. Strongest positive in the session.
- The load dialog's issue list, with the example rows and the resulting counts shown in each
  option, was understood without the graph vocabulary; she mapped both issues to her own ERP
  problems (blank lead times, duplicate supplier records).
- "Combine into one" silently fixes the rule (highest confidence) and drops the source column.
  She read "highest" as a decision made for her and would want to choose the rule (highest,
  lowest, average, count). She kept "Keep each" as a result.
- Terms she could not read and did not look up: edge, parallel edges, density, connected
  components, degree distribution, weight. "2 isolates" was understood only because the dialog
  had already named the two proteins.
- The magnifier beside "Graphs" in the left panel was ambiguous to her (search the graph list or
  search the proteins?).
- No visible route to Excel or Power BI from the loaded project. Export... lives in the project
  name menu, which she did not open. This remains the deciding question for her.
- Readability: the second line of each option in the dark menus is small grey text; she flagged
  it as a laptop-screen problem.
- She was puzzled that the colleague's file was a protein file; the task's dataset is outside her
  domain, which limited how much of the loaded view she could judge.
