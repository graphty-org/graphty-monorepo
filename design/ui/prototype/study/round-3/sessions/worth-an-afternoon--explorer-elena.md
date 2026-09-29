# Is this file worth an afternoon? -- Explorer Elena

Participant: Explorer Elena, a product manager with no graph training (persona:
`study/personas/explorer-elena.md`). Variant: curious afternoon (long clock).

Task as given by the moderator: "A colleague sent you this file. Decide whether it is worth your
afternoon, and tell me anything that looks off."

The file: `ppi-core-300-evidence.tsv`, a protein interaction export with one row per pair of
proteins per evidence source. Planted problem: the confidence column holds 150 "NA" values, so it
is read as text and cannot weigh the connections.

Screens seen, in order, all rendered in the study view (design notes hidden) at 1440 by 900:

1. Start screen -- `shots/r3-elena-afternoon-start-screen.png`
2. Load step, confidence read as text, Load off -- `shots/r3-elena-afternoon-load-step-blocked.png`
3. Load step, confidence fixed, the duplicate-rows choice open -- `shots/r3-elena-afternoon-load-step-policy.png`
4. The loaded graph -- `shots/r3-elena-afternoon-frame-at-rest.png`

## Transcript

### 1. Start screen

> OK. So there's... four pictures. Karate club, Les Miserables, protein interactions, bank
> transfers. These are demos, right? I don't have a karate club.

She looks at the four thumbnails for a while.

> Protein interactions, 300 proteins. Huh. The file Priya sent me has "ppi" in the name -- is
> that protein something? Maybe it's the same thing? I'm not going to click the sample, I want
> *her* file.

She hovers around the page looking for an upload area.

> Where do I put the file? There's no big "drop your file here" box. ... "Open..." -- OK, that's
> probably it. It's kind of tiny for the one thing I came to do.

She drags the file from her Downloads bar onto the middle of the window instead of clicking
Open.... (The prototype would take the drop and go to the next step; in the mock she clicks
Open....)

> I didn't see anything telling me what this page even is, by the way. It's just "Samples" and
> then some rows. Is this the app or a landing page?

Moderator note: the start screen's title ("Open a graph") and the line "Files stay on this
computer" were not visible in the study render she saw. See the notes at the end.

### 2. The load step, Load is off

> Whoa. OK, that's a lot of boxes. "Format", "Each row is: An edge", "Ends: protein_a --
> protein_b", "Direction: Undirected". I don't know what any of this wants from me.

Her eye goes straight to the red.

> Red X. "confidence is read as text, so it cannot weigh edges." ... I don't know what "weigh
> edges" means. Is that bad? It's red, so it's bad.

She reads the second line.

> "150 of 2,298 values are NA; the rest are numbers between 0 and 1." OK, *that* I get. There
> are blanks. Priya's export has blanks in it. Figures.

She scrolls her eye down the table on the right.

> PSMA4, PSMD2, coexpression, NA in red, NA, NA, NA... yeah, those are the blank ones. So her
> file's broken? Or is it that I opened it wrong? I probably picked the wrong thing.

The Load button is grey. She notices only after trying to click it.

> Load doesn't do anything. ... Oh, down at the bottom: "Load is off: choose how to read
> confidence". OK. So I have to fix it before it'll let me in. At least it tells me which thing.

The "Read as" menu next to confidence is already open (the mock shows it open). She reads the
options.

> "Number, NA as missing -- 2,298 edges; 150 of them without a weight." "Number, drop the rows
> with NA -- 2,148 edges; the 150 rows are not loaded." "Text -- cannot weigh edges."
>
> I'm not dropping anything, I don't know what those rows are. I'll keep them all. First one.
> "NA as missing" sounds right, that's what NA means anyway.

She picks "Number, NA as missing". She has not touched the "Role: Weight" box beside it and does
not look at it.

> I kind of like that it tells me the numbers for each choice, how many I end up with. That's
> the part that's like our dashboard.

### 3. The load step, the duplicates choice

The red issue is gone. One yellow issue is left.

> "1,036 extra parallel edges." Parallel edges? ... "Several rows join the same two proteins, one
> per evidence source." OK, so the same pair shows up more than once. That's duplicates.
>
> A thousand duplicates out of two thousand rows? That's... half the file is duplicated? That
> looks off. I'd tell Priya her export doubled everything.

She opens the dropdown.

> "Keep all: 2,298 edges. One edge per row, so degree counts every source. A metric that needs
> one edge per pair merges them by max of confidence and says so on its result." ...
>
> I stopped reading at "degree". "Merge into one, max of confidence: 1,262 edges. The source
> column is not kept." Not kept -- no. I don't want to lose stuff. Keep all.

She leaves it on Keep all.

> Down here it says 298 nodes and 2,298 edges, 150 without a weight. And "298 nodes -- 2
> proteins in the file have no interaction: GSK3B, NOTCH1."
>
> Wait. If every row is a pair, how is a protein in the file with nothing next to it? Did it
> drop them or did I? ... I'll tell Priya about those two, maybe they're typos on her end.

She clicks Load.

### 4. The loaded graph

> Ooh. OK, there it is. That's kind of nice, it's got these lumps around the outside.

She looks at the picture for a few seconds.

> So the ones in the middle with names on them -- MAPK1, HSP90AA1, MYC, AKT1, UBB, UBC, YWHAZ --
> those are the important ones. They're in the middle and they're the only ones with names. That's
> what I'd tell Priya: these seven run everything.

(Misreading: the names are labels on the most-connected proteins, and being in the middle of the
drawing is where the layout put them; she does not check what the labels mean, and nothing on
screen says.)

> And there's like five groups. Top left, top middle, right, bottom left, bottom. Five teams? Five
> ... whatever proteins have.

She moves to the right side.

> "Statistics." Nodes 298, edges 2,298. OK, matches what it said before. "Undirected, 1,036
> parallel, no weight."
>
> No weight? I just picked the number thing for the weight so it would *have* a weight. Did it
> not take it? ... Maybe I clicked the wrong one. I thought it said "NA as missing".

She looks back and forth but has no way to see the choice she made.

> Density 0.0285. Is that a lot? There's a little (i). I'm not going to hover every (i).
> "Connected components 1." Good? "Degree distribution" and a little bar chart. No idea.

She glances at the left rail.

> "Assistant. Off. Nothing is sent." Off? Is something broken? I didn't turn anything off.

She tries clicking the biggest dot in the middle, then types "MYC" but there is no obvious search
box on the canvas; she notices the magnifier next to "Graphs" only when asked by the moderator
whether there is a way to find one protein.

> Oh. It was right there. OK.

Her answers get shorter here. She is not trying new things.

### Her answer to the task

> Is it worth my afternoon? ... Honestly, I can't tell from this. It's a nice picture, and it
> loaded fast, and it told me about the blanks before I got in, which is more than Excel does.
> But it's proteins, and nothing on the screen tells me what's *interesting*. I got a hairball
> with seven names on it. If I had to write one sentence to Priya it would be "the file has 150
> blanks, about half the rows are duplicates, two proteins don't connect to anything, and MAPK1
> and friends are in the middle." I don't know if any of that is right.

Things she said looked off, in her words:

- "150 of the confidence values are NA -- blanks in her export."
- "Half the rows are duplicates" (they are one row per evidence source, which the message said
  and she read past).
- "Two proteins, GSK3B and NOTCH1, are in the file but not in the picture."
- "It says no weight after I told it to use the numbers."

## Single Ease Question

3 of 7.

> It let me in, eventually, and it told me why it wouldn't. But I had to make two decisions I
> didn't understand to get there, and then the end screen told me something different from what
> I picked.

## Would she use this instead of her current tool?

> Instead of what -- I don't have a tool for this, I have a spreadsheet and a pivot table. For
> my own spreadsheet, maybe, if it opened without the "edges, direction, role" stuff. It's in the
> browser and it didn't want an account, that's already better than the Java thing. But for this
> file, I'd send it back to Priya and ask her what she wanted me to look at.

## Notes for the design team (moderator, out of character)

- **The loaded graph contradicts the load step.** The load step shows confidence set to "Number,
  NA as missing" with the role Weight and "without a weight: 150"; the loaded graph's Edges line
  reads "undirected, 1,036 parallel, no weight" and Attributes reads 2. The frame's numbers come
  from the ppiEvidence fixture, which records a load where confidence stayed text -- a load the
  load step itself refuses ("Load stays off while its role is Weight"). Either the frame should
  show the weighted load ("weight: confidence, 150 missing") or the fixture should record a load
  path that is actually reachable. For Elena this was the moment her trust dropped: she assumed
  she had clicked wrong.
- **Nothing after Load says what was chosen.** She could not check her own confidence and
  duplicates choices from the graph screen. The Edges line is the only echo, and it was the one
  that contradicted her.
- **"Weigh edges", "Role: Weight", "parallel edges", "degree"** carried the two decisions she had
  to make. She chose by avoidance (never drop, never merge), not by understanding. The per-option
  counts ("2,298 edges; 150 of them without a weight") were what she actually used and liked.
- **"1,036 extra parallel edges" read as a broken export** ("half the file is duplicated"), even
  though the second line explains it. The word "extra" does the damage.
- **"2 proteins in the file have no interaction"** puzzled her: in an edge list every row is a
  pair, so she could not see how a protein is in the file without one. She blamed the colleague's
  file.
- **Misread encodings:** the labelled proteins near the centre became "the seven that run
  everything"; nothing on screen said why those seven carry names.
- **The Assistant's "Off. Nothing is sent."** read as a fault ("is something broken?").
- **Missed control:** the search magnifier beside "Graphs", found only on a prompt.
- **Study kit defect (not a design finding):** in the study view, the start screen hides its own
  title "Open a graph" and both privacy lines ("Files stay on this computer...", "Projects are
  kept in this browser."). kit.js's study mode hides every h1 and p outside the product classes
  it lists (`.k-app`, `.k-modal` and others), and the start screen's app frame is `.ss-win`, not
  `.k-app`. Participants in this round saw a start screen with no title and no data-location
  line; any finding about that line from a study render is void until the page or kit.js is
  fixed.
