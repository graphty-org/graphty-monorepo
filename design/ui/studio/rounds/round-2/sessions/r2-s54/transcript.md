# Session r2-s54 -- Nadia (level-1 alert reviewer), task T2 "Something to try it on"

Dataset: a ready-made sample of my choice. Start: empty.

## Step 1 -- start

Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s54 empty` -> 01.png

Saw: a dark start page. Left: "Open project or file...", "New from data...". Middle: "Recent projects"
(empty). Right: "Samples" -- Les Miserables, Zachary's karate club, College football, Florentine
families, each with a one-line description. Bottom: a box "Your data is yours, but please help us"
with "Share usage data" / "No thanks". Top right says "Local only" with a lock.

Thinking (Nadia): bank laptop, I'm not sending anything to anyone. "No thanks" first, then pick a
sample. Florentine families is small (15) and "who brokers between groups" sounds closest to
counterparties -- I'll try that.

## Step 2 -- decline usage data

Command: `--step --click "No thanks"` -> 02.png

Saw: the box went away and a small line at the bottom now says "Usage data stays off. Change this
in Settings > Privacy" (the last part is a link). Good -- that's where I'd go to change it later.
Noted it; I'll check it at the end. Next: click "Florentine families".

## Step 3 -- open the Florentine families sample

Command: `--step --click "Florentine families"` -> 03.png

Saw: the graph opened straight away. Title bar "Florentine families". Blue dots joined by gray
lines on a light canvas, no names on the dots. Right panel "Graph -- From Florentine families":
Nodes 15, Edges 20, "Undirected, from the file: directed 0", Density 0.1905, Components 1, "Edges
per n..." (cut off) 1 to 6, mean 2.667. Left: a search box "Find nodes, edges, values",
"Selection", "Everything". Bottom toolbar with a flask, a chart icon, "3D", a magnifier.

Hesitated: no names on the dots -- in my job a dot with no account number is useless. "Density"
means nothing to me. Next: click the biggest-looking hub in the middle (700,378) to see who it is.

## Step 4 -- click the middle dot

Command: `--step --click-at 700,378` -> 04.png (tool: node "Medici")

Saw: the dot got a yellow ring. Right panel now "Medici -- Node": id Medici, name Medici, Degree 6
with an arrow. Left "Selection 1". So it's marriages between Florence families, and Medici is tied
to 6 others. Fine -- that's enough to say what's on screen.

PART 1 DONE: I have something on screen -- the "Florentine families" sample, 15 families and 20
marriage ties between them; Medici is the most connected (6).

Next, the last question: how I'd change my "No thanks" later. The start page said Settings >
Privacy, but the start page is gone. I'll open the menu (three lines, top left).

## Step 5 -- open the main menu

Command: `--step --click-at 23,20` -> 05.png (tool: button "Main menu")

Saw: a menu -- Back to start, New project, Open project or file..., Open sample, Save, Save as...,
Save local copy..., Export..., Rename, Settings... (Ctrl+,), Keyboard shortcuts, Help. "Settings..."
is there, matching what the start page said. Next: click Settings....

## Step 6 -- Settings

Command: `--step --click "Settings..."` -> 06.png

Saw: a Settings dialog opened on "General" (Theme, Number format). Left list: General, Privacy,
Accessibility and input. Next: click "Privacy" to confirm that's where usage data is.

## Step 7 -- Privacy

Command: `--step --click "Privacy"` -> 07.png

Saw: Privacy page with a switch "Share usage data", off. Same "Your data is yours..." text as the
start page, a "What is collected" link, and "Where your data goes": files read on this computer,
never uploaded; project saved where you save it; "Usage data: off. Nothing is sent."

PART 2 DONE: to change my answer later I open the menu (top left) > Settings... (or Ctrl+,) >
Privacy and flip "Share usage data". I didn't touch the switch -- I'm keeping it off.

Stopping here; nothing left to do.

Command: `--end`

## In character, at the end (Nadia)

- **Did I finish?** Yes. I put the "Florentine families" sample on screen -- 15 Renaissance
  Florence families as dots, 20 marriage ties as lines; Medici is the hub with 6 ties. And the
  usage-data answer is changed at menu > Settings... > Privacy, "Share usage data" switch (the
  start page even told me "Change this in Settings > Privacy" right after I said no).
- **How easy:** 6 out of 7. Seven clicks, about a minute. Samples were right there on the first
  screen with one-line descriptions, so I didn't have to hunt.
- **Where I hesitated / what confused me:**
    - The dots have no names. I had to click one to learn it was Medici. For my work a picture
      without account numbers on it can't go in an alert file -- I'd need labels on by default or
      an obvious way to switch them on.
    - The overview numbers ("Density 0.1905", "Undirected, from the file: directed 0", "Edges per
      n..." cut off) mean nothing to me. "directed 0" reads like a glitch.
    - "Degree 6" -- I guessed it means 6 ties. Would rather it said so.
    - None of the samples looks like money moving between accounts; Florentine marriages was the
      closest to "who sits between groups". Can't yet tell if it would save me minutes per alert.
