# Session: leave a note on the Valjean-to-Javert path (Gephi holdout)

Participant: Dr. Mara Lindqvist (fictional persona, Gephi user since 0.8).
Task as given: "Your team already worked out the chain of characters linking Valjean to Javert
with as few go-betweens as possible. Leave a reminder attached to that chain as a whole -- not to
either man -- saying it should be checked against the book. You have never typed your name into
this program."

Renders are in design/ui/prototype/tmp/round-7-sessions/t39--gephi-holdout/.
Every command was run from design/ui/prototype.

## Start screen (shots/tasks/t39/01.png)

Think-aloud: "Graph in the middle, colored by PageRank, sized by degree -- there's even a legend,
which is more than Gephi gives me. On the left a list: PageRank, Louvain, then 'Shortest paths',
and under it 'Valjean to Jav...' with a 2 and 'Myriel to Javert' with a 3. The first one is
truncated, but that has to be the chain. Gephi has nothing like this -- a computed path would
just be a filter I'd lose the moment I closed it. I click that row."

## Step 1 -- select the path row

    timeout 120 node app-b/study.mjs --try .../t39--gephi-holdout/02.png task:t39 --click "Valjean to Javert"

Saw (02.png): right panel switched to "Valjean to Javert -- Path, from Shortest paths", Data tab.
Summary: 2 nodes, 1 edge, from Valjean to Javert, edge value 17 shared chapters. Members in path
order: Valjean start, Javert end. "Made with: All at their defaults. All options..." and at the
bottom "Notes: No notes. Add note (N)".

Think-aloud: "Two nodes, one edge. So 'as few go-betweens as possible' is zero go-betweens --
they share seventeen chapters directly. Fine, that's the team's result, not mine to argue.
'All at their defaults' -- weighted or unweighted? I'd want that before I cite it, but that's not
today's job. There's a Notes section right on the path. Add note."

## Step 2 -- Add note on the path

    timeout 120 node app-b/study.mjs --try .../t39--gephi-holdout/03.png task:t39 --click "Valjean to Javert" --click "Add note"

Saw (03.png): the left panel turned into "Notes". At the top an open box with a chip
"Valjean to Javert" (path icon, orange, with an x), a "Write a note" text area, a gray
"Save Ctrl+Enter" button and Cancel. Below it the existing notes. One of them, "Javert follows
Valjean through the whole book...", is tagged to Valjean and Javert as two separate people.

Think-aloud: "Good -- the box is already tied to the path as one thing, one chip, not two names.
That other note further down is tied to both men separately; that's exactly what I was told not
to do, and the chip shapes make the difference visible: a person icon versus the path icon. It
did not ask me for my name. My graph list is gone though -- the left side swapped to Notes. I can
live with that. Now type."

## Step 3 -- type and save

    timeout 120 node app-b/study.mjs --try .../t39--gephi-holdout/04.png task:t39 --click "Valjean to Javert" --click "Add note" --type "Check this chain against the book." --click "Save"
    -> nothing on screen is called "Save"

    timeout 120 node app-b/study.mjs --try .../t39--gephi-holdout/05.png task:t39 --click "Valjean to Javert" --click "Add note" --click "Write a note" --click "Save"
    -> nothing on screen is called "Write a note"
    -> nothing on screen is called "Save"

    timeout 120 node app-b/study.mjs --try .../t39--gephi-holdout/06.png task:t39 --click "Valjean to Javert" --click "Add note" --type "Check this chain against the book." --key Control+Enter

Saw (04, 05, 06): the same open box each time, the text area still empty, Save still gray. The
right panel still says "No notes."

Think-aloud: "My text doesn't go in, and Save stays gray, so Ctrl+Enter does nothing either.
In a real build I'd have typed 'Check this chain against the book' and hit Ctrl+Enter. I'm going
to stop here: I found the place, it's attached to the right thing, I just can't press the last
key in this mock-up."

## Outcome

- Did I succeed? Mostly. I got a note box attached to the path as a whole, in two clicks, with no
  name prompt. I could not get my text into it or save it in this build, so nothing was actually
  stored.
- Single Ease Question: 6 of 7. Finding it was easy; the last step did not respond.
- Would I use this instead of Gephi? Not for this alone. A note pinned to a computed path is
  something Gephi cannot do at all -- there a path is a temporary filter and my notes live in a
  text file next to the .gephi project. That earns a second look. But it does not move my papers;
  for that I need my GEXF to come in intact and to see what "all at their defaults" means for the
  path (weighted or not) before I would cite it.

## Things I noticed along the way

- "Valjean to Jav..." is truncated in the list; I guessed right, but with two Javert paths a
  student might hesitate.
- The path panel says the chain was made "at their defaults" without saying which defaults
  (edge weights used or not). For a "fewest go-betweens" path that is the one thing I'd check.
- Adding a note swaps the whole left panel from the graph list to the notes list. I lost sight of
  the path row I had started from, though the chip in the note box kept the context.
- The Notes row in the graph list shows 4, while the Notes panel lists five notes. I did not work
  out why.
- Save is gray with no hint why (empty text, presumably). Fine for an empty box, but when my
  typing did not land I had no feedback at all.
