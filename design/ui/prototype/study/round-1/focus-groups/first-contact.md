# Focus group: first-timers and people handed a file

This group meets twice. In round one it reacts to the first mocks. In round three it comes back to judge the revisions. This file covers the first meeting.

**Participants (all simulated personas):**

- **Elena**, a business explorer. It is her first time with a graph tool, and she has a messy CSV of customer names.
- **Tom**, a lab manager. A colleague sends him a file with a saved recipe, and he opens it.
- **Jordan**, a marketing analyst with a social-media mention export. Two other participants call this person "Priya". See the moderator notes.
- **Maren**, a genomics researcher who uses Cytoscape today. Jordan calls her "Sam". In this session she mostly plays the colleague who builds and sends the recipe.

**What they saw:** the start screen (open a graph, sample graphs, connect to a data source), the load dialog with its edge and weight questions, the Les Miserables sample with its default size and colour styles and legend, the docked table, the recipe apply dialog with gene matching, and the gene expression colour screen and export.

**Format:** three prompted rounds. Round 1 asked for first impressions and a five-second read. Round 2 asked about trust, fit with how they work, and what is missing. Round 3 asked what would make them switch, what would make them quit, and the one thing to change.

---

## Transcript

### Round 1 -- first impressions and a five-second read

**Elena:** I'd write down "it makes a map of who's connected to whom, from a file you drop in." I got that from the dots, not from anything written on the screen.

The first part worked for me. The start screen says my files stay on my computer, and that got me to try it. The sample looks nice.

Then the load box lost me. "Edges from links, by position in nodes." "A bigger value means: a closer tie, a longer way, more can flow." I picked "Not sure yet" because I honestly wasn't sure. After that, the side panel kept asking me about it ("weight: unknown"), which felt like being told off for a question I couldn't answer. It also read the numbers and then ran "unweighted" anyway. I don't know why that happened, and it made me trust the numbers less.

Yes, I read the biggest dot as the most important person before anything ran. The legend says "Size by degree degree". I didn't read it, and even if I had, "degree" means nothing to me.

My data isn't a tidy JSON file from a tutorial. It's a CSV with two name columns and messy spellings. Show me that case.

Maren, "recipe" sounds like a template to me. That's useful, but would I know one had been applied to my graph?

**Tom:** In five seconds I'd write "a place to open a network file." That lock line under "Open a graph" is the first thing I actually read, and I liked it. "Uploads nothing" answers my IT question before I have to ask it. But the next line says "Connect to data source... sends your query." Sends it where? Now I'm not sure the first line holds.

The apply dialog is the screen I'd live on. "84 of 96 genes matched" in big type, and 7-Sep flagged as "looks like a date," is the first time software has admitted the Excel thing to me. I'd copy those 12 ids straight into an email to the postdoc.

Then it asks me which of two fold-change columns is right, and whether to read it "below 0 is down" or "an amount." Maren, that's your job. You built the recipe, so why is it asking me? If I pick wrong, what does the slide look like? Also, blue below and red above: I'm red-green weak, and I can't check that from a two-pixel swatch.

"Recipe," "layer," "filter step," "waiting": I nodded, but I couldn't define any of them for you.

**Jordan:** Five-second read: "open a graph, don't upload anything." Good. The line under the title saying my files stay on this computer answered my first question before I asked it, and that's usually where legal comes in. That line alone buys the tool an afternoon from me.

The load dialog after that lost me a bit. "A bigger value means... Not sure yet, paths ignore it." Paths? I just wanted to see my mention export. I'd skip it and hope the default was right.

On the dot sizes: I assumed the big dots were the influencers. Then I saw the style is called "Size by degree, sample." So it's just who has the most connections. That's a follower count with a nicer name. The legend reads "group 2, 14." My VP is going to ask what orange means, and "2" isn't an answer.

Maren, I get the recipe screen. "84 of 96 matched" and a list of the 12 that didn't is exactly what I'd want if you sent me your influencer setup and my column says "handle" where yours says "username."

Where's the table, though? I didn't see a sortable list anywhere I could copy the top 40 from.

**Maren:** Five seconds: "open a network file and look at it." That's my first problem. The start screen wants a file, and I don't have one. I have 96 genes in a CSV out of DESeq2. There's nowhere to paste symbols, and nothing about STRING or a confidence cutoff. The "uploads nothing" line is good, though. My PI would ask about that first.

The binding step is the first screen that talks like my data. "84 of 96 genes matched" is the number I look for, and it lists the 12 that didn't. And it caught 7-Sep and 2-Mar as spreadsheet dates. Oh, good. Excel eats those every time.

Sitting here as the one who sends the recipe, I have one worry. It found two fold-change columns, one in the table and one in the network file, and their ranges are different. My colleague picks one, and does the exported figure say which? Reviewers will ask what red means.

On the Les Miserables screens, "A bigger value means... paths ignore it" meant nothing to me. And I read the big dots as the important characters before anything had run.

### Round 2 -- trust, fit, and what is missing

**Elena:** Tom, I'm with you on "sends your query." If I can't tell whether my customer list leaves my laptop, I close the tab. My legal team would stop me before I even got to the question.

Priya (the marketing analyst), you asked where the table is, and I found it under the graph. That's the part I'd actually use, and it's how my analytics dashboard already works: click, sort, copy. But the column header says "degree," and I'm stuck on that word again. Call it "connections" and I'm fine.

On fit: I'd open this at 4pm with Slack in the other half of my screen. In the expression screen, the grey "216 others, muted" line and the pale dots would disappear when I share my screen.

What's missing for me: I never see my own spreadsheet go in. Show me two name columns, "Acme Corp" next to "Acme Corp " with a trailing space, and what the tool does about it. The genomics group gets "84 of 96 matched." I want "we merged 14 names that looked like duplicates -- check them." Without that, I won't trust the picture enough to put it on a slide.

**Tom:** I trust the count. "84 of 96 matched" with the 12 listed by name is what I'd say out loud in lab meeting. The rest of that dialog costs me trust. Every question on it is a chance for me to look foolish, and I can't undo a wrong answer I didn't know was wrong.

Maren, you said the exported figure should say which fold-change column was used. That helps, but I'd go further. You pick the column when you build the recipe, and the recipe locks it. Only ask me if my file actually has two. Same with the colour scale. You know whether it's "below 0 is down."

Elena, the side panel nagging you about the question you skipped is exactly my fear. I skip, it flags me, and I don't know if the picture is wrong.

How I actually work: the link comes by email and I have fifteen minutes. What's missing is the ending. I need the slide the PI sees, with a legend in words ("red = up in knockdown"), checkable without trusting my eyes on colour. I also need to know it will look the same next week.

Priya, I don't need a whole table. The 12 unmatched, copyable, is my table.

**Jordan:** On trust: I found the table after all. It's docked under the canvas, sorted by degree. So my question has changed from "where is it" to "can I copy 40 rows into Sheets with the names attached?" Nothing I saw shows me that. If I can't, I'm screenshotting it like I do everything else.

The export legend in the gene example has "Ribosome, 56" and "Proteasome, 40", which is what I want: named groups with counts. But my own export will say "group 2", because my file has no names for the communities. Where do I rename them before my VP sees it?

Elena's right about the CSV. My mention export is two handle columns plus a count, and "a bigger value means a closer tie" was the one question I could actually answer. Nine mentions really is closer than one.

Tom, my slides get printed in greyscale. Blue against red turns into two greys, so show me the legend in grey before I trust it.

Maren's worry is mine too. If a number on the figure doesn't say what produced it, my VP reads "0.547" as a score out of one.

**Maren:** I do trust the matching step more than anything Cytoscape has shown me. Counting 84 of 96 matched, naming the 12 that didn't and flagging 7-Sep as a date is the thing I've been asking the helpdesk for. The export also writes a methods file next to the figure with the legend drawn in. That's two of my worst afternoons gone.

But then I found this. The colour screen says "below 0 is red, above is blue." The recipe dialog says "blue below 0, red above." Tom, that's your red-and-blue question, and the app answers it both ways. If a tool contradicts itself on the colour key, I don't trust it with a figure. Red-blue also isn't safe for my PI, who can't tell red from green.

On fit: I start with 96 symbols and a DESeq2 table, not a network. There's no STRING query, no confidence cutoff, no clustering, no enrichment. So I'd leave for half the work. Then why not just stay in Cytoscape?

Elena, I agree about the "not sure yet" question. I know what my edges mean, and it still read like a quiz.

Missing: something I can cite, and a promise that it will still exist when reviewer 2 asks.

### Round 3 -- switch, quit, and the one thing to change

**Elena:** What would make me switch is one screen: I drop in my CSV with its two name columns and a count, and the tool tells me in plain words what it did. For example, "We merged 14 names that looked the same, like 'Acme Corp' and 'Acme Corp ' -- check them." It should also offer "use the count as how strong the link is," already ticked, since Jordan and I can both answer that one. If that screen exists, I would put the picture on a slide.

What would make me quit is being asked a question I can't answer and then getting nagged about it. Tom has the same fear. If I skip something, the tool should pick a sensible default and say which one it picked, not keep flagging "weight: unknown."

Maren, I'd have wanted to know whether a template had been applied to my graph. You never answered that.

The one thing to change is the words. Say "connections" instead of "degree," and write "biggest dot = most connections" in the legend. Jordan's VP and I would both read it that way. Priya, being able to copy the table into Sheets would seal it for me.

**Tom:** I'd give it one more try. I wouldn't switch to it, because I never chose the tool in the first place. She did. "Switch" for me means I stop emailing her for a PNG.

Here is what would make me quit. Maren found that one screen says red is below zero and another says blue is below zero. That is my second failure in one sitting. If I can't tell up from down by colour, and the app can't either, I'll ask her to just send me a PNG and an Excel file.

Here is what would keep me. I want to open her link and see her picture. I want "84 of 96 matched" with the 12 listed, and I want no questions I can't answer. Priya, the greyscale print is the same test for me. If the legend works in words without the colour, it works for me too.

The one thing: when I close it, I want to know I didn't change her file, and that the slide will look the same next week. Elena, you're right about the skip flag. If I skip a question, tell me whether my picture is wrong or only unfinished. How to show that is her job, not mine.

**Jordan:** I'd switch for one job: a first look at a mention export before I build the deck. The "uploads nothing" line gets me past legal. Nothing I own does that in a browser tab without an install. But I'd quit the moment the output needs extra work. If I can't copy the top 40 from the table with handles attached, or rename "group 2" to "Skincare creators" before the legend goes on a slide, I'm back in Gephi with a screenshot and a text box. That's what I do today, and I'm not switching tools to do it again.

Tom, I'm with you on the dialog. Ask me the question I can answer, like whether nine mentions is a closer tie than one, and leave out "paths ignore it."

Sam, the red/blue contradiction worries me more than the missing STRING step. If the tool gets its own legend wrong, my VP will catch it before I do.

One thing to change: the legend has to be in words the VP can read. Say "Connections" instead of "degree degree", use named groups, and state the source on the export.

**Maren:** Here's what would make me switch. I paste my 96 symbols, pick a STRING cutoff, and within ten minutes I see my own genes coloured by log2 fold change. The scale has to be centred on zero, with a colour-blind-safe pair so my PI can read it, and one gene at 9 can't wash everything else out. Then I export a PDF with the legend and a methods paragraph I can paste. If I get that, I'd use it for figures even without clustering. I'd still open Cytoscape for MCODE and enrichment.

Here's what makes me quit. The first screen asks me for a network file I don't have. And a colour key that says two opposite things.

Tom, I agree with you. When I'm the one sending the recipe, the recipe should fix the column and the direction. Don't ask him.

Jordan, printing in greyscale is a fair test. A diverging scale should still read light-to-dark in grey.

The one thing to change: make every page state the same colour rule, and write it into the legend in words. Second, give me something to cite.

---

## Moderator notes

- **Names drifted during the session.** Elena and Tom call the marketing analyst "Priya", and the analyst signs as "Jordan". Jordan calls the genomics researcher "Sam", and everyone else calls her "Maren". No content depends on the names. For round three, fix one name per persona in the moderator brief.
- **Maren played two roles.** She was the genomics user in her own right and also the colleague who sends Tom the recipe. When she speaks as the recipe author, the other participants push work onto her ("that's your job"). That reflects the scenario we set up and does not mean real recipe authors want the job. It still needs checking with an author who is not also a recipient.
- **One question went unanswered.** Elena asked twice whether she would know a recipe had been applied to her graph. Nobody in the room could answer, and the mocks do not show it. It stays open.

## Themes

Severity uses Nielsen's scale, where 0 is not a problem and 4 is a usability catastrophe. "Voiced by" counts participants who raised the point themselves. A participant who only agreed with someone else is listed separately, because agreement is weaker evidence.

### 1. The two colour screens contradict each other on what red means -- severity 4

- **Voiced by:** Maren, who found it (round 2).
- **Agreed:** Tom, who calls it a reason to quit; Jordan, who ranks it above the missing STRING step. Maren repeats it as her main change in round 3.
- **Dissent:** none.
- **Caveat:** this is one participant's discovery, and the others heard it from her and did not see it themselves. The cause is also most likely an error between two mocks, not a design choice. Even so, the damage it does to trust is real and total: every participant said a figure tool that contradicts its own legend is unusable. Treat it as a defect to fix everywhere now, and write down one rule for which colour means below zero, stated in the framework, before round three. Do not count it as evidence against the design of the diverging scale.

### 2. The trust gained from "uploads nothing" is lost by "sends your query" -- severity 3

- **Voiced by:** Elena, Tom, Jordan and Maren, all in round 1. All four praised the local-only line on their own, and every one of them called it the thing that got them to try the tool.
- **Undercut by:** Tom, who noticed that "Connect to data source... sends your query" sits right below it and does not say where the query goes (round 1).
- **Agreed:** Elena, strongly ("I close the tab").
- **Dissent:** none. Jordan and Maren did not comment on the second line.
- **Reading:** the privacy promise is the strongest asset on the start screen, and the two lines next to each other make it look conditional. The data-source line needs to name where the query goes and say that files still stay local.

### 3. The load dialog asks about weights in terms people cannot answer, then keeps nagging -- severity 3

- **Voiced by:** Elena (round 1: the options, the "weight: unknown" nagging, and the numbers being read but then run unweighted); Jordan (round 1: "paths ignore it"); Maren (round 1: the text meant nothing to her; round 2: "read like a quiz").
- **Agreed:** Tom, who adds that a wrong answer he does not know is wrong cannot be undone.
- **Dissent, or a refinement:** Jordan and Elena could both answer the question when it is put in their own terms ("nine mentions is a closer tie than one"). The problem is how it is worded and what happens after a skip, not that the question is asked.
- **What they asked for:** ask in the data's own words, pre-tick "use the count as how strong the link is" when a count column exists, and after a skip use a sensible default and say which one, with no persistent flag. Tom's wording is: tell me whether my picture is wrong or only unfinished.
- **Caveat:** the "read the numbers but ran unweighted" behaviour may be a mock inconsistency. Check it before counting it against the design.

### 4. The legend's words do not name what the viewer is looking at -- severity 3

- **Voiced by:** Elena (round 1: "degree" means nothing, and "Size by degree degree"); Jordan (round 1: "group 2, 14" and "what does orange mean"; round 3: "Connections", named groups, the source); Maren (round 3: state the colour rule in words); Tom (round 2: "red = up in knockdown", checkable without seeing colour).
- **Agreed:** all four.
- **Dissent:** none.
- **Sub-findings:**
  - Three of four read the biggest dot as the most important person before anything had run (Elena, Jordan, Maren). The default size style implies a judgement, and the legend does not correct that. Jordan's reframe is useful here: degree is a follower count with a nicer name.
  - The group names come from the data, and nothing exists to rename "group 2" before exporting (Jordan). Maren's export had real names ("Ribosome, 56") only because her data carried them.
  - Numbers with no source get misread. Jordan's VP would read "0.547" as a score out of one.
- **Caveat:** "degree degree" is a typo in the mock, a fidelity problem. Do not count it. The complaint about the word "degree" stands without it.

### 5. The recipe asks the person receiving it to make the author's decisions -- severity 3

- **Voiced by:** Tom (round 1: which fold-change column, and which direction; round 2: the recipe should lock both, and only ask if his file really has two).
- **Agreed:** Maren, who is the author in this scenario (rounds 1 and 3: "don't ask him"); Jordan (round 3).
- **Dissent:** none. See the note on Maren's double role: an author agreeing to take on more work is the scenario speaking, not independent confirmation.
- **Also:** the export should say which column and which rule produced the colours (Maren round 1, Jordan round 2).

### 6. The match summary is the most trusted screen in the study -- severity 0, this is a positive finding

- **Voiced by:** Tom, Jordan and Maren, each on their own in round 1. They praised "84 of 96 matched", the 12 unmatched listed by name, and the ids flagged as spreadsheet dates. Maren repeated it in round 2 ("more than anything Cytoscape has shown me").
- **Dissent:** none. Elena wants the same pattern for her own data (theme 7).
- **Keep it.** Tom adds one requirement: the 12 unmatched ids must be copyable.

### 7. First-timers never see their own messy data go in -- severity 3

- **Voiced by:** Elena (rounds 1, 2 and 3: two name columns, trailing spaces, and "we merged 14 names -- check them"); Jordan (round 2: two handle columns plus a count).
- **Agreed:** Jordan agrees with Elena explicitly.
- **Dissent:** none.
- **Reading:** this is the match summary from theme 6, applied to cleaning names on import. Both people new to graphs framed it as the thing that decides whether they would put the picture on a slide. The mocks only show tidy JSON and gene lists, so this is a gap in what was shown. It is not evidence that the design fails.

### 8. Getting results out: the table must copy, and the legend must survive greyscale -- severity 2 for the table, 3 for greyscale

- **Table:** Jordan (rounds 1 and 3: copy the top 40 with the handles into Sheets). Elena agrees (rounds 2 and 3). Tom dissents on scope: he only needs the 12 unmatched ids, not a whole table. Discoverability was a partial problem: Jordan did not find the docked table in round 1, and Elena did. Only one of four missed it, so the evidence is weak.
- **Greyscale and colour-blind use:** Jordan (round 2: printed in greyscale); Tom (round 1: red-green weak and a two-pixel swatch); Maren (round 2: her PI is colour-blind; round 3: a scale centred on zero that still reads light to dark in grey, with outliers clamped). Three people raised this independently, which makes it one of the best-supported findings. It fits theme 4: a legend written in words fixes it for all three.
- **Low-contrast muted elements disappear when a screen is shared:** Elena only (round 2). One person voiced it once, so it is weak evidence. Recheck it in round three.

### 9. The genomics user's starting point is not supported -- severity 3 for her persona, a scope question overall

- **Voiced by:** Maren (rounds 1, 2 and 3): she has a gene list with no network file, and no STRING query, confidence cutoff, clustering or enrichment.
- **Agreed:** nobody else. Jordan explicitly ranked it below the colour contradiction.
- **Reading:** this is one persona's workflow gap and a product-scope decision (it touches data sources, which graphty-element owns). It is not a usability defect in the screens. Her round 3 list of conditions for switching is a clear minimum case: paste the symbols, choose a cutoff, colour by fold change, export a PDF with a methods paragraph. She also asked for something she can cite and a promise the tool will still exist. Both are outside the scope of the UI.

### 10. The words the product uses for its own concepts do not land -- severity 2

- **Voiced by:** Tom ("recipe", "layer", "filter step", "waiting": he could define none of them); Elena ("recipe" sounds like a template, and would she know one had been applied?).
- **Dissent:** Jordan understood the recipe screen without trouble.
- **Open:** whether a recipe that has been applied is visible afterwards (see the moderator notes).

### 11. The person who receives the file needs to know it is safe and will look the same next week -- severity 2

- **Voiced by:** Tom (round 2: it looks the same next week; round 3: he did not change her file). Maren wants the same guarantee over longer periods ("when reviewer 2 asks").
- **Dissent:** none.

## Group-think effects to discount

- **The colour contradiction spread by word of mouth.** Only Maren saw it. Tom and Jordan then made it their reason to quit. The severity holds because the defect is real, but the "three people would quit over it" count is inflated. Count one discovery plus two agreements.
- **The nagging after a skip spread through Tom.** Tom's worry about skipping is a reaction to Elena's account, not his own experience of the dialog. He did not report seeing the flag.
- **Agreement with the recipe author.** Maren, who took the author role, agreed that the recipe should decide things so Tom does not have to. Round one built that dynamic into the scenario. Do not treat it as independent support for locking the recipe.
- **Everyone repeated "84 of 96 matched".** It was praised on its own by three people in round 1, which is solid. Its later appearance in round 3 as a thing that would keep them is partly repetition. Do not count it again.
- **Words passed around as a script.** "Connections" instead of "degree", "the VP" and "legal" circulated and were adopted: Elena borrowed Jordan's VP, and Tom borrowed Jordan's greyscale test. The underlying needs are independent. The exact wordings are not, so do not treat their repetition as frequency.
- **Mock fidelity, not design:** "Size by degree degree" (a typo), and possibly the numbers that were read and then run unweighted. Both need checking against the mocks before either counts.

## Questions to bring back in round three

1. Do both colour screens and the export now state the same rule, in words, and does the legend still read in greyscale?
2. Does the data-source line on the start screen keep the "uploads nothing" promise intact?
3. When a weight question is skipped, is the default named, and is the nagging gone?
4. Does a messy two-column CSV now show a plain summary of what was merged?
5. Can "group 2" be renamed, and can the top rows of the table be copied, before exporting?
6. Can a viewer tell that a recipe has been applied, and can the person who received it see that they did not change the original?
