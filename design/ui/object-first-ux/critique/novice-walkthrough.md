# Novice walkthrough: Elena's first ten minutes

A played-through session of the object-first graphty app, using only the eight mocks in
`design/ui/object-first-ux/mocks/` and the model in `design/ui/object-first-ux/object-model.md`.
Nothing here was tried in a running app; every "I click" is what the mock or the model says
would happen, and every "I get lost" is a judgement about a first-time reader.

The reader is Explorer Elena (`design/designloom/personas/explorer-elena.yaml`): a product
manager with no graph vocabulary, curious, comfortable with software, who loads data and
immediately looks at the picture, clicks the big nodes, relies on colour and size to read
importance, takes screenshots for colleagues, and abandons a tool the moment it feels steep.
Her stated frustrations: too many options, unclear words, no idea where to start, fear of
breaking something. Her success criteria come from the onboarding workflow
`design/designloom/workflows/W14.yaml`: first picture under two minutes, can describe what she
sees, feels able to keep going, runs at least one analysis.

The five tasks, in the order the task brief gave them: load the sample, understand what the tree
shows, colour a group, find a path, export a picture. The rule of the exercise is "no wizards":
no guided tour, no onboarding overlay, no help text beyond what the mocks already draw. The
question is whether the screen alone gets her there.

Design words used below, defined once:

- **Tree**: the list of rows in the left panel under the heading "Objects". Each row is
  something made from the data (a group, a path, a ranking) or the data itself.
- **Inspector**: the right panel. It shows the properties of whatever is selected.
- **Fill**: the model's word for an object's appearance (its colour, size, outline and so on),
  borrowed from Figma, where it means a shape's paint.
- **Chip**: the 14 x 14 colour swatch at the right end of a tree row.
- **Secondary bar**: the dark strip that appears above the toolbar while a tool needs something
  from you ("Pick the end node").
- **Flyout**: the menu behind the small chevron next to a toolbar button, listing that tool's
  variants.
- **Tooltip**: the dark label that appears when the pointer rests on a control for one second.
- **Discoverability**: whether a reader who has never seen the app can find the control that
  does what she wants without being told.

## Minute 0 to 1: load the sample

**Screen**: `mocks/screen-1.png`.

**What I see.** A card in the middle of an empty canvas: "Open a graph", a dashed drop zone,
one blue button "Choose a file", and three rows that look like a list: "Karate Club 34 nodes,
78 edges", "Cat social network", "College football". Two grey panels either side with headings
"Views" and "Objects" and three faint verbs ("Open a file...", "Paste data...", "From a URL...").
A row of icons at the bottom, mostly greyed.

**What I click.** I have no file, so the blue button is not for me. The three rows under it
read as a list of ready-made examples; "34 nodes, 78 edges" tells me they are data. I hover
"Karate Club" and a dark label says "A club that split in two. The classic test for finding
groups." That sentence sells it. I click the row.

**What I expect.** A picture appears.

**What the mock says happens.** Screen 2: the graph is drawn, the camera fits it, the left
panel now says "Karate Club", the right panel shows counts.

**Where I get lost.** Nowhere. Two things I notice in passing: the sample rows have no
affordance that says "click me" (no chevron, no button styling), so I found them by reading the
counts rather than by their look; and the tooltip only appears after a one-second hover, so a
reader who clicks straight away never reads the blurb. Neither stops me.

**Time**: 20 seconds. W14's "first picture under two minutes" is met with room to spare.

## Minute 1 to 3: understand what the tree shows

**Screen**: `mocks/screen-2.png`.

**What I see.** Left panel: "Views" with a row "Overview"; "Objects" with a bold row "Karate
Club 34 / 78" carrying a small grey square with a padlock, and three indented rows in lighter
text: "Find groups", "Rank by connections", "Search a name". Right panel: "Karate Club,
karate.gml, GML", then "Summary" ("34 nodes joined by 78 edges in one connected part"),
"Nodes 34, Edges 78, Direction Undirected (from file), Density 0.139, Mean links 4.6, Parts 1,
Weighted No"), then "Arrangement" (Layout: Spread out; Dimensions 2D / 3D; pause, step, re-run
icons; "Settled"), "Showing" (Show: Everything, 34 of 34), "Canvas" (Background, Labels: None,
Legend off, Minimap off, Notes off, Default look with two locked grey swatches). The canvas:
34 grey dots and lines, no labels.

**What I read the tree as.** The one sentence in Summary is the best thing on the screen: "34
nodes joined by 78 edges in one connected part" is plain English and tells me what the picture
is. The tree itself is harder. "Objects" means nothing to me yet; my first guess is that it will
list the things in the data, so I read the three indented rows as if they were inside Karate
Club, like folders in a file. "Find groups" and "Rank by connections" are verbs, which does not
fit that reading, and it takes a second look (the lighter text, the tool icons) to realise they
are suggestions, not contents. "Search a name" puzzles me: the picture has no names, only
unlabelled dots.

The padlocked grey square on the Karate Club row is a mystery. I hover it; the model does not
promise a tooltip for a chip. I move on.

Words I do not know in the right panel: "Density", "Mean links", "Parts", "Settled", "Showing",
"Default look". I skip them. Nothing looks dangerous, which matters for Elena's "fear of breaking
things".

**What I click.** Elena's persona says she clicks the prominent nodes. There are two big hubs.
I click one. Per the model (section 4.8) the inspector shows "Node 34", an empty Attributes
section (the file has none), "Values" empty, "Member of: In no set", "Neighbours 17" with rows,
and "Look" with nothing painted. I now know that a dot is a "node" and that 34 has 17
neighbours. "In no set" I do not understand.

Then I click "Find groups", because the tooltip on the Karate Club sample said this was the
classic test for finding groups, and the row is the same words. Per the model (section 13) a row
"Communities (Louvain)" appears at the top, spins for a moment, expands into "Group 1 .. Group
4" with coloured chips, and the canvas goes four colours. The three suggestion rows vanish.

**What I expect.** Coloured groups. Got them. That is the first "aha": the row I clicked became
a thing in the list, with children, and the picture changed to match. Now I understand the tree:
it lists what I have made.

**Where I get lost.**

1. The new row is called "Communities (Louvain)". I clicked "Find groups". The word in the row
   is not the word I clicked, and "(Louvain)" is a name I cannot place. The model's rule for
   flyouts (plain name, technical name in secondary text) is not carried into the row name.
2. What does "Communities" mean here? The model has a one-line reading ("4 groups. The groups
   are clearly separated (modularity 0.36)") but it is behind a collapsed section called "Made
   by" and then behind a "?" glyph. "Made by" does not say "explain this to me"; I would not
   open it looking for meaning.
3. The suggestion rows are gone. They were my only map of what else the app could do. The model
   puts them back under the file menu ("Show suggestions"), which I have not opened and have
   no reason to.
4. The canvas coloured itself, but the legend is off by default (Canvas > Legend switch off in
   screen 2), so the only key to the colours is the chips in the tree. I have to look left,
   match orange to "Group 1", and look back. Screen 3 shows the legend on, but that state was
   turned on by someone, not by the app.

**Time**: two and a half minutes. W14's "user runs at least one analysis" is met, and I could
say "there are four groups" out loud, which is W14's comprehension criterion.

## Minute 3 to 5: colour a group

**Screens**: `mocks/screen-3.png` (the end state) and the model, section 4.5.

I want the blue group to be orange. The mock shows the finished state (Group 2 already
overridden to orange, selected, its members haloed); what follows is the path to it from the
state after "Find groups".

**What I click, attempt one.** The canvas. I click a blue node. The inspector shows a Node: its
Look section says "Colour [blue chit] from Communities", and below it a button "Colour this
node...". I am told the colour comes from "Communities", which is the row in the tree, so I
learn that the group owns the colour. But "Colour this node..." is right there, it is the only
button, and Elena clicks buttons. If I take it, the model creates a one-node Set named "34"
with its own Colour row and opens a picker. I get an orange node and a new tree row, and the
other ten blue nodes stay blue. That is a trap: the door with the obvious label leads to the
wrong-sized result, and now I have a stray object I did not mean to make.

**What I click, attempt two.** Backing up: the Look row "from Communities" is clickable and
takes me to the Communities row. Or I hover the tree rows and see the nodes outline as I pass
each one (the two-way hover link): I stop on the row whose outline lands on the blue nodes, which
is "Group 2". I click it. Eleven nodes take a gold ring. The inspector says "Group, Group 2",
then Definition, then Members, then "Fill".

Now the important moment. Before the override exists, the Fill section holds one row: a blue chit
and "Inherited from Communities" in grey with a small padlock (this is the lower row in screen 3).
The header of the section has a "+". I click the blue chit, because that is where a colour lives.
It is locked; per the model nothing opens. I am stuck for a beat. The only other control is the
"+", which to me means "add something", not "change the colour". I try it because it is the only
thing left. A new row appears above with an editable chit; I click that, a picker opens, I pick
orange. The eleven nodes turn orange and the Group 2 chip in the tree turns orange with them.

**What I expect.** Click the swatch, pick a colour. What the model gives me is: click the row,
fail on the locked swatch, guess that "+" means override, click the new swatch, pick. Two extra
guesses, one of them a dead click.

**Where I get lost.**

1. The locked inherited swatch is a dead end for the most natural click there is. A first click
   on the inherited chit should itself create the override and open the picker; the lock glyph
   can still explain where the default came from.
2. "Fill" is Figma's word for a shape's paint. For a dot on a graph, "Colour" or "Look" is what
   Elena would scan for. The node inspector already uses "Look" for the same thing, so the app
   uses two words for one idea.
3. "Colour this node..." on the node inspector is too easy to find relative to "colour the group
   this node is in", which is what she actually wants nine times out of ten. Either the node
   inspector needs a second door, "Colour its group...", or the Member of / Look rows need to
   read as the way to the group more strongly than the button does.
4. The word "Override" never appears on screen; it is the "+" in the header. I only know it is
   an override from the model.

What works: once the override row exists, screen 3 is self-explaining. The override sits above
the inherited row, the chip in the tree matches, and the legend (if on) matches too. The
three-click promise in the model is real once you know the route.

**Time**: two minutes, including the wrong turn through "Colour this node...".

## Minute 5 to 8: find a path

**Screen**: `mocks/screen-5.png`.

I want to see how node 1 gets to node 34. (Elena would phrase it "how are these two connected".)

**What I see.** The toolbar: an arrow, a hand, then five icons with small chevrons (a funnel, two
joined dots, a curve, three overlapping circles, a bar chart), a speech bubble, and 2D / 3D / VR
/ AR. No words. The suggestion rows, which were words, are gone.

**What I click.** I do not know which icon is "path". None of these icons is a convention I have
seen before (a funnel I know from spreadsheets; the rest are new). So I hover them one at a time
and wait a second each for the tooltip. The model says each tool's tooltip carries one
sentence. Assuming the third tooltip says something like "Path: the shortest route between two
nodes (P)", I find it on the third or fourth hover: about ten seconds of hovering.

Alternatives I would not find: pressing P (nothing on screen says P), Ctrl+K (nothing on
screen mentions a palette), right-clicking a node for "Path from here" (I would not think to
right-click a dot). The right-click route is actually the best fit for Elena, since she is
already clicking nodes, but it is invisible.

I click the curve icon. The toolbar button turns blue and a dark strip appears above it: "Pick
the start node". Good: it tells me exactly what to do. I click node 1. A blue ring appears on it
and the strip changes to "Pick the end node", with "Shortest route" and "Cancel". A dashed blue
line follows my pointer. I click node 34.

**What I expect.** The route lights up. Per the model: a row "Path: 1 -> 34" appears at the top
of the tree, selected, the path's nodes and edges turn blue and the edges thicken, and the
toolbar returns to the arrow.

**Where I get lost.**

1. Finding the tool. Five unlabelled icons for five verbs with no shared iconography, and a
   one-second delay on each tooltip, is the steepest moment in the ten minutes. Figma gets away
   with icon-only tools because "frame", "text" and "pen" have been the same icons for thirty
   years. "Neighbours", "Groups" and "Rank" have no such icons. Elena's persona says she abandons
   a tool when the curve feels steep; this is where that would happen.
2. The picks need me to know which dots are 1 and 34. Only six labels are drawn (the label
   budget is "Top 6 by Connections"), and only when some measure exists. On screen 2, before
   any ranking, no dot has a label at all, and the model does not describe a hover label on a
   node. I would be picking blind unless the nodes I want happen to be labelled. A hover label
   on any node is the fix, and it is a small one.
3. After the path exists it is blue on top of the group colours. Nodes 1 and 34 were orange
   and yellow; now they are blue. I understand that the path painted them (the row is at the
   top and I just made it), but nothing on screen says "the path is above the groups, so it
   wins". The model's "Covered by ... on N of M" line only appears on the covered object's
   inspector, which I would have to go and select. Not lost, just slightly puzzled.
4. The flyout under the Path chevron lists "Cheapest connecting network (Kruskal)", "Best
   pairing (matching)", "Most that can flow (max flow)", "Weakest link (min cut)". If I open it
   by mistake (the chevron is a small target next to the icon) it is the one place in the ten
   minutes where Elena's "overwhelming number of options" frustration fires. The face of the
   tool is "Shortest route", so I never need the flyout, but it is easy to open by accident.

What works: once the tool is found, the pick-pick flow is the best interaction in the model.
The strip says what to do, the rubber-band line confirms the first pick, Cancel is visible,
no dialog appears, and the result lands in the tree as a named thing I can hide, recolour or
delete. This is exactly the drawing-tool feel the model promises.

**Time**: three minutes, most of it hovering the toolbar.

## Minute 8 to 10: export a picture

**Screens**: `mocks/screen-2.png` and `mocks/screen-3.png` (the right panel header), the model
section 9 (Export).

Elena "takes screenshots to share discoveries with colleagues". The honest first answer is
that she would press her laptop's screenshot key and be done, legend and all, with the panels in
the picture. The question is whether the app offers something better that she can find.

**What I see.** Top right: "100%" with a chevron and a filled blue button, "Share". Nothing else
on the screen says export, save, download or image, unless the Dataset inspector is showing and
scrolled to the bottom, where an "Export" section has "Image PNG 2x Export" (screen 2 cuts off
above it; I would have to scroll past Summary, Arrangement, Showing, Canvas, Attributes and Made
by to reach it).

**What I click.** "Share" is the only strong button on the screen, and sharing is what I want
to do, so I click it even though I expect a link or an invite. The menu lists "Export image...,
Export data..., Export report..., Copy image, Copy methods text, Export recipe". "Copy image" is
the thing: I click it and paste into a chat. Or "Export image..." for a file.

**What I expect.** A PNG of what I see, the way I see it: coloured groups, the blue path, the
legend.

**Where I get lost.**

1. The name. "Share" in every other tool means invite or link. It works here only because it is
   the one button and the menu reveals itself. A reader who assumes Share needs an account or a
   login might never click it. Since the menu is entirely exports, the button could be named
   for what it does.
2. Does the picture include the legend? The model marks legend-in-capture as an open issue
   (#292) and the gear on the Export row has a "legend in picture" option. Elena would not open
   a gear. If the default is "no legend", her colleagues get four colours and no key.
3. Two exports that look the same and are not. With Group 2 selected, the inspector's Export
   section reads "Framed image on members", which frames the camera on the eleven nodes. With
   nothing selected it reads "Image", the whole picture. Share is always the whole picture.
   The model's rule ("Share is the whole picture; an object's section is that object") is
   consistent, but nothing on the two rows says which one you are getting.
4. "2x" next to PNG means nothing to Elena. It is the scale factor; "Sharp (2x)" or a tooltip
   would carry it.

**Time**: one minute. Done, with the legend question unanswered.

## Discoverability, task by task

Scale: 5 = found at once from the screen alone; 3 = found after a wrong turn or a hover hunt;
1 = would not be found without being told.

| Task                | Score | Why                                                                                                                                                                                                                                                                                   |
| ------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Load the sample     | 5     | One card, three sample rows with counts, one blurb on hover. The only question is whether the rows look clickable.                                                                                                                                                                    |
| Understand the tree | 3     | The Summary sentence explains the data; the tree explains itself only after the first object is made. Before that, "Objects" and the indented suggestion rows are ambiguous, and the one thing that would explain a result (the reading) is two clicks deep behind "Made by" and "?". |
| Colour a group      | 3     | The route exists and is short, but the two natural first clicks (the node's "Colour this node..." button, and the locked inherited swatch) are respectively the wrong-sized result and a dead click. "+" as the override door is a guess.                                             |
| Find a path         | 2     | The tool is behind an unlabelled icon among five unfamiliar icons, with a one-second tooltip delay each, and the nodes to pick have no labels until a measure exists. Once found, the pick-pick flow is a 5.                                                                          |
| Export a picture    | 4     | The one blue button leads there, but its name says something else and the legend's presence in the picture is uncertain.                                                                                                                                                              |

**Overall**: 3 of 5. Elena reaches every goal inside ten minutes, meets all four W14 success
criteria (first picture, can describe it, runs an analysis, feels she can continue), and never
breaks anything. The cost is three wrong turns (the one-node colour button, the locked swatch,
the toolbar hover hunt) and a vocabulary she has to skip over. The one place she might quit is
the toolbar, and only because she wanted a path before she had learned that the icons are the
verbs.

What carries her without any wizard: the sample blurb, the Summary sentence, the three
suggestion rows, the secondary bar's instructions, the two-way hover between rows and nodes,
and the tree row appearing the instant a tool finishes. Those five things are the guidance, and
they are enough for the first object. They are not enough for the second, because the
suggestion rows leave and the toolbar does not speak.

## Findings

Severity: blocker = she does not reach the goal; major = she reaches it after a wrong turn or a
hunt that could make her quit; minor = friction she notices and moves past.

| #   | Severity | What                                                                                                                                                                                                                                                                                                       | Where                                                                                     |
| --- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | major    | The five creation tools are unlabelled icons with no shared convention, and their names are reachable only by a one-second hover each. A novice looking for "path" hunts across the toolbar; this is the steepest moment of the session and the one place she might stop.                                  | Toolbar, every mock; `object-model.md` section 3                                          |
| 2   | major    | The locked "Inherited from Communities" swatch is the natural first click for changing a group's colour and it does nothing. The override is behind the section's "+", which reads as "add", not "change".                                                                                                 | Group inspector, Fill section; `mocks/screen-3.png`, `object-model.md` section 4.5        |
| 3   | major    | "Colour this node..." on the node inspector is the most visible colour control and creates a one-node Set; a novice who wants to recolour the group her node is in gets one orange node and a stray tree row. There is no equally visible door to the group.                                               | Node inspector, Look section; `mocks/screen-4.png`, `object-model.md` section 4.8         |
| 4   | major    | The plain-language reading of a result ("4 groups. The groups are clearly separated") is the one thing that would tell a novice what she just made, and it is behind a collapsed section named "Made by" and then a "?" glyph. Nothing on the surface invites her to open it.                              | Every object inspector, Made by section; `object-model.md` section 4 and section 2.3      |
| 5   | major    | Nodes have no labels until a measure exists (label budget "Top N by a Measure"), and the model describes no hover label on a node. Picking node 1 and node 34 for a path, or telling which hub is which, is guesswork on a fresh load.                                                                     | Canvas, `mocks/screen-2.png`; `object-model.md` section 4.1 Canvas row and section 3 Path |
| 6   | minor    | The tree row is named "Communities (Louvain)" after clicking "Find groups". The verb she clicked and the name she gets do not match, and "Louvain" is an unexplained word in the most prominent row on screen. The flyout rule (plain name, technical name in secondary text) is not applied to row names. | Tree, `mocks/screen-3.png`; `object-model.md` section 13                                  |
| 7   | minor    | The legend is off by default, so after the first grouping the only key to the colours is the chips in the tree. Turning the legend on when the first Grouping or Measure appears would give the picture its key without a setting.                                                                         | Dataset inspector, Canvas section, `mocks/screen-2.png`                                   |
| 8   | minor    | The three suggestion rows are the novice's only map of the verbs, and they vanish after the first object with no visible way back (the way back is file menu > Show suggestions).                                                                                                                          | Tree, `mocks/screen-2.png`; `object-model.md` section 9 Guidance                          |
| 9   | minor    | "Share" is the only button that leads to an image export, and in every other tool that word means invite or link. The menu behind it is entirely exports.                                                                                                                                                  | Right panel header, every loaded mock; `object-model.md` section 9 Export                 |
| 10  | minor    | Whether the exported picture includes the legend is decided by a gear option (open issue #292). A novice who never opens gears may send colleagues four colours with no key.                                                                                                                               | Dataset inspector, Export section; `object-model.md` section 4.1                          |
| 11  | minor    | "Fill" (the inspector section) and "Look" (the node inspector section) are two words for appearance. The node inspector's word is the one a novice would scan for.                                                                                                                                         | Inspector sections; `object-model.md` sections 0, 4.5, 4.8                                |
| 12  | minor    | The suggestion rows sit indented under "Karate Club" in the same list as real objects, so on first read they look like contents of the data rather than actions. "Search a name" is offered on a dataset that has no names.                                                                                | Tree, `mocks/screen-2.png`                                                                |
| 13  | minor    | The eye on a row means "stop painting" but a novice expects "hide these nodes". Clicking it turns the group grey instead of removing it; the tooltip explains, but only after the surprise.                                                                                                                | Tree rows; `object-model.md` section 7                                                    |
| 14  | minor    | Unexplained words on the resting Dataset inspector: Density, Mean links, Parts, Settled, Showing, Default look, and the padlocked grey chip on the root row. None blocks her, all are skipped, and together they are the "unclear terminology" the persona names.                                          | Dataset inspector, `mocks/screen-2.png`                                                   |
| 15  | minor    | The Path flyout (Kruskal, Prim, matching, max flow, min cut) is one accidental chevron click away from the novice, and is the one list in the session that matches her "overwhelming number of options" frustration.                                                                                       | Toolbar, Path chevron; `object-model.md` section 3                                        |
| 16  | minor    | Tree counts are formatted three ways across the mocks: "34 / 78" (screen 2 root), "34 nodes 78 edges" (screen 5 root), "5 nodes" versus a bare "12" for a group (screen 3). A novice reads the unlabelled number as a mystery.                                                                             | Tree rows, `mocks/screen-2.png`, `mocks/screen-3.png`, `mocks/screen-5.png`               |
| 17  | minor    | Two export rows with different results read the same: "Image" on the Dataset and "Framed image on members" on a Group; Share is always the whole picture. Nothing on the row says what area it captures.                                                                                                   | Export sections; `object-model.md` sections 4.1, 4.2, 9                                   |

## What to change first

Three changes would move the overall score from 3 to 4 without adding a wizard:

1. **Let the toolbar speak.** Either a text label under each tool icon (Figma's toolbar is
   icon-only, but its icons are universal and these are not), or a tooltip with no delay on the
   toolbar only, or both. This alone fixes finding 1 and softens 15.
2. **Make the first click on a colour do the obvious thing.** Clicking the inherited swatch on a
   Group creates the override and opens the picker (finding 2); the node inspector gets a second
   door, "Colour its group..." beside "Colour this node..." (finding 3).
3. **Put the reading on the surface.** One line of secondary text under the object's header,
   the same sentence the "?" reveals today, so "Communities (Louvain)" is followed by "4 groups,
   clearly separated" without a click (finding 4). It is one 32 px row.

A fourth, smaller: a hover label on any node (finding 5) and the legend switching itself on
with the first Grouping (finding 7).
