# Did anything leave? -- Nadia, level-1 alert reviewer

Task as read to the participant: "Your IT reviewer asks whether this tool sends data anywhere.
Answer from the app, then again after running a data-source query, and forward something they
can read."

Participant: Nadia, transaction monitoring analyst, fourteen months in, level 1. Clears or
escalates alerts; does not choose tools. Viewport about 1536 by 740 (125 percent scaling on a
1080p monitor).

Screens seen, in order: the project at rest (Transfers, March 2026), the start screen, the Data
panel scrolled to "Sent and saved from this project", and the "Where your data goes" page
including the pictures at its foot of what the app shows after a data-source query and after
Assistant questions. There is no full screen of the app after a real data-source query; the
after-query answer comes only from those pictures.

Renders used: shots/tasks/did-anything-leave/01-frame-at-rest.png, 02-start-screen.png,
03-data-location.png; shots/record/r6-nadia-leave-data-location.png (whole page at her viewport);
shots/record/r6-nadia-leave-data-panel-s7.png (Sent and saved at her viewport).

## Think-aloud

**1. The project at rest.**
"OK, IT wants to know if this thing sends our data anywhere. This is customer transaction data,
so that is a fair question, and honestly the first thing QA would ask too."

"Top left, under the name: 'Nothing has been sent from this project.' Underlined, so I can click
it. And down the left side, under Assistant: 'Off. Nothing is sent.' That's two places saying
the same thing. Good. That took me about five seconds."

"But 'nothing has been sent' -- from this project. Is that what IT asked? They asked about the
tool. If I open a different project, does it reset? I'd guess it's per project. I'll click it."

**2. Clicking the line: Data > Sent and saved.**
"It opened a panel. 'Sent: nothing. The Assistant is off and no data source is connected.' Then
a link, 'Where your data goes'. Fine."

"Then underneath: 'Who hosts graphty, and where: Not decided yet.' 'Usage statistics and crash
reports: Not decided yet.' 'Assistant off for a whole organization: Not decided yet.'"

"Hmm. That is not something I want to send IT. 'Not decided yet' on who hosts it? If I forward
that, the ticket comes back to me with one line: so where does it run? And I can't answer that.
At least it's honest. But it reads like the tool isn't finished."

"Also the project name changed -- this one says 'Payments network review' and April, the other
one was 'Transfers, March 2026'. I assume it's a different project. Not my problem right now."

"Below that: 'Saved to this computer' -- a list of files, an SVG, a CSV, a recipe, a project
file. OK, so this is also what I saved. That's actually useful for QA: what did I export and
when. But for the IT question I only care about the top box."

**3. 'Where your data goes' page.**
"Opened a page. 'It is written so you can forward it to whoever approves software where you
work.' OK, that's literally my task. 'Copy link' and 'Print or save as PDF' at the top. I'd
print to PDF and attach it to the ticket. IT won't click a link from me anyway, they'll want a
file."

"'In short': files are read by the browser and not uploaded, no account, no server. Data leaves
only through two features, off until you turn them on: Connect to data source, and the
Assistant. Projects kept in this browser. No password or key in the log or in a project file.
That box is the answer. If IT only reads four lines, that's the four."

"The table 'What leaves this browser' -- Connect to data source: 'The query you write ... to the
source at the address you enter, run by whoever runs it -- not by graphty.' OK. So if it's our
own internal database, it's going to our own server. IT will like that. 'Data-source password:
kept in memory until you close the tab.' Good, that's the question they always ask."

"'Opening graphty -- nothing from your files -- to: Where graphty is hosted.' Where is that?
That's the same hole as before. It just says 'where graphty is hosted' like I should know."

"Further down, 'What graphty does not send': 'Usage statistics and crash reports:' -- and
nothing after the colon. Blank. And 'For organizations': 'Running your own copy of graphty,
inside your network:' -- blank. 'Turning the Assistant off for everyone in an organization:' --
blank. 'Questions this page does not answer: Contact' -- contact who?"

"This is the page I'm supposed to forward, and it has three empty lines on exactly the things IT
will ask about. Crash reports is the first thing security asks: does it phone home when it
breaks? In the app panel it at least said 'Not decided yet'. Here it says nothing, which looks
worse -- like somebody deleted the answer. I would not send this as-is. I'd send it and write
'I don't know' next to the blanks, and then it becomes my ticket."

"'Check it yourself: open your browser's developer tools, Network tab.' I can't, the laptop is
locked down. IT can. I'd leave that in, it's for them."

**4. After a data-source query.**
"I don't run data-source queries. Our data comes from the case system, and I'd paste an export
in. But if I did -- the pictures at the bottom show it."

"The line under the name now says 'Sent to neo4j.internal.example: 1 query. Nothing else.'
Plug icon, chip 'neo4j.internal.example'. I don't know what neo4j is, but the '.internal' part
tells me it's ours. 'Nothing else' -- that's the important bit, it says it didn't go anywhere
else at the same time."

"Next picture: after Assistant questions too, 'Sent: 1 query to neo4j.internal.example, 2
questions to the Assistant. Nothing else.' Same place. Good, it doesn't move."

"Then the Sent list: 'Question to api.anthropic.com, 40 node names, 3 statistics, 14:09', and so
on, and 'Query to neo4j.internal.example, 1 query, 13:47'. Each with an eye. And 'Export log'
top right. So that's what I'd attach: the log, for what actually left, and the PDF of the page,
for what can leave. Two files. I'd rather have one, but two is fine for a ticket."

"The detail for the Assistant one: 40 node names -- those are account numbers. ACC-365386 and so
on. If someone turned the Assistant on, account numbers go to an outside company. IT will stop
right there. But it's off, and it says it's off, and the log shows exactly which ones. That's
more than our case system tells me."

"'1 query' -- what query? I'd expect IT to ask what was in it. I assume the eye shows the query
text. I can't click it in the picture so I'm guessing."

"I can't actually tell from these pictures whether Export log gives a PDF or a spreadsheet or
what. 'Writes the list to a file.' OK. If it's a CSV, fine, IT can open it."

**5. Forwarding.**
"What I'd send: 'It doesn't upload files. It only sends data if you connect a data source, which
goes to our own server, or turn on the Assistant, which is off. Attached: their page and the
log.' Three lines. That I can write."

"What comes back: 'Who hosts it? Does it send crash reports? Can we turn the Assistant off for
everyone?' And I'd have no answer, because the page left those empty. So it's answered for me,
not for IT."

## Single Ease Question

**5 of 7.**

"Finding out it sent nothing was easy, five seconds, it's written right under the name. The
after-query line is also clear. I lose points on the page I'm meant to forward: it has blank
lines where IT's questions go, and the app says 'Not decided yet' for who hosts it. If those
were filled in I'd give it a 6. Not a 7 because I'd still be sending two files and I'm not sure
what's in '1 query'."

## Would you use this instead of your current tool?

"For this question there is no current tool -- today I'd forward the IT question to my team lead
and wait. So yes, this is better than that, as long as the blanks get filled. But I'm not the
one who decides whether we use it. IT decides, and right now their first three questions land
on empty lines. For the actual alert work, I'd only open it when the counterparties matter, and
only if it doesn't add a minute to every alert."

## Observations for the moderator (behaviour, not opinion)

- Found the at-rest answer from the line under the project name in about five seconds; also
  read the rail's "Assistant Off. Nothing is sent." as confirmation.
- Clicked the line and read "Not decided yet" three times in the Sent and saved panel; read it
  as the tool being unfinished and something she could not forward.
- On the forwardable page, read "Usage statistics and crash reports:", "Running your own copy
  of graphty, inside your network:" and "Turning the Assistant off for everyone in an
  organization:" as blank lines with nothing after the colon, and "Where graphty is hosted" as
  a non-answer. She treated the blanks as worse than "Not decided yet". She said she would not
  forward the page as it is.
- Chose "Print or save as PDF" over "Copy link" because IT wants an attachment, not a link.
- Understood the after-query line and "Nothing else" from the pictures alone; did not know what
  neo4j is but used ".internal" to decide it stayed in the bank.
- Planned to forward two files (page PDF plus exported log) and said one would be better.
- Asked what the "1 query" contained; guessed the eye shows it.
- Noticed that the Assistant's send lists account numbers; called it an IT stopper if on, and
  a strength that the log names them.
