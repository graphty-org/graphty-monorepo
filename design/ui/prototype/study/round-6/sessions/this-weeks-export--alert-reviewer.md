# Session: this week's export -- alert reviewer (Nadia)

Participant: Nadia, level-1 transaction monitoring analyst (study/personas/alert-reviewer.md).
Fourteen months in, works the alert queue, has never used a graph tool. Patience: the length of
one alert, about ten minutes. Screen: 1536 by 740 browser viewport on a 1080p monitor at 125
percent.

Task as given, and nothing more: "Redo last week's export on this week's data, and show what
changed."

Material worked from: the Data panel with March loaded and with its file chip menu open, the
load step for transfers-2026-04.csv, the Data panel after April is in (with the list of files
saved from the project), the version history's What changed list, the comparison (its default
view and its March-against-April view), and the export dialog's Table view. Renders were read
(shots/tasks/this-weeks-export/ and shots/tmp/nadia-this-weeks-export/); page HTML was read only
to see what a control does when clicked.

Moderator note on coverage: the load step is not drawn after "Replace data instead" is pressed;
the page says the same dialog turns into an update (its title, its button and its undo label
change). Nadia was told that when she pressed it. The export dialog the task shows is drawn for a
different project state (a filtered set of 14 accounts on March data); she was shown it as what
"Export again" opens, because no other export state exists. Her reaction to it is recorded as
she gave it, and flagged below as partly a coverage gap.

## Think-aloud

**1. The project, March loaded.** (shots/tmp/nadia-this-weeks-export/data-panel.png)

"Payments network review. That's the one Sarah set up, I just pull numbers out of it. Up top
there's a little tag, transfers-2026-03.csv. That's the file. This week's file is the April
one -- well, they're monthly files, you said week, whatever, the newest extract. So I need to
put the new file in.

Left side says Sources, the file, then the columns. Down here: 'Update with new data...'.
That's it, that's literally what you asked. But first I'll just click the tag at the top,
because it's the file and it's in front of me."

**2. The file tag's menu.** (shots/tmp/nadia-this-weeks-export/dp-s8.png)

"OK, clicking the file tag opened the file in the list and a menu. First line: 'Update with
new data...'. Same words as the button. Good, two ways to the same thing, I don't have to hunt.
'Remove table' is greyed out, fine, I wasn't going to. Update with new data."

**3. The load step.** (shots/tasks/this-weeks-export/02-load-step-add-data.png)

"Title says 'Add data from transfers-2026-04.csv'. I didn't say add. I said update. And the
big blue button at the bottom is 'Add data'. If I'd been going fast I'd have hit that, it's
blue, it's where the OK always is.

There's a yellow box though. 'Same columns as transfers-2026-03.csv, the data already
loaded. Add data keeps March and puts April on top of it: 17,483 transfers, and the 39 accounts
not in April stay in. To see April alone, replace March with it: 3,093 accounts, 8,370
transfers.' OK. That I understand. I don't want both months piled together, that's how you
double-count a customer's turnover and QA sends it back. I want April. 'Replace data
instead.'

(Moderator: pressing it turns this dialog into the update -- the title and the button change.)

Then why wasn't it that from the start? I came in through a button called Update. The box saved
me, but the box shouldn't have had to.

Middle bit: matched 2,961, new 132, not in April 39. Those numbers I like. That's what I'd
check anyway -- how many customers are new this month. The Format, Each row is, Ends stuff on
the left I don't touch. It says 'Directed, as the project is'. Fine."

**4. April is in: the Data panel.** (shots/tmp/nadia-this-weeks-export/dp-s6.png)

"Tag at the top now says transfers-2026-04.csv. Right side: accounts 3,093, transfers 8,370.
Matches what the yellow box promised, so it did replace, it didn't stack. That's the
first thing I'd check and it's right there. There's a second file under it, accounts-2026-04,
'Joined on id: 3,093 accounts matched'. I didn't load that. Maybe it came with it. I'll leave
it.

Versions: April data current, March data under it. So March isn't gone. Good -- if I did
something wrong I can go back. 'Version history...' -- that's probably the 'what changed'
part."

**5. What changed.** (shots/tasks/this-weeks-export/01-version-history.png)

"Here we go. 'What changed, against March data (Apr 2).'

- 27 components (was 1), large change, 26 accounts have no transfers in this version. Select.
  I don't know what a component is. But 'accounts with no transfers' I get -- they're
  customers in the accounts file who didn't move money this month. So is it a large change or
  is it 26 dormant customers? It shouts 'large change' in yellow and then the explanation says
  it's nothing much. If I pasted that into an alert file, QA would ask me what the big change
  was.
- 65 communities (was 35), large change, 26 are single accounts. Same 26, I think. Same
  story. I don't use communities.
- 3,093 accounts (was 3,000). 2,961 in both, 132 new, 39 not in April. List. That's the one I
  care about. Same numbers as the load step, so they agree with each other.
- 8,370 transfers (was 9,113). 7,576 in both, 794 new, 1,537 not in April. Wait -- 'in both'?
  The same transfer in March and in April? Transfers have dates. A March transfer can't be in
  April. Maybe it means the same pair of accounts. It doesn't say. I'd have to ask Sarah before
  I wrote that down.
- Watchlist: 7 of 9. ACC-705989 and ACC-243731 not in April. Oh, that's useful. Two watched
  accounts went quiet. That's actually a line I'd write down.
- Rows dropped at import: 0. Good. QA always asks if the extract was complete.

So 'show what changed' -- this is the answer, as a list. How do I get it into my file? There's
'Show replay report' and 'Export the operation log...'. Neither says 'copy this list'. I'd
screenshot this panel. It's tall -- on my screen I'd have to take two screenshots, the Versions
part starts halfway down."

**6. Compare with...** (shots/tasks/this-weeks-export/03-comparison.png, then
shots/tmp/nadia-this-weeks-export/cmp-versions.png)

"'Compare with...' under the list. Let's see.

First thing I get: 'PageRank and betweenness', a scatter, 'rank on PageRank against rank on
betweenness', '0 of the top 50 in both'. This isn't March against April. This is two
different measures on the same month. I didn't ask for that. I don't even know what
betweenness is.

(Moderator shows the March-and-April view.)

OK, this one says 'PageRank, March and April'. '49 of the top 50 in both months. The
rankings mostly agree at the top.' Not matched: 39 in March only, 132 new in April -- same two
numbers again, good. Then a list: 'Moved'. ACC-488401 went from number 1,575 to number 88.
That's 1,487 places. I don't know what PageRank is measuring but an account that jumps
fifteen hundred places in a month is the kind of thing Sarah asks me about. That list I'd
look at.

Spearman 0.76, randomized baseline -- skip. The scatter -- skip. The 'Moved / March only /
April only' tabs I get.

But why was it on PageRank at all? Last week's export -- I think it was that
accounts-by-pagerank file -- so maybe that's why. Nobody told me."

**7. Finding last week's export.** (shots/tmp/nadia-this-weeks-export/dp-s6.png, lower half)

"Now the actual job: redo the export. My first move is the 'Export...' button at the top of
Data, because that's where I'd go. But that's a blank export -- it doesn't know what I did last
week. I want 'the same thing again'.

I scroll the Data panel. Past Sources, past Versions, past Applied recipes, past 'Sent and
saved from this project'. On my screen that's two whole scrolls down; I would not have found
this if you hadn't told me there was a 'last week's export' to find. At the bottom: 'Saved to
this computer'. april-communities.svg, accounts-by-pagerank.csv, Mule ring triage, Payments
network review.

accounts-by-pagerank.csv, 'Table of accounts and methods text, May 4'. That's the export. May 4
-- that's the same day April was loaded, it says so up in Versions. So was that file made on
March or on April? The row doesn't say which data it was made from. That's the one thing I
need to know to 'redo it on this week's data', and it's the one thing it doesn't tell me.

There's a little circle-arrows icon on each row. Circle arrows means refresh. Does it refresh
the file on my computer? Overwrite it? The tooltip says 'Export again with these settings...'.
OK, with the dots, so it asks me something first. Clicking it."

**8. The export dialog.** (shots/tasks/this-weeks-export/04-export-dialog-table.png)

"Export. Scope: 'Filtered: 14 nodes'. 'in Mule ring suspects'. Files: case-acc-233575_nodes.csv.
Beside it, the methods text: 'Rows: 14 of 3,000 accounts... Data: transfers-2026-03.csv, 3,000
accounts, 9,113 transfers.'

No. Three thousand accounts is March. I just loaded April, it said 3,093. And this is a
case file for ACC-233575, fourteen accounts -- that's not the pagerank table I clicked. So
either it opened the wrong export or it's going to write March numbers into this week's
file. I'm not exporting that.

(Moderator: this dialog is drawn for a different state; nothing else exists yet.)

Fine, but I can only go by what's in front of me. What I will say: the text beside the CSV is
exactly what I'd want if it were right. Rows: 14 of 3,000. Filtered by one step. Data: which
file, how many accounts. 'riskScore: from accounts-2026-03.csv, not computed by graphty.' If
that paragraph said April, I'd paste it straight into the alert file and QA would be happy.
That's the good bit. And the bottom line: '2 files go to your Downloads folder. Nothing is
uploaded.' Good, I'd have asked.

But I'm not going to fix the scope dropdown myself and hope the methods text follows. I'd
cancel, screenshot the What changed list, and email Sarah."

## Single Ease Question

"3. Putting the new file in was fine -- once I read the yellow box, which I only read because
the title said 'Add' and I'd clicked 'Update'. The What changed list is the best thing here; I'd
screenshot it. The export -- I couldn't tell which month my old file was made from, the redo
button is a refresh icon at the very bottom of a long panel, and when I pressed it I got March
and somebody else's case. So I did half the task."

## Would she use this instead of her current tool

"For this? No -- this isn't my job, honestly; re-running the monthly numbers is Sarah's or
whoever built the project. If it landed on me, the What changed list plus that methods paragraph
would save me an hour of spreadsheet diffing, and that's real. But not until 'Export again'
tells me which month it was made on and opens on the month I'm looking at. And not in a month-end
week."

## Observations for the study (moderator)

1. **The update route is named twice as Update and lands on Add.** The file tag menu and the
   Data panel button both say "Update with new data...", and both open a dialog titled "Add data
   from ..." whose primary button is "Add data". Nadia avoided stacking March and April only
   because she read the warning; she said she would have pressed the blue button on a busy day.
   Stacking two monthly extracts silently doubles customer turnover. Severity: high.
2. **Saved exports do not say which data version they were made from.** The row
   "accounts-by-pagerank.csv, Table of accounts and methods text, May 4" shares its date with the
   April load, so she could not tell whether it was March's or April's export -- the one fact the
   task turns on. Severity: high.
3. **"Export again" is hard to find and looks like refresh.** It sits at the very bottom of the
   Data panel (two scrolls down at 1536 by 740), under Sources, Versions, Applied recipes and the
   privacy block, as a circle-arrows icon she read as "refresh the file on my computer". She
   reached it only because the moderator's task said a previous export existed. Severity: medium.
4. **"Export again" opened an export on March data for another case.** Partly a coverage gap (no
   export-again state is drawn), but what she saw ended the attempt: methods text naming
   transfers-2026-03.csv and 3,000 accounts, a 14-account filtered scope, a case file name.
   Severity: high as experienced; needs an export-again state on April data to test fairly.
5. **"Large change" is shouted over a small explanation.** Components 1 to 27 and communities 35
   to 65 carry yellow "large change" badges, while the split below says 26 accounts simply had no
   transfers this month. She said QA would ask what the large change was. Severity: medium.
6. **"In both" for transfers is ambiguous.** "7,576 in both" reads to her as the same dated
   transfer in two months, which is impossible; it probably means the same pair of accounts, and
   the list does not say. Severity: medium.
7. **What changed has no copy or export of its own.** It is the answer to "show what changed",
   but the only outputs nearby are the replay report and the operation log; she would screenshot
   it in two parts. Severity: medium.
8. **Compare with... opens on two measures, not two versions.** The first comparison she saw was
   PageRank against betweenness on April; she needed the March-and-April view, which she reached
   only when shown it. Severity: medium.
9. **Numbers agree across screens.** 2,961 / 132 / 39 appear identically in the load step, What
   changed and the comparison's Not matched block, and 3,093 / 8,370 in the overview matched the
   warning's promise; she used that agreement as her check that Replace worked. Worth keeping.
10. **The methods paragraph beside the CSV is what she would paste into an alert file.** Rows of
    what total, filtered by what, from which file, which columns were computed and which came in
    with the data, and "Nothing is uploaded". Worth keeping.
