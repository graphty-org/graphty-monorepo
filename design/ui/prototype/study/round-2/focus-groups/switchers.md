# Focus group: Leaving Gephi or Cytoscape

Four participants, all of whom make network figures in Gephi, Cytoscape or NetworkX today, looked at the same material: the app frame at rest (Les Miserables demo), the weekly-return and recipe storyboards, the results table mock and the closeness result row. Three rounds: a first impression written alone, then trust and what is missing, then what would make each of them switch or quit.

Participants:

- **Mara** -- Gephi holdout, academic, teaches network analysis, starts from GEXF files NetworkX writes.
- **Maren** -- genomics postdoc, Cytoscape and stringApp user, starts from a gene list and a DESeq2 table.
- **Dr. Chen** -- bioinformatics researcher, Cytoscape driven from R (RCy3), reviews students' networks.
- **Alex** -- business analyst, NetworkX in notebooks plus Gephi for pictures, data comes from SQL as two CSVs.

Note on names: participants sometimes addressed Mara as "Priya", "Anna" or "Petra" (and Maren may have meant Mara by "Petra"). Mara corrected this in round 3. It is an artifact of the simulation, not a finding.

## Transcript

### Round 1 -- first impressions, written alone before discussion

**Mara (Gephi holdout):** Five seconds on the frame at rest: it's a browser tool for loading a network, painting it by attribute, reading a few summary numbers and exporting. It's my Overview with the Statistics panel docked on the right. Fine.

What I checked straight away:

- **Counts.** It shows 77 nodes and 254 edges for Les Miserables, which is correct, and it says "undirected, weight: value". Good. Most tools never tell me which column they took the weights from.
- **Layout.** It says "Force-directed". Which one? If that isn't ForceAtlas2 with LinLog, gravity and scaling I can set, I have to write a methods paragraph I don't want to write.
- **Legend.** The group color legend lists "2, 8, 4, 1". Those are arbitrary ids, and reviewer two will ask why community 7 turned into community 4. On the other hand, a legend that sits on the canvas could get me out of Inkscape, if it comes out in the SVG. That's a real if.
- **Data Laboratory.** I can't see a node table anywhere at rest. If I can't sort rows, I don't trust the picture.
- **Data leaving.** "This browser. Nothing sent." is the first line I'd want my ethics board to read.

The storyboards follow a fraud investigator and a biology postdoc, so they don't speak to me. The weekly return is about bank statements. I'll say it before the Cytoscape people do: none of these starts from a GEXF somebody hands you. That's my first five minutes, and it isn't here.

**Maren (genomics, Cytoscape):** Five seconds on the frame at rest: it's a tool for looking at a protein network that's already been built. It's flat, it has a legend, and it says "This browser. Nothing sent." That last part matters to me, because I can't upload unpublished data anywhere my PI hasn't approved. It doesn't look like a spinning demo, which is a good start.

What worries me is the starting point. It opens on ppi-core-300.graphml. I don't have a graphml file. I have a gene list and a DESeq2 table. So where did those 1,262 edges come from? Which STRING version, what confidence cutoff? The panel says "weight: confidence" and stops there. I also count a lot of colours in that module palette. My PI is red-green colour-blind, so I'd want to check it before I trust it.

The weekly-return storyboard is about fraud, so it isn't my week. The recipe one is closer. That "84 of 96 genes matched" screen, with 7-Sep flagged as a date and Mdm2 flagged for case, is the first time any tool has told me what it dropped and why. That happened to me in March.

Honestly, though, a nice match screen doesn't get my figure out the door on Friday.

**Dr. Chen (bioinformatics):** **Written alone, before discussion:** It's a general-purpose network viewer with a statistics sidebar, basically Gephi in a browser. Nothing in the frame at rest tells me it knows what a gene is.

**On the frame:** The demo is Les Miserables, force-directed by default. The sidebar gets some things right. "2 connected components (1 isolate)" is the first number I'd check, and it's there next to density. The legend reads "group 2, 8, 4" with counts, which is honest but means nothing yet. I don't know what "Overview: General" or "Replace" do.

**On the recipe storyboard:** "84 of 96 genes matched", with the other 12 listed by name and a reason for each, is the error I've wanted from stringApp for years. Two things worry me, though:

- 7-Sep and 2-Mar are SEPTIN7 and MARCHF2. The gene nomenclature committee renamed them in 2020. Saying "Excel did this" is only half the fix. It should offer the current symbol.
- Mdm2 against MDM2 isn't a typo, it's mouse against human. Letting someone click "Use MDM2" by hand, with no warning about species, is how orthology mistakes get into papers.

**On colour:** Red and blue for fold change is fine. At least it isn't red and green.

**Alex (analyst):** **Solo note, written before discussion:** In five seconds it looks like Gephi's Overview tab, but cleaner and in a browser. Load a network, colour it, check the stats, export a picture. The statistics panel on the right is the first thing I would trust. It shows nodes, edges, density, components and "1 isolate" without me asking, which is the check I run in NetworkX before anything else. The left rail with "Styles" listed as layers makes me hopeful, because Gephi lost my colours on reopen. The legend reads "2, 8, 4, 1" though, and that is modularity class 4 all over again. A director does not want numbers there. The group colours also sit orange next to green, and I can't tell those apart well.

On the storyboards, the weekly return is the one I actually live. But it's a fraud investigator on bank data, and the page itself admits there is no supplier fixture. The "Replace, not add, March stays as a version" frame is the right promise, and I'd believe it once I've reopened a project a month later myself. The recipe one is the more interesting idea for me: styling travels with none of the data in it. That is the only way I get it past our data policy. My first question on both is whether anything leaves my laptop.

### Round 2 -- would you trust it, and what is missing

**Mara:** On trust: I would not put "betweenness, over the filtered graph" in a report yet. Before that I need four things:

- whether it's normalized,
- whether it's weighted, and by which column,
- whether it's exact or sampled,
- what the filter actually was, written into the CSV column header and not only on screen.

The table mock does part of this. "Betweenness exact, unweighted, full graph" is a better header than Gephi has ever given me, so I take back half of what I said about the missing Data Laboratory. Once I filter, though, "76 of 77 nodes, 1 step" has to name the step. Otherwise my regression gets run on a graph I can't describe.

Alex, a recipe that travels without data is nice for your compliance people. My reviewer wants something else: the layout seed and the ForceAtlas2 parameters, so the figure can be reproduced.

Maren is right that nobody here starts from the file you actually have. For me that's a GEXF out of NetworkX. The real test is whether I can write GEXF back out with positions and modularity class intact. If I can't, this is a place I visit and my work still lives in Gephi.

**Maren:** On trust, I looked at the closeness row. It says "full graph, 300 nodes, 3 components. Exact. Unweighted. 2 isolated proteins score 0", and it explains the correction in plain words. I haven't seen that written down anywhere before. I'd put a sentence like that straight into my methods, but only if I can copy it out as text, together with the STRING version and cutoff. Right now the provenance starts at the graphml file, and that's too late for me.

Alex, I agree with you on the legend. "Group 4" and "module 7" mean nothing to a reviewer. I need "cell cycle, FDR 1e-8" in that slot, and nothing here does enrichment. So on Friday I'm still going out to g:Profiler and pasting labels back in by hand.

Compared with Cytoscape, it's better on the match screen and on being honest about what it computed. It's worse on everything upstream. Missing: the STRING query, clustering I can name, and enrichment.

Petra, the thing that would really make me switch is a legend that comes out inside the vector export. What would make me quit is having to do the gene-list step somewhere else and then import a file.

**Dr. Chen:** On trust, the result row gets something right that Cytoscape never has. The column header "Betweenness: exact, unweighted, full graph" sits next to degree "filtered graph", and when the scopes disagree the betweenness value is marked "Out of date". That is exactly the silent error I catch in students' networks. Would I put it in a report? Not yet. First I'd need the STRING version and cutoff, the tool version, and whether weights were ignored or inverted. Betweenness on a confidence-weighted graph is nonsense unless confidence is turned into a distance. All of that needs to be in one exportable methods line that I can paste in.

Maren is right that the whole thing starts from a finished graphml, and so does my week. The tool also needs to hand the table back as a tidy CSV keyed on Ensembl IDs, so I can join it in R. If I can't script it the way RCy3 drives Cytoscape, it stays outside my pipeline.

Anna (the Gephi holdout), I agree about the modularity-class ids, but I'd go further. A layout can make clusters look real when they aren't. I want module membership coming from MCL or Leiden output that I can cite. I don't want membership read off the picture.

**Alex:** **Would it go in a report?** The results row says "on: full graph, 300 nodes, 3 components. Exact. Unweighted, undirected." That's more than NetworkX tells me. Unless I type it into a notebook cell myself, I lose it. What the row doesn't give me is a seed. I've been burned by rerunning Louvain and getting different groups, and a seed is what stops that. I also need the scope and settings to come out in the CSV header, not just sit in a panel. My director never sees the panel. He sees the spreadsheet.

**Maren** is right that "weight: confidence" with no source is like a legend that reads "2, 8, 4". It's honest, and it still doesn't tell you anything. **Priya**, I'd go further than you on the GEXF point. My data starts as two CSVs out of SQL. If loading them means an import dialog every Monday, the weekly return isn't weekly.

**What's missing:** a way to script it. I trust code I can rerun. If the recipe were a file my notebook could write and this tool could read, that would replace the Gephi half of my week. Also, the "WF-corrected" tooltip is good, but I'd still be copying its explanation into a slide by hand.

### Round 3 -- what would make you switch, what would make you quit, one change

**Mara:** For the record, it's Mara, not Priya or Anna.

**What would make me switch:** GEXF in and GEXF out, with positions, colours and modularity class all still there, and a methods line I can copy that includes the layout algorithm, its parameters and the seed. If I can open a file NetworkX wrote, style it, and hand a coauthor back the same file with the work kept in it, I'll use this for teaching next term.

**What would make me quit:** any of the following.

- A layout I can't name or cite.
- An SVG with the legend flattened out of it, which puts me back in Inkscape.
- Losing a figure's settings when I reopen it.

Alex, I agree with you that the recipe should be a plain file a notebook can write. That's my scripting path too. I don't need RCy3.

Dr. Chen, I'm with you on membership. The legend should name the algorithm and resolution, "Louvain, resolution 1.0, seed 42", and never just "group 4".

**The one thing I'd change:** the at-rest demo should start from a GEXF file somebody hands you, not a bundled sample.

**Maren:** What would make me switch is starting from what I actually have. I'd paste my gene list and my DESeq2 table, get a network with the STRING version and cutoff written into it, see the match screen, and then colour by log2FC on a scale centred at zero and clipped so my one gene at 9 doesn't wash out everything else. Then I'd export a vector file with the legend inside it. If I got that and a methods line I can paste, I'd leave Cytoscape tomorrow. Dr. Chen is right that the methods line also has to say whether weights were ignored or inverted.

What would make me quit is if I have to build the graphml in Cytoscape first. Then this is just a nicer viewer I'd use once.

Alex, I don't need the scripting path. Dr. Chen does, and so do you. Mara, I'm going to disagree with you a little. For me GEXF round-tripping matters less than a legend in the SVG, because the export is my whole Friday.

The one thing I'd change is to make the match screen the front door for gene lists, not a step you only reach after loading a file. Right now the best thing in the tool sits behind a file I don't have.

**Dr. Chen:** **What would make me switch:** give me a methods line I can copy out as text, and a results CSV keyed on the identifiers I loaded, with the scope, the weighting and the tool version in the header. And it has to be something I can drive from R. Alex is right that a recipe my script can write and this tool can read would get me most of the way. A small REST or command-line path, like RCy3 has, would get me all the way.

**What would make me quit:** the tool quietly changing my data. If it accepts "Use MDM2" on a mouse list without a species warning, or runs betweenness on confidence scores as if they were distances, I'm gone after one reviewer's comment.

**The one thing to change:** start the provenance before the file. Maren and I both begin with a gene list, not a graphml. Even if graphty never queries STRING itself, it should record where the edges came from: STRING version, cutoff, date. Mara, the GEXF round trip matters to me less than that does. Positions can be regenerated. An unknown source can't.

**Alex:** **What would make me switch:** The same numbers as NetworkX, and a recipe my notebook can write, so next month I drop in the two refreshed CSVs and the picture comes back with the same colours and the same groups. The seed should be in the file. If that works, it replaces the Gephi half of my week, and I'd forgive a lot of rough edges for that.

**What would make me quit:** Running Louvain twice and getting different groups with no warning. Or the settings living only in the panel, so the CSV my director opens says "betweenness" and nothing else. I've also lost colours on reopen once already. If it happens again, I'm done.

**The one thing to change:** I agree with Mara that the scope and settings have to go into the export itself, not just onto the screen. I'd add one thing. Put it in the column header and in a notes line that Excel shows, because my director never sees a panel.

Maren, I'd trade your enrichment for my seed. We both want to cite the thing without retyping it. Dr. Chen, I agree with you on the tidy CSV, but keyed on whatever ID I loaded, not Ensembl.

On the split style-stack result: honestly, "layers" still reads like developer-speak to me. I'd rather it just said "colours".

## Themes

Counting rule: a voice counts as independent when it first appears in round 1 (written alone) or when a participant raises it without having been prompted by someone else's words. A voice that begins "X is right" or "I agree with X" is counted as agreement, not as independent evidence. Severity uses Nielsen's 0-4 scale (4 = blocks adoption).

### 1. What a result was computed on must leave the app with it -- severity 4

The on-screen scope line ("exact, unweighted, full graph", "Out of date" when scopes disagree) was praised by all four as better than Gephi, Cytoscape or NetworkX. None would cite it yet, because it stays on screen. Each wants it inside what they export: the CSV column header (Mara, Alex, Dr. Chen), a notes line Excel shows (Alex), and a methods sentence copyable as text (Maren, Dr. Chen, Mara).

- Voiced by: all four, independently in round 2 (each in their own terms).
- Specifics to carry: normalized or not, weighted and by which column, exact or sampled, and the filter named, not just "76 of 77 nodes, 1 step" (Mara); whether weights were ignored or inverted into distances (Dr. Chen, then Maren agreed); tool version (Dr. Chen).
- Dissent: none.
- Discount: little. This was the most independent and most consistent finding of the session.

### 2. Group legends show arbitrary ids -- severity 3

"2, 8, 4, 1" and "group 4" mean nothing to a reviewer or a director.

- Voiced independently in round 1 by Mara, Dr. Chen and Alex; Maren joined in round 2 ("I agree with you").
- Two different fixes were asked for, and they are not the same:
  - Name the algorithm, resolution and seed in the legend ("Louvain, resolution 1.0, seed 42") -- Mara, Dr. Chen (membership should come from a citable clustering such as MCL or Leiden, not from the picture).
  - Put a meaningful label in the slot ("cell cycle, FDR 1e-8") -- Maren. That needs enrichment, which she alone asked for and which is outside what the app offers.
- Discount: the ids themselves may be a mock fixture choice; the underlying finding (no provenance on group membership) is design, not fidelity.

### 3. Nobody starts where the design starts -- severity 3

Every mock and storyboard begins from a finished file (a bundled sample or ppi-core-300.graphml). Each participant's real first five minutes begins elsewhere: a GEXF from NetworkX (Mara), a gene list and a DESeq2 table (Maren, Dr. Chen), two CSVs out of SQL every Monday (Alex).

- Voiced by: Mara and Maren independently in round 1; Dr. Chen and Alex in round 2, each with their own input.
- Related asks: record where the edges came from -- STRING version, cutoff, date -- even if the app never queries STRING itself (Maren, Dr. Chen; strongest for Dr. Chen: "positions can be regenerated, an unknown source can't"). Make the gene-match screen the front door for a pasted list (Maren only).
- Dissent: on which input matters most -- this is four different entry points, not one.
- Discount: part of this is fidelity. The storyboards follow a fraud investigator and a biology postdoc, the weekly return has no supplier fixture (the page says so), and the demo is Les Miserables. Personas who do not see themselves in a storyboard will say "not my week" regardless of the design. The real design question is whether the load step names its source and supports repeatable reloads, not which sample is bundled.

### 4. Reproducibility: seeds, named layouts, settings that survive reopening -- severity 3

- Seed for community detection so reruns give the same groups: Alex (round 2, raised unprompted from a real incident), then Mara.
- Layout must be named and its parameters and seed recorded, not just "Force-directed": Mara (round 1 and 3).
- Losing styles on reopen is a quit trigger: Alex (round 1 and 3, from Gephi experience), Mara (round 3).
- Alex was hopeful in round 1 that styles listed as layers would fix reopen loss, and would believe "March stays as a version" only after reopening a project himself.
- Dissent: none. Discount: Mara's adoption of the seed in round 3 came after Alex raised it, so count seeds as two voices with one origin.

### 5. A recipe as a plain file a script can write -- severity 2

- Alex raised it (round 2): a recipe file his notebook writes and the app reads. Dr. Chen wants the same plus a REST or command-line path like RCy3 (round 2 and 3). Mara adopted it in round 3 as "my scripting path too".
- Dissent: Maren explicitly does not need it.
- Discount: this is the clearest group-think cascade in the session. Mara in rounds 1 and 2 never mentioned scripting; she joined after Alex framed it. Treat as two independent voices (Alex, Dr. Chen), both from people who already live in code. It also touches a published file format, so any change is a one-way door to propose, not decide.

### 6. Vector export must keep the legend -- severity 3

- Mara (round 1, as a conditional hope; round 3, as a quit trigger), Maren (round 2 and 3: "the export is my whole Friday").
- Dissent: on priority. Maren ranks it above the GEXF round trip; Mara ranks GEXF first.

### 7. Identifier matching is the best thing shown, and has two holes -- severity 3

- Praise: "84 of 96 genes matched" with each dropped gene and its reason -- Maren and Dr. Chen, independently in round 1.
- Holes (Dr. Chen only, raised twice): Excel-mangled symbols should be offered their current names (SEPTIN7, MARCHF2), not just flagged; "Use MDM2" on a mouse symbol must warn about species. He named the species case as a quit trigger.
- Discount: single participant, but domain-expert, specific, and a correctness risk that ends up in published papers. Keep it, marked single-source.

### 8. Weighted algorithms must say how weights were used -- severity 3

- Dr. Chen (round 2, round 3 quit trigger): betweenness on confidence scores is meaningless unless confidence is converted to a distance. Maren endorsed it in round 3. Mara asked the related "weighted, by which column" in round 2.
- Discount: Maren's voice is agreement. Two independent sources (Dr. Chen, Mara).

### 9. Data never leaving the machine -- positive, keep

- "This browser. Nothing sent." -- Mara, Maren, Alex, independently in round 1. Alex adds that a recipe carrying no data is what gets styling past his data policy.

### 10. Statistics panel -- positive, keep

- Components, isolates and density at rest are the first check both Dr. Chen and Alex run; Mara praised naming the weight column. Round 1, independent.

### 11. Smaller points, single voice

- Colour palette hard for colour-blind readers: Maren (PI is red-green colour-blind), Alex (cannot separate orange from green). Two independent voices in round 1 -- promote above single-voice, severity 2. Dr. Chen approved red-blue for fold change.
- Diverging scale for log2FC centred at zero and clipped for outliers: Maren only. Severity 2.
- No sortable node table at rest: Mara round 1, then half-withdrawn in round 2 after seeing the table mock. Severity 1.
- "Overview: General" and "Replace" unclear: Dr. Chen only, once. Severity 2 if repeated elsewhere.
- "Layers" reads as developer-speak, would rather it said "colours": Alex only, once, in the last turn. Severity 1 until another study repeats it.
- Results CSV keyed on the loaded identifiers: Dr. Chen (asked for Ensembl first, then "the identifiers I loaded"), Alex ("whatever ID I loaded, not Ensembl"). Agreement on the rule, not on one id type.
- Import dialog every Monday breaks a weekly routine: Alex only.
- Explanatory tooltip ("WF-corrected") has to be copyable into a slide: Alex only.
- Enrichment labels: Maren only. Out of scope for the app; note it and move on.

## Agreement and dissent

- Full agreement: scope and settings must travel inside exports (theme 1); arbitrary group ids are not acceptable (theme 2); local-only data handling is valued (theme 9).
- Split: what the entry point should be (four different inputs); GEXF round trip vs legend in the SVG vs upstream provenance as the top priority (Mara vs Maren vs Dr. Chen, each explicit); whether scripting is needed (Alex and Dr. Chen yes, Maren no); what the group legend should say (algorithm and seed vs a biological label).
- Mara's own shift: from "no Data Laboratory, no trust" (round 1) to taking half of that back after the table mock (round 2). The table mock worked on her.

## Group-think and fidelity effects to discount

- **Agreement chaining.** Rounds 2 and 3 open most points with "X is right" or "I agree with X". Those are not new evidence. Counts above credit only the first speaker unless a later one added an independent reason.
- **The scripting cascade.** Mara joined the recipe-file idea only after Alex framed it; count it as Alex and Dr. Chen.
- **The seed cascade.** Mara's "seed 42" in round 3 follows Alex's round 2 seed point.
- **Maren's endorsement of weight inversion** follows Dr. Chen directly.
- **Name confusion.** Participants misnamed Mara three ways ("Priya", "Anna", possibly "Petra"). This is a simulation artifact; it does not bear on the design, but it does suggest cross-talk in rounds 2 and 3 was less attentive than round 1.
- **Fixture mismatch.** "Not my week" reactions to the storyboards (Mara, Maren, Alex) are partly about the chosen personas and missing fixtures (no supplier data for the weekly return, a bundled demo), not about the flows. Judge the flows on their steps, not on whose story they tell.
- **Round 1 is the cleanest evidence.** It was written alone. Where a finding appears there from two or more people, weight it highest: legend ids, data staying local, statistics panel, starting from a real input, colour-blind palette, identifier-match praise.
