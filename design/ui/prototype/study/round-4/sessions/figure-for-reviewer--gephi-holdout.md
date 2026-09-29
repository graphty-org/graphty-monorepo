# Session: a figure a reviewer can read in gray -- the Gephi holdout

Participant: Dr. Mara Lindqvist (persona: study/personas/gephi-holdout.md), associate professor,
Gephi user since 0.8. Played at 1440 x 900.

Task, as the moderator gave it: "A reviewer wants a figure of this network they can read even when
printed in gray. Get it to them."

Screens seen, in order (renders in shots/, as the participant sees them):
screens/navigation.html?frame=new (r4-mara-grayfig-nav-new.png), the project-name menu
(r4-mara-grayfig-nav-menu.png), screens/styles-list.html (r4-mara-grayfig-screens_styles-list_html.png),
its Look menu (r4-mara-grayfig-screens_styles-list_html_looks.png), screens/colour-by-value.html
numbers state (r4-mara-grayfig-screens_colour-by-value_html_numbers.png) and categories state
(screens__colour-by-value--categories.png), screens/export-dialog.html (r4-mara-grayfig-screens_export-dialog_html.png,
..._figure.png, ..._figure-grey.png), flows/export.html (flows__export.png).

## Think-aloud

**1. The frame.** "Right. Les Miserables. I know this graph, 77 nodes, 254 edges -- it says 77 and
254, good, those are the right numbers. Colored by `group`, sized by degree. There's a legend
floating on the canvas already, which Gephi has never once given me. Fine. Reviewer wants gray. In
Gephi that's Preview, then I fiddle the palette by hand until it's not a mess, export SVG, and fix it
in Inkscape. Where's Preview here? There isn't a tab called that. There's a hamburger, Graph, Data,
Notes. I'll try the name at the top, that's usually where File lives."

**2. The project-name menu.** "Export..., Ctrl+Shift+E. Good, a keyboard shortcut, I'll remember
that. But wait -- before I export, I want the colors to be printable. The reviewer's complaint is the
colors, not the file format. So I don't want Export yet. Let me go back."

(She closes the menu and looks at the right side.)

**3. Style stack, the Look control.** "Style stack... 'Top wins. Drag to reorder.' That's layers --
okay, like Photoshop, not like Gephi's Appearance panel, but I get it. And there's 'Look: Screen'.
What's a Look? Let me open it."

Reads the menu: Screen, Print, High contrast. "'Print: reads in gray on white paper and for
color-blind readers. Where a color shows a direction, a shape shows it too.' Hm. That's written for a
diverging scale. My figures are almost never diverging. My figures are modularity classes. Nine,
twelve, sometimes twenty communities. What does Print do to a partition? It doesn't say. 'Colors you
set by hand are kept' -- so if I hand-picked my community colors, which I always do, the Print look
does nothing for them? That would be exactly the case where I need it."

"It's a separate project-wide switch, not a Preview setting. So if I flip it, my screen goes gray too
and I work in gray? Or just the export? I'd guess the whole project, since it says 'Look for the
whole project'. I don't love that -- I explore in color and print in gray. In Gephi those are two
different tabs for a reason."

**4. Checking a partition in gray (colour-by-value, categories).** "Let me look at a categorical
layer. Module color: eight distinct colors, Ribosome 56, Proteasome 40... and there's black in there
for MAPK signaling and dark gray for 'Other'. Past 8 colors it folds into Other. That's sensible,
that's more honest than Gephi's random palette at class 14. But in gray: the light blue and the
yellow and the pink are going to be the same mid-gray. I can see that from here. Nothing on this
screen tells me that. And the panel has moved to the left here and the rail says Results instead of
Data -- is this the same program as the last screen? Whatever. I'll assume it's an older build."

"So for my own figure I would still have to do what I do in Gephi: cut to five or six communities and
label them. Nothing here does that for me."

**5. The fold-change layer (colour-by-value, numbers).** "Ah, this is the case they've built it for.
Diverging, red to blue, midpoint 0, 148 below and 152 above, adds to 300. The legend says 'the palest
color is 0, not missing.' Good -- I've been bitten by a white that meant NaN. Fine. Let's pretend the
reviewer's figure is this one."

**6. Export, opened with Ctrl+Shift+E.** "Scope: 'Full graph: 300 nodes. The filter chip's scope,
until you change it here.' Good. That's the Gephi trap -- whatever is visible is what gets exported --
and it's named. Figure (.svg) checked, 'Vector, with real text'. Real text. If that's true, that's
Inkscape out of my workflow for labels."

"174 mm, two columns. Also 85 one column. Someone here has submitted a paper. Text 8 pt, shown at 100%
of print size -- that's the right way to preview; I always print the Preview PNG at size to check the
labels. Legend beside, right. The legend is in the file, with the degree key, and a footer: 'Degree:
exact, not normalized, on the full graph (300 proteins, 1,262 interactions).' That footer is my
methods sentence. I'd cut half of it from a real figure caption, but I'd rather cut than write."

"Labels: top 10 by |log2 fold change|, 2 hidden to avoid overlap, show list. Okay, it tells me. I'd
want to force those two -- MRE11 and RPL17 might be the ones my coauthor cares about. There's no 'show
anyway' that I can see. I'd be back in Inkscape for those two."

"And here: a yellow warning, 'Values just above and below 0 print as the same gray', with 'Use Print
look'. Oh, so I didn't need the Style stack at all. It caught it for me. That's the first thing all
session that I didn't have to know to ask for. I'll click it."

**7. Print look, in the dialog.** "Now two previews side by side: the file, and 'printed in gray, the
same file'. That is actually what I do by hand -- print one on the office printer and squint. Triangles
up for increases, down for decreases, circle for no change. Darkness is distance from zero. Fine, that
reads."

"Now let me check the numbers, because I always check the numbers. The check line says: 'Increases
and decreases stay apart in gray (120 below 0, 133 above; 47 within 0.25 of 0 drawn as no change).'
Hold on. A minute ago it was 148 below 0 and 152 above. Now it's 120 below 0. The methods file still
says '148 below 0, 152 above'. The legend inside the figure says 'down: -0.25 to -2.52, 120'. So the
120 is below minus 0.25, not below 0. The sentence is wrong, or at least sloppy, and a reviewer will
read the legend and the caption and see two different counts."

"And more important: who decided 0.25? I didn't. There's no box for it. In the Screen look the only
parameter was the midpoint. Now 47 proteins are drawn as 'no change' -- that's a claim about my data,
not a palette. The Look menu said a Look 'swaps palettes'; this one also rebinned 47 nodes into a
third category and changed their shape. That's exactly the kind of hidden default I don't publish. It
IS written in the methods file -- 'no change within 0.25 of 0' -- I'll give it that. But I want to set
it, and I want to know why 0.25 and not 0.5 or 1, which is what half my biology coauthors use for a
fold-change cutoff."

"Does clicking Print here change my whole project to Print, or just this file? 'File is written
with: Print look.' I think just the file, but the Look control in the stack had the same three names.
I'd have to check the canvas after I close this. If it switched my canvas to triangles behind my back,
I'd be annoyed."

**8. Files and export.** "Two files: the SVG and a methods .txt. 'Drawn with graphty-element 2.6.2.'
A version number -- good, that's the citation line I need. 'Nothing is uploaded, 2 files go to your
Downloads folder.' Good, because some of my data is under IRB. Export 2 files. Done, as far as the
mock goes."

**9. What I'd send.** "I'd send the SVG, after opening it in Inkscape to confirm the labels really are
text and to put MRE11 and RPL17 back. And I'd fix the caption to say 'below -0.25' myself. Twenty
minutes, about the same as Gephi. Maybe less because I skipped drawing the legend."

## Single Ease Question

**5 of 7.** "Finding it was easy -- the dialog warned me before I knew there was a problem, and the
gray preview beside the file is the right idea. I lose two points for the made-up 0.25 band I can't
set, the count that doesn't match between the check and the caption, and the labels it hid on me with
no way to force them."

## Would I use this instead of my current tool?

"For this job, the legend-and-methods-in-the-SVG part, I'd try it for a revision figure. Not instead of
Gephi. My figures are partitions -- modularity classes -- and nothing I saw tells me what Print does to
eight or twelve community colors in gray, except 'colors you set by hand are kept', which means
nothing. It solved the problem for the one kind of figure I rarely make. Show me a modularity figure
in gray with the classes still distinguishable and I'll come back for a second session. Until then I'd
stay on Gephi."

## Findings (for the studio)

1. The Print look's gray check sentence says "120 below 0, 133 above" while the Screen legend and the
   methods file say 148 below 0 and 152 above; the 120 and 133 are counts outside a 0.25 band. A
   participant who checks numbers reads this as a contradiction in the caption. (severity 3)
2. The 0.25 "no change" band is a data decision the Print look makes with no control to set it and no
   stated reason; it reclassifies 47 of 300 nodes and changes their shape. The Look menu promises a
   Look "swaps palettes"; this one also rebins. (severity 3)
3. Print look says nothing about categorical layers, the most common figure for this participant
   (community partitions). Eight distinct colors include several that collapse to the same gray, and
   no screen warns about it; "Colors you set by hand are kept" implies hand-picked partitions get no
   help at all. (severity 3)
4. Labels hidden to avoid overlap can be listed but not forced into the figure; a named node the author
   needs must be restored by hand afterwards. (severity 2)
5. Two Look controls with the same three names (Style stack header, Export dialog) and no statement of
   whether choosing Print in the dialog changes the canvas. (severity 2)
6. The categories render shows an older layout (styles list on the left, rail reading Results) beside
   pages with the Style stack on the right; the participant took it for a different build. (severity 1)

Delights: the dialog's warning with "Use Print look" appeared before she knew to ask; the file and its
gray print side by side at print size; legend and methods footer inside the SVG with real text; the
scope line naming the filter; the graphty-element version in the methods file; "nothing is uploaded".
