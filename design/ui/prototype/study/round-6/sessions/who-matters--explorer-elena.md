# Session: "who matters most to the story, and how sure" -- Explorer Elena

Participant: Elena, 34, product manager at a B2B software company. No graph training. Lives in
Google Sheets, Slides charts and her company's analytics dashboard. Says "dots", "lines", "groups",
"the big ones". Has seen the Les Miserables musical once and has not read the book.

Clock: curious afternoon (no deadline; she puts up with three or four dead ends).

Moderator task, as given: "You have the Les Miserables co-appearance network open. Find the few
characters who matter most to how the story hangs together, and tell me how sure you are of their
order."

Screens she saw, in order (study view: design notes hidden):

1. The project just opened, nothing run yet, one colour per group, all dots the same size
   (shots/r6-elena-who-rest.png, from screens/frame-at-rest.html?dataset=lesmis).
2. The same project a little later, with Size: degree in the style stack and the table open under
   the picture, sorted by degree (shots/r6-elena-who-nav-new.png, screens/navigation.html?frame=new).
3. Valjean clicked (shots/r6-elena-who-nav-new-node.png).
4. Results on the left rail: the list of runs (shots/r6-elena-who-nav-new-results.png).
5. The Betweenness run opened (shots/r6-elena-who-nav-new-run.png).
6. The table with rank columns and the sentence about where the two rankings agree
   (shots/r6-elena-who-table-small.png, screens/table-dock.html, "Small graph" state).
7. A Betweenness result on a filtered version of the graph (shots/r6-elena-who-rp-filtered.png).
8. The Closeness entry in the Results catalog, with its hover text, on Les Miserables
   (shots/r6-elena-who-closeness.png).
9. For comparison, the same kind of result panel on another dataset, where it says two ranks are
   tied (shots/r6-elena-who-rp-variant.png; the moderator said "pretend it is Les Miserables").

## Think-aloud

**First look (screen 1).** OK, Les Miserables. Dots are people, I'm guessing, lines are... they're
in a scene together? "Co-appearances". Yeah. Valjean is right in the middle with everything going
into him. Javert is right next to him -- makes sense, the cop who chases him, they'd be stuck
together. Marius and Gavroche and that blue bunch at the bottom, that's the barricade.

So if you ask me cold: Valjean, Javert, Marius. The ones in the middle.

(Reads the legend.) "Group color. 2, 8, 4, 1, 3, 5, 0, Other." Numbers again. OK, these are group
names, the second column is how many are in it. I'm not going to learn what "group 2" is.

Right side. Statistics. Nodes 77, edges 254, density 0.0868. No idea. "Connected components 1".
Fine. Nothing here tells me who's important. There's a "Table" bar at the bottom. I'll open that.

**The table (screen 2).** Oh, now the dots are different sizes. Valjean's huge. And on the right
it says "Size: degree". So the size is... the degree. Which is -- the number in the table. OK:
"Full graph: 77 nodes. Sorted by degree." Valjean 36, Gavroche 22, Marius 19, Javert 17,
Thenardier 16, Fantine 15.

36 what? Scenes? People he's in scenes with? I think people -- 36 lines come out of him. So
degree is "how many people you know". Fine, I can say that in a meeting.

So by this count: Valjean, Gavroche, Marius, Javert. Gavroche second is odd, he's the kid. But
he's at the barricade with everybody, so I guess he meets a lot of people.

**Clicking Valjean (screen 3).** Let me click the big one. Right side: Valjean, Node. Appearance
has four things, Size: degree, Group color, Bridges off, Base style. Attributes: group 2, degree
36. Results: "betweenness 0.57, highest". "bridges: on no bridge".

"Betweenness". Between-ness. He's between everybody? That actually sounds more like what the
question is asking -- "hangs together". "Highest", so he's number one on that too. Good.

"Bridges off", "on no bridge" -- I don't know. Skipping.

(Looks down.) The table re-sorted itself. "Sorted by betweenness." Valjean 0.57, Myriel 0.177,
Gavroche 0.165, Marius 0.132, Fantine 0.13, Thenardier 0.075. I didn't ask it to re-sort, but OK,
I guess because I clicked him.

Myriel. Who's Myriel? (Finds the label, top right.) That little blue group off on its own. Is
that the bishop? The candlesticks? He's in the first ten minutes. And he's second? And he's off in
a corner of the picture, he's clearly not central. That has to be a quirk of the math. And where's
Javert? He was fourth. Now he's not in the top six. Did I do something?

(She scrolls the six rows. There is no seventh row visible.) I can't see Javert.

**Results rail (screen 4).** Somebody said Results is where the numbers live. (Clicks Results on
the left.) "Every run of a measure, with its settings and date." "Betweenness, today, 14:02.
Exact, normalized, no weight. Full graph, 77 nodes." And Bridges. OK, so this is a history. That's
clear, actually -- it's like the version history in Google Docs. "Full graph, 77 nodes" -- good,
that's all of them. I like that it says that.

"Run a measure..." up top. Not yet. I'll open the Betweenness one.

**The run opened (screen 5).** "Ran on the full graph, 77 nodes. No weight: every edge counts the
same." Settings: method exact, every node. Normalized yes. I don't know what normalized means but
it says yes, so fine.

Top nodes: Valjean 0.57, Myriel 0.177, Gavroche 0.165. Three. Just three. And then "Show in table,
sorted" and "Show as style layer".

So how sure am I? Myriel 0.177 and Gavroche 0.165 are pretty close. Is that close? It's like 0.01
apart. On our dashboard a 0.01 difference is nothing. I don't know if this is the same kind of
number. Nothing here tells me. (She reads the panel top to bottom again.) No. It just gives me the
list.

(She clicks "Show in table, sorted".)

**The table with ranks (screen 6).** Oh, this is different. There's a sentence: "Valjean is #1 on
both measures. At #2 they part: Gavroche by degree, Myriel by betweenness." And the columns have
"rank of 77" next to them. Valjean #1, #1. Gavroche #2, #3. Marius #3, #4. Javert #4 and... #7,
0.054.

OK so Javert did not disappear, he's seventh on the between one. That makes me feel better, I
didn't break anything. It just counts differently.

That sentence is the thing, honestly. It's the answer to "how sure": sure about Valjean, the
two counts agree. After that they split. I'd paste that sentence.

Fantine and Enjolras both say "#6=" on degree. Equals -- tied for sixth. Like a race. Got it.

What I don't get is, which count is the story one? The sentence tells me they disagree, it
doesn't tell me which to believe. If I had to pick, I'd pick degree, because Myriel at number two
is just wrong. He's the bishop. (Pause.) Unless it's right, and I'm wrong. I don't know. I'd want
someone to tell me why he's second.

(She sees "Compare rankings..." and does not click it.) Last time something like that opened a
scatter plot with words I didn't know. I have my sentence. I'm not clicking it.

(She notices a second Thenardier-ish row further down, "Mme.Thenardier", and briefly thinks it is
a duplicate.) Two Thenardiers? Oh, Madame. The wife. OK.

**The filtered result (screen 7).** (Moderator shows another result.) "Betweenness, on 60 of 77
nodes." Wait, 60? And up top, the button says "Filtered: 60 of 77 nodes, 1 step". So this one
isn't all of them. OK, it says so right in the title. Last thing I'd do is take this one to a
meeting then; the other one said full graph.

Top nodes: Valjean 0.419, Gavroche 0.172, Marius 0.164, Fantine 0.154, Javert 0.073. So with
fewer people, Myriel's gone and Javert's back. So Myriel being second depends on... the people
that got taken out? Maybe his little group got filtered away. That would make sense -- then he's
not between anybody. Huh. Maybe that's why he was second: he's the only way to his little group.

(She reads the sentence under the list.) "Every step in the top 5 is over the 1% tie line; the
smallest, ranks 2 and 3, is 4.7%." ... Tie line. So if two of them are within 1 percent, it'd
call them tied? And here nothing is that close, so the order is real? I think that's what it says.
It took me two reads. I'd want it to just say "this order holds" or "these two are basically
tied".

The little chart at the bottom -- one tall bar at zero, then a blue sliver way out on the right.
Valjean way out on his own. That picture says "sure about number one" faster than any sentence.

**Closeness (screen 8).** (Moderator: another way of measuring.) There's a list, "Catalog":
Betweenness, Closeness "WF-corrected", Harmonic centrality, PageRank, Eigenvector centrality.
The hover on Closeness says "7 components: each score is scaled by the share of the graph the node
can reach (Wasserman-Faust)."

No. I'm not running a thing with a person's name on it that I can't pronounce. And "7
components" -- the first screen said components 1. Now it's 7? (She sees "76 of 77 nodes, 1 step"
at the top.) Oh, it's filtered again. One person gone and now it's seven pieces? That's weird, but
fine, I'm not doing closeness. The closeness column in the table is empty anyway.

**The tie sentence on other data (screen 9).** (Moderator: pretend it's Les Mis.) "Ranks 3 and 4
differ by less than 0.2%, under the 1% tie line; treat them as tied." Oh, that one's clear.
"Treat them as tied." That's what I wanted on the Myriel-Gavroche one. Just tell me.

## Her answer

"Valjean, for sure. He's first on both counts and on that little chart he's way off on his own.
Then Gavroche and Marius -- they're top four on both. Javert is fourth by how many people he's in
scenes with, but way down on the 'between' one. And the bishop, Myriel, is second on the 'between'
one, which I didn't believe at first, but I think it's because he's the only link to his own
little group. So: sure about one; fairly sure about Gavroche and Marius being next, not their
order; after that it depends on how you count."

Her Slack sentence: "Valjean holds the whole thing together -- #1 on both counts. Gavroche and
Marius are next. After that the two ways of counting disagree."

For the record: on the full graph Valjean is first on both measures and Gavroche and Marius are in
the top four on both, which she got right. Myriel is second by betweenness because he is the only
bridge from his small cluster to everyone else, which is the "hangs together" sense of the task;
this time she arrived at that reason herself, but only by comparing against the filtered run, not
from anything the full-graph run told her.

## Single Ease Question

"Five. Getting to Valjean was easy. The sentence over the table -- 'number one on both, then they
part' -- was the answer to 'how sure', and this time Javert showing up as seventh meant I didn't
think I'd broken something. The filtered one said 'on 60 of 77' in the title so I didn't get
fooled. What cost me was the run itself: it gave me three names and no word on whether the
second and third are really different, and I had to click through to the table to find out."

SEQ: 5 of 7.

## Would she use it instead of her current tool?

"My current tool is sorting a spreadsheet by a count column. Yes, I'd use this over that -- the
'where the two lists agree' sentence is something a spreadsheet will never tell me, and the
history of runs saying 'full graph, 77 nodes' means I know what I'm quoting. I still wouldn't show
my VP the 'between' number without someone explaining why the bishop is second, and I'd want the
run itself to tell me 'these two are tied' the way that other screen did."

## Observer notes

- She read dot size as importance on the second screen and position in the middle as importance on
  the first (where all dots were the same size). Both agreed with degree, so neither misreading was
  corrected. She did read "Size: degree" in the style stack and tied it to the table column.
- She read "Javert next to Valjean in the picture" as "they are linked because they are enemies"
  and confidently named Javert second from the picture alone; he is fourth by degree and seventh
  by betweenness.
- The table re-sorting by betweenness when she clicked Valjean surprised her; with six rows visible
  she concluded Javert had vanished and blamed herself ("Did I do something?") until the rank
  column showed him at #7.
- The opened run shows three top nodes and no statement about near ties. Myriel 0.177 and Gavroche
  0.165 are about 7% apart; she guessed the gap was "nothing" by analogy with her dashboard. The
  only "how sure" she got for the full graph came from the agreement sentence over the table, which
  she reached through "Show in table, sorted". The table under the picture in screens 2 and 3 has
  no rank columns and no agreement sentence; she would not have found either without clicking
  through from the run.
- She did not click "Compare rankings..." because of a bad memory of a scatter plot, not because of
  anything on this screen.
- The filtered state no longer fooled her: "on 60 of 77 nodes" in the result's title and the
  filter button caught her before she read a number. She then used the filtered and full runs
  side by side to explain Myriel's rank to herself -- the one real insight of the session, reached
  by accident.
- The "1% tie line" sentence in the filtered result took two reads; the "treat them as tied"
  sentence on the other dataset was understood at once and she asked for that wording on her own
  question.
- Engagement dipped at the Closeness catalog entry ("No." / "fine") -- the name on the variant and
  the "7 components" hover, next to a first screen that had said 1 component, lost her -- and came
  back only when the moderator showed the tied-ranks sentence.
- "Bridges off" and "on no bridge" were skipped again without a guess.
