# Session: look only at the biggest connected piece -- Analyst Alex

Participant: Analyst Alex (intermediate analyst; NetworkX for the maths, Gephi for the picture).
Task as given by the moderator: "Look only at the biggest connected piece, and tell me its size and
who matters most in it."
Mocks, in order: the filter chip screen, the app frame at rest, the Results panel (its "results
after a filter" state). Dataset on screen: Les Miserables co-appearances, 77 characters.

Outcome: completed. Answer given: "76 of the 77 characters; one loose node (OldMan) dropped.
Valjean matters most -- top by degree (36) and by betweenness (0.547), by a mile." Took longer than
it should have on the first screen and on reading the betweenness panel.

## Think-aloud transcript

**1. Filter chip screen, first look.**

> OK, Les Mis. That's the Gephi sample, I know this one -- 77 nodes, 254 edges, I've seen it in
> about ten YouTube tutorials. There's already a box open called "Filter steps" and it has three
> things in it. Largest component, degree at least 5, filter out group 8. So... someone already
> did the task? Plus two other things I didn't ask for. The pill under the title says "Filtered: 28
> of 77 nodes, 3 steps". 28 is not the biggest piece of anything, that's just what's left after
> all three.

He reads the right side before touching anything.

> Statistics on the right: "largest component 28" with a little funnel. Hmm. That's the largest
> component of what's left, not of the graph. I need to get rid of the other two steps.

**2. Clearing the other steps.** He unticks "degree >= 5", then "Filter out group 8". (The "One step
off" tab shows the in-between: 63 of 77, and under Largest component the line "Split into 4
pieces by 'Filter out group = 8'".)

> Wait, why did Largest component go to 4 pieces? ... Oh, because the group-8 step runs after it
> and cut the thing up. OK, fair, it's telling me the order matters. That's actually a thing Gephi
> never tells you. But I had to read it twice.

With both off, the chip reads 76 of 77, one step.

> 76 of 77. Fine. So one node falls off. Which one? The number on the row is just "76" -- 76 what?
> I'm assuming nodes left. I hovered it and it tells me it took out one: OldMan. I wouldn't have
> found that without hovering. Also, looking at the picture, basically nothing changed. There's one
> little dot on the far left that's gone. If the pill didn't say 76 of 77 I'd think it didn't work.

Moderator asks what he would have done from an empty project. He switches to the "No steps" tab.

> Honestly, the stats on the right already say "largest component 76" and "components 2" before I
> filter anything. So the size part I could answer without filtering at all. If I wanted to filter,
> "Add step" gives me "Filter to" then "Largest component". Fine, that's findable. I'd have typed
> "component" in a search box first, but it's the first thing in the menu, so OK.
>
> Kind of weird though. I was pretty sure the Gephi Les Mis sample was all one piece. Maybe this
> file's a bit different. That'd bug me if it was my data; I'd check the count against SQL.

**3. App frame at rest.** He glances at the frame screen to see where the filter lives normally.

> Here the little pill says "Full graph" next to the file name. I would never have guessed that's
> a button. It looks like a label, like a tag telling me what I'm looking at. There's no "Filter"
> anywhere else I can see -- not in the toolbar, not in the right panel. In Gephi it's a whole tab.
> If you'd started me here I'd have spent a minute hunting.

**4. "Who matters most."** Back on the filter screen with only Largest component on.

> The table at the bottom is sorted by degree. Valjean 36, then Gavroche, Marius, Javert. So by
> degree it's Valjean. But "who matters most" -- my director would ask "according to what?" Degree
> is just who's in the most scenes. I'd want betweenness. Where's that?

He goes to the Results button in the left rail (flask icon).

> Results. OK, a catalog: Centrality, Betweenness is the first one. Good, I don't have to hunt.
> There's also a search box, "Find a result or algorithm", I'd have typed "betw" there.

He moves to the finished state of the Results panel ("results after a filter").

> Now this is the bit I actually care about. It says "on: filtered graph, 76 nodes, 1 component",
> and Scope says "Filtered graph, 76 of 77". Good. That's the thing I worry about -- running it on
> the wrong graph and not knowing. The top-left pill also still says Filtered 76 of 77, one step.
> So I believe it ran on the big piece.
>
> Top nodes: Valjean 0.547, Gavroche 0.163, Myriel 0.151, Marius, Fantine. Valjean way ahead.
> Myriel's third here but he's not near the top by degree -- that's the kind of thing I'd put in a
> sentence: "Myriel's not in many scenes but he connects the bishop's storyline to everything
> else". That's useful.

He opens "Details".

> Run record: Brandes, exact, divided by (n-1)(n-2)/2 with n = 76, "after Filter to Largest
> component". Oh, that's nice. That's what I'd need if someone asks me why my number doesn't match
> theirs. NetworkX normalizes the same way, so I could check it. I would check it, first time.

What he stumbled on in the same panel:

> "Options wait for Run" and the Run button is grey. Wait for what? It's finished, isn't it? Do I
> need to press Run again? I can't, it's greyed. I'm guessing it means "if you change something
> you have to rerun" but it reads like it's waiting on me.
>
> Distribution: "middle 0.000". Middle of what -- the median? Say median. And "zero: 46 nodes, all
> 31=". I have no idea what "31=" means. ... Oh, rank 31, tied. OK. I'd never have got that without
> staring. Just say "46 nodes have none (tied at rank 31)".
>
> And the picture didn't change. It says "Appearance: color not shown". So I ran it and the graph
> still shows group colours. Same problem as Bloom. I get that the ranking's in the list, and
> fine, for this task I don't need the picture, but my instinct was "where did it go".
>
> "WebGPU" -- no idea what that means for me. Is that good? Does it matter?

**5. Getting it out.** He looks for the rest of the ranking.

> "71 more in the table", good, that takes me to a table. There's "Export files..." up top. If that
> gives me a CSV of name and betweenness I can paste into Excel, that's my weekly thing done. I
> didn't check what it exports; I'd want it to say "nodes, filtered graph, 76 rows" before I click.

**Answer given:** "The biggest piece is 76 of the 77 characters; only one loner (OldMan) is outside
it. Valjean matters most -- highest degree at 36 and highest betweenness at 0.547, more than three
times the next one, Gavroche. Myriel's worth a mention: third on betweenness even though he's not a
big hub."

## After the task

**Single Ease Question: 5 of 7.**

> The actual doing was easy -- Largest component is in the menu, betweenness is first in the
> catalog, and it told me which graph it ran on, which is the part I never trust. What took longest
> was the start: the filter box opened with two steps I didn't want and I had to work out that the
> "largest component 28" on the right was of the leftovers. And the betweenness panel has a few
> lines I couldn't read -- "31=", "Options wait for Run".

**Would he use it instead of his current tool?**

> For this -- "biggest piece, who's central" -- yes, probably, over the Python-then-Gephi thing,
> because it's one place and the scope's written on the result. That run record is better than
> anything Gephi gives me. But first time I'd rerun the betweenness in NetworkX and see if 0.547
> matches, and I'd need the export to open in Excel. And I'd need someone to tell me the data stays
> on my machine before I put the supplier file in it. If the number matches, I'm in.

## Problems observed

1. **The filter screen opens with steps the reader did not ask for** (filter chip screen). Three
   steps are already on; the statistics' "largest component 28" is of the filtered leftovers, which
   reads at first as an answer to the task. Severity 2.
2. **"Full graph" pill does not look like a control** (frame at rest). No other visible way in to
   filtering; the participant said he would have hunted for a minute. Severity 3.
3. **A step's count has no unit and the dropped node is hover-only** (filter chip). "76" with no
   "left"; which node went only shows in a tooltip. On Largest component the canvas barely changes,
   so the pill is the only proof the step worked. Severity 2.
4. **"Options wait for Run" with a greyed Run on a finished result** (Results panel) reads as
   "waiting on you" and the button refuses. Severity 2.
5. **"middle 0.000" and "zero: 46 nodes, all 31="** (Results panel): median named as "middle", tied
   rank written as "31=". Not understood without effort. Severity 2.
6. **Running betweenness does not change the picture** (Results panel, "color not shown"): the
   participant's first reaction was "where did it go", even though the ranking was on screen.
   Severity 1 for this task.
7. **"WebGPU" in the result line** means nothing to this reader. Severity 1.
8. **Sample data surprise**: the participant expected the familiar Les Miserables sample to be one
   piece; here one character is an isolate, so the "biggest piece" filter removes a single node and
   the canvas barely changes. Worth checking the fixture is intended. Severity 1.
