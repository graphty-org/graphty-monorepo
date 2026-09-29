# Is a colleague's file worth an afternoon? -- Analyst Alex

**Participant:** Alex, operations data analyst at a logistics company. Uses NetworkX for the
numbers and Gephi for the picture. Mild red-green colour weakness.

**Task as given:** "A colleague sent you this file. Decide whether it is worth your afternoon, and
tell me anything that looks off."

**The file:** `ppi-core-300-evidence.tsv`, a tab-separated edge list of protein interactions. Its
confidence column contains 150 `NA` values, so it is read as text.

**Screens:** the start screen, the Open dialog (the weight problem, then the repeated-pairs
choice), the graph after loading, and the import report.

## Transcript (thinking aloud)

### Start screen

> OK. "Open a graph." First thing I look for is where the file goes. Oh -- it's right there
> under the title: "Files stay on this computer. graphty reads them in this browser and uploads
> nothing." Good. That's the first tool that has told me that before I asked. There's a link,
> "Where your data goes". I'll click it, because if I ever used this on the supplier stuff I'd
> need something to send to IT.

(Opens the page about where data goes.)

> "In short": files read by this browser, not uploaded, no account, no server. Two things send
> data out, and both are off until you turn them on. There's a "Print or save as PDF" button.
> OK, I can actually forward that. Fine. Back.

> Samples -- karate club, Les Mis, protein interactions, bank transfers. I don't care about
> samples, a colleague sent me a file. "Open..." is down there under the samples, kind of small.
> I'd honestly have just dragged the file onto the window. Nothing on the page says I can drop
> it or which formats it takes, so I click Open.
>
> Wait, one of the samples is "Protein interactions, 300 proteins", and the file I got is
> ppi-core-300. Is that the same thing? Did my colleague just send me the sample? I'll open the
> file anyway.

### Open dialog -- confidence read as text

> OK, a dialog: "Open ppi-core-300-evidence.tsv". It worked out TSV with a header row, each row
> an edge, ends protein_a and protein_b, undirected. That's all right, I didn't have to touch it.
>
> Right side: "Issues 2". The red one: "confidence is read as text, so it cannot weigh edges.
> 150 of 2,298 values are NA; the rest are numbers between 0 and 1." Yeah, that's R output,
> someone wrote NA for missing. That's exactly what pandas does to me, where the whole column
> becomes object dtype. Nice that it says the actual number: 150 of 2,298.
>
> Load is greyed out, and the bottom says "Load is off: choose how to read confidence". Fine. At
> least it's not letting me load garbage, and it says why.
>
> There are two places to fix it: the "Choose how to read it" box on the right, and the "Text"
> box next to confidence on the left. Are they the same control? I open the left one.
> "Number, NA as missing -- 2,298 edges; 150 of them without a weight." "Number, drop the rows
> with NA -- 2,148 edges." "Text -- cannot weigh edges." OK, that's clear, it tells me the count
> for each. I'd normally do fillna or dropna here, and I'd have to count myself. I pick "NA as
> missing", because I don't want to throw rows away before I even know what they are.
>
> What I don't get is whether NA means zero confidence or "nobody measured it". The screen
> doesn't know either, which is fair. I'd ask the colleague.

### Open dialog -- repeated pairs

> The second issue, the yellow one: "1,036 extra parallel edges. Several rows join the same two
> proteins, one per evidence source." Huh. So 2,298 rows but only about 1,262 real pairs? That's
> almost half duplicates. That's the kind of thing I'd want to know before I spend an afternoon
> on this.
>
> The dropdown says "Keep all: 2,298 edges". I open it. "Keep all -- degree counts every
> source." "Merge into one, max of confidence: 1,262 edges. The source column is not kept."
> OK, so if I keep all, every hub looks more connected than it is, just because more databases
> reported it. For a first look I'd honestly merge. But the task says just look, so I leave it on
> Keep all and remember that the degree numbers are inflated.
>
> "What will load": 298 nodes, 2,298 edges, 150 without a weight. And a note: "298 nodes -- 2
> proteins in the file have no interaction: GSK3B, NOTCH1." Good. File says 300, graph says 298,
> and it tells me which two. That's the counts check I always do by hand, and here it's done for
> me. That's worth something.
>
> Load.

### The graph after loading

> Grey ball. Well, not a total hairball -- I can see maybe five or six lumps and some labels:
> UBC, UBB, TP53, MYC, AKT1, HSP90AA1. Those are the big hubs I guess. They're the ones labelled,
> so I'd assume they're the important ones. They're all sitting in the middle, so they're
> probably all related to each other.
>
> Right panel, Statistics. Nodes 298, edges 2,298, matches what the dialog said. One connected
> component, so no dust, all good. Density 0.0285.
>
> Now look at the Edges line: "undirected, 1,036 parallel, no weight." ...No weight? I just told
> it confidence is the weight. I literally picked "Number, NA as missing" and the role said
> Weight. So either it dropped my weight, or "no weight" means something I don't understand.
> This is the thing that would end up wrong in a report. I'd go and check.
>
> And where did the 150 NA edges go? The dialog told me about them, but this screen doesn't
> mention them at all. If I close the laptop and come back tomorrow, I won't remember that 150
> edges have no score.
>
> The file chip up top: "ppi-core-300-..." -- cut off. I can guess the rest.

(Clicks around for a record of what was loaded and finds the import report through version
history.)

> OK, here it is: "Loaded with: confidence -- Number, NA as missing, 150 edges without a weight.
> Repeated pairs -- keep all, 1,036 extra. Roles: confidence: weight. What a bigger confidence
> means is asked by the first run that reads it." So it IS the weight, it's just not being used
> yet because it hasn't asked me whether bigger means stronger or longer. Fine, I sort of get
> it. But the main screen said "no weight", and that's what I'd have screenshotted. Somewhere
> else I saw "confidence: numbers, not used" -- that's better, but it's still three different
> ways of saying one thing.

### Verdict on the file

> Worth an afternoon? Honestly, maybe. It's one component, it has real hubs, and nothing's
> missing. But almost half the edges are the same pair reported by different sources, and 150
> have no confidence. So before I do anything I'd merge the pairs and ask the colleague what NA
> means. The tool told me all of that in about two minutes, which is faster than me in pandas.
> What's off: 1,036 repeated pairs, 150 NA confidence scores, two proteins in the file with no
> edges, and the screen saying "no weight" after I set one.

## After the task

**Single Ease Question: 5 out of 7.** Getting it loaded was easy, and it stopped me before I
loaded a broken column. What took longest was working out whether my weight had actually loaded.

**Would I use it instead of my current tool?** "For a first look at a file somebody sends me --
yes, probably. I'd normally do value_counts and a groupby in a notebook for ten minutes to find
the duplicates and the NAs, and this just told me, with the counts. And it says the file doesn't
leave the browser, which is the only way I'd ever put real data in it. I'd still check the
numbers in Python before anything goes in a deck. And if it tells me 'no weight' when I set a
weight, I'm going to double-check everything else it says too."

## Problems

| Screen | What happened | Severity (1-4) |
|---|---|---|
| Graph after loading, Statistics | The Edges line says "no weight" right after the participant made confidence the weight. He read it as the weight being dropped. The import report says the weight is kept but not used yet, and the step after loading says "confidence: numbers, not used". That is three wordings for one state. | 3 |
| Graph after loading | The 150 edges without a weight are not mentioned anywhere on the main screen. The dialog reported them, but after Load the fact is only in version history. | 3 |
| Graph after loading | Nothing near the graph says that degree is inflated because repeated pairs were kept. Big labelled hubs invite "these are the important ones", even though each one counts every evidence source. | 2 |
| Open dialog, confidence problem | The same fix appears twice: the "Choose how to read it" box on the issue row and the "Read as" box on the left. It is not clear that they are the same control. | 1 |
| Start screen | Nothing says a file can be dragged onto the window or which formats Open accepts. "Open..." sits small, below the samples. | 1 |
| Start screen | The "Protein interactions, 300 proteins" sample looks like the colleague's file (`ppi-core-300`), so he wondered whether he had been sent the sample. | 1 |
| Graph after loading | The file chip is cut off ("ppi-core-300-..."). | 1 |
