# Session: picture of the drawing for Friday's slides -- Jordan, marketing network analyst

Task as given: "You need a picture of the drawing as it looks right now, sharp
enough to paste into Friday's slides. The data on screen is a sample:
characters of the novel Les Miserables, linked when they appear in the same
chapter. If that is not your line of work, treat them as your own people or
things."

Every command was run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t16--marketing-analyst/.

## Start screen (shots/tasks/t16/01.png)

The map is colored orange to brown by PageRank and sized by degree, and a
legend card sits in the top-left corner of the canvas. The top bar has a
hamburger icon, "Les Miserables" with a little arrow, undo and redo, "Local
only" and "Full graph".

Jordan: "Okay, a picture for the deck. I'm looking for Export, Share or a
camera icon. None of those is in the top bar. The legend is on screen, good, I
want that in the picture. Let me just try the word Export."

## Step 1 -- look for the word "Export"

```
timeout 120 node app-b/study.mjs --try .../01.png task:t16 --click "Export"
-> nothing on screen is called "Export"
```

Jordan: "Nope, nothing's called Export. Fine, the hamburger, then."

## Step 2 -- hover the hamburger

```
timeout 120 node app-b/study.mjs --try .../02.png task:t16 --hover "Menu"
```

Render 02: a tooltip says "Main menu".

## Step 3 -- open the main menu

```
timeout 120 node app-b/study.mjs --try .../03.png task:t16 --click "Main menu"
```

Render 03: New project, Open..., Open recent, Select where..., Select edges
between, Show hidden elements, Settings..., Keyboard shortcuts, Help.

Jordan: "New, Open, Settings, Help... no Export, no Save as. Every tool I've
used, Excel, Gephi, PowerPoint, keeps Export in the main menu. This is where
I'd normally give up and take a screenshot. Hmm, the project name has a
little arrow on it. One more try."

(I also noticed that opening this menu switched the right-hand panel from
PageRank to the graph summary. It didn't matter for this task, but it was
odd.)

## Step 4 -- the project-name dropdown

```
timeout 120 node app-b/study.mjs --try .../04.png task:t16 --click "Les Miserables"
```

Render 04: Rename, Save, Save as..., Export... (Ctrl+E), Apply recipe or style
file..., Version history, Close project.

Jordan: "There it is, Export, under the file name. Like Google Docs, I guess.
I wouldn't have looked here first. Ctrl+E is handy, though, I'll remember
that."

## Step 5 -- Export...

```
timeout 120 node app-b/study.mjs --try .../05.png task:t16 --click "Les Miserables" --click "Export..."
```

Render 05: an Export dialog. Down the left are Image, Video, Report (grayed
out), Recipe, Data and Recent exports. Image is selected and shows ".png",
"Full graph - legend not drawn", Preset "To share -- PNG, 2x", Size "2x --
1,802 x 1,638", Format PNG, View "Current camera", Background "Canvas color",
Advanced "Standard rendering", and a preview. The footer says "Saved to this
computer only; nothing is uploaded." and has Cancel, Copy and Export buttons.

Jordan: "Okay, this is actually decent. 'Current camera' means as it looks
now, which is what I want. 1,800 pixels is plenty for a slide. And 'nothing is
uploaded', I like seeing that written down; that's a sentence I can forward to
legal. But 'legend not drawn'? The legend is right there on my screen. If I
paste this without it, the VP asks what orange means and it's the purple
question all over again. Also, it's taller than it is wide, and my slides are
16:9, so I'll have empty space on the sides. Fine, I can live with that."

## Step 6 -- look at the presets for a "slides" or "with legend" option

```
timeout 120 node app-b/study.mjs --try .../06.png task:t16 --click "Les Miserables" --click "Export..." --click "To share -- PNG, 2x"
```

Render 06: For print -- PNG, 4x, sharper; To share -- PNG, 2x (checked);
Thumbnail -- JPEG, 400 x 300; For documentation -- PNG, 2x, transparent.

Jordan: "No 'Slides', no 'with legend'. 'To share' is close enough. If the
legend is anywhere it's under that Advanced thing, and I don't open Advanced
the day before a deck is due. I'll paste it in and stick the key on by hand in
PowerPoint, like always. Copy is quicker than saving a file and digging it out
of Downloads."

## Step 7 -- Copy

```
timeout 120 node app-b/study.mjs --try .../07.png task:t16 --click "Les Miserables" --click "Export..." --click "Copy"
```

Render 07: the dialog closes, and a toast reads "Copied a 1,802 x 1,638 image
of les-miserables to the clipboard".

Jordan: "Good, it tells me the size and that it's on the clipboard. Cmd+V into
the slide, done."

## Wrap-up

**Did I succeed?** Mostly. I have a sharp picture of the map as it looks right
now, on my clipboard. What I don't have is the color and size key, which was
on my screen and isn't in the picture, so for a VP-facing slide I'll still
rebuild it by hand in PowerPoint. I'd call it "done, with the usual chore".

**Single Ease Question: 4 / 7.** Once I found the dialog it was easy, maybe a 6.
Finding it was not: Export isn't in the main menu, the hamburger shows no
hint of it, and nothing on the canvas offers "copy picture". I found it on
the third try, by luck. And I had to guess that the legend option, if there is
one, is behind "Advanced".

**Would I use this instead of what I use now?** For this one job, a clean
image of the map, it's better than Gephi: one dialog, a sensible 2x default,
copy to clipboard, and a plain statement that nothing is uploaded. But my
current routine is a screenshot plus pasting the legend in by hand, and this
gets me exactly the same result minus the legend. It would beat my screenshot
only if the picture carried the legend it was showing me. "Legend not drawn"
as the default, in a dialog whose preset is called "To share", is backward:
when I share, the legend is the part people need. (And while I'm on it, my VP
only reads the first slide anyway, so that picture has to explain itself.)

## Problems seen

- Export is not in the main (hamburger) menu, where I looked first; it lives
  only under the project-name dropdown. Two wrong guesses before finding it.
- The image export says "legend not drawn" by default, even though the legend
  is on screen and the preset is called "To share". The only plausible place
  to turn it on is "Advanced", which I wouldn't open.
- No preset is named for slides or presentations; the default image is
  portrait (1,802 x 1,638), not 16:9.
- Opening the main menu also switched the right-hand panel from the selected
  PageRank layer to the graph summary.

## What worked

- "Current camera" said plainly that I would get what I see.
- The Copy button plus a toast with the pixel size: no file to dig out of
  Downloads.
- "Saved to this computer only; nothing is uploaded." in the dialog footer.
- Ctrl+E shown next to Export in the menu.
