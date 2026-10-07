# Tier 1 tasks for participants

The tasks of a first-time user's core path, as given to simulated participants on the real
graphty app (local production build at `/?next`, driven by `tool/real.mjs`). Success definitions
and paths are in `answers.md`, which participants never see. T1 and T4 are kept for the record but
are not run in tier 1 rounds (see `criteria.md`, "Round plan").

## Rules for whoever runs a session

- A participant gets: their persona file, the **Prompt** below (word for word), the tool's
  participant instructions (`tool/README.md`, "A session" and "Steps"), and nothing else -- no
  notes, digests, design documents, answer key or source code.
- Prompts use no word that the target control shows (no "label", "layout", "export", "analyze",
  "style", "find", "save", "open project"), and no interface words (button, menu, panel, tab).
  Data words are allowed where they are the data's own (the Les Miserables attribute is `name`).
- Every start is a fresh browser with empty storage. **Empty** = `--start <dir> empty`.
  **Setup** = `--start <dir> setup:<file>` with the listed steps, which the participant never sees.
  Setup control names are confirmed in the rehearsal before round 1. A setup picks an Analyze
  method by clicking it, never by Enter, so a setup never depends on a keyboard fix.
- A session ends when the participant says they are done, gives up, or keeps repeating without
  progress; there is no step cap (from round 2; round 1 capped at 40 steps, 60 for T15). After
  each step the participant says in one or two sentences what they see and what they will try
  next, says out loud when each part is done, and ends by rating the task "How easy or difficult
  was this, from 1 (very difficult) to 7 (very easy)?"
- The runner keeps at most 4 participants alive at once, so no session waits for a browser slot.
- Simulated participants may know the datasets from their training (Les Miserables, the karate
  club, the Florentine families). Answers count only when read off the screen.
- Files named below are in `tool/files/`; the prompt calls the folder "your Downloads folder".
- For the screen-reader participant, a prompt's statement about the drawing ("no names are
  written on the drawing", "bigger dots") is a given, not something to check. The visual wording
  stays: a blind analyst still makes pictures for others.
- Words a prompt shares with the screen on purpose (the wording check in `criteria.md` lists the
  rest): "connections" in T6, because the task is reading a count and it is the everyday word for
  a tie, not a control to find; `label` in T10 B, because it is College football's own attribute
  name (T10 is decided per dataset, and a pass on B with a fail on A is reported as a wording echo,
  not a pass).
- The wording check of 2026-10-06 (`tmp/researcher/wording-check.py` over 45 screens of commit
  9d6598eea; it catches a planted echo) found these other shared words, kept for the reasons given:
    - "file" (T13, T15: "a picture file", "a file Excel can open") is the start screen's "Open
      project or file..." and the project menu's. Neither task's step is finding that control; the
      word is the everyday name of what is saved. (T5's "a network file" was reworded to "a network"
      because T5's target IS "Open project or file...".)
    - "picture" and "drawing" (T13, T15) are in the Export dialog's description of its Image kind.
      The words show only after the hard step (finding Export) is done, and Image is already chosen.
    - "top" (T7: "the top three") is the Values heading "Top 10" where the order is read. It is a
      heading, not a control, and the everyday phrase; the step T7 measures is getting a ranking run.
    - "order" (T7) also names "Depth-first order" in the Analyze list, a method that does not rank.
      It can only lure a participant to a wrong turn (a possible false fail, never a false pass), and
      whether "order" misleads is worth seeing.
    - "colors" and "sizes" (T9, T15: "what the sizes and the colors stand for") are the legend's
      "Color: ..." and "Size: ..." lines, which is where the answer should be read.
    - "everything", "kept", "choose" (T14) are the Everything row, the start screen's "They are kept
      in this browser" and the Save as hint "Choose where the file goes next". None names the save
      or reopen control.
    - "connections" also names the Degree run ("Connections") and the neighbor list ("Javert's 17
      connections"); T12 avoids it, T6 keeps it (above).
    - "clusters" (T11) is in an Analyze description; T11 is solved in Layout, so it can only lure.
    - Words that appear only in usage-data or settings text (between, help, helped, read, see,
      leading, together, short, computer) name no target control.
- The wording check of 2026-10-06 for round 2 (`tmp/researcher/r2/wording-check.py` over 48
  screens of commit 4a7a1a7fb, T2 now included; it catches a planted echo) found these further
  shared words, kept for the reasons given, plus one reworded (T14's "back", above):
    - "data" (every sample prompt's "not on your own data"; T2 "your own data") is the left rail's
      "Data" button. The phrase is the same in round 1, so rounds stay comparable. It is a target
      only in T6 (Data lists the recorded facts); T6's facts are also on the table and the Values,
      and graders record whether a T6 participant went to Data straight after reading the word.
    - "file", "change", "answer", "help", "see", "back" (T2) are the start screen's "Open project or
      file...", the usage card, its "Change this in Settings > Privacy" line, the analysis forms'
      Back arrow and the menu's "Back to start". T2's target is a sample; "change" leads to the line
      that answers T2's last sentence, which is a measure, not graded.
    - "keep" (T8 "keep turning up", T13, T16) and "pick" (T8 "pick out") are the Layout list's "Keep
      positions" and the label pop-out's "Pick an attribute". Neither is on those tasks' paths, so
      they can only lure (a possible false fail, never a false pass).
    - "saved" and "computer" (T3, T5, T14, T15) are the Export dialog's footer "Saved to this
      computer only" and the start screen's "Files are read on this computer". Neither names the
      control a task measures; the footer shows only after Export is found.
    - "drawing" (T9, T10, T13, T15) also shows in the label pop-out and the Export dialog's Image
      description, after the step that matters is done.
    - "numbers" and "open" (T13) are on the Analyze list, the Data page and the main menu's "Open"
      rows, not on the export path.
    - "carry", "point", "reached", "drawn", "away" are words of the Analyze list's method
      descriptions; no task's target is a method found by those words.
- Words the round 3 build adds (checked 2026-10-07 against the prompts, then by the wording check
  on the served round 3 build, below). No prompt changes:
    - The "Show all labels" switch is a target in T10 and T15 only. Neither prompt says "show",
      "all" or "labels" (T10 asks for "every character's name", kept on purpose: it is the real goal,
      and rewording it to fit the build would hide a gap). T10 B's `label` (the attribute) shares a
      word with the switch; the per-dataset rule above already treats a B-only pass as an echo.
    - "show" (T9 "make the drawing show") and "all" (T3 "all of it arrived", T14 "all of your
      work") share words with the switch; none of those tasks' targets is the switch, so they can
      only lure.
    - Runs named by method ("PageRank", "Louvain") and the Size list opening at once add no word a
      prompt uses. No prompt says "picker", "method" or a method's name.
- The wording check of 2026-10-07 for round 3 (`tmp/researcher/r3/wording-check.py` over 51
  screens of build b7590f8de, the screens now including the Size list, "Show all labels" and the
  group layouts; it catches a planted echo) found three words not shared before, all kept:
    - "finish" (T15: "finish with a picture file") is the hidden status line's "PageRank finished",
      which a screen reader hears and nobody sees. It names no control and comes after the step.
    - "fix" (T5: "what to tell your coworker to fix") matches "Fixed size" in the Size list by its
      stem only; T5 never reaches the Style tab.
    - "exactly" (T5: "know exactly what to tell") is in graphty-element's refusal of "Two columns"
      in the Layout list; T5 never reaches Layout.
      "Show all labels" shares "show" with T9 (found, and kept as above); "all" is a function word
      the check skips (T3 and T14 use it, kept as above). T10 and T15 say neither.

## The tasks

### T1. First launch and usage data (not run in tier 1 rounds)

Every empty start meets the usage card, so the card is measured across all of them, and the
"change your mind later" question is the last sentence of T2.

- **Prompt:** "You are opening this program for the first time, on a work laptop. Before you put
  any data into it, decide whether you are comfortable with what it may send back to its makers,
  and make that choice. Then tell us how you would change your mind later."
- **Start:** empty. **Files:** none.
- **Suits:** anyone; weighted to people on managed work machines (bank, nonprofit, newsroom).
- **Changed from round 8 (r8-t15):** adds "how you would change your mind later" (the design asks
  that the answer be changeable from the header).

### T2. Something to try it on

- **Prompt:** "You have just installed this program to see whether it could help with your work,
  but your own data is not ready yet. Before you spend time on your own file, you would like to
  see the program working on something. Get something onto the screen to try it on, and tell us
  what it is. Last, tell us how you would later change your answer about what the program may
  send back to its makers."
- **Start:** empty. **Files:** none.
- **Suits:** first-time users, anyone evaluating a tool.
- **Changed from round 8 (r8-t02):** adds the last sentence, from the dropped T1. It is recorded
  as a measure, not graded.

### T3. Your own list of ties

- **Prompt:** "You have never used this program before. A friend kept a list of who in your
  running club knows whom; it is saved as friends.csv in your Downloads folder. Bring it into the
  program, get it drawn, and check that all of it arrived: how many people, how many ties between
  them, and that nothing was dropped on the way in."
- **Start:** empty. **Files:** `friends.csv`.
- **Suits:** first-time users with a spreadsheet (student, reporter, nonprofit analyst).
- **Changed from round 8 (r8-t03):** a links spreadsheet instead of a Les Miserables GEXF file (no
  such file exists, and it would duplicate a sample on the start screen); the task now continues
  past loading to the drawing, which the mock never let anyone reach.

### T4. Two spreadsheets as one network (not run in tier 1 rounds; a tier 2 candidate)

Tier 2 runs this task in the returning-user version under "Tier 2 tasks" below, with a second
dataset; the version here is kept for the record.

- **Prompt:** "You have never used this program before. Two spreadsheets from your office are in
  your Downloads folder: people.csv lists the staff, and messages.csv lists who emails whom and
  how often. Get them into the program as one network, drawn, and make sure every person and
  every link arrived. Tell us anything that did not fit."
- **Start:** empty. **Files:** `people.csv`, `messages.csv`.
- **Suits:** spreadsheet users (nonprofit analyst, reporter, supply-chain analyst).
- **Changed from round 8 (r8-t04):** an office's staff and emails instead of machines and network
  links, with one row naming a person not on the staff list; continues past loading.

### T5. A file that will not read

- **Prompt:** "You have never used this program before. A coworker emailed you a network of the
  members of a club; it is saved as club-members.graphml in your Downloads folder. Bring it
  into the program and either get to a point where you can carry on working, or know exactly what
  to tell your coworker to fix."
- **Start:** empty. **Files:** `club-members.graphml` (cut off part way through).
- **Suits:** anyone who receives files from others.
- **Changed before round 1 (2026-10-06):** "a network file" became "a network": "file" is a word
  of the target control, "Open project or file...".
- **Changed from round 8 (r8-t05):** the file is cut off rather than holding a repeated id and a
  link to a missing node (the element does not report row-level faults yet).

### T6. What did I get?

- **Prompt:** "You have never used this program before. You will practice on the ready-made
  network of characters from the novel Les Miserables that comes with the program, not on your own
  data. Get it on screen and work out what you have: how many characters there are, how many
  connections between them, whether every character can be reached from every other, and what
  facts are recorded about each character and each connection."
- **Start:** empty. **Files:** none.
- **Suits:** everyone.
- **Changed from round 8 (r8-t06):** also asks what is recorded about each connection.

### T7. Who matters most (two datasets)

- **Prompt A (Les Miserables):** "You have never used this program before. You will practice on
  the ready-made network of characters from the novel Les Miserables that comes with the program,
  not on your own data. Have the program put the characters in order of how much the whole
  network depends on them, and tell us the top three, in order, and what the order was based on."
- **Prompt B (running club):** "You have never used this program before. A friend's list of who in
  your running club knows whom is already drawn in it. Have the program put the people in order of
  how much the whole club depends on them, and tell us the top three, in order, and what the order
  was based on."
- **Start:** A empty. B setup -- `--click No thanks`; `--click "Open project or file..."`;
  `--upload friends.csv` (the file is drawn at once; there is no import page and no Load).
  **Files:** none for the participant.
- **Suits:** everyone. Four participants per dataset.
- **Changed from round 8 (r8-t07):** a second dataset the model cannot know from training, so the
  answer has to come off the screen.

### T8. Circles of characters

- **Prompt:** "You have never used this program before. You will practice on the ready-made
  network of characters from the novel Les Miserables that comes with the program, not on your own
  data. Have the program pick out the circles of characters who keep turning up together. Tell us
  how many circles it came up with, how big the largest one is, and three of the characters in
  it."
- **Start:** empty. **Files:** none.
- **Suits:** everyone; marketing and community roles especially.
- **Changed from round 8 (r8-t08):** "three of the characters in it" instead of "which character
  is at its center", which no screen defines and a participant could answer from memory.

### T9. Bigger dots for the ones that matter (two datasets)

- **Prompt A (Les Miserables):** "You have never used this program before. You will practice on
  the ready-made network of characters from the novel Les Miserables that comes with the program,
  not on your own data. Make the drawing show which characters the network depends on most: the
  more it depends on a character, the bigger that character's dot. Then tell us what the sizes and
  the colors on the drawing now stand for."
- **Prompt B (Florentine families):** the same, with "the ready-made network of the leading
  families of Renaissance Florence and the marriages between them" and "family" for "character".
- **Start:** empty. **Files:** none.
- **Suits:** everyone. Four participants per dataset.
- **Also changed for the studio:** a second dataset (every flow task runs on two), and the last
  sentence, because understanding the result is the point of tier 1.
- **Changed from round 8 (r8-t09):** starts empty (the sample now opens with nothing worked out),
  so the participant must have the program work it out first; "leave the colors as they are" is
  dropped, because a finished result now colors the drawing by itself (owner rule, 2026-09-30).

### T10. Names on every dot (two datasets)

- **Prompt A (Les Miserables):** "You have never used this program before. You will practice on
  the ready-made network of characters from the novel Les Miserables that comes with the program,
  not on your own data. Right now no names are written on the drawing. Get every character's name
  written next to its dot."
- **Prompt B (College football):** "You have never used this program before. You will practice on
  the ready-made network of American college football teams and the games they played, which
  comes with the program, not on your own data. Right now no names are written on the drawing. Get
  every team's name written next to its dot."
- **Start:** empty. **Files:** none.
- **Suits:** everyone. Four participants per dataset.
- **Changed from round 8 (r8-t10):** "no names" instead of "only a few" (true of the real app at
  rest); a second dataset, because the fix being tested changed what the control does.

### T11. Untangle the drawing

- **Prompt:** "You have never used this program before. You will practice on the ready-made
  network of characters from the novel Les Miserables that comes with the program, not on your own
  data. Try a different way of arranging the dots so the clusters of characters are easier to tell
  apart, and tell us whether it helped."
- **Start:** empty. **Files:** none.
- **Suits:** everyone.
- **Changed from round 8 (r8-t11):** drops "looks crowded in the middle" (the real drawing may not
  be); asks whether it helped.

### T12. One character and who he is tied to (two datasets)

- **Prompt A (Les Miserables):** "You have never used this program before. You will practice on
  the ready-made network of characters from the novel Les Miserables that comes with the program,
  not on your own data. Go to the police inspector Javert, read what the program knows about him,
  and see which characters he shares chapters with. Tell us who they are and how many."
- **Prompt B (Florentine families):** "You have never used this program before. You will practice
  on the ready-made network of the leading families of Renaissance Florence and the marriages
  between them, which comes with the program, not on your own data. Go to the Medici family, read
  what the program knows about them, and see which families they married into. Tell us who they
  are and how many."
- **Start:** empty. **Files:** none.
- **Suits:** everyone; investigators and reporters especially. Four participants per dataset.
- **Changed from round 8 (r8-t12):** asks for the names and the number; a second dataset with no
  tie values.

### T13. A picture and the numbers for a report

- **Prompt:** "Earlier today you opened the ready-made network of Les Miserables characters that
  comes with this program and had it color the characters by the circles they keep turning up in.
  You now need two things for a report: a picture file of the drawing as it looks now, with its
  key to the colors, and the numbers the program worked out for each character in a file Excel can
  open."
- **Start:** setup -- `--click No thanks`; `--click Open the Les Miserables sample`; run Louvain
  from Analyze (`--key Shift+A`, `--type Louvain`, `--click Louvain`, `--click Run`).
- **Files:** none. **Suits:** everyone who reports to others. Runs only after the image legend
  fix passes (`criteria.md`, preflight).
- **Changed from round 8 (r8-t13):** a setup start with a result the prompt owns ("you had it
  color"), because the sample no longer opens with results; the empty-start version of this is
  the last step of T15.

### T14. Stop for the day and come back

- **Prompt:** "You have been working on the ready-made network of Les Miserables characters that
  comes with this program: you had it work out which characters matter most, and you put their
  names on the drawing. You must stop for the day. Make sure the work is kept on this computer
  under a name you choose, put it away as you would at the end of the day, and then return to it
  as if it were tomorrow. Tell us whether all of your work was there when you returned."
- **Start:** setup -- `rounds/pilot/T14/setup.txt`: `--click No thanks`; `--click Open the Les
Miserables sample`; select Everything; on its Style tab add a label line bound to `name`; then
  run PageRank from Analyze (`--key Shift+A`, `--type PageRank`, `--click PageRank`, `--click
Run`).
- **Files:** none. **Suits:** everyone; weekly analysts especially.
- **Changed before round 2 (2026-10-06):** "bring it back" and "everything came back" became
  "return to it" and "all of your work was there when you returned": the round 2 build's main
  menu closes a project with "Back to start", the step this task measures, so "back" became a
  word of the target control (wording check of 2026-10-06 on commit 4a7a1a7fb).
- **Changed from round 8 (r8-t14):** a setup start with work to keep, so "everything came back"
  can be checked; asks the participant to say whether it did.

### T15. A whole first session (two datasets)

- **Prompt A (Les Miserables):** "You have never used this program before. Using the ready-made
  network of characters from the novel Les Miserables that comes with the program, do what you
  would do in a first sitting: get it on screen, have the program work out which characters matter
  most, make the dots bigger for the characters that matter more, get the characters' names
  written on the drawing, and finish with a picture file, with its key, that you could paste into
  a document. Say out loud when each part is done, and what the sizes and the colors on the
  drawing stand for."
- **Prompt B (your own file):** "You have never used this program before. A friend kept a list of
  who in your running club knows whom; it is saved as friends.csv in your Downloads folder. Do what
  you would do in a first sitting with it: get it on screen, have the program work out which
  people matter most in the club, make the dots bigger for the people who matter more, get
  everyone's name written on the drawing, and finish with a picture file, with its key, that you
  could paste into a document. Say out loud when each part is done, and what the sizes and the
  colors on the drawing stand for."
- **Start:** empty. **Files:** A none; B `friends.csv`.
- **Suits:** everyone; first-time users above all. Six participants on A, four on B. Runs only
  after the image legend fix passes (`criteria.md`, preflight).
- **Changed from round 8 (r8-t01):** "make the dots bigger" instead of "colors or sizes", because a
  finished result now colors the drawing by itself and the size step was never measured; "with
  its key" is in the prompt; a second version on the user's own file, because a first real
  session is on one's own data, not a sample; "what the sizes and colors stand for".

### T16. First look

- **Prompt:** "You have just installed this program and have a short while to decide whether it
  could help with your work. Try it however you like: on something that comes with it, or on
  friends.csv in your Downloads folder, a list of who in your running club knows whom. When you
  have decided, tell us whether you would keep using it, and why."
- **Start:** empty. **Files:** `friends.csv`.
- **Suits:** first-time users only. Five participants.
- **New.** No success path and no grade: it measures what a newcomer does when nobody asks for
  anything (steps to the first drawing, whether any analysis is run, whether its result is read
  correctly, the verdict). It is a measure, not a gate, until a baseline exists.

# Tier 2 tasks

Tier 2 is the common work of a **returning** user: someone who has finished tier 1's core path
(open a file, run an analysis, color and name the dots, save) a few times and now comes back to
narrow the picture, trace a chain between two people, keep notes, bring in two spreadsheets as one
network, make every calculation read a tie's number the right way round, and redo work when the
data file changes. Each task has two datasets. Answers, success paths and the reference values
read from graphty-element are in `answers.md`, under "Tier 2 answer key".

## Rules for whoever runs a tier 2 session

Every rule of tier 1 above holds, with these changes:

- **Participants are returning users.** Use the returning-user persona files
  (`personas/returning-nonprofit-analyst.md`, `personas/returning-data-journalist.md`,
  `personas/returning-class-project-student.md`); the analyst personas of `roster.md` (Alex,
  Jordan, Dana) may also play returning sessions, told that they have used the program a few times.
  There is no keyboard-only and no touch persona in tier 2 (owner, 2026-10-07).
- **Prompts start with "You have used this program a few times"**, and a setup start describes the
  open work as the participant's own ("is already open").
- **Setups** are in `rounds/tier-2/setups/` and are run with `--start <dir> setup:<file>`:
    - `friends.txt`: `friends.csv` opened from the start screen (20 people, 41 ties).
    - `lesmis.txt`, `florentine.txt`: the sample opened from the start screen.
    - `friends-pagerank.txt`, `team-pagerank.txt`: the file opened, then PageRank run from Analyze
      (picked by click), so the participant's earlier ranking is on screen.
- **New files** in `tool/files/` (see `tool/README.md`): `bus-stops.csv` and `trails.csv` (one
  number per tie that is a length: minutes, kilometers), `players.csv` with `passes.csv` (a node
  sheet and an edge sheet, one pass naming a player not on the squad), and `team.csv` with
  `team-v2.csv` (the same team two months apart: two new people and five new ties).
- **The wording check has not been run on the tier 2 prompts.** The prompts below avoid every
  control name the pilots met (listed under each task); run the wording check on the tier 2
  screens before the first round, as for tier 1.

## The tier 2 tasks

### T4. Two spreadsheets as one network (two datasets)

- **Prompt A (office):** "You have used this program a few times, always on a single list. Two
  spreadsheets from your office are in your Downloads folder: people.csv lists the staff, and
  messages.csv lists who emails whom and how often. Get them into the program as one network,
  drawn, and make sure every person and every link arrived. Tell us anything that did not fit."
- **Prompt B (football team):** "You have used this program a few times, always on a single list.
  Your Sunday football team's coach keeps two spreadsheets, both in your Downloads folder:
  players.csv lists the squad, and passes.csv counts the passes between players in last week's
  match. Get them into the program as one network, drawn, and make sure every player and every
  pass arrived. Tell us anything that did not fit."
- **Start:** empty. **Files:** A `people.csv`, `messages.csv`; B `players.csv`, `passes.csv`.
- **Suits:** spreadsheet users (Grace returning, Alex, Dana).
- **Words kept on purpose:** "spreadsheets", "drawn". The pilot's controls on this path are "New
  from data...", "choose a file...", "Add a table", "File...", "Add", "Leave out", "Load"; the
  prompt says none of them ("get them into" is the everyday phrase).

### T17. Only the strong ties (two datasets)

- **Prompt A (running club):** "You have used this program a few times. Your running club's list
  of who runs with whom, friends.csv, is already open; its third column counts how many runs each
  pair did together last month. For a flyer about running partners you care only about pairs who
  ran together 4 or more times. Change the drawing so it has only those pairs, tell us how many
  people are still in it, and then bring the whole club back."
- **Prompt B (Les Miserables):** "You have used this program a few times. The ready-made network
  of characters from Les Miserables is already open; each tie counts the chapters two characters
  share. For a short essay you care only about pairs who share 5 or more chapters. Change the
  drawing so it has only those pairs, tell us how many characters are still in it, and then bring
  every character back."
- **Start:** setup `friends.txt` (A), `lesmis.txt` (B). **Files:** none to open.
- **Suits:** everyone; reporters and analysts especially.
- **Words avoided:** "filter", "keep", "step", "apply", "show", "leave out" (all controls on or
  near the path).

### T18. The fewest people in between (two datasets)

- **Prompt A (running club):** "You have used this program a few times. Your running club's list,
  friends.csv, is already open. Chloe wants to be introduced to Milo through people who already
  run together. Work out the chain from Chloe to Milo with the fewest people in between: who is
  in it, in order, and how many introductions it takes."
- **Prompt B (Florentine families):** "You have used this program a few times. The ready-made
  network of marriages between the leading families of Renaissance Florence is already open. The
  Strozzi want a message carried to the Pazzi, passed only between families joined by marriage,
  through as few families as possible. Which families does it pass through, in order?"
- **Start:** setup `friends.txt` (A), `florentine.txt` (B). **Files:** none to open.
- **Suits:** reporters (Ruth returning) and investigators above all.
- **Words avoided:** "shortest", "path", "route", "find", "from", "to" as a pair of field names
  ("from Chloe to Milo" keeps "from" and "to" in running prose; graders note any participant who
  went to the From field straight after reading it).

### T19. Reminders that stay with the work (two datasets)

- **Prompt A (running club):** "You have used this program a few times. Your running club's list,
  friends.csv, is already open. Leave yourself two reminders in the program: one about Farah,
  'Moving away in May; ask who takes over the Tuesday run', and one about the club as a whole,
  'Spring list, checked against the sign-up sheet'. Make sure both will still be there the next
  time you come back to this, then show us where you would read them."
- **Prompt B (Florentine families):** "You have used this program a few times. The ready-made
  network of Florentine marriages is already open. Leave yourself two reminders in the program:
  one about the Medici, 'Check the 1434 return from exile', and one about the network as a whole,
  'Marriages only; business ties are a separate list'. Make sure both will still be there the next
  time you come back to this, then show us where you would read them."
- **Start:** setup `friends.txt` (A), `florentine.txt` (B). **Files:** none to open.
- **Suits:** reporters and students (Ruth and Dev returning).
- **Words avoided:** "note", "notes", "add", "save" (Notes place, "Add note", "Save as").

### T20. A number that means "farther" (two datasets)

- **Prompt A (bus stops):** "You have used this program a few times. A colleague sent
  bus-stops.csv, in your Downloads folder: each row is a bus link between two stops and the
  minutes it takes. Bring it into the program so that every calculation treats more minutes as a
  longer trip, then work out the quickest way from Depot to Harbor: which stops, in order, and how
  many minutes in all. Show us where the program says it used the minutes."
- **Prompt B (hiking trails):** "You have used this program a few times. Your hiking club sent
  trails.csv, in your Downloads folder: each row is a trail between two junctions and its length
  in kilometers. Bring it into the program so that every calculation treats more kilometers as a
  longer walk, then work out the shortest walk from the Trailhead to the Summit: which junctions,
  in order, and how many kilometers in all. Show us where the program says it used the
  kilometers."
- **Start:** empty. **Files:** A `bus-stops.csv`; B `trails.csv`.
- **Suits:** students and analysts (Dev returning, Alex).
- **Words avoided:** "weight", "higher", "means", "farther", "closer", "distance", "path". B says
  "shortest walk", which shares "shortest" with the Path popover's title "Shortest path": kept,
  because "the shortest walk" is the hiker's own phrase and A measures the same step without it;
  a pass on B with a fail on A is reported as a wording echo, as tier 1's T10 B is.

### T21. The list was updated (two datasets)

- **Prompt A (running club):** "You have used this program a few times. Last month you had the
  program rank who matters most in your running club, friends.csv; that work is open. Your friend
  has sent the updated list, friends-v2.csv, in your Downloads folder, with this month's numbers.
  Put the new list in place of the old one without losing your work, redo the ranking on the new
  numbers, and tell us who was first before and who is first now."
- **Prompt B (team):** "You have used this program a few times. Two months ago you had the program
  rank who matters most on your team, from team.csv; that work is open. Your manager has sent the
  updated list, team-v2.csv, in your Downloads folder: two people joined since. Put the new list
  in place of the old one without losing your work, redo the ranking on the new list, and tell us
  how many people the team has now, who was first before, and who is first now."
- **Start:** setup `friends-pagerank.txt` (A), `team-pagerank.txt` (B). **Files:** A
  `friends-v2.csv`; B `team-v2.csv`.
- **Suits:** quarterly and weekly analysts (Grace returning, Alex, Dana).
- **Words avoided:** "replace", "rerun", "update" (as a verb on a control), "out of date", "data",
  "source". "updated list" is the sender's own phrase and names no control.
