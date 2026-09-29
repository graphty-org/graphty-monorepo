# Session: "Is the database password stored anywhere, and for how long?" -- Priya, threat hunter

Participant: Priya, senior threat hunter in a bank's security operations team (persona:
study/personas/cybersecurity-analyst.md). Screen tested: "Where your data goes"
(screens/data-location.html), first screen at 1440 by 900, then scrolled. Dark theme.

Task as given by the moderator: "Your IT reviewer asks whether the database password is stored
anywhere and for how long."

Outcome: success, with some difficulty. She found the answer in about a minute and a half, but
did not trust it enough to forward it as it stood.

## Transcript (think-aloud)

**First screen.**

"OK, 'Where your data goes'. Good title, that's literally the question I'd get. 'Written so you
can forward it to whoever approves software.' Fine. Copy link, Print or save as PDF -- that's what
I'd actually do, I'd PDF it and attach it to the ticket.

'In short.' Three lines. Files not uploaded, no account, no server. Data leaves only through
Connect to data source and the Assistant. Projects kept in this browser. None of those says the
word password. Or credential. The reviewer asked about a password and the summary box -- the one
thing he'll actually read -- doesn't mention it. So I have to go digging."

**Scrolling. The "What stays in this browser" table.**

"'What stays in this browser.' Files, Projects, Exports, An Assistant key... Data-source password.
There. 'Kept in memory until you close the tab. It is never written to this browser's storage, so a
new tab asks for it again. It is sent only to the data source it signs in to.'

OK, that is actually the answer I want. Memory only, gone when the tab closes, never written to
local storage. That's the answer I'd hope for. Tab close, not browser close -- I noticed that, and
I like that it's specific.

And then right under it, pink box: 'Owner decision open: where a data-source password is kept.
Drawn here is the recommended answer, memory only.' So... it's not decided. The one row I came
here for is the one row that says 'we haven't decided this.' I get that it's a mock, but if I
forwarded this the reviewer would stop reading right there. 'Recommended' isn't a control."

Moderator reminded her the pink boxes are for the design team and would not ship.

"Fine, pretend it's gone. Then my reviewer's follow-ups, because he'll have them:

- 'Memory' -- does the browser's crash restore or session restore bring it back? If Edge restores
  my tabs after a reboot, does the new tab ask again? It says a new tab asks again, so I'll assume
  yes, but it doesn't say restore.
- Is the password ever in the project autosave? It says 'never written to this browser's storage',
  and projects are in this browser's storage, so by implication no. I'd rather it said it outright:
  'not saved in the project, not in a project file you download.'
- What about the log? Section 3 says every data-source query lands in Version history and Export
  log writes it to a file for a reviewer. 'Sent to neo4j.internal.example: 1 query.' Does that entry
  or the exported log have the connection string? If the log has the URL with creds embedded,
  that's exactly how passwords end up in tickets. It doesn't say.
- The Assistant key -- 'kept in this browser.' Kept how long? That one's in storage, obviously, and
  it has no 'for how long' at all. My reviewer will ask the same question about that key thirty
  seconds later, and the page answers the password carefully and the API key vaguely.
- 'Sent only to the data source it signs in to' -- over what? If somebody types http:// instead of
  https:// does it warn? Probably out of scope for this page, but a reviewer at a bank asks it."

**Checking the rest.**

"'What leaves this browser' -- Connect to data source: 'the password goes only to this source.'
Consistent with the other table, good. 'What this page does not promise' -- other people on the same
login, extensions, backups. That's honest, I like that it's there. A reviewer trusts a page more
when it lists what it won't cover.

'Check it yourself: open developer tools, Network tab.' That checks where requests go. It does not
check whether the password is stored. For that he'd have to look at Application, Local Storage,
IndexedDB himself. Would be nice if it said that too -- 'to check the password isn't stored, look
under Application, Storage, after you connect.' That's the thing he'll actually try."

**Wrapping up.**

"So the answer: stored in tab memory only, not on disk, gone when you close the tab, sent only to
the database. I can tell him that. I'd copy that one row into my reply rather than forward the whole
page, because the summary box doesn't mention passwords and he won't scroll to the fourth row of the
second section."

## Single Ease Question

5 of 7. "The answer's there and it's the right answer. I had to scroll past a summary that ignored
my question, and the pink 'not decided' box made me not trust it. Without that box, a 6."

## Would she use this instead of her current tool?

"This page isn't a tool, it's the thing that gets a tool through review, and most tools don't have
one. Maltego never told me what its transforms leaked. So yes, this page helps graphty get on the
approved list. But it needs the password and the API key in the summary, and it needs to say the
logs never carry credentials, or my reviewer sends it back with three questions."

## Problems observed

1. The "In short" box, the part a reviewer reads, never mentions passwords or credentials; the answer
   sits in the fifth row of the second section, below the first screen. (Severity 2)
2. The password row is visibly marked as not decided; in its present state the page cannot be
   forwarded as an answer. (Severity 3 for this mock; disappears once the owner decides.)
3. Nothing says whether the password is kept out of the operation log, the exported log, the project
   autosave and a downloaded project file; the "1 query" log entry leaves open whether the connection
   string travels with it. (Severity 3)
4. The Assistant key row says "kept in this browser" with no duration or how to remove it, while the
   password row is specific; the reviewer's next question goes unanswered. (Severity 2)
5. "Check it yourself" covers only where requests go (Network tab), not whether anything is stored
   (Application / Storage), so the storage claim cannot be verified by the reader. (Severity 2)
6. Browser session restore is not addressed ("a new tab asks again" -- does a restored tab?).
   (Severity 1)
