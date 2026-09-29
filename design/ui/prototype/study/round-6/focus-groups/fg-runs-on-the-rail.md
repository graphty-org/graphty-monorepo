# Focus group: runs on the rail

Six simulated participants looked at the gallery: the storyboards (all on the Les Miserables co-appearance graph, 77 characters and 254 edges) and two app screens. The first screen shows the left rail (Graph, Data, a flask icon labelled Results, Notes), a second column listing "Graphs" and "Sets and paths" with "frozen" and "rule" tags, the canvas with a legend coloured by group number ("2", "8", "4"), an overview panel on the right (nodes, edges, density 0.0868, components) with a "Style stack, top wins, drag to reorder" list, a node table under the canvas (name, group, degree), and the line "Nothing has been sent from this project" at the top left. The second screen is what the Results button opens: a list of calculations, for example "Betweenness, today 14:02, exact, normalized, no weight, full graph, 77 nodes", with a "Re-run" button and a "Bridges, no settings" entry. The group had three rounds: first reactions, replies to each other, and "what would make you switch, what would make you quit, and the one thing you would change".

Participants:

- Emma (expert-emma): network scientist who works in Python notebooks, checks numbers against networkx and writes methods sections.
- Mara (gephi-holdout): long-time Gephi user who analyses large social networks and has been burned by reviewers.
- Min-ji (knowledge-engineer): works with governed knowledge graphs; cares about provenance and that data never leaves the network.
- Jordan (marketing-analyst): ranks creators and builds slide decks for a VP; no notebook, no code.
- Chris (ml-engineer-recsys): recommender-systems engineer with 10M-edge interaction tables; thinks in MLflow runs.
- Elena (explorer-elena): occasional user who wants a picture and a sentence for a meeting; knows no graph vocabulary.

These are simulated voices, not real users. Treat every theme below as a hypothesis to test with a task, not as evidence of behaviour.

## Transcript

### Round 1: first reactions

**Emma (expert-emma):** First thing I checked was the top left, where it says "Nothing has been sent from this project". That is where I would look, so good. I want to click it and see what "sent" covers, because telemetry counts too.

The overview on the right gives node count, edge count, density and components before I asked for them. 77 and 254 is the co-appearance graph I know, and Valjean at degree 36 matches networkx. That buys you about five minutes of trust.

The table under the picture matters more to me than the picture. I would make it taller, not shorter.

The icons down the left side are a guess. "Graph" and "Data" overlap in my head, because to me the graph IS the data. The flask icon suggests experiments, which is close but vague.

On the storyboards: they read like the designer's day, not mine. I start in a notebook. Nothing here shows me getting these numbers back into pandas, or calling any of this from code. The layout on screen is a force-directed hairball, and I would not put it in a paper. Please do not open on it.

**Mara (gephi-holdout):** Fine, I'll translate it into Gephi, because that's what I do with every new tool. The strip down the left looks like perspectives. "Graph" is my Overview, and "Data" is presumably the Data Laboratory. But then why is there already a table under the map? If the table is right there, what is "Data" for? That's the first thing I'd click, just to find out whether it's the same table twice.

"Results" I can't place at all. Results of what? My layout? A filter? I'd guess it's the statistics report, the little HTML window Gephi pops up after Modularity. If so, I want it to say what it ran on. That frame says "Full graph", good, but is that where the number was computed or just what's showing?

What I like is 77 nodes, 254 edges and the density right there. I know Les Mis, and those counts are right, so I'll keep going.

What I don't like is that "group" column holding 2, 8, 4. Those are ids, and they mean nothing to me. That's reviewer two's "community 7" all over again.

And the storyboards are tidy, but they're all Les Mis. Show me 23,000 nodes.

**Min-ji (knowledge-engineer):** I'll start with what I checked first. The overview panel says nodes 77, edges 254, components 1. Those are labelled nodes and edges, not "items", and that earns more trust than anything else on the screen. So does "Nothing has been sent from this project". My data cannot leave the network, and I read that line before I read the graph.

The organisation down the left mostly makes sense to me. Graph, Data, then a flask icon, then Notes. The flask confuses me. Is it an experiment, a lab, a scratch area? I would not have guessed. "Sets and paths" with "frozen" versus "rule" is good. That is extension versus intension, and I want the tool to know the difference. Whether it shows me which it is when I export, I cannot tell yet.

The table under the canvas is where I would actually work. I would sort columns and ignore the picture.

Two complaints. The legend is colour only. Groups 2 and 4 are amber and green, and I will not guess between those. Also, "degree" sits in the table with no word on where it came from. Who calculated it, and when? Where is that recorded?

Elena, you may like the picture more than I do. I am still asking whether position means anything here.

**Jordan (marketing-analyst):** Honestly? The left strip is Gephi Lite all over again, but at least these icons have words under them. Graph, Data, Results, Notes. I can read that, fine. A beaker for "Results" is weird though. Beaker says lab, and I'm not running experiments, I'm ranking creators.

What I actually liked is the table under the map. Valjean, group, degree, sorted. That's the thing I screamed for last time. Can I get it out as a CSV, though? I see a little dots menu and that's it.

The "Nothing has been sent from this project" line at the top is the first thing I read, and good, because that's my legal question answered before I load anything. I'd want it to say "stays on your laptop" in so many words, though.

On the storyboards, they're pretty, but the legend says group "2", "8", "4". My VP will ask what 8 means. Same problem as purple, just with numbers.

And the right side has "Style stack, top wins, drag to reorder". I don't know what that is and I'm not touching it.

**Chris (ml-engineer-recsys):** Honestly, the first thing I looked for was the import, and none of these screens shows one. I'm assuming "Data" is where it lives. Les Mis with 77 nodes is fine for a demo. It doesn't tell me anything about my 10M-edge interaction table.

What I did like: the Overview panel gives me nodes, edges, density and components before anything else. That's the denominator, and I usually have to go digging for it. The legend has counts beside the colours, which is also good.

The left rail is Graph, Data, Results, Notes. My guess is that "Results" means my numbers, like a table of computed columns. But the second screenshot shows a log instead: "Betweenness, today 14:02, exact, normalized, no weight, 77 nodes." That's basically MLflow, and I actually want that. I just wouldn't have guessed that's what the button was.

The storyboards show clicking around a novel. I want to see the flow where somebody searches for one ID and pulls up its 2-hop ego graph. Until I see that, I can't tell whether this is a tool I'd use or a toy.

**Elena (explorer-elena):** I'm going first, so there's nobody to disagree with yet. Ask me again after the others talk.

My first impression is that there's a lot going on. The picture in the middle is nice, it's the only thing I'd put on a slide. Down the left side I see Graph, Data, a little beaker that says Results, and Notes. Graph and Data I get. The beaker makes me think of science, some place I'm not supposed to go. Results of what, though? I haven't done anything yet.

Then there's a second column with "Graphs", "Sets and paths", "frozen", "rule". "Frozen" worries me. Did something break?

On the right side, "density 0.0868" means nothing to me. "Style stack, top wins" sounds like a card game.

The table at the bottom is the part I trust. It has names and numbers, and I can sort it like a spreadsheet. If Valjean is 36, I'd want to know what 36 means and where it came from.

The storyboards were fine, but it took me a while to see what each step was meant to show.

### Round 2: replies to each other

**Emma (expert-emma):** Chris is right that the betweenness panel is basically an MLflow entry, and that is the part I trust most. Method exact, normalized yes, undirected, no weight, a timestamp. That is most of what a reviewer asks me for. Valjean at 0.57 matches networkx normalized betweenness, so it passes my check.

But "normalized: yes" is not enough. Normalized how? For undirected graphs networkx divides by (n-1)(n-2)/2 and igraph does not normalize by default. Write the formula, or at least the convention. There is no seed or library version either. They do not matter for exact betweenness, but they will for Louvain.

I agree with the knowledge engineer on degree. The betweenness column has a record behind it and the degree column has nothing. Elena, 36 is Valjean's degree, meaning he has 36 neighbours, but the table should say so and not leave you to ask me.

What is missing for me is a way to get this back into my notebook: the table as a CSV, and this record as a few lines of code I could rerun. I also want to know what "Re-run" does to the 14:02 record. If it replaces that record, I will not trust anything the tool shows me.

**Mara (gephi-holdout):** Chris is right that the second screen is the useful one, even if I would never have guessed it from a beaker. "Betweenness, today 14:02, exact, normalized, no weight, full graph, 77 nodes" is the sentence Gephi has never given me. That is my methods paragraph. And Valjean at 0.57 normalized matches NetworkX, so I believe it for now.

But here is my trust problem, and it is the same one our knowledge engineer raised. The table has a column called "betweenness". Which of those runs wrote it? Suppose I filter to the giant component tomorrow and run it again. Does the column change for everyone, or only for the nodes that were showing? In Gephi the answer is "only the visible ones, silently", and that has cost me a response letter. Nothing on this screen tells me the column and that list entry are the same thing.

Emma, I don't mind Graph and Data being separate. That is Overview and Data Lab, and I know that split. And "Bridges, no settings". Bridges by what definition?

**Min-ji (knowledge-engineer):** Chris is right that the flask entry is a log and not a table of values. Of everything on this screen, it is what I trust most. "Betweenness, today 14:02, exact, normalized, no weight, full graph, 77 nodes" is provenance. It answers the question I asked last round about who calculated this, when, and how. Mara, that is better than Gephi's report window, because it is kept.

The table does not link back to it, though. The betweenness column says "0 to 0.57" and nothing else. If I run betweenness again tomorrow with weights, which run does that column show? I need the run named in the column header, or I will not report the number.

The Bridges line says "No settings." Bridges has none, fine. But if something really had none, I would want it to say "none". That leaves no doubt whether the settings were ever recorded.

Emma wants the numbers back in pandas, and so do I. Where I differ is that I want the record exported with them. A value without its run is a rumour.

What is missing is any sign of whether "full graph" is the version I loaded or a filtered one.

**Jordan (marketing-analyst):** Chris, you've just told me something I didn't know. If the beaker button opens a log, then I guessed wrong. I thought "Results" meant my scores, like the degree column in the table. A list of "Betweenness, today 14:02" is a history. So why not call it History?

On trust: that log line is what I'd want when my VP asks "where did 36 come from?" Mara is right that it should say what it ran on. Last quarter the dashboard said 4,000 mentions and the download said 3,100, and I couldn't say which one was right. If the tool keeps a record like that, that's a real reason to switch.

Here's how I really work, though. I run the thing, sort the table, copy the top 40, and I'm done. I'm not going to open a log to find my number. It needs to sit in the table, next to the name.

Here's what's missing. If I run it again tomorrow, does yesterday's disappear? I've already pasted yesterday's into a deck. Emma, I don't have a notebook, so this tool is the only record I'll have.

**Chris (ml-engineer-recsys):** On trust: the line that earned it was "exact, normalized, no weight, 77 nodes". I don't care about the params for their own sake. I care because they're how I tell Tuesday's betweenness from Wednesday's. Emma, you said the table matters more than the picture. I agree, but the table has a "degree" column and nothing on it says which run produced it. The knowledge engineer asked the same thing: who calculated it, and when. That column needs a pointer back to the log entry, the way an MLflow metric points to its run id.

On fit: this is the MLflow part of my day, but the rail button is labelled "Results". I read that as "my numbers", so I clicked expecting a column of values and got a history instead. Maybe that's fine, but the label oversold it.

What's missing: I didn't see an import step anywhere, and I didn't see an export of that run record as JSON. Mara, I'm with you on the scale point. Show me 23k nodes, and then 10M edges.

**Elena (explorer-elena):** Emma said the numbers buy about five minutes of trust. I can't check 36 against anything, so I get none of that. I'm trusting it on looks, and that's riskier than it sounds.

Chris says the beaker is a log of what got calculated, with "today 14:02". That helps, but I'd never have guessed it. I'd have clicked it looking for the answer, like Valjean's number, and been annoyed to find a diary. If it's a history, call it something like "What I've calculated". "Results" made me think it would give me the answer.

The thing I need that I don't see is a plain sentence next to 36, something like "36 characters appear with Valjean." If I can't say it out loud to my VP, I won't put it on a slide.

I agree with Mara and the marketing person about "group 8". I'd just rename them myself, if the app would let me.

On Emma's hairball, I'm going to disagree. The hairball is why I opened this in the first place. Leave it there.

### Round 3: switch, quit, and the one change

**Emma (expert-emma):** I would switch for one job, and it isn't the analysis. That stays in my notebook. The job is a view I can hand to an investigator who doesn't code, with the data kept on the laptop. If the file opens and they can find a node by name without me on the call, that saves me a day.

I would quit over one thing, and Jordan already said it. If Re-run replaces the 14:02 record, I'm gone. Jordan has pasted yesterday's numbers into a deck, and I've put them in a methods section. Both of us need the old record to still exist, and the column needs to say which run it came from. Min-ji is right about that. A value without its run is a rumour.

The one change I'd make is an export: the node table as CSV with the run's parameters in the header, and that same record as a few lines of networkx I can run. Then I can check 0.57 myself.

Elena, keep your hairball. Just don't let anyone read distance off it.

**Mara (gephi-holdout):** I'd switch if the tool can tell me who wrote the column. It has to be a real, visible link from the "betweenness" column back to the run that produced it, right there in the header, the way Min-ji asked. Then when I filter to the giant component and run it again, I see two runs and two columns, not one column quietly rewritten. Jordan, you're right that yesterday's number can't just vanish. I've been burned by exactly that.

I'd quit if "Re-run" overwrites the 14:02 record. Emma said the same, and I'm not only echoing her. I'd go back to Gephi that afternoon, because at least I know how Gephi lies to me.

The one thing I'd change is the beaker. Elena and Jordan both guessed wrong, and so did I. If it's a list of what was calculated, on what, and when, then label it for that. "Results" promises Valjean's number and delivers a diary.

Then give me a two-minute load of a 20,000-node retweet network. Until I've seen that, all of this is Les Mis.

**Min-ji (knowledge-engineer):** I would switch for the run record. "Betweenness, today 14:02, exact, normalized, no weight, full graph, 77 nodes" is the first thing a graph viewer has shown me that I could paste into a governance report. Mara, you called it your methods paragraph, and I agree.

I would quit if a second run can overwrite the first. Jordan has already pasted yesterday's numbers into a deck, and my data owners will cite a value months later. If running it again replaces the record, then the record was only a status line and never provenance, and I go back to SPARQL.

The one change I want is for every computed column to name the run that produced it: in the header, in the export, and in the row detail. Chris compared it to an MLflow run id, and that is the right idea. "Degree" with nothing behind it cannot be traced.

Elena, I disagree about the label. "What I've calculated" is still vague. To me this is a log of runs, so the label should say that, and it should not promise me values it does not hold.

**Jordan (marketing-analyst):** I'd switch for that log line, and I'd quit if a second run wipes out the first. The knowledge engineer called a value without its run a rumour, and she's right. That's my 4,000-versus-3,100 problem all over again. Yesterday's number is already in a deck. If I press the button again and it quietly changes, I'm the one who looks wrong in front of my VP.

Elena, I'm with you on the name. "Results" made me expect my scores. What I actually found was a list of things I calculated and when. Call it "History" or "Past runs", something that tells me it's a diary before I click it.

The one thing I'd change: put the date on the column itself, like "betweenness (yesterday 14:02)" and "betweenness (today)". Give me two columns, not one overwritten one, so I can copy the top 40 without opening a log. Mara wants to know what it ran on, and that can go in the same label.

After that, a plain CSV button next to the table. That's what I'd keep and what I'd ask for, in that order.

**Chris (ml-engineer-recsys):** Switch or quit comes down to one test for me. Does yesterday's betweenness survive today's? Jordan asked it and Emma asked it: if Re-run replaces the 14:02 record, I'm out. That's the whole value of MLflow. A run is immutable, and a new run gets a new id. If the tool overwrites the old one, it's a cache, not a log.

Mara's point decides it for me too. Every value in that table has to point at the run that wrote it, with the node count it ran on. If I filter to the giant component and rerun, I want a second column with a second run tag, not a column that changes quietly underneath me.

The one thing I'd change is the button name. I'd call it "Runs". Elena and Jordan both went there looking for values. I did too. "History" is closer, but runs is the word I already use at work.

What would make me quit has nothing to do with this screen. I still haven't seen an import. If my Parquet doesn't load with my ids intact, none of this matters.

**Elena (explorer-elena):** I'm first again, so here's mine before anyone else's.

I'd switch if I could paste my spreadsheet in, get a picture that holds still, and write one sentence for my VP I actually believe. Something like "these four integrations connect most of our accounts." If I can't write that sentence, it was just cool.

I'd quit the first time something I'd already put on a slide changed on me. Jordan said this too, and it scared me. I don't have a notebook like Emma does. If I press something and yesterday's 36 turns into 34 and nothing tells me, I'd assume I broke it. Then I'd stop using it and not say why.

The one thing I'd change is the beaker. It needs a name that says what's in there. Chris and I both went in looking for the answer and found a diary. If it's a list of what I calculated, call it that. And the list should show a plain sentence, like "36 characters appear with Valjean", and not "exact, normalized".

Mara, I still don't know what "run" means here. Is that the button, or the thing it made?

## Themes

Severity uses Nielsen's scale: 0 not a problem, 1 cosmetic, 2 minor, 3 major, 4 catastrophe. "Round 1" counts people who raised a theme on their own, before hearing anyone else. That count is the one to trust; later agreement is partly echo.

### 1. "Results" on the rail promises values and delivers a log

The flask button labelled Results opens a list of past calculations with their settings. Every participant expected something else: the answer itself (Valjean's number), a table of computed columns, or a place for experiments.

- **Who:** round 1, on their own: all six. Emma ("close but vague"), Mara ("Results of what?"), Min-ji ("an experiment, a lab, a scratch area?"), Jordan ("beaker says lab, I'm not running experiments"), Chris ("I read that as my numbers"), Elena ("Results of what, though? I haven't done anything yet"). This is the strongest independent signal in the session.
- **Agreement:** unanimous that the label and the icon misdescribe the contents, and that a reader must be able to tell before clicking that this is a record of calculations and not the values. The values belong in the table, next to the name (Jordan: "I'm not going to open a log to find my number").
- **Dissent:** on the replacement word, and it is a real split, not a quibble:
  - Chris: "Runs" (his work vocabulary).
  - Min-ji: a "log of runs", and she rejects "What I've calculated" as vague.
  - Jordan: "History" or "Past runs".
  - Elena: "What I've calculated". She also does not know what "run" means ("Is that the button, or the thing it made?"), so "Runs" fails for the least expert reader.
  - Mara: no word offered; "label it for what it is".
  The experts want "run"; the novice cannot parse it. No label discussed here was tested.
- **Severity:** 3 (major). Six of six mispredicted the destination, and Jordan and Elena would stop looking rather than recover.
- **Relation to the owner's feedback:** the owner has already written that Results on the left looks inconsistent with the model, where the right panel and the bottom table explore results and the left rail navigates objects, and that "results and runs" are one of graphty's own concerns deserving a home. This group supports that split exactly: values are read in the table and inspector; the record of calculations is a separate object (a run), and if it keeps a rail button it should be named as that object, not as "results".
- **What to test:** a first-click test with two non-leading tasks on the same screen -- "Find Valjean's betweenness" and "Find out when and how Valjean's betweenness was calculated" -- across candidate rail labels (Runs, History, Calculations, and the current Results). Success is the value task going to the table or inspector and the provenance task going to the rail. Include a novice panel, because Elena's objection to "run" is a single voice but the one most likely to generalise.

### 2. Running something again must never overwrite an earlier run

- **Who:** round 1: none (nobody had yet seen that Re-run exists). Round 2, independently and each for a different reason: Emma (the methods section), Mara (Gephi rewriting only the visible nodes, "cost me a response letter"), Jordan (yesterday's number already in a deck). Round 3: all six named it as their quit condition.
- **Agreement:** unanimous. A run is immutable; a new run makes a new record and, if it produces a column, a new column. Chris: "If the tool overwrites the old one, it's a cache, not a log."
- **Dissent:** none on the principle. The mechanism is open: Jordan and Mara want a second visible column per run, which will crowd the table once a reader has run betweenness five times; nobody addressed that. The studio has to decide what the table shows by default (latest run, with older runs reachable) and test it.
- **Severity:** 4 (catastrophe) if it overwrote, because the failure is silent and lands in papers, governance reports and decks. Elena's "I'd assume I broke it... and not say why" is the important warning: the least expert users would never report this.
- **Discount:** the round 3 unanimity is mostly echo (see below). The evidence is the three independent round 2 voices.
- **Mock-fidelity caveat:** no screen shows what Re-run does. The fear is about an unstated behaviour. The next storyboard has to show a rerun producing a second record beside the first.
- **Architecture note:** keeping runs immutable and tying each computed value to its run is graph functionality. It belongs to graphty-element; the app only displays it.

### 3. Every computed column must name the run that produced it

- **Who:** round 1: Min-ji ("degree... Who calculated it, and when?") and Elena ("where it came from"). Round 2: Mara, Chris, Emma and Min-ji again. Round 3: Mara, Min-ji, Jordan, Chris, Emma.
- **Agreement:** strong. The column header, the export and the row detail must identify the run. Degree is a computed value and needs a record too, not only the algorithms that were run by hand (Emma, Min-ji, Chris all singled out degree).
- **Dissent:** on form. Jordan wants the date in the header ("betweenness (yesterday 14:02)"); Chris and Min-ji want a run identity; Mara wants a visible link to the run; Elena wants a plain sentence ("36 characters appear with Valjean") and not parameters at all. Min-ji also asks whether "full graph" means the version loaded or a filtered one, and Mara whether it describes what was computed or what is showing. Both are the same gap: the record must say what the run ran on, in terms that survive a later filter.
- **Severity:** 3 (major). Without it the provenance in theme 4 is unreachable from where people actually read numbers.

### 4. The run record is the most trusted thing on screen, if it says a little more

- **Who:** round 1: Chris only, who described the second screen. Round 2: Emma, Mara, Min-ji and Jordan all adopted it.
- **Agreement:** the line "Betweenness, today 14:02, exact, normalized, no weight, full graph, 77 nodes" is what Mara called her methods paragraph and Min-ji her governance entry.
- **Additions asked for:** the normalization convention, not just "normalized: yes" (Emma: networkx and igraph differ); a seed and library version for randomized methods such as Louvain (Emma); "none" written out instead of "No settings" (Min-ji); a definition for Bridges (Mara).
- **Dissent:** Elena does not want "exact, normalized" at all; she wants the plain-language meaning. This is the same two-register pattern seen in earlier rounds with palette names: the technical record for the reviewer, a sentence for the reader. Both are needed.
- **Severity:** 2 (minor) for the missing fields; the direction itself is supported.
- **Discount:** the enthusiasm is partly Chris's framing (see below).

### 5. Get the numbers and the record out together

- **Who:** round 1: Emma (back into pandas), Jordan (CSV). Round 2: Min-ji (the record exported with the values), Chris (the record as JSON). Round 3: Emma (CSV with parameters in the header, plus the record as networkx code), Jordan (a CSV button next to the table).
- **Agreement:** a table export that carries the run with it. Min-ji: "A value without its run is a rumour."
- **Dissent:** format only: CSV header (Emma, Jordan), JSON (Chris), runnable code (Emma). None conflict.
- **Severity:** 3 (major) for Jordan, whose whole job ends in a paste; 2 for the others, who have workarounds.
- **Architecture note:** turning a run record into a reproducible recipe is graph functionality and belongs to graphty-element.

### 6. Group numbers and colour-only legends

- **Who:** round 1: Mara ("reviewer two's community 7"), Jordan ("my VP will ask what 8 means"), Min-ji (amber versus green, colour only). Round 2: Elena (wants to rename them herself).
- **Agreement:** groups need names, and the legend needs text as well as colour. This repeats an earlier round's finding and is off the topic of the rail.
- **Severity:** 3 (major) for anyone presenting; already on record.

### 7. Scale and import were never shown

- **Who:** Mara (23,000 nodes, then a 20,000-node retweet network in two minutes) and Chris (10M edges, Parquet with ids intact, a 2-hop ego graph by id) in every round.
- **Agreement:** not discussed by others; they did not dispute it.
- **Severity:** not assessable. It is a gap in what was shown, not a finding about the design. Chris named it as a quit condition independent of this screen.
- **Mock-fidelity caveat:** every storyboard is Les Miserables. Emma, Mara and Chris each said the known counts (77, 254, Valjean at 36 and 0.57) bought them trust. That trust comes from a dataset they already know, and will not transfer.

### 8. The table matters more than the picture, but keep the picture

- **Who:** round 1: Emma, Min-ji, Jordan and Elena all said the table is where they would work or what they trust.
- **Dissent:** Emma does not want to open on the force-directed layout; Elena says the picture is why she came. Resolved in round 3 by Emma: keep it, but "don't let anyone read distance off it". Min-ji raised the same question of whether position means anything.
- **Severity:** 1 (cosmetic) for the default view; the underlying point (the layout implies meaning it does not have) is worth a note on the canvas.

### 9. Smaller items raised by one or two people

- "Nothing has been sent from this project": read first by Emma, Min-ji and Jordan, and trusted. Jordan wants "stays on your laptop"; Emma wants to know whether telemetry counts. Severity 1.
- Graph versus Data: Emma sees them as the same thing; Mara accepts the split (Overview and Data Laboratory) but asks whether Data is "the same table twice". Severity 2; the rail's meaning in graphty's ontology has to be stated, which the owner has already asked for.
- "frozen" and "rule" on sets: Min-ji approves (extension versus intension); Elena reads "frozen" as broken. Severity 2; the same two-register problem as theme 4.
- "Style stack, top wins, drag to reorder": opaque to Jordan and Elena ("sounds like a card game"). Severity 2.
- "density 0.0868" means nothing to Elena. Severity 1.

## Group-think to discount

- **The quit condition in round 3 is an echo.** The round 3 question invited a quit condition, and Jordan's round 2 deck story supplied one. Emma ("Jordan already said it"), Min-ji, Chris and Elena all cite someone else by name when stating it. Mara says "I'm not only echoing her", which is itself a sign of the pressure. Count three independent voices (Emma, Mara, Jordan in round 2), not six. Three is still enough to act on, because each came with a different cause.
- **Chris framed the run log for everyone.** Chris was the only participant in round 1 to describe the second screen, and he called it MLflow. Four of the five others opened round 2 with "Chris is right". Their praise of the log is partly his frame. The independent part is that Min-ji and Elena asked in round 1, before hearing him, where the numbers came from: the need is real, the enthusiasm for this exact form is borrowed.
- **"A value without its run is a rumour" became a slogan.** Min-ji said it in round 2; Emma and Jordan repeat it in round 3. Treat it as one voice.
- **Retroactive "I guessed wrong too".** In round 3 Mara says she guessed wrong about Results, but in round 1 she guessed a statistics report, which is close to what the screen holds. Her change of story is conformity; her round 1 guess is the better data point, and it suggests Gephi users may read the button correctly.
- **The turn order is not the speaking order.** Elena says "I'm going first" in rounds 1 and 3 but appears last, and Min-ji addresses Elena in round 1 before Elena has spoken. Round 1 cross-references are therefore not fully independent, and round 1 counts should be read with that in mind.
- **Agreement on the label without agreement on the word.** "Rename the beaker" is unanimous; which name is not. Do not record a winning label from this session. Test it.
- **Simulated voices.** Every line above was generated. Nothing here is evidence of real behaviour; each theme is a hypothesis for a first-click or task test.

## For the studio

Studio decisions, taken on the strength of this session and the owner's written direction on Results and the rail; each is reversible:

- Values are read in the table and the inspector; the rail button, if kept, opens the record of runs and is named for that object. Candidate labels go to a first-click test before one is chosen.
- A rerun always makes a new run record. The table shows which run each computed column came from; how older runs appear in the table is to be mocked and tested.
- Degree and the overview counts get run records like any other calculation.
- The next storyboard shows a rerun, the second record beside the first, a CSV export that carries the run, and at least one dataset larger than Les Miserables.
