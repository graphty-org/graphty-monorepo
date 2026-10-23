# Session transcript: names on every dot, Les Miserables

Participant: Dev, a third-year history student with a class network assignment. He has followed
one Gephi tutorial (layout, statistics, ranking, labels, export) and has never seen this app.

Task: "You have never used this program before. You will practice on the ready-made network of
characters from the novel Les Miserables that comes with the program, not on your own data. Right
now no names are written on the drawing. Get every character's name written next to its dot."

Start: empty app. All commands below are run from the studio worktree as
`node design/ui/studio/tool/real.mjs <command> design/ui/studio/rounds/round-1/sessions/r1-s12b ...`.

Note for whoever runs the study: the start waited about 17 minutes for a free browser slot
before 01.png was taken. Nothing in the session itself was slow.

## Steps

### 1. `--start ... empty` -> 01.png

Saw: a dark start page. "Start" with "Open project or file..." and "New from data...", "Recent
projects" (empty), and "Samples": Les Miserables (77 characters), Zachary's karate club, College
football, Florentine families. At the bottom, a box: "Your data is yours, but please help us",
with "Share usage data" and "No thanks".

Think-aloud: "OK, I read everything. There's the sample I'm supposed to use, Les Miserables, first
in the list. First I'll get rid of the data question."

### 2. `--step --click "No thanks"` -> 02.png

The box went away. No hesitation.

### 3. `--step --click "Les Miserables"` -> 03.png

Saw: the network drawn as blue balls with gray lines, no names anywhere. Left: "Graph Les
Miserables", a search box, "Selection", "Everything". Right: "Graph / From Les Miserables" with tabs
"Style" and "Values" (Values open: 77 nodes, 254 edges, density, components). A small toolbar at the
bottom with icons only.

Think-aloud: "Dots, no names. In the tutorial, labels were a button at the bottom of the graph
window. Here the bottom toolbar is just icons and I don't know what any of them are. On the right
there's 'Style' -- names on dots feel like a style thing."

### 4. `--step --click "Style"` -> 04.png

Saw: Style for the graph only has "Canvas: Background F5F5F5", "Method: Force - Recommended" and
"Seed: 1". Nothing about nodes or labels.

Think-aloud: "Hmm. Background and layout. No 'labels' here. Maybe I have to pick the dots first?
'Everything' on the left sounds like all the dots." (First hesitation: I expected labels on this
Style tab and they were not there.)

### 5. `--step --click "Everything"` -> 05.png

Saw: the right panel changed to "Everything" with Style / Values, and a Nodes / Edges switch. Under
Nodes: Fill (color), Shape (size, Icosphere), Effects, **Label** with a plus, Tooltip.

Think-aloud: "There -- 'Label'. That's the tutorial word. Plus means add one."

### 6. `--step --click-at 1419,342` (the plus next to Label) -> 06.png

Tool said: button "Add label line". Saw: a dropdown "Find an attribute" listing "id" and "name";
the row says "Pick an attribute".

Think-aloud: "It wants to know what to write. 'name' is obviously the character's name. 'id' could
be a number."

### 7. `--step --click "name"` -> 07.png

Saw: names appeared next to the dots: Blacheville, Fameuil, Favourite, Zephine, Dahlia, Myriel,
Napoleon, Old Man, Mlle Baptistine and so on. The label row now reads "Aa Above Abc name" and,
in tiny gray text under it, "77 labels, 7 hidden to avoid overlap". The names are very small and
in the crowded middle they pile on each other and are hard to read.

Think-aloud: "Yes! Names. But wait -- that gray line says 7 are hidden. The task says EVERY
character. I want to see the missing ones."

### 8. `--step --click-at 1220,372` (the "Aa" button) -> 08.png

Tool said: button "Label position". Saw: a little 3x3 grid of dots, the top middle one highlighted.

Think-aloud: "This is just where the name sits relative to the dot. Not what I want." (First wrong
try at showing the hidden names.)

### 9. `--step --key Escape --hover-at 1286,397` -> 09.png, then `--step --click-at 1286,397` -> 10.png

Tool said: group "Label", tooltip: null. Clicking the "7 hidden" line did nothing.

Think-aloud: "I figured clicking the '7 hidden' text would let me show them. It's not a button.
No tooltip either." (Second wrong try.)

### 10. `--step --wheel 720,400,-500` -> 11.png

Saw: nothing changed. The drawing did not zoom.

Think-aloud: "'To avoid overlap' -- so if I zoom in they won't overlap and maybe they'd show up.
But scrolling didn't zoom at all. I don't know how to zoom here." (Third dead end.)

### 11. `--end`

Think-aloud: "Almost all the dots have names now, and it says 77 labels, which is all the
characters. For my figure that's good enough. I give up on the last 7."

## Debrief, in character

- **Did I finish?** Mostly. Every character got a label (the panel says 77 labels), but 7 of them
  are not drawn and I could not find a way to make them show. If my instructor counted, I didn't
  get "every" name on the picture.
- **How hard (1-7, 7 = very hard):** 3. Getting names on was quick once I found it; the last bit
  (the hidden ones) I could not do at all.
- **What confused me:**
    - The Style tab I opened first (for the graph) had no labels at all. I only found "Label" after
      clicking "Everything" on the left, which I guessed. Nothing told me that node settings live
      under "Everything".
    - "77 labels, 7 hidden to avoid overlap" is tiny gray text that tells me something is missing
      but gives me no way to fix it -- not clickable, no tooltip, no "show all" option.
    - "Aa Above" looked like it would be the label settings (size, show all) but only picks a
      position.
    - The names are very small; in the crowded center I can't read them.
    - Scrolling the mouse wheel over the drawing did not zoom, so I couldn't even zoom in to see the
      crowded names.
    - The bottom toolbar is icons only; I never knew what any of them did, so I didn't try them.
