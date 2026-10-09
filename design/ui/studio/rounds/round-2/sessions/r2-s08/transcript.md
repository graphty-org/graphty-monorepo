# Session r2-s08 -- Elena (first-time product manager), Prompt B, friends.csv

Task: get friends.csv on screen, have the program work out who matters most in the running club,
make dots bigger for people who matter more, get everyone's name on the drawing, and finish with a
picture file with its key. Say what the sizes and colors stand for.

Tool: `node tool/real.mjs` from design/ui/studio. Session folder S=rounds/round-2/sessions/r2-s08.

## Step 1 -- start

Command: `node tool/real.mjs --start $S empty` -> 01.png

Saw: a dark start page. "Start" with "Open project or file...", "New from data...", "or drop a file
anywhere in this window". Samples on the right (Les Miserables etc). A "Your data is yours, but
please help us" box at the bottom with "Share usage data" / "No thanks".

Elena: "OK, the help-us box first -- No thanks. Then I'll just drag my file in, it says I can."

## Step 2 -- dismiss the data box

Command: `--step $S --click "No thanks"` -> 02.png

Saw: the box closed; the start page otherwise the same.

Elena: "Now I'll drag friends.csv from Downloads onto the window."

## Step 3 -- drop the file

Command: `--step $S --drop friends.csv` -> 03.png

Saw: it just opened, no questions asked. Blue balls with arrows on a light canvas. Right side:
Nodes 20, Edges 41, Direction Directed, Density 0.1079, Components 1, "Edges per node 3 to 6, mean 4.1".
Left: a search box "Find nodes, edges, values", "Selection", "Everything", and at the bottom
"Analyze (flask) in the toolbar (Shift+A) to add results here". A small toolbar at the bottom of
the canvas with a flask, a chart-ish icon, "3D", and a magnifier.

Elena: "Oh nice, that was easy -- that's my 20 people. PART 1 DONE: it's on screen. No names on the
dots though. Arrows? I guess 'who knows whom' has a direction. Let me click the one in the middle
and see who it is."

## Step 4 -- click a dot in the middle

Command: `--step $S --click-at 640,578` -> 04.png (tool: node "Ava")

Saw: the dot turned yellow-ringed. Right side now says "Ava", Node, Summary: id Ava, Degree 6 with
a little arrow. Left "Selection 1".

Elena: "Ava. She's right in the middle and has 6, and the overview said 6 was the most anyone has --
so Ava is the most important person in the club, I'd bet." (Guess, not checked.) "But the task wants
the program to work out who matters. The bottom-left says 'Analyze' with a flask in the toolbar. I
see a flask at the bottom of the picture -- I'll click that."

## Step 5 -- open the flask

Command: `--step $S --click-at 680,864` -> 05.png (tool: button "Analyze")

Saw: a list popped up over the picture, "Filter analyses", heading "Rank nodes and edges", then
Degree, Betweenness, Edge betweenness, Closeness, PageRank (with a blue "Start here" tag),
Eigenvector, Katz, HITS, All-pairs distance, Depth-first order, Most flow... each with a grey
one-liner.

Elena (hesitates): "Ugh, betweenness, eigenvector, Katz... I don't know any of these. 'Rank nodes'
-- I guess ranking is what I want, who matters most. PageRank says 'Start here' -- fine, that's the
one you're telling me to pick. Clicking it."

## Step 6 -- choose PageRank

Command: `--step $S --click "PageRank"` -> 06.png

Saw: the list became a small form: PageRank, "Which nodes are connected to other well-connected
nodes." Damping factor 0.85, Weight None, "Advanced", "Under a second", a blue Run button.

Elena: "Damping factor? No idea, leave it. Weight None -- my friend's list has a weight column I
think, but I don't know what it means, leaving it. Run."

## Step 7 -- Run

Command: `--step $S --click "Run"` -> 07.png

Saw: every dot turned orange, some darker brown. Top-left of the picture a little key: "Color:
Influence 0.04382 [orange bar] 0.06608". Left list now has "Influence 20". Ava on the right:
"Influence 0.06423, #2 of 20", Degree 6.

Elena: "Ooh, they all changed color. So it's called Influence. Ava is #2 of 20 -- so not the top,
huh, close though. PART 2 DONE, I think: the program worked out who matters. The darker ones... are
those the important ones? The bar goes light to dark, 0.04 to 0.066 -- I guess darker is more? These
numbers are all tiny, is 0.066 a lot? Anyway -- now the task says make the dots BIGGER for people
who matter more. It only did colors. There's an 'Influence' row on the left -- maybe clicking it
gives me options."

## Step 8 -- click "Influence" on the left

Command: `--step $S --click "Influence"` -> 08.png (tool: ambiguous, took the left-list row)

Saw: the Influence row highlighted with an eye icon. Right side switched to "Influence, Measure from
Influence, Oct 6", Style tab, Nodes/Edges. Fill: Color = Influence (with a minus). Then Shape +,
Effects +, Label +, Tooltip +.

Elena: "OK, settings. I don't see 'Size' anywhere. Fill is the color. Size... is that a 'Shape'
thing? Maybe. And 'Label' -- that's probably the names, I'll come back to that. Trying the plus next
to Shape."

## Step 9 -- plus next to Shape

Command: `--step $S --click-at 1420,234` -> 09.png (tool: button "Add to Shape")

Saw: a tiny menu: "Size" (highlighted) and "Shape".

Elena: "Size! There it is. Clicking Size."

## Step 10 -- pick Size

Command: `--step $S --click "Size"` -> 10.png

Saw: a new row "Size" with a box saying 1, a small chain-link icon, and a minus. Dots look unchanged.

Elena (hesitates): "Size 1. If I type a number, all of them get bigger, that's not what I want -- I
want the important people bigger. Color says 'Influence' in its box. There's a little chain icon
next to the 1 -- maybe that links it to something. Trying the chain."

## Step 11 -- chain icon

Command: `--step $S --click-at 1381,264` -> 11.png (tool: button "Size by attribute")

Saw: a pop-up "Size by attribute", "Find an attribute", under "Influence": Influence, Influence rank,
Influence percentile. Below, greyed: "Cannot be used: Holds groups, not amounts -- id".

Elena: "Size by... yes, Influence. Plain 'Influence', same as the color."

## Step 12 -- choose Influence for size

Command: `--step $S --click-at 1193,372` -> 12.png (tool: option "Influence")

Saw: the dots changed size! Ava (still yellow-ringed) is big, a very dark brown one at the bottom is
the biggest, a couple of others mid-size, most small. The key at top-left now has two lines:
"Size: Influence 0.04382 [wedge] 0.06608" and "Color: Influence 0.04382 [orange bar] 0.06608".
The Size box now reads "1 to 3".

Elena: "Ooh, OK, that's better -- now you can actually see who's who. The big dark one at the bottom
must be number one. PART 3 DONE: bigger dots = more Influence, and darker = more Influence too, same
thing twice. Now names. The 'Label' plus is right there -- clicking it."

## Step 13 -- plus next to Label

Command: `--step $S --click-at 1420,332` -> 13.png (tool: button "Add label line")

Saw: a "Label" pop-up, "Find an attribute". Under Attributes: "id". Under Influence: Influence,
Influence rank, Influence percentile. A row "Pick an attribute" appeared under Label.

Elena (hesitates): "There's no 'name'. 'id'... in my head an id is a number. But when I clicked Ava
earlier it said 'id Ava', so I guess id IS the name here. Picking id."

## Step 14 -- label = id

Command: `--step $S --click-at 1106,470` -> 14.png (tool: option "id")

Saw: names above every dot -- Omar, Pia, Quinn, Ravi, Nora, Milo, Lena, Sana, Kofi, Jada, Theo, Ava,
Ivan, Hana, Gus, Ben, Dev, Eli, Farah, Chloe. Right side: "Above", "Abc id", and "20 labels, 0
hidden to avoid overlap". At the bottom Farah and Chloe overlap a bit, Eli and Dev too, but I can
read most of them.

Elena: "Yes! Names. PART 4 DONE -- all 20, it even says so. So Farah's the biggest, darkest one --
she's the most influential in the club. Ava is second. Now a picture with the key for my doc. No
download button here... the menu with three lines at the top left usually has File stuff. Trying
that."

## Step 15 -- main menu

Command: `--step $S --click-at 23,20` -> 15.png (tool: button "Main menu")

Saw: a menu: Back to start, New project, Open project or file..., Open sample, Save, Save as...,
Save local copy..., Export... (Ctrl+E), Rename, Settings..., Keyboard shortcuts, Help.

Elena: "Export -- that's the one for a picture, I think. Not Save, Save is the project."

## Step 16 -- Export...

Command: `--step $S --click "Export..."` -> 16.png

Saw: an Export window. Left: Image, Data. Image: "A picture of the drawing, 2x, PNG". Preset "To
share -- PNG, 2x", View "Current view", Size 1x/2x/4x/400x300, Format PNG/JPEG/WebP, Background
Canvas color/Transparent. A preview: my drawing, with a tiny box in its top-left corner that looks
like the key. Ava still has her yellow ring in the preview. Buttons Cancel, Copy, Export.

Elena: "The preview has the little key in the corner, good, that's what I need. Ava's still
highlighted yellow in it, kind of odd, but whatever. Defaults look fine -- Export."

## Step 17 -- Export

Command: `--step $S --click "Export"` -> 17.png (tool: ambiguous with the dialog's own name, took the
button; a file was saved: downloads/friends_current-view.png, 1806 x 1720)

Saw (opening the file): my drawing with all the names, and a white box top-left: "Size: Influence"
with a grey wedge 0.04382 to 0.06608, and "Color: Influence" with the orange-to-dark-brown bar,
same numbers. Ava is still drawn with a big yellow ring and her dot is an olive/khaki color, not
orange like everyone else. At the bottom "Chloe" is printed right on top of Farah's big dot and is
hard to read; "Eli" and "Dev" are squashed together.

Elena: "Got it, there's my picture, and the key is in it. PART 5 DONE. Hmm -- Ava has a yellow
circle around her in the picture. Did I make her special? People in the meeting will think the
yellow means something. I'd probably have clicked off her first if I'd thought of it. And Chloe's
name is sitting on Farah. Good enough for a doc, not great."

What the sizes and colors stand for (in her words): "Both mean the same thing -- 'Influence', which
the program worked out. Bigger and darker = more influence. Farah is the biggest and darkest, so she
matters most; Ava is second. The numbers go from about 0.044 to 0.066; I have no idea if that's a
big difference, they're all tiny. The yellow ring around Ava doesn't mean anything, I just clicked
her." (She believes Influence = how many people someone knows, roughly -- not checked.)

## Step 18 -- end

Command: `node tool/real.mjs --end $S`

Session ended.

## Wrap-up, in character

**Did I finish?** Yes, all five parts: the file is on screen (dropped it, it just opened), the
program worked out "Influence", the dots are bigger for more influence, all 20 names are on the
drawing, and I have a PNG with the key in the corner.

**How easy, 1 (very difficult) to 7 (very easy):** 5.

**What went well:** Dropping the file just worked, no questions about columns. The "Start here" tag
on PageRank meant I did not have to choose between words I don't know. Running it colored
everything and put a key on the picture by itself. The export preview showed the key before I saved.

**Where I hesitated or got confused:**

- The flask list is a wall of words I don't know (Betweenness, Eigenvector, Katz, HITS). I only
  got through because of "Start here". I clicked "PageRank" and it then called the result
  "Influence" -- fine, but I'm not sure they are the same thing.
- Damping factor and Weight on the run form: no idea; left them alone.
- Making dots bigger: "Size" hides under the plus next to "Shape". I guessed. Then it was a box
  with "1" in it; making it follow Influence needed the tiny chain icon, which I only clicked
  because Color had the word Influence in its box and I hoped the chain would do the same.
- Names: the label list offers "id", not "name". I only picked it because Ava's panel had said
  "id Ava" earlier.
- The key's numbers (0.04382 to 0.06608) mean nothing to me. Is the difference big? I can't tell.
- The exported picture kept Ava's yellow selection ring and gave her a different (olive) color,
  so in a meeting people will think Ava is special. Nothing warned me that my click would end up in
  the picture.
- At the bottom Chloe's name lands on Farah's dot, and Eli and Dev crowd each other, even though
  the panel said "0 hidden to avoid overlap".
- Before running anything I decided Ava was the most important because she was in the middle and
  had 6 connections; the program later put Farah first. I would not have known without the sizes.
