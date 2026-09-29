# Session: a figure a reviewer can read in gray -- Jordan, marketing network analyst

Participant: Jordan (fictional; persona: study/personas/marketing-analyst.md), growth-marketing
analyst who "does the network stuff" one or two days a week. Her decks get printed in grayscale.
Played at laptop width, 1440 by 900.

Task, as the moderator gave it: "A reviewer wants a figure of this network they can read even when
printed in gray. Get it to them."

Screens, in order: the navigation mock (the app at rest), the Data panel, the Style stack's Look
menu, the Export dialog (the three ways in, the figure in the Screen look, the same figure in the
Print look, the written state), and the export flow page.

Renders she looked at: shots/screens__navigation.png, shots/screens__data-panel.png,
shots/screens__styles-list-looks.png, shots/screens__export-dialog.png,
shots/screens__export-dialog-figure-grey.png, shots/flows__export.png, and the Export dialog page
in the participant view (tmp/figure-for-reviewer--marketing-analyst/export-dialog-full-00.png to
-07.png). The open project on the export pages is a 300-protein study colored by fold change, not
her own data; she went along with it.

---

## Think-aloud transcript

**Reading the task.** OK, "printed in gray". This is literally my life. Every deck I make gets
printed on the office printer that only does black and white and then someone asks me what
purple means. So what I want is: one picture, a key on it, and the colors still mean something
when it's gray. And "get it to them" -- I'm assuming that means I download a file and email it.
I'm not expecting the tool to send anything, and honestly I'd rather it didn't.

**The app at rest (navigation).** Left rail: Graph, Data, Notes, Assistant off, "Nothing is
sent." Fine. There's no Export button top right. My Gephi reflex is File, Export. Here there is no
File. Three lines top left, so that's a menu. I'll try that first.

**The menu under the project name.** Oh, it's the project name that has the menu: Rename,
Duplicate, Project info, Update with new data, Version history, Export... Ctrl+Shift+E. OK, found
it on the first try, because "Export" is a word I'd look for. I also see an "Export..." button on
the Data panel header, and "Export table..." over the table. Three buttons. Are those three
different exports? The one over the table I'm guessing gives me the table, which is the thing I
usually get by accident when I wanted the picture. I'll go with the project menu one.

**Detour: the Look menu.** Before I opened it -- on the right panel there's a "Look: Screen"
dropdown in the Style stack. I clicked it out of curiosity. "Print: reads in gray on white paper
and for color-blind readers. Where a color shows a direction, a shape shows it too." Well, that is
exactly my task in one sentence. I'd probably have picked Print here and then gone to Export. I'm
not sure if that changes my screen for everybody on the project, though -- it says "Look for the
whole project". I don't want my working view to go all triangles. I backed out and went to Export
instead, figuring the export would have its own switch. It did.

**The Export dialog, first look.** Left side is a checklist: Figure (.svg) ticked, Image (.png),
Table (.csv), Findings report (.html), Graph file, Share the setup. Good -- it says Figure versus
Table in plain words, so I am not going to get the CSV by mistake this time. That's my number one
export complaint and it's handled.

SVG. Hm. My reviewer -- if it's the VP or an outside reviewer, do they open SVGs? PNG is safer for
email and slides. For a printout though, the note says "Vector, with real text. For a paper or
slides." Fine, I'll leave SVG. If they complain I'll come back for the PNG.

Width "174 mm, two columns". Background white. Legend "Beside, right". Labels "Top N by this
layer's value", N 10. I skipped most of that -- defaults look sane. The legend being on by default
is the thing I care about. I have literally pasted keys into PowerPoint by hand.

**The warning.** Under the preview, a yellow dot: "Values just above and below 0 print as the same
gray." and a button "Use Print look". OK, so it's telling me the default would fail my exact task.
I like that it caught it. I would not have caught it -- I'd have hit Export and found out when the
printout came back. Although I'll say, it's one small line in the middle of a big dialog. If I
were in a hurry I think I'd have skimmed straight to the blue button. The Look tabs are right
there too, "Screen / Print / High contrast", which I only noticed after the warning.

**After Use Print look.** Now there are two pictures side by side: "The file, as written" and
"Printed in gray, the same file." That's actually really nice -- that is the test I do by hand,
print it and squint. Triangles up, triangles down, circles for "no change". The check line has a
tick: "Increases and decreases stay apart in gray (120 below 0, 133 above; 47 within 0.25 of 0
drawn as no change)."

But wait, the file on the left is still red and blue. So is the file I'm sending gray or color? I
read it again: the file is color, and it also survives being printed in gray. OK. That's actually
what I want, because the reviewer on screen gets color. But the tab is called "Print" and my first
read was "this makes a gray file". Took me a second.

**Squinting at the gray preview.** At this size I honestly can't tell a pale up-triangle from a
pale down-triangle. The dark ones, sure. The small ones near the middle of the ball, no. The
legend says "darker is a larger change", so I guess the pale ones are the ones that barely moved
and nobody cares which way. I'll take the check line's word for it. I don't love taking a tool's
word for it, but there's no zoom on the preview that I could see.

**Reading the numbers, because I always do.** OK, here's a thing. The legend in the Screen look
said "148 below 0, 152 above". The Print legend says up 133, down 120, no change 47. The check
line says 120 and 133. And the methods text, in the same Print export, says "148 below 0, 152
above" on the Color line and then the up/down/no-change thing on the next line. Those do add up if
you think about the 0.25 band... I think. 148 below zero includes some that are "no change". But
the reviewer is going to see 120 on the picture and 148 in the text file, and I am going to get an
email asking which one is right. This is my dashboard-says-4,000-download-says-3,100 problem. Put
one set of numbers in the thing I send, or say in words why there are two.

**The labels.** "Labeled: the 10 largest changes, 8 shown." And "2 labels hidden to avoid overlap:
MRE11, RPL17." Nice that it tells me which ones -- in Gephi they'd just silently vanish. But the
reviewer will read "10 largest, 8 shown" on the figure and ask where the other two are. I'd
probably drop N to 8 or go to the wider slide size so they fit. I'm not going to fiddle with it
now though.

**The legend text.** It's a lot of words for a key. "Degree: exact, not normalized, on the full
graph (300 proteins, 1,262 interactions). Weight: confidence not used yet; no measure here reads a
weight." For a paper reviewer maybe that's the point -- they want the method. For my VP that's
three lines nobody reads. I didn't see a way to keep the key but drop the method lines. Fine for
this task. It would bug me for the deck.

**Getting it to them.** Footer: "2 files go to your Downloads folder. Nothing is uploaded." Blue
button "Export 2 files". Two files -- the SVG and a methods .txt. I don't really want to email a
reviewer a .txt file, but OK, I don't have to attach it. I'd rather it were optional; I didn't see
a way to untick it. I hit Export. A toast on the canvas: "Exported stress-response-study_figure.svg
and its methods file, in the Print look." And the Data panel's "Sent and saved" now lists it with
the time and "to Downloads". Good, I'll be able to find it again on Thursday when they ask for it
a second time.

Then I attach it to an email. That's the "get it to them". The tool doesn't do that part and I
don't want it to.

**Off-topic.** Honestly the gray thing is only half the fight. Last quarter the VP printed my deck
at 4-up on one page, so it didn't matter what the key said, it was the size of a stamp. No tool
fixes that.

**Wrap-up.** Did I get it done? Yes. A figure with a key, gray-safe, with a check that says so, in
under a couple of minutes, and I didn't have to open PowerPoint. The part that saved me was the
warning under the preview; without it I'd have sent the Screen look. The part that will cost me is
the two different counts in what I send.

---

## Single Ease Question

"How easy or difficult was this task?" (1 very difficult, 7 very easy)

**5.** Found Export on the first try and the dialog told me my default would fail in gray, which
is more than any tool I use does. Lost a point on the counts that disagree between the figure and
its text file, and on not being sure whether "Print" makes a gray file or a color file.

---

## Observer notes

- Outcome: success. Route: project-name menu, Export..., Figure (.svg) already ticked, warning
  under the preview, Use Print look, read the side-by-side gray preview, Export 2 files, toast,
  entry in Data > Sent and saved. She would email the SVG herself.
- She found the Look menu in the Style stack first and understood "Print" from its description,
  but did not use it there because "Look for the whole project" suggested it would change her own
  working view.
- She would have skipped the gray warning if hurried; it was the only thing standing between her
  and a failed printout.
- The count mismatch (148 / 152 in the Screen legend and the methods Color line; 120 / 133 / 47 in
  the Print legend and check) was the one thing she said a reviewer would email back about.
- She could not verify direction on the pale triangles at preview size and trusted the check line
  instead, reluctantly.
