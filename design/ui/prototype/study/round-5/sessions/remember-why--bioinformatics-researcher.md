# Leave yourself a note on why you kept these accounts -- Dr. Chen

**Task, as the moderator gave it:** "You kept these accounts aside for a reason. Leave yourself a
note on why, so you remember next week."

**Participant:** Dr. Chen, computational biologist (drug target discovery). Works in R and igraph,
uses Cytoscape for figures, keeps her reasoning in R Markdown and the institute's electronic lab
notebook. Reads numbers closely, skims prose.

**Screens used:** the take-a-note screen (the "March transfers" project, a frozen set called "Mule
ring", 14 accounts), the notes panel (empty, on "Human protein interactions", and with five notes
on the same network), and the take-a-note flow page.

**Outcome:** done, after a first attempt through the Notes panel that asked her to pick a subject
she had not expected to pick. **Single Ease Question:** 5 of 7.

---

## Think-aloud

**1. Whose data is this.** "Accounts." This is a bank's transfer network, not mine. Fine, I will
read "account" as "gene" and "the ring" as "my module". Left panel: Graphs, Transfers 3,000; Sets
and paths, "Mule ring, frozen, 14". That is the only thing anybody kept aside, so that is "these
accounts". "Frozen" I read as "the membership is fixed even if the data changes" -- which is
exactly what I would want for a candidate list I handed to the bench. If it means something else,
nobody told me.

**2. Where do notes live.** There is a "Notes" icon on the left rail. That is where I go first; I
do not go hunting in menus for something that has its own button. The empty panel says "No notes
yet. A note can be about a selection, a set, a result or the whole graph." and a button "Add
note...". Underneath: "Notes are saved in the project and travel in project files and findings
reports." Good -- that is the first question I would have asked. It does not say "stays on your
machine", though, and I want that sentence before I write anything about unpublished targets.

**3. Add note from the panel.** I click "Add note...". The editor opens with "About" asking me to
pick what the note is about, with nothing chosen. I expected it to know. I just told it I am in
the notes, it can see the ring is the only set I have. I pick the ring from the canvas -- the
flow says clicking the set works -- and "About Mule ring, 14 accounts" fills in. One extra step,
not a disaster, but it is the step where I would have typed into a note about the whole graph by
mistake if I were in a hurry.

**4. The other way in.** The moderator shows me the set's own "..." menu: Compare with...,
Collapse, Hide on canvas, Run layout, Extract as graph, and at the bottom "Add note...". That is
quicker because the subject is already filled in. I would not have found it first; "Add note" is
not an action on the set, it is something I do about the set. But in Cytoscape everything is in a
right-click menu too, so I would learn it.

**5. Writing.** The note says: "Referred for a SAR. 14 personal accounts in 7 countries,
riskScore 88 to 98. ACC-753261 ranks highest in the ring by PageRank: likely the collector." In
my world this would be "Kept for siRNA: 14 genes in the interferon module, adj.P < 0.01, logFC
beyond 1.5; IRF7 top by betweenness inside the module." The part that matters to me is not the
sentence, it is the numbers under it.

- **"Cites PageRank, full graph".** So the note points at the computation it relied on. That is
  what I want. But "full graph" is not a parameter set. The PageRank result itself says
  "Directed, damping 0.85. Unweighted. CPU." Is that frozen into the citation, or will the chip
  just point at whatever PageRank is now? In the notes list somebody typed "Damping 0.85, the
  team default" as a separate note by hand -- which tells me the citation does not carry it, or
  they would not have needed to.
- **"Quote a value..."** I type "753", it offers ACC-753261 with PageRank 0.000551, riskScore
  95, country BR. I pick the PageRank one and it becomes a little box "ACC-753261 pagerank
  0.000551". This is the best thing on the screen. It is the number, as it was, in the note. I
  have been copying numbers into lab notebooks by hand for fifteen years and I get one wrong a
  year.
- **"Enter adds. Shift+Enter, new line."** No. My notes have line breaks: the reason, then the
  thresholds, then what to check. I will press Enter after the first line and it will be filed
  half-written. The flow says it is undoable, but "Add note" as one undo entry means I undo the
  whole note, not get the editor back with my text in it. I would rather Enter be a new line and
  a button do the adding, like every lab notebook I have used.

**6. After adding.** The note shows "Sep 28 2026, 10:42", the About line, the text, the cite and
the quote. A small "1" badge sits on the canvas near the ring, and the set's own panel grows a
"Notes 1" section. Fine. I checked: nothing I typed was rewritten. The date is there without me
doing anything. No time zone, but it is my own project; I can live with that.

**7. Next week.** The notes panel is a list, newest first, each with date, text, what it is about
and what it cites. There is a "Find in notes" box and a filter. I click the ring's note, the ring
lights up and the note opens beside it. That is the "why did I keep these" moment, and it works.

Two rows made me stop:

- **"Detached. The set this note pointed to was changed. Bring back Suspects, first pass (as kept
  Sep 19)."** So a set that was not frozen got edited and the note noticed. And it can give me the
  old membership back. That is better than anything I have. I am reading it as: frozen sets never
  do this, unfrozen ones can, and the note keeps the old list for me. If that is right, it should
  say so once, in one line, where I freeze a set.
- **After new data: "Earlier data", "now 0.000428 in April's data", "Add current value".** The
  quoted number stayed as I wrote it and next to it the tool tells me the current value is
  different. That is my STRING-version problem exactly: I write down a score, STRING releases v12,
  a third of the edges move, and my note is quietly wrong. Here it is loudly out of date. Good.
  But it tells me the data is "April's". For my work it must say which file and which database
  version, not a month. "April's data" is a month in a bank; it is nothing in biology.

**8. The notes on a real network.** The moderator shows the same panel on "Human protein
interactions", with notes under my name: "TP53 is the only DNA repair protein in the top five by
betweenness (0.114...)", "Unweighted, full graph. 10 proteins score 0: the 2 isolated ones and 8
wit...", "Okabe-Ito in module order...". These are the notes I would write. Two things:

- That screen has a different left rail from the one I just used (Graph, Assistant, Results,
  Notes, and an "Export..." button top right; the other one had Graph, Data, Notes and no Export
  button). Is "Results" gone? Which one is the product? I notice because I will be looking for my
  betweenness table.
- The text is cut off with "..." in the list. For a note that holds a number, the number is
  usually at the end. I would want the first line in full, or a way to widen the panel.

**9. Getting it out.** Notes "travel in project files and findings reports", and the flow says
the findings report is an HTML file that prints to PDF. That is for a reviewer. For me I need the
notes as text: a table of note, date, what it is about, what it cites, the quoted values -- a TSV
I can drop next to my node table, or something R can read out of the project file. I did not see
any way to do that. If I cannot pull them out, they live only in this tool, and a tool I may not
be using in two years is not where my reasoning goes.

---

## Single Ease Question

**5 of 7.** Writing the note was easy once the editor knew what it was about. I lost a step
starting from the Notes panel, and I would lose a note the first time Enter filed it half-written.

## Would she use this instead of her current tool?

"My current tool for this is an R Markdown file and the lab notebook. Cytoscape has nothing like
it; I type node names into a text file and hope they still mean something in six months.

As a place to write why I kept a list, beside the list, with the numbers quoted and flagged when
the data moves -- yes, I would use this, and the 'Earlier data' flag alone is worth the session.
Instead of my notebook, no, not yet: I cannot get the notes out as a table or read them from R,
the citation does not visibly carry the algorithm's parameters, and 'April's data' is not a data
version. Show me the parameters on the cite, the file and database version on the flag, and a TSV
of notes, and this is where I would write things down first."

---

## Problems she named

| Where | What | Severity (1-4) |
|---|---|---|
| Note editor, Enter behaviour | "Enter adds" files a multi-line note after its first line; undo removes the whole note instead of returning the text to the editor | 3 |
| Note citation chip | "Cites PageRank, full graph" does not show the parameters the result ran with (directed, damping, weighted); a human had to write them in a separate note | 3 |
| Getting notes out | No text or table export of notes, no way to read them from a script; only the findings report (HTML/PDF) | 3 |
| Out-of-date flag | "in April's data" names a month, not the file or database version the value came from | 2 |
| Notes panel, Add note | Starting from the panel asks for a subject with nothing chosen, even when one set is the obvious candidate | 2 |
| Frozen vs Detached | Nothing says that a frozen set cannot detach a note and an unfrozen one can; she had to infer it | 2 |
| Notes panel on the protein network | A different left rail (Results, Assistant, Export button) from the take-a-note screens; she could not tell which is current | 2 |
| Notes list | Note text truncated with "..." where the quoted number usually sits | 1 |
| Notes panel empty state | "Saved in the project" does not say whether the project stays on her machine | 2 |

## What pleased her

- "Quote a value..." puts the number itself in the note, from the data, not retyped.
- The "Earlier data" flag with the current value beside the quoted one: a note that says out loud
  when it has gone stale.
- "Bring back ... (as kept Sep 19)": the old membership of a changed set is recoverable from the
  note.
- Date and subject recorded without her doing anything; clicking a note brings back the set it is
  about.
- The empty panel says where notes go (project files, findings reports) before she writes one.
