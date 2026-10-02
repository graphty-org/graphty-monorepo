# Session: rearrange a 3,000-account transfer network -- Dana Okafor, supply chain risk analyst

Task as given: "With 3,000 accounts the drawing is a smear. Try another way of arranging it that
will not freeze your laptop. The data on screen is a sample: one month of card and bank transfers
between accounts. If that is not your line of work, treat the accounts as your own things
(suppliers, customers, hosts, genes) and the transfers as what passes between them."

All commands were run from design/ui/prototype. D below is
tmp/round-7-sessions/t08-transactions--supply-chain-analyst (absolute path used in the real runs).

## Start screen (shots/tasks/t08-transactions/01.png)

"OK, gray honeycomb blob. Right, a smear. 3,000 nodes, 9,113 edges -- fine, I'll call my
suppliers nodes since it does. So, 'arrange it differently'. Top bar has 'Local only' -- good,
that is my IT question half answered -- and 'Full graph'. Bottom middle there's a row of five
icons with no words. I don't click unlabelled icons. Let me see what 'Full graph' is."

## Step 1 -- what is "Full graph"?

    timeout 120 node app-b/study.mjs --try $D/02.png task:t08-transactions --hover "Full graph"

Result: tooltip "Filters". "Filters. That's cutting rows, not arranging. Not this."

## Step 2 -- click "Graph"

    timeout 120 node app-b/study.mjs --try $D/03.png task:t08-transactions --click "Graph"

Result: the picture suddenly turned colored, a legend "Color: Louvain, Community 1 ... 28 more
communities" popped up and the left list grew a "Louvain 35 groups" row and "Links in (count)".
"Wait, what did I just do? I clicked 'Graph' -- I thought that was the tab I was already on -- and
now something called Louvain has painted everything. I don't know what Louvain is. Did I run
something? Did it run before? This is exactly the 'it changed and I don't know why' that makes me
stop trusting a tool. Still a hairball, just a colored one. Not what I asked for. Starting over."

## Step 3 -- trying to find out what the bottom icons are

    timeout 120 node app-b/study.mjs --try $D/04.png task:t08-transactions --hover "Run"
    -> nothing on screen is called "Run"
    timeout 120 node app-b/study.mjs --try $D/05.png task:t08-transactions --hover "Arrange"
    -> nothing on screen is called "Arrange"
    timeout 120 node app-b/study.mjs --try $D/06.png task:t08-transactions --hover "Play"
    -> nothing on screen is called "Play"
    timeout 120 node app-b/study.mjs --try $D/07.png task:t08-transactions --hover "Layout"
    timeout 120 node app-b/study.mjs --try $D/08.png task:t08-transactions --hover "3D"

Result: the play triangle says "Resume layout". The cube gave me nothing.
"Nothing called Arrange. The play button is 'Resume layout' -- so 'layout' is what they call
arranging, not page layout. 'Resume' means it moves by itself. I don't want a picture that moves
by itself, and pressing play on 3,000 things sounds like the freeze the moderator warned me about.
Not pressing it. The cube is 3D, that's for demos."

## Step 4 -- the Style tab on the right

    timeout 120 node app-b/study.mjs --try $D/09.png task:t08-transactions --click "Style"

Result: Canvas settings, then a "Layout" heading, "Method: Spread Out", "Seed: 7".
"There it is. Layout, Method, Spread Out. Took me a while -- I would never have guessed 'Style'
holds 'how things are arranged'. Style to me is colors and fonts."

## Step 5 -- open the method list

    timeout 120 node app-b/study.mjs --try $D/10.png task:t08-transactions --click "Style" --click "Spread Out"

Result: a "Layout" window with a table: Method, Size, Weights. Most say Size "Any"; "Spread Out,
Flat", "Natural Grouping" and "No Crossings" say 2,000 with a little clock. Right side is a wall
of numbers: spring length, gravity, theta, drag coefficient, batches in flight.
"OK, a table, I like tables. Size 'Any' versus '2,000' -- I have 3,000, so the 2,000 ones are
probably too small for me, and the clock probably means slow. That's actually helpful, it's
answering 'will it freeze' in a column. The right-hand side I am ignoring entirely. Gravity?
Theta? No. 'Natural Grouping' sounds like what I want though -- groups are what I'd show a VP.
I'll try it and see if it warns me."

## Step 6 -- Natural Grouping

    timeout 120 node app-b/study.mjs --try $D/11.png task:t08-transactions --click "Style" --click "Spread Out" --click "Natural Grouping"

Result: it was ticked straight away, a black bar said "Laid out again: Natural Grouping" with Undo.
No question, no warning.
"Hang on. It said 2,000 and I've got 3,000, and it just went and did it. No 'are you sure'. If the
clock meant what I thought, I've just frozen my laptop. There's an Undo, fine, but on a locked-down
corporate machine I'd be killing Chrome from Task Manager."

## Step 7 -- close the window to see the picture

    timeout 120 node app-b/study.mjs --try $D/12.png task:t08-transactions --click "Style" --click "Spread Out" --click "Natural Grouping" --key Escape
    timeout 120 node app-b/study.mjs --try $D/13.png task:t08-transactions --click "Style" --click "Spread Out" --click "Natural Grouping" --click "Close"
    timeout 120 node app-b/study.mjs --try $D/14.png task:t08-transactions --click "Style" --click "Spread Out" --click "Natural Grouping" --click "Close" --click "Style"

Result: the window closes, the panel flips back to Data, and the picture is the same gray blob.
Back on Style, Method now says "Natural Grouping".
"Same blob. Exactly the same. It says Natural Grouping, the picture says nothing changed. Is it
still thinking? Is it frozen? There's no progress bar, no 'working on it'. I can't tell if it
worked."

## Step 8 -- what does the clock actually mean?

    timeout 120 node app-b/study.mjs --try $D/17.png task:t08-transactions --click "Style" --click "Spread Out" --hover "2,000"

Result: tooltip "Rated for up to 2,000 nodes; this graph has 3,000. The canvas stops responding
while it computes, ignores edge weights, flat".
"There it is, in writing. 'The canvas stops responding.' So that is the freeze, and it let me pick
it with one click and no warning. The explanation is only in a hover tooltip -- I skim, I'd never
have rested on a number. It should have said that when I clicked, not when I hovered."

## Step 9 -- pick a safe one instead

    timeout 120 node app-b/study.mjs --try $D/15.png task:t08-transactions --click "Style" --click "Spread Out" --click "Columns by Group"
    timeout 120 node app-b/study.mjs --try $D/16.png task:t08-transactions --click "Style" --click "Spread Out" --click "Columns by Group" --click "Close"

Result: "Columns by Group" (Size Any) ticked, "Laid out again: Columns by Group". Closing shows the
same gray blob again.
"Columns by Group, Size 'Any' -- that won't freeze, and columns sounds like something I can read,
like a pivot. But grouped by what? It never asked me which column to group on. And again, the
picture after closing is identical to before. I'm going to stop here: I picked something that by
their own table should not freeze. Whether it's any less of a smear, I have no idea, because I
never saw it change."

## Wrap-up

Did I succeed? Half. I found where arranging lives and I ended on a method marked safe for 3,000
(Columns by Group). But I took the freezing one first because it let me, and I never once saw the
drawing look different, so I can't say I made it readable.

Single Ease Question: 3 out of 7.

Would I use this instead of my current tool? Not for this. Power BI's network visual also froze on
me, so a table that says "Size: Any / 2,000" up front is genuinely better than anything I've had --
that column is the one good idea here. But: arranging is hidden under "Style", I clicked "Graph"
and something called Louvain repainted everything without asking, the slow option runs on one
click with the warning tucked in a hover, the right side of that window is physics homework, and
"Columns by Group" didn't ask me what group. For my Thursday slide I'd still go back to a pivot
table and a bar chart. "Local only" helps with IT; it doesn't fix any of that.

## Problems seen (in her words, ranked)

1. Picking a method rated below my size applied instantly, with no warning, though its own tooltip
   says the screen stops responding. (Step 6, 11.png; 17.png)
2. After choosing any method the picture looked identical, with no sign of progress -- I could not
   tell if it worked, was working, or had frozen. (13.png, 16.png)
3. Clicking "Graph" turned on colors from something called Louvain that I never asked for.
   (03.png)
4. "How things are arranged" lives under a tab called "Style"; nothing in the bottom toolbar says
   "arrange" or "layout" except a hover on a play button that would make things move. (07.png, 09.png)
5. The 2,000-limit explanation is only in a tooltip on a gray number. (17.png)
6. "Columns by Group" never asked which column to group by. (15.png)
7. The right half of the Layout window is full of physics terms (gravity, theta, drag coefficient,
   batches in flight) with no business meaning. (10.png)
