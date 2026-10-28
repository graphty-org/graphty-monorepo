# Session r1-s03b -- Nadia, T15 prompt A (Les Miserables)

Participant: Nadia, level-1 transaction monitoring analyst at a mid-size bank, fourteen months in.
She has never used a graph tool and thinks of network charts as something level 2 does. She clicks
whatever is in front of her. Any picture she makes goes into an alert file as a screenshot.

Task (prompt A): open the ready-made Les Miserables network, have the program work out which
characters matter most, make the dots bigger for the characters that matter more, get the names
written on the drawing, and finish with a picture file, with its key, that could be pasted into a
document. Say when each part is done, and what the sizes and the colors stand for.

Tool: `T=design/ui/studio/tool`, `S=design/ui/studio/rounds/round-1/sessions/r1-s03b`, run from
the studio worktree root. Build under study: graphty@0.8.53, commit 4522851420998602a015e60ae2cbf339049a2c97.

Before the first screen, the start waited for a free browser slot because all four were in use.
The wait took several minutes.

## Steps

### 1. Start

`node $T/real.mjs --start $S empty` -> 01.png

Saw: the start screen. On the left, "Open project or file..." and "New from data...". In the
middle, Recent projects (empty). On the right, Samples: Les Miserables (77 characters), Zachary's
karate club, College football, Florentine families. At the bottom, a usage-data banner with
"Share usage data" and "No thanks".

Think-aloud: "Privacy banner first. This is a bank laptop, so I'm not sharing anything. Les
Miserables is right there under Samples."

### 2. Dismiss the banner, open the sample

`node $T/real.mjs --step $S --click "No thanks" --click "Les Miserables"` -> 02.png

Saw: a blue ball-and-stick drawing in the middle. On the left, "Selection" and "Everything". On the
right, an Overview: Nodes 77, Edges 254, Density, Components 1. At the bottom, a toolbar of five
icons. At the bottom of the left panel: "Analyze (Shift+A) to add results here".

Think-aloud: "OK, it's on screen. **Part one done.** Now 'which matter most'. The left panel says
'Analyze (Shift+A)'. The flask in the bottom bar looks like analyze."

### 3. Analyze

`node $T/real.mjs --step $S --click-at 659,864` -> `button "Analyze"`, 03.png

Saw: a list titled "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness, PageRank (marked "Start here"), Eigenvector,
Katz, HITS, All-pairs distance, and more below. Each has a one-line description.

Think-aloud: "A list of rankings. I don't know half these words, but PageRank says 'Start here'.
I'll go with that."

### 4. Pick PageRank

`node $T/real.mjs --step $S --click-at 536,600` -> option "PageRank", 04.png

Saw: a PageRank panel with "Damping factor 0.85", "Under a second" and a Run button.

Think-aloud: "Damping factor, no idea what that is. I'll leave the default and press Run."

### 5. Run

`node $T/real.mjs --step $S --click "Run"` -> 05.png

Saw: every dot turned orange, a few darker. A key appeared at top left: "Color: Influence",
0.003299 to 0.07543. The left panel gained a row "Influence 77".

Think-aloud: "A key appeared. The darker dots, one in the middle and one near the bottom, must be
the ones that matter. **Part two done.** Odd that I picked 'PageRank' and now it's called
'Influence'." (Hesitation: she wasn't sure the orange shades were different enough to tell
anything apart.)

### 6. Open the result

`node $T/real.mjs --step $S --click "Influence"` -> 06.png

Saw: the right panel switched to Influence: a histogram, then a Top 10 list (Valjean 0.07543,
Myriel, Gavroche, Marius, Javert, Thenardier, Fantine, Enjolras, Cosette, MmeThenardier), then
"Made with".

Think-aloud: "A Top 10 list. That's something I'd copy into a file. For sizes, there's a 'Style'
tab next to Values."

### 7. Style tab

`node $T/real.mjs --step $S --click "Style"` -> 07.png

Saw: Nodes / Edges. Fill (Color: Influence), Shape, Effects, Label, Tooltip, each with a plus.

Think-aloud: "No 'Size' anywhere. The size of a dot might be under Shape." (Hesitation: she had
to guess the section.)

### 8. Add to Shape

`node $T/real.mjs --step $S --click-at 1419,226` -> `button "Add to Shape"`, 08.png

Saw: a small menu offering Size and Shape.

### 9. Size

`node $T/real.mjs --step $S --click "Size"` -> 09.png

Saw: a Size row showing "1", a chain-link icon and a minus.

Think-aloud: "Color says 'Influence', so Size needs to say Influence too. What's the chain icon?"

### 10. Hover the chain icon

`node $T/real.mjs --step $S --hover-at 1380,256` -> tooltip "Size by attribute", 10.png

Think-aloud: "'Attribute' isn't my word, but it sounds like 'size by a column'."

### 11. Size by attribute

`node $T/real.mjs --step $S --click-at 1380,256` -> 11.png

Saw: "Find an attribute": Influence, Influence rank, Influence percentile; id and name greyed out
("Cannot be used: Holds groups, not amounts").

### 12. Pick Influence

`node $T/real.mjs --step $S --click-at 1193,324` -> option "Influence", 12.png

Saw: the important dots grew, the middle one (Valjean) much larger. Size now reads "1 to 3". The
key gained "Size: Influence", 0.003299 to 0.07543.

Think-aloud: "Now the big dark ones are big. **Part three done.** Names next: the plus beside
Label."

### 13. Add a label line

`node $T/real.mjs --step $S --click-at 1419,324` -> `button "Add label line"`, 13.png

Saw: an attribute list: id, name, Influence, Influence rank, Influence percentile.

### 14. Pick name

`node $T/real.mjs --step $S --click-at 1117,454` -> option "name", 14.png

Saw: names drawn above the dots, very small. Note under Label: "77 labels, 6 hidden to avoid
overlap". Valjean's name sits on his own big dot and is hard to read. The key box covers part of
the top of the drawing.

Think-aloud: "Names are on. Tiny, and the main character's name is the hardest to read. Good
enough for a first go. **Part four done.** Now the picture. I don't see 'Export'. The three lines
at top left is usually the File menu."

### 15. Main menu

`node $T/real.mjs --step $S --click-at 23,20` -> `button "Main menu"`, 15.png

Saw: New project, Open project or file..., Save, Export... (Ctrl+E), Settings..., Keyboard
shortcuts, Help.

### 16. Export...

`node $T/real.mjs --step $S --click "Export..."` -> 16.png

Saw: an Export dialog: Image / Data. Preset "To share -- PNG, 2x", View "Current view", sizes,
PNG / JPEG / WebP, Background, and a small preview with a box at top left that looks like the key.
Buttons: Cancel, Copy, Export.

Think-aloud: "'To share' is what I want. There's no 'include key' checkbox, but the preview seems
to have it. Export." (Hesitation: the preview is too small to confirm the key is there.)

### 17. Export

`node $T/real.mjs --step $S --click "Export"` -> printed `ambiguous: "Export" matches 2 controls
(button, dialog); took the first`; a file was saved: les-miserables_current-view.png, 1806 x 1720;
17.png

Saw: a toast "Exported les-miserables_current-view.png". In the file: the drawing with the key in
the top-left corner ("Size: Influence" and "Color: Influence", each 0.003299 to 0.07543). Names are
small and blurry, and Valjean's name is hidden under his own dot.

### 18. End

`node $T/real.mjs --end $S` -> session ended.

## In character, at the end

**Did I finish?** Yes. All five parts: on screen, ranked, sized, named, picture with key.

**What the sizes and colors stand for:** both show "Influence", the score from the PageRank
ranking. Bigger and darker means more influence. Valjean is the biggest, then Myriel.

**How hard (1-7, 7 hardest):** 3. Each step was findable, but I guessed twice.

**What confused me:**

- I chose "PageRank" and the result is called "Influence". I wasn't sure it was the same thing
  until the key said so.
- Size isn't its own section in Style. I had to guess it was under "Shape".
- "Size by attribute" uses a word I wouldn't use; I only clicked it because of the tooltip.
- The orange shades before sizing barely differ, so color alone didn't tell me much.
- Labels are tiny in the app and blurry in the picture. The most important character's name is
  covered by his own big dot, so the picture's main point is hard to read.
- The key shows raw numbers (0.003 to 0.075) with no words saying what "Influence" means. A QA
  reviewer reading my file wouldn't know either.
- The export preview was too small to check the key was there before saving.
