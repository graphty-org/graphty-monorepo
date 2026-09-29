# Session: fix two groups drawn in colors you cannot tell apart -- Jordan (marketing network analyst)

Participant: Jordan, growth-marketing analyst who "does the network stuff" one or two days a week. Gephi (Partition colors), NodeXL and a listening suite before this. Her pictures end up on projectors and in decks printed in gray. Played at laptop width (1440 x 900).
Task given by the moderator: "Two of the groups are drawn in colors you cannot tell apart. Fix that so a colleague can read the picture."
Screens used, in order: the app at rest (Les Miserables co-appearances, colored by "Group color"); the Style stack with a layer's editor open and its scale popover; the "Categories: one color per value" state of the color-by-value page (value list and a row's menu); the color picker (Custom and Libraries tabs); the Look menu (Screen, Print, High contrast); the inspector with a protein network colored by module.

Outcome: completed, with difficulty. She found "Change color..." on a value row's menu, but only on the protein page, three levels under the layer, and only after first trying to click the legend swatch and then the unlabelled palette icon. No screen shows what "Change color..." opens or what the picture and legend look like afterwards, so she assumed it opens the color picker and chose a color from the swatch row. She also tried the Print look as a shortcut and could not tell whether it would separate her two groups. Single Ease Question: 3 of 7.

## Transcript (think-aloud)

**1. Which two?** (the app at rest, Les Miserables)

"OK. Les Mis, fine, I know this one from the Gephi tutorials. Legend bottom left says 'Group color', 2, 8, 4, 1, 3, 5, 0, Other.

First thing -- the groups are numbers. 2, 8, 4. That's not a segment name, but whatever, that's the data.

Which two can't I tell apart. Group 2 is this yellowy orange in the middle round Valjean and Cosette, and group 3 is the darker orange up top round Fantine. On my laptop, OK, I can see it's two oranges. On the conference-room projector those are going to be one orange, I promise you. And 1 and 8 are both blue -- dark blue top right with Myriel, light blue bottom with Marius. The blues are further apart on the map so people can sort of guess from position. The oranges touch. Fantine's lot and Valjean's lot are literally connected. I'm doing 2 and 3.

Also, while I'm here: 0 is black and 'Other' is dark gray. In a gray printout those are the same thing. Not my task. Noting it."

**2. Where do you change a color?** (the app at rest)

"In Gephi I'd go to Partition, pick the attribute, and click the little colour square next to the value. So my first move is -- the legend. I'm clicking the orange square next to '3' in the legend.

...Nothing. [reads the page: the legend rows are plain text, not controls] OK, so the legend is just a picture. That's a shame, it's the one place that has the colors and the names together.

Next. Right panel, 'Style stack'. 'Group color', 'Base style'. That's obviously the thing. I'll click 'Group color'.

Also there's a little palette icon at the top next to 'Graph'. Hover says 'Look: Default'. Look? I don't know what a Look is. It's a palette icon though, and I want to change a palette. Let me come back to that."

**3. The layer editor** (Style stack with a layer open)

"[Moderator points her at the styles page, a layer's editor open.] So clicking the layer opens this card -- 'Applies to', 'Fill', 'Color', and then a chip with the thing it's colored by, and a little sliders icon next to it. Nothing here is a list of groups. It says 'paints 300 of 300'. Great, but where are my groups?

I guess the sliders icon. That's the 'settings' icon in every tool. Clicking.

OK, a second card pops out beside the first one. Scale, Palette, and then a histogram. This is the numbers one. I'm on a number column here, so I'd expect for groups it'd list the groups. That's two popovers stacked on each other already and I haven't changed anything."

**4. The value list** (color-by-value, "Categories: one color per value")

"There. 'Module as color'. Scale: one color per value. Palette: 'Eight distinct colors'. Then 'Values, largest first' with each group, its swatch and its count. Yes. This is the Partition panel. Good.

Now, click the swatch. [The mock shows a row's menu already open: Change color..., Move to Other, Select nodes, Create set.] OK so it's not click-the-swatch, it's a menu on the row. How did I open that menu? Right-click? There's no little dots on the row, nothing says 'click me'. I'd have hovered and clicked the swatch and hoped. If it's right-click only I wouldn't have found it, honestly -- I don't right-click in web apps, half of them give you the browser menu.

'Change color...'. That's what I want. I click it. And -- there's no next screen. I don't know what opens. I'm going to assume it's the same colour picker I saw somewhere else in these mocks, the one with the gradient square and the row of swatches.

'Move to Other' -- fine, that's kind of clever actually, for a tiny group. Not now.

Also: this is the protein page. My Les Mis groups would be here too, I'm assuming, but I had to be moved to a different dataset to see it. From the Les Mis screen I never got here on my own."

**5. The color picker** (Custom and Libraries tabs)

"Custom: big gradient square, hue slider, a hex box, and a row of nine swatches along the bottom. The swatches are the same eight colors the graph already uses, plus gray. So if I pick from those I'm just picking another color that's already a group. Which is the problem I started with -- there's no free color. If group 3 goes to, like, the pink, then it's the same as group 5.

The gradient square -- I'm not a designer. I'd drag somewhere into a purple and hope. Or I'd go get the hex from our brand guide, which is what I actually do in PowerPoint: our brand purple is a code I know by heart.

Libraries tab: Okabe-Ito, 'categories'. Orange to brown, Viridis, Blue to red. I've heard Viridis is the colour-blind one from a blog. Okabe-Ito I've never heard of. It has 'categories' next to it so that's probably the one for groups -- but is that what I already have? The chits look like the same orange, sky blue and green. I think I already have it. So Libraries doesn't give me an alternative for groups at all, just ramps for numbers.

And the other thing: this picker is open on 'TP53 (the selection)' in that screen. Changing a colour in there makes a new layer for one protein. That's not what I want -- I want the whole group, and I want the key to change. If I came in through the selection, I'd have made a one-off override and the legend would still say orange. I only trust the route through the value list because the legend and the list are the same list."

**6. Shortcut attempt: the Look** (Look menu)

"Let me go back to that palette icon thing. On this page it's actually labelled: 'Look' then a dropdown saying 'Screen', right on the Style stack header. On the Les Mis screen it was just an icon with no word. Two different places for the same thing; the labelled one is better.

Menu: Screen -- 'the palettes each layer chose'. Print -- 'reads in gray on white paper and for color-blind readers. Where a color shows a direction, a shape shows it too.' High contrast -- 'every color clears 3:1 against the canvas'.

Print sounds like what I want, because my deck gets printed in gray anyway. But 'where a color shows a direction' -- my groups don't have a direction, they're groups. So does Print do anything for groups 2 and 3, or not? It doesn't say. And High contrast is against the canvas, not against each other, so that won't split two oranges either. I'd try Print, look, and if it didn't fix it I'd go back to Screen. That's fine as long as it's undoable -- 'Colors you set by hand are kept' at the bottom tells me it won't wipe my manual changes, which I appreciate, that's the kind of thing Gephi never tells you.

But I'd want a preview. Hover over Print, show me the picture in Print. I'm not going to switch the whole project blind, the week before a QBR."

**7. Checking the result** (inspector, protein network colored by module)

"If I'd changed the color, I'd want to see three things: the dots, the legend and the table, all the new color. On the categories screen the table has a 'module' column with the colour chips, so I'm assuming that follows. The canvas legend and the layer row in the Style stack both list the groups too, so hopefully those all update. No screen shows me 'after', so I'm taking that on faith.

Side note -- this inspector view is cut off on my screen. The right panel runs off the edge: 'Ribosome 5-', 'Change..', 'undirecte-'. At 1440 wide. That's my laptop. If the counts in the panel are cut in half I'm not reading them.

And the groups here have real names -- Ribosome, Proteasome -- whereas my Les Mis groups were 2, 8, 4. If I could rename '3' to 'Fantine's circle' in the same list where I change the colour, that would be the actual fix for 'what's orange?' in the meeting. Nobody in a VP review is going to learn that 3 is dark orange."

**8. Off topic**

"Honestly half of why this matters is that our listening suite's cluster map is locked to their palette and you can't touch it. We had a board deck where the two biggest segments were teal and slightly-different teal. The VP asked which teal. I had to redo it in PowerPoint with shapes on top. So yes, I care about this, I just want it to be one click, not four."

## Single Ease Question

3 of 7. "The right control exists -- a list of groups with a Change color on each. But it's three layers under the layer, it's on a menu with no visible handle, the legend you'd naturally click does nothing, and I never saw what happens after I click Change color. Gephi: click the square, pick a colour, done."

## Would she use this instead of her current tool?

"For this task, no -- Gephi's Partition panel or just drawing over it in PowerPoint is quicker today. I'd keep going with it for the rest of the job if the table and export are good, because the fact that the legend comes from the same list as the colours means I wouldn't have to re-draw the key in PowerPoint, and that's the thing that actually costs me. Make the legend swatch clickable, and put a preview on the Print look, and I'd switch for this bit too."

## What she did, step by step

1. Picked groups 2 and 3 (two oranges, adjacent on the map) as the two she could not tell apart; also noticed group 0 (black) and Other (dark gray) would merge in gray print.
2. Clicked the legend swatch for group 3 -- nothing (the canvas legend is not a control).
3. Noticed the unlabelled palette icon ("Look: Default") on the Graph header; did not know what a Look was.
4. Opened the "Group color" layer in the Style stack; found no list of groups in its editor.
5. Opened the sliders icon beside the binding; found the value list ("Values, largest first") with swatches and counts.
6. Found "Change color..." on a value row's menu, but could not see how that menu opens (no visible handle on the row).
7. Assumed "Change color..." opens the color picker; found the swatch row offers only colors already used by other groups; would type a brand hex code instead.
8. Tried the Look menu as a shortcut; could not tell whether Print or High contrast separates two category colors; wanted a preview before switching.
9. Could not verify the result: no screen shows the picture, legend and table after a color change.

## Problems observed

- The canvas legend is the first thing she tried to click to recolor a group, and it does nothing. It is the only place that shows each group's color and name together on the canvas.
- Changing one group's color is three levels deep: the layer row, then its editor, then the sliders icon, then a value row's menu.
- The value row's menu has no visible handle; she could not tell how to open it and would not have tried right-click.
- No screen shows what "Change color..." opens, or the picture, legend and table after the change.
- The picker's swatch row only offers the eight colors the groups already use (plus gray), so every swatch collides with another group; there is no suggested free color.
- The Libraries tab has one categorical palette, apparently the one already in force, so it offers no alternative for groups.
- Recoloring from a selection makes a one-off layer for the selection, not a change to the group's color, and the legend does not follow; nothing warns her of the difference.
- Print and High contrast do not say whether they separate two category colors from each other; there is no preview before switching the whole project.
- The Look control is an unlabelled palette icon on the app at rest but a labelled "Look" select on the Style stack header elsewhere.
- Group 0 (black) and Other (dark gray) are hard to tell apart and would merge in gray print.
- Group names are the raw numbers from the data (2, 8, 4); there is no rename beside the color, so "what's orange?" would still be asked.
- At 1440 x 900 the inspector's right panel is cut off at the edge (counts and labels truncated mid-word).
