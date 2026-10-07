# Session r3-s11 -- Elena (first-time product manager), task T10 A: names on every dot, Les Miserables

Start: empty app.

## Step 1
Command: `node tool/real.mjs --start rounds/round-3/sessions/r3-s11 empty`
Saw (01.png): a dark start page. Left: "Open project or file...", "New from data...". Middle: Recent projects (empty). Right: Samples, with "Les Miserables -- 77 characters" first. A cookie-style box at the bottom asks to share usage data.
Thought: "Good, the sample is right there. First I'll get rid of that data-sharing box, I always say no."

## Step 2
Command: `--click "No thanks"`
Saw (02.png): the box went away. Start page otherwise unchanged.
Thought: "Now open the Les Miserables sample."

## Step 3
Command: `--click "Les Miserables"`
Saw (03.png): the drawing opened right away -- blue dots and grey lines on a light canvas, no names anywhere. Left panel: a search box, "Selection", "Everything". Right panel: "Graph -- From Les Miserables", two tabs "Style" and "Values" (Values is showing numbers: Nodes 77, Edges 254, Density...). A small toolbar at the bottom with a flask icon, a chart-ish icon, "3D" and a magnifier.
Thought: "OK, it loaded fast, nice. No names, as promised. Names on dots feels like a look thing, so 'Style' is where I'd go."

## Step 4
Command: `--click "Style"`
Saw (04.png): Style shows "Canvas -- Background F5F5F5", then "Method: Force - Recommended", Shape 3D/2D, Spring length, Gravity, Advanced. Nothing about names or text.
Hesitation: "Hm. This is about the background and how the dots get arranged, not about the dots themselves. 'Spring length'? 'Gravity'? Not for me." 
Thought: "The left side says 'Everything' with a little stack icon. Maybe that's the settings for all the dots. I'll try that."

## Step 5
Command: `--click "Everything"`
Saw (05.png): "Everything" is highlighted on the left and the right panel now says "Everything -- Style / Values", with Nodes/Edges toggle, Fill color, Shape size, Effects, and -- there it is -- "Label" with a plus sign. Also "Tooltip".
Thought: "Label! That must be the names. The plus probably adds it. I'll click the plus next to Label."

## Step 6
Command: `--click-at 1419,362` (the + beside "Label")
Tool said: `at 1419,362: button "Add label line"`.
Saw (06.png): a little "Label" popup opened next to the panel with "Find an attribute" and a list: "id", "name". A row "Pick an attribute" appeared under Label in the panel.
Hesitation (brief): "'Attribute' is a techy word, but the choices are obvious -- I want the character's name, not an id."

## Step 7
Command: `--click "name"`
Saw (07.png): names appeared on the drawing right away -- Blacheville, Fameuil, Myriel, Napoleon, Perpetue... -- in small black text above the dots. The panel now reads "Label: Aa Above | Abc name" and under it, in small grey, "77 labels, 7 hidden" and a checkbox "Show all labels".
Thought: "Great, that was quick. But it says 7 are hidden, and I was asked for every character. Some in the crowded middle look missing. That checkbox is exactly what I need."

## Step 8
Command: `--click "Show all labels"`
Saw (08.png): checkbox ticked; the grey line now says just "77 labels" (no "hidden"). New names showed up in the middle (Gillenormand, Marguerite, Mother Innocent, Mlle Gillenormand, Mme Pontmercy...). Every dot I scan has some text beside it, though the middle is a tangle of tiny overlapping words.
Thought: "77 labels, 77 characters -- that matches. The center is hard to read on a laptop, so let me zoom in on the middle to make sure those dots really have names and not just a smudge."

## Step 9
Command: `--wheel 720,420,-400`
Saw (09.png): zoomed in only a little. The names grow with the drawing, so they are still tiny in the middle, but I can see every dot in the tangle has a word next to it (Javert, Valjean's area, Gavroche, Cosette, Marius...). Some center names overlap each other and I could not read all of them without zooming a lot more.
Thought: "Every character has their name now -- the panel even counts 77 labels for 77 characters. Reading the middle on a call would be painful, but that's not what I was asked. I'm done."

## End
Command: `node tool/real.mjs --end rounds/round-3/sessions/r3-s11`

## Debrief (in character)

- **Did I finish?** Yes. Every one of the 77 characters has a name next to its dot ("77 labels", nothing hidden).
- **Ease: 6 out of 7.** Five clicks after opening the sample: Everything, the + next to Label, "name", then "Show all labels".
- **Where I hesitated or got confused:**
  - My first guess, the Style tab on the opening screen, was the wrong Style: it was background and "Spring length / Gravity", nothing about the dots. Two places called "Style" (one for the graph, one under "Everything") is confusing. I only found the right one because "Everything" on the left sounded like "all the dots".
  - "Label" with a small plus did not say "names"; I guessed. The popup said "Find an attribute" -- a word I don't use -- but "name" in the list made it obvious.
  - After picking "name", the drawing quietly left 7 characters unnamed ("77 labels, 7 hidden" in small grey text). If I hadn't read that tiny line I would have thought I was done when I wasn't. The "Show all labels" box fixed it in one click.
  - With every name on, the middle of the drawing is a pile of tiny overlapping words. Fine for this task, but I couldn't put it on a slide as-is.
