# Session: a costly measure on the whole graph -- Priya, threat hunter

**Participant.** Priya, senior threat hunter at a regional bank (persona:
`study/personas/cybersecurity-analyst.md`). Plays every session as if an alert could pull her away.

**Task as given by the moderator.** "Measure who bridges the groups across this whole citation
graph."

**Screens used, in order.** Measure options with cost (`screens/option-form-cost.html`), the
results panel (`screens/results-panel.html`, the sampled-finished frame), and the frame past the
drawing limit (`screens/past-drawing-limit.html`).

**Outcome.** Succeeded with difficulty. She ran a sampled Betweenness on the full 124,318-patent
graph, read the top five, and found the route to the full table. She did not trust the result
enough to hand it on: the run she started did not match the run she read (101 sources and directed
before, 50 sources and "read as undirected" after), and "the groups" never appeared anywhere.

**Single Ease Question.** 4 of 7.

---

## Transcript

*Moderator reads the task. Priya is on the first screen, the protein network with Betweenness in
"Not run".*

**Priya:** Okay. "Who bridges the groups." In my world that's betweenness -- the choke point. The
account every path goes through. So I want betweenness. First, though, same three questions as
always: is this approved, where does it run, does it phone home? ... There's a thing on the left
rail, "Assistant. Off. Nothing is sent." Fine, that's one answer, for the assistant. It doesn't
tell me the measure itself stays local. I'll keep going because it's a study.

*She reads the protein frame briefly.*

**Priya:** Wait, this is proteins. Three hundred of them. The task said citations. ... Okay, the
header says "Human protein interactions". I'm going to assume I'm supposed to be on the other
graph. I don't see a way to switch here except that dropdown on the name. Moving on to the patent
frames.

*She looks at the weight question on the protein frame on the way past.*

**Priya:** "In confidence, does a bigger number mean a stronger tie, a longer distance, or an
amount that flows?" Huh. Actually -- that's a real question. If I load auth counts as weight, a
tool that treats 400 logons as 400 hops of distance gives me garbage betweenness. Most tools never
ask. I'd pick "stronger tie" and move on. Fine. Not my graph right now though.

*Frame 2: Patent citations, Betweenness, over the time limit.*

**Priya:** Okay, this is the one. Patent citations, 124,318 nodes, 1.48 million edges. I click
Betweenness in the catalog and it already says "hours" next to it. Good -- it told me before I
clicked. That's the BloodHound thing, right? Shortest paths to DA, forty minutes, no idea if it's
alive. This just says hours up front.

*She reads the yellow warning.*

**Priya:** "Takes hours. The time limit is 30 seconds." Whose limit? Mine? Can I change it? I don't
see where. Whatever. Then it gives me four options with times: "Sampled, 101 sources -- under a
minute", "Exact, on 5,318 nodes -- under a minute", "Sampled, 500 sources -- a few minutes",
"Exact, on the full graph -- hours". That's actually a good menu. It's the conversation I'd have
with myself in the notebook, except I'd have to guess the numbers.

**Priya:** The 5,318 -- that's "Drug patents granted in 2..." over on the right, truncated. Not
what the task said. The task said whole graph. So: sampled, 101 sources. The button already says
"Run sampled". Click.

**Priya:** One thing -- "101 sources". Sources of what? I know sampling betweenness means you pick
some starting nodes and scale up. Someone junior would not. There's a little info icon next to
"Sample size" on the next screen, I'll assume it says that.

*Frame 3: running.*

**Priya:** Okay, there's a progress bar in the panel and a black bar at the bottom: "Running
Betweenness (sampled)... under a minute... Cancel". Good. I can see it's alive. That's the single
most important thing on this screen for me. And I can close the panel and it keeps going, it
looks like. Good, because I will get pulled away.

**Priya:** "Edits wait for Re-run." Fine. Seed 7. I like that there's a seed. If I rerun it I can
get the same answer. That's reproducible -- I can put that in a case.

**Priya:** Canvas is empty. "124,318 nodes not drawn. Narrow the graph..." Honestly? Fine. I don't
need the picture. I need the list.

*Frame 4: after it finishes, the form showing Sample size 500.*

**Priya:** This one confuses me for a second. It says "Finished on 101 sources, seed 7", and then
the box says 500 and a warning that 500 takes a few minutes and runs in the background. So someone
typed 500 after. Fine, that's the "go bigger" option. I wouldn't bother until I knew if the top-10
from 101 made sense. Skip.

**Priya:** "The top of the ranking is usually stable; a single score can be well off." That's
honest. I'd want a number on it, though. "Usually" isn't a number.

*Moderator moves her to the results panel, sampled finished.*

**Priya:** Okay, results. "On full graph, 124,318 nodes. Sampled, 50 sources." ... Fifty? I ran a
hundred and one. Where did fifty come from? And "Unweighted, undirected." The form I just ran said
"Direction: As the graph: directed". This says undirected. So either this is a different run or
the tool changed my settings. Which is it?

*She opens Details.*

**Priya:** Run record. Method: "Brandes betweenness from 50 random sources, scaled up by
124,318 / 50." Seed 7. "Direction: Citations read as undirected." Error bound plus or minus
0.00035, "95 runs out of 100". Okay -- this record is exactly what I want. It's the notebook cell.
There's a Copy button, I'd paste this straight into the case. But it's describing a run I didn't
start. In real life I'd stop here and rerun it myself to see which one is true. That's a trust
problem, not a cosmetic one. If the settings drift between the thing I clicked and the thing that
ran, I can't put the number in a report.

**Priya:** Also -- directed versus undirected actually matters for citations. If A cites B, is B a
"bridge"? I'd want the tool to have kept what I picked.

*She reads Top nodes.*

**Priya:** Top nodes: #1, 5879702, about 0.0160. #2, 5902311. Then "#3 to #7" three times. Oh --
that's the error bar turned into ranks. "Ranks below #2 may swap between runs." Okay, I actually
like that. Nobody does that. Every tool gives you a confident top 10 that's noise past number
three. This one says: these two are real, the next five are a tie.

**Priya:** "124,313 more in the table" -- that's my way out. Presumably the table sorts by
betweenness and there's "Export table as CSV..." on it, because the protein version had that. That
gets it into Splunk or my notebook. Good.

**Priya:** Now -- the task said "who bridges the groups". What groups? I measured betweenness over
the whole graph. That's "who's on a lot of shortest paths", not "who connects cluster A to cluster
B". There's "Weakly connected components 3,912" in the project list. Are those the groups? No --
if they're separate components nothing bridges them by definition. I'd need communities first,
Louvain or Leiden, and then something that tells me which nodes have edges into several
communities. I don't see anything that ties Betweenness to a community result. Leiden says "under a
minute", so I could run it, but then what? Color by community and eyeball the betweenness? On a
graph I can't draw? No.

**Priya:** So I'm going to call it: betweenness is my answer for "bridges", and I'd write in my
notes that I didn't do the groups part.

*Moderator shows the drawing-limit frame and its sample state.*

**Priya:** "124,318 nodes not drawn. More than this browser draws at once (50,000). Every node is
counted in Statistics and listed in the table." Good. That's not a crash and not a white screen,
and it says nothing was dropped. That's the sentence I need. Much better than a hairball.

**Priya:** The sample -- "top 3 by degree, with neighbors" -- gives me three big starbursts. That's
a picture of hubs, not bridges. The top-degree patents aren't my top-betweenness patents --
6,117,075 vs 5879702. So if I wanted to see the bridges I'd want "draw the top 50 by
betweenness and their neighbors," not "top 3 by degree". Didn't see that offered. And the ids are
formatted differently -- "6,117,075" with commas here, "5879702" without in the results. Those
are IDs, not quantities. Don't put commas in an ID. If I paste "6,117,075" into a search it'll
fail.

*Task ends.*

---

## After the task

**Single Ease Question: 4.**

**Priya:** Four. Finding betweenness and getting it to run on the big graph -- that part was easy,
maybe a six. It told me the cost before I clicked, it gave me real options with times, it showed me
it was working, and the ranked list with ties is the smartest thing I've seen in a graph tool.
What drags it down is that what I ran and what I read don't match -- 101 versus 50, directed versus
undirected -- and "the groups" part of the question just isn't there.

**Would you use this instead of your current tool?**

**Priya:** For this kind of question, over my notebook -- maybe. In the notebook, networkx
betweenness on a 124K-node graph with k=100 is a line of code, and I'd wait and not know how long.
Here I got a time estimate, a seed, a run record I can copy, and an honest error bar. That's
better than what I have. But I'd need two things before I'd trust it on a case: the run record has
to match the settings I picked, every time, and I need the full ranked list out as a CSV with the
ids as plain strings. And it still has to be on the approved list and say in plain words that the
measure runs in my browser and nothing leaves. The Assistant line says "nothing is sent"; I want
that for the whole app, not just the AI button.

---

## Problems observed

1. **The run she read did not match the run she started.** The options form ran "Sampled, 101
   sources", "As the graph: directed"; the finished result and its record said 50 sources and
   "Citations read as undirected". She could not tell whether the tool changed her settings.
   Severity 3.
2. **"Groups" had nowhere to go.** Betweenness answers "who is on many shortest paths"; nothing
   links it to a community result to answer "who connects different groups". She finished the task
   by redefining it. Severity 3.
3. **Patent ids shown with thousands separators on the drawing-limit frame** ("6,117,075") but
   plain on the results panel ("5879702"). An id with commas does not paste into a search.
   Severity 2.
4. **The drawn sample is top by degree, not by the measure she just ran**, so the picture shows
   hubs, not bridges. She wanted "draw the top N by this result and their neighbours". Severity 2.
5. **"The time limit is 30 seconds" names no owner and no way to change it.** Severity 1.
6. **"Sources" in "Sampled, 101 sources" is unexplained on the choice screen**; fine for her, not
   for a junior. Severity 1.
7. **"Usually stable" is soft** where the results screen later gives a real error bound; the
   options form could quote the bound. Severity 1.
8. **"Nothing is sent" is said only for the Assistant**, not for the measure or the app. Severity 2.

## What she liked

- The cost ("hours") shown in the catalog before she clicked, and a menu of ways to run it that
  fit, each with its time.
- A visible progress bar and a Cancel in the bottom bar: proof it was alive.
- A seed, and a run record with method, normalization, error bound and a Copy button.
- Ranks turned into ranges ("#3 to #7") from the error bound, with "Ranks below #2 may swap
  between runs."
- "124,318 nodes not drawn ... Every node is counted" instead of a hang or a hairball.
- The weight question ("does a bigger number mean a stronger tie, a longer distance ...") on the
  protein frame.
