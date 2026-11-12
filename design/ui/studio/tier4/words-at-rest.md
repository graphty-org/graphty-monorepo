# Tier 4 words-at-rest budget per data screen (bar 6)

Bar 6 counts "a sentence on screen where a control would do" as a violation. The content designer
judges it by counting the app's own words at rest on each data screen against the budget below,
which comes from principle 5 of `design/ui/framework/principles.md` ("The data speaks, even over
the app explaining itself"). The budget is fixed before any session and never re-set from the
round's data.

## How words are counted

- **App text** is every visible string that is not a user's attribute name, object name or value.
  Headings, labels, state words, verbs and menu items count. Values, counts and the names of the
  person's own files, columns and nodes do not. A word is a run of characters between spaces; a key
  hint such as "Ctrl+O" is one word. This is principle 5's method (`content-design.md` 7).
- **At rest** means as the screen first shows, with nothing hovered and no tooltip open.
- **The scripted count** is `measure.mjs`'s `wordsOnScreen`, which the bar 5 walk
  (`bars.mjs --tier 4`) records per screen in the round's `bars/vocabulary.json`. It leaves out
  every word that matches the network's data, so it can drop an app word spelled like a column (a
  column "source" against the join screen's "Source"). The content designer's hand count decides
  when the two differ.
- **The open surface** is what the screen adds to the Data place behind it: a menu, a popover, a
  dialog or the join screen. It is counted apart from the Data place, which every in-project data
  screen shares.

## The budget

| Screen                                                                                          | Budget (principle 5)                                          | Measured on 79ed770292 (1440 x 900, scripted)                                                  |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| The Data place at rest, a graph loaded, nothing selected (behind every in-project screen below) | The whole screen at rest: **50** words at most                | 52                                                                                             |
| The start screen (the empty screen)                                                             | **50** at most                                                | Not counted by the walk                                                                        |
| The web address box, from the start screen                                                      | The dialog: about **30**, **40** at most                      | 117 with the start screen behind it; the dialog alone about 23 (its words as from Sources "+") |
| Sources "+" (the add menu)                                                                      | One row per item, at most **3** words per item, plus its key  | 19; the menu alone 9 (5 items, 2 keys)                                                         |
| The web address box, from Sources "+"                                                           | The dialog: about **30**, **40** at most                      | 34; the dialog alone about 23                                                                  |
| The join screen                                                                                 | The panel that replaces Sources: about **30**, **40** at most | 37; the panel alone about 26                                                                   |
| The issue list                                                                                  | The popover: about **30**, **40** at most                     | 19; the popover alone about 16                                                                 |
| Fields "+" (the role menu)                                                                      | One row per item, at most **3** words per item                | 6                                                                                              |
| The Filters picker                                                                              | The popover: about **30**, **40** at most                     | 28; the popover alone about 21                                                                 |
| Export on Data                                                                                  | The dialog: about **30**, **40** at most                      | 31; the dialog alone about 23                                                                  |

Every row heading, section heading and row name on these surfaces holds at most **3** words
(principle 5's inspector row cap). A command or a state line follows `content-design.md` 3's
verb-plus-object rule instead.

Only a caveat that principle 1 requires (a value would otherwise misstate what it describes) may
raise a budget, in the open, with the reason written in this file before the round.

## Reading the measured column

- The open-surface counts are the screen's words less the words the Data place shows behind it
  (the words common to the Sources "+", Fields "+", Filters picker and Export screens), so a surface
  that also changes the Data place behind it (the join screen redraws Fields) counts those changes
  as its own. "Alone" leaves out those Data place words too ("Rows are Id Latitude Longitude",
  "Largest component", "joined to no other", the edge table's "Direction" and "Edges"), by hand.
  All counts are from `rounds/round-1/bars/vocabulary.json`; the Data place's 52 is the words the
  four in-project screens share there.
- The Data place at rest measures 52 against 50. Most of it is the graph's Overview and Degree
  statistics in the right panel, which principle 5 allows as the recorded Statistics departure
  (about 32 words for the graph's inspector). Whether the 2 words over are a violation is the
  content designer's hand count to confirm in the round, as bar 6 says; the scripted count alone
  confirms nothing.
