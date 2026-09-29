# Session: a figure a reviewer can read in gray -- the recipe recipient (Tom)

**Participant:** Tom, lab manager, 52, receives the lab's network files and never builds them;
mild red-green color weakness, reads at 110 to 125 percent zoom.
**Task, as given by the moderator:** "Make the picture show which genes changed most, so a
reviewer can read it, even printed in grey."
**Screens used:** the styles list, editor and legend page, then the export dialog page (renders
at 1440 by 900, clicked as a prototype).
**Result:** partly done, with help from a note on the screen. Size ended up showing how much each
gene changed, which survives a gray print. He never got up and down onto the picture, and he did
not trust the Export preview.
**Single Ease Question:** 3 of 7.

## Transcript

### 1. The first screen

> Okay. "Stress response study". Lots of orange-brown dots. That's not what I'd call a figure,
> that's a hairball. Legend in the corner says "Color: betweenness". I don't know what betweenness
> is, and I'm not learning it at 4 pm. The question was which genes changed most. That's fold
> change. Where's fold change?

He reads down the right-hand panel slowly, leaning in.

> Right side, "Attributes": "log2FoldChange, -2.52 to 3.15". Good, it's in there. So the data is
> there, the picture just isn't showing it. It's showing betweenness, whatever that is.

Moderator note: he found the column in about 20 seconds. The text is small and gray; he read it
because it had numbers.

### 2. First try: click the fold change row

> I'd click on log2FoldChange. That's the thing I want.

He clicks the row in Attributes. Nothing on this page reacts to that click.

> Nothing. Did it do anything? ... No. Okay, maybe I clicked the wrong thing.

He goes back to the left panel.

> "Styles", and there's a little plus. Four rows: Betweenness color, Hub labels, Degree size,
> Base style. There's no fold change row. I'd press the plus, I suppose.

On the page the plus adds an empty layer and opens its editor with "Applies to", "Size", "Fill"
and "Label", each with its own plus (the degree-size editor shows the same parts).

> Now it wants "Fill", "Size", "Label", "Applies to: All proteins". Plus signs everywhere. I don't
> want to build anything. I want her version with the big changers standing out. Which one of
> these is "changed most"? I'd be guessing. I'd close this.

Moderator note: that is his first failure. By his own rule he gets one more.

### 3. Second try: a layer that is already there

The moderator lets him scroll through the page's states. He stops at the one where a layer called
"Fold change size" sits under Degree size.

> Oh, here. "Fold change size". That's what I want, somebody already made it. Underneath it says
> "Covered by Degree size above". Covered? The editor says "Covered by Degree size above: it sets
> the size of all 300 proteins, so this layer paints none."
>
> Paints none. So it's switched on and it does nothing. That's exactly the thing I hate: you press
> apply and nothing moves. At least this time it says so.
>
> Then there's a line I like: "By magnitude, sign not shown: 148 proteins went down and 152 went
> up." A number. Two numbers. 148 plus 152, that's 300, that's all of them. Fine.

He points at the size pill.

> "|log2FoldChange|". What are the two lines around it? Is that a different column from the one
> on the right? The right side says log2FoldChange with no lines. I'd ask her about that bit.

He looks at the button.

> "Move above". It doesn't say delete or replace, so I'll risk it. It's her file though. Is that
> going to move something in her file for everybody?

He clicks Move above. The page does not draw what happens next; the moderator tells him the
layer now sits above Degree size and the dots are sized by how much they changed.

> Okay, so the big dots are now the big changers, up or down. If I print that in black and white,
> big is still big. That I can live with. But the reviewer will ask: up or down? The note says
> "Color by log2FoldChange to show the direction". Where is "Color by"? It's not a button. It's a
> sentence. I'm not going to go looking for it.

Moderator note: he did not see the state where a "qPCR log2FC color" layer paints blue to red
("log2FC, -2.41 to 2.98, 0 in the middle"). When the moderator showed it afterwards he said:

> Blue and red, that I can tell apart. Red and green I can't. But it only knows 84 of the 300 --
> "216 proteins no value". And the eye is crossed out, so it's off. Is that my qPCR file? I didn't
> load anything. I'm not turning on something I didn't put there.

### 4. Gray

> Now "even printed in grey". There's nothing that says print on this screen. Is it in Export?

He does not notice the small palette icon next to "Graph" on the right. The moderator moves on to
the state where its menu is open.

> "Look for the whole project". Default, Colorblind safe, Print, High contrast. "Print -- prints
> well in gray: colors keep their order in grayscale and read on white paper." Yes. That's the one
> I want. I'd have never found that little icon, though. It looks like a paint palette. I'm not
> painting.
>
> "For the whole project." The whole project? Does that change it for her too, next time she
> opens it? I only want my figure in gray. I'd hesitate on that. I'd probably click it and then
> check whether her colors came back.

He does not read the last line of the menu ("Colors you set by hand are kept").

### 5. Export

> The big blue button: "Export files...". That's what I'd have pressed first if you'd let me.

The export dialog opens.

> "Proteostasis screen"? I was in "Stress response study". Is this a different file? And the
> picture in here is colored by module -- Ribosome, Proteasome and so on. That's not the one I
> just made. So I can't tell whether it will write mine.
>
> "View as: Color, Gray, Red-green, Blue-yellow". Gray, good, I'll check.

He clicks Gray.

> Ribosome and Proteasome are the same gray. Complex I, Spliceosome, DNA repair, same gray. So a
> reviewer can't read this in gray at all. That's the answer to my question, and it's "no".
>
> And then: "Preview only: the file is written in color." So what does the reviewer get? The
> color one. And the journal prints it gray. So this told me it will look bad and then wrote it
> anyway? Did Print do anything, or not?

He reads the bottom of the dialog carefully.

> "3 files go to your Downloads folder. Nothing is uploaded." Good. That's the one thing on here I
> believe straight away. But three files? "Export 3 files". I wanted one picture. There's a methods
> text and a "Figure 3: modules" ticked that I didn't tick. I'd untick what I don't know and hope.

## After the task

**Moderator: how easy or hard was that, from 1 (very hard) to 7 (very easy)?**

> Three. The note that said 148 down and 152 up was the best thing on there, and "nothing is
> uploaded". But I pressed plus and got a form, I pressed the fold change and nothing happened,
> and at the end the gray preview showed me it won't work and it still saves in color.

**Moderator: would you use this instead of what you do now?**

> For this? No. I'd ask her to send me a PNG with the big changers big and a legend that says up
> and down in words. I might open it to check her picture, because it told me the numbers and it
> said nothing leaves the laptop. Making the figure myself, no.

## What the moderator observed

- He found the fold change column quickly because it had numbers; nothing on the screen turned
  it into a picture from there (clicking the attribute row did nothing).
- The Styles plus opened an empty editor with Fill, Size, Label and Applies to; he could not map
  "changed most" to any of them.
- "Covered by ... paints none" was understood, and the count line "148 went down and 152 went
  up" was the moment he relaxed. "Move above" was clicked, but the page has no after-state, so he
  never saw the result himself.
- "Color by log2FoldChange to show the direction" reads as an instruction with no control
  attached; he did not look for it.
- The pipes in "|log2FoldChange|" read as a different column.
- The palette icon for Looks was not found unaided. "Look for the whole project" made him worry
  about changing the sender's file.
- In Export, the Gray preview showed the module colors collapsing, and "the file is written in
  color" left him unsure whether his figure would survive a gray print. The dialog's example is a
  different project and a different coloring from the one he had just made.
- "Nothing is uploaded" was read and trusted.
