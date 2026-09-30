# Session: a finished community detection -- Jordan, marketing network analyst

- **Participant:** Jordan, growth-marketing analyst who "does the network stuff" one or two days
  a week (persona: `study/personas/marketing-analyst.md`).
- **Task, as the moderator gave it:** "Community detection has finished. Say what groups it found,
  how good the split is, and whether you could reproduce it."
- **Screens:** the Results panel with a finished Louvain run (`screens/results-panel.html#louvain`),
  then its groups in the table (`#louvain-table`), then the table dock on its own
  (`screens/table-dock.html`).
- **Renders read:** `shots/record/r3-jordan-gdf-louvain.png`, `shots/record/r3-jordan-gdf-louvain-table.png`,
  `shots/record/r3-jordan-gdf-tabledock.png` (1440 by 900, laptop width).

## Think-aloud

**Finished run, editor open, run record open.**

> Okay. First thing -- this is "Human protein interactions". Not my data. Fine, I'll pretend
> proteins are accounts. Three hundred nodes, twelve hundred edges, that's tiny, that's one
> hashtag on a slow day.

> Left side, "In this project", Louvain is highlighted with a 10 next to it. So ten clusters.
> That's the first thing I got and I didn't have to hunt for it, good.

> Then there's this pop-up thing with "Run record" in the middle of my map, covering the map.
> Method, seed 7, damping does not apply -- why are you telling me what does not apply? --
> "Normalization: modularity divided by twice the total confidence of all edges." I'm skipping
> that, that's a formula. "Engine: CPU, Louvain has no WebGPU version." Okay, I don't care, it
> finished.

> I close it with the X. Now the editor panel. "Groups, 10 communities." Modularity 0.716. Is
> that good? I think I read on some blog that anything over 0.3 or 0.4 means the clusters are
> real, so... 0.7 sounds good? But it doesn't say. It just gives me a number. If my VP asks
> "is that good", I'm going from memory of a Medium post.

> "The file's modules, 0.663." What file modules? I didn't -- oh, is that like, the groups that
> came with the data? So the data already had its own clusters and this found a split that
> scores higher? I think that's what it's saying. I'd never have a column like that in a mention
> export though. Actually, sometimes I do -- the listening tool's "audience cluster" column. If
> that's what this compares against, that's actually useful: "the tool's split beats
> Brandwatch's split." But I'm guessing.

> "Largest, 62 proteins. Single proteins, 2, no interaction." So two of my ten "communities" are
> one lonely node each. That's not a community, that's an orphan. So it's really eight groups.
> Why count them in the ten?

> Legend on the map, bottom right: Community 1, 2, 3, 4 and "6 more". Community 1, Community 2
> -- in Gephi it's "modularity class 0, 1, 2", same thing. I want names. I name segments by what
> they have in common, that's my whole job.

**Clicks "Communities table".**

> Oh, okay, this is nicer. The table opens under the map, a tab called "Communities: Louvain",
> one row per group. "Full graph: 10 communities, 2 of them a single protein. Sorted by size."
> Good, it admits the two singles right there.

> Columns: size, edges inside, edges out, density... "log2FoldChange, mean, vs the rest." I have
> no idea what that is. Is that the protein people's thing? I'm ignoring it.

> "hub, highest degree": AKT1, UBC, MYC. So that's the biggest account in each cluster. That's
> what I'd use to name them on a slide -- "the Nike cluster", "the Strava cluster". Good.

> "module, from the file; most members": Ribosome 56 of 62, Proteasome 40 of 43... Oh, so this
> is the file's own labels, and it tells me how many in each group match. So community 1 is
> basically "Ribosome". That's how I'd name the segments. That's actually the answer to
> "why did someone land in cluster 7" -- sort of. It's the column I'd want most, and it's
> the last one, squeezed on the right.

> "Export table as CSV..." top right of the table. Yes. That's the one thing I need. I'd click
> it. I assume I get this table, ten rows. What I'd actually want is the other one -- every
> account with its cluster number -- but there's a "Nodes" tab, so probably that.

> Map got squeezed to the top half with the table open. On my laptop that's a strip. It's
> readable-ish. The clusters are clearly separate blobs, colour matches the table rows. Fine.

**Reproduce?**

> Could I reproduce it? The editor says "Seeded" with a little i. Hover: "The same seed gives
> the same groups; another seed can place some proteins differently." Okay, so seed 7, same
> answer every time. That's more than Gephi ever told me -- Gephi just gave me a different count
> every time I hit Run and I never knew why.

> The run record has "Copy" on it. Copy what? Copy to where? I'd guess it copies this list as
> text so I can paste it in the notes of the slide. I'd click it and see. If it's JSON I'm
> closing it.

> What's not there: which version of the tool, what date, which file exactly. If my colleague
> reruns this next month on the new export, it'll be different anyway, because the data is
> different. So "reproduce" to me means: the same file, seed 7, resolution 1, weight
> confidence. I have that. I'd write it in the slide footnote.

**Off-topic.**

> Honestly the thing that'll break reproducing it isn't the seed, it's Brandwatch. Last quarter
> they dropped Instagram half way through and the export changed under me. No tool fixes that.

## My answer to the moderator

> It found ten groups, but two of them are single proteins with no connections, so really eight.
> Biggest is 62, mostly ribosome. The split scores 0.716 modularity, which I think is good --
> better than the groups the file came with, which score 0.663 -- but the screen doesn't tell me
> if 0.7 is good, I'm going on memory. Reproduce: yes, it's seeded, seed 7, resolution 1,
> weighted by confidence, and there's a Copy button on the record I'd paste into my notes.

## After the task

- **Single Ease Question:** 5 of 7. "I got all three answers. The 'is it good' one I had to
  bring myself."
- **Would I use it instead of Gephi / the listening suite?** "For this bit, maybe. The groups
  table with the biggest account and the matching label per cluster is the thing I do by hand
  in Excel after Gephi. And it tells me the seed, which Gephi never did. But the modularity
  number with no 'good or bad' next to it -- I'd still have to explain that myself, and that's
  exactly the conversation I lose in the VP meeting. And I haven't seen it open my 50,000-row
  CSV yet, so ask me then."

## Problems found

1. **Modularity has no benchmark.** 0.716 is shown with no hint whether that is a strong or
   weak split; she fell back on a half-remembered blog rule. Severity 3.
2. **"The file's modules" is unexplained.** She guessed it means the data's own grouping scored
   the same way, but was not sure; the label names neither a column nor what it is compared to.
   Severity 2.
3. **Single nodes counted as communities.** "10 communities" includes two one-node groups; the
   editor and legend lead with 10, and she had to subtract. The table's sentence says it plainly;
   the editor's headline does not. Severity 2.
4. **Groups have numbers, not names.** "Community 1..10" in legend and table; the naming clue
   (hub, the file's label) is in the last table column only, not in the legend on the map she
   would screenshot. Severity 2.
5. **Run record opens over the map and leads with things that do not apply.** "Damping: does not
   apply", the normalization formula and the engine line are noise to her; "Copy" does not say
   what it copies or in what form. Severity 2.
6. **Reproduction lacks the data identity.** The record has seed, resolution and weight, but not
   which file (name, row count, date) or the tool version, so "same answer" is only true if she
   remembers which export it was. Severity 2.
7. **Jargon columns in the groups table.** "log2FoldChange" and "density inside" meant nothing
   to her (the first is a column from this dataset, but it is shown with no explanation).
   Severity 1.
8. **Legend truncates at four.** "6 more" on the map legend; the slide she would take needs all
   eight real groups. Severity 1.
