# Session: is it safe to put bank data in this? -- Sarah, fraud investigator

**Participant.** Sarah, a complex-case financial crime investigator at a mid-size bank (see
`../../personas/fraud-analyst.md`). Simulated participant.

**Mode.** Not mandated. Sarah is deciding on her own whether she would dare load anything, so
she has first-impression patience, not mandated patience.

**Task as given.** "Before you load anything: your organisation is strict about where data goes.
Is this OK to use? Later, mid-session: did anything just leave your machine?"

**Screens used.** Start screen (first run), the "Where your data goes" page it links to, the main
window at rest with the March transfers file open, and the same window with the Assistant
switched on. Renders: `shots/screens__start-screen.png`,
`shots/study-r2-data-stays-where.png`, `shots/study-r2-data-stays-frame-transfers.png`,
`shots/screens__frame-at-rest-s8.png`.

**Note on the mock.** The "Where your data goes" page still shows pink "owner decision open"
boxes where the answers about hosting, usage statistics, self-hosting and the contact address
will go. Sarah read them as they appear, as unanswered questions, which is also what an IT
reviewer would conclude if the page shipped with those lines blank or vague.

---

## Part 1 -- before loading anything

**Start screen.**

> OK, "Open a graph". Right under it: "Files stay on this computer. graphty reads them in this
> browser and uploads nothing." Good, that's the first thing I'd look for and it's the first
> thing there. I didn't have to go hunting. Second line, "Projects are kept in this browser."
> Hm. Kept in the browser where? Our browsers get wiped when they re-image the laptop. Park
> that.

> "Uploads nothing" is a claim. Every vendor says that. Somebody in IT security is going to ask
> me "says who?", and "the start screen said so" is not an answer I can give them.

She sees the "Where your data goes" link at the end of the line.

> There we go. That's the one I'd actually click. Not "Privacy policy" in grey at the bottom,
> it's right there. Clicking.

She glances at the samples on the way.

> "Bank transfers, 3,000 accounts." Whose accounts? Is that made-up data, or somebody's real
> statements? Doesn't say. Not touching it on a work machine until I know.

> And "Connect to data source..." -- no. That sounds like it talks to something. There's a
> little (i) next to it.

She hovers the (i) next to "Connect to data source...". In the mock nothing appears.

> Nothing. Fine, I'm not using that anyway.

**The "Where your data goes" page.**

> "It is written so you can forward it to whoever approves software where you work." OK,
> somebody's actually thought about who reads this. "Copy link", "Print or save as PDF" --
> yes. The PDF is what goes in the vendor-risk ticket. That alone saves me writing an email
> explaining what the tool is.

> "In short." Files not uploaded, no account, no server that receives my data. Data leaves only
> through two features, both off until I turn them on: Connect to data source and the
> Assistant. Projects kept in this browser. Three lines. That's the level I need; my manager
> would read those three lines and stop.

> The table -- "What stays in this browser". Exports go through the save dialog to the folder I
> choose, graphty keeps no copy. Good, that's how I'd want the case-file export to behave.

> "What leaves this browser, and only when you ask". Assistant: "your question; the graph's
> counts; each column's name with up to 10 of its values or its range; and the names and values
> of the nodes it looks up." To Anthropic, OpenAI or Google under my own key.

> Stop. Ten values of each column. My columns are account numbers, customer names, amounts. So
> if I turned that on, ten account numbers go to OpenAI. That's a SAR-confidentiality problem,
> full stop. Honestly, I'm glad it says it that plainly -- most tools would hide that behind
> "may share usage data to improve the service". But it means the Assistant is a hard no for
> me, and I'd want the tool to make it impossible for me to switch on by accident.

> "Opening graphty -- nothing from your files... Where graphty is hosted." And then a pink box:
> "who hosts graphty, and where". So it IS a website. Whose website? What country? IT's first
> question is going to be "what's the URL and who runs it", and the page doesn't know yet.

> "Usage statistics and crash reports" -- pink box again, not decided. That's the second
> question they'll ask. A crash report can have a stack trace with my data in it. If the answer
> is "none", say "none" and I'm happy.

> "Check it yourself. Open your browser's developer tools, choose the Network tab." I can't.
> Dev tools are locked down on our laptops. But our security team can, and it's the right kind
> of sentence -- it says "don't trust us, look". I'd forward that paragraph.

> "What this page does not promise." It doesn't keep projects safe from loss; clearing site
> data deletes them. Other people on the same login can see it. Fair. That's honest. I'd rather
> read that than find out.

> "For organizations. Running your own copy inside your network" -- pink, undecided. "Turning
> the Assistant off for everyone" -- pink, undecided. "Contact" -- undecided.

> So where I land on the first question: as a person, I believe it. It's clearer than anything
> our actual vendors gave us. As a bank, it's not approved and I can't get it approved off this
> page yet, because the three things IT asks first -- where is it hosted, can we run it
> ourselves, can we lock the Assistant off for everyone -- are all blank. Until those are
> answered, the answer to "is this OK to use" is: on the sample data, yes; on customer data,
> not until IT signs it off. Which is the answer for every tool, to be fair. This one would at
> least get to the IT meeting with a document instead of a sales deck.

**Moderator:** "So would you load a file?"

> On my own? The sample, maybe. A real statement export, no, not without a ticket. If my manager
> put it through vendor risk and they came back yes, then fine.

---

## Part 2 -- mid-session, with the March transfers file open

The moderator shows the main window with "Transfers, March 2026" open (3,000 accounts, 9,113
transfers) and asks: "Did anything just leave your machine?"

> Top left, under the project name: a padlock and "This browser. Nothing sent." OK. That's the
> same promise, on the working screen, where I'd actually be when I get nervous. Good that it's
> up there and not buried in a menu.

> Down the left side, "Assistant -- Off. Nothing is sent." Tiny grey text. At 125 percent zoom
> I'd read it; at 100 on the second monitor probably not. But fine, it says off.

> So the answer is "no". But -- "Nothing sent" since when? Since I opened the file? Today? It's
> a label. It says what's supposed to be true. It doesn't show me what happened. If our security
> team asks "prove it didn't send anything during that case", there's nothing here I can hand
> them. i2 doesn't give me that either, to be fair. But the case system logs everything I touch,
> and that's what I'm used to.

> Also the start screen said "uploads nothing", this says "Nothing sent", the other page said
> "leaves this browser". Three ways of saying it. I'm reading these like a contract, so I notice.
> Probably the same thing. Probably.

The moderator then shows the same window with the Assistant switched on.

> Now the padlock is gone and there's an arrow: "Assistant on: sends names and statistics." And
> the Assistant item on the left lost its "Off" line. OK, that's visible, it changed. I'd notice
> that if I was looking at the top left. Would I be looking at the top left? No, I'd be looking
> at the chart.

> "Sends names and statistics" -- names of what? Account names? Customer names? The other page
> said column names and up to ten values and the nodes it looks up. That's not "names and
> statistics", that's data. For me the short version undersells it. And it still doesn't
> answer "did something JUST go". Was it sent when I switched it on, or only when I ask a
> question? The long page says each time I send a question. This line doesn't say.

> And the line is squashed into two lines and cut off next to the file name. The one line that
> matters most on this screen is the one that's cramped.

> The file chip says "transfers-2026..." -- where did it come from, it's cut off. The moderator
> says clicking it shows where the file was opened from and "This browser. Nothing sent." again
> with the same link. Fine. That's where I'd look second.

**Answer to "did anything just leave?"**

> With the Assistant off: the screen says no, and I believe it as much as I believe the page.
> With the Assistant on: I can't tell you. It tells me it sends things, not whether it has, or
> what, or when. I'd have to go read the long page again.

---

## Wrap-up

**Single Ease Question (1-7): 5.**

> Finding the answer was easy -- it's the first line on the first screen and the link goes to a
> page I can actually forward. That's more than I usually get. It loses points because the page
> doesn't answer the IT questions yet -- hosting, telemetry, running it ourselves, turning the
> Assistant off for the whole bank -- and because "did anything just leave" gets me a promise,
> not a record.

**Would she use this instead of her current tool?**

> Not instead of anything -- I don't get to pick, and for data handling I'd have to take it to IT
> anyway. But this is the first tool I've seen where I'd be comfortable taking it to them,
> because I could forward one page and it says what goes where, in a table, including the bits
> that don't flatter it. If that page gets real answers in the pink boxes -- especially "you can
> run it inside your network" and "your admin can switch the Assistant off for everyone" -- then
> it has a shot at approval. If it's only on somebody's website with the Assistant one click away
> from sending account numbers to OpenAI, it won't get past vendor risk, however nice the chart is.

---

## Problems observed

1. **The questions an IT reviewer asks first are unanswered** (Where your data goes page):
   hosting location, usage statistics and crash reports, self-hosting, organization-wide
   Assistant switch-off, and a contact. Sarah reads these as "not approvable yet". Severity 3.
2. **"Did anything just leave?" has no answer beyond a static label** (main window): "This
   browser. Nothing sent." states intent, not what happened; there is no record of sends she
   could show security. With the Assistant on, the line cannot say whether anything has been
   sent yet. Severity 2.
3. **The Assistant-on summary undersells what is sent** (main window, Assistant on): "sends names
   and statistics" versus the page's "each column's name with up to 10 of its values ... and the
   names and values of the nodes it looks up". For a bank those values are customer data.
   Severity 3.
4. **The Assistant-on line wraps to two cramped lines beside the project name** and loses the
   padlock position she had learned; she would be looking at the chart, not the top left.
   Severity 2.
5. **Three wordings for the same promise** ("uploads nothing", "Nothing sent", "leaves this
   browser"): a careful reader checks whether they mean different things. Severity 1.
6. **The "Bank transfers" sample does not say it is synthetic**, so she will not open it on a
   work machine. Severity 2.
7. **The (i) next to "Connect to data source..." shows nothing on hover** in the mock, so the
   one-line "what leaves" note never reaches her. Severity 1.
8. **"Projects are kept in this browser"** raises re-imaging and shared-login worries; answered
   on the long page, not on the start screen. Severity 1.

## What worked

- The data promise is the first line under the title, with the link at the end of the same
  line; no hunting.
- The page is written to be forwarded, with Copy link and Print or save as PDF -- exactly what a
  vendor-risk ticket needs.
- The "What leaves this browser" table (feature, what, to whom, when) and the "What this page
  does not promise" section; honesty about limits raised her trust.
- "Check it yourself" in the Network tab; she cannot, but her security team can.
- The same promise repeated on the working screen, and it visibly changes when the Assistant is
  on.
