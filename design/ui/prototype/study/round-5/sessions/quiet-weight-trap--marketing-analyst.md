# Session: the quiet weight trap -- Jordan, marketing network analyst

Task as given by the moderator: "The Les Miserables edges carry a number. Rank
the characters, then tell me whether you trust the ranking and why."

Screens used: the weight-role-trap storyboard (load, result, trust check,
re-map, Out of date, re-run), the Run a measure menu (run-and-read), the
Algorithms menu (results-panel), the inspector. Played at 1440 by 900.

## Think-aloud

**1. Dropping the file in (load dialog).**

"OK, drag it in. Good, it tells me what it read before it does anything: 77
nodes, 254 edges, undirected, nothing isolated. That's the check I'd normally
do in Excel afterwards, so, fine.

Then there's this box: 'Edge attribute value. Whole numbers, 1 to 31, most
edges 1 to 3', with a little bar chart. And a question: 'For value, a higher
number means...' Um. I don't know what the number is. The file just calls it
'value'. The moderator said 'a number'. Nothing here tells me it's scenes, or
messages, or whatever -- it's called Untitled project at this point, so I
don't even get the Co-appearances name yet.

My gut: a number on an edge is how much two people interact. Mentions,
replies. More is stronger. So 'a closer or stronger link'.

But hang on. I read the grey text on the right because it's the only
explanation there is. The first option says 'Read by shortest path,
betweenness, closeness.' The second says 'communities, PageRank, weighted
degree.' I want to rank characters, and the thing I'd rank by is betweenness,
the bridges. So... does this pick which measures I get? It kind of reads like
a menu: pick row one and you get betweenness. 'Algorithms read it by this
answer' -- I read that as 'these algorithms will read it'.

Oh -- wait, the second row actually says 'such as a count of shared scenes'.
If I'd read that bit first I'd have known. But I didn't know the value WAS
shared scenes, so it's just an example to me, not a statement about my file.

I'll go with the first one. I'm going to run betweenness, and that's the row
with betweenness in it. Load."

(Jordan chose "a longer or costlier step". She did not open the file to
check what value meant, and nothing on this screen said what it meant.)

**2. Running the ranking (Run a measure / Algorithms menu).**

"Where's 'find influencers'? No. It's algorithm names -- Centrality,
Community, Structure. I'll live, I know betweenness. The hover says 'How often
a node lies on the shortest paths between other nodes: the brokers and
bottlenecks.' Good, that's a sentence I can paste into a brief. 'Brokers' is
the word I'd use. Click to run. No settings panel, good."

**3. Reading the result (table under the graph).**

"It ran instantly, it's sorted, there's a table. That's actually the thing I
always want. Valjean 0.454, Gavroche, Javert, Myriel, Thenardier, Fantine.

Sanity check: Valjean is the main character. If he wasn't top I'd throw it
out. He's top. Javert third -- he chases Valjean the whole book, sure, he'd be
between things. OK, this looks right to me.

And this is the problem, isn't it. It looks right. I passed my own test."

**4. The moderator asks: do you trust it?**

"Mostly? I'd want to know what it did with the number. On the right under
Results it says 'Betweenness -- Weight: value, used as distance.' Also up in
Statistics, 'Weight: value, used as distance'.

Distance. Hmm. If this is 'how many times two characters are together', then
more together means further apart? That's backwards. And now the graph is
called 'Co-appearances' -- so it IS how often they appear together. So I told
it that two characters who share 31 scenes are the furthest apart. That's...
on me, I guess, but I answered a question about data it hadn't told me
anything about yet.

I click the result. The little card: Scope Full graph 77, 'Weight -- from
Edges: value, used as distance', and under it in plain words 'Read as a
distance: a bigger value is a longer step.' That's clear. That's the sentence
that should have been in the load box with MY data's name in it.

There's a chain-link icon with a tooltip 'Detach: read value another way for
this run only.' No. I don't know what detach means and 'this run only' sounds
like it'll make two versions I'll have to keep track of. Not touching it.

'Normalized' is on. Fine, I'd leave that."

**5. Fixing it.**

"Clicking the weight thing opens an Edges box: Undirected / Directed, Weight
'value', 'A higher value means' -- 'a closer or stronger link'. Changed.
There's 'How it is converted' under an arrow; I'm not opening that, it's going
to be a formula.

Straight away the betweenness says 'Out of date' with a Re-run button, and the
column header in the table says 'Out of date' too, instead of the range. Good.
That I like -- Talkwalker would've just quietly kept the old number and I'd
have put it in a deck. It didn't redo it behind my back either. Re-run."

**6. The second ranking.**

"Valjean 0.795, Marius 0.499, Myriel, Fantine, Courfeyrac, Thenardier,
Gavroche. And the row now says 'used as similarity'.

So Marius went from nowhere to second. Where did Javert go? He's not in the
top seven any more. I'd have to scroll the table or search him to find out.
It doesn't tell me what moved. If I'm going to explain to my manager why the
list changed, I need 'Marius up from 10th, Javert down from 3rd', not two
screenshots I have to diff by eye.

Also the numbers all changed scale -- Valjean was 0.454, now 0.795. Both
'normalized'. I can't explain that to a VP and I'm not going to try. I'd
just give ranks."

**7. Off topic, but.**

"This is exactly our mention data problem. The listening tool exports an edge
count and calls it 'weight', and in one export it's replies and in the next
it's 'distance in the audience graph' or something, and nobody documents it.
Half the time I don't know what the column is either. At least this asked."

**8. Hand-off.**

"I'd want the table out as CSV with the rank, the score, the group, AND which
reading it used. If that 'used as similarity' doesn't go into the export, the
file on the shared drive is the same as the wrong one. There's a '...' on the
table; I'm assuming export is in there. Didn't check today."

## Answer to the task

**Ranking (second run, value read as a closer or stronger link):** Valjean,
Marius, Myriel, Fantine, Courfeyrac, Thenardier, Gavroche.

**Do I trust it?** "The second one, more than the first. Not because the
numbers look better -- the first one looked fine too, that's what bothers me.
I trust it because I can read the reason on the row: 'value, used as
similarity', and value is co-appearances, and more co-appearances should be a
stronger tie. I don't fully trust it because I never saw what the conversion
was, and because my usual check -- is the big name on top -- passed both
times. The known-account check doesn't catch this. I'd have shipped the first
list."

## Single Ease Question

**3 out of 7.** "Running it was a 6. Knowing which answer to give on load was
a 2. I got it wrong and only noticed because you asked me whether I trusted
it."

## Would I use this instead of my current tool?

"For the ranking step, maybe. Gephi doesn't ask me anything, it just uses the
weight however it uses it, and I'd never know. This at least writes on the
result how it read the number, and it flags Out of date instead of lying.
That's better than what I've got. But the question it asks on load is in the
wrong place -- it asks before it's shown me my data or its name, and the one
hint that would have saved me is written as an example. And I'd need the
'moved from / to' and a CSV that carries the reading before I'd put it in
front of anyone. Right now I'd keep Gephi for the maps and try this for the
list."

## Moments worth noting (in her words)

- "The grey text on the right reads like a menu. Row one says betweenness, I
  want betweenness, so I picked row one." The measures named under each
  answer pulled her toward the wrong answer.
- "It asks what the number means before it tells me anything about the
  number." The load step shows only the range and a histogram; the graph
  name ('Co-appearances') appears only after Load.
- "'Such as a count of shared scenes' -- if that's what my file is, say so.
  As an example it's just decoration."
- "My check passed both times." Checking a known account on top does not
  expose a wrong weight reading; the result looked right both ways.
- "'Used as distance' on the result row is what made me stop." The reading
  line on the result is what caught the error.
- "Out of date, and it didn't rerun on its own -- good." Liked.
- "Detach, this run only -- not touching it." Did not understand Detach.
- "Where did Javert go?" No before/after rank comparison after a re-run.
- "0.454 to 0.795 for the same guy." The score scale shift is unexplainable
  to a stakeholder; she would report ranks only.
