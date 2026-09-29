# Session: does the data stay here? -- Marcus, criminal intelligence analyst

Participant: Marcus, 44, criminal intelligence analyst at a state fusion center (persona in
study/personas/intelligence-analyst.md). Works in i2 Analyst's Notebook and Excel on call
records and bank returns, which are criminal justice information that may not leave
agency-approved systems.

Task, as the moderator gave it: "Before you load anything: your organisation is strict about
where data goes. Is this OK to use? Later, mid-session: did anything just leave your machine?"

Screens used: the start screen (first run), the "Where your data goes" page it links to, and the
main frame with a graph open (at rest, with the file popover open, and with the Assistant on).

## Think-aloud transcript

**Start screen.**

> Okay. "Open a graph." Before I touch Open, what's this under it -- little padlock. "Files stay
> on this computer. graphty reads them in this browser and uploads nothing." Huh. That's the
> first thing I'd ask and it's already on the screen. I'll give it that. Most of these things
> I have to dig for a privacy policy that's written by a lawyer for a lawyer.

> Second line, "Projects are kept in this browser." Kept in this browser, meaning the stuff I
> build, the chart, sits in Edge somewhere on my laptop. Okay. Not great, not terrible. Our
> laptops are encrypted, but I'd want to know if it's encrypted in there or just sitting there.
> And if I'm on the remote desktop -- that session gets wiped. So is my chart gone Monday?

> Samples, karate club, Les Mis, proteins, bank transfers. Skip. "Connect to data source" -- no.
> Not clicking that on day one. There's a little (i) at the end of that row; I hover it and it
> says it sends only your query to the source you name. Fine, but I'm still not clicking it.

> "Where your data goes" -- that's a link. That's what I actually want. Clicking.

**The "Where your data goes" page.**

> New tab. Good, it's its own page. "Copy link", "Print or save as PDF". Okay, whoever wrote this
> knows the drill -- I'm going to have to send this to our ISO, the information security
> officer, and he's going to want paper.

> "In short." Files not uploaded. "graphty has no account and no server that receives your
> data." Data leaves only through two features, both off until you turn them on: connect to
> data source and the Assistant. Projects kept in this browser on this computer only. Three
> lines. I could read that to my sergeant.

> The table. Files you open -- read into memory, not copied anywhere. Projects -- browser
> storage, "not synced to another browser or computer", "stay until you delete the project or
> clear this site's data." So if IT re-images me, it's gone. It says that further down too, in
> the does-not-promise part. At least it's honest.

> "What leaves this browser." Connect to data source, fine, that's to our own server if we ever
> did it. The Assistant -- "your question, the graph's counts, each column's name with up to 10
> of its values, the names and values of the nodes it looks up." To Anthropic, OpenAI or Google.
> Nope. Names of nodes is names of subjects. That's CJI going to a commercial AI company. That's
> the one I'd tell everybody in the unit: do not turn that on. Good that it's off by default.
> Bad that I can't see a way for our IT to lock it off.

> And here it is -- "Turning the Assistant off for everyone in an organization: owner decision
> open." Not decided. "Running your own copy of graphty, inside your network: owner decision
> open." Not decided. "Opening graphty... Where graphty is hosted. Owner decision open: who hosts
> graphty, and where." Usage statistics and crash reports: not decided. Contact for questions:
> not decided.

> So I've got a very nice page that answers every question except the four my ISO is going to
> ask first. Who hosts it. What country. Does it phone home with usage stats. Can we run it
> on our own box. That's the approval, right there. Without those, the answer to "is this OK
> to use" is "not with case data." I could play with the Les Mis sample on it. I'm not putting
> tolls in it.

> "Check it yourself. Open your browser's developer tools, choose the Network tab." I know what
> that is from watching IT do it. On my machine developer tools are probably blocked by policy.
> My ISO can do it, though. That line's for him, not me.

> "It is a description of graphty 2.0, not a certification or a contract." Yeah. That's the
> sentence that kills it for procurement. I understand why it's there, but CJIS wants a
> signed agreement if a vendor touches the data. Here the pitch is nobody touches the data --
> so fine, maybe it doesn't need one -- but then I need the self-hosted version, because I can't
> have the code itself coming off some site I can't name.

**Moderator: "Is this OK to use?"**

> Honest answer: I'd forward that page to our ISO today. It's the best version of this I've
> seen from a free tool. But as it stands, no, not for real case data. Hosting, telemetry and
> self-hosting are blank. When those are filled in -- and if the answer is "you can run it on
> your own server and it collects nothing" -- then probably yes. For samples and training, sure.

**Main frame, graph open (Les Miserables sample).**

> Loaded the sample. Top left under the name: "This browser. Nothing sent." Padlock again.
> Same words as the start screen. And over on the left strip, tiny: "Assistant. Off. Nothing
> is sent." Two places saying it. Good. The left one is so small I'd need to lean in, but I'd
> find it.

> Chip that says miserables.json -- clicking it. "This browser. Nothing sent. Projects are kept
> in this browser. Where your data goes..." and then "Opened from: this computer. Read: Sep 28,
> 10:42." Okay. That's the kind of thing I'd screenshot for the case file: where it came from,
> when it was read.

**Moderator, mid-session: "Did anything just leave your machine?"**

> Look at the line under the name. "This browser. Nothing sent." So, no. That's my answer and
> I'd believe it about as much as I believe any software. Would I swear to it? No. I'd say "the
> tool says nothing was sent, and the Assistant was off." That's the most I can say without IT
> watching the traffic.

> One thing -- "Nothing sent." Is that "nothing has been sent since I opened this" or "nothing
> will be sent"? I read it as right-now status, like a light on a dashboard. If it's a promise,
> it should be a sentence. If it's a status, it should change when something happens.

**Moderator shows the same screen with the Assistant on.**

> Now the line says -- let me read it -- "Assistant on: sends names and statistics." Wrapped onto
> two lines, the icon changed to an up-arrow. The rail says Assistant, no "off" anymore. Okay, I
> would notice that one. The page said it would name api.anthropic.com in that line; on this
> screen I just get "sends names and statistics." Sends them where? To whom? That's the exact
> word I need. And if somebody else on the shift turned it on on a shared machine, I'd want it
> red, not grey. It's the same grey as everything else.

> The page also said after a send it tells you what went, when, with "See what was sent", and it
> goes in the version history with an export log. That -- the export log -- I'd use. That's my
> audit trail. If a defense attorney asks "did you put my client's name into an AI," I print that.

## After the task

**Single Ease Question (1-7): 5.**

> Finding the answer was easy -- it's right under the title, and the link goes to a page I can
> forward. Getting to "yes, approved" is where it falls down, and that's not a button problem,
> it's that the page says "not decided" on the four things IT asks about.

**Would I use this instead of what I use now?**

> Not instead. i2 is installed, approved, and my charts are in it. For data handling, this is
> actually better than most web tools I've been shown -- it tells you straight what leaves and
> when, and it has a log. If the department could run its own copy, with the Assistant switched
> off at the server and no usage stats, I'd put in the ticket for it. Right now it's something I
> could try with the samples, and I'd send the page to our ISO and see what he says. I wouldn't
> put a real phone dump in it until he says yes.

## Problems observed

1. **The four questions an approver asks first are marked undecided** (Where your data goes page,
   "For organizations", "Opening graphty", "What graphty does not send"). Who hosts graphty and
   in which country, whether it can be self-hosted, whether it collects usage statistics or crash
   reports, and who to contact. Without them the answer to "is this OK to use" is no for case
   data. Severity 3.
   Quote: "A very nice page that answers every question except the four my ISO is going to ask
   first."
2. **No organization-wide way to keep the Assistant off** (the same page). The Assistant sends
   node names -- subject names -- to a commercial provider; one colleague turning it on is a
   breach. Off-by-default is not enough for him. Severity 3.
   Quote: "Names of nodes is names of subjects. That's CJI going to a commercial AI company."
3. **With the Assistant on, the frame's line does not name the destination** (main frame,
   Assistant on). The render reads "Assistant on: sends names and statistics", wrapped, in the
   same grey as everything else; the page promised the host (api.anthropic.com) would be named.
   Severity 2.
   Quote: "Sends them where? To whom? That's the exact word I need."
4. **"Nothing sent." reads as ambiguous** (main frame header). He cannot tell a live status
   ("nothing has left since you opened this") from a standing promise. Severity 1.
   Quote: "If it's a status, it should change when something happens."
5. **Projects live in browser storage on the endpoint** (start screen, second line; data page).
   He does not know whether it is encrypted there, and on a wiped remote-desktop session the
   project is lost. Severity 2.
   Quote: "So is my chart gone Monday?"
6. **"Check it yourself" assumes developer tools** (data page). On an IT-managed browser they are
   often blocked; the line serves the security officer, not the analyst. Severity 1.
7. **The Assistant status in the left rail is very small** (main frame, "Off. Nothing is sent."
   in three cramped lines). He finds it but has to lean in. Severity 1.

## What worked

- The data-location line is on the start screen, under the title, before anything is loaded.
- "Where your data goes" is its own page, with Copy link and Print or save as PDF, written for an
  IT reviewer, and it states what it does not promise.
- The file popover says where the data came from and when it was read.
- The send log in Version history, with Export log, gives him an audit trail he could produce.
