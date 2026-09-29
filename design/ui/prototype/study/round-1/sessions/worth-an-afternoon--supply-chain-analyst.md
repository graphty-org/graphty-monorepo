# Session: is this file worth an afternoon? -- supply chain risk analyst

Participant: Dana Okafor (composite persona), supply chain risk analyst at an industrial
equipment maker. Excel and Power BI every day; tried Gephi and a Power BI network visual and
dropped both.

Task as given by the moderator: "A colleague sent you this file. Decide whether it is worth your
afternoon, and tell me anything that looks off."

The file behind the task is a tab-separated list of protein interactions
(ppi-core-300-evidence.tsv) whose confidence column has 150 "NA" values, so it opens read as text.
The participant was not told this.

Screens walked, in order: the start screen, the load step (the dialog that opens a file), and the
project window after loading.

## Think-aloud transcript

### 1. Start screen

> OK, "Open a graph." Graph... so, a chart? No, those little pictures are network blobs. Fine.
> I was looking for "Import". There's no Import. There's "Open..." -- I guess that's it.

> "Your files stay on this computer. graphty reads them in this browser and uploads nothing."
> Good, that's the first thing IT will ask me. But it's one grey line with a padlock. IT is going
> to want that in writing from somebody, not a sentence on the screen. And it's small and light
> grey -- I had to lean in, and that's on the big monitor.

> Samples: karate club, Les Miserables, proteins, bank transfers. None of that is my world. I'm
> not going to click a karate club. Skipping.

> "Your data -- Open... or drop a file here." I just drag the file onto it. It goes blue, says
> "Drop to open as a new project -- the columns are checked before anything loads." Good. I like
> that it's going to check first. That's the step Power BI skips and then I find out later.

> "Reads CSV, JSON, GraphML, GEXF..." -- I know CSV. The rest are alphabet soup to me. Fine, mine
> is a TSV, I assume that counts.

> "Connect to data source... sends only your query, to the source you name." I don't know what my
> query is. Not touching it.

### 2. Load step -- the file opens

> It opened a big dialog: "Open ppi-core-300-evidence.tsv". So it's protein stuff, not suppliers.
> My colleague sent me a biology file? OK, whatever, the question is whether it's worth my time.

> Left side: Format "TSV, tab, header row" -- right. "Each row is: An edge." I don't know what an
> edge is. Each row is... a record? A line? I'll leave it, I assume it guessed.

> "Ends: protein_a -- protein_b." Ends of what? Oh -- the two things in each row. Like "supplier"
> and "buys from". OK, it guessed the two name columns. That's right, I think. It didn't ask me,
> which is fine as long as it's right.

> "Direction: Undirected." No idea why I'd care. Moving on.

> Red circle. "confidence is read as text, so it cannot weigh edges. 150 of 2,298 values are NA;
> the rest are numbers between 0 and 1." OK, THAT I understand. That's the #N/A problem. Somebody
> exported this from R or something and the blanks came out as "NA". It happens in every ERP
> export I've ever touched. Good catch, and it told me in the first line, with the count. That's
> the "anything that looks off" -- 150 of the confidence numbers are missing.

> It shows me the rows: line 29, 31, 44... all "coexpression". Huh. So all the missing ones in
> the first five are the same source. That's actually interesting -- that's the kind of thing I'd
> want to know. Is it ALL coexpression? It only shows me five. There's "Show first rows" -- I'd
> want "show all 150" or a count by source. I'd go back to Excel and pivot it for that.

> The dropdown next to "confidence" says "Text", and "Role: Weight". Wait -- weight? Like
> kilograms? In my world weight is shipping weight. Here I think they mean "how much this row
> counts". I'd have gotten that wrong on my own file if I had a weight column. That word needs to
> say what it means.

> Open the Read as list. Three choices, each with what happens:
> - "Number, NA as missing -- 2,298 edges; 150 of them without a weight"
> - "Number, drop the rows with NA -- 2,148 edges; the 150 rows are not loaded"
> - "Text -- cannot weigh edges: Load stays off while its role is Weight"
> I like that. It says what I get in numbers before I pick. That's more than Power Query ever tells
> me. I'd pick "NA as missing" -- I never throw rows away before I know why they're blank.

> But "150 of them without a weight" -- then what? Do they count as zero? Do they count as
> average? That matters. If it treats missing as zero, every number after this is wrong and I
> won't know it. It doesn't say.

> The Load button is grey, and the bottom says in red "Load is off: choose how to read
> confidence." Fine, clear. At least it didn't load garbage quietly.

> Below the red one there's a yellow one: "1,036 extra parallel edges." I don't know what a
> parallel edge is. The second line helps: "Several rows join the same two proteins, one per
> evidence source." So -- duplicates. The same pair listed several times. Keep all 2,298. My
> question: if it keeps all of them, does that pair count double in whatever it ranks later?
> In my data that's exactly the "same supplier entered twice" problem. It doesn't tell me what
> keeping them does to the numbers.

> Under the confidence setting there's a row of buttons: "Similarity, Distance, Capacity,
> Unknown", and "Paths ignore it; PageRank and communities read it as a similarity." I have no
> idea. PageRank is Google. I'm leaving it on Unknown. If this was required I'd be stuck here.

> "What will load: nodes 298, edges 2,298." The file name says "core-300". Where are the other
> two? Nothing on the screen tells me. That's the second thing that looks off, and the tool
> doesn't explain it. If this was 1,400 suppliers and it said 1,398 I'd want to know which two
> went missing before I show anyone anything.

> Also -- "298" is "nodes". I'd call them proteins, or suppliers. "Nodes" and "edges" everywhere.
> It's fine, I'll learn it, but my VP won't.

### 3. After loading -- the project window

> I pressed Load. (Moderator: the prototype shows a different sample here, Les Miserables, not
> the protein file.) Hm. It says "Les Miserables" at the top and miserables.json. That's not
> what I opened. In a real tool that would stop me dead -- did it load the wrong file?
> (Moderator confirmed it is a prototype gap and asked her to treat it as her file.)

> OK, pretending. Picture in the middle, coloured blobs. Legend bottom left, "Group color: 2, 8,
> 4, 1, 3, 5, 0, Other" with counts. Group 2 is what? The numbers mean nothing. It should say
> what the groups are.

> Right side: "Statistics. Nodes 77, Edges 254, undirected, weight: value." Good, that's the
> count I'd check. "Density 0.0868" -- no idea, and I'm not going to hover a little "i".
> "Connected components 2 (1 isolate)." That one I'd actually want in plain words -- "one
> thing is on its own, not connected to anything". That's a finding for me: a supplier nobody
> is linked to is usually a data entry mistake. But I had to decode it.

> "Degree distribution" with a tiny bar chart. Skip.

> I clicked the file name chip, "miserables.json": "Opened from this computer. Read Sep 28,
> 10:42. Replace data..." OK, good, that answers "where did this come from".

> Where's the table? I want the list. I see "Graphs, Sets and paths, Styles, Views" on the left,
> and a magnifying glass next to Graphs. Is that search? Probably. No table I can see from here.
> I'd look for a list of the rows with the missing confidence -- the 150 -- and I don't see how
> to get back to them now that it's loaded. That's the thing I'd actually send back to my
> colleague.

> "Export..." top right, blue. Good, I'd try that. If it gives me an Excel file I'm happy.

### 4. The answer to the task

> Is it worth my afternoon? Honestly -- as a file, no, it's a biology network, not my job. But
> the tool told me in about a minute what's wrong with it: 150 missing confidence values, all
> the ones I saw from coexpression; a lot of duplicate pairs; and two of the 300 proteins don't
> show up. That's what I'd write back to my colleague. I could get the first two in Excel in ten
> minutes with a filter and a pivot. The two missing proteins I'd probably not have noticed.

> What looks off: the NA values; the duplicates; 298 not 300 with no reason given; and after
> loading, the screen said a different file name.

## Single Ease Question

5 out of 7. Opening it and seeing the problem was easy. The words ("edge", "weight", "parallel",
"PageRank", "density") and the missing reason for 298 cost me, and I could not get back to the
list of bad rows after loading.

## Would she use it instead of her current tool?

> Not instead of. Maybe beside. The "check before it loads" part is better than Power Query --
> it told me what each choice would do, in counts, before I picked. But nobody told me if IT will
> sign off beyond one grey sentence, whether it gets into Power BI, or what "missing weight" does
> to the numbers. And my Tier 2 problem is still my Tier 2 problem. For triaging a file somebody
> sends me, yes, I might open it here first. For the Thursday meeting, not yet.

## Problems observed

| Screen | What happened | Severity (1-4) |
| --- | --- | --- |
| Project window after Load | The loaded project shows a different dataset and file name than the one opened; she briefly believed the wrong file loaded. | 3 |
| Load step | "298 nodes" against a file named core-300: the screen gives no reason two proteins are missing. | 3 |
| Load step | "NA as missing" says 150 edges will have no weight but not how later numbers treat a missing weight (zero? skipped?). | 3 |
| Project window after Load | No visible way back to the 150 NA rows or a table of rows once loaded; the finding she would send her colleague is gone. | 3 |
| Load step | "Role: Weight" read first as shipping weight; the word has a physical meaning in her domain. | 2 |
| Load step | "Similarity / Distance / Capacity / Unknown" and "PageRank and communities" -- not understood; left at Unknown. | 2 |
| Load step | "1,036 extra parallel edges": duplicates understood from the second line, but not what keeping them does to rankings. | 2 |
| Load step | "Each row is: An edge", "Ends", "Direction: Undirected" -- jargon she skipped on trust. | 2 |
| Project window | Legend "Group color 2, 8, 4, 1..." -- group numbers with no meaning; "Density", "Degree distribution" skipped. | 2 |
| Start screen | No "Import" label; she found "Open..." by elimination. | 1 |
| Start screen | The "files stay on this computer" line is small light grey, hard to read; it is also not something IT will accept as proof. | 2 |

## What worked

- The blocking issue said the problem and the count in one line, and Load stayed off instead of
  loading bad data quietly.
- Every choice in the Read as list stated what would load, in row counts, before choosing.
- The sample rows with line numbers showed exactly which rows were affected.
- Dropping the file on the page worked without a dialog first.
- The file chip after loading answered "where did this come from".
