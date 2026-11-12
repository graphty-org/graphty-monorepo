# Session r1-s51 -- Explorer Elena (first-time user)

Task: open lesmis-poster.graphty.json (colleague's project); say which characters are orange and what they have in common that made the project color them orange.

## Step 1
Command: `real.mjs --start <folder> empty`
Notes: A landing page. Big green "Open a file" button that says it takes "a saved project". There's a pretty spinning demo graph with orange dots on the right -- but that's not my colleague's file. I'll click "Open a file" and give it the file.

## Step 2
Command: `--step --click "Open a file" --upload lesmis-poster.graphty.json`
Notes: It opened! "Opened lesmis-poster". A bunch of blue dots and three orange ones near the bottom middle. A box at the top says "Color: Poster, 3 of 77 nodes". So three are orange. On the left there's a list with "Poster 3". I don't know their names though. I'll click the orange dot that's lowest down to see who it is.

## Step 3
Command: `--step --click-at 886,537`
Notes: That one is "Mlle Baptistine", Degree 3. Everything shifted a bit when I clicked -- hm. Two more orange ones up and to the left. Rather than hunting, there's a row on the left called "Poster" with 3 next to it -- maybe that's the orange group. I'll click it.

## Step 4
Command: `--step --click "Poster"`
Notes: Oh, the right side changed. Under "Which nodes" there's a little box: "name contains Mlle, 3 nodes". And the color is FFA500 (orange). So that's why -- their names have "Mlle" in them. Mlle Baptistine fits. Now I want the other two names. I'll just click the orange dot in the middle-left.

## Step 5
Command: `--step --click-at 798,401`
Notes: "Mlle Vaubois", Degree 1. Everything slid over again when I clicked -- why does it keep moving? The last orange dot is now at the edge of the crowded bunch, small. I'll try clicking it.

## Step 6
Command: `--step --click-at 875,390`
Notes: "Mlle Gillenormand", Degree 7. That's three, matching "3 of 77 nodes". The picture shifted yet again (it recenters every time I click a dot, I think) but I got them. I'm done.

## Wrap-up (in character)
- Did I finish? Yes. The orange characters are Mlle Baptistine, Mlle Vaubois and Mlle Gillenormand. What they have in common: their names contain "Mlle" -- the "Poster" layer's rule says "name contains Mlle, 3 nodes" and paints them orange (FFA500). (So, the "Mademoiselles". Not because they're important -- one of them only has 1 connection.)
- Ease: 6 out of 7. Opening the file was one click. The "Color: Poster, 3 of 77 nodes" box told me how many to look for right away, and clicking "Poster" on the left showed the rule in plain words.
- What confused me:
  - The rule only showed up after I clicked "Poster" in the left list; at first I didn't know that list was where the "why" lived. I guessed it because it had the same name as the "Color: Poster" box.
  - There's no list of the three names anywhere I saw -- I had to click each tiny orange dot one by one. One of them was half hidden inside the crowded bunch.
  - Every time I clicked a dot the whole picture slid to a new spot, so the dot I wanted next moved. I had to look again each time.
  - "Degree" next to each name -- not sure what it is. Ignored it.
