# Did anything leave? -- Marcus, criminal intelligence analyst

Participant: Marcus, 44, criminal intelligence analyst at a state fusion center (persona:
study/personas/intelligence-analyst.md). Simulated session on the mocks.

Task as given by the moderator: "Your IT reviewer asks whether this tool sends data anywhere.
Answer from the app, then again after running a data-source query, and forward something they
can read."

Screens: the open project (frame-at-rest), the start screen, and the "Where your data goes" page
(data-location), in that order.

## Think-aloud

**1. The open project.** OK, Les Miserables, whatever that is, a sample. First thing I look for
is where the data lives, because that is the only question IT is going to ask me. Top left,
under the name: a little lock and "This browser. Nothing sent." Good. That is the first tool
that has put that on the screen instead of in a EULA. That answers my IT guy's first question in
four words.

But he is not going to take four words from me. "Nothing sent" according to who? I click the
line, expecting it to open something that says more. Nothing. It is just text. Huh.

So where is the detail. File chip, "miserables.json" -- I click that, because that is the file
and the question is about the file. Popover: "This browser. Nothing sent. Projects are kept in
this browser. Where your data goes..." There it is. Took me two tries. Would not have guessed the
file chip was where the privacy page lives. I found out afterwards it is also under the menu,
Help, "Where your data goes". I did not look in Help. Nobody looks in Help.

**2. The start screen.** Went back to check it from the front door too. "Files stay on this
computer. graphty reads them in this browser and uploads nothing. Where your data goes." That is
the right sentence, in the right place, before I drop anything in. That link is what I would
have clicked first if I had started here.

**3. The page.** "Where your data goes." Opens in its own tab, has "Copy link" and "Print or save
as PDF" at the top. That is the thing I forward. Our IT guy wants a PDF with a date on it, and
it says "Describes graphty 2.0. Updated September 28, 2026." Good -- that is what he will quote
back.

"In short" box: files not uploaded, no account, no server; data leaves only through two features,
both off until you turn them on: "Connect to data source" and "the Assistant". Projects kept in
this browser, this computer only. That is three lines I can paste into the ticket as is.

Table of what leaves. Connect to data source: the query and the sign-in, to the address I enter,
"not by graphty". The Assistant: my question, the counts, column names, up to ten values,
node names -- to Anthropic, OpenAI or Google. OK. That row is the one that ends the conversation
at my shop. Case data does not go to an AI company, period. It is off by default, fine, but my
IT guy is going to ask can he turn it off for everyone, so nobody on the task force switches it
on by accident. The page has a pink box there: "Owner decision open: whether an organization
can switch the Assistant off centrally." So the answer is "not yet". That is a no, as far as a
reviewer is concerned.

Then the other pink boxes. "Opening graphty -- where graphty is hosted -- owner decision open."
"Usage statistics and crash reports -- owner decision open." "Running your own copy inside your
network -- owner decision open." Those are exactly the three things IT asks after "where does
the file go". Who hosts it, does it phone home, can we run it on our own box. If I forward this
page today he reads three "we have not decided" and the ticket sits for a month. I get that
this is a mock and somebody still has to fill those in -- but that is where the whole approval
lives.

"Check it yourself: open the browser's developer tools, Network tab." I am not doing that, but
my IT guy will, and he will like that it tells him to. That sentence buys trust.

"What this page does not promise" -- clearing site data deletes your projects, it is not a
certification. Honest. Would have liked the word CJIS somewhere, even to say "this page is not a
CJIS attestation", because that is the word he is going to search for.

**4. After a data-source query.** The page shows what the line under the project name says
after a query: "Sent to neo4j.internal.example: 1 query", with an upload arrow instead of the
lock. Good: it names the server, not "a data source". If that is our records server I can tell
IT "it went to our own box and nowhere else".

Except it does not say "nowhere else". The lock line went away and got replaced. Before, it
said "Nothing sent." Now it says one thing was sent. I have to infer that nothing went to
anybody else. I would rather it said "Sent to neo4j.internal.example: 1 query. Nothing else
sent." Belt and braces, that is what the reviewer wants to see in a screenshot.

And "1 query" -- which query? For the Assistant there is a "See what was sent" that lists the
question and every name. For the database query there is no such link, just the count. If IT
asks "what did it send to the server" I want to show the query text, and the password did not
go with it into anything stored. The page's table says the password is kept in memory only and
goes only to that server. Fine. But on the screen, I cannot see the query itself.

Version history has each send as a line, "Sent to neo4j.internal.example, 1 query, Today 13:47",
and "Export log" writes the list to a file. That is the audit trail. That I would attach to the
case file and to the ticket. Did not see what format the file is -- if it is something I cannot
open in Excel, it is useless to me.

**5. Forwarding.** Copy link or Print or save as PDF. I would print to PDF, because a link to a
website is exactly what IT does not trust, and the PDF has the version and date on it. Attach
it, plus the exported log after a query. Done.

## After the task

**Single Ease Question: 5 of 7.** The answer was on screen from the first second and the page to
forward is the best version of that page I have seen from any vendor. Lost a point because the
lock line itself does not open anything and I had to find the page through the file chip. Lost
another because the page, as it stands, leaves the three questions IT really cares about --
hosting, phone-home, self-hosting -- as "not decided".

**Would I use it instead of my current tool?** Not instead of i2 -- there are no phone icons,
no timeline with theme lines, it does not open my .anb. But on this particular question, it
beats everything I use. i2 and Excel never had to answer "where does my data go" because they
are installed. A website does, and this one answers it better than any web tool I have had
pitched to me. If the pink boxes come back "self-host yes, no telemetry, Assistant can be locked
off by the admin", I would put in the ticket. If any of them come back the wrong way, it is dead
at my agency no matter how good the page is.

Quote: "'This browser. Nothing sent.' -- best four words on the screen. Now make them clickable,
and fill in who hosts it and whether it phones home, because that is the whole ticket."

## Problems

| Where | What happened | Severity (1-4) |
|---|---|---|
| "Where your data goes" page | Hosting, usage statistics and crash reports, self-hosting and central Assistant switch-off are all shown as undecided -- the exact questions an IT reviewer asks, so the forwarded page cannot get approval as it stands | 3 |
| Open project, lock line under the name | "This browser. Nothing sent." is plain text; clicking it does nothing. The page is reached only through the file chip popover or Help in the main menu | 2 |
| After a data-source query, the line under the name | "Sent to neo4j.internal.example: 1 query" replaces "Nothing sent" and does not say nothing else went anywhere; the reviewer has to infer it | 2 |
| After a data-source query | No "See what was sent" for the query (the Assistant has one); the query text is not visible, only "1 query" | 2 |
| Version history, Export log | File format of the exported log is not stated | 1 |
| "Where your data goes" page | No mention of CJIS, the word a law-enforcement IT reviewer searches for, even to say the page is not a CJIS attestation | 2 |
| "Where your data goes" page, the Assistant row | Names Anthropic, OpenAI and Google; for criminal justice data this row alone stops approval unless an admin can lock it off | 3 |
