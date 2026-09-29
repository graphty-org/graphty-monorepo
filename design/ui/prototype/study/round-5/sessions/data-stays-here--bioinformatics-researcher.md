# Session: may I put my data in this, and what do I tell IT -- Dr. Chen, computational biologist

Participant: Dr. Chen, group leader in a translational research institute with a pharma partner. Networks of
2,000-15,000 proteins built from unpublished differential expression results. Current tools: R (igraph,
Bioconductor), Cytoscape 3.10 driven through RCy3.

Task as given by the moderator: "Your organization has strict rules about where data may go. Decide whether
you may use this tool on your data, and tell me what you would say to IT."

Screens used: the start screen (first run), the "Where your data goes" page, the Data panel (after the first
load, and the "Sent and saved" state), and the frame at rest with the protein sample open.

## Think-aloud

### 1. Start screen

"OK. Before I open anything: our rule is that nothing from the partner project goes to a third-party server
without a data agreement. The DE results and the candidate list are the sensitive part -- a gene symbol on
its own is not secret, but *which* 40 symbols we are looking at is exactly what the partner pays us for."

"First line under 'Open a graph': 'Files stay on this computer. graphty reads them in this browser and
uploads nothing.' Fine. Everybody says that. Second line: 'Projects are kept in this browser.' Hm. In the
browser, not in a file. I'll come back to that."

"There's a link, 'Where your data goes'. I'll click that before I click Open. I would not drop my file in
first -- that's the whole point."

"Samples, Karate club, Les Miserables, Protein interactions -- 300 proteins. I ignore these for now. 'Connect
to data source...' -- with an info icon. That's the one that worries me, so I'll read what the page says
about it."

### 2. "Where your data goes" page

"It opened in its own tab, with its own address. Good -- I can paste that into an email to IT without
screenshotting. 'Print or save as PDF' as well. Our IT wants a PDF attached to the software request form, so
that's actually the thing they'd ask for."

"'Describes graphty 2.0. Updated September 28, 2026.' Good, it's versioned. But this is a website. If they
change the code tomorrow, the version I'm running is not the version IT approved. Does the page tell me
which version I'm on inside the app? I don't see it. IT will ask."

"In short, four bullets. 'Files you open are read by this browser and are not uploaded. graphty has no
account and no server that receives your data.' That's the sentence IT wants. 'Data leaves the browser only
through two features, both off until you turn them on: Connect to data source and the Assistant.' Clear.
Two things to switch off, and they're already off. I can live with that."

"'No password or key ever appears in the list of what was sent...' OK, that's more for IT than for me."

"What stays in this browser. Files you open: read into memory, not copied. Projects: kept in 'this
browser's storage for graphty, on this computer'. 'They stay until you delete the project or clear this
site's data.' So my analysis lives in Chrome's site storage. Our laptops are managed; IT wipes browser
profiles when they re-image. And further down: 'It does not keep projects safe from loss.' At least it's
honest. For me that means the project file is the real save, not the browser. I'd want the app to push me to
download the project file, because I will forget."

"Also -- 'It does not protect data from ... browser extensions, or backups of the computer.' That's true of
everything in a browser. IT will nod at that. Fine."

"Exports: written by the save dialog to a folder I choose. Good. That's the same as R writing a TSV."

"Data-source password -- there's a pink box: 'Owner decision open: where a data-source password is kept.'
I'm looking at a prototype, fine, but I note it. I wouldn't connect it to anything anyway."

"What leaves this browser. The table has What / To whom / When. This is the part I'd actually forward."

"Connect to data source: the query and the sign-in go to 'the source at the address you enter, run by
whoever runs it -- not by graphty.' OK. If I pointed it at STRING, my gene list goes to STRING. That's the
same as the stringApp in Cytoscape, and we already accept that for published gene lists. For the partner
list I'd download from STRING myself and open the file. So I just don't use this. Fine."

"A recipe or project file that names a data source: nothing sent until I confirm, and it shows me the
address first. Good -- if a student sends me a project file, it can't quietly call out somewhere."

"The Assistant. Let me read this slowly. 'Your question; the graph's counts; each column's name with up to
10 of its values or its range; and the names and values of the nodes it looks up to answer you.' To
Anthropic, OpenAI or Google, under my own key."

"So: up to 10 values of each column. My symbol column. My logFC column. And 'the names and values of the
nodes it looks up' -- that's the candidate genes with their fold changes, going to OpenAI. That is exactly
the thing I'm not allowed to send. It's off, it needs my key, I wouldn't have a key for it anyway. But IT
will not accept 'Dr. Chen promises not to turn it on.' They'll ask whether *they* can turn it off."

"For organizations, bottom of the page: 'Turning the Assistant off for everyone in an organization' --
pink box, owner decision open. 'Until then ... the Assistant is off until each person sets a provider and a
key, and nothing turns it on by itself.' That's true and it's the best they can say today, but for our IT
that's a 'no' on the checkbox 'can the feature be disabled centrally'."

"'The Assistant, with a model that runs in the browser': nothing from my data, model downloaded once from
its publisher. Which publisher? Which address? IT has a firewall allow-list. 'Its publisher' won't go on
the form."

"'Opening graphty': 'Where graphty is hosted.' Pink box -- 'Owner decision open: who hosts graphty, and
where. The page names the host and its country here.' That's the first question on our form. Literally
field one: vendor, hosting location, jurisdiction. And it's blank."

"What graphty does not send. No account, no fonts or code from other sites. 'Usage statistics and crash
reports' -- pink again, open. Second question on the form. Also blank."

"'Check it yourself. Open your browser's developer tools, choose the Network tab ...' I like that. That's the
first thing I'd do anyway, and our security guy would absolutely do it. It's the only line on the page that
doesn't ask me to trust anybody."

"'Running your own copy of graphty, inside your network' -- open. If they said yes to this, the whole
conversation with IT is over: host it on the institute server, block outbound, done. That's what I'd ask
for."

"'Questions this page does not answer: Contact' -- also open. IT will want a named contact. Otherwise it's
'some website a postdoc found'."

### 3. Back in the app: the Data panel and the frame at rest

"Protein sample open. Under the project name: 'Nothing has been sent from this project', with a lock. On the
left rail: 'Assistant Off. Nothing is sent.' OK, it's saying it twice, which is fine -- I can take a
screenshot of that for IT. It's the sort of status line I'd want permanently visible."

"Data panel, the 'Sent and saved from this project' state: 'Sent: nothing. The Assistant is off and no data
source is connected.' Then a link back to 'Where your data goes'. Then 'Saved to this computer': an SVG
figure 'with methods text', a CSV table, a recipe, and a project file 'with its data'. So it keeps a list
of what I exported and what went out. Actually that's more than Cytoscape does. Cytoscape has no idea what
it sent to STRING."

"The page mentions 'Export log' for the sent list -- a file you attach to a review. I don't see the button
in this render of the panel, only 'Export...' at the top, which I assume is figures and tables. I'd have
to hunt for it. If IT asks for evidence of what went out, I want that log in one click."

"'Project file, with its data' -- so a project file carries the data. Good to know: that file is as
sensitive as the TSV. It goes on the project share, not in an email."

## Decision

"Can I use it on my data? Two answers."

"Published or public networks -- STRING background, a published DE set, teaching: yes, today. Nothing
leaves unless I turn something on, and the page says so plainly."

"The partner project: not yet, officially. Not because of anything the page says -- the page says the right
things. Because the three things IT asks first are exactly the three that are blank: who hosts it and in
which country, whether it phones home with usage or crash data, and whether the Assistant can be switched
off by them rather than by me. Plus: can we run our own copy. If self-hosting were a yes, I'd skip the other
three and ask for that."

"Would I use it anyway on the partner data, off the record? I'd open the network tab, load a file, watch
that nothing goes anywhere but graphty's own address, and ... no. Our contract says 'approved software'. I
don't do that with partner data. I'd use it on the public data and wait."

## What I would say to IT

"Roughly this, as an email with the PDF of that page attached:"

> I'd like to use graphty for network visualization. It runs in the browser; the attached page (their own
> 'Where your data goes', version 2.0, Sept 28 2026) says files are read locally and not uploaded, there is
> no account, and data can only leave through two features -- a data-source connection and an AI
> assistant -- both off by default. I will use neither; I'll only open local files.
>
> The page does not yet say: (1) who hosts the app and in which country, (2) whether it collects usage or
> crash data, (3) whether the AI assistant can be disabled centrally, (4) whether we can host our own copy,
> (5) who to contact. Can you check (1) and (2) with a network capture -- the page itself tells you how --
> and tell me if (3) or (4) is a requirement for data under the partner agreement? If we can host it
> internally, I'd prefer that.
>
> Note: projects are saved in the browser's site storage, so re-imaging deletes them; I'll keep project
> files on the project share. Project files contain the data.

## Single Ease Question

"5. Finding the answer was easy -- one link from the start screen, one page, and the page is written for
exactly the person I have to convince. It loses two points because I reached the end still unable to fill in
the first two fields on our form. That's not a usability problem, it's a missing answer. But from my chair
it feels the same."

## Instead of my current tool?

"No, not instead. Alongside, maybe. Cytoscape and R don't need an IT conversation because they run on my
machine and our IT approved them years ago. This would need one, and right now I can't win it for partner
data. And the privacy page doesn't change the thing that actually keeps me in R: I haven't seen a way to
drive this from a script or get the node table back into a data frame. If both of those get answered --
self-hosting yes, and an R or Python path -- then it's a serious candidate for the figures, because the
'Sent and saved' list and the methods text on the export are better than what I have."

## Moments the designers should look at (in her words, paraphrased by the note-taker)

1. The first things IT asks -- host, country, usage/crash data, central off switch, self-hosting, a
   contact -- are all the open items on the page. The page is well built around a hole. (High: this alone
   decides "no" for regulated data.)
2. The Assistant row says node names and values go to the provider. For target discovery, that sentence is
   the whole risk. Off-by-default and per-person keys do not satisfy an institution that needs to prove it
   is off. (High.)
3. A web app loads new code on each visit; the page describes "graphty 2.0" but nothing in the app says which
   version is running, so IT cannot tell whether what they approved is what I am using. (Medium.)
4. "Its publisher" for the in-browser model is not something that can go on a firewall allow-list; name the
   address. (Medium.)
5. Projects live in browser site storage and vanish on re-image; the page says so honestly, but the app
   should make downloading the project file the obvious save. The page also should say plainly that a project
   file contains the data, so people treat it like the source file. (Medium.)
6. "Export log" for the sent list is promised on the page but not visible in the Data panel as drawn; I
   could not find the one button I would need for an audit. (Low to medium.)
7. The "Check it yourself" network-tab instruction is the most convincing line on the page -- keep it.
   (Positive.)
8. "Nothing has been sent from this project" under the name and "Assistant Off. Nothing is sent." on the rail
   are the screenshots I would send to IT. (Positive.)
