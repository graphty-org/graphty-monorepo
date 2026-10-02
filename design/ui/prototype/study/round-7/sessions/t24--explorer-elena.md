# Session: nested research export, played as Explorer Elena

Task as given: "A research database sent its whole export as one download, records inside
records. It is in your Downloads folder and graphty has never seen it. Make a picture where
researchers who wrote papers together are connected, and where researchers are connected to the
institutions they belong to. Check that nothing important was dropped before you bring it in."

Start screen: shots/tasks/t24/01.png. Renders: tmp/round-7-sessions/t24--explorer-elena/NN.png.
All commands run from design/ui/prototype.

## 01 -- start screen (shots/tasks/t24/01.png)

"OK. Start, Recent projects, Samples. There's a 'Research network (nested JSON)' sample right
there, but they said mine is in Downloads, so I don't want the sample. 'Open project or file' or
'New from data'? It's not a project, it's data. New from data."

## 02 -- New from data

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t24--explorer-elena/02.png task:t24 --click "New from data..."

"A file picker. Downloads > research-api. network-export-2026-03.json, 1.4 MB, and an
api-reference.pdf. The json is obviously the export. Tick it, Open."

## 03 -- open the file

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t24--explorer-elena/03.png task:t24 --click "New from data..." --click "network-export-2026-03.json" --click "Open"

"Whoa, that's a lot. Raw code at the top -- I'm not reading that. A tree on the left: meta,
data, researchers 170, institutions 30, links 160, and some little ones that aren't ticked:
addresses, affiliations, funding grants.

Up top it says 'Makes researcher (170) --coauthor (510)-- researcher, institution (30),
researcher --links (160)-- researcher | institution'. Is that a formula? I think it's telling me
what I'll get. Researchers connected by coauthor, good, that's the papers-together part.
Institutions are there... but they're just sitting on their own. Unless 'links' is the
belonging-to part? It says researcher | institution, so maybe.

Below there's a 'Match report'. I'm reading the bold lines: '170 records became 170 researcher
nodes and 510 coauthor edges.' '30 records became 30 institution nodes.' Nodes, edges -- dots and
lines, I guess. 'meta is not read' -- that's the request stuff, fine, I don't care about that.

'affiliations: 45 researchers hold two or more; each list is kept as one value.' Affiliations is
literally who belongs where. 'Kept as one value' sounds like it's squashed into a box, not turned
into lines. And it's unticked on the left. That's the thing they're asking me to check, I think."

## 04 -- click affiliations in the tree

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t24--explorer-elena/04.png task:t24 --click "New from data..." --click "network-export-2026-03.json" --click "Open" --click "data...affiliations"

"Now it's a spreadsheet of researchers. res_0001, orcid, field, h_index... And the affiliations
column is highlighted, with '[1]', '[1]', '[3]' in it. So each person has one or three
affiliations jammed in a cell. Under the column name it says 'One value'. That's the squashing.
Can I change it?"

## 05 -- open the 'One value' menu

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t24--explorer-elena/05.png task:t24 --click "New from data..." --click "network-export-2026-03.json" --click "Open" --click "data...affiliations" --click "One value"

"A menu. 'One value (170 values)' is ticked. 'Several values' is gray. 'Several edges: Links to
a new type, each item' -- that sounds like what I want, lines! -- but it's gray too: 'needs ids;
these items are records'. I don't know what that means. The only other one I can pick is
'Several rows (242 rows)'. Rows isn't lines... but 242 is more than 170, so it's splitting them
out, one per affiliation. It's the only thing I can click, and there's undo up top. Try it."

## 06 -- Several rows

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t24--explorer-elena/06.png task:t24 --click "New from data..." --click "network-export-2026-03.json" --click "Open" --click "data...affiliations" --click "One value" --click "Several rows (242 rows)"

"Oh nice -- the line at the top changed. Now it says 'researcher --affiliations (242)--
institution (30)'. So researchers ARE connected to institutions now. And affiliations got ticked
on the left by itself, with a little line icon. That's what I wanted, even though I picked
'rows' and not 'edges'. I'd never have guessed that from the word."

## 07 -- go back to the whole-file report to check nothing is missing

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t24--explorer-elena/07.png task:t24 --click "New from data..." --click "network-export-2026-03.json" --click "Open" --click "data...affiliations" --click "One value" --click "Several rows (242 rows)" --click "network-export-2026-03.json"

"Clicking the file name gets me back to the full report. Bold lines: 'affiliations made a child
table under researchers: 242 rows, one per item.' '242 rows became 242 researcher-institution
edges, with role, since and current.' Great, it even kept since-when. '170 researchers, 510
coauthor edges.' '30 institution nodes.'

Hmm, wait: '514 coauthor_ids items' but '510 coauthor edges'. Four went missing? Next line says
'4 co-author pairs are listed by both researchers' -- oh, so if A lists B and B lists A it's one
line, not two. OK, that's fine, that's not dropping anything. There's an Item / Pair toggle; Pair
is on, I'll leave it.

Addresses and funding grants are still unticked, 'kept as one value'. Those don't matter for my
picture. Advisor something 'kept as an Attribute' -- I skipped that line. I didn't scroll down to
the links part; I'll trust it. Nothing says error or warning. Load."

## 08 -- Load

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t24--explorer-elena/08.png task:t24 --click "New from data..." --click "network-export-2026-03.json" --click "Open" --click "data...affiliations" --click "One value" --click "Several rows (242 rows)" --click "network-export-2026-03.json" --click "Load"

"There it is. A big ring of gray dots with lines across the middle. On the right: Nodes 200,
researcher 170, institution 30, Edges 912 -- coauthor 510, affiliations 242, links 160. Those
match what the report said, so nothing got lost on the way in. Good.

The picture itself... it's a donut. All the dots are the same gray, and a little pill says
'Nothing is colored or sized by a row'. I can't tell which dots are the universities. I'm going
to guess the little clumps around the edge are the institutions with their people around them --
that's what a clump would be, right?

Anyway, the numbers are right and the connections are in. I'd call it done."

## Debrief

- **Did I succeed?** I think so. Researchers who wrote together are connected (510), and
  researchers are connected to institutions (242), and the counts on the right match what it
  said before I loaded. I'm less sure about the 'links' table -- I never checked what that was.
- **Single Ease Question:** 4 out of 7. Getting the file in was easy. The affiliations part I
  got by luck: the option that sounded right ('Several edges') was grayed out, and the one that
  worked was called 'rows'. If I hadn't recognized the word 'affiliations' I'd have loaded it
  without the institution lines and not noticed, because the 'Makes' line already said
  'institution' in it.
- **Would I use this instead of my current tool?** Maybe for checking an import -- the report
  with the before-and-after counts is the kind of thing I'd screenshot to prove nothing got lost,
  and it never asked me to install anything. But the picture at the end is a gray donut where
  everyone looks the same; I couldn't paste that into Slack and say anything about it. In our
  dashboard I'd at least have colors.

## Moments worth noting (from the session runner)

- Found the researcher-to-institution connection only because the word 'affiliations' in the
  tree matched the task; the unticked child tables gave no other hint they were needed.
- The menu option that described what she wanted ('Several edges: Links to a new type') was
  disabled with an explanation she could not parse ('needs ids; these items are records'); the
  working choice, 'Several rows', did not sound like it would make connections.
- The 'Makes' summary line already listed 'institution' (via 'links ... researcher |
  institution') before affiliations were turned on, which could make a hurried user think the
  belonging-to connections were already there.
- The 514 vs 510 coauthor gap worried her briefly; the next line explained it and she accepted it.
- After loading, the summary counts matched the report, which she used as her "nothing dropped"
  check. She then misread the uniform gray ring, confidently guessing that clumps were
  institutions, with no color or legend to correct her.
