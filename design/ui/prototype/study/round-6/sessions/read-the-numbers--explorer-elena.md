# Read the numbers -- Explorer Elena

**Participant:** Explorer Elena, a product manager with no graph training (simulated; see
`study/personas/explorer-elena.md`). Trackpad, company laptop, browser at 100 percent. Her
reflexes come from Google Sheets and her product-analytics dashboard. Curious-afternoon clock: no
deadline, three or four dead ends tolerated.

**Task as read by the moderator:** "You loaded 300 proteins and filtered to one module. Explain
every count on screen, and why the node count is not 300."

**What the moderator planted (Elena was not told):** the human protein interaction file, 300
proteins and 1,262 interactions, filtered to the Ribosome module (56 proteins). The same task ran
in an earlier round, when the filtered screens showed a different data set; this time every
screen shows the protein file.

**Screens, in order, as she saw them (study view, 1440 x 900, rendered fresh for this session):**

1. The open dialog for `ppi-core-300.graphml` -- `shots/tasks/read-the-numbers/01-load-step-graphml.png`
2. The app after loading, full graph -- `shots/tasks/read-the-numbers/02-frame-at-rest.png`
3. The graph filtered to Ribosome, filter steps open, table docked -- `shots/tasks/read-the-numbers/03-filter-chip-proteins.png`
4. The Results panel, a betweenness run finished -- `shots/tasks/read-the-numbers/04-results-panel-finished.png`
5. The navigation page (glanced at; it shows a novel's characters, not her proteins) --
   `tmp/read-the-numbers--explorer-elena/tmp-elena-nav.png`

**Outcome:** finished with difficulty. She answered "why not 300" quickly and correctly this
time, from the chip and the filter step, and she understood the two degree columns in the table.
She explained nodes, edges, components and isolates on the full graph. She could not explain
"linked pairs" (the info icon gave her nothing) and was bothered that it repeats the edge count.
She noticed the filtered panel drops the "(rows)" unit and renames nodes to proteins, and the
Results screen then showed the full graph again, which briefly cost her trust. She skipped
density, "the 1% tie line" and the "zero" row as "not for me".

## Transcript

### Screen 1 -- the open dialog

> "OK, proteins. Not my stuff, but fine, pretend it is."

> "'Sample, first 5 of 300 nodes.' So nodes are the proteins. PSMA1, PSMA2... these are the rows
> of the file, I guess."

> "'What will load: nodes 300, edges 1,262.' Big numbers, nice. Edges would be the lines. 1,262
> lines between 300 proteins."

She reads the left side only as far as the attribute names.

> "Module, 'Category, 9 values'. So there are nine groups. log2FoldChange -- no idea, skipping.
> 'Weight: confidence, not used yet.' Hm. Not used yet is fine, I guess? I'm not going to touch
> it."

She hovers over "Role" dropdowns, does not open them, clicks Load.

### Screen 2 -- the full graph

> "Ooh. OK, colours. That's a lot nicer than the last hairball I saw."

She goes to the colour key first, bottom left.

> "Ribosome 56, Proteasome 40, Complex I 35... these add up to 300? 56 plus 40 is 96, plus 35 is
> 131..." (she gives up adding after four) "...probably. And 'Other 26', and 'Unassigned' with no
> number, so zero unassigned. OK."

> "'Labels: the 22 proteins with the most partners. 7 more hidden where they overlap.' Oh, that's
> helpful actually. So MAPK1, TP53 -- those are the busy ones."

Then the right panel, Statistics.

> "'Nodes 300 nodes.' Good, same as the dialog. 'Edges 1,262 edges (rows).' Rows. So one line per
> row of my file. That I get, that's like a spreadsheet."

> "'Linked pairs 1,262 linked pairs.' ...Same number. Why is it telling me twice?"

She hovers the little i next to "Linked pairs". Nothing she can read appears.

> "Nothing. OK. My guess: linked pairs is the pairs of proteins that have a line between them.
> Which... is the edges? Unless the same pair is in the file twice? Then it'd be less. Here it's
> the same, so whatever. I would honestly rather it just didn't show the second one if it's the
> same."

> "'Density 0.0281.' Is that a lot? No idea. Skip."

> "'Connected components 3 (2 isolates).' Isolates... isolated? Oh -- those two grey dots on their
> own, top right and down at the bottom. So three pieces: the big blob and two loners. That
> makes sense. 'Components' is a weird word for it but the '2 isolates' saved it."

> "'Degree distribution' with a tiny bar chart. Not reading that. 'Attributes 4.' Four? The dialog
> said two for the dots and one for the lines. That's three. Maybe it counts the name. Whatever."

> "Down at the bottom, 'Table 300 nodes, 1,262 edges (rows).' Same numbers, good. I like that it
> matches."

She states, pointing at the centre of the picture:

> "So the grey ones in the middle -- HSP90AA1, MYC, UBC -- those are the most important, because
> they're in the middle of everything and everything connects to them."

(The grey means "Other" module in the colour key; position is the layout's choice. She did not
reread the key.)

### Screen 3 -- filtered to Ribosome

> "Whoa, it shrank. Only the blue ones."

She first looks at the canvas and the colour key to explain the count.

> "Key says 'Ribosome 56'. And I had 56 Ribosomes before. So it's only showing the Ribosome ones.
> That's why it's not 300. Where did I do that though?"

She looks around, then notices the outlined chip top left.

> "Oh -- '56 of 300 proteins, 1 step'. It was right there. And this box: 'Filter to module
> Ribosome, took out 244, 56 left.' 244 plus 56 is 300. Perfect. That's the answer. That's
> actually really clear."

> "And there's a checkbox. So I can turn it off and get my 300 back, I think. I'm not going to try
> it right now, but that's reassuring."

Right panel.

> "'Proteins 56 of 300, in the filtered graph.' Wait -- before it said Nodes. Now it says Proteins.
> Same thing? I think the same thing. Fine, proteins is nicer."

> "'Interactions 217 of 1,262, in the filtered graph.' So interactions are the lines. 217 lines
> left of the 1,262. Is that rows or is that the pairs thing? Before it said '(rows)' and
> 'linked pairs', and now it just says interactions. I don't know which of the two this one is.
> They were the same number anyway, so... probably doesn't matter? But I'd want to know if I put
> it on a slide."

> "'Components 1.' One piece, because the two loners weren't Ribosome. 'Largest component 56.'
> Everything is one piece, OK. 'Isolated proteins 0.' Good, matches."

> "'Average degree 7.75.' Degree. Hm." (reads the table header) "Oh wait, the table has 'Degree
> (filtered)' and 'Degree (full graph)'. RPL28, 14 and 17. So... 14 partners inside Ribosome, 17
> partners overall? Three of its partners got filtered out. Oh, OK, that's actually neat. So
> degree is number of partners, and average degree is the average number of partners, 7.75."

> "'Density 0.141.' Still don't know. It went up though. Skip."

> "Left side: 'Interactions 300 proteins' -- that's the whole thing, fine. 'Hubs rule 0 of 10.'
> What? Zero of ten hubs? So none of the ten hubs are Ribosome? Or it's broken? I don't know what
> a hub rule is. Not touching it."

> "And the picture: the dots are different sizes now. 'Size: degree' in the list on the right. So
> bigger means more partners. RPL28 is biggest, 14. OK, matches the table."

### Screen 4 -- Results panel

> "OK, this is a different thing. Betweenness. I don't know what that is."

> "Top: 'on: full graph, 300 nodes, 3 components.' Full graph? I filtered it. Did my filter go
> away?" (she looks at the top-left chip, which reads "Full graph") "...it did. Or this is from
> before. The date says Sep 28. I don't know if I undid my filter or if this is an old
> calculation. That's the kind of thing that makes me not trust it."

> "'Overview: nodes 300, edges 1,262, components 3, average degree 8.41.' So on the whole thing
> it's 8.41 partners each, and inside Ribosome it was 7.75. OK, that I can explain. But now edges
> doesn't say rows, and components doesn't say isolates. Earlier it said '3 (2 isolates)'."

> "'Top nodes: MAPK1 0.1379, TP53 0.1139...' Numbers with no unit. Is 0.1379 good? 'Every step in
> the top 5 is over the 1% tie line.' I'm not reading that. '295 more in the table' -- 300 minus
> 5, OK."

> "Distribution, 300 nodes. 'middle 0.0038, highest 0.138, zero 10 nodes, all 291='. All 291
> equals what? It's cut off. And the colour key says 'the 10 proteins at 0 take the lightest
> colour', but a minute ago I had only 2 isolated ones. So 10 are zero at this but only 2 are
> alone? I can't explain that one."

Pointing at the dark dots:

> "The dark brown ones -- MAPK1, TP53 -- those are the problem ones. Dark is bad."

(The key is a light-to-dark scale for the score; dark means a higher score, not a problem. She
did not read the key's scale labels.)

> "'Exact: computed on every node, not estimated.' OK, good, I guess."

### Screen 5 -- navigation (glance)

The moderator showed the navigation page so she could see where the counts appear elsewhere.

> "This is a different graph. Les Miserables? 77 nodes, 254. Not my proteins. I'm not going to
> learn anything here." She looks away.

## Her explanation, in her words (asked at the end)

> "I loaded 300 proteins with 1,262 lines between them. There are three separate pieces: one big
> one and two proteins on their own. Then I filtered to just the Ribosome group, which took out
> 244 and left 56, so that's why it's not 300. Those 56 have 217 lines among them, and they're
> all one piece. Each one has about 7 or 8 partners on average. The table shows each protein's
> partners inside the group and overall. Density I can't explain, 'linked pairs' I'm guessing is
> the same as lines unless your file has duplicates, and I don't know what hubs zero of ten is.
> The betweenness screen I'd leave out; I couldn't tell if it was on my filtered group or not."

## Single Ease Question

**4 out of 7.**

> "The main question -- why not 300 -- was easy this time, like a 6. The chip says it, the step
> says it, the maths adds up. But you asked me to explain every number, and there are about five
> I can't: density, linked pairs, the hubs zero-of-ten, the 'all 291 equals' thing, and why 10
> are zero but only 2 are alone. And the words keep changing -- nodes, proteins; edges, rows,
> interactions, linked pairs. I'd want one word per thing."

## Would she use this instead of her current tool?

> "Instead of Sheets? No -- I'd still keep the list in Sheets. But for looking at the groups and
> saying 'this group is 56 of 300 and they're tightly connected', yes, I'd use this, because the
> numbers match each other from screen to screen and it tells me what it took out. My dashboard
> doesn't even tell me that. I just wouldn't put the betweenness page in front of my VP."

## Observations for the study (moderator notes)

- Engagement stayed up through screen 3 and dropped on screen 4: answers got shorter ("not
  reading that", "OK, good, I guess") after "betweenness" and the unexplained scores.
- She missed the filter chip on first look and explained the 56 from the colour key before
  finding it; she found it by looking around, not by hint.
- Wrong readings stated confidently: grey nodes in the middle are "the most important" (grey is
  the "Other" module; position means nothing), and dark brown is "bad" (dark is a higher score).
