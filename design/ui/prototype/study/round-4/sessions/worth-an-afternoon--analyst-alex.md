# Session: is this file worth an afternoon? -- Analyst Alex

Participant: Alex, data analyst on an operations analytics team at a logistics company. Computes in
NetworkX, draws in Gephi, pastes into PowerPoint. Checks counts before anything else. Gives a new
tool about five minutes.

Task as given by the moderator: "A colleague sent this file. Is it worth an afternoon?"

The file: `ppi-core-300-evidence.tsv`, a tab-separated file of protein pairs with a `source`
column and a `confidence` column. Alex opened it in a text editor first (2,299 lines, so 2,298 rows
plus a header) and saw "NA" in some confidence cells.

Screens seen, in order, as a participant sees them (design notes hidden):

- `shots/tasks/worth-an-afternoon/01-start-screen.png` -- the start screen, first visit
- `shots/tasks/worth-an-afternoon/02-load-step-blocked.png` -- the load step, confidence read as text
- `shots/tasks/worth-an-afternoon/03-load-step-policy.png` -- the load step, repeated pairs
- `shots/tasks/worth-an-afternoon/04-frame-at-rest.png` -- the file loaded, nothing run
- `storyboards/first-look.html` and its frames (`shots/record/screens__first-look--s4.png`,
  `--s6a.png`, `--s6b.png`) -- someone else's walkthrough of a first visit, which the moderator
  also handed over

---

## 1. Start screen

> "Open a graph." Right under it: "Files stay on this computer. graphty reads them in this browser
> and uploads nothing." OK, good, that's the thing I look for first and it's where I'd load the
> file. Honestly this one's protein data from a colleague, not our suppliers, so I care a bit less
> today -- but if this goes well the next file will be ours, so it matters.
>
> "Projects are kept in this browser." Hm. Our laptops wipe Chrome data sometimes when IT pushes a
> policy. So my project lives in... the browser cache? If that goes, the afternoon goes. I'd want
> to know I can save a file somewhere. Not blocking, but I'm noting it.
>
> Four samples. Karate club, Les Mis, protein interactions, bank transfers. I'm not here for
> samples, I have a file. "Open..." -- there. One click. Fine.
>
> The top bar is completely empty. No name, no menu, nothing. Slightly weird, looks unfinished. And
> nothing about what this costs or who makes it. If I like it, the first thing my manager asks is
> "is it approved" and "does it cost anything", and I've got nothing to point at.

Clicks "Open...", picks the TSV.

## 2. Load step, first view: confidence read as text

> OK, a dialog. "Open ppi-core-300-evidence.tsv." Format "TSV, tab, header row" -- right. "Each row
> is: An edge." Right. Ends protein_a -- protein_b. Undirected. Yeah, protein interactions, I'd
> assume undirected.
>
> Issues, 2. First one, highlighted: "confidence is read as text: 150 of 2,298 scores are NA." Yep,
> I saw those NAs. That's the pandas thing where one NA and the whole column is object dtype. Good
> that it caught it, most tools just silently make it a string and then your filter doesn't work
> and you don't know why.
>
> The dropdown's already open: "Number, NA as missing -- 2,298 edges; 150 of them with no
> confidence." "Number, leave out the rows with NA -- 2,148 edges." "Text." It tells me what each
> one loads, in rows. I like that, that's the number I'd want. I'll take NA as missing -- I don't
> want to throw rows away before I know what they are.
>
> Second issue: "865 pairs appear more than once. Each row is one evidence source for a pair."
> Huh. So the same two proteins show up once for experiments, once for text mining, once for
> databases... That's a real thing about this file, and I would not have spotted it until I did a
> groupby. OK, that's actually useful.
>
> Bottom: "What will load: nodes 300, edges 2,298." Matches my line count. Good. "2 proteins have no
> partner in the file: GSK3B, NOTCH1. They are loaded unconnected." Wait -- how do they have no
> partner if every row is a pair? ... Oh, maybe they're only in rows it's... no, I don't know. I'd
> go look at the raw file for GSK3B. Named, at least. I can check it.
>
> "Weight: No numeric edge column." That's because I haven't switched it to a number yet. Fine.
>
> One thing: the header says "Issues 2" in yellow and I thought I was blocked, but the Load button
> is blue. So I can just load? It's a warning, not an error. OK.

## 3. Load step, second view: repeated pairs

> Now confidence says "Number, NA as missing". Source is "Category, 4 values", role "Edge type" --
> it figured that out on its own. Nice.
>
> Wait, there's a "Recent" list behind the dialog now: "Human protein interactions (300 proteins),
> Sep 21." I've never opened this before. Where did that come from? Did my colleague's thing get in
> here somehow, or did I open a sample and forget? On the first screen there was no Recent at all.
> That bugs me a bit -- what's in "my browser" that I didn't put there?
>
> The repeated-pairs dropdown: "Keep each: 2,298 edges -- one edge per row... A measure that needs
> one link per pair combines them itself and says so on its result." And "Combine into one: 1,262
> edges -- one edge per pair of proteins, with its highest confidence. The source column is not
> kept."
>
> Hm. For "is it worth an afternoon", honestly I'd combine -- 1,262 pairs is the real network. But
> it throws away source, and source is probably the interesting column. Highest confidence, not
> mean or sum -- I'd want to pick that. I'd do this part in pandas, frankly: groupby, agg, done.
> I'll keep each, since it says measures sort it out themselves. I'm trusting that sentence. We'll
> see.
>
> "with no confidence: 150." "Weight: confidence, not used yet." OK so it knows confidence is a
> number now and could be a weight. Good.

Presses Load.

## 4. The file loaded, nothing run

> Hairball. Well -- not a total hairball. I can see maybe six or seven lumps around the edge and a
> dense middle. Labels on a dozen: UBC, UBB, HSP90AA1, AKT1, MYC, TP53... I know TP53, that's the
> cancer one, everybody knows that one. "Labels: the 12 proteins with the most partners. 2 more
> hidden where they overlap." OK, so the labelled ones are the hubs. Most partners -- partners as in
> distinct proteins, or rows? Because with repeats, a pair from three sources is three rows.
>
> Top left: "Nothing has been sent from this project." Good. Left rail, "Assistant. Off. Nothing is
> sent." Assistant -- is there an AI in here? It says off. Fine. Leave it off.
>
> Statistics on the right. First line: "Loaded: ppi-core-300-evidence.tsv, undirected, NA read as
> missing, repeated pairs kept, no numeric edge column."
>
> "No numeric edge column"? I literally just told it confidence is a number, and the dialog said
> "Weight: confidence, not used yet." Now it's "no numeric edge column." Which is it? Did my choice
> not stick? This is exactly the kind of thing -- this is Gephi reopening without my colours. I
> don't know what state I'm in.
>
> Nodes 300, edges 2,298. Matches. Connected components "3 (2 isolates)" -- that's the GSK3B and
> NOTCH1 it warned me about, plus one big piece. Consistent. Good. I can see two dots floating off
> on their own on the canvas, top right and bottom. Matches.
>
> Density 0.0281. Hang on. 300 nodes undirected, that's 300 times 299 over 2, 44,850 possible
> pairs. 2,298 over 44,850 is about 0.051. 0.0281 times 44,850 is... about 1,260. That's the 1,262
> pairs number from the dropdown. So density is counting pairs and "Edges" is counting rows, on the
> same panel, right next to each other. I can live with either, but not both without a word. If I
> put "density 0.028" and "2,298 edges" in one sentence to anybody who checks, I'm the one who looks
> sloppy. The little (i) next to density -- I'd hover it and hope it says so.
>
> Degree distribution, tiny bar chart, no axis. Hovering says "Degree 0 to 63." 63 partners, or 63
> rows? Same question again.
>
> "Attributes 2." Presumably source and confidence. "5 more" -- more what? More statistics I guess.
>
> Left panel: "Graphs: Evidence rows." Is that my graph? It's called "Evidence rows"? I didn't name
> it that. I guess because each row is evidence. Fine, weird name. "Full graph" button up top --
> that's a filter, I think. "Sets and paths", "Views." Don't need those yet.
>
> Right side: "Style stack" with "Base style." Style stack. I don't know what that is and I'm not
> clicking it now. "Results" with a plus. That's where I'd go.
>
> "Overview: General / Change overview..." -- no idea. Is General a kind of analysis? Skip.
>
> So: is it worth an afternoon? What I actually need now is betweenness and communities, like two
> clicks, and whether there's real group structure or it's one blob. Where do I type "betweenness"?
> I don't see a search box. There's a lightning bolt on the bottom toolbar -- no label. "Results +"
> is the only thing that says results. I'd click that plus and expect a list of algorithms. I'd go
> there first; the lightning thing I'd only try if the plus didn't have it.

(The mocks end here for this file. The moderator points him to the other walkthrough.)

## 5. The other walkthrough (first-look storyboard)

> This is somebody else's session -- Les Mis, not my file. It's a long page, I'm going to look at
> the pictures and the numbers, not the paragraphs.
>
> This looks like a different app. Left rail has "Results" and "Assistant," there's a blue
> "Export..." button top right, and styles are on the left. My screen had "Data" in the rail and
> the styles on the right. Which one is the real one? If the menu moves between versions, that's
> the Gephi tutorial problem all over again.
>
> Frame 6a: she types "who matters most" in a search box and gets "Betweenness -- who sits between
> the groups", "PageRank -- who is tied to well-tied characters", "Closeness -- who is near
> everyone", "Degree -- who has the most direct ties, already shown as size." OK. That. That's what I
> wanted on my screen. I'd type "betweenness" rather than "who matters most", but a one-liner of
> what each one means, I can say that to my director. And "value's meaning is not set, so it runs
> unweighted" -- right, so on my file betweenness would ignore confidence too. At least it says so.
>
> So the lightning bolt is the search. Nothing on my screen told me that. I'd have gone to Results.
>
> Frame 6b: Betweenness (unweighted), "Exact." A histogram with a scale, 0 to 0.547. "47 of 77
> characters score 0. Valjean alone scores 0.547; next is Gavroche at 0.163." Top nodes list, 1 to
> 5, "72 more." Honestly, that's the slide. That's what gets asked: top five and why. If that
> 0.547 matches NetworkX's normalized betweenness on Les Mis, I'm interested. I'd check it in
> Jupyter before I believed it.
>
> But the text beside it says "0.57" and "next is Myriel at 0.177," and the picture says 0.547 and
> Gavroche 0.163. And the text for frame 4 says "1 component, 0 isolated, density 0.0868," the
> screen says 2 components, 1 isolated, 0.0865, and a self-loop. Look, I know it's a mockup. But I
> read numbers, that's what I do, and two numbers for the same thing is what makes me stop trusting
> a report.
>
> Frame 4 also has "value -- weight: unknown" and a dropdown "A bigger value means...". That's
> clearer than my screen's "no numeric edge column". It asks the question instead of pretending
> there's no column.
>
> No communities anywhere in either walkthrough. That's half of what I'd want to know about this
> file -- are those lumps real groups? And nothing about exporting the numbers to a CSV.

## 6. Verdict

Moderator: "So -- is it worth an afternoon?"

> The file? Probably yes. 300 proteins, one big piece plus two strays it named, visible lumps, a
> dozen obvious hubs. And the fact that 865 pairs are repeated by source is the interesting bit --
> I'd want to know if the hubs are hubs because they're really central or because every database
> mentions them. That's a question worth an afternoon.
>
> Did the tool tell me that? Partly. The load step did more for me than Gephi does -- the NA thing
> and the repeated pairs, with counts for each option. That's genuinely good; that's the "check the
> data first" step done for me. Then it drops me on a gray blob with numbers that disagree with
> each other (density versus edges, "no numeric edge column" after I set one), and I can't find
> where to run betweenness without having seen someone else's walkthrough.

**Single Ease Question (1 = very difficult, 7 = very easy): 4.**

> Getting the file in: 6. Deciding anything from what I got: 3. Split the difference. What took
> longest was the density number -- I spent more time working out why it's 0.028 than on anything
> I actually wanted to know.

**Would he use this instead of his current tool?**

> Instead of Gephi, for the first look at a file someone sends me -- maybe, yes. The load step
> alone beats opening it in Gephi and finding out later that a column came in as text. It runs in
> the browser with no install, which on my laptop means no IT ticket, and it says it uploads
> nothing, right where I load.
>
> Instead of NetworkX -- no. Not until I've run betweenness on something I know and the number
> matches, and not until I can get the top-N out as a CSV. And I'd still pre-aggregate the
> repeated pairs in pandas, because I want to choose max versus mean, not have it chosen.
>
> And I'd need to know two things before I'd say it to my manager: what it costs or who's behind
> it, and whether "kept in this browser" survives IT wiping Chrome.

---

## Observer notes

What the session showed, most serious first.

1. **The loaded frame contradicts the load step about the weight.** Alex set confidence to
   "Number, NA as missing"; the load step then read "Weight: confidence, not used yet". The frame's
   state line reads "no numeric edge column". He read this as his choice not having stuck -- the
   exact "reopened without my colours" fear the persona carries. The first-look storyboard's frame
   4 ("value -- weight: unknown", with "A bigger value means...") is the reading he trusted. The
   fixture for this dataset (`datasets.ppiEvidence.frame.edgesLine`) says "no numeric edge column"
   and the state line takes that branch.
2. **Density and Edges count different things on the same panel.** Edges shows 2,298 (rows, repeats
   kept); density 0.0281 is 1,262 pairs over 44,850. Alex did the division in his head within a
   minute. Nothing says which count each reading uses. Degree distribution ("Degree 0 to 63") and
   the label caption ("most partners") raise the same rows-or-pairs question.
3. **No visible way to run a measure from the resting frame.** He looked for a search box, found
   none, and chose "Results +". He did not recognise the unlabelled lightning button as the place
   to type "betweenness" until he saw the storyboard. First click on the resting frame for "run
   betweenness": Results +.
4. **The storyboard's captions disagree with its own screens.** Frame 4 caption: 1 component, 0
   isolated, density 0.0868; screen: 2 components, 1 isolated, 0.0865, 1 self-loop. Frame 6b
   caption: Valjean 0.57, next Myriel 0.177; screen: 0.547, next Gavroche 0.163.
5. **The storyboard shows older chrome than the resting frame** (Results and Assistant in the rail,
   Export top right, Styles in the left panel, versus Data in the rail and the style stack on the
   right). Alex asked which one is real and connected it to menus that move between versions.
6. **A Recent project appears between two views of the same load step** ("Human protein
   interactions (300 proteins), Sep 21"), on a first visit where the start screen showed no Recent
   section. Alex read it as something in his browser he did not put there.
7. **"Issues 2" in warning yellow read as blocking** until he noticed Load was enabled.
8. **"Projects are kept in this browser"** raised the question of what survives a managed-Chrome
   data wipe. He wants a file he can save.
9. **No word on cost, licence or who makes it**, anywhere he looked; the start screen's top bar is
   empty. For Alex this is the second question after where the data goes.
10. **Words he skipped as jargon or could not place:** "Style stack", "Overview: General / Change
    overview...", "Evidence rows" as the graph's name, "5 more" under Statistics, "Assistant".
11. **Combine into one keeps the highest confidence with no choice of mean or sum**, and drops
    source. He kept each rather than lose the source column, and said he would pre-aggregate in
    pandas.
12. **Communities and CSV export were absent** from everything he was shown; both are on his list
    for "is this worth an afternoon".

What worked, in his words or close to them:

- The privacy line at the point of loading, and "Nothing has been sent from this project" on the
  loaded frame.
- The load step catching NA-as-text and repeated pairs, with the row count each choice loads.
- The two unconnected proteins named before load (GSK3B, NOTCH1) and matching "3 (2 isolates)"
  after load.
- Source detected as a 4-value category and set as the edge type without asking.
- Node and edge counts matching his line count.
- In the storyboard: a one-line meaning for each measure; "unweighted" stated on the result;
  "47 of 77 score 0 ... next is Gavroche" and a top-five list -- "that's the slide."
