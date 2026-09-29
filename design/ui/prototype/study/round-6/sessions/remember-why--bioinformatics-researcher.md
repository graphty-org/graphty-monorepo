# Leave yourself a note on why you kept these accounts -- Dr. Chen

**Task, as the moderator gave it:** "You kept these accounts aside for a reason. Leave yourself a
note on why, so you remember next week."

**Participant:** Dr. Chen, computational biologist (drug target discovery). Works in R and igraph,
uses Cytoscape for figures, keeps her reasoning in R Markdown and the institute's electronic lab
notebook. Reads numbers closely, skims prose. She did this same task on an earlier version of
these screens.

**Screens used:** the take-a-note screen (the "March transfers" project, a frozen set called "Mule
ring", 14 accounts), the notes panel on "Human protein interactions" (empty, with the new-note
editor, and with notes by two authors), and the sets-and-paths screen (a frozen copy of a rule
set). Renders she looked at: `shots/r6-chen-remember-tan-s1.png` to `-s8.png`,
`shots/r6-chen-remember-np-s1.png` to `-s11.png`, `shots/r6-chen-remember-sp-s7.png`.

**Outcome:** done, on the first path she tried, with no wrong turn. **Single Ease Question:** 6 of 7.

---

## Think-aloud

**1. What am I looking at.** Same bank data as before. "Mule ring, frozen, 14" in Sets and paths,
already selected, and its "..." menu is open with "Add note..." at the bottom, highlighted. Well,
that is rather handing me the answer. Last time I went to the Notes rail first. Today the menu is
right there, so I take it. If I had started cold I think I would still go to Notes first, so I will
check that route too.

**2. The editor.** "New note", "About Mule ring, 14 accounts". Right subject, filled in, because I
started from the set. I type my reason in several lines -- the reason, then the numbers, then what
to check. Under the box: "Enter, new line. Ctrl+Enter adds the note." Good. That is how a lab
notebook behaves, and it is the thing I complained about last time. I pressed Enter twice while
writing and nothing got filed half-done.

**3. What it cites.** "Cites PageRank -- full graph, directed, damping 0.85, unweighted." That is
the parameter set, on the citation, not in a separate note somebody typed by hand. That is what I
would put in a figure legend. I would also want the date of the run or which data it ran on, but
the parameters are the part a reviewer asks about, and they are there.

**4. Quoting a number.** "Quote a value..." then "753" gives ACC-753261 under "PageRank (cited)"
0.000551, and under "Attributes" riskScore 95 and country BR. "Values of this note's 14 accounts"
at the bottom -- so it only offers numbers from the set I am writing about. Sensible. I pick the
PageRank one and it sits in the note as "ACC-753261 pagerank 0.000551". Still the best thing on
this screen. No retyping, no transcription error.

**5. "Saving as: Marcus. Change..."** I am not Marcus. This is presumably Marcus's project on
Marcus's machine and the moderator put me in it, but in real life that line would make me stop and
click "Change..." -- which I would, because the whole point is knowing who wrote what. I like that
it tells me before I save rather than after. What I do not like: once the note is added, the note
itself does not show a name anywhere. So if I had not read that grey line, I would have filed a
note as Marcus and never known.

**6. After adding.** The note shows "Sep 28 2026, 10:42", the About line, my text, the cite with
its parameters, the quoted value. A little "1" badge appears on the canvas by the ring and the
set's own panel grows "Notes 1". Nothing I typed was changed. Fine.

**7. The other way in, from the Notes rail.** On the protein network, empty panel: "No notes yet.
A note can be about a selection, a set, a result or the whole graph." and "Add note...". I click
it. The editor opens with "About: The graph" and a drop-down listing "Kept sets: TP53
neighborhood, 33 proteins; DNA repair, 30 proteins", and "Select something first" greyed out. That
fixes my other complaint from last time: it does not make me pick from nothing, and my kept sets
are right there by name and size. If I had the ring in mind I would see it in the list. I would
still rather it guessed the set when there is only one, but this is fine; the risk now is a note
about the whole graph when I meant a set, and the About line is at the top where I read first.

The left rail is the same on both screens now -- Graph, Data, Results, Notes. Good. Last time the
protein screen had a different set of icons and I did not know which was current.

**8. Next week.** The Notes rail on the bank project: a list, newest first, date, text, what it is
about, what it cites. I click the ring's note, the ring lights up, the note opens beside it with
all its parts. That is "why did I keep these", answered. "Find in notes" at the top and a filter.

On the protein project there are notes by "Adam Powers" and "Lin Chen" with names in each row; on
the bank project there are no names at all. I gather it only shows names when more than one person
has written. Reasonable, and it explains why my own note had no name on it. But then the only
place I can check who I am saving as is that grey "Saving as" line.

**9. When the data moves.** After April's data replaced March's, my note says "Earlier data -- Add
current value" under the cite, and the quote says "now 0.000428 in April's data". The number I
wrote down stays as I wrote it and the tool says loudly that it is no longer current. That is my
STRING-version problem solved in principle. Two gripes, one old, one new:

- "April's data" is still a month. For me that label must be a file name or a database release --
  "string_v12.0, cut-off 0.7" -- not a month. Months mean something in a bank; in biology two files
  can come from the same month.
- On the protein network the same kind of flag says "Earlier run", not "Earlier data". Maybe one is
  about the data and one about the algorithm being re-run with a weight -- the cite still says
  "unweighted", so I can work it out -- but I had to work it out. If there are two different reasons
  a note goes stale, I would like the flag to say which in words, not by choosing between two
  near-identical labels.

**10. "Detached".** A note on "DNA repair, 30 proteins" says "Detached. The set this note pointed
to was changed. Bring back DNA repair (30 proteins, as kept Sep 24)". I still like this very much.
And on the sets-and-paths screen a frozen copy shows "Frozen from: rule set" and "Frozen on: Sep 28
2026". So I now understand: a rule set follows the data, a frozen set does not, and a note on a
set that changes keeps the old membership for me. But on the take-a-note screen, where I am
actually writing the note, the Mule ring panel says "Frozen set" and nothing more -- no "frozen on",
nothing saying a note on it cannot detach. I had to go to a different screen to learn it.

**11. Getting it out.** "Notes are saved in the project and travel in project files and findings
reports." I looked again for a way to have the notes as a table -- note, date, author, about,
cites, quoted value -- that I could read into R next to my node table. The note's "..." menu, the
row menu (Edit note, Delete note), the panel filter: nothing. So my reasoning still lives only in
this tool and in whatever the findings report prints. For a reviewer that is enough. For me in two
years, it is not.

**12. Small things.** The list cuts text off with "..." after two or three lines ("...riskScore 88
t..."). In a note, the number is usually at the end. The set header on the sets-and-paths screen
is cut off as well ("Sep 28: High risk and Paid ACC-893168" runs off the panel). Minor.

---

## Single Ease Question

**6 of 7.** Writing the note was straightforward and nothing tripped me. Enter now does what I
expect, the citation carries its parameters, and starting from the Notes rail lists my kept sets.
It is not a 7 because I had to spot a grey "Saving as: Marcus" line to know whose name the note
would carry, and the out-of-date flag still names a month instead of a data version.

## Would she use this instead of her current tool?

"For this job -- writing down why I kept a list, next to the list, with the actual numbers quoted
and the algorithm's parameters attached -- yes, I would use it, and it is better than my lab
notebook at the part I get wrong: copying numbers by hand, and not noticing when the data under
them changed.

Instead of my R Markdown file, no, not yet. My notes have to come out of the tool as a table I can
read from a script, and they do not. And the stale flag has to name the file or the database
release, not 'April'. Fix those two and this becomes the first place I write things down, with R
Markdown reading from it rather than the other way round."

---

## Problems she named

| Where | What | Severity (1-4) |
|---|---|---|
| Getting notes out | Still no table or text export of notes (note, date, author, about, cites, quoted values) and no way to read them from a script; only project files and the findings report | 3 |
| Out-of-date flag, quote | "in April's data" names a month, not the file or database release the value came from | 2 |
| Author | "Saving as: Marcus" is the only place the author appears in a one-author project; a saved note shows no name, so a wrong author goes unnoticed unless she reads that grey line | 2 |
| Out-of-date labels | "Earlier data" on one screen and "Earlier run" on another; she had to work out the difference (new data vs a re-run with different options) herself | 2 |
| Frozen set on the note screen | The set panel says only "Frozen set"; "Frozen on" and "Frozen from" appear on the sets-and-paths screen but not where the note is written, and nothing says a note on a frozen set cannot detach | 1 |
| Task start | The first frame opened with the set's menu already open and "Add note..." highlighted, so it does not show whether she would have found that route unaided | 1 |
| Notes list and set header | Note text truncated with "..." where the quoted number usually sits; a long frozen-set name runs off the panel header | 1 |

## What pleased her

- "Enter, new line. Ctrl+Enter adds the note." -- a multi-line note is no longer filed half-written.
- The citation reads "PageRank -- full graph, directed, damping 0.85, unweighted": the parameters
  are on the cite, fit to paste into a legend.
- "Quote a value..." offers only values of the note's own 14 accounts and drops the exact number
  into the note.
- Starting from the Notes rail, the About drop-down lists her kept sets by name and size instead
  of leaving the subject blank.
- The left rail is the same on every screen now.
- "Detached ... Bring back DNA repair (30 proteins, as kept Sep 24)" and "now 0.000428" keep the old
  list and the old number and say loudly that they are not current.
