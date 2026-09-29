# Print-ready in grey -- newcomer student

**Task, as the moderator gave it:** "A reviewer wants the fold-change figure in greyscale, readable
by a colour-blind reader, with the top 10 labelled."

**Screens used, in order:** the styles list (a layer colouring by a run's result, the label layer
on the top N, the project Look menu), colour by a value (the picker, and a signed number on a
diverging palette), and the export dialog (a figure, then the same figure viewed as gray).

**About the participant.** No persona file for this participant existed when the session ran, so
the same assumed portrait used in her earlier sessions this round was kept, built from the
project's first-time-user persona and the round-one finding that newcomers cannot read legend and
statistics vocabulary. Treat her vocabulary and patience as assumed.

*Assumed portrait:* Leah, 20, second-year biology undergraduate in an intro systems biology
course. Her class project is a protein interaction list her TA exported from STRING, with a
log2 fold change column from a stress experiment. She has followed one Cytoscape lab handout step
by step. She knows "fold change", "up-regulated", "down-regulated" and "log2" from lab; she does
not know "diverging", "sequential" or "domain". She is on a 13-inch laptop, patient for about ten
minutes, and blames herself first.

**Note on the mocks.** The export dialog mock shows a different figure from the same kind of
study (proteins coloured by module, not by fold change). For the export steps Leah reasoned from
that figure and said what she expected to see for hers. Findings about how her own fold-change
colours look in grey come from her reasoning plus the gray preview of the module figure, not from
a gray preview of a fold-change figure, which no mock shows.

---

## Think-aloud

### 1. The styles list (where I start)

"OK, so this is my network. It's all orange-brown. Styles on the left: Betweenness color, Hub
labels, Degree size, Base style. The reviewer said 'the fold-change figure'. None of these say
fold change. So the figure I have isn't coloured by fold change at all? Maybe my TA made it... I
guess I have to make one."

"Right side, Attributes: log2FoldChange, -2.52 to 3.15. Good, that's my column, it's in there."

"Styles has a plus. I'd click the plus."

### 2. Colour by a value

"New layer, 'Style layer 1'. Fill, Color, there's a gray box with 808080 and a little
four-dots button. I clicked the four dots because the box itself looks like I'd type a colour.
Oh nice, a list: palette colors, and then 'From the data: log2FoldChange, numbers, -2.52 to
3.15'. That's exactly what I want. Click."

"Now it's red and blue. Red below 0, blue above 0, the pale colour at 0. The legend says 'Below 0:
148, Above 0: 152'. OK I actually like that, it tells me how many went down and up. 'Palette --
diverging, Red to blue'. Diverging, I guess means it goes two ways from the middle. Fine."

"But wait. The reviewer wants greyscale. Red and blue... if I print this on the department
printer, dark red and dark blue are both just dark, right? So down-regulated and up-regulated look
the same? I don't know that for sure. Nothing on this panel tells me. I'd open the palette
dropdown to see if there's a gray one, but the mock doesn't show what's in it. I'd hope for
something called 'grey' or 'black and white'."

*Moderator: the dropdown's contents are not in the mock.* "Then I'd be guessing. I'd leave Red to
blue and hope something later fixes it."

"Also, the layer is called 'log2FoldChange color' now. Should I delete Betweenness color? The
figure still has the orange layer above... no, my new one is on top in the list. I think. I'd
turn the betweenness one off with the eye so it doesn't get mixed in. I'm not sure it would mix,
but I don't want to risk it."

### 3. Labels on the top 10

"Hub labels. I click it. 'Top 12 by degree.' OK so it labels the 12 with the most connections.
The reviewer said top 10. Top 10 by what? I think they mean the top 10 fold changes, because it's
the fold-change figure. So I'd change 12 to 10 and 'degree' to log2FoldChange."

"Hmm, but the biggest fold change -- is that the most up-regulated only? The ones at -2.52 are
changed a lot too, just down. If 'top 10 by log2FoldChange' only takes the highest numbers I'd
miss all the down ones. I can't tell from the dropdown. I'd probably just pick it and look at
which names come up. It shows the names under it, 'MAPK1, TP53, CDK1...' so after I change it I
could check if any are the down ones. That's helpful actually."

"'hidden: 2 where labels overlap.' Wait, so two of my labels won't show? The reviewer said label
the top 10. If two are hidden, that's 8. I don't know how to un-hide them. Is there a setting? I
don't see one. I'd zoom in maybe? But the figure is the figure. That's a problem."

### 4. The Look menu (palette icon on the right)

"I wouldn't have found this on my own -- it's a tiny palette icon next to 'Graph' on the right.
The moderator's screen has it open. 'Look for the whole project.' Default, Colorblind safe, Print,
High contrast."

"Colorblind safe: 'Safe for color-blind readers.' That's one of my requirements. Print: 'Prints
well in gray: colors keep their order in grayscale.' That's the other one. But there's one tick
next to Default, like a radio thing. Can I pick two? I need both. If I pick Print, is it still
colorblind safe? If I pick Colorblind safe, does it print in grey? It doesn't say. I'd pick Print,
because the reviewer said greyscale first, and a grey picture is kind of automatically fine for
colour-blind people? I think? Since it's all grey?"

"And at the bottom: 'Colors you set by hand are kept.' Did I set my colours by hand? I picked
log2FoldChange from a list, I didn't type colours. So... that's not by hand? I honestly don't
know. If it counts as by hand then Print does nothing to my figure and I wouldn't notice."

### 5. Export

"Export files, top right. 'Current view, 2x PNG', legend on, methods text. OK. 'View as: Color,
Gray, Red-green, Blue-yellow.' Oh, perfect, Gray! I click Gray."

"The preview goes grey. For this figure the Ribosome and Proteasome dots are the same grey. For
mine I bet the red and blue ends look the same, which is exactly what I was worried about."

"Then the little text: 'Preview only: the file is written in color.' ...What? So clicking Gray
doesn't make it grey? Then why is it here? I thought this was how you export in grey. I'd have
exported and sent it and it would be in colour. I only noticed because I read the grey text next
to it, and honestly I usually don't read that."

"OK so if I understand, the grey button is a test, and the actual grey is the Look thing from
before. Nothing in this dialog says which Look is on. I'd want it to say 'Look: Print' right
here next to the file, so I know the file is the grey one."

"Red-green -- I'd click that too, to check the colour-blind part. That's actually nice, I didn't
know you could see what a colour-blind person sees. But again it's only a preview."

"I'd export, open the PNG, and if it's in colour I'd convert it to greyscale in PowerPoint."

---

## Result

Leah coloured by fold change, changed labels to the top 10 (by log2FoldChange, unsure it caught
the down-regulated ones), chose the Print Look, and exported. She could not tell whether the file
was greyscale, whether Print also covered colour-blind readers, whether her layer counted as
"colours set by hand", or how to show the two hidden labels.

**Single Ease Question:** 3 out of 7. "Every single step was findable, but at the end I didn't
know if the thing I sent was actually grey."

**Would you use this instead of what you use now?** "For a class figure, probably yes. Picking
fold change from a list and seeing 148 down, 152 up is way easier than the Cytoscape handout, where
I had to copy a mapping from a screenshot. But for the reviewer I'd still open the PNG in
PowerPoint to make sure it's grey, because the app told me one thing in the menu and another thing
in the export box. I'd ask my TA before trusting it."
