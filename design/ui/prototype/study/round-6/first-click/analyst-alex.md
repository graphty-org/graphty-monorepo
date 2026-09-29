# First-click test -- Analyst Alex

Participant: Analyst Alex, an operations data analyst who computes in NetworkX, draws in Gephi, and
reads button names and numbers, not paragraphs. For each prompt he looked at one still screen and
said where he would click first and how sure he was (1 = guessing, 7 = certain). His answers were
scored against the target list afterwards; the answers were not changed.

## Answers

### 1. A picture of the network for the co-author's paper (Les Miserables, at rest)
- Click: the three-line menu button at the top left.
- Sure: 4
- Said: "There's no Export anywhere I can see. The camera icons next to the views look like
  pictures, but those are saved views, I think. Menus usually have File, File has Export. That's
  where I'd go."
- Scored: correct.

### 2. Repeat the earlier bridges calculation exactly (Les Miserables, at rest)
- Click: "Bridges off" in the Style stack on the right.
- Sure: 3
- Said: "That's the only thing on the screen that says bridges. It's switched off, but it's the
  bridges thing, so I click it and hope it shows me what I ran. I'd look under Results after, if
  that didn't work."
- Scored: wrong (the style layer, not the record of the run). He named Results as his second try.

### 3. Rank the characters a second way, to check the first (Les Miserables, at rest)
- Click: Results on the left rail.
- Sure: 4
- Said: "Ranking is a calculation, calculations give results. I'd want betweenness next to degree.
  The lightning button in the toolbar has no label, so I'm not touching that first."
- Scored: correct.

### 4. A stray click cleared the picked-out characters -- get them back (undo notice)
- Click: "Bring it back" on the dark notice above the toolbar.
- Sure: 6
- Said: "It literally says selection cleared, 18 nodes, bring it back. Easy. I'd probably have hit
  Ctrl+Z out of habit if the notice weren't right there, though."
- Scored: correct under both undo designs (he clicked the notice, not Ctrl+Z). Worth logging that
  Ctrl+Z was his stated reflex.

### 5. Where Valjean's betweenness comes from and how it was calculated (Valjean selected)
- Click: the "betweenness 0.57, highest" row under Results in the right panel.
- Sure: 5
- Said: "0.57, that's the number. Does that match NetworkX normalised? It looks about right for Les
  Mis. I'd click the number and expect it to tell me exact or sampled, and normalised or not."
- Scored: correct.

### 6. Next month's transfers file -- bring it in so the setup carries over (Transfers, at rest)
- Click: "Change..." after "Loaded: transfers-2026-03.csv" in the Statistics panel.
- Sure: 3
- Said: "It says Loaded, the file name, then Change. That's where I swap the file. The little chip
  at the top with the file name is cut off, I didn't really read it as a button."
- Scored: wrong ("Change..." on the Loaded line changes how the file was read, not which file).

### 7. Accounts that take in far more money than they send out (Transfers, at rest)
- Click: Quick actions on the toolbar.
- Sure: 4
- Said: "In minus out -- that's weighted in-degree minus out-degree. It says amount not used yet,
  which bugs me, but Quick actions is the one labelled thing that sounds like it runs stuff. I'd
  type 'in-degree' into it."
- Scored: correct.

### 8. The cheapest route between two accounts, where a bigger transfer costs more (Transfers, at rest)
- Click: "Change..." on the Loaded line.
- Sure: 4
- Said: "It tells me the amount isn't used yet. If the amount isn't the weight, any shortest path is
  just hop count, which is wrong. So first I switch the amount on, then find the path thing."
- Scored: wrong (counted separately: "Change..." on the Loaded line). His reasoning is the correct
  analysis -- the weight has to be set somewhere -- but the target is the path tool, which he did
  not recognise from its unlabelled icon.

### 9. IT asks whether anything from this project has left the computer (Transfers, at rest)
- Click: "Nothing has been sent from this project" under the project name.
- Sure: 6
- Said: "That's the first thing I looked for when I opened it, honestly. I'd click it and want a
  list I can screenshot for IT."
- Scored: correct.

### 10. Ribosome and Spliceosome are two blues he cannot tell apart -- change one (protein network)
- Click: the Spliceosome swatch in the legend.
- Sure: 5
- Said: "Yeah, those two blues are basically the same to me. The legend is where the colours are,
  click the square, pick a colour."
- Scored: correct.

### 11. The lab's file of standard colours and sizes -- bring it in (protein network)
- Click: the palette icon beside "Graph" at the top of the right panel.
- Sure: 3
- Said: "It's a paint palette. Colours and sizes, palette. I don't know what 'Style stack' means, so
  not that plus."
- Scored: wrong (the palette icon beside Graph is a listed wrong target). "Style stack" read as
  jargon to him.

### 12. How the Ribosome module differs from the rest of the network (protein network)
- Click: "Ribosome" in the legend.
- Sure: 3
- Said: "I'd click Ribosome so it picks those 56 out, and hope something shows me their numbers
  against everyone else's. I'm not sure what comes after that. In Python I'd just groupby."
- Scored: correct.

### 13. A protein with no name showing -- make sure its name always shows (protein network)
- Click: the Table strip at the bottom, to find the protein by name.
- Sure: 3
- Said: "I don't know which dot it is, that's the problem. I'd open the table and type the name,
  then see what I can do with it. The line about seven hidden where they overlap -- maybe it's one
  of those, but I'd only notice that on a second look."
- Scored: correct.

### 14. Run the calculation again with one setting changed, keeping this one to compare (run opened)
- Click: "Re-run".
- Sure: 4
- Said: "Re-run, and then I change the setting. I'm a bit worried it just overwrites this one, so
  I'd check that the old one is still in the list afterwards. 'Compare with' sounds like the second
  step, not the first."
- Scored: correct.

## Score

- Correct: 10 of 14 (prompts 1, 3, 4, 5, 7, 9, 10, 12, 13, 14).
- Wrong: 4 (prompts 2, 6, 8, 11).
- Prompt 4 is correct under both undo designs; he named Ctrl+Z as his habit but clicked the notice.

## What stood out

- **The words on the screen win over the rail.** Where a visible label named the thing in the
  prompt, he clicked the label even when it was the wrong kind of object: "Bridges off" for the
  bridges run, "Change..." beside the file name for a new file, a palette icon for a colours file.
- **"Change..." on the Loaded line pulls twice.** It drew his new-file click and his weighted-path
  click. Its sentence names the file first, so it reads as "change the file"; and "amount not used
  yet" tells him, correctly, that the weight is off, so he goes there before looking for a path.
- **Unlabelled toolbar icons were never a first click.** He passed over the lightning and path
  icons on the Les Miserables screen and used "Quick actions" only where it carried words.
- **"Style stack" is jargon to him** and kept him away from its "+" for the colours file.
- **The file chip was not seen as a control.** Truncated to "transfers-2026...", it read as a
  caption.
- **Trust signals landed.** The "Nothing has been sent" line was the first thing he noticed and his
  confident answer for IT.
