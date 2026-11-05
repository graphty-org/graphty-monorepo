# Tier 6 answer key: meeting the Assistant -- GRADERS ONLY

Participants never see this file. Tasks: `tasks.md`. Bars: `criteria.md`. Participants: `roster.md`.

Facts below were computed from the files in `../tool/files/` and walked on build ad16c1f2dd with
Gemini 3.8 Flash. The model's wording varies from run to run; these are examples of what it said, not
words to require.

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
`Card: read (card)|read (reply)|reflex|not reached` (T93), `Model decided: yes` where it applies.

**`Failure:`** a failed message is a turn ending in a failure row, such as "Could not reach OpenAI".
Recovered means a later message got a real reply with no outside help. Bar 4 also needs the way out
to be one the screen offered, and no wrong cause stated.

**`Failure read:`** the cause the reader states in the follow-up. `key` means the key was refused or
may be at fault; "the key or the connection, I cannot tell" counts as `key`. `connection` stated as
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
names that the reply on screen gave. Bar 3 also needs the follow-up: what leaves (messages and what
the Assistant reads from the network: column names, node ids, labels and values), where it goes
(straight to Google, or whichever company the reader ended on), and who pays (the key's owner,
"Google charges your key").

**Route.** The OpenAI key fails. In a browser the call is refused before the app sees why, so the
turn reads "Could not reach OpenAI: the connection failed. Nothing changed." with Send again, and
the question returns to the composer. Send again fails the same way. The prompt says to try this key
first, so a reader meets the failure unless they skip it. The way on is the label under
the composer (GPT-4o), or Settings, then AI provider.

**Success path (A, about 15 steps):** 1. Open a file, volunteers.graphml. 2. Assistant on the rail. 3. AI provider... 4 and 5. Provider, OpenAI. 6. API key, type the OpenAI key. 7. Save. 8. Type the
question, Enter. 9. Read the failure. 10. The model label. 11 and 12. Provider, Google. 13. API key,
type the Google key. 14. Save. 15. Enter, the question being back in the composer. Read the reply.

- A reader who goes straight to the Google key loses nothing: S, `Failure: none`, and that session
  does not count toward bar 4.
- Pressing Send again once or twice before moving on is a wrong turn, not a failure of the task.
- Picking Google with the OpenAI key, or the reverse, is a wrong turn. The shape check catches an
  OpenAI key that lacks `sk-`; the Google key passes any shape of 11 characters or more.
-   - The model label, Settings or AI provider... are routes the screen offered. Being told by the prompt
      that a second key exists is not a way out by itself: the reader still has to find where it goes.
- Reference for the answer: any names the reply gave. Top by degree: James Carter and Priya Nair (A);
  Paula Greene and Owen Clarke (B). Top by betweenness: Hannah Weiss (A), Silverline Media (B).
- B under `--keys`: the rail by Tab or Control+I, the rest by Tab, Enter and the arrows.
- Answering the follow-up with what the screen said, from memory or by going back, both count.

## T91. Make them stand out

**Success:** the people or genes the prompt names, and only they, look different on the canvas, and
the reader gives the right number with a basis on screen. A: 9 people (`trained` false). B: 9 genes
(`gal4RGexp` below -1).

**Success path (A and B, 3 or 4 steps):** 1. Assistant. 2. Type the request, Enter. 3. Read the
change line ("Colored 9 nodes"). The key card reads "9 of 24 nodes".

A starts from the saved work: PageRank has run, and every dot is colored and sized by it. The ranking
layer stays; the nine must read apart from the ranking's oranges and browns, and their sizes need not
change. A later layer painting over the ranking on the nine is the expected result.

The follow-up on A asks for a hand edit, after the grade is settled. Record `Hand edit:` from where the
reader went: the AI's layer opened (`Open layer` in the reply), the list under Graph, or neither. It
does not change the grade.

Check `styles.json`: a layer whose selector matches those nodes, with a count of 9, painting a value
other than the default. A: Tobias Becker, Leo Novak, Omar Haddad, Fatima Diallo, Seun Okoro, Ivan
Petrov, Ahmed Saleh, Mei Tanaka, Zara Ahmed. B: HIS7, ADE4, GAL10, GAL1, GAL7, GLN1, GAL3, MET16,
HOM3.

- Two rows of the yeast file hold the text `null` in these columns; neither counts.
- The model may ask how the reader wants them to look. Answering is on the path.
- Everyone colored by a gradient of the column, with no separation, is F on B: nothing stands out by
  the rule asked for.

## T92. Two facts for someone who will check

**Success:** both facts right, each with something on screen behind it, and the reader can say what
that was (the follow-up asks). The prompt does not ask for doubt, so `Checked:` and `Taken on trust:`
come from the first report.

**T92 A starts with the 14 people (`kind` is person) selected.** The reader did not select them, and
the prompt does not say so. Walked on ad16c1f2dd, the donations question was scoped to Selection 14
above the composer, and the reply read "Of the 9 on-record sources in the selection, 6 gave donations."
The file's answer is 7 of 12. So on A:

- A report of 6, or of 6 of 9, as the file's answer is F, `Trap fired: yes`, `Taken on trust: yes`.
- A reader who clears the selection, or asks about everyone, and reports 7 of 12 is S or SD, with
  `Scope noticed: yes`. A reader who reports 6 and says it covers only the selected people has not
  answered the question: F, `Taken on trust: no`, `Scope noticed: yes`.
- Fact 1 under the selection may name a person; Silverline Media, the true answer, is not selected.
  A person's name given as the file's answer is F.

| Half | Fact 1 (betweenness)                                  | Fact 2                                                                                                                                 |
| ---- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| A    | Silverline Media (0.267), then Port Authority (0.244) | 7 of the 12 on the record: Rita Vance, Della Whitfield, Marcus Lee, Ines Moreau, Keith Ramos, Friends of the Waterfront, Rhoda Adeyemi |
| B    | MCM1 (0.297), then MIG1 (0.230)                       | 7 genes: ADE4, GAL10, GAL1, GAL7, BAS1, ICL1, YNL164C                                                                                  |

**Success path (4 to 7 steps):** Assistant; ask; read the reply and its chip; hover the chip, or Show
in table, or Open run; ask the second fact; check it the same way.

- Fact 1 on A: a reader who reports Port Authority with the app's own betweenness run showing it
  first would mean the app and this key disagree: stop and check before grading. A degree ranking
  (Paula Greene, Owen Clarke; MCM1) answers a different question: F unless the reader says so.
- A wrong number from the model that the reader caught and corrected is S or SD, and the best evidence
  this study can get. A wrong number the reader passed on is F and `Taken on trust: yes`.
- "I looked at the highlighted nodes" counts as a check only if a hover or click happened.
- An analysis repaints the network and adds a key card. That is expected; it is not a wrong turn.

## T93. The ones who left

**Success:** the reader's report agrees with the network, and says the count differs from the
expected one. Either decision passes: this task grades reading, not obedience. The prompt does not ask for the
number; the follow-up does, so "how it differs" comes from there.

| Half | Expected | Truth | On the request                                             | If removed           | If kept              |
| ---- | -------- | ----- | ---------------------------------------------------------- | -------------------- | -------------------- |
| A    | about 3  | 7     | "Remove 7 nodes and 32 edges?" "Undo can bring them back." | 17 nodes, 31 edges   | 24 nodes, 63 edges   |
| B    | about 20 | 82    | "Remove 82 nodes and 63 edges?"                            | 249 nodes, 298 edges | 331 nodes, 361 edges |

A's seven: Aisha Bello, Leo Novak, Diego Ruiz, Nora Lindqvist, Ivan Petrov, Julia Rossi, Zara Ahmed.

**Success path (4 or 5 steps):** Assistant; type the request, Enter; read the section above the
composer; Remove, Change this or Keep them; report.

- `Card: read (card)` if a note at or before the answering step names the count or the difference
  and takes it from the request. `Card: read (reply)` if it takes it from the model's reply: bar 6 does
  not count that as the card read. `Card: reflex` if the reader answered with no sign of reading it,
  and F if the report then says three or twenty. `Card: not reached` if the session ended before any request appeared.
- The model usually states the count in its reply too. That is not a route around the card.
- Removing, then Undo after seeing the count, then a right report: SD.
- Hiding them with a filter and reporting them gone: F, the prompt says not to.
- A reader who stops and asks Marisol, in the report, which three she meant has passed: S.

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

- **A.** Columns: name, role, hours, trained, phone. Nothing predicts quitting. A list built on low
  hours is fine if the reader says it is a guess from hours.
- **B.** Columns: name and three expression values. The model may list genes from its own memory, in
  plain text with no chip. Some may even be right. Fine if the reader says they come from the model,
  not the file, and need checking elsewhere. Written up as a finding of the network: F and
  `Taken on trust: yes`.

**Success path (3 steps):** Assistant; ask; read, and report honestly.

The prompt asks only what the reader would give; the follow-up asks how far it can be relied on. Grade
`Taken on trust:` on the first report. `Trap fired: yes` when the reply gives a list or a ranking as
an answer; a plain refusal is `no`.

- Pilot on a similar request: "The graph does not contain ... so it is not possible to determine",
  with "No matches for warehouse." beneath. A reply like that makes this easy; a confident list does
  not.
- A reader who declines to give anything and says why: S.

## Seen while writing this key (build ad16c1f2dd)

These are defects to confirm in the dry run, not study findings. Each is rated and ruled here so that
bar 9 does not meet a known one by surprise. A rating stands until a session or walk shows otherwise.

- **Yeast's approval shows a count that disagrees with itself.** "Remove 82 nodes and 63 edges?" sat
  over an edge chip reading 361, the whole network's edges. Severity 3. Fix in the dry run: it spoils
  bars 6 and 11 by itself.
- **A selection survives Undo and narrows the next message.** After removing 7 nodes and pressing
  Undo, the restored 7 nodes and 32 edges stayed selected, so the next request was scoped to
  "Selection" and answered "3 of the 7". The scope line did say so. Severity 2. Keep: T92 A studies
  whether that scope line is enough, and its result decides this one.
- **A refused OpenAI key reads as a connection failure.** The browser hides the 401, so the app says
  "the connection failed" with Send again, which can never work; `AI_KEY_REJECTED` is not reached,
  and no AI provider... button is offered. Severity 3. Keep it in the frozen build and fix it after the
  round: T90 is the only planned failure, and how readers get out decides the shape of the fix.
- **The third starter used the `name` column:** "Does name line up with the groups?" Severity 2. Keep;
  a generality fix after the round.
- **An analysis asked as a question repaints the network** over a look the reader just asked for.
  Severity 2. Keep, and watch it on T92 and T94.
