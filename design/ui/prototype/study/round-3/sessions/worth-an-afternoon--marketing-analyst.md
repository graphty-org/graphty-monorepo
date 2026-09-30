# Is this file worth an afternoon? -- Jordan, marketing network analyst

Round 3, simulated think-aloud session. The participant is Jordan (study/personas/marketing-analyst.md),
a growth-marketing analyst who does "the network stuff" one or two days a week and usually works in
Gephi, NodeXL and a social-listening suite.

**Task as the moderator gave it:** "A colleague sent you this file. Decide whether it is worth your
afternoon, and tell me anything that looks off."

**Screens, in the order she met them (as a participant sees them, design notes hidden, 1440 by 900):**

1. Start screen, first run -- `shots/record/r3-jordan-start-screen-task-worth-an-afternoon.png`
2. Load step with the confidence column read as text -- `shots/record/r3-jordan-load-step-task-worth-an-afternoon-blocked.png`
3. Load step after choosing how to read it, repeated-pairs list open -- `shots/record/r3-jordan-load-step-task-worth-an-afternoon-policy.png`
4. The loaded graph at rest -- `shots/record/r3-jordan-frame-at-rest-task-worth-an-afternoon.png`

---

## Transcript

### 1. Start screen

> OK. So there's... samples. Karate club, Les Mis, proteins, bank transfers. I'm not opening a
> sample, I've got the file. Where's "import CSV"? ... "Open...". Fine, that's the one, I guess.
> "Connect to data source" -- no, I don't want to connect anything to anything.
>
> Before I do -- does this go anywhere? Is it uploading? There's nothing on this screen that says.
> There's a little lock thing on other tools usually. Nothing here. Hmm.

*She scans the whole page for a sentence about where the file goes. The rendered study view shows
only the sample cards, Open... and Connect to data source...; there is no heading and no line about
where files go.*

> Well, the colleague sent it to me, and he said it's a protein thing, so I'm not worried about it
> being customer data. If it was our CRM export I'd stop right here and email IT. I'll click Open.

**Clicks:** Open...

### 2. Load step -- the confidence column

> Right, a dialog. "Open ppi-core-300-evidence.tsv." Wait, behind it there's a "Recent -- Human
> protein interactions, 300 proteins, Sep 21." I didn't open anything before, this is my first
> time. Did he... is that his? Is this machine remembering someone else's project? Weird. Moving on.
>
> Format TSV, an edge per row, protein_a to protein_b, undirected. OK, that's like a mention file,
> source and target. Fine. That part's actually readable.
>
> Red thing. "confidence is read as text, so it cannot weigh edges. 150 of 2,298 values are NA; the
> rest are numbers between 0 and 1." OK -- so it's the Excel problem where one "N/A" turns a whole
> column into text. I've had that a hundred times with engagement rate columns. At least it tells
> me *which* column and *how many*. That's more than Gephi does, Gephi just imports it as a string
> and you find out an hour later.
>
> And there's the little table of the NA rows with line numbers. Line 29, 31, 44... all
> "coexpression". Huh, so the NAs all come from one source? That's the kind of thing I'd tell him.
> Actually -- I can't tell that from five rows. "Show first rows" -- no, that's the other thing. I'd
> want "Show all 150". Whatever.
>
> Load button is greyed. "Load is off: choose how to read confidence." OK, clear enough, it's not
> letting me go until I pick.

**Clicks:** the Text dropdown next to confidence.

> "Number, NA as missing -- 2,298 edges; 150 of them without a weight." "Number, drop the rows with
> NA -- 2,148 edges; the 150 rows are not loaded." "Text -- cannot weigh edges."
>
> I like that it tells me the count for each. I don't like dropping rows, I've been burned when a
> filter quietly lost 20% of the mentions and the VP's number didn't match the dashboard. Missing is
> missing. Keep them.
>
> Honestly though -- why is "Weight" already set as its role? I didn't say it was the weight. Did
> the tool decide that? If it had just called it an attribute I wouldn't have hit this at all. I
> guess the weight is how strong the link is. Fine.

**Chooses:** Number, NA as missing.

### 3. Load step -- repeated pairs

> Now "1,036 extra parallel edges. Several rows join the same two proteins, one per evidence source."
> "Parallel edges" -- that's a nerd word, but the sentence under it I get: same two accounts, several
> rows. Like if @brand replied to someone five times. Keep all or merge.
>
> "Keep all: one edge per row, so degree counts every source." Yeah, OK, if I'm counting
> interactions I want every one. "Merge into one, max of confidence: 1,262 edges." Max? Why max,
> why not sum? For mentions I'd want the count, not the max. I don't get a choice on that. For
> proteins I have no idea which is right, so -- keep all, it's the default, it's the one that doesn't
> throw anything away.
>
> Bottom: 298 nodes, 2,298 edges, 150 without a weight. And "298 nodes -- 2 proteins in the file have
> no interaction: GSK3B, NOTCH1". Oh, that's good actually. The file says 300 in the name, I would've
> gone "where are the other two?" and this just tells me. That's the sanity check I always do and it
> did it for me. Nice. That's the one thing today that actually saved me a step.

**Clicks:** Load.

### 4. The loaded graph

> ...And it's a grey hairball. Every tool, same hairball. OK, it's a smallish one. Some labels in the
> middle -- UBC, AKT1, MYC, TP53. I've heard of TP53, it's a cancer one, right? So that being in the
> middle is at least not crazy. That's my "is our brand handle where I expect it" check, sort of.
>
> Right side: Nodes 298, Edges 2,298, "undirected, 1,036 parallel, no weight."
>
> Wait. No weight? I just spent a whole step choosing how to read confidence so it *could* be the
> weight. It said 150 without a weight, which means 2,148 *with* one. Now it says no weight at all.
> So which is it? Did my choice go anywhere? This is exactly the dashboard-says-4,000,
> download-says-3,100 thing. If the tool contradicts itself between two screens I stop trusting the
> rest of the numbers.
>
> And where's what I chose? I'd expect some line like "loaded: NA as missing, kept all rows, 2
> dropped" so I can forward it to him. The two missing proteins -- it told me on the dialog, now it's
> gone. There's a file chip "ppi-core-300-..." -- maybe it's in there? I'd hover it. It says "This
> browser. Nothing sent." up top. OK, *there's* the privacy line. Would have been nice before I
> opened it, not after.
>
> Density 0.0285, connected components 1, degree distribution -- a little bar thing. Fine. That's
> "is it one blob or islands", and it's one blob. "Attributes 2", "5 more". What are the 5 more?
>
> Now, is it worth my afternoon. What I'd do next: colour by cluster, size by influence, look at the
> table. I don't see a table anywhere. Left rail: Graph, Assistant (off), Results, Notes. Results is
> a flask icon. Bottom toolbar: arrow, some squiggle, a sticky note, a lightning bolt, "2D". Which
> one is communities? I'd try the lightning bolt first, "quick actions" sounds like the one, then
> Results. Nothing here says "Find clusters" or "Find influencers" in words. I'm on my third icon
> guessing, which is the Gephi Lite thing all over again.

*The toolbar and Results button are not wired in this mock; she stops here.*

> So my answer to the colleague: the file is clean enough -- one blob, 298 of 300 proteins, 150
> scores missing, all from coexpression as far as I could see, lots of duplicate pairs because every
> source is its own row. That's actually a decent summary and I got it in about five minutes without
> opening Excel. But is it worth *my* afternoon? It's proteins. I'm not the person. And for the tool
> -- I'd want to see it do clusters and a sortable table before I'd believe it can replace Gephi.
>
> What's off, for the record: it said "no weight" after I set a weight. The Recent list had a project
> I never opened. And nothing told me where the file goes until after it was open.

---

## After the task

**Single Ease Question (1 very hard -- 7 very easy):** 5.

> The loading part was easier than Gephi, honestly -- it told me the problem, the counts, and the two
> missing proteins. I'd give that a 6. It loses a point because the graph screen told me something
> different from what I just chose, and then I didn't know where to go next.

**Would she use this instead of her current tool?**

> For opening a messy CSV someone throws at me and checking it's sane, yes, maybe -- that import
> dialog beats Gephi and it beats NodeXL's "why is this column blank" game. For the actual work, not
> yet. I didn't find clusters, I didn't find a table, and the one number I cared about -- is my
> weight in there -- contradicted itself. And we already pay for Brandwatch, which does clusters, bad
> ones, but my boss has seen them. I'd need to see the top-40 table go out as a CSV before I'd bring
> it up in a meeting.

**Off-topic drift she volunteered:**

> Half the reason I get files like this is our Twitter pipeline died when the API went paid, so now
> it's whatever CSV somebody exports, with whatever "N/A" their tool writes. So the "read as text"
> thing -- that's not a planted bug, that's every file I get.

---

## Observer notes (for the design team)

- **The start screen showed no statement about where files go.** In the participant view of the
  first-run state, the line "Files stay on this computer. graphty reads them in this browser and
  uploads nothing." and the "Open a graph" heading do not render. In `screens/start-screen.html`
  the first state's privacy paragraph carries `data-annot` (line 97), which the study view hides as
  a design note; the other states' copies do not carry it. So either the mock mislabels product text
  as an annotation, or the first run really omits the line. Either way Jordan met the data
  question with no answer until after loading, which the persona file says is the moment she stops
  for customer data.
- **"no weight" after a weight was chosen.** The load step committed confidence as a Number with NA
  as missing and role Weight ("150 without a weight"), but the frame's Edges line reads
  "undirected, 1,036 parallel, no weight". The fixture (`kit/fixtures.json`, datasets.ppiEvidence)
  records `loadedWith.na: "read as missing"` together with `weight: "none: confidence is text"` and
  lists confidence as kind text: those two cannot both be true after the choices shown in the load
  step. This was the moment she lost trust.
- **The dropped proteins vanish after Load.** The frame's own design note says the Last import row
  appears "only when rows were unmatched or dropped"; here two proteins in the file (GSK3B, NOTCH1)
  did not load, yet no Last import row is shown. She wanted exactly that line to forward.
- **Recent list on a first run.** The start screen was first-run (no recents), but the load step's
  background shows "Human protein interactions (300 proteins), Sep 21" under Recent. She read it as
  someone else's project on her machine.
- **Weight preset as the role.** She did not choose Weight; it was already set, and it is the only
  reason the load was blocked. She accepted it, but asked who decided.
- **Merge rule.** "Max of confidence" is the only merge; for her mention networks she would want
  count or sum.
- **No task word for next steps.** After load she looked for "clusters", "influencers" or a table
  and found only icons (flask, lightning bolt, route, sticky note). Not wired in the mock, so this is
  a findability observation, not a completed attempt.
- **What worked:** issue row with counts per choice; the NA sample with line numbers; the
  "298 nodes -- 2 proteins have no interaction: GSK3B, NOTCH1" line, which pre-empted her usual
  sanity check; keep-all as a non-destructive default.
