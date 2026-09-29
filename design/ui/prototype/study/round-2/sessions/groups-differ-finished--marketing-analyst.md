# Community detection finished -- Jordan, marketing network analyst

**Task given by the moderator:** "Community detection has finished. Say what groups it found, how
good the split is, and whether you could reproduce it."

**Screens used:** the results panel with a finished Louvain result (the run record open), then the
same result with its groups in the table under the canvas. The dataset is a 300-protein interaction
network, which is not her data; she was told to treat proteins as "accounts".

**Outcome:** success, with difficulty. She named the groups by their hub and by the file's module
column, read the modularity and judged it "good", and found the seed and the Copy button. She could
not say what "the file's modules 0.663" was telling her, and she was not sure the seed travels with
the CSV.

**Ease (1 to 7):** 5

## Think-aloud

**First look at the results panel.**

> OK. Left side, "In this project", Louvain is highlighted, and there's a 10 next to it. So ten
> groups? I'm assuming that's ten communities. Good, it's the thing I'd do in Gephi -- run
> modularity, color by it. The graph is colored, so it already painted. I didn't have to go to a
> Partition tab and hit Apply, which is honestly the step I forget every single time in Gephi.

> There's a box in the middle of the graph -- "Run record". Method, Seed 7, Damping "does not
> apply", Normalization... "Modularity divided by twice the total confidence of all edges". Um. I'm
> not going to read that to my VP. But I like that it's there. It's covering half of my graph,
> though, and the graph is the thing I actually wanted to look at. Where's the X -- top right, fine.

**What groups did it find?**

> Panel says "Groups: 10 communities". Largest is 62 proteins. "Single proteins: 2, no
> interaction." So two of the ten aren't really groups, they're just... loners. That's actually
> honest, I appreciate it -- Gephi would just give them a number and a color and you'd find out in
> the slide review when someone asks what the purple dot is.

> The legend down at the bottom right only shows four, Community 1 to 4, then "6 more". For a slide
> I'd need all of them. I'd click "6 more" and hope it expands.

> "Communities table" -- that's the one I want. A list. Clicking it.

**The table.**

> Oh, this is nice. One row per group. Size, edges inside, edges out, density, and then "hub,
> highest degree" -- AKT1, UBC, MYC. That's exactly how I name a segment: who's the big account in
> the middle of it. And "module, from the file, most members": Ribosome 56 of 62, Proteasome 40 of
> 43. So if my CSV had a column like "interest" or "region", it would tell me the dominant one per
> group? That's the whole segmenting job right there. That's the column I'd put on the slide.

> But they're all called "Community 1", "Community 2". Can I rename them? I'd want "Runners",
> "Nutrition people". Nothing here says I can. I'd double-click the name and see what happens.

> log2FoldChange -- that's a biology thing, I'm skipping it. In my data it'd be, like, spend or
> engagement, "mean vs the rest". That's fine, actually useful if it were my column.

> Community 9 and Community 10: size 1, edges 0, "not defined", "Unassigned 1 of 1". Those are the
> two loners. They're at the bottom, fine.

> Colors: Community 7 is black, and 9 and 10 are a dark grey. In a printed deck those are the same
> color. I'd bet money someone asks.

**How good is the split?**

> Modularity 0.716. The Gephi tutorial I learned from said anything over about 0.4 means real
> structure, so 0.7 is -- good? Strong? I think that's strong. It doesn't tell me that, though. It
> just gives me the number, and I'm going by a YouTube video from years ago.

> Then right under it: "the file's modules 0.663". What does that mean? Is that the modularity if
> you used the file's own groups instead? So the algorithm found a better split than the labels
> that came with the data? Or is it saying the file is the "right answer" and it's 0.66 similar to
> it? I genuinely can't tell. If it's a similarity score, 0.663 sounds kind of bad. If it's
> the file's own modularity, then Louvain wins. I'd hover it. Nothing on the screen tells me which.

> Density column, 0.123 to 0.256. I don't know if that's good. Edges out -- Community 1 has 232
> inside and 93 out. That's a lot of edges out? Is Community 1 even a real group, or is it the
> "everybody else" bucket? That's what I'd actually want to know per row: is this group tight or
> mushy. There's no "good / weak" anywhere, I'd have to work it out from inside vs out myself.

**Could I reproduce it?**

> Up in the state line it says "Seeded" with a little i. Hovering: "The grouping depends on the
> seed. The same seed gives the same groups; another seed can place some proteins differently."
> OK! That's the thing nobody ever told me in Gephi. I re-ran modularity once and all my colors
> changed and I had to redo a whole deck. So seed 7, resolution 1, confidence as similarity. And the
> run record has a Copy button, so I can paste it in the appendix. That's reproducible, I think.

> What I'm not sure about: if I click "Export table as CSV...", does the seed go in the file? If my
> colleague opens the CSV in six weeks, does it say "Louvain, seed 7"? The header on the table only
> says "Communities: Louvain". I'd want the seed in the file name or the first row, because the
> Copy thing is going to live in my clipboard for about four minutes.

> And "CPU: Louvain has no WebGPU version." I don't know what that means for me. Does it mean it
> would be different on another laptop? I'm going to assume no. I wouldn't ask.

**Answer she gives the moderator.**

> It found ten groups -- eight real ones, biggest is 62, the hubs are AKT1, UBC, MYC and so on, and
> most of them line up with a module from the file, like Ribosome and Proteasome. Plus two loners.
> The split is 0.716 modularity, which I think is good, and there's something about the file's
> modules being 0.663 that I can't explain to you. And yes, I could reproduce it: seed 7, it says
> so, and there's a Copy button. I'd check the CSV has the seed before I trusted that, though.

## After the task

**Single Ease Question: 5 of 7.** "Finding the groups was easy, the table did the work for me. The
'how good' part I kind of had to bring my own knowledge to, and the second number confused me."

**Would she use this instead of her current tool?**

> For segmenting, maybe, yeah. The table with the hub and the dominant-label column is the thing I
> build by hand in Excel after Gephi, with a VLOOKUP. If it does that on my CSV and lets me rename
> the groups and exports the seed with it, I'd use it for the segment slide instead of Gephi. I'm
> not dropping Gephi until I see it open one of my 60,000-row exports without dying, and I need to
> be able to call the groups something a VP understands, not "Community 4".

## Problems she hit

1. "the file's modules 0.663" sits under modularity with no word saying what it is or which
   number is better; she could not tell whether it was a comparison or a similarity score.
   (Severity 3)
2. Nothing says whether 0.716 is good; she relied on a half-remembered tutorial threshold.
   (Severity 2)
3. No per-group "tight or loose" reading; she had to reason from edges inside vs out and could
   not tell whether Community 1 was a real group or a leftover bucket. (Severity 2)
4. Groups are "Community 1..10" with no visible way to rename them for a slide. (Severity 3)
5. Not clear whether the seed and settings go out with "Export table as CSV...". (Severity 3)
6. The run record opens on top of the graph and hides half of it. (Severity 1)
7. Community 7 is black and the two singletons are dark grey; indistinguishable when printed in
   greyscale. The legend shows only 4 of 10 until "6 more". (Severity 2)
8. "CPU: Louvain has no WebGPU version" means nothing to her; she wondered if results differ
   between machines and did not ask. (Severity 1)
