# Session: may I use this on bank data? -- Sarah, fraud investigator

**Participant.** Sarah, a complex-case financial crime investigator at a mid-size bank
(persona: study/personas/fraud-analyst.md). Locked-down Windows laptop, corporate Chrome, no admin
rights. Customer data may not leave approved systems; SAR content is confidential by law.

**Task, as the moderator gave it.** "Your organization has strict rules about where data may go.
Decide whether you may use this tool on your data, and tell me what you would say to IT."

**Mode.** Not mandated. Her own initiative, so her usual patience: a few minutes, then a verdict.

**Screens seen, in order** (study view, design notes hidden): the start screen, the "Where your
data goes" page, the project frame (Les Miserables sample), the Data panel of a payments project,
and the Data panel scrolled to "Sent and saved".
Renders: shots/record/r4-sarah-dsh-start-screen-view.png, shots/record/r4-sarah-dsh-data-location.png (and
the crops in tmp/sarah-dsh/), shots/record/r4-sarah-dsh-frame-at-rest.png,
shots/record/r4-sarah-dsh-data-panel-view.png, shots/screens__data-panel-s7.png.

---

## Think-aloud

### 1. Start screen

> OK, "Open a graph". Before I look at anything else -- first line, "Files stay on this computer.
> graphty reads them in this browser and uploads nothing." Good, that's the first thing I'd ask,
> and it's the first thing it says. I don't believe it yet, a vendor slide says the same thing,
> but at least they know it's the question.
>
> "Projects are kept in this browser." Hm. Kept where exactly? That's the one that worries me more
> than uploads. If I open a transaction export here, is a copy of customer data now sitting in
> Chrome on my laptop? That's data at rest outside an approved system. Our retention people would
> want to know that, not just "does it upload".
>
> There's a link, "Where your data goes". That's the one. I'm not touching "Connect to data
> source" -- plug icon, sounds like it talks to something. Leave it.
>
> "Bank transfers, 3,000 accounts" sample. Cute. Not today.

### 2. "Where your data goes"

> Opens as its own page. "It is written so you can forward it to whoever approves software where
> you work." OK, you know who I have to go through. "Copy link", "Print or save as PDF". Good --
> IT will want a document, not me describing a screen from memory. And it has a version and a
> date, "Describes graphty 2.0. Updated September 28, 2026." That's actually the first thing a
> vendor risk questionnaire asks: which version are you attesting to.
>
> "In short." Four lines. "Files you open are read by this browser and are not uploaded. graphty
> has no account and no server that receives your data." "Data leaves the browser only through
> two features, both off until you turn them on: Connect to data source and the Assistant."
> Fine. That's a sentence I can paste into an email.
>
> "No password or key ever appears in the list of what was sent..." -- OK, that's more for IT
> than me.
>
> "What stays in this browser." Files -- read into memory, not copied. Projects -- "kept in this
> browser's storage for graphty, on this computer ... They stay until you delete the project or
> clear this site's data." There it is. So yes: if I load real transactions and save a project,
> customer data sits in Chrome's storage on my laptop until someone deletes it. Is it encrypted?
> Doesn't say. Our laptops have full-disk encryption, IT will probably say that covers it, but
> they'll ask. And I can't clear site data on my own laptop half the time, the policy blocks
> settings. So I'd have to remember to delete projects, and nobody remembers.
>
> Exports -- save dialog, "graphty keeps no copy". Fine, same as Excel.
>
> "What leaves this browser." This table is good. Feature, what is sent, to whom, when. That's
> the format of a data flow on a vendor assessment. Connect to data source -- goes to whatever
> address I type. We wouldn't do that anyway. A recipe or project file that names a data source
> -- "Nothing, until you confirm." OK, so a file someone emails me can't quietly phone out. Good,
> I wouldn't have thought to ask that, IT would.
>
> The Assistant. "Your question; the graph's counts; each column's name with up to 10 of its
> values ... and the names and values of the nodes it looks up." Right. Names of nodes -- in my
> data those are account numbers and customer names. Up to 10 values of each column. That's
> customer data going to Anthropic or OpenAI or Google. That's an absolute no at my bank, full
> stop. At least it says so plainly instead of "we may share with partners". And it's off until
> somebody sets a provider -- which, on my laptop, would be me. That's the problem. I'd want IT
> to be able to turn it off so I can't fat-finger it.
>
> "Opening graphty -- Nothing from your files. The browser asks for graphty's own code ... Where
> graphty is hosted." Where IS it hosted? It doesn't say. Who runs it? What country? That's the
> first question IT asks after "does it upload". It's blank.
>
> "What graphty does not send." No account. No fonts or code from other sites -- OK, that's a
> nice detail, no Google Fonts calling out. "Usage statistics and crash reports:" -- and then
> nothing. Blank. That's the line IT reads most carefully and it's empty. Is that "none"? Is it
> unfinished? I can't send IT a page with a blank next to telemetry. They'll read blank as yes.
>
> "Check it yourself. Open your browser's developer tools, choose the Network tab..." Ha. On my
> laptop? DevTools is probably disabled by group policy. That's for IT, not for me. I'd forward
> that line to them -- actually that's useful for them, they can test it in a sandbox.
>
> "What this page does not promise." Doesn't cover the provider's terms. Doesn't keep projects
> safe from loss. Doesn't protect against other people on the same login or browser extensions.
> "It is a description of graphty 2.0, not a certification or a contract." OK -- honest. I'd
> rather have that than a SOC 2 badge I can't check. But IT will say: no contract, no vendor,
> nobody to hold responsible. That's a procurement conversation, not a technical one.
>
> "For organizations." "Running your own copy of graphty, inside your network:" -- blank.
> "Turning the Assistant off for everyone in an organization:" -- blank. Those are the two
> things that would get this approved at a bank, and they're both empty. "Questions this page
> does not answer: Contact." A contact link. To whom? A person? A form? I'd click it but I
> suspect it goes to a GitHub page.

### 3. Inside a project -- does the app say the same thing?

> (Frame, Les Miserables sample.) Under the project name, lock icon, "Nothing has been sent from
> this project." Left rail, "Assistant. Off. Nothing is sent." OK, it's said twice on screen,
> that's good. I'd screenshot that for the case file if I ever had to show it wasn't used.
>
> (Data panel, payments project.) "Nothing has been sent from this project" -- underlined, so it
> goes somewhere. Scroll down: "Sent and saved from this project. Sent: nothing. The Assistant is
> off and no data source is connected." Then "Saved to this computer" -- the figure, the CSV of
> accounts, a recipe, a project file "with its data", each with a date. That's an audit trail.
> I actually like that. If an auditor asks "where did copies of this data go", there's a list.
>
> But it's a list inside the browser. If they wipe the browser, the list goes too. And I can't
> see here an "Export log" -- the page said there's one, maybe it only shows once something was
> sent. (Looked at the page's example: yes, "Export log" at the top of that list when there are
> sends.) Fine.
>
> "Payments network review -- Project file, with its data." That's a file on my disk with
> customer data in it. Same as an Excel export, honestly. We already have rules for that.

### 4. Verdict

> Can I use it on real customer data today? No. Not because anything here looks wrong -- it
> reads straighter than most vendor pages I've seen -- but because I'm not allowed to decide
> that, and the page leaves blank exactly the three things IT will ask: who hosts it, whether it
> sends telemetry, and whether we can run our own copy. Until someone fills those in, it's a
> public website, and a public website doesn't get customer data. I'd use the Bank transfers
> sample, or a de-identified export, to see if it's even worth the ask.

---

## What she would send IT (her words)

> Subject: Request for review -- graphty (browser link chart tool)
>
> I'd like to evaluate graphty for complex-case link analysis. The vendor's data statement is
> attached (PDF, "Where your data goes", describes version 2.0, dated September 28, 2026).
>
> What it says:
> - Files are read in the browser and not uploaded. No account, no vendor server receiving data.
> - Two features can send data out: "Connect to data source" and an "Assistant" that sends
>   account names and sample column values to Anthropic, OpenAI or Google. I would not use either.
> - Saved projects stay in Chrome's site storage on the laptop until deleted. Encryption of that
>   storage is not stated.
> - A file naming an outside address fetches nothing until the user confirms.
> - The page suggests checking the Network tab to confirm nothing else goes out.
>
> What it does NOT say, and what I need from you before I load anything real:
> 1. Who hosts it and where.
> 2. Whether it sends usage statistics or crash reports (the line is blank).
> 3. Whether we can host our own copy inside the network (blank).
> 4. Whether the Assistant can be disabled centrally (blank). If not, can we block the three
>    provider domains at the proxy?
> 5. Whether project data in browser storage meets our data-at-rest and retention rules.
>
> Until then I'll only use the built-in sample or a de-identified extract. There's no contract
> or vendor attestation -- the page says so itself -- so this may need to go through vendor risk
> as open-source software.

---

## Single Ease Question

**5 out of 7.**

> Finding the answer was easy -- it's the first line on the start screen and there's a page
> made for exactly this. Getting to a decision wasn't, because the page stops at the three
> questions that decide it. The easy part was easy. The hard part isn't there.

## Would she use it instead of her current tool?

> No -- not instead. For now it's a "maybe, if IT says yes" next to i2, not a replacement for
> anything. Excel and the case system are already approved; this isn't. If IT could run our own
> copy with the Assistant switched off, I'd try it on the next mule case with more than twenty
> accounts, because "nothing leaves the laptop" is a better story than i2's shared licence
> server. But I'm not the one who says yes, and the page doesn't yet give the person who does
> enough to say it.

---

## Problems observed

1. **Blank answers read as a hidden yes.** On the data page, "Usage statistics and crash
   reports:", "Running your own copy of graphty, inside your network:" and "Turning the Assistant
   off for everyone in an organization:" are followed by nothing, and "Where graphty is hosted"
   names no host. These are the first four questions a bank's IT reviewer asks. She said she
   could not forward a page with a blank next to telemetry: "They'll read blank as yes." Severity:
   high -- this blocks the task's outcome, not its path.
2. **Browser storage of customer data is the real concern, and it is stated but not resolved.**
   "Projects are kept in this browser" made her think of data at rest outside an approved
   system, not of uploads. The page says how long projects stay but not whether they are
   encrypted, and the only way it names to remove them ("clear this site's data") is often
   blocked on a managed laptop. She asked for a way not to keep the data at all. Severity: high.
3. **The Assistant's safety depends on the analyst not turning it on.** The page is honest that
   it sends node names and up to 10 values per column to a provider -- for her, account numbers
   and customer names. It is off by default, but only she stands between it and a provider key;
   she wanted an organization-level switch, which the page lists without an answer. Severity:
   medium.
4. **"Check it yourself" assumes developer tools a locked-down user may not have.** She read it
   as an instruction for IT, not for herself, and would forward it. Useful, but addressed to the
   wrong reader. Severity: low.
5. **"Contact" does not say who answers.** On a page that openly says it is not a contract, she
   wanted a named responsible party; a bare link left her guessing it went to a code repository.
   Severity: low.

## What worked for her

- The privacy line is the first sentence on the start screen, in plain words.
- "Where your data goes" is a separate page with a version, a date, Copy link and Print or save
  as PDF -- the shape of something she can attach to a request.
- The "What leaves this browser" table (feature, what, to whom, when) matches a vendor data-flow
  questionnaire; she would paste it.
- A project or recipe file that names a data source fetches nothing until she confirms -- a risk
  she would not have thought of that IT would.
- "What this page does not promise" earned trust: "I'd rather have that than a badge I can't
  check."
- In the app, "Nothing has been sent from this project" and "Assistant. Off. Nothing is sent."
  are visible without clicking, and "Sent and saved" lists every export with its date -- "That's
  an audit trail."
