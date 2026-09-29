# Remember why -- Sarah, fraud investigator

Participant: Sarah, level-2 financial crime investigator at a mid-size bank, eight years in. Works
four to six escalated cases at a time. Usual stack: the bank's case-management system (its case
notes are the record of what she did), Excel for the statement pivot, Word for the SAR narrative,
i2 Analyst's Notebook a few times a year. Notes to self today live in two places: the case notes in
the case system (formal, audited) and a Word file per case that she calls her scratch sheet.

Mode: not mandated. She is trying the tool on her own initiative, with her usual patience of about
five minutes for a first real task.

Task as given by the moderator: "You kept these accounts aside for a reason. Leave yourself a note
on why, so you remember next week."

Screens seen, all in the participant view (design notes hidden): the take-a-note screen in eight
states (the March transfers project, a kept set of 14 accounts called "Mule ring"), and the notes
panel screen in ten states (a protein project, a different dataset, used here only for how the
notes list, find and read-only view behave). The take-a-note flow page renders blank in the
participant view, because all of it is designer narration; Sarah was not shown it.

Renders: shots/r4-sarah-remember-tan-s1.png to -s8.png (take a note),
shots/r4-sarah-remember-np-s1.png to -s10.png (notes panel).

Outcome: success, with difficulty. She wrote the note in the first place offered and found it
again the next week from the notes list. She lost the second half of a multi-line note to the
Enter key, did not trust a citation she had not added herself, could not quote the thing her
reason actually rests on (the transfers, with amounts and dates), and would not press "Add current
value" on a note tied to a filed SAR. She could not see from these screens how the note gets into
her case file.

---

## Think-aloud

### 1. The starting screen: the ring, with a menu open

> "March transfers." OK, a transaction network, 3,000 accounts, and fourteen orange ones. Left
> side, "Sets and paths", "Mule ring, frozen, 14." That's my fourteen. "Frozen" -- I'm going to
> assume that means nobody can add or drop an account from it behind my back. Good. If QA asks
> "which fourteen", it's these fourteen.
>
> Where would I write why? Honestly my first move would be that "Notes" button on the far left,
> because it says Notes. But somebody's already opened this dots menu on the right for me, and
> the last thing in it is "Add note...". Fine. Everything above it -- "Compare with", "Extract as
> graph", "Run layout" -- I wouldn't touch. "Add note" I understand.
>
> I notice the panel on the right for the ring has Statistics, Members, Appearance, and no Notes
> box. If I hadn't been handed the menu, I'd have gone to the left Notes button. So I'd get there
> either way.
>
> And the bottom-left corner: "Assistant. Off. Nothing is sent." Good. That's the first thing I
> look for. If this thing talks to a cloud I can't put a customer name in it.

### 2. Writing: the note box opens beside the ring

> A box, "New note", "About Mule ring, 14 accounts." Good, it tells me what it's pinned to before
> I type. That's the right order.
>
> But there's already text in it. "Referred for a SAR. 14 personal accounts in 7 countries,
> riskScore 88 to 98. ACC-753261 ranks highest in the ring by PageRank: likely the collector."
> I didn't write that. Is that a suggestion? If it's a suggestion I'm deleting it -- "ranks
> highest by PageRank" is not a reason. An examiner reads "PageRank" and asks me what it is, and
> I don't know. I'd write "receives from 11 of the other 13" or whatever the actual number is.
> "Likely the collector" -- on what basis? That sentence would get sent back by my QA.
>
> And under it, "Cites: PageRank, full graph", with an x. I didn't cite anything. Who put that
> there? I'd click the x. I'm not putting my name under something I can't explain.
>
> Here's what I'd actually type. My notes are never one line:

    Kept 14. 9 share device D-4471, 5 pay the same beneficiary in Lagos.
    Pass-through: in and out within 24h, Mar 3 to Mar 19, about 212k total.
    Ruled out ACC-393859 -- payroll processor, not part of it.
    Next: KYC pull on ACC-233575, RFI to the correspondent bank. SAR due Apr 18.

> So I type the first line and hit Enter to go to the next line, like in Word, like in the case
> system --
>
> [Reads the grey line beside Add: "Enter adds. Shift+Enter, new line."]
>
> -- and it's posted. One line. The rest of my note is in my head and the box is gone. I read
> that grey line after, not before; it's small and it's next to the button, not where I'm typing.
> Every chat tool does Enter-to-send, sure, but this isn't a chat, it's a case note. Now I have
> to find how to open it again and keep going. [Looks at the posted note's dots menu -- the notes
> panel screen shows "Edit note".] OK, Edit note. Recoverable. But the first time it happens I
> think I lost it.
>
> "Quote a value..." -- let me see. I type 753 and it offers ACC-753261 riskScore 95, country BR,
> and that PageRank number. "Values of this note's 14 accounts." I like the idea: the number
> comes out of the data, not out of my typing, so if someone asks where "95" came from, it's
> traceable. That's the right instinct.
>
> But the reason I kept these accounts isn't their risk score. It's the money. The transfers
> between them: 9,800 in on the 3rd, 9,750 out the same day. The shared device. The beneficiary.
> Quote a value only gives me things about the accounts, not about the transfers between them.
> The one thing I'd want to quote, I can't. So I'd type the amounts by hand, which is exactly
> the thing I'd get asked to trace.

### 3. The note is added

> "Note, About Mule ring, 14 accounts, Sep 28 2026, 10:42." Full date and time. Good -- nobody
> in my world writes "just now" in a file. Though the right panel says "just now" for a second
> before it switches to the date; fine.
>
> There's a little "1" bubble on the picture near the ring. So the ring now has a note on it.
> OK.
>
> Whose name is on it? It doesn't say. Oh -- the other screen [notes panel, protein project]
> shows "Adam Powers" and "Lin Chen" on notes, so I guess it shows names when there's more than
> one person. For me alone it's blank. Fine for my scratch sheet. The day my reviewer opens this
> and adds a note, the names show up, and that's when it matters.

### 4. A note on one account

> Now it's a note on just ACC-233575: "Highest riskScore in the ring. Request the KYC file before
> the SAR goes out." That's not a "why", that's a to-do. That's how I'd use these, half of them:
> things I still have to do. There's no way to tick it off. Next week I'll have eight of these
> and not know which ones I did.
>
> Bottom of the screen there's a bar: "About ACC-233575. Shift+click adds. Esc: done with this
> note." And the little page button on the toolbar is lit up blue. Am I in some mode now? Shift
> -click adds what -- another account to this note, or a new note? I don't know. In the first
> screen that page button was sitting there too and I didn't know what it was. On the protein
> screens it isn't there at all. I'd press Esc and hope.

### 5. Next week: the notes list

> This is the part I care about. Left side, all the notes, newest first, each with the date and
> what it's about. "About Mule ring, 14 accounts. Cites PageRank, full graph." "About ACC-233575."
> "Busiest merchant (degree 907). Payroll processor; leave it out of ring reviews." -- that one's
> right, that's a benign cluster ruled out, and that's exactly what I need to write down so the
> next person doesn't chase it. Though I'd never write "degree 907". "907 counterparties."
>
> Click the ring note and the fourteen light up and the note opens next to them. OK, that's the
> "next week" thing. That's better than my Word file, which doesn't know where the accounts are.
>
> "Find in notes" at the top. I'd type an account number there. On the protein screen, typing a
> name that isn't in any note gives me an empty list with no message. I'd want it to say "no
> notes mention MDM2" so I know it searched, not that it broke.
>
> This one: "First pass, before the riskScore cut. Kept for the audit trail. About Suspects,
> first pass. Detached. The set this note pointed to was changed. Bring back Suspects, first pass
> (as kept Sep 19)." Hm. So somebody changed that set and the note says so, and I can get the old
> list back. That's good -- I don't want a note quietly pointing at a list that's not the list I
> meant. "Detached" is a strange word for it, but the sentence under it explains it.

### 6 and 7. A note on the whole graph, and one on a result

> "March export from the card platform. Transfers under $10 are cut upstream." About the graph
> Transfers. Yes. That's a data caveat, and that goes in the SAR's limitations paragraph. Good
> that it can sit on the whole thing, not on an account.
>
> The PageRank one -- "Damping 0.85, the team default" -- that's the data science guy's note, not
> mine. I'd skip it.

### 8. A month later: April's data is loaded

> Wait, the dates changed. Last screen these were Sep 21, now they say Apr 3. I'll assume that's
> just the demo. What I'm looking at: a yellow "Earlier data" next to the PageRank citation, with
> "Add current value", and next to the quote "now 0.000428 in April's data".
>
> OK. So the numbers moved under my note and it's telling me instead of rewriting my note. Good.
> That is the correct behaviour. My note is evidence of what I knew in March.
>
> "Add current value" -- no. I'm not clicking that. If that SAR went out in April on the March
> numbers, the note has to keep the March numbers. Does "add" mean it puts the April number
> beside the March one, or does it swap it? I can't tell, and on a filed case I won't gamble.
> I'd want a way to say "this is closed, freeze it", and then the yellow mark just sits there as
> information.
>
> And the ring itself -- "frozen, 14". Are those still the same fourteen accounts in April? I
> assume yes, because frozen. It doesn't say.

### 9. Getting it out

> How does this get into my case file? That's the test. Nothing on these screens tells me. The
> empty notes screen says "Notes are saved in the project and travel in project files and
> findings reports." What's a findings report? If it's something I can print to PDF and attach
> to the case, fine. If it's another file format I have to explain to IT, no.
>
> Can I select the note text and Ctrl+C it into the case system? I'd try that first. The case
> notes in our system are the official record; this would be my scratch sheet. It only saves me
> time if I can copy out of it.
>
> The protein screen has "View only" at the top. If my reviewer gets a read-only copy that shows
> the same picture and my notes on it, that's good. That's the one thing Word can't do.

---

## After the task

**Single Ease Question (1 = very difficult, 7 = very easy): 5.**

> Writing the note was easy -- it opened in the right place and said what it was about before I
> typed. I lost a point for Enter posting half my note, and one for the citation I didn't add
> sitting in my note. Finding it next week was easy.

**Would you use this instead of your current tool?**

> Instead of the case notes? No. The case notes in the case system are the official record; my
> QA and the examiner read those, not this. Instead of my Word scratch sheet -- maybe, if this
> tool were approved for customer data in the first place, which is not my call. The notes list
> that selects the accounts when I click a note is better than my Word file: my Word file doesn't
> know where the accounts are. But I'd need three things before it replaces the scratch sheet:
> Enter that doesn't post half a note, a way to quote the transfers and not just the accounts,
> and a way to get the notes out as text I can paste into the case system or print into the
> file. Until then I'd write the note here and again in the case system, and writing it twice is
> the extra hour I don't have.

---

## Observations for the studio

1. Enter posts the note. Her real note is four lines; she pressed Enter at the end of the first
   line, as in Word and the case system, and posted one line. She read "Enter adds. Shift+Enter,
   new line." only afterwards: it sits beside the button, not where she types. She recovered
   through Edit note. Severity: serious.
2. The note she can quote from offers only values of the note's accounts (riskScore, country,
   PageRank). Her reason for keeping the accounts is the transfers between them -- amounts,
   dates, the shared device, the common beneficiary -- and none of that can be quoted, so she
   would type the amounts by hand, which is what an examiner asks her to trace. Severity:
   serious.
3. The composer opened with text and a "Cites PageRank, full graph" chip already in it. She read
   the text as a suggestion and the citation as something the tool attached on its own; she
   would remove both, because she cannot explain PageRank to an examiner. Severity: moderate.
4. "Add current value" on a stale citation: she would not press it on a note tied to a filed
   report, and could not tell whether it adds the April value beside March's or replaces it.
   She asked for a way to mark a note or case as closed so the March values stay as written.
   Severity: moderate.
5. Getting notes out: no screen shows how a note reaches the case file. "Findings reports" means
   nothing to her; she would try Ctrl+C on a note first. Severity: moderate.
6. The armed state in the note-on-one-account screen (lit toolbar button, "Shift+click adds.
   Esc: done with this note.") read as an unexplained mode; she could not say what Shift+click
   would add. The same toolbar button appears on the take-a-note screens and not on the notes
   panel screens. Severity: minor.
7. Half her notes are to-dos ("Request the KYC file"). There is no way to mark one done, so
   next week she cannot tell which she has done. Severity: minor.
8. Find in notes with no match shows an empty list and no message; she could not tell a search
   with no results from a broken one. Severity: minor.
9. The ring's inspector has no Notes section until the ring has a note, so without the open
   menu she would have gone to the Notes rail instead. Not a failure: both routes reach the
   editor. Severity: cosmetic.
10. Vocabulary: "degree 907" in a note, "PageRank" in a citation, "Detached" for a changed set.
    She would write "907 counterparties" and understood "Detached" only from the sentence under
    it. Severity: minor.

What worked, in her words:

- "It tells me what it's pinned to before I type. That's the right order."
- "Click the ring note and the fourteen light up. That's better than my Word file, which doesn't
  know where the accounts are."
- "The numbers moved under my note and it's telling me instead of rewriting my note. That is the
  correct behaviour."
- "Assistant. Off. Nothing is sent. That's the first thing I look for."
- A note on the whole graph for a data caveat ("Transfers under $10 are cut upstream") is what
  goes into the SAR's limitations paragraph.
- A read-only view of the same picture with her notes on it, for her reviewer.
