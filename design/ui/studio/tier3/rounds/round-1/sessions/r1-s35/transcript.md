# Session r1-s35 -- Explorer Elena, task: volunteers.graphml, size by hours, who gave most

## Step 1 (start)
Command: real.mjs --start <folder> empty
Screenshot 01.png. Note: "OK, a landing page with a pretty colorful ball of dots. Big green 'Open a file' button that mentions GraphML. That's what I have. I'll click it."

## Step 2
Command: --step --click "Open a file" --upload volunteers.graphml
Screenshot 02.png: a preview table of my volunteers -- names, role, hours, trained, phone. 24 nodes, 63 edges. "Oh nice, it looks like a spreadsheet. There's an 'hours' column, that's what I need. Load button bottom right."

## Step 3
Next: click "Load".
Command: --step --click "Load"
Screenshot 03.png: blue dots in three groups with lines. A numbers panel on the right (Nodes 24, Edges 63, Density... no idea). A notice at the bottom about saving a copy. "Ooh, three little groups. That one top right looks a bit bigger -- maybe that's someone who did a lot? Let me click it and see."

## Step 4
Next: click the big-looking dot top right (1071,229).
Command: --step --click-at 1071,229
Screenshot 04.png: it picked "v11", Chen Wei, volunteer, 14 hours. The whole picture slid over to the left when I clicked. "Hm, why did everything move? Anyway -- Chen Wei, only 14 hours, so big dot does not mean lots of hours. All dots look the same size really. I need them sized by hours. There's a 'Style' tab up on the right, let me try that."

## Step 5
Next: click "Style" tab.
Command: --step --click "role=tab:Style"
Screenshot 05.png: a list -- Shape, Visibility, Text, Fill, Effects, Rendering, each with a plus. "No 'Size'... maybe size is under Shape? I'll open Shape."

## Step 6
Next: click "Shape".
Command: --step --click "Shape" -> ambiguous, did nothing (tool, not the app). Retrying by pointing at the word.
Command: --step --click-at 1234,178 (the word "Shape")
Screenshot 07.png: the word Shape went bold but nothing opened. "Huh. Nothing. Maybe I need the little plus."

## Step 7
Next: click the plus next to Shape (1404,178).
Command: --step --click-at 1404,178
Screenshot 08.png: a little menu: "Shape", "Size". "There it is -- Size!"

## Step 8
Next: click "Size" in the menu.
Command: --step --click-at 1292,238
Screenshot 09.png: a Size box with "1" in it, and a little chain-link icon next to it. "A number box. But I don't want to type one number, I want it to follow hours. What's that chain icon? Let me point at it."

## Step 9
Next: hover the chain icon (1381,212).
Command: --step --hover-at 1381,212
Tooltip: "Node size by attribute". "'Size by attribute'... attribute is probably like a column? Hours is a column. Let's try."

## Step 10
Next: click the chain icon.
Command: --step --click-at 1381,212
Screenshot 11.png: a pop-up "Node size by attribute" with "hours  2 to 52" under Data. "Yes! hours. Click."

## Step 11
Next: click "hours".
Command: --step --click-at 1022,364
Screenshot 12.png: only Chen Wei's dot got bigger. Message: "Made layer v11 for 1 node". Box top-left says "Size: hours 2 ... 52, v11: 1 of 24 nodes". "Oh no, it only did the one I clicked. I probably should not have clicked a dot first. Everyone should be sized. There's 'Everything 24' on the left list -- that sounds like all of them. Let me click that."

## Step 12
Next: click "Everything" in the left list.
Command: --step --click-at 125,248
Screenshot 13.png: right side now says "Everything -- styles all 24 nodes". Size 1, same chain icon. "OK this is the 'all of them' one. Same chain thing next to Size. Again."

## Step 13
Next: click the chain icon next to Size (1381,320).
Command: --step --click-at 1381,320
Screenshot 14.png: same pop-up, hours 2 to 52 (now under "Used elsewhere"). "hours again."

## Step 14
Next: click "hours".
Command: --step --click-at 1022,472
Screenshot 15.png: now the dots are all different sizes! "Ooh, there we go. Some are big, some tiny. The one in the middle at the join looks the biggest -- probably the person who holds everyone together AND did most hours. But no names on the dots. I'll click the big middle one."
(Chen Wei's dot stays its own size from my first try -- small note says "1 node covered by v11". Didn't really register.)

## Step 15
Next: click the big dot at 728,503.
Command: --step --click-at 728,503
Screenshot 16.png: Hannah Weiss, staff, hours 52, trained Yes. The picture swung around again so she's in the middle. The size box at top says hours go 2 to 52 -- so 52 is the top. "Hannah Weiss, 52 hours. That's the most -- the scale tops out at 52. Good, that's my answer. (Kind of annoying that everything jumps every time I click a dot.)"

Stopped here: task done.

## End (in character)
- Did I finish? Yes. The roster is in, the dots are sized by hours (big = more hours), and the person who gave the most is Hannah Weiss (staff), 52 hours.
- Ease: 5 out of 7.
- What confused me:
  - My first try only made the one dot I had clicked bigger ("Made layer v11 for 1 node"). I didn't realize the Style panel was about the dot I'd clicked. I had to find "Everything" on the left and do it again. I think Chen Wei is still on his own separate setting from that first try -- not sure if that matters for the report.
  - Clicking the word "Shape" did nothing; the size option was hiding behind the little plus, and then behind a chain icon whose only hint was "Node size by attribute".
  - The dots have no names on them, so to find who was biggest I had to click the dots one by one.
  - The whole picture slides/re-centers every time I click a dot, which made me lose my place.
  - I first guessed a bigger-looking dot was a big-hours person before anything was sized -- it wasn't (Chen Wei, 14 hours).
