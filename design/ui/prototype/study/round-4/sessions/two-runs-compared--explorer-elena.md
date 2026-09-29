# Two rankings compared -- Explorer Elena

**Participant:** Elena, a product manager with no graph training. She uses Sheets, Slides and her
company's analytics dashboard; she has never said "centrality" out loud. Trackpad, laptop screen.

**Task as given by the moderator:** "Yesterday you ranked the Les Miserables characters one way. A
colleague asks you to rank them again with one thing changed, and to tell her what differs between
the two rankings and how each was made."

The moderator gave nothing more. When Elena asked "changed how?", the moderator said "whatever you
think she means".

**Screens seen:** the Les Miserables project at rest and with Valjean selected (navigation page
frames), the bottom table on the same project (small graph, and after three filter steps), the
Results panel states (all on the protein and patent data), the result inspector (protein data), the
run-and-read flow page, and the comparison page (payments data).

Renders the participant looked at:
- `../../../shots/screens__navigation.png`, `../../../shots/screens__navigation-frame-new-node.png`,
  `../../../shots/screens__navigation-frame-today-results.png`
- `../../../tmp/two-runs-elena/nav-new.png`, `../../../tmp/two-runs-elena/nav-menu.png`
  (navigation page, "New: at rest" and "New: project menu" frames)
- `../../../shots/screens__table-dock--study.png` (small graph state and the "Not current" state;
  crops in `../../../tmp/two-runs-elena/td1.png`, `td-stale.png`)
- `../../../shots/screens__results-panel.png`, `screens__results-panel--finished.png`,
  `screens__results-panel--variant.png`, `screens__results-panel--running-result.png`,
  `screens__results-panel--queued.png`
- `../../../shots/screens__inspector-result.png`
- `../../../shots/screens__run-and-read.png`
- `../../../shots/screens__comparison.png`, `screens__comparison-versions.png`, and the full page
  in study view (`../../../tmp/two-runs-elena/comparison-full.png`)

## Think-aloud

**Finding yesterday's ranking.** *Opens the Les Miserables project at rest.* "OK, this is mine.
Les Miserables. Seventy-seven... characters, it says nodes. Fine."

"Yesterday I ranked them. So where's yesterday. Right side says 'Results', and under it...
'Bridges, done'. I don't remember doing bridges. I ranked them. Was that bridges?"

*Looks at the table under the picture.* "Table's sorted by degree. Valjean 36, Gavroche 22, Marius
19. Is this my ranking? I think I had a different one... I thought Myriel was high. The priest.
He's not even in the first six here."

*Clicks Valjean in the picture (the "Valjean selected" frame).* "Oh, now there's a betweenness
column. And now Myriel is second. That's the one I did, betweenness. OK, I remember the word now."

"But why did the column only show up when I clicked Valjean? A second ago it was just degree. And
the Results list still only says Bridges. Did I save it or not?" *Pause.* "I probably didn't
save it properly yesterday. Or I'm on the wrong view."

*Finds the other Les Miserables table state, with the grey header over the column.* "OK, this one
is nicer. The header says 'Betweenness exact, unweighted, full graph'. So that's how I made it.
I'd copy that sentence straight into Slack, honestly. I don't know what 'exact' means but it
sounds good."

"And there's a line above the table: 'Valjean is #1 on both measures. At #2 they part: Gavroche
by degree, Myriel by betweenness. Compare rankings...' Oh. Compare rankings. That's the task,
isn't it? Two rankings, what differs."

**The wrong turn: Compare rankings.** *Reads what Compare rankings does, then the comparison page
it leads to.* "Hm. So it opens a... scatter thing. Rank against rank. But that's degree against
betweenness. That's two different measures that were both already there. She asked me to rank
them again with one thing changed. Not to compare two things I already have."

"Or is that the same? Degree is a ranking, betweenness is a ranking, one thing is different... no.
I think she means do the same ranking again but change something. Like re-run the report with a
different filter."

**Deciding what the "one thing" is.** "Changed how, though. What would she change." *Asks the
moderator; gets "whatever you think she means".* "Great."

"The header said 'unweighted'. So there's a weighted. I guess weighted means some of the lines
count more? In the book some people are in lots of scenes together. Maybe that's it -- count how
often they're together, not just yes or no. That's the kind of thing she'd ask."

"Or 'full graph' -- I could leave out the little characters. There's that other table where it's
filtered to 27 of 77. Either one. Let me try the weighted one first, the word's right there."

**Trying to change the weight.** *Opens the Results panel page.* "This isn't my data. Human protein
interactions? OK, I guess it's the same screen for everyone. MAPK1, TP53... fine."

"'Weight: confidence, not used yet. Change...' OK, so there's a Change. That's what I want."
*Clicks Change... on the finished betweenness state.* "Nothing happens. Is it a link? It's
blue." *Clicks again.* "Nope."

"On mine it wouldn't say confidence anyway. What would it say? I don't know what my lines are
called. They're just... lines between characters."

*Looks around the panel.* "Options. Scope, full graph. Weight, 'None for this run'. That's a
different sentence from the one at the top -- top says 'not used yet', this says 'none for this
run'. Same thing I guess."

"How do I change the options, though? They're just words." *Scrolls, reads, does not see the small
icon to the right of the Options heading. Looks at the next state instead.* "Oh, here, in this one
there's a little box open: 'PageRank options'. Scope, direction, weight, damping, and a Run button.
How did they get that open?" *Moderator does not answer. She goes back and finds the icon beside
"Options".* "Oh. That little sliders thing. OK. It was right there."

"And in that box the weight is a dropdown. 'No numeric edge column.' So... my file has to have a
number on each line for weight to work? Does Les Mis have that? I have no idea. I didn't make this
file." *Looks for the Les Mis lines anywhere.* "There's an Edges tab under my table but I never
see it open on my project. I'd guess yes, it has numbers, because otherwise why would it say
'unweighted' like it's a choice."

**Would it overwrite yesterday?** "OK, suppose I change the weight and press Run. Does it replace
yesterday's? Because then I can't compare, I'd just have the new one." *Reads the running state.*
"'Runs 2. Run 2 running, 62%. Run 1, damping 0.85, shown.' Oh good -- it keeps run 1. So there'd be
two runs of my betweenness. That's what I need."

"But only one is 'shown'. So I see one at a time? How do I see them next to each other?"

*Tries the filtered table state instead, the other kind of change.* "Here it says 'Out of date'
and 'Re-run'. That scares me more. If I press Re-run, does yesterday's go away? It doesn't say.
I'd probably press it anyway and then panic."

**Comparing the two runs.** "There's 'Compare with...' under Runs. Let me see what that does."
*Opens the comparison page.* "Payments network. Accounts. OK, still not mine."

"Scatter, 'Agreement', '0 of the top 50 in both'... Spearman 0.40, 'leaving out the 1,153 accounts
tied at the bottom'. I don't know what Spearman is. There's an 'About Spearman' box: 1 is the
same order, 0 unrelated. OK, so it's a score for how similar the two lists are. I'd just tell her
'mostly the same' or 'pretty different'. I wouldn't put 0.76 in Slack, she'd ask what it means and
I couldn't tell her."

*Scrolls to the second section.* "This one is the same measure twice, March and April. 'Moved',
'March only', 'April only'. 'ACC-488401 moved 1,487 places.' Oh, I like that. 'Moved' is exactly
what she wants to know. Who went up, who went down."

"So for mine it would be... betweenness unweighted against betweenness weighted, and a list of who
moved. Probably Valjean stays on top. He's the biggest dot, he's in the middle, he's the main
character. Myriel would drop, I bet, he's only in the beginning." *(The size of the dots is
degree, not betweenness; she did not check the legend. Her guess about Myriel has no basis on
screen.)*

*Finds the "Compare PageRank with" picker.* "'Find a result or run.' PageRank on March data,
Betweenness -- not run, Degree. So it lists other runs. On mine I'd hope it says 'Betweenness run
1' or something. I don't know what it would call it. 'Betweenness, unweighted'? I'm guessing."

**How each was made.** "She also wants how each was made. There's 'Details' next to each side."
*Opens the run record.* "Method, seed 'does not apply', damping, normalization, weight
conversion 'None: unweighted', scope. And a Copy button. OK, that I can paste to her. Half of it I
couldn't explain but at least it's the real thing, not me paraphrasing."

"The one line I actually understand is still the table header: 'Betweenness exact, unweighted,
full graph'. If the second column said 'Betweenness exact, weighted by scenes, full graph', that's
my whole answer to 'how was each made'."

**Where engagement dropped.** After the comparison page she stopped opening new screens. Asked what
she would send her colleague, her answers got short: "I'd send her a screenshot of the table I
guess." "Yeah." "Not sure what the second list would look like."

## What she would send her colleague

> "Yesterday's ranking was betweenness, 'exact, unweighted, full graph' -- Valjean first, then
> Myriel and Gavroche. I think I can re-run it counting how many scenes they share (the 'weight'),
> and it keeps both runs. There's a compare view that shows who moved up or down. I haven't
> actually got the second list yet -- I couldn't tell if our file has the numbers it needs. Can you
> check with whoever made the file?"

## Single Ease Question

**3 out of 7.** "Finding what I did yesterday was OK once I found that table header -- that's
really clear. But I never saw my own characters ranked the second way. Every screen where you
change something or compare is someone else's data, proteins and bank accounts, so I'm guessing
it works the same on mine. The Change link didn't do anything, the options were behind a tiny
icon, and I still don't know if my file can even be weighted. I'd tell her I'm 'working on it'."

## Would she use this instead of her current tool?

"My current tool for this is... asking the data team. Or a pivot table. For 'what did I do and how
was it made', yes, this beats anything I have -- that header sentence and the copyable record are
great. For actually doing a second ranking and saying what changed, not yet: I'd need to see it on
my own data first, and I'd need it to tell me before I click Run whether my file can do the thing I
picked. If the 'Moved' list works on Les Mis like it does on those accounts, I'd use it, because
'who went up and who went down' is exactly what people ask me."

## Problems observed

1. **Yesterday's result is hard to find on the project.** In the Les Miserables project at rest,
   the right panel's Results list shows only "Bridges, done"; the betweenness column appears in the
   table only in the frame where Valjean is selected. She could not tell whether yesterday's run was
   saved and blamed herself. (Navigation page, "New: at rest" against "New: Valjean selected".)
2. **"Compare rankings..." pulls her the wrong way.** The agreement line above the table offers
   Compare rankings for degree against betweenness, which she first took to be the task. The task
   needed the same measure twice with one thing changed; she only backed out by reasoning about the
   colleague's words. (Table dock, small graph state.)
3. **The weight's "Change..." link does nothing,** and it is the first control she tried for the
   change she chose. (Results panel, finished state.)
4. **The options editor hides behind a small icon.** She read Options as plain text and found the
   sliders icon beside the heading only after seeing the options box open in another state.
   (Results panel, finished and running-with-result states.)
5. **She cannot tell whether her data can be weighted.** "No numeric edge column" tells her the
   file needs something, but nothing on the Les Miserables screens shows the edges' columns or
   says whether a weight is available, so she could not pick the change with confidence.
6. **Two wordings for the same weight state** -- "not used yet" at the top and "None for this run"
   under Options -- in the same panel; she read them as probably the same, unsure.
7. **"Re-run" on an out-of-date result does not say whether it keeps the earlier run.** The Runs
   list ("Run 2 ... Run 1 shown") reassured her on the Results panel, but the table's
   "Out of date / Re-run" did not, and it was the one she was likelier to press.
8. **No screen shows two runs of the same measure on her data.** The run-against-run comparison
   ("Moved", "March only", "April only") is drawn on payment accounts across two data versions;
   the picker text implies "its own earlier run" is offered but she never saw what that entry is
   called, so her answer to the colleague stayed a guess.
9. **Every changing and comparing screen uses other datasets** (proteins, patents, payments). As a
   first-timer she read each switch as "not mine" and lost confidence that the steps carried over.
10. **Spearman is a number she would not repeat.** The About box made it readable ("1 is the same
    order") but she said she would not put 0.76 in a message she could not explain.
11. **Misreading, uncorrected:** she took Valjean's large dot as confirming he tops betweenness and
    predicted Myriel would drop; dot size shows degree, and nothing on screen checked her guess.

What worked for her: the table's group header "Betweenness exact, unweighted, full graph" as the
plain answer to "how was it made"; the Runs list showing that run 1 is kept while run 2 runs; the
"Moved" tab and "moved 1,487" column as the plain answer to "what differs"; the copyable run record.
