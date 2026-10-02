# Focus group: notes, what they are pinned to, and whether they can be trusted later

Six simulated participants looked at the Notes screens of the clickable B skeleton: the
notes list beside the Les Miserables graph, and the "door entries" sample where a note is
being written about a shortest path between two people. Three rounds: first impressions of
how notes are organized and what tells you what a remark is about; then the tag on a note
about a path ("Ana Ruiz to Priya Nair"); then what would make each of them quit, and the one
thing they would change.

Participants:

| Name used | Persona | Works in |
|---|---|---|
| Marcus | intelligence analyst | case files that may end up in court |
| Sarah | fraud analyst | suspicious-activity reports reviewed by QA |
| Tom | recipe recipient | lab head who reads, rarely builds; answers to auditors |
| Mara | Gephi holdout | network-science researcher, coauthored files |
| Morgan Reyes | screen-reader analyst | screen reader and braille; NetworkX scripts |
| (bioinformatics researcher) | bioinformatics researcher | gene networks, shared with postdocs and a student |

Name artifacts in the transcript, kept as spoken: Morgan calls Sarah "Gloria" in round 2
and Sarah corrects it in round 3; several participants call the bioinformatics researcher
"Bob" while Tom refers to "her". Treat these as simulation slips, not findings.

---

## Transcript

### Round 1 -- how are the notes organized, and what tells you what each one is about?

**Marcus (intelligence analyst):** Left rail looks like the panel layout I know from i2.
The chart sits in the middle, a list on the left and properties on the right. That much I'd
figure out without the five-minute video.

The Notes list is what I looked at first, because that's where my working judgments go.
Each entry gives the remark, then the thing it's tied to (the "Community 3", "Valjean" and
"Javert -- Valjean" boxes), then a date. Good: "Cites Betweenness" in the dashed box tells
me where the claim came from, and that's halfway to sourcing. "Keeps the earlier run and its
value" is better still, because a number that changes after I briefed it is how I get
burned on the stand.

What bothers me: "2 h ago", "Yesterday" and "Sep 28" are not times I can put in a case file.
I want a real date and a clock time. And I can't see who wrote any of them. Is it me, or the
analyst before me? I can't tell. Without that, these are just sticky notes, not a record.

On how it's laid out: "Local only" up top is the first thing I'd check. I'd still ask IT
what it means.

**Sarah (fraud analyst):** Organized? Left side is a rail of icons, then a list of remarks,
the chart in the middle, and a numbers panel on the right. Fine. I found the notes without
hunting, and that's more than I can say for our case system.

But look at that list. "2 h ago", "Yesterday", "Yesterday, edited", "Sep 28". That's not a
date, that's a mood. If I paste that into a case file, "Yesterday" is wrong by the time the
reviewer opens it. I need the actual date and time, and I want the original time kept, not
just "edited".

The little boxes under each remark (the "Valjean", "Javert -- Valjean" ones) tell me what
it's attached to. That part I like. Two people with a dash between them reads like a link.
Whether that's one transaction or the whole chain, I can't tell yet.

And nothing on this screen says who wrote any of it. In my shop, if a remark sits in a file
with no name on it, QA treats it as if nobody wrote it. Where are my account numbers, by the
way? This is a novel.

**Tom (recipe recipient):** I'm Tom. I run the lab, I don't build these. My first look: the
picture in the middle is the part I came for, and that's fine. Everything else is panels.
There's a list down the left of what I take to be comments, a column of numbers on the right
I'd skip, and a row of icons along the bottom I wouldn't touch.

The list on the left reads like a lab notebook with the signatures torn off. "Yesterday",
"Sep 28", "2 h ago". Fine, but whose? If the postdoc wrote "Check whether PageRank ranks them
side by side", is that a job for me or a note to herself? I can't tell. In our notebooks
every entry gets initialed and dated, and the auditors check for exactly that.

The little boxed words under each comment, like "Valjean", "Community 3", "Cites PageRank",
tell me what it's about, I think. The dashed ones I don't understand. And "2 h ago" won't
mean anything when I open this file again in March.

"Local only" at the top is the one thing I was glad to see. I'd still ask IT what it means.

**Mara (Gephi holdout):** So this is my Data Lab with sticky notes on it? Fine. The layout
makes sense to me: graph in the middle, a list on the left, readings on the right. The
Summary panel is the first thing I'd defend. It shows 77 nodes and 254 edges, and that
matches Les Mis as I remember it. It also gives density and components. Good. Below the
canvas there's a Table tab, so the rows aren't hidden from me.

The notes list is what bothers me. Each remark carries a tag, like Community 3, or Valjean
and Javert, or a dashed "Cites PageRank" box. So I can see what each one is about. But
"Yesterday" and "2 h ago" are useless in a lab notebook. Yesterday relative to what? When I
open this in March I want a date. One note says "Earlier run", which tells me the stored
value can go stale, and I approve of that. But which run, with which parameters? And I have
no idea who wrote any of these. With a coauthor on the file, that matters.

Also, "Louvain" sits alone at the bottom like a filter. Is the whole map filtered right now?
The top bar says Full graph, so I'll trust it this once.

**Morgan Reyes (screen-reader analyst):** The page has a few names I can work with. The rail
along one side lists Graph, Data, Views, Notes and Assistant, and if those come through as
headings, Notes is the second thing I'd press H to. That much is fine. The list of remarks
bothers me more.

Each remark is a sentence, then a row of small tags, then a date. I hear the sentence first,
which is the right order. Then I hear "Community 3", and a colored dot I'll never know about.
Then "Cites Louvain", and I can't tell what citing means compared with a plain tag. Is it a
source or a subject? Then a date.

The dates are "2 h ago", "Yesterday", "Yesterday, edited", "Sep 28". When I write an audit
trail I need the actual date. "Yesterday" means nothing in a file I open three months from
now, and I'd want to know edited when.

The last thing I want to know about any line in a case file is who said it. Nothing here
tells me, and nothing tells me whether that's because one person wrote all seven. In my
world, a remark with no source goes in the pile I re-check myself.

The list is laid out so you can skim it. Whether it reads so I can skim it, I can't tell
from the screen.

**Bioinformatics researcher:** Organization first. The left rail and the list of notes are
clear enough. The notes sit in a column beside the network, each with a little tag pointing
at a node or a community. That part I get.

Now what tells me what each remark is about? It's those gray tags: "Valjean", "Community 3",
"Javert -- Valjean". And "Cites PageRank" with the dashed box, which I assume links to the
actual run. I like that. A number like "0.57 betweenness" is worthless to me without the run
it came from.

What's missing for my work is everything a lab notebook entry carries. "Yesterday" and
"2 h ago" are fine today and useless in six months. I want a real date. Who wrote it? Seven
remarks and not one of them says. In my group two postdocs and a student touch the same
network. If I can't tell my note from the student's, I can't defend it to a reviewer. Also
"Community 3" from which Louvain run, with what resolution? Community numbers change every
time you rerun it.

### Round 2 -- the tag on a note about a path

**Marcus:** On the door-entries screen I pointed at the writing box. The tag says "Ana Ruiz
to Priya Nair" with an orange dot. The notes under it say "Ana Ruiz . person" and
"Ana Ruiz -> B1 . entries", so those tell you what kind of thing each one is. The chain tag
doesn't. "Ana Ruiz to Priya Nair" could be a phone call between them, and on the stand,
"they called each other" and "they badged into the same building" are two very different
claims. It needs to say "path" and the middle hop, "via B1", right on the tag. The panel on
the right shows the hop, so put it in the tag as well.

The fraud analyst asked whether it's one transaction or the whole chain, and that's my
question too. Like the bioinformatics researcher says about community numbers, this path
came out of a calculation ("from Shortest paths"). If someone adds March entries next week,
the path might go through B12 instead. Then my remark is about a chain that no longer
exists, and I want the tag to say so, the way the crossed-out B12 one does.

**Sarah:** On the door-entries screen, the remark I'm writing gets a box at the top that
says "Ana Ruiz to Priya Nair" with an orange square. Below it, the remark about one person
says "Ana Ruiz . person", and the one about a link says "Ana Ruiz -> B1 . entries", with an
arrow. So the little icon and the word after the dot are how I'm supposed to tell them
apart. I'd have missed the arrow. My eye goes to the words. "Ana Ruiz to Priya Nair" just
looks like two names.

In a SAR I'd write it "Account A to Account C via B1, 2 hops". The panel on the right
already says that: From, To, Via. Put that in the box. Bob's right that "Community 3" means
nothing without the run. Same here. "from Shortest paths" has to stay with the remark,
because if somebody reruns it and the route changes, my remark is about a route that's gone.

Trust? Same as Marcus said. No name, no real timestamp, and QA sends it back.

**Tom:** That screen with the writing box helped me. Up top of the box it says "Ana Ruiz to
Priya Nair" with a little orange square, and on the right it says Path, three people and two
links, "via B1". So "to" tells me it's a chain. That works for me. In the list,
"Ana Ruiz . person" is clearly one person. But "Ana Ruiz -> B1 . entries" is an arrow too,
and that's one link, not the whole chain. I couldn't tell you which is which without
squinting, and I'm at 125 percent zoom.

Fraud-analyst said she can't tell one transaction from the whole chain. Me neither. Spell it
out: "chain, 3 steps."

On trust, Marcus has it right. "Yesterday" is a sticky note. I'd also add this. The box I'm
typing into doesn't say who I am or when I wrote it. If I write "check this" and the postdoc
reads it in March, she'll assume she wrote it. In our notebooks you initial and date the
line before you write. I'd want it to say "Tom, Oct 2" right there, not show up later.

Also, "B12 . building" is crossed out. Deleted? Wrong? Nobody says.

**Mara:** I'm pointing at the writing box. The tag at the top says "Ana Ruiz to Priya Nair"
with an orange square. The finished notes underneath say what kind of thing they're tied
to: "Ana Ruiz . person", "B1 . building", "Ana Ruiz -> B1 . entries" with a little edge
icon. So for a single node or a single tie, there's a word after the dot and I can read it.
The chain gets no word at all. It doesn't say "path", it doesn't say "3 nodes", it doesn't
say "shortest". Only the panel on the right says "Path from Shortest paths". The fraud
analyst asked whether the dash meant one transaction or the whole chain, and she's right to
ask. Here "to" is the only clue, and in my seminar students would read it as a single
directed edge.

Pajek or Gephi would just call it a path, or a selection. I want "Ana Ruiz to Priya Nair .
path, 2 hops". I'd also want it to keep which shortest path it was, because with ties there
can be more than one. Bioinformatics already made the same point about Louvain runs, so I'll
just add paths to it.

**Morgan Reyes:** Gloria, the fraud analyst, said two names with a dash between them read
like a link. To you, maybe. My reader says "Javert dash dash Valjean". On the door-entries
list I hear "Ana Ruiz dash greater B1 dot entries". Then, in the box I'm writing in, the tag
says "Ana Ruiz to Priya Nair". So the same idea gets three spellings, and none of them tells
me whether I'm on one tie or a whole route. "To" is the only one I'd guess right, and it
would still be a guess. A route has a middle. The panel on the right lists "B1, hop 1", so
the tool knows there's a stop in between. The tag doesn't say so.

What would I want? A spoken word before the names, like "route, 2 steps, Ana Ruiz to Priya
Nair", or "tie, Javert and Valjean". The other tags already do this with "person" and
"building". So say "route" on this one too.

Tom asked who wrote these. I'd ask that second. First I need to know what the remark is
pinned to, because when I file a finding on the wrong thing, that's the mistake that comes
back to bite me.

**Bioinformatics researcher:** I'll take the chain question. On this screen the writing box
says "Ana Ruiz to Priya Nair", with an orange dot. The list underneath shows
"Ana Ruiz . person" for one node and "Ana Ruiz -> B1 . entries" for one edge. So the arrow
and the "to" are doing the work. For me that's too subtle. In a pathway I'd say "TP53 to
MDM2" about a single interaction just as easily as about a whole route. What tells me it's
the route is the right panel: "Path, from Shortest paths", three nodes, via B1. That's what
should travel with the note. I mean the hops, and the run that found them.

Marcus is right that a number changing after you've briefed it is the danger. Paths are
worse. Rerun shortest paths after the student adds an edge and the route changes. Does my
note then point at the new route or the old one? I'd want the note to keep the members as
they were, like the "Earlier run" note keeps its value. Tom, the initials matter, but in my
group a stale path does more damage than an unsigned note.

### Round 3 -- what would make you quit, and the one thing you would change

**Marcus:** I'd quit over one thing. A remark that leaves this tool and goes into a case
file with nothing on it except "Yesterday." If I hand that to a prosecutor, defense counsel
asks who wrote it and when. "The software didn't say" ends my testimony and probably the
case. So the one thing I'd change is a real date and clock time on every remark, and the
time of each edit kept, not just the word "edited."

Tom wants the name and date showing in the box before he starts writing. I agree. I'd also
add this: if my name isn't set, the remark should say so, something like "no name
recorded," not just leave a blank. A blank looks like somebody deleted it.

Bob's right that a stale path is worse than an unsigned note. When a colleague opens this in
six months, they need the remark to still show the chain as it was when I wrote it, through
B1, even if a rerun now goes through B12. Otherwise it's a statement about evidence that has
changed since, and it's useless.

Would I switch tools? Not over looks. Only over this.

**Sarah:** I'm Sarah, not Gloria, Morgan. If a remark goes into my case file the way it
looks now, with no name, "Yesterday" and nothing more, I'd quit using it for remarks. The
finding would go in Word, and this would just be the picture. That's what I already do with
i2.

The one thing I'd change is to stamp every remark the moment it's saved: who wrote it, the
real date and clock time, and the original time kept if it gets edited. Nobody types that
in. The tool does it. Tom has the right idea with "initial and date before you write." It
shouldn't depend on me remembering to.

Bob's stale-route point comes second for me, but it's close. If my remark says "A to C via
B1" and someone reruns it next month, the remark has to keep the route as it was when I
wrote it. Six months on, my reviewer or an examiner opens this. If they can't see who said
it, when, and about which exact chain, it's hearsay. QA sends it back, and I've lost a day.

Fix that and I'd keep remarks in here. Otherwise this is just a viewer.

**Tom:** What would make me quit is simple. Say I open this in March and there's a remark in
there telling me to "check this". If I can't tell whether the postdoc wrote it, the student
wrote it, or I wrote it myself and forgot, I stop trusting every line in the file. Then I go
back to asking her to email me. A PNG and an email at least has a "From" line on it.

The bioinformatics researcher says a stale path does more damage than an unsigned note.
Maybe in her group. I'm the one the auditor asks, and the auditor doesn't ask me which
shortest path it was. He asks who wrote it and when. "Yesterday, edited" gets me nowhere.
Edited by whom? Did somebody change what the postdoc said after she said it?

Morgan's right that you need to know what a remark is pinned to first. I'll give her that.

The one thing to change? I don't know how you'd do it, that's her job. I want to open the
file next year and know who said each thing and on what date, without walking down the hall
to ask.

**Mara:** You asked what would make me switch or quit. On these notes it's simple. I'd quit
over a remark that says "Community 3" with nothing to tie it to the run that made it. Bob
raised this in the first round, and as I said, I've had a reviewer ask me why community 7
became community 4. If a note points at a modularity class, it has to keep which run that
was: the resolution, and whether it ran on the whole graph or only what was showing. The
"Earlier run" note already keeps its value. Do that for every tag, and do it for the path
too.

The one thing I'd change is the dates. "Yesterday" has to become 2026-10-01 14:20. A lab
notebook doesn't say "yesterday."

On who wrote it, Tom and Marcus care more than I do. If I'm alone on a file, I don't need my
name on every line. But my coauthor and I pass files back and forth. If a note doesn't say
it's hers, I'll assume it's mine and defend it to a reviewer. I'd want her name on it, and
I'd want to know who it was.

Would any of this make me switch? No. Notes don't move me off Gephi. But a remark that goes
stale without saying so would make me stop using them.

**Morgan Reyes:** What would make me quit is simple. I'd quit the first time I filed a
remark on the wrong thing because the tag didn't say what it was. My NetworkX script prints
"path: A, B1, C" and I've never misread it. Here I get "dash dash", "dash greater" and "to"
for what may or may not be three kinds of thing. If I have to arrow into the right-hand
panel to check whether my note sits on a route, I've already lost to my terminal.

Bob, the bioinformatics researcher, is right that a stale route is worse than an unsigned
note. I'd go further than him, though. If the route changes, I want the note to tell me so
out loud, not just show a strikethrough. Tom, I won't hear that line through B12 either, so
"crossed out" means nothing to me.

The one thing I'd change is for every tag to start with a spoken word: person, tie, route,
community. Put the count of steps after it, and the run it came from.

What would make me switch? Getting the remark, what it's on and a real date in one line I
can read on braille.

**Bioinformatics researcher:** I wouldn't quit over a missing name. Tom, you'd quit over
that and I see why, but in my group I already know who touches the file. What would send me
back to RStudio is a remark that changes what it means without telling me. Say a note reads
"Community 3 is the interferon module". Next week a student reruns Louvain at a different
resolution, and Community 3 becomes some other set of genes. The note quietly points at the
new set, and I've given the bench a short list on the strength of a sentence that no longer
describes anything. Marcus called that getting burned on the stand. For me it's a
retraction.

So here's my one change. Every note has to keep the run it refers to, meaning the algorithm,
its parameters and the date, plus the members as they were when the note was written. The
"Earlier run" note already does this for one value. Do it for every note. If the thing has
changed since, tell me in the tag itself, the way the crossed-out B12 one does. Mara, that
also covers your tied shortest paths.

The date has to be a real date. A name I'd sign myself, if there's a place for it.

---

## Themes

Counts are participants out of six. "Unprompted" means raised in round 1, before the
moderator steered toward it; rounds 2 and 3 were steered, so agreement there is weaker
evidence. Severity is Nielsen 0-4.

### 1. Relative times cannot go into a record -- severity 3, 6 of 6, all unprompted

"2 h ago", "Yesterday", "Yesterday, edited" and "Sep 28" (no year, no clock time) all fail
the moment the file is opened later or pasted elsewhere.

- Voiced by: Marcus, Sarah, Tom, Mara, Morgan, bioinformatics researcher -- every one in
  round 1, before hearing the others.
- What they asked for: an absolute date and clock time on every note (Mara wrote the form
  out: 2026-10-01 14:20); the original time kept when a note is edited, with the time of
  each edit (Sarah, Marcus, Morgan).
- Dissent: none.
- Confidence: the strongest finding of the session. Unanimous, independent, and costless to
  fix. A relative time may still be useful as a secondary label; nobody objected to it
  existing, only to it being the only time.

### 2. No author on any note -- severity 3, 6 of 6 unprompted; priority split

Nothing on the list says who wrote a note, and nothing says whether that is because one
person wrote them all.

- Voiced by: all six in round 1.
- Ranked first by: Tom (auditor asks "who and when"), Sarah (QA rejects unsigned remarks),
  Marcus (testimony).
- Ranked lower by: bioinformatics researcher ("I already know who touches the file"), Mara
  (matters only on coauthored files -- but she then said coauthoring is exactly her case),
  Morgan (second, after knowing what the note is pinned to).
- Specific proposals, each from one or two voices:
  - The tool stamps author and time on save; nobody types it (Sarah).
  - The writing box shows who you are and the date before you start, e.g. "Tom, Oct 2"
    (Tom; Marcus and Sarah agreed).
  - When no name is set, say "no name recorded" instead of a blank, because a blank reads
    as a deletion (Marcus, single voice).
  - "Edited" must say by whom; Tom's worry is someone changing what another person said
    (Tom, Sarah, Marcus).
- Note for the element boundary: authorship and time stamping are note data, so they belong
  to graphty-element's notes, not to app chrome.

### 3. The tag on a path note does not say it is a path -- severity 3, 6 of 6 (steered)

"Ana Ruiz to Priya Nair" carries no kind word, while single-node and single-edge tags do
("Ana Ruiz . person", "Ana Ruiz -> B1 . entries"). The hop count and the middle stop
("via B1") appear only in the right-hand panel.

- Voiced by: all six in round 2, which the moderator pointed at this tag; Sarah raised the
  "one transaction or the whole chain?" question unprompted in round 1, so it has one
  unprompted voice.
- Mostly agreed: the tag needs a kind word, the hop or step count, and the middle stop.
  Concrete forms offered: "path, 2 hops" (Mara), "chain, 3 steps" (Tom), "Account A to
  Account C via B1, 2 hops" (Sarah), "route, 2 steps, Ana Ruiz to Priya Nair" (Morgan).
- Partial dissent: Tom said "to" did tell him it was a chain; his trouble was the arrow on
  a single-edge tag looking like a chain too.
- Three spellings for related ideas: " -- " for an undirected tie, " -> " for a directed
  edge, "to" for a path. Morgan hears them as "dash dash", "dash greater" and "to"; Sarah
  and Tom read past the arrow glyph. Every participant who discussed it wanted words,
  not punctuation, to carry the difference.
- Vocabulary is NOT settled by this group: path (Marcus, Mara), chain (Tom, Marcus), route
  (Morgan, bioinformatics researcher), tie vs link vs edge. Pick the word from graphty's own
  ontology, not from whoever spoke loudest.
- Marcus's sharper point: "to" between two people can be read as a direct relationship (a
  call), which in a legal setting is a different claim from a shared path.

### 4. A note must keep the run it came from, and what it referred to at the time -- severity 3, 5 of 6

A community number or a shortest path changes when the algorithm is rerun or data is added.
A note that silently follows the new result is worse than useless.

- Voiced by: bioinformatics researcher (originated it in round 1 and made it her quit
  reason), Mara (unprompted in round 1: "which run, with which parameters?"; her quit
  reason), Marcus, Sarah, Morgan (adopted it in rounds 2-3).
- What they asked for: the algorithm, its parameters, the date, and whether it ran on the
  whole graph or only what was visible (Mara); the members as they were when the note was
  written (bioinformatics researcher, Marcus, Sarah); for tied shortest paths, which one
  (Mara). When the referent has changed since, the tag itself should say so.
- What already works: the "Earlier run" note, which keeps its value, was praised by Marcus,
  Mara and the bioinformatics researcher. Everyone who mentioned it asked to apply it to
  every note, not one.
- Dissent: Tom -- "the auditor doesn't ask me which shortest path it was." He does not
  reject the feature; he ranks it below authorship.

### 5. The crossed-out tag does not say what happened -- severity 2 (3 for screen-reader users), 3 of 6

The "B12 . building" tag shown with a strikethrough is meant to signal a changed referent.

- Tom: deleted? wrong? nobody says.
- Morgan: a strikethrough is not announced; the change has to be stated in words.
- Bioinformatics researcher and Marcus treated it as the right idea (flag a change in the
  tag), which conflicts with the two readers above only on how, not whether.
- Resolution the evidence supports: keep the signal, add words that say what changed.

### 6. Meaning carried by color or line style alone -- severity 3, 2 of 6

- Morgan: the colored dot on "Community 3" (and the orange square on the path tag) is
  invisible to her. Single voice, but this is a straight WCAG 1.4.1 failure, so it does not
  need a second voice to count.
- The dashed "Cites ..." box: Tom did not understand the dashed tags; Morgan could not tell
  whether citing marks a source or a subject. Marcus and the bioinformatics researcher read
  it correctly as a source and liked it. So the idea works for experts and the styling
  carries it; a reader who cannot see the dash or does not guess gets nothing.

### 7. Orientation is fine -- low severity, 6 of 6

Everyone located the notes list without hunting and described the layout correctly (rail,
list, graph, readings panel). Mara found the Table tab and the Summary panel and checked the
counts. Morgan could name the rail items. No action needed; it is the baseline the other
themes stand on.

### 8. Single-voice items worth a look

- "Louvain" alone at the bottom reads like an active filter; Mara had to check the top bar
  to see "Full graph" (Mara only).
- "Local only" was the first thing Marcus and Tom checked, and both would still ask IT what
  it means (see group-think below on the identical wording).
- Remarks leave the tool: Marcus and Sarah both described a note being pasted into a case
  file. Whatever a note carries on screen has to carry into what is copied or exported,
  or the fix for themes 1-4 stops at the screen edge. Sarah's fallback is to keep findings
  in Word and use graphty only as a picture.
- One line on braille with the remark, its target and a real date (Morgan).

---

## Agreement and dissent summary

- Full agreement: absolute timestamps (1); orientation is fine (7).
- Agreement on the what, disagreement on the order: authorship (2) versus keeping the run
  (4). The legal and audit voices (Marcus, Sarah, Tom) put authorship first; the research
  voices (bioinformatics researcher, Mara) put provenance first; Morgan puts "what is it
  pinned to" (3) first of all. These are not competing designs -- all three can ship -- so
  the ordering matters only for sequencing.
- Real dissent: Tom alone thinks "to" already says chain; Tom alone discounts provenance.

## Group-think and artifacts to discount

- **Round 3 convergence on "a stale path is worse than an unsigned note".** The
  bioinformatics researcher framed it at the end of round 2. Marcus and Sarah, who had both
  made authorship their headline in rounds 1-2, opened round 3 with "Bob's right". Their
  quit reasons still name authorship and time first, so count the ranking flip as
  deference, not a change of view. Tom pushed back explicitly.
- **Steered agreement in round 2.** Six of six on the path tag is what the question asked
  about. Count it as one unprompted voice (Sarah, round 1) plus five confirmations.
- **Verbatim echo.** Marcus and Tom both end round 1 with the identical sentence "I'd still
  ask IT what it means" about "Local only". That is a simulation artifact; count the "Local
  only" point as one voice at most.
- **Quit-question theatrics.** "What would make you quit" invites strong statements
  ("ends my testimony", "it's a retraction"). Read them as ranking signals, not as
  measured churn risk.
- **Sample weighting.** Three of six participants work in evidentiary settings (court, QA,
  auditors), which inflates how often "case file" and "on the stand" appear. Researchers
  who work alone care less about authorship.
- **Mock-fidelity artifacts.** Sarah's "where are my account numbers? This is a novel" is
  about the Les Miserables sample data, not the design. Mara's "77 nodes and 254 edges"
  check validates the sample data, not the Summary panel. Neither is a finding.
- **Name slips.** "Gloria" for Sarah and "Bob" for the bioinformatics researcher (whom Tom
  calls "her") are simulation slips; cross-references between participants were attributed
  by content, not by the name used.
