# Reading the numbers after a filter -- Explorer Elena

**Participant.** Elena, a product manager with no graph training, used to Google Sheets and a
product-analytics dashboard (persona: study/personas/explorer-elena.md). Curious-afternoon clock.
**Screens, in order.** The open-a-file dialog with the protein file (GraphML), the main screen at
rest with the protein data, the filter chip and its steps list, the Results panel.
**Task, as given.** "You loaded 300 proteins and filtered to one module. Explain every count on
screen, and why the node count is not 300."
**Set-up the participant did not know.** No screen shows the protein data filtered to one module.
The filter chip screen and the Results panel's "after a filter" state both use a different sample
(Les Miserables, 77 characters). The protein screens all read "Full graph".

## Session, thinking aloud

**Open dialog (ppi-core-300.graphml).** "OK, 'Open ppi-core-300.graphml'. I don't know what
graphml is but it figured that out itself, fine. There's a little table: PSMA1, PSMA2... module
'Proteasome'. So 'module' is like a group column. Bottom right, 'What will load: nodes 300, edges
1,262.' Nodes are the dots, I think, and edges are the lines. So 300 dots, 1,262 lines. That
matches what the moderator said, 300 proteins. Good, nothing went missing yet." Clicks Load.

**Main screen, at rest.** "Ooh. OK, colored clumps. That's actually kind of nice. There's a box
in the corner, 'Module color' -- Ribosome 56, Proteasome 40, Complex I 35... those are how many in
each color, I guess. Let me just... 56, 40, 35, 32, 31, 30, 29, 21, 26. That's 300. OK, so every
protein is in exactly one color. I like that it adds up.

"Top left it says 'Full graph' with a little funnel. So I'm not filtered. Right side, Statistics:
Nodes 300, Edges 1,262, same as the dialog. 'Density 0.0281' -- no idea. Is that low? 'Connected
components: 3 (2 isolates)'. Hmm. Isolates. I'm guessing the two dots floating out on their own,
up top right and down bottom? That would make sense, they're not attached to anything. So three
pieces: the big blob and two loners. I think. 'Degree distribution' with a tiny bar chart. Skip.

"And 'Size by degree', 1, 10, 34 -- so the big black one, MAPK1, that's the most important
protein. It's the biggest and it's sort of in the middle."

**Trying to filter to one module.** "The moderator said I filtered to one module. So how do I do
that? In our dashboard I'd click the bar. Let me click 'Ribosome' in the color box." (Nothing on
this screen reacts to the legend.) "Nothing. OK, the funnel thing, 'Full graph', that's the only
filter-looking thing." Clicks the chip. (On this screen the chip is read-only until a filter
exists.) "Nothing again. Hm. I probably need to be somewhere else. Moderator, can I just go to
the filter screen?" -- Moderator opens the filter chip screen.

**Filter chip screen.** "Wait. 'Les Miserables'? Where are my proteins? These are... Valjean,
Fantine. That's the musical. Did I load the wrong thing?" Moderator: "Assume this is the state
after your filter." "OK... so pretend. It says 'Filtered: 28 of 77 nodes, 3 steps'. So 77 is
everything and 28 is what's left. That's the same idea as my question -- the count isn't 300
because the filter kept only some. Fine, I get that part.

"The box that popped open, 'Filter steps': 'Filter to Largest component 76', 'Filter to degree
>= 5 41', 'Filter out group = 8 28'. So it's like a funnel in our dashboard: 77, then 76, then 41,
then 28. Each line is what's left after that step. OK, that I like. That's how I'd explain it on
a slide.

"But then under the second one: '3 dropped below degree 5 by "Filter out group = 8"'. What? The
third step dropped them below the second step? I read it three times. I think it means taking
out group 8 made some people have fewer connections... but then why is it written under step two?
I'd just skip this line and hope nobody asks."

**Right side, Statistics.** "'Filtered graph: 28 of 77 nodes', matches the chip, good. 'edges 105
of 254' -- so 105 lines left of 254. 'components 1', 'largest component 28'. So everything left is
one piece, all 28. 'isolated nodes 0' -- no loners, makes sense, I filtered them out? 'average
degree 7.50' -- each dot has about seven and a half lines. OK. 'density 0.278'. Still no idea. It
went up compared with before, so... it's more crowded? I'd say 'it's more tightly connected' and
hope that's right.

"These little funnels after every number, I guess they mean 'this is after the filter'. The
legend box says 4: 9, 3: 8, 2: 7, 5: 3, 1: 1. That's... 28. OK, the legend is only counting what's
left too. Nice that it agrees with itself."

**The table at the bottom.** "'degree' 18 and then 'degree on: full graph' 36 for Valjean. So he
had 36 connections before, now 18, because half his friends got filtered. That actually makes
sense, I like that they show both. I'd have assumed the filter changed his real number otherwise."

**The left panel.** "'Co-appearances 77 nodes' -- that's the full thing, not filtered. Hm, so the
left says 77, the chip says 28. OK, left is the file, top is what I'm looking at. I think.
'The barricade, rule, 0 of 13'. Zero of thirteen what? Did something break? That scares me a
bit. I'd leave that alone."

**Results panel.** "Back to proteins. 'Full graph' again at the top. Nodes 300, Edges 1,262,
components 3, average degree 8.41. So here it's NOT filtered? Did my filter get lost when I went
to the results? ... Moderator says that's a different moment. OK. 'on: full graph, 300 nodes, 3
components' in the Betweenness box. I don't know what betweenness is. 'zero: 10 nodes'. Ten
proteins have zero of... something. 'Log scale; the 10 proteins at 0 take the lightest color.' I'd
skip this whole box."

**My answer to the moderator.** "OK. The count isn't 300 because I filtered to one module. If I
picked Ribosome it should say about 56 of 300, because the color box said 56 Ribosome. The chip at
the top tells you how many are left out of how many, and the little funnels on the right mean
'counted after the filter'. Lines go down too because lines to proteins outside the module are
gone. Density, isolates, that '0 of 13' thing and the 'dropped below by' sentence -- I couldn't
tell you. And honestly I never saw my proteins filtered, so I'm guessing the 56."

## After the task

**Single Ease Question: 3 of 7.** "The filter part is easy once I saw the list -- 77, 76, 41, 28,
like a funnel report. But I never got to filter my own proteins, I couldn't find how, and half
the numbers on the right are words I don't know."

**Would she use this instead of her current tool?** "For the counting part, maybe. The 'X of Y'
at the top and the table showing both numbers is better than anything I've seen. But I'd need to
be able to click a color in the box and just get that group, like our dashboard. And I'd need
someone to tell me what density is before I put it on a slide."

## Observer notes (not said by the participant)

- She summed the legend on the protein screen to check it equalled 300, and the filtered legend
  to check it equalled 28. The agreement built trust.
- Engagement dropped at the Betweenness box on the Results panel: answers shortened, no new
  attempts.
- She did not notice that the main screen says the edges carry a "confidence" weight while the
  Results panel says "no weight" for the same protein file.
- She confidently read the largest dot (MAPK1) as "the most important protein", when size shows
  number of connections.
