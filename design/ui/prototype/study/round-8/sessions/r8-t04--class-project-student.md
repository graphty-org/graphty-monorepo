# Session: load two spreadsheets as one network -- the class-project student

Participant: the student with a class project (first-time graph user, follows a Gephi tutorial order).
Task as given: "You have never used this program before. Two spreadsheets from your team are in your
Downloads folder: one lists the machines on the office network, one lists which machine talks to
which. You want them in as one network and you want to know that every machine and every connection
arrived. If you do not work in IT, these two files are example data, not your own: treat them as your
list of things and your list of links between them."

All commands were run from design/ui/prototype. Renders are in tmp/round-8-sessions/r8-t04--class-project-student/.

## Step 1 -- start screen (shots/tasks/r8-t04/01.png)

Think-aloud: "Start, Recent projects, Samples. My tutorial would say look at a sample first, but the
task is my own two files. 'Open project or file...' sounds like one file, or a project I already have.
'New from data...' sounds like what I have: data. Also 'or drop a file' and 'files are never uploaded',
good, my professor cares about that. Clicking New from data."

## Step 2 -- file picker (02.png)

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t04 --click "New from data..."

Think-aloud: "A file chooser in Downloads > it-estate. hosts-2026-03.csv and connections-2026-03.csv,
plus a png that is grayed out. Hosts must be the machines, connections the links. Checkboxes, so I
can pick both at once. Nice, Gephi made me do this twice."

## Step 3 -- the import screen, hosts table (03.png)

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t04 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open"

Think-aloud: "Whoa, a lot. Left: Tables, hosts 300, connections 1,105, both with green checks. Top:
'Makes host (300) --connections (1,105)--> host (300)'. It looks like code, but I think it means 300
machines joined by 1,105 links. 'Each row is a node' -- right, the tutorial calls these the nodes
table. The id column is marked Key and hostname is marked Name. I don't fully get it but it guessed.
At the bottom: 'Match report: hosts. 300 rows; every key is unique.' OK. The other table could be
the problem, let me look at it before I press anything."

## Step 4 -- connections table (04.png)

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t04 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" --click "connections"

Think-aloud: "'Each row is an edge, host to host'. source is 'From -> host', target is 'To -> host'.
That's the Source/Target thing the tutorial warned about, and it got it right by itself. The match
report is what I wanted: '1,105 of 1,105 source found in hosts. 1,105 of 1,105 target found in hosts.
1,105 rows became 1,105 edges.' So nothing got dropped. That's exactly the thing I'm always unsure of
in Gephi.

Then there's bytes_total_24h marked 'Weight', 'Higher means Stronger / Farther / Capacity', and a row
about 'a row without one would weigh 1 0'. I have no idea what that means and I'm not touching it.

Bottom left: Direction -- 'As the file says' is grayed out, Directed is picked, Undirected. My course
tutorial says always choose Undirected. But 'which machine talks to which' sounds like it goes one
way, and it already picked Directed. I'll leave it and hope. Load."

## Step 5 -- the graph (05.png)

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t04 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" --click "connections" --click "Load"

Think-aloud: "A network picture, first try, no layout step. The right side says 'Hosts, Graph from
2 tables', Summary: Nodes 300 nodes, Edges 1,105 connections, Direction Directed. Those are the same
numbers as the import page, so I believe every machine and every link arrived.

Two things bug me. 'Isolated nodes 7' -- did 7 machines fail to connect? I think the import page
already told me every link found its machines, so these 7 are probably just machines nobody talks
to, but the app doesn't say that, I'm guessing. And some dots are bigger than others. A box in the
corner says 'Size: vu....iated_over_30_days' with 0 to 6. I never asked for sizing, and I can't
even read the full column name. My tutorial says size by degree; I'd have to figure out how to change
that later. There's no labels on the dots either.

For this task, though: it's in, as one network, and the numbers match. I'm stopping."

## Outcome

- Succeeded? Yes, I think so. 300 machines and 1,105 connections in, confirmed twice (match report
  before loading, Summary after).
- Single Ease Question: 6 of 7. It was fast and the match report is the best part. Minus one for the
  wall of words on the import screen (Weight, Stronger/Farther/Capacity, the "would weigh 1 0" line,
  the code-looking "Makes" line) and for the unexplained "Isolated nodes 7" and the surprise sizing.
- Would I use this instead of my current tool (Gephi, per a class tutorial)? Probably yes for getting
  data in: it read both files at once, matched source and target by itself, and told me in plain
  numbers that nothing was dropped, which Gephi never does. I'd still need to see if it does the
  rest of my tutorial (statistics, modularity colors, labels, export) before I'd switch for the whole
  assignment.

## Problems observed

1. Isolated nodes 7 is shown with no explanation of whether that is a loss or just unlinked machines;
   a first-timer reads it as "7 did not arrive". (moderate)
2. The graph opens already sized by an attribute the participant did not choose
   (a vulnerability-count column), with a truncated name in the legend. Surprising and unexplained. (moderate)
3. Weight controls on the edge table (Higher means Stronger / Farther / Capacity; "a row without one
   would weigh 1 0") are jargon to a novice; he skipped them without knowing whether the default was safe. (minor)
4. Direction: course tutorials teach Undirected; the screen gives no hint of which fits "talks to".
   He kept the default by guess. (minor)
5. The "Makes host (300) --connections (1,105)--> host (300)" line reads like code. He decoded it, but slowly. (minor)
