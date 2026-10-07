# Session r1-s10 -- Elena (first-time graph user), names on every dot, Les Miserables

Task: "You have never used this program before. You will practice on the ready-made network of
characters from the novel Les Miserables that comes with the program, not on your own data. Right
now no names are written on the drawing. Get every character's name written next to its dot."

Participant: Explorer Elena, a product manager with no graph training, trackpad user, allergic to
jargon. Build under study: graphty@0.8.53 (commit 9d6598eea3e9).

All commands were run from `design/ui/studio` with `T=tool/real.mjs` and
`S=rounds/round-1/sessions/r1-s10`.

## Steps

### 1. Start -- `node $T --start $S empty` -> 01.png

Saw: a start page. "Open project or file...", "New from data...", "Recent projects" (empty), and on
the right "Samples": Les Miserables (77 characters), Zachary's karate club, College football,
Florentine families. A "Your data is yours, but please help us" box at the bottom with "Share usage
data" and "No thanks".

Thinking: "The thing I need is right there under Samples. First get rid of the data box."

### 2. `--click "No thanks"` -> 02.png

The box went away.

### 3. `--click "Les Miserables"` -> 03.png

Saw: a drawing of blue balls joined by thin grey lines on a light background. No names anywhere.
Left panel: "Graph Les Miserables", a search box, "Selection", "Everything". Right panel headed
"Graph", tabs "Style" and "Values" (Values open: Nodes 77, Edges 254, Density, Components...).
A floating toolbar of five icons at the bottom with no words on them.

Thinking: "Dots, no names. Names on the dots is a look thing, so 'Style'."

### 4. `--click "Style"` -> 04.png

Saw: "Canvas -- Background F5F5F5", "Method: Force - Recommended", "Seed 1". Nothing about the dots.

Thinking: "This is about the whole picture, not the dots. 'Method' and 'Seed' mean nothing to me.
On the left there's 'Everything' -- maybe that means all the dots."
Hesitation: here. The first place I looked had no dot settings at all.

### 5. `--click "Everything"` -> 05.png

Saw: the right panel now says "Everything", with Style / Values, a Nodes / Edges switch, and rows
Fill (Color), Shape (Size, Shape: Icosphere), Effects, **Label** with a plus, Tooltip with a plus.

Thinking: "A label is a name. Plus next to Label."

### 6. `--click-at 1419,356` (button "Add label line") -> 06.png

Saw: a list headed "Pick an attribute" with "id" and "name".

Thinking: "I want the character's name. 'name'."

### 7. `--click-at 1117,486` (option "name") -> 07.png

Saw: small names appeared above most dots (Blacheville, Fameuil, Myriel, Napoleon, Old Man...).
The Label row now reads "Aa Above   Abc name", and under it in small grey text: "77 labels, 7
hidden to avoid overlap". The names are very small; in the crowded middle many are unreadable.

Thinking: "There they are! But it says seven are hidden, and the task says every name. Maybe if I
zoom into the crowded middle they come back."

### 8. `--wheel 720,420,-400` -> 08.png

Saw: no change at all. The drawing did not zoom.

Thinking: "Scrolling does nothing? Odd."

### 9. `--click-at 1220,386` (button "Label position") -> 09.png

Saw: a small 3x3 grid of dots -- where the name sits relative to the dot.

Thinking: "Only position. Not 'show all'."

### 10. `--key Escape --click-at 1349,386` (button "Label, Above: name") -> 10.png

Saw: the same attribute list again, "In use: name", "Attributes: id".

Thinking: "Same list. No setting for hidden ones."

### 11. `--key Escape --hover-at 1290,411` -> 11.png

Tool: `group "Label"`, `tooltip: null`.

Thinking: "No explanation on the '7 hidden' line. Nothing tells me how to show them."

### 12. `--wheel 720,420,-1500` -> 12.png

Saw: still no zoom. Same picture.

Thinking: "I can't zoom, and I can't find a 'show them all' switch. I'll stop."

### 13. `--end $S`

Session ended.

## Where I hesitated

- Step 4: the Style tab with the whole graph chosen shows only background and layout ("Method",
  "Seed") -- nothing for dots. I only found the label control because "Everything" on the left
  happened to look like "all the dots".
- Step 7 onward: the note "77 labels, 7 hidden to avoid overlap" told me the task was not done, but
  gave me no way to finish it. It is plain grey text, not a control, and hovering it says nothing.
- Steps 8 and 12: scrolling over the drawing did not zoom, so I could not check whether the hidden
  names come back up close.

## In character, at the end

- **Did I finish?** Mostly, not fully. 70 of the 77 names are on the drawing; the program itself
  says 7 are hidden, and I found no way to show them.
- **How hard (1 = easy, 7 = very hard):** 4. Adding names took one good guess ("Everything") and
  two clicks. Getting *every* name was where I got stuck.
- **What confused me:**
  - The first Style tab (for "Graph") had nothing about dots; the dot settings live under
    "Everything", which I would not have connected to "style the dots" if I hadn't guessed.
  - "id" vs "name" in the list -- I picked "name" because it was the word I wanted, but I didn't
    know what "id" was.
  - "7 hidden to avoid overlap" -- which seven? Can I turn that off? It reads like a decision the
    program made for me with no way to undo it.
  - The names are tiny and the middle is a smudge of text; at a meeting nobody could read them.
  - Scrolling on the picture did nothing, so I couldn't get closer to read or to reveal hidden ones.
  - The bottom toolbar icons have no words, so I didn't try them.
