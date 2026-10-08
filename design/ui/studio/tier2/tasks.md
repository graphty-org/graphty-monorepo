# Tier 2 tasks for participants

Tier 2 is the common work of a **returning** user: someone who has done tier 1's core path (open
a file, run an analysis, color and name the dots, save) a few times and now comes back to narrow
the picture, trace a chain between two people, keep notes, bring in two spreadsheets as one
network, make every calculation read a tie's number the right way round, redo work when the data
file changes, mark everything that meets a condition, see who is a step or two away, and ask
about one tie on the drawing. Every task runs on two datasets, so an answer cannot come from one
domain or from memory of one sample.

Success definitions, success paths and reference values: `answers.md` in this folder (graders
only). Bars and round plan: `criteria.md`. Participants and their earlier sessions: `roster.md`.
The tier 1 tasks are in `../tasks.md`.

## Rules for whoever runs a session

Every rule of tier 1 (`../tasks.md`, "Rules for whoever runs a session") holds, with these
changes:

- **A participant gets:** their persona file, their **earlier sessions** from `roster.md` (the
  history under their name, word for word), the **Prompt** below (word for word), the tool's
  participant instructions (`../tool/README.md`, "A session" and "Steps"), and nothing else -- no
  notes, digests, design documents, answer key, source code or other personas' histories.
- **Every session is still a fresh agent.** "Returning" is what the history and the prompt tell
  the participant; the agent has no memory of the app. A participant may act on what the history
  says they remember, and graders record when a first move came straight from it.
- **Prompts start with "You have used this program a few times"**, and a setup start describes
  the open work as the participant's own ("is already open").
- **No keyboard-only, screen-reader or touch sessions** (owner, 2026-10-07). Participants use the
  pointer and the keyboard as they like.
- **Starts.** _Empty_ = `--start <dir> empty`. _Setup_ = `--start <dir> setup:<file>` with a file
  from `../rounds/tier-2/setups/`, which the participant never sees. No task starts from a saved
  project file: reopening a saved project was measured in tier 1 (T14), and a setup reaches the
  same open work without depending on the project file format, which changes with the build.
  Every start but T4's and T20's reflects the earlier sessions every history shares: the file
  open, ranked by PageRank, its dots colored and sized by the ranking. T4 and T20 start empty
  because each is about bringing in new files from scratch. The setups:
    - `friends-ranked.txt`, `team-ranked.txt`, `bus-stops-ranked.txt`, `lesmis-ranked.txt`,
      `florentine-ranked.txt`: the file or sample opened from the start screen, PageRank run from
      Analyze (picked by click), and Size added to the run's Shape bound to PageRank, so the
      drawing is colored and sized by the ranking and its key says so.
    - `friends-ranked-names.txt`, `bus-stops-ranked-names.txt`: the same, with a label line on
      Everything bound to `id` and "Show all labels" ticked, so every name is drawn.

    Earlier setups, kept so the pilots that used them can be re-run, and used by no task:
    - `friends.txt`: `friends.csv` opened from the start screen (20 people, 41 ties).
    - `friends-names.txt`: the same, with a label line on Everything bound to `id` and "Show all
      labels" ticked, so every name is drawn.
    - `friends-pagerank.txt`, `team-pagerank.txt`: the file opened, then PageRank run from Analyze
      (picked by click), so the participant's earlier ranking is on screen.
    - `bus-stops.txt`: `bus-stops.csv` opened from the start screen (10 stops, 17 links; opened
      this way it has no weight).
    - `bus-stops-names.txt`: the same, with every stop's name drawn as in `friends-names.txt`.
    - `lesmis.txt`, `florentine.txt`: the sample opened from the start screen.

- **Files** are in `../tool/files/` (table in `../tool/README.md`); the prompt calls the folder
  "your Downloads folder". Tier 2 uses `friends.csv`, `friends-v2.csv`, `people.csv` with
  `messages.csv`, `players.csv` with `passes.csv`, `bus-stops.csv`, `trails.csv`, `team.csv` and
  `team-v2.csv`.
- **Words.** Prompts use no word that a target control shows and no interface word (button, menu,
  panel, tab). Each task lists the control words it avoids and any shared word kept on purpose.
  The wording check (criteria, preflight item 6) runs on the tier 2 screens before the first
  round and its result is written here.

## The tasks

| Task | What it is about                                                | A                                 | B                                  |
| ---- | --------------------------------------------------------------- | --------------------------------- | ---------------------------------- |
| T4   | Joining two tables                                              | office: people.csv + messages.csv | football: players.csv + passes.csv |
| T17  | Filtering                                                       | running club (friends.csv)        | Les Miserables                     |
| T18  | The shortest chain between two nodes                            | running club                      | Florentine families                |
| T19  | Notes                                                           | running club                      | Florentine families                |
| T20  | A weight set at load and used by every run                      | bus-stops.csv                     | trails.csv                         |
| T21  | Rerunning on new data                                           | friends.csv to friends-v2.csv     | team.csv to team-v2.csv            |
| T22  | Marking everything that meets a condition (select where, rules) | bus-stops.csv                     | Les Miserables                     |
| T23  | Neighborhood distance                                           | running club                      | Florentine families                |
| T24  | One tie on the drawing (edge selection)                         | running club                      | bus-stops.csv                      |
| T12R | Tier 1's one person and their ties, asked of a returning user   | Les Miserables                    | Florentine families                |

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
- **Start:** setup `friends-ranked.txt` (A), `lesmis-ranked.txt` (B). **Files:** none to open.
- **Suits:** everyone; reporters and analysts especially.
- **Follow-up (the second time),** given word for word once the participant says the prompt is
  done, in the same session, to every session that succeeded:
    - A: "Your club now asks the same for pairs who ran together 5 or more times. How many people
      are in the drawing then? Bring the whole club back when you are done."
    - B: "Now the same for pairs who share 8 or more chapters: how many characters are in the
      drawing then? Bring every character back when you are done."
- **Words avoided:** "filter", "keep", "step", "apply", "show", "leave out" (all controls on or
  near the path); the follow-ups add none.

### T18. The fewest people in between (two datasets)

- **Prompt A (running club):** "You have used this program a few times. Your running club's list,
  friends.csv, is already open. Chloe wants to be introduced to Milo through people who already
  run together. Work out the chain from Chloe to Milo with the fewest people in between: who is
  in it, in order, and how many introductions it takes."
- **Prompt B (Florentine families):** "You have used this program a few times. The ready-made
  network of marriages between the leading families of Renaissance Florence is already open. The
  Strozzi want a message carried to the Pazzi, passed only between families joined by marriage,
  through as few families as possible. Which families does it pass through, in order?"
- **Start:** setup `friends-ranked.txt` (A), `florentine-ranked.txt` (B). **Files:** none to open.
- **Suits:** reporters (Ruth returning) and investigators above all.
- **Follow-up (the second time),** given word for word once the participant says the prompt is
  done, in the same session, to every session that succeeded:
    - A: "Ben now wants to be introduced to Nora the same way. Who is in that chain, in order, and
      how many introductions does it take?"
    - B: "The Peruzzi now want a message carried to the Ginori the same way. Which families does it
      pass through, in order?"
      Both pairs have exactly one chain with the fewest in between, 4 ties long, counting every tie in
      either direction (as the main prompts' pairs do).
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
- **Start:** setup `friends-ranked.txt` (A), `florentine-ranked.txt` (B). **Files:** none to open.
- **Suits:** reporters, students and anyone who keeps a map for months (Dev, Tom, Elena
  returning; Jordan).
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
- **Words avoided:** "weight", "higher", "means", "farther", "closer", "distance", "path", "set" (the
  "Not set" choice), "date", "time" (the "Date or time" role). B says
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
- **Start:** setup `friends-ranked.txt` (A), `team-ranked.txt` (B). **Files:** A
  `friends-v2.csv`; B `team-v2.csv`.
- **Suits:** quarterly and weekly analysts (Grace returning, Alex, Dana).
- **Words avoided:** "replace", "rerun", "update" (as a verb on a control), "out of date", "data",
  "source". "updated list" is the sender's own phrase and names no control.

### T22. Make the ones that meet a condition stand out (two datasets)

- **Prompt A (bus stops):** "You have used this program a few times. A colleague's list of bus
  links, bus-stops.csv, is already open: each row is a link between two stops and the minutes it
  takes. Your colleague wants to see where the slow links sit on the whole map. Without taking
  any stop or link off the drawing, make every link that takes 10 minutes or more stand out from
  the rest, and tell us how many there are."
- **Prompt B (Les Miserables):** "You have used this program a few times. The ready-made network
  of characters from Les Miserables is already open; each tie counts the chapters two characters
  share. You want to see where the closest pairs sit in the whole cast. Without taking any
  character or tie off the drawing, make every tie of 10 or more shared chapters stand out from
  the rest, and tell us how many there are."
- **Start:** setup `bus-stops-ranked.txt` (A), `lesmis-ranked.txt` (B). **Files:** none to open.
- **Suits:** analysts and reporters (Alex, Dana, Jordan; Ruth and Nadia returning).
- **Why this task:** the design gives "select where" one home, a rule typed into the find box
  (it starts with "="), and keeps a separate dialog for later "if the tier 2 study shows people
  needing" it. This task measures whether a returning user gets there. "Without taking anything
  off the drawing" is the real need (where do they sit among the rest), and it separates the task
  from T17, which narrows the drawing.
- **Words avoided:** "select", "selection", "find", "rule", "where", "filter", "highlight" (the
  selection's own style heading), "pick" ("Pick From on the canvas"), "values", "match". "minutes"
  and "chapters" are the data's own words.

### T23. Who is a step or two away (two datasets)

- **Prompt A (running club):** "You have used this program a few times. Your running club's list,
  friends.csv, is already open. Ava is planning a party and wants to invite the people she runs
  with, and the people they run with. How many people is that, not counting Ava? Then change the
  drawing so it has only Ava and those people."
- **Prompt B (Florentine families):** "You have used this program a few times. The ready-made
  network of marriages between the leading families of Renaissance Florence is already open. The
  Medici want to know which families are at most two marriages away from them: a family they
  married into, or a family that married into one of those. How many families is that, not
  counting the Medici? Then change the drawing so it has only the Medici and those families."
- **Start:** setup `friends-ranked.txt` (A), `florentine-ranked.txt` (B). **Files:** none to open.
- **Suits:** everyone; investigators and marketers above all (Nadia, Jordan, Elena returning).
- **Words avoided:** "neighbors", "neighborhood", "hops", "follow", "within", "filter",
  "connections", "steps", "grow", "select". "change the drawing so it has only" is T17's phrase
  for narrowing, kept the same so the two tasks measure the same narrowing in the same words.

### T24. One tie on the drawing (two datasets)

- **Prompt A (running club):** "You have used this program a few times. Your running club's list,
  friends.csv, is already open, with everyone's name on the drawing. On the drawing you notice the
  tie between Gus and Ivan. How many runs did they do together? Then make Gus and Ivan, and nobody
  else, the ones that stand out on the drawing."
- **Prompt B (bus stops):** "You have used this program a few times. A colleague's list of bus
  links, bus-stops.csv, is already open, with every stop's name on the drawing. On the drawing you
  notice the link between Station and Stadium. How many minutes does that link take? Then make
  Station and Stadium, and no other stop, the ones that stand out on the drawing."
- **Start:** setup `friends-ranked-names.txt` (A), `bus-stops-ranked-names.txt` (B). **Files:**
  none to open.
- **Suits:** everyone (Tom, Dev, Dana, Alex).
- **Why this task:** a tie can now be clicked on the canvas, opens in the inspector with its two
  ends and its numbers, and offers a way to select its two ends. Before, a click on a line read
  as a click on empty canvas. The prompt names the two ends because the participant must be able
  to tell which line is meant; the task is reading a line seen on the drawing, so names are drawn.
- **Words avoided:** "edge", "line" (the Style tab's "Add label line"), "select", "endpoints",
  "click", "weight", "value". "tie" and "link" are T17's and T22's words for the same thing.

### T12R. One person and who they are tied to, for a returning user (two datasets)

Tier 1's T12, asked of a returning user from a ranked start. It is graded with tier 1's answer key
(`../answers.md`, T12) and measures whether the habit the histories lean on most, a person's list of
connections, still arrives now that tier 2 added Hops, Follow (on directed data only, so on
neither sample here) and "Filter to neighbors" to that list and new entries to the node menu
beside it.

- **Prompt A (Les Miserables):** "You have used this program a few times. The ready-made network
  of characters from the novel Les Miserables is already open. Go to the police inspector Javert,
  read what the program knows about him, and see which characters he shares chapters with. Tell us
  who they are and how many."
- **Prompt B (Florentine families):** "You have used this program a few times. The ready-made
  network of the leading families of Renaissance Florence and the marriages between them is
  already open. Go to the Medici family, read what the program knows about them, and see which
  families they married into. Tell us who they are and how many."
- **Start:** setup `lesmis-ranked.txt` (A), `florentine-ranked.txt` (B). **Files:** none to open.
- **Words:** tier 1's prompt with its first sentence changed to the returning form and the sample
  described as open; no new word.
