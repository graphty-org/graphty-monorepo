# Session: "Is this OK to use with our data?" -- Dr. Chen, computational biologist

Participant: Dr. Chen, group leader in a translational research institute with a pharma partner
(persona: study/personas/bioinformatics-researcher.md). Laptop on a 27-inch monitor, Chrome.

Task as given by the moderator, and nothing more:
"Before you load anything: your organisation is strict about where data goes. Is this OK to use?
Later, mid-session: did anything just leave your machine?"

Screens used: the start screen (first run), the "Where your data goes" page it links to, and the
open project at rest (the Human protein interactions sample), with its file popover and with the
Assistant switched on.

Renders the participant looked at:
- shots/screens__start-screen.png (start screen, first run)
- shots/study/round-3/sessions/img/dsh-start.png (the same screen as the study view draws it)
- shots/study/round-3/sessions/img/dsh-data-location.png (the "Where your data goes" page, study view)
- shots/study/round-3/sessions/img/dsh-ppi-s5.png (project open, file popover)
- shots/study/round-3/sessions/img/dsh-ppi-s8.png (project open, Assistant on)

---

## Part 1: before loading anything

**[Start screen.]**

"Right. Context first: we're a partner site, so anything touching the pharma side's compound data
or our unpublished DE results goes through their data governance. I don't personally care whether
your app is pretty. I care whether I'm going to get an email from compliance.

So -- 'Open a graph'. Under it, a padlock: 'Files stay on this computer. graphty reads them in
this browser and uploads nothing.' OK. That's the sentence I was looking for, and it's the first
thing on the page, which I appreciate. Every web viewer I've tried either says nothing or has a
cookie banner the size of the screen.

But it's a website. 'Reads them in this browser' -- fine, JavaScript can do that. It still came
from a server somewhere. Who runs that server? It doesn't say. And 'uploads nothing' -- is that
true of everything, or just the file? What about Connect to data source, right there at the
bottom? That obviously sends something."

*Hovers the (i) next to "Connect to data source...".* (In the prototype: "Sends only your query,
to the source you name.")

"OK, that's honest. If I pointed that at STRING, my gene list goes to string-db.org. Which --
for a published gene list, fine; for this month's knockdown hits, I'd want to think about it. At
least it says so.

'Projects are kept in this browser.' Hm. Which browser? Our IT pushes a managed Chrome profile
that gets wiped on re-image. I'll come back to that.

There's a link, 'Where your data goes'. Clicking it, because that's the thing I'd have to send
to our IT person."

**[The "Where your data goes" page.]**

"New tab. Good -- it has its own address. 'Describes graphty 2.0. Updated September 28, 2026.'
'Copy link', 'Print or save as PDF'. That is actually what I need: something with a version and
a date I can attach to the ticket. Our data-governance form literally asks 'provide vendor
documentation of data flows'. Most academic tools I have to write that myself.

The box at the top: files not uploaded, 'no account and no server that receives your data'. Data
leaves only through two things, both off until you turn them on: data sources, and 'the
Assistant'. Projects stay in this browser.

The first table -- what stays. Files read into memory. Projects in browser storage, not synced,
'stay until you delete the project or clear this site's data'. Exports go through the save
dialog. Fine. That's the Cytoscape model, basically, except Cytoscape's session file is on my
disk where our backup can see it.

Second table, what leaves. Data source: the query, to the address I type, 'run by whoever runs
it -- not by graphty'. Good, that's the right distinction. A file that names a data source sends
nothing until I confirm. Good -- I'd hate to open a postdoc's recipe and have it phone home.

The Assistant."

*Reads the row twice.*

"'Your question; the graph's counts; each column's name with up to 10 of its values or its range;
and the names and values of the nodes it looks up.' So if my node table has logFC and adj.P.Val,
ten of those values and the range go to... 'Anthropic, OpenAI or Google, under your own key'. OK.
That's a real answer. I wouldn't turn it on with unpublished data, and our partner would say no
outright, but at least I know exactly what it does. It's off by default. Fine.

Next row: 'Opening graphty -- Nothing from your files ... To whom: Where graphty is hosted.'
Where IS it hosted? That cell just says 'where graphty is hosted'. That's circular. The first
question on our form is 'what is the hosting jurisdiction'. EU partner, GDPR, the whole thing.

Then a list. 'No account.' 'No file contents ... except through the features above.' 'No fonts,
icons or code from other sites while you work.' -- nice, somebody thought about that; half the
web tools load Google Fonts and our proxy logs flag it.

'Usage statistics and crash reports:' -- and then nothing. Blank. Is that 'none'? Is it 'yes, we
collect everything'? And the next line straight after it is 'It does not cover what a data
source or an Assistant provider does with data...', so for a second I read that as part of the
telemetry answer. It isn't -- it's a list of what the page doesn't promise, I think, but there's
no heading telling me the list changed.

Further down: 'Running your own copy of graphty, inside your network:' -- blank again. 'Turning
the Assistant off for everyone in an organization:' -- blank. 'Questions this page does not
answer: Contact' -- a link, no name, no address.

So. Honestly: the three questions IT will ask first are where is it hosted, does it collect
telemetry, and can we run it ourselves. Those are exactly the three that are empty. Everything
else on this page is better than anything I've seen from an academic tool. But I can't forward
a page with three blanks on it; they'll bounce it back to me and I'll lose a week."

**Moderator: "So -- is it OK to use?"**

"For published data -- the STRING sample, a public GEO set -- yes, today, I'd use it. The file
line and the tables convince me the file itself doesn't go anywhere, and I'd check that myself
with the Network tab anyway. For the knockdown screen or anything from the partner: not until
someone fills in hosting, telemetry and self-hosting. If there were a 'download this and run it
from a folder on my laptop' option, I'd stop worrying about the hosting question entirely."

---

## Part 2: mid-session -- did anything just leave?

**[Project open: Human protein interactions, 300 proteins, modules coloured. File popover open.]**

"I've loaded the protein sample and I've been poking at it. You ask what's left my machine.

Top left, under the project name: padlock, 'This browser. Nothing sent.' Same padlock as the
start screen. OK, that's a direct answer. It's small, but it's in the place I'd look -- next to
the name of the thing.

The left rail also says 'Assistant -- Off. Nothing is sent.' in tiny grey text under a word with
no icon. Took me a second to realise that was a button and not a label. Two places saying
'nothing sent' is slightly redundant, but I'd rather that than none.

Clicked the file chip -- 'ppi-core-300.g...' (truncated, annoying; I name my files by date and
the date is the bit that gets cut). The popover: 'This browser. Nothing sent. Projects are kept
in this browser. Where your data goes...' Opened from this computer, read Sep 28, 10:42. Good --
I can get back to the forwardable page from inside the project, I don't have to start over.

What I'd actually want, though, is to click 'Nothing sent' itself and see a log: 'since you
opened this: 0 requests to anywhere but graphty'. Right now 'Nothing sent' is a sentence. It's a
sentence I believe, because it's specific, but I can't show it to anyone."

**[Moderator switches the Assistant on (provider set).]**

"Now the line under the name has changed: upload arrow, 'Sends node names and statistics to
api.anthropic.com when you ask'. And the rail got a sparkle icon.

OK, so has anything left? I read that as: not yet, it will when I ask. 'When you ask' is doing the
work there. I think nothing has gone. I'm fairly, not completely, sure -- it's future tense, and
nobody has told me what it will look like after something goes. I'd want the past tense to be
unmistakable: 'Sent at 14:02' with a count.

But here's what bothers me. This line says 'node names and statistics'. The page I just read said
'each column's name with up to 10 of its values or its range'. Those are not the same thing. My
columns are logFC and adjusted p. 'Statistics' to me means 'the graph's counts'. Ten of my logFC
values are my data, not 'statistics'. If the line in the app is the short version, it's the
short version that leaves out the part compliance cares about. I'd want it to say 'node names,
column values and counts' or similar -- or just 'your data', frankly, if that's what it is.

And 'node names' for me are gene symbols from an unpublished screen. The list of which genes are
in the network IS the result. So for me 'node names' is not the harmless part."

**Moderator: "So, did anything just leave?"**

"Before the Assistant: no, and the app said so in two places, and I'd believe it. After turning
it on: I think no, but only because of the word 'when'. And if I asked it one question I'd want
to see exactly what went, gene by gene -- and I'd want to be able to turn it off again from the
same line, not go hunting in a panel."

---

## Single Ease Question

**5 out of 7.** Finding the answer was easy -- it's the first line on the start screen and it's
under the project name the whole time. It's not a 6 or 7 because the page I'd actually send to IT
is blank on hosting, telemetry and self-hosting, and the in-app line undersells what the
Assistant sends.

## Would I use it instead of my current tool?

"For looking at a network and making a figure from published data, it's more honest about data
than Cytoscape's web tools or any of the web viewers I've tried -- I can give our IT a dated,
versioned page instead of writing a data-flow memo myself. That alone would get it through the
door faster than most things. For unpublished or partner data, not yet: fill in where it's hosted
and whether it collects anything, and ideally let me run it locally, and then yes, as the viewer.
It still isn't replacing R for the analysis until I know I can get the node table out -- but
that's a different question."

---

## Problems observed

1. **Hosting, telemetry and self-hosting are blank on the forwardable page.** "To whom: Where
   graphty is hosted" names no host; "Usage statistics and crash reports:" and "Running your own
   copy of graphty, inside your network:" end in nothing; "Contact" has no name or address. These
   are the first three questions an institutional data-governance review asks, so the page cannot
   be forwarded as it stands. Severity 3.
2. **The in-app Assistant line understates what is sent.** The line reads "Sends node names and
   statistics to api.anthropic.com when you ask"; the data page says column names with up to 10
   values or their range, plus looked-up node values. A researcher reads "statistics" as graph
   counts, not expression values. Severity 3.
3. **"When you ask" is the only cue that nothing has left yet.** The resting and Assistant-on
   lines are clear about the future; the participant never saw the after-send form in the app and
   was only "fairly sure" nothing had gone. Severity 2.
4. **The "what this page does not promise" list runs straight on from the telemetry line** with
   no visible heading, so its first item read as part of the telemetry answer. Severity 2.
5. **"This browser. Nothing sent." is not clickable.** She expected it to open a log of requests
   since the project opened, something she could show to someone. Severity 1.
6. **"Projects are kept in this browser" worries her on a managed, re-imaged profile;** the page
   covers the loss case, but the start screen does not mention Download project file. Severity 1.
7. **The Assistant rail button while off has no icon** and reads as a label, not a button.
   Severity 1.
8. **The file chip truncates the name** at the end, where dated file names differ. Severity 1.

## Moderator note (not the participant's words)

The study view the kit draws (`?study`, `shoot.mjs --study`) hides product text on these two
pages, so a participant shown those renders sees less than the product would show:

- On the start screen it removes the "Open a graph" title and both lines under it -- the padlock
  line about files and the line about projects -- because they are a plain `h1` and `p` outside
  any `.k-app` frame, and the study view hides every such heading and paragraph as narration.
  This is the very line this task tests. Compare shots/screens__start-screen.png with
  shots/study/round-3/sessions/img/dsh-start.png.
- On "Where your data goes" it removes the page title, the intro, the "In short" and section
  headings, the "Check it yourself" paragraph and the paragraph that says the app announces each
  send. Removing the headings is what makes problem 4 above happen, and the pink owner-decision
  notes vanish entirely, leaving the dangling colons in problem 1.

This session used the full render of the start screen for the padlock line and the study render
for the data page, so the findings on the data page reflect what a participant would really see
in study mode. The rule in kit/kit.js that hides `h1`/`p` outside a product frame needs an
exception for pages whose whole body is product (the start screen, the data page).
