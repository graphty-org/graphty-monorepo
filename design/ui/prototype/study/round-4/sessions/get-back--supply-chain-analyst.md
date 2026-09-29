# Session: "Something changed -- get back to where you were" -- Dana Okafor, supply chain risk analyst

Participant: Dana Okafor (composite persona, study/personas/supply-chain-analyst.md). Excel and
Power BI every day; not a network scientist.

Task as given by the moderator, and nothing more: "Something on the screen just changed that you
did not expect. Get back to where you were."

Pages: screens/undo.html (participant view, opening state "after the wrong step"),
screens/filter-chip.html, flows/undo-and-ways-back.html. Renders Dana saw are in shots/ and are
named below.

Outcome: success with difficulty. Dana ended with her 18 characters selected again and the filter
where it was (27 of 77, 3 steps). On the way her first move, Ctrl+Z, did not touch the thing that
had changed and instead took off a filter she wanted; the black line above the toolbar is what
caught it.

---

## Think-aloud

**Opening screen** (shots/tasks/get-back/01-undo.png)

> OK. First thing -- this is not my data. Les Miserables, characters. Fine, I'll pretend group 4
> is a region and the dots are suppliers.
>
> "Something changed." What changed? The picture looks like a picture. I don't have a before to
> compare it to. Let me look at the table, that's where I'd notice.
>
> Table header line: "Selected: none, showing the previous selection." Huh. So I had something
> selected and now I don't. That must be it. The rows are still here, which is nice, they didn't
> vanish on me. But I didn't read that line first. First I did what I do in everything.

**Step 1: Ctrl+Z** (shots/r4-dana-getback-b1-undo1.png)

> Ctrl+Z. Reflex. ... Whoa. A whole blue cluster just showed up at the bottom. Marius, Gavroche,
> Enjolras. The count up top went from 27 to "40 of 77 nodes, 2 of 3 steps". My table numbers
> moved -- Valjean went from 17 to 21.
>
> And my selection is still gone. So undo did NOT undo the thing that changed. It undid something
> else.
>
> There's a black bar: "Undone: Filter out group 8". OK, at least it tells me what it did. I
> would not have known otherwise -- I'd just see more dots and think the data reloaded. I didn't
> want group 8 back. Group 8 was out on purpose.
>
> In Excel undo gives you back the last thing that happened. The last thing that happened was my
> selection disappearing. This skipped over it. I don't like that. If I was on a call and pressed
> it twice I'd have made a mess and not known where.

**Step 2 (what she did not do, but checked): a second Ctrl+Z** (shots/r4-dana-getback-b2-undo2.png)

> Moderator asked me what I'd have done if I hadn't read the bar. Honestly -- press it again,
> "it'll get there eventually". Let me see what that does.
>
> Now it's 60 of 77, "1 of 3 steps", dots everywhere, grey ones, a black one. The bar says
> "Undone: Filter out group 8 and Filter to degree >= 5". Good that it names both instead of
> overwriting the first one. But I'm now further from where I was, not closer. Selection still
> gone.
>
> "Show in steps." Fine, click.

**The steps list** (shots/r4-dana-getback-b3-show-in-steps.png)

> This I like. It's a list. "Filter to degree >= 2 -- took out 17, 60 left." That's a line I can
> read. Two rows unticked, grey, "off, takes nothing out." So undo didn't delete my filters, it
> turned them off. Tick boxes. I know tick boxes.
>
> "Degree" -- I assume number of connections. I'd rather it said connections. ">= 5" in a filter
> row is fine, that's Excel.
>
> I could tick them back on here. But I don't trust myself to remember which ones were on. They
> were all on, I think. I'd tick both. That's more clicks than it should be to undo my undo.

(Moderator reset to the opening state; Dana redid the path the way she says she really would.)

**Step 3: Ctrl+Z, read the bar, Ctrl+Y** (shots/r4-dana-getback-f1-redo.png)

> Ctrl+Z. Blue cluster appears. Bar: "Undone: Filter out group 8." No -- don't want that.
> Ctrl+Y. That's redo in Excel. ... It worked. "Redone: Filter out group 8." Back to "27 of 77
> nodes, 3 steps." Numbers match what they were: Valjean 17. Good, Ctrl+Y works, I'd have been
> annoyed if it was only Ctrl+Shift+Z.
>
> Still no selection though.

**Step 4: the table line** (shots/r4-dana-getback-f2-redo-prev.png)

> Back to the line over the table. "Selected: none, showing the previous selection." And next to
> it, "Previous selection". That's a button? It looks like text. I'll click it.
>
> There. "Selected: 18 of 27 nodes." Rows highlighted, rings on the dots, right panel says
> "18 nodes", colour breakdown 7 / 7 / 3 / 1. That's where I was.
>
> If I'd read that line first I'd have been done in one click. The fix was sitting right there.
> The problem is my hand goes to Ctrl+Z before my eyes go to the table.

**Step 5: looking for an Edit menu** (shots/r4-dana-getback-d1-menu.png, d2-history.png)

> Where's Edit? There's no menu bar. The three lines top left -- that's a menu in every phone
> app, so OK, I'll click it. File, Edit, View ... Edit: "Undo Filter out group 8, Ctrl+Z". So
> it would have told me before I pressed it. Nobody opens a menu before Ctrl+Z, though.
>
> "Previous selection, Ctrl+Alt+Z." That's a new one. I'd never guess that. Three fingers.
>
> "Undo history": three filter steps, "Undo back to here (2 steps)". The thing that actually
> happened to me -- losing the selection -- isn't in the list. So the history isn't a history of
> what happened to me. It's a history of filters. I'd call that "filter history".

**The filter chip** (shots/tasks/get-back/02-filter-chip.png) and the flow page
(shots/r4-dana-getback-flow.png)

> The chip up top, "27 of 77 characters, 3 steps", opens the same list. Took out 17, took out 20,
> took out 13, 27 left. That's actually a decent audit trail -- I could screenshot that for a VP:
> "here's how I got from 1,400 suppliers to the 27 I'm worried about."
>
> The flow page is a diagram for somebody else. First bold line: "Undoing a step unticks it."
> That's the one sentence I'd want in a tooltip. Rest is paragraphs; skipped.

---

## After the task

**Single Ease Question (1 = very difficult, 7 = very easy): 4**

> I got there, and nothing was lost -- that's worth something, the bar and the tick boxes saved
> me. But the first thing I tried made it worse, and the thing that fixed it looks like plain
> text. If I hadn't read the black bar I'd have pressed Ctrl+Z three times and been lost. That's a
> 4, not a 6.

**Would you use this instead of your current tool?**

> For this? No. Undo isn't why I'd switch, and Excel's undo does what I expect: last thing I did
> comes back. Here the last thing I did -- lost my selection with a stray click -- isn't something
> undo knows about, and I don't think that's obvious to anyone.
>
> What I'd keep: the step list with "took out / left" counts. Resilinc doesn't show me how I got
> to a shortlist, and Excel only does if I keep a separate tab of what I filtered. If I could
> export that list to Excel or Power BI next to the node table, that's a reason to open it
> weekly. And "Assistant: Off, nothing is sent" on the left -- good, that's the first thing IT
> will ask.
>
> Still a side tool until someone tells me it reads my ERP export and talks to Power BI.

---

## Problems observed

1. **Undo skips the thing that just changed.** A stray click cleared the selection; Ctrl+Z
   passed over it and turned off a filter step Dana wanted ("Filter out group 8"). Her Excel
   model is "undo = last thing that happened". Severity: high. Screen: screens/undo.html.
2. **"Previous selection" in the table's scope line does not read as a button.** It sits in the
   same grey line as the status text; Dana found it only on her second pass. It is the one-click
   answer to this task. Severity: medium. Screen: screens/undo.html, table scope line.
3. **Undo history does not list selection changes,** so it is not a history of "what happened to
   me"; Dana reads it as "filter history". Severity: medium. Screen: Edit > Undo history.
4. **Previous selection's key (Ctrl+Alt+Z) is undiscoverable** and three-fingered; she would
   never guess it. Severity: low.
5. **Re-enabling after two undos takes a tick per row;** she was unsure which rows had been on.
   Redo (Ctrl+Y) covered it only because she stopped after one undo. Severity: low.
6. **"degree" in step names and columns;** she reads it as "connections" by guess and would
   prefer the word. Severity: low.
7. **No main menu bar;** Edit lives under the unlabelled three-line icon. She found it, but only
   after deciding to look. Severity: low.

## What worked

- The line above the toolbar ("Undone: Filter out group 8") named what undo did; without it she
  would not have noticed the wrong change. Undos in a row adding to the line, rather than
  replacing it, was noticed and approved.
- Ctrl+Y works as redo (her Excel key).
- Undo unticks a step rather than deleting it; "took out N, M left" per step is the most useful
  thing she saw and a candidate for export.
- The table kept its rows, marked as the previous selection, instead of emptying.
