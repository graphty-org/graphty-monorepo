# Session: size the Les Miserables characters by how much the network depends on them -- Explorer Elena

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Make the drawing show which characters the network depends on most: the more it depends on a
character, the bigger that character's dot. Leave the colors as they are."

Clock: first contact (short). Outcome: gave up. Every dot stayed the same size.

All commands were run from `design/ui/prototype`. `D` is
`tmp/round-8-sessions/r8-t09--explorer-elena` (absolute path used in each run).

## Start screen (shots/tasks/r8-t09/01.png)

"OK, there's a privacy thing at the bottom. No thanks. Samples on the right -- Les Miserables,
77 characters. That's the one."

## 01 -- open the sample

    timeout 120 node app-b/study.mjs --try $D/01.png task:r8-t09 --click "No thanks" --click "Les Miserables"

"Whoa, there's already a lot going on. A list on the left with PageRank, Louvain, Shortest paths,
Density, Betweenness... I don't know most of these words. The dots are all orange, a few darker
ones. That box at the top says 'Color: PageRank 0.00330 to 0.0754'. So the color is already some
score. The task says leave the colors alone. I need the dots to get bigger. There's no 'size'
anywhere I can see. That little flask at the bottom maybe?"

## 02 -- hover the flask

    timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t09 --click "No thanks" --click "Les Miserables" --hover "Analyze"

"Analyze. Sure, that sounds like where you find out who matters."

## 03 -- open Analyze

    timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Analyze"

"A list. PageRank has a 'Start here' tag. Degree, Betweenness, Closeness, Eigenvector... The box
says 'Search, or say what to find', so I'll just say it."

## 04 -- type the task in plain words

    timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Analyze" --type "depends on most"

"'No match for depends on most.' It said 'say what to find'. I said it. OK, probably I need a
shorter word."

## 05 -- try "important"

    timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Analyze" --type "important"

"PageRank, Start here, 'which nodes are connected to other well-connected nodes'. That's sort of
'important'. Fine, PageRank it is."

## 06, 07 -- open PageRank

    timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Analyze" --type "important" --click "PageRank"
    (the tool hit the list row behind the dialog, nothing changed)
    timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Analyze" --type "important" --click "PageRank Start here"

"Weight, 'Higher means Stronger / Farther / Capacity', Damping 0.85. I have no idea. And the button
says 'Update PageRank row' -- so it's already there, it's the thing doing the colors. If I press
that, will it change the colors? I don't want to break anything. Not pressing it. Back to the
PageRank thing in the list, it had a panel on the right."

## 08 -- PageRank's panel, click Shape

    timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Shape"

"Fill, Color, Orange to brown. Then Shape, Effects, Label, Tooltip, each with a plus. Size is
probably a shape thing? Clicking the word did nothing."

## 09 -- find the plus next to Shape

    timeout 120 node app-b/study.mjs --try $D/09.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Add shape"      -> nothing on screen is called "Add shape"
    timeout 120 node app-b/study.mjs --try $D/09.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Add Shape"      -> nothing on screen is called "Add Shape"
    timeout 120 node app-b/study.mjs --try $D/09.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Add size"       -> nothing on screen is called "Add size"
    timeout 120 node app-b/study.mjs --try $D/09.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "+"              -> nothing on screen is called "+"
    timeout 120 node app-b/study.mjs --try $D/09.png task:r8-t09 --click "No thanks" --click "Les Miserables" --hover "Add"            -> tooltip "Add to Shape"

"(Pointer on the plus.) 'Add to Shape'. OK."

## 10 -- the plus menu

    timeout 120 node app-b/study.mjs --try $D/10.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Add to Shape"

"Shape, Size. Size! Finally."

## 11 -- add Size

    timeout 120 node app-b/study.mjs --try $D/11.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Add to Shape" --click "Size"

"Size: 1. Just one number. That makes every dot the same, doesn't it? I want them different. There's
a little database-looking icon next to it. What is that?"

## 12 -- what is the icon next to Size

    timeout 120 node app-b/study.mjs --try $D/12.png ... --click "Size" --hover "data"     -> hit the Data tab, no tooltip
    ... --hover "Size from data" / "Bind" / "From data" / "Use a column"                   -> nothing on screen is called ...
    ... --hover "Size"                                                                     -> the number box, no tooltip
    ... --hover "Set from"                                                                 -> nothing on screen
    ... --hover "column" / "value"                                                         -> no tooltip
    ... --hover "Remove"                                                                   -> tooltip "Remove Size" (the minus)

"Minus is Remove. Don't touch that."

## 13, 14 -- wrong clicks, ended up in the table

    timeout 120 node app-b/study.mjs --try $D/13.png ... --click "Size" --click "column"
    timeout 120 node app-b/study.mjs --try $D/14.png ... --click "Size" --click "value"

"Oops, now a table opened at the bottom and a 'Columns' popup. Degree, Rank by degree, PageRank...
'Valjean is first on all three measures.' OK, so Valjean is the big one. Good to know, but that's a
table, not the drawing. And my Size thing on the right is gone -- the right side shows the whole
graph now."

## (pointer finally rests on the icon)

    ... --click "Size" --hover "Vary" / "Map" / "Drive" / "Scale"    -> nothing on screen is called ...
    ... --hover "measure"                                            -> no tooltip
    ... --hover "Size by"                                            -> tooltip "Size by attribute"

"'Size by attribute'. Attribute... I guess that means a number from the data. Let's see."

## 15 -- Size by attribute

    timeout 120 node app-b/study.mjs --try $D/15.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Add to Shape" --click "Size" --click "Size by attribute"

"A list: betweenness, degree, 'Not a number (2)', then Results: PageRank, then Notes: Note count.
PageRank is the one I picked as 'important', and it's already the color. Same score for color and
size, that's fine, the colors stay the same."

## 16, 17 -- pick PageRank

    timeout 120 node app-b/study.mjs --try $D/16.png ... --click "Size by attribute" --click "# PageRank"        -> nothing on screen
    timeout 120 node app-b/study.mjs --try $D/16.png ... --click "Size by attribute" --click "PageRank"          -> hit the list row behind
    timeout 120 node app-b/study.mjs --try $D/17.png ... --click "Size by attribute" --click "PageRank, Results"

"'Size by PageRank'. Scale Linear, Sizes 0.5 to 3 px, Fit to data, Percentiles, Typed, Clamp,
'Below 0: sized by absolute value', 'Smallest mark 2 px print 1 pt', Detach. That's a lot of
knobs. I'll leave them. But... the dots behind it look exactly the same. Maybe it updates when I
close this."

## 18 -- close with Escape

    timeout 120 node app-b/study.mjs --try $D/18.png ... --click "PageRank, Results" --key Escape

"Same dots. All the same size. And the box on the right still says Size 1. The legend at the top
still only talks about color. Did it take it or not?"

## 19 -- close with the X instead

    timeout 120 node app-b/study.mjs --try $D/19.png ... --click "PageRank, Results" --click "Close"

"Still nothing. Every dot is the same. Valjean isn't any bigger than the little ones at the edge.
Maybe I did it in the wrong place -- maybe it's supposed to be under that Betweenness thing with
the crossed-out eye? I don't know what that is."

## 20 -- try the Assistant

    timeout 120 node app-b/study.mjs --try $D/20.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Assistant"

"'Off. Nothing is sent. Turn on in Settings.' No, I'm not turning on something that sends stuff."

## 21 -- one more try with degree

    timeout 120 node app-b/study.mjs --try $D/21.png ... --click "Size by attribute" --click "degree" --click "Close"

"Maybe the PageRank numbers were too tiny, 0.003 or whatever. Degree goes up to 36. ... No. Same
dots. Size 1."

"Yeah. OK. I don't know."

(Engagement drops here; she stops trying new things.)

## After the task

**Did I succeed?** No. I found where size lives, picked a score, and the dots never changed. The
colors are untouched, but that's because I never managed to change anything.

**Single Ease Question (1 = very difficult, 7 = very easy): 2.**

**Would I use this instead of my current tool?** No, not from this. I liked that the Les Miserables
table just told me "Valjean is first on all three measures" -- that's a sentence I could paste. But
the drawing is the whole point, and I couldn't make one dot bigger. The words were all things I
had to guess at: PageRank, betweenness, attribute, damping, clamp. The search box says "say what to
find" and then doesn't understand what I said. And the button for making size follow a number is a
little database icon with no label until you sit on it. In our dashboard I'd just pick "size by"
from a dropdown and see it change.

## Observations for the study team (moderator notes, not Elena's words)

- Plain-language search in Analyze ("depends on most") returned no match; "important" found only
  PageRank. Betweenness, the measure the task wording points at, was never offered for her words.
- Size was found only through Style > Shape > plus > Size, then an unlabeled icon whose tooltip is
  "Size by attribute". She tried about a dozen names before resting on it.
- After choosing PageRank (and later degree) as the size source, the drawing did not change, the
  Size field still read "1", and the legend still listed only color. She could not tell whether the
  choice was applied. This was the point she gave up.
- The Size-by popover is dense with terms she does not have (Linear, Fit to data, Percentiles,
  Typed, Clamp, Below 0, Smallest mark, print pt, Detach).
- Clicking into the table closed the style panel she was working in, losing her place.
- PageRank's own dialog offered "Update PageRank row" for an existing measure; she declined out of
  fear it would change the colors.
