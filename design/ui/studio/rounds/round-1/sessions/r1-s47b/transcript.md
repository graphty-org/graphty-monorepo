# Session transcript: Tom (recipe recipient), task "Stop for the day and come back", Les Miserables

Participant: Tom, 52, lab manager, does not build networks. Reads headings, numbers and legends;
skims side panels. Task: the Les Miserables work (names on the drawing, "which characters matter
most" worked out) must be kept on this computer under a name he chooses, put away, brought back
as if tomorrow, and he must say whether everything came back.

Tool: `design/ui/studio/tool/real.mjs`, session folder `rounds/round-1/sessions/r1-s47b`.

Note on the session itself: the start waited about 25 minutes for a free browser slot ("waiting
for a free browser slot ..."), because more than twenty other sessions were queued for the four
slots. Once a slot was free, the session ran without errors.

## Steps

### 1. Start

Command: `--start rounds/round-1/sessions/r1-s47b setup:rounds/pilot/T14/setup.txt` -> `01.png`

Saw: a network of orange balls with small names on them; a box top left "Color: Influence,
0.003299 to 0.07543"; left list "Selection", "Influence 77", "Everything" (selected); right
panel for Everything with a Label line "Above, Abc name" and "77 labels, 7 hidden to avoid
overlap". Top bar: "Les Miserables", undo/redo, a lock and "Local only".

Think-aloud: "All right, that's the work: names on, the Influence thing is there. Now I need to
keep it. Where's File? The three lines top left are probably the menu."

### 2. Open the main menu

Command: `--step ... --click-at 24,20` -> "button Main menu", `02.png`

Saw: New project, Open project or file... (Ctrl+O), Save (Ctrl+S), Export... (Ctrl+E),
Settings..., Keyboard shortcuts, Help.

Think-aloud: "There's Save. Like any program. Good."

### 3. Save

Command: `--step ... --click Save` -> `03.png`

Saw: a dialog "Save Les Miserables as", Name field filled with "Les Miserables", small grey line
"Choose where the file goes next. Later saves write the same file.", Cancel and Save.

Think-aloud: "It wants a name. I'll put my own name on it so I don't mix it up with the sample.
I didn't read the grey line."

### 4. Type a name

Command: `--step ... --click Name --key Control+a --type "Les Mis characters Tom" --click "Save#2"`
-> `04.png`. The tool said "Name" matched the field and its label (took the field), and there is
only one Save button (my "second Save" guess missed, so nothing was clicked yet).

Saw: Name field now "Les Mis characters Tom"; dialog still open.

### 5. Confirm

Command: `--step ... --click Save` -> `05.png`. The tool reported the save picker chose
"Les Mis characters Tom.graphty.json" and a 29,860-byte project file was written.

Saw: the dialog closed; a message at the bottom "Saved as Les Mis characters Tom"; the top bar
title changed to "Les Mis characters Tom". Drawing unchanged.

Think-aloud: "Saved, and the name's up top now. I'll close it for the day."

### 6. Put it away and come back "tomorrow"

Command: `--step ... --reopen` (closes the tab, opens the app in a new tab, same browser) ->
`06.png`

Saw: a start page. Left: "Open project or file...", "New from data...", "Files are read on this
computer and never uploaded." Middle: "Recent projects" with "Les Mis characters Tom, 77 nodes,
Oct 6, 2026, 5:32 PM" and a small note "Recent projects are remembered in this browser; each
project is a file saved where you chose." Right: Samples, including a plain "Les Miserables".

Think-aloud: "There's mine, with my name, under Recent. Not the one on the right -- that's the
plain sample, it won't have my work. And it says files are never uploaded, which I like."

### 7. Reopen

Command: `--step ... --click "Les Mis characters Tom"` -> `07.png`

Saw: "Opened Les Mis characters Tom". Same orange drawing, same layout as yesterday, names on,
the Influence box with the same two numbers. The right panel now shows "Graph, From Les
Miserables" with Nodes 77, Edges 254, and so on. In the left list, "Influence" shows only its
colored bar -- the "77" that was beside it yesterday is not there.

Think-aloud: "Looks like what I left. But yesterday there was a 77 next to Influence and now
there isn't. Did it lose something?"

Hesitation: the missing "77" made me doubt whether the Influence result came back whole.

### 8. Check the names setting

Command: `--step ... --click Everything --click role=tab:Style` -> `08.png`

Saw: identical to yesterday: Label "Above, Abc name", "77 labels, 7 hidden to avoid overlap".

### 9. Check Influence

Command: `--step ... --click Influence` -> `09.png`

Saw: right panel "Influence, from Influence, Oct 6": a small bar chart, "77 of 77 have a value,
0.003299 to 0.07543, median 0.01242", a Top 10 list (Valjean 0.07543, Myriel, Gavroche, Marius,
Javert, ...), and "Made with: Influence, Ran Oct 6".

Think-aloud: "That's the list. Valjean on top, 77 of 77. It's all there."

### 10. End

Command: `--end rounds/round-1/sessions/r1-s47b`

## Afterward, in Tom's words

- **Did you finish?** Yes. I saved it under my own name, closed it, opened it again from the
  Recent list, and the names, the colors and the "who matters most" list all came back.
- **How hard was it (1-7, 7 hardest)?** 2. Menu, Save, type a name, done. Coming back, my file
  was right at the top under Recent projects.
- **What confused me:**
  - Yesterday "Influence" had a 77 next to it in the left list. After I opened it again the 77 was
    gone and only the colored bar was there. I thought something had been lost until I clicked it
    and saw 77 of 77. If I hadn't clicked, I'd have told the PI it was incomplete.
  - When it reopened, the right side showed a different panel ("Graph, From Les Miserables"
    with numbers) instead of what I was looking at. Not wrong, just not where I left it.
  - "Influence" -- I'm told it is which characters matter most. Nothing on the screen said that
    in plain words; I took it on trust.
  - The grey line in the save box about choosing where the file goes -- I didn't read it, and
    I couldn't tell you now where the file actually is on my computer. It found it again, so I
    didn't need to know today.
