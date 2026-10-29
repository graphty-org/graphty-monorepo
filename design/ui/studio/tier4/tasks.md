# Tier 4 tasks: data management for a returning user

Every participant in this study has used graphty before (their history is in `roster.md`). Each
task asks for a result in the person's own data, never for a control. Every task runs on two
domains' data (halves A and B), so a pass cannot come from one domain's vocabulary: A is a food
bank's sites and delivery routes (or its volunteers, or a reporter's sources), B is a river
monitoring network's gauges and the river stretches between them (or a yeast gene network).

Success definitions, success paths and reference values: `answers.md` (graders only). Bars and the
round plan: `criteria.md`. Participants and which tasks they take: `roster.md`.

## Rules for whoever runs a session

- **A participant gets** only the briefing `real.mjs --brief` writes: their persona file, their
  history from `roster.md`, the **Prompt** below word for word, their start command, and the tool's
  participant instructions. Never this file, the answers, the criteria or the roster.
- **Starts** are setup files in `../rounds/tier-4/setups/` (the participant never sees them), or
  `empty` where the task is about starting fresh. Keyboard-only Sam's start adds `--keys`.
- **Files** a prompt says the participant has are in `../tool/files/` and reach the app by the
  tool's `--upload` (the participant names the file): `pantries.csv`, `deliveries.csv`,
  `gauges.csv`, `flows.csv`, `volunteers.graphml`, `sources.graphml`. An **address** in a prompt
  is typed or pasted by the participant; it serves the same file from GitHub.
- **A follow-up** (T61 and T65) is asked by the tool at the participant's first `--end`, word for word.
- **Step notes** are one or two sentences, in character. No step cap.

## Words

No prompt uses a word that a control on the success path shows, nor an interface word.

**Avoided in every task:** data, source, field, column, row, table, type, role, join, filter,
select, hide, show only, keep, card, condition, issue, problem, warning, fix (as a control), export,
format, label, weight, time, location, latitude, longitude, category, number, text, date, yes/no,
id, key, node, edge, attribute, Sources, Fields, Filters, panel, menu, button, tab, add, load,
open (except "open" for a file in Excel), import, merge, match, blank, trim.

**Also avoided** (words the success path's controls show, found by searching the app's own text):
web address, picked, stronger, farther, apart, at least.

**Kept on purpose:** `file`, `spreadsheet`, `list` -- the everyday words for what the person has; the
start screen and the file chooser use them too, and no everyday word replaces them. The address
itself is given, never named: it says what it is.
The file names (`pantries.csv`, `deliveries.csv`, `gauges.csv`, `flows.csv`, `volunteers.graphml`,
`sources.graphml`) -- the person's own files, which the app shows once read. `network` -- the
persona's own word for the whole thing; the app's start screen uses it. `name` -- the everyday word
for what a site or station is called; the files' columns are `site` and `station`, never `name`.
`map` -- the person's plan for next month (T63); the app's map is a layout the task never needs.
`Excel` -- where the treasurer will read the file (T68). `GraphML` -- the format the colleague's
program reads (T68 B); the person would name it, as Maren and Dana would.

## The tasks

| Task | What it is about                                        | A                                    | B                              |
| ---- | ------------------------------------------------------- | ------------------------------------ | ------------------------------ |
| T60  | A network brought in from a web address                 | sources.graphml (reporter)           | yeast-galactose.graphml (lab)  |
| T61  | Two spreadsheets put together as one network            | pantries.csv + deliveries.csv        | gauges.csv + flows.csv         |
| T62  | A column the program read the wrong way, set right      | pantries.csv (when each site opened) | gauges.csv (when each went in) |
| T63  | Where and when: ready for a map and a year-by-year view | pantries + deliveries                | gauges + flows                 |
| T64  | What each thing is called, and what makes a tie strong  | pantries + deliveries                | gauges + flows                 |
| T65  | Only some of them in the picture, and some marked       | volunteers.graphml                   | gauges + flows (tidied)        |
| T66  | Leave out what came only from the second list           | pantries + deliveries                | gauges + flows                 |
| T67  | What looks wrong in a file, put right                   | pantries.csv                         | gauges.csv                     |
| T68  | Sending the data to someone else                        | pantries + deliveries (spreadsheets) | gauges + flows (GraphML)       |

T68 starts with one node left out of the picture (the state T66 leaves), so an export that drops
rows without saying so can be seen.

What each task reaches: a web address (T60); the second-file flow that puts two tables together
and what it says did not fit (T61); a column's kind (T62); designating the time and place (T63) and
the name and the strength (T64); condition cards with Select and Hide and their counts, two cards
in either order, on a yes/no, a number and a date (T65); the Data source card with two sources loaded (T66); the data issues and
their fixes (T67); export of tables and of a network file (T68).

### T60. From a web address (two datasets)

- **Prompt A (sources.graphml):** "A colleague put the newest copy of your sources network online
  instead of emailing it. It is at
  https://raw.githubusercontent.com/graphty-org/graphty-monorepo/master/design/ui/studio/tool/files/sources.graphml
  -- bring it into the program straight from there, without saving it to your computer first. Then tell us how many people and organizations it holds, and how many ties join them."
- **Prompt B (yeast-galactose.graphml):** "The lab's yeast gene network is published online at
  https://raw.githubusercontent.com/graphty-org/graphty-monorepo/master/design/ui/studio/tool/files/yeast-galactose.graphml
  -- bring it into the program straight from there, without downloading it first. Then
  tell us how many genes it holds and how many interactions join them."

### T61. Two spreadsheets as one network (two datasets)

- **Prompt A (pantries.csv + deliveries.csv):** "The food bank keeps two spreadsheets. pantries.csv
  lists every site, and deliveries.csv lists each delivery route between two sites, with how many
  trips the van made. Put them together so the sites and the routes between them are one network.
  Then tell us how many sites and how many routes the network has, and whether anything in the
  route list did not fit the site list."
- **Prompt B (gauges.csv + flows.csv):** "The river project keeps two spreadsheets. gauges.csv
  lists every gauge on the river, and flows.csv lists each stretch of river that runs from one
  gauge to the next, with its length in kilometers. Put them together so the gauges and the
  stretches between them are one network. Then tell us how many gauges and how many stretches the
  network has, and whether anything in the stretch list did not fit the gauge list."
- **Follow-up** (asked after the participant's first `--end`):
    - A: "How many of the routes came from the second spreadsheet, and where did you read that?"
    - B: "How many of the stretches came from the second spreadsheet, and where did you read that?"

### T62. Read the wrong way (two datasets)

- **Prompt A (pantries.csv):** "Your site list records the day each site opened, but the program
  treats those days as plain words, so it cannot put the sites in order of when they opened. Get it
  to understand that those are calendar days. Then tell us which site opened most recently."
- **Prompt B (gauges.csv):** "Your gauge list records the day each gauge was put in, but the
  program treats those days as plain words, so it cannot put the gauges in order of age. Get it to
  understand that those are calendar days. Then tell us which gauge was put in most recently."

### T63. Ready for a map and a year-by-year view (two datasets)

- **Prompt A (pantries + deliveries):** "Next month you will show the board where the food bank's
  sites are and how the network grew year by year. Set the program up now so it knows where each
  site is and when each one opened. Tell us when it is set, and what in your list it goes by for
  where each site is and for when each one opened."
- **Prompt B (gauges + flows):** "Next month you will show the river council where the gauges are
  and how the network grew over the years. Set the program up now so it knows where each gauge is
  and when each one was put in. Tell us when it is set, and what in your list it goes by for where
  each gauge is and for when each one was put in."

### T64. What it is called, and what makes a tie strong (two datasets)

- **Prompt A (pantries + deliveries):** "Everywhere the program names a site, it should use the
  site's own name, not its code. And when the program measures the network, a route the van drove
  more often should matter more. Set both up, then tell us what the program now calls
  the site whose code is P05."
- **Prompt B (gauges + flows):** "Everywhere the program names a gauge, it should use the
  station's own name, not its code. And when the program measures the network, a path between two
  gauges should be judged by how many kilometers of river it covers, not by how many stretches it
  crosses. Set both up, then tell us what the
  program now calls the gauge whose code is G05."

### T65. Only some in the picture, and some marked (two datasets)

- **Prompt A (volunteers.graphml):** "For a thank-you event you only want to see the volunteers who
  are trained and gave 10 hours or longer; everyone else should be out of the picture for now,
  without deleting anyone. Then, among those still in the picture, mark the staff members as the
  ones you are working with right now, without taking anyone else away. Tell us how many people are
  still in the picture and how many are marked."
- **Prompt B (gauges + flows, tidied):** "For the council's field day you only want to see the
  gauges that send their readings by themselves and are 70 cm deep or deeper; every other gauge
  should be out of the picture for now, without deleting any. Then, among those still in the
  picture, mark the ones put in before 2005 as the ones you are working with right now, without
  taking any other gauge away. Tell us how many gauges are still in the picture and how many are
  marked."
- **Follow-up** (asked after the participant's first `--end`):
    - A: "Would it have made any difference if you had set those up in the other order? How can you tell?"
    - B: "Would it have made any difference if you had set those up in the other order? How can you tell?"

### T66. Only what is on your own list (two datasets)

- **Prompt A (pantries + deliveries):** "One site in this network turned up only in the delivery
  log; it is not one of the food bank's own sites. Leave it out of the picture without deleting it
  from the network, and tell us how many sites are still in the picture."
- **Prompt B (gauges + flows):** "One gauge in this network turned up only in the stretch list; it
  is not one of the project's own gauges. Leave it out of the picture without deleting it from the
  network, and tell us how many gauges are still in the picture."

### T67. What looks wrong, put right (two datasets)

- **Prompt A (pantries.csv):** "Before you pass this site list on, check whether the program thinks
  anything in it looks wrong. Where the program can put something right for you, do it. Tell us
  what it found and what you changed."
- **Prompt B (gauges.csv):** "Before you pass this gauge list on, check whether the program thinks
  anything in it looks wrong. Where the program can put something right for you, do it. Tell us
  what it found and what you changed."

### T68. Sending it on (two datasets)

- **Prompt A (pantries + deliveries):** "The food bank's treasurer wants the site list and the
  route list as spreadsheet files she can open in Excel. Make those files for her from what you
  have here, and tell us where they ended up."
- **Prompt B (gauges + flows):** "A colleague on the river council uses another network program
  that reads GraphML. Make a GraphML file of this whole network for him, and tell us where it ended
  up."

## Detours each pilot walks

| Task | Commonest detours (a person who does not know the path tries these first)                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------ |
| T60  | "Open a file" and pasting the address into the file chooser; the Data place's add menu (Server...) from inside an open project       |
| T61  | Opening the second file from the start screen or the main menu (a second project, or Replace); Cancel on the join screen, then again |
| T62  | The table's column header menu; the inspector's "Set as time"; the Data place's Fields                                               |
| T63  | The inspector's "Set as time"; the table's column menu; the Map layout before anything is designated                                 |
| T64  | The Style panel's Text for the name; the Analyze list for a weight; the table's column menu                                          |
| T65  | The find box (typing a rule); a style layer's Which nodes instead of a filter; the toolbar's filter button                           |
| T66  | Removing the second source; a card on the id column; a style layer that fades the node                                               |
| T67  | The table's warning marks first; the inspector of a source; the table's column header menu                                           |
| T68  | Control+S (save the project) instead of export; the Export dialog's image tab first; turning the left-out node back on first         |
