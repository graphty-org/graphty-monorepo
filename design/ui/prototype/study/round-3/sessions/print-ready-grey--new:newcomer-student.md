# Print-ready in grey, second visit -- newcomer student

**Task, as the moderator gave it:** "A reviewer wants the fold-change figure in greyscale, readable
by a colour-blind reader, with the top 10 labelled."

**Screens used, in order:** the styles list (a run's colour layer open, the label layer on the top
N, the project Look menu), colour by a value (the picker, then a signed number on a diverging
palette), and the export dialog (the module figure with the Look at Screen and at Print, then a
fold-change figure with the Look at Print).

**About the participant.** There is still no persona file for this participant, so the assumed
portrait from her earlier sessions is kept. Treat her vocabulary and patience as assumed.

*Assumed portrait:* Leah, 20, second-year biology undergraduate in an intro systems biology
course. Her class project is a protein interaction list her TA exported from STRING, with a log2
fold change column from a stress experiment. She has followed one Cytoscape lab handout step by
step. She knows "fold change", "up-regulated", "down-regulated" and "log2" from lab; she does not
know "diverging", "sequential" or "domain". She is on a 13-inch laptop, patient for about ten
minutes, and blames herself first. She did this same task on an earlier version of these screens.

Renders she looked at: `shots/record/r3-leah-grey-styles-list-html-result.png`,
`-colour-by-value-html-choose.png`, `-colour-by-value-html-numbers.png`,
`-styles-list-html-top-n.png`, `-styles-list-html-looks.png`, `-export-dialog-html-figure.png`,
`-export-dialog-html-figure-print.png`, `-export-dialog-html-figure-signed.png`.

---

## Think-aloud

### 1. The styles list

"OK, same study as last time. Everything is orange-brown, the layer that's open is 'Betweenness
color', 'written by the run'. There's a box next to it with a histogram that says 'read only'. I
didn't make that, I'm not touching it. None of the styles say fold change, so I still have to make
the fold-change colour myself."

"log2FoldChange is on the right under Attributes, -2.52 to 3.15. Good. Plus next to Styles."

### 2. Colour by a value

"New layer, 'Style layer 1', everything turned grey. Fill, Color, 808080. I click the little
sliders button next to it. 'Color: apply a color or a value.' From the data: log2FoldChange,
numbers, -2.52 to 3.15. Click. Same as last time, that part is easy."

"Red and blue. 'Below 0: 148, Above 0: 152.' I like that. And the text under it now says 'The
palest color sits at 0. Below 0 is red, above 0 is blue.' OK that's clearer than last time, I
didn't have to guess what diverging meant."

"The Palette dropdown says 'Red to blue'. I still can't see what else is in it. I'm not going to
look for a grey one this time, because last time I learned the grey thing is somewhere else. Oh --
wait. Betweenness disappeared from the styles list in this picture, and also the labels. Did I
just delete them? No, I think this is just a different picture of the app. I'm going to assume my
other layers are still there."

"Where does it say colour-blind? Nowhere on this panel. Red and blue is the one colour-blind
people can see, I think, my TA said avoid red-green. But I'm guessing."

### 3. Labels on the top 10

"Hub labels. 'Top 12 by degree.' It's a little sentence I can edit: Top [12] by [degree]. Change
12 to 10, change degree to log2FoldChange. That's actually really nice, it's the same as how I'd
say it."

"But which top 10? 'by log2FoldChange' -- is that the biggest numbers? Then I only get the
up-regulated ones, the +3.15 end. The -2.52 ones changed a lot too. In lab the TA said 'biggest
change' means either way. There's no 'either direction' or 'biggest change' choice that I can see.
It lists the names underneath ('MAPK1, TP53, CDK1... and 7 more'), so after I change it I'd have
to look them up in my spreadsheet to see if any are negative. I'd probably not do that and just
send it. Honestly I'd not even think about it if I wasn't thinking out loud."

"'hidden: 2 where labels overlap.' Still there. So top 10 might only show 8. I still don't see a
way to make them show. The reviewer is going to count them."

### 4. The Look menu

"Tiny palette icon next to 'Graph' on the right. I know it's there only because I found it last
time. 'Look for the whole project': Default, Colorblind safe, Print, High contrast."

"Print says 'colors keep their order in grayscale and read on white paper.' Colorblind safe says
'safe for color-blind readers'. It's still one or the other. The reviewer wants both. I pick Print
because greyscale is the hard requirement and I figure grey is fine for colour-blind people."

"'Colors you set by hand are kept.' I picked log2FoldChange from a list. I didn't type a colour.
I think that means Print will change my red-blue. I'm like 60 percent sure."

### 5. Export -- first the module example

"Export files. OK this is different from last time. There's a 'Look' dropdown right on top of the
picture, 'Screen', and next to it 'File is written with: Screen look'. And under the picture a
yellow warning: 'Ribosome and Proteasome look the same in gray...' and a button 'Use Print look'.
That's exactly the thing I wanted last time -- it tells me which one the file is. Good."

"Wait, but I picked Print in the Look menu already. Why does this say Screen? Is this a different
setting? Or did my choice not stick? I don't know if these two are the same switch. I'd just
change it here, since this is the one that says what the file is."

"Switch to Print: 'Checked in gray: all 9 modules print as different grays.' A check mark. OK.
That makes me feel safe."

### 6. Export -- my kind of figure, fold change

"Now the fold-change one. Look: Print, 'File is written with: Print look.' Legend says 'Fold change
(log2), darker is higher; 0, no change, is the middle gray.' And under the picture: 'Checked in
gray: fold change runs light to dark from -2.52 to +3.15, and the legend states that 0 is the
middle gray.'"

"Hmm. But the picture isn't grey. It's still pink and blue. Light pink at the bottom, grey in the
middle, dark blue at the top. So the file is... in colour? The methods text says 'light red
(lowest) through middle gray (0) to dark blue (highest)'. So it's a colour picture that would look
OK if someone printed it in grey. The reviewer said 'in greyscale'. I think they want a grey
picture. I'd honestly still open it in PowerPoint and hit 'grayscale' to be sure. At least now I
believe it'll look right when I do."

"Something else bugs me though. The -2.52 ones, the most down-regulated, are the palest. On white
paper they're going to basically vanish. They're my most interesting proteins! 'Darker is higher'
makes it look like the down-regulated ones didn't do anything. Last time red and blue were both
strong at the ends and that made sense. I don't know if that's a problem or if that's how you're
supposed to do it in grey. I'd ask my TA."

"And the labels in this preview are MAPK1, HSP90AA1, AKT1, UBB... those are the hub ones, the
degree ones, not fold change. And the legend here doesn't have a labels line at all, the one in
the app said 'Labels: top 12 by degree'. So I can't check from the export that my top 10 made it
in. I'm assuming this is just a different sample figure."

"Nothing in the export says colour-blind anywhere. There used to be a 'Red-green' preview button
last time, I liked that, and now it's gone. So I have no way to check the colour-blind part
except trusting that grey is fine."

"Export 2 files. Done, I think."

---

## Result

Leah coloured by fold change, set labels to the top 10 by log2FoldChange (unsure whether it took
the most down-regulated proteins too, and 2 labels may be hidden), chose Print in the project Look
menu, then again in the export dialog because it showed Screen, and exported. She understood this
time which look the file is written with, and trusted the "checked in gray" line. She was not sure
the file is actually greyscale (the preview is pink-to-blue), found no way to check or choose
colour-blind safety together with Print, noticed the strongest down-regulated proteins become the
palest dots, and could not confirm her labels from the export preview.

**Single Ease Question:** 4 out of 7. "Better than last time -- it finally tells me what the file
will be. But I still don't know if 'Print' means grey, and colour-blind just kind of fell off."

**Would you use this instead of what you use now?** "Yes, for this, over the Cytoscape handout.
Picking fold change from a list and it telling me 148 down and 152 up is so much easier, and the
'checked in gray' line is something Cytoscape never told me. But I'd still convert the PNG to grey
in PowerPoint before sending it, and I'd ask my TA whether the down-regulated ones being so pale is
OK."
