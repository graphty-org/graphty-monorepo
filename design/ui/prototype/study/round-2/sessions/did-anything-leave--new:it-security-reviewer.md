# Session: "Did anything leave?" -- IT security reviewer

**Task given by the moderator:** "Your IT reviewer asks whether this tool sends data anywhere.
Answer from the app, then again after running a data-source query, and forward something they
can read."

**Screens used:** the graph window at rest, the start screen, and the "Where your data goes"
page.

**Facilitator note:** the persona file for this participant was not in the personas folder when
the session ran. The participant was played as a composite built from the study's own notes about
IT reviewers: they could not check the claim "uploads nothing" and had nothing to forward. The
composite: Dana, 41. Dana spent eight years as a Windows and network administrator and now does
third-party risk and software approval for a 900-person engineering firm. Dana works through a
standard security questionnaire (hosting, subprocessors, telemetry, retention, encryption,
single sign-on, incident contact) and trusts a packet capture more than a vendor's word. Dana has
approved browser tools before and has been burned twice: once by a "local only" diagramming tool
that loaded fonts and analytics from three CDNs, and once by an AI feature that was switched on
silently in an update.

---

## 1. The graph window at rest

> OK, one of the analysts wants this. First thing I want is anything on the screen that talks
> about data. Top left, under the project name "Les Miserables": a lock and "This browser.
> Nothing sent." Short. I like short, but "nothing sent" is a marketing sentence until I see it
> on the wire.
>
> Left rail: "Assistant -- Off. Nothing is sent." So there is an AI feature. That's the first
> thing I'd have asked anyway. Off is the default, good. Who can turn it on? Just the user, I
> assume. That's my problem with it.
>
> Nothing on this screen tells me where the page itself came from. It's a web app. Someone hosts
> it. "Nothing sent" is about my data, fine, but the browser is still talking to *somebody*.
>
> I'll click the file chip, "miserables.json", because that's where I'd expect file details.

Popover: "This browser. Nothing sent. Projects are kept in this browser. Where your data goes...",
opened from "this computer", read Sep 28, 10:42.

> "Projects are kept in this browser." That's the retention answer, and it's what I'd have to
> ask next: browser storage, unencrypted, on a laptop that gets re-imaged. OK, at least it's
> stated. And there's a link, "Where your data goes...". That's what I'd want to forward. I'll
> come back to it.

**Answer 1, from the app:** "It says nothing leaves while the Assistant is off and you open a
file from your own machine. Projects are kept in browser storage."

## 2. After a data-source query

> Now the second part. Run a data-source query. The start screen had "Connect to data source...".
> The graph window has no state for "I just queried a data source". There's "Assistant on" --
> let me look at that one because it's the closest thing.

State "Assistant on": the line under the title changes to an upload icon and "Assistant on:
sends names and statistics". The text wraps into two lines and runs into the title above it.

> Good -- the line *changes* when something leaves. That's the behaviour I want. "Sends names and
> statistics" -- to whom? It doesn't say which provider. I have to go to the other page.
>
> But the moderator asked about a data-source query, and I cannot find a screen that shows me
> what the line says after one. From the annotation text I can tell it's meant to say "Sent to:
> {source}", but I'm looking for the screen, and it's not there. So I'm guessing. My guess:
> the lock line flips to something like "Sent to: neo4j.internal.example". If it does that, and
> names the host, that's the best thing on the page. If it just says "Sent to: data source", it's
> useless to me.

**Answer 2, after a query:** "I think it says the query went to the database address you typed,
straight from your browser, not through graphty. I could not see that on the screen itself. I'm
getting it from the forwardable page, not the app."

## 3. The page to forward

Opened "Where your data goes" from the start screen's lock line.

> Now this is more like it. Title, one paragraph saying who it's for -- "whoever approves
> software where you work". Someone thought about me. "Copy link" and "Print or save as PDF" top
> right. PDF is what I attach to the ticket. That's the most useful button in the whole thing.
>
> "Describes graphty 2.0. Updated September 28, 2026." Versioned and dated. Good, I need that
> for the record, and "when a later version changes any of this, this page changes with it" --
> fine, but I'll want to be told, not to check the page every month.
>
> "In short": three lines. Files not uploaded, no account, no server that receives data. Data
> leaves only through two features, both off: Connect to data source and the Assistant. Projects
> in this browser only. That's the summary I'd paste into the risk register.
>
> "What stays in this browser" table. Files, projects, exports, "An Assistant key -- kept in
> this browser and sent only to the provider". OK. What about the *data source* sign-in? The
> table below says the query and "any sign-in the source asks for" go to the source. Is that
> password saved? In browser storage? For how long? It's not in the "what stays" table, and
> that's the first thing my boss would ask. Database credentials in localStorage is a finding.
>
> "What leaves this browser, and only when you ask." Feature, what, to whom, when. This is
> exactly the table I'd build myself.
> - Data source: the query, sign-in, to "the source at the address you enter, run by whoever
>   runs it -- not by graphty". Direct from the browser. Good. So our Neo4j sees our analyst's
>   browser, nothing third party in the middle.
> - Recipe or project file that names a data source: nothing until you confirm. Good -- that's
>   the "someone emails you a file that phones home" case. I didn't expect them to have thought
>   of that.
> - The Assistant: question, counts, each column's name with up to 10 of its values, node
>   names and values it looks up, to Anthropic, OpenAI or Google, under the user's own key.
>   That is a real data transfer to an AI vendor, on a personal key, which means none of our
>   enterprise agreements cover it. It's honest, I'll give it that. But that row is where I say no.
> - "Opening graphty": the browser fetches graphty's own code from "where graphty is hosted"...
>   and then a pink box: "Owner decision open: who hosts graphty, and where." So I don't know the
>   host or the country. That's question one on my questionnaire.
>
> "What graphty does not send": no account, no fonts or code from other sites. Good, that's my
> old CDN problem answered. "Usage statistics and crash reports:" -- another pink box. Owner
> decision open. So telemetry isn't decided. Question two on my questionnaire, blank.
>
> "Check it yourself. Open your browser's developer tools, the Network tab..." Ha. Yes. That's
> what I'd do anyway, and it's the first vendor page I've seen that invites it. That buys a lot
> of trust. Even better would be telling me there's a Content-Security-Policy that *blocks* other
> addresses, because then it's enforced, not just "we don't". I don't see that.
>
> "What this page does not promise": clearing site data deletes projects, other users of the
> same login can read it, not a certification. Fair and plain. I actually like a vendor that
> tells me what it doesn't do.
>
> "For organizations": self-hosting -- pink, undecided. Turning the Assistant off for everyone
> -- pink, undecided, and it says today it's off until each person sets a provider "and nothing
> turns it on by itself". Contact -- pink, nobody named. So the three things I actually need to
> approve this for 900 people -- run it inside our network, lock the AI off, someone to email --
> are all open.

## 4. What I would forward

> I'd hit "Print or save as PDF" and attach it to the ticket. It reads well, it's what a
> reviewer needs, and it came from the app so the analyst didn't have to write it. But right
> now I'd write back: "Approved for local files only. Assistant not permitted. Data-source use
> pending: where are the credentials stored? Blocked until you tell me the host, telemetry and
> a contact." That's four of the pink boxes.

## After the task

**Single Ease Question: 5 of 7.** The at-rest answer took seconds and the forwardable page is
better than what most paid vendors send me. I lost points on the second part: I never saw the app
itself tell me where a data-source query went. I had to infer it from the reference page.

**Would you use this instead of your current tool?** My "current tool" is a vendor questionnaire
and a packet capture. This page would replace the first round of emails, and I'd use it. But I'd
still run the capture, and I would not approve it org-wide until hosting, telemetry, a way to
switch the Assistant off centrally, and a contact are filled in. Those are exactly the blanks on
the page.
