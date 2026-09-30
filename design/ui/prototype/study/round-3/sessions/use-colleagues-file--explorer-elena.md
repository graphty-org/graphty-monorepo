# Session: using a colleague's file on your own gene list -- Explorer Elena, first-time graph user

Participant: Elena, a product manager with no graph or biology training (persona:
study/personas/explorer-elena.md). Variant: curious afternoon (long clock).
Task given by the moderator, and nothing more: "Your lab lead emailed you this file. Use it on your
gene list."
Screens: the start screen with a recipe waiting (screens/start-screen.html, state 4) and the Apply
recipe dialog and its binding step (screens/binding-step.html, states 1 to 3).

Moderator note on the setup: the task is off Elena's usual ground (she works with account and
integration spreadsheets, not genes). She was told to play along with a gene list she had been
handed -- a 96-row CSV with columns symbol, log2FC, padj -- the way she would if a colleague asked
her to "just run the file on this". That is realistic for her: she gets forwarded things. Her
vocabulary stayed hers; she did not know what log2FC means beyond "the number column".

Renders she saw, in order (all in shots/):

- r3-elena-colleague-recipe-card.png -- the start screen after the emailed file was dropped: "Recipe
  waiting for data", Expression overlay
- r3-elena-colleague-preview.png -- Apply recipe, first step: what it adds and what it reads
- r3-elena-colleague-12-unmatched.png -- the binding step after her table was added: 84 of 96 genes
  matched, a fold-change column still to choose
- r3-elena-colleague-chosen.png -- the same step with a column chosen and Mdm2 matched by hand

Moderator note on the renders: the study-view render of the start screen
(shots/record/screens__start-screen--study.png) hides the product's own text in state 4 -- the recipe's
name, its description, "It carries no data" and the privacy lines all disappear, leaving only
"Recipe waiting for data", Open... and Close recipe. The study view hides every heading and
paragraph outside a `.k-app` frame, and the start screen's frame is not one. The session used a
full render with the design notes ignored instead. The start screen's study view needs fixing
before any other participant sees it.

## Think-aloud transcript

**1. The start screen, file already dropped.** "OK so I dragged the attachment in. It says 'Recipe
waiting for data'. Recipe. Huh. My lab lead called it 'the overlay file', so I guess that's the
same thing -- yeah, 'Expression overlay', that's the name in the email. Fine."

She reads the first line of the description and stops partway. "Colors your genes by log2 fold
change, red for up and blue for down... then something about muted module colors and confidence
under 0.7. OK. I don't know what half of that is but it colors my genes. That's what I want."

"'It carries no data. To use it, open a protein network and a table of your genes.' ... Wait. A
protein network? I don't have a protein network. I have the gene list. He just sent me this one
file. Am I supposed to have a network already? Did he forget to attach it?"

She scrolls down to the recent projects. "Mule ring review, March transfers, patent citations --
those aren't mine, but whatever, this is a test computer. 'Knockdown screen, September, 300
proteins.' That sounds like a lab thing. Is that the network? Maybe that's what he means." She
hovers it and does not click. "I don't want to open someone else's project and wreck it."

"There's a big blue Open... button in the box, so I'm doing that. I'll pick my gene list and see
what it says." (Pause.) "I'll be honest, I'd expect it to yell at me that I don't have the network
thing. Let's see."

(Moderator note: she did not notice the privacy line "This recipe names no server, so graphty
contacts none" and did not ask where the file goes. She did read "It carries no data" and took it
to mean "the file is empty-ish, it's a template". She read "open a protein network and a table" as
two files she must already own, and she owns one.)

**2. Apply recipe, the first step.** (Shown r3-elena-colleague-preview.png, the state before a
table is added.) "Oh, it opened something. There's a network behind it. 'ppi-core-300'. Where did
that come from? ... Down at the bottom: 'Reads from ppi-core-300.graphml, opened by this recipe.'
So the recipe did have a network in it? It literally said it carries no data. Now I'm confused,
but OK, good, I didn't need to find one."

"'Brings: 2 styles, 1 filter, 1 run.' No idea what a run is. 'You supply: a network with a gene
column.' Didn't I just not supply the network?"

She looks at the table under "What it reads from the data". "Fold change -- log2FoldChange -- 152
up, 148 down. Great, it found my numbers. Everything was found by name, it says at the bottom.
Apply is blue. Honestly if I were alone I'd press Apply right now."

Moderator asked: "Before you press anything -- how many of your genes will be colored?" "All of
them? It says 152 up and 148 down, that's 300. ... Hm, no. My list is 96 rows. So those aren't my
genes. Where's my list? I thought I opened my list." She spots "Add a table..." on the last line.
"Oh. Maybe that. It's tiny. I picked my file on the start screen, I thought that was it."

(Moderator note: this is the most important moment of the session. At this state the numbers
come from the network's own fold-change column, not from her gene list, and the dialog says
"Everything was found by name" with Apply enabled. She would have applied it and taken the
colors to be her results. She only caught it because she happened to know her list had 96 rows
and the moderator asked for a count. The only route to her own table is a small text link, "Add a
table...", on the dialog's last data line.)

**3. After adding her table.** (Shown r3-elena-colleague-12-unmatched.png.) "OK, 84 of 96 genes
matched. That's a real number, that's my list. So 12 didn't work."

"'Mdm2 differs only in letter case from MDM2', button 'Use MDM2'. Sure, yes, obviously it's the
same thing." Clicks it. "Ha, that's nice. I like that it just asks."

"'7-Sep, date?' 'Two ids look like spreadsheet dates.' Oh my god, Excel. Excel does this to
everything, it did it to our version numbers once. So that's my fault, I opened it in Excel before
sending it. 'Correct them in your table and add it again.' ... I have to go back to Excel, fix it,
save it, come back? Can't I just type the right name here? It knows it's a date." (Short pause.)
"Whatever, it's two genes."

"The rest say 'Not in this network'. TP53BP1, GAPDH, ACTB... So those just aren't in their
network. I probably have extra genes that don't belong. Or I exported the wrong sheet." (She
blames her own list; nothing on screen says whose problem it is, and she did not ask.)

She moves to the bottom and tries Apply. "Apply is gray. Why is it gray?" She clicks it again.
"... Nothing." Around fifteen seconds later she reads the footer line: "'Choose the fold-change
column to apply.' Oh. There's a box up there, 'Choose a column'. It's blue-outlined, I thought
that was just, like, the highlight."

**4. Choosing the column.** "Two columns fit. log2FC, in the table, 84 matched values. And
log2FoldChange, in the network file, 300 values." She takes a while. "I'd pick the 300 one. More
values, more of it gets colored. The other one only has 84, that's like, partial."

Moderator: "Which one is yours?" "Mine is... the table is mine. 'In the table.' Oh. So the 300 is
theirs, the network's. Then why is it even offering me theirs? If I'd picked 300 I'd have had a
nice fully colored picture and none of it would be my list, right?" She picks log2FC.

(Shown r3-elena-colleague-chosen.png.) "85 of 96 matched, 1 by hand. 36 up, 49 down. 'Blue below
0, red above, as the recipe draws it.' OK, so red is bad, blue is good." (It is not: red is up,
blue is down, neither good nor bad. She did not check against anything; she stated it and moved
on.)

**5. The confidence thing.** "'For confidence, a higher number means a closer or stronger link --
similarity -- the recipe's answer.' ... I am not touching that. That's his setting. It says 'the
recipe's answer', so he decided it. Leave it."

**6. Apply.** "'Apply is one step. One Undo takes all of it back.' Good. That's the line I wanted
the whole time, actually. OK. Apply." (She presses it without hesitation.)

"So what do I send him? 'It worked, 85 of your genes are colored, 11 aren't in the network, two
got turned into dates by Excel.' Yeah. I could write that. I'd copy the 11 names with that copy
button and paste them into Slack."

## Answers to the moderator's questions

- What does this recipe bring, and what do you supply? "It brings his colors and some filter.
  I supply my gene list. And -- I thought I supplied the network too, but apparently it came with
  the file. Which it said it didn't."
- Before Apply, how many of your genes will be colored? First answer (preview): "All 300." Second,
  after adding the table: "84, then 85 after the MDM2 one."
- One gene that will not be colored, and whose problem? "GAPDH. It's not in their network. Mine,
  probably -- I have genes they don't." For 7-Sep: "Mine, Excel."
- Which column decides the colors? "log2FC, the one I picked. It says 'Chosen'." (First instinct
  was the network's 300-value column.)
- If you press Apply, what changes and how do you take it back? "Colors, a filter, the run thing.
  Undo, once."
- What does a higher confidence mean? "A stronger link. I read it off the box. I would not change
  it; I'd ask him."

## Single Ease Question

4 of 7. "The second half was fine -- it told me which ones didn't work and even fixed one. The
first half almost fooled me. It said everything matched when my list wasn't even in it yet."

## Would she use this instead of her current tool?

"For this? There isn't a current tool, I'd have sent the list back to him and said 'can you run
it'. If he sets it up and I just drop my list in, yes, I'd do it myself next time -- the 'these 11
didn't match' list is exactly what he'd ask me for anyway. But I'd want it to say up front that I
need a network, or that the file comes with one, because I spent the first minute thinking I was
missing a file. And that first screen with Apply lit up on someone else's numbers -- I'd have sent
him a wrong picture and never known."

## Where her engagement dropped

It did not drop. She stayed engaged through Apply, helped by the case-only match, which she liked,
and by the Undo line. Her attention was lowest at "What it reads from the data" in the first step,
where she skimmed the table and would have applied without a count prompt.
