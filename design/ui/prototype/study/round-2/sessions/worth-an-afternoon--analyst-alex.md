# Session: is this file worth my afternoon? -- Analyst Alex

**Participant:** Alex, operations data analyst at a logistics company. Computes in NetworkX, draws in
Gephi, checks every import against the counts he already knows. Mild red-green colour weakness.

**Task, as the moderator gave it:** "A colleague sent you this file. Decide whether it is worth your
afternoon, and tell me anything that looks off."

**The file:** `ppi-core-300-evidence.tsv`, a protein interaction list: two protein columns, an
evidence source and a confidence score. The confidence column has 150 "NA" values in it, so the
app first reads it as text rather than as numbers.

**Screens used, in order:** the start screen (first run), the load step (the confidence column
blocked as text, then the repeated-pairs choice), and the main window after loading, with the
protein data.

Renders looked at: `shots/screens__start-screen.png`, `shots/r2-alex-afternoon-load-blocked.png`,
`shots/r2-alex-afternoon-load-policy.png`, `shots/r2-alex-afternoon-frame.png`.

## Transcript (think-aloud)

### Start screen

> Right, "Open a graph." Padlock line -- "Files stay on this computer, reads them in this browser,
> uploads nothing." OK, I know this one, that's where I'd look first anyway. It's not my supplier
> data today, it's a colleague's protein thing, so I care less, but fine. Still nothing about what
> it costs. I'll let that go for now.

> Samples, four pictures. Karate club, Les Mis -- I know those from every tutorial ever. I don't need
> those, I've got a file. "Open..." under the pictures. Bit small, it's down there under the
> samples, but it's there. Click.

*Picks the file in the system dialog.*

### Load step -- the confidence column

> OK, a dialog. "Open ppi-core-300-evidence.tsv." Format: TSV, tab, header row -- correct. "Each row
> is: an edge." Yes. Ends, protein_a -- protein_b. Undirected. Fine, it guessed all that, which Gephi
> sort of does too.

> Red. "confidence is read as text, so it cannot weigh edges. 150 of 2,298 values are NA; the rest
> are numbers between 0 and 1." Huh. OK -- that's actually the thing I'd have found at four o'clock
> when betweenness came out weird. Pandas would have made that column an object dtype and I'd
> have missed it. This tells me up front, and it tells me *how many*. 150 of 2,298. I like that it
> gives me a number.

> And the table under it's already showing me the NA rows -- line 29, 31, 44... all
> "coexpression". Interesting. So it's one evidence source that's missing scores, not random. That's
> worth telling the colleague, actually.

> The dropdown on the column: "Number, NA as missing -- 2,298 edges; 150 of them without a weight."
> "Number, drop the rows with NA -- 2,148 edges." "Text -- cannot weigh edges." Honestly this is
> clear. I'll take "NA as missing", I don't want to throw away rows I haven't looked at.

> Question though: 150 edges "without a weight" -- what does betweenness do with those? Weight of
> one? Zero? Skip them? It doesn't say. In NetworkX a missing weight defaults to 1, which for a
> confidence score would mean "totally confident", which is backwards. I'd need to know that before
> I put a number in a deck.

> Also -- it asked "Weight" as the role, but it never asked me whether higher confidence means
> closer or further. For a shortest path that matters. Maybe it asks later. I'd be nervous.

> Bottom: "Load is off: choose how to read confidence." Right, that's why the button's grey. Good,
> it tells me why.

### Load step -- repeated pairs

> Now it's one issue. Yellow. "1,036 extra parallel edges. Several rows join the same two proteins,
> one per evidence source." Default is "Keep all: 2,298 edges -- one edge per row, so degree counts
> every source."

> Hm. So by default a pair of proteins with four evidence sources gets degree four from each other.
> That's not degree, that's evidence count. If I'm not paying attention I'd rank hubs by "how many
> databases mention this protein". That's the kind of thing that ends up in a report wrong. I'd
> switch to "Merge into one, max of confidence: 1,262 edges". The maths checks: 2,298 minus 1,036
> is 1,262. OK.

> Honestly I think the default should be the merge, or at least it should make me pick, like it did
> for the confidence column. The yellow one lets me sail past it.

> What will load: nodes 298, edges 2,298, 150 without a weight. And a little line: "298 nodes -- 2
> proteins in the file have no interaction: GSK3B, NOTCH1." Oh, that's nice. The file says 300 in
> the name and I'd have gone looking for the missing two. It names them. Good.

> So -- in my head: 298 nodes, 1,262 edges after I merge. I'm writing that down. Load.

### Main window, after loading

> OK. Pretty. Coloured blobs, labels on the big ones -- UBC, HSP90AA1, MYC, TP53. Top left:
> "Human protein interactions", "This browser. Nothing sent." Fine. Assistant off, nothing sent.
> Good.

> Now the counts. Statistics on the right: Nodes... 300. Edges 1,262.

> Wait. 300? It just told me 298. It named the two it was dropping. Now it's 300. And the chip at the
> top says "ppi-core-300.g..." -- that's not my file, mine was ".tsv". Is this -- did it open a
> different file? A cached one? The recent list had a "Human protein interactions (300 proteins)"
> from Sep 21 in it. Did it load *that* instead of what I just picked?

> And edges 1,262 -- that's the merged number. Did I merge? I think I picked merge. If I'd left the
> default it should say 2,298. I can't tell from this screen which one I chose. There's no "you
> loaded this with: NA as missing, merged by max" anywhere. The Edges row says "undirected, weight:
> confidence". It doesn't say 150 are missing.

> "Connected components 3 (2 isolates)." So the two lonely ones ARE here? GSK3B and NOTCH1, floating
> around? But the load step said they had no interaction and wouldn't load. So which is it.

> This is exactly what kills it for me. The first thing I do is check the counts, and the counts
> don't match what the same app told me thirty seconds ago.

> And the colours -- "Module color": Ribosome, Proteasome, Complex I, Spliceosome... Where did modules
> come from? My file had four columns: protein_a, protein_b, source, confidence. There's no module
> column. Did it run a community thing and *name* them? Or is this from the other file? Attributes
> says 4. If it ran communities, I want to know what, and with what seed, before I trust "Ribosome".

> Legend-wise: Proteasome and DNA repair are both orange-ish to me. Ribosome and Spliceosome are both
> blue. I can tell them apart if I squint and there's the counts beside them, which helps. Not the
> worst. Better than Gephi's default rainbow.

> Size by degree, 1 -- 10 -- 34. OK, so the big ones are high degree. Degree on the merged graph, I
> hope. I'd want the top twenty as a table. I don't see it here -- maybe under "Results" on the left.
> Not going looking right now.

### The verdict for the moderator

> Is the file worth my afternoon? The file, yes, probably -- 298 proteins, one evidence source has
> no scores, lots of duplicated pairs. That's a real finding the load step handed me in about a
> minute, and I'd tell the colleague about the coexpression NAs straight away.

> Is *this tool* worth my afternoon? Not until the numbers line up. The load step was the best
> import dialog I've seen -- it caught the text column, it counted everything, it named the dropped
> proteins. And then the main screen says 300 nodes and a different file name. If I can't reconcile
> the counts between two screens of the same app I can't put either number in front of my manager.

## After the task

**Single Ease Question (1 very hard -- 7 very easy):** 4.

> The loading bit was a 6. It told me what was wrong and what each choice would give me. Then I got
> to the graph and I didn't know which data I was looking at. That's the part that took longest --
> I was sitting there trying to work out if it had opened the right file.

**Would you use this instead of your current tool?**

> For checking a file someone sent me -- maybe, yes. That import screen does in a minute what takes me
> twenty lines of pandas: dtype check, NA count, duplicate pairs, orphans. I'd actually use it just
> for that. For the analysis itself, not yet. I'd need the counts after loading to match the counts
> before loading, I'd need to see what choices I made on load written down somewhere on the graph,
> and I'd need to know what it does with the 150 edges that have no weight. And I'd still do
> betweenness in Python the first few times to see if it matches.

## What looked off (as Alex said it)

1. After loading, Nodes reads 300 and the file chip names `ppi-core-300.graphml`; the load step had
   just said 298 nodes from `ppi-core-300-evidence.tsv` and named the two it would not load.
   Components reads "3 (2 isolates)", which suggests the two are there after all. (Main window,
   Statistics and file chip.)
2. Module colours with names (Ribosome, Proteasome...) appear with no module column in the file and
   no record of a run that made them. (Main window, Styles and legend.)
3. Nothing on the main window says which load choices were made -- NA as missing, merge or keep all
   -- or that 150 edges have no weight. (Main window, Statistics, Edges row.)
4. Keeping every repeated pair is the default, so degree silently counts evidence sources; the
   warning is yellow and does not make you choose. (Load step, repeated-pairs issue.)
5. "NA as missing" does not say what a weighted measure will do with the 150 unweighted edges.
   (Load step, the confidence choices.)
6. The load step asks for Weight but not whether a higher confidence is closer or further; nothing
   says it will be asked later. (Load step, Role column.)
7. Proteasome and DNA repair, and Ribosome and Spliceosome, are hard to tell apart for a
   red-green-weak reader; the counts beside them help. (Main window, legend.)
8. A "Human protein interactions (300 proteins)" recent from Sep 21 is listed behind the dialog on a
   first open of this file, which made the wrong-file suspicion worse. (Load step, background.)
