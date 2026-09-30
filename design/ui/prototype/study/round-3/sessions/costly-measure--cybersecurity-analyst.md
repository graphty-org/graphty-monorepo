# Session: a measure that costs too much to run -- Priya, SOC threat hunter

Participant: Priya, senior threat hunter at a regional bank (persona:
`study/personas/cybersecurity-analyst.md`). Simulated session, played in character.

Task as given by the moderator, and nothing more: "Measure who bridges the groups across this
whole citation graph."

Screens, in the order she met them:

1. `screens/option-form-cost.html#over-budget` -- Betweenness refused, four ways to run it
   (render: `shots/record/option-form-cost-over-budget--dark.png`)
2. `screens/option-form-cost.html#within-budget` -- the sampled estimate running
   (`shots/record/option-form-cost-within-budget--dark.png`)
3. `screens/option-form-cost.html#sample-over-budget` -- finished on 101 sources, 500 typed in
   (`shots/record/option-form-cost-sample-over-budget--dark.png`)
4. `screens/results-panel.html#finished-sampled` -- the sampled result with its top nodes and
   run record (`shots/record/screens__results-panel-finished-sampled--dark--study.png`)
5. `screens/results-panel.html#in-the-table` -- the results table with "Export table as CSV..."
   (`shots/record/screens__results-panel-in-the-table--dark--study.png`; this state is drawn on the
   protein graph, so she saw the table's shape, not the citation rows)
6. `screens/past-drawing-limit.html` -- the not-drawn line and the rule builder, reached from
   "Narrow the graph..." (`shots/record/past-drawing-limit--not-drawn--dark.png`,
   `shots/record/past-drawing-limit--rule--dark.png`)

## Transcript

**Before starting.**

> "Not my data. Patents. Fine, a graph is a graph. First thing I look for: does it phone home.
> Left rail says 'Assistant. Off. Nothing is sent.' OK. That's the first tool that's told me that
> without me asking. It doesn't tell me it runs in my browser, though. 'Nothing is sent' is about
> the assistant, right? Or about everything? I'd want that on the whole app, not on the AI button.
> In a real trial I'd still need somebody to confirm that before I load anything of ours."

**"Who bridges the groups."**

> "Bridges -- that's betweenness. Choke points. Same thing I'd run on AD to find the account every
> path goes through. I'm not going to go looking for a 'bridge' measure. Catalog, Centrality,
> Betweenness. It already says 'hours' next to it. At least it's warning me before I click."

She clicks Betweenness in the catalog.

> "OK, it didn't start. Yellow bang: 'Takes hours. The time limit is 30 seconds.' Good. That's
> the opposite of BloodHound, where it just sits there for forty minutes and you don't know if
> it's dead. I'll take a refusal over a spinner any day."

> "Four options. 'Fits the time limit': sampled, 101 sources, under a minute. Exact on 5,318
> nodes, under a minute. 'Past the time limit': sampled 500, a few minutes. Exact, full graph,
> hours."

> "What are the 5,318 nodes? It doesn't say here. I have to hover? ... Over on the right there's
> 'Drug patents granted in 2001, 5,318.' I'm guessing that's it. But the task said the whole
> graph, so that's out anyway. Exact on a subset doesn't answer 'across the whole graph', and
> I'd want the screen to say 'on Drug patents granted in 2001', not '5,318 nodes' -- a count isn't
> a name."

> "Why 101 sources? Weird number. I guess that's what fits in 30 seconds. Fine. Can I raise the
> 30 seconds? No settings here. If I'm prepared to wait, let me wait -- but OK, there's the
> 'hours' route for that."

> "Direction: 'Directed, on the full graph.' Citations are directed, fine."

She takes the highlighted route, "Run sampled".

> "Running. Progress bar, 'under a minute', Cancel in two places. Good. It's still telling me
> 'within the time limit', so I believe it won't hang."

> "Sample size 101 of 124,318. Seed 7. Oh, there's a seed. That I like. If I run it again next
> month on the new export I can use the same seed and actually compare. That's the notebook
> habit -- I record my seed in pandas too."

> "'Readings, when it finishes: scores are estimated from 101 sources. The top of the ranking is
> usually stable; a single score can be well off.' OK, that's honest. That's the sentence I'd put
> in the case note."

> "And there's a pink 'proposed' tag on it. I don't know what that means. Proposed by who? Is the
> sentence true or not? [Moderator note: the tag marks a design proposal in the mock; she was not
> told.]"

**The finished estimate.** She types 500 in Sample size to see what happens.

> "'500 sources take a few minutes, past the 30-second time limit. Run starts it in the
> background.' OK, so it doesn't refuse this one, it just warns and runs it in the background.
> Consistent enough. And the 101 result stays until the new one's done -- good, it's not wiping my
> answer while it thinks."

> "But it says 'Edit held.' 'Edits wait for Re-run' earlier, now 'Edit waits for Run'. Pick one.
> I get it, it means nothing reran yet. Still."

She goes back to 101 and looks at the finished result.

> "Top nodes. 'rank, low-high.' Number one: 5879702, about 0.016. Number two, 5902311. Then
> three of them all '#3-#7'. OK... so it's telling me it can't tell 3 through 7 apart with this
> sample. I actually like that. Most tools would give me a clean 3, 4, 5 and I'd put that in a
> report and it'd be wrong. 'Ranks below #2 may swap between runs.' Right."

> "But who ARE these? A patent number. Which group is 5879702 bridging? The task said 'bridges
> the groups'. Betweenness tells me it's on a lot of shortest paths. It doesn't tell me it sits
> between drugs and computers or whatever the groups are. I'd want the category next to it, or
> the two groups it connects. Otherwise I've got a number and a score and I'm back to a pivot in
> Splunk to find out what it is."

> "Also, the table on the other screen had '6,117,075' with commas, and here it's '5879702'
> without. If I'm going to paste the ID into a search, those need to be the same string. Patent
> numbers don't have commas in any system I'd paste them into."

She opens Details on the state line. The run record appears.

> "Method: Brandes from 101 random sources, scaled up. Seed 7. Error bound plus or minus 0.00035,
> 95 runs out of 100. Great, that's a methods line. There's a Copy button. That goes straight into
> the case notes."

> "Wait. 'Direction: Citations read as undirected.' And normalization 'of an undirected graph'.
> The panel right next to it says 'Unweighted, directed.' The refusal said 'Directed.' Which is
> it? This is exactly the thing. If the record and the screen disagree, I can't use either. I'd
> stop here and rerun it before I trusted any number on this page."

**Getting it out.**

> "'124,313 more in the table.' OK, there's a table. On the protein one I can see 'Export table as
> CSV...' up top. Assuming the patents one has the same button, that's my exit. That's what I'd
> actually do: CSV out, sort by score, look at the top twenty with their categories next to them in
> my own spreadsheet. Which is a bit of an admission the tool didn't answer the 'groups' part."

> "Does the CSV say it's an estimate? Does it have the seed and the sample size in it? If it's just
> id and score, in two weeks somebody reads it as exact."

**The picture.** She notices "124,318 nodes not drawn. Narrow the graph..." and clicks it
out of curiosity.

> "It's not drawing 124,000 dots. Honestly, good. I don't want the hairball. There's a table
> instead, sorted by citations. That's the right default for me."

> "Narrow the graph gives me a rule builder. Category is Drugs and medical, citationsReceived at
> least 25. '612 nodes, 1,843 edges will draw.' Nice that it tells me the count before I commit.
> But it's dropdowns. Where do I type it? I'd write that in one line. And it's for drawing -- it
> doesn't help me with bridges. I'd skip it for this task."

**Done.**

> "So: I've got a sampled betweenness ranking, top two solid, three to seven fuzzy, a seed and a
> methods line I can copy. I did the task in about three clicks, which is fine. I'd call it done
> for 'who's most between'. I would not call it done for 'who bridges the groups', because nothing
> on the screen talks about groups."

## After the task

**Single Ease Question: 5 of 7.**

> "Running it was easy -- easier than anything I've used, because it refused instead of hanging
> and told me what each option costs. The five-not-seven is the end: I got IDs with no context,
> a direction that contradicts itself between the panel and the record, and the 'groups' part of
> the question isn't answered anywhere."

**Would she use this instead of her current tool?**

> "For this kind of question, on a big graph, maybe -- instead of BloodHound's shortest-path
> buttons, yes, because I'd know up front it won't eat an hour, and the seed and the error bound
> are better than what my notebook gives me without work. Instead of my notebook, no, not yet. My
> notebook shows every step, and I can join the scores back to the category in one line. Here I'd
> export the CSV and do that join myself anyway. Fix the undirected/directed thing, put a name
> column next to the patent number, and tell me which groups a node sits between, and I'd bring it
> to my lead. And before any of that, somebody has to tell me it runs locally for the whole app, not
> just 'Assistant off'."

## Problems observed

| Screen | What happened | Severity (1-4) |
|---|---|---|
| results-panel, finished sampled (run record) | The run record says "Citations read as undirected" and normalizes for an undirected graph while the state line and the refusal both say directed. She stopped trusting every number on the page. | 4 |
| results-panel, finished sampled (Top nodes) | Top nodes show only a bare patent number: no category, no groups it sits between, so the "bridges the groups" half of the task is not answered and she must export and join by hand. | 3 |
| option-form-cost, over the time limit | "Exact, on 5,318 nodes" names a count, not the set; she had to guess it was the "Drug patents granted in 2001" set in the right panel. | 2 |
| results-panel, finished sampled vs past-drawing-limit table | Patent ids are "5879702" in Top nodes and "6,117,075" in the table; different strings for the same kind of id, and the comma form is not pasteable into a search. | 2 |
| option-form-cost, catalog | Nothing in the catalog maps "bridges between groups" to a measure; she chose Betweenness only from habit, and would not know whether another measure (for groups) fits better. | 2 |
| left rail | "Assistant. Off. Nothing is sent." reads as scoped to the assistant; nothing states that the whole app runs in the browser and makes no calls. | 2 |
| option-form-cost, running and finished | Held-edit wording changes between "Edits wait for Re-run", "Edit waits for Run" and "Options wait for Run". | 1 |
| option-form-cost, running | The "proposed" tag on the estimate caveat reads to a participant as "this sentence may not be true". | 1 |
| results-panel, table export | No sign that the CSV carries "estimated", the sample size and the seed; she expects the export to lose that it is an estimate. | 2 |
| past-drawing-limit, rule builder | Narrowing is dropdowns only; she wants to type the rule. (Not needed for this task.) | 1 |

## What worked for her

- Clicking an hours-long measure refused before it started and listed the ways forward with their
  costs: "I'll take a refusal over a spinner any day."
- The seed on a sampled run, so next month's run is comparable.
- "#3-#7" ranks and "Ranks below #2 may swap between runs": honesty about the estimate.
- The run record's error bound and Copy button: a methods line for the case note.
- Not drawing 124,318 dots and defaulting to a table.
