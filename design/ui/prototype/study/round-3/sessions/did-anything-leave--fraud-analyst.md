# Session: did anything leave? -- Sarah, fraud investigator

Participant: Sarah, level-2 financial crime investigator at a mid-size bank (composite persona,
see ../../personas/fraud-analyst.md). Mode: voluntary, first look; she was told her manager is
"thinking about it" and IT security wants an answer before anyone touches real data.

Task as given by the moderator: "Your IT reviewer asks whether this tool sends data anywhere.
Answer from the app, then again after running a data-source query, and forward something they
can read."

Screens used: the open project (Les Miserables sample, then Transfers, March 2026), the start
screen, and the "Where your data goes" page. Clicks were simulated from what the mock's markup
does; where a control is drawn but not wired, that is noted.

## Transcript

**1. The open project, at rest.**

> OK, so this is the tool open with something in it. Characters from a novel, fine, whatever.
> I'm not looking at the picture, I'm looking for anything that says where this lives. Top left,
> under the name: little padlock, "This browser. Nothing sent." Good. That is the sentence IT
> wants. And down the left edge, "Assistant -- Off. Nothing is sent." Two places saying the same
> thing, I'll take it.

> Now I need to give IT more than "the screen said so". I click the padlock line.

Moderator note: the padlock line is plain text in the mock; clicking it does nothing.

> Nothing. Hm. I'd expect that to open the details. OK, the file name chip under it,
> "miserables.json", click that.

The file popover opens: "This browser. Nothing sent. Projects are kept in this browser. Where
your data goes..." plus "Opened from: this computer" and the read time.

> There it is, "Where your data goes". Fine. That took me two tries, and I only found it
> because I click everything under a title. My L1 people wouldn't. Why isn't the padlock line
> itself the link? That's the one that says the thing.

**2. Switched to the bank-transfers dataset (Transfers, March 2026).**

> 3,000 accounts, 9,113 transfers, directed, weight is amount. Same padlock line, "This browser.
> Nothing sent." And the picture's a grey blob, but that's not today's question.

**3. The "Where your data goes" page.**

> OK, this is a proper page, opens in its own tab. "Describes graphty 2.0. Updated September 28,
> 2026." Good, a version and a date, IT will ask for both. "Copy link", "Print or save as PDF".
> That's what I'd forward. Print to PDF so it's in the case system and doesn't change under me.

> "In short": files read by the browser and not uploaded; no account, no server that receives
> your data; data leaves only through two features, both off until you turn them on -- data
> source and the Assistant; projects stay in this browser. That's three sentences. I could put
> that in an email. That's actually the answer.

> The table of what leaves: data source sends the query and the sign-in to the address I type;
> the Assistant sends my question, counts, column names and up to ten values each, and "the
> names and values of the nodes it looks up". Names of the nodes -- in my world those are
> account numbers. Account numbers going to Anthropic or OpenAI is a hard no without a DPA.
> At least it says so in plain words and it's off by default. IT will want to switch it off
> for everybody, not trust me to leave it off.

> Then there's pink boxes. "Owner decision open: who hosts graphty, and where." "Owner decision
> open: whether graphty collects any" usage statistics or crash reports. "Whether graphty can be
> self-hosted." "Whether an organization can switch the Assistant off centrally." "Who answers a
> reviewer's questions."

> So... those are exactly the five questions my IT reviewer asks first. Where's it hosted, does
> it phone home, can we run it inside, can we turn the AI off for everyone, who do I call. If I
> forward this today, the reply I get back is "come back when those are filled in." I get that
> it's a draft, but that's the part that decides whether I'm allowed to use it at all.

> "Check it yourself. Open your browser's developer tools, choose the Network tab." I won't do
> that, but our security guy will, and he'll like that it's offered. That's a good line.

> "What this page does not promise": clearing site data deletes the projects. Noted -- so I'd
> better download the project file into the case folder. Fine, honest.

**4. After a data-source query.**

Moderator shows the Transfers project after a query to the bank's own graph database (section 3
of the same page; the open-project mock has no state for this).

> Line under the name now says "Sent to neo4j.internal.example: 1 query", with an upload arrow
> instead of the padlock, and a chip with the same host. OK. It changed, it names the actual
> address, it's past tense. I don't know what neo4j is but ".internal" means it's ours, IT will
> recognise it. That answers "did anything leave": yes, one query, to our own server.

> Can I see the query? For the Assistant there's a "See what was sent" link with the question,
> every account ID, the stats, and "Copy as text". For the data source there's nothing to click
> on that line. I'd want the same thing: the query text, what time, what user it signed in as.
> And the page says the password goes only to that source and is kept in memory -- but that
> row's pink too, "owner decision open" on where the password is kept.

> "Version history" lists each send: "Sent to neo4j.internal.example, 1 query, Today 13:47",
> and there's "Export log" that writes them all to a file for a reviewer. That is the audit trail
> I actually want to attach. Good. But it's in version history, which is not where I'd look for
> "what left the machine". I only know it's there because the page told me.

**5. Forwarding.**

> So what I'd send IT: the PDF of "Where your data goes" for the general answer, plus the
> exported log from version history for what this specific case sent. Two files from two places.
> I'd rather one: "here's the policy page, and here's what this project sent, as an appendix".

## After the task

**Single Ease Question: 5 of 7.** Finding the answer on the screen was easy; the line is right
there under the name and it changes when something goes out. Getting to the forwardable page
took two tries, and the page itself has the five questions IT cares about most marked as not
decided.

**Would she use it instead of her current tool?**

> Instead of Excel? No, nothing replaces the pivot. Instead of i2 for a big case? Maybe -- i2 is
> installed and IT already signed it off years ago, so this has to get through vendor review
> first, and that depends on the pink boxes, not on me. What I'll say is: this is the first tool
> where I didn't have to email the vendor to find out if it uploads. The status line that says
> what went where, with a host name and a count, is the thing I'd point to. Fill in hosting and
> telemetry, let IT turn the Assistant off for everyone, and give me the query text on the
> data-source line, and I'd put it in front of my manager.

## Problems observed

1. The padlock line under the project name is not clickable; the route to "Where your data
   goes" is through the file chip's popover or the Help menu. Severity 2.
2. The forwardable page leaves hosting, telemetry, self-hosting, a central Assistant switch-off
   and a contact as open decisions -- the questions an IT reviewer asks first. Severity 3.
3. After a data-source query the line names host and count but has no "See what was sent": no
   query text, no time, no sign-in identity. The Assistant line has one. Severity 2.
4. The per-project send log lives in Version history, and the general page and the log are two
   separate things to forward; no single "what this project sent" export with the policy
   attached. Severity 2.
5. The Assistant sends "names of the nodes it looks up" -- for a bank, customer account
   numbers -- with no organization-level way to turn it off yet. Severity 3 for adoption.
