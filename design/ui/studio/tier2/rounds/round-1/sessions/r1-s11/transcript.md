# Session r1-s11 -- Jordan (returning marketing analyst), T17 dataset A (running club, friends.csv)

Build: the frozen build named on the first line of tier2/criteria.md (946256efb876).

Task as given: "You have used this program a few times. Your running club's list of who runs with
whom, friends.csv, is already open; its third column counts how many runs each pair did together
last month. For a flyer about running partners you care only about pairs who ran together 4 or
more times. Change the drawing so it has only those pairs, tell us how many people are still in it,
and then bring the whole club back."

## Steps

### Start

Command: `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/ with-browser.sh node real.mjs --start r1-s11 setup:friends-ranked.txt`
Screenshot 01.png. Jordan: "Okay, friends.csv, ranked by PageRank like last time, orange dots, size
and color both PageRank. Twenty people in the PageRank row. Now I need only the pairs with 4 or more
runs. That's the third column -- the ties. I'd normally look at the table first to see the numbers.
Data, on the left."

### Step 2

Command: `--step --click "Data"`
Screenshot 02.png. Jordan: "Data place. friends.csv, 20 nodes, 41 edges. Edges have 'weight' -- that's
my runs-together count. And there's a 'Filters' heading with a plus. That's literally what I want.
Click the plus."

### Step 3

Command: `--step --click-at 276,197` (tool: button "Add filter step")
Screenshot 03.png. Jordan: "Right panel became 'New filter step'. Keep: 'an attribute's value' --
fine. Attribute is empty. I want weight. Open the Attribute dropdown."

### Step 4

Command: `--step --click "Attribute"`
Screenshot 04.png. Jordan: "List: Nodes - id, Edges - weight. Weight under Edges. Pick it."

### Step 5

Command: `--step --click "weight#2"`
Screenshot 05.png. Note: this click landed on "weight" in the left Attributes list, not on the
option in the open dropdown (my targeting of the second "weight" on screen picked the wrong one --
a slip in how I aimed, not something the app did). The right panel now shows the weight attribute's
summary (Edges, Amount, 5 distinct values, range 1 to 5) and the filter form I had started is gone.
Jordan: "Huh, my filter thing vanished. Well, at least I now know weight goes 1 to 5. Start the
filter again: plus next to Filters."

### Step 6

Command: `--step --click-at 276,197 --click "Attribute"`
Screenshot 06.png. Jordan: "Back to New filter step, list open again. This time click weight in the
list itself."

### Step 7

Command: `--step --click-at 1245,295` (tool: option "weight")
Screenshot 07.png. Jordan: "weight, 'Is at least' -- already the right comparison, nice -- and an
empty Value box. Under it: 'Keeps edges that pass and the nodes at their ends.' That's what I want.
Type 4, then Add step."

### Step 8

Command: `--step --click-at 1320,265 --type "4"`
Screenshot 08.png. Jordan: "4 in the box, Add step turned blue. No preview of how many edges match
before I commit, which I'd have liked, but fine. Add step."

### Step 9

Command: `--step --click "Add step"`
Screenshot 09.png. Jordan: "Okay, that did it. The map thinned out to short little chains and pairs.
Left side: Filters now has 'weight is at least 4 -- 20 to 19 nodes' with a checkbox ticked. Top bar
says '19 of 20 nodes', right panel says Nodes showing 19 of 20, Edges showing 12 of 41. So 12 pairs
ran together 4+ times and 19 people are still in it. Only one person dropped -- I'd half expected
more, but the numbers agree in three places so I believe it. A couple of dots overlap at the bottom
so I couldn't have counted them by eye. Answer: 19 people. Now bring everyone back -- I'll untick
the checkbox on the filter rather than delete it, in case I want it again."

### Step 10

Command: `--step --click-at 274,239` (tool: checkbox "Apply step: weight is at least 4")
Screenshot 10.png. Jordan: "Whole club back: 20 nodes, 41 edges, the '19 of 20' in the top bar is
gone, and the filter row says 'off' but is still there. Good -- that's the first part done: 19
people, and everyone's back."

Follow-up given (word for word): "Your club now asks the same for pairs who ran together 5 or more
times. How many people are in the drawing then? Bring the whole club back when you are done."

Jordan: "Easy, I'll just change my 4 to a 5. Click the filter row to open it."

### Step 11

Command: `--step --click "weight is at least 4"`
Screenshot 11.png. Jordan: "It opened the same form with my 4 in it, header says 'Filter step Off',
and the button now says 'Save and turn on'. Nice -- that's exactly the two things I want. Replace the
4 with a 5."

### Step 12

Command: `--step --click-at 1320,265 --key Control+a --type "5"`
Screenshot 12.png. Jordan: "5 in the box. Save and turn on."

### Step 13

Command: `--step --click "Save and turn on"`
Screenshot 13.png. Jordan: "'weight is at least 5 -- 20 to 10 nodes', top bar '10 of 20 nodes',
Nodes showing 10 of 20, Edges showing 5 of 41. Five pairs, ten people. On the map I can count three
separate pairs plus a little cluster at the bottom -- though two of the big dots there sit on top of
each other, so by eye I'd have said 9. The counter says 10 and the arithmetic (3 pairs = 6, plus the
bottom group of 4 with two edges between... ) fits, so 10. Answer: 10 people. Untick to bring
everyone back."

### Step 14

Command: `--step --click-at 274,239` (tool: checkbox "Apply step: weight is at least 5")
Screenshot 14.png. Jordan: "All 20 back, 41 edges, filter says 'off'. Done."

### End

Command: `--end`

## Debrief (in character)

**Finished?** Yes, both. Pairs who ran together 4 or more times: 12 pairs, **19 people** still in the
drawing. Follow-up, 5 or more: 5 pairs, **10 people**. Both times I brought the whole club back (20
people, 41 ties) by unticking the filter.

**Ease: 6 out of 7.**

"Honestly this was quick. I've never used a filter in here before, but 'Filters' with a plus on the
Data place was the obvious word, and the form read like a sentence: keep an attribute's value,
weight, is at least, 4. 'At least' was already picked, which is what I wanted. The line under it --
keeps edges that pass and the nodes at their ends -- answered the question I'd have had about what
happens to people. The count turned up in three places at once (top bar, the filter row, the
right-hand panel), so I didn't have to count dots, which is good because two dots at the bottom
sit on top of each other and I'd have miscounted. Changing 4 to 5 was trivial: same row, same
form, 'Save and turn on'."

**What confused or bothered me:**

- "The Attribute dropdown has 'weight' and so does the list on the left. I managed to hit the left
  one the first time [this was my own mis-aim in the tool, not the app's doing], and the half-built
  filter just disappeared without a word -- no 'discard your filter step?'. Minor, but on a longer
  form that would annoy me."
- "No preview before Add step: I typed 4 and had to commit before seeing how many people it would
  leave. A 'this keeps 12 ties, 19 people' line under the box would have saved me a round trip."
- "I half expected 4+ to drop more than one person. Nothing tells me _who_ dropped out. For the
  flyer I'd want the names of the people who are left -- or the one who isn't -- as a list I can
  copy, not just a count. I didn't go looking for it because you didn't ask."
- "Dots overlapping at the bottom of the map: on a slide those two would read as one person."
- Off on a tangent: "This is the kind of thing Brandwatch makes you write a Boolean query for. If
  our listening exports had a mention count per pair I'd use exactly this to strip out the
  one-off replies -- assuming it copes with forty thousand rows and not twenty."

**Implementation issues hit:** none in the app. Every control did what its label said; the counts
agreed everywhere. The one detour (the vanishing filter form) came from my click landing on the left
list instead of the dropdown option.
