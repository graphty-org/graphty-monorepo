# Session: a black-and-white fold-change figure -- Dr. Chen, computational biologist

**Task as given by the moderator:** "A journal wants a black-and-white figure of your fold-change
network. Write the file, then read which genes went up from the file alone."

**Screens used:** the export dialog (starting in the "signed layer" state, where the current view is
colored by log2 fold change), then the color-by-value panel.
Renders: `shots/chen-r3-signed-figure-signed.png` (the dialog as she saw it, Print look chosen),
`shots/chen-r3-signed-print-in-gray.png` (the moderator's grayscale print of that preview, handed to
her to stand in for the journal's black-and-white proof), `shots/screens__colour-by-value--numbers.png`.

**Outcome:** writing the file -- done, with one detour. Reading which genes went up from the file
alone -- failed. SEQ 3.

---

## Think-aloud

**1. Opening Export.**
"Right. Export files, top right. Good, it's a dialog, not a menu of twelve formats. Scope: full graph,
300 nodes -- that's my 300, fine. Current view is ticked, 2x PNG. Hm. PNG. The journal will want
vector, I want vector, I'm going to put it through Illustrator anyway. There's a format box that says
PNG; I'll assume SVG is in there. I'm not going to trust that until I see it."

(The format box is not wired in the prototype; she was told it offers PNG, SVG and PDF. She said:
"Then it should say which of those keeps the text as text. That's the only question I have about
the format.")

**2. The gray warning, Screen look.**
"Oh -- there's a warning under the picture. 'Fold change: +3.15 (dark blue) and -1.85 (red) look the
same in gray, so up and down cannot be told apart in print.' ... Well. Yes. That's exactly the
red-blue problem, and I have never had a tool tell me that before I sent the figure off. That's
good. That's actually good. And it names the two values that collide, not just 'accessibility
warning'. I'd believe that."

"'Use Print look.' I don't know what a 'look' is. Is that a theme? Is it going to change my style,
my palette, in the project? ... It says 'File is written with: Screen look' next to the box, so it's
about the file. OK, clicking it."

**3. Print look.**
"Right, now the check has a tick: 'Checked in gray: fold change runs light to dark from -2.52 to
+3.15, and the legend states that 0 is the middle gray.' And the legend now says 'darker is higher;
0, no change, is the middle gray.' Below 0, 148. Above 0, 152. Those add to 300, good. Methods text:
log2FoldChange, linear, diverging at 0, the range, Print look described, graphty-element version.
That's the caption half written for me. I would still add the DE method and thresholds myself, but
fine."

"But I'm looking at a colour picture. It says it checked it in gray -- show me the gray. Where's
the button that shows me what the journal is going to print? I can't check your check."

(The moderator handed her the grayscale print of the preview.)

**4. Reading the file: which genes went up.**
"...OK. So this is what the reviewer sees. Almost everything is the same middle gray. There are,
what, eight, ten dark dots? Those are presumably my big up-regulated ones. The pale ones -- I can
barely tell pale from middle; the bottom end of the bar is not much lighter than the middle."

"And which genes are they? I have no idea. The only names on the figure are MAPK1, HSP90AA1, AKT1,
MYC, UBB, UBC, YWHAZ, RPL28, RPS8, TP53 -- the hubs. Which are the least interesting genes in the
picture, by the way, that's the study-bias list. None of the dark dots has a name on it. So from
this file I can tell you 'about 150 went up and a handful went up a lot', and I can tell you that
because the legend prints the count, not because I can see it."

"And between 0 and plus one, it's a smooth ramp -- a gene at +0.4 and a gene at -0.4 are both 'middle
gray'. That's honest, I suppose, those are small changes. But then it's not diverging any more in
print, it's a sequential scale with a note on it saying where zero is. A reader can't see the zero.
I asked for a diverging palette that survives grayscale; this is a sequential one wearing a
diverging label."

**5. Looking for labels.**
"Is there a way to label the genes that went up? Label nodes by symbol where log2FC is above one?
... Current view settings: scale, format, the dots menu, copy. Nothing about labels. The dots menu
on the other state had background, legend, suffix. No labels. Maybe it's back in the style."

(She closed the dialog and went to the color-by-value panel.)

"Color by log2FoldChange, red to blue, midpoint 0, 148 below, 152 above. Same numbers, good,
consistent. Palette dropdown -- 'Red to blue'. Is there a gray-safe diverging one here, so I could
just choose it at the source instead of having the export swap it for me? It doesn't say. And
there's Fill, Shape, Stroke -- no Label. So I'd need a second style for labels, and I don't know
where that is. I'd do it in Illustrator by hand, like always. Which is exactly the chore I wanted
you to remove."

**6. Wrapping up.**
"So: the file -- yes, I could write it, and the gray warning is the best thing I've seen in an export
dialog. Reading the up genes off it -- no. Not without labels, and not with a ramp where half my
data sits within a shade of the middle."

---

## After the task

**Single Ease Question (1-7):** 3.
"Writing the file was easy once I understood 'look'. The part of the task that matters -- a reader
getting the answer from the page -- didn't work, and the tool told me it passed."

**Would she use this instead of her current tool?**
"For this figure, not yet. In R I'd do ggraph with a diverging scale, shape for up versus down, and
label the genes past my threshold with ggrepel, and I'd know it survives gray because I'd have
tested it. What I'd steal from here is the warning that names the two values that collide, and the
methods text with the counts -- I'd use it for that alone if the export is real vector. Give me
labels by a rule, a way to encode direction with something other than colour, and a gray preview
I can see, and I'd try it on the next paper."

---

## Problems observed

1. **The gray check passes a figure that cannot answer the question.** Print look makes the
   ramp monotone, so values near 0 on both sides are the same middle gray and 0 is not visible
   as a break; in the grayscale print only a handful of nodes read as "up". The check tests that
   the ends differ, not that a reader can tell up from down. Severity 3.
2. **No labels on the genes that matter.** Only hub names are drawn; nothing in the export dialog
   or the color panel labels nodes by a rule (for example, symbol where fold change is past a
   threshold). "Which genes went up" cannot be read from the file. Severity 4.
3. **"Checked in gray" with no gray preview.** The preview stays in colour; she cannot see what
   the journal will print and has to take the check on trust. Severity 3.
4. **Direction is carried by colour alone.** No second channel (shape or outline for up versus
   down) is offered, which is what survives gray and colour blindness together. Severity 2.
5. **"Look" is unexplained jargon.** She had to infer from "File is written with" that it changes
   only the file, not her project's style. Severity 2.
6. **Format defaults to PNG and does not say which choice keeps real text.** Severity 2.
7. **No gray-safe diverging palette at the source.** The color-by-value palette list does not say
   which palettes survive gray, so the fix happens only at export time. Severity 1.

## What worked

- The Screen-look warning names the exact colliding values (+3.15 and -1.85), before the file is
  written.
- Legend counts (148 below 0, 152 above) add to 300 and match the color panel.
- The methods text records the column, scale, midpoint, range, counts, the look and the
  graphty-element version -- caption-ready.
