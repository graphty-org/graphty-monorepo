# Session: monthly update of the transfers project -- Analyst Alex

**Task, as the moderator gave it:** "Last month's transfers project needs this month's file. Update
it, and explain why the number of groups changed."

**Participant:** Analyst Alex, an operations data analyst who computes in Python and draws in Gephi,
and redoes the Gephi half by hand every month.

**Screens seen, in the participant view (design notes hidden):** the weekly return storyboard
(start screen through to the export), the data panel, version history, the replace-and-recipe
walkthrough and the comparison screen. Renders: `shots/record/r6-alex-wu-weekly-return.png`,
`shots/record/r6-alex-wu-data-panel.png`, `shots/record/r6-alex-wu-version-history.png`,
`shots/record/r6-alex-wu-replace-and-recipe.png`, `shots/record/r6-alex-wu-comparison.png`.

**Outcome:** finished. He updated the project to April, and wrote a three-sentence explanation of
why the group count went from 35 to 65, every number in it read off the screen. Ease 6 of 7.

---

## Think-aloud

### 1. Start screen

> OK, Recent projects. "Case 0314, mule ring -- Transfers, 3,000 accounts. Edited Apr 3." That's
> last month's. 3,000 is what I had in March, so that's the one. Click the card.

(1 click.)

### 2. Project reopens

> Colours are back. Size by degree, community colour, the legend says Louvain, 35 communities --
> "Community 1" to 7 and then "Other, 28 communities, Communities 8 to 35". Fine, that's what I
> had. It even put my selection back, 14 nodes. I don't need the selection, I'll clear it.
>
> Right side: accounts 3,000, transfers 9,113, "Last import: March data, accounts-2026-03.csv,
> transfers-2026-03.csv, Apr 3". Good -- it tells me which file it's built on. That's the thing
> Gephi never tells you.
>
> Up top left, "Nothing has been sent from this project". I'll take that. I'd still want to know
> who pays for this, but that's not today's question.

### 3. Finding "update"

> Now where's the "swap in the new file" thing. I'd look at the Data tab first, honestly... but
> the hamburger is the obvious menu. File. "New project, Open..., Recent projects" and then
> "Update with new data... New files under this analysis; March kept as a version. 1 slow result
> will wait for Re-run." That's exactly what I want. And "Add data -- More rows on top of the data
> loaded now" underneath -- no, I don't want March plus April stacked, that would double-count
> everything. Good that it says so in one line; I would have hovered for it otherwise.
>
> Menu, File, Update. Three clicks just to get to the file picker. Every month. It's fine, but
> it's three.

(He also noticed the Data tab has its own "Update with new data..." button on the data-panel
screen and said he would probably use that one from the second month on: "one click instead of
three, if I remember it's there.")

(He noticed the File menu was ordered differently on the replace-and-recipe screen -- "Update with
new data" under Join there, second from the top on the weekly screen: "Which is it? If it moves
around I'll stop trusting my muscle memory." Small.)

### 4. File picker

> accounts-2026-04.csv, 3,093 rows; transfers-2026-04.csv, 8,370 rows. Pick both. "The files are
> read on this computer; nothing is sent." Said it again, right where I load the file. Good. Open.

### 5. A screen titled "Add data" -- momentary confusion

> Wait -- "Add data: April files"? I clicked Update, not Add. Did I misclick?
>
> ...Oh, it's warning me: "Same columns as March, the data already loaded. Add data keeps March and
> puts April on top: 3,132 accounts and 17,483 transfers." And a "Replace data instead" button.
> OK, so this is what I'd have got if I'd picked the wrong menu item. 17,483 transfers would have
> been a disaster in the deck. I like that it caught it. But I didn't pick Add, so seeing it in
> the middle of my path threw me for a second.

(The next screen was the Update dialog, which resolved it.)

### 6. The load step -- checking counts

> "Update with new data: April files." Counts against March, side by side: accounts April 3,093,
> March 3,000. Found by id 2,961, new 132, not in April 39. Transfers 8,370 versus 9,113. Rows
> dropped 0 and 0.
>
> 3,093 and 8,370 are what my SQL gave me. 2,961 plus 132 is 3,093. 2,961 plus 39 is 3,000. OK,
> the counts reconcile. That's the first thing I check and it's the first thing it shows me.
>
> Issue: "26 accounts have no transfers in April. All 26 were in March; none is new. Each will be
> a component of its own." Huh. Note that -- 26 dead accounts. That's probably going to matter for
> the groups.
>
> "What replays: Degree; Louvain with its 5 seeded re-runs -- seconds. Modularity vs randomized
> baseline -- a few minutes: waits. 2 style layers, the layout, 1 set, 1 note -- carried over."
> So it tells me the slow one before it runs it. Load.

(Clicks so far from the open project: menu, File, Update, pick two files, Open, Load -- about six,
counting the file pick as one.)

### 7. After the load -- the replay report

> The graph's still there, same colours. Legend: Community 1 is 359 now, was 297. "Other, 58
> communities, 19 carried on from March's 8 to 35, 39 new." So 65 total.
>
> Left: "Louvain communities -- Replayed; 65 groups, was 35." There's the question the moderator
> asked, sitting right in the list.
>
> Right panel, Version history, "Replay report":
> "Louvain: 35 groups in March, 65 in April: 39 new, 9 lost. 26 of the new groups are single
> accounts with no April transfers. Lost, their accounts now in other groups: Communities 13, 19,
> 20, 21, 28, 29, 30, 32, 34."
>
> OK. So of the 30 extra groups, 26 are just those dead accounts, each counted as a group of one.
> That's most of the jump. That's the answer, basically. 35, minus 9 that merged into others, plus
> 13 real new ones, plus 26 singletons, is 65. Let me check: 35 - 9 = 26, 26 + 39 = 65. Yes.
>
> "Components: 1 to 27. One holds 3,067 accounts; the other 26 are the accounts with no
> transfers." 3,067 plus 26 is 3,093. Consistent.
>
> Watchlist: 7 of 9 in April, two account ids not in this data. Fine, I'd want to know that.
>
> Size legend: "domain 0 to 842, was 1 to 907". So the node sizes aren't on the same scale as
> last month's slide. Zero because of the dead accounts, I guess. If I put March and April slides
> next to each other, someone will compare the dot sizes. I'd want to be able to keep March's
> scale. Not a blocker.

### 8. The slow one

> "Modularity vs randomized baseline -- Out of date; a few minutes", with a Re-run button. Click.
> Progress bar at the bottom, "Running... Cancel". Left row says Running. That's what I want: I
> know it's working and I can kill it. I'll go get a coffee.

### 9. Comparing the groups, March against April

> I want to see this properly before I say it to anyone. On the Louvain row there's a compare
> icon. Click. "Earlier runs: March data, Apr 3 -- 35." Pick that. "The comparison reads those and
> runs nothing." Good, I don't want it rerunning Louvain and giving me a third answer.
>
> Split view, March on the left, April on the right. The Groups summary says the same thing as
> the report: 35, 65, 39 new, 9 lost, 26 matched, 26 of the new ones single accounts. Same numbers
> in two places, they agree. Good.
>
> The table: Grew / Shrank / New in April. Community 1, 297 to 359, +62. Community 27 doubled, 52
> to 107. There's a "holds in April's re-runs, 0 to 1" column -- Community 33 is 1.00, Community 25
> is 0.44. I think that's how stable the group is when it reruns. I'd guess anything under half I
> wouldn't put in the deck by name.
>
> Lost groups table: Community 13, 86 accounts, most now in Community 36; 19 went to 8; and so on.
> That's the "9 lost" with where they went. That's the part a director will ask about: "where did
> the northern cluster go?" -- "it merged into this one." I can answer that.

### 10. The agreement numbers -- this worries me

> "Agreement: 3 in 10 pairs of accounts that shared a group in March still share one in April."
> Three in ten? That sounds terrible. Then: "two runs on March's data: 6 in 10. Two runs on
> April's data: 7 to 8 in 10."
>
> So if I run Louvain twice on the SAME month, only 6 in 10 pairs stay together. That's the thing
> that burned me in Python. At least it's telling me instead of letting me find out in a meeting.
> But how do I say this to a director? "The groups changed more than they'd change from just
> rerunning, but rerunning also changes them a lot"? That's the stats lecture I'm trying to avoid.
>
> "Pairs of accounts" -- I had to read that twice. I get the idea but I couldn't explain the
> number in one breath. I'd leave it out of the slide and keep it in my notes.
>
> The "without the 26 silent in April" row also says 3 in 10. So the silent accounts aren't what's
> driving the low agreement. OK. So the count jump is mostly the singletons, but the membership
> churn is real, or noise, or both. I'd want one line that says which, in plain words.

### 11. Writing the explanation

> There's an Add note... on the community. I'd write my explanation in the project notes so it's
> still there next month.

The note he dictated (every number read off the screen):

> Groups went from 35 in March to 65 in April. 26 of the new ones are accounts that made no
> transfers in April; each sits on its own, so the algorithm counts it as a group of one. Leaving
> those out, 13 new groups formed and 9 March groups merged into others (list attached), so the
> real count is 39. Membership shifts a lot between months, but also between two runs on the same
> month, so I'm only naming groups that hold in the re-runs.

> I wish it had given me that sentence. It gave me all the numbers for it, which is almost as good
> and a lot better than Gephi, but I still had to do the arithmetic -- 65 minus 26 -- myself. And
> I'd really like a switch to just not count the dead accounts as groups, or to see the count with
> and without them. I'd do that in Python otherwise.

### 12. The rest of the storyboard (glanced at, not needed for the task)

> Rest is the mule-ring investigation stuff, and an export with a methods text file. "Louvain:
> weighted by amount, direction ignored, seed 11, with 5 seeded re-runs (seeds 12 to 16)." Seed
> is written down. That's the thing I'd paste into the appendix. Good.

(On the version-history screen he noticed the project was named "Payments network review" and the
April version was dated May 4, while the weekly screen said "Case 0314" and "today 09:14". "Is this
the same project? I assume it's just a different mock-up." No effect on the task.)

---

## After the task

**Single Ease Question (1 very difficult -- 7 very easy): 6.**

> What took longest was the agreement block -- working out what "3 in 10 pairs" means and whether I
> should be worried -- and doing the "65 minus 26" myself. Getting April in was quick: three menu
> levels, pick the files, one screen where the counts matched my SQL, Load. And the answer to "why
> did the groups change" was on the screen the moment it finished, before I went looking. I lost a
> point for the stray "Add data" screen in the middle of my path and for having to translate the
> stability numbers for a director.

**Would you use this instead of your current tool?**

> For this job -- the monthly refresh -- yes, if IT signs off on it. This is literally the Gephi
> half I redo by hand every month: colours kept, layout kept, the groups carried over with their
> old names and colours, and a report of what didn't carry. The first month I'd still run Louvain
> in NetworkX next to it to see the counts match. If they match, I'd drop the Gephi step. I'd keep
> Python for the heavy stuff and for anything where I need to exclude the dead accounts before
> grouping, until this tool lets me do that.

---

## Problems observed

| Where | What happened | Severity (1 minor -- 4 blocks the task) |
|---|---|---|
| Comparison, Agreement block | "3 in 10 pairs of accounts that shared a group" was read twice and still not something he could say aloud; the same-month rerun figure (6 in 10) alarmed him without telling him whether the month-to-month change is real or noise. | 3 |
| Replay report and comparison | Everything needed for the explanation is there, but no line gives the count with the one-account groups left out; he did 65 - 26 = 39 himself and wanted a switch to not count accounts with no transfers as groups. | 2 |
| Weekly storyboard, the "Add data: April files" frame | Shown in the middle of the Update path, so he thought for a moment he had clicked the wrong menu item. | 2 |
| Main menu | Update with new data is three levels deep (menu, File, Update) for a monthly task; he found the one-click button in the Data panel only on another screen. The File menu order also differs between the weekly screen and the replace-and-recipe screen. | 2 |
| Replay, size legend | Degree size domain refits to April (0 to 842, was 1 to 907), so March and April slides are not on the same size scale; no visible way to keep March's. | 1 |
| Version history screen | Different project name and dates from the weekly screen made him ask whether it was the same project. | 1 |

## What pleased him

- The load step's side-by-side counts against March, which matched his SQL numbers and reconciled
  (found by id + new = April; found by id + not in April = March).
- "26 accounts have no transfers in April... each will be a component of its own" warned him
  before the load, and the replay report then tied the 26 straight to the group count.
- "Louvain communities -- Replayed; 65 groups, was 35" in the results list, and the replay report
  sentence "26 of the new groups are single accounts with no April transfers."
- The lost-groups table saying where each vanished March group went.
- Group names and colours kept by overlap, so Community 1 is still orange.
- The slow result named before the load, then run with a progress bar and a Cancel.
- "Nothing is sent" repeated at the file picker, where he loads the file.
- The seed and the five seeded re-runs written in the methods text.
