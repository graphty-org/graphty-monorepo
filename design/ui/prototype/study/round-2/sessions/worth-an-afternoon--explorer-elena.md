# Session: is this file worth an afternoon? -- Explorer Elena

**Participant.** Explorer Elena, a product manager with no graph training (simulated; see
`study/personas/explorer-elena.md`). Clock: curious afternoon (no deadline, tolerates three or four
dead ends).

**Task as given by the moderator.** "A colleague sent you this file. Decide whether it is worth your
afternoon, and tell me anything that looks off."

**The file.** `ppi-core-300-evidence.tsv`, a tab-separated list of protein pairs with a `source`
column and a `confidence` column in which 150 of 2,298 values are `NA`. graphty reads that column
as text, which blocks loading while the column is set to weigh the connections.

**Screens used, in order.** The start screen on a first run; the load step with the confidence
column read as text, then its repeated-pairs question; the graph at rest with the protein data.
Renders: `shots/screens__start-screen.png`, `shots/screens__load-step-blocked.png`,
`shots/screens__load-step-policy.png`, `shots/screens__frame-at-rest-dataset-ppi.png`.

---

## 1. The start screen

> OK. "Open a graph." Four pictures -- karate club, Les Miserables, proteins, bank transfers. Those
> are the examples, I guess. The colourful one is pretty.
>
> My colleague sent me a file, so... I'd just drag it on here. Is there a drop zone? I don't see a
> box that says "drop". Oh -- "Open..." under the pictures. That's small. I almost went for the
> protein picture because the file name has "ppi" and "300" in it, and that card says 300 proteins.
> Is that the same thing? Probably not. I'll use Open.
>
> "Files stay on this computer. graphty reads them in this browser and uploads nothing." Good,
> because I'd have to ask IT otherwise. I'm not clicking "Where your data goes", that's fine.

*Moderator note: she hovered the "Protein interactions" sample for several seconds before finding
Open..., reading the matching "300" as a sign it might already be her file.*

## 2. The load step: the red line

> Oh no, red. "confidence is read as text, so it cannot weigh edges." OK... I don't know what
> "weigh edges" means. Something is wrong with the confidence column. I didn't even make this file.
>
> "150 of 2,298 values are NA; the rest are numbers between 0 and 1." NA -- like "not available"?
> So there are blanks. That's my colleague's fault, not mine, I think. Or I need to clean it first?
>
> Down at the bottom: "Load is off: choose how to read confidence." And the Load button is grey.
> OK, so it won't let me in until I pick something. At least it tells me where.
>
> There's a box "Choose how to read it" right under the red line. Clicking that. Three choices:
> "Number, NA as missing -- 2,298 edges; 150 of them without a weight." "Number, drop the rows with
> NA -- 2,148 edges; the 150 rows are not loaded." "Text -- cannot weigh edges."
>
> I'm not dropping anything. My colleague would kill me if 150 rows vanished and I didn't notice.
> The first one keeps them all. It's already highlighted, so I guess that's the one they want me to
> pick. Picking it.

*She chose "Number, NA as missing". She did not look at the Role column on the left, where the
column is set to Weight, and did not consider changing it.*

> The red went away. Good. I don't actually know what I agreed to, but nothing got deleted, so.

## 3. The load step: the yellow line

> Now there's a yellow one. "1,036 extra parallel edges." Extra sounds bad. Parallel edges?
> "Several rows join the same two proteins, one per evidence source." So the same pair shows up more
> than once. Like duplicates.
>
> The box says "Keep all: 2,298 edges". The other choice is "Merge into one, max of confidence:
> 1,262 edges. The source column is not kept." Merge... no. Anything that says "not kept" I leave
> alone. I'm keeping all.
>
> Hmm, but if they're "extra", should I have merged them? I don't know. It's yellow, not red, and
> Load is blue now. Moving on.
>
> "What will load: nodes 298, edges 2,298, without a weight 150." OK, I'll remember 2,298, that's
> the whole file. "298 nodes -- 2 proteins in the file have no interaction: GSK3B, NOTCH1." Wait,
> if they have no interaction, why are they in a list of interactions? And are they in or out? 298
> is two short of 300, so... out? I don't get that line. Probably a quirk of the file.
>
> Load.

## 4. The graph

> Ooh. OK, that's nice. Colour groups, with names: Ribosome, Proteasome, Complex I, DNA repair...
> I don't know biology but at least the groups have names and not numbers. The legend says how many
> are in each. That's actually what I wanted from Obsidian.
>
> The big dots in the middle -- UBC, HSP90AA1, MYC, AKT1 -- those are the important proteins, I
> guess. The most important one is the grey one in the very middle. The black MAPK1 one is big too,
> so that's important. "Size by degree" -- I don't know "degree". The little legend says 1, 10, 34.
> 34 what? Probably importance.

*She read size as importance and the centre as most important; the legend's "Size by degree" did
not register as "number of connections".*

> Now the right side. Statistics. "Nodes 300." Hang on. It said 298 a second ago. And "Edges
> 1,262." It said 2,298. I said keep all! 1,262 is the merge number -- that's the one I didn't pick.
>
> Did it merge anyway? Or did I click the wrong one? ... I'm pretty sure I left it on Keep all.
>
> And up in the corner the file chip says "ppi-core-300.g..." -- my file ended in .tsv. Is this even
> my file? Or did it open the protein sample? I've lost track of what I'm looking at now.
>
> "undirected, weight: confidence." OK, the confidence thing did go in. "Density 0.0281." Is that a
> lot? No idea. "Connected components 3 (2 isolates)" -- isolates, are those the two proteins with no
> interaction? Then they're in after all, and that's the 300.
>
> The colours, though -- did I do that? I didn't pick anything. It says "Module color" under Styles.
> Somebody chose it for me, which is fine, but was it the file or the app?

## 5. Wrap-up with the moderator

**Moderator: Is it worth your afternoon?**

> Honestly? For me, no -- it's proteins, it's my colleague's world. But the picture is clean and the
> groups have names, so if they asked "which group is the biggest" I could answer: Ribosome, 56. I'd
> screenshot the legend and the picture and send it back.
>
> What would stop me is the numbers. The box told me 2,298 and the screen says 1,262. If I send that
> to someone who checks, I look silly. I'd have to ask them which one is right.

**Moderator: Anything that looks off?**

> The confidence thing, it told me what was wrong and made me fix it before loading, which is
> better than it just silently dropping stuff. I'd have liked it in plain words -- "150 rows have no
> confidence value, what should we do with them?" I'd have understood that instantly.
>
> The counts changing. The file name not matching. The "2 proteins with no interaction" line that
> says 298 and then the screen says 300.

**Single Ease Question (1 very hard to 7 very easy): 4.**

> Getting in was OK once I found the box. Understanding what I'd got was the hard part.

**Would you use this instead of what you use now?**

> For my own spreadsheet, maybe -- the groups with names is the thing Excel and our dashboard can't
> give me, and nothing got uploaded. But not until the numbers on the screen match the numbers it
> promised me. I can't put a chart in a deck if I can't say how many things are in it.

---

## What happened (observer summary)

- **Found Open..., after a detour.** She looked for a drop box first, then nearly opened the
  "Protein interactions" sample because its "300 proteins" matched the "300" in her file name.
- **Cleared the planted text-weight block without help.** The red issue line, the "Choose how to
  read it" field under it and the "Load is off: choose how to read confidence" footer led her
  straight to the fix. She chose "Number, NA as missing" because it was first, highlighted, and
  the only option that dropped nothing -- not because she understood "weigh edges" or "NA as
  missing". She never saw the Role column, so she never considered that the column need not weigh
  anything at all.
- **Left repeated pairs as they were, out of fear.** "Extra parallel edges" read as a problem she
  should fix, but "Merge" and "not kept" read as destructive, so she kept all 2,298.
- **Lost trust at the graph.** The statistics show 300 nodes and 1,262 edges (the merged count),
  where the load step promised 298 and 2,298 with Keep all. The file chip shows
  "ppi-core-300.g..." where she opened a .tsv. She concluded the app might have merged against her
  choice or opened the sample instead of her file.
- **Misread size as importance.** "Size by degree" and a legend of 1, 10, 34 with no unit did not
  tell her that size counts connections.
- **Liked the named groups** and the counts in the legend; this is what she would take to a
  meeting.
