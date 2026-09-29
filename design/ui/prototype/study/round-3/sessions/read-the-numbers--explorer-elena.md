# Read the numbers -- Explorer Elena

**Participant:** Explorer Elena, a product manager with no graph training (simulated; see
`study/personas/explorer-elena.md`). Trackpad, company laptop. Her reflexes come from Google
Sheets and her product-analytics dashboard. Curious-afternoon clock: no deadline.

**Task as read by the moderator:** "You loaded 300 proteins and filtered to one module. Explain
every count on screen, and why the node count is not 300."

**What the moderator planted (Elena was not told):** the human protein interaction file, 300
proteins and 1,262 interactions, filtered down to the Ribosome module, which holds 56 proteins.

**Screens, in order, as she saw them (study view, 1440 x 900):**

1. The open dialog for `ppi-core-300.graphml` -- `shots/r3-elena-read-numbers-load.png`
2. The app after loading, full graph -- `shots/r3-elena-read-numbers-frame.png`
3. The filter steps screen -- `shots/r3-elena-read-numbers-filter.png`
4. The results panel, betweenness finished -- `shots/r3-elena-read-numbers-results.png`
5. The results panel on a filtered graph (the moderator opened it when she asked for "the
   filtered one") -- `shots/r3-elena-read-numbers-results-filtered.png`

**Outcome:** finished with difficulty, and only by inference. She explained 300 and 1,262
correctly, and guessed the right answer to "why not 300" (the filter kept only Ribosome, 56)
from the colour key on screen 2. She never saw the protein graph actually filtered: the filter
screen and the filtered results screen both show a different data set (Les Miserables, 77
characters), which confused her for about a minute and cost the session most of her trust. She
skipped density, average degree and every betweenness number as "not for me".

## Transcript

### 1. The open dialog

> OK. "Open ppi-core-300.graphml." I don't know what graphml is but I guess it's the file. There's
> a little table on the right, "Sample, first 5 of 300 nodes." So nodes are the proteins. PSMA1,
> PSMA2... these are proteins? Sure. "Proteasome", "Proteasome". That's the module column, I
> think -- yeah, it says module.

She reads the bottom right.

> "What will load: nodes 300, edges 1,262." OK so that's my first two numbers. 300 proteins, and
> 1,262... edges is the lines, right? The connections between them. That's what I'd guess.

She looks at the left half.

> "Category, 9 values." So there are nine modules. Good to know. "Role: None, None, None." I have
> no idea what Role does and I'm not touching it. "log2FoldChange", no. "Direction: Undirected,
> as the file declares." Fine. I'm just going to hit Load, that's the blue one.

*Clicks Load.*

### 2. The app after loading

> Ooh. OK, that's nice, the colours are in little neighbourhoods. The yellow ones at the bottom,
> the orange ones... this is kind of pretty.

She looks at the canvas for several seconds before reading anything.

> So the big grey ones in the middle -- UBC, MYC, AKT1 -- those are the important ones, they're
> in the middle of everything. Everything connects to them.

(The dots in the middle are the same size as the rest; she is reading position as importance.)

> OK, numbers. Right side, "Statistics". Nodes 300. Same as before, good, nothing went missing.
> Edges 1,262, same as before. "undirected, weight: confidence." I don't know what weight is.

> "Density 0.0281." Is that... 2.8 percent? Of what?

She hovers the small circle-i next to Density. Nothing appears.

> Nothing. OK. I'm going to say density is "how packed it is" and move on.

> "Connected components 3 (2 isolates)." So... three groups? But there are like nine colours.
> Hm. Oh wait, maybe the isolates are those loner dots out on the edge. There's one up top right,
> one down at the bottom. So two of them aren't connected to anything, and "3" is... the big blob
> plus those two? That's actually kind of clever if that's what it means. I'm not sure it is.

> "Degree distribution", little bar chart. No idea. "Attributes 4". Sure.

She finds the colour key at the bottom left of the canvas.

> Oh, here we go. "Module color." Ribosome 56, Proteasome 40, Complex I 35... At first I thought
> that was, like, how many connections each one has. But no -- it's how many proteins are in each
> colour, right? Let me add them. 56, 96, 131, 163, 194, 224, 253, 274, and Other 26 is 300. Yes!
> OK, it adds up to 300. I like that it adds up.

> So if I "filtered to one module"... the moderator said one module... if it's Ribosome the answer
> is 56. That's my guess for "why not 300". But I haven't filtered anything, it says "Full graph"
> up here.

She clicks the "Full graph" button under the file name, top left. In the prototype it does
nothing.

> Hm, nothing. I'd expect a menu here. "Full graph" with a little arrow... In our dashboard I'd
> click the Ribosome bar and it filters. Can I click Ribosome in the key?

She clicks Ribosome in the colour key. Nothing happens in the prototype.

> No. OK. I'll trust you that I filtered it. Next screen.

### 3. The filter steps screen

> Wait. "Les Miserables"? That's... the musical? Where are my proteins?

Pause of several seconds.

> "27 of 77 nodes, 3 steps." Did I load the wrong file? I didn't open Les Miserables. Did I click
> something?

The moderator says this screen shows how filtering works "on a different example".

> Oh. OK. That's confusing, but fine. So in real life this would say, what, "56 of 300 nodes, 1
> step"? That would actually answer the question straight away. "56 of 300". I like that.

She reads the white box.

> "Filter to degree >= 2. took out 17, 60 left." I don't know what degree is, but "took out 17,
> 60 left" -- that's really clear. Then "took out 20, 40 left", then "took out 13, 27 left". OK so
> 77, minus 17 is 60, minus 20 is 40, minus 13 is 27. Yep. That's like a funnel in our dashboard.
> I get this part.

> "Filter out group 8." Groups have numbers here instead of names. Whatever.

She looks right.

> "Filtered graph: 27 of 77 nodes." Edges "104 of 254". Components 1, largest component 27,
> isolated nodes 0, "average degree 7.70", density 0.296. There are little funnel things next to
> every number. Does that mean they're filtered? Or that I can filter by them? I'd be scared to
> click it.

> The table at the bottom has two degree columns, "degree" and "degree on: full graph". Valjean 17
> and 36. So... 36 before and 17 now? Because the others are gone? I think that's what that is.
> That's kind of neat, actually, but I'd never think to look there.

### 4. The results panel, full graph

> OK, proteins are back. Everything is orange now. Brown-orange. Where did my colours go?

She looks for a while.

> "Betweenness." There it is. I don't know what that is. "on: full graph, 300 nodes, 3
> components." Wait -- the moderator said I filtered to one module. This says full graph, 300. So
> is this before the filter? Now I'm lost about which one is "now".

> Right side says nodes 300, edges 1,262, components 3, average degree 8.41. Same as before, fine.
> "Edges: undirected, no weight." The other screen said "weight: confidence". So... which is it?
> I don't know what weight is, but it changed, and nothing else changed.

> "Distribution 300 nodes." "middle 0.0038, highest 0.138, zero: 10 nodes, all 291=". What is
> 291 equals? Equals what? ... I'm not going to explain these. I'd ask our data person.

> The big dots down in the key -- "Degree size, 0 to 1 ... 17 to 34". So big dots have more
> connections. OK so MAPK1 and TP53 at the top of the list are the big ones. So TP53 is the most
> connected protein.

(Top nodes are ranked by betweenness, not by connections. She reads it as connections.)

### 5. The results panel on a filtered graph

Elena asks, "Is there one where it's actually filtered?" The moderator opens the filtered state.

> Les Miserables again. "Filtered: 60 of 77 nodes, 1 step." OK so this is the "of" thing again.
> Nodes 60 with a funnel. And the betweenness box says "Filtered graph, 60 of 77". So the maths
> only ran on the 60. That's good to know -- I'd have assumed it counted everyone.

> "Run record"... "Normalization: divided by (n-1)(n-2)/2 = 1,711 node pairs"... no. No no no.

She closes her attention on the right panel.

> OK. So my answer: I loaded 300 proteins with 1,262 connections. Nine modules, the key adds up to
> 300. I filtered to Ribosome, which is 56 proteins, so the node count would say "56 of 300".
> Components 3 is the big clump plus two loners. I can't tell you what density or betweenness are.

## After the task

**Single Ease Question: 3 of 7.**

> The adding-up part was easy -- the key adding to 300 and the "took out 17, 60 left" thing, I
> loved that. But I never actually saw my proteins filtered. I had to guess 56 from the colour
> key, and then two screens were a musical. And half the numbers I just skipped.

**Would she use this instead of what she uses now?**

> For "how many are in each group, and how many are left after I filter" -- maybe, yes, it's
> clearer than a pivot table for this kind of data. For anything with "betweenness" or
> "density" -- I'd screenshot it and send it to someone who knows. I wouldn't put a number on a
> slide that I can't explain, and I couldn't explain most of them. And the weight thing changing
> between screens -- if my VP spots that, I'm done.

## Moderator notes

- **The task state was never shown.** No screen showed the protein graph filtered to Ribosome.
  The filter screen and the filtered results screen both show Les Miserables. She lost about a
  minute and asked whether she had opened the wrong file. The "56 of 300" she produced came from
  adding up the colour key, not from the product telling her.
- **What worked:** the colour key's counts adding exactly to 300; "took out 17, 60 left" per
  step; "27 of 77 nodes" in the chip; "Filtered graph, 60 of 77" as the scope of a result. Every
  number phrased as "X of Y" or "took out N" she explained unaided.
- **Weight contradicts itself.** The app screen says "undirected, weight: confidence"; the
  results screen for the same file says "undirected, no weight" and Weight "None declared". She
  noticed it without knowing what weight means, and it cost trust.
- **Info icons are silent.** Hovering the circle-i next to Density and Connected components shows
  nothing in the prototype. She guessed "how packed it is".
- **"3 (2 isolates)"** she decoded correctly by finding the loner dots, but said she was not sure.
- **Misreadings:** (a) the grey dots in the middle are "the important ones" -- position read as
  importance; (b) MAPK1 and TP53 top the list because they are "the most connected" -- a
  betweenness ranking read as a connection count, helped by the size key sitting right next to
  it.
- **Jargon she skipped:** density, average degree, degree, betweenness, "291=", normalization,
  weight, Role. "291=" drew an explicit "equals what?".
- **Controls she tried that did nothing:** the "Full graph" chip on the app screen (expected a
  filter menu), clicking "Ribosome" in the colour key (expected it to filter, as in her
  dashboard). Neither is wired in the prototype.
- **Funnel icons** next to every statistic on the filter screen: she could not tell whether they
  mean "this is filtered" or "filter by this", and said she would be scared to click one.
