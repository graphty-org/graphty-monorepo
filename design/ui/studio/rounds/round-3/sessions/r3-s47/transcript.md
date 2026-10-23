# Session r3-s47 -- Morgan Reyes (screen-reader analyst), task T14 "Stop for the day and come back"

Dataset: Les Miserables sample. Screen-reader mode (keyboard only). Setup already loaded the sample,
added name labels and ran PageRank.

## Step 0 -- start

Command: `node tool/real.mjs --start rounds/round-3/sessions/r3-s47 setup:rounds/round-3/setups/T14.txt --sr`

Heard: `focus: button "Analyze"`.

Morgan: "So I'm sitting on a button called Analyze. That's where I left off, presumably after the
PageRank run. I want to save this under my own name. Every tool on earth uses Control+S; I'll try
that before hunting for a menu."

## Step 1 -- Control+S

Command: `--step ... --key Control+s`

Heard: `focus: textbox "Name" value "Les Miserables"`.

Morgan: "Good, Control+S works and drops me in a Name box already filled with 'Les Miserables'.
Before I type, I want to know what else is in this dialog -- where does it put the file? Reading
the dialog."

## Step 2 -- read the dialog

Command: `--step ... --read`

Heard: dialog "Save Les Miserables as", heading, Close, Name textbox "Les Miserables", Cancel, Save.

Morgan: "Short and labeled, I'll give it that. But nothing says where it saves -- a file on my disk,
the browser, a server? For patient data that's the first question. For the sample I'll go ahead.
Select the name, type my own."

## Step 3 -- name it

Command: `--step ... --key Control+a --type "Les Mis PageRank Oct 7"`

Heard: `focus: textbox "Name" value "Les Mis PageRank Oct 7"`.

Morgan: "Name is in. Enter should save."

## Step 4 -- Enter to save

Command: `--step ... --key Enter`

Heard: `focus: nothing (the page itself)`; `live: alert (assertive): "Saved Les Mis PageRank Oct 7 in this browser."`
(Tool also noted the drawing kept moving for a second.)

Morgan: "Saved -- 'in this browser'. That answers part of my where-does-it-go question: it stayed
local, not uploaded. But 'in this browser' is not quite 'a file on my computer'; if IT clears my
browser profile, is it gone? Nobody told me. And focus dropped onto the page itself -- I'm nowhere.
That's the fastest way to lose me. Still, it's saved. End of day for me means closing the tab.
Closing it and opening the app fresh, as if it's tomorrow."

## Step 5 -- close the tab, come back "tomorrow"

Command: `--step ... --reopen`

Heard: `focus: nothing (the page itself)`. No announcement at all.

Morgan: "New tab, app open, silence. Let me read what's on the page and look for my project."

## Step 6 -- read the start page

Command: `--step ... --read`

Heard: Main menu; heading 1 "graphty"; "Local only"; heading 2 "Start"; Open project or file Ctrl+O;
New from data; "Files are read on this computer and never uploaded."; heading 2 "Recent projects";
row "Les Mis PageRank Oct 7 In this browser - 77 nodes - Oct 7, 2026, 5:01 AM More for Les Mis
PageRank Oct 7"; "This browser can clear projects kept here. Save a local copy of any project you
need to keep."; heading 2 "Samples" and four sample buttons.

Morgan: "Now that's a page with headings. And it tells me files are never uploaded -- good. My
project is in Recent projects with its node count. But here's the catch, said after the fact:
'This browser can clear projects kept here. Save a local copy.' So when it told me 'Saved' last
night, it wasn't really saved on this computer in the sense I meant. I'd have liked to hear that
in the save dialog, not the next morning. First, open it and check my work is there. Tab to the
row."

## Steps 7-11 -- Tab x5

Command: `--step ... --key Tab` five times.

Heard in turn: button "Main menu"; button "Local only"; button "Open project or file... Ctrl+O";
button "New from data..."; gridcell "Les Mis PageRank Oct 7 In this browser - 77 nodes - Oct 7,
2026, 5:01 AM".

Morgan: "Clean tab order, every control named. The project is a grid cell rather than a button,
which is a bit odd -- I'm not sure Enter will open it -- but let's try Enter."

## Step 12 -- Enter on the project row

Command: `--step ... --key Enter`

Heard: `focus: nothing (the page itself)`; `live: status (polite): "PageRank finished"`;
`live: alert (assertive): "Opened Les Mis PageRank Oct 7"`.

Morgan: "Opened. But 'PageRank finished' -- did it re-run PageRank just now, or is that a stale
message from yesterday being replayed? If it recomputed, fine for PageRank, it's deterministic,
but I'd want to know. And focus is on nothing again. Reading the page to check my labels and my
PageRank results are actually there."

## Step 13 -- read the reopened page

Command: `--step ... --read`

Heard: Main menu; button "Project: Les Mis PageRank Oct 7"; Undo/Redo disabled; Local only; Graph;
Data; "Graph Les Miserables"; Find; tree items Selection, PageRank, Everything; "Color: PageRank";
image "Color: PageRank 0.003299 0.07543"; Analyze; Layout; View; Quick actions; "PageRank
finished"; Style tab, Values tab selected; Overview: Nodes 77, Edges 254, Undirected (from the
file), Density 0.08681, Components 1, Edges per node 1 to 36, mean 6.597.

Morgan: "My project name is there, a PageRank item is in the list, and there's a color key for
PageRank with its range. That's the PageRank part. The overview is exactly what I want on opening,
nice. What I can't hear yet is whether the names are still on the drawing -- that was the other
half of my work. The labels were set on Everything's Style. Tabbing to the Everything item."

## Steps 14-23 -- Tab x10

Heard: Main menu; Project: Les Mis PageRank Oct 7; Undo disabled; Redo disabled; Local only; Graph;
combobox Find; treeitem "Selection"; button "Hide PageRank"; separator "Resize left panel" value 240.

Morgan: "Tab goes into the tree once, then out. It's a tree, so arrows inside it. Shift+Tab back
to the PageRank toggle, Shift+Tab again into the tree, then arrow down to Everything."

## Steps 24-26 -- back into the tree, down to Everything

Commands: `--key Shift+Tab --key Shift+Tab`, `--key ArrowDown`, `--key ArrowDown`

Heard: treeitem "Selection"; treeitem "PageRank"; treeitem "Everything".

Morgan: "Arrows work in the tree. Nothing tells me 'selected' or a count, just names. Enter on
Everything, then find its Style tab."

## Step 27 -- Enter on Everything

Heard: `focus: treeitem "Everything" selected`; a live region "77 labels, 7 hidden" (the tool notes
it arrived already filled, so many screen readers would not speak it).

Morgan: "'77 labels, 7 hidden' -- if I heard it, that's a strong hint the names are still on. 77
nodes, 77 labels, seven hidden presumably because they overlap. But I want to confirm on the Style
tab that the label is the name and not some ID. Tabbing to the Style tab."

## Steps 28-31 -- Tab to the Style tab

Heard: separator "Resize left panel"; Canvas "Graph drawing"; button "Analyze"; tab "Style" selected.

Morgan: "The drawing is a 'Canvas', named Graph drawing -- I'll leave it for now, not my task today.
Style is already selected. Reading what's in the panel."

## Step 32 -- read the Style panel

Heard (Inspector, Everything): Nodes/Edges radios; Fill color 6366F1; Size 1; Shape Icosphere;
button "Label" disabled; button "Add label line" disabled; "Label position Above"; button
"Label, Above: name"; button "Remove label line"; "77 labels, 7 hidden"; checkbox "Show all
labels"; Tooltip.

Morgan: "'Label, Above: name.' There it is -- the names are still on. So both halves of my work came
back: the PageRank item with its color key, and the name labels. One thing puzzled me: a 'Label'
button and an 'Add label line' button both disabled, right next to a label line that exists. I
can't tell why they're disabled and nothing says. Not my task, noted.

Now, the start page warned me this browser can clear what it keeps. The task said keep it on this
computer. I don't trust browser storage on an agency laptop with IT-managed profiles, so I want a
real file too. Back to Main menu, which was the first tab stop."

## Steps 33-44 -- Shift+Tab back to Main menu

Heard the same stops in reverse (Analyze, Canvas, separator, treeitem Everything selected, Hide
PageRank, Find, Graph, Local only, Redo, Undo, Project, Main menu). Reverses cleanly.

Morgan: "Shift+Tab reverses cleanly. Opening the main menu."

## Steps 45-46 -- open Main menu, read it

Heard: `focus: menuitem "Back to start"`. Reading gave me the whole page again before the menu items
(Back to start, New project, Open project or file Ctrl+O, Open sample, Open recent, Save Ctrl+S,
Save as Shift+Ctrl+S, Save local copy..., Export Ctrl+E, Rename F2, Settings, Keyboard shortcuts ?,
Help).

Morgan: "Reading the menu read me the entire page first, then the menu. Long. But the menu is
sensible and shows shortcuts. 'Back to start' is probably the proper 'put it away' step -- I closed
the tab instead, which worked too. 'Save local copy' is what I want. Arrow down seven."

## Steps 47-48 -- ArrowDown x7, Enter on "Save local copy..."

Heard: `focus: menuitem "Save local copy..."`, then Enter: `focus: button "Main menu"`. Nothing
else. (The tool recorded a download, "Les Mis PageRank Oct 7.graphty.json", 29,860 bytes, but the
app said nothing.)

Morgan: "Silence. Focus went back to Main menu, which is polite, but did it save? Where? Under what
name? Chrome's own download bar might tell me something, but the app said not one word. Compare
that with the regular save, which told me 'Saved ... in this browser'. I'd have to go check my
Downloads folder in Explorer to be sure. I'm stopping here."

Command: `node tool/real.mjs --end rounds/round-3/sessions/r3-s47`

## Wrap-up (in character)

**Did I finish?** Yes. I saved under my own name with Control+S, closed the tab, opened the app
again, and reopened the project from Recent projects. All of my work was there: the PageRank item
in the list with its color key (0.003299 to 0.07543), and the name labels on Everything ("Label,
Above: name", "77 labels, 7 hidden"). The overview -- 77 nodes, 254 edges, undirected, one
component -- was waiting for me on reopen, which is exactly what I want first.

**Rating: 5 of 7.** The save itself was fast and well labeled, the start page had real headings, the
tab order was clean and reversed cleanly, and Recent projects told me the node count and date.
What cost me points:

- "Saved ... in this browser" is not what I meant by "kept on this computer", and the warning that
  "this browser can clear projects kept here" only appeared the next morning on the start page,
  not in the save dialog where I made the decision. I would have saved a real file in the first
  place if I'd known.
- "Save local copy..." downloaded a file with no announcement at all. I could not tell whether it
  worked or where the file went.
- Focus landed on nothing after saving and again after reopening the project. Twice I was nowhere
  and had to go find my place.
- On reopen I heard "PageRank finished". I can't tell if it re-ran PageRank or replayed an old
  message. For PageRank it's harmless; for anything random it would matter to me.
- "77 labels, 7 hidden" was in a region that may never be spoken; I only found it by reading.
- Two label buttons ("Label", "Add label line") were disabled next to an existing label line, with
  no reason given.
- Reading the open main menu read me the whole page before the menu items.

**Would I use it instead of my scripts?** Not for this. For keeping work, a script file in git is
still more trustworthy than browser storage. But the reopen-and-get-the-overview part was better
than I expected, and I'd use the saved .graphty.json file -- if I'd been told it was written.
