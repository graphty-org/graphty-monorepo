# Tier 3 tasks: first use and styling

Every participant in this study uses graphty for the **first time**. Each session starts on the
app's empty start screen; the participant opens a ready-made sample or a file they brought, and
then styles it. Each task asks for a look on the drawing, never for a control. Every task whose
wording could lead the way runs on two domains' data (halves A and B), so a pass cannot come from
one domain's vocabulary.

Success definitions, success paths and reference values: `answers.md` (graders only). Bars and
the round plan: `criteria.md`. Participants and which tasks they take: `roster.md`.

## Rules for whoever runs a session

- **A participant gets** only the briefing `real.mjs --brief` writes: their persona file, the line
  in `roster.md` that says this is their first time, the **Prompt** below word for word, their
  start command, and the tool's participant instructions (`../tool/README.md`, "A session",
  "Steps", "Names, dialogs and lists"). Never this file, the answers, the criteria or the roster.
- **Every session starts `empty`**: the start screen of a first-time visitor, with clean browser
  storage. Keyboard-only Sam starts `empty --keys`, which refuses every pointer step.
- **Files** a prompt says the participant brought are in `../tool/files/` and reach the app by the
  tool's `--upload` (the participant names the file; the tool finds it there): `volunteers.graphml`
  (a food bank's 24 volunteers), `sources.graphml` (a reporter's 24 sources), `neighbors.csv` (16
  residents of one street), `yeast-galactose.graphml` (331 yeast genes), and two saved projects,
  `lesmis-poster.graphty.json` and `volunteers-thanks.graphty.json`.
- **A follow-up** (T49 only) is given by the tool at the participant's first `--end`, word for
  word; the participant never sees it before.
- **Step notes** are one or two sentences, in character. No step cap: a session ends when the
  participant is done, gives up or stops making progress.

## Words

No prompt uses a word a control on the success path shows, nor an interface word. Checked by
`../tool/wording.mjs` against every screen `../tool/bars.mjs --tier 3` measures; each word it
finds is reworded or kept on purpose below with its reason.

**Avoided in every task:** layer, style, folder, condition, card, which, node, edge, fill, size,
shape, text, label, value, mixed, group, everything, selected, hovered, undo, analyze, run,
louvain, community, match, contains, starts, between, highest, any, add, find, data, graph,
legend, tab, panel, button, menu, field, filter, select, edit, done.

**Kept in every task:** `color` -- the everyday word for the job; whoever goes straight to a Color
line from it is recorded, and T49 and T50 test color without asking for it. `character`, `member`,
`team`, `family`, `chapter`, `ready-made`, `network`, `les`, `miserables`, `zachary`, `karate`,
`club`, `college`, `football`, `florentine` -- the samples' own names and nouns, which the start
screen prints to describe them; they name the data, not a control. `file` -- what the participant
brought is a file, and no everyday word replaces it. `volunteers`, `sources`, `neighbors`,
`yeast-galactose`, `graphml`, `csv`, `lesmis-poster`, `volunteers-thanks`, `graphty`, `json` -- the
names of the files the participant brought, which the app shows once a file is read. `name` -- the everyday word; the data's own
column is also called `name`, and a participant who picks it from the prompt is recorded. `tie` --
the study's word for a link; the app never shows it. `open` -- the start page's ways in ("Open a
file", "Open network data"; samples are reached by "Samples" and a card named "Open the <sample>
sample"); the study does not measure finding it. `first` -- every prompt
opens "This is your first time"; the app's "first" is in an analysis's description, on no route.
`red`, `blue`, `green`, `dark`, `orange`, `purple`, `yellow` -- the color each task's result is
graded by (`answers.md`); every way to set a color shows the swatches' names, so the name gives no
route. `Les Miserables`, `Zachary's karate club`, `college football` -- the samples' names as
phrases, which the start screen prints on their cards; a prompt cannot ask for a sample without
naming it.

## The tasks

| Task | What it is about                                  | A                  | B                     |
| ---- | ------------------------------------------------- | ------------------ | --------------------- |
| T37  | First look at a ready-made network                | Les Miserables     | Zachary's karate club |
| T38  | Your own file, then a kind of person picked out   | volunteers.graphml | sources.graphml       |
| T39  | One color for the whole drawing                   | Les Miserables     | College football      |
| T40  | Picked out by letters in a name                   | Les Miserables     | yeast genes           |
| T41  | Picked out by two facts at once (yes/no, missing) | volunteers.graphml | sources.graphml       |
| T42  | Picked out by a number at or over a line          | volunteers.graphml | sources.graphml       |
| T43  | Bigger for more                                   | volunteers.graphml | sources.graphml       |
| T44  | Names on the drawing                              | Les Miserables     | volunteers.graphml    |
| T45  | Ties styled apart from the people                 | neighbors.csv      | Les Miserables        |
| T46  | Clusters found by the program, one made red       | Les Miserables     | College football      |
| T47  | Every cluster changed at once, colors kept        | Les Miserables     | College football      |
| T48  | Cluster colors kept on only some people           | volunteers.graphml | sources.graphml       |
| T49  | Put it back the way it was                        | Les Miserables     | Zachary's karate club |
| T50  | What a colleague's color picks out, and why       | lesmis-poster      | volunteers-thanks     |
| T51  | Each kind its own color                           | volunteers.graphml | sources.graphml       |

Card types the tasks reach: text (T40, T50 A), category (T38, T45 A), yes/no and "has no value"
together (T41, T48), number at or over a line (T42, T45 B, T50 B). Several layers picked by data
at once: T48. A bulk field whose layers differ (the clusters' colors): T47. Undo: T49. A color for each value of a
category column, read back from the key: T51.

### T37. A first look (two datasets)

- **Prompt A (Les Miserables):** "This is your first time using this program, and it has just
  opened. It comes with a few ready-made networks. Open the one about the characters of Les
  Miserables and explore it for a minute. Tell us how many characters it holds, how many ties
  join them, and which character has the most ties to others."
- **Prompt B (karate club):** "This is your first time using this program, and it has just
  opened. It comes with a few ready-made networks. Open the one about Zachary's karate club and
  explore it for a minute. Tell us how many members it holds, how many ties join them,
  and which member has the most ties to others."
- **Measures:** the first minutes before any styling: where a newcomer looks first, and whether the
  counts and the one with the most ties are read from the screen.
- **Round 1:** not run. Every session already records its first move after the sample or file
  opened, and T38 reads the node and tie counts from the screen. Kept for a later round.

### T38. Your own file, then one kind of person (two datasets)

- **Prompt A (volunteers):** "This is your first time using this program, and it has just opened.
  A colleague exported the food bank's volunteer roster from another program as volunteers.graphml,
  and you have it on this computer. Bring it into the program and tell us how many people and how
  many ties it holds. Then make every board member and every staff member blue in the picture, and
  leave the volunteers as they are."
- **Prompt B (sources):** "This is your first time using this program, and it has just opened. A reporter colleague exported her sources for her waterfront zoning story from another program as sources.graphml, and you have it on this computer. Bring it into the program and tell us how many sources and how many ties it holds. Then make every company and every agency blue in the picture, and leave the people as they are."
- **Card type reached:** category (the file's `role` or `kind` column).
- **Kept on purpose:** `board`, `staff`, `volunteer`, `company`, `agency`, `people`, `person` -- the
  file's own values, which the participant must find on screen to pick by.

### T39. One color for the whole drawing (two datasets)

- **Prompt A (Les Miserables):** "This is your first time using this program, and it has just
  opened. Open the ready-made network of the characters of Les Miserables. For a printed handout,
  make every character dark green."
- **Prompt B (College football):** "This is your first time using this program, and it has just opened. Open the ready-made network of college football teams. For the school newsletter's colors, make every team orange."
- **Measures:** the time to the first styled graph (`criteria.md`, bar 4) on its simplest route.

### T40. Picked out by letters in a name (two datasets)

- **Prompt A (Les Miserables):** "This is your first time using this program, and it has just
  opened. Open the ready-made network of the characters of Les Miserables. Mark every married woman
  -- every character whose name has 'Mme' in it -- in purple in the picture, and leave everyone
  else as they are. Tell us how many there are."
- **Prompt B (yeast genes):** "This is your first time using this program, and it has just opened.
  Your network of 331 yeast genes is on this computer as yeast-galactose.graphml. Bring it into the
  program. Mark every gene of the galactose pathway -- every gene whose name begins with GAL -- in
  purple in the picture, and leave every other gene as it is. Tell us how many there are."
- **Card type reached:** text ("contains" or "starts with").
- **Kept on purpose:** `gene`, `yeast`, `galactose`, `mme`, `gal` -- the data's own words.

### T41. Two facts at once (two datasets)

- **Prompt A (volunteers):** "This is your first time using this program, and it has just opened. The food bank's volunteer roster, volunteers.graphml, is on this computer. Bring it into the program. Before the summer drive you will phone everyone who finished food-safety training. Make red every person who finished the training and whose phone number is missing, so you can chase it. Everyone else stays as they are. Tell us their names."
- **Prompt B (sources):** "This is your first time using this program, and it has just opened. A reporter colleague's sources for her waterfront zoning story, sources.graphml, are on this computer. Bring them into the program. Make red every source who agreed to speak on the record and whose email address is missing. Everyone else stays as they are. Tell us their names."
- **Card types reached:** yes/no, and "has no value" on a text column, combined.
- **Kept on purpose:** `training`, `phone`, `record`, `email` -- the file's own column words.
  `missing` -- the everyday word; the app shows "no value". `number` -- "phone number" is the
  everyday name of the column's content; the app's "number" is the number card and an analysis's
  description, neither on T41's route (a phone number typed into a number card is a wrong turn).

### T42. At or over a line (two datasets)

- **Prompt A (volunteers):** "This is your first time using this program, and it has just opened.
  The food bank's volunteer roster, volunteers.graphml, is on this computer. Bring it into the
  program. Make orange everyone who gave at least 20 hours this quarter, and leave everyone else as
  they are. Tell us how many people that is."
- **Prompt B (sources):** "This is your first time using this program, and it has just opened. A reporter colleague's sources for her waterfront zoning story, sources.graphml, are on this computer. Bring them into the program. Make orange every source who gave at least 10,000 dollars in campaign donations, and leave everyone else as they are. Tell us how many that is."
- **Card type reached:** number (a range with its low end set).
- **Kept on purpose:** `hours`, `donations`, `quarter` -- the file's own words.
- **Round 1:** not run; its two sessions go to T51. It runs at 4 in round 2 (`criteria.md`, round
  plan): the study cannot pass while a task is unjudged.

### T43. Bigger for more (two datasets)

- **Prompt A (volunteers):** "This is your first time using this program, and it has just opened.
  The food bank's volunteer roster, volunteers.graphml, is on this computer. Bring it into the
  program. For the annual report, draw people who gave many hours this quarter bigger than people
  who gave few, so the busiest stand out at a glance. Tell us who gave the most."
- **Prompt B (sources):** "This is your first time using this program, and it has just opened. A reporter colleague's sources for her waterfront zoning story, sources.graphml, are on this computer. Bring them into the program. Draw sources who gave large campaign donations bigger than sources who gave little, so the biggest donors stand out at a glance. Tell us who gave the most."
- **Measures:** whether a newcomer finds a way to make a look follow a number.
- **Kept on purpose:** `hours`, `donations` -- as T42. `draw` -- the everyday verb for what the
  picture shows; the app says "drawn" in the spoken names of unset color lines, and the wording
  check (which joins draw, drawn and drawing) reports each screen on the route that says it.

### T44. Names on the drawing (two datasets)

- **Prompt A (Les Miserables):** "This is your first time using this program, and it has just
  opened. Open the ready-made network of the characters of Les Miserables. Have every character's
  name appear in the picture, so that a reader can spot Cosette by eye."
- **Prompt B (volunteers):** "This is your first time using this program, and it has just opened.
  The food bank's volunteer roster, volunteers.graphml, is on this computer. Bring it into the
  program. Have every person's name appear in the picture, so that the board can spot Lucy Grant by eye."
- **Not scored as new findings:** a new name drawn too small at the default framing, and the
  default font naming no fallback; both are open owner decisions (`../owner-decisions.md`).
- **Kept on purpose:** `cosette`, `lucy`, `grant` -- data; `board` -- the food bank's board, and a
  value of the file's `role` column.
- **Round 1:** not run; its two sessions go to T51, which is judged in round 1. It runs at 4 in
  round 2 (`criteria.md`, round plan).

### T45. Ties apart from the people (two datasets)

- **Prompt A (neighbors):** "This is your first time using this program, and it has just opened.
  You track who knows whom on your street in neighbors.csv, which is on this computer. Bring it into
  the program. Make the family ties thick and red so they stand out, and leave the people and every
  other tie as they are."
- **Prompt B (Les Miserables):** "This is your first time using this program, and it has just opened. Open the ready-made network of the characters of Les Miserables. Make every tie joining two characters who share at least 5 chapters thick and blue, and leave the characters and every other tie as they are."
- **Card types reached:** category on a tie (A), number on a tie (B).
- **Kept on purpose:** `neighbors`, `street`, `share` -- data; `chapters` -- data (the ties' own
  column is `shared_chapters`).

### T46. Clusters found by the program, one in red (two datasets)

- **Prompt A (Les Miserables):** "This is your first time using this program, and it has just
  opened. Open the ready-made network of the characters of Les Miserables. Have the program figure
  out the circles of characters who appear together, each circle in its own color. Then make
  the circle Javert belongs to bright red, and leave the colors of the other circles as they are. Tell us
  how many characters are in Javert's circle."
- **Prompt B (College football):** "This is your first time using this program, and it has just
  opened. Open the ready-made network of college football teams. Have the program figure
  out clusters of teams that often play one another, each cluster in its own color --
  not the conferences in the file, the program's own clusters. Then make Nebraska's cluster
  bright red, and leave the colors of the other clusters as they are. Tell us how many teams are in it."
- **Kept on purpose:** `javert`, `nebraska`, `conference` -- data. `circle` (A) and `cluster` (B,
  also T47 B and T48 B) -- the everyday words for what the program works out; `cluster` is also
  the trade's word, and the analysis filter matches it to the community analyses, so what each B
  participant types into that filter is recorded and reported as prompted, with A as the
  unprompted reading.

### T47. Every cluster at once, colors kept (two datasets)

- **Prompt A (Les Miserables):** "This is your first time using this program, and it has just opened. Open the ready-made network of the characters of Les Miserables. Have the program figure out the circles of characters who appear together, each circle in its own color. Then draw the characters of every circle as cubes instead of balls, while every circle's color stays as it is."
- **Prompt B (College football):** "This is your first time using this program, and it has just opened. Open the ready-made network of college football teams. Have the program figure out clusters of teams that often play one another, each cluster in its own color -- not the conferences in the file, the program's own clusters. Then draw the teams of every cluster as cubes instead of balls, while every cluster's color stays as it is."
- **Route under study:** whether the clusters are changed together, and whether the field that
  holds a different color for each cluster is left alone. A route through the whole drawing's own
  look also passes and is recorded.
- **Kept on purpose:** `cube`, `ball` -- everyday words; the app's names for these looks are Box
  and Icosphere, which the prompt avoids. `conference` -- data, as T46. `cluster` (B) -- as T46. `draw` -- as T43; a
  participant who reads the folder's unset color line by its spoken name is recorded.

### T48. Cluster colors on only some people (two datasets)

- **Prompt A (volunteers):** "This is your first time using this program, and it has just opened. The food bank's volunteer roster, volunteers.graphml, is on this computer. Bring it into the program. Have the program figure out the circles of people who do shifts together, each circle in its own color. Then let only the people who have finished food-safety training stay in their circle's color; everyone else appears as they did when the file first opened. Tell us how many people still have a circle's color."
- **Prompt B (sources):** "This is your first time using this program, and it has just opened. A reporter colleague's sources for her waterfront zoning story, sources.graphml, are on this computer. Bring them into the program. Have the program figure out clusters of sources that deal with one another, each cluster in its own color. Then let only the sources who agreed to speak on the record stay in their cluster's color; everyone else appears as they did when the file first opened. Tell us how many sources still have a cluster color."
- **Route under study:** picking by data across several clusters at once: on the run's folder or
  on several of its layers picked together, against one layer at a time or a covering layer
  (graded `Route:`, `answers.md`).
- **Kept on purpose:** `training`, `record` -- data. `cluster` (B) -- as T46.

### T49. Put it back (two datasets)

- **Prompt A (Les Miserables):** "This is your first time using this program, and it has just
  opened. Open the ready-made network of the characters of Les Miserables, and make every
  character red."
- **Prompt B (karate club):** "This is your first time using this program, and it has just opened.
  Open the ready-made network of Zachary's karate club, and make every member yellow."
- **Follow-up** (given by the tool at the first `--end`):
    - A: "Your editor liked the picture better the way it was when you opened it. Put it back exactly
      as it was."
    - B: "The coach liked the picture better the way it was when you opened it. Put it back exactly
      as it was."
- **Measures:** how a newcomer reverses a change: the arrow at the top, Control+Z, typing the old
  color back, or removing what they made. Words avoided as well: undo, revert, reset, restore,
  default, original.
- **Kept on purpose:** `back`, `put` -- "put it back" is the everyday phrase for the job; the only "Back"
  on screen is the arrow that returns the analysis list, which no route here needs, and the start
  screen's "Put" is in a sample's description, on no route.

### T50. What a colleague's color picks out (two datasets)

- **Prompt A (lesmis-poster):** "This is your first time using this program, and it has just
  opened. A colleague sent you lesmis-poster.graphty.json, a project of theirs, which is on this
  computer. Open it. Some characters are orange. Tell us which characters are orange and
  what they have in common that made the project color them orange."
- **Prompt B (volunteers-thanks):** "This is your first time using this program, and it has just
  opened. A colleague sent you volunteers-thanks.graphty.json, a project of theirs, which is on this
  computer. Open it. Some people are green. Tell us how many people are green and what
  they have in common that made the project color them green."
- **Measures:** finding what one look applies to, and reading why, from a project the participant
  did not make.
- **Words:** the prompt says "color them", not "draw them": T50's route reads "Why this look",
  where every unset color line's spoken name says "drawn".
- **Kept on purpose:** `project` -- what the colleague sent is a project file; the start page's
  "Open a file" says it takes "a saved project", the main menu says "Open project or file...", and
  a newcomer has no other word for it.

### T51. Each kind its own color (two datasets)

- **Prompt A (volunteers):** "This is your first time using this program, and it has just opened.
  The food bank's volunteer roster, volunteers.graphml, is on this computer. Bring it into the
  program. Draw board members, staff and volunteers each in a different color, and tell us which
  color stands for the board."
- **Prompt B (sources):** "This is your first time using this program, and it has just opened. A
  reporter colleague's sources for her waterfront zoning story, sources.graphml, are on this
  computer. Bring them into the program. Draw people, companies and agencies each in a different
  color, and tell us which color stands for the companies."
- **Measures:** coloring by a category, one color per value (the commonest first styling act:
  "color by role"), and whether the key or the panel tells a newcomer which color is which.
- **Kept on purpose:** `board`, `staff`, `volunteer`, `company`, `agency`, `people` -- the file's own
  values, as T38. `draw` -- as T43.

## Detours the dry run walks (facilitator side, never shown to a participant)

The dry run walks each task's success path (`answers.md`), then these detours, then the success
path again by keyboard only. They come from the pilot walks of the combined Style panel
(`build/walk-p1/` to `walk-p3/`), the bulk and picker pilots (`build/pilot-bulk/`,
`build/pilot-bulk-rewalk/`) and earlier tiers' commonest wrong turns.

- **Every task from an empty start:** the start page's turning demo drawing tried first (its
  buttons, a click on a node); the usage-data notice at the page's foot left unanswered while
  working; a sample opened from the main menu's "Open sample", or through the top bar's Samples
  link and the library's search, instead of the Samples button; Control+O pressed with a graph
  already open, which offers to add the file to the open graph ("Add to ...") with Replace first.
- **T38, T41, T42, T43, T44 B, T45 A, T48, T50, T51 (a file brought):** "Open network data" tried instead
  of "Open a file" (it opens no local file); "New project", then "Add data..."; the file dropped
  on the start page; Cancel on the read-the-file page, then a second try.
- **T39:** a new layer with no condition instead of the starting layer's color; the color typed as
  a word ("dark green") into the hex box; the color set on the Edge tab first.
- **T40 A, T50 A:** typing straight after adding a card (focus lands in the card's text box);
  the find box used instead ("Mme" typed there, then styling what it
  selected); "Use the selected nodes".
- **T41, T48:** the yes/no card left on its default; "has no value" looked for in the add menu
  instead of the card's own menu; an unfinished card left without a value and the picker closed
  (it is dropped, with a notice, after Enter, Escape in its empty box or a click on the drawing; a
  click in either side panel leaves the picker open);
  Escape inside the picker.
- **T42:** the number typed into the slider's high end; "Highest" chosen instead of a range; the
  number typed as written in the prompt (`10,000`, `$10,000`) into the from box.
- **T43:** a fixed bigger size on a picked subset instead of a size that follows the number; the
  link icon beside Size opened, then closed with Escape.
- **T44:** the names put on through the Text "+" with no column picked; labels made larger after.
- **T45:** the Node tab's color changed instead of the Edge tab's; a new layer that styles both
  kinds with the node condition expected to carry to its ties (it does not: a node condition added
  after the layer was made leaves its ties unpicked); width typed after the default (8) was not
  replaced.
- **T46, T47:** the run's layers edited one by one instead of together; the folder's color field
  (the purple "Layer" token) clicked and set to one color, which paints every cluster the same; a
  new layer made by hand for Javert's circle; the conferences in the file used for B; "Nebraska" typed into the find box (the file's
  team names have no spaces: "Florida State" finds nothing, "Florida" finds the University of
  Florida).
- **T47:** the starting layer's shape changed instead of the clusters' (passes, recorded).
- **T48:** a yes/no card added to one cluster only; a new layer above the clusters that paints
  everyone else back to the old color.
- **T49:** Control+Z pressed several times past the color change; the red typed over with the old
  hex; the layer they made deleted.
- **T51:** a color typed on Everything (one color for all); three layers made by hand, one per
  value; the color of a value read from the drawing instead of the key.
- **T50:** the legend read without opening the layer; the picker opened and closed again; Values
  read instead of the picker.

## Change log

- 2026-10-21 (round 1's tool dry run 2, wording check on build 758b8e8081): 44 prompt words and 14
  phrases were on screen. Reworded, with no task's result changed: the volunteers' "list" is a
  "roster" (the start screen says "List"); "on the drawing" is "in the picture" where `draw` is not
  kept (the spoken "drawn" of unset color lines), and so is T49's follow-up; "work out" is "figure
  out" and T48's "work shifts" is "do shifts" (a sample's description says "work"); "or more" is "at
  least" and T43's "the more" is "many ... than few" (the start screen says "more"); "political"
  donations are "campaign" donations; T47's "without changing" is "stays as it is" (a text card says
  "changing"); T48's "keep" and "looks" are "stay in" and "appears" (a sample's description); T45 A
  "tracks" its street instead of keeping a list, and its ties "join" rather than "link" (an
  analysis's description says "linked"), as do T37's; T37's "first look around" is "explore it for
  a minute"; T39 B and the football prompts drop "American" and "sports" (the sample's card); T44
  "has every name appear" instead of "put"; T50 names the file before calling it a project, so
  "project lesmis-poster" is not the screen's phrase. Kept in every task: the colors each result is
  graded by, and the samples' names as phrases (a prompt cannot ask for a sample without naming
  it). Kept on purpose: `cluster` in T47 B and T48 B (as T46 B), `put` in T49 with `back`.

- 2026-10-20 (pilots on build 7d87760756): the app now opens on a start page, so the facilitator's
  detours name its ways in ("Open a file", "Open network data", "New project", the Samples button
  and link, the turning demo, the usage notice at the page's foot), and the reasons for keeping
  `open` and `project` name the controls this build shows. No prompt was wrong: the prompts name
  no control, and every half was reached from the new start page.

- 2026-10-20 (fifth criteria review): T46 and T47 no longer say "keeps its own color"; they ask to
  leave the other colors as they are (T46) or to change no color (T47). The purple token is spoken
  "each layer's own value", and question 3 asks whether readers take it to mean that, so the prompt
  must not hand them the meaning.

- 2026-10-19 (pilots on build e3c5bca8e6): the T41/T48 detour line says what drops an unfinished
  card on this build (Enter, Escape in its empty box, a click on the drawing) and that a click in
  a side panel does not. No prompt was wrong.

- 2026-10-19 (fourth review, before the freeze): T50 asks what "made the project color them"
  orange or green, not "draw them": its route reads "Why this look", where every unset color
  line's spoken name says "drawn". `draw` is kept on purpose in T43, T47 and T51 with its reason.
  T44 is not run in round 1; its two sessions go to T51. T41's "missing" stays in both halves.

- 2026-10-18 (pilots on build 6dd0b00bd7): the T41/T48 detour line says an unfinished card is
  dropped with a notice after a click on the drawing too. No prompt was wrong.

- 2026-10-17 (second review, before the freeze): T47 A asks for cubes, as B does, so both halves
  ask for one change on two domains (A asked for "clearly bigger", which no grader can threshold,
  and T43 already tests bigger). T48 A says "circles", as T46 A and T47 A do, so the task's noun
  runs on two domains; T46 B, T47 B and T48 B say "one another", not "each other", which the
  description of the groups analysis uses. T37 asks for "the most ties to others": its old
  "connected" was kept for a false reason (an Analyze card is called "Most connected").

- 2026-10-17 (after the review of the tier 3 materials): T51 added (each kind its own color);
  T37 and T42 not run in round 1. Words changed: T38 B, T41 B, T42 B, T43 B, T48 B and T51 B are
  a reporter colleague's sources, not "your" sources, and T39 B is for a sports newsletter (the
  prompts reach non-reporters); T41 A's middle rewritten (it said "you must call everyone" and
  "you have no way to call" in one sentence); T41's "has no ... on file" and "for whom you have
  no" became "is missing" (they echoed "Has no value"); T45 B's ties are blue, not black (black
  reads as the starting dark gray); T47 A asks for "clearly bigger", not "twice as big" (the
  starting size is never on screen); T47 B says the program's own clusters, not the file's
  conferences, as T46 B; T48 says "the way they did when the file first opened" (the old "as they
  did before" could mean the clusters' colors) and asks for a count. The wording check now counts
  open, opened, ready-made, new, show, number, keep, look, more and first.
- 2026-10-17: Written for the first-use styling study on the combined Style panel (Node and Edge
  tabs, typed condition cards, bulk editing of several layers). Replaces the earlier tier 3 drafts
  for returning users, whose tasks started from saved work; they are kept in git history only.
