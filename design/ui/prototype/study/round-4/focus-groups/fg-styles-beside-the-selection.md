# Focus group: where styles live, and what a selected node says about its colour

Round 4 of the simulated user study. Five simulated participants looked at the main frame with
its style controls and discussed it over two rounds: first impressions written alone, then a
discussion of where colour is set, what "top wins" means, and what happens to the right-hand
panel when a node is selected.

Participants (all simulated, built from the graphty personas):

- **bioinformatics-researcher** -- Cytoscape user; loads STRING networks; cites figures.
- **genomics-cytoscape-user** -- laptop user; module colouring; a colour-blind PI; relies on
  colleagues' palette files.
- **explorer-elena** -- non-specialist; wants a readable picture and one place to change the look.
- **recipe-recipient** -- receives a colleague's styled file, drops a hit list on it and makes a
  slide; does not style anything.
- **screen-reader-analyst** -- works through a screen reader; judges the frame by what focus
  lands on and what is announced.

Note on the material: participants did not all see the same frame. The bioinformatics researcher
saw Les Miserables with a "Style stack" on the right, a "Data" rail entry and a legend ending in
"6 more". The genomics user saw a gene network coloured by module, with "Styles" in the left list
and a "Results" rail entry. Elena and the recipe recipient saw "Styles" on the left with
Background, Layout and Statistics on the right. The screen-reader analyst was told about the
frame rather than exploring it. Findings that depend on which variant someone saw are marked.

## Transcript

### Round 1 -- first impressions (written alone)

**bioinformatics-researcher:** Les Miserables. Fine, it's a demo, but I would have dropped my STRING TSV in first. So I'm reading this layout as a layout, not as my data.

The left rail has Graph, Data and Notes. My guess is that Graph lists the networks I've loaded, and Data is where I import a file and see the node table, but the table is already at the bottom, so I'm not sure. Notes, I suppose, is a lab notebook. "Assistant Off. Nothing is sent" I'm glad to see, and I won't turn it on.

On the right, the Overview numbers are what I look for first: 77 nodes, 254 edges, density, components. Good.

"Style stack" is new to me. In Cytoscape a style is one thing, and here there are four of them, piled up. "Top wins" I read as: whichever is higher in the list overrides the ones below, like layers in Illustrator. So Size: degree beats Group color? Those set different things, so what is it winning? And "Look: Screen", I have no idea. Screen versus what, print?

The legend in the corner is welcome, but "6 more" means it's hiding six of my ten groups. That won't do in a figure.

When I click Valjean, the right panel changes to Appearance, which looks like the same list under a new name. I didn't expect that.

**genomics-cytoscape-user:** OK, first thing: I'm on a laptop, and the network is flat and not spinning. Good, that's what I want. The legend is already sitting on the canvas: "Module color", with a count for each module (Ribosome 56, Proteasome 40...). I'd want to know if that legend comes out with the PDF, but it's a good start.

The rail on the far left: "Graph" is presumably where I am now. "Results" I'd guess holds the clustering or hub-gene output. "Notes" is notes. "Assistant... Off. Nothing is sent." is a strange thing to have as a button. I read it as a warning, not as something to click, and I wouldn't click it.

"Styles" is in the left list, under "Sets and paths". There's "Module color" and "Base style", which I can live with. But the right side also has a "Graph" header with a little palette icon, and a Background box. So where do the colours actually live, left or right? I can't tell yet.

Two isolates are floating around the edges and I don't see an obvious way to drop them. "Confidence not used yet": which STRING cutoff is this, then?

**explorer-elena:** Okay, so the picture loads and it's actually readable. The coloured groups and the names on the busy dots are nice. I'd keep that little "Group color" box in the corner, because it's the only thing that tells me what the colours mean.

The left strip is where I get lost. "Graph" I sort of get, it's where I am now. "Assistant, Off. Nothing is sent." reads like a privacy warning, not a button. Is it an AI chat? Why is it off? "Results" has a lab beaker on it, so results of what? I haven't run anything. "Notes" I'm guessing is my own notes.

Then there are two sidebars and I can't tell which one is "the settings." On the left, "Styles" lists "Group color" and "Base style", which I'd call "colours" and wouldn't have looked for there. On the right there's Background, Layout and a block of Statistics. "Density 0.0868" and "Connected components 1" mean nothing to me.

The pink bar across the top with "8 Assistant on" and "B: empty at rest" looks like the designers' demo controls, so I'm ignoring it.

My gut says too many places to look. I'd want one obvious "change how it looks" spot.

**recipe-recipient:** Right, so. First thing: it's a picture with colours and a key in the corner. Good, that's more than Cytoscape gave me. But the key says "Group color" and then 2, 8, 4, 1, 3. Groups of what? If the PI asks what orange means, I can't tell her "3".

The strip down the left side: "Graph" I get. "Results" I'd guess means the answers, but answers to what? I haven't asked it anything. "Notes" is fine. Then there's "Assistant. Off. Nothing is sent." I read that one twice. I like "nothing is sent", and there's also "Nothing has been sent from this project" up top. That's the line I'd look for before putting our hits in. But why does it only say it next to an assistant? Does it hold for the rest of the app?

I found "Styles" in the left column, with two rows. I'd leave that alone, it's her business. Then the right side has "Layout", "Density", "Connected components". I don't need any of that. "Export files..." is the big blue button, so that's where I'd go for the slide.

I'd probably ask her what the group numbers mean.

**screen-reader-analyst:** Okay, so I'm going by what a colleague read to me and what the rail buttons announce, if they announce anything. Top to bottom I get: a menu, Graph, Data, Notes, Assistant. I guess them as places. Graph has my graphs. Data has my file, and the first thing I'll check there is where the file went. Notes is notes. Assistant I leave switched off. That part holds together. I can say what each button is before anyone explains it, and that doesn't happen much.

The right panel is where I start to worry. I'm told "Style stack" shows up when nothing is selected, and something called Appearance takes its place when I pick a node. So the same heading changes depending on the selection? Every time my focus lands somewhere, I'll need to hear which of the two I'm in.

"Top wins": does that mean the top of the list, or the top of a paint order I can't see? And "highlighted" means nothing to me. If a row paints Valjean, say so in words. For example: "row 2 of 4, paints color, wins."

Before I go further, can I get from the canvas into that stack by keyboard and then back to the node I was on?

### Round 2 -- discussion

**bioinformatics-researcher:** Elena says there are too many places to look. She's right, and I'll go further. The Cytoscape user found colours on the left under "Styles" and also a palette on the right, and I saw "Style stack" on the right. Three people, two locations, and nobody is sure which one is real. In Cytoscape I have one Style panel with a mapping per property. If a node is the wrong colour there, I open Fill Color and read the mapping. Here I don't know whether to look left or right.

What the screen-reader analyst asked for is what I want too: "row 2 of 4, paints color, wins." Put that in words on screen. A highlight tells me nothing I could cite.

The recipe recipient's "groups of what?" is my "6 more" problem again. A legend that hides categories or shows bare numbers is not a figure legend.

I'd switch if clicking a node told me, in text, which rule set its colour and from which column. I'd quit if colours come from a colleague's file and I can't see the hex values or check them for red-green safety. At that point I do it in ggplot.

**genomics-cytoscape-user:** I'm with Elena. There are too many places to look, and I'm the one who has to live in them. My legend says "Module color", but my Cytoscape habit tells me styles live on the left, where the list is. Then the right panel changes its name when I click a gene. If my TP53 node isn't red, I'll look on the left first, not find the answer, and after that I'll start distrusting the colours. Cytoscape does exactly that to me with mappings that never actually attached.

The researcher asked what "Size: degree" is beating Group colour at, and I want to know too. If "top wins" means one layer covers another, then tell me, on the node itself, which layer painted it and which column it read. Something like "colour from Module color, column: module".

If the legend's "6 more" means modules are missing from the PDF, that's a dealbreaker and I go back to Cytoscape plus Legend Creator. I'd switch if a colleague's palette file lands in one place I can find again, and if the default isn't red-green, because my PI is colour-blind.

What I actually did: I looked on the left. What I say I'd prefer: one "Style" place.

**explorer-elena:** I'm with the screen-reader analyst on the heading that changes. I clicked a dot and the panel turned into "Appearance", and I honestly thought I'd opened a different menu. If the list is the same, keep the name the same.

I also read "top wins" the way the bioinformatics researcher did, like layers in Slides where the top one covers the bottom one. But I can't tell what is covering what. If one of my dots comes out the wrong colour, I want to click the dot and see a plain sentence like "Orange because of Group color." I don't want to go back and forth between a list on the left and a list on the right.

The genomics person asked where the colours actually live, and that's my question too. Colours are on the left, Background is on the right. I'd give up right there and screenshot something from Slides instead.

What would make me quit is having to learn "stack", "Look: Screen" and "Base style" before I can change a colour. What would keep me here is one button called "Colours" or "Look", and the legend staying where it is. I'd also want the legend to show all the groups, not "6 more".

**recipe-recipient:** Elena's right, there are too many places to look. I've seen "Styles" on the left, "Style stack" on the right, and then "Appearance" once you click a dot. For me that's three names, and I can't tell if they're the same thing. I wouldn't touch any of them. It's her file, and I'm not the one who styles it.

The researcher said "6 more" in the corner hides groups, and I agree. If the key only shows half of it, the PI asks me about the other half and I've got nothing to say. "Top wins" means nothing to me. It sounds like the file can change on its own.

On the rail, I still don't know what "Results" is the results of. "Nothing is sent" is the line I care about most, and it only sits next to the assistant. Does it cover my hits too, or only the chat?

What would make me quit: I drop my list on it, the colours don't come back like last month's slide, and I can't tell if I broke her file. If that happens twice, I'll ask her to just send me a PNG.

**screen-reader-analyst:** Elena says there are too many places to look. For me it's worse than that, because I can't look at all. I have to know which place my focus is in. The bioinformatics researcher asked what Size is beating Group color at, and that's my question too. If two rows paint different things, then "top wins" only means something per property. So have it tell me per property: "Color: Group color, row 1, wins over Base style." Don't give me a list order and leave me to work it out.

The recipe recipient's legend reads "2, 8, 4, 1, 3". Through my reader that's just a row of numbers with no names. "6 more" tells me there are six more things I can't reach. Give me the legend as a table I can arrow through.

Here's what would make me quit. Pressing Tab from the canvas lands me somewhere I can't name. Or the heading switches between Style stack and Appearance without saying anything. Or I pick a node and lose my place in the stack. I would stay if I could press one key on a node and hear which rows paint it, in order, and then press Escape and be back on that node.

## Summary of themes

Severity uses Nielsen's scale: 4 catastrophe, 3 major, 2 minor, 1 cosmetic. Counts are of
participants who raised a point in round 1, alone; agreement added in round 2 is shown
separately because round 2 opened with every speaker echoing the first complaint.

### 1. Style controls appear in more than one place, and nobody could say which one is real (severity 3)

- Round 1, unprompted: genomics-cytoscape-user ("where do the colours actually live, left or
  right?"), explorer-elena ("two sidebars... too many places to look"), bioinformatics-researcher
  (implicitly: the right-side list is "the same list under a new name"). 3 of 5.
- Round 2: all five agreed.
- Evidence of behaviour, not just opinion: the genomics user said "What I actually did: I looked
  on the left." A Cytoscape habit sends switchers to the left list first; if the answer is on the
  right, they fail and start distrusting the colours.
- Caution: participants saw different variants (styles left in some, "Style stack" right in
  another), so part of the "three names" count is the study showing three frames. The underlying
  finding still holds within each variant: colour on one side, Background and Layout on the
  other.

### 2. The right-hand heading changes from "Style stack" to "Appearance" when a node is selected (severity 3)

- Round 1: bioinformatics-researcher (saw it), screen-reader-analyst (was told of it). 2 of 5.
- Round 2: explorer-elena ("I thought I'd opened a different menu"), recipe-recipient.
- For the screen-reader analyst this is severity 3 on its own: a heading that changes silently
  with the selection means focus lands in an unnamed or renamed place. Recommendation: one name
  for one list, whatever is selected; announce the change of scope, not a change of title.

### 3. Selecting a node should say, in words, which rule set each property and from which column (severity 3)

- Round 1: screen-reader-analyst ("row 2 of 4, paints color, wins"). 1 of 5.
- Round 2: bioinformatics-researcher ("which rule set its colour and from which column"),
  genomics-cytoscape-user ("colour from Module color, column: module"), explorer-elena ("Orange
  because of Group color"). 4 of 5 by the end.
- This is the constructive answer to theme 1: the explanation sits beside the selection, so it
  does not matter as much which sidebar holds the list. It must be per property, not per list
  (see theme 4), and in text rather than a highlight.
- Discount somewhat: it began as one voice and spread in the discussion. But three people arrived
  at it from different needs (citing a figure, debugging a mapping, a plain "why is it orange"),
  which is better support than simple echoing.

### 4. "Top wins" does not say what is winning (severity 2)

- Round 1: bioinformatics-researcher ("Size: degree beats Group color? Those set different
  things"), screen-reader-analyst ("top of the list, or of a paint order I can't see?"). 2 of 5.
- Round 2: genomics-cytoscape-user, explorer-elena, recipe-recipient ("sounds like the file can
  change on its own").
- Everyone who tried read it correctly as layer order, like Illustrator or Slides. The gap is that
  precedence only matters per property, and the list does not show which properties each row
  writes. Resolve by showing precedence per property (theme 3), not by explaining the stack.

### 5. The legend hides categories and shows bare numbers (severity 3 for figure makers)

- Round 1: bioinformatics-researcher ("6 more" hides six of ten groups), recipe-recipient
  ("Group color 2, 8, 4, 1, 3 -- groups of what?"). 2 of 5.
- Round 2: genomics-cytoscape-user (dealbreaker if modules are missing from the PDF),
  explorer-elena, screen-reader-analyst (wants it as a table to arrow through).
- The bare numbers are partly the demo data: Les Miserables groups are numbered in the source.
  The genomics variant showed named modules with counts and drew no complaint. The durable
  findings are: exported legends must be complete, and the legend must be reachable as a table.
- Praise inside the complaint: four of five wanted the on-canvas legend kept.

### 6. Unfamiliar style vocabulary: "Look: Screen", "Base style", "stack" (severity 2)

- bioinformatics-researcher ("Look: Screen, I have no idea"), explorer-elena (would quit if she
  must learn these words first). 2 of 5.

### 7. "Nothing is sent" is valued, but its scope is unclear, and the Assistant entry reads as a warning, not a control (severity 2)

- Read as a warning rather than a button: genomics-cytoscape-user, explorer-elena. 2 of 5.
- Wanted it to cover the whole project, not just the assistant: recipe-recipient (round 1 and 2).
- Positive: bioinformatics-researcher, screen-reader-analyst, recipe-recipient all valued it.
- Not the topic of this group; carry to the privacy material.

### 8. "Results" does not say what it holds before anything has run (severity 2)

- explorer-elena, recipe-recipient (both rounds), genomics-cytoscape-user guessed correctly. Only
  in the variants that showed a Results entry.

### Minor or single-voice (severity 1 to 2; do not act on these alone)

- Colour-blind-safe defaults and visible hex values for imported palettes
  (bioinformatics-researcher, genomics-cytoscape-user). Two voices, but a real accessibility
  requirement; check it against the palette defaults rather than this group.
- No obvious way to drop isolates; "Confidence not used yet" does not name the cutoff
  (genomics-cytoscape-user).
- "Data" rail entry versus the table already at the bottom (bioinformatics-researcher).
- Statistics mean nothing to a non-specialist (explorer-elena, recipe-recipient), while they are
  the first thing the researcher looks for. Audience difference, not a defect.
- Keyboard path canvas to style list and back, with Escape returning to the node
  (screen-reader-analyst). One voice, but it is an accessibility basic; treat as a requirement to
  verify, not an opinion.

### What they praised (keep these)

- The on-canvas legend (four of five).
- A flat, still, readable default picture (genomics-cytoscape-user, explorer-elena).
- Rail labels a screen-reader user could name without explanation (screen-reader-analyst).
- "Nothing is sent" (three of five).

## Agreement and dissent

- Broad agreement: themes 1, 3 and 5.
- Dissent on ownership: the recipe recipient does not want to touch styling at all ("it's her
  file"). For her the need is not one style place but a guarantee that dropping a list on the
  file does not change its colours, and a way to tell whether she broke it. This is a different
  requirement from the others' and should not be folded into theme 1.
- Dissent on the fix: Elena wants a plain "Colours" or "Look" button; the genomics user wants one
  "Style" place matching Cytoscape; the screen-reader analyst wants per-property announcements on
  the node. These are compatible but not the same design; do not read "one place" as a single
  agreed solution.
- Statistics: the researcher reads them first; Elena and the recipe recipient want them out of
  the way.

## Group-think effects to discount

- Round 2 opened with four of five speakers explicitly echoing Elena's "too many places to look"
  ("She's right", "I'm with Elena", "Elena's right", "Elena says"). Round-1 support for theme 1
  is three of five; the unanimity is conformity and should not raise its weight.
- Theme 3 (explain the colour on the node) was one voice in round 1 and four by the end. Some of
  that is adoption of a good idea, some is echo. Test it directly: give participants a wrongly
  coloured node and measure whether they find the cause, with and without a per-node explanation.
- The recipe recipient's "three names" count ("Styles", "Style stack", "Appearance") includes
  names she heard from others in the discussion rather than saw herself.
- Mock-fidelity artifacts to discount: the pink demo bar ("8 Assistant on", "B: empty at rest")
  that Elena rightly ignored; numbered Les Miserables groups driving "groups of what?"; and the
  fact that participants saw different frame variants, which inflates the apparent number of
  style locations.
- Stated preference versus behaviour: only the genomics user reported what they actually did
  (looked left). Everything else is opinion about a static frame. A first-click test on "change
  the colour of this group" and "why is this node this colour" would give behavioural evidence.
