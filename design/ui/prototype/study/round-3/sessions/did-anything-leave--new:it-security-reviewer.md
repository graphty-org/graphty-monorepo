# Session: "Did anything leave?" -- IT security reviewer (round 3)

**Task given by the moderator:** "Your IT reviewer asks whether this tool sends data anywhere.
Answer from the app, then again after running a data-source query, and forward something they
can read."

**Screens used:** the graph window at rest (and its file popover), the start screen, and the
"Where your data goes" page, including its drawings of what the app says when something leaves.

**Facilitator note:** there is still no persona file for this participant in the personas folder.
The participant was played as the same composite as in round 2, so the two sessions compare:
Dana, 41, eight years as a Windows and network administrator, now third-party risk and software
approval for a 900-person engineering firm. Dana works from a standard security questionnaire
(hosting, subprocessors, telemetry, retention, encryption, single sign-on, incident contact),
trusts a packet capture more than a vendor's word, and has been burned by a "local only" tool
that loaded fonts and analytics from three CDNs and by an AI feature switched on silently in an
update.

---

## 1. The graph window at rest

> Same tool as last time, "Les Miserables" open. Top left under the name: lock, "This browser.
> Nothing sent." Left rail: "Assistant -- Off. Nothing is sent." Both still there, both short.
> Fine. That's my at-rest answer in about five seconds, same as before.
>
> I click the file chip, "miserables.json". Popover: "This browser. Nothing sent. Projects are
> kept in this browser. Where your data goes..." then "Opened from this computer", "Read Sep 28,
> 10:42", "Replace data...". The popover sits right on top of the chip I clicked and the filter
> chip next to it. Doesn't matter to me, I'm not filtering anything.

**Answer 1, from the app:** "With a local file and the Assistant off, nothing leaves the browser.
Projects are kept in browser storage on that laptop."

## 2. After a data-source query

> Now the query. From the start screen: "Connect to data source..." with an (i). Hover: "Sends
> only your query, to the source you name." OK, one sentence, it names the direction. I click
> Connect to data source... and -- nothing. No dialog in this prototype. So I can't actually run
> one, and the graph window has states for "Assistant on" and "Not saved" but still no state for
> "I just ran a query". Same wall as last time.
>
> The reference page has a section at the bottom, "What the app says when something leaves", so
> I'll take that as what I'd see. A bank's "Transfers, March 2026" project. The line under the
> name: upload icon, "Sent to neo4j.internal.example: 1 query". There it is. It names the host.
> Last round I said if it just said "a data source" it was useless -- it doesn't, it names the
> host. That's the fix I asked for.
>
> But "1 query" -- which query? The Assistant's line gets a "See what was sent" link that lists
> the question and every node name. The data-source line doesn't. If my analyst types a Cypher
> query with a customer's name in the WHERE clause, that name went to the database. Our own
> database, fine, but I'd still want the text in the log. And nothing tells me whether that went
> over an encrypted connection. Bolt or bolt+s? http or https? From a browser I'd expect TLS, but
> "I'd expect" isn't an answer.
>
> Version history: "Sent to neo4j.internal.example -- 1 query -- Today 13:47", and "Export log"
> top right. Export log is good. That's evidence I can attach to an incident ticket, which is more
> than most tools give me.

**Answer 2, after a query:** "It tells you, on the screen, that one query went straight from the
browser to neo4j.internal.example, and it keeps a log entry you can export. It doesn't show the
query text or say whether the connection was encrypted. And I only saw that line on the reference
page's drawing; the prototype wouldn't let me run a query."

## 3. The page to forward

> "Where your data goes", from the start screen link. Title, "whoever approves software where you
> work", "Describes graphty 2.0. Updated September 28, 2026", Copy link, Print or save as PDF.
> Same as last time, still the best thing here.
>
> "What stays in this browser" -- there's a new row: "Data-source password. Kept in memory until
> you close the tab. It is never written to this browser's storage." That is the right answer.
> That's exactly the finding I raised. ...And then a pink box under it: "Owner decision open".
> So it's the answer they *want*, not the answer they've *given*. I can't cite a recommendation.
>
> Row above it: "An Assistant key. If you set one, it is kept in this browser and sent only to
> the provider." Kept where? For how long? That's an API key with billing on it sitting in browser
> storage, unencrypted, and anyone with the laptop or a bad extension can lift it. You gave the
> database password memory-only and left the API key in storage. Same finding, different row.
>
> "What leaves this browser." Data source, recipe file that names a source -- "Nothing, until you
> confirm" -- good. The Assistant row, provider on your own key -- still where I say no, and it's
> honest about it. New row: "The Assistant, with a model that runs in the browser. Nothing from
> your data. The model is downloaded once from its publisher." Which publisher? From what domain?
> That's a download of executable-ish content from a third party. Two sections down it says "No
> fonts, icons or code from other sites while you work." A model from some publisher's CDN is
> exactly the thing I got burned on. And "In short" says data leaves "only through two features"
> but the table has four rows that make network requests. Those three statements need to agree
> before I believe any of them.
>
> "Opening graphty" -- pink, host and country undecided. "Usage statistics and crash reports" --
> pink. "Check it yourself... Network tab" -- still good, still no Content-Security-Policy
> mentioned, so "no other sites" is a promise, not a control. "What this page does not promise"
> -- still good, still the most honest part.
>
> "For organizations": self-hosting pink, turning the Assistant off centrally pink, Contact pink.
> Same five blanks as last round, plus the password one. Nothing that I need to sign off on has
> been filled in.

## 4. What I would forward

> I'd print it to PDF and attach it. My reply would be close to last time's: "Local files: OK.
> Data-source use: OK for our internal Neo4j if the password really is memory-only and the
> connection is TLS -- confirm both. Assistant with a provider key: not permitted. In-browser
> model: tell me the download host first. Blocked org-wide until hosting, telemetry, central
> switch-off and a contact are filled in." A page with six "owner decision open" boxes goes in the
> ticket as "vendor response incomplete."

## After the task

**Single Ease Question: 5 of 7.** The at-rest answer is instant and the page is still better than
what most vendors send. Better than last round: the after-query line names the host and there's
an exportable log. Still lost points because the prototype wouldn't run a query and the graph
window has no state for it, so again I read the answer off a drawing on the reference page.

**Would you use this instead of your current tool?** My tools are a questionnaire and a packet
capture. This page replaces the first round of emails and the export log is something I'd
actually ask analysts to attach. But I'd still capture traffic, and I can't approve it for 900
people while hosting, telemetry, the central Assistant switch, a contact and the password storage
are all "owner decision open". The design is doing its job; the decisions aren't made.
