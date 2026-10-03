# Session: set aside minor characters -- Jordan, marketing network analyst

Task as given by the moderator: "The Les Miserables network is open (example
data, not your own). For every count and every drawing from now on, you want to
set aside the minor characters -- anyone who shares chapters with fewer than
five others. Set that up, then say how many characters are left."

Start screen: shots/tasks/r8-t20/01.png. Renders: tmp/round-8-sessions/r8-t20--marketing-analyst/NN.png.
All commands were run from design/ui/prototype.

## Step 1 -- the funnel in the top bar (02.png)

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t20--marketing-analyst/02.png task:r8-t20 --click "Full graph"

Jordan: "'Every count and every drawing from now on' -- that's a filter on the
whole thing, not a highlight. There's a funnel up top that says 'Full graph'.
That's the obvious one." It opened the Data page with a Filters box: "No
filters. Filters change what is computed; the eye in the Graph tree only hides."
"OK, good, that's literally the sentence I needed. Computed, not hidden. I'm
also seeing 'degree' in the attribute list, which is what 'shares chapters with
fewer than five others' is."

## Step 2 -- Add filter step (03.png)

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t20--marketing-analyst/03.png task:r8-t20 --click "Full graph" --click "Add filter step"

A "New step" appeared and a menu: By an attribute or computed value / Top of a
computed value / Largest component / k-core / Neighbors of the selection.
"k-core... I've seen that in a Gephi tutorial and I couldn't tell you what it
does. Degree is sitting right there as an attribute, so: by an attribute. The
little clock icons, no idea what those mean. Slow?"

## Step 3 -- attribute picker (04.png)

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t20--marketing-analyst/04.png task:r8-t20 --click "Full graph" --click "Add filter step" --click "By an attribute or computed value"

A dark list of attributes: label, group, betweenness, degree, value, Louvain,
PageRank, Note count. "Degree."

## Step 4 -- wrong degree (05.png)

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t20--marketing-analyst/05.png task:r8-t20 --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --click "degree"

The right panel turned into an info page about the degree column (range 1 to
36, median 6, "Nothing uses it") instead of filling my filter. "Huh. I hit the
degree in the left list, not the one in the dropdown -- they're both called
'degree' and both on screen at once. Annoying, but fine, at least it told me the
median is 6, so cutting at 5 will drop a big chunk." Tried again.

## Step 5 -- the right degree (06.png)

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t20--marketing-analyst/06.png task:r8-t20 --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --click "degree, nodes"

Condition: "degree" "is at least" and an empty box. "Fewer than five goes, so I
keep at least 5. Good, I don't have to flip the logic in my head."

## Step 6 -- typing 5 (07.png)

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t20--marketing-analyst/07.png task:r8-t20 --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --click "degree, nodes" --key 5

The box shows 5, but "This step: 77 of 77 nodes" and nothing moved. "Did it
take? It still says 77. Maybe it wants Enter."

## Step 7 -- Enter (08.png)

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t20--marketing-analyst/08.png task:r8-t20 --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --click "degree, nodes" --key 5 --key Enter

Top bar now says "41 of 77 nodes"; the step reads "degree is at least 5 -- 41 of
77 nodes (the full graph)". "OK, 41. But -- the map hasn't changed at all. The
one-link guys out on the edges, bottom, far right, they're all still drawn. And
the PageRank key up top is the exact same range. You told me every drawing."

## Step 8 -- checking the Graph page (09.png)

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t20--marketing-analyst/09.png task:r8-t20 --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --click "degree, nodes" --key 5 --key Enter --click "Graph"

On the Graph page the top bar says "Full graph" again and PageRank "Paints 77
nodes (every node with a value)". "Wait, what? Did it just drop my filter
because I changed tabs? That's the kind of thing that ends up wrong in a deck."

## Step 9 -- back to Data (10.png)

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t20--marketing-analyst/10.png task:r8-t20 --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --click "degree, nodes" --key 5 --key Enter --click "Graph" --click "Data"

The step is still there and the top bar says 41 of 77 again. But the Summary on
the right still reads Nodes 77, average degree 6.60, highest degree 36, the same
as before. "So which is it? The funnel says 41, the summary says 77. This is the
Talkwalker thing all over again -- dashboard says one number, the download says
another, and I'm the one who has to explain it."

## Step 10 -- the table (11.png)

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t20--marketing-analyst/11.png task:r8-t20 --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --click "degree, nodes" --key 5 --key Enter --click "Table"

Table header: "41 of 77 nodes", but next to it "Rows 1 to 77 of 77", and ranks
"#1 of 77". Columns say "Degree (full graph)", "PageRank (full graph)". "OK, so
at least the columns are honest that PageRank was run before my filter. Fine. I
guess I'd have to re-run it? Nothing tells me to. And it's still listing 77
rows under a header that says 41. The map still has every dot." (Drifts:) "Our
VP reads the first slide and the first number. If the slide says 41 and the
picture visibly has 77 dots, I'm getting that question in the meeting, same as
'what's purple.'"

Stopped here.

## Wrap-up

- Did I succeed? Partly. The filter is set up and I'd answer **41 characters
  left**. But I'm not sure it is doing what I asked: the drawing still shows
  every character, the Graph page showed "Full graph" while I was on it, the
  Summary still says 77, and the table lists 77 rows under a "41 of 77" header.
  I would not put the 41 on a slide until the picture matched it.
- Single Ease Question: **4 of 7**. Finding the filter was quick and the wording
  ("filters change what is computed") was exactly right. Typing a number that
  silently did nothing until Enter, two things both called "degree" on screen,
  and three different counts after it applied cost me the confidence.
- Would I use this instead of my current tool? Not on this evidence. Gephi's
  filter at least makes the dots disappear so I can see what I cut. Here the
  setup is easier than Gephi, but if the screen, the summary and the table
  disagree I'm back to checking everything in Excel, and then why switch.
