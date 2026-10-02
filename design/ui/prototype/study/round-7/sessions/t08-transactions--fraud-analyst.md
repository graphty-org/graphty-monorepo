# Session: t08-transactions, played as Sarah (fraud analyst)

Task as given by the moderator: "With 3,000 accounts the drawing is a smear. Try another way of
arranging it that will not freeze your laptop. The data on screen is a sample: one month of card
and bank transfers between accounts."

Mode: unmandated (first-impression patience, about five minutes).
Renders: design/ui/prototype/tmp/round-7-sessions/t08-transactions--fraud-analyst/

All commands were run from design/ui/prototype. P below stands for
`timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t08-transactions--fraud-analyst/NN.png task:t08-transactions`.

## Start screen (shots/tasks/t08-transactions/01.png)

"Right, that's the hairball. Gray hexagons, no accounts I can read, no amounts. On the right a
summary: 3,000 nodes, 9,113 edges, 'highest total degree 907' -- so there's one account that
touches 907 others, that's the payroll or processor account and it's probably what's turning the
middle dark. I'd want to know WHICH account that is, but that's not the job today. The job is a
different picture. There's no button that says 'picture' or 'arrange'. There's a row of icons
at the bottom with no words on them. The blue one is pressed, I don't know what it means."

## Step 1 -- look for something called Arrange

    P (02) --hover "Transfers"            # pointless; nothing changed
    P (03) --click "Arrange"
    -> nothing on screen is called "Arrange"

"The moderator said 'arrange'. Nothing says arrange. Fine."

## Step 2 -- rest the pointer on the bottom icons

    P (04) --hover "Layout"
    -> tooltip on the play triangle: "Resume layout"

"So the play button is 'Resume layout'. 'Layout' is their word for the picture. Resume means it's
still moving? I'm not pressing play on 3,000 accounts, that's how laptops freeze."

    P (05) --hover "Choose layout"     -> nothing on screen is called "Choose layout"
    P (05) --hover "Layout options"    -> nothing on screen is called "Layout options"
    P (05) --hover "Change layout"     -> nothing on screen is called "Change layout"
    P (05..08) --hover "3D" / "Lab" / "Quick" / "List"   -> no tooltip appeared on any icon

"I can't find out what the other four icons are. The cube is 3D, I'm not touching 3D. The flask
and the lightning bolt -- no idea. The pressed blue one -- no idea. Moving on."

## Step 3 -- the Style tab

    P (09) --click "Style"

"Style, on the right. I'd normally skip anything that sounds like settings, but there's nothing
else. And there it is under Canvas: 'Layout -- Method: Spread Out, Seed: 7'. So the picture
lives under Style. I would never have guessed a layout is a 'style'; to me style is colors."

    P (10) --click "Style" --click "Spread Out"

"OK, now this is useful. A list of methods with a Size column and a Weights column. Most say
'Any'. Three say '2,000' and have a little clock: Spread Out Flat, Natural Grouping, No
Crossings. I have 3,000 accounts. On the right a wall of physics settings -- spring coefficient,
theta, drag -- I am not reading those."

## Step 4 -- pick the one that sounds like rings (the wrong one)

    P (11) --click "Style" --click "Spread Out" --click "Natural Grouping"
    -> toast: "Laid out again: Natural Grouping  [Undo]"
    P (12) ... --key Escape     -> window closed, picture looks exactly the same, right panel back on Data
    P (13) ... --click "Close"  -> same, picture unchanged
    P (14) ... --click "Close" --click "Style"  -> Method now reads "Natural Grouping"

"'Natural Grouping' -- that's what I want, clusters, rings. I clicked it. It just did it. No
warning, no 'this has 3,000, are you sure'. It says 'Laid out again'. And then the picture is...
the same smear. Did it work? Is it still thinking? Is my laptop frozen right now? I can't tell.
The Method box says Natural Grouping, so apparently it took."

## Step 5 -- read the 2,000

    P (15) --click "Style" --click "Spread Out" --hover "2,000"
    -> tooltip: "Rated for up to 2,000 nodes; this graph has 3,000. The canvas stops responding
       while it computes, ignores edge weights, flat"

"There it is. 'The canvas stops responding while it computes.' So the thing I just clicked is
exactly the thing I was told not to do, and it let me do it with one click and no stop sign.
That warning should have been in my face when I clicked, not hidden in a tooltip on a number.
I only found it because I hovered the 2,000. The clock icon I'd have read as 'recent' or
'history', not 'slow'."

## Step 6 -- pick something rated for any size

    P (16) --click "Style" --click "Spread Out" --click "Rings from a Node"
    -> toast: "Laid out again: Rings from a Node  [Undo]"; options show "Root node: None"
    P (17) ... --click "None"
    -> nothing on screen is called "None"; tooltip on the row: "Any size, ignores edge weights,
       flat, needs a center node"
    P (18) ... --click "Close"  -> picture unchanged

"'Rings from a Node' -- that's how I actually work. Put my escalated account in the middle,
first-hop counterparties in ring one, second hop in ring two. Rated 'Any'. But Root node says
None and I can't click it to type my account number. It 'needs a center node' and won't let me
give it one. So it laid out rings from... nothing? Picture still looks the same."

    P (19) --click "Style" --click "Spread Out" --click "Concentric Rings"
    -> toast: "Laid out again: Concentric Rings  [Undo]"; Size "Any"

"Fine. Concentric Rings, 'Any' size, it said 'laid out again'. That's another way of arranging
it that is not one of the 2,000 ones. I'm stopping there; I've done what was asked and I still
don't know what the picture looks like."

## Wrap-up

**Did I succeed?** Partly. I ended on a method marked for any size (Concentric Rings), so on
paper I did what was asked. But on the way I picked Natural Grouping, which the app's own
tooltip says will freeze the canvas on 3,000 accounts, and it let me with no warning. And the
picture never visibly changed, so I can't say I saw a better chart.

**Single Ease Question: 3 / 7.** The list itself is good once you find it. Finding it took me
past five unlabeled icons and a tab called Style.

**Would I use this instead of my current tool?** No, not for this. In i2 I'd never arrange all
3,000; I'd start from the escalated account and expand hops. The one method here that does that
-- Rings from a Node -- wouldn't let me pick the account. What I would keep: the Size column. A
straight 'Any' versus '2,000' next to each method is more honesty than vendors usually give me.
But it has to stop me before I freeze the machine, not after, in a tooltip.

## Problems in her words

1. Picking a method rated for 2,000 on a 3,000-account chart applied immediately with no
   warning or confirmation; the freeze warning exists only in a tooltip on the "2,000" figure.
   (Severity: high -- this is the exact failure the task is about.)
2. The picture setting lives under "Style" in the right panel; nothing on the canvas or in the
   toolbar says "layout" or "arrange" except the play button's tooltip "Resume layout".
3. Four of five bottom-bar icons gave no name she could find; the pressed blue one is a mystery.
4. "Rings from a Node" needs a center account but the Root node field ("None") could not be
   clicked to choose one.
5. After applying a method the chart looked identical; no sign whether it was computing, done,
   or frozen. Closing the window also flipped the right panel back to Data, hiding the change.
6. The clock icon next to "2,000" reads as "history/recent", not "slow".
7. The options pane shows physics jargon (spring coefficient, theta, drag coefficient) she skips.

## What she liked

- The Size column ("Any" vs "2,000") and the tooltip that names the graph's own count
  ("this graph has 3,000") -- plain and specific.
- "Laid out again: <method>" with an Undo right there.
