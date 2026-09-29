# Session: rank the same characters twice and say what differs -- Explorer Elena

Participant: Elena, a product manager with no graph training. She uses Sheets, Slides and her
company's analytics dashboard. She has never said "betweenness" out loud and does not know what a
"degree" is. Curious-afternoon clock: no deadline, three or four dead ends before she drifts.

Task as given by the moderator: "Yesterday you ranked the Les Miserables characters one way. A
colleague asks you to rank them again with one thing changed, and to tell her what differs between
the two rankings and how each was made."

Screens seen, in order, as a participant sees them (design notes hidden). All rendered fresh for
this session at 1440 x 900:

- `screens/navigation.html` -- the Les Miserables project: the Results list, a run opened
  ("Betweenness, today 14:02"), the node table sorted by it
- `screens/results-panel.html` -- mostly other graphs (patent citations, protein interactions); the
  frames she used were a PageRank run with its options pop-up ("Options wait for Re-run", damping
  0.7), the Results list with the compare button open ("Earlier runs of PageRank"), and a Les
  Miserables betweenness run on "Filtered: 60 of 77 nodes" with its run record open
- `screens/comparison.html` -- two comparison screens, both on a payments network: PageRank against
  betweenness, and PageRank on March data against April data
- `screens/table-dock.html` -- the Les Miserables table with degree and betweenness side by side,
  and a filtered table where the betweenness column says "Out of date, Re-run"

Scratch renders: `tmp/elena-two-runs/`.

---

## 1. Finding yesterday's ranking

> OK, Les Miserables. The dots again. Valjean's the big yellow one in the middle, he's obviously
> the main guy.
>
> Yesterday's ranking... I don't remember what I clicked yesterday. Left side has Graph, Data,
> Results, Notes. "Results" sounds like where a ranking would be.
>
> Results. "Every run of a measure, with its settings and date." Newest first. "Betweenness, today,
> 14:02. Exact, normalized, no weight. Full graph, 77 nodes." And "Bridges, 27 Sep".
>
> Hm, it says today, and the moderator said yesterday. Whatever -- this is the only ranking-looking
> one. Bridges doesn't sound like a ranking.
>
> Click it. OK. "Ran on the full graph, 77 nodes. No weight: every edge counts the same." Oh that's
> nice actually, it says it in a sentence. Then a little table -- method, exact every node;
> normalized, yes; edges, undirected; weight, none; ran, 29 Sep. I don't know what half those mean,
> but it's written down, which is what she asked for. "How each was made." Good, that's the first
> one.
>
> Top nodes: Valjean 0.57, Myriel 0.177, Gavroche 0.165. And the table at the bottom flipped to
> "Sorted by betweenness." OK so that's the ranking. Valjean, Myriel, Gavroche, Marius, Fantine,
> Thenardier.

## 2. Picking the "one thing" to change

> Now "one thing changed". Changed how? She didn't say. What would make sense...
>
> Two buttons under the settings: "Re-run" and "Compare with...". Re-run. Does that redo it and
> throw away the one I have? I don't want to lose yesterday's -- that's the thing I'm comparing
> against. I'm not pressing it yet.
>
> (She looks around the other screens.) Here's one on some patent thing where the button says
> "Re-run (keeps Run 1)". OK -- THAT I'd press. "Keeps Run 1." Why doesn't mine say that? Mine just
> says "Re-run". Maybe mine is an older screen. I'll assume it keeps it... I'm maybe 70 percent sure.
>
> And there's a little sliders icon next to "Options", and it opens "PageRank options" with a
> box that says "Options wait for Re-run". So you change a number and then press Re-run. OK, that
> makes sense. Like editing a filter and pressing Apply.
>
> On my Les Miserables one there's no Options row, just the "Settings" list. So where do I change
> anything? (Clicks around the settings list, nothing happens on the mock.) Hm.
>
> Oh, here's another Les Miserables one. "Betweenness, on 60 of 77 nodes." And the chip at the top
> says "Filtered: 60 of 77 nodes, 1 step". So somebody filtered out some characters and ran it
> again. That's a "one thing changed" I'd actually explain to a colleague -- "I dropped the
> characters who barely show up". The run record says "Filter to degree >= 2". I don't know what
> degree is. Probably the ones who are only in one scene? I'll say that.
>
> There's also "Weight: value, not used yet. Change..." Value of what? I'm not touching that. I
> don't know what "value" is in a book.

**Facilitator note:** she chose the filter as her "one thing" because a screen showed it done, not
because she found how to set it. She did not see how the filter was made on these screens and
guessed at what "degree >= 2" removes.

## 3. Reading the two rankings side by side -- by eye

> So: yesterday, full graph. Valjean 0.57, Myriel 0.177, Gavroche 0.165.
> New one, 60 characters: Valjean 0.419, Gavroche 0.172, Marius 0.164, Fantine 0.154, Javert 0.073.
>
> OK so what's different. Valjean went from 0.57 to 0.419, so he got less important when you take
> out the minor characters. Makes sense, he had all those little people around him. Myriel's gone
> from the top -- he was number two and now he's not even in the top five. Marius and Fantine went
> up.
>
> (Pause.) Actually is 0.419 less than 0.57 in a way that means anything? The number is different
> but he's still number one in both. I'd tell her "Valjean dropped a bit". Is that right? I don't
> know what the number is out of.

**Observer:** her "Valjean dropped" reading is wrong in the way that matters. Each score is scaled
to its own graph (the run record says "divided by ... n = 60, the filtered graph"), so 0.57 and
0.419 are not on the same scale; the one comparable fact is that he is first in both. She did not
read the Normalization line. Nothing on the screen she looked at warns that the two numbers cannot
be subtracted.

## 4. Looking for a proper side-by-side

> I'd rather not do this by eye. "Compare with..." -- that's the word. Press it.
>
> (On the patent screen, the compare button's menu.) "Earlier runs of PageRank" -- one of them
> highlighted. "Other runs on this graph." "The same run on another data version." OK so for mine
> it would say "Earlier runs of Betweenness" and I'd pick yesterday's. Good, that's easy. That's
> the first thing in the list, which is what I'd want.
>
> Where's the icon though? On the patent list there's a little two-arrows icon on the row with a
> blue box around it. I wouldn't have found that little icon on my own. The big "Compare with..."
> button inside the run I'd find.
>
> Then what does it look like... (comparison screen) Whoa. OK. This is not Les Miserables, this is
> some payments thing with three thousand accounts. Fine, pretend.
>
> "PageRank and betweenness." Hm, that's two different things, not the same thing twice. The other
> one: "PageRank, March and April." That's closer -- same thing, one thing changed, which is the
> month. Let me read that one.
>
> "Agreement. 49 of the top 50 in both months. The rankings mostly agree at the top." OK! That's a
> sentence I can paste. That's exactly the kind of sentence. And the Top 5 / 10 / 20 / 50 / 100
> buttons -- "5 of 5, 10 of 10, 19 of 20". Oh nice, so if I only care about the top five I click 5.
> For my characters I'd click 5 or 10.
>
> "Spearman 0.76, leaving out the 900 accounts tied at the bottom..." Nope. Skip. There's an (i). I
> won't open it.
>
> The scatter. Dots along a diagonal line. "Same rank in both months. Above the line, climbed in
> April; below it, fell." OK, so dots near the line didn't change. That I get. The grey bands I
> don't get, I'm ignoring them.
>
> Right side: "Differences. Moved / March only / April only." A list with "moved 1,487" and little
> up arrows. That's the "what differs" list. For mine it'd be... Myriel, fell from #2 to
> something. That's the thing I'd tell her.
>
> And at the top of the right side, each side has its own little description. "PageRank on March
> data. Earlier data: March, 3,000 accounts. Unweighted, directed. Details." And the other side the
> same. So that's "how each was made", right there, one line each. Plus Details if she wants the
> nerdy version.

## 5. Would my own case look like this?

> What I'm not sure about: for mine, both sides are "Betweenness". What's it going to call them?
> "Betweenness" and "Betweenness"? Here the sides are called "March" and "April" because the data
> changed. Mine, the thing that changed is the filter. Would it say "Full graph" and "60 of 77"? I
> hope so. If both columns are just called Betweenness I'll have no idea which is which.
>
> And the other thing -- the 60 one is missing 17 characters. In the March/April one there's a
> "Not matched: in March only 39, new in April 132." So I guess mine would say "17 only in the
> first one." That's good actually. That's the answer to "where did Myriel's friends go". I think.
>
> (Moderator: "What would you send her?")
>
> Something like: "Re-ran the character ranking without the ones who only appear once. Valjean's
> still #1. 4 of the top 5 are the same; Myriel drops out because most of his connections were
> minor characters. First one: full book, 77 characters. Second: 60 characters, filtered." And I'd
> screenshot the scatter. I'd have to write the "how each was made" part myself from the two little
> lines, it doesn't give me one thing to copy that has both.
>
> (Notices "Save comparison" top right.) Oh, and I can save it. OK. Saved where? Probably Results.
> Fine.

**Observer:** "4 of the top 5 are the same" is her own count from reading the two lists by eye,
made before she saw the comparison; the real overlap in the two lists she read is Valjean,
Gavroche, Marius, Fantine against Valjean, Myriel, Gavroche, Marius, Fantine -- four of five, so
her count happens to be right. Her explanation for why Myriel drops out ("his connections were
minor characters") is a guess she states as fact.

## 6. The table, briefly

> (table-dock) Oh this is useful. Degree and betweenness in columns next to each other with "rank
> of 77". And a sentence above: "Valjean is #1 on both measures. At #2 they part: Gavroche by
> degree, Myriel by betweenness. Compare rankings..." -- that sentence is exactly what I want, just
> for my two runs instead.
>
> Could I put yesterday's betweenness and today's betweenness as two columns like this? I don't
> see how. Here's one where the column says "Out of date, Re-run" after filtering -- so if I filter
> and hit Re-run on the column, does yesterday's column get replaced? That scares me a bit.
>
> I'd use the comparison thing instead.

---

## Single Ease Question

**4 of 7.**

"Finding yesterday's ranking was easy, and the comparison screen is really good once you're on it
-- '49 of the top 50' is a sentence I can use. What was hard was the middle: I didn't know how to
change one thing on my run, I wasn't sure Re-run wouldn't wipe out yesterday's, and I never saw
what the comparison would call two runs that are both betweenness. And I'd have said Valjean
dropped, which apparently isn't right."

## Would she use this instead of her current tool?

"For comparing two rankings, maybe. What I'd do today is paste two columns into Sheets and eyeball
them, and that's what I did here at first. The top-50 sentence and the moved list are better than
my eyeballing. But I'd only trust it if the two sides said in plain words what's different --
'all 77 characters' versus 'without the minor ones' -- and if I knew pressing Re-run kept the old
one. The number going from 0.57 to 0.419 I'd have put on a slide, and that would've been wrong."

## What the observer noticed (not said by her)

- She found yesterday's run in Results on the first try; the one-sentence summary ("Ran on the
  full graph, 77 nodes. No weight: every edge counts the same.") is what she read as "how it was
  made", not the settings list.
- The Les Miserables run she opened offers "Re-run" with no "(keeps Run 1)" and no Options control;
  the patent-citation run on another screen has both. She saw the difference, took the patent
  wording as the reassurance, and was still only "70 percent" sure her own Re-run would keep
  yesterday's ranking. Fear of losing the first run is what stopped her pressing it.
- She never found where the "one thing" is set for her run. She chose the filter because a screen
  showed a filtered run already made; she did not see how the filter was applied and guessed what
  "degree >= 2" removes.
- "Weight: value, not used yet. Change..." was avoided: "value" meant nothing to her.
- Wrong reading: she compared the two raw scores (0.57 against 0.419) and concluded Valjean "got
  less important", though each score is scaled to its own graph. The Normalization line in the run
  record says so in formula form; she did not read it. No screen she saw warns that raw scores
  from runs on different graphs cannot be compared.
- The compare entry on a Results row is an icon only; she said she would not have found it
  without its focus ring. She would use the labelled "Compare with..." button inside the run.
- Neither comparison screen she could see shows two runs of the same measure on the same data
  with one setting changed. Both show a payments network, not Les Miserables. She had to imagine
  her case, and the question she could not answer was what the two sides and the difference list
  would be called when both are "Betweenness".
- "49 of the top 50 in both months. The rankings mostly agree at the top." and the Top 5 / 10 / 20
  / 50 / 100 switch were the parts she would copy. She skipped Spearman, the (i), and the grey tie
  bands.
- She read each side's one-line description on the comparison as "how each was made", which is
  what the task asks for, but noted there is no single thing to copy that holds both.
- On the table, the degree-against-betweenness sentence ("Valjean is #1 on both measures. At #2
  they part...") was what she wanted for her two runs; she could not see how to put two runs of
  the same measure in two columns, and "Out of date, Re-run" on a column made her worry it would
  replace the old one.
- Engagement stayed up throughout; the comparison screen revived it after the dip in section 2.
