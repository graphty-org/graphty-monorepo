# Session r2-s36 -- Alex (analyst), task T14 "Stop for the day and come back", Les Miserables

Start: `node tool/real.mjs --start rounds/round-2/sessions/r2-s36 setup:rounds/round-2/setups/T14.txt`

## Step 0 -- 01.png (start)

Seen: Les Miserables loaded, names drawn on the nodes, nodes colored orange by "Influence"
(0.003299 to 0.07543 legend top-left). Left panel: Selection, Influence (77), Everything.
Right panel: Everything > Style with a Label line "Above / name", "77 labels, 7 hidden to avoid
overlap". Top bar says "Les Miserables", undo/redo, a lock icon and "Local only".
Thought (Alex): "Local only" -- good, that is the first thing I'd want to know. So my work so far:
the Influence run (PageRank, I think) and the name labels. Now I need to save this under my own
name. No "Save" button visible; I'll try the hamburger menu top left.

## Step 1 -- 02.png

Command: `--step --click-at 23,20` (main menu button)
Seen: menu with Back to start, New project, Open project or file..., Open sample, Save (Ctrl+S),
Save as... (Shift+Ctrl+S), Save local copy..., Export..., Rename (F2), Settings, Keyboard
shortcuts, Help.
Thought: Plenty of save options. "Save" vs "Save as..." vs "Save local copy..." -- three saves,
slight hesitation over which one. The task says "under a name you choose", so Save as... is the
one that should ask me for a name. Trying that.

## Step 2 -- 03.png

Command: `--step --click "Save as..."`
Seen: dialog "Save Les Miserables as", one Name field prefilled "Les Miserables", Cancel / Save.
Nothing says WHERE it goes (a file? the browser?). Mild worry, but "Local only" was in the top bar.
Thought: I'll name it like I would at work: "LesMis influence 2026-10-07". Clicking into the name
field, selecting all, typing my name.

## Step 3 -- 04.png

Command: `--step --click "Name" --key Control+a --type "LesMis influence 2026-10-07"`
Tool note: "Name" matched the input and its label; took the input (fine).
Seen: field now reads "LesMis influence 2026-10-07". Clicking Save.

## Step 4 -- 05.png

Command: `--step --click "Save"`
Seen: top bar title changed to "LesMis influence 2026-10-07"; a toast "Saved LesMis influence
2026-10-07 in this browser." Good -- it told me where: in this browser, not a server and not a
file. Slight worry: "in this browser" means if IT clears my Chrome data, it's gone. I'd want a
file copy too for real work, but the task says "kept on this computer", and the browser is on this
computer. Saving part done.
Next: put it away for the day. At the end of the day I just close the tab. Doing that (close tab
and open the app again tomorrow).

## Step 5 -- 06.png

Command: `--step --reopen` (closed the tab, opened the app again: "tomorrow")
Seen: a start screen. Start: Open project or file..., New from data..., "Files are read on this
computer and never uploaded." Recent projects: "LesMis influence 2026-10-07 -- In this browser -
77 nodes - Oct 7, 2026, 12:07 ...". Under it: "This browser can clear projects kept here. Save a
local copy of any project you need to keep." Samples list on the right.
Thought: There it is, with my name. Reassuring that it shows the node count (77, matches the
sample). The warning line confirms my worry: browser storage can be wiped. For real supplier work I
would also "Save local copy". Putting away done; now opening my project.

## Step 6 -- 07.png

Command: `--step --click "LesMis influence 2026-10-07"`
Seen: toast "Opened LesMis influence 2026-10-07". Title is my name. The drawing looks the same as
yesterday: same shape (same positions as far as I can tell -- Myriel's fan at the bottom, Gribier
out on the right), names on the dots, orange Influence coloring with the same 0.003299 to 0.07543
legend. Left panel: Selection, Influence, Everything. Right panel now shows Graph > Values: Nodes 77,
Edges 254, Undirected, Density 0.08681, Components 1.
Small difference: yesterday the Influence row had "77" beside it; now it has no number. Not sure
if that means something got lost. Next: click Everything to check the label setting is really
still there and not just drawn.

## Step 7 -- 08.png

Command: `--step --click "Everything"`
Seen: Everything > Style, same as yesterday: Label "Above / name", "77 labels, 7 hidden to avoid
overlap". Color 6366F1, Size 1, Icosphere -- unchanged. Labels survived as a setting, not just a
picture. Next: click the Influence row to check the scores themselves came back (and why the 77 is
gone from that row).

## Step 8 -- 09.png

Command: `--step --click "Influence"`
Seen: Influence panel: "Measure from Influence, Oct 7"; Style: Color = Influence; Label Show
checked. The row now has an eye icon. Nothing says "PageRank" here -- I ran PageRank, and the app
calls it "Influence". I'd have to tell my director "Influence (PageRank)", so I want to see the
word PageRank somewhere. Next: the Values tab, to see the actual scores and who ranks top.

## Step 9 -- 10.png

Command: `--step --click "role=tab:Values"`
Seen: Values: a histogram, "77 of 77 have a value, 0.003299 to 0.07543, median 0.01242". Top 10:
Valjean 0.07543, Myriel 0.04278, Gavroche 0.03577, Marius 0.03089, Javert 0.0303, Thenardier
0.02793, Fantine 0.02702, Enjolras 0.02188, Cosette 0.02061, MmeThenardier 0.0195. "Made with:
Analysis PageRank, Ran Oct 7, Damping factor 0.85, Weight None".
Thought: That's the whole thing. Valjean top, Myriel second -- that's what NetworkX gives for
PageRank on this graph as far as I remember, and it shows the damping factor, so I can rerun it
and say exactly what I did. All 77 nodes have a value, nothing dropped. Returning part done; task
done.

Command: `node tool/real.mjs --end rounds/round-2/sessions/r2-s36`

## Wrap-up (Alex, in character)

**Did I finish?** Yes. Saved under "LesMis influence 2026-10-07", closed the tab, came back, opened
it from Recent projects. All my work was there: the PageRank ("Influence") scores for all 77
characters with the same range and the same top 10, the orange coloring and its legend, the name
labels (same setting, "77 labels, 7 hidden"), and the drawing in the same arrangement. It even
kept the settings PageRank ran with (damping 0.85, no weight).

**How easy, 1 (very difficult) to 7 (very easy):** 6.

**What took longest / what confused me:**

- The menu has three saves -- Save, Save as..., Save local copy... -- and I had to stop and think
  which one lets me pick the name and where each one puts the file. Save as... worked, but the
  dialog itself does not say where the project will be kept; only the toast afterwards said "in
  this browser".
- "In this browser" plus the start screen's "This browser can clear projects kept here" makes me
  nervous for real work. Company Chrome profiles get wiped. I'd want saving a file to disk to be
  the obvious path, not the third option. I did not test "Save local copy".
- After reopening, the Influence row in the left list no longer showed "77" next to it the way it
  did before I saved. Probably harmless, but for a second I thought something had been dropped.
- The left list and the legend say "Influence", not "PageRank". I only found the word PageRank
  under Values > Made with. Fine once found, but I'd want it on the row so I don't say the wrong
  measure to my director.
- Good: "Local only" in the top bar and "Files are read on this computer and never uploaded" on
  the start screen answered my where-does-my-data-go question before I asked it. The project
  opened straight back with no sign-in.
