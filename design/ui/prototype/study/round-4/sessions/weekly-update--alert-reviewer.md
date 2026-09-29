# Session: monthly update and "why did the groups change" -- Nadia, level-1 alert reviewer

Participant: Nadia (study/personas/alert-reviewer.md), transaction monitoring analyst, fourteen
months in, no graph tool of her own. Seen at her usual viewport, about 1536 by 740 (a 1080p
monitor at 125 percent scaling), in the participant view with design notes hidden.

Task as given by the moderator: "Last month's transfers project needs this month's file. Update
it, and explain why the number of groups changed."

Pages used: storyboards/weekly-return, screens/weekly-return (every state), screens/data-panel
(steps 1, 4, 6), screens/version-history (steps 1, 2), screens/replace-and-recipe,
flows/replace-and-recipe, screens/comparison.
Renders: shots/r4-nadia-wupd-*.png (the -wr-NN- files are the weekly-return states in order).

---

## Think-aloud

**1. The start screen** (r4-nadia-wupd-screens_weekly-return.png)

"OK, Recent projects. 'Case 0314, mule ring', 'Transfers, 3,000 accounts, edited Apr 3'. That's
last month's. That's Sarah's case, actually, but fine, that's the one with transfers in it. I
click the picture."

No hesitation. The card says "Transfers" and a date, which is all she needed.

**2. The project reopens** (r4-nadia-wupd-wr-01-reopened.png)

"Big ball of dots. '14 selected'. I didn't select fourteen anything. Is that a filter? Did someone
leave a filter on?" She reads the chip top left: "'Full graph'. OK so it's not filtered, it's
just... fourteen things are picked. Whatever."

"Where's the file? I want to see what file this is built on. 'Data' on the left, that sounds like
the file." She clicks Data in the rail. Nothing happens in this mock. She clicks the Transfers row
instead and the right side changes (r4-nadia-wupd-wr-02-reopened-rest.png).

"There: 'Last import: March data: accounts-2026-03.csv, transfers-2026-03.csv. Apr 3.' Good. 3,000
accounts, 9,113 transfers. I'm writing those down, because I'm going to be asked what it was
before." She copies 3,000 and 9,113 onto a sticky note, out loud: "QA always wants before and
after."

"Components, '1, weakly'. I don't know what that means. Skip."

**3. Looking for "update"** (r4-nadia-wupd-wr-03-menu.png)

"No update button. So it's in the menu. The three lines." She opens the menu, File.

"New project, Open, Recent... 'Replace data. New files under this analysis; March kept as a
version. 1 slow result will wait for Re-run.' 'Add data. More rows on top of the data loaded
now.'"

Long pause. "Replace sounds scary. I don't want to lose March, the case file references March. But
it says 'March kept as a version'. Add data sounds safer. But I don't want March AND April mashed
together, that's two months of transfers and every total is wrong." She reads both again.
"Replace. Because it says March is kept. If it wasn't kept, I'd use Add and then I'd be wrong."

She notes: "'1 slow result will wait for Re-run.' I don't know what a slow result is. I'm not
running anything slow. I'm ignoring that."

What if she had clicked Add data? She did not, but the moderator shows her the other door
(r4-nadia-wupd-wr-05-adddata.png) afterwards: "Oh, it tells me. 'Same columns as the data already
loaded... To see April alone, replace March with it', and a Replace data instead button. OK. That
would have saved me. That's good, that's the kind of thing that stops me having to redo an alert."

**4. The file picker** (r4-nadia-wupd-wr-04-picker.png)

"Four files. 04 is April. Two are already picked, 'today 08:40'. Accounts and transfers. 3,093 rows
and 8,370 rows. Open." Fast. "'The files are read on this computer; nothing is sent.' Good,
because I'd get in trouble uploading statements to some website."

**5. The load step** (r4-nadia-wupd-wr-06-load.png)

"OK this is a lot." She reads the right-hand table first because it has numbers. "April 3,093,
March 3,000. Found by id 2,961. New 132. Not in April 39. With no transfers, 26. Transfers 8,370
against 9,113. Rows dropped 0, 0."

"So: 132 new accounts, 39 gone, nothing dropped. That's actually what I'd want to write. Can I
copy this table? ...There's nothing that says copy." She tries to picture selecting it with the
mouse. "I'd screenshot it. That's fine, the alert file takes screenshots."

"'26 accounts have no transfers in April. All 26 were in March; none is new. Each will be a
component of its own.' 'Show rows.' A component of its own. I don't know what a component is. I
know what 'no transfers' means: dormant. 26 dormant accounts. That I can write."

"'What replays: Degree; Louvain with its 5 seeded re-runs, seconds.' Louvain. Who is Louvain.
'Modularity vs randomized baseline, a few minutes: waits'. I have no idea. '2 style layers, the
layout, 1 set, 1 note, carried over'. OK, the stuff Sarah did is kept. Load."

Time so far, by her own estimate: "four, five minutes. Mostly reading."

**6. After the load: the replay report** (r4-nadia-wupd-wr-07-replay.png)

"It opened 'Version history' on the right. 'April data, today 09:14', 'March data, Apr 3'. OK,
so March is really still there. Good."

"'Replay report'. Accounts, same numbers as before. 'Components: 1 to 27. One holds 3,067
accounts; the other 26 are the accounts with no transfers.' OK. So components went 1 to 27
because of the dormant ones. That's a number that changed. Is that 'the number of groups'?"

She keeps reading. "'Results. 2 replayed. Louvain, with its 5 seeded re-runs: 65 communities, was
35. 39 have transfers; 26 are single accounts with none.'"

"Communities. Those are the colours. Groups is the colours. The legend at the bottom says
'Community color'. So the task is the communities: 35 went to 65."

She looks back at the left panel. "Wait. It still says 'Transfers, 3,000 accounts'. The report says
3,093. Which one is it? Did it load or not?" She looks at the Statistics block (after scrolling,
r4-nadia-wupd-wr-08-rerun.png): "3,093 and 8,370 there. So the left side is just wrong. Or it's
old. That's the sort of thing QA catches: two numbers on one screen for the same thing."

**7. Writing the explanation, first attempt**

She drafts aloud, as she would in an alert file:

> "Updated case 0314 from March files to April files (accounts-2026-04.csv,
> transfers-2026-04.csv). 3,000 to 3,093 accounts (132 new, 39 no longer present), 9,113 to 8,370
> transfers, 0 rows dropped. Communities went from 35 to 65. 26 of the 65 are single accounts that
> had no transfers in April, so each one is its own community. The other 39..."

She stops. "The other 39 have transfers. And March had 35. So there are 4 more real groups. Why
4 more? It doesn't say. And... 39 again. 39 accounts not in April. 39 communities with transfers.
Is that the same 39? That can't be the same 39, one is accounts and one is communities. That's a
coincidence and it's going to confuse whoever reads my note."

**8. The Results panel and the comparison** (r4-nadia-wupd-wr-09-compare-pick.png, -wr-10-compare.png)

"Louvain communities, 65 communities, and there's a little arrows icon. Compare, I guess." It
opens a two-picture screen.

"'Agreement (AMI) 0.45.' I have no idea what AMI is. '1 is the same partition, 0 is chance.' So
0.45 is... half the same? Is that bad? 'Louvain is random, so runs on the same data differ too.'
Random? The grouping is random? If the grouping is random I'm not writing it in a file." She sits
back. "If it's random then 35 to 65 might mean nothing. That's what I'd tell QA? 'The computer
rolled dice'?" She reads the next two lines: "'5 re-runs on March 0.76 to 0.77, 5 re-runs on April
0.81 to 0.85.' So running it again on the same month agrees more than March-against-April does. OK.
I think that means the change is real and not just dice. I'm not confident. I'd ask Sarah."

"'Not matched. Accounts only in March 39. Accounts only in April 132. New April communities: 39
communities, 799 accounts.'" Long pause. "Now there are three 39s. And the table says '26
communities matched by overlap'. 26 again. So in the report, 65 is 39 real plus 26 single. And
here 65 is 26 matched plus 39 new. Those are backwards. Both add to 65. They can't both be the
same split. One of them means something different and I can't tell which from this screen."

"And 35 in March, only 26 matched. What happened to the other 9 March groups? 'Shrank' tab maybe."
She does not click it. "I've spent more than ten minutes. This is where I'd escalate."

**9. The Data panel and Version history, as a second route** (r4-nadia-wupd-dp-s4.png,
r4-nadia-wupd-dp-s6.png, r4-nadia-wupd-vh-s1.png, r4-nadia-wupd-vh-s2.png)

The moderator shows the Data panel design, where Data in the rail opens the files and versions.

"Oh, this is where I clicked first. Sources, the file. 'Update with new data...' button right under
the file. That's what I was looking for at step two. Why is it 'Replace data' in the menu and
'Update with new data' here? It's the same thing? It looks like the same thing." The dialog it
opens (dp-s4): "'New files, in place of March's.' 'All 7 columns match March's, so everything built
on them carries over.' 'Replaces accounts and transfers. Keeps styles, sets, notes and runs; the
runs replay on April's data. March stays in Versions.' Then Replace. That's clearer than the menu.
Shorter. I'd have done this one in a minute."

Version history, April open (vh-s1): "'What changed, against March data.' '27 components (was 1),
large change. 26 accounts have no transfers in this version. Select.' '65 communities (was 35),
large change. 26 are single accounts with no transfers in this version.'"

"This. This is the paragraph I want. It's a list, it has before and after in brackets, it says
'large change' with a warning so I know it matters, and it gives the reason in one line. I'd
screenshot exactly this box and put it in the file." Then: "Still doesn't tell me the other four.
35 to 39. But QA would accept 'mostly the 26 dormant accounts, each counted as its own group'. I
think."

"Is there a copy button on it? ...No. Screenshot then."

Past version, March (vh-s2): "'Louvain communities, weighted by amount, resolution 1, seed 11... 35
communities, weighted modularity 0.688.' That's the methods text. That's for Sarah."

**10. The flow page** (r4-nadia-wupd-flows_replace-and-recipe.png)

She glances at it. "Same What changed list, and a Results box: 'Louvain communities 65, large
change. Was 35 on March data. 26 are single accounts with no transfers.' Same sentence again.
Good, at least it says the same thing everywhere." The flowchart below: "No. That's for the
people building it."

**11. The ranking comparison** (r4-nadia-wupd-screens_comparison.png)

"PageRank against betweenness. Nothing to do with my question. Skipping."

---

## What she would hand in

> "Case 0314 updated from March to April statement files (accounts-2026-04.csv,
> transfers-2026-04.csv); March is kept as an earlier version in the project. Accounts 3,000 ->
> 3,093 (132 new, 39 not in April). Transfers 9,113 -> 8,370. No rows dropped. Communities 35 ->
> 65: 26 accounts that were active in March had no transfers in April, and each is counted as a
> community of one. The remaining communities rose from 35 to 39. Reason for the extra 4 not
> determined; referred to level 2."
> Attachment: screenshot of Version history, "What changed".

"Half of it I can defend. The other half I'm handing to Sarah."

## Single Ease Question

**4 out of 7.** "The update itself was a 6. Replace data, pick the two April files, Load, done, and
it told me March was kept. The 'why' was a 2. The one-line reason is right there in What changed,
but then the comparison screen gave me a different split of the same 65, with the same two numbers
the other way round, and a word, 'random', that I cannot write in an alert file."

## Would she use this instead of her current tool?

"No. For clearing alerts I don't need any of this, I need the one transfer and the customer
profile, and that's the case system. If Sarah asked me to do the monthly refresh on her case, yes,
I'd do it in this, because the before-and-after numbers come for free and I'd otherwise be
building them in Excel with VLOOKUPs. But I'm not the one who picks tools, and on day twenty-nine
I'm not opening it."

---

## Observations (moderator, plain)

1. **Update was found and done with little effort.** She went Data rail first (inert in the
   weekly-return mock), then the main menu, and chose Replace data over Add data correctly
   because the menu line says "March kept as a version". The Add data dialog's "Replace data
   instead" would have caught the wrong choice.
2. **Two names for one action.** The main menu says "Replace data..."; the Data panel's button
   is "Update with new data..." and its dialog's primary button is "Replace". She asked whether
   they are the same thing. Where she looked first (Data), the name was different from the one
   she had just used.
3. **Stale count in the left panel.** After Replace, the Graphs row still reads "Transfers, 3,000
   accounts" in the replay, re-run and compare states while the right panel says 3,093. She read
   it as "did it load or not" and as something QA would flag. It only reads 3,093 in the last state.
4. **"Groups" resolved to communities by the legend**, not by any label saying so. Components
   (1 -> 27) also changed, and she briefly wondered whether that was the "groups".
5. **The two splits of 65 contradict each other on screen.** Replay report and What changed: 39
   communities with transfers + 26 single accounts. Comparison: 26 communities matched by overlap
   + 39 new April communities (799 accounts). Same two numbers, opposite meanings, and a third
   unrelated 39 (accounts not in April). She could not reconcile them and escalated.
6. **The remaining +4 (35 -> 39) is never explained.** Every surface explains the 26 singletons and
   stops. Her written explanation had to say "not determined".
7. **"Louvain is random" undermined trust** for an audit-minded reader until she worked out the
   re-run agreement line; she was still unsure. AMI, "partition" and "component" were unknown words.
8. **Export test: What changed passes as a screenshot, not as text.** She wanted to paste the
   before/after list into the alert file and found no copy for it or for the load step's counts
   table.
9. **The Version history "What changed" list was the high point**: before and after in brackets,
   a "large change" flag, and one reason line. She named it as the thing she would attach.
