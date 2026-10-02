# Session: bring the newest nested export in alongside the earlier one -- knowledge engineer

Participant: Dr. Min-ji Kim, knowledge graph engineer (study/personas/knowledge-engineer.md).
Task as given: "Bring the newest export from the research database into this project alongside the
earlier one. The data on screen is a sample: one export from a research database, researchers and
institutions with records inside records. If that is not your line of work, treat it as your own
nested export."

Start screen: shots/tasks/t28-nested/01.png. Renders: tmp/round-7-sessions/t28-nested--knowledge-engineer/.
All commands were run from design/ui/prototype; `S` below stands for
`timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t28-nested--knowledge-engineer`.

## Think-aloud

**01 (start).** "Research network, March 2026. 200 nodes, 170 researcher, 30 institution, 670
edges. The inspector says the graph is 'from network-expor...', so that is the earlier export. I
need an import, or a list of sources I can add to. The rail has Data; that is the obvious place."

**02** `S/02.png task:t28-nested --click "Data"`
"Good: a Sources section with one entry, network-export-2026-0..., '200 nodes, 670 edges from 3
tables', split into researchers, institutions and links. The nested fields show up as a tree under
Attributes -- profile, contact, metrics, citations. Fine. There is a plus next to Sources."

**03** `S/03.png ... --click "Data" --hover "Add source"` -> "nothing on screen is called Add source".
`S/03.png ... --click "Data" --hover "Add"`
"Tooltip: 'Add data to this graph'. That is exactly the sentence I wanted. I like that it says
'this graph'."

**04** `S/04.png ... --click "Data" --click "Add data to this graph"`
"Menu: File..., From a URL..., Paste..., Set collection.... I do not know what 'Set collection'
means here. My export is a file, so File."

**05** `S/05.png ... --click "File..."`
"A chooser with three entries: 'Data file: CSV, JSON, GEXF or GraphML', a recipe, and a style file.
No Turtle, no JSON-LD -- noted, as always. My export is nested JSON, so 'Data file'. Why a recipe
and a style file are offered by an 'add data' command, I do not know."

**06** `S/06.png ... --click "Data file: CSV, JSON, GEXF or GraphML"`
"Wait. The title bar now says 'Transfers, March 2026'. The header says 'Open as a new graph'. The
file is transfers-2026-03.csv -- account-to-account transfers with amounts. That is not my research
export, it is not nested, and I asked to add to THIS graph, not open a new one. I never got to pick
a file name; something picked it for me. The match report underneath is actually the kind of thing
I want -- '9,113 rows became 9,113 edges', '3,000 ids ... become nodes' -- but it is about the
wrong file and the wrong destination. I am not pressing Load on this. Unexplained failure one."

**07** `S/07.png ... --key Escape`
"Escape put me back on Research network with 'Load cancelled: nothing was loaded' and Undo. That is
honest; I trust that more than the screen before it."

**08** `S/08.png ... --click "Data" --hover "More"` (also tried "Actions", "Options")
"That hit the 'More actions' button in the right-hand panel, not the dots beside my export. I
cannot tell what the dots beside the source are called."

**09** `S/09.png ... --click "Data" --click "network-export-2026-0"`
"Clicking the source row opened its menu: network-export-2026-03.json -- Rename, Replace with
file..., Edit source..., Refresh. Replace is the opposite of what I want; the March export must
stay. Nothing says 'add the next version' or 'add another export like this one'."

**10** `S/10.png ... --click "Data" --click "Add data to this graph" --click "Set collection..."`
"Last idea: maybe 'Set collection' means a set of exports. It lands on the same transfers CSV,
again 'Open as a new graph'. That is the second time a control on this graph's own Sources list
has sent me to an unrelated file as a separate graph. Two unexplained failures; I stop."

## Outcome

- Succeeded? No. I never saw the newer research export, never saw it next to the March one, and
  every path from "Add data to this graph" opened an unrelated transfers CSV as a new graph.
- Single Ease Question: 2 of 7. Finding the entry point was easy (Data, Sources, plus, a clear
  tooltip). Everything after it contradicted what the control said it would do.
- Would I use this instead of my current tool? Not for this. Today I keep dated exports side by
  side in GraphDB as named graphs, one per load, and I can diff them in SPARQL. Here I could not
  even get a second export loaded next to the first, and the add-data control silently changed
  destination to "a new graph". The pieces I liked -- the source listed with its counts, the
  nested attribute tree, the match report that says how many rows became how many edges, and the
  honest "nothing was loaded" on cancel -- are the right ideas. If "Add data to this graph" really
  added to this graph, and showed me the March and newer exports as two sources with their counts
  side by side, I would try it again.

## Problems observed

1. "Add data to this graph" -> File -> Data file opens an import titled "Open as a new graph" and
   renames the window to "Transfers, March 2026". The control's promise and the result disagree.
   Severity: high (she abandons on it).
2. The file chooser offered no research export at all; the only data file led to an unrelated
   transfers CSV, so she never saw what her own nested JSON would look like on import. Severity:
   high.
3. "Set collection..." is not a term she could interpret, and it led to the same new-graph import.
   Severity: medium.
4. The source's own menu offers Replace but nothing for "add a newer export of this source and keep
   the old one", which is the job. Severity: medium.
5. A recipe and a style file appear in the chooser reached from "add data". Severity: low.
6. The dots beside a source row could not be found by name with a hover. Severity: low.
7. No RDF formats in the chooser (CSV, JSON, GEXF, GraphML only). Severity: low for this task,
   noted as usual.

## What she liked

- Data rail -> Sources -> plus, with the tooltip "Add data to this graph": found in under a minute.
- The source row with "200 nodes, 670 edges from 3 tables" and its three tables.
- The match report wording on the import screen ("9,113 rows became 9,113 edges").
- Escape gave "Load cancelled: nothing was loaded" with Undo.
