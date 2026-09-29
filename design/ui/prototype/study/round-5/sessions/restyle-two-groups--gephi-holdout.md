# Session: two groups drawn in colors you cannot tell apart -- Mara (Gephi holdout)

**Participant:** Dr. Mara Lindqvist (fictional), associate professor, Gephi user since 0.8, teaches
it every year. Not color-blind; teaches students who are.
**Task as given:** "Two of the groups are drawn in colors you cannot tell apart. Fix that so a
colleague can read the picture."
**Screens worked through:** the app at rest on Les Miserables, the Styles list and layer editor, Color
or size by a value, the Inspector.
**Renders she looked at** (all in `shots/`, as a participant sees them, design notes hidden):
`r4-mara-restyle-frame-at-rest.png`, `r4-mara-restyle-styles-list.png`,
`r4-mara-restyle-sl-authored.png`, `r4-mara-restyle-sl-add-to-selection.png`,
`r4-mara-restyle-sl-libraries.png`, `r4-mara-restyle-sl-looks.png`,
`r4-mara-restyle-cbv-categories.png`, `r4-mara-restyle-insp-style-by.png`.

---

## 1. The app at rest (Les Miserables)

> "Oh, Les Miserables. That is the Gephi sample file. Seventy-seven characters, two hundred and
> fifty-four edges -- yes, Nodes 77, Edges 254, that matches. Good, at least I know what the
> picture should look like."

> "Legend bottom left: 'Group color', then 2, 8, 4, 1, 3, 5, 0, Other. So these are the group
> numbers from the file, like modularity classes. Numbers, not names. Fine, that is what Gephi
> gives me too."

> "Which two can I not tell apart... Let me look at the canvas, not the legend. The legend puts
> the squares next to each other, so of course they look different there. On the map: the black
> ones at the top, the chain of three going up from Valjean, and the one alone at the bottom --
> those are group 0. Then the dark grey ones on the right, out past Gavroche, and the one on the
> left -- those are 'Other'. At this node size, on a projector, black and that charcoal grey are
> the same dot. My students in the back row would swear it is one group."

> "Second candidate: 2 and 3, the orange and the red-orange. Valjean's cluster and Fantine's
> cluster. On my screen I can tell them apart, but I know that pair -- that is the orange and
> vermilion from Okabe-Ito, and they are the weakest pair in it. I will fix the black and grey
> first, that is the one I actually cannot read."

> "Also, 'Other' is groups I cannot see. Which groups? Five nodes. It does not tell me which
> classes went in there. In Gephi the partition list shows every class. If I am going to hand this
> to a colleague and they ask 'what is Other', I have no answer from the picture."

**First move:** she moves the pointer to the legend on the canvas and clicks the black square next
to "0".

> "I want to click the square. In Gephi I click the little color square in the partition list and
> the color chooser opens. Here... nothing on this picture tells me the legend is clickable. It
> looks like part of the drawing, it is on the canvas. I would click it anyway. If nothing
> happens, I go to the panel."

(Nothing in the mock shows the legend responding to a click; she takes that as "no".)

**Second move:** the right-hand panel.

> "Right side. Graph, Background, Layout, Statistics -- that is my Overview panel and my
> Statistics panel in one column, fine. 'Style stack'. Two rows: 'Group color' and 'Base style'.
> The little icon next to Group color has the colors in it. That is the partition. That is my
> Appearance panel, I suppose. I click 'Group color'."

> "There is also a palette icon up at the top next to 'Graph'. That might be it too. I will try
> the row first because it says 'color' in words."

---

## 2. Looking for what "Group color" opens (Styles list and layer editor)

> "The screen you give me now is a different network. Proteins, not Les Miserables. OK, I will
> pretend. So this is what the editor looks like when I click a row in the stack."

Looking at the layer editor for "Size: degree" and for "Betweenness color":

> "A floating panel. 'Applies to: All proteins'. 'Fill', 'Color', and in the color box a little
> chip that says 'betweenness'. And next to it an icon with sliders. The chip is the attribute it
> is colored by. The sliders icon is -- probably the settings of the mapping. In Gephi those are
> the same screen: Partition, choose the attribute, and the list of values with colors is right
> there underneath. Here it is one more click away. I click the sliders."

> "For betweenness that opens 'Betweenness as color': scale, palette, a histogram. Read only,
> because a run made it. OK. So for my Group color layer, I expect the same thing but with a list
> of groups. I will look for that."

> "'Edit a copy' -- if a run wrote the layer I cannot touch it and I edit a copy. My Group color
> layer is not from a run, so I hope that does not apply. It does not say."

---

## 3. The list of values (Color or size by a value, "Categories")

> "This is it. 'Module as color', 'one color per value', 'Palette -- categorical, 8 colors: Eight
> distinct colors', and then every value with its swatch and its count, largest first. That is the
> Gephi partition list. Good. That is exactly where I would expect to be."

> "Ribosome sky blue, Spliceosome dark blue... MAPK signaling black, and 'Other: Unassigned' in
> that charcoal. Look at that -- same problem on this one, black and charcoal. So it is not just
> my file. The palette puts black next to the grey it uses for Other. Somebody should have caught
> that."

> "Someone has right-clicked -- or clicked -- a row and there is a menu: 'Change color...', 'Move
> to Other', 'Select nodes', 'Create set'. 'Change color...' -- that is what I want. I pick group
> 0, the black one, and Change color."

> "Although. Why is there a menu at all? I would expect to click the swatch itself. Maybe I can.
> The swatch looks like a swatch. I would try clicking the square first, and if that does nothing,
> I would find this menu. It took me a moment to see 'Change color' was the first item because the
> highlighted one is 'Move to Other'."

> "And how did I get to this popover in this picture? The table is open underneath and it points
> at the 'module' column header. So you can get here from the column in the table too. Fine, two
> doors. I only need one."

> "'Move to Other' -- interesting. So I could shove a group into grey. No, I do not want to hide
> group 0, it is a real group. Though for 'Unassigned' that is exactly right, and Gephi cannot do
> it. That one I like."

---

## 4. The color picker

Looking at the picker (Custom and Libraries tabs):

> "A square picker, hue bar, alpha bar, 'Hex' with a box, and a row of swatches at the bottom:
> orange, sky blue, green, blue, vermilion, pink, black, yellow, grey. That is Okabe-Ito plus a
> grey. Good, somebody knows what they are doing. I can type a hex, that is what I do in Gephi when
> I match a colleague's figure."

> "Which color do I give group 0? The palette has eight colors and my legend uses seven of them.
> Yellow is free. So why is black used and yellow not? Maybe yellow was skipped because it is
> faint on the light background. Probably right -- yellow on light grey is hard. But I do not want
> black and charcoal either."

> "I have two honest options. Change 'Other' to a light grey, like #BBBBBB, so 'Other' reads as
> background, which is what it is. Or change group 0 to something that is not dark. I will do
> Other to light grey -- that is what I would do in Gephi, grey out the leftovers -- and leave 0
> black. Black and light grey: nobody confuses those, on paper or on a projector."

> "But wait -- 'Other' is not a group I can click to open, is it? In the list it is a row like the
> others, 'Other: Unassigned', with a swatch. I assume it has the same menu. If Other cannot be
> recolored I would go the other way and give group 0 yellow with a darker outline. The mock does
> not show me which."

> "'Libraries' tab: Okabe-Ito, Orange to brown, Viridis, Blue to red. I know those. If the whole
> palette were wrong I would swap it here. It is not, it is only one pair."

**Result she believes she reached:** Other recolored to a light grey through the value row's
"Change color...", hex typed; group 0 kept black. The legend on the canvas would follow, because
the legend is drawn from the same layer. She says she would check that by looking, since she
cannot see it in the mocks.

---

## 5. Checking it will stay fixed

> "Now my real question. I set a color by hand on group 0 or on Other. What happens when I rerun
> the community detection? In Gephi the class numbers are arbitrary. Group 0 today is group 4
> tomorrow. If this app keeps my color on the number '0', then after a rerun my black goes to a
> different community and my figure is quietly wrong. Nothing on these screens tells me whether
> the hand color is tied to the number or to the nodes. For a file attribute like this 'group'
> column it does not move, fine. For a Louvain run it would. I would want that written on the
> row."

> "'moved' next to 'Other: Unassigned' -- so a changed row gets a little tag. I assume a color I
> changed gets one too, like 'changed' or 'set by hand'. That is good; in Gephi I cannot tell a
> color I set from a color the palette gave me."

Looking at the Look menu (Screen, Print, High contrast):

> "'Print: reads in gray on white paper and for color-blind readers.' 'High contrast: every color
> clears 3:1 against the canvas.' 'Colors you set by hand are kept.' Good -- so my light grey
> survives if I switch to Print. That line I like a lot. But would High contrast have solved my
> task? No. 3:1 against the canvas, not against each other. Black and charcoal both clear 3:1
> against a light background and still look the same to each other. So the Look is not the fix
> for this task; it could not have been."

> "And the colleague. If I send the project and they open it, do they get my colors? And if I
> export GEXF, does the color come out as viz:color? I assume yes, colors are colors. The rule
> probably does not survive GEXF, same as Gephi. I did not see the export in these screens."

---

## 6. Inspector detour

> "On the inspector with one protein selected there is 'Appearance top wins', and 'Module color:
> DNA repair' with a little 'color' pill. If I had selected one of my black nodes first, I would
> have seen 'Group color: 0' here and could probably have clicked through from there. That is a
> reasonable second route: click the node you cannot read, see which layer paints it. Nice for a
> student. I would not go that way myself, I go to the partition list."

---

## Single Ease Question

**4 out of 7.**

> "The destination is right: a list of every group with a swatch and 'Change color', a picker with
> hex and Okabe-Ito, a Look that keeps my hand colors. That is at least as good as Gephi, and the
> 'kept' and 'moved' tags are better. But getting there is three hops -- the stack row, the editor,
> the sliders icon -- where Gephi is one panel. I had to guess that the sliders icon opens the
> value list, and I had to guess the legend on the canvas is not clickable. And the thing that made
> the problem in the first place is the app's own choice: black for a group next to charcoal for
> Other. I should not have to fix a default."

## Would she use this instead of Gephi?

> "Not for this. Recoloring two groups is table stakes; Gephi does it, and my handout already has
> the screenshots. Nothing here is a reason to rewrite my lab. If the app told me whether my hand
> color follows the nodes or the class number after a rerun, and it round-tripped my colors in a
> GEXF back to my coauthors, that would start to be a reason -- that is a thing Gephi gets wrong.
> Today: no, but I would not throw it out of the room."

---

## What she tripped on (for the designers)

1. **The default palette creates the problem.** Group 0 is painted black and "Other" is painted
   #505050; at node size they read as one color on the canvas and on a projector. The same pair
   appears on the protein network (MAPK signaling black, Other charcoal). Yellow, the eighth color,
   is left unused in the Les Miserables legend while black is used.
2. **The canvas legend gives no sign it can be clicked.** Her first move, from Gephi habit, was to
   click the legend swatch. Nothing shows what that does.
3. **The value list is three steps from the stack row** (row, then editor, then the sliders icon
   beside the color chip). She found it by guessing the sliders icon; the icon has no words.
4. **Whether the swatch itself opens the picker, or only the row menu does, is unclear.** In the
   rendered state the highlighted menu item is "Move to Other", which drew her eye away from
   "Change color...".
5. **"Other" hides which groups it holds** (groups 6, 7 and 10 on Les Miserables). A colleague
   reading the figure cannot find out from the legend.
6. **Nothing says whether a hand-set color is tied to the value ("0") or to the nodes.** For a
   community result that is renumbered on every run, this decides whether the figure stays right.
7. **High contrast checks each color against the canvas, not against the other colors,** so it
   cannot fix two categories that look alike. She read the menu text correctly and concluded the
   Look was no help for this task.
8. **The screens switch datasets** (Les Miserables at rest, proteins in the editor). She coped, but
   said so.

## What she liked

- The value list with counts, largest first, is the Gephi partition list she expects.
- The picker has a hex field and the Okabe-Ito swatches; the Libraries tab names palettes she
  knows.
- "Colors you set by hand are kept" in the Look menu, and the "moved" tag on a changed row: Gephi
  cannot show which colors were set by hand.
- "Move to Other" for a value like "Unassigned".
- Les Miserables at rest, 77 and 254, matching Gephi's sample.
