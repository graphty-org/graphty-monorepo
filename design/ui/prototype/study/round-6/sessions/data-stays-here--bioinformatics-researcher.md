# Session: may I use this on my data, and what do I tell IT -- Dr. Chen, computational biologist

Participant: Dr. Chen, group leader in a translational research institute with a pharma partner. Her
networks are STRING expansions of differential-expression gene lists; the seed lists and the candidate
target short lists come under the partner agreement.

Task, as read by the moderator: "Your organization has strict rules about where data may go. Decide
whether you may use this tool on your data, and tell me what you would say to IT."

Screens seen, in order (study view, 1440 x 900):

- `shots/tasks/data-stays-here/01-start-screen.png`
- `shots/tasks/data-stays-here/02-frame-at-rest.png`
- `shots/tasks/data-stays-here/03-data-location.png` and the whole page, `shots/record/r6-chen-dsh-data-location-full.png`
- `shots/record/r6-chen-dsh-data-panel-s7.png` (Data panel scrolled to "Sent and saved from this project")

## Think-aloud

**Start screen.**

"Right. Before I drag anything in, the rule at our place is simple: partner data does not go to a
third-party server without a data transfer assessment, and the seed list and the ranked targets are
partner data. So the only question is where the bytes go.

First line under 'Open a graph': 'Files stay on this computer. graphty reads them in this browser and
uploads nothing.' Good, that's the claim. Every web tool says some version of that, so it's worth nothing
until I can see how they back it. There's a link, 'Where your data goes'. I'll go there in a minute.

'Projects are kept in this browser.' Kept in the browser meaning browser storage. On a managed laptop
that gets re-imaged. Noted.

'Connect to data source...' with a little (i). That's the one that obviously sends something. I'm not
going to use it, I don't have a database, I have TSVs out of R. If I hover the (i) I assume it tells me
what goes out. Fine."

**The project at rest.**

"This is the protein sample, so roughly my world. Under the project name: 'Nothing has been sent from this
project', underlined, so it's a link. And on the left rail under the Assistant icon: 'Assistant Off.
Nothing is sent.' Those two lines are exactly what I want to screenshot for IT. They're on the screen
without me going looking. That's better than any tool I use -- Cytoscape doesn't tell me whether
stringApp just phoned STRING, I have to know it did.

I don't see a version number anywhere on this screen. I'll come back to that."

**Where your data goes (the page).**

"OK, this is written for IT, it says so: 'written so you can forward it to whoever approves software'.
Copy link, Print or save as PDF. Good, PDF is what goes in the ticket.

'Describes graphty 2.0. Updated September 28, 2026.'

In short -- files are read by the browser and not uploaded, no account, no server that receives data.
Data leaves only through Connect to data source and the Assistant, both off until you turn them on.
Projects stay in this browser. No passwords in the send log or project files. Clear. That's four
sentences I could paste.

The 'what stays' table. Files you open, read into memory, not copied anywhere. Projects in browser
storage, not synced. Exports go through the save dialog, graphty keeps no copy. Assistant key kept in
the browser, sent only to its provider. Data-source password in memory only. Fine. Nothing in that table
surprises me.

'What leaves this browser, and only when you ask.' This is the table IT actually wants. Feature, what is
sent, to whom, when. That's the right shape.

The Assistant row: 'Your question; the graph's counts; each column's name with up to 10 of its values or
its range; and the names and values of the nodes it looks up to answer you.' So if I asked it about my
module, the gene symbols of my candidate targets go to Anthropic or OpenAI or Google. That's the sentence
that matters, and they wrote it plainly instead of hiding it. I respect that. For me it means: the
Assistant is a no for partner projects, full stop. It's off by default, I would simply never set a key.

'The Assistant, with a model that runs in the browser': nothing from your data, 'the model is downloaded
once from its publisher'. Which publisher? Which address? IT can't put 'its publisher' on an allow-list.
I'd have to go and find out.

'Opening graphty': nothing from your files, the browser asks 'where graphty is hosted' for its own code.
Where is it hosted? That's the first question on our form: service provider, country of processing.
'Where graphty is hosted' is a tautology, not an answer.

The quote box: 'The app says when something leaves' -- the line under the project name changes to 'Sent to
... 1 query' and so on, it opens Data > Sent and saved, and there's 'Export log'. Good, that's the audit
trail.

'What graphty does not send': no account; no file contents except via the features above; no fonts or
code from other sites. Then: 'Usage statistics and crash reports:' -- and nothing. The line ends on a
colon. Is that a rendering bug? Did something fail to load? That's the exact line IT reads first. An empty
answer there is worse than 'yes, we collect X'. I genuinely don't know if the page is broken or if they
don't want to say.

'Check it yourself. Open your browser's developer tools, choose the Network tab...' That I like. That's a
test, not a promise. I can do that on a Friday with the sample and send IT the screenshot of the network
tab showing only graphty's own address. That's the most convincing thing on the page.

'What this page does not promise.' Doesn't cover the provider's handling. Doesn't protect against loss --
clearing site data deletes projects, 'Download project file' makes a copy. Doesn't protect against other
people on the same login or extensions. Doesn't follow exports. 'A description of graphty 2.0, not a
certification or a contract.' That's honest and IT will appreciate that someone wrote it. It also means IT
will ask 'then who signs something?'.

'For organizations.' 'Running your own copy of graphty, inside your network:' -- blank. 'Turning the
Assistant off for everyone in an organization:' -- blank. 'Questions this page does not answer: Contact'.
Contact who? It's a link, I'd click it; it's not an address I can put in a ticket.

So three of the lines IT cares most about -- telemetry, self-hosting, central off switch -- end in a colon
and nothing after it. Plus the host. The page looks like someone deleted the answers."

**Data panel, Sent and saved.**

"Clicking the 'Nothing has been sent' line brings me to the Data panel, 'Sent and saved from this project'.
Gray box: 'Sent: nothing. The Assistant is off and no data source is connected.' Then:

- Who hosts graphty, and where: Not decided yet
- Usage statistics and crash reports: Not decided yet
- Assistant off for a whole organization: Not decided yet

Oh. So the blanks on the page aren't a bug, they're undecided. Here at least it says so. 'Not decided yet'
is honest but -- if I read that in a tool I'm evaluating, I conclude the tool is not finished, and I
certainly can't give IT a 'not decided' for the hosting country. Also odd that the app says it more clearly
than the page that's meant for IT. The page should say 'Not decided yet' too, rather than nothing.

Below that, 'Saved to this computer' lists the exports: an SVG 'Figure and methods text', a CSV 'Table and
methods text', a recipe with 'definitions, no data', and 'Project file, with its data'. Good -- 'with its
data' is what I'd have wanted spelled out, because people email project files around as if they were
settings. A project file is the data; it gets handled like the source TSV.

In this state nothing was sent, so no Export log button. I saw it in the little example strip at the bottom
of the page, next to a list of sends with times and an eye icon. That's fine; I'd expect it only when there
is something to export.

Version: the page says 'graphty 2.0'. I still haven't seen anything in the app that tells me which version
I'm running. It's a website; it can change under me tomorrow. IT approves a version. I'd want the version
on the Sent and saved section or in Help, next to 'Where your data goes'."

## My decision, and what I'd say to IT

"Decision: on the public copy, as things stand, not for partner data. Yes for public data -- STRING
networks built from published gene sets, the samples, teaching. And I'd do the network-tab check myself
before I even said that.

What I'd write to IT:

> I'd like to use graphty (web app, graphty 2.0) for drawing interaction networks. Their data statement is
> attached (PDF of 'Where your data goes'). Summary: files are read inside the browser and not uploaded;
> no account; data leaves only through two features, 'Connect to data source' and an AI 'Assistant', both
> off until a user turns them on. I will not use either. The app shows 'Nothing has been sent from this
> project' and keeps a log of anything sent. I checked the browser's network traffic and saw requests
> only to the app's own address.
>
> Open questions they have not answered yet: who hosts the app and in which country; whether it collects
> usage statistics or crash reports; whether we can host our own copy; whether the Assistant can be
> turned off centrally. Until those are answered I will use it only on public data, not on partner
> projects. Projects live in browser storage; I will keep project files on the project share and treat
> them as containing the data.

That's an email I can send. It's an email IT answers with 'come back when they've answered the four
questions', and they'd be right."

## Single Ease Question

"4. Getting to the answer was easy -- one link from the start screen, and the page is laid out the way
our form is laid out, 'what, to whom, when'. I could draft the email in five minutes, which I cannot do for
most tools. But I lose points because the lines IT reads first end in a colon with nothing after them. I
thought the page was broken until the Data panel told me 'Not decided yet'. A blank is worse than an
honest 'not decided', and 'not decided' is still not an answer I can take to IT. The answer to 'may I use
it' is 'not on the data I actually care about', and I didn't get there by misunderstanding anything; I got
there because the page doesn't have the answers."

## Instead of my current tool?

"No. Next to it, for public networks and for teaching, maybe. My current tools don't need this
conversation -- Cytoscape and R run locally and were approved years ago. For partner data this needs
a self-hosted copy, or at least a named host and a no-telemetry statement, and a way to prove to IT the
Assistant can't be switched on. And nothing I saw today touches the other thing that keeps me in R: I
can't script it and I can't pull the node table back into a data frame. If self-hosting says yes and
there's an R or Python route, I'd take it seriously for figures, because 'Sent and saved' plus the methods
text on each export is better record-keeping than I have now."

## Moments the designers should look at (in her words, paraphrased by the note-taker)

1. Four answers IT reads first -- host and country, usage statistics and crash reports, self-hosting, a
   central off switch for the Assistant -- are still missing, and the page meant for IT now shows them as
   lines ending in a colon with nothing after. She read it as a broken page until the Data panel said "Not
   decided yet". If an answer is missing, the page should say so in the same words the app uses, not leave
   a blank. The missing answers decide "no" for regulated data by themselves. (High.)
2. "Where graphty is hosted" in the "To whom" column answers nothing; the page for IT should name the host
   and the country, or say it is not decided. (High, part of the same gap.)
3. The in-browser model is "downloaded once from its publisher": name the publisher's address so IT can
   allow-list or block it. (Medium.)
4. The page describes "graphty 2.0", but nothing she saw in the app shows which version is running. A web
   app can change between visits, and IT approves a version. Put the version next to "Where your data goes"
   in Sent and saved, or in Help. (Medium.)
5. "Contact" is a link with no address; a reviewer needs an address to put in a ticket. (Low to medium.)
6. The Assistant row names exactly what goes to the provider, including node names and values; she found
   that sentence decisive and trustworthy. For target-discovery data it is the reason she will never
   set a key. (Positive; also why a central off switch matters, see 1.)
7. "Check it yourself" with the Network tab is the most convincing line; it gives her a test she can run
   and screenshot for IT. (Positive.)
8. "Nothing has been sent from this project" under the name, and "Assistant Off. Nothing is sent." on the
   rail, are visible without looking and are what she would screenshot. (Positive.)
9. "Project file, with its data" in Saved to this computer settles a question she had about project files;
   the page's "What this page does not promise" section should say the same thing next to "Download
   project file". (Low; positive in the panel.)
