# Session r1-s17 -- Analyst Alex

Task: open the Les Miserables sample, have the program find the circles (communities) each in its own color, then draw every circle's characters as cubes while keeping each circle's color.

## Step 1 -- start
Command: real.mjs --start <session> empty -> 01.png
Notes: Landing page. "Free and open source", "It never leaves your computer" under the open box -- good, that answers my data question, and it's free. There's a "Samples" button. I'll click Samples to find Les Miserables.

## Step 2 -- Samples
Command: --click "Samples#2" -> refused as ambiguous (02.png, nothing happened). Then --click "role=button:Samples" -> 03.png
Notes: Sample library. First card: "Who holds the novel together -- Les Miserables, 77 nodes, 254 edges". Nice, counts shown up front. Clicking it.

## Step 3 -- open Les Miserables
Command: --click-at 183,470 (button "Open the Les Miserables sample") -> 04.png
Notes: Loaded. Right panel says 77 nodes, 254 edges, 1 component -- matches the card. All balls are one blue. "Local only" up top, good. Now I need communities. Bottom toolbar has a flask icon -- probably algorithms. Hovering it first.

## Step 4 -- hover flask
Command: --hover-at 614,864 -> 05.png. Tooltip "Analyze Shift+A".
Notes: That's it. Clicking Analyze.

## Step 5 -- Analyze menu
Command: --click "Analyze" -> 06.png
Notes: A searchable list: Degree, Betweenness, Closeness, PageRank... with one-line descriptions. Good. Filter box has focus; typing "commun" to find community detection.

## Step 6 -- filter "commun"
Command: --type "commun" -> 07.png
Notes: "Find groups": Louvain, Leiden, Label propagation... Louvain is what I know from Gephi. Clicking Louvain.

## Step 7 -- Louvain options
Command: --click-at 600,455 (option "Louvain") -> 08.png
Notes: Resolution 1, Weight None, "Under a second" estimate -- I like that it tells me how long. There's a little gear icon with no label (seed? not sure). Hitting Run.

## Step 8 -- Run Louvain
Command: --click "Run" -> 09.png
Notes: Quick. Six groups, each its own color, legend "Color: Louvain, Group 1..6". A "Louvain" folder appeared in the left list above "Everything". Group 2 light blue and Group 4 dark blue are a bit close, and orange vs dark orange too, but I can tell them apart. No seed shown though -- will it be the same next time? Now cubes. I'd guess shape lives on "Everything" (all 77). Clicking "Everything".

## Step 9 -- Everything layer
Command: --click "Everything" -> 10.png
Notes: Right panel shows Style for Everything: Shape = Icosphere, Size 1, Fill color 6366F1 "Covered by Group 1, Group 2, Group 3 and 3 more on 77 of 77". So the group colors sit on top of this -- changing shape here should leave colors alone. Opening the Shape dropdown.

## Step 10 -- Shape list
Command: --click-at 1310,292 (combobox) -> 11.png
Notes: Long list of shapes, it's scrolled to Icosphere. Prisms, pyramids... no "Cube" visible; it's probably above. Trying to pick "Cube" by name.

## Step 11 -- no "Cube"
Command: --click "role=option:Cube" -> "nothing on screen is called Cube" (12.png)
Notes: Scrolling the list up to see the top.

## Step 12 -- top of the list
Command: --wheel 1300,200,-600 -> 13.png
Notes: Top item is "Box" with a cube icon. No "Cube" word, but a box is a cube. Clicking Box.

## Step 13 -- Box
Command: --click "role=option:Box" -> 14.png
Notes: Every node is now a cube, and the six group colors are exactly as before (orange, light blue, green, dark blue, dark orange, pink -- legend unchanged). Done.

## Wrap-up (in character)
Did I finish? Yes. Les Miserables open (77 nodes / 254 edges, matched the card), Louvain gave 6 colored groups, all nodes now cubes with the group colors kept.

Ease: 6 out of 7.

What took longest / confused me:
- The shape list doesn't have the word "Cube". It opened scrolled to Icosphere in the middle of ~40 shapes, so I first went looking for "Cube", didn't find it, and had to scroll up to find "Box". A cube is a box, fine, but I'd have typed "cube" into a search if there was one.
- Shape lived on a layer called "Everything" under "Style layers". I guessed right, but "style layers" is a bit developer-ish; the line "Covered by Group 1, Group 2 ..." on the color is what told me the group colors would survive. That was reassuring.
- The Samples link in the top bar and the big Samples button have the same name; trivial.
- Louvain: no visible seed or note on whether I get the same groups on a rerun -- there's an unlabeled gear icon in the Louvain box that might be it, I didn't open it. That's what I'd worry about putting in a deck.
- Group 2 (light blue) and Group 4 (dark blue), and Group 1 orange vs Group 5 dark orange, are close-ish. I can tell them apart, but on a projector it'd be muddy.
- Good: "It never leaves your computer" right under the Open button, "Local only" in the header, the "Under a second" estimate before Run, and the algorithm search box.
