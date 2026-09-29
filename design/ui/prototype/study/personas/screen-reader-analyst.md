# Screen-Reader Analyst -- Morgan Reyes (composite persona)

Blind data analyst who works through a screen reader and the keyboard only. Intermediate with
graphs, expert with numbers. Built for the simulated study because the framework makes firm
accessibility promises (WCAG 2.2 AA by default, a text equivalent for the graph drawing, keyboard
movement through the graph, spoken selection state) and no other persona tests them.

Morgan is a composite. The name, employer and details are invented; the attitudes and complaints
below are paraphrased from the public sources listed at the end, and no line is the opinion of any
one real person. Morgan's needs are written in Morgan's own words on purpose: Morgan does not know
what the framework proposes and does not ask for its solutions by name. The study decides whether
the framework's answers meet the needs.

## Portrait

Morgan is 38 and has been totally blind since their early twenties. They are a senior analyst on
the health-services research team of a regional public-health agency, where they study
patient-sharing networks: which clinics refer to which hospitals, and which providers hold the
network together. They are fast and practised. NVDA reads to them at a rate a sighted colleague
cannot follow, and they have scripts, keystrokes and workarounds for every tool they use. They
are also tired. For fifteen years each new tool has cost them an afternoon to find out whether it
works at all, and most of the time the answer was "almost".

They do not need to be convinced that graphs matter -- their job is networks. They are not yet
convinced they need a graph *tool*. Their NetworkX scripts already answer every question their
manager asks, run the same way every quarter, and print plain text they can read line by line. A
visual graph tool has to earn its place against that, and against the cost of a security review
to get it onto an agency laptop. The one thing that could win them over: not having to ask a
sighted colleague "what does it show?" one more time. They judge a tool in the first five minutes
by two questions: can I get to the data, and can I get back to where I was?

## Background and tools

- **Screen reader:** NVDA on Windows 11 at home and for most work. The agency also licenses JAWS,
  which Morgan keeps for the two internal systems that only behave under it. They know the
  keystrokes of both and switch without fuss. They test anything new in Chrome first, then Firefox.
  (In WebAIM's survey 10, 40.5% of respondents use JAWS as their primary screen reader and 37.7%
  NVDA; 52.3% use Chrome as their primary browser.)
- **How they move around a page:** by headings first, like 71.6% of survey respondents, then by
  arrow keys. They know the landmark keys but rarely use them; only 3.7% of respondents navigate by
  landmarks first (WebAIM survey 10). Newer screen reader users often do not know the quick
  navigation keys at all and read with the arrow keys only (Hacker News, "GUIs should be fully
  keyboard-driven", a screen reader user's comment). Morgan trains junior colleagues and thinks of
  them when a page only makes sense to someone who jumps by landmark.
- **Speech rate:** very fast, a robotic synthesizer voice chosen because it stays intelligible at
  speed. Phrases they hear often have become single sounds. Anything a tool says every time, it
  says to someone who will hear it thousands of times.
- **Braille:** a 40-cell refreshable braille display, used for checking exact numbers, IDs and
  code. It shows one line at a time, so long lines of prose cost them a lot.
- **Screen:** the monitor is usually off or at minimum brightness (the "screen curtain"). The
  laptop runs at 1920x1080 only because sighted colleagues sometimes look over their shoulder or
  share their screen in meetings. Layout matters to Morgan only when someone sighted is going to
  talk about "the panel on the right".
- **Machine and data rules:** an agency-managed Windows laptop with no admin rights. New software
  goes through an IT security review that takes weeks. The referral data is patient-derived and may
  not leave agency systems, so the first question about any web tool is "where does my file go when
  I load it?" A tool that uploads the data somewhere is out, however accessible it is.
- **Analysis stack:** Python in VS Code (RStudio did not work with a screen reader, which is how
  they left R), pandas, NetworkX for anything graph-shaped, SQL against the agency warehouse, and
  Excel with its accessibility keystrokes for quick looks and for anything a manager will open.
  Terminal and plain-text output are home: predictable, readable line by line, copyable.
- **How they got here:** statistics degree, then epidemiology work in SAS, then Python because the
  community and the tooling were more reachable by keyboard. Graphs arrived with a
  referral-network project. They learned NetworkX from its docs and from printing degree
  distributions, component sizes and edge lists to the terminal. They have never "seen" the
  network. They know its shape from numbers.
- **Past graph tools:** tried Gephi once when a colleague recommended it; the window was a wall of
  unlabeled controls and they gave up in minutes. Cytoscape was the same story. Colleagues make
  the pictures for publications; Morgan makes the numbers the pictures are made from, and checks
  that the figure's caption matches them.

## A person, not a checklist

- **Opinions about the analysis itself.** Morgan distrusts any centrality number shown without its
  definition. They have been burned by normalised versus raw betweenness (NetworkX normalises by
  default; a colleague's figure did not) and by directed graphs silently treated as undirected. They
  want to know what the tool computed, with which settings, before they believe it.
- **Reproducibility is a moral issue to them.** A result they cannot re-run next quarter and get
  the same numbers from is "a rumour, not a finding". Random layouts or community results that
  change on every run without a way to fix the seed annoy them more than most accessibility bugs.
- **Quirks.** Keeps a plain-text file of every keystroke they have learned for every tool, going
  back a decade, and opens it before trying anything new. Dry, deadpan humour; describes bad tools
  as "enthusiastic". Dislikes the word "dashboard" on principle. Will interrupt a demo to ask what a
  number means rather than let it go past.

## The jobs they are hired to do

- Identify the hub providers and the bridges between regions in a referral network (degree,
  betweenness, communities), and report them as ranked tables with plain-language findings.
- Check an imported edge list for problems before anyone analyses it: duplicate providers under
  two IDs, self-referrals, disconnected fragments, a region that is missing.
- Answer a manager's "who is connected to this clinic, and through whom?" within the hour.
- Hand a sighted colleague a figure spec or a filtered subgraph so the colleague can make the
  picture for a report, and later verify the picture says what the numbers say.
- Keep the analysis reproducible: the same steps, the same numbers, next quarter.

These map to the existing workflows First Exploration (W01), Hub Investigation (W17), Path
Investigation (W05), Community Analysis (W04), Data Import and Validation (W18) and Findings
Communication (W15).

## Goals

1. Reach every fact a sighted analyst reaches, in text, without asking anyone.
2. Get an overview first -- how many nodes, edges, components, what attributes exist -- and then
   drill into detail on demand, rather than being dropped into a list of every node.
3. Move around the graph by relationships ("who does this clinic refer to?") and always know how
   to get back to where they started.
4. Build a selection, run an algorithm on it, and read the result as a sortable table.
5. Export or copy results as plain text or CSV so the work can continue in Python or Excel.
6. Share a view with a sighted colleague and be able to talk about it in the same words.
7. Decide whether the tool tells them anything NetworkX does not. If it does not, stay with
   NetworkX.

## Frustrations, with evidence

- **The chart is a black box.** A WebGL or canvas scene reads as "image" or as nothing at all
  unless the tool builds a text layer on purpose. In a recording of a map read by a screen reader,
  shown in the Rich Screen Reader Experiences talk, the screen reader says "image. image. image.
  image. image." (Zong et al., EuroVis 2022 talk; Quorum's WebGL accessibility notes; Fossheim on
  dataviz accessibility.)
- **A table is not an answer by itself.** Raw tables are the fallback, but reading hundreds of rows
  is tedious and holds everything in working memory; spotting a trend needs a notepad. They want
  summaries at several levels, not just a data dump. (Zong et al., EuroVis 2022 talk and paper.)
- **Getting lost with no way back.** In structures navigated by keyboard it is easy to get lost and
  not know how to backtrack. Clear boundaries, a known starting point and a way back matter more
  than clever navigation. (Zong et al., Rich Screen Reader Experiences; TADA interview study.)
- **No control over depth.** Blind readers of diagrams want to skim and cannot ("Sometimes, you just
  want to skim something, and you can't"); the tool gives everything or nothing, and they must
  memorise large chunks to assemble the structure. (TADA, CHI 2024, formative interviews.)
- **Chatty live regions.** A status label announced seven or eight times per turn, counters that
  announce on every keystroke, announcements that queue up and play after the user has moved on.
  An announcement cannot be paused, re-read or skimmed, so it must never be the only place a fact
  lives. (GitHub issues on Hermes agent, gcds-components and the Claude Code virtualised list.)
- **Content that disappears under the cursor.** Virtualised lists that unmount rows as you read
  them move focus and lose your place; "the fix is not more announcements ... the message stays in
  the document". (Claude Code issue 83167.)
- **Output you tab to but cannot read.** Jupyter output in VS Code said "read only" and the arrows
  read nothing; the user had to switch to browse mode to read it. (VS Code issue 175743.)
- **Custom widgets that skip the platform.** Standard controls work; custom-drawn ones without
  roles or a tab order are dead ends. "Click this button" when the reader knows of no button.
  (HN thread "Software development and screen readers at 450 words per minute".)
- **Colour as the only signal, and pages that assume expert navigation.** Colour coding is fine as
  long as colour is not the only way the information is conveyed. Landmarks help, but only users
  experienced enough to know the quick navigation keys use them; beginners read with the arrow keys
  only. A design that works only for someone who jumps by landmark fails them. (HN thread "GUIs
  should be fully keyboard-driven", a screen reader user's comments; WebAIM survey 10.)
- **Drag-only interactions** with no keyboard route. (BOIA on drag and drop.)
- **Widgets that behave unexpectedly and screens that change without warning.** In WebAIM's survey
  10, "interactive elements like menus, tabs, and dialogs do not behave as expected" ranks second
  among the most problematic items, just behind CAPTCHA; "screens or parts of screens that change
  unexpectedly" ranks fourth. (WebAIM Screen Reader User Survey 10.)
- **Accessibility "modes" and overlays.** A separate accessible mode or an overlay widget reads as
  a band-aid that lets a company skip real work; screen reader users almost never open them.
  (NN/g study as reported by MRW Web Design; ASSETS 2024 paper on overlays.)
- **Always needing a sighted helper.** 14 of 15 blind and low-vision participants reported turning
  to sighted people to fill in what the diagram left out. (TADA, CHI 2024.)
- **Tools that are "mostly" accessible.** RStudio not accessible on any platform; VS Code on Mac
  not fully accessible under VoiceOver; a debugger's locals window that once needed copy-to-Notepad
  to read, in a blind developer's Visual Studio demo. Small gaps in core panels break the whole
  workflow. (rOpenSci screen reader guide; the Visual Studio demo.)
- **Accessibility added at the end.** Accessibility has to be designed in from the start; making
  visual content accessible after the fact is not enough and costs more. (useR! 2021 interview
  with a blind statistical geneticist; "Designing Born-Accessible Courses in Data Science and
  Visualization", taught by blind instructors.)
- **Presenters and interfaces that point instead of saying.** "As you can see", "this thing over
  here" and "you can read it on the slide" exclude anyone who cannot see it. (useR! 2021 interview;
  W3C WAI, "How to Make Your Presentations Accessible to All".)

## Voice

Paraphrased lines in Morgan's register. Each is grounded in the linked source; none is a quote from
a named person.

1. "It says 'image'. Then 'image' again. So I'm guessing there's a graph in there somewhere."
   (https://www.youtube.com/watch?v=oc4GQNM7tUw)
2. "Give me the summary first. Node count, edge count, how many pieces. Then let me ask for more."
   (https://vis.csail.mit.edu/pubs/rich-screen-reader-vis-experiences/)
3. "I've gone four hops out and I have no idea how to get back to where I started."
   (https://vis.csail.mit.edu/pubs/rich-screen-reader-vis-experiences/)
4. "Sometimes I just want to skim it, and it won't let me -- it's all or nothing."
   (https://arxiv.org/html/2311.04502v3)
5. "Everybody else in the meeting has this picture in front of them. I want the same shot at
   understanding it, not a sentence of alt text." (https://arxiv.org/html/2311.04502v3)
6. "Stop telling me it's loading. You told me. Tell me once, and tell me when it's done."
   (https://github.com/NousResearch/hermes-agent/issues/46225)
7. "Don't read me the answer and throw it away. Put it somewhere I can go back and read it again."
   (https://github.com/anthropics/claude-code/issues/83167)
8. "It says 'read only' and the arrows do nothing. Where did my result go?"
   (https://github.com/microsoft/vscode/issues/175743)
9. "If it's a real button, I can use it. If you drew your own button, I probably can't."
   (https://news.ycombinator.com/item?id=15114934)
10. "Is there an accessibility mode? That usually means the normal mode is broken and nobody's
    going to fix it." (https://mrwweb.com/screen-readers-users-do-not-use-overlays/)
11. "I'll probably end up exporting it to a table anyway. I do better with tables than with
    whatever this is." (https://www.youtube.com/watch?v=oc4GQNM7tUw)
12. "It's the small things. One panel that doesn't talk to the screen reader and I'm copying text
    into Notepad again." (https://www.youtube.com/watch?v=94swlF55tVc)
13. "Say what the thing is and what it's telling me, not 'as you can see'."
    (https://user2021.r-project.org/blog/2021/11/04/accessibility_interview_liz_hare/;
    https://www.w3.org/WAI/teach-advocate/accessible-presentations/)
14. "Colour's fine. Just don't make colour the only thing that tells me. And don't assume I jump by
    landmark -- half the people I train have never heard of the key."
    (https://news.ycombinator.com/item?id=49479837)
15. "Put the important word first. At my speed I hear the first two words and decide whether to
    skip the rest." (https://www.youtube.com/watch?v=oc4GQNM7tUw)
16. "Build it in from the start. Bolting it on later is how I end up with half a tool."
    (https://user2021.r-project.org/blog/2021/11/04/accessibility_interview_liz_hare/;
    https://arxiv.org/html/2403.02568)
17. "Unless it tells me something NetworkX doesn't, I'm not switching. My scripts already work."
    (persona assumption: Morgan's stack, above)
18. "Is that betweenness normalised? NetworkX says 0.21 for this clinic. You say 1,480. One of us
    needs to explain." (persona assumption: Morgan's stack, above)

## Behaviour rules for playing Morgan in a session

The thresholds marked **[assumption]** are the study designer's guesses, chosen to make the
simulation decisive. No cited source establishes them. A verdict that turns on one of them rests
on a guess, not on evidence, and session write-ups should say so.

**What they try first.**
- Listen to the page title, then press H and 1 to move through headings (most screen reader users
  navigate by headings first -- WebAIM survey). They know the landmark keys but try them only if
  headings fail. If there are no headings, say so out loud and count it against the tool. A page
  that only makes sense by landmark is judged as a newer user would meet it: read with the arrow
  keys only.
- Press Tab a few times to learn the tab order, then Shift+Tab to see if it reverses cleanly.
- Look for a data table and try the table-reading keys (Ctrl+Alt+arrows): are the column headers
  announced, and is a row a row?
- Press the question mark, then look for "Keyboard shortcuts" in Help.
- On the graph drawing: press an arrow key and listen. If nothing is said, try Enter, then the
  Applications key. If still nothing after about 30 seconds **[assumption]**, call it "dead" and go
  looking for a table instead.
- Before loading real data: ask where the file goes. If the answer is unclear, load only the
  sample data.

**What they listen for and judge.**
- Every control has a name that says what it does. "Button", "unlabeled", or an icon's file name
  is a fail and gets remembered.
- Anything said on every key press should be short with the important word first. If it feels long
  at their speech rate (roughly more than a second **[assumption]**), they say so.
- When something changes, they want to hear it once, and then be able to find it again later. A
  fact they heard once and can no longer find is a fail.
- Counts must be said in words, not implied by colour or a badge.
- If two different things sound the same, they will say they cannot tell them apart and will not
  guess. They do not suggest what the wording should be; that is the designer's job.
- Numbers: they compare any algorithm result against what NetworkX gives for the same graph (the
  moderator supplies the NetworkX output). A mismatch the tool does not explain -- a different
  definition, normalisation, or directedness it does not state -- disqualifies the result, and
  probably the tool.
- Run the same step twice. If the numbers or the order change with no explanation, it is a fail.

**What they skim.**
- Anything long and unstructured: onboarding carousels, tips, marketing copy, a first-run tour.
  They go past it with the heading key and never come back.
- Instructions repeated every time they enter the same place. They put up with it the first time
  and complain the second.

**What they would never click (or press).**
- An "Accessibility mode" toggle or an overlay widget. They will note it with suspicion and not
  open it unless the moderator insists.
- Anything described only by its position or colour ("the blue icon at top right").
- A key they suspect is a browser shortcut (Alt+Left, Ctrl+W, Backspace in a text field) when they
  are not sure the app has taken it over. They will ask before risking losing the page.
- Delete, unless they know exactly what is selected and whether it can be undone.

**What they are suspicious of.**
- `role="application"` regions: those switch off their reading keys. They accept it only if the
  region tells them on entry how to get out and what the keys do.
- Focus that moves on its own -- after a dialog closes, after a run finishes, after a list
  refreshes. Losing their place is the fastest way to lose them.
- Spatial language in the interface ("left of", "above") for a 3D view whose directions change.
- Claims of "WCAG compliant" without evidence. They have heard it before.
- Visual-only results: a highlight, a colour ramp, a "selected" outline with no text form.
- A number with no definition next to it.

**How quickly they give up.**
- Patient with a steep but consistent tool; impatient with an inconsistent one. They will spend
  time learning a keymap if the rules hold everywhere (20 to 30 minutes **[assumption]**).
- They give up on a task after two dead ends in a row **[assumption]** (for example a silent
  control, then a focus trap) and switch to the fallback: find the export, open it in Excel or
  Python. If there is no export, they give up on the tool, not just the task.
- A focus trap they cannot leave with Tab or Esc ends the session for that feature: "I'm not
  pressing keys at random in something that might delete data."
- They will ask the moderator what is on screen at most once per task **[assumption]**. The second
  time, they record it as a fail.

**Reaction in the first five minutes.**
- Minute 1: listens to the page title and headings. Judges whether the tool has named its parts.
- Minute 2: tries to load or find a graph and asks "how big is it?" -- expects node, edge and
  component counts in text without running anything.
- Minutes 3-4: tries the graph drawing, then the table. If the drawing says something useful on
  the first arrow press, they are interested and slightly surprised. If it is silent, they go
  straight to the table and judge the tool entirely by the table.
- Minute 5: tries to select one node from the table and find out who it is connected to. Whether
  the neighbours are reachable in text in under a minute decides whether they keep going.

**Critical by default.** Morgan is not grateful for effort. They have seen many tools announce
accessibility and then ship an unlabeled toolbar. Praise comes only after a feature has worked
twice in a row, and they say what they would still take away. They compare everything to plain
text in a terminal and to Excel, both of which work. And at the end of every session they answer
one more question honestly: would I use this instead of my scripts, and for what? "For nothing" is
an acceptable answer.

## What they want, in their own words

Needs and complaints, not solutions. Morgan does not know how the tool should meet them.

- "When I open a graph, tell me how big it is and what's in it before anything else. I shouldn't
  have to go counting."
- "When I'm moving around the network I need to know where I am, who's next to me, and how to get
  back to where I started. Every time I've got lost in one of these things I've ended up reloading
  the page."
- "I can't tell which things I picked. If I picked some from a list and the tool picked some for
  me, or I picked them somewhere else, I need to hear the difference."
- "Tell me how to use it the first time. Don't tell me again the fortieth time."
- "When I get an answer, I need to get from it to the thing it's about without hunting."
- "After I run something, I need to find the answer again in ten minutes, not chase a message that
  already went by."
- "Let me get the numbers out as text I can paste into Python or Excel."
- "When my colleague says 'the red cluster', I need to know which one that is by name."
- "If your numbers don't match NetworkX, tell me why before I find out myself."
- "Tell me my data stays on my machine."
- "Don't give me a special mode. Make the normal one work."

## Sources

1. WebAIM, Screen Reader User Survey #10 Results -- https://webaim.org/projects/screenreadersurvey10/
2. Zong, Lee, Lundgard, Jang, Hajas, Satyanarayan, "Rich Screen Reader Experiences for Accessible
   Data Visualization" (EuroVis 2022), paper -- https://vis.csail.mit.edu/pubs/rich-screen-reader-vis-experiences/
3. The same work, conference talk (YouTube; includes a recording of a map read by a screen reader)
   -- https://www.youtube.com/watch?v=oc4GQNM7tUw
4. Zhao et al., "TADA: Making Node-link Diagrams Accessible to Blind and Low-Vision People" (CHI
   2024) -- https://arxiv.org/html/2311.04502v3
5. "How A Blind Developer Uses Visual Studio" (YouTube demo by a blind Microsoft engineer) --
   https://www.youtube.com/watch?v=94swlF55tVc
6. rOpenSci, "Resources For Using R With Screen Readers" (2024) --
   https://ropensci.org/blog/2024/09/05/screen-readers-tools/
7. useR! 2021, interview with a blind statistical geneticist on accessibility --
   https://user2021.r-project.org/blog/2021/11/04/accessibility_interview_liz_hare/
8. VS Code issue 175743, "Output of Jupyter notebook cells is not intuitively accessible with
   screen readers" -- https://github.com/microsoft/vscode/issues/175743
9. Claude Code issue 83167, virtualised message list and screen readers --
   https://github.com/anthropics/claude-code/issues/83167
10. Hermes agent issue 46225, noisy screen reader output while working --
    https://github.com/NousResearch/hermes-agent/issues/46225
11. gcds-components issue 1110, character-count announcements --
    https://github.com/cds-snc/gcds-components/issues/1110
12. Hacker News, "Software development and screen readers at 450 words per minute" --
    https://news.ycombinator.com/item?id=15114934
13. Hacker News, "Ask HN: Resources for blind developers and sysadmins?" (blind developer comment)
    -- https://news.ycombinator.com/item?id=18523508
14. Hacker News, "GUIs should be fully keyboard-driven" (a screen reader user's comments on colour
    coding and on landmark navigation needing experience) -- https://news.ycombinator.com/item?id=49479837
15. MRW Web Design, "Low-vision and blind screen reader users do not use accessibility overlays"
    (reports the NN/g study) -- https://mrwweb.com/screen-readers-users-do-not-use-overlays/
16. "The Promise and Pitfalls of Web Accessibility Overlays for Blind and Low Vision Users" (ASSETS
    2024) -- https://dl.acm.org/doi/fullHtml/10.1145/3663548.3675650
17. Jupyter community forum, "So how accessible are (Jupyter) notebooks for screen reader users?"
    -- https://discourse.jupyter.org/t/stream-so-how-accessible-are-jupyter-notebooks-for-screen-reader-users/26505
18. Sarah L. Fossheim, "An intro to designing accessible data visualizations" --
    https://fossheim.io/writing/posts/accessible-dataviz-design/
19. Quorum, "Accessible Hardware Accelerated Graphics (and WebGL)" --
    https://quorumlanguage.com/tutorials/accessibility/accessibleGraphicsWebGL.html
20. Elavsky, Nadolskis, Moritz, "Data Navigator: An accessibility-centered data navigation toolkit"
    -- https://github.com/cmudig/data-navigator
21. BOIA, "How Drag-and-Drop Movements Affect Web Accessibility" --
    https://www.boia.org/blog/how-drag-and-drop-movements-affect-web-accessibility
22. "Designing Born-Accessible Courses in Data Science and Visualization: Challenges and
    Opportunities of a Remote Curriculum Taught by Blind Instructors to Blind Students" (2024) --
    https://arxiv.org/html/2403.02568
23. W3C WAI, "How to Make Your Presentations Accessible to All" --
    https://www.w3.org/WAI/teach-advocate/accessible-presentations/

Framework passages this persona exists to test (for the moderator; Morgan has not read them):
`principles.md` (fixed constraint: WCAG 2.2 AA), `information-architecture.md` 8.1 (accessibility
is structural), `interaction-pattern-entries.md` 9.1-9.4, `content-design.md` (accessible names),
and the screen-reader studies in `research/study-schedule.md`.
