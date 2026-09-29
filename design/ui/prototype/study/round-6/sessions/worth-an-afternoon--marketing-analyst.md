# Is this file worth an afternoon? -- Jordan, marketing network analyst

Participant: Jordan, a growth-marketing analyst who does "the network stuff" one or two days a
week (Gephi, NodeXL, a colleague's networkx notebook, and a social-listening suite the company
already pays for). Played at laptop width, 1440 by 900.

Task as given by the moderator: "A colleague sent this file. Is it worth an afternoon?"

Screens seen, in order: the start screen, the load step with the confidence column read as text,
the load step with repeated pairs, and the graph after loading. She also opened "Where your data
goes" from the start screen and glanced at the Quick actions list on the first-look storyboard.

Renders: `shots/tasks/worth-an-afternoon/01-start-screen.png`, `02-load-step-blocked.png`,
`03-load-step-policy.png`, `04-frame-at-rest.png`; `tmp/r6-jordan-worth/wdg.png` (Where your data
goes) and `tmp/r6-jordan-worth/fl-s6a.png` (Quick actions, "who matters most").

---

## 1. The start screen

> OK, "Open a graph." Four sample pictures -- karate club, Les Miserables, proteins, bank
> transfers. None of those are mine. I skip samples, always. Where's import? "Open..." is down
> under the cards, small, with a folder. There's no drop zone. I'd just drag the file onto the
> window and see. If it bounced, Open.
>
> Before I drag anything: "Files stay on this computer. graphty reads them in this browser and
> uploads nothing." Good. That's my first question and it's the first line under the title. And
> "Projects are kept in this browser" -- so if I clear Chrome it's gone? Noted. That's a thing I'd
> get burned by once.

She clicks "Where your data goes".

> Right, a real page. "Written so you can forward it to whoever approves software." Print or save
> as PDF. OK, that's -- honestly that's the thing I'd send to IT. "Data leaves the browser only
> through two features, both off until you turn them on: Connect to data source and the
> Assistant." Fine. I'm not reading the rest; the box at the top is the answer. For a file a
> colleague sent -- I don't even know what's in it yet -- this is enough to open it.
>
> The top bar here is just grey and empty on the start screen, then "graphty" shows up once
> I'm opening a file. Whatever. Not important.

## 2. Opening the file

She drags `ppi-core-300-evidence.tsv` in. The load step opens over the start screen.

> "Open ppi-core-300-evidence.tsv." PPI? Protein-protein... it's a protein file. OK, so my
> colleague sent me biology. That's already half my answer, but let's see if the tool at least
> makes it easy to tell what's in it.
>
> Left side: Format, TSV, header row. "Each row is: An edge." Ends: protein_a and protein_b.
> Undirected. OK, that's the part Gephi makes me do in the data lab with a lot of cursing, and
> it's already filled in. It guessed right, as far as I can tell -- two name columns, those are
> the two ends.
>
> Right side, "Issues 2". Yellow. "confidence is read as text: 150 of 2,298 scores are NA."
> NA, like R's NA -- blank. "The rest are numbers between 0 and 1." And it's already dropped the
> menu open for me: "Number, NA as missing -- 2,298 edges; 150 of them with no confidence",
> "Number, leave out the rows with NA -- 2,148 edges; the 150 rows are not loaded", or "Text."
>
> I like that each option tells me how many rows I end up with. That's the thing that bites me --
> the dashboard says 4,000, the download says 3,100, nobody knows which. Here it tells me before I
> press anything. I'd pick "NA as missing." I don't throw rows away when I don't know why they're
> blank.
>
> And there's a little table: "Rows with NA, 5 of 150." Line 29, PSMA4, PSMD2, coexpression, NA.
> So the blanks are coexpression rows? All five I can see are. That's actually interesting --
> maybe one source never gives a score. I'd want to click "source" and see NA counts by source,
> but I'm not going to go hunting.

She picks "Number, NA as missing". The second issue comes up.

> "865 pairs appear more than once. Each row is one evidence source for a pair (parallel edges)."
> OK, so the same two proteins show up three times because three databases said so. In my world
> that's the same account replying to the brand four times. And for me the whole point is the
> count -- four replies is stronger than one.
>
> The options: "Keep each: 2,298 edges -- a measure that needs one link per pair combines them
> itself and says so on its result." Or "Combine into one: 1,262 edges -- with its highest
> confidence. The source column is not kept."
>
> Hm. Highest confidence. What I'd actually want is "combine and count them" -- number of sources,
> or number of replies -- as the weight. Gephi merges parallel edges and sums the weight. I don't
> see that. So I'd keep each, because I don't want to lose the source column, and trust it that
> "a measure combines them itself." Which, fine, but I'd want to see that it said so.
>
> Bottom: "What will load: 300 nodes, 2,298 edges, 150 with no confidence." "2 proteins have no
> partner in the file: GSK3B, NOTCH1. They are loaded unconnected." Good, it names them, it doesn't
> just drop them. "Weight: confidence, not used yet." OK, I understand that -- it knows there's a
> number there, it's not using it for anything. Load.

## 3. After loading

> OK. A grey map. Not a total hairball -- I can see maybe five or six clumps around a dense
> middle, and a few strays off on their own. Labels on twelve of them: TP53, MYC, AKT1, UBB,
> UBC, HSP90AA1, MAPK1... The note in the corner says "the 12 proteins with the most partners."
> So these are the hubs. Degree. The biggest are all in the middle, which, of course they are.
> Degree just tells me the top ones are big.
>
> Right panel, Statistics. I read this part. "Loaded: ppi-core-300-evidence.tsv, undirected, NA
> read as missing, repeated pairs kept, no numeric edge column."
>
> Wait. No numeric edge column? Thirty seconds ago the load screen said "Weight: confidence, not
> used yet." I told it confidence is a number with NA as missing -- it even says "NA read as
> missing" in the same sentence. So which is it? Is confidence a number or not? This is exactly
> the dashboard-versus-download thing. If this were my file I'd stop here and go check the table
> to see if the confidence column came through as numbers.
>
> Rest of it: Nodes 300. "Edges 2,298 (rows)" and "Linked pairs 1,262." OK, that's clear, the
> rows versus the actual pairs, and it matches what the load screen promised. Density 0.0281 --
> skip. "Connected components 3 (2 isolates)" -- that's the main blob plus GSK3B and NOTCH1, which
> it already told me about. Degree distribution, a little bar chart -- skewed, a few big hubs,
> like every network I've ever loaded. "Attributes 2", "5 more".
>
> Is there a table? Bottom: "Table, 300 nodes, 2,298 edges (rows)" with a little up-arrow.
> Collapsed, but it's there, and it's right under the map. Good, I'd have opened that next -- sort
> by degree, check confidence is numeric.
>
> Colour by community -- nothing coloured. The "Style stack" says "Base style" and a plus. Size by
> something -- not obviously. "Quick actions" on the toolbar, that's a word, not an icon, I'd
> click that.

She glances at the Quick actions list on the first-look storyboard (a different sample): typing
"who matters most" lists Betweenness "who sits between the groups", PageRank "who is tied to
well-connected characters", Closeness, Degree.

> "Who sits between the groups." OK, that's the bridge one, that's what I want, and it's in words
> before the formula. That I'd click. And it said "already shown as size" on degree, which is nice,
> it's telling me what's already on screen. I didn't see a "Communities" one in that list but I
> only typed "who matters", so, fair.

## 4. Off-topic

> Honestly, the reason anyone sends me a random file now is because our Twitter pipeline died when
> the API went paid. Everything's a CSV of whatever the vendor feels like exporting. So a tool that
> reads a random TSV without making me define a "schema" first is worth more to me than it
> should be. And I'd want to know: what happens with the whole customer base -- two million rows?
> Nothing on these screens says. There's probably a "too large" screen somewhere; I didn't see one.

## 5. Verdict

> Is this file worth an afternoon? For me -- no. It's a protein network: 300 proteins, 1,262
> pairs, three-ish sources per pair, 150 missing scores that all look like they're from one
> source, and a dense core of the usual hub proteins. I can't tell whether that's interesting
> biology. I'd write back: "It's clean, it loads, 150 scores are blank and look like they're all
> coexpression, the two proteins GSK3B and NOTCH1 have no links in it. If you want to know who
> bridges the clusters I can run that in five minutes, but I can't tell you if it matters."
>
> And the tool got me to that in about three minutes, most of it reading. The load screen did
> the work Gephi's data lab makes me do by hand, and it told me the row counts before I committed.
> That's real.
>
> What I'd dock it for: the "no numeric edge column" line contradicting what I just picked. If a
> tool tells me two different things about my own column in thirty seconds, I start
> double-checking everything else. And no "combine and count" for repeated rows, which is the
> thing I'd actually want for a mention file.

**Single Ease Question: 5 of 7.** Getting the answer was easy; the contradiction about the
confidence column made her stop and doubt the summary.

**Would she use it instead of her current tool?**

> Instead of Gephi for the first look at a file somebody sends me -- probably yes. It opens in
> the browser, it says up front the file doesn't leave my laptop, and it tells me what's wrong with
> the file before I load it. Instead of Brandwatch -- no, Brandwatch is where the data comes from,
> this doesn't replace that. Whether it replaces Gephi for the real work depends on the table and
> the export -- can I get the top 40 by bridge score, with a cluster label, out as a CSV in under a
> minute? I haven't seen that yet. If I can, I'd switch. If I can't, it's a nice file viewer.

---

## What worked for her

- The data-location line under "Open a graph", and the forwardable "Where your data goes" page,
  answered her first question before she asked it.
- The load step guessed the edge columns and direction; she did nothing on the left side.
- Every choice in the NA and repeated-pairs menus says how many rows and edges she ends up with.
- The two unconnected proteins were named, not silently dropped.
- "Edges 2,298 (rows)" beside "Linked pairs 1,262" matched the load step exactly.
- The collapsed Table strip was findable under the map without searching.
- "Quick actions" as a word, and measures listed as plain questions ("who sits between the
  groups").

## Where she stumbled

- After loading, Statistics said "no numeric edge column" though the load step had just said
  "Weight: confidence, not used yet" and the same sentence says "NA read as missing". She read it
  as the tool contradicting itself about her column and stopped trusting the summary.
- Combining repeated pairs offers only "highest confidence" and drops the source column; she
  expected a count of the repeated rows as the weight, as Gephi's merge gives.
- The map after loading is uncoloured; she had to go looking for community colour and a size
  measure, and did not find either on this screen.
- Nothing she saw says what happens with a file of two million rows.
- The top bar of the start screen is blank, while the load step's shows "graphty" (minor).
