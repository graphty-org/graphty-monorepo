# Session r3-s54 -- Dev (history student with a class project), task T2

Persona: Dev, third-year history student, first time with a graph tool, follows a Gephi-style
tutorial order, tries a sample first, reads every word on a first screen.

## Step 1 -- start

Command: `node tool/real.mjs --start rounds/round-3/sessions/r3-s54 empty` -> 01.png

What I see: a dark start page. Left: "Start" with "Open project or file..." (Ctrl+O), "New from
data...", "or drop a file anywhere in this window", "Files are read on this computer and never
uploaded." Middle: "Recent projects" (empty, "kept in this browser"). Right: "Samples": Les
Miserables (77 characters), Zachary's karate club (34 members), College football (115 teams),
Florentine families (15 families), each with a one-line description. Bottom: a box "Your data is
yours, but please help us." with "What is collected", "Nothing is collected until you answer",
and buttons "Share usage data" / "No thanks".

Thinking: Samples, great -- exactly what I wanted. But first that box at the bottom wants an
answer. I'll peek at "What is collected" before deciding.

## Step 2 -- open "What is collected"

Command: `--step --click "What is collected"` -> 02.png

What I see: the list opened: a replay of each session with names, values, labels and file content
masked; anonymous task events with timings; errors and performance; a feedback widget. "No file
contents ever leave your computer." Then the two buttons.

Thinking: a "replay of each session" sounds like someone watching my screen, even masked. It's
a class assignment, I'd rather not. Nothing in the box says where I could change this later --
I note that, since I'll need it. Clicking "No thanks".

## Step 3 -- "No thanks"

Command: `--step --click "No thanks"` -> 03.png

What I see: the box is gone; at the bottom a small line: "Usage data stays off. Change this in
Settings > Privacy" (the second part is a link). Good -- that answers the last question for me,
I'll check it at the end.

Thinking: now a sample. I'm a history student and my assignment is literally families and their
ties -- "Florentine families: marriages between the leading families of Renaissance Florence.
Good for finding who brokers between groups." That's the one closest to my homework.

## Step 4 -- open the Florentine families sample

Command: `--step --click "Florentine families"` -> 04.png

What I see: a drawing on a light canvas: 15 blue balls joined by gray lines, title "Florentine
families" in the top bar. Right panel "Graph -- From Florentine families": Nodes 15, Edges 20,
"Undirected, from the file: directed 0", Density 0.1905, Components 1, "Edges per n..." 1 to 6,
mean 2.667. Left: a find box, "Selection", "Everything", and at the bottom "Analyze (flask icon)
in the toolbar (Shift+A) to add results here". A toolbar at the bottom of the canvas: flask,
a chart icon, "3D", a magnifier.

Thinking: it worked fast. But the dots have no names, so I can't tell which family is which --
in my tutorial the picture had labels. The line "Undirected, from the file: directed 0" puzzles
me a bit (directed zero what?). I'll hover the busiest-looking ball in the middle to see whose it is.

## Step 5 -- hover the central ball

Command: `--step --hover-at 701,378` -> 05.png (tool: node id "Medici"; tooltip: null)

What I see: nothing changed on screen. No tooltip, no name popped up.

Thinking: hmm, hovering tells me nothing. I'll click it instead -- maybe the right panel shows
who it is.

## Step 6 -- click the central ball

Command: `--step --click-at 701,378` -> 06.png (node "Medici")

What I see: the ball got a yellow ring; the right panel now says "Medici -- Node", Summary: id
Medici, name Medici, Degree 6. Left panel "Selection 1".

Thinking: OK, that's the Medici family with 6 ties -- the most connected, which matches what my
instructor said about the Medici. So I have something on screen and I know what it is. Last
thing: the bottom line said "Settings > Privacy" for the usage-data choice, but it's gone from the
screen now. There's a three-line menu icon at top left; Settings is probably in there.

## Step 7 -- open the main menu

Command: `--step --click-at 24,20` -> 07.png (button "Main menu")

What I see: a menu: Back to start, New project, Open project or file..., Open sample, Save, Save
as..., Save local copy..., Export..., Rename, Settings... (Ctrl+,), Keyboard shortcuts, Help.

Thinking: there's "Settings...". Clicking it to find Privacy.

## Step 8 -- Settings

Command: `--step --click "Settings..."` -> 08.png

What I see: a Settings dialog, sections General (selected), Privacy, Accessibility and input.
General shows Theme and Number format.

Thinking: "Privacy" is right there, as the bottom line promised. Clicking it.

## Step 9 -- Privacy

Command: `--step --click "Privacy"` -> 09.png

What I see: Privacy: a switch "Share usage data" (off), the same explanation as the first box,
"What is collected", and "Where your data goes": files read on this computer, never uploaded;
project saved where you save it; "Usage data: off. Nothing is sent."

Thinking: that's the answer -- I'd come back here (menu > Settings... > Privacy, or Ctrl+,) and
flip the switch. I'm not changing it now. Closing with Done.

## Step 10 -- Done

Command: `--step --click "Done"` -> 10.png

What I see: back to the drawing, Medici still selected.

Command: `node tool/real.mjs --end rounds/round-3/sessions/r3-s54`

## In character, at the end

**Did I finish?** Yes.

- What I put on screen: the "Florentine families" sample -- marriages between 15 leading families
  of Renaissance Florence, 20 marriage ties, all in one connected piece. Clicking the middle dot
  showed it is the Medici, with 6 ties, the most of any family.
- How I'd change my usage-data answer later: open the three-line menu (top left) > Settings...
  (or Ctrl+,) > Privacy, and flip the "Share usage data" switch. The app told me this right after
  I said "No thanks" ("Usage data stays off. Change this in Settings > Privacy").

**How easy:** 6 out of 7. Samples were right on the first screen with plain descriptions, one
click drew the graph, and the privacy path was spelled out for me.

**What confused me or slowed me down:**

- The dots have no names. My tutorial's picture had labels, and here I had to click a dot to
  learn whose it was. Hovering a dot showed nothing at all, which is where I first expected a name.
- "Undirected, from the file: directed 0" in the overview -- I don't know what "directed 0" means.
  Zero what? It reads like a typo.
- "Edges per n..." is cut off, so I couldn't read the whole label.
- The note "Change this in Settings > Privacy" disappeared as soon as I opened a sample; if I had
  not read it right then, I'd have had to hunt through the menu (it was easy to find anyway).
- Small point: the first box's "What is collected" mentions "a replay of each session", which put
  me off sharing; I'd have liked one sentence saying what a replay shows.
