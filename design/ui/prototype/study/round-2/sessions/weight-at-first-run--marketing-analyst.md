# Session: a weight column met at the first run -- Jordan, marketing network analyst

**Task as given by the moderator:** "Run PageRank on a network whose edges have a
confidence column you have never thought about."

**Screens used:** "Measure options with cost" (the first frame: the first run that
reads a weight asks what it means) and "Results panel" (finished, out of date,
variant frames). Both are static mocks; where a click had no target, the
participant was told what the prototype would do or had to guess.

**Participant:** Jordan, growth-marketing analyst, network work one or two days a
week, Gephi and NodeXL background, calls every centrality "influence score" and
treats PageRank and eigenvector as roughly the same thing.

## Think-aloud transcript

**Opening the first screen.**

> OK. Human protein interactions -- so not my data, fine, pretend it's a
> mention network. 300 nodes, 1,262 edges, over on the right. And -- oh, there's
> a line on the right that already says "weight: confidence, meaning not set."
> So it's already noticed I have a confidence column. I didn't tell it that.
> Fine, I guess.

> Left side, "Assistant -- Off. Nothing is sent." Good. That's the first thing I
> want to know. Although that's just the assistant, right? It doesn't say
> anything about my file. I'll let it go for a public export.

**Looking for PageRank.**

> There's a panel open already and it says Betweenness. I didn't ask for
> Betweenness. I want PageRank. Catalog, left, list -- Betweenness, Closeness,
> Eigenvector, Harmonic, HITS, Katz, PageRank. There it is, bottom of the list.
> Click.

*(Moderator: the prototype does not open a PageRank form; assume it opens the
same form with PageRank at the top.)*

> OK, so I'm imagining this says PageRank. Honestly that's a bit of a leap --
> the one example you've given me is Betweenness, and I don't know if PageRank
> would ask me the same thing. I'm going with it.

**The Weight field.**

> Scope, Full graph, fine. Direction, "undirected, as the graph" -- it's just
> telling me, not asking. Weight: "confidence." It's already picked the column.
> Underneath: "Read as a distance. Not used while its meaning is not set."

> Wait. Read as a distance? I didn't say it's a distance. And then in the same
> sentence it's not used? So is it being used or not? That line lost me. I'm
> reading it three times.

**The question.**

> "In confidence, does a bigger number mean a stronger tie, a longer distance,
> or an amount that flows? Examples: 0.99, 0.79, 0.40."

> OK, the examples help -- it's a 0-to-1 thing, so it's like a score. I
> honestly don't know who made this column. If it's "how sure are we this
> person replied to that person", then bigger is... stronger? More real? I'd
> say Stronger tie. "Longer distance" -- no, a 0.99 confidence isn't far away,
> that's backwards. "An amount that flows" -- I don't know what that means. Like
> money? Retweets? Skip.

> Then these grey words on the right -- similarity, distance, capacity. That's
> the grown-up vocabulary, I assume. "Similarity" is a weird word for a reply.
> Two accounts that reply to each other aren't similar. But I'll ignore that
> column, the left words are the ones I read.

> "Not sure -- decide later." Honestly, that's the one I'd actually want to
> click, because I have never thought about this column. There's a little
> bubble open next to it: "Until it is set, paths and Betweenness leave
> confidence out. PageRank and community detection read a bigger number as a
> stronger tie."

> Hm. So if I'm running PageRank and I say "not sure", PageRank uses it as a
> stronger tie anyway? Then "not sure" and "stronger tie" do the same thing for
> me. So why ask? And that contradicts the line under the field that said
> "read as a distance." I think that line is about Betweenness, because that's
> what the panel is for. In my PageRank version I don't know what that line
> would say.

> And would I have seen that bubble if it weren't already open? It's a tiny
> "i". I don't hover on tiny "i"s.

**"How it is converted" and the last line.**

> "How it is converted." Nope. Not opening that. That's math.

> "Kept on confidence, so no run asks again." Kept... what's kept? The column
> is kept? I think it means my answer is saved on the column. So if I pick
> wrong now, nothing ever asks me again? That's a bit scary. If I pick "decide
> later" -- and it says nothing reminds me -- I'll never decide later. Nobody
> decides later.

**Choosing and running.**

> I'm going to pick Stronger tie, because 0.99 looks like "very real
> connection" and I want the strong connections to count more. Hit Run.

**Results panel.**

> Now results. The finished one I'm looking at is still Betweenness on this
> protein thing, and the line at the top says "Exact. Unweighted, undirected.
> WebGPU." Unweighted! So if mine said that I'd be furious, because I just
> told it about confidence. I'm told on a different frame a result reads
> "confidence as similarity" in that line and the weight box says "confidence
> as similarity." OK. So after I pick "stronger tie" it's going to call it
> "similarity" back at me. It's the same thing? I'd have to trust that.

> The distribution chart -- fine, whatever. Top nodes, it's cut off at the
> bottom of the panel -- MAPK1, 0.1379. That's the bit I actually want. Where's
> the table I can copy to the brief? I see "Export..." top right. I'd bet I get
> a picture again.

> There's a frame where confidence got changed later and it tells me Louvain
> and Shortest path are out of date with a "Re-run all" button. That's actually
> nice. Brandwatch would just silently give me different numbers. I like that
> it tells me which ones used the old meaning.

> But back to my task: did my PageRank use confidence or not? From what I've
> seen, I would only know by reading that grey line under the title, which
> says "similarity," which is not the word I picked. I'd want it to say
> "confidence: bigger = stronger tie" in the words I chose.

## After the task

**Single Ease Question:** 4 of 7.

> It wasn't hard to click through. It was hard to be sure I'd done the right
> thing. I picked an answer to a question I'd never thought about, and then
> the screen spoke back to me in different words.

**Would you use this instead of your current tool?**

> Not for this reason alone. Gephi never asks me what a weight means -- it just
> uses it, and honestly I've probably been getting it wrong for years, so
> asking is fair. I like that it asks once and then tells me later when stuff
> is out of date; that's the kind of thing I can defend to my VP. But I'd need
> the PageRank screen to tell me what PageRank does with the column in plain
> words, not a Betweenness sentence plus a bubble that contradicts it. And I
> still need the ranked table out as a CSV. If it did both I'd try it on the
> next mention export -- the public one. Customer data, I'd ask IT first,
> because "nothing is sent" is only on the assistant.

## Problems observed

1. **No PageRank form to reach.** The first frame opens Betweenness, which the
   participant did not ask for; clicking PageRank in the catalog goes nowhere.
   She had to imagine that PageRank asks the same question. (severity 2)
2. **The hint under Weight contradicts the info bubble.** "Read as a distance.
   Not used while its meaning is not set" sits under a field showing
   "confidence", and the bubble says PageRank reads a bigger number as a
   stronger tie while unset. She could not tell which applied to PageRank.
   (severity 3)
3. **"Not sure" and "Stronger tie" behave the same for PageRank, and nothing
   says so on the PageRank run.** The only place this is stated is a small
   info bubble that happens to be open in the mock; she would not have opened
   it. (severity 3)
4. **"Decide later" is final with no reminder.** "Kept on confidence, so no
   run asks again" was read as "your answer is saved forever"; she noted
   nobody ever decides later. (severity 2)
5. **Her words are not the words that come back.** She picked "Stronger tie";
   the result's state line and weight field say "confidence as similarity".
   "Similarity" does not fit a reply network in her head. (severity 2)
6. **"An amount that flows" meant nothing to her.** She skipped it without
   understanding it. (severity 1)
7. **She could not confirm from the results panel that her PageRank used the
   weight.** The finished frame shown is Betweenness saying "Unweighted".
   (severity 2)
8. **Top nodes is cut off and no table or CSV export is visible.** (severity 2)
9. **"Nothing is sent" is only about the assistant.** It does not answer
   whether her file leaves the laptop. (severity 1)

## What she liked

- The question gives real example values (0.99, 0.79, 0.40), which made the
  column understandable.
- Run is not blocked by the question.
- The out-of-date review names which results used the old meaning and offers
  one "Re-run all".
