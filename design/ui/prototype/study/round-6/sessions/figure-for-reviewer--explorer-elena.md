# Session: a figure a reviewer can read in gray -- Elena, first-time graph user

Participant: Elena (fictional; persona: study/personas/explorer-elena.md), a product manager with
no graph training who makes network pictures occasionally and voluntarily. Played on the long
clock ("curious afternoon"): no deadline, three or four dead ends tolerated. Laptop, 1440 by 900,
trackpad, browser at 100 percent (110 percent late in the session).

Task, as the moderator gave it: "A reviewer wants a figure of this network they can read even when
printed in gray. Get it to them."

Screens, in order: the Style stack at rest with the betweenness color layer open (styles-list),
the Color popover choosing a value for a new layer (colour-by-value), the same layer colored by
fold change (colour-by-value, numbers state), the project-name menu (export-dialog, ways-in-menu),
the Export dialog in the Screen look and then in the Print look, the app after export
(export-dialog, done). The Look menu in the Style stack (styles-list, looks) was shown only when
the moderator asked about it near the end. The inspector was not reached.

Renders she looked at (all in shots/): tasks/figure-for-reviewer/01-styles-list.png,
tasks/figure-for-reviewer/02-colour-by-value.png, r6-elena-fig-numbers.png,
r6-elena-fig-export-ways-in-menu.png, tasks/figure-for-reviewer/03-export-dialog-figure.png,
tasks/figure-for-reviewer/04-export-dialog-figure-grey.png, r6-elena-fig-export-done.png,
r6-elena-fig-looks.png.

The open project is a 300-protein "Stress response study", not her own data. She was told it was
"someone's project you've been handed".

---

## Think-aloud transcript

**Reading the task.** "A reviewer." In my world that's whoever reads the deck before it goes to
leadership. "Printed in gray" -- yes, the kitchen printer, where my red and green bars come out as
the same blob. So: a picture file, that still works without color. "Get it to them" -- I'll
download it and put it in Slack. I don't expect the app to send it for me.

**First screen (the style one).** OK, brown dots. Orange to dark brown. There's a box open on the
right, "Betweenness color", and another one in the middle with a little bar chart. I don't know
what betweenness is. Bottom left there's a key: "Color: betweenness, 0 to 0.138, log scale." So
darker is... more betweenness. Fine.

Honestly, orange-to-brown already looks kind of gray-friendly? Light and dark. Maybe I'm already
done with the colors and I just need to download it. That big dark one in the middle -- that's
the main one, everything goes through it. (She was pointing at a large node near the center; its
size is degree, per the key she had not scrolled to.)

**Looking for Download.** Top right: "100%". That's it. No Share, no Download. That is where it is
in every single tool I use. OK. Two-finger tap on the picture for a right-click -- I never know if
my trackpad did it. Nothing I could see.

Three lines, top left. That's always the menu. (Moderator: "That menu isn't drawn in this mock.")
OK, then I don't know.

**Detour: the colors change on me.** (The moderator moved her to the next screen.) Now the dots
are all gray and there's a "Style layer 1" box and a list: log2FoldChange, module, degree,
betweenness, closeness. Did I just wipe the brown? I didn't mean to. I probably clicked something.

Then the next one is red and blue. "log2FoldChange color". Red below 0, 148; blue above 0, 152.
OK, so red is the down ones, the bad ones, and blue is fine. There's a line in the popover about
"use Reverse for the opposite" -- I didn't read that far. I'm going to leave the colors alone now;
I've changed enough things I didn't mean to change.

(Moderator note: the three screens start in different states. She did not change the colors; she
took it as her own doing, as in the last round.)

**Finding Export.** Back to finding where to download. I clicked the little arrow next to "Stress
response study" -- I thought the name was a title, but there's an arrow, so why not. A dark menu:
Open, Update with new data, **Export...**, Download project file, Version history. Export is right
there. "Download project file" made me stop for a second -- is that the picture? No, "project file"
sounds like the whole working thing. Export.

(That was two dead ends -- top right, then the three-line menu -- before the name menu. On the
short clock she would likely have stopped here.)

**The Export box, first look.** Big. Left side says "Figures", and "Figure (.svg)" is ticked,
"Image (.png)" isn't. What's an SVG? I paste PNGs into Slides every day. It says SVG is "for a
paper or slides" and PNG is "for a web page or a chat". I'm sending it in chat, but it's a figure
for a reviewer... I'll leave SVG, since it's already ticked and someone picked it. I might tick PNG
too, just in case. (She did not tick it in the end; she forgot once the preview changed.)

A block of settings: View, Width "174 mm, two columns", Background White, Legend "Beside, right",
Labels "Top N by this layer's value", N 10. "Two columns" -- two columns of what? I didn't touch
any of it. It looks set up.

**The preview.** The picture on white with a key on the right. "log2 fold change. Red: down. Blue:
up. White: 0." So yes, red is down. Then "Degree, node size: number of interactions" with little
dots getting bigger. So the big ones have the most connections -- that's what I said, the big one
in the middle is the important one.

Under that a paragraph in small type: "Degree: exact, not normalized, on the full graph...
Weight: confidence, not used yet; no measure here reads a weight." I skipped it.

Above the picture there's a row that says "Look, for this file only" with Screen, Print, High
contrast. I didn't really see it at first -- my eye went to the picture. What I did see was the
yellow line under it.

**The yellow line.** "Values just above and below 0 print as the same gray." And a button, "Use
Print look". A warning icon normally makes me back off, but this is literally my task, in one line,
with one button. Clicked it.

**Print.** Oh. Now there are two pictures side by side, "The file, as written" and "Printed in
gray, the same file". That's the kitchen printer. That's great. The dots turned into triangles --
pointing up and pointing down.

And then I noticed that the button row above the picture had moved to "Print". So that's what
"Look" is. And it says "for this file only". Good -- that means I'm not changing anything in the
project for whoever gave it to me. I liked that it said that, because I was about to worry.

The check line under the pictures: "Increases and decreases stay apart in gray (148 below 0, 152
above): the triangle carries the sign." 148 and 152 -- same numbers as before. Good. I was braced
for the numbers to change on me.

"The triangle carries the sign." Sign like... a signal? Oh -- plus or minus. OK. Up triangle is
up. Down is down. Got it on the second read.

**Reading the key.** Now the key is a little table: "|change|", "down", "up", and rows like "2.4 to
3.2", "1.6 to 2.4", with 2 and 3, 13 and 22. What are the lines around "change"? Is that a typo? I
don't know that notation. I read it as "change". And "Shape is the sign; darker is a larger
change" -- OK, darker is bigger.

So: dark down triangles, those are the ones in real trouble. That's what I'd tell the reviewer to
look at. Dark up ones are the healthy ones. (The key says only direction and size of change;
nothing on it says good or bad.)

It says "Shown at 76% of print size" and the pictures are small. I zoomed my browser to 110 like I
do in the afternoon. The triangles are fine; the key text is really small, and the paragraph at the
bottom of the key I can't read at all at this size. The strip under the pictures, the four gray
squares with "2.4 to 3.2" and so on, that I could read. Is that going into the file? I think it's
just for me.

**The label list.** On the left, "2 labels hidden to avoid overlap: hide list", MRE11 +2.35,
RPL17 -2.25, and a "Select" next to each, and a paragraph about the inspector. I don't need every
name on it. Skipped.

**Files.** Bottom: "2 files go to your Downloads folder. Nothing is uploaded." Good, nothing leaves
without me. Two files: the figure and "figure-methods.txt". There's a gray box with the methods
text -- mm, pt, linear, diverging. I'm not sending a text file to a reviewer... unless it's a
science reviewer. I'd attach the picture and keep the text file in case they ask.

And the PNG -- I forgot about it. If I'd ticked it, would it be gray-safe too? The Look says "for
this file". Which file? The SVG? Both? I'd guess both, but I'd be guessing.

Clicked "Export 2 files".

**After.** Back in the app. Black bar: "Exported stress-response-study_figure.svg and its methods
file, in the Print look". Left side, under "Sent and saved": the figure, "Print look. Today 19:12,
to Downloads". It says where it went. Nice.

The picture on screen is still red and blue. For a second I thought it hadn't done anything --
then the bar said "in the Print look", and the Look box said "for this file only", so it's only
the file. That makes sense now.

Also: there's an "Export..." button right there at the top of this left panel, next to "Data". I
would have clicked that if I'd been on this panel. I was on the other one.

"Get it to them": Downloads, open it, check it opens, drag into Slack: "gray-safe version --
triangles point the way it moved". In our dashboard there's a Copy image I paste straight in; here
it's download, find, drag. One extra step.

**The Look menu in the Style stack (moderator asked).** The moderator asked if I'd noticed "Look:
Screen" in the right-hand panel. I saw it -- I thought it was a settings thing. Opened it: "Look for
the whole project. Screen, Print, High contrast. Print: reads in gray on white paper and for
color-blind readers." Oh -- that's exactly what I needed, at the start. But "for the whole
project" -- that's someone else's project, I wouldn't touch that. So there are two of these? One for
the project and one for the file? I'd use the one in the Export box, it's the one that doesn't
change anything.

---

## Single Ease Question

"Overall, how easy or difficult was this task?" (1 = very difficult, 7 = very easy)

**5.** "Once I was in the Export box it was really easy. The yellow line told me the gray problem
and gave me the button, the two pictures side by side are the best part, and this time the numbers
didn't jump around on me. Getting there was the annoying part -- I looked top right, then the three
lines, then found it under the name. And I still don't know if the PNG would be the gray one, or
what the lines around 'change' mean."

## Would she use this instead of her current tool?

"For a network picture, yes. I don't have a tool for this -- I'd ask the comms person to do it in
Flourish. And nothing I use warns me a chart won't survive the black-and-white printer; Slides
certainly doesn't. So yes, for the picture. I'd be nervous if the reviewer asked what 'log2 fold
change' or 'not normalized' means, because I couldn't say. On my own spreadsheet, with my own column
names, I'd be fine."

---

## Moderator notes

- **Where engagement dropped:** at the paragraph under the preview legend ("Degree: exact, not
  normalized ... Weight: confidence, not used yet"), the methods text box, and the hidden-labels
  list with its paragraph about the inspector. Answers got short ("skipped", "I don't need every
  name") and she moved on.
- **Finding Export:** two dead ends before the project-name menu -- the top right, where she looks
  first in every tool, and the three-line main menu. The Data panel's own Export... button was not
  on the panel she was looking at; she noticed it only on the after-export screen. On the long
  clock this cost nothing; on the short clock two dead ends in a row is where she stops.
- **The Look control in the dialog:** she did not notice "Look, for this file only" before acting.
  The warning line and "Use Print look" carried her, and she understood the control only after it
  had switched. Once she read "for this file only" it removed her worry about changing someone
  else's project, and it explained why the canvas stayed red and blue after export.
- **Missed control:** the Look menu in the Style stack header, which describes her exact task. She
  saw it and took it for a setting. When shown, "for the whole project" made her unwilling to use
  it, and she asked whether the two Look controls are the same thing.
- **Counts held:** the gray check line now repeats the same 148 below and 152 above that the color
  key showed. She noticed and was relieved; last round's different counts cost her a sum.
- **Words she did not have:** "SVG", "two columns", "the triangle carries the sign" (understood on
  a second read), "|change|" (read the bars as a typo), "log2", "not normalized", "diverging".
- **Misreadings stated confidently:** the dark brown node in the middle on the first screen is "the
  main one, everything goes through it"; red means bad and blue means fine; dark down triangles are
  the ones "in real trouble" and dark up triangles "the healthy ones"; big nodes are the important
  ones. The key says direction and size of change only; nothing on screen said it is not a
  good-or-bad scale.
- **Self-blame:** the colors changing between the first three screens (betweenness brown, then
  gray, then red and blue) she took as something she had clicked. Those are screens starting in
  different states.
- **Unanswered:** whether a PNG would be written in the Print look too. The dialog's Look line says
  "for this file only" while two figure rows sit under one Figures heading; she guessed "both" and
  said she was guessing. She did not tick PNG in the end.
- **Legibility:** at 76 percent of print size the key's table and footer were unreadable to her
  even at 110 percent browser zoom; the gray-steps strip under the previews was readable, and she
  was unsure whether it goes into the file.
