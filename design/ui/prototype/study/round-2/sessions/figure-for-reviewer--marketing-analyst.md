# A figure a reviewer can read in gray -- Jordan, marketing network analyst

Participant: Jordan, growth-marketing analyst who "does the network stuff" one or two days a
week (Gephi, NodeXL, a colleague's notebook). Not a biologist.

Task as given by the moderator: "Make the picture show which genes changed most, so a reviewer
can read it, even printed in grey."

Screens used, in order: Styles list, editor and legend (screens/styles-list.html), then the
Export dialog (screens/export-dialog.html). Laptop-size screen 1440 by 900.

Outcome: finished with difficulty. She got to a figure that she believes shows the biggest
changes as the biggest dots, direction as color, and a gray-safe setting switched on -- but she
never saw her own figure in gray, and the first thing she tried (the + next to Styles) went
nowhere.

## Transcript (think-aloud)

**Opening the Styles screen, first frame.**

"OK. Genes. I'm going to be honest, I don't do genes, I do creators. But a network's a network.
So -- 'Stress response study', 300 proteins. Proteins, not genes. Whatever, I'll assume the
reviewer means the same thing.

First thing I want is: where's the thing that says how much each one changed. I'm reading the
right side... Attributes: module, log2FoldChange, minus 2.52 to 3.15, degree, betweenness.
log2FoldChange. That's got 'change' in it. I've seen 'fold' in, like, a lift chart. So that's
the column, I'm guessing. Minus is down, plus is up? That's my guess. Nothing on the screen
actually says that, I'm just guessing from the minus sign."

**Looking for where to set color or size.**

"The map is all orange-brown right now. The legend at the bottom says 'Color: betweenness'. Fine,
that's the bridge thing, I know that one. But I don't want that, I want the change.

On the left there's Styles, and a list: Betweenness color, Hub labels, Degree size, Base style.
There's a little plus next to Styles. That's where I'd go. In Gephi it's the Appearance panel,
you pick nodes, color, ranking, pick the column. So I click the plus."

(The plus has no defined result in the prototype. The moderator says it would open "a new
style" but the screen does not show what that looks like.)

"So... nothing. OK, it's a mockup. In real life if a plus did nothing I'd click it twice and
then go look for a right-click menu. Let me look at the other pictures of this screen and see if
someone already did it."

**Finding frame 4, editing Degree size.**

"Here's 'Degree size' opened up. Size, and a pill that says 'degree', and a little sliders icon.
And there's a Fill with a plus under it. So I think the move is: I change the 'degree' pill to
the change column and the big dots become the ones that changed most. That makes sense. It's
basically Gephi's ranking, but in a panel. Fine."

**Frame 12, 'Fold change size' -- someone already made it.**

"Oh, here: 'Fold change size', size by log2FoldChange. And -- the map didn't change. The box at
the top says 'Covered by Degree size above: it sets the size of all 300 proteins, so this layer
paints none.' And a button, Move above.

I had to read that twice. So the one higher in the list wins? That's backwards from how I'd
think about a list -- I'd think the top of the list is the first thing that happens. But, OK, it
told me what's wrong and gave me one button. That's actually better than Gephi, where it just
silently doesn't do anything and you rerun the layout for ten minutes. I'd click Move above.

Then under the size box it says: 'By magnitude, sign not shown: 148 proteins went down and 152
went up. Color by log2FoldChange to show the direction.' OK, that I like. That answers the
question I had -- minus is down. And it's telling me the size won't say up or down. That's the
kind of thing my VP would ask. Good.

The legend: dots 0 to 0.6, 0.6 to 1.3, up to 2.5 to 3.15. Those are... log2 units? I don't know
what 2.5 means in real life. Is that 'changed a lot'? The reviewer presumably knows. I'd want a
line like 'bigger = changed more' as the legend title. It's close -- the header at the bottom
right still says 'Size: number of connections (degree)' in this frame though, which is the old
one, and then in small print 'Size by |log2FoldChange|, covered'. Those little bars around the
name, is that a typo? Absolute value, I think. A reviewer would get it. My VP would not."

**Frame 10 -- the red-and-blue one.**

"This is 'qPCR log2FC color', which is a different file, 84 of 300 proteins. The legend is blue
to red, 'minus 2.41 to 2.98, 0 in the middle'. So blue down, red up, white is nothing. That's
what I'd want for direction. But this one only has 84 proteins and the rest keep whatever is
under it. I'd want the same on the full log2FoldChange column. I'm assuming I can make that with
the Fill plus, same as the size.

Here's my problem though: red and blue printed in gray. They both go dark. Down a lot and up a
lot look the same on paper. That's the thing that kills me in decks -- the printout goes round
the table and someone says 'which dark ones are the good ones?'"

**Frame 14 -- the Look menu.**

"There's a palette icon next to 'Graph' on the right. I wouldn't have found that on my own, it's
a tiny icon, I'd have thought it was 'background color'. But the menu is good: Default,
Colorblind safe, Print -- 'prints well in gray: colors keep their order in grayscale and read on
white paper', High contrast. And 'Colors you set by hand are kept.'

So I pick Print. That's the gray thing, done. Except -- 'keep their order'. My red-blue has two
ends. Which end goes dark? Does Print make down light and up dark, and then the middle is...
middle gray? Then the zero ones and the plus-one ones look the same. It doesn't show me. It's a
word description, not a picture. I'd click it and look, but the map in this frame is still the
betweenness orange, so I can't see what it did to red and blue."

**Export dialog -- frame 1.**

"Export files, top right, blue button. Opens a dialog. Figures: Current view, checked, 2x PNG.
Figure 3: modules, also checked. Methods text, checked. Nodes table, unchecked -- good to know
that's there, that's my CSV for later.

Preview on the right. Legend is drawn into the picture -- Module, with counts, Degree sizes.
Thank God. That's the thing I do by hand in PowerPoint every time. Transparent background by
default, which I'd change to White because a transparent PNG on a dark slide theme is a
disaster.

'3 files go to your Downloads folder. Nothing is uploaded.' Good. I didn't even have to ask."

**'View as' Gray.**

"View as: Color, Gray, Red-green, Blue-yellow. I click Gray. The whole thing goes gray and --
yeah, look, half the modules are the same gray. Ribosome, Proteasome, Complex I all look the
same, TGF-beta almost disappears. So this is exactly the reviewer problem, and the tool is
showing it to me, which I've never had.

But then: 'Preview only: the file is written in color.' So it showed me the problem and... what
do I do? There's no 'switch to Print look' button right there. I'd have to close the export,
remember the little palette icon, pick Print, and come back. It'd be really nice if next to
Gray it said 'these 3 look alike -- use the Print look?'

And also, this preview is the module picture, not my fold-change picture. I never actually got
to see my red-blue in gray. So I'm trusting the word 'Print'. For a reviewer I would not send it
without printing one page on the office printer first. Which is what I do now anyway."

(Off-topic, unprompted:) "Honestly half the time the problem isn't the tool, it's that the VP
prints the deck on the one printer on the floor that's been out of cyan since March."

**Checking the files list.**

"Files: current-view.png, figure-3-modules.png, methods.txt. I didn't ask for the modules one --
it's checked because it has a 'saved export setting', whatever that is. I'd have exported three
files and then wondered which one is mine. I'd untick it. The methods text is nice for the
science people; for me it'd go straight in the appendix."

## After the task

**Single Ease Question (1 very hard to 7 very easy): 4.**

"The pieces are all there and some of it is honestly better than what I have -- the legend
in the export, the gray preview, 'nothing is uploaded'. But I never had one moment where I saw
my picture, in gray, and knew it was done. I had to stitch it together from three places: the
style list, a tiny palette icon, and the export dialog."

**Would she use this instead of her current tool?**

"For the picture that goes to someone else -- probably yes, over Gephi, because the legend comes
with the image and I can check gray before I send it. That's two PowerPoint steps gone. For
figuring out which column is 'change' and what 2.5 means, I'd still need the person who gave me
the data. And I'd want the gray check to be on my actual figure, with a button to fix it right
there, before I'd trust it for a reviewer."

## Problems found

1. Styles "+" had no visible result; her first and most natural move dead-ended (severity 3).
2. The Print Look sits behind an unlabeled palette icon next to "Graph"; she would not find it
   unaided (severity 3).
3. Gray preview in the export shows the problem but offers no fix and says the file is still
   written in color; switching to Print means leaving the dialog (severity 3).
4. The export preview never showed her fold-change figure in gray, so she could not confirm a
   red-blue (up/down) scale reads in print; "colors keep their order" does not say what happens
   to a two-ended scale (severity 3).
5. Size legend units (0.6, 1.3, 2.5 on log2) mean nothing to a non-biologist; the canvas legend
   header still read "number of connections (degree)" while the fold-change layer was covered
   (severity 2).
6. "Higher in the list wins" was backwards from her expectation; the Covered by... / Move above
   message rescued it (severity 2).
7. A second saved figure was pre-checked in the export, so three files would be written when she
   wanted one (severity 2).

## What worked for her

- "Covered by Degree size above" plus a single Move above button.
- "By magnitude, sign not shown: 148 went down and 152 went up" -- answered her sign question.
- Legend drawn into the exported image, with counts.
- "Nothing is uploaded" stated at the bottom of the export dialog without her asking.
- A gray preview at all -- she has never had one.
