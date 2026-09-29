# Session: a figure a reviewer can read in gray -- the recipe recipient (Tom)

Participant: Tom, lab manager, 52, reads shared files and never builds them (persona:
`study/personas/recipe-recipient.md`). Played in character; he reports, he does not design.

Moderator's task, as given: "Make the picture show which genes changed most, so a reviewer can
read it, even printed in grey."

Screens, in the order he met them: the styles list (the app at rest), the color-by-a-value
editor, the Look menu, and the Export dialog. What he saw is in these renders:

- `shots/tasks/figure-for-reviewer/01-styles-list.png` -- the app, colored by betweenness
- `shots/tom-r3-looks.png` -- the Look menu open (Default, Colorblind safe, Print, High contrast)
- `shots/tom-r3-cbv-numbers.png` -- a style colored by log2FoldChange, red to blue
- `shots/tasks/figure-for-reviewer/03-export-dialog-figure.png` -- Export, opened on a module figure
- `shots/tom-r3-figure-signed.png` -- Export with fold change in the Print look
- `shots/tom-r3-figure-print.png` -- Export with modules in the Print look

## Transcript

**Minute 0. The first screen (styles list).**

"OK. 'Stress response study', 'ppi-core-300', 300 nodes. It's all orange and brown. Is that the
fold change? ... The little box at the bottom says 'Color: betweenness'. I don't know what
betweenness is, and I'm not learning it at 4 pm. So no, this isn't showing what changed.

"On the right there's 'log2FoldChange, -2.52 to 3.15'. Good, so the numbers are in here. That's
the column I want. How do I get the colors to be that instead?"

He looks at the right-hand panel first, because that is where the word he wants is. He moves the
pointer over "log2FoldChange" on the right. Nothing on the mock says it can be clicked.

"I'd click on that. ... Nothing. It's just a label."

**Minute 1. Looking for where the colors are set.**

"The biggest button is 'Export files...'. That's for later. Left side: Graphs, Sets and paths,
Styles. Styles, I suppose that's colors. There's 'Betweenness color' at the top of the list, with
a lock on it that says 'written by the run'. I'm not touching something that's locked. There's a
button 'Edit a copy'. A copy of what? Is that going to change her file?"

He does not click Edit a copy. He notices the small plus next to "Styles".

"There's a plus. I'll try that, it's the only thing that looks like 'add'."

(The plus opens a new empty style layer, then the color picker: `shots/tom-r3-cbv-numbers.png`
shows where it ends up.)

**Minute 2. The color picker.**

"'Style layer 1', 'Applies to: All nodes'. Nodes, fine, those are the genes, I think. Is it
genes or proteins? The top said proteins. Whatever. There's a list: 'From the data --
log2FoldChange, numbers, -2.52 to 3.15'. That's the one. Click."

"OK, now it's red and blue dots. Red is down, blue is up? The text at the bottom says 'Below 0 is
red, above is blue'. Good, it says it in words, I don't have to guess from the color. And the
legend says 'Below 0: 148, Above 0: 152'. 148 plus 152 is 300. That matches the 300 at the top.
Fine.

"'Scale: linear', 'Palette -- diverging', 'Midpoint 0', 'Fix at current value'. I don't know what
half of that is. 'Fix at current value' -- fix what? Is something broken? I'm leaving it.

"But hang on. I wanted which genes changed MOST. Everything is colored. 300 dots, all some
shade of red or blue. The ones near zero are nearly white, I can see that, but the dark ones are
tiny and there are no names on them. The names on the picture are MAPK1, HSP90AA1, MYC, AKT1 --
are those the ones that changed most? I don't think so, the box on the earlier screen said the
labels are 'top 12 by degree'. So a reviewer would read the names and think those are the
important ones, and they're not what we're talking about."

He does not find a way to put names on the biggest changes. He does not try the Styles menu
(the three dots) because it has no words on it.

**Minute 3. Grey.**

"Now, grey. The reviewer prints it. Where's grey? ... I don't see the word print or grey
anywhere on this screen."

The moderator waits. After about 40 seconds he notices the small palette icon next to "Graph"
on the right and clicks it because it is the only picture of a paint palette on the screen.
(`shots/tom-r3-looks.png`)

"'Look for the whole project'. 'Print -- prints well in gray: colors keep their order in
grayscale and read on white paper.' That's it. That's what I want. I'd never have found that
little paint thing if I hadn't been looking for a while, though.

"'Look for the whole project' -- does that change it for everyone? For her? It says 'colors you
set by hand are kept', which I suppose means it won't undo mine. I'll click Print, but I'm a
bit nervous about 'whole project'."

**Minute 4. Export.**

"Now I want a file. Big blue button, 'Export files...'."

The dialog (`shots/tasks/figure-for-reviewer/03-export-dialog-figure.png`) first showed a
picture colored by module, with Ribosome, Proteasome and so on, and a yellow warning that
"Ribosome and Proteasome look the same in gray".

"Wait. That's not my picture. That's modules, all the colored clumps. I just did fold change.
And the top-left says 'Proteostasis screen'. I was in 'Stress response study'. Did I open the
wrong thing? That's what I mean -- I can't tell if it's me or the file."

(The moderator moves him on to the fold change state, `shots/tom-r3-figure-signed.png`, as if
the dialog had opened on his own view.)

"OK, this one is fold change. 'Look: Print'. 'File is written with: Print look'. Legend says
'Fold change (log2), darker is higher; 0, no change, is the middle gray'. And a tick: 'Checked in
gray: fold change runs light to dark from -2.52 to +3.15, and the legend states that 0 is the
middle gray.'

"So... darker is higher. Then the genes that went DOWN the most are the lightest? The -2.52 ones
are nearly white on paper? That's backwards for what I'm asking. The moderator said 'which genes
changed most'. A gene that dropped fourfold changed a lot. On the printout it'll be the palest
dot on the page, and the reviewer will skip it. Up and down both matter to us -- half the lab's
knockdown hits are down.

"And it has a tick next to it saying it's checked. Checked for what? It says it runs light to
dark. Fine, it does. That doesn't mean somebody can see what changed most.

"I can't see it in grey on this screen either. It's still in pink and blue in the preview. I'm
supposed to believe the tick."

He looks at the footer. "'2 files go to your Downloads folder. Nothing is uploaded.' Good. That's
the first thing on any of these screens that told me where our data goes. I'd have asked."

He reads the file names. "'proteostasis-screen_current-view.png'. That's still the wrong name.
If I send that to the PI, she'll ask which screen."

He also reads the methods box. "That's handy, actually. 'log2 fold change, linear, diverging at
0, 148 below, 152 above.' The PI would want that for the legend of the figure."

**Minute 5. Stops.**

"I'd press 'Export 2 files'. I'd get a picture. But I don't think a reviewer can tell which
genes changed most from it -- the names are the wrong genes, and in grey the big drops go
pale. I'd send it to her and ask her to check it before it goes anywhere. Or I'd just ask her
for a PNG."

## Outcome

Partial. He made a fold-change coloring and an export in the Print look, and he found out where
the files go. He did not get a figure that shows which genes changed most: the names on the
picture are the best-connected proteins, not the biggest changes, and in the Print look the
strongest decreases print as the lightest dots. He would not hand this in without asking the
postdoc.

## Problems, by screen

1. **Export dialog, Print look on a signed column (severity 4).** Print maps fold change to one
   light-to-dark ramp, "darker is higher", so the largest decreases print palest. For "which
   changed most" the direction is the wrong one to preserve: a reviewer reading grey sees big
   drops as "nothing". The green tick ("Checked in gray") says the figure passed, which made him
   trust it less, not more, once he worked it out.
   "It has a tick next to it saying it's checked. The genes that dropped the most are the
   palest dot on the page."
2. **Export dialog preview (severity 3).** The preview stays in color under the Print look. He
   cannot see the grey page he is being told is fine.
   "I can't see it in grey. I'm supposed to believe the tick."
3. **Styles list and canvas, labels (severity 3).** The only names on the picture are the top 12
   by number of connections. Nothing he saw puts names on the genes that changed most, so a
   reviewer reads the wrong genes as the story.
   "A reviewer would read the names and think those are the important ones."
4. **Export dialog, wrong project (severity 3).** The dialog opened on a module figure from
   "Proteostasis screen" with files named proteostasis-screen, while he was in "Stress response
   study" with fold change. The fold-change state still names the files proteostasis-screen.
   "That's not my picture. I can't tell if it's me or the file."
5. **Right panel / Look menu (severity 2).** "Print" is only reachable through an unlabelled
   palette icon; he found it by elimination after about 40 seconds. "Look for the whole
   project" made him worry it would change the file for everyone.
   "I'd never have found that little paint thing."
6. **Styles list (severity 2).** Starting point is a locked "Betweenness color" layer with
   "written by the run" and "Edit a copy"; he did not know whether editing would change the
   sender's file, so he avoided it. log2FoldChange in the right panel looks clickable and is
   not.
7. **Color editor jargon (severity 2).** "Scale", "Palette -- diverging", "Midpoint", "Fix at
   current value" -- he left them all alone. The plain sentence "Below 0 is red, above is blue"
   and the counts were what he used.

## What worked for him

- "Nothing is uploaded" in the Export footer answered his first worry without him asking.
- The legend in words: "Below 0 is red, above is blue", "0, no change, is the middle gray",
  with counts that add up to 300.
- The methods text, which he would paste under the figure for the PI.
- The column name and range (log2FoldChange, -2.52 to 3.15) visible on the first screen.

## Single Ease Question

3 of 7. "I got a file out. I don't think it does what she asked."

## Would he use this instead of his current tool?

"Instead of what? My current tool is her sending me a PNG. This is better than Cytoscape --
nothing to install and it told me nothing got uploaded. But for a figure that goes to a
reviewer, I'd still have her do it, because I can't tell from this whether it's right, and the
screen told me it was right when I don't think it was."
