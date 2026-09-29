# Session: a figure a reviewer can read in gray -- Analyst Alex

Participant: Analyst Alex, an operations data analyst at a logistics company. He makes network
pictures for a monthly supplier-risk deck, usually NetworkX for the numbers and Gephi for the
picture. He has mild red-green colour deficiency.

Task as read to him: "A reviewer wants a figure of this network they can read even when printed in
gray. Get it to them."

Screens, in the order he saw them (study view, the task's dataset: a 300-protein interaction
network, "Stress response study"):

1. `shots/tasks/figure-for-reviewer/01-styles-list.png` -- the style stack, betweenness colour open
2. `tmp/r6-alex-fig/screens_styles-list_html_task_figure-for-reviewer_looks.png` -- the Look menu
3. `shots/tasks/figure-for-reviewer/02-colour-by-value.png` -- choosing what to colour by
4. `tmp/r6-alex-fig/screens_colour-by-value_html_task_figure-for-reviewer_numbers.png` -- log2 fold change as colour
5. `tmp/r6-alex-fig/waysin.png` -- the project-name menu with Export...
6. `shots/tasks/figure-for-reviewer/03-export-dialog-figure.png` -- the Export dialog, Figure, Screen look
7. `shots/tasks/figure-for-reviewer/04-export-dialog-figure-grey.png` -- the same, Print look, with the gray preview
8. `tmp/r6-alex-fig/screens_inspector_html_task_figure-for-reviewer.png` -- the inspector (looked at while checking)

## Think-aloud

**Screen 1, the style stack.**

"OK, proteins. Not my world, but a network is a network. Three hundred nodes, 1,262 edges, three
components -- fine, those are right there, good. It's coloured by betweenness, orange to brown, and
sized by degree. The legend down in the corner has numbers on it, zero to 0.138, log scale. Good,
it has units-ish. 'Ten at zero, lightest.' Fine.

Gray printing. My director prints everything on the black-and-white printer by the kitchen, so I
actually know this problem. Orange to brown... that's one colour getting darker, so it probably
prints OK? I don't know. Nothing here tells me whether it does. I'd normally print a test page.

Where would I look. There's a thing next to 'Style stack' that says 'Look: Screen'. Look. That
might be it."

**Screen 2, the Look menu.**

"Look for the whole project: Screen, Print, High contrast. 'Print -- reads in gray on white paper
and for colour-blind readers. Where a colour shows a direction, a shape shows it too.' Well that's
literally my task. And the colour-blind bit, honestly, I'll take that for myself.

But 'for the whole project' makes me nervous. If I flip this, does my screen go gray? Does it
wreck the colours I spent the afternoon on? The bottom line says 'Colours you set by hand are
kept.' OK, that helps a bit. But 'set by hand' versus... what, set by the betweenness thing? I
don't know which of mine count. I've been burned by Gephi reopening without colours, so I'm not
clicking a project-wide switch the day before a readout. I'll leave it on Screen and look for the
export, that's where the file actually gets made."

**Screen 3, choosing what to colour by.**

"Wait -- this is a different picture. The betweenness layer's gone, it's all gray, and there's a
'Style layer 1'. Did I lose the betweenness colour? Oh, the moderator says the reviewer figure is
about fold change. OK, so I'm recolouring. The popup: 'Colour: apply a colour or a value'. From the
data, log2FoldChange, numbers, -2.52 to 3.15. Computed: degree, betweenness. Not computed:
closeness, 'a few seconds'. I like that it tells me how long closeness would take before I click
it -- that's the lunch-break problem. I pick log2FoldChange."

**Screen 4, fold change as colour.**

"Red to blue, diverging at zero. Red and blue I can tell apart, it's red and green that goes muddy
for me, so on screen this is fine. The legend says 148 below 0, 152 above, 'the palest colour is
0, not missing'. Good, somebody thought about that -- in Gephi I'd assume white means no data.

But nothing here says anything about gray. And now I actually think about it: red and blue, the
dark ends, in gray they're both just... dark. A down gene and an up gene would look the same. Nobody
warned me here. I only thought of it because the task said gray. 'Fix at current value' in the
corner, no idea what that does, I'm not touching it."

**Screen 5, finding Export.**

"There's no Export button up top right, which is where I looked first. I tried the project name
because that's where 'File' stuff lives in most web things -- yes, 'Export... Ctrl+Shift+E'. Fine.
Two clicks. If I did this weekly I'd learn the shortcut."

**Screen 6, the Export dialog, Screen look.**

"This is a big dialog. Figure (.svg) is ticked, 174 mm, two columns. I don't make journal columns,
but it says 'Also: 85 mm, one column; 254 mm, a slide', so I'd pick slide. The preview is the
figure as it will actually be written -- labels, legend, and a little paragraph under the legend:
'Degree: exact, not normalized, on the full graph... Weight: confidence, not used yet.' That's the
kind of footnote a reviewer asks for. I'd probably want it off for a slide, but for a reviewer it's
exactly right.

And here -- yellow warning: 'Values just above and below 0 print as the same gray.' With a button
'Use Print look'. So it does know. That's the thing I was worried about on the last screen, and it
caught it for me. OK. I'd rather it had told me back when I picked red-to-blue, but I'll take it
here.

There's also a Look row up top -- 'Look, for this file only: Screen, Print, High contrast'. Ah. So
THIS is the one that doesn't touch my project. That's the one I want. Would've saved me the worry
on screen 2 if I'd known this existed. I click Use Print look."

**Screen 7, the Print look.**

"Two previews side by side: 'The file, as written' and 'Printed in gray, the same file'. Oh, that's
nice. That's my test page, without walking to the printer. I actually trust that more than a
promise.

Triangles now. Up triangle is up, down triangle is down, darker is a bigger change. The legend is a
little table: |change| bins 0 to 0.8, 0.8 to 1.6 and so on, with a count for down and a count for
up. 2 and 3 in the top bin, 85 and 72 in the bottom one. I like the counts -- I can check them.

Line under the previews: 'Increases and decreases stay apart in gray (148 below 0, 152 above): the
triangle carries the sign.' Tick mark. Good, that's a verdict I can say out loud.

Things that bug me though.

One: at this size the picture is a pile of triangles. Three hundred of them. In the gray version I
can see the dark ones fine, but the pale bin -- 0 to 0.8, that's 157 of them, more than half the
network -- they're light gray triangles on white. I'm squinting to tell up from down on the pale
ones. Maybe that's fine because 'small change' is the point? But the reviewer will squint too.

Two: the line at the top says 'No two of its 8 categories print as the same gray.' Then the key
underneath shows two identical gray squares for each step, down and up. So... they DO print the
same gray, and the triangle is what separates them. The sentence and the key disagree. I get what
it means after a minute but if I were a reviewer I'd circle that.

Three: the Print look is 'for this file only'. The SVG is ticked. I'd also want a PNG for the
deck -- if I tick Image (.png), does it get the Print look too, or only the SVG? I can't tell from
here. That's how you end up with a colour PNG in a black-and-white handout.

Four: the methods text on the right -- 'shape is the sign, darkness is the distance from 0 in 4
gray steps, the same steps for both sides'. That's good. That goes in the email to the reviewer
word for word. And the file names, the figure plus a methods .txt. 'Nothing is uploaded' at the
bottom -- I read that. That matters to me more than anything else in this dialog.

Export 2 files. Done, I think."

**Screen 8, the inspector (checking afterwards).**

"I went to double-check what's on the canvas afterwards and... this is 'Human protein
interactions', coloured by module, and the Look box says 'Default', not 'Screen'. Different
project? Different words for the same box? And the right side is cut off -- 'undirecte',
'Change..', 'confidence, not used y'. That's the kind of thing that makes me think the tool isn't
finished. It doesn't stop the task, it's already exported, but it knocks my confidence a notch."

## Single Ease Question

**5 out of 7.**

"The export itself was easy, maybe a 6 -- the warning, the one button, the gray preview next to
the colour one, the methods file. But I had to get there by recolouring, a project-wide switch that
scared me, and a warning that only turned up at the very end. And the headline sentence says
something the key contradicts. So, 5."

## Would he use it instead of his current tool?

"For the picture half, for this kind of job -- probably, yes. The gray preview beside the file
replaces me printing test pages on the kitchen printer, and the methods .txt is a thing I have
never once got out of Gephi. Nothing uploaded, said right on the button row, is what gets me past
the data-handling question.

But I'd want three things first. Tell me about gray when I pick red-to-blue, not only at export.
Tell me whether the PNG gets the Print look too, because slides are PNG. And make the canvas look
like the same product on every screen. Then I'd try it on the supplier file -- the sanitised one,
not the real one, until IT says yes."

## Findings (moderator notes, in plain terms)

1. The gray risk is only flagged at export. On the colour-by-value screen, choosing a red-to-blue
   diverging palette gives no hint that both ends print as the same dark gray. (Severity 2)
2. Two "Look" controls with different reach: the style stack's Look is for the whole project, the
   Export dialog's is for this file only. He found the project-wide one first and was afraid to use
   it; he would have gone straight to the file-only one had he known it existed. (Severity 2)
3. The Print look headline says "No two of its 8 categories print as the same gray", while the key
   beneath shows up and down at each step as the same gray, separated only by the triangle. The
   sentence contradicts the key. (Severity 2)
4. In the gray preview, the palest bin (0 to 0.8, 157 of 300 proteins) is light triangles on white;
   up versus down is hard to read at preview size. (Severity 2)
5. Unclear whether "Look, for this file only" also applies to an Image (.png) ticked in the same
   export; he would ship a colour PNG to a gray handout by mistake. (Severity 2)
6. Moving from the betweenness-coloured stack to a gray "Style layer 1" read to him as losing his
   colours before he understood he was recolouring. (Severity 1)
7. The inspector screen shows a different project name, a module colouring, "Look: Default"
   instead of "Screen", and text clipped at the right edge ("undirecte", "Change..").
   (Severity 2)
8. "Fix at current value" on the colour-by-value popover means nothing to him; he avoided it.
   (Severity 1)
9. No Export button where he looked first (top right); found it in the project-name menu on the
   second try. (Severity 1)

## What he liked

- "Printed in gray, the same file" beside "The file, as written": a test print without the printer.
- The warning "Values just above and below 0 print as the same gray" with a one-click fix.
- The verdict line with counts (148 below 0, 152 above), and counts per bin in the figure legend.
- The methods .txt written beside the figure, which he would paste into the reply to the reviewer.
- "Nothing is uploaded" in the footer of the Export dialog, and "Nothing has been sent" under the
  project name.
- The picker telling him closeness is "not computed, a few seconds" before he runs it.
