# Grades: select every flagged account in Great Britain

Task as given: "March's card transfers are open (example data if you do not work in banking).
Pick out, all at once, every account in Great Britain that was flagged, so you can work on just
those. Say how many there are."

Intended path: from the loaded transfers graph, type the rule in Quick actions or in the search
box at the top of the Graph list and take the offered "Select where"; or open Main menu > Select
where..., or a column's "Select where ... is...". Build country == 'GB' and flagged == true, read
"1 of 3,000 nodes match", press Select 1, and state the count.

Grading rule: what ended on screen and what the participant concluded, not what they believed.

- Success: reached the Select dialog through one of the doors above in no more than two tries,
  wrote the rule in no more than two tries, selected 1 and said 1.
- Success with difficulty: filtered first and then switched to a selection, needed more than two
  doors, or needed more than two tries at the rule's wording.
- Failure: selected by hand, or filtered the graph believing it was a selection, or ended with a
  wrong count.
- Gave up: stopped without a selection and said so.

## Results

| Participant | Their call | Graded | Why |
|---|---|---|---|
| Fraud analyst (Sarah) | success with difficulty | **success with difficulty** | Dead ends on the table, a filter step ("country is GB" stayed at 3,000 of 3,000), Selection, the search box and two menus. Found "Select where country is..." under the three dots on the country attribute page. Four tries at the rule: "+ condition" wrote "country and flagged" (Select 0), then a bare "flagged" matched nothing, then the full rule worked. Final render 28: "Selected 1 of 3,000 nodes where country == 'GB' and flagged == true"; she answered 1. |
| Intelligence analyst (Marcus) | success with difficulty | **success with difficulty** | Table, filter step, search box, Selection and the More menu were dead ends. Found "Select where..." only by guessing Ctrl+K. Cleared the prefilled rule, typed his own first time: 1 of 3,000. Pressed Select 1 and answered 1, with low confidence. |
| Marketing analyst (Jordan) | success with difficulty | **success with difficulty** | Attribute page gave "true, 14 accounts" (not clickable); filter step and search box were dead ends. Found Quick actions by hovering the bottom toolbar, typed "select", took "Select where...". "+ condition" appended to the prefilled rule; she wiped it and typed the rule herself. Final render 24: Select 1 done; answered 1. |
| Knowledge engineer (Dr. Kim) | success with difficulty | **success with difficulty** | About 30 attempts. The filter step left 3,000 of 3,000, and clicking that count swapped the whole dataset for Les Miserables (render 20). Restarted, found "Select where country is..." by right-clicking the country header. Three tries at the wording (cursor placed before the prefill, then "&&" silently failed, then "and"). Final render 32: Select 1 done; answered 1. |
| Screen-reader analyst (Morgan) | success with difficulty | **success with difficulty** | Table, filter step (unnamed value box), Selection, the search box and Analyze were dead ends. The "?" shortcut page showed Ctrl+K; Quick actions gave "Select where". Typed onto the prefill once, then cleared and wrote the rule. Final render 27: Select 1 done; answered 1. |

**Totals (5 participants):** 0 success, 5 success with difficulty, 0 failure, 0 gave up.
Completion 5 of 5; nobody took a direct path. Every participant tried the filter first and
abandoned it before it changed anything, so nobody confused a filter with a selection. Ease
ratings (1 = very difficult, 7 = very easy): 2, 2, 2, 2, 3; median 2. All five answered "1", and
all five said they were only moderately confident in it.

All five grades match the participant's own call.

## Doors used to reach the Select dialog

| Door | Participants |
|---|---|
| Quick actions (Ctrl+K), found by guessing the shortcut, a toolbar hover or the "?" page | 3 (Marcus, Jordan, Morgan) |
| A column's menu: "Select where country is..." (attribute page three dots, or right-click on the column header) | 2 (Sarah, Dr. Kim) |
| Search box at the top of the Graph list | 0 |
| Main menu > Select where... | 0 |

The search-box door, the one the spec counts on, was used by nobody. Four of five typed into it,
but they typed a value ("GB"), not a rule, and got "No match for GB" with no offer to select.

## Findings, with evidence counts and severity (Nielsen 0-4)

1. **"Select where" is not visible from where people start. Severity 3.** 5 of 5 searched the
   Graph page, the table, the Selection row and the More menu for a way to pick by a value. Nobody
   opened the main menu. Three reached the command only by guessing a keyboard shortcut; two
   through a column menu reached by three dots or a right-click on a header scrolled out of view.
   All five asked for it next to the search box or on the table header.

2. **The search box does not offer a selection for a value. Severity 3.** 4 of 5 typed "GB" into
   "Find rows and notes" and got "No match for GB". The box searches the Graph list, not the data,
   and its word "rows" reads as data rows to people who live in tables (Dr. Kim said so
   explicitly). The spec's search-box door only fires on a typed rule, which nobody tried.

3. **A filter step on a value that does nothing gives no explanation. Severity 3.** 5 of 5 built
   "country is GB" in the filter, and 4 of 5 confirmed it: the step kept "3,000 of 3,000 nodes",
   the drawing did not change, and no message said whether GB was absent or the step had not run.
   Every participant abandoned the filter here, which is the right outcome for this task but for
   the wrong reason.

4. **No list of a column's values anywhere on the path. Severity 3.** 5 of 5 had to guess the
   spelling (GB, UK, GBR, United Kingdom). The filter value box is free text with no suggestions,
   the country attribute page shows no values or counts, and the query box has no value help.
   Only Dr. Kim saw real values (US, FR) after scrolling the table. The flagged attribute page did
   show "true, 14 accounts", and Jordan tried to click it to select them: 1 of 5, but it was her
   most natural move.

5. **The Select dialog opens prefilled, and "+ condition" builds onto the prefill. Severity 3.**
   5 of 5 met a prefilled query: `kind == 'personal'` with "Select 2,610" ready to press from
   Quick actions (3 of 5), or a bare "country" from a column menu (2 of 5). 4 of 5 pressed
   "+ condition" expecting a field, operator and value picker; it appended "and <attribute>" as
   text, giving "country and flagged" or "kind == 'personal' and country", which match nothing.
   2 of 5 typed onto the prefill by accident. Morgan noted that pressing Enter on open would have
   selected 2,610 personal accounts.

6. **A wrong query fails silently. Severity 3.** 2 of 5 (Sarah, Dr. Kim) wrote a query that
   matched nothing ("flagged" without "== true", "&&" in place of "and") and got a grayed
   "Select 0" with no parse message. Dr. Kim learned the grammar from the "+ condition" helper,
   not from an error.

7. **The selection cannot be seen or named afterwards. Severity 2.** 5 of 5 noted that the
   selected account is not visible on the drawing; 4 of 5 opened the table and it neither marked
   nor isolated the selected row, so nobody could name the account or confirm its country. All
   five praised the confirmation toast and the inspector repeating the rule ("I could paste that
   into my notes").

## Observations that come from the skeleton, not the design

These are artifacts of a click-through skeleton; they lowered trust in every session and should
not be read as design findings, but they need fixing before the next round so they stop
contaminating results.

- **"Not available yet: counting this query in this version."** 4 of 5 tried `country == 'GB'`
  on its own to check the answer and got this. All four said it made them trust the "1" less.
  The skeleton only counts the queries it has scripted.
- **Louvain (35 groups) and Links in (count) appear in the Graph list after Select 1.** 5 of 5
  noticed and asked who ran Louvain; three framed it as an audit or courtroom problem. The
  post-select state appears to carry rows from another scripted state.
- **Clicking the filter step's count opened Les Miserables.** 1 of 5 (Dr. Kim). A stray link in
  the skeleton.
- **Two controls named "country" in the filter's attribute picker.** 4 of 5 clicked the wrong
  one first and landed on the attribute page. Partly the click tool picking the left-panel item;
  partly a real naming clash worth fixing anyway.

## Verdict

Completion is 5 of 5 and the Select dialog itself works once found: the live count, the
confirmation and the recorded rule were the most praised parts of the session. Discoverability is
the problem. None of the doors the spec relies on most (the search box, the main menu) were used,
and every participant spent the bulk of the session in the filter and the table first. Fix order:
a visible "Select where" from the search box when a value is typed, and on the table header;
value lists with counts in the filter and the query; an empty Select dialog with a field,
operator and value builder; and a message for a query that does not parse.
