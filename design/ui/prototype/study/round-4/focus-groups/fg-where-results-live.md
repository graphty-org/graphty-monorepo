# Focus group: where results live

Six simulated participants looked at the project screen and the storyboards: a left rail of icons
(Graph, Assistant, Results with a flask, Notes), a second column listing Graphs, Sets and paths,
and Styles (two style rows, "Betweenness color" among them, carry a small "run" tag), the graph in
the middle, and a right-hand panel that shows node, edge and component counts at rest and a node
card when a node is picked (TP53: betweenness 0.1139, pagerank 0.01137). A legend card sits on the
graph, bottom left, with a log-scale note. The sample data is a 300-protein network; one frame
uses Les Miserables. There were three written rounds. In round 1 each participant spoke alone
about first impressions. In round 2 each had heard the others and was asked about trust and
what was missing. In round 3 each was asked what would make them switch to the tool or quit it,
and the one thing they would change.

| Participant | Who they are |
|---|---|
| Gephi holdout | Researcher who uses Gephi daily and reads everything against it; exports to R; publishes |
| Min-ji Kim | Knowledge engineer; RDF, SPARQL; her graph is rebuilt weekly by a pipeline |
| Alex | Intermediate analyst (supply chain); NetworkX, Excel; reports to a director |
| Jordan | Marketing network analyst; Gephi and spreadsheets; delivers influencer shortlists to a VP |
| Chris | ML engineer, recommendation systems; tens of millions of user-item edges; MLflow habits |
| Elena | First-time graph user; comes from business dashboards |

## Transcript

### Round 1 -- first impressions, alone

**Gephi holdout:** Right. First impressions, and I'll say up front that I read everything against Gephi, because that's what I'd be leaving.

What I see is a list down the left: graphs, sets, styles. Then a big map in the middle, and a properties column on the right that changes depending on what I clicked. That part I could teach. It's roughly Overview with the Appearance panel moved over.

What I can't find is the Data Laboratory. Where is the table? Every number on the right, betweenness 0.1139, pagerank 0.01137, came from something, and I can't tell what. There's an icon in that thin strip on the far left labelled "Results" with a flask on it. I would never have guessed that's where my statistics live. I'd have gone looking under Graph.

Also, "Betweenness color... run". Run of what, when, on which nodes? If it ran with a filter on, I want the column to say so. Gephi doesn't, and a reviewer has already caught me on that once.

The storyboards are tidy, but they're all somebody else's protein data. Show me a 40k-node retweet network.

**Min-ji Kim:** Kim here. First impressions, and they are mixed.

The layout is readable. The data is on the left, the drawing is in the middle and the facts about whatever I picked are on the right. At rest the right side shows counts labelled nodes, edges and components, and I appreciate that. Nobody made me guess whether 1,262 means edges or triples. That still only tells me it is fine for a demo. It is a protein set, not my data.

What bothers me is that I cannot see where a calculation went. There is a "Results" icon in the strip on the far left, but the only place I actually see a run is the word "run" beside two rows under Styles. Why is a computation filed under colouring? When I click TP53, betweenness is 0.1139 and pagerank is 0.01137. Which betweenness is that, normalised or raw? Which run produced it, and with what settings? Nothing on that card says.

On the storyboards: they narrate a scientist who already trusts the numbers. I don't, not until I can trace each one back to where it came from.

**Alex:** I'll be honest, the first thing I looked at was the numbers on the right: 300 nodes, 1,262 edges, 3 components. Good. If that's what my SQL says, I keep going. If it isn't shown, I leave.

The rest is harder to read. There's a list on the left of groups and paths, then a "Styles" list where some rows say "run" next to them. So is Betweenness color a calculation or a colour? In Gephi those are two separate things: I run the statistic, then I use it in Appearance. Here it seems to be one line, and I can't tell where the actual betweenness numbers are. Is that the "Results" icon down the far left strip? I'd guess so, but only because the word is there. Nothing on the main screen says "you ran betweenness at 10:40, here's the top twenty".

The card at the bottom left is fine as a legend. The log scale note is actually useful.

The storyboards are a protein study, which isn't my world. So I can't really judge them against depots and suppliers. I skimmed them.

My main question: where do I find my runs next week?

**Jordan:** Honestly? First thing I noticed is it's a protein network, not my world, so I'm squinting. OK, the layout: a list on the left, the map in the middle, a details thing on the right. That's Gephi-ish, fine.

The storyboards are nice to look at, but they don't show the thing I'd actually do on day one. I dragged nothing in. Where's "import CSV"? And where's the table? I see "betweenness 0.1139" on the right when you click TP53, which is great for one node. I need the top 40 sorted, and I can't see where that lives.

There's a little flask icon on the far left that says "Results". I'd click it, sure, because it's the only word that sounds like "my numbers". But the left list already has "Betweenness color ... run", so is the run in Styles now? That's weird. A colour is not a result.

The legend box on the map, though, the one with the log scale: I'd paste that straight into a slide. That one's good.

So which of the two versions is supposed to be "where my runs are"? Because I honestly can't tell yet.

**Chris:** Chris here. The first thing I checked is the first thing I always check: where did my run go? On this frame I can find a "Results" icon on the far left and a "run" tag next to "Betweenness color" in the styles list. But a style layer isn't a run. A run should tell me its settings, its denominator and how long it took, and the styles list tells me none of that. The right side shows the stats I care about, like 300 nodes, 1,262 edges and 3 components, and I like that it gives counts and not just a picture. The per-node attributes look like my feature row, which is also good.

On the storyboards: every one uses a 300-protein sample. I'd drag in my user-item edge list before I touched any of them, and none of the storyboards shows what happens then. Three columns of panels at 1366 wide leaves the canvas at about half the screen. On my laptop that's the first complaint.

If betweenness shows up as a colour before I've seen it as a column I can sort, I don't trust it.

**Elena:** Honestly, the first picture I opened, the Les Miserables one, got an "ooh" out of me. There are colored groups and a little key in the corner, so I could tell something was going on. Valjean is the big yellow one in the middle, so I figured he's the most important person. Is that right? I didn't check what the size meant.

What I didn't get is the left side. There's a column of little icons: Graph, Assistant, Results, Notes. Then there's a second column next to it with Graphs, Sets and paths, and Styles. So which one is the menu? The other picture had way more stuff on the right when a dot was clicked, like "betweenness 0.1139." Is that good? I'd have no idea.

If I ran something, I'd click "Results," because that's what it says. I didn't see a run listed anywhere on the first screen, so I'd assume I haven't run anything yet.

The storyboards are long. I skimmed the pictures and skipped the paragraphs. They look nice, but they're mostly somebody else's data, not mine.

### Round 2 -- trust and what is missing, after hearing each other

**Gephi holdout:** I agree with Chris more than anyone here. A run has settings, a denominator and a time. A colour has none of that. At the moment "run" sits under Styles, which tells me the designers think of a statistic as a way to colour nodes. I don't. In Gephi I press Run in the Statistics panel. The numbers land as a column in Data Laboratory, and only then do I choose to colour by them. It's clumsy, but I always know where the numbers are.

Alex: you asked where your runs will be next week, and that's my question too. What I'd actually do is look for a table first and find none. Then I'd click Results because of the word, like Elena would. I wouldn't trust it until the column header says "betweenness, normalised, full graph, 10:40".

What's missing is export. I need to get the node table out to CSV for R. If I can't find that in about thirty seconds, I'm back in Gephi.

Kim is right that the value on the node card needs a source. What I want is one click from 0.1139 to the run that produced it.

**Min-ji Kim:** I don't trust a number yet, and the reason is what Chris said: a style layer isn't a run. If "Betweenness color" is the only place I can see that anything ran, then the provenance is sitting inside a colour setting. When I restyle, is the record gone?

Alex asked where the runs are next week. My question is simpler. When I click TP53, the card should say which run gave me 0.1139: the measure, normalised or raw, directed or not, what the graph looked like at the time, and when it ran. If the card can't say that, I have to go back to SPARQL to check.

Where I disagree with Jordan is the Results flask. Clicking it because it's the only word that fits is guessing, not trusting. I'd guess too, and I'd guess wrong half the time.

Something is also missing for how I work. My graphs change, because I re-run the mapping pipeline weekly. If I load a new version, does the old betweenness stay on the nodes as though it still applied? That is a silent stale value, and I'd rather it said "stale" in plain text.

I also won't judge a colour legend yet. Tell me it isn't red against green first.

**Alex:** I agree with Chris: a colour is not a run. If betweenness only turns up as "Betweenness color ... run" under Styles, I can't put it in front of my director. What I actually do today is compute it in NetworkX, check the top twenty against what ops already knows, and only then make the picture. Here the picture seems to come first.

The Gephi holdout's point about the filter is the one that worries me most. I've sent numbers that turned out to come from a filtered graph, and I found out in the meeting.

To Elena: I don't think "nothing in Results means nothing has run" is safe, because the TP53 card already shows a betweenness value. So it ran somewhere, and nobody's telling us where.

What's missing for me is the Louvain problem. If I run something twice and get a different answer, I need both runs kept side by side with their settings, not one quietly replaced by the other. I also need a way to get it all into Excel. On my 14-inch laptop I'm with Chris, three panels is a lot of screen to give up.

**Jordan:** Jordan again. Chris said he won't trust betweenness if he sees it as a colour before he sees it as a column he can sort. I agree with that more than I expected to. My deliverable is a shortlist of 40 people with a reason for each one, and a coloured map doesn't give me that. A sorted table I can paste into a sheet does.

Kim's point hit harder, though. I'd never ask "normalised or raw" out loud, but I have had a VP ask "why is this person number three?" and I couldn't answer, because I didn't know which run the number came from. If I ran it twice, once with the bots filtered out, the column has to say so. That's the bit Kim and the Gephi guy both caught.

Elena said she'd assume nothing had run because nothing was listed. Same here. The "run" tag inside Styles doesn't count, because I'd never look under colours for my numbers.

What's missing is still the day-one stuff. Where do I drop my CSV, and where's the top 40 I can export? Until I see that, I'm not trusting any of it.

**Chris:** I agree with Kim and the Gephi holdout. A number I can't trace back to where it came from is a magic number, and those don't go into my pipeline. Alex asked where the runs will be next week. My version of that is whether I can diff two runs. In MLflow every run has params, a timestamp, a duration and artifacts. Here "run" is a tag on a style row, so the colour gets first-class treatment and the computation doesn't.

Elena, the yellow size doesn't tell you Valjean is the most important. It tells you someone mapped some measure to size. You can't know which measure without a legend and a column.

What I'd actually do: import my user-item edges, then compute degree and PageRank. Then I'd sort the column, look at the top 1%, and export it with my ids. None of the frames shows that sort or that export. I also need the denominator on each run: nodes included, whether it used weights and direction, exact or sampled, and wall time. Put that on the column header, and give the flask a list of those runs. Don't hide them under Styles.

Jordan, you're right that a colour is not a result.

**Elena:** Honestly, most of what Chris and the Gephi person said went over my head. I don't know what a "denominator" is, and I've never used Gephi, so I can't tell you what's missing compared to it.

What stuck with me was Jordan saying she wants the top 40 sorted. Yes, that's what I want too. In our dashboard I click a bar and get a list. Here I click a dot and get one number, 0.1139, and I still don't know if that's high.

Alex asked where the runs are next week. I figured I hadn't run anything yet, and now I'm hearing the "run" next to Betweenness color might be one. So did somebody already run something? I wouldn't have known that.

Trust-wise, I'd trust it if the list and the picture agreed. If Valjean is big, he'd better be at the top of the list. I'm assuming he is, anyway.

And a colour being a result is weird, sure. I'd still click Results first, though.

### Round 3 -- switch or quit, and the one thing to change

**Gephi holdout:** What would make me switch is a table that behaves like Data Laboratory. Every node is a row and every run is a column, and the column header says the measure, normalised or not, full graph or filtered, and the time. I sort it, I export it to CSV for R, and that's it. If I get that and I don't have to fight a Java install, I'd move a small project over and see how it goes.

What would make me quit is the stale value Kim raised. She reloads her graph and the old betweenness is still on the nodes as though it applied. I'd quit on the first number I send a reviewer that turns out to be stale or filtered with no warning. I'd go back to Gephi that afternoon and I wouldn't come back.

Alex is right about keeping both runs. Gephi overwrites the column when you run it again, and I've lost results that way. If I run it a second time, I want a second column, not a replacement.

If I could change one thing, it would be to take "run" out of Styles. Put runs where the numbers are, and let me colour by one afterwards. Elena, you'd find the top 40 there too.

**Min-ji Kim:** Min-ji Kim. I'd quit over a silent stale value. My graph is rebuilt every week. If last week's betweenness is still sitting on the nodes after a reload and nothing marks it, the tool has told me something false, and I close it. Gephi does the same thing, which is part of why I stopped using it.

I'd switch for provenance I can check. Chris wants runs he can compare side by side, and Alex wants two Louvain runs kept next to each other. I agree with both, but a comparison is only as good as the record behind each run. So the one thing I'd change is this. Every value should link to the run that produced it, in one click from the node card or the column header. That run should say which measure it was, normalised or raw, directed or not, the filter that was on, which version of the graph it ran on, and when. When the graph changes underneath it, the run should say "stale" in plain text.

Jordan, a flask icon doesn't give you that. Where the runs live matters less to me than whether they carry that record.

**Alex:** What would make me quit is the Louvain thing happening quietly. Say I run communities twice, the second run replaces the first, and I only find out because my deck no longer matches the picture. I'm back in NetworkX that afternoon and I don't come back. Kim's version is the same fear: an old number still sitting on the nodes after the data refreshed. That's the one that gets me called into my director's office.

What would make me switch is a weekly run that takes me three clicks. I type "betweenness", run it, and get a top twenty I can sort and paste into Excel. The column header says which run the numbers came from and whether a filter was on. Then next month I rerun it on the new CSVs without redoing the Gephi half.

Jordan, you're right that the sorted list matters more than the map. But Elena, the list and the picture agreeing isn't enough for me. They have to agree with NetworkX too.

If I could change one thing, a run would be its own thing with a name and a time, and I could find it next week without guessing that a flask icon means my numbers.

**Jordan:** What would make me quit is simple. It's week two, I open the project, and I can't find last Tuesday's top 40 in under a minute. Then I'd go back to Gephi, export to Excel and grumble. That isn't loyalty, it's just faster.

Alex, you're right about keeping both runs. I did run influence twice once, with and without the bot accounts, and the second run quietly wrote over the first. My VP saw the old ranking in a deck and the new one in the sheet. That was a bad Thursday. So both runs stay, each with a column labelled in words I'd actually read, like "bots excluded, Tuesday".

Elena, I'd click Results first too. But Kim's right that a guess isn't the same as knowing. If the flask is where runs live, the node card should say so. Then I'm not hunting.

If I could change one thing: the ranked table, top 40 sorted, with an export button right there. The map goes on the slide, but the table is my actual deliverable.

**Chris:** Here's what would make me quit. I drop in 20 million user-item rows, run PageRank, and later find its values quietly overwritten by a second run where I changed one thing, like turning weights on. That's the Louvain problem Alex described, and it's the reason MLflow exists. If that happens once, it goes back in the drawer next to Gephi. Kim's point about stale values is the same failure seen from a different angle: the graph changed, the column stayed, and nothing said so.

The one thing I'd change is to make the run its own object with its own place. Each run needs its params, its node count, weighted or not, exact or sampled, the graph version and the wall time. Two runs of the same measure should give two columns, with the old one marked superseded, not deleted. The column header should link back to its run, and the node card value should too. The Gephi holdout wants one click from 0.1139 to its source, and I want that link going both ways.

Jordan, Elena, the sorted top 40 you both want is just that column sorted. The colour comes last, and it should cite which run it used.

What would make me switch is diffing two runs side by side, then exporting the top 1% with my own ids in under ten minutes.

**Elena:** Switch or quit? Honestly, I wouldn't quit in any big way. I'd just stop opening it. If I click Results and there's nothing there, or it's full of words like "normalised", I'll figure I did something wrong and go back to my dashboard.

Jordan and Alex both want a sorted top 40, and that's the thing that would keep me. In our dashboard I click a bar and get a list. Here I want to click "who's in the middle" and see a list with names, biggest first, right next to the picture. And if Valjean is the big yellow dot, he'd better be number one on that list. If he isn't, I stop believing the picture.

Kim said she wants the card to tell her which run a number came from. I'd never ask that. But what Kim and the Gephi guy said about running it twice worries me now. If I run it again and the old numbers quietly change, I'd never notice.

The one thing I'd change: after I run something, show me the list right away, where I'm already looking. Don't make me go and find it.

## Themes

Severity uses Nielsen's 0-4 scale. "Unprompted" counts only round 1, where nobody had heard anyone
else; later agreement is reported separately because it is partly social.

### 1. The "run" tag under Styles files a computation as a colour -- severity 4

The only visible sign that anything was computed is a "run" tag on a style row. Participants read
this as the design treating a statistic as a way to paint nodes, and it destroyed their sense of
where results are.

- Unprompted (round 1): 5 of 6 -- Gephi holdout ("Run of what, when, on which nodes?"), Kim
  ("Why is a computation filed under colouring?"), Alex ("a calculation or a colour?"), Jordan ("A
  colour is not a result"), Chris ("a style layer isn't a run").
- Elena missed it entirely in round 1 and concluded nothing had run; she only learned it might be a
  run from the others (round 2).
- Round 3: the Gephi holdout's one change is "take run out of Styles"; Chris's and Alex's one change
  is a run as its own object with a name and a time.
- Kim adds a consequence nobody else raised: if provenance lives inside a style layer, restyling
  may erase the record.
- Dissent: none on the principle. Kim says placement matters less to her than the record a run
  carries (theme 3).

### 2. There is no ranked, sortable, exportable table of results -- severity 4

The node card answers "what is this one node's value"; every participant with a deliverable needs
"who are the top N". No frame shows a sort or an export.

- Unprompted (round 1): 4 of 6 -- Gephi holdout ("Where is the table?"), Jordan ("I need the top 40
  sorted"), Alex ("here's the top twenty"), Chris ("a column I can sort").
- By round 3: all 6. Elena arrived at it from her dashboard habit ("click a bar and get a list"),
  not from the others' vocabulary, which makes her agreement more credible than a simple echo.
- Export destinations named: CSV for R (Gephi holdout), Excel (Alex, Jordan), top 1% with own ids
  (Chris).
- Elena's condition is placement: the list must appear "right away, where I'm already looking", not
  behind a rail icon.
- Kim did not ask for a table; her need is theme 3.

### 3. A value does not say which run produced it or with what settings -- severity 4

TP53's 0.1139 carries no measure variant, filter, graph version or time.

- Unprompted (round 1): 3 of 6 -- Kim (normalised or raw, which run, what settings), Gephi holdout
  (was a filter on), Chris (settings, denominator, duration).
- Round 2 adds Alex (sent numbers from a filtered graph and found out in the meeting) and Jordan
  (a VP asked "why is this person number three?" and she could not say). Both are concrete past
  incidents, not just agreement.
- Requested fields, pooled: measure, normalised or raw, directed or not, weighted or not, exact or
  sampled, filter in force, nodes included, graph version, time, wall time.
- Requested link: one click from a node-card value or a column header to its run (Gephi holdout,
  Kim), and back from the run to its column (Chris).
- Dissent on wording: Elena says a list "full of words like normalised" would make her think she
  did something wrong. Jordan wants the same facts in her words ("bots excluded, Tuesday"). The
  record must exist in full; its default label must be plain.

### 4. A re-run must not overwrite, and a changed graph must mark old values stale -- severity 4

The strongest quit trigger in the session. Two failures, grouped by Chris as "the same failure seen
from a different angle".

- Overwrite on re-run: Alex introduced it in round 2 (Louvain gives a different answer twice). By
  round 3 all 6 endorse keeping both runs; the Gephi holdout, Jordan and Chris each give a personal
  loss from the same thing in Gephi or elsewhere. Chris specifies the old run marked superseded,
  not deleted.
- Stale values after the data changes: Kim introduced it in round 2 (weekly pipeline rebuild). The
  Gephi holdout, Alex and Chris name it as their quit trigger in round 3.
- Caveat: none of this was visible in the mock. It is a fear drawn from other tools, not an
  observed failure of this design, so it is a requirement to test, not a defect found.

### 5. "Results" in the rail is found by word-guessing, not by understanding -- severity 3

- Every participant said they would click Results. None said it was obviously where results live.
- The Gephi holdout would have looked under Graph first. Alex: "only because the word is there".
  Kim: "guessing, not trusting... I'd guess wrong half the time".
- Elena took an empty Results as proof nothing had run, while the TP53 card shows a value. Alex
  caught the contradiction. So an empty or absent Results panel actively misleads the least
  experienced user.
- Jordan's fix: if Results is where runs live, the node card should point there.
- Dissent: Jordan and Elena find the word adequate as a first click; Kim and Alex call it a guess.
  Both views agree it gets the click, and differ on whether a click reached by guessing counts.

### 6. The picture comes before the number -- severity 3

- Alex (compute, check the top twenty against what ops knows, then draw), Chris (column before
  colour; "the colour comes last, and it should cite which run it used"), the Gephi holdout (run,
  then column, then Appearance).
- Elena shows the risk from the other side: she read Valjean's size as importance without knowing
  which measure it mapped. Her trust test is that the list and the picture agree; Alex adds they
  must also agree with NetworkX.

### 7. Nothing starts from the participant's own data -- severity 3 for adoption, 1 for this question

- Unprompted: 6 of 6 said the protein sample was not their world. Import is visible to no one
  (Jordan: "Where's import CSV?"). Scale asks: 40k-node retweet network (Gephi holdout), 20 million
  user-item rows (Chris).
- Part of this is the mock's single sample dataset (see below); the absence of a visible import
  step on day one is a real gap.

### 8. Three columns crowd a laptop -- severity 2, two voices

- Chris (1366 wide leaves about half the screen for the graph) and Alex (14-inch laptop). Not
  raised by others.

### 9. Smaller single-voice points

- Colour-blind safety of the legend (Kim, severity 2 pending a check).
- Elena could not tell which of the two left columns is the menu (severity 2, one voice; the rail
  and the panel beside it read as two competing navigations).
- Elena cannot tell whether 0.1139 is high; a value without its rank or distribution means nothing
  to a newcomer (severity 2, one voice, but it supports theme 2).

## What held up well

- Counts on the right at rest (nodes, edges, components): praised unprompted by Kim, Alex and Chris.
  Alex uses them as a go/no-go check against his SQL.
- The legend card with the log-scale note: Alex and Jordan praised it unprompted; Jordan would paste
  it into a slide. Elena used the key to see that "something was going on".
- The overall three-part layout (list, graph, details) was readable and teachable to the Gephi
  holdout, Kim and Jordan.
- The per-node attributes on the card match Chris's idea of a feature row.

## Group-think to discount

- "A colour is not a result" was repeated nearly verbatim by four people after round 1. The round 1
  count (5 of 6, independently) is the evidence; the repetition in rounds 2 and 3 adds nothing.
- Keeping both runs spread from Alex to everyone by round 3. The three personal loss stories
  (Gephi holdout, Jordan, Chris) are independent evidence; the rest is agreement.
- Stale values spread from Kim to three quit statements in round 3. Treat it as one strong voice
  plus corroboration from two users whose data also changes (Alex monthly, Chris). The Gephi
  holdout adopted it as his quit trigger without saying his own data changes.
- Elena's round 3 worry about re-runs is explicitly borrowed ("I'd never ask that"). Do not count it
  as a first-time-user finding.
- The panel skews expert: five of six already use Gephi, NetworkX or pipelines. Their shared model
  (statistic, then table column, then appearance) is Gephi's model. The finding that runs must not
  live under Styles is robust; the finding that the answer is a Data Laboratory style table is the
  panel's prior, not something the group showed to be best. Test the table placement with users
  who do not come from Gephi.

## Findings caused by the mock, not the design

- "Not my data" (theme 7) is partly the mock showing one sample dataset. It should not count
  against the design's structure; it does say a storyboard starting from an import is missing.
- Elena's "nothing ran" versus the TP53 value is a contradiction inside the mock: a value was shown
  with no run anywhere. Before counting it as a design defect, check whether the design intends a
  run record the mock simply did not draw.
- Whether the Results panel already lists runs with settings could not be judged: nobody saw it
  open. Theme 5 is about the entry point, not the panel's content.
