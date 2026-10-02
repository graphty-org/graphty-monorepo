# Grades: bring in a coauthor network and look at one person

The task: "A colleague sent a small, ready-made network of who wrote papers with whom. Bring it in
and look at one person in it." The file is coauthors.json, a JSON node-link file of 12 researchers
and 16 coauthor links.

The intended path: the Data page opens already showing the import preview, which reads the file as
one network in one step (12 nodes, 16 edges, id as the key, name as the label, no tables to set
up). Press Load. The graph opens; select one person (on the canvas or from the Table) and read the
Data tab of their panel on the right: id, name, field, h_index.

Grading rule: success means Load was pressed from the preview without setting anything up, and one
node's Data tab was on screen and read. Success with difficulty means the participant went looking
for table settings that a one-step network does not need, or reached a person only after a wrong
turn or a long search. Failure means they could not tell whether the network loaded, ended
somewhere else, or concluded wrongly. Grades go by what was on screen at the end of the task and
what they concluded, not by how they rated themselves. Detours taken after the goal was reached do
not undo it.

## Results

| Participant | Their own verdict | Grade | Why |
|---|---|---|---|
| Explorer Elena (first-time graph user) | success with difficulty | success | Pressed Load straight from the preview without touching anything ("I'm not touching that"), clicked Wei Diallo, and read her Data tab: machine learning, h_index 47, "3 connections" (03.png). That is the whole task in two clicks. Her lower rating came from what she tried next, finding out who Wei's three coauthors are, which failed (unlabeled icons, an edges table of ids). That is a real finding but lies past the task's goal. One wrong conclusion on the way: she read Wei's place at the top of the ring as meaning "head of the group" (finding 5). |
| ML engineer, recommendation systems | success with difficulty | success | Pressed Load with no changes ("I am not going to fiddle with anything"), opened the Table, clicked Wei Diallo, and read her Data tab with id, name, field and h_index (04.png); he said himself "strictly this is looking at one person already". Going through the Table rather than the canvas is a valid way to pick a person, not a wrong turn. Everything that went wrong afterwards (a neighborhood filter that changed nothing, a filter chip that opened an unrelated Transfers dataset, 09.png) came after the goal was reached and is graded as findings, not as part of this task. |
| Expert Emma (network scientist) | success with difficulty | success with difficulty | Before loading she opened the file's tables, inspected the edges table and its weight setting, and changed Direction to Undirected: exactly the table-setup search a one-step network does not need, though she did it to check, not because she was lost. After Load she chose Maya Novak from the Table; that row did nothing, and she spent five steps (row, id cell, Enter, the hint box, the Selection row reading "Paints 0 nodes") before switching to Wei Diallo, whose Data tab she then read (14.png). Concluded correctly that the network loaded as undirected with weight read as strength, and correctly that she inspected Wei rather than the person she wanted. |
| Knowledge engineer | failure | gave up (caused by the prototype) | Imported correctly and confirmed it (12 nodes, 16 edges, undirected, read back in the summary), so she could tell the network loaded; the failure condition in the rubric does not apply. Like Emma she first opened the edges table and set Undirected. She then chose Maya Novak from the Table, got "Selects Maya Novak" with nothing selected and "Paints 0 nodes" in the Selection row (07.png), tried three more ways, and stopped: "Two unexplained failures. I stop here." She never saw any node's Data tab. The cause is the prototype: only Wei Diallo's node is wired to open a panel, and every other row in this table only shows a hint. Not counted as evidence against the design, but see finding 1 for what it did show. |

Totals: 2 success, 1 success with difficulty, 0 failure, 1 gave up (caused by the prototype).
Ease scores: 5, 4, 4, 3 out of 7. All four found Load without help, and all four confirmed the
load by the counts in the right panel matching the preview (12 nodes, 16 edges). Nobody was
unsure whether the network had loaded. Two of the four (both expert profiles) opened the tables and
set Direction before loading; the two who did not had no trouble.

## Findings

1. **A table row that claims to select a person and does not (2 of 2 who picked a row other than
   Wei Diallo: Emma, knowledge engineer).** Clicking Maya Novak's row shows "Selects Maya Novak",
   but nothing is marked on the canvas, the right panel stays on the whole graph, and the
   Selection row reads "Paints 0 nodes". Most of this is the prototype (only one node is wired),
   but what it showed is a design question in its own right: a hint that announces an action is
   read as the action happening, and when the two disagree both participants stopped trusting the
   whole tool ("a tool saying one thing and doing another"; "the kind of thing that makes me stop
   trusting a tool"). Severity 4 if it happened in the product, because it ended one session. For
   the next round, wire every row of this table so the task tests the design, not the skeleton.
2. **"As the file says" does not say what the file says (2 of 4: Emma, knowledge engineer).** Both
   experts wanted to know the file's direction before loading, could not see it, and set
   Undirected themselves to be sure. This is what drove both of them into the tables before Load.
   The import was in fact right, so it cost a detour, not a wrong result. Severity 2. Fix: show the
   value next to the option, for example "As the file says (undirected)".
3. **No names on the canvas (4 of 4).** Every participant noted that the 12 dots carry no labels,
   so the picture alone cannot tell them who anyone is. Three of four went to the Table to find a
   person; Elena clicked a name only because the study tool let her. Severity 3: in a 12-node graph
   a reader expects names. Showing labels by default below some node count is worth testing.
4. **"Look at one person" means her coauthors, and the panel does not list them (3 of 4: Elena,
   Emma, ML engineer).** The Data tab shows a person's own attributes and "3 connections" but not
   who the three are or how strong each tie is. Elena could not answer "who does Wei work with",
   the edges table showed ids rather than names, and Emma named a neighbor list with edge weights
   as the first thing she wants. The ML engineer looked for the same thing through Neighborhood.
   Severity 3. Not the task's success condition, but it is what three of four took the task to
   mean.
5. **Position in a circle layout read as meaning (1 of 4: Elena).** She concluded Wei is "the head
   of this group" because her dot sits at the top of the ring. Nothing on screen says the circle
   order carries no meaning. One participant, and the profile most likely to make that reading.
   Severity 2.
6. **The selection bar's icons have no words (3 of 3 who used it).** Elena guessed two wrong names
   and abandoned the bar; Emma could not find a neighbors control by name; the ML engineer hovered
   to find Neighborhood. Severity 2 here, same finding as in earlier tasks.
7. **Neighbors versus connections (1 of 4: Emma).** The node's tooltip says "3 neighbors" and its
   label says "3 connections". With multi-edges these differ. Severity 1: pick one word.
8. **"Local only" opens privacy settings rather than saying what it means (2 of 4: Emma, ML
   engineer).** Both noticed it first and wanted a plain statement ("processed in this browser,
   nothing uploaded"). Severity 1.

What went well, with counts: the import preview's counts before Load (4 of 4), the match report
"16 rows became 16 edges" (2 of 2 who opened it), the question of what a higher weight means
(2 of 2), and the summary after Load repeating the same counts and the chosen direction (4 of 4).
The knowledge engineer called the import "better than anything in Gephi or Neo4j Browser".

## Prototype fidelity, not design findings

- Only Wei Diallo's node opens a panel. Every other row of the coauthors node table shows a
  "Selects <name>" hint and does nothing; that ended the knowledge engineer's session and cost
  Emma five steps.
- The "Filtered: neighbors of Wei Diallo" chip opens the Transfers, March 2026 dataset, and
  "Filter to neighbors" does not change the canvas for this graph. Both happened after the ML
  engineer had finished the task.
