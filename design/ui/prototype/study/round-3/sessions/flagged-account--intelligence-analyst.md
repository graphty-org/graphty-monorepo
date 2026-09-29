# Session: clear or refer a flagged account -- Marcus, criminal intelligence analyst

Participant: Marcus, 44, criminal intelligence analyst at a state fusion center (persona in
study/personas/intelligence-analyst.md). Works in i2 Analyst's Notebook and Excel on phone
returns and bank subpoena returns; everything he produces may end up in discovery.

Task, as the moderator gave it: "An alert flagged account ACC-365386. Decide whether to clear it
or refer it, and keep what you would need to justify that."

Screens used, in the order he met them, in the participant view (design notes hidden): Find (just
opened, a name typed, an account id typed with no match, the same id after "Search recent
projects"); the inspector (one node at rest, its Neighbors menu, one link, a large selection on the
March transfers); the filter chip and its steps (three steps, editing a step); the notes panel
(empty, a note open, searching notes); the export dialog (the evidence file, and the message after
an export). Renders: shots/find--s1.png, shots/find--s2.png, shots/r3-marcus-find-s10.png,
shots/r3-marcus-find-s11.png, shots/r3-marcus-inspector-one-node.png,
shots/r3-marcus-inspector-grow.png, shots/r3-marcus-inspector-edge.png,
shots/r3-marcus-inspector-cap.png, shots/r3-marcus-filter-three.png,
shots/r3-marcus-filter-edit.png, shots/r3-marcus-notes-s1.png, shots/r3-marcus-notes-s3.png,
shots/r3-marcus-notes-s5.png, shots/r3-marcus-export-evidence.png, shots/r3-marcus-export-done.png.

## Think-aloud transcript

**Find, just opened.**

> Okay, account number. First thing I do is look it up. There's a box top left, "Name, id or
> value". Good, that's what I want. But hang on -- the title says "Les Miserables". Twenty-eight of
> seventy-seven nodes. Valjean, Javert. That's the book. Why am I looking at a novel? Somebody left
> the demo file open. Fine, I'll type anyway and see what it does.

> I type "thenard" just to see how it searches since that's what's on screen -- two hits,
> Thenardier and the wife, each with "group 4, degree 11". Degree I know. Group 4 means nothing to
> me but whatever. It's fast and it tells me where each one sits. That part works like I'd expect.

**Find, typing the account.**

> Now the real one. ACC-365386, Enter.

> Different screen now -- "Transfers, April 2026", 3,093 accounts. Okay, that's more like it. But
> the box says ACC-705989. That is not what I typed. Three-six-five-three-eight-six. I'd retype it
> and it'd still say that, so I guess this thing only knows one number. Moving on, but if I saw
> that on a real case I'd stop right there -- if the search box changes my number I don't trust
> anything under it.

> "0 matches in Transfers, April 2026 (3,093 accounts)." Alright. At least it says WHICH file it
> looked in and how big it was, I'll give it that. And it didn't hand me some "did you mean
> ACC-365388" -- good, because that's a different customer and I'd hate to be the guy who pulled
> the wrong account. So he's not in April. Was he closed out? Was the alert on another month?
> Nothing here says where the alert came from. I've got an alert, no alert.

> "Search recent projects." Sure, click it. "Recent projects, found in 1 of 7. Found in Transfers,
> March 2026. Open." Okay, that's actually handy -- that's the "I know I've seen that number
> before, which case was it" problem. If that works for real, I like it. It only looked in stuff
> I've opened, and it says 1 of 7, so I know it didn't go rummaging somewhere. I click Open.

**The inspector.**

> And I'm on... proteins. "Human protein interactions", TP53. I don't know what TP53 is. The
> March file is what I asked for. Okay, I know it's a mock, I'll pretend this dot is my account.

> Right panel: "Neighbors" button, hover says "Filter to neighbors, 1 hop: 33 nodes. Ctrl+Z undoes
> it." Caret opens "1 hop 33, 2 hops 169, 3 hops 296", and "Filter to neighbors" versus "Select
> neighbors". This I like. It tells me how big it gets BEFORE I blow the chart up. Two hops is
> where every one of my charts turns into five hundred people. Seeing 169 up front, I'd stop at
> one. That's the "thirty people around this guy" I always want.

> Attributes: degree 32, "#2 of 300", betweenness 0.1139 "#2 of 300". Rank I can say to a
> sergeant. 0.1139 I can't. Point one one of what. At least the rank is there.

> I click a line. "TP53 -- BRCA1, Edge, confidence 0.71." For my stuff a line is a transfer. Where
> is the date? The amount? Which bank return, which page? Confidence 0.71 -- who decided that?
> I can't put a line in a chart if I can't point to the record it came from. There's "Add a note"
> on it, so maybe I'd type the source in by hand, like I do in i2. That's not a fix, that's me
> doing the tool's job.

> Here's a transfers one -- "Transfers, March 2026", 7,495 selected, one big outline around a
> meatball. Table under it has id, kind, country, total degree, riskScore, flagged. OK so there
> ARE flag and risk columns. That's what I'd want on my guy. riskScore 62, 43, 50 -- scale of
> what? Out of 100? Who computed it, the bank, the vendor, this program? And "flagged: false" on
> all of them. I want to see the one that's true and WHY it's true. This view is somebody pulling
> two hops off a merchant, not my account. I scroll the table in my head for 365386 -- not in the
> seven rows showing. There's a "Mule ring, fixed, 14" set on the left. Mule ring. Now that's a
> lead. Who made it? When? Based on what?

**Filter chip.**

> Back to the book. Filter steps: "Filter to degree >= 2, took out 17, 60 left", then ">= 5,
> took out 20, 40 left", "Filter out group 8, took out 13, 27 left". Each step says what it did
> and how many it cut. That's my methodology paragraph right there -- how I got from everybody to
> these people. A defense attorney asks "why isn't so-and-so on your chart" and I can show the
> step that took him out and tick it back on. That I like a lot.

> Editing a step, same thing: "Filter to, degree >= 5, Scope after step 1: 60 nodes, Result took
> out 20, 40 left". Plain. "Add note" on a step -- good, I'd write why I cut it. The page says
> below there's a time window that works as a step, March 8 to March 14. That's the "before and
> after the event" question. If it's a filter I can turn on and off and it's written down as a
> step, that beats a slider that blinks dots. I'd want to see it on the transfers though, not
> read about it.

**Notes.**

> Notes tab. "No notes yet. Add a note about the selection. Notes are saved in the project and
> travel in project files and findings reports." So the note goes with the case and into the
> report. Good. That's where my justification lives.

> One open: "About TP53 neighborhood, 33 proteins. Sep 28, 2026, 10:14." Then text, and "Cites:
> Betweenness, full graph. Quotes: TP53 betweenness 0.114." Okay -- so the note is tied to the
> number it's quoting. If the number changes, I'd want it to tell me. That's close to what I need.
> What's missing: who wrote it -- there's an "A" up top, is that me? -- and a source and a grade.
> Every fact in our product has a source and a 2-B or whatever. There's no box for it. I'd be
> typing "Source: Chase subpoena return, pg 14, grade B2" into free text, same as today. And the
> list says "2h", "1d". Two hours from when? In a case file I need the date and time, full stop.
> The open note has it; the list doesn't.

> Search in notes, "Betweenness", highlights the hits. Fine. Useful when I've got forty notes.

> What I could NOT do anywhere: open a note on ACC-365386. Never got my account on screen to
> attach one to.

**Export.**

> Export, "The evidence file, page by page." Oh -- now we're talking. Page 1 Boundary: "Filter
> step: in Mule ring suspects (a fixed set of 14 accounts), from transfers-2026-03.csv, written
> 2026-09-28." Then the table. ACC-233575, riskScore 98... and there he is. ACC-365386, personal,
> GB, riskScore 92, degree 8. Finally. Eighth row, in somebody else's case, on the last screen.

> So: he's in a set called Mule ring suspects with thirteen others, risk 92, eight
> counterparties. Page 3 is a "cash-out route, the 4-account path, 1 note". Page 5 Methods:
> "transfers-2026-03.csv: 3,000 accounts, 9,113 transfers, directed. PageRank, exact, on the full
> graph." PageRank -- that's the Google thing? Why is that in my evidence? What does 0.000385
> mean to a jury? Nothing. Take it out or tell me in one line what it's for.

> Bottom: "1 file goes to your Downloads folder. Nothing is uploaded." That's the sentence I need
> for IT. Good. The file name, "case-acc-233575_evidence_2026-09-28.html" then in brackets "(file
> format: the owner's decision)". What? I'm the owner? What decision? Is it HTML or isn't it? Can
> my supervisor open an HTML file on his machine? He'll want a PDF.

> I hit Export. The message at the bottom says "Exported proteostasis-screen_current-view.png,
> _figure-3-modules.png and _methods.txt". That's not my file. I'd go look in Downloads to see if
> the evidence file is even there. On a real case that's where I'd stop trusting it.

**The decision.**

> So, clear or refer. From what I saw: he's in a 14-account set somebody called mule ring
> suspects, risk score 92, which is high on whatever scale that is, and there's a cash-out path
> in the same case. I'd refer. But if you're asking whether I could JUSTIFY it -- no. I never saw
> why the alert fired. I never saw one of his transfers: no dates, no amounts, no counterparties
> by name. I didn't build that set, I don't know who did or why. I never got him on screen to
> look at his thirty people myself, and I couldn't put a note on him. The evidence file is the
> right idea, but it's somebody else's evidence. If I referred on that and the case agent asked
> "why", my answer would be "the computer put him in a group called mule ring." I've seen what
> that answer does on the stand.

## After the task

**Single Ease Question: 2 of 7.** "Couldn't find my own account. Everything else I had to
pretend."

**Would he use it instead of his current tool?**

> Not instead of i2 and Excel, no. Not today. It never showed me my account, it didn't tell me
> why the alert fired, and a line doesn't carry the record it came from. That's the whole job for
> me.

> But I'll say this: three pieces here are better than what I've got. The hop sizes before you
> commit -- 33, 169, 296 -- that alone saves me from the hairball. The filter steps that say what
> each one took out, that's my methodology written for me. And "one file to your Downloads,
> nothing is uploaded" is the sentence my IT guy needs. Put the alert reason on the account, put
> date, amount and source on every transfer, give me a source-and-grade box on the note, and let
> me search the number and land on it. Then I'd try it on a closed case. If it's something the
> department runs on its own box, maybe on a live one.

## Moderator notes

- He never reached ACC-365386 through Find or the inspector. The only screen that shows it is
  the export dialog's evidence file, where it is row 8 of a set someone else built. Find's typed
  state shows a different account number than the one he typed, and Open from Recent projects
  landed him on a protein graph.
- He read the exact-id "0 matches" with no closest suggestion as correct and safe, unprompted.
- He praised, unprompted: the hop sizes in the Neighbors menu, the "took out N, M left" filter
  steps, the note's Cites and Quotes, and "Nothing is uploaded" in the export footer.
- He could not find, anywhere: why the account was alerted, the transfers' dates and amounts,
  the record a link came from, a source and grade on a note, or who made the Mule ring set.
- "(file format: the owner's decision)" is visible to participants in the export footer and he
  read it as product text.
