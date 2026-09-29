# Did anything leave? -- Priya, threat hunter (round 6)

**Task, as the moderator gave it:** "Your IT reviewer asks whether this tool sends data anywhere.
Answer from the app, then again after running a data-source query, and forward something they can
read."

**Participant:** Priya, senior threat hunter at a regional bank's SOC. Splunk and Defender all day,
a Jupyter notebook for the real work, BloodHound with raw Cypher. Production data does not leave
the bank, and anything that touches it goes through third-party review first.

**Screens seen (participant view):** the project frame at rest (Transfers, March 2026), the start
screen, Where your data goes (full page, including the pictures at the bottom), and the Data panel
scrolled to Sent and saved (Payments network review, April file).

Renders: `shots/tasks/did-anything-leave/01-frame-at-rest.png`, `02-start-screen.png`,
`03-data-location.png`, `shots/r6-priya-leave-data-location-full.png`,
`shots/r6-priya-leave-data-panel-s7.png`.

---

## Think-aloud

### 1. The project, at rest

"OK, I've got a graph open. Before I even look at it -- top left, under the project name, underlined:
'Nothing has been sent from this project.' Good, that's where I'd look. It's the same line as last
time.

'From this project.' Still bugs me. My reviewer is going to read that as 'and from some other
project?' Or 'but the app itself phones home?' It answers a narrower question than the one they
asked. They asked about the tool, not the project.

Down the rail, bottom: 'Assistant. Off. Nothing is sent.' Fine for now, both agree. I already know
from last time that this one is going to look wrong the moment I run a query, because it's scoped
to the Assistant but it doesn't say so. Let's see."

### 2. Clicking the privacy line

"Click 'Nothing has been sent from this project.' It drops me into Data, scrolled to 'Sent and
saved from this project.' Grey box: 'Sent: nothing. The Assistant is off and no data source is
connected.' And a link, 'Where your data goes.' Good, that's the answer with a reason. I like the
reason. A reviewer likes a reason.

Then underneath -- hold on.

'Who hosts graphty, and where: Not decided yet.'
'Usage statistics and crash reports: Not decided yet.'
'Assistant off for a whole organization: Not decided yet.'

...Wow. OK. That's new. 'Usage statistics and crash reports: not decided yet.' So right above it
the app tells me nothing was sent, and right below it the app tells me it hasn't decided whether it
collects telemetry. Which is it? If a vendor put that in a security questionnaire answer I would
send it straight back. 'Not decided' reads to me as 'yes, or yes later.' Telemetry is exactly the
thing that gets sent without me running a query or turning anything on, so it's exactly the thing
'Sent: nothing' is supposed to cover.

And 'who hosts graphty: not decided yet.' That's the domain Defender would allow or block. If I
don't know who hosts it, I can't even tell IT what to put in the allow list, and I can't tell them
whose infrastructure serves the code that's reading our logs.

I get that it's honest. I'd rather have honest than a lie. But I would not show this panel to my
reviewer. It kills the answer I was about to give them."

### 3. Answering from the app, before any query

"So what do I actually tell them, from the app? 'The app says nothing has been sent from this
project; the Assistant is off; no data source connected.' That's about this project, this session.
I can't answer 'does the tool send data anywhere' from the app with a straight face, because the
app itself says telemetry is undecided.

Below that there's 'Saved to this computer': april-communities.svg, accounts-by-pagerank.csv, a
recipe, the project file 'with its data.' Good -- exports are listed. The project file 'with its
data' is the one I'd want to know about, because that one leaves the building on a USB stick or an
email. At least it's listed."

### 4. Where your data goes (the forwardable page)

"Start screen, the line 'Files stay on this computer. graphty reads them in this browser and
uploads nothing.' Link: 'Where your data goes.' Same page is also under Help in the menu, I saw that
in the little picture at the bottom. Open it.

Title, one paragraph, 'written so you can forward it to whoever approves software where you work.'
'Describes graphty 2.0. Updated September 28, 2026.' Copy link, Print or save as PDF. This is the
part I'd forward. Versioned and dated. Good.

In short: files read by the browser, not uploaded, no account, no server that receives your data.
Data leaves only through two features, both off until you turn them on: Connect to data source and
the Assistant. Projects kept in this browser. No password or key in the sent list, the exported
list, or a project file. That box is the thing my reviewer reads first. That box is good.

'What stays in this browser.' Files, projects, exports, an Assistant key, data-source password --
'kept in memory until you close the tab, never written to storage.' That's the right answer for the
password. Good.

'What leaves this browser, and only when you ask.' What / to whom / when. Connect to data source:
the query and the sign-in, to the source at the address you enter, run by whoever runs it, not by
graphty. The Assistant: question, counts, column names with up to ten values, node names it looks
up -- to the provider I choose, under my key. Opening graphty: the browser asks for graphty's own
code. Fine. That's a real table. My reviewer can work with that.

'What graphty does not send.' No account. No file contents except through the features above. No
fonts, icons or code from other sites. And then:

'Usage statistics and crash reports:'

...and nothing. The line just stops. Colon, blank.

That's worse than 'not decided.' In the app it at least says 'not decided yet.' On the page I'm
meant to forward it's an empty answer. My reviewer is going to read that as a copy-paste error or as
something someone deleted. Either way it's the first question they ask me back, and I don't have an
answer, because the app's answer is 'not decided.'

'Check it yourself: open the Network tab, requests go only to graphty's own address.' Good. I'd do
that anyway. But whose address? The page never names it. 'Where graphty is hosted' -- and in the
app, 'who hosts graphty: not decided yet.' So my check has nothing to compare against.

'What this page does not promise.' Still good. Honest, specific. The line about browser extensions
and backups -- that's the kind of thing a reviewer respects.

'For organizations.' 'Running your own copy of graphty, inside your network:' blank. 'Turning the
Assistant off for everyone:' blank. 'Questions this page does not answer: Contact' -- and Contact is
a link that, from what I can tell, doesn't go anywhere with an address on it. So three blanks in the
section written for exactly the person I'm forwarding it to. Self-hosting is the single question
that decides whether my bank would even consider this. It's blank.

I'd still forward the top half. I would not forward this page as is. I'd copy the 'In short' box
and the 'what leaves' table into my own email and leave the rest out, which is exactly the thing a
reviewer hates, because then it's my words, not the vendor's."

### 5. After a data-source query

"Now the second part. 'Again after running a data-source query.' I don't have a data source hooked
up in anything I can click here. The Data panel's Sent and saved still says 'no data source is
connected.' So the only place I see the after-query answer is the pictures at the bottom of the
forwardable page.

Same as last time, those pictures just sit there after the Contact line, no caption, no heading.
The page ends, then there's a strip of screenshots. I'm reading them as 'this is what the app shows
you,' but my reviewer is going to scroll past 'Contact' and wonder if those are leftovers, or part
of the policy.

From the pictures: after the query the line under the project name reads 'Sent to
neo4j.internal.example: 1 query. Nothing else.' That's exactly the right sentence. Host named, count,
'nothing else.' If the app really says that, I'd screenshot it and paste it in the ticket.

The second picture: 'Sent: 1 query to neo4j.internal.example, 2 questions to the Assistant. Nothing
else.' Also good.

The sent list: 'Query to neo4j.internal.example, 1 query, 13:47', with an eye. The Assistant rows
have the detail drawn -- the question, the forty node names, the three statistics, 'Copy as text.'
The query row still doesn't. For me the query is the whole point: what text did we send, what
address, as which user, how many rows came back. That's what I reconcile against the proxy and
the Neo4j audit log. An Assistant question I can read; the query I can't. Same gap as last round.

And the rail. In the pictures I can't see the rail next to the 'Sent to neo4j' line, but in the app
it says 'Assistant. Off. Nothing is sent.' permanently. So after a query the header says 'Sent to
neo4j' and the rail says 'Nothing is sent.' My reviewer sees both on one screenshot and asks which
one is lying.

Also: the query's answer comes back into the browser, and the page says projects are kept in the
browser until I delete them. So the rows from our Neo4j now sit on this laptop in browser storage,
unencrypted as far as I know, for as long as the project exists. Nothing on the page connects those
two facts. For a bank, what came in and stayed is half the review."

### 6. What I'd forward

"The page, from 'Where your data goes' down to 'What this page does not promise,' as a PDF. Plus a
screenshot of the Sent and saved list after the query, if the app really looks like the picture.
Plus Export log -- which I still can't see. I don't know what format it is or what's in it. If it's
a CSV with time, host, query text, rows returned and the graphty version, great. I'm guessing.

Honestly? Today I'd forward the 'In short' box and the 'what leaves' table pasted into my own email,
and I'd say 'vendor hasn't decided on telemetry or hosting yet, so this is a no for now.' That's the
real answer my reviewer would get."

---

## Single Ease Question

**How easy was this task? (1 = very difficult, 7 = very easy): 4**

"Finding the answer is easy. The line is right under the project name, it takes me to the list, the
list takes me to the page. That part is a 6. What drags it down is that the answer itself now says
'not decided' about telemetry, in the app, and nothing at all on the page I'm supposed to forward.
And I still can't run a query anywhere in here, so the 'after' answer is a picture at the bottom of
a page, not something I watched happen."

## Would I use this instead of what I use now?

"No, not yet, and not because of the graph. It isn't approved, and this page is what I'd hand to
the people who approve it. With 'usage statistics: not decided,' 'who hosts it: not decided' and
'self-hosting:' blank, they'd close the ticket in five minutes. If those three lines had real
answers -- 'none', a named host, 'yes, here's how' -- this is one of the better data statements I've
seen from a small tool, better than most vendor trust pages, and I'd open the ticket myself. For the
hunting itself I'd still start in Splunk and the notebook; this would be the thing I paste an
export into when I need to see the paths."

---

## Findings

1. **The app now shows "Not decided yet" for usage statistics, hosting and organization-wide
   Assistant control, directly under "Sent: nothing."** Data > Sent and saved reads "Who hosts
   graphty, and where: Not decided yet / Usage statistics and crash reports: Not decided yet /
   Assistant off for a whole organization: Not decided yet." To a security reviewer "not decided"
   about telemetry reads as "maybe yes", and it contradicts the "Sent: nothing" box above it, since
   telemetry is what would leave without the user doing anything. She would not show this panel to
   her reviewer. Until these are decided, the app should not print the open question beside its
   own claim; the answers belong in the product, not the question. Severity 4.
2. **The forwardable page leaves the same questions blank.** "Usage statistics and crash reports:",
   "Running your own copy of graphty, inside your network:", "Turning the Assistant off for
   everyone in an organization:" each end in a colon and nothing; "Contact" is a link with no
   address behind it. The app says "not decided", the page says nothing, so the two disagree, and
   the blanks look like an editing error on a page meant for a reviewer. The "Check it yourself"
   Network-tab test also cannot be done without the host named. Self-hosting is the question that
   decides whether a bank reviews the tool at all. Severity 4.
3. **The after-query state still cannot be reached in the app.** There is no mock with a data source
   connected; the only evidence is the uncaptioned pictures after the "Contact" line on the
   forwardable page. She reads them as "what the app shows" but would not trust them, and a reviewer
   may take them for leftovers. Either give the pictures a heading and captions in the page as the
   reviewer sees it, or move them out of the forwardable page. Severity 3.
4. **The query row in the sent list still shows a count, not the query.** "Query to
   neo4j.internal.example, 1 query, 13:47"; only the Assistant row's detail is drawn. She needs the
   query text, the address, the account it signed in as (not the password), rows returned and the
   time, on screen and in the exported log, to reconcile with proxy and database audit logs.
   Severity 3.
5. **"Assistant. Off. Nothing is sent." on the rail still reads as a claim about the whole app.**
   After a query the header says "Sent to neo4j.internal.example" and the rail says "Nothing is
   sent" on the same screenshot. Scope it to the Assistant ("Assistant off") or drop "Nothing is
   sent." Severity 2.
6. **Queried rows kept in browser storage are not tied to the data-source row.** The page says
   projects live in browser storage until deleted, and separately that a query's answer comes back
   to the browser; it never says the rows then stay on the laptop, or whether that storage is
   encrypted. What came in and stayed is half of a bank's review. Severity 3.
7. **Export log's content and format are still unknown.** It is the second thing she would forward;
   she guesses at a CSV and cannot check. Show what it contains (time, host, query text or question,
   what was sent, graphty version) and its format. Severity 2.
8. **"Nothing has been sent from this project"** still invites "and from the tool itself?" It
   answers about the project when the reviewer asked about the tool. Severity 2.
9. **Keep:** the privacy line under the project name leading to Sent and saved, and on to the page;
   "Sent: nothing" with its reason; the dated, versioned page with Copy link and Print or save as
   PDF; the "In short" box; the what / to whom / when table; the password kept in memory only;
   "no fonts, icons or code from other sites"; "What this page does not promise"; the after-query
   line naming the host with "Nothing else."; See what was sent showing the real payload for an
   Assistant question; exports listed under Saved to this computer; the page also reachable from
   Help. Severity 0.
