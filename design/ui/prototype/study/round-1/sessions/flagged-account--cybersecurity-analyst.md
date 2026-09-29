# Session: a flagged account, clear or refer -- Priya, SOC threat hunter

**Participant:** Priya, senior threat hunter at a regional bank (study persona "cybersecurity
analyst"). Covers the alert queue when someone is out, so a flagged-account alert is familiar work
even though her day job is hunting.

**Task as given:** "An alert flagged account ACC-365386. Decide whether to clear it or refer it,
and keep what you would need to justify that."

**Screens available, in order:** Find, Inspector, Filter chip and its steps, Notes panel, Export
dialog. Read as static renders at 1440 by 900, dark theme where one existed (she runs dark
everywhere); each page's HTML was read only to see what a control would do when clicked.

**Outcome:** failed. She never got the account on screen in a working view. She found it once, as
row 8 of a table inside an export preview for someone else's case, and could not decide clear or
refer from anything the screens showed. SEQ 2 of 7.

---

## Transcript

### Before anything

> "Same three questions as always. Is this approved, where does it run, does it phone home. Nothing
> on this first screen tells me. There's an 'Assistant' icon on the left rail -- I'm not touching
> that. In a real trial I'd stop here. Fine, it's a study, keep going."

### Screen 1: Find

She reads the header first: **Les Miserables**, "Filtered: 28 of 77 nodes, 3 steps", a table of
Valjean, Fantine, Thenardier.

> "OK... this is a novel. Where's the account data? The alert says ACC-365386. There's no alerts
> list, no case, nothing that says 'you got here from an alert'. I'd expect to land on the flagged
> entity, not on a book."

She tries the keyboard first: "/" and Ctrl+F. The Find box has focus in the first state already,
with the placeholder "Name, id or value" and a tooltip that says it finds nodes, edges, sets,
paths, results, style layers, attributes, notes and views by name, id or value, and that you can
paste a list of ids.

> "Good, it takes ids and a pasted list. That's the first thing I'd do with an IOC list. I'll
> paste the account."

She types ACC-365386. The closest state the mock has is "No match": "0 results in all 77 nodes",
with a "Closest:" suggestion.

> "Zero in 77 nodes. Of course -- it's searching the book. It doesn't tell me the account exists
> in some other graph in this project, or that I've got the wrong file open. Does Find search
> across graphs? The tooltip says 'nodes, edges, sets...', doesn't say 'in every graph'. So I
> don't know if zero means 'not in your data' or 'not in this tab'. That's exactly the kind of
> zero I don't trust."

She clicks the "Les Miserables" title dropdown, expecting a file or graph switcher. The HTML
shows nothing wired to it in this mock.

> "Can't switch data from here. I'd be hunting for a File menu now. Ninety seconds on a control I
> can't find and I'm done with it."

She notices the "Hits outside the filter" state while scanning the state strip: typing "ma"
shows 14 results, 10 of them marked "Filtered out by 'Filter to degree >= 5'" with an "Edit
step..." button.

> "That, I like. It tells me the hit exists but my filter is hiding it, and which filter. Half the
> time in Splunk the answer to 'why don't I see it' is a stale where clause. That's a real save.
> Doesn't help me today though."

She also sees "A verb typed into Find": typing "betweenness" offers "Run Betweenness
centrality..." as a command.

> "Search box doubles as a command box. Fine. Still not a query box. I can't type
> 'flagged = true AND riskScore > 90' anywhere I've seen yet."

### Screen 2: Inspector

The first state is a protein graph, TP53. She skims past it.

> "Proteins. Different data again. I'm going to assume the inspector is the same wherever I go.
> Right side: name, attributes with rank -- '#2 of 300' -- memberships, 'Select neighbors, 1 hop:
> 33 nodes' before I press it. That's the thing I wanted in the Sentinel graph -- tell me how many
> I'm about to pull in before I pull them in. That's genuinely good."

State 9 finally shows money: **Transfers, March 2026**, 3,000 accounts, a set called "Mule ring,
fixed, 14", the inspector with "flagged 13 of 14", "amount, edges $9,540,249.05", and a table
of ACC-393859, ACC-697114, ACC-527694, ACC-293071, all merchants.

> "Here we go. This is the kind of data the alert came from. 'Flagged 13 of 14' -- flagged by
> what? The rule? A person? And which one of the 14 isn't flagged? I'd want the alert reason next
> to the account, not a boolean."

> "My account isn't in this selection. I want to click 'Mule ring' and see if ACC-365386 is in it.
> The mock doesn't go there. If I could, I'd expect the inspector to show me: flagged yes, rule
> that fired, riskScore, and the transfers in and out -- with dates and amounts."

She looks for a time range anywhere on the Transfers screen.

> "'Transfers, March 2026' in the title. That's the only time I get. No time range control, no
> first-seen / last-seen on the account, and the edges -- the actual transfers -- don't show a
> timestamp column anywhere I can see. Refer-or-clear on a mule alert is a timing question: money
> in, money out, how fast. If I can't see the hops in order I can't make the call."

### Screen 3: Filter chip and its steps

Back on Les Miserables. The chip opens a "Filter steps" panel: "Filter to Largest component 76",
"Filter to degree >= 5 41", "Filter out group = 8 28", each with a checkbox and a running count.
Editing a step opens dropdowns (degree, >=, 5), "Scope: After step 1: 76 nodes", "Result: Leaves
41; takes out 35", and "Add note".

> "OK. This is a pipeline. Each line is a where clause with its count after it. That's how I
> think in SPL -- search, then pipe, pipe, pipe, and I watch the count drop. I like the count on
> every step and 'takes out 35'. That's the audit trail I'd want."

> "But it's dropdowns. Degree, greater-or-equal, 5. Where do I type it? Can I see the step as
> text, copy it, paste it into next month's hunt? The 'Add note' on a step is nice -- I'd write
> 'excluded group 8 because...' right there."

> "For this alert I'd want 'Filter to: account = ACC-365386 plus 2 hops', then 'Filter to:
> timestamp in last 72 hours'. I don't see a time step type in anything on this screen. Might
> exist, can't tell."

### Screen 4: Notes panel

Protein data again. Notes listed on the left: "About TP53 neighborhood, 33 proteins", each note
with a subject, age ("2h", "1d", "Sep 24"), text, and "Cites Betweenness, full graph". An opened
note shows "CITES Betweenness full graph" and "QUOTES TP53 betweenness 0.114".

> "This is closer to my notebook than I expected. The note is attached to the thing, and it cites
> the number it's based on, with which graph -- 'full graph'. If that quote updates or flags when
> the number changes, that's actually how I'd want to justify a referral: 'riskScore 92, eight
> counterparties, three of them in the ring, moved $X in Y hours.'"

> "What I don't see: a verdict. Clear, refer, true positive, benign positive. I'd type it into the
> note text, fine, I do that in my notebook anyway. But I can't find all my 'refer' notes later
> unless I tag them myself. And I can't tell who wrote a note -- on a shared case that matters."

> "Also, where's the history? 'My notebook shows every query I ran.' Notes aren't that. The filter
> steps are half of it."

### Screen 5: Export dialog

The page opens on a manuscript figure (proteins, transparent PNG, legend). She scrolls for
anything case-shaped and stops at **"5. The evidence file"**: scope "Filtered: 14 nodes, 1 step:
in Mule ring suspects", a "Findings report" row, and a preview titled "Page 1. Boundary" listing
14 accounts. Row 8 is **ACC-365386, personal, GB, riskScore 92, degree 8, PageRank 0.000385**.
The footer says "1 file goes to your Downloads folder. Nothing is uploaded."

> "There it is. My account. Row eight of somebody else's case -- the file is named
> case-acc-233575. So ACC-365386 is in a 14-account set someone called 'Mule ring suspects'. That's
> the most useful fact I've had all session and I found it in an export preview."

> "'Nothing is uploaded.' Good. That's the first time the tool has answered one of my three
> questions. Put that on the first screen, not the last dialog."

> "The report's structure is right: boundary first, the views with their notes, then methods --
> 'transfers-2026-03.csv: 3,000 accounts, 9,113 transfers, directed. PageRank, exact, on the full
> graph.' That's what a referral needs: what data, what time, what method. I'd hand that to my
> lead."

> "Now, the pink tags. 'waits on graphty-element: findings report', 'waits on graphty-element:
> graph-file export'. I don't know what graphty-element is. To me that reads as 'this doesn't
> work'. Is the findings report something I can click today or not? And the file format is
> 'the owner's decision'. Which owner? Me?"

> "And CSV. 'Nodes table' and 'Edges table' are there, unchecked. OK, that's my way out to
> Splunk. The edges table is where the timestamps would be. I'd tick that first, honestly, and do
> the timeline in my notebook."

> "PageRank to five decimals. Nobody on my team knows what 0.000385 means. RiskScore 92 they
> understand. Why is PageRank in the evidence at all?"

### The decision

> "Refer. Not because of anything I worked out in here -- because the account shows up in a set
> somebody already called a mule ring, riskScore 92, flagged. If I only had these screens I'd be
> referring on someone else's judgment. I never saw its transfers, never saw a time, never saw who
> it paid. I'd have to export the edges CSV and go do the actual work in my notebook."

> "What would I keep? The evidence file preview is what I'd want to keep -- except I'd want my own
> account first, not row 8 of case 233575, and I'd want the transfer list with times and amounts
> in it."

---

## After the task

**Single Ease Question:** 2 of 7.

> "Two. Not one, because once I stumbled onto the evidence export it was obviously built by someone
> who's seen a case file. But getting from an alert to the account was impossible here: the search
> said zero, the screens kept switching to proteins and a novel, and I never saw a single
> transfer."

**Would she use it instead of her current tool?**

> "Not instead of. Maybe beside the notebook, for the pivot -- 'show me who this account touched,
> and tell me how many before you pull them in' is the part a graph does better than my table.
> The filter steps with counts and the notes that cite their numbers are better than what I get in
> Sentinel's graph. But a flagged-account alert needs three things I didn't see: land me on the
> account from the alert, a time range on everything, and the account's transfers in time order.
> Plus a box I can type a query into. Until then I export the edges and do it in pandas."

---

## Problems observed

1. **Find, "No match":** searching the flagged id returns "0 results in all 77 nodes" with no hint
   that the id exists in another graph or file. She could not tell "not in your data" from "wrong
   graph open". Severity 4.
2. **Whole flow:** no entry from an alert. Nothing names the alert, the rule that fired, or lands
   on the flagged account. Severity 4.
3. **Transfers screens (inspector, evidence file):** no time range anywhere except "March 2026"
   in the title; no transfer list with timestamps and amounts on the account. Clear-or-refer
   could not be decided. Severity 4.
4. **Inspector, Transfers selection:** "flagged 13 of 14" is a bare count; no reason or rule for
   the flag, and no way to see which member is not flagged. Severity 3.
5. **Export, evidence file:** the flagged account is only visible as row 8 of another case's
   report, named after a different account. No way to start the case from ACC-365386. Severity 3.
6. **Export dialog:** pink "waits on graphty-element" tags and "file format: the owner's decision"
   read as broken or internal; she could not tell whether the findings report works. Severity 3.
7. **Filter steps:** rules are built from dropdowns only; no text form to type, copy or reuse
   next month. No visible time-range step. Severity 3.
8. **Notes:** no verdict field (clear / refer / true or benign positive) and no author on a note;
   no record of what was searched. Severity 2.
9. **First screen:** "runs locally, nothing uploaded" appears only in the export footer; the
   first screen does not answer where it runs or whether it calls out. The "Assistant" rail item
   adds doubt. Severity 2.
10. **Evidence table:** PageRank to six decimals in a referral means nothing to her lead; riskScore
    does. Severity 1.

## What worked for her

- Find explains hits hidden by a filter and names the step, with "Edit step..." beside it.
- "Select neighbors, 1 hop: 33 nodes" tells her the size before she expands.
- Filter steps show a count after every step and "takes out 35", like a piped search.
- Notes cite the number and the scope they are based on.
- The evidence file's order (boundary, views with notes, methods with the source file and method)
  and "Nothing is uploaded."
