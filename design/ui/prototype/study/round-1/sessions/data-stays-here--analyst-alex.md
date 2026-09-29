# Session: does my data stay here? -- Analyst Alex

**Participant:** Alex, operations data analyst at a logistics company. Uses NetworkX and Gephi; company
policy says supplier, customer and depot data does not leave approved systems.

**Task, as the moderator gave it:** "Before you load anything: your organisation is strict about where
data goes. Is this OK to use? Later, mid-session: did anything just leave your machine?"

**Screens used:** the start screen (first run, the "not saving" variant, with recents, while dropping a
file) and the main frame at rest with the Les Miserables sample (at rest, the file popover, the
"Not saved" menu).

## Transcript (think-aloud)

### Part 1 -- before loading anything

**Start screen, first run.**

> OK. "Open a graph." And right under it, little padlock: "Your files stay on this computer. graphty
> reads them in this browser and uploads nothing." Huh. That's -- that's actually the first thing I
> was going to go looking for. I didn't have to scroll to a privacy page. Good.

> But, I mean, it's a sentence. Anyone can write that sentence. Gephi Lite says the same thing on its
> home page. The question my IT people would ask is "how do you know". Is this a website? Is it
> running from somebody's server? If the page came from a server, what's stopping the next version
> from uploading? There's nothing here that says who makes it, or if there's a version I can install
> or run offline, or a link to something I could forward to the security team. The "uploads nothing"
> is the claim. I'd want the receipt.

*Looks at the top-left "graphty" with a chevron.*

> Is there an "About" in here? That's where I'd expect "who is this, what does it cost, where's the
> privacy statement". I'd click it. *(The prototype does not show what this menu holds.)* ...Nothing.
> OK, so I don't know. I don't know who makes it and I don't know if it's free. If it's free, is it
> free for company use? My manager's first question is going to be "what does it cost and who signed
> off on it".

*Looks at the (?) bottom right.*

> Help, probably docs. I'd maybe open it if I was really stuck on this. Not yet.

**"Connect to data source..." row.**

> "Sends only your query, to the source you name." OK so this one does send something. Fair enough,
> that's honest. "Your query" -- I don't really do queries against it, I export CSVs out of SQL. So I
> just won't touch that one. It's nice that it's the one row that says "sends", because it makes me
> believe the other row a bit more.

**Samples.**

> Samples. Karate club, Les Mis -- these are the Gephi tutorial ones, I know these. Bank transfers,
> 3,000 accounts. Fine. I'd open a sample first anyway. I'm not putting the supplier file in until
> I've asked someone. Honestly I'd probably use my sanitised extract, the one with the codes instead
> of names.

**The "not saving projects" variant.**

> "This browser is not saving projects." Hover: "site data is blocked or this is a private window.
> Download project file keeps your work." Hmm. So normally it saves projects... where? In the
> browser? "Recent projects" -- those are saved somewhere. The top line says files stay on this
> computer, but now I'm reading "saving projects", and my brain goes: saving to where? To an
> account? It doesn't say "in this browser" here. A project is my data plus my colours, right? So if
> it's saved "somewhere", my supplier names are in there. I think it means the browser. I'm guessing.

**Dragging a file over the window.**

> Dragged the CSV over, the box goes blue: "Drop to open as a new project -- the columns are checked
> before anything loads." "Checked" by what? Here? Or it's checked on a server? I'd assume here
> because of the padlock line above. It's still sitting right above it, which helps -- the padlock
> line is still on screen while I'm dropping. That's where I'd want it.

**Moderator: so, is this OK to use?**

> For the sample and my sanitised extract, yes, I'd use it today. For the real supplier file, not
> without asking. And to ask, I need something to send: who makes it, is there a privacy or security
> page, does it work with the network off. If I could pull the network cable and it still opened my
> file, that'd be the answer, but nothing here tells me that's a thing I can do. I'd probably just
> try it -- open it, turn wifi off, drop the file. That's the test I'd actually trust.

### Part 2 -- mid-session, with Les Miserables open

**Main frame at rest.**

> OK, it's open. 77 nodes, 254 edges -- that matches what Les Mis should be, good. Colours by
> group, size by degree, legend's there.

**Moderator: did anything just leave your machine?**

> ...I don't know. Let me look. The padlock line is gone. That was on the start screen and now it's
> not anywhere. Top left there's "miserables.json" as a little chip.

*Clicks the file chip.*

> "Opened from: this computer. Read: Sep 28, 10:42. Replace data..." OK, so it tells me where it
> CAME from. That's not what I asked. I asked where it's GOING. "Opened from this computer" -- fine,
> I know that, I opened it.

*Looks at the rail.*

> There's an "Assistant" in the left rail, greyed out, with the sparkle icon. That's the one that
> makes me nervous. Sparkle means AI, AI means it goes to somebody's model. It's greyed out, so I
> think it's off? But I don't know if greyed means "off" or "loading" or "you need to sign in". If I
> clicked it, would it start sending stuff? It doesn't say. If I was being strict I'd want that to
> say "off -- nothing sent" rather than me reading it off the grey.

*Looks at Layout "Force-directed" with the play button, and the Statistics panel.*

> Layout runs... here, I assume? Density, connected components -- all that is computed here? It
> doesn't say so. In Neo4j land that's a server doing it. I'm assuming it's the browser because of
> the line I saw on the first screen, but that line is gone now.

*Opens the project name chevron (the "Not saved" variant).*

> "Not saved: this browser's storage is full. Download project file." OK -- "this browser's storage".
> So it IS the browser. That's the first time on this screen I've seen the word "browser" about
> where my stuff lives. And I only saw it because saving broke. When saving works, apparently it'd
> say something like "kept in this browser" in here, but I'd have to open a menu under the project
> name to find it, and I would not have thought to look there.

> *Export... top right.*
> I haven't clicked it, but that's the other one I'd worry about -- does "export" mean it makes a
> link somewhere, or it downloads a file? If it's a share link, that's my data on a server.

**Moderator: so, final answer -- did anything leave?**

> I think no. I'm about... seventy percent? It's based on one sentence on the first screen and one
> menu item I found by accident. If my manager asked me "did any supplier data leave the laptop",
> I couldn't point at anything on this screen and say "there, it says so". I'd have to say "the
> first screen said it doesn't". That's not great when it's me who gets the call.

## Single Ease Question

**3 out of 7.** The first half was easy -- the answer was right where I load the file, which almost
never happens. The second half I couldn't actually answer from the screen. I guessed.

## Would I use this instead of my current tool?

> For the picture half -- maybe, yeah. Gephi needs admin rights to install and this doesn't. And the
> padlock line is more than Gephi Lite gave me at the point of loading. But right now I'd use it on
> sanitised extracts only. To put real supplier data in it, I need (a) something I can forward to
> security that says who makes it and how the "uploads nothing" is guaranteed, (b) to know it's free
> or what it costs, and (c) to still be able to see, once I'm working, that nothing's going out --
> especially with that Assistant thing sitting there.

## Problems observed

1. **The locality promise disappears after load.** Start screen: clear. Main frame: nothing says data
   stays local; the only trace is inside the project-name menu, and only when saving fails.
   Severity 3.
2. **The file chip popover answers "where from", not "where to".** He opened it looking for the
   answer to "did anything leave" and found the source and read time. Severity 2.
3. **The greyed Assistant raises the question it does not answer.** Sparkle icon reads as AI, grey
   does not clearly read as "off, nothing sent". Severity 3.
4. **No way to verify the claim or take it to IT.** No maker, no privacy/security page, no licence
   or cost, no "works offline" statement visible on the start screen; the main menu's contents are
   unknown. Severity 3.
5. **"Saving projects" without a place.** The not-saving warning never says projects are kept in
   the browser, so "saving" reads as possibly an account/server. Severity 2.
6. **Ambiguous verbs near data.** "The columns are checked" (by what, where?) and Export... (file or
   share link?) each triggered a where-does-it-go doubt. Severity 1.
7. **"Sends only your query"** is honest but "query" is not his word; he skipped the row rather than
   understand it. Severity 1.

## What worked

- The padlock line sits exactly where he loads the file and stays visible while dragging a file in;
  he found it without looking for a privacy page.
- Connect to data source saying plainly that it sends something made the "uploads nothing" line more
  believable.
- No sign-in before seeing his own data.
- Counts on load (77 / 254) matched what he expected for the sample.
