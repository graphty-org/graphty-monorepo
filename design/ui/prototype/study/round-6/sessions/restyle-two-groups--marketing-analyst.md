# Session: fix two groups drawn in colors you cannot tell apart -- Jordan (marketing network analyst)

Participant: Jordan, growth-marketing analyst who "does the network stuff" one or two days a week. Gephi (Partition colors), NodeXL and a listening suite before this. Her pictures end up on projectors and in decks printed in gray. Played at laptop width (1440 x 900).
Task given by the moderator: "Two of the groups are drawn in colors you cannot tell apart. Fix that so a colleague can read the picture."
Screens used, in order: the app at rest (Les Miserables co-appearances, colored by "Group color"); the color-by-value page's "change a color from the legend" state (protein network, picker open beside the legend); the "recolor a group on a run's layer" state (Louvain communities); the "Categories: one color per value" state (value list and a row's menu); the Style stack with a layer editor open, and its Libraries tab; the Look menu (Screen, Print, High contrast); the inspector at rest and with a result's menu open.

Renders she looked at (all in shots/): r6-jordan-restyle-frame-at-rest.png, r6-jordan-restyle-cbv-legend.png, r6-jordan-restyle-cbv-run-colors.png, r6-jordan-restyle-cbv-categories.png, r6-jordan-restyle-styles-list.png, r6-jordan-restyle-sl-libraries.png, r6-jordan-restyle-sl-looks.png, r6-jordan-restyle-inspector.png, r6-jordan-restyle-insp-style-by.png.

Outcome: completed, with some difficulty. This time the thing she tried first -- clicking the color square in the legend -- is the thing that works: it opens the color picker next to the legend, with the colors the layer is not using listed first, and a notice with Undo says what changed. What still cost her: on the Les Miserables screen the legend squares look exactly like plain text, so she only learned they were clickable from the protein screen; the picker offers exactly one unused color and nothing tells her whether it will separate her two groups on a projector or in gray print; the "Too close" warning only appears after she picks, and the "Fix..." link beside it leads nowhere she can see. Single Ease Question: 5 of 7.

## Transcript (think-aloud)

**1. Which two?** (the app at rest, Les Miserables)

"Les Mis again. Legend bottom left: Group color, 2, 8, 4, 1, 3, 5, 0, Other. Other's light gray now, not dark gray -- good, because last time 0 and Other were going to be one blob in a gray printout. Somebody fixed that. Noted.

Same two as last time, though. 2 is the orange round Valjean and Cosette, 3 is the redder orange up top round Fantine. On my laptop, fine, I can tell them apart. On the conference room projector those are both 'orange', and they're connected, the Fantine bunch runs straight into Valjean's. 8 and 1 are both blues -- light blue at the bottom with Marius, darker blue top right with Myriel -- but they're at opposite corners so people can guess from position. I'm doing 2 and 3."

**2. Where do you change a color?** (the app at rest)

"Gephi habit: click the color square next to the value. So -- legend, the square next to '3'.

Looking at it, it doesn't look clickable. No border, no little arrow, the square's the same size as the text, it's just a key. Same as last time. If I hover maybe it does something, but nothing on this screen tells me. On the right, Style stack, 'Group color' -- that's my fallback, I know from last round that the list of groups is buried in there somewhere.

And the palette icon up by 'Graph'. Still no word next to it. I learned last time that's 'Look'. I'm not going there first."

**3. The legend swatch opens a picker** (color-by-value, "change a color from the legend", protein network)

"[Moderator moves her to the protein screen with the picker open.] Oh -- OK. So the square in the legend IS a button. You click it and the picker opens right there next to the legend. Proteasome's square has a ring on it so I know which one I'm editing. That's what I wanted last round. That's literally the Gephi move.

Picker: Custom and Libraries tabs, the gradient square, a hex box -- good, I can paste our brand hex, that's what I'd actually do. Under the hex it says in words 'Light blue, picked for Proteasome'. I like that it says it in words, I can say 'light blue' in a meeting, I can't say 4AA3DF.

Then 'Not used in this layer' with one orange square, and 'Used in this layer' with the rest. That's the thing I complained about last time, that every swatch was already some other group. Now it tells me which ones are free. Only one's free here, which is honest, eight groups, eight colors.

In this picture she, whoever she is, picked light blue for Proteasome, and the legend's flagged it: 'Too close to Ribosome's sky blue. Fix...'. OK, that's nice, the tool catches you making the exact mistake the task is about. And there's a black bar at the bottom: 'Proteasome is now light blue, was orange. Too close to Ribosome. Undo.' Undo right there. Good. That's the kind of thing that stops me being scared of clicking.

'Fix...' -- what does Fix do? Pick a color for me? Open the picker again? It's a link with dots so it probably opens something, but I don't get to see what. I'd click it, I think. I'd want it to just give me a color that works and show me."

**4. Doing it for my two** (thinking it through on Les Mis)

"So on my picture: click the square next to 3, picker opens, look under 'Not used'. Les Mis uses orange, sky blue, green, blue, vermilion, pink, black -- that's seven, so the free one is probably the yellow I can see on the protein map. Yellow. For Fantine's lot. On a white slide. In a gray printout yellow is basically white. I would not pick yellow. I'd type our brand purple in the hex box instead.

And here's the thing: the tool warns me if I pick something too close. But the two colors I'm complaining about aren't ones I picked -- they're the ones it gave me. Nothing on the Les Mis screen says '2 and 3 are too close'. Only the colors you pick get checked. So I have to already know there's a problem, which, fine, I do, that's why I'm here. But my colleague who made the map in the first place wouldn't have been told."

**5. Checking it also works for clusters I ran** (color-by-value, Louvain communities)

"This one's more my real life -- 'Louvain color', Community 1 to 8. Community 8 got changed to dark gold from its legend square, and the note says 'Kept when Louvain runs again'. That is a real thing. In Gephi you rerun modularity and your colors are gone and your slide doesn't match the old slide. And on the right: 'A color you pick in it is kept for its community, and a re-run keeps it.' Fine. I'm a bit suspicious -- if the rerun reshuffles who's in Community 8, is it still 'the same' community? It doesn't say. But for this task, fine.

Dark gold next to orange Community 1, though. Those are close-ish too. No warning here. Maybe it's fine on screen."

**6. The other route, for the record** (Categories: one color per value; the Style stack)

"The long way is still there: layer, then the editor, then the list of values, then a row's menu with Change color, Move to Other, Select nodes, Create set. Still no visible dots on the row to show there's a menu. But I don't need that route anymore, the legend one's quicker. Good that 'Move to Other' is there for a tiny group.

The Libraries tab in the stack: Okabe-Ito 'categories', and three ramps. Still only one palette for groups, and I'm pretty sure it's the one I've already got. So if I wanted 'a different set of eight' there isn't one. Not a blocker, I'm changing one color, not all of them."

**7. The Look shortcut** (Look menu)

"Look for the whole project: Screen, Print, High contrast. Print: 'Reads in gray on white paper and for color-blind readers.' My deck gets printed in gray. So in theory Print is the actual answer to my problem, not fiddling one color. But does Print give 2 and 3 different grays? It talks about 'where a color shows a direction, a shape shows it too' -- my groups aren't a direction. Still no preview. I'm not switching the whole project blind before a QBR. 'Colors you set by hand are kept' -- so if I do both, my purple survives. OK.

Also -- this menu says 'Screen'. In the inspector the same dropdown says 'Default'. On the Les Mis screen the tooltip said 'Look: Default'. Is Default Screen? Probably. Pick one word."

**8. Checking the result** (inspector, at 1440)

"If I changed it, I want the dots, the legend and the table to match. The legend obviously follows because I did it in the legend. The Style stack in the inspector lists Ribosome, Proteasome, Complex I with their squares, so that's the same list. I'm assuming the table's module column follows like it did on the categories screen.

And the inspector is still cut off on the right on my laptop. 'Change..', '0.028', 'undirecte', '56' with the next digit missing. That was there last time too. If I can't read the counts I'm not trusting them. That's just sloppy.

One more: the groups on my map are still called 2, 8, 4, 3. I just fixed the color, and the legend on the slide still says '3'. The VP will still say 'what's 3?' If I could rename 3 to 'Fantine's circle' right where I changed the color, that's the actual fix. I don't see a rename."

**9. Off topic**

"Our listening suite's cluster map -- you can't change the colors at all. Locked to their palette. Last board deck, two segments were teal and slightly different teal, VP asked 'which teal', I ended up drawing boxes over it in PowerPoint. And they still don't have Instagram half the time, so the map's half the story anyway. This at least lets me fix the picture instead of covering it up."

## Single Ease Question

5 of 7. "Click the square in the key, pick a color, done, with an undo. That's what I asked for last time and it's there. It loses points because on my actual Les Mis screen the square doesn't look clickable, the only free color it offers is yellow, it only warns me about colors I picked and not the two it gave me, and I don't know what 'Fix...' does."

## Would she use this instead of her current tool?

"For this bit, yes, over the listening suite, which won't let me touch its colors at all -- and about level with Gephi, which is also click-the-square. What would tip it: keeping my picked colors when I re-run the clusters, that Gephi doesn't do, and the key coming from the same list so I don't redraw it in PowerPoint. What would stop me: if I can't rename '3' to something a VP can read, I'm still putting text boxes on the slide. And fix the cut-off panel on a laptop."

## What she did, step by step

1. Picked groups 2 and 3 (orange and vermilion, adjacent on the map) as the pair she could not tell apart on a projector; noticed that Other is now light gray and no longer merges with group 0 (black).
2. Went for the legend square next to group 3; on the Les Miserables screen it showed no sign of being clickable, so she named the Style stack's "Group color" as her fallback.
3. On the protein screen, found that the legend square is a button that opens the color picker beside the legend, with the edited swatch ringed.
4. Read the picker: hex box (would paste her brand color), the color named in words, "Not used in this layer" first, "Used in this layer" after; noted only one color is free.
5. Read the "Too close to Ribosome's sky blue. Fix..." flag and the notice with Undo; could not tell what "Fix..." does.
6. Worked out that on Les Miserables the only free color would be yellow, which she rejected for white slides and gray print; would type a brand hex instead.
7. Noticed that the default pair she is complaining about is never flagged; only colors a reader picks are checked.
8. Saw on the Louvain screen that a picked community color is kept when Louvain runs again; questioned whether "the same community" survives a re-run.
9. Confirmed the longer route (layer, value list, row menu) still exists but did not need it; the Libraries tab still has only one palette for groups.
10. Considered the Print look as a whole-project fix; could not tell whether it separates two groups, and wanted a preview.
11. Tried to confirm the result in the inspector; found its right panel cut off at 1440 wide, and group names still raw numbers with no rename beside the color.

## Problems observed

- On the Les Miserables screen the legend squares show no sign of being clickable (no border, no hover hint in the picture), while on the protein screen the same squares are buttons that open the picker. She only learned the move from the second screen.
- The picker's "Not used in this layer" row offers a single color when a layer uses seven of eight; on Les Miserables that color is yellow, which she rejected for white slides and gray print. Nothing says whether a candidate color is distinct from its neighbors on a projector or in gray.
- The "too close" check only runs on colors the reader picks. A pair the default palette itself produces (her orange and vermilion) is never flagged, so the colleague who made the map first is never told.
- The "Fix..." link on the too-close flag has no visible outcome; she guessed it might pick a color for her.
- A picked color (dark gold for Community 8) sits next to an orange community with no warning, although it is as close as the pair she started with.
- "Kept when Louvain runs again" does not say what happens if a re-run changes which members make up that community.
- The Libraries tab still offers only one palette for groups, apparently the one already in use.
- The Look menu's Print option does not say whether it separates two category colors, and there is no preview before switching the whole project.
- The same Look control is called "Screen" in one place and "Default" in two others (the inspector's select and the unlabeled icon's tooltip on the app at rest).
- The value row's menu (Change color, Move to Other, ...) still has no visible handle.
- At 1440 x 900 the inspector's right panel is still cut off at the edge: numbers and words are truncated.
- Group names are still the raw numbers from the data; there is no rename beside the color, so the legend on the slide still reads "3".
