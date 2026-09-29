# Session: a graph too big to draw -- Priya, threat hunter

**Participant.** Priya, senior threat hunter at a regional bank (persona:
`study/personas/cybersecurity-analyst.md`). Plays the session in dark mode, at about half a monitor.

**Task as given by the moderator.** "Here is last period's citation data. Find anything worth a
closer look."

**Screens, in order.** The frame past the drawing limit (patent citations, 124,318 patents,
1,480,221 citations), then Find, then the filter chip and its steps. Seen as the participant sees
them, design notes hidden.

**Outcome.** Finished, with difficulty. She came out with three things she would look at next:
the three patents that the whole sample hangs off, a patent whose citation count in the table does
not match what the sample itself can show, and 2,406 isolated patents that the table says were
cited up to 46 times. She got there by reading counts and the table, not the drawing.

---

## Transcript (think-aloud, lightly trimmed)

**Before starting.**

> "OK. Citation data. Not my world -- patents, right? Fine, I'll treat it like a lab dataset. First
> question is the usual one. Is this approved, where does it run, does it phone home?"

She scans the left rail and stops on the small grey text under "Assistant".

> "'Assistant. Off. Nothing is sent.' Good, that's the first tool that's told me that without me
> asking. But that's the assistant. Does the *app* send anything? Is this a website or is it local?
> I can't tell from here. In a real trial I'd have stopped here and asked. Moving on because it's a
> study."

**Screen 1 -- the file is open, nothing drawn.**

> "'124,318 nodes not drawn. More than this browser draws at once, 50,000. Every node is counted in
> Statistics and listed in the table.' OK. Honestly? That's the best thing a graph tool has ever
> said to me. No spinner, no white screen, it just tells me it won't and why. BloodHound would
> have tried and died."

> "And it didn't drop anything -- 124,318 in the chip, 124,318 in Statistics, 124,318 in the table
> line. Counts line up. Good."

She goes to the right panel and scans numbers top to bottom.

> "Nodes, edges, density, average total degree 23.8. Isolates 2,406. Weak components 3,912, one of
> them is 94%. So there's one big blob and a long tail of little ones. That's the baseline."

> "Now -- 'last period'. Which period? There's no time range anywhere up top. In Splunk every
> search has a time picker. Where's the time range?"

She hunts for about 20 seconds, then finds the small grey text under the grantYear header.

> "'1999 to 2001.' That's three years, that's not one period. So either the moderator's wrong or
> the file is. I'd want the time range sitting next to the counts, not buried in a column header
> in small grey type."

She reads down the table.

> "Sorted by citationsReceived, highest first. 779, 702, 655. Fine, that's my 'sort by count, work
> from the top' view. I don't need a picture for this, this is a table. I like that the table is
> the main thing here and not a sidebar."

**Isolates.** She clicks the "2,406" link in Statistics.

> "It selected them and the table switched to just those -- 'Selected: 2,406 nodes, the isolates.'
> Good, the count *is* the pivot. I'd want that everywhere."

She reads the first rows and frowns.

> "Wait. 5997071, citationsReceived 46. And the panel says in-degree 0. That's a contradiction.
> Something cited 46 times with nobody citing it?"

She reads the grey paragraph under the stats.

> "'...Their citationsReceived counts citations from patents outside it.' OK. So citationsReceived
> is a field from the source, not something computed from this graph. That's the 'if my fields
> don't line up your graph is fiction' problem. At least it says so. But I only saw it because I
> clicked isolates. On the main table that column looks like 'in-degree' and it isn't."

> "Actually -- that's a finding. 2,406 patents that are cited a lot from outside and not at all
> inside. Either the sample was cut badly or those are the interesting ones. Worth a closer look.
> Note one."

**The degree chart.** She glances at the small log-log chart.

> "'max 236'. But the table's top row is 779. So which is it? ... Right, same thing: 236 is how many
> times it's cited *inside* the sample, 779 is the field. The chart and the column are counting
> two different things with nearly the same name. I'd put that in the case notes as a data caveat,
> and I'd be annoyed about it."

> "Note two: the top patent, 6117075, 779 in the field, max 236 inside. So two thirds of its
> citations aren't in this data. If I drew it I'd be looking at a third of the story."

**Narrow the graph.** She clicks the blue "Narrow the graph..." button.

> "'Filter steps. No filter steps. Every number reads the full graph.' Suggested: 'Top 3 by
> citationsReceived, with neighbors, 586. Follows the table's sort; favors hubs.' Huh. It tells me
> the bias up front. That's honest. Most tools just hand you a hairball and let you think it's
> representative."

She skips the suggestion and goes for "Add step".

> "Where do I type the query? ... It's dropdowns. Keep Nodes, Where category is Drugs and medical,
> AND citationsReceived >= 25. Fine. That's `category="Drugs and medical" AND citationsReceived>=25`
> in SPL, I could've typed that in two seconds. Can I see it as text? Can I paste one in? I don't
> see a box."

She reads the bottom of the editor.

> "'612 nodes, 1,843 edges, will draw.' Before I commit. OK, that I like -- I know what I'm getting
> before I pay for it. That's what I wanted from BloodHound's shortest path: tell me the size
> first."

She tries the other variants shown.

> "citationsReceived >= 5: '58,316 nodes, will not draw, add a condition.' Clear. And >= 800 on
> Drugs: 'No nodes match. The highest citationsReceived in Drugs and medical is 779.' Oh, that's
> nice. It tells me the ceiling instead of just zero. That saves me a round trip."

**Drawn.** She commits the 612.

> "OK. 'Filtered to 612 of 124,318 nodes, Undo.' The chip up top says '612 of 124K nodes, 1 step.'
> Good, I always know I'm looking at a slice."

She looks at the drawing for maybe five seconds.

> "It's a hairball with some labels on top of each other, and a grid of little pieces on the right.
> I don't care where the dots are. The table's still there and still sorted, that's what I'm
> reading. The drawing tells me there's one big clump and 44 little ones, which Statistics already
> said."

> "'Engine: WebGPU.' Our Edge might have GPU acceleration switched off by policy, I'd never know.
> Oh -- the other one says 'Engine: CPU; WebGPU not available.' Good. So it tells me when it's on
> the slow path instead of just being slow. That's the right way round."

**The suggested route.** She goes back and tries the top-3 step anyway.

> "Three big fans. 6117075, 6031111, 5960121, and a handful of patents in between that cite two
> of them -- 6018952, 5907468, 6112268. Those in-between ones are the only thing on this picture
> I couldn't have got from the table. That's the pivot. Note three: the bridges between the top
> three."

> "And it put 'reads high' next to density and a line that says 'describes the 3 most cited patents
> and all their neighbors, not a random sample.' Good. I'd paste that caveat into the case as is."

**Find.** She presses Ctrl+F, then "/".

> "I want to check it against ground truth. I don't have ground truth for patents, so I'll paste
> the top three ids like an IOC list."

She pastes "6117075 6231106 6287586".

> "'3 results in all 124,318 nodes.' Pasted a list and it found all three. That's the IOC workflow,
> I'd use that. And on the right: 'Not drawn: the graph is past the drawing limit. Counted
> everywhere.' So it found it even though it can't show it. Good, it didn't pretend."

> "The little bar says '124,318 nodes not drawn. Narrow the graph...'. Can I narrow to *these
> three* from here? There's a funnel icon next to the name on the right. I'd guess that's 'filter
> to this'. I'd click it. I'm guessing."

The other Find states she was shown were on different data (a novel's characters, bank
transfers).

> "Why is this Les Miserables now? That threw me. I had to re-orient. If the tool jumped datasets on
> me like that I'd think it had lost my file."

**Filter steps.** On the filter chip page she reads the step list.

> "'Filter to degree >= 2, took out 17, 60 left. Filter to degree >= 5, took out 20, 40 left.
> Filter out group 8, took out 13, 27 left.' Oh, OK. That's a search pipeline. Each pipe, how many
> it dropped, how many are left. That's how I think. I can tick one off and see what it was
> hiding. That's genuinely good."

> "And there's a time window one -- 'Filter to timestamp Mar 8 to Mar 14', with the little bar chart
> of transfers per day. *That's* what I wanted on the citation data. There, it's grantYear, and I
> didn't get offered a year range, I'd have had to build it out of dropdowns."

> "'Create rule set.' Is that 'save this search'? If I load next month's file, does it run again?
> Nothing says so. My lead counts saved queries. If I can't find that out in ten seconds I assume
> it doesn't."

**Getting it out.**

> "Right, I've got my three notes. I want the 2,406 isolates as a CSV for the notebook. 'Export
> files...' top right -- files of what? The whole graph? There's a '...' on the table. I'd try
> that first. I don't see 'Export rows' anywhere. If I can't get these as rows, I'm screenshotting
> the table and retyping, which is ridiculous."

---

## What she found

1. **The three hubs and the patents between them** (6018952, 5907468, 6112268 cite two of the top
   three). The only thing the drawing added over the table.
2. **The top patent's citations are mostly outside the sample**: 779 in the source field, at most
   236 counted inside. Two thirds of its story is not in this file.
3. **2,406 isolates that were cited up to 46 times from outside**: either a bad cut or the
   interesting ones.

## After the task

**Single Ease Question: 5 of 7.**

> "A five. It never fell over, it told me exactly what it wasn't drawing and why, and the counts
> matched everywhere I checked. That's more than I get from most of these. It loses points for
> the dropdown query builder, the time range hiding in a column header, two columns that both
> sound like 'times cited' and aren't, and me not knowing whether I can save the thing or get the
> rows out."

**Would she use it instead of her current tool?**

> "Instead of my notebook? No. Next to it, maybe. The 'will draw / will not draw' count before I
> commit, the pipeline of steps with what each one took out, and the pasted id list -- those are
> good, those are how I actually work. But give me a box I can type a query into, show me the
> time range next to every number, let me save the steps and rerun them on next month's file, and
> let me export the rows as a CSV. Without those it's a nice viewer for a lab file. And I'd still
> need someone to tell me it runs locally before I put bank data anywhere near it."
