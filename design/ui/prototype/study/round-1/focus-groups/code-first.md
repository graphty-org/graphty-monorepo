# Focus group: code-first users and access

Round 1 of the simulated user study. Four simulated participants reviewed the gallery (start
screen, import dialog, results panel, export dialog, the failure-and-recovery, undo and
keyboard-only storyboards) and discussed them over three rounds: first impressions, trust and
export, then what would make each of them switch or quit.

Participants (all simulated, built from the graphty personas plus public forum and video
material):

- **expert-emma** -- network scientist; works in networkx and igraph; referees papers.
- **ml-engineer-recsys (Chris)** -- recommender-systems engineer; data lives in Parquet on S3 and
  in notebooks.
- **knowledge-engineer (Min-ji)** -- builds RDF knowledge graphs; checks every figure against
  SPARQL; red-green colour blind.
- **screen-reader-analyst** -- analyst who uses NVDA and a braille display; checks colleagues'
  figures.

Caveat for everything below: these are simulated participants. Treat their statements as
hypotheses to test with real people, not as evidence of real behaviour. The screen-reader analyst
said so themselves about the spoken-output expectations in the keyboard storyboard.

## Transcript

### Round 1 -- first impressions

**expert-emma:** Five seconds on the start screen, and the purpose I'd write down is: "Open a graph file in the browser and look at it." The first thing I actually read was the lock line, "Files stay on this computer... uploads nothing." Good, that's the right first sentence. But I'll want the network tab to agree, and I want to know whether you count my nodes the way Cosmograph does.

On the betweenness panel, "Exact. Unweighted, undirected. WebGPU." is more than Gephi has ever told me. And "WF-corrected" on closeness tells me someone has read Wasserman and Faust. What it doesn't say is whether 0.138 is normalized, and by which convention. networkx and igraph differ on exactly that, and a number without its normalization is useless to me.

The undo storyboard is a clerk's problem, not mine. "Copy ids" is the one thing in it I'd use.

The keyboard storyboard at least admits it proves nothing until a real NVDA user has done the task. I respect that more than most of what's in the gallery.

What I didn't find anywhere in the first minute is code. There's no "open this from Python" and no seed field. I'm skeptical of the whole premise until I see those.

**ml-engineer-recsys:** Five-second read: "open a graph file locally, poke at it." The first thing I clocked is the format line. It says CSV, JSON, GraphML, GEXF, GML, DOT, Pajek and Neo4j. There's no Parquet. My interaction table is Parquet in S3, tens of millions of rows. If I have to write a conversion script, I'll just stay in the notebook where the script already runs. The "uploads nothing" line is the only thing on that screen my privacy reviewer would care about, and it's in the right place.

The samples are karate club, Les Mis, proteins and bank transfers. None of them is bipartite, so none tells me whether it understands users versus items.

Failure-and-recovery: the undo and Previous selection mechanics look fine, the way VS Code's edit menu is fine. But it's about recovering a selection. The failure I actually hit is a wrong denominator: weights silently ignored, a filter I forgot about. I did like that "counts edges read as length 0" is spelled out.

Keyboard-only: the walk from a node to its strongest neighbours is basically my "explain this recommendation" hop. If Shift+Down gives me a 2-hop ego graph faster than a mouse does, that's the first thing here I'd actually use.

**knowledge-engineer:** Purpose, in one line: a viewer that tries hard not to lie about a graph it has been handed as a property graph. That is not my kind of graph, but I will judge it on its own terms first.

What I actually respect is the failure-and-recovery storyboard. There is a weight column whose meaning is "Unknown" until you say otherwise, a note that the calculation is a variant and not the textbook version, and a count that stays exact when the drawing hits its limit. Most tools I have used get every one of those wrong, and they do it silently.

The keyboard storyboard is honest about itself. It calls itself a structural walkthrough, not proof, and I will hold it to that.

My first look was the import dialog, as always. It offers CSV, GraphML and so on, and there is an "Edge type" role, so I could point it at my predicate column. What I cannot see is what happens to a row whose object is a literal. Does "Acme Ltd" become a node? The preview says "3,000 nodes" but never says how many rows went in and what each one turned into. Until it tells me that, this is fine for a demo, not for RDF.

Also, the storyboard captions are full of frame codes like "(A3)". I skimmed straight past them.

**screen-reader-analyst:** I read the pages rather than looked at them, so my five seconds went on the heading list. As far as I can tell, this is a graph tool whose designers wrote down, frame by frame, what NVDA should say. I've almost never seen that, and it's the only reason I kept reading.

Now the complaints. When I land on the canvas, it switches me into application mode and plain Down pans a view I can't see. That's a wasted keystroke on every visit. Why doesn't Down go into the data? Double-pressing Space left me not knowing whether 53BP1 was in or out. The storyboard admits it, and "read it back" isn't a fix. Also, "rank 247" for degree 5: is that rank by degree, with ties? Say so once.

Someone also wrote my "Expects" lines for me. They're close, which is flattering and a little creepy. Test them on a real NVDA user before anyone believes them.

In the failure storyboard, "value as distance" under the result's name is exactly what I've been asking for since a colleague's betweenness figure turned out to be normalised and mine wasn't. But is that line spoken when the result arrives, or only printed?

### Round 2 -- trust and getting data out

**expert-emma:** First, a correction. I said there was no seed. There is one: sampled betweenness says "Estimated from 50 sources, seed 7," and it puts ~ on every estimated value. That's better than networkx's docs manage. But it's marked "proposed," and a seed that's only proposed doesn't count as a seed yet.

Trust is still my problem. 0.138 for MAPK1 on 300 nodes looks like it's normalized by (n-1)(n-2)/2, but I'm guessing. Print the convention on the state line and I'll check it against networkx myself. Show me "Compare with randomized baseline" with a null model I can name, such as configuration model or degree-preserving swaps, and not just "randomized."

To the recsys engineer: Parquet isn't really your blocker. The real blocker is that nothing takes a graph from Python. I'll grant the export form one thing: it doesn't pretend to be a notebook. But I found no "reproduce this in code" snippet on it. That snippet is what would make me switch.

The knowledge engineer's row accounting and my normalization question are the same complaint. Tell me what you did to my input.

To the screen-reader analyst: on ties, "rank 2 of 300" shows the same blind spot. Tie rule, please.

Would I switch? For the client deck, maybe. For the analysis itself, no.

**ml-engineer-recsys:** Emma, there is a seed. On the results panel, a sampled betweenness shows "Sampled, 50 sources... Seed 7" under the name, and it's recorded so the run can be reproduced. That's the most trustworthy line in the whole gallery. It tells me the denominator, whether it's exact, and how to reproduce it. I'd sign off on that format as long as normalization gets added to it, like you said.

The part that fails my workflow is export. The scripting entry is "Graph file: nodes, edges and attributes, for Gephi, Cytoscape or a script." I can't tell from that whether my original ids survive or whether the computed columns come with them, and there's no Parquet. If I can't get the ego graph back into a DataFrame keyed on my user_id, then it's a screenshot tool.

The comparison screen has "Compare with randomized baseline," which is nice, but the baseline I need is Adamic-Adar or Jaccard sitting next to my own model-score column, sorted by where they disagree. Nothing here does that.

Is it a widget or an app? A widget. If graphty-element rendered inside a Jupyter cell from a DataFrame, I'd use it every week. As an app, it's back in the drawer with Gephi.

**knowledge-engineer (Min-ji):** Trust first. Emma is right that a number needs its normalization convention. My version of her point is that a count needs its unit. The load preview says "3,000 nodes", but I load a subject, predicate, object CSV, so I need to see how many rows went in, how many became edges, how many were literals, and how many were dropped. Without that I cannot check it against my SPARQL COUNT, and one unexplained mismatch ends my trust in every figure here.

On export, the graph-data section is marked "not built yet". That is the part I care about. Whatever I change in a viewer has to come back out as data, as triples or a change list. A PNG is for stakeholders. It does not go back into my knowledge graph.

On RDF import, I will not ask you to pretend it exists. Put Turtle and N-Triples on the roadmap in writing, or say plainly that the tool is not for RDF. I would respect either.

For Emma, a notebook does not replace this. My SPARQL already runs in a notebook. What I lack is a picture of a class-level summary.

Screen-reader colleague, I agree with you. A shape plus a label beats colour alone, and I cannot tell red from green.

**screen-reader-analyst:** Emma, there is a seed. The sampled-betweenness editor shows "Sample size 50, Seed 7" and says it's recorded so the run can be reproduced. That's the first thing in this gallery that treats a number as something other than a rumour. I found it by reading the page, though, and not because anyone announced it.

That points at my bigger complaint. For the protein betweenness, the text says the screen reader hears "Betweenness finished on the CPU. On full graph, 300 nodes." That tells me the engine, which I don't care about. The part I do care about, "Exact. Unweighted, undirected," is only printed. So is normalisation, and like Emma I still can't find it stated anywhere. If the spoken line has room for "CPU", it has room for "normalised". Otherwise I'm back to asking a sighted colleague what a label says.

I looked for the scripting entry on the export form and it isn't there. The dialog mentions a "methods" section, but I didn't find any "reproduce this in NetworkX" output. Without that I'm not switching. Give me a table I can arrow through, with the settings in its header, and a CSV. Then I'd use this next to my scripts instead of instead of them. And please don't make me go through application mode to reach the table.

### Round 3 -- what would make you switch, or quit

**expert-emma:** Here's what would make me switch. The export dialog already writes a methods text file, and that's the closest thing to a reproduce-in-code snippet in the whole gallery. Screen-reader colleague, it's there, just buried under the figure preview. But read it the way a referee would. "PageRank: power iteration, damping 0.85" gives no tolerance and doesn't say how dangling nodes were handled. "Betweenness: exact (Brandes)" doesn't give a normalization. "Modularity of module: 0.663" doesn't name the community algorithm, its resolution or its seed, and Louvain gives a different answer on every run. Every one of those is a question I'd have to email the author about.

So the one thing I'd change: every number carries its full call, as a line I could paste into networkx or igraph. Something like `betweenness_centrality(G, normalized=True, weight=None)`. Put it in the methods file, on the result's state line, and in what the screen reader says. Min-ji, that's your row accounting too. It's the same line, one level down.

What would make me quit: I run that call myself and get a different number, and nothing here told me why.

For the analysis I'd still stay in the notebook. For the client figure I'd switch the day that line ships.

**ml-engineer-recsys (Chris):** I have to give something back first. On the export form, the nodes table puts the scope, the method and whether it's current in each column header. It also writes a stale PageRank column with a mark instead of leaving it empty. That's better provenance than my MLflow runs have. So the screen-reader analyst's "a table with the settings in its header" is partly built already.

It still doesn't make me switch. Everything here starts from a file I open and ends with a file I save, and my data never passes through a file. What would make me switch is a graphty-element I can call from a notebook cell with a DataFrame, keeping my user_id as the key. It would also need a way to hand me the selection back as ids. That's the whole loop for me: explain one bad recommendation, grab the neighbourhood, and move on.

Emma, I agree the reproduce-in-code snippet is what would win you. For me it only matters if the ids come back unchanged.

The one change I'd make: say on the start screen that this can be embedded as a component, and show the three lines it takes. If that isn't true yet, say so. As it stands I'd quit and go back to matplotlib ego graphs.

**knowledge-engineer (Min-ji):** Here is what would make me switch. The load step already understands the idea: it drops NA rows, gives counts for each choice, and says "no rows-dropped figure, because nothing was dropped." Build that into a reconciliation line on every import, and show it even when the answer is zero: "12,400 rows read, 9,100 edges, 3,300 literals kept as attributes, 0 dropped." Don't hide the line when nothing was dropped. A zero is a figure I can check against my SPARQL COUNT. A missing line is just a missing line.

Here is what would make me quit. I would quit if the graph-data export stays "not built yet" while the PNG export gets polished. Emma wants a "reproduce this in code" snippet, and the recsys engineer wants his user_id back in a DataFrame. We are asking for the same thing: my identifiers and the computed columns, out as data, in the original id space. For me that means an IRI stays an IRI, not a renumbered integer.

The one thing I would change is to make the result's provenance travel with it. Normalization, variant, seed and baseline should go into the export, and into the spoken line as well, as the screen-reader analyst says. Printing them on a panel only helps someone who is looking at the panel.

Would I switch? Not for RDF work. For a class-level picture to show a data owner, I would try it once, if it keeps my IRIs intact.

**screen-reader-analyst:** I'd switch, for exactly one job: checking a colleague's figure without asking them what it shows. The table has what that needs. It follows the live selection, so the canvas, the inspector and the table show the same 14 accounts. It also has "Export table...", which means a CSV I can open in Excel and read on my braille display.

Three things would make me quit. First, if I have to go through application mode and an unseen pan to reach that table. Second, if normalisation stays printed but never spoken. Third, if the results depend on a server. The "uploads nothing" line is why my security review gets past its first question.

The one thing I'd change is to put a result's definition in the result itself, and do it the same way every time. That means the variant, normalisation, tie rule, seed and direction, in the table header, in the announcement and in the export. Emma's convention, Min-ji's row counts and my "rank 247" are all the same request: tell me what you did to my data.

To the recsys engineer: a widget in a notebook doesn't help me. Jupyter output is where screen readers go to die. Build the app's table properly and I'll use it next to my scripts.

## Summary of themes

Severity uses Nielsen's 0-4 scale (0 not a problem, 1 cosmetic, 2 minor, 3 major, 4 catastrophe).
"Independent" means the participant raised it in round 1 before hearing the others; "adopted"
means they took it up after someone else raised it.

### 1. A result does not state its full definition -- normalization above all (severity 3)

- **Who:** Emma (independent, round 1: "a number without its normalization is useless to me");
  screen-reader analyst (independent, round 1: "rank 247 ... with ties?", and "value as distance"
  printed but maybe not spoken); Min-ji (adopted in round 2, as "a count needs its unit"); Chris
  (adopted, "sign off on that format as long as normalization gets added").
- **What is missing:** the normalization convention on centrality values; the tie rule on ranks;
  PageRank tolerance and dangling-node handling; the community algorithm, its resolution and its
  seed behind a modularity figure; a named null model behind "randomized baseline."
- **What already works:** "Exact. Unweighted, undirected.", "WF-corrected", "Estimated from 50
  sources, seed 7" with ~ on estimated values, and "counts edges read as length 0" were each
  praised unprompted. The fix extends an existing pattern; it does not need a new one.
- **Proposed shape (Emma):** every result carries its full call, as a line one could paste into
  networkx or igraph, on the result's state line, in the methods file and in the announcement.
- **Dissent:** none on the need. Only Emma asked for code syntax; the others asked for the same
  facts in words.
- **Discount:** low. Two participants raised it independently with concrete examples.

### 2. The definition is printed but not spoken (severity 3 for screen-reader users)

- **Who:** screen-reader analyst (independent, round 1, sharpened in round 2); Emma and Min-ji
  (adopted in round 3, "and in what the screen reader says").
- **Evidence:** the spoken completion line gives the engine ("finished on the CPU") but not
  "Exact. Unweighted, undirected" or the normalization. Engine is the fact this listener said they
  care least about.
- **Dissent:** none.
- **Discount:** moderate on breadth (one participant owns it), low on validity -- it is a direct
  reading of the storyboard's own announcement text. The analyst also warned that the
  storyboard's "Expects" lines were written for them and must be tested with a real NVDA user.

### 3. Import does not account for what happened to each input row (severity 3 for Min-ji's use, 2 in general)

- **Who:** Min-ji (independent, round 1; the round-3 proposal); Emma (adopted in round 2, "tell
  me what you did to my input").
- **Evidence:** the preview says "3,000 nodes" but not rows read, edges made, literal values kept
  as attributes, or rows dropped. The load step already reports dropped NA rows and hides the line
  when the count is zero.
- **Proposed shape:** a reconciliation line on every import, shown even when every count is zero
  ("12,400 rows read, 9,100 edges, 3,300 literals kept as attributes, 0 dropped").
- **Open question she raised:** what happens to a row whose object is a literal -- node or
  attribute?
- **Dissent:** none.

### 4. Data has to come back out, in the original id space (severity 3)

- **Who:** Chris (independent, round 1-2: ids and computed columns into a DataFrame keyed on
  user_id); Min-ji (independent, round 2: graph-data export is "not built yet"; IRIs must stay
  IRIs); screen-reader analyst (round 2: a CSV of the table); Emma (a reproduce-in-code snippet,
  which is the same need from the method side).
- **Evidence:** the export's scripting entry does not say whether original ids survive or whether
  computed columns come with it. The graph-data section is marked "not built yet."
- **What already works:** the nodes table puts scope, method and currency in each column header
  and marks a stale column rather than leaving it empty (Chris called it better provenance than
  his experiment tracker). "Export table..." gives a CSV.
- **Quit trigger (Min-ji):** the PNG export polished while the graph-data export stays unbuilt.
- **Dissent:** none on the need.

### 5. The methods output exists but is hard to find (severity 2)

- **Who:** the screen-reader analyst could not find it (round 2); Emma found it "buried under the
  figure preview" (round 3). Chris did not mention it.
- **Discount:** partly mock fidelity -- a static export mock may bury what a live dialog would
  not. Re-test discoverability in a working prototype before acting on it.

### 6. Keyboard entry into the canvas wastes the first keystroke (severity 3 for screen-reader users)

- **Who:** screen-reader analyst only (round 1, repeated as a quit trigger in round 3).
- **Evidence:** landing on the canvas enters application mode, and plain Down pans an unseen view
  instead of moving into the data. Pressing Space twice left the selection state of 53BP1 unclear;
  the storyboard admits this.
- **Wanted:** a route to the data table that does not pass through application mode.
- **Discount:** single voice, but it is the only participant this affects and the storyboard
  itself concedes the Space problem. Keep, and test with a real NVDA user.

### 7. No path from code, and no statement of the component (severity 3 for this segment, 1 for the core audience)

- **Who:** Emma (round 1, "no open this from Python"; round 2); Chris (rounds 1-3: Parquet, then
  "a graphty-element I can call from a notebook cell with a DataFrame", selection handed back as
  ids).
- **Proposed shape (Chris):** say on the start screen that graphty-element can be embedded, with
  the three lines it takes -- or say plainly that it cannot yet.
- **Dissent:** the screen-reader analyst ("Jupyter output is where screen readers go to die --
  build the app's table properly"); Min-ji ("a notebook does not replace this ... what I lack is a
  picture"); Emma herself narrowed it in round 2 ("Parquet isn't really your blocker").
- **Discount:** this is a real split in the group, not consensus. It is also partly outside the
  app's scope: a notebook widget is a graphty-element packaging question, not an app screen.

### 8. Format and sample coverage (severity 2)

- No Parquet (Chris, single voice; Emma disputed that it is the real blocker).
- No RDF (Min-ji): she asks only for an honest statement -- Turtle and N-Triples on the roadmap
  in writing, or "not for RDF."
- No bipartite sample (Chris, single voice).

### What they praised (keep these)

- "Files stay on this computer... uploads nothing" as the first line -- Emma, Chris and the
  screen-reader analyst; the analyst named a server dependency as a quit trigger. Emma wants the
  browser's network tab to agree, so the claim must be literally true.
- Stating limits honestly: the weight column meaning "Unknown" until set, "variant, not the
  textbook version", the count that stays exact when the drawing hits its limit (Min-ji); the
  keyboard storyboard calling itself a walkthrough, not proof (Emma, Min-ji, analyst).
- The table following the live selection, so canvas, inspector and table show the same 14
  accounts (screen-reader analyst).
- "Copy ids" (Emma) and the neighbour walk as an "explain this recommendation" hop (Chris).

### Minor

- Frame codes such as "(A3)" in storyboard captions were skipped (Min-ji; severity 1). This is a
  gallery-writing issue, not a product issue.
- Colour alone is not enough; shape plus label (Min-ji, colour blind, agreeing with the analyst;
  severity 2).
- The undo storyboard was judged "a clerk's problem" by Emma and "about the wrong failure" by
  Chris -- their failures are wrong denominators and forgotten filters, not a lost selection.
  Low relevance to this segment, not a defect.

## Group-think effects to discount

- **Convergence on one slogan.** By round 3 all four said some version of "tell me what you did to
  my data," and three explicitly folded the others' requests into their own. The underlying needs
  are real -- normalization, row accounting and tie rule were each raised independently in round 1
  -- but the claim that they are a single feature is a framing Emma introduced in round 2 and the
  others adopted. Design them as related, not as one control.
- **Correction cascade on the seed.** Emma said there was no seed; two participants corrected her
  in round 2 and all three then praised the seed line warmly. Some of that praise is rebound from
  the correction. The durable point is Emma's: the seed is marked "proposed," so it does not count
  until it ships.
- **Late adoption of the spoken-output point.** Emma and Min-ji added "and in the announcement" to
  their round-3 proposals only after the analyst pressed it. Count it as one strong voice with
  agreement, not three independent findings.
- **Reciprocal concession.** Chris opened round 3 by crediting the export table ("I have to give
  something back first"). Discount that as social smoothing; his position did not change.
- **Segment skew.** All four are code-first or data-first experts; two (Chris, Min-ji) are outside
  the app's core audience by their own account. Their consensus says little about the explorer or
  presenter personas.
- **Simulation effects.** These are simulated participants, and the analyst noticed that the
  storyboards had pre-written their expected speech. Findings that rest on how an assistive
  technology actually behaves (themes 2 and 6) must be confirmed with real screen-reader users.
- **Mock fidelity.** The methods output being "buried" (theme 5) and the scripting entry being
  "not there" may be artifacts of static mocks; the "not built yet" and "proposed" labels are
  design state, not fidelity, and stand as findings.
