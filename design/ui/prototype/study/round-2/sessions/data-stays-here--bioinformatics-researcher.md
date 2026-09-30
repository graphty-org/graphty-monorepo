# Session: "Does my data stay here?" -- Dr. Chen, computational biologist

Participant: Dr. Chen, group leader in computational biology at a translational research institute
with a pharma partner (persona: study/personas/bioinformatics-researcher.md).
Task, as the moderator gave it: "Before you load anything: your organisation is strict about where
data goes. Is this OK to use? Later, mid-session: did anything just leave your machine?"
Screens used: the start screen (render: shots/screens__start-screen.png), the "Where your data goes"
page it links to (shots/screens__data-location-full.png), and the main window with a graph open
(shots/screens__frame-at-rest.png, the file popover in shots/screens__frame-at-rest-s5.png, the
Assistant-on state in shots/record/screens__frame-at-rest-s8.png, and the protein sample in
shots/screens__frame-at-rest-dataset-ppi.png).

## Part 1 -- before loading anything

**Start screen.** "OK. 'Open a graph'. Four samples, Open..., Connect to data source.... Before I
touch any of that -- right under the title: 'Files stay on this computer. graphty reads them in this
browser and uploads nothing.' Good, that's the first question and it's answered before I asked it.
Second line, 'Projects are kept in this browser.' Fine, that also tells me if I clear my cache I
lose them. I'll remember that."

"Now, 'uploads nothing' is a sentence. Every vendor has that sentence. What I need is something I
can send to our information governance person, because she's the one who says yes, not me. There's
a link, 'Where your data goes'. I'll click that."

**The (i) next to Connect to data source.** (Hovers first, before clicking the link.) "'Sends only
your query, to the source you name.' So that's the one thing that goes out. I'd never use it with
patient-derived data anyway; I don't have a database I'd point a browser at. Fine."

**"Where your data goes" page.** (Opens in a new tab.) "Right. 'Describes graphty 2.0. Updated
September 28, 2026.' A version and a date -- that is what I want, because this changes between
versions and I have to record which one we assessed. Copy link, Print or save as PDF -- good, IG
wants a PDF in the file."

"'In short.' Files read by the browser, not uploaded, 'graphty has no account and no server that
receives your data.' Data leaves only through two features, off until you turn them on: Connect to
data source and the Assistant. Projects kept in this browser on this computer only. That's three
lines I can paste into an email. That's actually well done."

"The table 'What stays in this browser' -- files, projects, exports through the save dialog,
'graphty keeps no copy', an Assistant key. Fine. 'What leaves this browser, and only when you ask'.
Assistant sends 'your question; the graph's counts; each column's name with up to 10 of its values
or its range; and the names and values of the nodes it looks up.' Hm. So if a postdoc turns on the
Assistant and asks about a module, gene symbols and their logFC go to Anthropic or OpenAI or Google.
With unpublished expression data that's a no. At least it says so. And it's off until you set a
key, so someone would have to do that deliberately."

"Now the parts I actually need for IG." (Reads the pink boxes slowly.) "'Opening graphty -- where
graphty is hosted. Owner decision open: who hosts graphty, and where.' And 'Usage statistics and
crash reports: Owner decision open'. And 'Running your own copy inside your network: owner decision
open'. And 'Questions this page does not answer: Contact' -- owner decision open, who answers."

"So the two questions our IG form actually asks -- where is it hosted, which country, and what
telemetry does it collect -- are the two that are blank. I understand this is a draft. But if this
were the real page I would stop here. 'Where is the server' and 'is there analytics' are the whole
form. Everything else on this page is lovely and she will still send it back."

"'Check it yourself. Open your browser's developer tools, choose the Network tab.' That I like --
I'd actually do that, and I'd get my postdoc to watch it for a minute while loading a real file.
Though IG won't accept 'we looked at the Network tab' as an assessment. But for me, it's the
honest answer."

"'What this page does not promise' -- clearing site data deletes projects; download a project
file for a copy you control. Fine, that's the Cytoscape session-file problem the other way round,
and at least it's stated."

**Moderator: so, is it OK to use?**
"For published data, public STRING networks, teaching -- yes, today, based on this page. For our
partner's unpublished data -- not until the hosting line and the telemetry line are filled in, and
ideally the self-hosting line says yes. If it could run from a copy on our own server, IG would
sign it in a week. I would load a public STRING network now and watch the Network tab."

## Part 2 -- mid-session

(A graph is open. The prototype shows the Les Miserables sample; she has also looked at the protein
sample.)

**Moderator: did anything just leave your machine?**

"Where would it tell me... Top left, under the project name, there's a little lock and 'This
browser. Nothing sent.' OK, that's the answer, and it's where my eye goes first anyway, next to the
file name. Good."

"But is that a live reading or a slogan? It says the same thing it said on the front page. If it
changed when something went out, then it's useful. If it's always there, it's decoration."
(Moderator shows the Assistant-on state.) "Ah, it changes: 'Assistant on: sends names and
statistics.' OK, so it does speak up. Then I believe the resting line a bit more. 'Names and
statistics' is vague though -- names of what, my genes? The data page said column values too. I'd
want the same words as the page: 'sends node names, column values'."

"And down the left rail: 'Assistant -- Off. Nothing is sent.' in tiny type squeezed under where an
icon would be. I had to zoom to read that. It's saying the same thing twice. I don't mind, I'd never
click it anyway."

**The file chip.** (Clicks "miserables.json".) "'This browser. Nothing sent. Projects are kept in
this browser. Where your data goes...' Opened from this computer, read Sep 28, 10:42. Replace
data. Fine. Same answer in a second place. I'd have liked the file size or row count here, but
that's not what I'm checking today."

**The protein sample.** "When I switched to 'Human protein interactions', I don't see the lock line
under the title. There's the file chip, 'ppi-core-300.g...', 'Full graph', but no 'This browser.
Nothing sent.' Did it go away because this dataset is different? Did something get sent? That's
exactly the kind of inconsistency that makes me stop trusting the line. If it's there for Les
Miserables it must be there for my proteins."

**Export.** "Top right, 'Export files...'. The page said exports go through the browser's save
dialog and nothing else. OK. Not testing export today."

## After the task

**Single Ease Question (1 very hard -- 7 very easy): 5.**
"Finding the answer was easy -- it's under the title, it's under the project name, it's in the file
popover, and there's a page to forward. I take two points off because the page's two most important
lines -- where it's hosted and what analytics it collects -- are blank, and because the lock line
disappeared on the protein network and I couldn't tell why."

**Would you use this instead of your current tool?**
"For privacy, this is already better than Cytoscape's web tools and far better than pasting genes
into a random web viewer -- it tells me what goes where, with a date and a version, which nobody
does. Cytoscape desktop is local by nature, so this has to be at least as clear as 'it's an app on
my laptop', and with this page it nearly is. I'd use it for public networks now. For the partner's
data, I need the hosting country, the telemetry answer, and ideally a self-hosted copy. And I still
haven't seen whether I can drive it from R, which is the other half of whether it replaces
anything."

## Problems observed

1. The data page leaves hosting location, telemetry, self-hosting and the contact address undecided.
   These are the exact items an institutional data-governance review asks for; without them the
   page cannot be forwarded as an answer. (Severity 3)
2. The "This browser. Nothing sent." line under the project name is absent in the protein sample's
   render, while it shows for Les Miserables. A trust indicator that appears on one dataset and not
   another reads as "something changed". (Severity 3)
3. It is not stated on screen whether the resting line is a live status or fixed text; the
   participant believed it only after seeing it change for the Assistant. (Severity 2)
4. The Assistant-on line "sends names and statistics" is vaguer than the data page ("column names,
   up to 10 values, node names and values"); for gene data, "names" means gene symbols with logFC.
   (Severity 2)
5. The rail's "Assistant -- Off. Nothing is sent." is cramped tiny text, hard to read, and repeats
   the location line. (Severity 1)

## What worked

- The file and project lines under "Open a graph", before any load.
- The forwardable page with version, date, Copy link and Save as PDF; the three-line "In short".
- The per-feature table of what is sent, to whom and when -- specific enough to decide on.
- "Check it yourself" in the Network tab.
- The same answer in the file popover once a graph is open.
