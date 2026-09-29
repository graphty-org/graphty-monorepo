# Session: share your setup with a partner, without your data -- supply chain risk analyst

Participant: Dana Okafor (composite persona: supply chain risk analyst at an industrial equipment
maker, about 1,400 direct suppliers; supplier lists are confidential and under NDA; lives in
Excel and Power BI; corporate Windows laptop at 110% browser zoom; skims paragraphs, reads tables).

Task as given by the moderator: "Share your setup with a partner, without your data."

What "partner" means to her, said before starting: "A partner for me is either the contract
manufacturer's planning team or the consultant we hired for the dual-sourcing study. Both are
outside the company. Neither is allowed to see our supplier list. They have their own list."

Screens seen, as a participant sees them (design notes hidden):
- Export dialog, every state, full length: `shots/r4-dana-swod-export-dialog.png`
- The dialog with only the setup file chosen: `shots/r4-dana-swod-export-recipe.png`
- What the partner sees when they open it, full length: `shots/r4-dana-swod-binding-step.png`
- Data panel of a project: `shots/r4-dana-swod-data-panel.png`

The mocks show someone else's project (a gene network, and a payments network in the data panel).
She was told to picture her own supplier project in the same places.

---

## 1. Finding where to start

> First thing: where is "Share"? Every tool I use has a Share button top right. Power BI, Excel,
> the risk platform. I don't see one. Top right is a zoom, "100%". Nothing else.

> OK, the left panel, "Data", has "Export..." next to it. And the menu under the project name has
> "Export..." too. Export is the only thing that sounds like it leaves the tool, so I'll try that.
> But I'm expecting export to mean "the data", which is exactly what I don't want. I'm clicking it
> a bit nervously.

> In the data panel there are also "Recipes applied" with a plus and "Style files" with a plus.
> Those are for bringing something IN, I think -- "applied". "Style files" I'd have guessed is the
> colors. Is that what my partner wants? Maybe they just want my colors? No -- they want the whole
> thing: how I filtered, how I ranked the chokepoints. I'll leave those alone.

## 2. The export dialog opens

> It opens on "Figure (.svg)" already ticked, with a big picture. That's the slide export. Fine,
> not what I want. Left side is a list: Figures, Rows, Report, Graph data... I'm reading headings
> only. On my laptop the list runs off the bottom. I scroll the left column and there it is:
> "Share the setup, without data." That is literally my task. Good heading. It should not be
> seventh down the list, below the fold, when it's the one option that's safe for an NDA.

> Under it: "Recipe". Recipe? I'd have called it a template. We have Power BI templates, a .pbit,
> that's the same idea -- the report without the data. "Readable text (JSON) with styles, steps
> and layout. It never holds your data." I don't know what JSON is past "a file IT people like".
> "It never holds your data" is the line I actually read. That's the line.

## 3. Ticking Recipe

> I tick it. Everything else goes grey, and a bar across the top with a padlock: "Figures,
> images, tables, the report, graph data and the project file are off: they would carry your
> data." OK, I like that a lot. I can't accidentally also tick the table and send the supplier
> list along with it. That's the mistake I'd actually make at 5 pm on a Thursday.

> Scope says "Whole project", greyed out, "A recipe takes definitions, not a scope of data." Fine,
> I don't care. The grey on grey is hard to read without my glasses, though.

> Right side: "No data inside." Big check. Then three columns: "Travels", "You supply", "Not
> included". This is the part I'd screenshot and send to IT. It's a table. I read tables.

> "Not included": the proteins, the values, a frozen set, positions, notes. In my version that
> would be: 1,400 suppliers, the links, spend, the "critical 38" list I built by hand. Good. That
> is exactly what the NDA covers.

> "You supply": gene symbols, a fold change, a confidence per interaction. In my world: a supplier
> id, a lead time, maybe spend. So my partner has to bring their own list with those columns.
> Makes sense -- that's the whole point.

## 4. What worries me about "Travels"

> Now "Travels" -- I read this line by line, because this is what leaves the building.

> "1 note, on the confidence filter" and the note text is printed in full. OK, good that I can see
> it. But my notes say things like "Excluded Shenzhen Hongda, duplicate of Hongda Precision in the
> legacy ERP." That's a supplier name. If one of my notes is on a filter, it travels. I can see it
> here but I can't untick it here. I'd have to go back, delete the note, and come back. I'd want
> a checkbox on the note right in this list.

> And the filter itself: here it's "confidence 0.7 or more", a number, harmless. Mine would be
> "country is China" -- fine -- or "supplier is in the single-source list" or "name contains
> Hongda". Does "name contains Hongda" travel? The screen doesn't tell me what happens to a
> filter that has a supplier's name in it. It says "No data inside" in big letters, and then I
> think: the name IS data. I'd need that answered before I send it, because legal will ask.

> Then on the partner's side I saw "300 proteins, 1,262 interactions -- ppi-core-300.graphml,
> STRING v12: named, not carried." Named. So my file name and my counts go with it? My file is
> called something like "supplier_master_Q3_tier2_survey.xlsx" with 1,412 suppliers. That's not
> the list, but the count of our suppliers and the fact that we have a tier 2 survey is exactly
> the kind of thing the consultant should not get for free. I would want to see, on MY side, the
> exact line the partner will read about my network, and be able to blank it.

## 5. Export

> Footer: "1 file goes to your Downloads folder. Nothing is uploaded." Good. I'd then email it.
> That's actually what IT prefers over a share link, so no complaint. The file is
> "expression-overlay.graphty" -- in mine I'd have typed "Chokepoint review" in the Name box.
> It said JSON two lines up and the file ends in .graphty. Whatever. Will Outlook block a .graphty
> attachment? Our mail filter blocks anything it doesn't know. I'd find out the hard way.

> Question I can't answer from this screen: does my partner need graphty? It doesn't say. Power BI
> can't open this. If the consultant doesn't have it, I've sent them a text file.

## 6. What the partner sees (the "Apply recipe" screens)

> Top: "What your recipient does: add a table with a gene id and a fold change column, then
> Apply." Clear. One sentence, I'd paste that into my email.

> Then "They open the network themselves; graphty tells them which one this recipe was built on."
> That assumes the network is some public thing they can download. For genes, maybe. For me the
> network IS my supplier list. My partner can't "open it themselves". They'd have to use their
> own, which I see there's a "Replace..." for, next to "Sender's network". So it works, but the
> screen talks like the normal case is "get the sender's network", and in my case that's the case
> that must never happen.

> The matching part I like. "Your column" is a dropdown, and it shows "84 of 96 matched",
> "12 did not match", and it even spots "7-Sep" looks like Excel turned a name into a date. That's
> my life -- two ERPs, supplier names that don't agree, Excel mangling part numbers with leading
> zeros. If it showed my partner "40 of 1,100 suppliers matched" before they hit Apply, they'd know
> the result is garbage before they trust it. That's better than Power BI, which just shows blanks.

> "Change matching..." -- what does that do? Case-sensitive, it says, "letter case must match".
> Supplier names never match exactly. "ACME Corp" vs "Acme Corporation". I'd want fuzzy matching or
> at least "ignore case". Didn't see that.

> "For confidence, a higher number means: a closer or stronger link / a longer or costlier step /
> more can pass through / Don't use." For my lead-time column I'd pick "a longer or costlier step",
> I think. That's actually a sensible question, in plain words. First time a tool has asked me
> what my number means instead of assuming.

> "3 runs: PageRank, Louvain, degree." I don't know Louvain. PageRank is the Google thing. My
> partner won't know either. If I'm sending "how I found the chokepoints", I want it to say "ranks
> suppliers by how much flows through them", not the algorithm names. And "damping 0.85, seed 7" --
> skipped.

> Bottom: "Apply is one step. One Undo takes all of it back." Good. That's reassuring for the
> partner.

## 7. Wrap-up

> Did I do it? Yes, I think I made the file, and I'm fairly sure the supplier list isn't in it.
> "Fairly sure" is the problem. The big "No data inside" says yes; then the fine print says my file
> name, my counts and my notes go along. For an NDA, I need "No data inside" to be true in the way
> legal means it, or the screen to show me the exact text that leaves, word for word, with an off
> switch on each line.

---

## Single Ease Question

**5 of 7.** Once I found "Share the setup, without data" it was quick, and the padlock bar and the
three-column table are the best "what leaves" explanation I've seen in any tool. Minus points for
having to find it under "Export", below the fold, called "Recipe", and for the note, the file name
and the filter values that travel with no switch on this screen.

## Would I use this instead of what I do now?

What I do now: strip the data out of a copy of the Power BI file, save it as a template, and send
it with a Word doc of screenshots explaining my filters. It takes an afternoon and half the time
the partner can't rebuild it.

For this job -- "here's how I built the chokepoint view, run it on your list" -- yes, this is
better, mostly because of the matching screen on the partner's side: it tells them how many of
their suppliers actually lined up before they trust the picture. Three conditions: IT has
approved graphty on both sides, the partner has it, and I can see and blank every line that
names something of ours (notes, filter values, the file name and counts) before it goes. It
doesn't replace Power BI for my VP; it's a side tool for working with partners.
