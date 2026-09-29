# Session: a figure a reviewer can read in grey -- Jordan, marketing network analyst

**Participant:** Jordan, growth-marketing analyst who "does the network stuff" one or two days a
week (persona: study/personas/marketing-analyst.md). Played at 1440 by 900.

**Task as given by the moderator:** "Make the picture show which genes changed most, so a reviewer
can read it, even printed in grey."

**Screens used:** the styles list, editor and legend (screens/styles-list.html), then the Export
dialog (screens/export-dialog.html). The mocks are static pictures; where a control was clicked,
the moderator described what the page shows for it, and nothing more.

**Result:** failure. Jordan found a layer that colors by a fold change, but it covers 84 of the 300
proteins, sits under another color layer, uses a blue-white-red scale that loses its direction in
grey, and nothing in either screen let her check the grey version before exporting. She would not
send the file.

---

## Transcript (think-aloud, Jordan's words)

**[Opening the styles screen, frame 1]**

"OK -- genes. So, full disclosure, this is not my data. I do mentions and creators. But fine, a map
is a map. ... It says 'proteins' everywhere, not genes. Is that the same thing for this? I'm going
to assume yes, because otherwise I'm already stuck."

"The whole thing is orange-to-brown. Left side, 'Styles', there's 'Betweenness color', 'Hub labels',
'Degree size', 'Base style'. Betweenness I know -- that's my bridge people. That is not 'changed
most', so that's not it."

"The thing that says change is over on the right, under Attributes: 'log2FoldChange, -2.52 to
3.15'. Log two fold change. I know fold change from, like, a lift report -- two-x, three-x. Log two I
would have to Google. Negative means it went down, I think? So 'changed most' is the big numbers at
both ends. That's my guess."

**[Looking for a way to color by that attribute]**

"In Tableau I would just drag that field onto Color. So I hover the log2FoldChange row on the right
and ... nothing. No little color button, no menu. It's just a label and a range."

"Frame 11 -- the empty one -- has this line under Styles: 'No style layers yet. Add one with +, or
with Color by or Size by on any attribute.' OK so there IS a Color by on an attribute. Where? I
don't see it on any attribute row. Is it a right-click? I'm not right-clicking around a screen
looking for it."

"So the plus next to 'Styles'. I click it."

*Moderator: the page does not show what the + opens.*

"Great. So I don't know if it's a menu of things, or it makes a blank layer I have to fill in. If
it's blank, I'd look at frame 4 -- the 'Degree size' editor -- that one has 'Applies to: All
proteins', then 'Size', 'Fill', 'Label', each with a plus. I guess I'd hit plus on Fill and pick
log2FoldChange? That's a guess. The word 'Fill' is fine. 'Applies to' is fine."

**[Finding the qPCR layer, frames 7 to 10]**

"Oh wait, further down there's a list with fourteen of these. 'qPCR log2FC color'. log2FC -- that's
the fold change, shortened. And its little swatch is blue-white-red. That's the one, somebody already
made it."

"It's got the crossed-out eye, so it's off. And it says 84. Frame 10 opens it: 'paints none while
off, 84 of 300 proteins when on', 'no value 216 proteins'. Hang on. 216 have no value? The
Attributes panel on the right says log2FoldChange goes from -2.52 to 3.15, like everybody has one.
And this legend says -2.41 to 2.98. Those are different numbers."

"This is my exact problem with Talkwalker. The dashboard says one thing and the export says another.
Which one goes to the reviewer? The note says 'the qPCR file named 84 of the 300 proteins' -- so
it's a different file? Then there are two fold changes in here with almost the same name and I
can't tell which is the real one. If I were presenting this, I'd be the one getting that question."

"Also -- 'Module color' is ABOVE it in the list. Frame 9 literally says 'After the drop: module
colors win'. So if I turn the qPCR eye on, the module colors still win and the picture doesn't
change? I'd click the eye, see nothing, and think it's broken. I'd have to know to drag it up. That
drag thing in frame 8 is neat, but I only know it because the caption told me."

**[The grey question]**

"Now the actual ask: printed in grey. Blue-white-red. In grey, dark blue and dark red are the same
dark grey. White in the middle is white. So 'went down a lot' and 'went up a lot' look identical,
and the ones that didn't change are white dots on a white page, which -- honestly, for 'which changed
most', dark equals changed is kind of what you'd want? But the reviewer can't tell up from down,
and the legend strip will just be dark-light-dark with no way to read it."

"I'm looking for a 'preview in greyscale' or a palette that says 'prints OK' or 'colorblind safe'.
The scale editor in frame 1 has a 'Palette' box -- 'Orange to brown' -- but that one's read only.
I can't see what else is in that list. Nothing on this screen mentions print, grey, projector,
anything."

"What I'd actually do for grey: make the size show how much it changed, and label the top ten. Size
survives a photocopier. There's 'Degree size', so size-by-a-number exists. But size by fold change
would make all the negative ones tiny, because the negative numbers are smaller. I'd need, like,
'size by how far from zero'. I don't see that. And labeling the top ten -- 'Hub labels' uses a
range, 'degree 17 to 34'. I guess I'd make a rule 'log2FoldChange above 2 or below -2'? That's the
kind of thing I'd do in Excel with ABS() and give up doing here."

**[Export dialog]**

"OK, Export button, top right, blue. Clear. It opens this big dialog. Left: Figures, 'Current view',
ticked, '2x PNG'. Right: the picture 'as it will be written', with the legend built in. That, I
like. That's the 'what's purple' problem solved, at least in color."

"'Include legend' toggle -- on. Good. 'Background: Transparent. Also: White, Light canvas.' For
print I'd pick White; transparent in a Word doc is sometimes a gray box. Fine."

"But it's ticked for three files. 'One methods file for this export' is ticked by default, and a
second view, 'Figure 3: modules'. The button says 'Export 3 files'. I wanted a picture. I'd untick
stuff. Fine, but I'd probably miss 'Figure 3' the first time and end up with two PNGs and a text
file in Downloads."

"'3 files go to your Downloads folder. Nothing is uploaded.' -- that line I actually like. That's
the thing legal would ask."

"The preview is in full color. There is no 'show me this in grey' anywhere. So I'd export it, open
it in Preview, and do the grayscale filter myself to see if it survives. Which I can do. But the
task was 'even printed in grey' and the tool has no opinion about it."

"The methods text on the right, in the other example, says 'Okabe-Ito palette'. No idea what that
is. If it means 'safe for colorblind and print', say that in words."

**[Wrapping up]**

"So where am I? I think I can get a picture out. I can't get the RIGHT picture: the fold-change
layer covers 84 of 300, it's under another layer, there are two different ranges for the same-ish
number, and I have no way to check grey before it goes. I would not send this to a reviewer. I'd
ask whoever made the qPCR layer which fold change is the real one, and I'd probably do the grey
version in PowerPoint."

"Slightly off topic, but this is the same thing with my VP. Everything we send gets printed by an
EA on the office printer in black and white, and my beautiful cluster colors turn into five shades
of mud. No tool has ever warned me. Not Gephi, not Brandwatch."

---

## After the task

**Single Ease Question (1 very hard to 7 very easy): 2.**

"I found the right-ish layer by scrolling a long list, not because the screen led me to it. Turning
a column into a color should be one move from the column. And grey I just couldn't do in the tool."

**Would you use this instead of your current tool?**

"For this job -- a print figure -- not yet. Gephi doesn't do grey either, but at least I know its
tricks. What would move me: click the fold-change column and get 'Color by' right there; a palette
that says in plain words 'prints in grey' or a grey preview in the Export dialog; and when the same
measure has two different ranges on one screen, tell me why before I show it to anyone. The
legend-in-the-image and the 'nothing is uploaded' line are genuinely better than what I have. If
those grey and color-by pieces were there, I'd try it for my next deck."

---

## Problems observed

1. **No visible way to color by an attribute from the attribute itself.** The empty-state text
   promises "Color by or Size by on any attribute", but the attribute rows in the inspector show no
   such control. Jordan hovered the log2FoldChange row expecting a Tableau-style "color by" and found
   nothing. Severity 3.
2. **What the Styles + opens is not shown.** Jordan could not tell whether it opens a menu of layer
   kinds or a blank layer; she guessed at "Fill +" from another frame. Severity 2.
3. **Two fold-change ranges that do not match.** The inspector shows log2FoldChange -2.52 to 3.15;
   the qPCR log2FC layer's legend says -2.41 to 2.98 and "no value 216 proteins". Nothing on screen
   says these are two different sources. Jordan read it as the tool disagreeing with itself and
   stopped trusting both. Severity 4.
4. **A layer turned on can change nothing.** The qPCR layer sits under Module color, which the
   frame caption says "wins". Turning its eye on would leave the picture unchanged, with no message.
   Jordan knew only because of the caption. Severity 3.
5. **No grey or print check anywhere.** Neither the palette picker (read only, options not shown)
   nor the Export preview offers a greyscale view or names palettes as print-safe. A blue-white-red
   diverging scale loses direction in grey, and the white middle vanishes on a white background.
   The task's core requirement could not be met or verified in the tool. Severity 4.
6. **"Changed most" needs magnitude, which is not offered.** Sizing or labeling by distance from
   zero (both directions) has no visible option; size by a signed value would shrink the strongly
   negative ones. Severity 3.
7. **Export defaults write more than the picture.** "Export 3 files" (a second saved view and a
   methods file ticked by default) when she wanted one image. Severity 2.
8. **Jargon in the only place the palette is named.** "Okabe-Ito palette" in the methods text means
   nothing to her; if it is a print or colorblind-safe palette, the screen should say so in words.
   Severity 1.

## What worked for her

- The legend is drawn into the exported image, with counts: "that's the 'what's purple' problem
  solved."
- "3 files go to your Downloads folder. Nothing is uploaded." answered the data question without
  being asked.
- The preview "as it will be written", with pixel size and background, before saving.
- The layer editor's "no value 216 proteins" line -- it was the thing that exposed the mismatch,
  even though it made her distrust the numbers.
