# Session: did anything leave? -- Marcus, criminal intelligence analyst

Participant: Marcus, criminal intelligence analyst at a state fusion center (persona:
study/personas/intelligence-analyst.md). Screens: the frame at rest (version A, "This browser.
Nothing sent." under the project name), the start screen, and the "Where your data goes" page.

Task as given: "Your IT reviewer asks whether this tool sends data anywhere. Answer from the app,
then again after running a data-source query, and forward something they can read."

## Transcript (think-aloud)

**Frame at rest.** "OK, it's got Les Miserables loaded. Not my data, fine. Where does it tell me
where stuff goes... top left, under the name: little padlock, 'This browser. Nothing sent.' Good.
That's the first thing I'd look for and it's the first thing there. Over on the left rail there's
'Assistant -- Off. Nothing is sent.' So there's an AI thing, and it's off. I like that it says
off. I'd still want to know who turns it on -- me, or anybody who sits at this laptop."

"Answer number one for IT: the app says nothing is sent. But that's the app saying it about
itself. The IT guy's going to say 'says who.'"

**The file chip.** "There's a chip that says miserables.json. I click it." (Popover.) "'This
browser. Nothing sent. Projects are kept in this browser. Where your data goes...' Then 'Opened
from this computer, Read Sep 28, 10:42.' Same line again, plus a link. OK, the link is the thing
I'd send. Before I click it -- the start screen, I went back and it has the same promise: 'Files
stay on this computer. graphty reads them in this browser and uploads nothing.' Consistent. That
matters. If three screens said three different things I'd be done."

**The data-source query.** "Now the second half. 'Connect to data source...' on the start
screen, with a little (i). Hover: 'Sends only your query, to the source you name.' Fine, that's
honest. I click Connect to data source..." (Nothing opens in the prototype.) "Nothing. I can't
run the query. So I don't know what the screen looks like after. Does that padlock line change?
Does it turn into something that says 'Sent to: the county RMS' or whatever? I'd expect it to. If
it still says 'Nothing sent' after I just queried a server, that's a lie on the screen and I'd
have to tell IT the tool's own label can't be trusted. I can't tell from here. I'll guess it
changes, because the Assistant one says 'off' like it'd say 'on' -- but that's a guess."

"So from the app, after a query, my answer is: I don't know. I only have the tooltip."

**Where your data goes.** "Clicked the link. New page. 'Where your data goes. graphty draws and
analyzes graphs inside your web browser.' Copy link, Print or save as PDF. Good -- IT wants a
PDF in the ticket, not a link to a website that might change. It's dated and says which version.
That's how a policy document should look."

"'In short': files not uploaded, no account, no server that receives your data. Data leaves only
through two things, both off: Connect to data source and the Assistant. That's the paragraph I'd
paste into the email."

"The table -- 'What leaves this browser, and only when you ask.' Connect to data source: the
query you write and any sign-in; to the source at the address you enter, run by whoever runs it
-- not by graphty; when you connect and each time you refresh. OK. That answers my second
question better than the app did. 'Each time you refresh' -- so if I leave it refreshing, it
keeps going out. Good to know. The Assistant row: 'the names and values of the nodes it looks up
to answer you,' going to Anthropic, OpenAI or Google. That's names of subjects going to a
commercial AI company. That's a hard no for CJI and the page says it straight, which I actually
respect. I need the switch that turns it off for the whole unit though, not per person."

"'Check it yourself. Open your browser's developer tools, Network tab.' Our IT guy will do
exactly that. Good."

"Now the pink boxes. 'Owner decision open: who hosts graphty, and where. The page names the host
and its country here.' 'Usage statistics and crash reports: owner decision open.' 'Running your
own copy inside your network: owner decision open.' 'Turning the Assistant off for everyone:
owner decision open.' 'Who answers a reviewer's questions: owner decision open.'"

"Every question my IT reviewer actually asks is a pink box. Where's it hosted? Does it phone
home with crash reports? Can we run it on our own server? Who do I call? I'm told those are
design notes, fine -- but if I forwarded this today, that's what they'd read, and it'd come back
'insufficient.' And there's no word 'CJIS' anywhere. Our reviewer searches the document for
CJIS first."

"'What this page does not promise' -- clearing site data deletes projects. That's worth
knowing. I'd have lost a case chart to that and blamed the tool."

**Forwarding.** "I'd hit Print or save as PDF and attach it to the ticket, plus Copy link in the
body. That part's easy -- two buttons, top of the page."

## Answers Marcus would give IT

1. From the app: "It says 'This browser. Nothing sent.' on the project and the file, and the
   Assistant says off."
2. After a data-source query: "The page says the query goes to the source we point it at, not
   to them. I couldn't see what the screen itself says after the query."
3. Forwarded: the "Where your data goes" page, as a PDF.

## After the task

**Single Ease Question: 5 of 7.** "Finding the answer and forwarding it -- easy, the link is
right there on the file. Knowing what the screen says after I query something -- couldn't. And
half of what IT asks is still a blank."

**Would he use it instead of his current tool?** "Not instead of i2 -- nothing here is about
that. But for getting it past IT, this is better than anything I've been handed. i2 never gave
me a page like this; I had to write the memo myself. If the pink boxes get filled in with 'runs
on your own server, no telemetry, admin can kill the Assistant,' I'd put the ticket in. If
hosting says some vendor cloud, it's dead, no matter how nice the page is."

## Problems observed

1. The state after a data-source query is not shown: there is no screen where the location line
   reads anything other than "Nothing sent." He could not verify the app would stop saying
   "Nothing sent" once a query had gone out, and said a stale "Nothing sent" would make him
   distrust every label. (Severity 3.)
2. The questions an IT reviewer asks first -- hosting and country, telemetry and crash reports,
   self-hosting, turning the Assistant off for an organization, a contact -- are all open on the
   forwardable page. Forwarded today it would be rejected. (Severity 3; owner decisions, not a
   layout fault.)
3. No mention of CJIS or any criminal justice compliance on the page; a reviewer in his field
   searches for that word first. (Severity 2.)
4. The Assistant is per-person, off until each user sets a key; nothing stops a colleague
   turning it on with case data loaded, and the page says as much. (Severity 2.)
5. "Each time you refresh" is the only hint that a connected source keeps receiving queries; he
   wanted the app itself to show that the connection is live. (Severity 1.)
