# Session: open the Les Miserables sample and take stock of it (student with a class project, "Dev")

Task given by the moderator: "You have never used this program before. You will practice on the
ready-made network of characters from the novel Les Miserables that comes with the program, not on
your own data. Get it on screen and work out what you have: how many characters there are, how
many connections between them, whether every character can be reached from every other, and what
facts are recorded about each character."

Starting screen: shots/tasks/r8-t06/01.png. Renders: tmp/round-8-sessions/r8-t06--class-project-student/.
All commands were run from design/ui/prototype.

## Think-aloud

**01 (start screen).** I read everything. Start column: "Open project or file...", "New from
data...". Samples on the right, and Les Miserables is first, with "77 characters" right next to
the name. Good, I already have one answer before I've done anything. There's a box at the bottom
asking to share usage data. I'll say no thanks and click the sample.

```
timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t06--class-project-student/02.png task:r8-t06 --click "No thanks" --click "Les Miserables"
```

**02.** The picture shows up right away, with names on the big characters. But it's not a blank
start. The left list already has PageRank, Louvain with 6 groups, shortest paths, density, link
prediction, "Watchlist", "For the report"... That's a lot of stuff I didn't do. I guess these are
the "worked examples" the sample page talked about. It's a bit overwhelming for "just look at what
you have". The right side says "Paints 77 nodes", which matches the 77. For connections I
remember Gephi's Data Laboratory had a nodes/edges table. At the bottom there's "Table",
"Nodes", "Edges". I'll open Table.

```
timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t06--class-project-student/03.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Table"
```

(The tool noted two things called "Table" and clicked the first one.)

**03.** "77 nodes sorted by degree". Columns: label, Notes, group, Degree (full graph), Rank by
degree, PageRank, Rank by PageRank... "Columns: 9 of 9". There's also a sentence above the table,
"Valjean is first on all three measures", which is nice for an essay. But I can't tell which
columns were in the data and which ones the program worked out. Now the Edges tab.

```
timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t06--class-project-student/04.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Table" --click "Edges"
```

**04.** "254 edges". Columns source, target, Notes, value. Cosette-Valjean is 31, the biggest. So
254 connections. Now "can everyone reach everyone". The tutorial word for that is "connected
components", which is under Statistics in Gephi. Nothing here says Statistics. The PageRank
row on the right said "Measure from Analyze", so maybe Analyze is the place. There's a little
flask icon in the floating bar, so I rest my pointer on it.

```
timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t06--class-project-student/05.png task:r8-t06 --click "No thanks" --click "Les Miserables" --hover "Analyze"
```

**05.** The tooltip says "Analyze Shift+A". That's the one. Click it.

```
timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t06--class-project-student/06.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Analyze"
```

**06.** A box opens in the middle with Louvain, PageRank, Shortest path, Degree, Betweenness,
Closeness... And at the same time the right side turned into a "Summary" for the whole graph:
Nodes 77, Edges "254 edges, each a distinct pair", Direction Undirected, Density 0.0868,
**Connected components 1**, Average degree 6.60, Highest degree 36. I didn't know clicking
Analyze would do that. I'm not even sure the click caused it; maybe it was always there under
some tab. One connected component should mean everyone is in one piece, so yes, everyone can
reach everyone. I only know that because "connected components" was in my Gephi tutorial. A
plain sentence like "everyone is connected" would have helped. I'm fairly sure, not totally.

Last question: what facts are recorded about each character. The table mixed in computed stuff,
so I try "Data" on the left rail.

```
timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t06--class-project-student/07.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Data"
```

(The tool noted two things called "Data", a rail button and a tab, and clicked the first one.)

**07.** This is the page I should have started on. Sources: "miserables.gexf, 77 nodes, 254
edges". Edges: "Weight: value, a higher value is a stronger tie". Attributes, Nodes: "In use (2)"
label and group; "Other attributes" betweenness and degree; Edges value; "Results" Louvain and
PageRank. So every character has a name (label) and a group number. I can't tell whether
betweenness and degree came in the file or were calculated. They're not under "Results", which
makes me think they came with the file. But they have the same stack icon as Louvain and PageRank,
and the table called it "Degree (full graph)", which sounds calculated. I'd write "label and
group, maybe degree and betweenness" and move on.

I stop here.

## Answers I would hand in

- Characters: 77
- Connections: 254 (undirected, each with a "value", where higher means a stronger tie)
- Everyone reachable from everyone: yes, I think, because "Connected components" is 1
- Facts per character: label (name) and group; possibly also degree and betweenness (unsure
  whether those are in the data or computed)

## Debrief

- **Did I succeed?** Mostly. Counts yes, connectivity probably yes, the facts only partly. I'm not
  confident about what's "recorded" versus "computed".
- **Single Ease Question:** 5 of 7. The counts were easy, since 77 was even on the start page and
  254 was in the Edges tab. Connectivity I found by luck, and it needed a word I happened to know.
  The attribute list is close but mixes the original data and calculated stuff in a way I couldn't
  sort out.
- **Would I use this instead of what I use now (Gephi from the class tutorial)?** For a first look,
  yes: the picture is there in one click, and the Data page answers "what's in this file" faster
  than Gephi's Data Laboratory. But the sample opened already full of analyses I didn't run, which
  made it harder to tell what the plain data is. I'd want a "just the data" view before I trust it
  for an assignment.

## Problems noticed

1. The sample opens with many finished analyses already in the list. A newcomer can't easily tell
   the raw data apart from what was added.
2. "Can everyone reach everyone" is answered only as "Connected components 1", with no plain-words
   reading.
3. The graph Summary appeared on the right after I clicked Analyze. I didn't go looking for it and
   wouldn't know how to get back to it on purpose.
4. Node attributes: degree and betweenness sit under "Other attributes", away from "Results", but
   carry the same icon as the results, and the table labels Degree "(full graph)" like a
   measure. I couldn't tell whether they're recorded facts or computed.
5. Two controls share the name "Table", and two share "Data" (a rail button and a tab).
