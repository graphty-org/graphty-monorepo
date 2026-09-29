# Narrow, hide or paint -- Analyst Alex

**Task, as the moderator gave it:** "Look only at the characters with 5 or more co-appearance
partners. How many are there, and who matters most among them?"

**Dataset:** Les Miserables co-appearances (miserables.json), 77 characters, 254 links.

**Screens seen, in order:** the app at rest with the file loaded; the filter steps popover
(interactive -- I clicked the checkboxes); the Results panel on a filtered graph with a run record
open; the "Narrow, hide or paint" flow page.

**Answer given:** 41 characters. Valjean matters most: 22 partners among the 41 (36 in the whole
book), top by a wide margin. On betweenness I could only see a run over a different subset (60
characters), where Valjean is also first at 0.419; I did not see betweenness over the 41.

**Correct?** The count is right (41). "Who matters most" is right by degree. It is only half-checked
by betweenness, because the run on screen was not over the 41.

---

## Think-aloud

### 1. The app at rest

> OK, Les Mis. The toy dataset from every NetworkX tutorial. Fine, at least I know roughly what the
> answer should look like.
>
> First thing, counts. Right side: 77 nodes, 254 edges. Yes, that's the Les Mis graph. It also says
> "254 edges (rows)" and then "Linked pairs 254". Why tell me twice? I guess if there were
> duplicates they'd differ. OK, I'll allow it.
>
> Top left under the file name: "Nothing has been sent from this project." Good. That's the line I
> look for. Then a little button with a funnel icon, "Full graph". That's a filter, it has to be.
> Gephi has the Filters panel on the right with the degree range thing; here it looks like it's
> this chip. So "5 or more co-appearance partners" is just degree >= 5. I'm clicking the chip.
>
> Legend bottom left says "Group color", groups 2, 8, 4, 1... fine, that's the modularity-ish
> grouping from the file. Not what I'm after. The orange and the red-orange (group 2 and 3) are a bit
> close for me, but there are numbers next to them, so OK.

### 2. The filter steps popover

> Oh. It's already got three steps in it. "Filter to degree >= 2, took out 17, 60 left." "Filter to
> degree >= 5, took out 20, 40 left." "Filter out group 8, took out 13, 27 left." The chip says
> "27 of 77 characters, 3 steps".
>
> So... 40? Degree >= 5 left 40. My first instinct was to write 40 down and move on.
>
> Wait. There's a grey line under the degree >= 5 step: "keeps only nodes with at least 5
> neighbors among the 60 it reads." Among the 60. So it's counting partners inside what's left
> after the first step, not partners in the book. If you throw out the degree-1 characters first,
> somebody who had exactly 5 partners, one of them a degree-1 walk-on, now only has 4 and falls out.
> That's not what I was asked. I'd have handed in 40 and been wrong by one, and nobody would ever
> have known. That grey line saved me, but it's grey and it's small, and I only read it because the
> number looked a bit low to me. Honestly, on a busy day I might not have.
>
> I don't want any of the other steps. There's a checkbox on each. I'm unticking the first one and
> the third one. (Clicked: tooltip "Turn on step" / "Turn off step" -- fine.)
>
> Now: "Filter to degree >= 5, took out 36, 41 left." Chip reads "41 of 77, 1 of 3 steps."
> Statistics on the right say "Characters 41 of 77, in the filtered graph", and -- this is nice --
> next to Largest component it says "up from 40 when 'Filter to degree >= 2' was turned off". So it
> tells me why the number moved. That's exactly the thing Gephi never tells you. Right, 41.
>
> Two steps are still sitting there switched off. "1 of 3 steps" is a bit of a trap for the next
> person who opens this, but I can see them, and I'd rather they were kept than lost.
>
> Now who matters most. The table at the bottom already switched to "Filtered graph: 41 of 77
> characters, sorted by degree (filtered)." Two columns: "Degree (filtered)" and "Degree (full
> graph)". Good -- I didn't have to ask which one. Valjean 22 filtered, 36 full graph. Gavroche 19
> and 22. Marius 16 and 19. Valjean's miles ahead on both. By degree it's Valjean, no argument.
>
> But the question says "matters most," and my director will ask "according to what?" Degree's the
> cheap answer. I'd want betweenness too, inside the 41, because that's the "who holds the group
> together" story.

### 3. Results panel, filtered

> Results in the left rail. There's a betweenness run already: "Betweenness, on 60 of 77 nodes, Sep
> 28 11:02." The chip at the top of this screen says "Filtered: 60 of 77 nodes, 1 step." So this run
> was made on the degree >= 2 version, not my 41. Right away I'm asking: if I change the filter to
> degree >= 5, does this run go stale and tell me, or does it just sit there looking current? The
> header says "on 60 of 77", so at least it's stamped with what it ran on. I'd have to compare that
> to the chip myself. I'd like it to shout at me if they don't match.
>
> Top five: Valjean 0.419, Gavroche 0.172, Marius 0.164, Fantine 0.154, Javert 0.073. Valjean again,
> by more than double. I'd bet the 41 gives the same winner, but I'd be betting. I can't actually see
> a betweenness run on the 41 here. The "Re-run (keeps Run 1)" button is greyed out, I guess because
> nothing changed on this screen.
>
> The run record box is good: Brandes, exact, no sampling, "divided by (n-1)(n-2)/2", n = 60, the
> filtered graph. That's normalized=True in NetworkX. I can check that. That's the thing I'd paste
> into my notes.
>
> "Every step in the top 5 is over the 1% tie line; the smallest, ranks 2 and 3, is 4.7%." I read
> that three times. I think it means Gavroche and Marius are close but not tied? Just say "2 and 3
> are close but not tied."
>
> And the picture didn't change. The style stack has "Betweenness color" with its eye crossed out,
> so the nodes are still colored by group. OK, it's there if I want it, I just flip the eye. At least
> it's not hidden somewhere I'd have to build a rule for. Distribution at the bottom says "zero: 32
> nodes, all 29=" -- that's cut off, I don't know what it says.
>
> "Scope: Filtered graph, 60 of 77" in Options. So I assume if I run it now it takes whatever the
> chip says. I'd want that written on the Run button, "Run on 41 of 77", before I click it.

### 4. The "Narrow, hide or paint" page

> This is a big diagram about fraud and merchants and "transfers-2026-03.csv". Not my data. There's
> code in the right-hand column, "session.filters.steps", "missing". That's for the developers. I'm
> skipping it.
>
> The one bit I read was the three cards at the top: after "Filter out" the chip says "Filtered:
> 2,940 of 3,000" and the numbers change; after "Hide on canvas" the chip still says "Full graph"
> and the numbers don't change; after coloring, same. OK. So the chip is the thing to look at. I get
> it, because I'd have assumed that if they're gone from the picture they're gone from the numbers.
> That's the Gephi habit. But in the screens I actually used, nobody offered me "Hide", so for this
> task it never came up. I narrowed, and the chip moved, and that's what I checked.
>
> If hide and filter do look the same on the canvas, I'd want hide to say so on the canvas, not
> just in the chip. I don't look at the chip; I look at the picture and the count in the table.

---

## Single Ease Question

**5 out of 7.**

What took longest: working out that the "degree >= 5" step on screen was counting partners among
the 60 left by an earlier step, not in the whole book. The screen gave me 40 first and I nearly
took it. Once I switched the other two steps off it gave me 41 and told me why the count moved,
which I liked a lot. The table with the filtered and full-graph degree columns side by side made
"who" instant. I lose points because I couldn't see betweenness on my 41: the run on screen was on
a different subset, and I'd have had to trust that a re-run picks up the new filter.

## Would I use this instead of what I use now?

For this kind of question -- "only the ones with at least N partners, then who's top" -- probably
yes, over Gephi. In Gephi I'd drag a Degree Range filter, hit Filter, then go to Statistics and
rerun betweenness and hope it's on the filtered view (it's a checkbox and half the time I forget
it). Here the chip, the counts beside each step, and the two degree columns do that for me, and the
"up from 40 when..." note is the kind of thing that keeps me out of trouble. I'd still do the
betweenness in Python the first few times to check it matches; the run record says "exact,
normalized over (n-1)(n-2)/2", which I can check, so if it matches I'd stop.

What would stop me: a step whose count depends on steps above it, with the only warning in small
grey text. That's the kind of thing that ends up in a report wrong.

---

## Problems observed

1. **Stacked degree step gives a different count than the question means, and says so only in
   small grey text** (filter steps popover, severity high). With "Filter to degree >= 2" above it,
   "Filter to degree >= 5" left 40, not 41, because it re-counts partners among what is left. The
   only warning was "keeps only nodes with at least 5 neighbors among the 60 it reads" in grey. I
   nearly answered 40.
2. **A betweenness run over a different subset sits beside the chip with no mismatch warning in
   view** (Results panel, severity medium). The run says "on 60 of 77"; I had to compare that to the
   chip myself. I could not confirm that a re-run would use the 41.
3. **The Run or Re-run button does not say what it will run on** (Results panel, severity medium).
   "Scope: Filtered graph" is in Options, below the fold; I want the count on the button.
4. **Jargon sentence under Top nodes** (Results panel, severity low). "Every step in the top 5 is
   over the 1% tie line; the smallest, ranks 2 and 3, is 4.7%." I could not say this to anyone.
5. **Cut-off text in the distribution** (Results panel, severity low). "zero: 32 nodes, all 29=".
6. **Switched-off steps linger** (filter steps popover, severity low). "1 of 3 steps" after I turned
   two off; kept is fine, but the next reader might tick them back on without noticing.
7. **Hide versus filter explained only on a diagram about someone else's data, with developer
   names in it** (flow page, severity low for this task). I skipped most of it; in my screens Hide
   was never offered, so the difference never came up.
8. **Orange and red-orange group colors are close for me** (legend, severity low). The counts next
   to them saved it.

## What went well

- "Nothing has been sent from this project" right under the file name.
- Each filter step shows "took out N, M left"; turning a step off recounts immediately.
- "up from 40 when 'Filter to degree >= 2' was turned off" beside the count that moved.
- The table's "Degree (filtered)" and "Degree (full graph)" columns side by side.
- The run record: method, exact, no sampling, the normalization with n, the scope, the engine, the
  time. Checkable against NetworkX.
