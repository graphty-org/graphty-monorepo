# Session: redo last week's export on this week's data -- Analyst Alex

**Task, as the moderator gave it:** "Redo last week's export on this week's data, and show what
changed."

**Participant:** Analyst Alex, an operations data analyst who computes in Python and draws in Gephi,
and redoes the Gephi half by hand every time the data refreshes. He did this same task three rounds
ago and rated it 4 of 7; his complaints then were that nothing told him his runs had been replayed,
that the load step said the weight was "unknown", that he could not see which watched accounts had
gone, and that he had nothing to hand his manager except a CSV to rebuild in Excel.

**Screens seen, in the participant view (design notes hidden), in the order he met them:**

- `shots/r6-alex-twe-data-panel.png` -- Data panel, March current, before anything
- `shots/r6-alex-twe-data-panel-s8.png` -- after clicking the file chip: the source row's menu
- `shots/r6-alex-twe-data-panel-s4.png` -- Update with new data, April's two files
- `shots/r6-alex-twe-load-step-add-data.png` -- the load step for the same file, the Add data path
- `shots/r6-alex-twe-data-panel-s6.png` -- April current, styled
- `shots/r6-alex-twe-version-history.png` -- Versions, April's What changed open
- `shots/r6-alex-twe-data-panel-s7.png` -- Sent and saved from this project, with the saved files
- `shots/r6-alex-twe-comparison-versions.png` -- comparison, PageRank March against April
- `shots/r6-alex-twe-export-dialog-table.png`, `shots/r6-alex-twe-export-dialog-ways-in-menu.png` --
  the Export dialog and the project menu

**Outcome:** finished, with some difficulty. He got April in without doubling it, found last week's
two exports and the button to write them again, and found a both-months table he could put in
Excel. He did not find a way to show which accounts changed community, and he was not sure the
"export again" button would use April and not March. Ease 5 of 7.

---

## Think-aloud

### 1. Where am I, and where's last week

> Payments network review. Chip at the top says transfers-2026-03.csv. Right, that's last week's
> file -- the moderator calls it a week, it's a month, whatever, ours is weekly, I'll pretend.
> 3,000 accounts, 9,113 transfers on the right. That's the old one.
>
> Hang on, the picture is grey. No colours, no sizes, "Applied recipes: None yet". Last week I had
> communities coloured. Is this the project before I did anything? I'll assume the mock is just
> early. If my real project reopened grey I'd be out of here -- that's the Gephi thing again.

### 2. Getting this week's file in

> I want to swap the file. The chip is the file, so I click the chip.
>
> OK, it opened the file's row and a menu, and "Update with new data..." is the top one and it's
> already highlighted. That's exactly what I was going to look for. Click.

(2 clicks.)

> "Update with new data." "New files, in place of March's." transfers-2026-04.csv, 8,370
> transfers, March had 9,113. accounts-2026-04.csv, 3,093, March had 3,000. SQL said 8,370 rows,
> so the transfers match. Good, that's the first thing I check.
>
> "All 7 columns match March's, so everything built on them carries over." Fine.
> Found by id 2,961 of 3,000, new in April 132, not in April 39. Same as last time.
>
> "What stays: Replaces accounts and transfers. Keeps styles, sets, notes and runs; the runs replay
> on April's data." Right -- THAT is the sentence I wanted last time. Before I click, it tells me my
> stuff reruns. And Replace is the blue button now, not Add. Replace.

(3 clicks.)

> (Moderator shows the load step for the same file.) Oh, this is if I'd dragged the file on
> instead. "Add data from transfers-2026-04.csv". The yellow box still says add would make 17,483
> transfers and "replace March with it" instead -- but the blue button is STILL Add data. So if I
> come in by dragging, I can still double count in one click. Two ways in, two different default
> buttons. Pick one.
>
> And the title bar here says "Card and transfer transactions, March 2026" but the project is
> "Payments network review". Is that the same project? I assume so.
>
> Weight: "amount, used as similarity". Last time it said "unknown". OK, fixed. Although the
> Role column for amount still says "none". So which is it -- none, or the weight? I'll trust the
> line at the bottom because it's a sentence, but that's the kind of thing I'd screenshot and ask
> about.

### 3. Did it rerun my stuff

> After the replace. Chip says transfers-2026-04.csv now. 3,093 accounts, 8,370 transfers.
> Colours are back: Community 1 through 7, "Names and colors kept from March data by overlap; 39
> new communities numbered 36 to 74." Community 1 still orange. Good.
>
> Community 5 is above 4 again. It's by size, 126 versus 111. I remember this from last time. I
> still read it as a ranking for a second.
>
> "Other, 58 communities, 2,070." Two thirds grey. Same as last time.
>
> No message on the canvas saying "reran your stuff", but the dialog told me it would, so I'm
> less nervous than last time. The right side says "Style stack" and it's empty -- I don't know
> what a style stack is, and my graph clearly has styles, so empty looks wrong. Ignoring it.

### 4. What changed

> Versions, April data, current, open. "What changed, against March data."
>
> "27 components (was 1)" with a large change flag. "26 accounts have no transfers in this
> version." Oh. So 26 accounts are in the account file but did nothing in April. That's not the
> network falling apart, that's dormant accounts. OK.
>
> "65 communities (was 35), large change. 26 are single accounts with no transfers in this
> version." So the same 26 each count as a community of one. So really it's 39 real new ones, not
> 30 plus Louvain noise. That's the question my manager asked last time and I couldn't answer.
> Now I can say it out loud: "26 of the new groups are just dormant accounts on their own."
>
> "Watchlist: 7 of 9. ACC-705989 and ACC-243731 not in April." It names them. Last time it didn't
> and I'd have missed it. Good.
>
> "8,370 transfers (was 9,113). 7,576 in both, 794 new, 1,537 not in April." Hm, "in both" for a
> transfer -- same pair of accounts, I guess. Fine.
>
> This bit is what I'd paste into the email. Is there a copy button for it? I see "Show replay
> report" and "Compare with...". No copy. I'd retype it or screenshot the panel.

### 5. Redo last week's export

> Now the actual export. Last week I exported... I'm looking for "last export" or "export again".
> The Export... button up top would make me set it all up again, and I don't remember exactly what
> I ticked.
>
> Scrolling Data down. "Sent and saved from this project." "Saved to this computer."
> april-communities.svg, "Figure and methods text, May 4". accounts-by-pagerank.csv, "Table of
> accounts and methods text, May 4". Those are my two. Well -- wait, they say "april" and May 4.
> Did I already do this week's? Or is this last week's that the mock named April? Confusing. I'd
> assume these are the ones I want to redo.
>
> There's a little circular-arrows icon at the end of each row. Hover: "Export again with these
> settings..." Yes, that's the button. That's the thing I wanted. But it's a tiny icon with no word
> on it -- I only found it by hovering. And "these settings" -- does that mean the settings on
> THIS week's data, or does it write the same file again? If it writes March's numbers into a file
> I send out as this week's, that's the report that goes out wrong. I'd click it and then open the
> CSV and check the row count before I sent anything. Also it'll be called accounts-by-pagerank.csv
> again -- does it overwrite last week's? I'd want the date in the name.
>
> (Moderator shows the Export dialog.) This one is "Mule ring suspects, 14 of 3,000, filtered",
> March data. That's not my project, that's somebody else's case. The layout's fine -- Table (.csv),
> Nodes tab, rows, order, "methods always written beside it", "2 files go to your Downloads folder.
> Nothing is uploaded." I like that last line. But I can't tell from this what the redo would look
> like on my April data. And the methods file says "Weight: amount, not used yet" while mine
> would say used as similarity -- well, it's a different project.
>
> The project menu has "Export..." with Ctrl+Shift+E and "Update with new data..." -- so there's a
> second way to update. Fine. No "Repeat last export" in there though. I'd have looked there first.

(Chip, Update, Replace, then scroll and two export-again icons plus their confirm: about 7 clicks
so far. He counted them out loud.)

### 6. Show what changed, to the manager

> "Compare with..." on the April version. Comparison page. "PageRank, March and April." OK --
> last week's CSV was accounts-by-PageRank, so this is the right measure this time.
>
> "49 of the top 50 in both months. The rankings mostly agree at the top." Good sentence, goes in
> the deck. "Spearman 0.76 ... over the 2,961 accounts in both." Fine, I know Spearman roughly.
>
> "PageRank gives the same result every run, so a re-run cannot tell change from noise. Compare
> with randomized baseline..." I read that three times. I think it's saying the change is real
> because PageRank doesn't wobble? Then say that. I'm not clicking randomized baseline.
>
> Not matched: 39 March only, 132 new. Same numbers as the update box and Versions. Consistent
> everywhere, which matters more to me than any of the charts.
>
> Differences: Moved. ACC-488401, #1,575 in March, #88 in April, moved 1,487. That's the line for
> the deck. "Create set" -- I'd make a set of the big movers maybe.
>
> The scatter -- log-log rank against rank with tie bands. Nope. My manager is not reading that.
>
> "Export table..." (Moderator shows what it writes.) "Scope: Full graph: both months." Rows:
> 2,961 in both, 39 March only, 132 April only. Columns: both months' scores and ranks, and places
> moved. Preview: pagerank_march, pagerank_april, rank_march, rank_april, moved. That opens in
> Excel and it's exactly the sheet I'd have built by hand with a VLOOKUP. "39 are March only and
> 132 April only: their missing month's score, rank and moved are empty." Good, it says so instead
> of putting zeros.
>
> There's also "Findings report (.html) ... prints to PDF." That might be the thing I hand him.
> I'd try it once. If it's a readable page with the numbers and the picture, that beats pasting
> into PowerPoint. If it's the scatter plot, no.
>
> What's still missing: communities, month to month. Which accounts moved group. The only
> community comparison I see is "Compare Community 1 with the rest", inside April. The 35 to 65
> story I can tell from the Versions panel, but "these 40 accounts left the northern cluster" I
> still can't. I'd do that in pandas.

---

## After the task

**Single Ease Question: 5 of 7.** "Getting the new week in was easy -- chip, update, replace, and it
told me up front it would rerun my stuff. And the what-changed list actually answers the 35 to 65
question, which it didn't last time. The export half is where it slows down: the redo button is a
tiny icon I found by hovering, I'm not sure it uses this week's data, and I still can't see who
switched community."

**Would he use it instead of his current tool?** "For the weekly refresh, yes, over the Gephi half.
Counts match SQL, colours and group names survive, it names the dormant accounts and the two
watchlist accounts that dropped, and the both-months CSV is the sheet I build by hand every week.
I'd still check the first couple of re-exports against Python -- row count and a few PageRank
values -- before I trust the export-again button, and I'd still do community moves in pandas."

---

## Problems, in his words

1. **Data panel, Sent and saved: "Export again" is an unlabelled icon, and it does not say which
   data it uses.** Found only by hovering. "these settings -- does that mean on THIS week's data,
   or does it write the same file again? If it writes March's numbers into a file I send as this
   week's, that's the report that goes out wrong." He would also expect the date in the new file
   name so last week's file is not overwritten. Severity 3.
2. **Comparison: no community-to-community comparison between two data versions.** "35 became 65,
   I can explain now, but which accounts moved group -- I can't. That's the actual story." Only a
   single community against the rest exists. Severity 3.
3. **Load step, Add data path: the blue button is still Add data** when the yellow box says it
   would double the month, while Update with new data makes Replace blue. "Two ways in, two
   different default buttons. If I'd dragged the file on I can still double count in one click."
   Severity 2.
4. **Export dialog shown for the task is another project** (a mule ring case, 14 accounts, March
   data), so he could not see what his own re-export would write. "That's not my project."
   Severity 2 (a mock problem, but it blocked the step).
5. **Saved files named "april-..." dated May 4 before he had exported anything this week.**
   "Did I already do this week's? Or is that last week's?" Severity 2.
6. **No project menu entry for repeating an export.** "I'd have looked there first." Severity 1.
7. **Load step: amount's Role says "none" while Weight says "amount, used as similarity".** "So
   which is it." Severity 1.
8. **Versions, What changed: no copy button.** "This is what I'd paste into the email; I'd retype
   it." Severity 1.
9. **Comparison: "a re-run cannot tell change from noise. Compare with randomized baseline..."**
   Read three times, still unclear whether the change is real. Severity 1.
10. **Legend still sorted by size, 5 above 4.** Read as a ranking for a second, as last time.
    Severity 1.
11. **"Style stack" empty on the right while the graph is clearly styled.** "Empty looks wrong."
    Severity 1.
12. **Title on the load step ("Card and transfer transactions, March 2026") differs from the
    project name ("Payments network review").** Severity 1.

## What worked, in his words

- The file chip opening straight to "Update with new data..." -- "exactly what I was going to look
  for."
- "the runs replay on April's data" in the update dialog, before he clicked Replace -- the round-3
  complaint answered.
- "26 are single accounts with no transfers" under the 35 to 65 jump -- "the question my manager
  asked last time and I couldn't answer."
- The watchlist line naming the two missing accounts.
- The same 39 / 132 / 2,961 everywhere: update dialog, Versions, comparison, export.
- The both-months CSV with empty cells, not zeros, for accounts in one month only.
