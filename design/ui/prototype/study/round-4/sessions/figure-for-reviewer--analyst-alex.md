# Session: a figure a reviewer can read in gray -- Analyst Alex

**Participant:** Alex (fictional composite; persona in `study/personas/analyst-alex.md`), data analyst
on an operations analytics team. Makes the network picture in Gephi, computes the numbers in
NetworkX, pastes both into PowerPoint. Mild red-green colour vision deficiency.
**Task, as the moderator gave it:** "A reviewer wants a figure of this network they can read even
when printed in gray. Get it to them."
**Screens, in order:** screens/navigation (the "New: at rest" and "New: project menu" frames),
screens/styles-list (the Look menu, frame 17), screens/colour-by-value (numbers and categories),
screens/export-dialog (frames 1 to 7), flows/export. Viewed at 1440 x 900.
**Outcome:** success, with difficulty. **Single Ease Question:** 5 of 7.

Shots cited: `shots/r4-alex-grayfig-navigation.png` (the frame at rest),
`shots/r4-alex-grayfig-print-gray-zoom.png` (the "Printed in gray" preview, enlarged 2x),
`shots/screens__styles-list-looks.png` (the Look menu).

## Transcript (think-aloud)

**1. The frame at rest (navigation, "New: at rest").**

> "OK. Printed in gray. So in Gephi I'd go to Preview, pick... honestly I'd pick a different
> palette by hand and print one on the office printer to see if it survives. Usually it doesn't.
> The purple and the blue come out the same gray and somebody asks which cluster is which.
> So. Where's export. Top left there's the three lines -- that's File, surely."

He clicks the hamburger. The mock does not draw what is inside it.

> "Nothing. OK, it's a mock, fine, but that's where I'd go first, every time. If Export isn't in
> there I'm going to be annoyed."

He scans the right panel. Counts: 77 nodes, 254 edges, 1 component.

> "Counts up top, good, that's the thing I check. Style stack... 'Look: Screen'. Look? What's a
> Look. That's a dropdown with 'Screen' in it. Screen versus what -- projector? I'll leave it,
> I don't know what it does and I've got unsaved stuff."

He tries the chevron beside the project name, "Les Miserables".

> "Export, Ctrl+Shift+E. Under the project name. Not where I'd look, but it's the first item, so
> fine. I'd learn the shortcut."

(The network on this screen is the Les Miserables sample, coloured by group. The moderator points
him to the export screens as "this network", the 300-protein one coloured red to blue.)

**2. The Look menu (styles-list, frame 17).**

He opens the "Look" dropdown he skipped earlier, because the moderator's screen list sends him here.

> "Oh. 'Print -- reads in gray on white paper and for colour-blind readers.' OK, that's literally
> the task. And colour-blind, that's -- yeah. I'd like that. I don't usually say anything, I just
> squint at the legend.
> 'Look for the whole project.' Hm. Whole project. So if I flip this, does my screen go gray?
> Does my colleague's copy go gray? I just want the file to be gray-safe, not my working view."

He reads the footer line.

> "'Colors you set by hand are kept.' So... if I picked a colour by hand, Print leaves it alone?
> Then it's not gray-safe any more, is it? It doesn't warn me which ones. I'd want it to say
> 'these three colours you picked will print the same gray'."

He does not pick Print here.

> "I'm not changing a whole-project thing to make one figure. I'll look for it in export."

**3. Colour by value (numbers frame, then categories frame).**

> "Red to blue, diverging, 'the palest colour is 0, not missing'. Red and blue I can do. It's
> red and green that gets me. Fine."

Then the categories frame, one colour per module, eight colours.

> "This is my deck. Mine is never a fold change, it's communities. Eight colours, 'Eight distinct
> colors'. Sky blue, orange, green, blue, black, the orangey red, pink, yellow.
> Honestly Proteasome and DNA repair look like the same orange to me. Two oranges.
> And the Print thing said 'where a colour shows a direction, a shape shows it too'. My
> communities don't have a direction. So what does Print do with eight communities in gray?
> Eight grays? That's the question the reviewer actually has for me, and nothing here answers it."

He looks for a gray-safe or pattern option in the Palette dropdown. The frame shows only "Eight
distinct colors".

> "Not here. OK. I'll do the one I've got."

**4. Opening Export (export-dialog, frames 1 and 1b).**

> "There's an 'Export...' button in the Data panel too. And 'Export table...' by the table. And
> the project menu. Three doors. Do they all go to the same place? ... The dialog looks the same
> from each, OK."

**5. The figure (export-dialog, frame 2).**

> "Scope: full graph, 300 nodes. Good, it tells me. Figure (.svg), 174 mm, two columns. Millimetres.
> I don't think in millimetres, I think in 'a slide'. Oh -- 'Also: 254 mm, a slide'. OK, there it
> is, under it.
> Legend beside, right. Labels top 10, two hidden to avoid overlap, show list. Good, it tells me
> it dropped two. Gephi just drops them.
> And at the bottom: 'Values just above and below 0 print as the same gray.' Huh. It checked for
> me. That's the thing I'd have found out from the office printer. 'Use Print look.' Yes."

He reads the footer of the dialog.

> "'2 files go to your Downloads folder. Nothing is uploaded.' Good. That's the line I want."

**6. The Print look (export-dialog, frame 3).**

> "Two pictures. The file, and 'printed in gray, the same file'. OK, that's -- that's actually
> what I wanted. I don't have to print it to find out.
> Triangles now. Up triangle for up, down for down, circle for no change. Darker is bigger. OK.
> The director will ask why they're triangles, but the legend says 'shape is the sign', so I can
> point at that."

He checks the numbers, as he always does.

> "Hang on. Before it said 148 below 0, 152 above. Now it's 120 below, 133 above, 47 'within 0.25
> of 0'. 120 plus 133 plus 47 -- 300. OK, it adds up, nothing lost. But 0.25? Who picked 0.25?
> I didn't. Twenty-eight of my 'down' ones just became 'no change'. If the reviewer asks why that
> gene isn't counted as down, I have to know where 0.25 came from and how to change it. The
> dialog doesn't say. The methods text says it, but not where to set it."

He zooms into the gray preview (shot `r4-alex-grayfig-print-gray-zoom.png`).

> "In the clumps, honestly, the little triangles run together. Up and down look like a gray
> mush at this size. The big dark ones I can read. The small light ones, no.
> And the size legend is still circles -- the nodes are triangles now. It's minor, but somebody
> will ask."

**7. Where the setting lives.**

> "So is this Print thing just for this file, or did it change my project? The canvas behind is
> still red and blue, so I guess just the file. And the Look dropdown in the style stack still
> says Screen. So there are two Look switches, one in the stack and one in the dialog, and they
> don't agree. Which one does next month's rerun use? If I save the recipe, does it remember I
> wanted Print for the reviewer version?"

**8. Writing it (export-dialog, frames 7 and 8).**

> "Export 2 files. The SVG and the methods text. Toast: 'Exported ... in the Print look'. And on
> the left, 'Sent and saved: figure.svg and its methods file, Print look, today 19:12'. OK, so
> there's a record of what I sent and in which look. That's good -- next week somebody asks 'which
> version did you send the reviewer' and I can see it."

**9. The flow page (flows/export), skimmed.**

He reads the boxes, not the paragraphs.

> "In this one she sets 'No change within 0.58' when she makes the colour. OK, so that's where the
> 0.25 would come from -- the colour layer. But in the dialog I never saw that step, it was just
> there. And here the files are called '..._current-view.svg' and '..._methods.txt', but the
> dialog said '..._figure.svg' and '..._figure-methods.txt'. Which is it? That's the kind of thing
> where I tell a colleague 'look for the figure file' and it's called something else.
> And the flow says 'Methods text checked' -- there's no methods checkbox in the dialog I saw. It
> just always writes it. Which is fine, I'd rather it always wrote it."

## Single Ease Question

**5 of 7.**

> "What took longest was finding Export -- I went to the three lines first and it isn't drawn
> there -- and then working out where the 0.25 came from, which I still don't know. Once I was in
> the dialog it was quick. The check under the preview did the office-printer step for me."

## Would he use this instead of his current tool?

> "For this figure, yes. In Gephi I'd be guessing a palette and walking to the printer. Here it
> told me it would fail, fixed it in one click, and showed me the gray version before I wrote the
> file. And it wrote down what it did, so I'm not rebuilding the legend by hand.
> For the monthly deck, not yet. My deck is coloured by community, not up and down, and nothing I
> saw says what the gray version does with eight communities -- and two of the eight already look
> the same orange to me. Show me that working and I'd stop doing the picture in Gephi."

## Moderator notes (not Alex)

- The study view (`?study`, `kit/shoot.mjs --study`) of `screens/navigation.html` and
  `flows/export.html` renders a blank white page at 1440 x 900; the plain view renders. The
  participant was shown the plain views.
- `shots/screens__colour-by-value--categories.png` predates the page's latest edit and shows the
  old layout (header Export files... button, Results and Styles in the left panel). A fresh render
  of the page shows the new layout; the participant was shown the fresh render.
