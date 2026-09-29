# Session: may I use this on bank data? -- Sarah, fraud investigator

**Participant.** Sarah, a complex-case financial crime investigator at a mid-size bank
(persona: study/personas/fraud-analyst.md). Locked-down Windows laptop, corporate Chrome, no admin
rights, DevTools likely blocked by policy. Customer data may not leave approved systems; SAR
content is confidential by law.

**Task, as the moderator gave it.** "Your organization has strict rules about where data may go.
Decide whether you may use this tool on your data, and tell me what you would say to IT."

**Mode.** Not mandated. Her own initiative, so her usual patience: a few minutes, then a verdict.

**Screens seen, in order** (study view, design notes hidden): the start screen; the project frame
(protein sample); the "Where your data goes" page, read top to bottom including its bottom strip
of app pictures; the Data panel of a payments project; the Data panel scrolled to "Sent and
saved". The old address of the data page (screens/where-your-data-goes.html) now only redirects
to the same page.
Renders: shots/tasks/data-stays-here/01-start-screen.png, 02-frame-at-rest.png,
03-data-location.png; full-page and cropped renders in tmp/r6-sarah-data/ (data-location.png and
its crops -0 to -3 and bottom.png, data-panel.png, data-panel-sent-and-saved.png).

---

## Think-aloud

### 1. Start screen

> "Open a graph." First line under it: "Files stay on this computer. graphty reads them in this
> browser and uploads nothing." Good. Same line as last time, still the first thing it says.
> A vendor slide says that too, so I'm not believing it yet.
>
> "Projects are kept in this browser." That's the one I care about more. Uploading I can
> check. Customer data sitting in Chrome on my laptop is data at rest outside an approved system.
>
> "Where your data goes" link, right there on the same line. That's what I'd click. "Connect to
> data source..." -- plug icon, it talks to something. Not touching it. The info icon next to
> it, I'm skipping, it's a tooltip.
>
> Bank transfers sample, 3,000 accounts. Maybe later, if I get that far.

### 2. Inside a project, before I read anything

> (Protein sample open.) Under the name: "Nothing has been sent from this project." Underlined,
> so it's a link. Left side, under the icons: "Assistant. Off. Nothing is sent." Fine. Two places
> on screen, no clicking. If an auditor asks "did you use the AI thing on this case" I can
> screenshot that. That's worth something.
>
> Nothing up top says "cloud" or "sign in". No account icon. OK.

### 3. "Where your data goes"

> Own page, not a popup. "It is written so you can forward it to whoever approves software where
> you work." Yes, that's exactly what I need it for. "Copy link", "Print or save as PDF". And
> "Describes graphty 2.0. Updated September 28, 2026." IT's questionnaire asks which version
> you're attesting to. Good.
>
> "In short." Files not uploaded, no account, no server that gets my data. Data leaves only
> through two features, both off: Connect to data source, and the Assistant. Projects in this
> browser, on this computer only. No password or key in the sent list or a project file. Four
> sentences I could paste into an email as-is.
>
> "What stays in this browser." Files -- read into memory, "not copied anywhere". Projects --
> "kept in this browser's storage ... on this computer. They stay until you delete the project
> or clear this site's data." There it is again. So a saved project with real transactions sits
> in Chrome until somebody deletes it. Encrypted? Doesn't say. Laptop has full-disk encryption,
> IT will probably accept that, but they'll ask. And "clear this site's data" -- on my laptop
> half the Chrome settings are greyed out. Is there a way to just not save? Open, look, close,
> nothing kept? I don't see one. That's what I'd actually want for real customer data.
>
> Exports -- save dialog, keeps no copy. Same as Excel, we have rules for that already.
> Assistant key -- not my problem, I won't have one. Data-source password -- memory only, gone
> when the tab closes. Fine.
>
> "What leaves this browser, and only when you ask." Feature, what is sent, to whom, when. That's
> a vendor data-flow table. I'd paste it straight in.
>
> The Assistant: "your question; the graph's counts; each column's name with up to 10 of its
> values ... names and values of the nodes it looks up", to Anthropic, OpenAI or Google. In my
> data node names are account numbers and customer names. That's a hard no at a bank. At least
> it says it straight. Off until someone sets a provider -- and that someone is me, on my own
> laptop. I'd rather IT could lock it off so there's no question.
>
> "A recipe or project file that names a data source -- Nothing, until you confirm." So a file
> someone emails me can't phone out on its own. IT would ask that; I wouldn't have.
>
> "Opening graphty -- Nothing from your files ... Where graphty is hosted." Where IS it hosted?
> Still doesn't say. Which company, which country. That's IT's second question, right after
> "does it upload".
>
> The grey box: "The app says when something leaves." After a query it reads "Sent to
> neo4j.internal.example: 1 query. Nothing else." There's a list with times, "See what was sent",
> and "Export log" to attach to a review. OK, that's an audit trail. I'd want that log in the case
> file if anything ever did get sent.
>
> "What graphty does not send." No account. No file contents except through those features. No
> fonts or code from other sites. Then: "Usage statistics and crash reports:" -- and nothing.
> Blank. Still blank. That's the line IT reads hardest and it's empty. I can't forward a page with
> a colon and nothing after it next to telemetry. They'll read blank as yes, or as "nobody
> checked", and either way it goes to the bottom of the pile.
>
> "Check it yourself. ... Network tab." Not on my laptop. That's for IT, and honestly it's a good
> line for them -- they can run it in a sandbox. I'd forward it.
>
> "What this page does not promise." Provider terms not covered. Projects not safe from loss.
> Nothing against other people on the same login or browser extensions. "A description of
> graphty 2.0, not a certification or a contract." Honest. I trust that more than a badge. But
> procurement will say: no contract, so who do we hold responsible?
>
> "For organizations." "Running your own copy of graphty, inside your network:" -- blank.
> "Turning the Assistant off for everyone in an organization:" -- blank. "Questions this page does
> not answer: Contact." Contact who? No name, no address, just a link word. Those two blanks are
> the only two things that would get this through at a bank, and they're empty. Same as last
> time.
>
> Scrolled further. There's a strip of little pictures of the app. One says, big: "Sent: nothing.
> The Assistant is off and no data source is connected." and under it "Who hosts graphty, and
> where: Not decided yet". Huh. So the app itself says "not decided yet" but this page, the one
> I'm supposed to send to IT, just has a blank. Which is it? "Not decided yet" is at least a real
> answer. It's a bad answer for me, but it's an answer. The document IT gets is the one with the
> holes in it. That's backwards.
>
> Then a menu picture: Help > "Where your data goes". OK, so I can find this page again from
> inside the app. Good.

### 4. The Data panel -- does the app say the same?

> (Payments project, Data panel.) Same line under the name, "Nothing has been sent from this
> project." Sources: transfers-2026-03.csv, 9,113 rows. From_account, to_account, amount,
> timestamp. That's my kind of file. Fine.
>
> (Scrolled to "Sent and saved from this project".) "Sent: nothing. The Assistant is off and no
> data source is connected." Then three lines:
> "Who hosts graphty, and where: Not decided yet."
> "Usage statistics and crash reports: Not decided yet."
> "Assistant off for a whole organization: Not decided yet."
>
> OK. So they know these are the questions. Good that it doesn't pretend. But "not decided yet"
> on who hosts it and on telemetry -- read as IT: this is software whose owner hasn't decided
> whether it collects usage data. That is a no until it's decided. It's not a blocker I can work
> around, it's a blocker by definition.
>
> "Saved to this computer": april-communities.svg, accounts-by-pagerank.csv, a recipe with "no
> data", and "Payments network review -- Project file, with its data, Apr 2." Every file that went
> out, with a date. That's an audit trail. I like that more than anything else here. Excel doesn't
> give me that. If an examiner asks "where did copies of this customer data go", I have a list.
>
> Also note: "Project file, with its data" -- a file on disk with customer data. Same as an Excel
> export, we already have rules. At least it says which files carry data and which don't ("no
> data" on the recipe). IT will like that distinction.
>
> But the list lives in the browser too. Clear the browser, the list goes. Export log would fix
> that -- the page says it appears once something has been sent. Nothing sent, nothing to export.
> Fine.

### 5. Verdict

> Can I use it on real customer data? No. Not today. Nothing here looks wrong. It's straighter
> than most vendor pages I've read. But I don't make that call, and the page I'm supposed to send
> IT still has blanks in exactly the places they'll look first: who hosts it, whether it sends
> usage data, whether we can run our own copy, whether the AI can be switched off for everyone,
> and who to ask. The app now at least says "not decided yet" on three of those, which is more
> honest -- and it also tells me the answer to my question is no, because "not decided" on
> telemetry is not approvable.
>
> What I'd do: send IT the PDF and a short email, and meanwhile use the Bank transfers sample or
> a de-identified extract to see if it's even worth pushing for.

---

## What she would send IT (her words)

> Subject: Review request -- graphty (browser link chart tool), not for live data yet
>
> I'd like to evaluate graphty for link analysis on complex cases. Their data statement is
> attached ("Where your data goes", version 2.0, dated September 28, 2026).
>
> What it says:
> - Files are read in the browser, not uploaded. No account, no vendor server receiving data.
> - Only two features send data out, both off by default: "Connect to data source" (to an address
>   the user types) and an "Assistant" that sends account names and up to 10 sample values per
>   column to Anthropic, OpenAI or Google under the user's own key. I would use neither.
> - A shared file that names a data source fetches nothing until the user confirms.
> - Saved projects stay in Chrome's site storage on the laptop until deleted. Encryption is not
>   stated. Exports go through the normal save dialog.
> - The app shows "Nothing has been sent from this project" and keeps a list of every file
>   exported, with dates, and marks which ones contain data.
> - The page suggests confirming in the browser Network tab that nothing else goes out -- can you
>   test that in a sandbox?
>
> What it does not answer, and what I need before loading anything real:
> 1. Who hosts it and in what country. (The app says "Not decided yet"; the page is blank.)
> 2. Usage statistics / crash reports. (Same: "Not decided yet" in the app, blank on the page.)
> 3. Whether we can host our own copy inside the network. (Blank.)
> 4. Whether the Assistant can be disabled for everyone. (Not decided.) If not, can we block the
>    three provider domains at the proxy?
> 5. Whether project data in Chrome storage meets our data-at-rest and retention rules, and
>    whether there's a way to use it without saving anything.
> 6. Who is responsible -- the page says it is "not a certification or a contract" and the
>    contact link names nobody.
>
> Until then I will only use the built-in sample or a de-identified extract. This probably needs
> to go through vendor risk as open-source or unowned software.

---

## Single Ease Question

**5 out of 7.**

> Finding out was easy -- first line on the start screen, a page built for exactly this, and the
> app says it again inside the project. Deciding wasn't, because the same four or five questions
> are still open. The app saying "not decided yet" is fairer than a blank, but it's not easier to
> decide on. And the page I actually forward still has the blanks, which is the one place it
> matters.

## Would she use it instead of her current tool?

> No. Not instead of anything. Excel and the case system are approved; this isn't. If IT could
> run our own copy with the Assistant off for everyone and a statement that there's no telemetry,
> I'd try it next to i2 on the next mule case with more than twenty accounts -- the sent-and-saved
> list is a better audit story than i2's shared licence box. But I'm not the one who says yes, and
> right now the person who does would say no.

---

## Problems observed

1. **The forwardable page still has blanks where IT looks first.** "Usage statistics and crash
   reports:", "Running your own copy of graphty, inside your network:" and "Turning the Assistant
   off for everyone in an organization:" end in nothing, "Where graphty is hosted." names no
   host, and "Contact" names no one. She said: "I can't forward a page with a colon and nothing
   after it next to telemetry. They'll read blank as yes." Unchanged from the previous round.
   Severity: high -- it decides the task's outcome.
2. **The app and the page disagree on the same open questions.** Data > Sent and saved (and the
   picture of it at the bottom of the data page) says "Not decided yet" for hosting, usage
   statistics and the organization-wide Assistant switch; the data page itself, the document meant
   for IT, shows a bare colon for the same lines. She read the in-app wording as more honest and
   asked "Which is it?" -- "The document IT gets is the one with the holes in it. That's
   backwards." Severity: high.
3. **"Not decided yet" answers the question, and the answer is no.** Honest, but for a bank
   reviewer an undecided telemetry policy and an unnamed host are a refusal by definition. The
   wording does not change her decision; only a real answer would. Severity: high (a product
   decision, not a wording fix).
4. **No way to use it without storing customer data in the browser.** Projects stay in site
   storage until deleted or until site data is cleared, which a managed laptop often blocks;
   encryption is not stated. She asked for an "open, look, close, nothing kept" way of working.
   Severity: high.
5. **The Assistant's safety rests on the analyst not turning it on.** The page says plainly that
   it would send account names and sample values to a provider; she wants IT, not herself, to be
   the switch. Severity: medium.
6. **"Check it yourself" is addressed to someone who cannot.** DevTools is blocked on her laptop;
   she would forward the line to IT, for whom it is useful. Severity: low.
7. **"Contact" names no person or address.** On a page that says it is not a contract, she wanted
   a responsible party. Severity: low.

## What worked for her

- The privacy line is the first sentence on the start screen, with the link to the data page on
  the same line.
- Inside a project, "Nothing has been sent from this project" and "Assistant. Off. Nothing is
  sent." are visible without clicking; she would screenshot them for the case file.
- The data page has a version, a date, Copy link and Print or save as PDF -- the shape of an
  attachment to a request.
- The "What leaves this browser" table (feature, what, to whom, when) matches a vendor data-flow
  questionnaire; she would paste it as-is.
- A file that names a data source fetches nothing until she confirms -- a risk IT would raise that
  she would not have.
- "What this page does not promise" earned trust: "Honest. I trust that more than a badge."
- Sent and saved lists every exported file with its date and says which carry data ("Project
  file, with its data") and which do not ("Recipe: definitions, no data") -- "That's an audit
  trail. Excel doesn't give me that."
- Help > "Where your data goes" means she can find the page again from inside the app.
