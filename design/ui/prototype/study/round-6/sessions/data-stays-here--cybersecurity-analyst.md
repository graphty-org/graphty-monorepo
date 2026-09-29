# Session: may I use this on our data? -- Priya, threat hunter at a regional bank

**Task given by the moderator:** "Your organization has strict rules about where data may go.
Decide whether you may use this tool on your data, and tell me what you would say to IT."

**Screens seen, in order, as the participant sees them (design notes hidden), dark theme, about
half a 1440p monitor (1280 wide):**

1. The start screen -- `shots/r6-priya-ds-start-screen.png`
2. An open project at rest (Les Miserables sample) -- `shots/r6-priya-ds-frame-at-rest.png`
3. "Where your data goes", the whole page -- `shots/r6-priya-ds-data-location-full.png`
   (the old "where-your-data-goes" address now just redirects to this page)
4. Data panel, payments project, scrolled to the bottom -- `shots/r6-priya-ds-data-panel.png`,
   `shots/r6-priya-ds-data-panel-tall.png`

---

## Think-aloud

### 1. Start screen

> Same three questions as always. Is it approved, where does it run, does it phone home.
>
> Top of the page, before the samples: "Files stay on this computer. graphty reads them in this
> browser and uploads nothing." And a link, "Where your data goes". Second line: "Projects are
> kept in this browser." Good -- that's where I'd want it, above the fold, not in a footer.
>
> No sign-in, no account prompt. That alone gets it past the first gate.
>
> "Connect to data source..." down at the bottom, with a tiny info icon way over on the right
> edge. That's the one door out I can see from here. The icon is so far from the label I almost
> didn't connect them. Whatever -- I'm not clicking "connect" on anything today.
>
> Still nothing on this screen about who is serving me the page. No version, no domain, no "about".
> It's a web app. Somebody runs the server this came from.

### 2. An open project

> Opened a sample -- I'm not putting bank data in this to find out whether I'm allowed to put bank
> data in this.
>
> Under the project name, underlined: "Nothing has been sent from this project". It's underlined
> now, so it reads as a link. That's a status, not a promise -- I like that more than the start
> screen line. Left rail, bottom: "Assistant. Off. Nothing is sent." Good that I don't have to go
> find a setting to learn that.
>
> "From this project." What about before I opened one, on the start screen? I'll assume it's the
> same. IT won't assume.

### 3. "Where your data goes"

> Own page, "Copy link", "Print or save as PDF". "Describes graphty 2.0. Updated September 28,
> 2026." Dated and versioned, good. Still can't see in the app itself which version I'm running.
> IT will ask.
>
> "In short." Files read by the browser, not uploaded, no account, no server that receives my data.
> Data leaves only through two features, both off: Connect to data source and the Assistant.
> Projects in this browser, this computer only. No password or key in the sent list, the exported
> list or a project file. That box is the paragraph I paste into the ticket. Same as last time,
> still good.
>
> "What stays in this browser." Files, projects, exports, Assistant key, data-source password
> "kept in memory until you close the tab, never written to storage". IT will like that last one.
>
> "What leaves this browser, and only when you ask." What / to whom / when. Data source: my query
> goes to the source I name, run by whoever runs it. If that's our own Neo4j, it doesn't leave the
> building. A project file that names a source: nothing until I confirm the address. Good, that's
> the "someone sends you a file that beacons out" case. The Assistant: "the names and values of
> the nodes it looks up", to Anthropic, OpenAI or Google. On my data, node names are account
> names and hostnames. Hard no on the Assistant, which is fine, it's off.
>
> "Opening graphty -- To whom: Where graphty is hosted." Still doesn't say where. That's the
> column I need filled with a name and a country, and it's the question repeated back to me. And
> it's the one that matters most for a web app: every page load pulls the code fresh from that
> server. Whatever this page says is true of 2.0 today. Next week's push is a different app nobody
> at the bank reviewed.
>
> The box "The app says when something leaves" -- status line, Data > Sent and saved, "See what
> was sent", "Export log" to attach to a review. That's my audit trail. Good.
>
> Down at the bottom there are these example pictures. One is a "Sent to api.anthropic.com" detail:
> the question text, then "40 node names: ACC-365386, ACC-946224..." Okay. That's honest. That's
> literally account numbers going to a third party, spelled out. I'd screenshot that for my lead
> as the reason the Assistant gets blocked. Also: an eye icon next to every send, and it shows
> exactly what went. That's better than any vendor has shown me.
>
> "What graphty does not send." No account. No file contents except through the features above. No
> fonts or code from other sites. Then:
>
> "Usage statistics and crash reports:"
>
> ...blank. Again. Same as last round. Colon and nothing. That's the first question on our review
> template and it's the one line on the page with no answer.
>
> "Check it yourself -- open the Network tab." I won't. IT's guy will, and it's good the page
> invites it.
>
> "What this page does not promise." Doesn't cover what a provider does with data, doesn't keep
> projects safe from loss, doesn't protect against extensions or backups, "not a certification or
> a contract". This section is why I believe the rest. Nobody in sales writes this.
>
> "For organizations."
> "Running your own copy of graphty, inside your network:" -- blank.
> "Turning the Assistant off for everyone in an organization:" -- blank.
> "Questions this page does not answer: Contact" -- looks like a link, doesn't go anywhere, no
> address.
>
> So the three things IT actually needs are still the three empty lines. Everything above them
> is better than any tool I've trialled. Then it stops right at the door.

### 4. Data panel, bottom

> Went back into the payments project, opened Data, scrolled down past sources, versions, recipes.
> Last section, "Sent and saved from this project". "Sent: nothing. The Assistant is off and no
> data source is connected." Link to the data page.
>
> Then -- this is new to me:
>
> "Who hosts graphty, and where: Not decided yet"
> "Usage statistics and crash reports: Not decided yet"
> "Assistant off for a whole organization: Not decided yet"
>
> Huh. Okay. So the panel says out loud what the page leaves blank. That's actually more useful to
> me than a colon with nothing after it -- a blank I'd read as a bug, "not decided" I read as an
> answer. And the answer is: not yet. Nobody has decided whether it collects telemetry. That's
> not "none". I can't write "none" in the review.
>
> But it's odd that the in-app panel is more honest than the page I'm supposed to forward. If I
> PDF the page, IT gets blanks. If I screenshot the panel, IT gets "not decided". I'd want the
> page to say the same thing.
>
> Also, "Not decided yet" sitting in the middle of my project's audit section, between "Sent:
> nothing" and "Saved: nothing yet" -- that's a weird place for vendor roadmap status. It's not
> about this project. It reads like a product that hasn't shipped.
>
> "Saved: nothing yet. Every file an export writes is listed here." Fine. Still no "Export log"
> when nothing's been sent; I'd want to export the empty log too. An empty log is evidence.

---

## Decision

> Bank data? **No. Not yet.** It's not on the approved list, and now the app itself tells me three
> of the review questions are "not decided yet". I can't take "not decided" on telemetry and
> hosting to a third-party risk review. That actually made the decision faster than last time --
> I'm not guessing whether the blank is a bug, the tool told me.
>
> Public or scrubbed test data on my own laptop, Assistant untouched, no data source connected,
> to see whether it's worth filing a review? Yes, if Defender doesn't block the domain.

## What I would say to IT

> "Flagging a browser-based graph tool, graphty, for a possible future review -- not asking for
> approval yet. Their data page is attached as a PDF, plus a screenshot of the in-app panel.
>
> What they state: files are parsed in the browser and not uploaded; no account; no server that
> receives our data; projects live in browser storage on the laptop; data-source passwords are
> held in memory only. Only two features send data out -- a connector to a source we name, and an
> AI Assistant that sends node names (for us: account and host names) to Anthropic, OpenAI or
> Google. Both off by default. The app logs every send with exactly what went, and can export that
> log.
>
> What they say themselves is not decided yet:
> 1. Who hosts it and in which country.
> 2. Whether it collects usage statistics or crash reports.
> 3. Whether an organization can turn the Assistant off centrally.
> Also blank on their page: whether we can self-host a pinned version, and a contact address.
>
> Our position would be self-hosted, pinned version, Assistant blocked by policy, or nothing --
> the code is re-downloaded on every page load, so reviewing today's version doesn't cover next
> week's. I'll check back when those are answered. In the meantime I'm only using it on public
> sample data."

---

## Single Ease Question

**5 out of 7.**

> Finding everything: easy, one link from the first screen, and the page is laid out the way a
> review is. Deciding: still "not yet", but this time the app told me why in plain words instead
> of leaving me to wonder whether the blanks were a bug. That's worth a point. It loses the rest
> because the forwardable page still has blanks where the panel says "not decided", and because
> the three answers IT needs still aren't there.

## Would I use this instead of my current tool?

> Instead of Splunk or my notebook? No, and it isn't trying to be. As an extra tool for looking at
> an exported slice? Maybe, later. The privacy story is the best I've seen from a graph tool --
> the per-send log with the exact node names is something Maltego or Graphistry never gave me. But
> "not decided" on hosting and telemetry keeps it on public data. Same as last round: a "not
> yet", not a "no".
