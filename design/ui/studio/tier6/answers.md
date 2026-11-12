# Tier 6 answer key: meeting the Assistant -- GRADERS ONLY

Participants never see this file. Tasks: `tasks.md`. Bars: `criteria.md`. Participants: `roster.md`.

Facts below were computed from the files in `../tool/files/` and walked on build ad16c1f2dd with
Gemini 3.8 Flash; T90 to T93 and T95 were then matched to every walk of frozen build 8fa33aa786, and
the routes of T90 B, T91 A, T92 A, T93 B and T95 A to the walks of build 3549e11129, and those of T91 A,
T92 A, T92 B and T95 A to the walks of frozen build 48879618c4, which has the same app code as
3549e11129. T91, T92 and T95 were then read against the sessions and walks of frozen build 3b2a7f0649,
which fixed several defects named here. The model's wording varies from run to run; these are examples
of what it said, not words to require.

"The fixed build" is the next build frozen after 3b2a7f0649, which holds the fixes decided from the
sessions on it. Lines given for the fixed build are the words decided for it, and no walk has shown
them yet: its dry run checks each against the screen and corrects any that differs.

## How a session is graded

- **Grades:** S (succeeded on the success path or a route as short), SD (succeeded by a detour or
  with help the screen gave after a wrong turn), F (did not reach the success state, or reached it
  and said something wrong about it), G (gave up). Success = S or SD. VOID only when the tool or the
  run failed, or the participant opened a file outside its own folder. A session the tool's model
  cap stopped is VOID.
- **From what:** the last screenshot, the transcript and the tool's records: `styles.json`,
  `styles-steps.jsonl` (each screenshot's `look`, a hash of how the network is styled) and
  `session.log` (one `gemini request` line per model call), and `work.json` (runs and layers at the
  start and the end). Never from the participant's own rating.
- **An answer counts only when it was on screen first**, at or before the step where the participant
  gave it. A right answer the screen never showed is F.
- **The model is part of the build under study, and it is not perfect.** A wrong or odd reply is not
  VOID. Grade what the reader did with it. A reader who caught a wrong reply and got the truth
  another way earns S or SD. A session the model made impossible (it refused, looped or failed every
  time, with the reader doing nothing wrong) is F, with the line `Model decided: yes`, reported apart.
- **The first report is what counts** for `Taken on trust:`, `Checked:` and `Card:`: the steps and
  report before the first `--end`, where the tool gives a follow-up. What a reader says or checks
  after the follow-up is recorded apart. Answers to a follow-up count for `Disclosure:`, `Failure
read:` and the T93 count, which only the follow-up asks.
- **False "done":** the participant says the task is done while the last screen or the records show
  it is not. Recorded apart from the grade (bar 2).
- **Wrong turns:** a move that leads away from success and is later undone or abandoned.
- **One step** is one thing a person does: a click, a typed entry with its Enter, one key, picking one
  option. Waiting for a reply is none.
- **Severity** 0 to 4 (Nielsen) for every problem, with the step and screenshot. Rate a 3 only with
  its cost: the reader was blocked or left with a wrong belief.

`grade.md` starts with these lines:

```
Grade: S|SD|F|G|VOID
False done: yes|no
Wrong turns: <n>
Model calls: <count of "gemini request" lines in session.log>
Failure: none | met, recovered | met, not recovered
```

and adds, on the tasks that name them: `Way out: model label|Settings|Send again count <n>|other` and
`Failure read: key|connection|other` (any session that met a failure), `Disclosure: <right on what,
where, who pays: 0 to 3>` (T90), `Trap fired: yes|no` and `Taken on trust: yes|no` (T92, T95),
`Checked: <chip hover, chip click, Show in table, Open run or layer, inspector, none>` (T92), `Scope
noticed: yes|no` (T92 A), `Hand edit: Open layer|Graph place|not found` (T91 A, outside the grade),
`Card: read (card)|read (reply)|reflex|not reached` (T93), `Model decided: yes` where it applies, and
`Build decided: yes` where a build defect named in this key, not the reader, decided the grade, so
that the report can give each number with and without it.

**`Failure:`** a failed message is a turn ending in a failure row, such as "Could not reach OpenAI".
Recovered means a later message got a real reply with no outside help. Bar 4 also needs the way out
to be one the screen offered, and no wrong cause stated.

**`Failure read:`** the cause the reader states in the follow-up. `key` means the key was refused or
may be at fault; "the key or the connection, I cannot tell" counts as `key`, and so does repeating the failure row's
own "the connection failed or the key was refused". `connection` stated as
the cause is a wrong cause: the made-up key is what failed.

**`Trap fired: yes`** means a wrong or unsupported claim was on screen before the first report, in
the model's words or as a count narrowed to something the question did not ask about. A right reply
or a plain refusal is `no`.

**`Taken on trust: yes`** means the participant reported as fact something wrong, or something the
file cannot support, without saying it was unchecked or the model's own.

## Facts no briefing may hold

- `Silverline Media` -- T92 A's answer
- `Port Authority` -- T92 A's runner-up
- `Hannah Weiss` -- the volunteers' most between person
- `MCM1` -- T92 B's answer
- `Aisha Bello` -- one of T93 A's seven
- `Tobias Becker` -- one of T91 A's nine
- `GAL10` -- one of T91 B's nine

## T90. Getting it going

**Success:** the reader reaches a working Assistant, gets a real reply to the question, and reports
the names or ids that the reply on screen gave. Bar 3 also needs the follow-up: what leaves (messages and what
the Assistant reads from the network: column names, node ids, labels and values), where it goes
(straight to Google, or whichever company the reader ended on), and who pays (the key's owner,
"Google charges your key").

**Route.** The OpenAI key fails. In a browser the call is refused before the app sees why, so on the
fixed build the turn reads "Could not reach OpenAI: the connection failed or the key was refused.
Nothing changed." with Send again and AI provider..., and the question returns to the composer. Send
again fails the same way. The prompt says to try this key first, so a reader meets the failure unless
they skip it. The way on is that row's AI provider..., the label under the composer (GPT-4o), Settings
then AI provider, or the status bar's "Sends to OpenAI", which opens the same section. Away from that
row, with a key saved, the panel has no AI provider... button; only Quick actions lists one. Once
Google is saved, Enter or Send again both carry the question.

**Success path (A, about 15 steps):** 1. Open a file, volunteers.graphml. 2. Assistant on the rail. 3. AI provider... 4 and 5. Provider, OpenAI. 6. API key, type the OpenAI key. 7. Save. 8. Type the
question, Enter. 9. Read the failure. 10. AI provider... on the row, or the model label. 11 and 12. Provider, Google. 13. API key,
type the Google key. 14. Save. 15. Enter, the question being back in the composer. Read the reply.

- A reader who goes straight to the Google key loses nothing: S, `Failure: none`, and that session
  does not count toward bar 4.
- On the fixed build Enter in the key box saves and lands in the composer, and Done commits a typed key
  as Save does: routes as short as Save. A key of the wrong shape keeps the dialog open on its line.
- Pressing Send again once or twice before moving on is a wrong turn, not a failure of the task.
- Picking OpenAI with the Google key is a wrong turn: the shape check catches a key that lacks `sk-`.
- Picking Google with the OpenAI key shows no wrong turn. Google's check takes any shape of 11
  characters or more, Save accepts it, and the tool swaps the real key into every Google call, so a
  reply arrives. Grade it as the screen shows it: no wrong turn, `Failure: none`, not counted toward
  bar 4. Real Google would refuse that key, and the report says so of any session that does this.
- The row's AI provider..., the model label, Settings, "Sends to OpenAI" and Quick actions' AI
  provider... are routes the screen offered; all but the label and Settings are `Way out: other`, with
  the route named. Being told by the prompt that a second key exists is not a way out by itself: the
  reader still has to find where it goes.
- Reference for the answer: any names or ids the reply gave. Replies ranked by closeness, by degree or
  by several measures, and 3 of the 5 on A gave ids alone; a reader who reports those ids has reported
  what it gave. Top by closeness: v09 Hannah Weiss (0.02273 on screen), v02 James Carter (A); s20
  Silverline Media, s18 Paula Greene (B). Top by degree: v02 James Carter and v05 Priya Nair (A); s18
  Paula Greene and s23 Owen Clarke (B). Top by betweenness: v09 Hannah Weiss (A), s20 Silverline Media
  (B). A reply can rank them wrongly (s18 first by closeness, where s20's total distance is 50 against
  52): what it gave still counts.
- A's replies also gave phone numbers nobody asked for (all 5 walked). They are true values from the
  file and do not change the grade.
- B under `--keys`: the rail by Control+I, or Tab to Graph and ArrowDown to Assistant, since the next
  Tab from Graph enters the panel; the rest by Tab, Enter and the arrows.
- Answering the follow-up with what the screen said, from memory or by going back, both count.

## T91. Make them stand out

**Success:** the people or genes the prompt names, and only they, look different on the canvas, and
the reader gives the right number with a basis on screen. A: 9 people (`trained` false). B: 9 genes
(`gal4RGexp` below -1).

**Success path (B, 3 or 4 steps):** 1. Assistant. 2. Type the request, Enter. 3. Read the change line
("Colored 9 nodes"; the model may also size them, adding "Sized 9 nodes"). The key card reads "9 of
331 nodes".

**Success path (A, 3 to 5 steps):** the same, sometimes with one more message. The first request can
paint them, or the reply can find the nine, say "No visual changes were applied yet" and ask how they
should look; answering paints them on the second message. Either way: "Colored 9 nodes", perhaps
"Sized 9 nodes", and the key card reads "9 of 24 nodes".

A starts from the saved work: PageRank has run, and every dot is colored and sized by it. The ranking
layer stays; the nine must read apart from the ranking's oranges and browns, and their sizes need not
change. A later layer painting over the ranking on the nine is the expected result.

The follow-up on A asks for a hand edit, after the grade is settled. Record `Hand edit:` from where the
reader went: the AI's layer opened (`Open layer` in the reply), the list under Graph, or neither. It
does not change the grade.

Check `styles.json`: a layer whose selector matches those nodes, with a count of 9, painting a value
other than the default. On A, Which nodes read "trained: no, 9 nodes" on every walk. A selector that lists
the nine ids also matches. A: Tobias Becker, Leo Novak, Omar Haddad, Fatima Diallo, Seun Okoro, Ivan
Petrov, Ahmed Saleh, Mei Tanaka, Zara Ahmed. B: HIS7, ADE4, GAL10, GAL1, GAL7, GLN1, GAL3, MET16,
HOM3.

- Two rows of the yeast file hold the text `null` in these columns; neither counts.
- A basis for the number is the key card's count, the change line or the reply's count. On A the
  reply may have a chip reading 9, with Show in table selecting the nine on the Nodes tab, or no chip.
- A reader who asks a question first, such as how many have not finished, can get "There are 9 people"
  over a chip reading 15. The steps hold two reads, 9 then 15, the row keeps the last, and hover, click
  and Show in table go to the 15 who have finished. It is a true count of what it selects, so it does
  not count against bar 11, and it is no basis for 9; the reply's own 9 still is. A reader who reports
  15 is F, `Build decided: yes`.
- Show in table leaves those 15 as the scope line's Selection 15, so the next message is about them.
  "Make them stand out" under it ended in "Style failed." "Nothing changed." with Send again. On the fixed
  build a cause the app has words for gives the reason too, and any other cause keeps that line alone. That is a failed message:
  `Failure: met, recovered` once a later message works, and `Failure read: other`. The scope x then Send again is a way
  out the screen offered: the nine were styled, and the line went back to Selection 15. Painting the 15
  would be F.
- The model may only resize the nine: "Sized 9 nodes", Size 3, no Fill, Which nodes "trained: no, 9
  nodes", the key card still PageRank's with "9 nodes covered by Untrained". Size 3 is the top of the
  ranking's own 1 to 3, and the nine keep the ranking's colors, so they do not read apart. A reader who
  stops there is F; asking for more until they do is on the path.
- On A the drawing can show only eight of the nine, because the key card covers one dot. A reader who
  reports 8 from the drawing is F, `Build decided: yes`.
- The model may ask how the reader wants them to look. Answering is on the path.
- Everyone colored by a gradient of the column, with no separation, is F on B: nothing stands out by
  the rule asked for.

## T92. Two facts for someone who will check

**Success:** both facts right, each with something on screen behind it, and the reader can say what
that was (the follow-up asks). The prompt does not ask for doubt, so `Checked:` and `Taken on trust:`
come from the first report.

**T92 A starts with the 14 people (`kind` is person) selected.** The reader did not select them, and
the prompt does not say so. Walked on ad16c1f2dd, 8fa33aa786, 3549e11129, 48879618c4 and 3b2a7f0649, the donations question was
scoped to Selection 14 above the composer, and the reply read "Of the 9 on-record sources in the
selection, 6 gave donations." or "Six of the sources on record in the selection gave donations." The
file's answer is 7 of 12. On the fixed build the field under that line reads "Ask about this selection",
and "Ask about this graph" once the x is pressed. So on A:

- A report of 6, or of 6 of 9, as the file's answer is F, `Trap fired: yes`, `Taken on trust: yes`.
- A reader who clears the selection, or asks about everyone, and reports 7 of 12 is S or SD, with
  `Scope noticed: yes`. A reader who reports 6 and says it covers only the selected people has not
  answered the question: F, `Taken on trust: no`, `Scope noticed: yes`. Naming the line, the field or
  the reply's word "selected" is noticing it.
- After the x the message reads afresh, because the model is told its earlier answers were limited to
  the selection. On 3b2a7f0649 the x alone brought the seven on 2 of 2 walks ("Across the whole graph, 7
  of the sources who are on the record gave donations.", "There are 7 sources on the record who gave
  donations (6 individuals and 1 company)."), and in the session that pressed it and also named the
  whole graph. The x lasts one message, so the line then returns to the selection and the next message
  is about the 14 again.
- A reply after the x can still stay on six, as all three walks of 48879618c4 that asked fact 1 first
  did. The six are the people among the seven, a true count, and the reply may hold a seven beside it.
- A new conversation also brings the seven, and so do the words themselves ("Count across the whole
  graph, not my selection").
- The grade rests on the report: 7 is right, and 6 alone as the file's answer is F and `Trap fired: yes`,
  whatever the line read. A reader who pressed the x and reports 6 with no seven on screen is that F with
  `Scope noticed: yes` and `Build decided: yes`: the reader read the line and used it, and the fix for
  a reply that stays on six did not hold. Report those sessions apart when answering who caught the
  selection, since their `Trap fired:` is not about the scope line.
- Fact 1 under the selection may name a person; Silverline Media, the true answer, is not selected.
  One reply gave s20 for the whole graph and s10 (Victor Szabo) for the selection; another named s10 with
  s20 in brackets; another called s10 the source "across the network" and never named s20; another gave
  s11 (Ines Moreau) "among the selected nodes". Reporting s20 is right. A person's name given as the
  file's answer is F, `Trap fired: yes`, `Taken on trust: yes`.
  On a line for 24 nodes Open run's Top 10 has s20 first at 67.68 and s10 fourth at 45.4, so a reader who
  opens it can catch this. With two change lines (24 nodes, 14 nodes), Open run is that 24-node run. With
  one line for 14 nodes it opens Betweenness (14 nodes), counted inside the selection: s11 first at 4.

| Half | Fact 1 (betweenness)                                            | Fact 2                                                                                                                                 |
| ---- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| A    | Silverline Media, s20 (0.267), then Port Authority, s12 (0.244) | 7 of the 12 on the record: Rita Vance, Della Whitfield, Marcus Lee, Ines Moreau, Keith Ramos, Friends of the Waterfront, Rhoda Adeyemi |
| B    | MCM1, YMR043W (0.297), then MIG1, YGL035C (0.230)               | 7 genes: ADE4, GAL10, GAL1, GAL7, BAS1, ICL1, YNL164C                                                                                  |

The screen gives betweenness before it is divided by the pairs (253 on A, 54,285 on B): 67.68 and 61.64
on A, 16,124 and 12,500 on B. The reply and the Top 10 often give the id alone, and every reply to fact
1 on B did. The id is a right answer: YMR043W is MCM1, s20 is Silverline Media.

**Success path (4 to 9 steps):** Assistant; ask; read the reply; check it; ask the second fact; check
it. Turning an id into a name, by a Top 10 row or the node, is what takes the path past 7.

- Fact 1's reply has no chip. It has a change line with Open run, and the run's Values tab holds the
  Top 10. On the fixed build the line reads "Computed Betweenness for 24 nodes" (331 on B; "Computed
  Bridges" before it), ending ", colored by it" where the run painted. A reply that reuses an earlier
  run has no line and no Open run: the run's line is under the earlier turn.
- Fact 2's reply may have a chip and Show in table, or neither, or a chip only inside the folded steps.
  With neither, the check is outside the panel: the table or Find. A selection does not hide the row:
  a turn that selected its answer keeps its chip and Show in table, and the inspector reads the
  selection too (7 nodes, gal80Rexp 1.101 to 3.126). A selection of nothing draws no line. A step can read "No matches." before a later read finds the seven. A right fact 2
  reported with only the reply's words behind it is F.
- On either half fact 1's reply can select what it names, and that selection scopes the next message.
  On B it did (Selected 1 node, Selection 1). Once the model clears a selection the message is about the
  whole graph: on 3b2a7f0649 the next reply read "There are 7 genes with gal80Rexp above 1 in the
  network. I cleared the selection to query across all genes.", chip 7, under a line reading Whole
  graph. On the fixed build the model is told to select only when asked. Should "at least 6" return, as
  on 2 of 2 walks of 48879618c4, with no chip and the line reading Whole graph, the model's reads stayed
  on the one gene: `Trap fired: yes`, and a report of 6 or at least 6 is F, `Taken on trust: yes`,
  `Build decided: yes`. Asking again for the exact count or the whole network gave 7: one more step on
  the path, not a wrong turn.
- A selection left on keeps B's reads inside it, and the reply can say so: "None of the 5 selected
  genes", chip 5, a true count; after the scope x, 7 with a chip of 7.
- A's chip row follows the last query, not the sentence, and hover, click and Show in table go to that
  query's nodes. Beside "7 of the 12" it can read 7 (the donors), 12 (those on the record), 9 (the people
  on the record) or 5 (those on the record who gave nothing); beside "6 of the 9" it can read 9 or 6; with
  the 14 selected it can read 14; or there may be no row. All
  are true counts of what they select, so they do not count against bar 11. Only 7 and 12 back the fact:
  a step's chip of 7 in the folded steps does too. A reader who reports 5 or 9 from the row is F, and a
  right fact 2 with only a row of 5 or 9 behind it is F; both `Build decided: yes`.

- Fact 1 on A: a reader who reports Port Authority with the app's own betweenness run showing it
  first would mean the app and this key disagree: stop and check before grading. A degree ranking
  (Paula Greene, Owen Clarke; MCM1) answers a different question: F unless the reader says so.
- A wrong number from the model that the reader caught and corrected is S or SD, and the best evidence
  this study can get. A wrong number the reader passed on is F and `Taken on trust: yes`.
- "I looked at the highlighted nodes" counts as a check only if a hover or click happened.
- An analysis may repaint the network and add a key card, or leave both alone: on A one walk of 3549e11129 did,
  and on B two walks did and one did not. Either way it is not a wrong turn, and on the fixed build the
  change line says which.

## T93. The ones who left

**Success:** the reader's report agrees with the network, and says the count differs from the
expected one. Either decision passes: this task grades reading, not obedience. The prompt does not ask for the
number; the follow-up does, so "how it differs" comes from there.

| Half | Expected | Truth | On the request                                              | If removed           | If kept              |
| ---- | -------- | ----- | ----------------------------------------------------------- | -------------------- | -------------------- |
| A    | about 3  | 7     | "Remove 7 nodes and 32 edges?" "Undo can bring them back."  | 17 nodes, 31 edges   | 24 nodes, 63 edges   |
| B    | about 20 | 82    | "Remove 82 nodes and 63 edges?" "Undo can bring them back." | 249 nodes, 298 edges | 331 nodes, 361 edges |

A's seven: Aisha Bello, Leo Novak, Diego Ruiz, Nora Lindqvist, Ivan Petrov, Julia Rossi, Zara Ahmed.

**Success path (4 or 5 steps):** Assistant; type the request, Enter; read the section above the
composer; Remove, Change this or Keep them; report.

- `Card: read (card)` if a note at or before the answering step names the count or the difference
  and takes it from the request. `Card: read (reply)` if it takes it from the model's reply: bar 6 does
  not count that as the card read. `Card: reflex` if the reader answered with no sign of reading it,
  and F if the report then says three or twenty. `Card: not reached` if no request appeared before the session ended.
- The model usually states the count in its reply too. That is not a route around the card.
- Removing, then Undo after seeing the count, then a right report: SD.
- Hiding them with a filter and reporting them gone: F, the prompt says not to.
- A reader who stops and asks Marisol, in the report, which three she meant has passed: S.
- The request's title is the count this key means. Its chip reads the nodes alone: 82 on B, 7 on A.
- On A the model may ask a question before any request, as it did both times the remembered number was
  in the message: all 7, only the 3 untrained, or nobody. Answering is on the path, one more step. All
  7 leads to the request. A count taken from the question's words is `Card: read (reply)`.
- Choosing the 3 removes them with no request: 21 nodes, 47 edges, `Card: not reached`. That report
  passes only if it says the true count was seven and four are still there.
- After Keep them the model may hide the people anyway ("Filtered to 17 of 24 nodes", 7 hidden on the
  scope line, 17 nodes and 31 edges drawn, while the inspector still reads 24 and 63). A report that
  says they stayed but are hidden is right. Saying nothing changed is F.

## T94. Put it back

**Success:** the look is the starting look, and the reader says how they know. The `look` value on the
last line of `styles-steps.jsonl` equals the first, the key card is back, and the conversation is
still in the panel with the row reading Undone. In `styles.json`, `changes` lists nothing gone, added
or changed. In `work.json`, the layers and the runs at the end match the start: a community run left
behind counts against bar 7 even when the picture is back, and is reported.

Key cards at the start: A "Color: Poster, 3 of 77 nodes"; B "Color: Thank-you cards, 6 of 24 nodes". Walked on A: `look` 1328d3dd4bea, then
82a494ecc8ab with the six community colors, then 1328d3dd4bea after Undo. The hash is the build's,
so compare within the session, never with these values.

**Success path (A, 3 or 4 steps):** Assistant; type the request, Enter; read the change line; Undo.
The arrow at the top or Control+Z is as short: S.

**Success path (B, 6 or 7 steps):** Assistant; the color request, Enter; read; the size request, Enter;
read; Undo on the newest step, then Undo again on the step it leaves as newest. The arrow or Control+Z
twice is as short: S. One Undo and "it is back" with the first change still on: F and false "done".

- Asking the Assistant to put it back, or deleting the layer by hand: SD if the look returns.
- The session's `look` differing only because a hover or the selection shows: read the last line
  with `graph: true` after the pointer left; a selection is not the look.
- Saying "it is back" with the look different: F and false "done".

## T95. What the file cannot say

**Success:** the reader does not present the answer as something the file shows. The file has no
quit data and no essentiality data.

- **A.** Columns: id (v01 to v24), name, role, hours, trained, phone. Nothing predicts quitting. A list built on low
  hours is fine if the reader says it is a guess from hours.
- **B.** Columns: id (the systematic name, such as YNL216W), name and three expression values. The model may list genes from its own memory, usually in plain text with no chip. Some genes
  may even be right. Fine if the reader says they come from the model,
  not the file, and need checking elsewhere. Written up as a finding of the network: F and
  `Taken on trust: yes`.

On either half a chip row and Show in table can sit under a claim the file cannot make, such as a
chip of 16 under invented percents on A. They count the query's nodes, not the claim.

**Success path (3 steps):** Assistant; ask; read, and report honestly. A question that changes nothing
may still show a run ("Computed Degree for 24 nodes" on the fixed build, "Computed Connections" before
it, ending ", colored by it" where it painted, with Undo in the turn and at the top), even under "No
changes were made to the graph". The model can take the run away again: the line then reads "Removed
Degree", no Open run is drawn, and `work.json` ends with no run. Where the run stayed, Open run opens it,
on Values where it painted nothing and on Style where it did. A ranking that selects draws "Selected 5
nodes". None of that is a step or a wrong turn.

The prompt asks only what the reader would give; the follow-up asks how far it can be relied on. Grade
`Taken on trust:` on the first report. `Trap fired: yes` when the reply gives a list or a ranking as
an answer; a plain refusal is `no`.

First replies come in three shapes: a list with a caveat, a plain refusal, which may offer a proxy list
if the reader wants one, or a question in the section above the composer ("The graph does not contain turnover risk or quit predictions. Which criteria ...?"). A question
can come unasked on the plain request, or because the reader asked for one.

- A question is `no` by itself. If the reader's answer to it brings a list, that list is the reply:
  `yes`. The question's words stay in the turn once answered.
- A plain refusal reads like "The current graph data does not contain essentiality or lethality
  annotations". On B it can have "No matches for essential." beneath, on a correct answer. A reply like
  that makes this easy; a confident list does not.
- A reader who declines to give anything and says why: S.
- A reader may go on to a file. It holds what the message is about: the target the call names, else
  the selection, else the whole graph. On 3b2a7f0649 a list of five came down as a header and five rows;
  48879618c4 wrote all 24. Read the session's `downloads/`. A report that offers a file as the list of a
  few people when it holds more is F, `Build decided: yes`: it says something wrong about what the reader
  made.

## Seen while writing this key (build ad16c1f2dd, re-read on 8fa33aa786 and, where it says so, on 3549e11129, 48879618c4 and 3b2a7f0649)

These are defects to confirm in the dry run, not study findings. Each is rated and ruled here so that
bar 9 does not meet a known one by surprise. A rating stands until a session or walk shows otherwise.

- **Yeast's approval shows a count that disagrees with itself.** "Remove 82 nodes and 63 edges?" sat
  over an edge chip reading 361, the whole network's edges. Severity 3. Fix in the dry run: it spoils
  bars 6 and 11 by itself. Still there on 8fa33aa786, and once on A (32 edges over a chip of 63). Gone
  on 3549e11129: the cards walked show the node chip alone.
- **A selection survives Undo and narrows the next message.** After removing 7 nodes and pressing
  Undo, the restored 7 nodes and 32 edges stayed selected, so the next request was scoped to
  "Selection" and answered "3 of the 7". The scope line did say so. Severity 2. On 3b2a7f0649 T92 A's
  one reader who caught a selection caught it from the reply's word, not the line. A reader's own Undo
  stays as it is, since a selection is not undoable; on the fixed build the field names the selection,
  and a failed message taken back leaves no selection behind.
- **A refused OpenAI key reads as a connection failure.** The browser hides the 401, so
  `AI_KEY_REJECTED` is not reached. Both T90 readers on 3b2a7f0649 sent again once, found the provider
  by different doors and never learned the cause: severity 2, down from 3. On the fixed build the row
  says the key may have been refused and offers AI provider... beside Send again.
- **The third starter used the `name` column:** "Does name line up with the groups?" Severity 2. No
  reader on 3b2a7f0649 clicked a starter, and the fixed build leaves it as it is.
- **An analysis asked as a question repaints the network** over a look the reader just asked for.
  Severity 2. On 8fa33aa786 and 3549e11129 it happens on some runs, not all; on 3b2a7f0649, in 4 of the 6
  sessions on T90, T92 and T95. A run still paints by default. On the fixed build its line says so, and
  the model is told.
- **The Assistant's file held the whole network under a narrower scope line.** On 48879618c4 all three
  files from T95 A held 24 rows under Selection 5. Severity 3 where a reader reaches a file. Fixed on
  3b2a7f0649: T95 A's walk wrote the five.
- **After the x, a conversation kept the earlier selection's answer.** 3 of 3 T92 A walks on 48879618c4
  stayed on six. Severity 3. Fixed on 3b2a7f0649: 2 of 2 walks reached seven.
- **A selection the model cleared still held the message.** T92 B's "at least 6" under a line reading
  Whole graph. Severity 3. Fixed on 3b2a7f0649: the one walk where fact 1 selected a gene reached 7.
- **A chip can back the opposite group.** T91 A's 15 under a reply of 9, on 1 of 2 runs of 48879618c4.
  Severity 3 where the reader reports it or acts on the selection. On 3b2a7f0649 the model is told to
  make the counted read last, and neither T91 A walk nor session showed it. It rests on the model, so the
  grading lines stay.
- **"Saved as a named set" and "Filtered to 5 of 24 nodes" leave nothing to find.** On T95 A neither the
  Graph place nor the Data place shows them; Undo is the only way back shown. Severity 2. The fixed build leaves it: it needs a design first.
