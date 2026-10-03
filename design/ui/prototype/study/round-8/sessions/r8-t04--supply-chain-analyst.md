# Session: load two spreadsheets as one network and confirm everything arrived

Participant: Dana Okafor, supply chain risk analyst (persona: study/personas/supply-chain-analyst.md)
Task given: "You have never used this program before. Two spreadsheets from your team are in your
Downloads folder: one lists the machines on the office network, one lists which machine talks to
which. You want them in as one network and you want to know that every machine and every
connection arrived. If you do not work in IT, these two files are example data, not your own:
treat them as your list of things and your list of links between them."

All commands run from design/ui/prototype. Renders in tmp/round-8-sessions/r8-t04--supply-chain-analyst/.

## Step 0 -- start screen (shots/tasks/r8-t04/01.png)

Think-aloud: "OK. Not my data, IT's -- machines and links. Think of it as suppliers and who-buys-
from-whom. I look for 'import'. There's no word 'import'. 'Open project or file...' or 'New from
data...'. I've got two raw spreadsheets, not a project, so 'New from data' I guess. And it says
files never get uploaded -- good, that's the first thing IT will ask me. 'Local only' up top, same
thing. I'm ignoring the samples on the right."

## Step 1 -- New from data

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t04--supply-chain-analyst/01.png task:r8-t04 --click "New from data..."

Saw: a "Choose files" box in Downloads > it-estate: hosts-2026-03.csv, connections-2026-03.csv,
and a grayed-out estate-diagram.png. Checkboxes, Cancel, Open (disabled).

Think-aloud: "Checkboxes -- so I can take both at once. Nice, I was afraid I'd have to do one,
then figure out how to bolt on the second. Hosts is the list of things, connections is the links."

## Step 2 -- pick both and open

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t04--supply-chain-analyst/02.png task:r8-t04 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open"

Saw: a setup page. Left: "Tables" with hosts 300 (green check) and connections 1,105 (green
check). Top line: "Makes host (300) --connections (1,105)--> host (300)". A preview of the hosts
sheet, 8 of 300 rows, 69 columns; "Each row is a node"; the id column tagged "Key", hostname
tagged "Name". At the bottom: "Match report: hosts -- 300 rows; every key is unique." Buttons
Cancel and Load.

Think-aloud: "300 and 1,105. I'd want to check those against the row counts in Excel, but it
put them right at the top, which is what I'd have done myself. 'Every key is unique' -- so no
duplicates in the master list. That's actually the check I always forget. The arrow line is a bit
code-looking -- '--connections-->' -- but I get it: hosts linked to hosts. 'Node' -- fine, I'll
learn their word. 69 columns, that's a lot; I don't need to look at them now. The text is small
and gray on the 'auto' tags; I'd be squinting on my laptop."

## Step 3 -- check the links table

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t04--supply-chain-analyst/03.png task:r8-t04 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" --click "connections"

Saw: connections preview. source tagged "From -> host", target "To -> host", bytes_total_24h
tagged "Weight" with "Higher means Stronger / Farther / Capacity". Match report:
"1,105 rows; every row has both ends. 1,105 of 1,105 source found in hosts. 1,105 of 1,105 target
found in hosts. ... 1,105 rows became 1,105 edges."

Think-aloud: "This is the bit I care about. Every link points at a machine that's actually in the
list -- 1,105 of 1,105 both ways. In Excel that's two XLOOKUPs and a COUNTIF and I'd still not
trust it. It picked source and target on its own and said so on the column, so I can see the
guess. It also decided bytes is a 'weight' -- I didn't ask for that, and 'Farther' versus
'Stronger' means nothing to me. I'll leave it, it doesn't stop anything arriving. 'Direction:
Directed' at the bottom -- leave that too."

## Step 4 -- Load

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t04--supply-chain-analyst/04.png task:r8-t04 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" --click "connections" --click "Load"

Saw: the network picture, a ring of gray dots with lines. Right side "Summary": Nodes 300 nodes,
Edges 1,105 connections, Isolated nodes 7, Average total degree 7.37, Highest total degree 25.
Upper left of the picture, a box "Size: vu....iated_over_30_days" with circle sizes 0-6.

Think-aloud: "300 nodes, 1,105 connections. Same as the files. That's my answer -- everything
arrived. The picture is a hairball, as expected; I'm not here for the picture today. 'Isolated
nodes 7' -- that worries me for a second. Did 7 machines fail to connect? Or do they just have
no links in the file? And what is this size box -- 'vu...iated_over_30_days'? I didn't ask it to
size anything by vulnerabilities. Why is it making that call for me? 'Total degree' -- no idea."

## Step 5 -- click the 7 isolated

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t04--supply-chain-analyst/05.png task:r8-t04 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" --click "connections" --click "Load" --click "7"

Saw: the 7 became underlined and a table opened under the picture: "300 nodes from
hosts-2026-03.csv", id and hostname. All 300, not 7.

Think-aloud: "I clicked the 7 hoping to see which 7 machines. I got the whole list of 300. So
either it didn't filter, or I'm meant to do something else. Not a deal-breaker -- all 300 are
here, and 7 machines with no links in the links file is a data question for whoever made the
file, not a loading failure. But I'd want that list. I'd stop here: the counts match."

## Wrap-up

Succeeded? Yes. Both files came in together, and it told me in my own terms that 300 of 300
machines and 1,105 of 1,105 links arrived, with every link's ends found in the machine list.

Single Ease Question: 6 of 7. Picking two files at once and the match report made it easy. Lost a
point for the unexplained "isolated 7" that I could not list, the size legend I did not ask for,
and the small gray labels.

Would I use this instead of my current tool? For this job -- getting a list and a link sheet in
and proving nothing fell on the floor -- yes, it beats my Excel lookups, and "files never
uploaded" answers IT's first question. As a replacement for Power BI or our risk platform: no, not
on this showing. My VP doesn't look here, and I didn't see an export yet. Side tool at best until
I know it gets something into Power BI.

## Problems noted

- "Isolated nodes 7" is a link, but clicking it showed all 300 nodes, not the 7. I could not tell
  whether 7 machines failed to load or just have no links. (severity: medium)
- After Load the picture was sized by a vulnerability column I never chose, with a legend whose
  title is truncated ("vu....iated_over_30_days"). Felt like the tool deciding for me. (low-medium)
- Weight was set automatically to bytes, with "Stronger / Farther / Capacity" choices I could not
  interpret. Did not block the task. (low)
- Small, low-contrast gray text ("auto", column type tags, "Showing the first 8 of 300 rows").
  (low)
- No word "import" on the start screen; "New from data..." was a guess that paid off. (low)
- "Total degree", "node", "edge" with no plain explanation. (low)
