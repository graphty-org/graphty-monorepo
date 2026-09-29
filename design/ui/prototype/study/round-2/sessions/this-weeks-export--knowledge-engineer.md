# Session: this week's export -- knowledge graph engineer

Participant: Dr. Min-ji Kim, knowledge graph engineer (simulated; persona in
study/personas/knowledge-engineer.md).

Task as given by the moderator: "This week's export arrived. Do what you did last week, and show
your manager what changed."

Screens used, in order: the load step (screens/load-step.html, the "Add data, same columns"
state), the results panel (screens/results-panel.html), version history
(screens/version-history.html), the comparison surface (screens/comparison.html, "Two data
versions").

Outcome: finished, with difficulty. Single Ease Question: 4 of 7.

## Before starting

Moderator: the project already open is last week's, the account-to-account transfers; this week's
file is transfers-2026-04.csv.

> "This is not my data. My weekly export is a SPARQL SELECT flattened to subject, predicate,
> object, and I would still like to know where that predicate column goes. But fine: a weekly
> snapshot of an edge list is a weekly snapshot of an edge list. Last week I loaded it and ran
> the components and a community detection to look for anything that merged when it should not
> have. This week I want the same runs on the new file, and a list of what changed that I can
> put in front of my manager without apologising for it."

## 1. Getting the new file in (load step)

> "I start from the project. I need 'load a new version of the same data'. I see the start screen
> in the first frame with Recent and Open... -- but I am already in a project, so where is the
> command? I do not see a menu for it on any of these screens. I will assume someone dropped the
> file on the canvas, because that is what the next frame shows."

(No screen in this set shows how to reach Add data or Replace data from an open project. The
moderator moved her to the "Add data from transfers-2026-04.csv" state.)

> "OK, 'Add data from transfers-2026-04.csv'. The left side is what I expect: format, each row is
> an edge, ends from_account to to_account, directed 'as the project is'. The roles are not
> asked again, good. amount says 'weight: unknown' -- honest, I did not say what it means. I will
> come back to that, because I have a feeling something downstream already used it."

> "Right side. There is a warning: 'Same columns as transfers-2026-03.csv, the data already
> loaded. Add data keeps March and puts April on top of it: 17,483 transfers, and the 39 accounts
> closed since March stay in.' Yes. Thank you. That is exactly the mistake I would have made on
> a Friday afternoon. Neo4j would have happily doubled my graph."

> "Let me check the counts before I believe any of it. Matched 2,961, new 132, not in April 39.
> 3,000 minus 39 is 2,961. 2,961 plus 132 is 3,093, which is what the warning says April alone
> is. After the merge 3,132 nodes, 17,483 edges; 9,113 plus 8,370 is 17,483. The numbers agree
> with each other. That buys you some trust."

> "'Not in April 39' is the first number I want. Those are the entities that disappeared. In my
> world that is either a legitimate deletion or a broken mapping, and I want to see the 39 ids.
> There is no link on the 39. I would click it and nothing would happen."

> "Now: the blue button is Add data. The thing I actually want, every week, is the grey button
> inside a warning: 'Replace data instead'. So my normal weekly job is presented as the
> exception. It works, the focus ring is even on it, but I would rather the weekly case were the
> main road and stacking two months were the warning."

She clicks Replace data instead.

> "Nothing happened. It is outlined and says it is not working in this mock. Fine, it is a mock.
> I assume the dialog turns into Replace. What I expect to see next: a note saying my old
> results are now about old data."

Moderator note: the render of this state in shots/ (screens__load-step.html#add-data.png, dated
09:19) is older than the page and has no warning row, no "Replace data instead" and no "not in
April 39". A participant shown that render would see only a blue Add data and would have stacked
the two months without being told. The session used the current page.

## 2. Did last week's runs follow the data? (results panel)

> "Last week I had components and communities. After a replace I expect the results list to tell
> me which runs are now stale and to re-run them, or ask me. The results panel frames are the
> protein network and the patent citations. There is an 'Out of date' state with 'Review out of
> date' and 'Re-run all', which is the kind of thing I want -- but it is about somebody changing
> what a weight means, not about new data. I cannot see what this panel looks like after Replace
> data. So I do not know from here whether my Louvain run is April's or March's."

> "The 'Needs action' heading with a count, pinned at the top, and one 'Re-run all': good. The
> sentence 'Louvain used confidence as a distance. It is now a similarity. Re-run to update.' is
> the right shape of sentence. I want the same sentence for 'this result was computed on March'."

> "Aside: 'Assistant: Off. Nothing is sent.' in the rail. That I read twice. Nothing leaves the
> machine -- that is the only way my data would ever be opened in a browser tool."

## 3. What changed, in the record (version history)

> "Version history of Transfers. Top entry: 'April data, current, Today 09:14. Replace data from
> transfers-2026-04.csv.' So the replace happened. Accounts 3,093, transfers 8,370, found by id
> 2,961 of 3,000, new in April 132, not in April 39, rows dropped 0. This is the change report.
> 'Rows dropped 0' stated explicitly, and not hidden -- good. This block is most of what my manager
> wants."

> "Results: 'Degree and Louvain communities replayed: 65 communities, was 35.' Stop. Thirty-nine
> accounts left, a hundred and thirty-two arrived, about four percent churn, and the number of
> communities nearly doubled? Either the network really fragmented, or the method is unstable on
> this graph. Those are very different sentences to say to a manager and the screen does not help
> me tell them apart. For PageRank the comparison screen says a re-run cannot tell change from
> noise. For Louvain I need exactly the opposite reassurance and there is none here."

> "'26 keep their March name and color by overlap; 39 are new, numbered 36 to 74.' So 35 minus 26
> is 9 March communities that are simply gone. It does not say that. The legend goes up to
> Community 74 but there are 65 communities; I had to work out that the gaps are the nine that
> vanished. Say the nine. They are the interesting ones -- that is where something split or
> merged."

> "Methods, one sentence per run: 'Louvain communities on the same graph: weighted by amount
> (larger is stronger), direction ignored, resolution 1, seed 11... graphty-element 2.0.0, on the
> CPU.' Seed, resolution, version. That is a methods sentence I could paste into a governance
> report. But: the load step said amount is 'weight: unknown', and this says 'larger is
> stronger'. Which one is true? If I declared it in a run form last week, fine, but then the load
> step should not say unknown. One unexplained mismatch and I start rechecking everything."

> "The canvas: a hairball with colours. I will not show that to anyone. Is position meaningful?
> Nothing tells me. Community 3 is a green and Community 5 is an orange-red; for me those two are
> close. I would go by the numbers in the legend, not the dots."

> "Restore version on March, with 'Adds a new version on top; April data stays in the history'.
> Non-destructive. Good. That is how my ontology repository works too."

> "Export log. What format? A text file I can attach? If that is a plain list of these entries, it
> is my change report. I would click it hoping for CSV or Markdown."

## 4. Showing the manager (comparison surface, two data versions)

> "PageRank, March and April. A is March, marked 'Earlier data', B is April. It says 2,961
> accounts in both months, 39 only in March, 132 only in April, and those are counted, not
> plotted. It names Kendall tau-b, 0.781, and labels Spearman as inflated by ties. Someone here
> knows statistics. Top 5 in both: 5 of 5 -- the same five accounts lead both months. That is a
> sentence for my manager: 'the centre did not move'."

> "Tied lowest in April: 1,027, 35 percent. 1,027 over 3,093 is 33 percent, not 35. Oh -- the line
> underneath says 'over the 2,961 accounts in both months'. 1,027 over 2,961 is 35. Fine, but put
> the denominator on the row, not a paragraph later."

> "The scatter is rank against rank with the diagonal as agreement, log axes, the tie block drawn
> as a band. That is honest. My manager will not read a rank scatter, though. What they read is
> the 'Moved' list: ACC-488401 from #1,575= to #88. That is a story."

> "How does this leave the tool? 'Save comparison' keeps it inside the project. 'Export table as
> CSV...' gives every account with both ranks -- I can build a table from that. There is no
> 'export this as a picture' on the comparison, and 'Export...' at the top right is not on any of
> these screens. So the manager gets a CSV and whatever I screenshot. For a stakeholder I want an
> SVG of the summary: counts, the top movers, the not-matched numbers. Not the hairball."

> "And the comparison is for rankings. What I actually ran last week was communities. There is no
> 'Louvain, March and April' comparison here that shows me which communities split or merged. The
> 35-to-65 question stays open."

## After the task

Single Ease Question: 4 of 7.

> "I got there, and the numbers I checked all agreed with each other, which almost never happens
> with a new tool. The load step warning that I was about to stack two months, with the 39
> missing accounts counted, is the best thing I saw. The version entry is a real change report
> with rows dropped stated as zero. The comparison names its statistic and says what it did with
> ties."

> "What cost me: I could not find how to start a replace from an open project; the weekly job is
> a secondary button inside a warning; I cannot see which of last week's results were re-run on
> April from the results panel; communities doubled and nothing tells me whether to believe it;
> nine communities vanished and nobody said so; amount is 'unknown' in one place and 'larger is
> stronger' in another; and I cannot hand my manager anything but a CSV and a screenshot."

Would she use this instead of her current tool:

> "Not instead of my current tool -- my current tool is SPARQL, a notebook and a spreadsheet, and
> this still does not read Turtle or take a predicate column in any screen I saw today. But for
> the weekly 'what changed' job specifically, the version entry and the two-version comparison
> are better than what I do now, which is diffing two CSVs in pandas and writing the paragraph by
> hand. If it read my export without flattening it, and if I could export that version entry and
> the comparison summary as something I can put on a slide, I would use it for this one job every
> week."
