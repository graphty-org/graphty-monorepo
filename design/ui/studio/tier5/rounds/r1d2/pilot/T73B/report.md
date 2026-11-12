# T73B pilot (targeted re-walk), build d3fda9f2b6

Task: color Cedar Bend and every gauge within two stretches of river of it orange, and report how
many gauges are orange. Start: `gauges-clean.txt` (gauges.csv joined with flows.csv, the table
open). Every walk began from that setup and was driven only by the pointer, never by URL.
Screenshots are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T73B/
(not in git). An earlier walk on build 47c95a09fc that used the same folder name now sits beside
it as success-47c95a09fc.

Result: **reached**. The walk ends with Layer 1 "Within 2 hops of Cedar Bend", 7 of 11 nodes, fill
FFA500. The canvas draws 7 orange gauges and 4 in the default color (key.json: #ffa500 7, #6366f1
4). The data stayed the task's own 11 gauges and 13 stretches the whole way (data.json: 11 nodes,
13 edges, all visible, none selected).

## Walks

### success -- the success path by pointer

+ > Layer; Which nodes; type "within"; Enter; Enter (the reference picker opens, its search
focused); type "Cedar"; Enter; Done; Fill's + ("Add to node fill"); type orange; Enter. That is 12
steps, as the answer key says. It was replayed from the previous pass's success walk: all 8
recorded steps matched their screens on this build, and the session ended cleanly.

- 01.png: the setup start. Undo and Redo in the top bar are both drawn disabled.
- 06.png: the header reads "Which nodes -- Layer 1 7 of 11", the row "Within 2 hops of Cedar Bend",
  and "No match 4". The preview draws 7 green matches and 4 pale non-matches. Undo is now enabled.
- 09.png: 7 orange nodes. The key card reads "Color: Layer 1, 7 of 11 nodes", the inspector
  "Which nodes 7 of 11" and Color FFA500, and Layer 1 counts 7.

Folder: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T73B/success

### touched-9 -- a setup start ends with an empty undo history

Of the routes the fix pass touched, this is the only one that belongs to this task: every task
starts from a setup, and the fix makes a setup start end with an empty undo history. The others
are filter-card routes (Cancel on a new or an existing card; Undo, Ctrl+Z or Ctrl+Shift+Z after
Cancel; the spoken count) or other tasks' success paths. T73B builds a style layer and uses no
filter card.

- 01.png: the setup start, the table open, Stone Weir's depth_cm blank, station as Label.
- 02.png: a click on Undo is refused because the control is disabled.
- 03.png: Ctrl+Z changes nothing. The join, the blank depth and the label all stay.
- 04.png: a click on Redo is refused because it is disabled.
- 05.png, 06.png: + > Layer adds Layer 1. Undo then shows "Undid adding Layer 1.", its tooltip
  reads "Nothing to undo", and Undo is disabled again.
- 07.png: a second click on Undo is refused. The data is the setup's own (data.json: 11 nodes,
  13 edges).

Folder: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T73B/touched-9

The tool's self-test (`real.mjs --prove`) was also started against this build. Its setup-start
checks had not run when this report was written: 31 checks had passed, none had failed, and the
run was stopped before it finished. The log is
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T73B/touched-9-prove.log.
For this task's own setup, the walk above checks the same thing directly.

## Mismatches with the answer key

None. The key's "Fill; hex" step is, on screen, Fill's + button ("Add to node fill") and a text
field that takes a color name or a hex value; both reach FFA500.

## Defects

Nothing crashes, blocks the task or spoils its grade on these walks. As on earlier passes, the
canvas toolbar covers the lowest orange gauge in success/09.png. That is decided (the toolbar is
an overlay, and framing never avoids it), and the key card and Layer 1 both read 7.
