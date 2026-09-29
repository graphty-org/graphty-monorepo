# Session: who matters most in Les Miserables, and how sure

Participant: Maren, cancer genomics postdoc, Cytoscape user (persona: genomics-cytoscape-user).
Screen: 14-inch laptop, 1440 x 900, Chrome.
Task as given by the moderator: "You have the Les Miserables co-appearance network open. Find the few characters who matter most to how the story hangs together, and tell me how sure you are of their order." The same task, in the same words, as the previous round.

Screens used, in the order she met them (all renders are the participant view, design notes hidden, in `shots/r6-maren-who/`):

- The project at rest, Les Miserables: `screens/frame-at-rest.html?dataset=lesmis` (`far-lesmis.png`), and the same project in the new shell with the table open, sorted by degree (`screens/navigation.html?frame=new`, `nav-new.png`)
- The main menu's Algorithms list (`screens/results-panel.html#catalog`, `rp-catalog.png`) and the Results panel's "Run a measure..." list (`screens/run-and-read.html#catalog`, `rr-catalog.png`); both are drawn over the protein network
- The Results list for Les Miserables (`screens/navigation.html?frame=new-results`, `nav-results.png`) and the finished full-graph betweenness run opened from it (`?frame=new-run`, `nav-run.png`)
- Valjean selected, with his results on the right (`?frame=new-node`, `nav-node.png`)
- The table with degree and betweenness ranked side by side, Valjean selected (`screens/table-dock.html#small`, `td-small.png`), the betweenness column's header card (`#header`, `td-header.png`), and "Compare rankings..." from it (`screens/comparison.html`, `cmp.png`)
- A finished betweenness result on the protein network, with its tie sentence (`screens/results-panel.html#finished`, `rp-finished.png`), and the protein table with three measures and near-tie marks (`screens/table-dock.html#ranked`, `td-ranked.png`)
- The betweenness result after "Filter to degree >= 2", 60 of 77 characters, run record open (`screens/results-panel.html#filtered`, `rp-filtered.png`)
- The same project after three filter steps, betweenness marked out of date (`screens/table-dock.html#stale`, `td-stale.png`)
- A closeness run on the network with Valjean filtered out, weighted by shared scenes (`screens/closeness-variant.html#b1`, `#b2`; `cv-b1.png`, `cv-b2.png`)

Moderator note: the Algorithms menu, the "Run a measure..." list, the result panel with the tie sentence, the three-measure table and the node inspector are drawn only on the protein network. Where she met one, the moderator said "imagine it is your characters". The Les Miserables numbers she used come from the Results list, the finished full-graph run, the table, the filtered result and the closeness screens, which all show this network.

## Transcript (thinking aloud)

**The network, at rest.** Les Miserables again. 77 nodes, 254 edges, one connected component. Good, no largest-component step. Group color legend: 2, 8, 4, 1, 3, 5, 0, Other -- "Groups 6, 7 and 10". Still just numbers. Somebody's clustering from the file. Orange, blue, green, fine for my PI.

"Labels: the 18 characters with the most connections. 5 more hidden where they overlap." I still like that. It tells me the labels are a degree ranking, which is the thing I'd call "hubs" anyway.

In the other version of the screen the nodes are sized now -- "Size: degree" is in the Style stack on the right, and the table at the bottom says "Full graph: 77 nodes. Sorted by degree." Valjean 36, Gavroche 22, Marius 19, Javert 17, Thenardier 16, Fantine 15. OK. So before I've even done anything, that's my degree top six. In Cytoscape I'd have to run NetworkAnalyzer to get that column. Here it's just there.

On the left there's stuff I didn't make: "Friends of Valjean, frozen, 36", "The barricade, rule, 13", "Fantine to Marius, path, 3", and Views, "The whole novel". Somebody's been working in this project. Not mine, leave it.

**Picking a measure.** I go to Results. The main menu's Algorithms list is the same as last time -- Betweenness, Closeness "WF-corrected", Eigenvector with a warning "3 components" -- and it's on the protein network again. (Moderator: "imagine it is your characters.") Still no Degree in that list.

But the button in the Results panel, "Run a measure...", has a different list, and the first heading is "Degree": "Links (count)" and "Total confidence". Oh. There's Degree. "Links (count)" I get -- number of partners. "Total confidence" I guess is the STRING scores added up, so for Les Mis it'd be the scenes added up. So the two lists aren't the same list. That's odd. If I'd only opened the main menu I'd have said Degree is missing, same as last time.

Hovering Betweenness: "How often a node lies on the shortest paths between other nodes: the brokers and bottlenecks. Click to run." Brokers. OK, that's the "sits between" thing, in one line. I'd read that one. Still no MCC. I'll take Betweenness because it's first and it's the one I recognise from cytoHubba.

**The Les Mis run.** This time there's a real one. Results list, "Newest first": "Betweenness, today, 14:02. Exact, normalized, no weight. Full graph, 77 nodes." And "Bridges, 27 Sep", which I didn't ask for. I open Betweenness.

"Ran on the full graph, 77 nodes. No weight: every edge counts the same." Then settings: method exact, every node; normalized yes; edges undirected; weight none; ran 29 Sep 2026, 14:02. That's clean. That's four lines of my methods paragraph and I didn't have to find a Details button.

"No weight: every edge counts the same." That sentence is clearer than last time's "value not used yet". It tells me what it means: Valjean-and-Cosette, who are together all book, counts the same as Valjean and some one-scene nun. Hm. For a co-appearance network that bothers me more when it's put that plainly.

Top nodes: Valjean 0.57, Myriel 0.177, Gavroche 0.165. Three. Just three. And there's no line about ties this time, which honestly is fine by me, I didn't like that 1% sentence.

Myriel second again. And the table below now sorts by betweenness: Valjean, Myriel, Gavroche, Marius, Fantine, Thenardier. I know from last time what's going on with Myriel -- he's the bishop with his little fan of people in the top right who only know him. Napoleon, the Countess, all those. Looking at the picture, yes, the blue cluster up there hangs off him.

**Valjean.** Click him. Right side: "Valjean, Node". Appearance: "Size: degree, size", "Group color, color". Attributes: group 2, degree 36. Results: "betweenness 0.57, highest". "bridges: on no bridge". Still means nothing to me. There's a crossed-out eye next to "Bridges off" in the style stack, so somebody ran it and hid it. Skip.

0.57 against 0.177. Three times the next one. Valjean, done. Nobody needs a computer for that one.

**The table.** Table, full graph, 77 nodes. "Valjean is #1 on both measures. At #2 they part: Gavroche by degree, Myriel by betweenness." Same line as last time and it's still the best thing here. That's exactly what I'd do in Excel by hand with the cytoHubba exports.

Degree and betweenness side by side with "rank of 77". Gavroche #2 and #3, Marius #3 and #4. I open the betweenness header -- a little histogram, "77 nodes, 47 at 0. Shaded: 1 past the outlier fence." 47 at zero. So more than half the characters are never between anybody. That's actually useful -- it's telling me betweenness is basically a few people and then nothing. The one past the fence has to be Valjean.

"Compare rankings..." -- I try it again. "Payments network review", 3,093 accounts. Same as last time. That's a bank, not my novel. Back. That's the one screen that sounded like it would answer "how sure", and it's somebody else's data.

**The protein screens (imagine it's your characters).** On the protein table there's something I didn't see before. A line: "Near tie: the next rank's value is within 1%, so a small change in the data could swap them. '=' marks an exact tie." And in the rank columns, "#6, near #7", "#9, near #10", "#4=". OK -- THAT I understand. "Could swap them" is the question I'm asking. It's the same 1% idea as the sentence in the result panel, but said the right way round: it tells me which pairs not to quote as an order. The result panel on the protein network still says "Every step in the top 5 is over the 1% tie line; the smallest, ranks 3 and 4, is 1.2%", and I still read 1.2% as basically nothing.

But the Les Mis table doesn't have the "near" marks. Maybe because nothing's within 1% there. I can't tell if they're missing or if there just aren't any. If there aren't any, I'd want it to say "no near ties" -- otherwise I'm guessing again.

And "a small change in the data" -- sure, but my worry isn't the data changing. It's me. I choose a filter, I choose whether to use the scene counts. That's what moves this order.

**Trying the order on a smaller network.** Same as last time, I want to drop the one-scene people, like dropping unconnected genes. The filtered result is there: "Filtered: 60 of 77 nodes, 1 step". "Betweenness, on 60 of 77 nodes, Sep 28 11:02". Top nodes: Valjean 0.419, Gavroche 0.172, Marius 0.164, Fantine 0.154, Javert 0.073.

Myriel's gone from the top five. Look at the picture -- he's still drawn, with two people left around him, but his fan is gone, so he's nothing now.

The run record is still good: Brandes, exact; normalization "divided by (n-1)(n-2)/2 = 1,711 node pairs; n = 60, the filtered graph"; scope "Filtered graph, 60 of 77: after Filter to degree >= 2"; weight "None: value not used". Copy button. Fine.

But: "Runs of this measure: 1". One? There's the full-graph one from today at 14:02 -- I just looked at it. This panel only knows about itself. And the dates are backwards: the filtered run is from yesterday, the full-graph one from today. So which one is "the" result? Nothing on this screen says "on the full graph Myriel was #2, here he's not in the top five." I only know because I opened both. That's the same thing I complained about last round and it's still true.

"Every step in the top 5 is over the 1% tie line; the smallest, ranks 2 and 3, is 4.7%." Gavroche 0.172, Marius 0.164. 4.7% apart. I'd still call that the same, honestly, if a filter I made two minutes ago can shift things that much.

There's another screen where somebody went further, three filter steps, 27 of 77, and the betweenness column says "Out of date, Re-run", with the old full-graph ranks still showing. Good that it says out of date. At least it's not pretending.

**Somebody used the scene counts.** Then there's this closeness screen. "76 of 77 nodes, 1 step." Somebody filtered out... Valjean. Who does that? The network falls into 7 pieces and Myriel's bunch floats off by itself, top right. OK, it's a "what if the main character wasn't there" thing. Weird, but actually that's a fair test of who holds things together.

In the Runs list: "Betweenness, Distance = 1 / value" and "Closeness (WF-corrected), Distance = 1 / value". So here somebody DID use the value -- more shared scenes, shorter distance. "1 / value" I can follow: 20 scenes together, they're close. That's the first time the weight thing was written in a way I'd dare to pick. Last round I wouldn't touch "Change...".

The closeness result, sorted: Javert 0.997, Enjolras 0.983, Courfeyrac 0.960, Marius 0.930, Combeferre 0.928, Bossuet 0.906, Cosette 0.897. So without Valjean, Javert's on top, and then it's the student guys from the barricade. Gavroche isn't even in the first seven. The tooltip on "WF-corrected": "7 components: each score is scaled by the share of the graph the node can reach (Wasserman-Faust)." I don't know Wasserman-Faust. It offers me "Harmonic centrality" instead, "Scaled for 7 components". I'm not choosing between those.

And I can't see the weighted betweenness numbers. It's in the Runs list but I don't have its top five. That's the one I actually wanted: same measure, with and without the scene counts. Would Gavroche and Marius swap? Would Fantine come up, because she's in a lot of scenes with Valjean? I can't tell from here.

What this screen does tell me: the answer changes a lot depending on who you take out and which measure. Javert and the students are near the top on one thing, Gavroche and Marius on another, Myriel on a third. So "the order" is really "the order under which choices".

**My answer.** Valjean first, and I'm sure: 0.57 against 0.177 on the full graph, first on degree, first after dropping the one-scene characters.

Then a group, not an order: Gavroche and Marius. They're near the top on degree (#2, #3), on betweenness (#3, #4 full graph; #2, #3 filtered), and whatever I do they stay in the top five. I'd say Gavroche then Marius but I'd never put that in writing.

Then Javert and Fantine, depending on the measure: Fantine is #5 on betweenness in both runs; Javert is #4 by degree and comes out on top of closeness once Valjean is gone and the scene counts are used.

Myriel I leave out: he's #2 on the full-graph betweenness only because of his circle of one-scene people, and he drops out of the top five as soon as they're removed.

How sure: #1 certain. #2 and #3 as a pair, not as an order. #4 and #5 depend on the measure. I didn't get to see betweenness with the scene counts, so I can't say whether that would shuffle the pair.

## After the task

**Single Ease Question: 5 out of 7.** Better than last time in the parts I touched first: there's a real Les Miserables betweenness run with its settings right there in plain words ("No weight: every edge counts the same"), Degree is finally in a measure list, and on the protein table the "near #10" marks say which pairs could swap, which is the question I was asking. But I still built the "how sure" part myself. The filtered run says "Runs of this measure: 1" and doesn't know the full-graph run exists, so Myriel's fall is still something I find by opening both. "Compare rankings..." still opens a bank. The near-tie marks are on the protein network and not on mine. And the one run that uses the scene counts, the thing I most wanted to compare, only shows me its name.

**Would you use this instead of Cytoscape?** "For picking candidates -- which characters, which genes -- yes, I'd use this over cytoHubba plus Excel. Degree and betweenness side by side with ranks, the one line saying where they part, and a run record that writes down the filter and the weight: that's what I'd be doing by hand. And 'Distance = 1 / value' is the first time I understood what a weight setting would do before I clicked it. But there's still no MCC, and 'top ten by MCC' is what reviewers expect to see, so I'd still run cytoHubba for the number I cite. And what it told me is that Valjean is the main character of Les Miserables, which I knew; the useful part was Myriel being an artefact, and I found that by opening two runs, not because it told me. So: for exploring, yes. The hub table in the paper still comes out of Cytoscape."

## Problems observed

1. **Severity 3 -- A filtered run does not know the full-graph run exists, so a changed order goes unsaid.** The filtered betweenness result (60 of 77) shows "Runs of this measure: 1", although a full-graph betweenness run is in the same project's Results list. Myriel is #2 on the full graph and absent from the filtered top five; nothing on either screen says so.
   Quote: "This panel only knows about itself."
2. **Severity 3 -- "Compare rankings..." from the Les Miserables table opens a payments network.** The one control that promises to answer "how sure" opens a 3,093-account bank comparison. Unchanged from the previous round.
   Quote: "That's a bank, not my novel."
3. **Severity 3 -- The weighted run she most wanted cannot be read.** The closeness screens list "Betweenness, Distance = 1 / value" in Runs, but its values are not shown anywhere, so she could not see whether using the shared-scene counts reorders Gavroche and Marius. The phrase itself worked: it is the first weight wording she would have chosen.
   Quote: "That's the one I actually wanted: same measure, with and without the scene counts."
4. **Severity 2 -- Two measure lists disagree about Degree.** "Run a measure..." in the Results panel starts with "Degree: Links (count), Total confidence"; the main menu's Algorithms list has no Degree. Had she used only the main menu she would have reported Degree missing again.
   Quote: "So the two lists aren't the same list."
5. **Severity 2 -- Near-tie marks exist only on the protein table, and their absence on hers is silent.** "#9, near #10" and the line "a small change in the data could swap them" are the confidence wording she understood, but the Les Miserables table has neither the marks nor a statement that there are no near ties.
   Quote: "I can't tell if they're missing or if there just aren't any."
6. **Severity 2 -- The result panel's tie sentence still reads as the opposite of what it means.** "Every step in the top 5 is over the 1% tie line; the smallest ... is 1.2%" (protein) and "... 4.7%" (Les Miserables filtered) read to her as "basically the same". The table's "could swap them" wording did not have this problem.
   Quote: "I still read 1.2% as basically nothing."
7. **Severity 2 -- Confidence is framed as data noise, not as her own choices.** "A small change in the data could swap them" answers a question she does not have; what moves the order is her filter, her measure and the weight.
   Quote: "My worry isn't the data changing. It's me."
8. **Severity 2 -- The menus, the tie sentence, the three-measure table and the inspector are drawn only on the protein network.** The moderator had to supply the framing again; the Les Miserables full-graph run shows only its top three.
9. **Severity 1 -- Closeness variant names ("WF-corrected", "Wasserman-Faust", "Harmonic centrality") are a choice she will not make.**
   Quote: "I'm not choosing between those."
10. **Severity 1 -- Run dates run backwards.** The filtered run is dated the day before the full-graph run it presumably came from, which made her unsure which result was current.
11. **Severity 1 -- Group legend is bare numbers; "bridges: on no bridge" in the node panel still means nothing to her.** Both unchanged.

What worked for her: a real Les Miserables betweenness run whose settings read as plain sentences ("No weight: every edge counts the same"); Degree offered as a measure; the table's single line on where degree and betweenness agree and part; the header card's "77 nodes, 47 at 0", which told her betweenness is a few characters and then nothing; the protein table's "near #N" marks and "could swap them" wording; "Out of date, Re-run" on a stale column; and "Distance = 1 / value", the first weight setting she understood before choosing it.
