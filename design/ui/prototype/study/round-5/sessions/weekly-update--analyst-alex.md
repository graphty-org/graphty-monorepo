# Session: update last month's transfers project, explain why the groups changed -- Analyst Alex

**Task as given:** "Last month's transfers project needs this month's file. Update it, and explain
why the number of groups changed."

**Participant:** Analyst Alex, operations data analyst, uses NetworkX for the numbers and Gephi for
the picture, redoes the Gephi half by hand every month.

**Pages worked through, in order:** the weekly-return storyboard, the weekly-return screen, the
Data panel, Version history, the Replace data and recipe screens and flow, the Comparison screen.
Renders used: `shots/r4-alex-wupd-*.png` (study view, design notes hidden).

**Outcome:** success, with difficulty. The update itself was easy. The explanation was half there:
the app says plainly that 26 of the extra groups are single accounts with no transfers, but it
does not say where 9 of March's groups went, and one screen gave a different group count for what
looked like the same files.

---

## Think-aloud

### 1. The start screen

"OK, recent projects. 'Case 0314, mule ring -- Transfers, 3,000 accounts, edited Apr 3.' That's the
one. 3,000 -- yes, that's what March was. Good that the count is right on the card, I don't have to
open it to know which one."

Opens it.

"Legend's still there, sizes by degree, colours by community, same as I left it. Seven communities
named and then 'Other, 28 communities, 1,851'. So 35 in March. I'm writing that down, because that's
the number my manager is going to ask about."

"The colours -- orange, light blue, green, dark blue, a red-orange, pink, yellow. I can tell those
apart. Nothing red-against-green. Fine."

"Statistics: 3,000 accounts, 9,113 transfers, 1 component. 'Last import: March data, the two March
CSVs, Apr 3.' That matches what I remember loading. Good."

### 2. Finding where to put the new file

"'Update it.' So where's update. I'm on the Graph side. There's no big 'Update' button. I'll try the
menu."

Main menu, File.

"Replace data... 'New files under this analysis; March kept as a version. 1 slow result will wait for
Re-run.' Add data... 'More rows on top of the data loaded now.' Hm. OK, replace is what I want --
April *instead of* March, not on top of it. And it says March is kept, which is the thing I'd
actually worry about. I don't want to lose last month."

"One slow result will wait. Which one? Doesn't say here. Probably the modularity thing. Fine."

Later, on the Data panel:

"Oh -- here it's called 'Update with new data...', right under the file. That's the word I was
looking for. So it's the same thing with two names? In the menu it's 'Replace data', in the panel
it's 'Update with new data'. The dialog it opens says 'Replace' on the button. I'd have found the
panel one faster because it's under the file, but only if I'd been on the Data tab, and I wasn't. I
went to the menu first like I would in Gephi."

Clicks so far: menu, File, Replace data. Three. "Acceptable. It's monthly, not daily."

### 3. The file picker

"accounts-2026-04 and transfers-2026-04, today 08:40, 3,093 rows and 8,370 rows. March's are
underneath, 3,000 and 9,113. It's already picked the two April ones. Nice, but I'd check."

"'The files are read on this computer; nothing is sent.' Right there under the files. That's the
line I look for. Good. That's where it should be."

"3,093 accounts -- SQL said 3,093 for April. 8,370 transfers, yes. Fewer transfers than March,
which I expected, April had the Easter weeks."

Open.

### 4. The load step

"'Replace data: April files.' Accounts matched on 5 of 5 columns, transfers 4 of 4. Every column has
the same name as March, so no binding step. Good, I didn't rename anything."

"Counts against March: accounts 3,093 vs 3,000. Found by id 2,961. New 132. Not in April 39. With no
transfers: 26. Transfers 8,370 vs 9,113. Same pair as March 7,576. Rows dropped 0 and 0."

"OK this table is the thing I'd normally do in pandas with a merge and an indicator column. 2,961 plus
132 is 3,093. 2,961 plus 39 is 3,000. Adds up. I like that it adds up."

"Issues: '26 accounts have no transfers in April. All 26 were in March; none is new. Each will be a
component of its own.' Hm. So 26 accounts that are in the accounts file but did nothing. That's
going to mess with anything that counts groups, isn't it. I'm noting that, I bet that's my answer
later."

"'What replays: Degree; Louvain with its 5 seeded re-runs -- seconds. Modularity vs randomized
baseline -- a few minutes: waits. 2 style layers, the layout, 1 set, 1 note -- carried over.' So it
tells me it's going to redo Louvain and it's *seeded*. OK. That's the thing that burned me before --
different groups every run. If it's seeded I can at least rerun and get the same answer."

Load.

### 5. After the replace

"'Data replaced: 2 of 3 results replayed. Show report.' Show report."

Version history opens with a replay report.

"Found by id 2,961 of 3,000, new 132, not in April 39 with a List link, no transfers 26 with a Select
link. 'Components: 1 to 27. One holds 3,067 accounts; the other 26 are the accounts with no
transfers.' Right. So the 26 do-nothing accounts each became their own island. 3,067 plus 26 is
3,093. Adds up again."

"Results: 'Louvain, with its 5 seeded re-runs: 65 communities, was 35. 39 have transfers; 26 are
single accounts with none.'"

"...OK, so this is my answer, mostly. 65 against 35. 26 of the 65 are just those dead accounts, each
one sitting in a 'community' by itself. So really it's 39 groups that actually have transfers,
against 35. That's plus four, not plus thirty. That's the sentence for my manager: 'The group count
jumped because 26 accounts had no transfers in April and each one counts as its own group. Leave
those out and it's 39 against 35.'"

"But then -- further down: 'Community color: 26 communities keep their March name and color by
overlap; 39 are new, 26 of them single accounts.' Wait. Now 39 is the *new* ones. Up there 39 was
the ones *with transfers*. And 39 is also the number of accounts not in April. Three different 39s
on one panel. I had to read it three times. Are those the same 39 or not?"

Works it through out loud:

"26 kept from March plus 39 new is 65. OK. 39 new, 26 of those are the singles, so 13 genuinely new
groups with transfers. And the 26 kept plus 13 new real ones is 39 with transfers. OK so both
statements are true, they just slice it differently. But nobody's going to get that from a glance.
And -- if only 26 of March's 35 carried over, what happened to the other 9? Did they merge into
something? Split? Die? That's the question my manager asks next and the panel doesn't say."

"The legend now: Community 1 359, 2 168, 3 127, *5* 126, *4* 111, 7 74, 6 58, Other 58 communities
2,070. So 5 is above 4 now. It kept March's names, which I get -- same colour, same group -- but it
sorts by size. Fine. I'd have assumed purple's purple anyway. At least here it's actually true,
it says 'by overlap'."

"Size legend says 0 to 842. Was 1 to 907. Zero because of the dead accounts. Makes sense. Version
history's legend says 1 to 842 though. Small thing. I'd notice if I pasted both."

"The left side still says 'Transfers, 3,000 accounts.' Right after I loaded 3,093. The statistics on
the right say 3,093. Which is it? It only switches to 3,093 in the Wednesday screens. If I'd seen
3,000 there on Monday I'd have thought the replace didn't take. That's the kind of thing that ends up
in a report wrong."

### 6. The slow result

"'Modularity vs randomized baseline' is running, bar at the bottom, 'a few minutes', Cancel. OK. It
told me before it would wait, it told me how long, and there's a cancel. That's fine. I'd go get
coffee. Came back: 'Modularity vs randomized baseline is current.'"

### 7. Version history -- the cleaner answer

On the Data panel, Versions.

"April data, current. 'What changed, against March data': '27 components (was 1), large change, 26
accounts have no transfers in this version, Select.' '65 communities (was 35), large change, 26 are
single accounts with no transfers in this version.'"

"*That's* the version I'd paste. One line, one reason. Better than the replay report. Why aren't
they worded the same?"

"Clicked March data to look back. 'Louvain communities on the same graph: weighted by amount (larger
is stronger), direction ignored, resolution 1, seed 11, over the full graph: 35 communities,
weighted modularity 0.688.' Seed 11. OK! That's the thing I want. I could run louvain_communities
with seed=11 and weight='amount' in NetworkX and check it. I would, the first time."

"But hang on. The Data panel's overview for March says 'direction followed, amount not used yet.'
And this says Louvain was weighted by amount. So was amount used or not? I think it means the
*graph* doesn't use amount, but Louvain does on its own? That reads like a contradiction. If a
director asks 'did you weight by amount' I want one answer."

"'Copy methods text.' Nice, that goes straight in the appendix slide."

"Also, the project on this page is called 'Payments network review', April is dated May 4, March Apr
2. On the other screen it was 'Case 0314, mule ring', April 'today 09:14', March Apr 3. I get that
these are different mockups. But if it were one app I'd be squinting at the dates."

### 8. Is the change real or just Louvain being random?

Comparison, from the Results panel.

"Agreement (AMI). March and April on the 2,961 in both: 0.45. Same without the 26 silent: 0.45. Five
re-runs on March: 0.76 to 0.77. Five re-runs on April: 0.81 to 0.85. '1 is the same partition, 0 is
chance. Louvain is random, so runs on the same data differ too.'"

"AMI -- I don't know that one by name. But the line underneath is enough: two runs on the same month
agree about 0.8, March against April agrees 0.45. So the groups really did move, it's not just the
algorithm rolling dice. That's actually a good answer to 'is this noise'. I've never been able to
say that before. I'd say it as 'the months agree less than two runs on the same month do.'"

"Grew tab: 26 communities matched by overlap; 10 grew. Community 1 297 to 359, Community 27 52 to
107, plus 106%. Tabs for Shrank and New in April. No tab for gone. So the 9 March groups that didn't
carry over -- where are they? I'd go looking in Shrank but a group that vanished didn't shrink, it's
gone."

"'New April communities: 39 communities, 799 accounts.' 799 accounts in new groups. Minus the 26
singles, that's 773 accounts in 13 new groups. That's a lot -- a quarter of the network moved into
new groups? That's a bigger story than '+4 groups'. The app gives me the pieces but I did the
subtraction in my head. I'd want that as a line."

"'holds in April's re-runs, 0 to 1' -- Community 33, 1.00; Community 25, 0.44. So 25 is shaky and 33
is solid. Useful. I'd only name the solid ones in the deck."

### 9. The other Replace screen

Looked at the Replace data and recipe screen, where the columns had been renamed in the April file.

"This one needs binding -- riskScore became risk_score, flagged is Y/N now. It asks me to match it
and says what uses it. OK, that's sensible, that's exactly what breaks in Gephi."

"But the replay report here: 'Louvain communities, Replayed; 12 communities, was 11.' And 'Weakly
connected components, Replayed; unchanged: 1 component' -- while the Statistics box two inches away
says '27, weakly'. Same April file, same 3,093 and 8,370. So which is it: 65 was 35, or 12 was 11?
And is it 1 component or 27? If the tool shows me two numbers for the same thing, I'm back in
NetworkX checking everything by hand, and then what did the tool save me?"

"I know -- probably a different project. But the counts on the load step are identical, so I can't
tell it's a different project, and that's the problem."

"And the left side here says 'Transfers, March, 3,000' after the replace too."

### 10. Wrapping up

"So, what I'd tell my manager:"

> "April has 65 groups against March's 35. Twenty-six of those are accounts that had no transfers in
> April and each count as a group of one, so it's really 39 against 35. Twenty-six of March's groups
> carried over; 13 are new and hold about 770 accounts. The groups genuinely shifted between months
> -- they agree less than two runs on the same month do -- so this isn't the algorithm being random."

"And then: 'what happened to the other 9 March groups' -- I can't answer that from what I saw."

---

## Single Ease Question

**5 out of 7.**

"The update was a 6 -- three clicks, it checked the counts against March for me, told me nothing
leaves my machine, and kept last month. The 'why' dragged it down. The one-liner in Version history
is great, but the replay report says 39 three different ways, I had to do the 26-and-13 arithmetic
myself, nothing tells me where 9 of March's groups went, and one screen said 12 was 11 for what
looked like the same file. And the sidebar said 3,000 after I loaded 3,093. Any one of those in
front of my manager is bad."

## Would I use this instead of what I do now?

"For the monthly rerun, probably yes -- on the sanitised extract first. The thing I hate is redoing
the Gephi half every month: colours, sizes, the legend. This kept all of that, kept the group
colours by overlap instead of reshuffling them, and gave me March against April side by side. Gephi
can't do any of that."

"I'd still run Louvain with seed 11 in NetworkX the first two or three months to check the 35 and the
65 match. If they match, I'd stop. If the app keeps showing me two different numbers for the same
thing, I'd stop using it for the explanation part and just use it for the picture."

---

## Problems observed

1. **The same count shown two ways on one screen.** Right after Replace data, the Graphs list still
   reads "Transfers, 3,000 accounts" while Statistics read 3,093 (weekly-return screen and
   storyboard; the Replace data screen shows "March, 3,000"). "I'd have thought the replace didn't
   take." Severity: high.
2. **Two different group counts for the same April files.** The weekly-return and Version history
   pages say "65 communities, was 35"; the Replace data screen, with the same 3,093 accounts and
   8,370 transfers, says "12 communities, was 11", and its replay report says components
   "unchanged: 1" beside a Statistics box reading "27, weakly". "Which is it?" Severity: high.
3. **Where March's missing groups went is not shown.** 35 March groups, 26 carried over; the
   comparison has Grew, Shrank and New in April but nothing for groups that merged or disappeared.
   It is the manager's next question. Severity: high.
4. **"39" means three different things in the replay report** (accounts not in April; groups with
   transfers; new groups). "I had to read it three times." Severity: medium.
5. **The real size of the change needs mental arithmetic.** 39 new groups holding 799 accounts,
   minus 26 single accounts, means 13 new groups holding about 770 accounts; no line says so.
   Severity: medium.
6. **The same command has two names.** The menu says "Replace data...", the Data panel says "Update
   with new data...". Alex looked for "update" and found it only on the Data tab. Severity: low.
7. **Contradiction about amount.** The March overview says "amount not used yet" while the Louvain
   methods sentence says "weighted by amount". "Did you weight by amount? I want one answer."
   Severity: medium.
8. **Replay report and Version history phrase the same finding differently.** The Version history
   line ("65 communities (was 35), 26 are single accounts with no transfers") is the one to paste;
   the replay report is harder. Severity: low.
9. **The degree range differs.** The canvas legend says 0 to 842, the Version history legend says
   1 to 842. Severity: low.

## What worked for Alex

- "The files are read on this computer; nothing is sent" sits in the file picker, where he looks.
- The load step's counts against March add up (2,961 + 132 = 3,093; 2,961 + 39 = 3,000) before
  anything changes; "that's my pandas merge, done for me".
- Add data warns that it would stack April on March, and offers Replace instead.
- Louvain's seed (11), weight and resolution appear in the methods text, with Copy; he can check
  them in NetworkX.
- The slow result says ahead of time that it will wait, gives an estimate, and has a Cancel.
- Group names and colours are kept by overlap, so "same colour, same group" is actually true here.
- The agreement numbers (0.45 between months, about 0.8 between re-runs of one month) answer "is
  this just Louvain being random" in a way he could say out loud.
