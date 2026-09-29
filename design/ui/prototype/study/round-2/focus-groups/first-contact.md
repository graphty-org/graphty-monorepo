# Focus group: first-timers and people handed a file (second meeting)

This group meets twice: once to react to the first mocks, and again to judge the revised ones. This file covers the second meeting.

**Participants (all simulated personas):**

- **Elena**, a business explorer. It is her first time with a graph tool. Her real data is a spreadsheet with an Account column and an Integration column.
- **Tom**, a lab manager. A colleague sends him a file with a saved recipe, and he opens it to put his own genes on it.
- **Jordan**, a marketing analyst. Jordan's deliverable is a ranked list of about 30 names with a reason for each, plus one slide. The CRM exports must not leave the laptop.
- **Maren**, a genomics researcher who uses Cytoscape today. In this scenario she is also the colleague who builds the recipe and sends it to Tom.

**What they saw:** the start screen (open a graph, sample graphs, recent files, the "stays on my laptop" line), the Les Miserables sample with its automatic size and colour styles and legend, the load dialog (format, label and link-end columns, type and broken-row warnings), the recipe dialog and its gene matching screen, the gene expression export for a reviewer, a ranking flow, and the storyboard pages.

**Format:** three prompted rounds. Round 1 asked for first impressions and a five-second read. Round 2 asked about trust, fit with how they work, and what is missing. Round 3 asked what would make them switch, what would make them quit, and the one thing to change.

---

## Transcript

### Round 1 -- first impressions and a five-second read

**Elena:** "Opening screen: it opens a graph, and my file stays on my laptop. Good, no install. I'd click Les Miserables because it's the colourful one.

Then the picture. Ooh, OK. The big orange one in the middle, Valjean. He's the most important, right? The biggest dot is the main character. The colour box at the bottom says 'group 2, 8, 4'. Two of what? I thought maybe orange was good and grey was bad. Not sure.

On the right there's 'density 0.0865'. Is that a lot? And 'Size by degree'. What degree?

The loading box has a lot going on. It says '1 node has no edges: OldMan'. I guess he's the lonely dot on the left? I probably wouldn't have spotted that on my own, so that's nice.

The recipe part, honestly, Maren, that one's yours. 'log2FoldChange' and 'Two columns could be the fold change'. I'd close it. Your Tom might get it. I wouldn't.

I also didn't see where you type a name to find it. Is that the little magnifier? Oh. It was right there."

**Tom:** Five-second answer: "Open the file Maren sent and put my genes on it." That part worked. The "Recipe waiting for data" box told me in plain words what the file does and that it carries none of the lab's data. Good. But the line that matters most to me, "uploads nothing", is small grey text right under the title. With my glasses on my head I nearly missed it. That sentence should be the easiest thing on the screen to read, not the hardest.

The matching screen is the first time a tool has shown me "84 of 96 matched" and then listed the 12 that didn't. It even caught 7-Sep turning into a date. That's the number the PI asks me for. Then it stops me with "Choose a column" for fold change. Maren, you built this. Why am I the one picking between log2FC and a network column I've never heard of? If I pick wrong, the slide is wrong and I'm the one who looks foolish.

Also, the recent list shows "Mule ring review" and "March transfers". Whose laptop is this? And the storyboard pages are walls of grey paragraphs. I'd skim them and quit.

**Jordan:** Five-second read of the start screen: "open a network file, it stays on my laptop." Good. That lock line is the first thing I'd look for, because my CRM exports can't go to anybody's server. That one line would get me past our security person.

Then the graph opened and the dots were already coloured and sized. I didn't run anything, so who decided? The key down in the corner says "Size by degree" and "Group color: 2, 8, 4". Those are just numbers. If my VP asks "what's purple?", I've got nothing to tell her. The word "sample" beside those styles made me think they were fake data. Degree is exactly the metric I don't want pre-baked, because it only shows me who's big.

The load dialog is honestly the best thing here. It told me my numbers came in as text and that one row was broken, before the load, not after. That's the 4,000-versus-3,100 argument I've had with every vendor. But I got lost in "Replace data" and the left column (format, which column holds the labels, which ones mark each link's ends). Don't make me read that just to open a CSV.

Maren, the matching screen you'd be sending me reads fine. "84 of 96 matched, 12 did not" is a sentence I can put on a slide. What I couldn't find anywhere is where the ranked table is.

**Maren:** Purpose, from five seconds: "open a network file and poke at it in the browser." That's a problem for me already. The start screen says "Open a graph" and offers Les Miserables and a karate club. I don't have a graph. I have 300 gene symbols and a DESeq2 CSV. If I can't paste those on the first screen, I go back to the STRING protocol.

The recipe dialog is different. "84 of 96 genes matched," and it lists the twelve by name, and it catches 7-Sep and 2-Mar as Excel dates. I've never had a tool tell me that. That one screen is worth more to me than the rest of the gallery.

But then it says two columns "could be the fold change," one from the network and one from Tom's table. The network one covers 300 proteins and his covers 84. If Tom picks the wrong one, lab meeting sees last month's numbers coloured as this week's. I sent that recipe, so that's my name on it.

Also, "filter step," "style layer," "Brings / You supply"... what is a layer?

Tom, would you have known which column to pick?

### Round 2 -- trust, fit, and what is missing

**Elena:** "Trust first. I believe the 'stays on my laptop' line, and I'd believe it faster if it were as big as Tom says. But I trusted the picture too fast. I thought Valjean was the most important because he's the biggest dot, and the screen never told me that 'degree' just means 'most connections'. Jordan's right. If the app picks the sizes and colours for me, it has to say who picked them and what they mean in plain words.

How I'd really use it: my data isn't Les Miserables. It's a spreadsheet with Account in one column and Integration in the other. Maren, it's the same problem you have with your gene list. Show me 'drop your spreadsheet' on the first screen, not sample graphs.

What's missing is getting a picture onto a slide. The export screen for Dr. Chen had a legend with real names and counts, like 'Ribosome 56'. That's what I want. But I'd have to get through 2x, Suffix and Scope to reach it. Just give me 'Copy picture for slides'.

Also, will the dots move every time I open it? Obsidian's graph does that, and it's why I stopped using it."

**Tom:** Trust: I trust Maren, not the tool. Today, when a colour looks wrong I email her a screenshot and she tells me what happened. This tool needs to let me do that too. I want one plain "copy what I did" summary I can paste into an email, something like "your recipe, my 84 genes, 12 not matched, fold change from my table".

Fit: I work between vendor calls on a small laptop with the zoom at 125 percent. Jordan is right about that left column. I'd never read it.

Maren, you said it's your name on it. Then decide the fold change column in the file itself and lock it, so I never see that question. If the tool truly can't tell, it should say "ask the sender" and give me a button to email her. It shouldn't make me guess.

Missing: the colours. I'm red-green weak. Elena asked if orange means good. I'd be asking which dot is red. There's no legend in words, like "red is up, blue is down", and I'd need one.

Elena, a bigger dot isn't a more important gene. Nothing on the screen told either of us that.

**Jordan:** Trust first. The lock line gets me past security, but only if it's true everywhere. The recipe screen says "uploads nothing". I'd want that same promise on export and share, because that's where things leak.

Fit: my deliverable is a ranked list of 30 names with a reason for each, plus one slide. The only ranking flow in the gallery is about proteins and patents. Where's "bridges the running and nutrition groups" in words my VP reads? And can I paste that table into Sheets?

Elena, you read the biggest dot as "most important." That's exactly the trap. Degree only shows who's loud, and a first-timer will present it as the answer. Either don't pre-size, or say "sized by number of connections" in plain words.

Missing:
- Group colours need names I can type ("Runners"). Our decks print in greyscale, so colour alone dies.
- Joining my CRM columns onto the network. That's half my job.

Maren, I'm with Tom. You know which fold-change column is right. Lock it in the file. Don't leave it to him.

**Maren:** Trust: the match report earns it. Nothing else in the gallery does yet.

Tom, you're right, and that one's on me. When I send a recipe I should be able to lock the column: "colour by log2FoldChange from the table you bring." Then you only get asked if your file doesn't have that column. Offering you a network column that covers 300 proteins against your 84 genes is a trap, and neither of us should be the one who falls into it.

Elena, "the biggest dot is the main character" is how a reviewer reads a hub-gene figure too. That's why sizing by degree before anyone asked for it worries me. Jordan's right that nobody chose it.

Fit with how I actually work: I didn't see a STRING query, clustering, enrichment per cluster, or a legend in the exported PDF. I also didn't see anywhere that writes down the cutoff and algorithm settings so I can paste them into my methods section. And is the fold-change colour scale centred on zero, and not red-green? My PI is colour-blind.

So this is nice, and I'd use it to check my matching. But Figure 3 stays in Cytoscape until I can cite this tool and export that figure with its legend.

### Round 3 -- switch, quit, and the one thing to change

**Elena:** "Switch or quit? Honestly, I'd quit the first time I drop my Account and Integration spreadsheet in and get the left column Jordan described: format, label column, which ones mark each link's ends. I don't know what 'link ends' means. I'd close the tab, and nobody would notice. Nobody asked me to do this.

I'd switch if three things were true. It guesses my two columns and just shows me the picture. It tells me in words what the sizes and colours mean, like 'bigger = more connections', and not 'degree'. And the dots stay where they were the next time I open it.

The one thing I'd change is to put my own file on the first screen, above Les Miserables. Maren, your gene list and my spreadsheet are the same ask.

Jordan, I think you're wrong about not pre-sizing, though. A blank grey hairball is why I gave up on Obsidian. Size it, but label it plainly. And Tom's 'copy what I did' summary: I'd paste that into Slack under my slide."

**Tom:** Switch or quit: I'd switch for the matching screen alone. "84 of 96 matched" with the 12 listed by name, and the 7-Sep date caught, is the report I get asked for at every lab meeting. No tool has given it to me before. I don't need anything else in the gallery.

I quit the day I have to choose the fold change column myself. Maren, you already said you'd lock it. Do that. If my file is missing that column, the screen should say "ask Maren" and have a button that emails her my screenshot and a one-line summary. I shouldn't get a menu.

The one thing I'd change is that one-line summary: "Maren's recipe, my 84 genes, 12 not matched, fold change from my table, red is up, blue is down." It should be in words, in big type, and easy to copy. That one line covers the colours I can't tell apart, answers the PI, and makes "uploads nothing" something I can check for myself.

Jordan, same for you. Words your VP can read beat any legend.

Elena, I'd put that line in plain words on the first screen too.

**Jordan:** Switch or quit, for me it's three things.

I'd switch from Gephi if the load dialog stays exactly as it is. Telling me before the load that my numbers came in as text and one row was broken saves me an afternoon, and I'd use the tool for that alone.

I'd quit in the first week if it hands me a picture that's already sized by degree and doesn't say who chose that. Elena showed us why: she read the biggest dot as "most important" within five seconds, and so will my VP. So my one change is this: nothing gets pre-styled unless the key says, in plain words, "Sized by number of connections (chosen automatically)", and the group colours have names I can type in, like "Runners". Our decks print in greyscale, so the legend has to work without colour.

Second on my list is the ranked table. I still couldn't find it. Thirty names, a reason for each, and I can paste it into Sheets.

Maren, Tom and I both said lock the column. When we meet again, I'm checking that he never sees that question at all. And the "uploads nothing" promise needs to be on export and share too, not just on the recipe screen.

**Maren:** Switch or quit: I'd switch for the matching step, and only if two things change.

First, the recipe has to lock the column. When I send it, I pick "log2FoldChange, from the table you bring," and Tom only gets asked if his file doesn't have it. Tom, you should never see a network column that covers 300 proteins.

Second, the tool has to let me start from a gene list. If the first screen is Les Miserables and a karate club, I close it and follow the STRING protocol again. Put a box where I can paste gene symbols or drop a DESeq2 CSV right there.

What makes me quit: sizing dots by degree before anyone asked for it. Jordan and Elena both read the biggest dot as the most important one, and that's how "hub gene" papers get written. Nothing should be sized until someone chooses it, and the key should say it in words: "size = number of connections."

The one thing to change: whatever I export, a PDF or Tom's email summary, should carry a legend in words ("red = up, blue = down, centred on 0"). It should also carry the settings, so I can paste them into a methods section. Without that, Figure 3 stays in Cytoscape.

---

## Moderator notes

- **Names held this time.** Each persona kept one name throughout.
- **Maren again played two roles**, the genomics user and the author of Tom's recipe. Tom and Jordan address product decisions to her as if she built the tool ("Maren, you built this"). That is the scenario speaking. Her agreement to lock the column is an author accepting a job in a role-play, not evidence from a real recipe author.
- **Jordan drifted once.** In round 1 Jordan speaks of "the matching screen you'd be sending me", as if Jordan were a recipe recipient. Jordan is not in that scenario, so Jordan's recipe comments are agreement, not first-hand evidence.
- **Elena judged a screen she did not use.** Her round 3 quit trigger is "the left column Jordan described". She is predicting her reaction to Jordan's account, not reporting her own.
- **Silence on last meeting's biggest problems.** Nobody raised the two colour screens disagreeing on what red means, the "sends your query" line undercutting the privacy promise, or the weight question nagging after a skip. Absence is weak evidence that the revisions hold. It is not confirmation; check each one directly next time.

## Themes

Severity uses Nielsen's scale, where 0 is not a problem and 4 is a usability catastrophe. "Voiced by" counts participants who raised the point themselves. Someone who only agreed is listed separately, because agreement is weaker evidence.

### 1. The recipe still makes the person who receives it choose the fold-change column -- severity 4

- **Voiced by:** Tom (round 1: "Why am I the one picking"; round 2: lock it, or say "ask the sender" with an email button; round 3: his named reason to quit). Maren (round 1: the network column covers 300 proteins and Tom's covers 84, so a wrong pick shows last month's numbers as this week's; rounds 2 and 3: the author should lock "log2FoldChange, from the table you bring").
- **Agreed:** Jordan (rounds 2 and 3), who has no stake in the scenario. Elena (round 1) would close the dialog at that point.
- **Dissent:** none.
- **Why severity 4 and not 3 as last time:** it survived a revision, and a wrong pick produces a wrong figure that the recipient has no way to detect. Tom's own framing: "If I pick wrong, the slide is wrong."
- **What they asked for:** the author locks the column in the file. The recipient is asked only when the column is missing from their table, and then the screen says "ask the sender" with a way to send a screenshot and a one-line summary. A column that comes from the network, not from the recipient's table, is never offered.
- **Discount:** Maren's agreement is the author role, and Jordan's is echo. The underlying evidence is Tom (three rounds, first-hand) plus Maren's first-hand account of the data mismatch.

### 2. The automatic size style is read as "most important", and nobody on screen says who chose it -- severity 3

- **Voiced by:** Elena (round 1: "The biggest dot is the main character"; round 2 she recognises it herself). Jordan (round 1: "I didn't run anything, so who decided?"; rounds 2 and 3). Maren (round 2: that is how a reviewer reads a hub-gene figure; round 3: a reason to quit).
- **Agreed:** Tom (round 2: "a bigger dot isn't a more important gene. Nothing on the screen told either of us that").
- **Observed misreadings:** one, Elena's. Last meeting three of four made the same misreading, so the pattern holds across both meetings, but this meeting adds only one new observation.
- **Dissent, on the remedy:**
  - Label it but keep it: Elena (round 3: "A blank grey hairball is why I gave up on Obsidian. Size it, but label it plainly").
  - Keep it only if labelled: Jordan (round 3: "Sized by number of connections (chosen automatically)").
  - Do not size until someone chooses: Maren (round 3).
  - All four agree on the minimum: the key must say, in plain words, what the size means and that the app chose it.
- **Sub-finding, one voice:** the word "sample" beside the automatic styles made Jordan think the data was fake (round 1). Weak evidence, but cheap to fix.

### 3. The legend is numbers and colours, not words -- severity 3

- **Voiced by:** Elena (round 1: "group 2, 8, 4. Two of what?"; was orange good and grey bad?). Jordan (round 1: "what's purple?"; rounds 2 and 3: group names you can type, like "Runners", and a legend that survives greyscale printing). Tom (round 2: red-green weak, wants "red is up, blue is down" in words). Maren (round 2: is the scale centred on zero and not red-green, her PI is colour-blind; round 3: the words go into every export).
- **Agreed:** all four.
- **Dissent:** none.
- **Reading:** this carries over from last meeting unfixed. Four independent needs (a first-timer, a VP audience, colour-blindness, a colour-blind PI) point at one fix: every legend states its rule in words and names its groups, and group names can be edited before export.

### 4. The start screen does not start from the reader's own data -- severity 3

- **Voiced by:** Maren (rounds 1 and 3: "I don't have a graph. I have 300 gene symbols and a DESeq2 CSV"; wants a paste box on the first screen). Elena (rounds 2 and 3: an Account and Integration spreadsheet, "drop your spreadsheet" above Les Miserables).
- **Agreed:** Elena names the two as "the same ask". Tom (round 3) wants his one-line summary on the first screen, which is a different request.
- **Dissent:** none.
- **Reading:** two independent voices from very different personas. Both frame the sample graphs as the reason they would leave in the first minute.

### 5. The load dialog: its warnings are trusted, its left column is not read -- severity 3 for the left column, 0 for the warnings

- **Praise, voiced by:** Jordan (round 1: numbers came in as text and one row was broken, before the load; round 3: "I'd use the tool for that alone"). Elena (round 1: "1 node has no edges: OldMan" is something she would not have spotted herself).
- **Problem, voiced by:** Jordan (round 1: lost in "Replace data" and the column choices: format, label column, link ends).
- **Agreed, second-hand:** Tom (round 2: "I'd never read it", at 125 percent zoom on a small laptop). Elena (round 3: her quit trigger, but about the column as Jordan described it; "I don't know what 'link ends' means").
- **Dissent:** none.
- **Reading:** only one person reported the left column from using it. Severity stays at 3 because the person most likely to quit on it is the first-timer, who wants the app to guess her two columns and show the picture. Test it directly with Elena on a two-column spreadsheet before counting more.

### 6. The gene matching report is the most trusted screen, again -- severity 0, a positive finding

- **Voiced by:** Tom (rounds 1 and 3: "I'd switch for the matching screen alone"), Maren (rounds 1, 2 and 3: "the match report earns it. Nothing else in the gallery does yet"), Jordan (round 1: a sentence for a slide).
- **Dissent:** none. Elena did not comment on it.
- **Keep it as it is.** It is also the pattern Elena and Jordan want for their own imports (themes 4 and 5).

### 7. Results must leave the app in words: a summary line, a table, a slide picture, the settings -- severity 3 for the table, 2 for the rest

- **The ranked table:** Jordan could not find it in round 1 or round 3, and says the only ranking flow in the gallery is about proteins and patents. Wants 30 names, a reason for each in plain words ("bridges the running and nutrition groups"), pasteable into Sheets. One voice, but repeated across both meetings, and last meeting Jordan also missed it.
- **A copyable one-line summary:** Tom (rounds 2 and 3: "Maren's recipe, my 84 genes, 12 not matched, fold change from my table, red is up, blue is down", in big type). Adopted by Elena (round 3, for Slack), Jordan (round 3) and Maren (round 3). One origin, three adopters.
- **A picture for slides:** Elena (round 2: "Copy picture for slides" instead of scale, suffix and scope).
- **Settings for a methods section, and a legend in the PDF:** Maren (rounds 2 and 3).
- **Dissent:** none.

### 8. The "uploads nothing" promise is strong but hard to read, and must hold everywhere -- severity 2

- **Praised, voiced by:** Elena (round 1), Jordan (round 1: gets past the security person), Tom (round 1: the recipe box says in plain words that it carries none of the lab's data).
- **Too small:** Tom (round 1: small grey text, nearly missed). Elena echoes it (round 2: "as big as Tom says").
- **Must extend to export and share:** Jordan (rounds 2 and 3). One voice.
- **Dissent:** none.

### 9. Will the picture look the same next time? -- severity 2

- **Voiced by:** Elena (rounds 2 and 3: will the dots move every time; this is why she left Obsidian).
- **Agreed:** nobody this meeting. Last meeting Tom and Maren raised the same need for a file that looks the same next week.
- **Reading:** one voice here, but consistent with last meeting's finding, so keep it open.

### 10. The product's own words still do not land -- severity 2

- **Voiced by:** Elena ("density 0.0865, is that a lot?", "what degree?"). Maren ("filter step", "style layer", "Brings / You supply", "what is a layer?"). Jordan ("Replace data", and degree).
- **Caveat:** a Cytoscape user asking what a layer is is a surprise and may be the persona drifting. Count Elena's and Jordan's points fully and Maren's at half weight.

### 11. Scope gaps for single personas -- severity 3 for the persona, a scope question overall

- **Maren:** a STRING query, clustering, enrichment per cluster, and something she can cite. She says Figure 3 stays in Cytoscape until then. Nobody else raised it.
- **Jordan:** joining CRM columns onto the network ("half my job"). Nobody else raised it.
- These are product-scope decisions for graphty-element (data sources, joins, algorithms), not defects in the screens.

### 12. Mock and study-material fidelity, not design -- do not count

- The recent-files list showing "Mule ring review" and "March transfers" (Tom: "Whose laptop is this?") comes from shared fixtures. It does raise a real, small question: a first run should show an empty list. Severity 1.
- The storyboard pages as "walls of grey paragraphs" (Tom) is about the study materials, not the product.
- Elena not seeing the search magnifier resolved itself within seconds. Not a finding.

## Group-think effects to discount

- **One misreading became the room's proof.** Only Elena read the biggest dot as the most important in this meeting. Jordan then cites "Elena showed us why", and Maren says "Jordan and Elena both read the biggest dot as the most important one", which misattributes it to Jordan, who warned against the reading. Count one observation plus agreement, backed by last meeting's three.
- **Tom's summary line became everyone's answer.** Elena, Jordan and Maren each adopted it in round 3 for their own use. The need behind it is plausible for each, but the wording has one source. Do not count it as four.
- **"Lock the column" was agreed by the author and a bystander.** Maren agrees in the author role the scenario gives her, and Jordan has no stake. Tom's first-hand account is the evidence.
- **The load dialog's left column spread from Jordan.** Tom's "I'd never read it" and Elena's quit trigger both rest on Jordan's description, not their own use.
- **"As big as Tom says".** Elena's legibility complaint about the privacy line is an echo of Tom's.
- **"84 of 96" repeated again.** Three people praised the matching report first-hand in round 1. Its reappearance in round 3 as the reason to switch is partly repetition.

## Questions to bring back next time

1. When a recipe names its column, does Tom ever see a column question? When his file lacks the column, is the only option "ask the sender"?
2. Does the key say in words what size and colour mean, and that the app chose them? Can group names be typed, and does the legend read in greyscale?
3. Can Elena drop a two-column spreadsheet and Maren paste gene symbols from the first screen, and get a picture without reading the column choices?
4. Can Jordan find the ranked table unprompted, and paste 30 names with reasons into a spreadsheet?
5. Is there a copyable one-line summary in words, and does it state the colour rule?
6. Does the "uploads nothing" promise appear on export and share, in type as easy to read as the title?
7. Does the layout stay put when the file is reopened?
8. Check directly the three problems nobody raised: the colour rule matching across screens, the data-source line near the privacy promise, and the weight question after a skip.
