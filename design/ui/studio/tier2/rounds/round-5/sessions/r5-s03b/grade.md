# Grade: session r5-s03b -- Alex (regular analyst), bus stops (T22 A), links that meet a condition

**Grade: SD** (success after a detour). The last screen (`21.png`) meets the answer key's A
success definition: the three links of 10 minutes or more (Depot -> Station 15, Station -> Harbor
14, School -> Harbor 12) are drawn as thick black lines, all 10 stops and every other gray link are
still drawn (Overview: Nodes 10, Edges 17), and no filter step exists. The count, 3, was read from
the screen (the line under the find box and the inspector's "3 edges selected" on `12.png`, and the
edges table sorted by minutes on `15.png`). The detour: Alex first colored every edge by `minutes`
from Everything's Style tab, found no way to split the ramp at 10, and undid it before taking the
find-box route (steps 1 to 9).

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of the
criteria, at 1440 x 900. Start: the bus-stops setup (bus-stops.csv loaded, PageRank run, nodes
sized and colored by PageRank). Tool commit `a5de4b445f59`, recorded with uncommitted changes in
the tool's checkout; every step produced its screenshot, so this does not void the run.

This session re-runs r5-s03, which was void because the run failed before the app opened.

## Not void: the leak flag is a false positive

`--end` printed a VOID for "a path up out of its folder", and `leaks.json` records one leak whose
text is `..`. Reading the participant's tool calls: the only `..` is inside the prose of a Bash
heredoc that appended step 5's note to the transcript ("legend 'Edge color: Everything 2 .. 15'"),
the legend text the participant copied from `06.png`. It is not a path. Every Read the participant
made was its own `briefing.md` or its own session screenshots; it opened no other file. The leak
checker matches `..` anywhere in a Bash command's text, including heredoc bodies, so a quoted
range on screen trips it. That is a tool defect, not a leak, and the session stands.

## The answer against the key

- **Marked (right).** `21.png`: exactly the three key links drawn thick black by a new style layer
  "minutes >= `10`" (legend "Edge color: minutes >= `10`"); the selection was cleared on purpose
  in step 20 and the marking stays. Nothing hidden.
- **Count (right).** 3, from "3 edges selected" (`12.png`) and checked against the table sorted by
  minutes, where the next value is 9 (`15.png`).
- **Work kept.** `work.json`: the PageRank run, the three starting layers and the source are all
  still there at the end; the only difference is the added layer `minutes-10_1`, which the
  participant made on purpose. The edge color added and then undone in steps 5 to 9 left nothing
  behind (`10.png`: links gray again, PageRank styling intact).

## Measures

- **Route:** a condition typed into the find box without "=" ("minutes >= 10"); the box answered
  "Start with = to select by a value:" and the option row "=minutes >= `10`" / "Select its
  matches", which Alex clicked (`11.png`, `12.png`). "=" was not typed unprompted. Then, beyond
  the key, the selection was made into a lasting style layer from the selection's Style tab (Line
  + Color, Line + Width, `16.png` to `20.png`).
- **Where Alex looked first:** Everything > Edges > "Color by attribute" > minutes, then the color
  chip's Scale list (Linear, Logarithmic, ..., Equal bins, Quantiles, One color per value, As
  written) looking for a cutoff (`03.png` to `08.png`). This is the place a separate
  select-by-condition or a threshold color was looked for; none was found there.
- **Where `minutes` was found:** the "Color by attribute" picker (`05.png`), then the find box.
- **Wrong turns:** 1 -- the edge-color route (steps 1 to 9: open Everything, Edges, Color by
  attribute, minutes, the chip, Scale, Escape, Undo). The table check (steps 11 to 14) is a
  verification, not a wrong turn; the style layer (steps 15 to 19) is extra marking toward the
  goal.
- **False "done":** none. "3 links ... drawn as thick black lines ... all 10 stops and 17 links are
  still on the map" is true on `21.png`. truth-on-screen holds.
- **Numbers that disagree:** none.
- **Ease (from the transcript):** 5 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no (see above).
- **Scripted exit:** not applicable; Alex finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                       | Evidence                                                                                                                         |
| --- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | missing feature | "Color by attribute" on edges offers only continuous or binned scales; none splits at a value the reader names ("10 or more"). The color route the key accepts could not be found, and it cost the participant eight steps and an undo.                                       | `07.png`, `08.png` (Scale list); transcript steps 6-8 and "What took longest"                                                     |
| 2   | 2        | wording         | The backticks of the rule syntax leak into reader-facing text: the suggestion row "=minutes >= `10`", the new layer's name in the left list and the drawing's legend "Edge color: minutes >= `10`". A legend meant for a slide shows code punctuation.                        | `11.png`, `18.png`, `21.png` (legend and layer row); transcript "the saved item and the legend keep those backticks"                |
| 3   | 1        | wording         | The undo toast after removing an edge color reads "Undid adding Everything." -- it names the layer, not the change, and "adding" is wrong (Everything existed before). The participant could not tell what had been undone until looking at the drawing.                   | `10.png` (toast); transcript step 9                                                                                               |
| 4   | 1        | defaults        | Adding Line Color and Width to the selection picks black (000000) and a width of 24 on its own; the participant judged 24 "huge" and would have to tone it down before showing anyone.                                                                                         | `18.png` (Color 000000), `20.png`; transcript steps 17-19                                                                         |
| 5   | 1        | visual          | The edge color ramp for `minutes` defaults to the same orange-to-brown palette the PageRank layer already uses on the stops, so edges and stops blend into one scale.                                                                                                         | `06.png` (edge ramp and PageRank legend, both orange)                                                                              |
| 6   | 1        | discoverability | Typing a condition into "Find nodes, edges, values" was a guess; nothing in the Style or edge panels points to it. The box's hint then made the guess work.                                                                                                                    | transcript step 7 ("I'll ... try the search box with a condition") and "I only found it by guessing"                              |
| 7   | 0        | tool            | The leak checker flags `..` anywhere in a Bash command, so a quoted on-screen range ("2 .. 15") in a heredoc writing the transcript printed a VOID at `--end`. No file outside the session was read. Not a UX problem; recorded so the checker can ignore heredoc bodies. | `leaks.json` (`"what": ".."`); the participant's step-5 heredoc                                                                  |

Problem 2 agrees with r5-s05b's report about backticks in rules (there as the "Put numbers in
backticks" refusal; here as the backticks surviving into a legend), so backticks in reader-facing
rule text now have two participants this round. Problem 4 is the answer to r5-s01b's second
problem (no visible way to keep the mark): the way exists on the selection's Style tab, and Alex
found it, but with defaults that need correcting.
