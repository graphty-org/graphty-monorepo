# Session r1-s23: Sam (keyboard-only analyst), Florentine families

Task prompt (read to the participant): "You have never used this program before. You will practice
on the ready-made network of the leading families of Renaissance Florence and the marriages
between them, which comes with the program, not on your own data. Go to the Medici family, read
what the program knows about them, and see which families they married into. Tell us who they
are and how many."

Start: empty. Participant rule: keyboard only (`--key` and `--type`), no pointer of any kind.

Every command below was run from `design/ui/studio` as
`node tool/real.mjs --step rounds/round-1/sessions/r1-s23 <step>`.

## Part 1: open the Florentine families sample

**01.png** (`--start ... empty`). Start page: Start (Open project or file, New from data), Recent
projects (empty), Samples (Les Miserables, Zachary's karate club, College football, Florentine
families), and a usage-data card at the bottom.

> Sam: "Nothing has focus yet. Tab once to find where it starts."

**02.png** `--key Tab`. Focus ring on "Local only" at the top right, with a tooltip ("Nothing is
sent. Opens Settings > Privacy").

> "Clear ring. The sample I want is in the right-hand column; keep tabbing."

**03.png** `--key Tab --key Tab`. Focus on "Open project or file..." (ring visible).

**04.png** `--key Tab --key Tab --key Tab`. No focus ring anywhere on screen.

> "Six presses, and I've lost it. Not on New from data, not on any sample card."

**05.png** `--key Tab`. Still no ring.

> "Seven. Shift+Tab to find it again."

**06.png** `--key Shift+Tab`, **07.png** `--key Shift+Tab`. Still no ring on either.

**08.png** `--key Shift+Tab`. Ring back on "New from data...".

> "So the stops right after New from data have no visible ring. At least two invisible stops."
> (Hesitation: three presses spent only finding focus.)

**09.png** `--key Tab` x4. Still no ring anywhere.

> "Four more and nothing visible. On a start page Enter can only open something, so I'll press
> it to find out what has focus."

**10.png** `--key Enter`. The Florentine families graph opened: 15 nodes, 20 edges in the right
panel's Overview; no names drawn on the dots.

> "So focus had been on the Florentine families card all along; the sample cards show no focus
> ring. I got there by luck, not by sight."

Part 1 count: 15 key presses (7 Tab, 3 Shift+Tab, 4 Tab, 1 Enter), about 10 of them blind.

## Part 2: get to the Medici

> "No names on the dots and I can't click one anyway. There's a 'Find nodes, edges, values' box
> at the top left. I can't see where focus is now. Tab."

**11.png** `--key Tab`. Focus on the "Legend" button in the bottom toolbar (tooltip "Legend L").
The tool reported the drawing was still moving.

> "Focus started down in the toolbar, past the find box."

**12.png** `--key Tab`. Focus jumped to the "From Florentine families" link in the right panel,
skipping the last toolbar button.

> "The find box is behind me. Try Ctrl+F before a long Shift+Tab walk."

**13.png** `--key Control+f`. Nothing visible changed.

> "Ctrl+F did nothing. The last toolbar icon looks like a command key; try Ctrl+K."

**14.png** `--key Control+k`. A command palette opened with its search focused: Go to (Graph,
Data), Graph tree (Find `/`, Add label line), Analyze (Shift+A), Data (New from data...).

> "Good, a palette. It tells me Find is '/'. I'll try typing the name here first."

**15.png** `--type "Medici"`. "No results".

> "The palette only finds commands, not nodes."

**16.png** `--key Escape`. Palette closed; focus on the command button in the toolbar, not back
on the link I left.

**17.png** `--key /`. Focus in the "Find nodes, edges, values" box, ring visible.

**18.png** `--type "Medici"`. Results: Elements > "Medici"; Values > "Select where name is
Medici (1)".

**19.png** `--key ArrowDown`. "Medici" row highlighted.

**20.png** `--key Enter`. Medici selected and centered (yellow halo). Right panel: Node "Medici",
Summary: id Medici, name Medici, Degree 6. A focus ring around the Summary block. A new round
button appeared above the toolbar.

> "Degree 6, so six marriage ties. Now I need the names."

Part 2 count: 10 actions (2 Tab, Ctrl+F, Ctrl+K, typing, Escape, `/`, typing, ArrowDown, Enter),
3 of them dead ends.

## Part 3: who they married into

**21.png** `--key Tab`. Focus on the Degree row (ring visible).

> "The rows take focus. Maybe Enter on Degree lists them."

**22.png** `--key Enter`. Right panel became "Medici -- Neighborhood", headed "Medici's 6
connections": Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni. On the drawing,
Medici and the six are highlighted; left panel shows Selection 7.

> "That's the answer. Two presses for this part."

`--end` closed the session.

## Answer given

Medici married into **6** families: Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati and
Tornabuoni.

## In character, at the end

- **Finished?** Yes, entirely by keyboard.
- **Difficulty:** 4 of 7. The second half was quick once I found '/' and the Degree row. The first
  part was the problem: I opened the sample without seeing where I was.
- **Total:** about 27 key actions; about a third were spent finding focus or on dead ends.
- **What confused me:**
  1. The sample cards on the start page (and the stops just after "New from data") show no focus
     ring. I pressed Tab and Shift+Tab ten times without seeing focus and opened the sample by
     pressing Enter blind.
  2. After the graph opened, focus started in the bottom toolbar, past the find box, and the next
     Tab jumped to the right panel, so the find box was behind me.
  3. Nothing on screen says how to get to Find from the keyboard until you open the Ctrl+K
     palette, and Ctrl+K itself is not shown anywhere I saw. Ctrl+F did nothing.
  4. The palette search does not find nodes; typing a name there gives "No results" with no
     pointer to Find.
  5. After closing the palette, focus went to the toolbar's command button, not back where I
     was.
  6. Pressing Enter on the Degree row is what lists the connections. It worked, but I found it by
     guessing; nothing told me the row could be opened.
- **What worked well:** '/' to Find with a clear ring, ArrowDown and Enter in the results, and
  the neighbor list with names and a count in one place.
