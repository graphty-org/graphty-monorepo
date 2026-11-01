# Tier 5 tasks: choosing which nodes, for a returning user

Every participant in this study has used graphty before (their history is in `roster.md`). Each
task asks for a result in the person's own data, never for a control. Tier 5 studies the one
selection editor in its two places: a style layer's choice of which nodes it colors, and a Data
place filter card's choice of what stays in the picture (`../../selection-groups/spec.md`). Every
task runs on two domains' data (halves A and B), so a pass cannot come from one domain's
vocabulary: A is people (a food bank's volunteers, a reporter's sources, a journal's co-authors),
B is a river monitoring network's gauges and the stretches of river between them (or a yeast gene
network).

Success definitions, success paths and reference values: `answers.md` (graders only). Bars and the
round plan: `criteria.md`. Participants and which tasks they take: `roster.md`. Settled behaviors:
`decided.md`.

## Rules for whoever runs a session

- **A participant gets** only the briefing `real.mjs --brief` writes: their persona file, their
  history from `roster.md`, the **Prompt** below word for word, their start command, and the tool's
  participant instructions. Never this file, the answers, the criteria or the roster.
- **Starts** are setup files in `../rounds/tier-5/setups/` (the participant never sees them). No
  tier 5 task starts empty: choosing among what is already there is the task. Keyboard-only Sam's
  start adds `--keys`.
- **A follow-up** (T70 and T71) is asked by the tool at the participant's first `--end`, word for
  word.
- **Step notes** are one or two sentences, in character. No step cap.

## Words

No prompt uses a word that a control on the success path shows, nor an interface word.

**Avoided in every task** (tier 4's list, which still binds): data, source, field, column, row,
table, type, role, join, filter, select, hide, show only, keep, card, condition, issue, problem,
warning, fix (as a control), export, format, label, weight, time, location, category, number, text,
date, yes/no, id, key, node, edge, attribute, Sources, Fields, Filters, panel, menu, button, tab,
add, load, open, import, merge, match, blank, trim, at least, leave out.

**Also avoided in tier 5** (the editor's own words, found in its rows, menus, picker and card):
except, or (as a choice between ways, never inside "one or two"), start with, all, none, so far,
relative to, within, hop, steps away, reference, hovered, selected, highest, top, between, before,
after, is any of, or more, group, step, verb, union, subtract, intersect, preview, matches only,
shown, largest, component, piece, connected, cut off, structure, results, degree, rank, layer,
style, fill, color, highlight, hover, fade, upstream, downstream, only, rule, set (as a noun),
higher.

**Kept in every task:** `picture` -- the person's word for what the drawing holds (tier 4 kept it;
on screen it is only in a filter effect's tooltip, which no prompt quotes). `orange` -- the shade
a person names; the app shows it only as an AI preset's name, which no path uses. The persona's own
column names, said as the person says them: `hours` (A), `trained`/"training" (A), `staff`,
`board` (A's role values), `on the record` (A, sources), `gal80Rexp` (B, yeast), `cm deep` (B,
`depth_cm`). `network`, `people`, `gauges`, `genes`, `ties`, `interactions`, `stretches of river` --
each domain's own nouns. `matter most` -- the persona's own phrase from earlier sessions; the
screens say "Order matters" only beside a step whose order matters, which no T74 path draws.
`start screen` -- the place the person has seen; the screens never name it. `tangle`, `bunch`,
`stranded` -- everyday words for what the largest-piece choice keeps and drops.

## The tasks

| Task | What it is about                                    | Surface     | A (people)                        | B (river, genes)                       |
| ---- | --------------------------------------------------- | ----------- | --------------------------------- | -------------------------------------- |
| T70  | A simple choice, once to color and once to narrow   | both        | volunteers: staff; training       | gauges: the 1990s; readings sent       |
| T71  | Either of two things, in the picture                | filter      | volunteers: board or 30+ hours    | gauges: no readings sent or the 1990s  |
| T72  | All of one kind but not some of them, colored       | style layer | sources: companies and agencies   | gauges: readings sent, not the 1990s   |
| T73  | Everyone close to one person or place, colored      | style layer | volunteers: 2 shifts from James   | gauges: 2 stretches from Cedar Bend    |
| T74  | The few that a measure puts first, colored          | style layer | volunteers: the 5 who matter most | gauges: the 3 most routes pass through |
| T75  | A big network cut down to something readable        | filter      | graph researchers (549)           | yeast genes (331)                      |
| T76  | The start screen's pointing effect, in your network | style layer | sources                           | gauges                                 |
| T77  | Changing what a colleague set up                    | both        | volunteers (thank-you event)      | gauges (the readings project)          |

What each task reaches: T70 the editor in both hosts on one value each (a category in the style
layer, a yes-or-no or date in the filter), the preview while picking, the filter effect; T71 a
second way to match in a filter ("Or" group); T72 a subtracting step in a style layer; T73 a step
relative to a node, by its name (B) or with no names designated (A); T74 an algorithm value by
position, from an existing run (A) and from one not yet run (B); T75 a chain of steps in a filter,
on a structure value, Degree and a number, including one that depends on the steps before it (A);
T76 the hover recipe (four layers built in the editor, or the add menu's preset); T77 opening and
changing an existing filter card and an existing style layer.

### T70. A simple choice, twice (two datasets)

- **Prompt A (volunteers):** "For next week's planning meeting you want the staff members to stand
  out in orange, and the people who never finished their food-safety training out of the picture
  for now, without deleting anyone. Tell us how many people are still in the picture, and how many
  of them are in orange."
- **Prompt B (gauges):** "For the river council's visit you want the gauges that were put in during
  the 1990s to stand out in orange, and the gauges that do not send their readings by themselves
  out of the picture for now, without deleting any. Tell us how many gauges are still in the
  picture, and how many of them are in orange."
- **Kept on purpose:** `planning`, `meeting`, `visit` -- the occasion; `put in` -- tier 4's own
  phrase for when a gauge was installed; `readings` -- the river team's word for what telemetry
  sends (the screens say it in no control).
- **Follow-up** (asked after the participant's first `--end`):
    - A: "While you were choosing who goes in orange, the drawing changed its colors for a while.
      What did you take that to mean, and would you rather it had kept the colors you had?"
    - B: "While you were choosing which gauges go in orange, the drawing changed its colors for a
      while. What did you take that to mean, and would you rather it had kept the colors you had?"

### T71. Either of two things (two datasets)

- **Prompt A (volunteers):** "For the board's evening reception you want just two kinds of people in
  the picture: the board members, and anyone who gave 30 hours or longer this quarter. Everyone
  else should be out of the picture for now, without deleting anyone. Tell us how many people are
  still in the picture."
- **Prompt B (gauges):** "For the maintenance crew you want just two kinds of gauges in the
  picture: the ones that do not send their readings by themselves, and any gauge put in during the
  1990s. Every other gauge should be out of the picture for now, without deleting any. Tell us how
  many gauges are still in the picture."
- **Kept on purpose:** `just` -- the everyday word where tier 4 avoided "only"; `kinds` -- what the
  person calls the two ways in; `longer` -- tier 4's "10 hours or longer".
- **Follow-up** (asked after the participant's first `--end`):
    - A: "While you were deciding who stays in the picture, did you want to see the list of people
      next to the drawing? Did you look at it, and where?"
    - B: "While you were deciding which gauges stay in the picture, did you want to see the list of
      gauges next to the drawing? Did you look at it, and where?"

### T72. All of one kind, but not some of them (two datasets)

- **Prompt A (sources):** "For the story's graphic, the companies and the government agencies in
  your network should stand out in orange -- but not the ones who agreed to speak on the record.
  Tell us how many are in orange."
- **Prompt B (gauges):** "For the council's report, every gauge that sends its readings by itself
  should stand out in orange -- but not the ones put in during the 1990s. Tell us how many gauges
  are in orange."
- **Kept on purpose:** `but not` -- the everyday words for what the editor calls Except;
  `companies`, `agencies` -- the values of Ruth's `kind` column; `on the record` -- her column
  `on_record`, as she says it.

### T73. Close to one person or place (two datasets)

- **Prompt A (volunteers):** "James Carter is organizing a shift swap. Put everyone who worked a
  shift with him, or with someone who worked a shift with him, in orange -- James too -- so he
  knows whom to ask first. Tell us how many people are in orange."
- **Prompt B (gauges):** "A spill was reported at Cedar Bend. Put Cedar Bend and every gauge no
  more than two stretches of river from it, in either direction along the river, in orange, so the
  crew knows which gauges to check first. Tell us how many gauges are in orange."
- **Kept on purpose:** `worked a shift with` -- what a tie in Grace's file is; `stretches of river`
  -- what a tie in Tom's file is; `either direction` -- says the river's flow does not matter, where
  the screens' Upstream of and Downstream of would. `or with someone` -- "or" inside the person's
  sentence, not a choice between two ways.

### T74. The few a measure puts first (two datasets)

- **Prompt A (volunteers):** "In an earlier session the program worked out who matters most in the volunteer
  network. Now put just the five people who matter most in orange, and leave everyone else as they
  are. Tell us who the five are."
- **Prompt B (gauges):** "The river council wants to know which gauges the most routes along the
  river pass through. Put the three gauges that the most routes pass through in orange, and tell us
  which three they are."
- **Kept on purpose:** `worked out`, `matters most` -- the history's own words for the ranking the
  person ran before; `routes ... pass through` -- the council's question, which the screens answer
  as Betweenness ("Bridging") without these words.

### T75. A big network made readable (two datasets)

- **Prompt A (graph researchers):** "The co-author network of the graph journal is too big to read.
  Take everyone with fewer than 10 co-authorship ties out of the picture. Then, of the people left,
  you want to see just the ones in the big tangle at the middle: anyone left stranded on their own
  or in a small separate bunch should go out of the picture too. Nothing should be deleted. Tell us
  how many people are still in the picture."
- **Prompt B (yeast):** "The yeast network is too tangled to read. For now you want to see just the
  genes in the big tangle at its middle, not the small separate bunches around it, and of those
  just the genes with more than one interaction whose gal80Rexp reading is 0.5 or above. Every
  other gene should be out of the picture, with nothing deleted. Tell us how many genes are still in
  the picture."
- **Kept on purpose:** `fewer than`, `more than one`, `0.5 or above` -- the person's thresholds,
  never the card's "or more"; `co-authorship ties` -- what a tie in the sample is; `gal80Rexp` --
  Maren's own column name.

### T76. The start screen's pointing effect (two datasets)

- **Prompt A (sources):** "At the newsroom meeting you will walk your editor through the network on
  screen. Set it up to behave like the picture on the program's start screen: when you rest the
  pointer on someone, everyone not directly tied to them goes pale and their ties stand out; when
  the pointer is on nobody, everything looks as usual. Tell us how you checked it."
- **Prompt B (gauges):** "At the council meeting you will talk through the river network on screen.
  Set it up to behave like the picture on the program's start screen: when you rest the pointer on a
  gauge, every gauge not joined to it by a stretch of river goes pale and its stretches stand out;
  when the pointer is on no gauge, everything looks as usual. Tell us how you checked it."
- **Kept on purpose:** `start screen` -- where the person has seen the effect; `pointer`, `rest` --
  the everyday words for hovering; `pale`, `stand out` -- what the effect does, where the screens
  say Fade and Highlight.

### T77. Changing what a colleague set up (two datasets)

- **Prompt A (volunteers):** "A colleague set this project up for the volunteers' thank-you event:
  just the trained people who gave 10 hours or longer are in the picture, and the staff among them
  are in orange. The event's plan changed. It should now be 20 hours or longer instead of 10, and
  anyone in the picture who gave 30 hours or longer should be in orange too, along with the staff.
  Change the project accordingly, and tell us how many people are in the picture and how many of them
  are in orange."
- **Prompt B (gauges):** "A colleague set this river project up: just the gauges that send their
  readings by themselves are in the picture, and the ones among them put in during the 1990s are in
  orange. Two things changed. Gauges 140 cm deep or deeper should be back in the picture too,
  whether they send readings or not, and the orange should now go to every gauge in the picture put
  in up to the end of 2004. Change the project accordingly, and tell us how many gauges are in the
  picture and how many are in orange."
- **Kept on purpose:** `instead of`, `along with`, `too` -- everyday words for changing what is
  there; `up to the end of 2004` -- the person's own bound, where the card says Before.

## Detours each pilot walks

| Task | Commonest detours (a person who does not know the path tries these first)                                                                               |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T70  | Coloring with the filter card's Select; hiding with a style layer's Visibility; the table's column header menu; clicking nodes on the canvas one by one |
| T71  | Two filter cards (both must hold, not either); the second value as a Keep step in one group; Select left on; a style layer instead of a filter          |
| T72  | Two layers (one coloring, one un-coloring); Keep with on the record No (an equal result); a filter card                                                 |
| T73  | Typing the name into the reference list (A has no names designated); 1 hop; Analyze's Steps away; selecting James on the canvas first                   |
| T74  | Analyze's ranking run again; a hand-typed threshold with Between; the table sorted by the measure and nodes selected by hand                            |
| T75  | A second filter card for the big tangle (it reads the whole graph); the steps in the other order; a style layer that fades the rest                     |
| T76  | The add menu's Hover highlight; editing the Hovered row; four layers built by hand in the editor                                                        |
| T77  | A new filter card or layer instead of editing the old one; deleting and rebuilding; changing the wrong host                                             |
