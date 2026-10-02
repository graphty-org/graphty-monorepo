# Focus group: a wide table (69 columns on 300 hosts)

Five participants looked at the same host inventory loaded as a graph: 300 hosts, 1,105
connections, 69 columns per host. They saw the start screen, the main screen with the column
list on the left and the graph summary on the right, the "Size by" picker, one host's details
panel, and the table along the bottom. Three rounds: first impressions; searching for a column
and choosing what to size by; and what would make each of them quit or switch.

Participants (simulated personas):

- **Priya** -- cybersecurity analyst; hunts with pandas in a notebook.
- **Min-ji Kim** -- knowledge engineer; checks data quality before anything else.
- **Chris** -- machine-learning engineer (recommendations); searches, never browses.
- **Emma** -- expert network analyst; checks the arithmetic and wants every number sourced.
- **Nadia** -- alert reviewer at a bank; not technical, works in Excel, writes alert files QA
  checks.

## Transcript

### Round 1 -- first impressions

**Priya (cybersecurity analyst):** The first thing I noticed was the lock that says "Local only"
and the line saying files are read on this computer and never uploaded. Good. I still won't
believe it until our proxy logs show nothing leaving.

On the host screen my eye skips the graph completely. That hairball tells me nothing. I go to the
left list, and it lets me down. It shows only two things in use, id and hostname, and then
everything else in A to Z order. So I'm scrolling past backup and nine cmdb columns to find what I
hunt with: OS build, last logon, whether the EDR agent is running, local admins. Alphabetical is
the order my export already has. It isn't triage.

There are percentages next to some rows: 84, 62, 3. Is that how often the column is filled in?
Nothing says so. And "backup_l...ccess_at" is cut off in the middle, which is the part I'd need
to read.

Over on the right, someone already chose bytes_total_24h as the connection weight. Who chose it? I
want to know before I trust any "stronger".

And I'd go straight to that search box and type. I wouldn't scroll.

**Min-ji Kim (knowledge engineer):** My eye goes to the top of that right-hand panel first: 300
nodes, 1,105 edges, 1,105 rows. Rows and edges match, so nothing was dropped silently, and that is
the first thing I check. "Isolated nodes 7" in blue is the second. That is a data-quality finding,
and I would click it before anything else.

[points at the left list, "In use (2)" then "Other attributes"]

The split is sensible. Two in use, sixty-seven parked. But it is alphabetical, so I read backup,
cmdb, cmdb, cmdb, cpu, and I skip it all as noise. Group by source prefix and I would see "cmdb, 9
columns" as one item. And "Attribute" -- in a CSV that is a column. Call it a column.

[points at "84%", "62%", "3%" beside the dates]

What is that percentage? I assume it is how often the value is filled in, but it has no label. If
3% of hosts have a decommission date, that is exactly what I want to know, so tell me.

The canvas I skip. Ten blobs, and position means nothing until someone tells me it does.

The start screen is fine. Nothing gets uploaded, two CSVs, done.

**Chris (ML engineer):** Honestly, the layout reads like a notebook sidebar, so I'm fine with it.
Sources on top, then filters, then the column list. My eye skipped the big graph picture
completely and went to the left list. What I actually do with a wide table is ctrl-F, so the "Find
attribute" box is the first thing I'd touch. [points at the search box] Then I'd glance at the
right panel, because 300 nodes, 1,105 edges and an average degree of 7.37 tell me more than the
drawing does.

What bugs me is that "In use (2)" is just id and hostname. That's the key and a label, and nobody
would call that in use. The rest is alphabetical, so backup_policy sits above cpu_util_p95.
Alphabetical is the order I'd least want. [points at the 84% and 62% badges] I'm guessing that's
how full each column is, but it isn't labeled, and some rows have it while others don't.

I'd skip the whole cmdb_ block. That's ownership metadata. I'd want the numeric columns grouped
first, because those are the ones I'd color or size by.

The bottom bar says "Columns: 8 of 69". Which 8? I can't tell from here.

**Emma (expert analyst):** Two things I checked before anything else. First, the lock and "Files
are read on this computer and never uploaded" are right there on the start screen. Good. I'll want
the real statement behind that, including any telemetry, but at least it's in a place I'd look.
Second, the summary on the right gives 300 nodes, 1,105 edges, directed, and weight taken from
bytes_total_24h. That's the first-minute check I actually do. 2 x 1,105 / 300 = 7.37 average
total degree, so the arithmetic holds. "Readings not computed" means nothing to me, though.
Readings of what?

The organization is fine: sources, then filters, then the list of things recorded, with the table
at the bottom. My eye skips the left rail entirely, and I'd never click Assistant. What bothers me
in that list is the percentages. backup_l...ccess_at shows 84%, but 84% of what, filled in?
There's no denominator, and the name is cut off in the middle, which is the part I'd need. The
list is also alphabetical, so the 67 columns not in use are ordered by spelling, not by whether
they're useful. "Columns: 8 of 69" at the bottom: which 8, and who chose them?

**Nadia (alert reviewer):** I'm not IT, so let the security people go first on what a host is.
From where I sit, my eye goes straight to the search boxes. There are two of them, "Find rows and
notes" and "Find attribute", and I honestly don't know which one I'd paste a hostname into. I'd
try the top one and hope.

Then I go to "In use (2)": id and hostname. That part makes sense to me, because it's what's being
used right now. Everything under "Other attributes", the cmdb this and cpu that, I skip. I'd
scroll past it the way I scroll past 40 columns in a core banking export. In Excel I just hide
them, or I Ctrl+F the header.

I'm stuck on the little percentages, though: 84%, 62%, 3%. Percent of what? Filled in? Matching?
I'd need to know that before I put it in a file.

[points at the table along the bottom of the second screen] That's where I'd actually work, not
the picture. "Columns: 8 of 69" is fine as long as I can see which 8 and who picked them. And is
the left side for changing data and the right side only for looking? I can't tell.

### Round 2 -- searching "vu cr", and the Size by picker

**Priya (cybersecurity analyst):** Two letters and a space, "vu cr"? Nobody types that. I'd type
"vuln" and expect all of the vuln columns, or "edr" or "logon" and expect the match anywhere in the
name, not just at the start of a word. It found vuln_count_critical, fine. The second hit is cut
off in the middle again, though: "vuln_count_c...ver_30_days". Over 30 days is the whole reason I'd
pick that column, and it's the part that's hidden.

The size picker annoyed me more. I'm sizing hosts, and the list opens on "Not a number (45)", with
id and hostname first. Why show me 45 columns I can't size by, at the top? Put the numbers first,
or leave the others out.

Min-ji, grouping by prefix only works if the people who name the columns are consistent, and in our
exports they aren't. Search is what I'd rely on. Nadia: the top box is for rows, I think. The one
that actually matters to me isn't here at all, a search on values, like edr_status = stopped.

**Min-ji Kim (knowledge engineer):** Two letters and two letters, "vu cr", is not how I search. I
would type "vuln" and expect all the vuln columns, then narrow. What I liked is that it matched the
start of each word and bolded the letters it matched. That is honest. But I still can't read the
second hit, because "vuln_count_c...ver_30_days" cuts off the middle again.

[points at "Not a number (45)", open and highlighted at the top of the size list]

This one I don't trust. I am choosing what to size by, and the first thing it offers is forty-five
things that cannot set a size. Chris is right that the numbers belong first. I would go further and
leave the rest out, or close them up under one line. And what are 69% and 80% here? Same
unlabeled number as before.

Priya, I agree that alphabetical is not triage. But I would rather filter by kind than by name:
numbers only, mostly filled in. Let me type "num" or "date" and get columns of that kind.

**Chris (ML engineer):** Yes, that's how I'd search. "vu cr" reads like the fuzzy file finder in
VS Code, one bit of each word, and I got both vuln_count columns with the matched letters in bold.
Fine. On my own data I'd type a substring from the middle, like "p95" or "30d", and I'd want that to
work too. I can't tell from two hits whether it matches only from the start of each word.

The size picker is backwards, though. [points at the blue "Not a number (45)" header] I asked to
size by something, and the first thing it opens is 45 columns I can't size by. Show the 24 numeric
ones and collapse the rest at the bottom. The Key and Name tags on id and hostname are good. That's
the honest version of the "In use" list we saw earlier.

Min-ji, I'd still take search over grouping by prefix. Grouping helps when you're browsing, and I
never browse.

The percentages are back, 69% and 80%, and they still have no label.

To Nadia: the two search boxes are on different tabs here, so it's less confusing, but I'd still
try the wrong one first.

**Emma (expert analyst):** I agree with Priya. Nobody scrolls 69 columns. But "vu cr" gave me two
hits, and I can't tell why. Is it matching the start of each word, or is it fuzzy? I'd type "crit"
or "vuln_" and expect the same rule every time. If the matching is fuzzy, I need to know that
before I trust "2 matches" to mean there are only two.

Chris, your point gets worse in the size picker. [points at "Not a number (45)", open at the top of
the list] I'm sizing by a count, and the first thing I'm offered is 45 columns I can't size by: id,
hostname, mac_address. Those should be collapsed or left out, with the numeric columns first.

What I trust here is the legend. It says "Linear scale (radius), 0 to 6", so it states its scale,
which Gephi doesn't. But sizing by radius makes 6 look like nine times 2 by area. I'd want area as
the default, or at least a choice.

Min-ji, grouping by prefix: yes. The percentages still have no denominator.

**Nadia (alert reviewer):** No, I wouldn't type "vu cr". Nobody types two scraps of two words. I'd
type "critical" or paste the header straight from my export, because Ctrl+F on the header row is
how I find things in Excel. Will "critical" find vuln_count_critical, or does it only match from
the front? Nothing tells me.

[points at the second hit, "vuln_count_c...ver_30_days"] It cut off the middle again, and that's
the exact part that tells the two apart. Chris, Priya, you both said that too.

The size screen worries me more. I picked a number and the list opens on "Not a number (45)" with
id and hostname. Why would you show me what I can't use first? And that search box says "Find
attribute" while the one on the left says "Find rows and notes". Every screen has its own search
box, and I still don't know which one is which.

Min-ji says "column" and I agree. That's my word for it.

Trust: if "2 matches" can't find what I'd actually type, I'd assume the column doesn't exist and
move on. Then QA finds it.

### Round 3 -- what would make you quit, what would make you switch

**Priya (cybersecurity analyst):** The table settles it for me. "Columns: 8 of 69" shows id,
hostname, fqdn, ip_address, mac_address and role. That's an inventory sheet. None of it is what I
hunt with. On the host panel, "In use" is id and hostname, then "67 more attributes" folded up. To
see whether the EDR agent is running on monitor-prod-iad-03, I have to open 67 rows on a tiny
panel. I'd quit at that point and go back to the CSV in my notebook, where I just write
`df[df.edr_status=="stopped"]`.

Chris, you said you never browse, and I don't either. That's my point: the default set doesn't
matter if I can pin my own columns once and they stay pinned for the next export. Next month's file
will have the same names.

Nadia wanted to know which 8 columns. I'd go further: I want to choose them.

The one thing I'd change is to let me save a column set, like "hunt: os_build, last_logon,
edr_status, local_admins". It should open that way in the table and on every host, and searching on
values should work too. "10 empty, not listed" is the one honest line on that screen, so keep it.

[points at "Columns: 8 of 69" and the "67 more attributes" chevron]

**Min-ji Kim (knowledge engineer):** Neither default is right. Look at the table. The 8 columns it
chose are id, hostname, fqdn, ip_address, mac_address and role. [points at the column headers] Five
of those are just different ways of naming the same host. So these are probably the first 8 columns
in the file. That's an accident of the export, not a choice anyone made.

[points at "67 more attributes, 10 empty, not listed" on the host panel]

This line I like. It tells me ten values are missing and doesn't hide them. If I open it, though, I
expect another 67 rows in A to Z order. Priya, Chris, that's the alphabetical problem again.

Here's what would make me quit. If I can't see a column's type and how full it is next to each
other, I'll go back to a notebook and run a profile.

The one thing I'd change is a column profile table: name, kind, percent filled with a label on it,
and distinct values, sortable on every one of those. I'd pick my 8 columns there. Nadia, it would
also answer which 8 and who picked them.

**Chris (ML engineer):** The table would make me quit. It shows "8 of 69", and the 8 are id,
hostname, fqdn, ip_address, mac_address and role. Every one is a string, and every one is
something I'd never sort by. [points at the "Abc" tags across the header row] There isn't a single
number in that table. The default looks like whatever happened to come first in the file. Priya,
that's your alphabetical complaint again, only now it's in file order.

The host panel is closer. Key and Name on top, then "67 more attributes" folded up, and "10 empty,
not listed" is honest. I'd actually use that. But opening it just gets me 57 rows with no order to
them.

Here's the one thing I'd change. When I color or size by a column, it should go into the table and
onto the host card right away. Whatever I've used should be what's showing. If I have to pick
columns by hand from a list of 69, I'm back in a notebook running df[cols], and I'd just stay
there.

Nadia, the "Table" toggle at the bottom of the second screen is easy to miss. I almost didn't spot
it.

**Emma (expert analyst):** What would make me quit is the host panel. I click one host and it
shows id and hostname, then "67 more attributes, 10 empty, not listed." Those are the key and the
label, so I learn nothing about the host. Chris said it earlier: those aren't "in use," they're
bookkeeping. Next to it the table shows fqdn, ip_address, mac_address and role. That's eight
columns somebody picked, and nothing says who picked them or why. It's the same question I had
about bytes_total_24h, and the app still won't answer it.

What would make me switch is a way to pin the columns I care about once, so the table, the host
panel and the size picker all show those first. I'd want that choice saved with the file so a
client sees what I saw.

The one thing I'd change is to put a label on every number. Write "84% filled, 252 of 300." Write
"8 of 69 shown, chosen by you" or "by import." Write "10 empty," then name them. Priya, I'd take
that over search on values, because if I can't trust the counts, I'm not going to trust any filter
built on them either.

[points at "10 empty, not listed"] Hiding them is the wrong call. An empty column is a finding in
its own right.

**Nadia (alert reviewer):** What would make me quit is simple. I paste a column name I copied from
my export, get "0 matches", and the column turns out to be there under another spelling. That's
the minute I go back to Excel and Ctrl+F the header row. QA won't accept "the tool said it wasn't
there."

Priya wants search on values, like edr_status = stopped. For me that's the same box. I don't care
whether what I'm pasting is a header or a value. I want one search box that finds it and tells me
which one it was. Right now there's one box on the left, another in the size picker, and "Find rows
and notes" on top. That's three guesses.

Min-ji's grouping by prefix is fine, but I'd never browse 69 of anything. Chris is right that I
don't browse either.

The one thing I'd change is to show the whole name and say what the percent means. Don't cut
"vuln_count_c...ver_30_days" in the middle. Put "84% filled in" or whatever it really is. If I
can't read the name and the number exactly, I can't write them into the alert file, so I won't pick
that column at all.

## Themes

Counts are out of 5. Severity is Nielsen's 0 to 4 (4 = catastrophe, 3 = major, 2 = minor,
1 = cosmetic). All five voices are simulated personas, so agreement here is a lead for the
task-based sessions to confirm, not proof.

### 1. The fill percentage has no label (5 of 5; severity 3)

- **Who:** Priya (round 1), Min-ji (rounds 1, 2), Chris (rounds 1, 2), Emma (rounds 1, 2, 3),
  Nadia (rounds 1, 3).
- **What:** "84%", "62%", "3%" beside column names. Every participant guessed "filled in", and none
  was sure. Nadia and Emma tie it to trust: a number they cannot name cannot go into an alert file
  or a client report.
- **Wanted:** a word and a denominator -- "84% filled, 252 of 300" (Emma), "84% filled in" (Nadia).
- **Agreement:** total, and persistent across all three rounds without prompting. The strongest
  finding of the group.
- **Note:** the spec draws the fill as a bare "20%" by design, so this is a spec finding, not a
  skeleton slip.

### 2. The middle ellipsis hides the part that tells columns apart (4 of 5; severity 3)

- **Who:** Priya (rounds 1, 2), Min-ji (round 2), Emma (round 1), Nadia (rounds 2, 3). Chris did
  not raise it.
- **What:** "backup_l...ccess_at" and "vuln_count_c...ver_30_days". In these exports the shared
  prefix is at the front and the qualifier ("over_30_days") is in the middle or end, so the
  ellipsis removes exactly the distinguishing words. Nadia: if she cannot read the name exactly,
  she will not pick the column.
- **Note:** the spec mandates a middle ellipsis on every attribute name, with the full name in the
  tooltip. A tooltip does not help someone scanning two search hits side by side. Worth testing a
  wider list or a two-line row against the tooltip in the task sessions.

### 3. The Size by picker opens on columns that cannot set a size (5 of 5; severity 3)

- **Who:** all five in round 2.
- **What:** the list opens with "Not a number (45)" expanded at the top, id and hostname first.
- **Wanted:** numeric columns first; the rest collapsed under one line at the bottom (Chris, Emma,
  Min-ji) or left out (Priya, Min-ji).
- **Note:** this contradicts the spec, which lists unsuitable attributes LAST and disabled with a
  reason. Treat it as a skeleton defect to fix before the next round, not as evidence against the
  design.

### 4. The defaults look accidental, and nobody says who chose them (5 of 5; severity 3)

- **Who:** Priya (rounds 1, 3), Min-ji (round 3), Chris (rounds 1, 3), Emma (rounds 1, 3), Nadia
  (round 1).
- **What, three parts:**
  - "In use (2)" is the key and the label. Chris and Emma: that is bookkeeping, not use. Nadia
    alone found it sensible as "what is being used right now".
  - "Columns: 8 of 69" shows id, hostname, fqdn, ip_address, mac_address, role: all strings, five
    of them names for the same host. Min-ji and Chris read it as file order. Priya: "an inventory
    sheet".
  - The weight came from bytes_total_24h and nothing says who chose it (Priya, Emma).
- **Wanted:** provenance on every default -- "chosen by you" or "by import" (Emma).
- **Note:** the spec says the table shows the key plus the attributes in use. With 2 in use, the
  skeleton's 8 columns contradict its own rule. Part of this theme is a skeleton artifact; the
  provenance complaint (who chose the weight, who chose the columns) stands either way.

### 5. Name order is not triage (4 of 5; severity 2)

- **Who:** Priya, Min-ji, Chris, Emma (round 1). Min-ji and Chris return to it in round 3 for the
  "67 more attributes" list on a host.
- **What:** past "In use", the list is alphabetical, which puts backup and nine cmdb columns ahead of
  what an analyst hunts with.
- **Dissent on the fix -- five different answers:**
  - group by name prefix (Min-ji, Emma);
  - prefixes are unreliable in real exports, so search instead (Priya, Chris);
  - filter by kind, "num" or "date" (Min-ji, round 2);
  - a sortable column profile of name, kind, fill and distinct values (Min-ji, round 3);
  - numbers first (Chris).
- **Nadia** never objected; she skips the list.
- **Conclusion:** the problem is agreed; the remedy is not.

### 6. A working set of columns that the user chooses and that persists (4 of 5; severity 3)

- **Who:** Priya, Min-ji, Chris, Emma (round 3).
- **The same need, four mechanisms:**
  - **Priya:** a named, saved column set reused across monthly exports.
  - **Emma:** pin once; the table, host panel and pickers all follow; saved with the file so a
    client sees the same.
  - **Chris:** no picking at all -- whatever is colored or sized appears in the table and on the
    host card automatically.
  - **Min-ji:** pick from the profile table.
- **What it means:** the spec's "In use first" rule already gives Chris's version. In this
  skeleton, "In use" holds only the key and label, so nobody saw it work. The task sessions should
  check whether "in use" fills the table once something is colored, before the studio adds a
  second way to pin columns. The README forbids two patterns for one job.
- **Quit risk:** Priya, Chris and Min-ji each named the notebook as where they would go back to.

### 7. Search: the matching rule is invisible, and a false "0 matches" ends trust (5 of 5; severity 3)

- **Who:**
  - Priya, Min-ji, Emma and Nadia said nobody types "vu cr".
  - Priya, Chris and Nadia expect substring matches ("edr", "p95", "30d", "critical").
  - Emma and Nadia: the result count is only trustworthy if the rule is known.
- **Dissent:** Chris liked the word-start matching ("like the VS Code file finder"); Min-ji called
  the bold matched letters "honest".
- **Nadia's quit condition:** a pasted header returns "0 matches" when the column exists.
- **Note:** the spec chooses word-start matching. "critical" does match vuln_count_critical under
  that rule, but nothing on screen says so. Nadia's fear may be unfounded but is not addressed. A
  substring fallback when word-start finds nothing would answer everyone except the purists, at
  little cost.
- **Value search** ("edr_status = stopped"): wanted by Priya and folded into one box by Nadia; Emma
  ranks it below trustworthy counts. 2 of 5 -- a lead, not a finding.

### 8. Too many search boxes (2 of 5; severity 2)

- **Who:** Nadia (all three rounds: "three guesses"), Chris (round 2: "I'd still try the wrong one
  first").
- **What:** "Find rows and notes", "Find attribute" and the picker's own find field.
- **Weight:** Nadia is the least technical participant and the one most likely to stand for new
  users. Others were silent, not opposed. Test it with a first-click task.

### 9. Hidden empty columns: keep the count, name them (dissent; severity 2)

- **Who:** Priya, Min-ji and Chris praised "10 empty, not listed" as honest. Emma: hiding them is
  wrong, because "an empty column is a finding in its own right"; name them.
- **Reconciliation:** keep the count and make it open to the list of names. That satisfies both
  sides.

### 10. The graph summary panel earns trust (3 of 5; positive)

- **Who:** Min-ji (rows equal edges, "Isolated nodes 7"), Chris (average degree), Emma (checked
  2 x 1,105 / 300 = 7.37).
- **Problem:** "Readings not computed" means nothing to Emma (severity 2, single voice).

### 11. The canvas was skipped (3 of 5 explicitly; discount)

- **Who:** Priya, Min-ji and Chris skipped the graph; Nadia works in the table.
- **Discount:** the canvas in the skeleton is a placeholder drawing with no meaningful positions,
  so this says nothing about a real layout.
- **What survives:** for a wide table, the first stop is the column list and the summary, not the
  picture.

### 12. Local-only reassurance (3 of 5; positive)

- **Who:** Priya, Emma and Min-ji noticed the lock and the never-uploaded line on the start screen.
- **Wanted:** Priya and Emma want a verifiable statement, including telemetry.

### Single voices -- record, do not act on alone

- **"Column", not "attribute"** -- Min-ji and Nadia, 2 voices. Worth a terminology check across
  personas; the spec's word is "attribute" throughout.
- **Size by radius exaggerates by area** (Emma). She wants area as the default or a choice. Sound
  on perceptual grounds; check what the spec defaults to.
- **The "Table" toggle is easy to miss** (Chris).
- **The left side edits and the right side only looks?** -- Nadia cannot tell.
- **Assistant would never be clicked** (Emma).

## Group-think to discount

- **"Nobody types that."** Priya opened round 2 with it, and Min-ji, Emma and Nadia repeated the
  phrasing almost word for word. "vu cr" was the scripted query, so participants were reacting to
  the task wording, not to a search they chose. Their real expectation, substring matching, is
  independent and stands. The pile-on about the example query does not.
- **"I never browse."** Chris said it in round 2. Priya and Nadia adopted it in round 3, citing him.
  Min-ji, the only participant who described browsing by kind, was outnumbered rather than
  answered. Do not read 4 of 5 as "nobody browses".
- **Truncation in round 2.** Nadia explicitly cites Chris and Priya ("you both said that too"),
  although Chris had not raised it. Count her round-3 statement, which is grounded in her own alert
  files, not her round-2 echo.
- **The size picker.** Unanimous, but participants quoted each other ("Chris is right", "Chris,
  your point gets worse"). It is also a plain contradiction of the spec, so the unanimity adds
  little beyond confirming the defect.
- **Percentages.** Raised by everyone every round. The persistence is real, but by round 2 it was
  partly ritual ("the percentages are back"). Weight it as 5 independent round-1 voices, which is
  already the maximum.
- **All five are simulated.** They share a tendency to agree, cite each other and converge on the
  same remedy phrasing. Themes 1, 3 and 4 are well supported. Themes 5 and 6 agree on the problem
  only. Everything else needs task evidence from the sessions.
