# Session: do two ways of scoring agree on who matters -- Sarah, level-2 fraud investigator

Participant: Sarah (persona: study/personas/fraud-analyst.md), eight years in financial crime,
works only escalated cases. Mode: not mandated -- her own time, and a question she says she would
not normally ask in those words. She got the answer from the first line of the comparison, then
spent most of the session deciding whether she could defend it.

Task as given by the moderator: "Do these two ways of scoring agree on who matters?"

Screens seen, in order (1440 x 900 renders): the Results place with a finished run opened (its
"Runs of this measure" block and "Compare with..." link); the Results place with a run row's
compare button pressed and its menu open ("Earlier runs of PageRank", "Other runs on this
graph", "The same run on another data version..."); the comparison surface for PageRank against
betweenness on the April payments data (scatter in the bottom dock, Agreement beside it, the
Comparison column on the right with Differences); the Differences list switched to "PageRank";
the "About Spearman" popover; a run record; the Export dialog opened from the comparison; the
table dock with three ranking columns side by side.

## Think-aloud

**Results place, a run opened.**
"OK, Results on the left, it's the list of what's been run. I open one -- Betweenness, Sep 28.
Top nodes, a histogram I'm going to ignore, Options, then 'Runs of this measure: 1', and under it
'Compare with...'. Fine. That's the word I'd look for. If I'm asking do two scores agree, I'm
comparing, so I click that."

"Before I click: 'Exact. Undirected. Weight: confidence, not used yet.' So it didn't use the
weight. On my data the weight is the dollar amount. Parking that."

**Results place, the compare menu on a run row.**
"The moderator says there's also a way from the list itself. I don't see a button on the rows.
... Oh, when you point at the row there's a little icon on the right, two arrows. I would never
have found that. I use the keyboard half the day -- is there a key for it? Nothing on screen says
so. I'd have gone through the opened run, which worked, so no harm, but that icon is invisible to
me."

"The menu: 'Earlier runs of PageRank -- PageRank, damping 0.85'. 'Other runs on this graph --
Betweenness (sampled), 101 sources'. 'The same run on another data version...'. The two ways of
scoring would be PageRank and betweenness, so the second group. OK, I'd pick Betweenness. Wait --
this is 'Patent citations', a hundred and twenty-four thousand nodes, and 'sampled'. That's not my
payments case. I'll assume that's just the picture they had. And 'sampled' -- if it sampled, is
it the same answer every time? It doesn't say here. Moving on."

"Also, the menu on the opened run in the next screen looks different: it has a search box and
lists Degree, and Betweenness says 'Not run'. This one on the row only lists things already run.
So which one do I trust to show me everything? Two menus with the same name doing two different
lists."

**Comparison surface: PageRank and betweenness, April transfers.**
"Right, now it's my kind of data. Payments network review, 3,093 accounts. Big scatter at the
bottom, I'm going to skip the scatter. Agreement: '0 of the top 50 in both. The rankings disagree
at the top.' Good. That's the answer, in words, first. No, they don't agree. The top fifty by
one score and the top fifty by the other share nobody."

"'At the other lengths: 0 of 5, 0 of 10, 0 of 20, 18 of 100.' So you have to go to a hundred
before you get any overlap. Clear enough."

"'Spearman 0.40, leaving out the 1,153 accounts tied at the bottom of both (0.78 with them).'
... I don't know what Spearman is. I know CORREL in Excel. Two numbers, one of them in brackets,
which one is the real one? If I put 0.78 in a narrative my QA reviewer will ask what it means and
I won't be able to tell her. I'd leave it out. The sentence above it is what I'd use."

"Little i next to it. [About Spearman popover] 'How alike the two orders are: 1 is the same
order, 0 unrelated, -1 reversed.' OK, that part I get. 'Ties take the average of their ranks' --
no idea why I care. 'The accounts tied at the bottom of both measures agree only because both
give them the least, which pulls the number toward 1.' ... So the 0.78 is inflated by the dead
accounts. Fine, then the 0.40 is the honest one. It took me reading a popover twice to get that."

"Scatter, since I'm here. Rank on PageRank along the top, rank on betweenness down the side. A
shaded corner 'top 50' with nothing in it except that one circled account. Bottom says '1,314
accounts tied at 0' -- 0 what? Zero betweenness, I suppose, but it says 'at 0' like I know which
axis. Right side '1,153 accounts tied at the lowest PageRank'. Then under the legend 'Not
plotted: the 1,153 tied at the bottom of both... All 3,093 accounts are on both sides.' So which
ones aren't on the chart? I read that three times. I'd not put this chart in a case file; I'd not
be able to explain it."

**The Comparison column: Differences, ranked higher by betweenness.**
"This is the bit I actually want. 'Ranked higher by: Betweenness'. ACC-139419, number 76 on
PageRank, number 1 on betweenness. Then ACC-701495, #316 and #2. ACC-951032, #276 and #3. So
these are accounts money goes *through* a lot but that don't collect much. That's a pass-through
account. That's a mule profile. That's who matters to me."

"Hang on -- ACC-233575 is sixth on betweenness, #89 on PageRank. That's the account from the
path question earlier. OK. That makes me trust the list a bit more, it's consistent with what I
already saw."

"Selected row gives both values: 'PageRank 4.24e-4, #76 of 3,093', 'Betweenness 1.15e-4, #1 of
3,093'. Nobody at my bank reads 4.24e-4. I only look at the rank. The rank is fine."

"'Create set' and 'Add note...' right there. Yes. I'd make a set of the top ten pass-through
accounts and note why. That's my next hour of statement pulls."

**Differences switched to PageRank.**
"The other way round: ACC-393859 is #1 on PageRank, betweenness '#1,780='. What's the equals
sign? ... Everybody with zero is tied, and they all get 1,780. OK. So the top PageRank accounts
have no money passing through at all. In the export preview they're 'merchant'. Makes sense --
money ends there. That's the benign side; a merchant collecting card money is not my case."

**The two sides named in the column, and Details.**
"'PageRank -- Unweighted, directed. Details'. 'Betweenness -- Exact. Unweighted, directed.'
There it is again. Unweighted. So a five-dollar transfer counts the same as a fifty-thousand
wire. For who matters *in money*, that's not the question I'd ask. The screen is honest about it,
I'll give it that, but it doesn't tell me what it does to the answer or offer me the version with
amounts. If the amounts were in, would it still disagree? I can't tell from here."

"[Run record] 'Method: PageRank, directed: rank flows along each transfer.' Rank flows? I'd have
to translate every line of this for a reviewer. 'Seed: Does not apply: the same result every
run.' Good, that's written out. 'Copy'. Useful for the methods paragraph, if we had one."

**Export from the comparison.**
"Export table: the CSV with both scores and both ranks, one row per account, and a methods text
file beside it that says what data, what settings, what version, and what the tied-rank thing
means. That's the part I'd use. That goes in the case file. My reviewer can open the CSV in Excel
and sort it herself. The methods file answers the 'how did you get this number' question before
she asks it."

**Save comparison / Done.**
"Save comparison or Done. Done leaves without keeping. Fine, clear. I'd save it, because in three
weeks someone will ask."

**Table dock with the ranks side by side.**
"And this one is just the table: degree, rank, betweenness, rank, PageRank, rank, next to each
other. Honestly, this is what I'd do in Excel -- two rank columns and eyeball them. And 'Compare
rankings...' up top. If that goes to the same comparison, fine, two doors to one room."

## Answer she gave

"No. They don't agree on who matters. Not one account is in the top fifty of both. The accounts
at the top of betweenness -- 139419, 701495, 951032, and 233575 which I already had -- sit around
#70 to #300 on PageRank. They're the ones money passes through. The top of PageRank are merchants
that just collect money and pass nothing on. For my case the betweenness list is the one I'd work
from. With the caveat that neither score used the amounts, so I'd check the top ten against
the statements before I believed any of it."

## Single Ease Question

**5 of 7.**

"Getting the answer was easy -- one sentence, first thing on the screen. What cost me was
everything under it: Spearman with two numbers, a chart whose tie labels I had to read three
times, e-notation, and 'unweighted' with no idea what that does to the ranking. And I'd have
missed the button on the row entirely; I got there through the opened run. If you're asking
whether I could do it: yes. Whether I could defend it to QA from what's on screen: only the
first line and the Differences list."

## Would she use this instead of her current tool?

"For this question, there's no current tool. I can't compute betweenness in Excel, and in i2 I'd
get the scores per entity on a chart and then export them to Excel and line them up by hand. So
this beats that: the Differences list with both ranks, Create set, and the export with the
methods file. That's real time saved on a big case."

"But I wouldn't ask this question in these words. I'd ask 'which accounts is money moving
through that don't keep it', and I'd want amounts counted. This gets me there by the side door.
And it's not approved; my manager and IT decide, not me. What I'd tell them: the export and the
methods file are the parts that make it usable in a bank. The Spearman number and the scatter
I'd never put in front of a reviewer."

## Problems observed

1. **The compare button on a run row is an unlabelled icon that shows only on hover.** Results
   place, run row. "When you point at the row there's a little icon on the right... I would never
   have found that." She reached the comparison through the opened run's labelled "Compare
   with..." instead. Nothing on screen names a keyboard way in. Severity 2.
2. **Two menus called "Compare with..." list different things.** The row menu lists only runs
   already made (earlier runs of the measure, other runs, another data version); the one on the
   opened result has a search box and lists measures not yet run ("Betweenness -- Not run").
   "Which one do I trust to show me everything?" Severity 2.
3. **Spearman and its two numbers.** "Which one is the real one? ... I'd leave it out." The
   popover explains it, but in rank-statistics language ("Ties take the average of their
   ranks"); she understood why 0.78 is inflated only on a second reading. Severity 2.
4. **Tie labels on the scatter do not say which measure or which accounts.** "1,314 accounts
   tied at 0 -- 0 what?"; "Not plotted: the 1,153 tied at the bottom of both... All 3,093
   accounts are on both sides" read as a contradiction; "#1,780=" needed working out. "I'd not be
   able to explain it." Severity 2.
5. **"Unweighted" is stated but its effect is not.** Both sides say "Unweighted", and on payments
   data that means a $5 transfer counts as much as a $50,000 wire. Nothing says what that does to
   who ranks where, or offers the comparison with amounts counted. "If the amounts were in, would
   it still disagree? I can't tell from here." Severity 3.
6. **Scientific notation for scores.** "PageRank 4.24e-4... Nobody at my bank reads 4.24e-4. I
   only look at the rank." Severity 1.
7. **The measures are never said in her terms.** The run record's "rank flows along each
   transfer" and the bare names PageRank and betweenness; she had to work out herself that high
   betweenness with low PageRank means a pass-through account. "I'd have to translate every line
   of this for a reviewer." Severity 2.
8. **The row menu screen shows a different project and a sampled run.** "Patent citations",
   "Betweenness (sampled)" -- not the payments case the comparison then shows, and "sampled"
   raised a question (same answer every time?) the menu does not answer. Severity 1.

## What worked

- "0 of the top 50 in both. The rankings disagree at the top." -- the answer, first, in words.
- "At the other lengths: 0 of 5, 0 of 10, 0 of 20, 18 of 100" -- how far down before any overlap.
- Differences, "Ranked higher by: Betweenness", both ranks per account -- the list she would work
  from; it surfaced an account she already had from the path question.
- "Create set" and "Add note..." on the selected account in the Differences list.
- Export from the comparison: one CSV with both scores and both ranks, plus a methods file with
  data, settings, version and what a tied rank means. "That goes in the case file."
- Run record with "Seed: Does not apply: the same result every run" written out, and Copy.
- "Save comparison" / "Done" -- plain about what is kept.
- "Unweighted" shown on each side, so she caught the missing amounts herself.
