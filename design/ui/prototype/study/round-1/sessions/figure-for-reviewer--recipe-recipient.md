# Session: a figure a reviewer can read, even in grey -- the recipe recipient (Tom)

**Participant:** Tom, lab manager, receives the lab's network files and never builds them
(`study/personas/recipe-recipient.md`).
**Task as given by the moderator:** "Make the picture show which genes changed most, so a reviewer
can read it, even printed in grey."
**Material:** the Styles list mock (`screens/styles-list.html`), then the Export dialog mock
(`screens/export-dialog.html`), at 1440 by 900. Tom sees the rendered frames; where he clicks, the
moderator tells him what the prototype would do, as its HTML describes.
**Outcome:** not completed. Tom never got the fold change onto the picture in a way he could see,
and found nothing that told him whether the figure would survive a grey printer.

## Transcript

**Minute 0. The first frame (a network in orange and brown, "Betweenness color" open).**

> Right. So this is her network, the 300 proteins. It's all orange. Orange to brown. What's
> "Betweenness"? ... No, don't tell me, I don't need it. That's not what I was asked for.
>
> I was asked which genes changed most. That's fold change. Where's the fold change?

He reads the right-hand panel because it has numbers.

> "log2FoldChange, minus 2.52 to 3.15." OK, so it's in there. Good. That's our column.
> I'd click that.

*Moderator: clicking the row in the Attributes list does nothing in this prototype.*

> Nothing. OK. So that's just telling me it exists. Fine.

**Minute 1. Looking for where to start.**

> The big blue button is Export. That's the last step, not the first. I'll leave that.
>
> On the left there's "Styles" and a list: Betweenness color, Hub labels, Degree size, Base
> style. And a plus. I suppose the plus adds one? Adds a what, though. A style? I'm not making a
> style, I want the fold change on it.

The moderator shows the "no layers yet" frame, where the Styles list holds only Base style and a
line of small grey text underneath.

> There's writing under "Base style". Small grey writing. [leans in] "No style layers yet. Add one
> with plus, or with Color by or Size by on any attribute." ... Color by. Where's "Color by"? I
> don't see a button that says Color by anywhere on this screen. The attributes on the right are
> just names and numbers.
>
> So it's the plus, then.

*Moderator: the prototype has no frame for what the plus opens.*

> So I click it and I don't know what happens. I'd guess it gives me a list of options I don't
> understand. [pause] That's one. I'd probably ask her about this bit.

**Minute 2. The moderator moves on to the frame where a fold-change layer already exists
("qPCR log2FC color", switched off, its editor open).**

> OK, now there's a thing called "qPCR log2FC color". That's ours, that's the qPCR. Somebody's
> already made it. Good -- I'd rather use hers than make one.
>
> The list on the left is long now. Fifteen rows? I'm not reading all that. But I can see mine
> because it's the one that's open.
>
> The box says... "Legend: minus 2.41 to 2.98, 0 in the middle." Blue through white to red. Blue
> down, red up, I suppose; I can tell blue from red, that's fine. "Paints: none while off. 84 of
> 300 proteins when on." 84. OK. That's a number I can say in lab meeting. "No value: 216
> proteins." And it says their colour comes from the layers underneath. Fine, so the other 216
> just stay as they were.
>
> Hang on. Over on the right it said minus 2.52 to 3.15. In the box it says minus 2.41 to 2.98.
> Which one is our data? Is one of them the old run? I'd want to check that against the
> spreadsheet before this goes anywhere.

**Minute 3. Turning it on.**

> "None while off." So it's off. The eye with the line through it -- that's off. I click the eye.

*Moderator: the layer switches on. Module color is above it in the list and paints every protein,
so the prototype's rule is that the fold-change layer now paints nothing; the picture does not
change.*

> I clicked it. Nothing moved. It's still the same colours -- green clump, pink clump, black
> clump. Did it do anything?
>
> [reads the row again] It says "paints nothing" now? It said 84 a second ago. Why would it paint
> nothing? It's our data. Is my result wrong now, or did I switch something else off?
>
> [moderator asks what he thinks is going on] I don't know. Something else is winning, I
> suppose. That's her job, the order of these. I'm not dragging her rows around; if I move
> "Module color" I've changed her file.
>
> That's two. I'll ask her to just send me a PNG.

**Minute 4. The moderator asks him to carry on to the Export dialog anyway, to see the last step.**

> Export. OK. "Scope: Full graph, 300 nodes." Checkbox, "Current view." "2x PNG." A preview on
> the right. That's nice, actually, I can see what I'm going to get. And the legend's in the
> picture, with the counts. Ribosome 56, Proteasome 40. The PI would like that, nobody has to ask
> me what the colours mean.
>
> But it's her module colours. It's not fold change. So this is the picture I didn't want.
>
> "Background: Transparent." It's going on white paper, why would I want it see-through? I'd
> leave it. I wouldn't know.
>
> And the grey bit -- the reviewer printing it in grey. Where does it tell me what it looks
> like in grey? I can't see anything about grey, or printing. Those module colours: light blue,
> orange, green, blue, black, pink, yellow. In grey half of those are going to be the same
> middling grey. And the fold-change one, if I ever got it on -- dark blue at one end and dark
> red at the other -- in grey, the biggest ups and the biggest downs are both just dark. That's
> the whole point of the figure, which ones changed most, and which way. You'd print it and
> they'd look the same.
>
> I'd be guessing. I'd print it on the corridor printer and look at it. That's what I do with
> Prism too.

## After the task

**Single Ease Question (1 very hard to 7 very easy): 2.**

> Two. Not one, because once somebody had already made the fold-change thing, it told me 84 of
> 300 and the rest stay as they were, and the export shows me the picture before I save it, legend
> and all. That part I'd use. But I couldn't find how to put the fold change on myself, and when I
> did switch it on nothing changed and it said it painted nothing. And nothing anywhere told me if
> a reviewer could read it in grey. I'd have to print it and see.

**Would he use this instead of what he does now?**

> Not for this. What I do now is ask her for a PNG and the Excel file, and if the PI wants it
> for a paper she makes it in whatever she uses. If she'd set it up so it was already showing our
> fold change and I only had to press Export, maybe -- the preview with the legend is better than
> what she sends me. But I'm not the one who's going to work out why a colour isn't showing. I
> clicked it, nothing moved. That's the moment I stop.

## What the session showed

1. **Tom could not find how to start.** The only instruction for adding a colour is small grey
   text in the empty Styles list, and it names "Color by" and "Size by", which appear nowhere on
   the screen he was looking at. The attribute he wanted (log2FoldChange) is listed in the
   inspector but does nothing when clicked.
2. **Switching the layer on changed nothing he could see.** The fold-change layer sits under
   Module color, which paints every protein, so turning it on made it "paint nothing". The count
   dropping from "84 of 300" to "paints nothing" was noticed but not understood; he read it as his
   result being wrong. Fixing it meant reordering rows he believes belong to the sender, which he
   refused to do.
3. **Two ranges for the same column.** The inspector says log2FoldChange runs -2.52 to 3.15; the
   layer's legend says -2.41 to 2.98. Nothing explains the difference, and Tom's next move would be
   to check it against his spreadsheet before trusting either.
4. **No way to check grey.** Neither the Styles editor nor the Export dialog says anything about
   how the figure reads in greyscale or print. The diverging blue-to-red ramp puts the largest
   increases and the largest decreases at similar darkness, so in grey "changed most" survives but
   "which way" does not; the nine module colours collapse into a few greys.
5. **Transparent background by default for a printed figure** meant nothing to him and he would
   have left it.
6. **What worked:** the painted count ("84 of 300 proteins when on", "no value 216 proteins") and
   the export preview with the legend and category counts drawn into the image.
