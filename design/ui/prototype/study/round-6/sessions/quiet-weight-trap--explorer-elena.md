# Rank the characters by a number on the lines -- Explorer Elena

**Participant:** Elena, a product manager with no graph training. Lives in Google Sheets, Slides
and the company's analytics dashboard. Company 14-inch laptop, trackpad, Chrome. Says "dots",
"lines" and "characters", not "nodes", "edges" or "weight". Has never said "centrality" out loud.

**Task as given by the moderator:** "The Les Miserables edges carry a number. Rank the characters,
then tell me whether you trust the ranking and why."

**Clock:** the long "curious afternoon" variant (no deadline, three or four dead ends tolerated).
The point where the short "first contact" variant would probably have ended is marked below.

**Starting point:** a blank project with the sample file miserables.json dropped on it. She was
told only that the file is the Les Miserables characters and "who appears with whom".

**Screens seen** (renders, in order):
- `../../../shots/r6-elena-qwt-01-load.png` -- the open-file window
- `../../../shots/r6-elena-qwt-02-form.png` -- the graph loaded, Betweenness clicked, its form open
- `../../../shots/r6-elena-qwt-03-choose.png` -- the "bigger value means" list opened
- `../../../shots/r6-elena-qwt-04-run-distance-value.png` -- what the other answer produces (shown by the moderator after she ran hers)
- `../../../shots/r6-elena-qwt-05-out-of-date.png` -- the same run with its answer changed, marked out of date
- `../../../shots/r6-elena-qwt-06-rerun.png` -- the run with "a closer or stronger link", the one she chose
- `../../../shots/r6-elena-qwt-07-table-dock.png` -- the table screen, a separate scene of the same sample
- `../../../shots/r6-elena-qwt-08-catalog-tooltip.png` -- a different sample's measure list, where hovering a name shows a one-line explanation

## Think-aloud

**The open-file window.** "OK, it's asking me before it opens. Nodes 77 -- that's the characters,
I guess. Edges 254, undirected. Isolated nodes zero, fine, nobody's alone." She stops on the grey
box. "Edge attribute value. Whole numbers, 1 to 31, most edges 1 to 3. So that's the number the
lines carry. Little bar chart, most of them are small. OK." She did not read the sentence under
the bars ("A measure that reads value asks, each time it runs, what a bigger value means"). Asked
later, she said she took "value" to be the generic word, "like, the value of the edge", and not a
column that happens to be called value. "Load." She clicked Load.

**The graph.** "Ooh. OK, colours. That's nice." (The charm lasted about as long as it took her to
look for Valjean.) "Big yellow one in the middle, Valjean. Of course he's the biggest, he's the
main character." (Dot size here shows how many characters each one appears with. She did not
check; she read it as importance.) "And the colours... group 2, group 8, group 4. Group 2 is the
biggest group, fourteen. Are those, like, the good guys?" She did not open the "6 more".

**The table already ranks them.** She noticed the table under the picture before any panel.
"Wait, there's already a list. Full graph, 77 nodes, sorted by degree. Valjean 36, Gavroche 22,
Javert 17..." Pause. "Degree. Is that like... how many lines each one has? Probably." She
scrolled the table a little. "So is that the ranking? That was easy." Then, rereading the task:
"But you said the lines have a number. Does degree use the number? It doesn't say." She did not
know, and nothing on the table told her.

*[Short clock: this is likely where the first-contact Elena stops. She has a ranked list,
Valjean on top, and would have answered "yes, I trust it, Valjean is the main character".]*

**The empty column.** "There's a column that says betweenness and it's empty. That's weird. Is
it broken or do I have to fill it?" She clicked the empty header; nothing happened in the mock.
She looked left. "Catalog. Centrality. Betweenness, closeness, harmonic... Centrality, like who's
in the centre? That's kind of what I want." She hovered the little (i) next to Betweenness; on
this screen it showed nothing. "No help. OK, the first one, since the table has a column for it."
She clicked Betweenness.

**The form.** "Scope, full graph, 77, fine. Weight: value." Pause. "Weight? I didn't say anything
about weight. Oh -- value, that's the number on the lines. So it's using it. Good." She glanced
right and, for the first time, read the side panel. "Weight: value, shared scenes, 1 to 31. Oh!
So the number is how many scenes they're in together. OK, that's useful. Why didn't the
open-file window just say that?" Back to the form. "In this run, a bigger value means: Choose.
And the Run button's grey." She hovered Run: "Choose what a bigger value means first." "Fine,
it's telling me what to do. I like that it won't just go."

**Choosing.** She opened Choose. "Two things. The first one's already blue -- is that the one
it wants?" Her pointer went to the blue row and stayed there. "A longer or costlier step. Hmm.
Costlier. That sounds like money." She read down. "A closer or stronger link -- such as a count
of shared scenes. Oh, that's literally mine. Shared scenes. More scenes together, they're closer.
Yeah." She picked the second one. Asked what "Distance = 1 / value" meant: "No idea. I skipped
the maths line. I picked it because it said shared scenes." Asked what she would have done if the
example had not been there: "Probably the blue one. It was highlighted, and 'bigger means longer'
sounds normal for a number."

**The result.** (The render she saw is `r6-elena-qwt-06-rerun.png`; in her session it was her
first and only run.) "It ran. Runs: Betweenness, and some line underneath, distance equals one
over value. OK, that's my answer written in maths." The table re-sorted. "Valjean 0.795, Marius
0.499, Myriel 0.224, Fantine, Courfeyrac, Thenardier... and Gavroche is way down at 0.102. He was
second a minute ago." Pause. "So which one is right, degree or this one?" She looked at the column
header: "0 to 0.795. Is 0.8 a lot? It's out of what? A percent?" Nothing answered that.

**The moderator shows the other answer.** The moderator showed her the screens where the first
answer, "a longer or costlier step", had been chosen instead
(`r6-elena-qwt-04-run-distance-value.png`) and then changed
(`r6-elena-qwt-05-out-of-date.png`). "Wait. Same button, and now Valjean, Gavroche, Javert,
Myriel. Javert's third! And no warning, nothing red, it just ran." She scanned for an error.
"So if I'd clicked the blue one I'd have gone to my VP with Javert. Great." On the changed-answer
screen: "Oh, it says out of date on the run and in the table, and Re-run keeps Run 1. OK, so it
doesn't throw away the old one. That's good, I can't break it." She seemed reassured by that more
than by anything else in the session.

**Three numbers for Valjean.** The moderator also had her look at the table screen
(`r6-elena-qwt-07-table-dock.png`, a separate scene of the same sample). "Valjean, betweenness
0.570. Now it's 0.57? I had 0.795. And the other one was 0.454. That's three different numbers
for the same guy." She read the header slowly: "Betweenness exact, unweighted, full graph.
Unweighted. So that one didn't use the scenes? I think? I'd never have known to check that."

**What betweenness is.** Asked what the number measures, she said: "Honestly? Who's the most in
the middle." The moderator showed her another sample's list where hovering Betweenness shows one
line (`r6-elena-qwt-08-catalog-tooltip.png`: "How often a node lies on the shortest paths between
other nodes: the brokers and bottlenecks"). She read the first half. "Shortest paths. OK... so
that's why it wanted to know if more scenes is longer or shorter. Kind of. Brokers I get. That
line would have helped back there, the (i) didn't do anything."

## Her answer

**Ranking:** "Valjean, then Marius, Myriel, Fantine, Courfeyrac, Thenardier, then Gavroche."

**Trust:** "Valjean on top, yes -- every list I saw puts him first, and he's the main character.
The rest, only sort of. The order depends on a question it asked me, and I got it right because
the second answer happened to say 'shared scenes'. I didn't really understand the question. And
I've now seen three numbers for Valjean, and the only difference is a word, unweighted, and a
line of maths. If my VP asked me why Marius is second, I couldn't tell her. I'd say 'the tool
says so', and that's not a good answer."

**The one sentence she would paste into Slack:** "Valjean is the most central character, Marius
second, if you count how often they share scenes." She added: "I'd leave out the number."

## Single Ease Question

**5 out of 7.** "Getting a list was easy, it even told me I had to answer before it would run.
Knowing whether the list was right was not easy. If I score just 'did I rank them', it's a 6. The
trust part drags it down."

## Would she use this instead of her current tool?

"Instead of a spreadsheet? For this, no. In a sheet I'd sort by how many scenes each person has
and everybody would understand it. This gives me something a sheet can't -- the Marius thing is
interesting -- but I can't explain it yet, so I couldn't put it in a deck. If it told me in plain
words what the number means and why Marius beats Gavroche, maybe. I did like that it wouldn't let
me run it without answering, and that it kept the old run."

## Observations

1. **The first answer in the list looks like the recommended one.** When the "bigger value means"
   list opens, "a longer or costlier step" is already highlighted. She read the highlight as the
   tool's suggestion and said she would have picked it without the "shared scenes" example on the
   second answer. The example on the right answer, not the question, is what got her to the
   correct choice.
2. **The table's first ranking looks like the answer.** The table arrives sorted by degree, with
   Valjean on top. She took it as a finished ranking and could not tell whether it used the number
   on the lines. On the short clock she would have stopped there, confident and unable to say what
   she had ranked by.
3. **Nothing on this path says what betweenness measures.** The (i) beside the measure name showed
   nothing on this screen, and the result never says what its number means or what its scale is
   ("0 to 0.795 -- is 0.8 a lot?"). A one-line explanation from a different screen helped her at
   once, and made the question she had been asked make sense after the fact.
4. **The run records her answer as a formula she cannot repeat.** "Distance = 1 / value" is the
   only record of what she chose. She could not read it back as "more shared scenes means closer",
   which is how she had actually decided.
5. **What the number is came from the side panel, not the open-file window.** "Weight: value,
   shared scenes, 1 to 31" in the right panel told her the number counts shared scenes. The
   open-file window said only "Edge attribute value", and she read "value" as an ordinary word, not
   as the name of a column.
6. **Different numbers for the same character lower her trust.** The table screen shows Valjean's
   betweenness as 0.570 ("unweighted"); her run gave 0.795, and the other answer gave 0.454. The
   only visible difference is the word "unweighted", which she does not know.
7. **The wrong answer gives a believable list with no warning.** Seeing Javert third under the
   other answer, with nothing flagged, is what moved her from "yes" to "sort of".
8. **Keeping the old run reassured her.** "Out of date" on the changed run and "Re-run (keeps Run
   1)" were the first things that told her she could not break anything, and she named it as a
   reason she might come back.
9. **She misread two encodings on the way in.** She took the biggest dot to be the main character
   because he is the main character (size shows how many characters each appears with), and
   wondered whether the group colours meant good and bad.
