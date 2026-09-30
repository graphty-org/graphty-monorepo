# Is this file worth an afternoon? -- Dana Okafor, supply chain risk analyst

**Participant:** Dana Okafor, supply chain risk analyst at an industrial equipment maker (about
1,400 direct suppliers). Lives in Excel and Power BI; tried a Power BI network visual and Gephi
and dropped both. Not a network scientist. Corporate laptop, IT review for any tool that touches
supplier data.

**Task as given:** "A colleague sent this file. Is it worth an afternoon?"

**The file:** `ppi-core-300-evidence.tsv` -- a protein interaction table, one row per pair of
proteins per evidence source, with a confidence score (150 rows say NA). Nothing to do with her
job; the moderator gave no further context.

**Screens seen (study view, 1440 by 900):**

- Start screen: `shots/tasks/worth-an-afternoon/01-start-screen.png`
- "Where your data goes" page, reached from the start screen link: `shots/record/r4-dana-wa-data-location.png`
- Open dialog, confidence column read as text: `shots/tasks/worth-an-afternoon/02-load-step-blocked.png`
- Open dialog, repeated pairs: `shots/tasks/worth-an-afternoon/03-load-step-policy.png`
- The loaded graph: `shots/tasks/worth-an-afternoon/04-frame-at-rest.png`
- For "what would I do next", the first-look screens: quick actions and a betweenness result on
  the Les Miserables sample: `shots/record/r4-dana-wa-fl-s6a.png`, `shots/record/r4-dana-wa-fl-s6b.png`

**Outcome:** she got the file loaded and understood what she was loading, and answered the task:
"not for me, and I'd tell my colleague why in two lines." Ease was good; the value question was a
no, and most of the no is about the file and her company, not the screens. Two things on the
screens cost trust: the summary after loading says the opposite of what she chose for the score
column, and the loaded screen offers nothing in her words about what is worth looking at.

---

## Transcript

### 1. Start screen

> Okay. "Open a graph." Graph -- like a chart? No, these pictures are the dot-and-line things.
> Network. Fine.
>
> First thing I read: "Files stay on this computer. graphty reads them in this browser and
> uploads nothing." Good. That is the first question IT asks me, and it's the first sentence on
> the page. I've never had a tool say that before I asked. "Projects are kept in this browser."
> Okay, so if I clear my cache on Friday it's gone. I'll remember that. Or I won't.
>
> Samples. Karate club, Les Miserables, Protein interactions, Bank transfers. None of these is a
> supply chain. Bank transfers is the closest -- money moving between accounts is sort of like
> orders moving between companies. I'm not clicking a sample though, somebody sent me a file.
>
> "Open..." -- that's my import. "Connect to data source..." -- is that SAP? It doesn't say. The
> little (i) at the far end of that row is miles away from the words, I almost didn't see it was
> for that row.
>
> Before I do anything I'm clicking "Where your data goes", because if I like this I have to
> send IT something.

**Moderator note:** the link first lands on a one-line page, "This page moved: Where your data
goes", and she had to click again.

> That's a dead end with a link on it. Somebody forgot to update something. Minor, but if I
> forward the first link to IT, they get "this page moved" and that's the first impression.
>
> Okay, this one I like. "It is written so you can forward it to whoever approves software where
> you work." That's literally my situation. "Print or save as PDF" -- yes, that's what goes in
> the ticket. "No account and no server that receives your data." "Data leaves the browser only
> through two features, both off until you turn them on." I'd want IT to confirm that, not me,
> but this is the page they'd want. The table -- "Files you open: CSV, JSON, GraphML..." --
> no Excel. Half of what I get out of SAP is xlsx. I'd have to save as CSV. Fine, I do that
> every day anyway.
>
> Honestly this page alone gets it past the first IT email. That's more than Gephi did.

### 2. The open dialog: "confidence is read as text"

> Open... the file. `ppi-core-300-evidence.tsv`. Proteins. This is my colleague's? Who sent me
> proteins? Okay, whatever, let's see what it is.
>
> It already guessed a lot. Format TSV, "Each row is an edge". Edge. I don't know "edge". Ends:
> protein_a, protein_b. Oh -- it's saying each row connects protein A to protein B. Like
> supplier to site. Fine, it guessed that right, and it shows me which columns it used. I'd
> check that against my own file every time.
>
> "Undirected." Don't know. Leave it.
>
> The yellow one at the top on the right: "confidence is read as text: 150 of 2,298 scores are
> NA." Yeah, that's every export I've ever had. Somebody typed NA in a number column. It tells
> me how many, and there's a little table, "Rows with NA, 5 of 150", with line numbers. Line
> numbers! I can go find those in the file. That's the table I'd have built in Excel with a
> filter. Good.
>
> The dropdown that's open says "Number, NA as missing: 2,298 edges; 150 of them with no
> confidence." "Number, leave out the rows with NA: 2,148 edges." "Text." Each one says what I
> end up with. That I can decide. I'd take the first one -- I don't want to throw away 150 rows
> because somebody didn't know the score. Blank is honest.
>
> The grey lines under each choice are small. On my laptop with no glasses that's a squint. On
> the monitor it's fine.

She picks "Number, NA as missing".

### 3. The open dialog: "865 pairs appear more than once"

> Now it's down to one issue. "865 pairs appear more than once. Each row is one evidence source
> for a pair." So the same two proteins are listed three times because three different sources
> said so. That's my two-ERPs problem. Same supplier, three rows, and if I don't catch it every
> count is wrong.
>
> "Keep each: 2,298 edges -- a pair reported by three sources is linked three times."
> "Combine into one: 1,262 edges -- one edge per pair, with its highest confidence. The source
> column is not kept."
>
> This is the first tool that asked me about duplicates instead of silently double-counting
> them. I like that it says what I lose -- "the source column is not kept." That's the kind of
> sentence I'd want in front of the VP when he asks why the number changed.
>
> What I'd actually want is both: one line per pair, and a count of how many sources said so.
> "Confirmed by three sources" is the useful number. It doesn't offer that. I'll keep each,
> because I don't want to lose which source said what.
>
> Bottom: "What will load: 300 nodes, 2,298 edges, 150 with no confidence." "2 proteins have no
> partner in the file: GSK3B, NOTCH1. They are loaded unconnected." Nice -- it names them. In my
> world that's a supplier on the list with no parts. That's either a data error or a dead
> supplier, and either way I want to know which one.
>
> "Weight: confidence, not used yet." Not used yet by what? I don't know what weight means
> here. I'd guess it means the score doesn't count for anything yet. Moving on.

She clicks Load.

### 4. The loaded graph

> There it is. Hairball. Proteins in clumps, a few names in the middle: UBC, UBB, MYC, TP53...
> I don't know any of these. The little card says "Labels: the 12 proteins with the most
> partners." Okay, so the named ones are the busiest. That's at least a reason for why these
> twelve.
>
> Left side: "Nothing has been sent from this project." Good, the same promise again, and
> "Assistant: Off. Nothing is sent." I like that it's written where I'd see it, not buried.
>
> Right side, "Statistics." I read the first line: "Loaded: ppi-core-300-evidence.tsv,
> undirected, NA read as missing, repeated pairs kept, no numeric edge column."
>
> Wait. "No numeric edge column." I just told it confidence is a number. That's the whole thing
> I decided in the first screen. And the dialog said "Weight: confidence, not used yet." Now it
> says there's no numeric column at all. So which is it -- did it take my choice or not? This is
> exactly the moment I stop trusting the rest. If it can't repeat back what I told it thirty
> seconds ago, why would I believe the 2,298?
>
> Nodes 300, Edges 2,298. That matches the dialog. Okay. Density 0.0281 -- no idea, the (i)
> probably explains it, I'm not opening it. "Connected components 3 (2 isolates)." Never said
> "component" in my life. 2 isolates is probably my two proteins with no partner, GSK3B and
> NOTCH1. I'd guess the third one is... everything else? So the whole thing is one lump and two
> strays. If that's what it means, just say that.
>
> "Degree distribution" and a tiny bar chart. Don't know degree. "Attributes 2." "5 more." Five
> more what?
>
> "Overview: General" and "Change overview..." -- I don't know what an overview is here. I
> won't click it.
>
> "Style stack", "Base style". That's formatting. Not now.
>
> "Results" with a plus. That's the only place that sounds like an answer. Results of what?
>
> At the bottom, "Table: 300 nodes, 2,298 edges." Now that I'd open. Table is where I'd check
> the duplicates.
>
> Where's search? There's a magnifying glass next to "Graphs" but that looks like it searches the
> list of graphs, and there's only one. I'd want to type "TP53" and see what's attached to it. I
> can't tell from here where that happens.
>
> And there's no export in sight. Nothing that says Excel, nothing that says Power BI.

### 5. "What would you do next?"

The moderator asked where she would go from here. She looked at the lightning button in the
toolbar; the first-look screens show what it opens.

> The lightning thing -- I wouldn't have clicked an unlabelled lightning bolt. But this, where I
> can type "who matters most" and get "Betweenness -- who sits between the groups"... okay,
> that's my chokepoint. "PageRank -- who is tied to well-connected characters." "Degree -- who has
> the most direct ties." Every one has a sentence in English after it. That's the first time a
> tool explained betweenness to me without a webinar.
>
> And then it gives me a ranked list, "Top nodes", with the number. That's a table. I can read a
> table. "47 of 77 characters score 0. Valjean alone scores 0.57; next is Myriel at 0.177." That
> line is what I'd put on a slide: one thing is way out in front of everything else. That's the
> sentence I need about my resin supplier.
>
> "value's meaning is not set, so it runs unweighted" -- I don't know what that means and it
> worries me a little, like it's telling me the answer might be wrong but not how.
>
> But I had to know to type "who matters most". Nothing on the loaded screen offered me that. If
> this is the good part, why is it behind a lightning bolt?

### 6. Is it worth an afternoon?

> For this file, no. It's proteins. I can't judge whether the answer is right because I don't
> know what a right answer looks like. I'd send it back: "It loads fine. 300 proteins, 2,298
> links, 865 pairs listed by more than one source, 150 scores missing, two proteins with no
> partner. Everything is basically one big cluster. If you want who sits in the middle, the
> tool has a ranking. Not my area."
>
> And actually -- that email is worth something. I got that from the load screen in two minutes,
> without opening Excel. The load screen told me more about the file than the picture did.
>
> For my own data? Maybe. The duplicates question and the "these two have no partner" line are
> exactly my supplier-list problems. But my Tier 2 is a company name and a country for maybe 15
> percent of spend. Most of my network is one step deep. Where do I get the Tier 2 data from?
> Until that's answered, a chokepoint ranking on my data is mostly going to tell me which Tier 1
> supplies the most parts, which I can do with a pivot in ten minutes.

---

## Single Ease Question

**5 of 7.**

> Loading was easy, easier than any tool I've tried; it asked the two questions that mattered in
> words I understood, and told me what each answer would give me. It loses points because the
> summary afterwards contradicted my choice on the score column, and because once it was loaded
> I didn't know what to do. The picture didn't tell me anything; the load screen did.

## Would she use this instead of her current tools?

**No, not instead. Possibly beside them, for one job.**

> Not instead of Power BI. My VP looks at Power BI on Monday and I didn't see any way out of
> this into Power BI, or even into Excel -- no export anywhere on the screen I saw. If I can't
> get the table out, it doesn't exist.
>
> Not instead of the risk platform either. That has our sub-tier map, such as it is; this has
> whatever I bring it, and what I bring stops at Tier 1.
>
> What I'd use it for: checking a supplier file before it goes into anything else. The
> duplicates, the NA scores, the entries with nothing attached -- it found those on its own and
> showed me the rows. And the "where your data goes" page would get it through IT, which is the
> part that usually kills a tool. If it read xlsx, exported the table, and didn't contradict
> itself, I'd give it a real afternoon with my own list.

---

## Observations for the design team

These are written from the session, in plain terms; severity is 1 (cosmetic) to 4 (stops work).

1. **The summary after loading contradicts the choice made in the dialog (severity 3).** She set
   confidence to "Number, NA as missing" and the dialog said "Weight: confidence, not used yet".
   The loaded screen's first line says "no numeric edge column". She read it as the tool not
   taking her choice, and said she would stop trusting the numbers after it. Her persona brief
   predicts exactly this: a wrong guess stated without explanation costs every number after it.
2. **The start screen's "Where your data goes" link lands on a "This page moved" stub (severity
   2).** The real page is the strongest thing in the session for her -- written to forward to
   IT, with Print or save as PDF -- but the first link she would forward is the stub.
3. **Nothing on the loaded screen says what is worth looking at (severity 3).** The Statistics
   block is in words she does not use (density, connected components, degree distribution,
   overview). The plain-language measure names ("who sits between the groups") exist, but only
   behind an unlabelled lightning button and only if she types a question. "Results" with a
   plus was the only thing that sounded like an answer, and it gave no hint.
4. **"Connected components 3 (2 isolates)" is the finding, stated in the wrong words (severity
   2).** She worked out it meant "one big cluster and two strays" and wanted it said that way.
5. **No export or Power BI route visible (severity 3 for her).** She looked for Excel and Power
   BI and found neither on the loaded screen. For her this makes it a side tool at best.
6. **No search for a named item on the loaded screen that she could recognise (severity 2).** The
   magnifier next to "Graphs" reads as searching the list of graphs, which holds one row.
7. **The (i) for "Connect to data source..." sits at the far right edge of the row (severity 1).**
   She almost did not connect it to the row.
8. **Small grey secondary text in the dropdown options (severity 1).** Readable on her monitor, a
   squint on her 14-inch laptop.
9. **The repeated-pairs choice has no "one per pair, with how many sources" option (severity 2,
   a request).** Keep each or Combine; she wanted combine plus a count, because "confirmed by
   three sources" is the number she would report.
10. **No spreadsheet (.xlsx) in the list of files it reads (severity 2 for her).** She would save
    as CSV, but noted it.

What worked for her: the files-stay-here line as the first sentence; the data-location page
written for IT; the load step naming the NA problem with line numbers and a table of the rows;
every choice saying what it would load ("2,148 edges; the 150 rows are not loaded"); duplicates
raised as a question instead of silently counted; the two unconnected proteins named; the label
card saying why those twelve names are shown; and the measure list with one-line plain meanings
and a ranked table.
