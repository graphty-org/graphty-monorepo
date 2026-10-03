# Session: screen-reader analyst (Morgan Reyes), task r8-t32

Task as given: "March's card transfers are open (example data if you do not work in banking).
Pick out, all at once, every account in Great Britain that was flagged, so you can work on just
those. Say how many there are."

Start screen: shots/tasks/r8-t32/01.png. All commands run from design/ui/prototype; S is
tmp/round-8-sessions/r8-t32--screen-reader-analyst.

## Think-aloud

**01 (start).** Title "Transfers, March 2026". Summary on the right is the first thing I would
want: 3,000 nodes, 9,113 transfers, directed, one weak component. Good, that is said in words.
Nothing on this screen mentions a country or a flag, so I go to the table. Tables are where I live.

**02** `--click "Table"`
Tool note: "Table" matches two things, a button and a section. A screen reader would read me two
things with the same name. Table opens: "3,000 nodes, sorted by Total amount in", rows 1 to 51.
Columns are id, links in, links out, links total, total amount in. No country, no flagged.
"Columns: 11 of 13" so some are off the edge or hidden.

**03** `--click "Table" --click "Columns: 11 of 13"`
Column list: country and flagged are both ticked, so they are in the table, just further right.
Fine. Now how do I keep only GB and flagged?

**04** `--click "Table" --click "country"`
That sorted the table by country, not what I asked, but harmless. The line above the table still
says "sorted by Total amount in" while the country header shows an up arrow. Two places disagree
about the sort order. I would hear the summary line, not the header arrow, so I would be told the
wrong sort. There is a small chevron by the country header but I do not know its name.

**05** `--click "Table" --click "Filter"` -- "nothing on screen is called Filter". Dead end one.

**11** `--click "Table" --click "country" --click "country options"` -- nothing called that
either. I cannot find a name for the header chevron. Moving on.

**06** `--click "Full graph"`
The funnel at the top took me to the Data page: Sources, Filters ("No filters. Filters change
what is computed"), Attributes. A filter is not quite what I asked for -- I want to pick these
accounts out, not throw the rest away from the computation -- but "work on just those" might be
either. Noted.

**07** `--click "Selection"`
Opened the Selection row in the tree, which is only its color, size and opacity. That is the
paint of a selection, not a way to make one. Not useful.

**08** `--click "Select"` -- matched "Selection" again. Same screen.

**09** `--click "Find rows and notes"` -- a search box. It finds rows by text; I want a condition,
not a text search. Did not pursue.

**10** `--click "Analyze"` -- algorithm list (Louvain, PageRank, shortest path). Not this.

**12-17** `--click "Full graph" --click "Add filter step" --click "By an attribute or computed value" ...`
I tried the filter route anyway. "Add filter step" again matches two buttons with the same name.
The attribute picker offered "country" twice: one is "country, Nodes", one is "country,
accounts". Same word, two meanings. I picked the first and it opened the attribute's own
properties page instead of setting the condition (14). The second one ("country, accounts")
built "country is [ ]" (15) but the value box after "is" has no name I could find (16, 17: no
"GB" option, nothing called "Value"). This is the kind of unlabeled field I give up on. That is
my second dead end, and normally I would stop here and go export to Excel.

**18** `--key "?"` -- before giving up I always press question mark. Keyboard shortcuts list,
grouped, readable. Ctrl+K "Quick actions: commands and places". Selection keys too. Credit for
this page.

**19** `--key "Control+k"` -- command box "Type a command or a place".

**20** `--key "Control+k" --click "Select where"` -- a "Select" dialog: Query / Ids, look for
Nodes / Edges, a Query box, a live count, Replace / Add / Remove / Within, and "Select N". This
is what I wanted. But the query box is not empty: it already says `kind == 'personal'` and the
button already says "Select 2,610". If I had just pressed Enter I would have selected 2,610
personal accounts I never asked for. Why is it prefilled?

**21-22** `... --click "+ condition"` then `--click "country"` -- "+ condition" appended
"and" to the personal query and then "country". It does not let me finish the comparison by
picking; the help says "Finish the query with a comparison". So I have to type anyway, and the
helper builds onto the wrong starting query.

**23** `... --click "kind == 'personal'" --type "country == 'GB' and flagged == true"`
Typed straight onto the end of the prefilled text, so it became nonsense. My fault partly; the
prefill set me up.

**24** `... --key "Control+a" --type "country == 'GB' and flagged == true"`
Cleared it and typed my own. "1 of 3,000 nodes match", button "Select 1". One. I do not trust a
count of one without checking.

**25** `... --type "country == 'GB'"` -- "Not available yet: counting this query in this
version." So it can count GB-and-flagged but not GB alone? That makes me trust the 1 less, not
more.

**26** `... --type "flagged == true"` -- "14 of 3,000 nodes match". So 14 flagged overall and,
it says, 1 of them in GB. The table earlier showed flagged as "no" / "yes"-style text, and I
typed `== true`; it accepted it, so presumably the flag is a true/false column. Plausible.

**27** `... --type "country == 'GB' and flagged == true" --click "Select 1"`
Done: message "Selected 1 of 3,000 nodes where country == 'GB' and flagged == true", with
"Create set from rule". Inspector: "1 node ... 1 of 3,000 nodes", and it repeats the query.
Selection row in the tree now says 1. Good: the fact is written down in more than one place, not
just announced and thrown away.
But: two rows I had not touched appeared in the tree after I selected, "Louvain 35 groups" and
"Links in (count)". I did not run them. Part of the screen changed under me. And the inspector
label is "Selected..." cut off.

## Answer

One account: 1 of 3,000 nodes where country is GB and flagged is true. Selected.

## Commands run

```
timeout 120 node app-b/study.mjs --try $S/02.png task:r8-t32 --click "Table"
timeout 120 node app-b/study.mjs --try $S/03.png task:r8-t32 --click "Table" --click "Columns: 11 of 13"
timeout 120 node app-b/study.mjs --try $S/04.png task:r8-t32 --click "Table" --click "country"
timeout 120 node app-b/study.mjs --try $S/05.png task:r8-t32 --click "Table" --click "Filter"
timeout 120 node app-b/study.mjs --try $S/06.png task:r8-t32 --click "Full graph"
timeout 120 node app-b/study.mjs --try $S/07.png task:r8-t32 --click "Selection"
timeout 120 node app-b/study.mjs --try $S/08.png task:r8-t32 --click "Select"
timeout 120 node app-b/study.mjs --try $S/09.png task:r8-t32 --click "Find rows and notes"
timeout 120 node app-b/study.mjs --try $S/10.png task:r8-t32 --click "Analyze"
timeout 120 node app-b/study.mjs --try $S/11.png task:r8-t32 --click "Table" --click "country" --click "country options"
timeout 120 node app-b/study.mjs --try $S/12.png task:r8-t32 --click "Full graph" --click "Add filter step"
timeout 120 node app-b/study.mjs --try $S/13.png task:r8-t32 --click "Full graph" --click "Add filter step" --click "By an attribute or computed value"
timeout 120 node app-b/study.mjs --try $S/14.png task:r8-t32 --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --click "country"
timeout 120 node app-b/study.mjs --try $S/15.png task:r8-t32 --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --click "country, accounts"
timeout 120 node app-b/study.mjs --try $S/16.png task:r8-t32 ... --click "country, accounts" --click "GB"
timeout 120 node app-b/study.mjs --try $S/17.png task:r8-t32 ... --click "country, accounts" --click "Value"
timeout 120 node app-b/study.mjs --try $S/18.png task:r8-t32 --key "?"
timeout 120 node app-b/study.mjs --try $S/19.png task:r8-t32 --key "Control+k"
timeout 120 node app-b/study.mjs --try $S/20.png task:r8-t32 --key "Control+k" --click "Select where"
  (also tried "Select by attribute", "Select matching": nothing on screen)
timeout 120 node app-b/study.mjs --try $S/21.png task:r8-t32 --key "Control+k" --click "Select where" --click "+ condition"
timeout 120 node app-b/study.mjs --try $S/22.png task:r8-t32 --key "Control+k" --click "Select where" --click "+ condition" --click "country"
timeout 120 node app-b/study.mjs --try $S/23.png task:r8-t32 --key "Control+k" --click "Select where" --click "kind == 'personal'" --type "country == 'GB' and flagged == true"
timeout 120 node app-b/study.mjs --try $S/24.png task:r8-t32 --key "Control+k" --click "Select where" --click "kind == 'personal'" --key "Control+a" --type "country == 'GB' and flagged == true"
timeout 120 node app-b/study.mjs --try $S/25.png task:r8-t32 --key "Control+k" --click "Select where" --click "kind == 'personal'" --key "Control+a" --type "country == 'GB'"
timeout 120 node app-b/study.mjs --try $S/26.png task:r8-t32 --key "Control+k" --click "Select where" --click "kind == 'personal'" --key "Control+a" --type "flagged == true"
timeout 120 node app-b/study.mjs --try $S/27.png task:r8-t32 --key "Control+k" --click "Select where" --click "kind == 'personal'" --key "Control+a" --type "country == 'GB' and flagged == true" --click "Select 1"
```

## Verdict

- Succeeded? I think so: 1 account selected, and the app says so in text in three places. I am
  only moderately sure the 1 is right, because the same box refused to count "country is GB" on
  its own.
- Single Ease Question: 3 of 7. I had two dead ends (the table has no filter I could name, the
  filter step's value box has no name) before the question-mark page showed me Ctrl+K, and the
  select box I finally found came prefilled with someone else's query.
- Would I use this instead of my current tool? Not for this. In pandas this is one line,
  `df[(df.country == 'GB') & df.flagged]`, and the Select box is that same line with more steps
  around it. What I would take: the select box itself, once I know Ctrl+K gets me there, because
  it tells me the count before I commit and writes the rule down after. What I would take away:
  the prefilled query, the two things called "country", the unnamed value box, and rows appearing
  in the tree that I never ran.
