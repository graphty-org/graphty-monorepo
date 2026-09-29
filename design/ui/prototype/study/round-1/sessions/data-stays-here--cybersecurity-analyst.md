# Session: "Is this OK to use, and did anything leave my machine?" -- Priya, SOC threat hunter

Participant: Priya, senior threat hunter at a regional bank (persona: `study/personas/cybersecurity-analyst.md`).
Screens: start screen (first run, drop, recents, Assistant set), main frame at rest (resting, file popover, Not saved menu).
Moderator's task, as given: "Before you load anything: your organisation is strict about where data goes. Is this OK to use? Later, mid-session: did anything just leave your machine?"

## Part 1 -- before loading anything

**Start screen, first run.**

> OK. Three questions before I touch anything: is this approved, where does it run, does it phone home.
>
> First thing my eye lands on, under "Open a graph": little padlock, "Your files stay on this computer. graphty reads them in this browser and uploads nothing." Right. That's the line I'd go looking for, and I didn't have to go looking. Good. That's more than Maltego ever told me.
>
> But read it carefully. It says my *files* upload nothing. It doesn't say the *page* calls nothing. Is there analytics on this? Crash reporting? Does it pull fonts or updates from somewhere? Those are the things that make security block a domain. "Uploads nothing" is a file statement, not a network statement.
>
> And "reads them in this browser" -- fine, but this browser loaded the app from *somewhere*. What domain is this? Who runs it? Can I host it myself inside the bank? Nothing here says. Where's an "About" or a link to the source? There's a "graphty" menu top left, and a question mark bottom right. I'd try the question mark... but if Help opens a web page, that's a call out too. I'll leave it.
>
> "Is it approved" -- no tool answers that for me, I know. But the thing that gets it approved is: open source, self-hostable, no telemetry, and here's how to verify. None of that is on this screen. In a real trial I'd stop here and email the vendor-risk people, and honestly I probably wouldn't bother for a trial.

**The samples.**

> Four samples with pictures. "Bank transfers, 3,000 accounts." Cute. Are these bundled or does clicking one download it? If it fetches, that's a request with my IP to some server. Not a big deal for a sample, but I'd want to know. The (i) just says what the data is, I assume -- I'm not hovering four of them.

**"Connect to data source..."**

> "Sends only your query, to the source you name." OK, that one I actually like. It tells me what leaves and to where. That's the Maltego-transform problem answered in eight words. I'm not clicking it -- my Splunk isn't going anywhere near this -- but it's the right sentence.
>
> Although. "The source you name." If I name our Neo4j, does the query go from my browser directly to it, or through their server? It says "to the source", so I'll read it as direct. I'd want that spelled out.

**Recent projects (state with recents).**

> Now there's a list: "Mule ring review, 3,093 accounts, today 09:14." So it *keeps* my stuff. In the browser, I'm guessing. That's a different question from uploading: if I load a scrubbed auth export and close the tab, is a copy sitting in Edge's site storage on a corporate laptop until someone clears it? For us that's data retention. I need "kept in this browser" said here, and a way to wipe it. I don't see a delete on these rows. Only when one breaks do I get "Remove from recents".

**Assistant set (start screen, when a provider is configured).**

> Oh, *here* we go. "The Assistant sends what you ask it about to Anthropic." OK -- credit where it's due, it says so right under the padlock line and it names who. That's honest. But now the padlock line above it still says "uploads nothing", and the line under it says it sends to Anthropic. Which is it? I get what they mean -- only if I ask the Assistant -- but at a glance those two sentences contradict each other. I'm not touching anything labelled Assistant anyway.

**What I'd bring.**

> I'm not putting bank data in this. I'd load my scrubbed cut -- tokenised account and host names, around 380,000 rows of 4624 network and RDP logons. That's what I'd drop. (Drop state.) "Drop to open as a new project -- the columns are checked before anything loads." Fine. Nothing about where it goes here, but the padlock line is still up top, so OK.

**Verdict on "is this OK to use?"**

> Partly. The screen gives me one clear, plain claim about files and one clear claim about data sources. It doesn't give me anything I can *verify*, doesn't say who runs it or whether I can self-host, and doesn't say anything about telemetry. So: good enough for me to keep going with a scrubbed file in a study. Not good enough for me to answer my team lead.

## Part 2 -- mid-session: "did anything just leave your machine?"

**Main frame at rest (Les Miserables loaded).**

> OK, I'm in. Where would I look to answer that? ... Top left: project name, a chip that says "miserables.json", a "Full graph" chip. Rail on the left: Graph, Assistant -- greyed -- Results, Notes. Right side: Export, statistics.
>
> The padlock line is gone. There is nothing on this screen that says anything about the network. No "offline", no "local", no status dot. On the start screen the tool told me "nothing uploads"; the moment I'm working, it stops telling me. If my lead walks up and asks "did that just go anywhere?", I can't point at anything.

**Clicks the file chip (file popover).**

> Maybe the file chip. Click. "miserables.json -- Opened from: this computer -- Read: Sep 28, 10:42 -- Replace data..." OK, that tells me where the data *came from*. Not whether anything went *out*. Close, but it's the inbound side.

**Chevron by the project name (Not saved menu).**

> Try the chevron by the name. "Not saved: this browser's storage is full." Download project file, Project info..., Minimize UI. So it saves into browser storage -- confirms my guess from the recents. The design notes say normally it reads "Kept in this browser, saved 10:58". That's actually helpful for me: "kept in this browser" is the retention answer. But I had to open a menu to find out where my data is stored, and it still says nothing about outbound.
>
> "Project info..." -- maybe that's where network stuff lives? I'd click it. I don't know what's in it; the mock doesn't show it. Guessing it's name, size, dates. Probably not.

**The Assistant rail button.**

> Assistant, greyed out. Greyed means off -- I'll take that as "not sending". But it's my assumption. It doesn't say "off, nothing is sent". If I hover it, maybe it says; the mock doesn't tell me.

**Export.**

> Export, top right, blue. That's the one I'd worry about on reflex -- in some tools "export" means "share link". I'm guessing here it downloads a file. If I had to guess I'd say yes, local download, but I haven't clicked it.

**Answer to "did anything just leave your machine?"**

> Honest answer: I don't know. I *believe* no, because the start screen said so and the Assistant is greyed. But nothing on this screen confirms it and I can't check it without opening DevTools, which I'm not going to do and a lot of my team can't. BloodHound's desktop app at least I know runs against my own Neo4j. Here I'm trusting one sentence I read five minutes ago.

## After the task

**Single Ease Question: 4 of 7.** Part 1 was easy: the answer was on the first screen, in one line, before I had to ask. Part 2 I couldn't answer at all; I pieced together "probably nothing" from a greyed button and a menu.

**Would I use this instead of my current tool?**

> For a scrubbed lab file on a Friday afternoon, maybe -- it's the first graph tool that told me where my file goes without me asking, and the data-source line is exactly right. Instead of Splunk and my notebook? No, and it's not because of this screen. But this screen decides whether I even get to find out: until I can tell my lead who runs it, whether it can be self-hosted, that there's no telemetry, and show him a "nothing has left this machine" that stays on screen while I work, it doesn't get past vendor review, and I'm not the one who's going to start that review.

## Problems found

1. **Nothing on the working screen says whether anything has been sent.** The start screen's padlock line disappears once a project opens; the main frame has no local-only or network status anywhere. Severity 3.
2. **"Uploads nothing" covers files, not the page.** No statement about telemetry, analytics, crash reports, fonts or update checks, which is what gets a domain blocked. Severity 3.
3. **No way to verify, and no "who runs this / can I self-host / source" link** on the start screen. The claim cannot be checked or handed to a vendor-risk reviewer. Severity 3.
4. **Recents imply data is kept in browser storage, but the start screen does not say so, and there is no way to remove a recent that still works.** Retention on a managed laptop is a policy question for her. "Kept in this browser" appears only inside the project chevron menu. Severity 2.
5. **With an Assistant provider set, the two lines under the title read as contradictory** ("uploads nothing" then "sends ... to Anthropic"). Severity 2.
6. **Greyed Assistant button does not say it is off and sending nothing**; she assumes it but cannot confirm. Severity 1.
7. **Samples: unclear whether clicking one fetches from a server.** Severity 1.
8. **"Connect to data source" does not say whether the query goes browser-to-source directly or through a graphty server.** Severity 1.

## What worked

- The padlock line on the start screen answered "where does my file go" before she asked -- the first graph tool in her experience to do that.
- "Connect to data source... sends only your query, to the source you name" names exactly what leaves and where.
- The Assistant line names the recipient (Anthropic) instead of hiding it.
- The file popover's "Opened from this computer" and the save menu's "Kept in this browser" are the right facts, once found.
