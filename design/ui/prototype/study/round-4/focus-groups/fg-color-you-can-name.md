# Focus group: a colour you can name

Five simulated participants looked at the gallery: the storyboards, the app screen with a graph coloured by module, and the Export dialog. In the colour-by-module frame, the module colours appear in three places: a small legend (the "key") on the canvas, a "Module as color" popover with a "Change color..." menu, and the header of the bottom table. The legend lists groups by number ("2", "8", "4", "7 more"). The Export dialog shows a preview with a fold-change legend beside the graph, a methods text file ("degree, exact, not normalized", "weight: confidence, not used"), a palette choice labelled "Eight distinct colors", and three Look buttons (Screen, Print, High contrast) next to "File is written with". The group had three rounds: first reactions, replies to each other, and "what would make you quit, what would make you switch".

Participants:

- Morgan (screen-reader-analyst): blind analyst who uses NVDA and works in NetworkX scripts.
- Maren (genomics-cytoscape-user): bench biologist who colours gene networks by fold change and MCL clusters in Cytoscape.
- Jordan (marketing-analyst): builds slide decks from mention networks; other participants call this person "Mira" (see the discount section).
- Elena (explorer-elena): occasional user who wants a picture for a meeting and knows no graph vocabulary.
- Emma (expert-emma): researcher who checks every figure against networkx and writes the methods section.

These are simulated voices, not real users. Treat every theme below as a hypothesis to test with a task, not as evidence of behaviour.

## Transcript

### Round 1: first reactions

**Morgan (screen-reader-analyst):** I'll say one good thing first, because it won't last. The gallery has headings: Storyboards, Flows, Screens, Study. I pressed H and got a list. That's more than Gephi ever gave me.

The storyboards themselves are pictures of a screen. I'm told what's in them, which is the thing I'm trying to stop doing. A frame that says "legend, top right, swatches" is a picture of a legend. It doesn't tell me whether the legend is a list or a table, or whether it's buttons I can reach with Tab or just painted squares. A swatch is a colored square. What does it say when I land on it? If the answer is "button", that's a fail, and I'll remember it.

On the organisation, I can't judge "panels" from a picture. I can judge whether every group has a name that isn't its color. Before this goes further, I want to hear what the legend says out loud, word for word. And I want to know whether the "too close" flag is written text or just a little icon next to the swatch.

My colleagues can react to how it looks. I'll react to how it reads.

**Maren (genomics-cytoscape-user):** Honestly? The first thing I looked for was where I paste my gene list, and I had to go through several frames of storyboards before I saw my own kind of data. Most of the gallery looks like it was made for someone with a network file already. I don't have a network file. I have a DESeq2 table.

The layout itself is fine. There's a network in the middle, panels on the side and a legend at the bottom, and that's basically Cytoscape without the clutter. And the network is flat, not spinning in 3D, so good.

The Export dialog is the part I actually care about. I can see a legend next to the network in the preview and a block of text that looks like parameters. If that legend really ends up in the PDF, that's the thing I've been asking the Cytoscape helpdesk for. But I've seen previews lie before, so I want to see the actual file.

The storyboards are really long. I skimmed them. I'll trust that the arrows say what happens.

And the fold-change colours I could make out look red-blue, not red-green. My PI will check that first.

**Jordan (marketing-analyst):** Honestly? The storyboards look like a lot of reading for me. That first-look one is a strip of eight frames with paragraphs under each one, and I skimmed it the way I skim a vendor deck. I'll point at the frame I actually cared about: the Export dialog, the one with the fold-change legend sitting beside the picture. That's the first screen here that looks like something I'd paste into a slide. A legend in the file, with counts ("148 below 0, 152 above"), is what I've been redrawing in PowerPoint for years.

The layout itself (graph in the middle, the Styles list on the left, the table underneath) reads fine. It's Gephi, but calmer. What worries me is that there are two lists of the same colors. There's a little legend box floating on the graph, and there's a longer list in the "Module as color" popup, and it has a "Change color..." menu. I can't tell which one is the real one. If I change "DNA repair" to our brand orange in one, does the other follow? And does my deck file change too? Nobody has shown me that yet.

**Elena (explorer-elena):** Honestly? Parts of the app screen make sense to me. There's the file name up top, a list on the left, the picture in the middle, and a blue "Export..." button I could find without anyone's help. That's good.

Then I get to the right side. "Density 0.0868", "average degree", "components", "isolated". I don't know what I'm supposed to do with any of those. It reads like a stats class, not something that tells me what I'm looking at.

The little key in the bottom corner of the picture is the part I'd actually use. But the groups are called "2", "8", "4" and then "7 more". Two what? If I screenshot that for a meeting, someone will ask what group 8 is, and I won't know.

The storyboards lost me. The export one scrolls forever. Boxes, arrows, "log2FC", "signed column". That page is for whoever builds it, not for me. I'd want to see just three pictures: what I click, what I get, and what the file looks like when it's open on a slide.

What I'll be watching today is whether changing a color means clicking the little square in the key. That's what I'd try first.

**Emma (expert-emma):** Two things I like before I start complaining. The Export dialog writes a methods file next to the figure: "degree, exact, not normalized", "weight: confidence, not used", and which labels were hidden. That's the part of a figure caption I normally write myself at 2am. And the palette under "Eight distinct colors" looks like Okabe-Ito to me. If it is, say so by name. "Eight distinct colors" tells a reviewer nothing.

My worry is the colour-by-value frame, where the same module colours show up in three places: the legend on the canvas, the popover and the table header. If I change DNA repair's orange in the legend, which of those three is the one that actually holds the colour? I'd guess the style, "Module color", in the left list, but nothing on screen tells me that.

"Unassigned" is also getting folded into "Other" with a "moved" tag. Unassigned is a real value in my data. Other is an overflow bucket you invented. I don't want those two merged without asking me.

The export Look buttons (Screen, Print, High contrast) sit right next to "File is written with". So does picking one change my project, or only the file? I can't tell.

### Round 2: replies to each other

**Morgan (screen-reader-analyst):** Emma, your question about which of the three places holds the colour is my question too, just from the other side. If I change DNA repair in the legend and the table header doesn't follow, a sighted colleague will describe a colour I can't check anywhere. There should be one list, and it should be written text I can reach with Tab. Three copies of the same thing is two copies too many for me.

Elena wants to click the little square. That's fine for her. What worries me is what the square says when I land on it. If all it says is "button", I don't trust anything this tool paints.

As for how I actually work: my NetworkX script prints "community 3: 41 nodes, DNA repair". That line has a name, a count and a number. A legend has to tell me at least that much, or I'm back to asking someone what it shows.

The thing I still haven't seen is whether "Screen, Print, High contrast" changes my project or only the file. Emma asked, Priya asked, and nobody has answered. Until someone does, I'll assume it quietly changes both.

**Maren (genomics-cytoscape-user):** I'm with Emma on the three copies of the colours. That's exactly how Cytoscape burns me. I change the fill in the style, the legend I made with Legend Creator doesn't follow, and I only find out in the PDF. So whichever one is the real one, the other two have to follow it, and the legend in the export has to follow it too. Otherwise I'm redrawing it in Illustrator again.

Elena, I'd click the little square too. But you called them "group 8", and for me they aren't groups, they're MCL clusters. If I run MCL again with a different inflation value, cluster 8 might be a different set of genes. So do my colours stay on the cell cycle genes, or does "8" just keep its orange? Nothing I've seen answers that.

What's missing for me is the question I get asked first. Is it a fold-change gradient or cluster colours? A reviewer asks, and my PI asks whether it's colour-blind safe. Emma's right: name the palette, and put the name in the methods file.

**Jordan (marketing-analyst):** Elena, I'm with you. I'd click the little square in the key first too. But Emma, you're saying the real color lives in "Module color" in the left list, and if that's true, clicking the key only works if it changes that same color. If the key and the popup can disagree, I'll stop trusting both of them.

Trust, for me, means seeing that it did what I asked. I set DNA repair to our brand orange. Then I rerun the grouping because someone added a week of data. It should stay orange. If the grouping renames it "group 4" and hands it some other color, I've lost an afternoon redoing my deck.

What's missing is a plain before-and-after for the Export looks. I don't care what "High contrast" means technically. I want to see my slide in gray next to my slide in color, and a line that says "only this file" or "your project too".

Maren, I'd trust the preview more if it were the exact image I'd paste.

**Elena (explorer-elena):** Mira, I think you're right that there are two lists of the same colors. I'd never have noticed the popup one. I'd click the square in the little key and assume that was it. Then if the slide came out a different color I'd guess I clicked the wrong thing. I'd blame me, not the tool.

Emma, I don't know what Okabe-Ito is. If the button said that I wouldn't press it. "Eight distinct colors" at least tells me what I get. Maybe say both?

Maren, same here, I'd want to see the actual file. Show me the slide, not the dialog.

What would make me trust it: when I change DNA repair to orange, the other places turn orange right away where I can see them. Then if I undo, it goes back. If I can't see that happen, I won't touch it before a meeting.

And the "Screen, Print, High contrast" buttons. If picking Print changes my picture on screen too, that's scary. I'd just leave it on whatever it was.

What's missing is still the names. "Group 8" on a slide is useless.

**Emma (expert-emma):** Maren's right to be suspicious of the preview. I'd go further: the methods file is only worth anything if it's written from the same run that made the picture, not copied out of the dialog. Show me a figure and a methods file that disagree and I'm done with the tool.

The marketing analyst and I are asking the same question. There are two lists of the same colors and nothing says which one holds the color. Here's where I'd look for it: the "Module color" style in the left list, so I can export it and see "DNA repair = #E69F00" as text. If the swatch I click on the canvas legend edits that entry, fine. If it quietly makes a second copy somewhere, I can't reproduce the figure.

Elena, "group 8" is worse than you think. Rerun the community detection with a different seed and 8 can be a different set of nodes. So a label has to survive a rerun. Otherwise the brand orange ends up on the wrong module.

What's missing is the algorithm name, the resolution and Q, written next to the legend.

### Round 3: what would make you quit, what would make you switch, one change

**Morgan (screen-reader-analyst):** I'd quit on the first swatch that NVDA reads as "button" and nothing else. That's the whole test for me. If it says "button", I close the tab and go back to my NetworkX script, which at least prints "community 3: 41 nodes, DNA repair".

What would make me switch is the legend reading me that same line, so I stop asking a sighted colleague what the figure shows. Something like "DNA repair, 41 nodes, orange, too close to Cell cycle". The "too close" part has to be words, not an icon.

Emma, Mira, you both want the colour to live in one place. So do I, but for another reason. When I change it, I want to hear it said back to me: "DNA repair is now orange." If nothing is said, I'll assume the change didn't happen.

Maren, on a rerun I want the tool to tell me which clusters kept their name and which ones it guessed at. If it says nothing, I won't trust any of them.

The one thing to change: every group gets a name that isn't its colour, and that name is what gets spoken first.

**Maren (genomics-cytoscape-user):** I'd quit over one thing: my PI opens the PDF, the legend says one colour and the network shows another. Cytoscape has done that to me with Legend Creator, and I redrew it in Illustrator. So there should be one list of colours, and everything else, the canvas key, the export and the methods file, has to follow it. Emma, I agree the methods file has to come from the same run that made the picture.

What would make me switch is rerunning MCL. I name cluster 8 "cell cycle" and make it orange. After a rerun, the orange should go to the cluster that still has most of those genes, and the tool should tell me when it isn't sure. It shouldn't just quietly put orange on whatever number 8 is now. Mira, that's your brand-orange problem too.

Morgan, I'd take your line as the legend: "cell cycle, 41 genes." That works for me too.

The one change I want is a line on each Export look that says "this file only". My PI checks whether a figure is colour-blind safe. If it's the tool's job, then show me the gray version before I send it.

**Jordan (marketing-analyst):** I'd quit if I set DNA repair to our brand orange, reran the grouping on Monday's data, and the slide came out with that orange on some other group. Emma and Maren both said the group numbers can move after a rerun, so it's a real risk. And I wouldn't catch it. My VP would, in the meeting.

Elena, I'm with you on clicking the square in the key. But Morgan's right that it should be one list. If the key, the popup and the "Module color" entry are three copies, I've already lost.

What would make me switch from Gephi is a Look in Export that shows me the gray version of my slide, the actual image, plus one plain line: "only this file." Nobody has told me yet whether Print changes my project. Like Morgan, I'm assuming it does until someone shows me otherwise.

The one thing I'd change: the color stays with the group's name, not its number. "DNA repair" stays orange after a rerun. If the tool can't tell which group is DNA repair anymore, it should ask me. It shouldn't guess.

**Elena (explorer-elena):** Here's what makes me quit. I change DNA repair to orange by clicking the square in the little key. Then the slide comes out a different color and I can't tell why. I wouldn't file a bug. I'd close the tab and go back to Slides. Nobody would notice I left.

Emma, you want the color to live in "Module color" on the left. Fine, but I will never look there. So the square in the key has to change that same color, right away, while I'm watching. And I have to be able to undo it.

Maren, Emma, you both say a rerun can turn group 8 into a different set of dots. For me that's the same problem as the names. If the key only says "8", I can't tell whether my orange moved. Give the group a real name, or let me type one, and have the color stay with the name.

Mira, I agree about the before-and-after. On the Export looks, write "only this file" in plain words next to them.

The one thing I'd change is names in the key instead of numbers.

**Emma (expert-emma):** I'd quit the day the methods file and the figure disagree. I said that last round and it still holds. I'd also quit if a rerun quietly moves my colours. Maren and Mira both asked what happens to DNA repair's orange when the grouping is run again, and nobody has answered. Here's my answer. The colour belongs to the label, "DNA repair". It doesn't belong to "community 8". After a rerun, the tool matches the new communities to the old labels by overlap, tells me which ones it couldn't match, and leaves those uncoloured. It shouldn't guess.

Elena, fair point. Put both: "Okabe-Ito, eight colours, colour-blind safe". You read the second half, and the reviewer reads the first.

What would make me switch is being able to load the style as text, with the module colours and the export look in it, and get the same figure back next month. Morgan and I both need that.

The one thing I'd change is to make the export looks say, in words, "this file only". Every one of us has asked about that, and nobody has shown us the answer.

## Themes

Severity uses Nielsen's scale: 0 not a problem, 1 cosmetic, 2 minor, 3 major, 4 catastrophe. "Round 1" counts people who raised a theme on their own, before hearing anyone else. That count is the one to trust; later agreement is partly echo.

### 1. A group's colour must live in one place, and every other place must follow it

The same module colours appear on the canvas key, in the "Module as color" popover and in the table header, and in the export legend and methods file. Nothing on screen says which one holds the colour.

- **Who:** round 1, on their own: Jordan ("two lists of the same colors... which one is the real one?") and Emma ("which of those three is the one that actually holds the colour?"). Round 2: Morgan, Maren and Elena joined. Five in total.
- **Agreement:** strong on the principle. There is one source (Emma and Jordan guess it is the "Module color" style), and the canvas key, the popover, the table header, the export legend and the methods file are all views of it. A change made in any of them changes that source.
- **Dissent:** on how the change should be confirmed, not on the principle. Elena needs to see the other places change colour at once, with undo. Morgan needs it spoken back ("DNA repair is now orange"). Emma needs to read it as text in the exported style ("DNA repair = #E69F00"). Those are three separate ways of confirming the change, and all three are needed.
- **Evidence behind it:** Maren's Cytoscape story (the legend drawn with Legend Creator does not follow the style and she finds out only in the PDF) is the one concrete account of how this failure costs people. Elena's "I'd blame me, not the tool" is the important warning: the people most exposed to this would never report it.
- **Severity:** 3 (major). A figure whose legend disagrees with its canvas is the quit condition named by Maren, Emma, Jordan and Elena.
- **Note:** this matches the owner's written direction that style layers are reached from the selection's appearance and from the colour picker, while the legend is kept. On that reading the popover and the key are ways into the one style, not copies of it. The mock has to show that, because a static frame cannot.

### 2. The colour belongs to the group's name, and the name must survive a rerun

- **Who:** two strands merged here. Names in place of numbers came up in round 1 from Morgan ("every group has a name that isn't its color") and Elena ("'2', '8', '4'... Two what?"). Rerun stability came up in no round 1 turn. In round 2 Maren (a new MCL inflation value), Jordan (a week of new data) and Emma (a new seed) raised it independently of one another, each with a different cause. By round 3 all five held both positions.
- **Agreement:** unanimous that a colour stays with a label ("DNA repair", "cell cycle") and not with a community number, and that the tool must say which labels it could not carry across a rerun.
- **Dissent:** this is the real disagreement of the session. The participants split on what happens to a group the tool cannot match with confidence:
  - Emma: match by overlap, report the unmatched ones, and leave them uncoloured.
  - Maren: give the colour to the cluster that still holds most of those genes, and flag it when unsure.
  - Jordan: ask me; do not guess.
  - Morgan: tell me which kept their name and which were guessed.
  Emma and Jordan rule out guessing. Maren and Morgan accept a flagged best guess. That is a design choice for the studio, and a task test should settle it (see below).
- **Severity:** 3 (major). Jordan's "my VP would catch it, in the meeting" and Emma's "the brand orange ends up on the wrong module" both describe a wrong figure that nobody notices.
- **Architecture note:** matching new communities to old labels is graph logic. If it is built, it belongs to graphty-element, not the app.

### 3. Export looks must say whether they change the project or only the file

- **Who:** round 1: Emma only. Round 2: Morgan, Jordan and Elena. Round 3: Maren, Jordan, Elena and Emma all asked for the words "this file only", and Morgan assumed the worst ("it quietly changes both").
- **Agreement:** unanimous that the screen has to say it in words beside the Look buttons. Jordan and Maren also want a real before-and-after preview of the gray or print version of their own figure, because that is how a PI or a VP checks colour-blind safety.
- **Dissent:** none spoken. But the group assumed the answer is "this file only" without asking whether a Look could reasonably be a project setting. That answer is a studio decision, not something the group established.
- **Severity:** 3 (major) as labelled today. Elena, the least confident participant, said she would not touch the buttons at all ("I'd just leave it on whatever it was"), so the feature goes unused rather than failing loudly.
- **Discount:** only one round 1 voice, and the round 3 unanimity is the clearest echo in the session (see below).

### 4. The export has to be the real file, and the methods text has to come from the same run

- **Who:** round 1, on their own: Maren ("previews lie... I want to see the actual file"), Jordan (a legend with counts in the file), Emma (the methods file, praised), Elena ("what the file looks like when it's open on a slide"). Four in round 1.
- **Agreement:** strong and positive. The legend in the export and the methods file are the two things that would make Maren, Jordan and Emma switch tools. Emma adds that the methods file is worthless if it is copied out of the dialog instead of written from the same run as the picture.
- **Dissent:** none. Morgan did not comment on the export.
- **Severity:** 0 as a direction (this is support for it). It becomes 4 (catastrophe) if the figure and the methods file ever disagree: Emma and Maren each named that as their quit condition.
- **Mock-fidelity caveat:** nobody has seen an exported file. Every positive remark here is about a picture of a dialog. The storyboard needs the output itself: the PNG or PDF as it would sit on a slide, beside the methods text.

### 5. The legend has to be readable text, with a name, a count and a warning in words

- **Who:** Morgan in round 1, and throughout. Maren adopted Morgan's legend line in round 3 ("cell cycle, 41 genes"). Jordan asked for counts in round 1 ("148 below 0, 152 above"), which is the same content for a sighted reader.
- **Agreement:** the content of a legend row is agreed across three people: name, count, colour, and any "too close" warning written as words. The accessibility requirement proper (each swatch reached with Tab and announced with its name, not just "button"; a change spoken back) comes from Morgan alone.
- **Dissent:** none. Elena's click-the-square habit and Morgan's requirement do not conflict. It is the same control, and it only has to be named properly.
- **Severity:** 4 (catastrophe) for a screen-reader user if a swatch is announced as "button" only. It is Morgan's stated quit condition, and there is no other way into the colours. This is a single-voice finding, but it does not need more voices. It needs an accessibility check on the actual markup, which no discussion can settle.

### 6. Name the palette, in two registers

- **Who:** round 1: Emma (it looks like Okabe-Ito, so say so) and Maren (the fold change is red-blue, not red-green, and her PI checks first). Round 2: Elena objected that she would not press a button called Okabe-Ito. Maren asked for the palette name in the methods file.
- **Agreement:** reached within the group. Emma accepted Elena's point: "Okabe-Ito, eight colours, colour-blind safe", where the reviewer reads the first part and Elena reads the rest.
- **Dissent:** resolved, as above. It is a good example of the group improving an idea rather than just repeating it.
- **Severity:** 2 (minor) for the label. The palette name has to go into the methods file too; it costs little and a reviewer asks for it.

### 7. Changing a colour starts at the square in the key

- **Who:** Elena in round 1 ("that's what I'd try first"). Jordan and Maren said the same in round 2. Emma accepts it as long as it edits the one style. Morgan accepts it as long as the square has a proper name.
- **Agreement:** nobody objected to the key being an entry point. Elena was explicit that she would never look in the left list.
- **Dissent:** none. This belongs with theme 1: the key is acceptable only if it edits the one source.
- **Severity:** 2 (minor) as a discoverability question. It is a first-click test, not a discussion item.

### Single-voice items (not group findings)

- Emma: "Unassigned" is folded into "Other" with a "moved" tag. "Unassigned" is a real value in her data; "Other" is an overflow bucket the tool invented, and she does not want them merged without being asked. Nobody else took this up, but it is a data-integrity point, rated 3 (major) for Emma's persona. Worth fixing on its own merits: never merge a real value into an overflow bucket silently.
- Emma: the community algorithm, its resolution and modularity Q should be written next to the legend.
- Emma: she wants to load the style as text, with the module colours and the export look in it, and get the same figure back a month later. She says Morgan needs it too; Morgan did not say so.
- Maren: there is no visible place to paste a gene list or a DESeq2 table. The gallery assumes a network file.
- Maren: "fold-change gradient or cluster colours?" is the first question a reviewer asks, so the legend should make it plain which kind of colour it shows.
- Elena: the right panel's statistics ("Density 0.0868", "average degree", "components", "isolated") mean nothing to her. It "reads like a stats class".
- Morgan: the gallery headings work with the H key. Positive.

## Group-think and artifacts to discount

- **Round 3 converged on one sentence.** Four of five named "this file only" on the Export looks as their one change, and Emma closed by saying "every one of us has asked about that". In round 1 only Emma asked. The round 3 prompt ("the one thing you'd change") invites a quotable slogan, and this one spread from turn to turn. Treat theme 3 as a one-voice finding with a strong prior, not a five-voice one.
- **"Three copies" is partly an artifact of a static mock.** The participants assumed that the key, the popover and the table header are separate copies, because a still frame cannot show a change spreading. That confusion is real and worth fixing on the page, but it does not prove the design has three stores. The storyboard has to show one edit landing in all three places.
- **Rerun stability was introduced, not found.** No participant raised it in round 1. Maren brought it in during round 2 by replying to Elena's "group 8", and Emma and Jordan joined in the same round. The three causes differ (inflation, new data, seed), which is some evidence of independent concern, but all five agreeing by round 3 is echo.
- **The "I'd quit" framing inflates severity.** Every round 3 turn opens with a quit condition because the question asked for one. Rate severity from what each person would lose (a wrong slide in front of a VP, a figure a PI rejects), not from how strongly the turn is worded.
- **Names are crossed in the simulation.** The marketing analyst calls themself Jordan, while Elena, Morgan, Maren and Emma call them "Mira". Morgan credits "Priya" with asking about the Export looks, but no Priya took part, and by that point only Emma had asked. Emma says Morgan also wants a text style file, which Morgan never said. The cross-references are generated rather than recalled. This changes no finding, but it is one more reason to weight round 1.
- **Nobody saw an output file.** Every remark about the export legend and the methods file is about a picture of a dialog. Maren and Elena said so themselves. Positive export findings stay provisional until the actual exported file is shown.
- **Three of five skimmed the storyboards.** Maren, Jordan and Elena said the storyboards were too long and that they skimmed them, and Morgan could not read them at all. What participants say they did not see in the storyboards (for example, a rerun behaviour) may be there and simply unread. Before logging something as missing, check whether a frame already covers it.

## What to test next

1. **First-click test, task "make DNA repair orange".** Record where the first click goes: the canvas key, the popover, the left list or the table header. Then ask the participant to check that the change reached the export preview. This settles theme 7 and tests theme 1.
2. **Screen-reader walkthrough of the key on the real kit markup, not a picture.** Tab through the legend and record every announcement word for word. Pass means each swatch reads its name, count and colour, and any "too close" warning in words. This settles theme 5 and cannot be settled any other way.
3. **Rerun task.** Name module 8 "DNA repair" and colour it orange, then rerun with a new seed so that one module splits. Show three variants: unmatched left uncoloured, a flagged best guess, and ask-the-user. Measure whether participants notice the unmatched module before exporting, and which variant they trust. This settles the split in theme 2.
4. **Export look comprehension.** Show the Print look with and without a "this file only" line, and with and without a gray preview. Ask "if you pick Print, what changes on your screen afterwards?" before the participant clicks. This tests theme 3 without leading.
5. **Before any of these,** add a storyboard frame showing the exported file itself (the slide or PDF, with its legend and methods text) and one frame showing a single colour edit appearing on the key, in the popover and in the table header together. Several round 1 objections are about what a still picture cannot show.
