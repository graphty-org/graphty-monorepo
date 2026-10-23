# Session r1-s02 -- Dev (student), task: open the college football sample, make every team orange

## Step 0 -- start

Command:
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1d2-758b8e8081 REAL_TIER=3 node .../design/ui/studio/tool/real.mjs --start .../sessions/r1-s02 empty

Note: the start command took more than 3 minutes before any screenshot appeared (waiting on the app).

## Step 1 -- 01.png
Seen: Landing page, "Analyze any network. Free and open source." Big green "Open a file", then "Open network data", "Samples", "New project". A colorful spinning demo network on the right.
Dev: "Okay wait, it says Samples -- the task says the ready-made network, so that's a sample. Clicking Samples."
Command: --step --click "Samples"
Result: ambiguous (a button and a top link are both "Samples"), nothing happened. 02.png.

## Step 2
Dev: "I'll just click the big Samples button in the box."
Command: --step --click-at 455,540
Result: 03.png, "Sample library", 19 real networks in cards. Third card: Sports, "Conferences fall out of who played whom", College football -- 115 nodes, 613 edges.

## Step 3
Dev: "Oh nice, there it is, College football. Clicking that card."
Command: --step --click-at 712,410
Result: 04.png. The football network opened: 115 blue-purple dots, Overview says Nodes 115, Edges 613. Left: "Style layers" with Hovered, Selected, Everything (115). Right panel tabs "Style" and "Values". Bottom notice: "This browser may clear what it keeps for this site. Save a copy to a file to be sure."
Dev: "Okay, it loaded, that was fast. Now I need to color the nodes -- in Gephi that's Appearance. Here there's 'Style layers' and 'Everything' with 115, that's all the teams. Wait, I'll click Everything."
Command: --step --click "Everything"
Result: 05.png. Right panel now "Everything -- Node and edge layer", Style tab: Node/Edge, "Everything styles all 115 nodes: it is the base layer, under every other layer." Fill > Color 6366F1 with a purple swatch.
Dev: "Oh nice, Fill, Color. That purple code is the color. I'll click in the color box and change it to orange."
Command: --step --click-at 1318,483
Result: 06.png. The color text 6366F1 is selected. No color picker popped up.
Dev: "Wait, I don't know the code for orange. Maybe it just understands the word? I'll type orange and press Enter."
Command: --step --type "orange" --key Enter
Result: 07.png. Every dot in the network turned orange. The color box now reads FFA500 with an orange swatch. Top bar still says "Autosave: saved", and the undo arrow is now active.
Dev: "Oh nice, that's it! It understood the word orange and turned it into a code. All 115 teams are orange. And there's an undo arrow up top, so I didn't break anything I can't get back."
Essay-style sentence: "I opened the College football sample (115 teams, 613 games) and colored every team orange (FFA500) on the base 'Everything' style layer."

Stopped here: task done. (Session not ended; the facilitator ends it.)

## Wrap-up, in character (Dev)

Did I finish? Yes. The College football network is open and every team is orange.

How easy, 1 (very difficult) to 7 (very easy): 6.

What confused me:
- On the first page there are two things called "Samples" (a link at the top and a button in the box). I just clicked the big button, fine, but for a second I wasn't sure they were the same.
- The sample card title is "Conferences fall out of who played whom" -- the words "College football" are only in the small grey line under it, so I had to read every card to find it.
- I was looking for "Appearance" / "color nodes" like in the tutorial. Here it's "Style layers" and a layer called "Everything". I guessed Everything meant all the teams because it said 115, and the panel then explained it ("styles all 115 nodes"), which helped -- but I only learned that after clicking.
- The color box shows a code (6366F1) and no picker opened when I clicked it. I didn't know the code for orange, so I just typed the word, and luckily it worked. Nothing on screen told me I could type a color name.
- The notice "This browser may clear what it keeps for this site. Save a copy to a file to be sure." made me a little nervous about losing work, even though it also says "Autosave: saved".
- Starting the app took a long time before anything showed up.
