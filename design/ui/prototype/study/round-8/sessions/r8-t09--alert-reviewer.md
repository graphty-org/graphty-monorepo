# Session r8-t09 -- Nadia, level-1 alert reviewer

Task given by the moderator: "You have never used this program before. You will practice on the
ready-made network of characters from the novel Les Miserables that comes with the program, not on
your own data. Make the drawing show which characters the network depends on most: the more it
depends on a character, the bigger that character's dot. Leave the colors as they are."

Start screen: shots/tasks/r8-t09/01.png. Renders: tmp/round-8-sessions/r8-t09--alert-reviewer/NN.png.
All commands were run from design/ui/prototype; `P` below stands for
`/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-8-sessions/r8-t09--alert-reviewer`.

## Step 1 -- start screen (01.png)

Think-aloud: "OK, a start page. Samples on the right, Les Miserables is the first one, 77
characters. There's a big cookie-ish box at the bottom asking for usage data. Bank laptop, I say
no to everything. No thanks. Then Les Miserables."

## Step 2 -- open the sample (02.png)

    timeout 120 node app-b/study.mjs --try P/02.png task:r8-t09 --click "No thanks" --click "Les Miserables"

Think-aloud: "Whoa. That's a lot already. A list on the left: Selection, Notes, Labels, PageRank,
Louvain, Shortest paths, Density, Link prediction, Top 9 by de-something, Watchlist, For the
report, Betweenness, Everything. I didn't make any of that, it came with it. The dots are all
orange, a few darker. The box at the top says 'Color: PageRank 0.00330 to 0.0754'. So the colors
are PageRank. Fine, I'm told to leave colors alone.

Which characters the network depends on most... I don't know these words. PageRank I've heard --
that's Google, ranking pages by importance. That sounds like 'most important'. It's already
selected, and on the right it says Fill, Color, and then Shape, Effects, Label, Tooltip with
plus signs. Size is probably under Shape."

## Step 3 -- click Shape (03.png)

    timeout 120 node app-b/study.mjs --try P/03.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Shape"

Think-aloud: "Clicked the word Shape. Nothing. Okay, it's the plus then."

## Step 4 -- the plus beside Shape (04.png, 05.png)

    timeout 120 node app-b/study.mjs --try P/04.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Add shape"
    -> nothing on screen is called "Add shape"
    timeout 120 node app-b/study.mjs --try P/05.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Add"
    -> clicked "Add to Shape"

Think-aloud: "The plus. A little menu: Shape, Size. Size. Good, that's the word I wanted."

## Step 5 -- add Size (06.png)

    timeout 120 node app-b/study.mjs --try P/06.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Add to Shape" --click "Size"

Think-aloud: "Now there's a Size row with a box that says 1, a little cylinder icon and a minus.
A 1 is one size for everybody. I want it to depend on the character. The cylinder looks like a
database. No label on it. What is it?"

## Step 6 -- trying to find out what the cylinder is (07-12.png)

    timeout 120 node app-b/study.mjs --try P/07.png task:r8-t09 ... --click "Size" --hover "Size"       -> tooltip: null
    timeout 120 node app-b/study.mjs --try P/08.png task:r8-t09 ... --click "Size" --hover "from data"  -> nothing on screen is called "from data"
    timeout 120 node app-b/study.mjs --try P/08.png task:r8-t09 ... --click "Size" --hover "column"     -> tooltip: null
    timeout 120 node app-b/study.mjs --try P/08.png task:r8-t09 ... --click "Size" --hover "value"      -> tooltip: null
    timeout 120 node app-b/study.mjs --try P/09.png task:r8-t09 ... --click "Size" --hover "data"       -> tooltip: null
    timeout 120 node app-b/study.mjs --try P/09.png task:r8-t09 ... --click "Size" --hover "Remove"     -> tooltip: "Remove Size" (that's the minus)
    timeout 120 node app-b/study.mjs --try P/09.png task:r8-t09 ... --click "Size" --hover "Size from"  -> nothing on screen is called "Size from"
    timeout 120 node app-b/study.mjs --try P/10.png task:r8-t09 ... --click "Size" --hover "Bind"       -> nothing
    timeout 120 node app-b/study.mjs --try P/10.png task:r8-t09 ... --click "Size" --hover "Link"       -> an unrelated tooltip about a run's name
    timeout 120 node app-b/study.mjs --try P/10.png task:r8-t09 ... --click "Size" --hover "Use"        -> nothing
    timeout 120 node app-b/study.mjs --try P/11.png task:r8-t09 ... --click "Size" --hover "Map"        -> nothing
    timeout 120 node app-b/study.mjs --try P/11.png task:r8-t09 ... --click "Size" --hover "Measure"    -> tooltip: null
    timeout 120 node app-b/study.mjs --try P/11.png task:r8-t09 ... --click "Size" --hover "Scale"      -> nothing
    timeout 120 node app-b/study.mjs --try P/12.png task:r8-t09 ... --click "Size" --hover "From"       -> tooltip "From PageRank" (that's the color chip)
    timeout 120 node app-b/study.mjs --try P/12.png task:r8-t09 ... --click "Size" --hover "Set Size"   -> nothing
    timeout 120 node app-b/study.mjs --try P/12.png task:r8-t09 ... --click "Size" --hover "Size by"    -> tooltip: "Size by attribute"

(`...` = `--click "No thanks" --click "Les Miserables" --click "Add to Shape"`.)

Think-aloud: "In real life I'd just click the cylinder and see, and if I rest on it it says
'Size by attribute'. Attribute -- like a field on the customer record. Okay, that's it."

Moderator note on fidelity: in the real app she would have clicked the icon on sight; most of
these attempts are the tool needing a name, not her being lost. The finding that survives is
that the icon has no visible label, only a tooltip, and "attribute" is not her word.

## Step 7 -- Size by attribute (13.png)

    timeout 120 node app-b/study.mjs --try P/13.png task:r8-t09 ... --click "Size" --click "Size by attribute"

Think-aloud: "A box: Source, Pick an attribute. The list says nodes: betweenness, degree, 'Not a
number (2)'; Results: PageRank, 'Not a number (1)'; Notes: Note count. Betweenness, degree,
PageRank. Nobody told me which one means 'depends on'. Degree is how many people you're linked to,
I think. Betweenness... between what? In my job a pass-through account is the one money goes
between, and that's the one we'd say the network depends on. But I'm guessing. PageRank is
already what the colors are and it's 'Results', so it's the thing the program worked out. I'll
take PageRank. If it's wrong, QA tells me, that's how it goes."

## Step 8 -- pick PageRank (14.png)

    timeout 120 node app-b/study.mjs --try P/14.png task:r8-t09 ... --click "Size" --click "Size by attribute" --click "PageRank"
    -> ambiguous, could not click (it tried the list on the left)
    timeout 120 node app-b/study.mjs --try P/14.png task:r8-t09 ... --click "Size" --click "Size by attribute" --click "PageRank, Results"

Think-aloud: "Now it says 'Size by PageRank'. Scale Linear, Sizes 0.5 to 3 px, Values from 'Fit
to data / Percentiles / Typed', Clamp ticked, 'Below 0: sized by absolute value', Smallest mark
2 px, print 1 pt, and a Detach button. I have no idea what half of that is and I'm not going to
touch it. The dots behind it... look the same? Hard to tell with the box in the way. Close it."

## Step 9 -- close it and look (15.png, 16.png, 17.png)

    timeout 120 node app-b/study.mjs --try P/15.png task:r8-t09 ... --click "Size by attribute" --click "PageRank, Results" --key Escape
    timeout 120 node app-b/study.mjs --try P/16.png task:r8-t09 ... --click "PageRank, Results" --key Escape --click "Size by attribute"
    timeout 120 node app-b/study.mjs --try P/17.png task:r8-t09 ... --click "Size by attribute" --click "PageRank, Results" --click "Close"

Think-aloud: "Escape. The dots are all the same size. Valjean is the same size as some guy on the
edge. The Size box still says 1. Did it take it? I open the cylinder again -- it says 'Pick an
attribute' again, empty. So it threw away what I picked. Maybe Escape is cancel. Try again and
close it with the X this time... Same. Size 1, all the dots the same, nothing new in the legend
box at the top, it only talks about Color. There's no OK, no Apply. I don't know if it saved or
not and the picture says it didn't."

## Step 10 -- try Betweenness instead (18.png, 19.png)

    timeout 120 node app-b/study.mjs --try P/18.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Betweenness"
    timeout 120 node app-b/study.mjs --try P/19.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Betweenness" --click "Add to Shape" --click "Size" --click "Size by attribute" --click "betweenness" --click "Close"

Think-aloud: "Last go. There's a Betweenness row at the bottom with a crossed-out eye. It says
'Covered by PageRank for Color', 'Paints 77 nodes, none visible', and a 'Move above' button. So
it's there but hidden and something else is on top. Covered, hidden, move above -- that's three
things I'd have to understand. If I move it above, does it change the colors? I was told not to.
I added a size by betweenness on it anyway: Size still 1, dots all the same, and it's hidden so
it wouldn't show anyway.

That's it. That's longer than an alert takes me. I'm stopping."

## Outcome

- Believes she succeeded: No. "I picked PageRank for the size, twice, and the dots never changed
  and the box went back to 1. Either it didn't save or it doesn't do what I think. And I'm not even
  sure PageRank is the right one -- maybe it's betweenness."
- Single Ease Question (1 = very difficult, 7 = very easy): 2.
- Would she use this instead of her current tool: No. "I don't have a graph tool -- the case system
  and a spreadsheet. This opened full of stuff someone else made, the size control is a
  cylinder with no name, it asks for an 'attribute' from three words I don't know, and when I
  picked one nothing happened that I could see. QA would ask why the big dots are big and I
  couldn't tell them. For a picture in an alert file I'd want one button, 'size by importance',
  and a line underneath saying what importance means."

## What tripped her (her words, condensed)

1. "Shape" did nothing when clicked; size hides behind a plus next to it.
2. The size-from-data control is an unlabeled cylinder icon; "Size by attribute" only appears on
   hover, and "attribute" is not her word.
3. Nothing tells her which measure means "the network depends on it": betweenness, degree and
   PageRank are listed bare, with no one-line meaning.
4. After picking PageRank the popup showed nine settings she didn't understand (Clamp, Below 0,
   Typed, print 1 pt, Detach), and closing it -- by Escape or by X -- left Size at 1, the dots
   unchanged and the list reset to "Pick an attribute". She could not tell if it had saved.
5. The Betweenness row is hidden and "covered" by PageRank; she could not tell whether showing it
   or moving it above would change the colors she was told to leave alone.
