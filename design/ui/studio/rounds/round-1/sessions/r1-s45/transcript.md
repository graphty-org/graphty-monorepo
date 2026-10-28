# Session r1-s45 -- Nadia, a picture and the numbers for a report (Les Miserables)

Participant: Nadia, a level-1 transaction monitoring analyst. She has never used a graph tool. She
judges a tool by minutes and by whether the result goes into a file as one picture plus some text.

Task as given: "Earlier today you opened the ready-made network of Les Miserables characters that
comes with this program and had it color the characters by the circles they keep turning up in.
You now need two things for a report: a picture file of the drawing as it looks now, with its key
to the colors, and the numbers the program worked out for each character in a file Excel can
open."

Start (setup, not shown to the participant): No thanks; Open the Les Miserables sample; Analyze
(Shift+A), Louvain, Run.

## Steps

### 01 -- the starting screen

Command: `--start <session> setup:<session>/setup.txt` (waited a few minutes for a browser slot).

Saw: the network colored in six colors. A box over the top-left of the drawing titled "Color:
Communities" lists Group 1 to Group 6 with their colors. The left panel lists the same groups with
counts (20, 17, 11, 11, 10, 8). The right panel shows Nodes 77, Edges 254 and similar figures.

Think-aloud: "OK, it's colored, and there's already a key on it. Good. I need a picture and a
spreadsheet. In every program I use that's under File, so the menu at the top left."

### 02 -- main menu

Command: `--step --click-at 24,20` (button "Main menu").

Saw: New project, Open project or file..., Save, Export... (Ctrl+E), Settings..., Keyboard
shortcuts, Help.

Think-aloud: "Export. That's it."

### 03 -- the Export dialog, Image

Command: `--step --click "Export..."`

Saw: a dialog with two tabs on the left, Image and Data. Image is selected: preset "To share --
PNG, 2x", View "Current view", size, format PNG, background "Canvas color", and a small preview.
The preview shows the drawing with a tiny key in its top-left corner.

Think-aloud: "PNG is fine, it pastes into anything. The preview is small but I can see the color
key in the corner. I'm not touching the settings. Export."

### 04 -- image saved

Command: `--step --click "Export"` (the tool noted that "Export" also matched the dialog's own
name and took the button).

Saw: a notice "Exported les-miserables_current-view.png". The file is 1806 x 1720. Opened it: the
whole drawing with a white key box at the top left reading "Color: Communities" and Group 1 to
Group 6 with their color squares, clear and readable.

Think-aloud: "Picture done, and the key is in it, readable. That's the part QA would want. Now the
numbers. The dialog had a Data tab."

### 05 -- the Export dialog, Data

Command: `--step --key Control+e --click "Data"`

Saw: Data -- "One row per node, with every computed value - CSV". Format CSV, Table Nodes or
Edges (Nodes selected). A large yellow warning box: "CSV cannot hold everything", listing that
position, style.color, style.size, style.shape and edge style columns "cannot be written", "3
graph attributes cannot be written", and "the generic dialect has no direction column; 254
undirected edges read back as directed unless the importer is told otherwise". Below it, a
preview: `id,name,results.louvain.group,results.louvain.groupSize` then rows like
`Napoleon,Napoleon,6,8`.

Hesitation: "Whoa, a big yellow warning. 'Cannot be written'... is it going to lose my numbers?
'Generic dialect', 'importer', I don't know what those mean. Positions, colors, shapes -- I don't
need those in Excel. The preview has each character with a group and a group size, and those are
the numbers. I'll go ahead, but if I were in a hurry this box would have made me stop and wonder
if I was doing it wrong." She spent longer on this box than on anything else in the session.

### 06 -- CSV saved

Command: `--step --click "role=button:Export"`

Saw: notice "Exported les-miserables_nodes.csv". The file has 77 character rows plus a header,
columns id, name, results.louvain.group, results.louvain.groupSize. Napoleon is in group 6 of
size 8, which matches the pink Group 6 with 8 in the key and the left panel.

Think-aloud: "Excel will open it. The column names are a bit technical, 'results.louvain.group',
I'd rename them to 'Group' and 'Group size' before it goes in the report. Done."

Command: `--end`.

## Debrief, in character

- **Finished?** Yes. Both files: `downloads/les-miserables_current-view.png` (the drawing with its
  color key) and `downloads/les-miserables_nodes.csv` (77 characters, group and group size).
- **How hard (1-7, 1 = very easy):** 2. About four clicks once I found Export under the menu.
- **What confused me:**
    - The yellow "CSV cannot hold everything" box. It reads like an error, it lists things I never
      asked for, and words like "generic dialect", "importer" and "read back as directed" mean
      nothing to me. I could not tell whether my numbers were safe until I read the preview under
      it. A line saying what the file does hold would have been enough.
    - The column headings in the CSV ("results.louvain.group", "results.louvain.groupSize") are not
      words I can put in a report as they are; "Louvain" appears nowhere else I looked, while the
      screen calls them "Communities" and "Group".
    - Small thing: on the screen the key is a dark box, in the picture it is a white box. Fine, just
      noticed it.
- **Export test:** passes. One picture with its key, plus a file I can open in Excel.
