# Session: flagged account -- intelligence analyst (Marcus)

Participant: Marcus, criminal intelligence analyst at a state fusion center
(study/personas/intelligence-analyst.md). Works phone records, bank subpoena returns and jail
calls into link charts for case agents and prosecutors. Not a bank reviewer; he reads bank
returns when a subpoena comes back.

Task as given: "An alert names account ACC-365386. Decide whether to clear it or refer it, and
save what you would attach as evidence."

Material worked from, as the participant sees it (1440 x 900):

- the alert-triage screens on August's alerts: the queue as it opens, the account found, the
  Neighbors menu, one hop filtered, the account's own transfers with the Export menu, the
  referred set with its note, the evidence export, and "Where the data is"
  (shots/alert-triage/open.png, seed-find, seed-menu, seed-hop1, seed-own, seed-refer,
  seed-evidence, file)
- the alert-triage storyboard and flow pages (shots/storyboards__alert-triage.png,
  flows__alert-triage.png)
- the inspector page's "flagged account" state (shots/screens__inspector-flagged.png)
- the find and export-dialog pages (shots/screens__find.png, screens__export-dialog.png)

Page HTML was read only to see what a control does when clicked.

## Think-aloud

**1. It opens.** (open)

"August alerts. A gray blob of hexagons with orange diamonds on it. Fifty alerts, the table
says, of three thousand accounts. The legend card: '2,950 nodes drawn as density.' So the gray
honeycomb is two thousand nine hundred people I can't see. Fine, I don't want to see them. I
want one guy.

Left side says 'Assistant. Off. Nothing is sent.' Good. That's the first thing I'd ask. I'll
still ask IT, but good.

Table sorted by alert ID. AL-40122, ACC-365386, bottom row, half cut off. Structuring, risk 92,
eight connections. That's my account. I could click the row. I'll use the search -- magnifier
by 'Graphs'. Actually I don't know if that searches accounts or searches graphs. I'd try it
anyway."

**2. Find the account.** (seed-find)

"Typed the number, one hit: 'ACC-365386, personal, US; in Alerts.' It's circled on the blob and
the row's lit up in the table. Right panel has the account.

There's a black box in the middle saying 'Delete step ACC-749505 and neighbors, Undo.' I didn't
delete anything. That's somebody else's last alert, I guess. I'd leave it alone.

Right panel. kind personal, country US. riskScore 92 -- and under it, 'From
accounts-2026-08.csv. riskScore is the bank's customer risk rating as delivered; not computed by
graphty.' Okay. That's the right answer to 'ninety-two of what'. The bank rated him, not this
program. I can say that on the stand. alertScenario: 'Structuring: 3 or more transfers of 9,000
to 9,999 USD out in 30 days.' alertTime Aug 7 02:17 UTC, from the monitoring system's alerts
file. So the alert is the bank's, the score is the bank's. Nothing here is the tool deciding
he's dirty. I like that.

Connections: '8 neighbors, In 3, Out 5.' Three people paid him, he paid five."

**3. How far to look.** (seed-menu)

"Neighbors button with a little arrow. Opened the arrow. '1 hop: 9 nodes, 13 edges. 2 hops: 283
nodes, 470 edges. Mostly through ACC-597001 (Pharmacy, 152 neighbors) and ACC-512219
(Streaming, 109).' That line is actually useful. It's telling me two hops blows up because he
bought something at a pharmacy and pays for a streaming service. Two hops is the pharmacy's
customers. That's noise. That's the hairball I always get and nobody tells me why. One hop.

'Filter to neighbors, 1 hop.' vs 'Select neighbors, 1 hop.' I don't know the difference and I'm
not going to guess -- the blue one."

**4. One hop.** (seed-hop1)

"Nine on the screen. That's the chart I want: the thirty -- here nine -- people around this guy.
Top says 'Filtered: 9 of 3,000 nodes.' Good, it tells me I'm not looking at everything.

Now, what are they. Orange diamonds and gray dots. The legend says orange is 'alert is true', 5.
So five of nine are alerted. The gray ones -- ACC-512219, ACC-597001, ACC-465572, ACC-916833 --
what are they? A person? A business? I have to click each dot to find out. In i2 the pharmacy
would have a little building on it. This is the same complaint I always have: I shouldn't have
to click a dot to learn what it is.

Edges table, biggest first. 9,863.99, 9,815.97, 9,782.28, 9,707.38, 9,662.37, 9,616.35,
9,326.81... every one of them under ten grand. Every one. And most of them going into
ACC-465572. That's not rent."

**5. His own transfers, in order.** (seed-own)

"Clicked him, the table changed to 'Edges of the selection, ACC-365386: 8 of 13.' Sorted by
time. Reading it top down:

- Aug 3, 90.81 out to 597001 -- the pharmacy.
- Aug 5 09:09, 3,479.70 in from 916833.
- Aug 6, 15:21, 15:44, 17:42 -- 9,260.78, 9,662.37, 9,139.58 out. To 274887, 898028 and 465572.
  Three in two and a half hours, all under ten.
- Aug 7 02:17 the bank alerts.
- Aug 17, 9,863.99 in from 796219. Aug 24, 9,326.81 in from 228299.

The eighth row's under the fold -- I had to find it in the export: Aug 30, 168.28 out to
512219, the streaming thing.

Here's what bothers me. He got 3,479 in on the fifth and sent twenty-eight thousand out on the
sixth. Where'd the other twenty-four and a half grand come from? It's not in this file. Either
he had it sitting there, or it came in as cash at a branch, and a transfers file won't show me
a cash deposit. There's no balance anywhere on this screen. I'd write that down as the first
question for the bank. The tool can't answer it; it doesn't have the data, and it doesn't
pretend to, which is fine. But it didn't warn me either -- an analyst in a hurry reads 'In 3'
and thinks that's all the money there is.

And there's no total. I added those three out by hand: 28,062.73. Excel does that in one
second. The inspector page I was shown separately has an 'amount, totals' line, In and Out,
marked 'proposed'. Put it in. That's the first number the sergeant asks for.

Decision's not hard. The two people he paid on the sixth, 274887 and 898028, are both alerted,
and both of them turn around and pay 465572 -- 9,815.97 on the 19th, 9,707.38 on the 21st. The
two who paid him later, 796219 and 228299, are alerted too, and they also pay 465572. Five
personal accounts, all moving just-under-ten into the same place. That's a ring with a
collection point. Refer."

**6. Who is 465572?** (seed-refer, the storyboard)

"The member list on the set says 'merchant'. The storyboard text calls it a money transfer
service. The screen I'm working on never told me that until I got to a list; the dot's the same
gray dot as the pharmacy. For my purposes that's the most important node on the chart -- the
place the money pools -- and it looks exactly like the place he buys aspirin."

**7. Refer it: keeping it.** (seed-refer)

"Now how do I refer. There's no button that says Refer. There's no button that says Clear
either. I'm looking at 'Sets and paths' with a plus. The finished screen shows a new line
'Referred AL-40122, frozen, 9' and a note on the right. How I got there, I'd have guessed the
plus next to 'Sets and paths'. Reading the page source, it's actually made from the filter
chip's menu -- click 'Filtered: 9 of 3,000', then the step's menu, then 'Create set'. I would
not have found that. Somebody would have to show me once.

'Frozen' -- okay, I take that to mean it won't change if the data changes. Good, that's what
I'd want for a referral. Nobody told me that's what it means though.

The note. It's already written, and it's good -- the times, the amounts, 'all four personal
counterparties are alerted for structuring and all four pay ACC-465572. Pass-through pattern.'
That's basically what I just worked out. But it's signed 'Nadia, 10:27'. Who's Nadia? The
circle in the corner says N. I'm not Nadia. If I'm meant to have written that, it has my name on
it or it doesn't go in a case file. If Nadia wrote it and I'm the second reviewer, fine, but
then where's my note? I can't tell from this whether I'm continuing somebody's work or starting
my own. And there's a 'Notes' icon on the left and a page-with-a-corner icon on the bottom bar;
I'd assume one of those adds a note, I don't know which.

What I'd add to the note that's missing: 'Source of the 28K on Aug 6 not in transfers file --
request statement and cash deposit records.' And a grade. The bank's alert is a B2 to me, not an
A1. There's nowhere to put that except free text."

**8. The evidence.** (seed-evidence)

"Select him, 'Export' plus, 'Export the selection's edges... 8 transfers: time and amount.' The
dialog shows me the eight rows before it writes anything. That I like a lot -- I see exactly
what's going in the file.

Findings report, .html, and a table, .csv. 'holds: her note (on the set Referred AL-40122...);
these transfers with time and amount; the account's attributes, each with the file it came from;
the current view as its figure; methods: the filter step... then the selection's edges.' 'Her
note' again. Whose? Mine?

Scope says the selection's edges -- his eight. For a referral I want the thirteen: the other
four paying into 465572 IS the case. There's the dropdown; 'Other scopes: ... the filter step
ACC-365386 and neighbors (9 nodes, 13 edges), the set Referred AL-40122 (9 nodes)'. I'd switch
to the set. I'd have missed that if I were rushing -- the default is the narrowest one.

Now the question I always ask. Columns: source, target, time (UTC), amount (USD). Where's the
transaction reference? Every one of these rows is a line on a bank return with a reference
number. If the defense asks me 'which record is the 9,662.37 on August 6', I need that number,
not 'from transfers-2026-08.csv'. The file name is better than nothing. It's not a record.

UTC only, too. The bank's statement will be local time. 02:17 UTC is the evening before where
this guy lives. Somebody will get that wrong in a report.

'2 files go to the download folder. Nothing is uploaded.' Good. That's the line IT wants."

**9. Did anything leave?** (file)

"Clicked the file name up top. 'Where the data is: transfers-2026-08.csv, read from this
computer at 08:41. graphty runs in this browser tab and has no server of its own. Uploaded:
nothing, this session. Saved: in this browser. Written out: 4 files.' And it lists them by
name. That's an audit line. I'd screenshot that and put it in the ticket to IT. Best screen in
the thing, honestly.

'Saved in this browser' -- so if IT wipes my profile, it's gone? I'd want to know that before
I leave it overnight."

**10. The other pages.** (screens__inspector-flagged, screens__find, screens__export-dialog)

"This one's a problem. The inspector page shows ACC-365386 too. Same number. 'Transfers, March
2026.' Country GB. Alert time 2026-03-09. 'In $19,449.22, Out $28,587.48.' The alert page said
US, August 7, and I added up about 22,670 in and 28,322 out. Same account number, different
country, different month, different totals. Which one's lying? If this were real, I stop right
here -- either there are two accounts with the same number in two files, or somebody's data is
wrong, and I'm not referring anything until I know which. I get that it's a different month's
file. It doesn't say 'this is not the same account' anywhere, and the ID is the ID.

Find page is Les Miserables. Thenardier. Export dialog is proteins. I skipped both -- those
aren't my kind of data and I'm not going to read a protein study to learn where a button is."

**11. Decision.**

"Refer. Structuring out on Aug 6 -- three transfers of 9,139 to 9,662 in about two and a half
hours, on 3,479.70 of known money in -- and four other alerted personal accounts all feeding
the same money transfer service, ACC-465572, with just-under-ten transfers. Open question for
the bank: where the rest of the 28 thousand came from.

Evidence I'd attach: the findings report with the scope switched to the whole referred set
(9 accounts, 13 transfers), the CSV of the same, and a screenshot of 'Where the data is'. I
would add the transaction references by hand from the bank return before it goes to anyone."

## Single Ease Question

**5 of 7.** "The looking was easy. One hop, sorted by time, and the pattern jumps out -- faster
than a pivot table, and the two-hop warning about the pharmacy is something my tools never
tell me. What cost me was the keeping: no Refer button, the set made from a menu I'd never
find, a note signed by somebody else, the export defaulting to the smallest scope, and the
same account number looking like a different person on another screen."

## Would he use this instead of his current tool?

"Not instead. Alongside, maybe, for bank returns. For this -- an account, its counterparties,
money in time order -- it's quicker than Excel plus i2, and 'nothing is uploaded, here's the
list of files written' is what gets it past IT. But I can't put it in front of a prosecutor
yet: every account is the same dot, a money service looks like a pharmacy, there's no
transaction reference on a row, no grade, and it can't give the chart to the guy down the hall
who only has i2. Give me the reference number on every line and an icon for what each thing
is, and I'd start using it for the money side of my cases."

## Problems observed

1. **The same account ID shows different facts on two screens.** ACC-365386 is US, alerted
   Aug 7, about 22,670 in and 28,322 out on the alert screens; on the inspector page it is GB,
   alerted March 9, 19,449.22 in and 28,587.48 out. Nothing says these are different months'
   files. He would stop the case until it was explained. Severity: high (for the study; likely a
   mock seam, but it lands exactly on his "which one's lying" distrust).
2. **No source record reference on a transfer.** Rows and the export carry source, target, time
   and amount, and the file name, but not the bank's transaction reference. He cannot answer
   "which record is this row" in discovery. Severity: high for his work.
3. **Refer has no visible route.** The referred set is made from the filter chip's step menu
   (Create set); he looked for a Refer button, then guessed the + by "Sets and paths". He would
   not have found it unaided. There is no Clear either. Severity: medium.
4. **The note is signed by someone else.** "Nadia, 10:27" and "her note" in the export, with
   an "N" avatar. He could not tell whether he was continuing another reviewer's work or was
   meant to write it. A note in a case file must carry the right name. Severity: medium.
5. **Export defaults to the narrowest scope.** "The selection's edges" (8 transfers) excludes
   the counterparties' payments into the collection account, which is the substance of the
   referral; the wider scopes are in a dropdown and one grey line. Severity: medium.
6. **Nodes do not say what they are.** Person, merchant and money transfer service are the same
   gray dot; the collection account looks like the pharmacy. He learns kind only by clicking or
   from the set's member list. Severity: medium (his standing i2 complaint).
7. **No total of selected transfers, no balance, no warning that cash is out of view.** He added
   28,062.73 by hand, and noticed on his own that 28k left on 3.5k of known inflow; the screen
   gives no hint that the file cannot show cash or opening balance. Severity: medium.
8. **Stray notice from someone else's step.** "Delete step ACC-749505 and neighbors, Undo" is on
   screen when he arrives. He left it alone but did not know what it was. Severity: low.
9. **Times only in UTC.** A 02:17 UTC alert is the previous evening locally; he expects that to
   be mis-stated in a report. Severity: low.
10. **"Filter to" vs "Select" neighbors, and "frozen", are unexplained.** He took the blue
    default and guessed "frozen" means unchanging. Severity: low.
11. **"Saved in this browser" raises a retention worry.** He wants to know it survives an IT
    profile wipe before leaving a case overnight. Severity: low.
12. **Stand-in pages on other data.** The find page (Les Miserables) and export-dialog page
    (proteins) were skipped as not his data. Severity: low (study material).

What worked, in his words:

- riskScore "not computed by graphty": "the bank rated him, not this program. I can say that on
  the stand."
- The two-hop line naming the pharmacy and the streaming service: "that's the hairball I always
  get and nobody tells me why."
- "Filtered: 9 of 3,000 nodes" on the chip: it says he is not looking at everything.
- The Edges tab following the selection, sorted by time: the pattern reads straight off it.
- The export dialog showing the exact rows before writing, with "Nothing is uploaded".
- "Where the data is" listing every file written: "I'd put that in the ticket to IT."
