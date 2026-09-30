# Share your setup with a partner, without your data -- Jordan, marketing network analyst

Participant: Jordan, a growth-marketing analyst who does "the network stuff" one or two days a
week (see study/personas/marketing-analyst.md). Moderator's task, word for word: "Share your
setup with a partner, without your data."

Screens used: screens/export-dialog.html (the project at rest, the project-name menu, the dialog
with Recipe checked), screens/data-panel.html, screens/binding-step.html (what the partner meets
when they open the file). Renders: shots/record/r4-jordan-swd-export.png,
shots/record/r4-jordan-swd-export-recipe.png, shots/record/r4-jordan-swd-data-panel.png,
shots/record/r4-jordan-swd-binding.png. The mock's project is a lab's protein study, not a mention
network; Jordan was asked to pretend it was her influencer map.

## Setting it up in my head

"OK so the real version of this for me: we've got an agency doing the creator outreach, and they
want to run the same thing I ran -- the bridge-finder, the cluster colours -- on their own
creator list. And I cannot send them our CRM export. Legal would kill me. So I want to hand them
the... settings? The recipe, basically. Not the data."

## Step 1 -- finding where to start

"Top right. That's where Share lives in everything. Google Docs, Figma, Canva... there's nothing
up there. Just a zoom percent. Hm."

"Left side: there's the project name with a little arrow, and under Data there's an Export...
button. Export is not share, though. When I hit Export I usually get a picture. Or the wrong
thing. 'I hit export and got a picture, I wanted the table' -- that's been my whole year."

"Let me try the project name menu first. Rename, Duplicate, Project info, Update with new data,
Version history, Export..., Close project. No Share. OK, fine, Export it is. At least it's the
same Export in both places, I think."

Moderator note: no hesitation between the two Export entries once she saw both; about 20 seconds
lost looking for a Share button in the top right.

## Step 2 -- the Export dialog

"Big dialog. Figures, Rows, Report, Graph data... and oh, here -- 'Share the setup, without
data.' OK. That's literally what you asked me. Somebody read my mind or read the task card."

"Recipe. 'Readable text (JSON) with styles, steps and layout. It never holds your data.' Recipe
is a weird word for it but fine, I get it, it's the instructions not the ingredients. JSON I'm
not opening. I don't care that it's readable. I care that it's not our customers."

"I tick it and... everything else greys out. And a bar across the top says figures, images,
tables, the report, graph data and the project file are off because they would carry my data.
That's good, actually. I don't have to think about whether the PNG counts. It doesn't let me
send it by accident. Fine."

"Scope is greyed out too, 'whole project', 'a recipe takes definitions, not a scope of data'.
I don't know what that means but it's greyed out so I'm not fighting it."

## Step 3 -- reading what goes and what doesn't

"'No data inside. No genes, interactions, fold-change values...' -- in my world that's 'no
handles, no emails, no follower counts.' OK. That's the sentence I'd screenshot for legal."

"Then three columns. Travels: three runs -- PageRank, Louvain, degree, with their settings.
Style layers, a filter, the layout with its seed, a view. That's the stuff. Good, it says the
seed, so their clusters shouldn't come out different from mine for no reason... well, they will,
it's their data. But the method's the same."

"'1 note, on the confidence filter' -- and it shows me the whole note. OK wait, notes travel?
That makes me nervous. My notes say things like 'Nike rep = @so-and-so, do NOT contact'. Here it
shows me the full text so I can read it before it goes, and the other notes -- '4 notes on
genes' -- are under Not included. So notes pinned to a person stay, notes on a step go. I think.
I'd want a checkbox per note, honestly, not a rule I have to reverse-engineer."

"You supply: gene symbols to join a table, a fold change, a confidence per interaction. So the
agency needs their own list with an ID column and a number column. I'd have to write them an
email explaining that, because this is telling ME what THEY supply. Where do I tell them?"

Moderator note: the dialog's preview has no line addressed to the recipient. The sender view
drawn on the binding-step page does have one ("What your recipient does: add a table with a gene
id and a fold change column, then Apply"), and it also marks where each input comes from. Jordan
only saw the export-dialog version during the task; when shown the binding-step sender view
afterwards she said "yes, that line, that's the email I'd have written. Why isn't it in the
first one?"

"Not included: 300 proteins, fold-change values, knockdown hits, positions, notes on genes.
Positions -- so their map won't look like mine. Fine, it's their data, it shouldn't."

## Step 4 -- naming and exporting

"There's a Name box, 'Expression overlay'. I'd call it 'Bridge creators Q3'. Footer: '1 file
goes to your Downloads folder. Nothing is uploaded.' Good. That's the laptop question answered
before I asked it. Export 1 file."

"And then I... email it. There's no link. No 'send to'. For a partner outside the company that's
honestly what I'd want -- I'm not giving an agency access to our workspace -- but I'd have liked
the choice."

"expression-overlay.graphty. Dot graphty. What's the agency going to do with a dot graphty file?
Do they need an account? Does it cost them anything? Does it need procurement on THEIR side? None
of that is on this screen, and that's the first thing their account manager asks me."

## Step 5 -- what the partner sees (shown by the moderator)

"OK so they open it, and it says Recipe, saved by whoever, Brings 2 styles, 1 filter, 3 runs.
You supply: a table with an ID and a fold change column. 'Your table: not added yet', big blue
Add your table. Apply is off and it says why. Fine. That's clear enough that the agency's junior
could do it."

"The match report -- 84 of 96 matched, and it names the 12 that didn't. That's nice. That's the
thing I check first with any tool, did my known account come through. If they get 'nothing
matched' it tells them why instead of a blank map. I like that more than I expected to."

"It says 'Sender's network' though. Their network, not mine. In my case the agency has their own
creator network; would it keep asking them to use mine? There's a Replace... so I guess not."

Off-topic drift: "The real problem is the agency's data comes out of a different listening tool
than ours, so their IDs won't be handles, they'll be some internal number. Brandwatch does that
to us too. So I'd bet money on the 'nothing matched' screen the first time."

## Single Ease Question

5 out of 7. "Once I was in Export it was easy -- the heading said exactly what I wanted and it
locked everything else so I couldn't mess up. I lost time looking for a Share button, and I
still have to write the partner an email explaining what a .graphty file is and what columns
to bring."

## Would you use this instead of your current tool?

"For this, yes -- because my current tool for this is a screenshot of Gephi's settings panel
and a Word doc of what I clicked, and the agency never gets the same clusters. A file that
carries the method and the seed and provably no customer data is better than that, and I could
show legal the 'No data inside' box. But I'm not switching my whole workflow for it. It depends
on the agency being able to open the file without a sales call, and nothing here tells me they
can."

## What she would say worked

- The heading "Share the setup, without data" in the dialog matched the task in her own words.
- Ticking Recipe switched off every row that would carry data and said why, so she could not
  send a picture or table by accident.
- "No data inside" at the top of the preview, and "Nothing is uploaded" in the footer, answered
  the leave-my-laptop question before she asked it.
- On the partner's side, the match report that names the rows that did not match.

## Problems observed

1. No Share entry point. She looked in the top right first (where every web tool puts Share)
   and in the project-name menu; she reached the recipe only through Export..., a word she
   associates with pictures and tables. Severity 2.
2. The export preview has no line addressed to the recipient. It lists what "You supply" (which
   she read as addressed to her) but not "what your recipient does", so she planned to write an
   email explaining the columns. The sender view drawn on the binding-step page has exactly this
   line; the two previews of the same recipe disagree. The export version also lists
   "a confidence per interaction" under You supply where the binding-step version says it comes
   from the network. Severity 3.
3. Notes: the rule for which notes travel (a note on a step goes in full, notes on nodes stay
   behind) had to be inferred. She wanted to choose per note, because her notes name people.
   Severity 2.
4. Nothing tells the sender what the recipient needs in order to open a .graphty file: whether
   graphty is free, needs an account, or needs installing. For an outside partner this is the
   first question. Severity 3.
5. "Readable text (JSON)" means nothing to her and slightly worried her ("JSON I'm not
   opening"). Severity 1.
6. The disabled Scope select's reason ("A recipe takes definitions, not a scope of data") did not
   land; she ignored it. Severity 1.
