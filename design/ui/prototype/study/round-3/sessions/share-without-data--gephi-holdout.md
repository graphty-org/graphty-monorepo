# Session: share the setup without the data -- the Gephi holdout

**Participant:** Dr. Mara Lindqvist (fictional composite; persona in `../../personas/gephi-holdout.md`),
associate professor, Gephi user since 0.8.
**Task, as the moderator read it:** "Send your lab your setup so they can use it on their own data,
without sending yours."
**Screen:** the Export dialog mock (`screens/export-dialog.html`), started at the dialog as it opens
from Export files..., then the state after ticking Recipe.
**Viewport:** 1440 by 900, study view.
**Renders she saw:** `shots/record/r3-mara-share-01-open.png` (the dialog as it opens),
`shots/record/r3-mara-share-02-recipe.png` (after ticking Recipe).

## Transcript (think-aloud)

**1. The dialog opens.**

"Right, Export. Big dialog. There's a protein network in the preview -- not mine, fine, I'll pretend
it's my retweet crawl. Current view is checked, a methods file is checked, three files. That's the
opposite of what I was asked. I don't want to send a figure, I want to send how I built it."

"Left column: Figures, Methods text, Graph data, Tables... and at the very bottom, cut off,
'Share the setup, without data'. Well. That's literally the sentence the moderator said. Either
somebody read my mind or somebody wrote the task off the label." (laughs) "I'd have found it anyway,
but only because I read every heading in a left column. A student would have exported the GEXF,
because 'Graph file ... for Gephi' is the thing that says Gephi."

"Scrolling down. There's one row: Recipe. 'Readable text (JSON) with styles, steps and layout. It
never holds your data.' Recipe. OK. I don't have a word for this in Gephi, because Gephi doesn't
have this. The closest I get is saving the Appearance palette, and the rule never survives. So:
recipe. I'll allow the cooking word."

**2. Ticks Recipe.**

"Everything else greyed out at once, and there's a lock line across the top: 'Figures, tables,
graph data, the report and the project file are off: they would carry your data.' Good. Blunt.
I like blunt. Though -- what if I want to send them the recipe AND one example PNG so they know what
it's supposed to look like? I guess that's two exports. Mildly annoying, not a problem."

"Scope is greyed: 'Whole project', 'A recipe takes definitions, not a scope of data.' Fine."

"There's a text box beside Recipe with 'Expression overlay' in it. No label. I assume that's the
name. I'd click in and call it 'Lab retweet map, v3'. Guess."

**3. Reads the preview, top to bottom.**

"'No data inside. No genes, interactions, fold-change values, positions or notes on genes.' First
thing it says. That's what I'd need to tell our IRB person, so yes, first is right."

"Travels. '3 runs: PageRank, Louvain seed 7, degree.' PageRank damping 0.85, weighted by confidence.
Louvain resolution 1, seed 7. Seed 7! Someone has finally written the seed down. That's the reviewer
two problem -- if my student reruns it with the same seed, community 7 stays community 7, or at least
it stands a chance. Degree 'exact'. Exact as opposed to what? Sampled? Whatever. I can live with it."

"Next line: 'Statistics numbers, computed again on their data -- 6.' Six? I just read three runs.
Which six? Is modularity one of them, the score? Average path length? I want the list, not a count.
A count of numbers is not something I can put in a methods section."

"'filter: confidence 0.7 or more -- 1.' And the chip back in the window said 'Filtered: 1,059 of
1,262 edges'. So here's my question, the one I always ask: when my student applies this, does
Louvain run on the filtered graph or on the whole graph? In Gephi it's whatever is visible and the
column doesn't tell you. This lists the filter and the runs as separate lines with no order. I
can't tell. If it runs on the filtered 1,059 edges I want it to SAY so, here, before I send it."

"'layout: force-directed, its settings and seed -- 1.' Force-directed. Which one? Is that
ForceAtlas2? Fruchterman-Reingold? LinLog on or off? Gravity? You wrote out PageRank's damping and
Louvain's resolution, and then for the one thing I actually spend twenty minutes tuning, it just
says 'its settings'. Show me the settings. That's the part my lab needs to reproduce the look, and
it's the part reviewers ask about."

"'view, its camera and the Look -- 1.' Camera on someone else's data is meaningless, but harmless."

"The note on the filter, quoted in full: 'Confidence is STRING's combined score, version 12.0...'
Good -- I can read what goes out before it goes. I'd put a note like that on my retweet filter,
'drop accounts under 5 retweets'. Nice."

**4. Asked for when applied.**

"'gene symbols, to join a table -- text', 'a fold change, above and below 0 -- signed', 'a
confidence per interaction -- number'. So this is what the other end has to supply. That's
actually the useful column. For me it'd be 'account id', 'retweet count per edge'. It doesn't say
what happens if their column is called something else. Do they get asked to match it? I'd hope so."

**5. Left behind.**

"'300 proteins, 1,262 interactions -- dat', '300 fold-change values -- dat', 'Knockdown hits (38
fixed) -- s'... the right edge is cut off. 'layou', 'note'. The column runs off the side of the
dialog. It's the column that says what's safe, and it's the one that's clipped. I can guess the
words, but I shouldn't have to guess on the privacy column."

"'300 positions (drawn again from the layout's settings)'. OK, so positions don't go, the layout
reruns. That's correct for new data. But then it's even more important that 'its settings' are
shown, because the settings are the only thing carrying the look across."

**6. The file, and the question nobody answers.**

"File: expression-overlay.graphty. Readable JSON. Fine. Now -- my lab is on Gephi. Every one of
them. What opens a .graphty file? Only this? Then 'send your lab your setup' means 'make your lab
install graphty'. Nothing on this screen says what the recipient needs. If it's a browser app with
nothing to install, say so right here, because that's the first thing my doctoral student will
ask me."

"Footer: '1 file goes to your Downloads folder. Nothing is uploaded.' Good. That sentence I'd
quote to the ethics board. Export 1 file. I click it."

**Task outcome:** completed. She found the right section, ticked Recipe and exported one file. She
would send it, with an email explaining what the layout settings are, because the dialog does not
show them.

## After the task

**Single Ease Question (1 very hard -- 7 very easy):** 5.

"Getting there was easy, because the section is named exactly what I wanted. The screen itself
made me work: I couldn't see the layout settings, I couldn't tell whether the statistics run on
the filtered graph, the privacy column is cut off, and it doesn't tell me what my lab needs to open
the file."

**Would she use this instead of her current tool?**

"For this job, there is no 'current tool'. Gephi can't do it -- the colours survive a GEXF round
trip, the rule that made them doesn't, and I redo the Appearance panel every time. So this does a
thing I actually lack, and the seed is written down, and it says plainly that no data leaves. That
earns it a second look. But my lab is on Gephi, my coauthors are on Gephi, and a recipe that only
this app can read is a recipe for one person. And I won't send a layout I can't name. Tell me it's
ForceAtlas2 with LinLog on and gravity 1, tell me the statistics ran on the filtered graph or the
whole one, and I might use it for the teaching lab. For papers, I'd stay on Gephi."

## Problems observed

| Where | What happened | Severity (1 low -- 4 blocks) |
|---|---|---|
| Recipe preview, "Travels" | The layout reads "force-directed, its settings and seed" with no algorithm name and no parameters, while PageRank and Louvain show theirs. The layout is what she tunes most and what reviewers ask about. | 3 |
| Recipe preview, "Travels" | Filter and runs are listed as separate lines with no order; nothing says whether the runs will compute on the filtered graph or the whole one when applied. | 3 |
| Recipe preview, "Left behind" | The right-hand column is clipped at the dialog edge ("dat", "s", "layou", "note") at 1440 wide -- on the column that states what stays private. | 2 |
| Recipe preview, "File" | Nothing says what the recipient needs to open a .graphty file. For a lab on Gephi this is the first question. | 3 |
| Recipe preview, "Travels" | "Statistics numbers, computed again on their data: 6" is a count with no list, and does not match the "3 runs" line above it. | 2 |
| Dialog list, first open | "Share the setup, without data" sits at the bottom of a long list, half off-screen; "Graph file ... for Gephi" higher up is the more likely wrong turn for a Gephi user. | 2 |
| Recipe row | The name field beside Recipe has no label; she guessed it is the recipe's name. | 1 |
| Recipe choice | Ticking Recipe disables all figures, so a recipe plus one example PNG takes two exports. | 1 |
