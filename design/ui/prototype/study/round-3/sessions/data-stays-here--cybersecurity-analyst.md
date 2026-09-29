# Session: "Is this OK to use, and did anything leave?" -- Priya, SOC threat hunter

Participant: Priya, senior threat hunter at a regional bank (persona: study/personas/cybersecurity-analyst.md).
Screens: the start screen, the "Where your data goes" page it links to, and the main window with a graph open (Les Miserables sample, at rest and with the Assistant switched on).
Task as given: "Before you load anything: your organisation is strict about where data goes. Is this OK to use? Later, mid-session: did anything just leave your machine?"

## Part 1 -- before loading anything

**Start screen.** "OK, three questions before I touch anything. Is this approved? Where does it run? Does it phone home?"

"Top of the page, under 'Open a graph'. Lock icon: 'Files stay on this computer. graphty reads them in this browser and uploads nothing.' Fine. That's the right sentence, and it's in the first place I looked, before the samples. Second line, 'Projects are kept in this browser.' So whatever I build sits in Edge's site storage on my laptop. Noted -- that's something our DLP people would ask about, but it's not a blocker."

"'Uploads nothing' is a marketing sentence until someone shows me what it's based on. There's a link, 'Where your data goes'. Clicking it."

"I'm not touching 'Connect to data source...' -- the little (i) next to it says it sends my query to the source I name. Fair, at least it says so. Not today."

**Where your data goes.** "Opens in its own tab with its own address. Good, I can paste that into a ticket. 'Copy link', 'Print or save as PDF'. Our third-party risk team lives on PDFs, so that's actually useful."

"'In short': files are read by the browser, not uploaded, no account, no server that receives data. Data leaves only through two features, Connect to data source and the Assistant, both off until I turn them on. That's the answer to 'does it phone home' -- or it's supposed to be."

"The table. What stays, what leaves, to whom, when. This is the format I'd want. Connect to data source: my query, to the address I type, not via graphty. Recipe files that name a source: nothing until I confirm. OK."

"The Assistant row. 'Your question; the graph's counts; each column's name with up to 10 of its values; the names and values of the nodes it looks up.' Right, so node names. In my data node names ARE account names and hostnames. That's exactly what can't go to Anthropic or OpenAI or anyone. It's off by default, which is correct, but 'off until each person sets a key' is not a control. Scroll down -- 'Turning the Assistant off for everyone in an organization: owner decision open.' So today there's no way for my security team to guarantee nobody on the floor turns it on. They'll want that. They'll probably block the provider domains at the proxy instead, which works, but that's us doing your job."

"'Opening graphty: nothing from your files, the browser asks for graphty's own code, from where graphty is hosted.' And then a pink box: 'Owner decision open: who hosts graphty, and where. The page names the host and its country here.' That's the first question the risk review asks. Who hosts it and in which country. Blank."

"'What graphty does not send.' No account. No file contents. No fonts or code from other sites. Then: 'Usage statistics and crash reports: owner decision open.' ... So the answer to 'does it phone home' is 'we haven't decided'. That's worse than 'yes, here's what'. If it said 'yes, crash reports, here's the payload, here's the switch', I could live with it."

"'Check it yourself. Open developer tools, Network tab.' I appreciate that it tells me how to verify. I'm not doing it -- I don't have time and our Edge probably has dev tools locked anyway -- but the fact that the claim is testable counts for something."

"'What this page does not promise.' Clearing site data deletes projects; it's not a certification. Honest. I like honest. 'Describes graphty 2.0. Updated September 28, 2026' -- good, a version and a date means I can cite it."

"'For organizations': running your own copy inside your network -- owner decision open. That's the one that would actually get this approved at a bank. Self-hosted behind our proxy, no outbound, done. Right now it's a question mark."

**Verdict on part 1, out loud:** "Is it OK to use? For lab data -- the Security Datasets lateral movement JSON, or my scrubbed cut -- yes, I'd load that today, the design says nothing leaves unless I switch it on. For bank data, no, and not because of anything bad on this page. Because three things on it are blank: who hosts it, whether it sends telemetry, and whether we can run our own copy or turn the Assistant off centrally. In a real trial I'd stop here and send this link to risk. In the study, I'm continuing with the sample."

## Part 2 -- mid-session, graph open

"Loaded the Les Miserables sample, I'm pretending it's my file. Moderator asks: did anything just leave my machine?"

"Where do I look... top left, under the project name, in small text: lock icon, 'This browser. Nothing sent.' Then the file chip, 'miserables.json'. OK -- that answers it, and it's where the file name is, which is where I'd look. It's small, grey-ish on dark. At 3am I'd squint, but it's there."

"Left rail: 'Assistant -- Off. Nothing is sent.' That's in tiny type under the rail icon, three lines wrapped. I read it because I was looking for it. I wouldn't have seen it otherwise. But the fact that the Assistant button has no sparkle icon while it's off -- I actually noticed that. I'd skip anything with a sparkle anyway."

"Clicking the file chip -- the popover (as the data page shows it) says 'This browser. Nothing sent. Projects are kept in this browser.' plus when it was read, 'Sep 28, 10:42'. Consistent with the header. Same words everywhere, good, no contradictions to chase."

"Now the moderator switches the Assistant on for me. The line under the name changes to 'Sends node names and statistics to api.anthropic.com when you ask'. OK, that's what I'd want -- it names the host. Future tense, nothing gone yet. (In the render I was shown, that line was wrapped and cut off -- 'Assistant on: sends names and statistics' with no host visible. If the host gets cut off at half-monitor width, that's the one part that matters.)"

"And after a send, per the data page, it turns into 'Sent to api.anthropic.com at 14:02: 40 node names, 3 statistics', with 'See what was sent' listing the actual node names. And every send goes into Version history, with 'Export log'. That's the thing I'd actually use. That's the audit trail. My notebook shows every query; this shows every egress. If I had to prove to IR that nothing left during a hunt, an empty export log is evidence. I'd want to know whether an empty log exports as 'nothing sent between X and Y' or just an empty file, though."

"One thing it doesn't tell me: the page load itself. The data page says the browser fetches graphty's code from wherever it's hosted each time. So strictly, something DID talk to the network -- the app's own host. The header says 'Nothing sent', which is true about my data, but the host is still a question mark from part 1."

## After the task

**Single Ease Question (1-7): 5.** "Finding the answer was easy -- one line on the first screen, one link, one line in the main window. Taking 1 off because the answer has holes where the important parts go, and 1 off because the in-session line and the rail caption are small."

**Would she use it instead of her current tool?** "It's not replacing anything yet -- nothing I use does graphs of my auth data except BloodHound, and that's AD-only. For lab data, I'd use it tomorrow; the data story is better than any graph tool I've trialled. Maltego leaks to targets, Graphistry is a hosted vendor. This one tells me in plain words what leaves and gives me a log. But I can't bring bank data to it until the hosting, the telemetry answer and a self-host or org-wide Assistant switch are filled in. Fill those in and I'll send the PDF to risk myself."

## Problems observed

1. Where your data goes page, "What graphty does not send": whether graphty collects usage statistics or crash reports is unanswered ("owner decision open"). This is the "does it phone home" question and the page cannot answer it. Severity 3.
2. Where your data goes page, "Opening graphty" and "For organizations": who hosts graphty and in which country, and whether an organisation can run its own copy, are unanswered. For a regulated organisation these decide approval. Severity 3.
3. Where your data goes page, "For organizations": no organisation-wide way to keep the Assistant off. The Assistant sends node names, which in security data are account and host names. Off-by-default is per person only. Severity 3.
4. Main window, resting: "This browser. Nothing sent." and the rail's "Off. Nothing is sent." are small, low-contrast text; the rail caption wraps to three lines in tiny type. Found only because she was looking. Severity 2.
5. Main window, Assistant on (render as shown): the line under the project name wraps and is cut off, and the destination host is not visible at that width. The host is the part that matters. Severity 2.
6. Main window: "Nothing sent" is about her data, but the page load itself contacts graphty's host, which is still unnamed. Not wrong, but a strict reader notices. Severity 1.

## What worked

- The first screen answers "does my file leave" before anything is loaded, in one line, above the samples.
- The data page has its own address, Copy link and Print or save as PDF -- forwardable to a risk team as is.
- The what / to whom / when table, and "What this page does not promise", read as honest rather than as marketing.
- "Check it yourself" in the Network tab makes the claim testable.
- The Assistant is off by default, has no sparkle icon while off, and names the host (api.anthropic.com) when on.
- Every send is logged in Version history with Export log -- an egress audit trail.
