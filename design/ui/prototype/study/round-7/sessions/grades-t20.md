# Round 7 grades: weighting door swipes by count and buildings by height, at import

The task, as each participant heard it: "In the door-swipe data, a person who went into a building
40 times should be treated as more tightly tied to it than someone who went in once, in every
later analysis. Also, taller buildings matter more. Set that up as you bring the data in." The
start screen is the import view of a sample file (412 people, 9 buildings, 4,212 swipe rows), with
the entries table open, "One edge per: Row" selected and "Weight: none (each edge counts 1)".

What counts as success: entries switched to one edge per person-building pair, so the derived
count becomes the edge weight with "Higher means: Stronger"; floors read as the building's node
weight on the buildings table; and after Load, the graph inspector's Weight line names count.
Success with difficulty: the edge part is set but the building part is missed, or the participant
looks for it in Analyze first, or reaches the end after a wrong turn, a long search or a hover
hint. Failure: every swipe still weighs the same, or the weight is set to "Farther".

The designed path is: the entries table (Row) -> the entries table in Pair mode (count as weight,
Stronger) -> the buildings table (floors as weight) -> Load -> the graph inspector, whose summary
reads "Weight: count, stronger" and "Node weight: floors (building)".

Grades are decided from what ended on screen and what the participant concluded, not from their
own rating.

## Two limits on what this task measured, stated once

**The building half was pre-set, so it was a reading test, not a setting test.** On the buildings
table, floors already carries the Weight role and the match report already says "floors is each
building's node weight" before anyone touches it. Likewise, choosing Pair creates the count column
already marked Weight with Stronger selected. The only decision a participant actually had to make
was Row versus Pair; the rest was recognizing that the tool's guesses were right. All five did
recognize them, and all five read the guesses as guesses. So this round says nothing about whether
a participant could assign a node weight on a table where none had been guessed, or pick Stronger
over Farther unaided. A future version of this task should start the buildings table with floors
as a plain Attribute.

**What the skeleton shows after Load is fixed.** The loaded graph's summary always reads
"Direction: Directed", whatever was chosen at import. One participant chose Undirected (her render
07.png shows the import view took it, the Makes line changed from "-->" to "--") and then found
"Directed" in the summary and "Direction: Follow" in PageRank. This is a stand-in in the skeleton,
not designed behavior, and it is outside this task; it did not change her grade. It is recorded
under the findings because a real build that did this would lose an expert's trust at once.

## Grades

| Participant | Their rating | Grade | Why |
|---|---|---|---|
| Knowledge engineer | success | **success** | Clicked Pair (count became Weight, Stronger), opened buildings and read floors as node weight, loaded, then opened Analyze. Last renders (04.png, 05.png): the graph inspector's summary reads "Weight: count, stronger" and "Node weight: floors (building)", and PageRank opens with "Weight: count (loaded weight)". The whole designed path, plus a check that the weight reaches an analysis. No wrong turns. Concluded correctly. |
| Expert Emma | success | **success** | Pair, buildings, a look at the role menu to confirm Weight was the right role (a check, not a detour), chose Undirected on her own initiative, loaded, opened Analyze and PageRank. Last renders (06.png, 08.png) show the same summary lines naming count and floors, and PageRank pre-filled with both and a sentence on how the node weight is used. Concluded correctly. The direction mismatch she met is the skeleton gap described above. |
| Cybersecurity analyst | success | **success** | Pair, buildings, back to entries to confirm Pair held, Load. Last screen (04.png): "Reading 3 tables -- 421 nodes, 1,306 edges" with a progress bar; she checked 412 + 9 = 421 and 1,306 against the import. Did not reach the inspector's Weight line, so the last step of the designed path was not seen; the settings that line reports were all in place and her conclusion about them was correct. She said herself that she could not confirm later analyses would use the weights. |
| Intelligence analyst | success | **success** | Pair, buildings, Load. Same last screen (04.png) and same arithmetic check. Same limit: never saw the inspector's Weight line, said he could not confirm "every later analysis" uses the weights. Settings correct, conclusion correct. |
| Supply chain analyst | success | **success with difficulty** | First clicked the text "Weight: none (each edge counts 1)" expecting it to be a control; nothing happened (02.png). Then found Pair by thinking of it as a pivot, checked buildings, went back to confirm Pair held, loaded (06.png, "421 nodes, 1,306 edges"). A one-click wrong turn, recovered at once, but a wrong turn by this study's rule, and she said that someone who does not think in pivot tables "would be stuck". Did not reach the inspector's Weight line. Settings correct, conclusion correct. |

**Tally: 4 success, 1 success with difficulty, 0 failure, 0 gave up (5 sessions).** Ease ratings
were 6, 6, 6, 6 and 6 out of 7.

Studio decision, labeled: the three participants who stopped at the loading dialog are graded
success rather than success with difficulty, although none of them saw the graph inspector's Weight
line. Reason: the grade is about whether the graph was set up right, and every setting the Weight
line reports was in place on their screens; the inspector step is a confirmation the designed path
offers, and two of five sessions show it works when reached. What their stopping does show is a
finding in its own right (below): nothing at the end of import tells the participant that the
weights will be used later.

No one set Farther, and no one left the swipes unweighted. The flag about two edge tables (the
Weight line should name each edge type's weight) did not come up: this sample has one edge table,
and no participant asked which edges the Weight line covers.

## What the sessions show

Counts are out of 5.

1. **"In every later analysis" goes unconfirmed unless the participant goes looking (3 of 5).**
   Three participants ended at the loading dialog and each said, unprompted, that nothing told
   them later analyses would use the weights; the supply chain analyst: "I'm trusting the word
   Weight." The two who opened Analyze found the confirmation at once in the graph summary and in
   PageRank's pre-filled fields. The confirmation exists; it is one screen past where most people
   stop. Severity 2 (minor): no one got a wrong result, but an analyst who never opens the summary
   repeats a number without knowing it was weighted. A line in the loading dialog or the first
   loaded view naming the weight would close it.

2. **Pre-set weights were noticed and distrusted (5 of 5).** Every participant remarked that count
   and floors were already marked Weight without their asking, and several read the labels twice
   to be sure. All five accepted the guesses because they were right here. Two asked for the guess
   to look like a guess (supply chain analyst: "it doesn't say 'we picked this for you'";
   knowledge engineer: "I'd want to know it is a default and not a guess about my data"). Severity
   2: the failure case, a wrong numeric column guessed as weight, would pass unnoticed by the
   participants who did not read closely.

3. **A missing node weight can only be filled with 1 or 0 (5 of 5 commented, 2 objected).** B9
   has no floors value; the match report offers "its weight reads 1" with a 1 / 0 switch. All five
   kept 1 as the less damaging choice. The knowledge engineer and Expert Emma objected that neither
   means "unknown" and asked for a third option. Severity 2.

4. **The Name role guessed "site", which repeats (4 of 5 commented).** Three site names cover nine
   buildings, so building labels will repeat. The match report warns of it, and four participants
   said "bldg" would be the better default. Outside this task. Severity 1 (cosmetic) for this task,
   likely higher for any task that reads labels on the canvas.

5. **"Weight: none (each edge counts 1)" looks like a control (1 of 5).** The supply chain analyst
   clicked it first. Single voice; the other four read it as a status line and went to Row / Pair.
   Severity 1 on this evidence, but watch it: she was the one participant without a programming or
   query habit, and she named the general risk herself.

6. **"Farther" and "Capacity" are unexplained (2 of 5).** Two participants paused on them and left
   them alone. No one picked the wrong one. Severity 1.

7. **Person nodes get weight 1 next to buildings' floors in PageRank's restart weights (1 of 5).**
   The knowledge engineer saw that a person and a one-floor building end up on the same scale,
   which nobody chose. Single voice, from the only participant who read that line closely.
   Severity 2 for a design question worth a decision: whether a type with no node-weight column
   should get no restart weight rather than 1.

8. **Direction chosen at import was not carried into the loaded graph (1 of 5; skeleton gap).**
   Expert Emma chose Undirected and the loaded summary said Directed. In the skeleton this is a
   fixed post-load screen, so it is not evidence about the design; recorded so that the real build
   is tested for it. She called it "the failure I write tools off for".

## Evidence

- Transcripts: study/round-7/sessions/t20--knowledge-engineer.md,
  t20--expert-emma.md, t20--cybersecurity-analyst.md, t20--intelligence-analyst.md,
  t20--supply-chain-analyst.md.
- Last renders: tmp/round-7-sessions/t20--<participant>/ (highest-numbered PNG in each).
- Designed path renders: shots/tasks/t20/01.png to 05.png.
