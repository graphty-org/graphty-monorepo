# Session: is this file worth an afternoon? -- Analyst Alex

Participant: Alex, operations data analyst (logistics), graphs weekly, Gephi and NetworkX user,
mild red-green colour vision deficiency.

Task as given by the moderator: "A colleague sent you this file. Decide whether it is worth your
afternoon, and tell me anything that looks off."

Screens, in order: the start screen, the load step (the colleague's file,
`ppi-core-300-evidence.tsv`), then the main frame after loading. Moderator notes are in brackets.

## 1. Start screen

> OK, blank-ish page. "Open a graph." Four sample pictures -- karate club, Les Mis, proteins, bank
> transfers. I'm not here for samples, I've got a file. There's "Open..." under them. Good, that's
> one click.
>
> Before I do anything -- "Files stay on this computer. graphty reads them in this browser and
> uploads nothing." Right there with a little lock. OK. That's actually the first thing I'd have
> asked. I'd still want to check the network tab at some point, but fine, I believe it enough for a
> file a colleague sent me. It's not supplier data anyway.
>
> No sign-in. Good. Nothing asking me who I am. I don't see anything about price either, but I'm
> not going to go hunting for that now.
>
> "Connect to data source..." -- no. Open.

[Clicks Open..., picks ppi-core-300-evidence.tsv.]

## 2. The load step -- the file comes up blocked

> Big dialog. Left side is settings, right side has a red thing at the top. "confidence is read as
> text, so it cannot weigh edges. 150 of 2,298 values are NA; the rest are numbers between 0 and 1."
>
> Ha. Yep. That's somebody's R export. NA as a string. I've been bitten by that in pandas -- the
> whole column comes in as object and you don't notice until the mean fails. So that's the thing
> that's off with this file, and it told me before I loaded anything. That's... honestly better
> than Gephi, which would just have loaded it as a string column and I'd find out when the
> weighted degree is all zeros.
>
> It shows me the rows. Line 29, 31, 44, 52, 64 -- all coexpression. Huh. So is it only the
> coexpression source that has missing confidence? That's worth knowing, that's something I'd tell
> my colleague. It only shows me five though. "Show first rows" -- I'd want "which sources have NA",
> not the first five rows. I'd do that in pandas with a groupby.
>
> Load is greyed out. Bottom left, red: "Load is off: choose how to read confidence." Fine, clear.
>
> Wait -- why is it blocking me at all? It says "Role: Weight" on confidence. I didn't pick Weight.
> Did the file do that? Did my colleague? [Moderator: "What do you think?"] I don't know. If it
> guessed Weight from the name, fine, but then say so. If I'd just set Role to None would it load?
> Probably. The Text option in the list sort of says that -- "Load stays off while its role is
> Weight." OK so it's my Weight choice that's blocking it. I'd still like to know who made it
> Weight.
>
> There are two drop-downs for the same thing. One on the right, "Choose how to read it", and the
> Read-as on the left that's open. Are those the same setting? I'm going to assume they are. If I
> change the left one and the right one stays red I'll be annoyed.
>
> The choices: "Number, NA as missing -- 2,298 edges; 150 of them without a weight." Or "drop the
> rows with NA -- 2,148 edges." I like that it tells me the count for each. What does NetworkX do
> with a missing weight? It uses the default of 1 for a missing attribute, I think. So "missing"
> here -- does it mean 1, or 0, or skipped? It doesn't say. That matters, because if I compare
> against my notebook later the numbers won't match and I won't know why. I'll take "NA as missing"
> because I don't want to throw away 150 edges of a 2,298-edge file without asking my colleague.

[Picks "Number, NA as missing".]

## 3. The weight question and the repeated pairs

> Now the red is gone and there's a yellow one: "1,036 extra parallel edges. Several rows join the
> same two proteins, one per evidence source." Right, so every pair can be in there up to four
> times, one per source. That's a real thing to know -- degree would be inflated by nearly half.
> Good catch.
>
> Default is "Keep all: 2,298 edges." The explanation says degree counts every source, and any
> measure that needs one edge per pair merges by max of confidence "and says so on its result".
> Hm. So it'll quietly merge for some things and not for others? "Says so" -- I'd have to see it.
> If I'm putting degree in a deck, I want one edge per pair. I'd pick "Merge into one, max of
> confidence: 1,262 edges." It says source gets dropped. That's fine for now; I'd rather have the
> merged graph.
>
> Up top on the left: "confidence as a weight means: Similarity, Distance, Capacity, Unknown."
> Unknown is picked. It says "Paths ignore it; PageRank and communities read it as a similarity."
> OK. Confidence is obviously a similarity -- higher means more sure the two proteins interact. So
> Similarity.
>
> Now it wants "As a distance: 1 - w." Oh. Uh. So for shortest paths it turns 0.9 into 0.1. Makes
> sense, I guess, but in NetworkX if I ran shortest path with weight="confidence" it would use 0.9
> as the distance, straight. So this and my notebook disagree unless I remember this setting. At
> least it's written down here. "Other choices: 1/w, -log w, or ask when a path first needs it." I
> would pick "ask me later" honestly, I don't know which one a biologist would want. That's a lot
> of maths for the load screen.
>
> What will load: nodes 298, edges 2,298, without a weight 150.
>
> 298. The file is called "300". [Pauses.] Where are the other two? It doesn't say. It told me about
> the NAs and the parallel edges and it's showing me a count that doesn't match the filename, with
> no line about it. If this were my SQL extract and the count was two short I'd stop right here and
> go check. I'm guessing -- two proteins with no edges, so they can't be in an edge list? That's
> plausible, but it's me guessing, the screen didn't say it. This is the thing I'd flag to my
> colleague first, before the NA thing.
>
> Also the "What will load" edges still says 2,298 when I pick merge in the list -- I'd expect it
> to go to 1,262 once I choose it. [Moderator: the list is open, the choice is not yet made.] OK,
> fine, as long as it updates.

[Picks Merge, then Load.]

## 4. After Load -- the main screen

> ...That's Les Miserables. That's not my file. [Moderator: "The prototype shows a sample here;
> treat it as if it were your file."] OK, but that makes it hard to answer your question, because
> the question is about this file. I'll tell you what I'd look at.
>
> Right side, Statistics: Nodes 77, Edges 254, "undirected, weight: value". Density, connected
> components "2 (1 isolate)". Good -- that's the counts, straight away, that's the first thing I
> look at. For my file I'd want to see 298 or 300 here, and 1,262, and components. The "1 isolate"
> thing is exactly what I was worried about on the last screen. If it said that there, I'd have
> been fine.
>
> "weight: value" -- value of what? Oh, it's the attribute name. For mine it'd say
> "weight: confidence" I suppose, and hopefully "similarity". Would be nice if it said which.
>
> Degree distribution is a tiny sparkline. It's long-tailed, OK. I can't read numbers off that.
>
> Left: "Styles: Group color, Size by degree, Base style." So it's already coloured by group and
> sized by degree. Where did "group" come from? Is that a column in the file, or did it run
> communities on load? If it ran communities, I want to know which algorithm and if it'll be the
> same next time. There's nothing here that tells me.
>
> The legend: groups 2, 8, 4, 1, 3, 5, 0, Other. Ordered by how many -- 14, 13, 11. So group 2 is the
> biggest. The orange and the darker orange -- group 2 and group 3 -- I can't really tell those
> apart on the graph. And the two blues, 8 and 1, only just. The pink and the orange next to each
> other in the middle there is muddy. "Other 5" -- good that it says 5 are lumped, I hate when stuff
> silently disappears.
>
> Big node in the middle, Valjean, so that's the hub. Sized by degree, legend says 1, 10, 36. OK.
>
> "Overview: General" and then "Replace." I'm not clicking Replace. Replace what? It sounds like it
> would throw away something.
>
> "Full graph" chip at top left. OK, so nothing's filtered. Good.
>
> Export, top right. Fine.
>
> What I don't see is a table. For "is this worth my afternoon" I want the top twenty by degree and
> by betweenness in a list, so I can see if the hubs are interesting or just the usual suspects.
> "Results" on the left maybe? I'd click that next. I'd also type "betweenness" somewhere; there's
> a search icon next to Graphs, but that looks like it searches the graphs list, not algorithms.

## 5. Verdict on the file

> Worth an afternoon? Probably yes, but I'd email my colleague first: the confidence column has
> 150 NAs that look like they're all one source, every pair is in there up to four times, and two
> of the 300 proteins didn't come in. The tool found the first two for me. The third one I found
> because the count didn't match the filename, not because it told me.

## Single Ease Question

**5 of 7.** Getting it open and seeing what was wrong was quick, quicker than Gephi. What took
longest was the weight-meaning and distance bit, and not knowing why it was 298.

## Would you use this instead of your current tool?

> For checking a file before I start -- yes, maybe. That load screen does in one go what I do in
> five pandas cells: types, NAs, duplicate pairs, counts. And "uploads nothing" right on the first
> screen is what gets me past the data question. For the actual analysis I haven't seen enough. I
> didn't see a betweenness number or a table, and the colours were muddy for me. I'd still do the
> numbers in Python until I've checked its degree and betweenness match NetworkX on one file.
> If they match, I'd seriously think about dropping the Gephi half.

## Problems observed

1. **Load step, node count** -- 298 nodes shown for a file named "300" with no line saying why
   (isolated nodes cannot appear in an edge list). Participant stopped and distrusted the count.
   Severity 3.
2. **Main frame** -- after Load, the screen shows a different dataset (Les Miserables), so the
   participant could not finish judging his own file. Prototype continuity problem. Severity 3.
3. **Load step, weight role** -- confidence arrived already set to Weight; participant did not
   know who set it, and so did not know he could clear it to unblock Load. Severity 2.
4. **Load step, "NA as missing"** -- does not say what a missing weight counts as (1, 0, skipped)
   in the measures, so results may not match NetworkX. Severity 2.
5. **Load step, "As a distance: 1 - w"** -- the conversion reads as maths the participant cannot
   judge; differs from NetworkX's default use of the raw value. Severity 2.
6. **Load step, two controls for one setting** -- the issue row's select and the column's Read as
   select look like two separate settings. Severity 1.
7. **Main frame, legend colours** -- orange versus dark orange, and the two blues, are hard to
   separate for a red-green deficient viewer. Severity 2.
8. **Main frame, groups** -- no indication where "Group color" groups came from (a file column or
   a community run), nor whether they are stable on rerun. Severity 2.
9. **Main frame, "Replace" beside Overview** -- reads as destructive; participant would not click
   it. Severity 1.
10. **Main frame, no ranked table** -- nothing at rest shows top nodes by a measure; the decision
    "is it worth my afternoon" needs one. Severity 2.
11. **Load step, NA rows** -- shows the first five NA rows but not which sources they come from,
    which is the question the rows raise. Severity 1.
