# Session: fix two groups drawn in colors you cannot tell apart -- Elena (first-time graph user)

Participant: Elena, a product manager with no graph training who opens graph tools occasionally and because she is curious. Her yardsticks are Google Slides charts and her company's analytics dashboard. Trackpad only, often sharing her screen on a video call. Played at laptop width (1440 x 900), on the long clock: no deadline, three or four dead ends tolerated.
Task given by the moderator: "Two of the groups are drawn in colors you cannot tell apart. Fix that so a colleague can read the picture."
Screens used, in order: the main window at rest (Les Miserables, colored by group); the inspector with one node selected, then with a group selected from the key; the inspector at rest (Style stack); a style layer's editor and its color picker (Style stack page); the "color by a category" state of the color-by-value page (the value list and its row menu); the Look menu (Style stack page).
Renders she looked at: shots/r4-elena-restyle-frame-at-rest.png, r4-elena-restyle-insp-style-by.png, r4-elena-restyle-insp-group.png, r4-elena-restyle-inspector.png, r4-elena-restyle-styles-list.png, r4-elena-restyle-colour-by-value.png, r4-elena-restyle-cbv-categories.png, r4-elena-restyle-sl-picker.png, r4-elena-restyle-sl-libraries.png, r4-elena-restyle-sl-looks.png.

Outcome: completed, with difficulty and one moderator hint. She recolored group 0 from black to yellow. She found the control only after the moderator pointed her at the Style stack row; before that she clicked a dot, the key and a word that looked like a button. She did not know that "Other" is three groups, and she is not sure the key and the picture she would paste update to match. Single Ease Question: 3 of 7.

## Transcript (think-aloud)

**1. Spotting the problem (main window at rest, Les Miserables).**

"OK, this is the Les Mis one. Colored dots, lines, a key in the corner. 'Group color': 2, 8, 4, 1, 3, 5, 0, and Other. Group 2 is... well, I don't know what group 2 is. Numbers. Fine.

Which two can't I tell apart. The oranges -- 2 and 3 -- on my screen one's a bit redder. The blues, 8 and 1, OK, one's light. But the black ones and the dark grey ones. Look, up top there are three black dots in a line, and on the right there are these dark grey ones hanging off the edge. In the key it's 0 is black and Other is dark grey. On a call, with the compression? Same color. Nobody's going to see that.

So those two. Group 0 and... Other. Is Other a group? It's in the key like a group. It's got 5. I'll say it's a group."

"And honestly, the black ones are off on their own, and so are the grey ones -- those are the loners. The ones that don't really belong anywhere. That's kind of the story, actually."

(Moderator note: this is a misreading. "Other" is groups 6, 7 and 10 painted one gray because the palette ran out; the key does not say so. Nothing on screen says black or gray means "on their own".)

**2. First try: click the dot (inspector, one node selected).**

"In the dashboard I click the bar and it does the thing. So... click a black dot."

(Moderator: clicking a node selects it; the page for that state is the inspector with TP53 selected, a different sample, same controls.)

"Different data. Proteins. OK, pretend it's my black dot. Right side changed. Attributes, Results -- 'Louvain', 'PageRank', 'Betweenness' -- not touching those. Down at the bottom: 'Appearance, top wins'. 'Module color, DNA repair' and a little box that says 'color'. That looks like a button. Click 'color'."

(Moderator: that word is a label saying which property that row paints. It does nothing on click.)

"Oh. It looked exactly like a button. It's got a border around it. OK."

**3. Second try: click the key (inspector, a group selected).**

"Then the key. In Slides you click the legend thing and you can change the series color. Click the black square next to 0."

(Moderator: clicking a key entry selects every node in that group; the page is the inspector with a community selected.)

"It highlighted the row in the key and the right side is all about the group now. 36 nodes, edges inside, edges out, members. 'Keep as set' -- big button. I don't want to keep anything as anything, I want to change a color. I'm not pressing that, I don't know what it does to my groups.

'Appearance' again, 'Louvain... Community 4... color'. No paint bucket. No swatch I can click. Hm.

I'd probably right-click the dot now, but right-click on my trackpad is a coin toss. Is there a menu or not?"

(Moderator: there is no right-click menu on a node mocked here.)

"Then I'm stuck. That's two things that didn't do it. I'd probably look for a 'Format' or 'Edit colors' at the top, like in Slides. There's no top menu here, just the three lines. I'd open that."

(Moderator: the main menu is not mocked. Moderator hint: "What about the Style stack section on the right when nothing is selected?")

**4. The Style stack (inspector at rest; main window at rest).**

"'Style stack'. I read that as developer stuff, I skipped it. OK: 'Group color' with three little colored squares, and 'Base style'. So Group color is the thing that does the colors. That's... actually obvious once you say it. Click 'Group color'."

(Moderator: clicking the row opens that layer's editor beside the panel; the Style stack page shows one open, for a different layer.)

**5. The layer's editor (Style stack page).**

"Now it's the protein one again, all orange-brown. The box says 'Betweenness color', but pretend it says Group color. 'Written by the run', 'Edit a copy'. Hm, 'Edit a copy'? Why a copy? Would mine say that? I didn't run anything, it came like this.

'Applies to', 'Fill', 'Color' -- and a pill with the name in it and a little sliders icon next to it. Then a second box popped out: Scale, Log, 'Each value is divided by 0.000077'... no. I'm skimming. There's a picture of bars. None of this is 'group 0 is black'.

I'd click the pill."

(Moderator: the pill opens the picker "Color: apply a color or a value" -- the color-by-value page, first state.)

"'Palette colors' -- eight little squares. 'From the data': log2FoldChange, module. 'Computed': degree, betweenness. If I click the yellow square does the whole graph go yellow? I think it does. I'm not clicking that. Close. Try the sliders one."

(Moderator: the sliders button opens the settings for how the value becomes a color; for a category, that is the "color by a category" state.)

**6. The value list (color-by-value page, categories).**

"OK. This is it. 'Values, largest first', a square and a name and a number on each line. Ribosome, Proteasome... it's the protein names, but in mine it'd be 2, 8, 4, 1, 3, 5, 0, Other. So I'd find the 0 line, with the black square.

'Eight distinct colors'. Well, they're not distinct, that's my whole problem. Or maybe they're distinct to whoever picked them.

There's a menu open on one line: 'Change color...', 'Move to Other', 'Select nodes', 'Create set'. 'Change color' -- yes, that. How did the menu open? I don't see dots on the line. If it's a right-click I'd never have got here."

(Moderator: the menu is the row's right-click menu; clicking the square itself also opens the color picker.)

"Clicking the square. That I'd have tried. OK, click the black square next to 0."

"And 'Other: Unassigned -- moved'. Moved? So Other isn't a group, it's a bucket? Then in my picture Other is... what, the leftovers? I thought it was a group. Now I don't know what the grey dots are. I'll leave Other alone and just change 0. If 0 isn't black any more, the grey ones stand out."

**7. The color picker (Style stack page, the picker).**

"Big square with a gradient, a rainbow slider, 'Hex', a number box, 100%. Too much. But at the bottom: a row of little squares. Orange, light blue, green, blue, red-orange, pink, black, yellow, grey. Yellow isn't used in my picture. Yellow. Click."

"There's a 'Libraries' tab. 'Okabe-Ito, categories'. Is that a person? I'm not going in there."

"So did it work? I'd want to see the three black dots at the top go yellow and the key say yellow next to 0. I didn't get a picture of that. If the key still says black I'd not trust it."

(Moderator: the key is drawn from the same layer and follows it; there is no page showing the result.)

"OK. Yellow on the light grey background, though... they'll be pale. Hm. It's better than two blacks, anyway."

**8. The Look menu, afterwards (Style stack page).**

"Wait, while I'm here -- there's 'Look: Screen' next to the Style stack. Click. 'Screen', 'Print -- reads in gray on white paper and for color-blind readers', 'High contrast -- every color clears 3:1 against the canvas'. 

Print? I'm not printing it. I'm pasting it in Slack. I would never have opened that. 'High contrast' sounds like the accessibility thing on my phone. '3:1' -- is that good?

And on the Les Mis page the little palette icon said 'Look: Default', and on the protein page it said 'Default' and here it says 'Screen'. Are those the same?

'Colors you set by hand are kept.' OK, that's nice, so my yellow survives. If I'd seen that first."

"Can I undo the yellow? I didn't see an undo. I'd guess Ctrl+Z. I'd guess."

(Engagement: answers get shorter from here; she stops trying new things.)

"Yeah. OK. That's done I think."

## Single Ease Question

"Three. Once I was on the right line it was one click, the square, and a yellow. Getting to that line was the whole problem. I clicked the dot, I clicked the key, I clicked a thing that looked like a button, and you had to tell me where it was. And I still don't know what Other is."

## Would she use this instead of her current tool

"I don't have a current tool for this. For a network picture I'd ask the comms guy who does Flourish. Instead of asking him? For changing a color -- maybe, now that I know it's under 'Group color'. I'd remember it next time. But the first time, no, I'd have given up after the key and just pasted it with the two blacks, and said 'ignore the dark ones'."

## What she said she needed, in her words

- "Click the square in the key and change it. That's where the color is."
- "If Other is a bunch of groups, the key should say which ones."
- "Show me the picture after, with the key changed, so I know it stuck."
- "Don't call it Print if it's for people who can't see colors."

## Observations for the studio (moderator notes, not the participant)

1. **The key is where she looked, twice, and it only selects.** Her first two attempts were the dot and the key swatch; both select. The value list with editable swatches exists, but three levels down (Style stack row, layer editor, the settings button beside the binding pill). The Style stack row was on screen the whole time, labeled, and she skipped it as "developer stuff" until prompted. One hint needed.
2. **"color" on an Appearance row reads as a button.** The bordered word naming which property a layer wins (inspector, Appearance rows) drew her first click on the panel. It does nothing.
3. **"Other" reads as a group.** In the Les Miserables key, "Other 5" sits in the list like any group and nothing says it holds groups 6, 7 and 10. She picked it as one of the two "groups" she could not tell apart and built a story on it ("the loners"). The categories page's "Other: Unassigned -- moved" then told her it was a bucket, which undid her reading without replacing it.
4. **The two indistinguishable colors on the default sample are black (group 0) and the Other gray (#505050).** Both mark small peripheral clusters, which also invited the wrong "outsiders" reading. The sample's own starting look is where she met the problem.
5. **The pill and the palette row in the nested picker looked like they would recolor everything.** She avoided the yellow square in "Palette colors" because she believed it would paint the whole graph -- which, for that picker, is what it does. Fear of an unrecoverable change steered her correctly here, but only by luck.
6. **The value row's menu has no visible opener.** "Change color..." sits in a menu with no dots on the row; on a trackpad she would not have right-clicked. The swatch click is what she would use, and nothing on the row hints that the swatch is clickable.
7. **No result state.** No page shows the canvas and key after a per-value recolor. She wanted to see the key change before trusting it, and the Print/High contrast reassurance ("Colors you set by hand are kept") lives in a menu she opened only by accident, after the fact.
8. **Look names.** "Print" is the Look that answers her colleague's problem, and she would never open it for a Slack paste. The same control reads "Look: Default" (main window), "Default" (inspector) and "Screen" (Style stack page).
9. **Mixed samples.** The route crosses Les Miserables and the protein sample; she had to "pretend" twice, and the run-made layer's "Edit a copy" made her wonder whether her own layer was editable.
10. **Mock defect.** The first state of the inspector page overflows at 1440 wide: the right panel is cut off mid-word ("Change..", "0.028", "undirecte").
11. **Undo.** She saw no sign the recolor could be undone and guessed Ctrl+Z.
