# Focus group: getting back what a click took

Five simulated participants looked at the gallery: the storyboards, the app screen, and the storyboard in which a stray click clears a hand-picked selection of 18 nodes. The screen they saw has a line under the project name ("Nothing has been sent from this project"), counts on the right (77 nodes, 254 edges, one component), a table under the graph sorted by degree, a chip reading "27 of 77 nodes, 3 steps" for a three-step filter, a style list headed "Style stack. Top wins. Drag to reorder.", saved sets marked "frozen" or "rule", and a group legend that lists groups by number. When the selection is cleared, a dark message bar appears above the bottom toolbar, in the middle of the graph, saying the 18 nodes were cleared. The sample data is the Les Miserables character network, not the participants' own data. The topic was: when you lose something, how do you get it back, and would you trust undo (Ctrl+Z) to do it. The group had three rounds: first reactions, replies to each other, and "what would make you quit, what would make you switch, one change".

Participants:

- Alex (analyst-alex): data analyst who works in Jupyter and has used Gephi; reports degree rankings to a director.
- Morgan (screen-reader-analyst): blind analyst who uses NVDA and works in NetworkX scripts.
- Marcus (intelligence-analyst): police intelligence analyst who builds link charts in Analyst's Notebook and briefs a sergeant.
- Nadia (alert-reviewer): level-1 alert reviewer in financial crime; each alert names one account; QA audits her files.
- Dana (supply-chain-analyst): supply chain risk analyst who lives in Excel and Power BI; narrows supplier lists over long sessions.

These are simulated voices, not real users. Treat every theme below as a hypothesis to test with a task, not as evidence of behaviour.

## Transcript

### Round 1: first reactions

**Alex (analyst-alex):** I haven't heard from anyone else yet, so nobody to disagree with. First thing I checked: the counts. 77 nodes, 254 edges, one component, and they're on the right before I clicked anything. Good, that's where I'd look.

The line under the project name, "Nothing has been sent from this project", is the most useful thing on the screen for me. I'd still want to know what "sent" means before I load supplier data.

The table under the graph, sorted by degree, is the part I'd actually use. Valjean 36, Gavroche 22. That's what my director asks for.

Stuff I don't get: "Style stack. Top wins. Drag to reorder." That reads like developer-speak. "Frozen" versus "rule" next to the sets is the same problem, and I wouldn't touch either.

The group legend: is 2 the biggest group, or just first? And the colours are only numbers, so I don't know what a group is.

The storyboards I skimmed. Too much text.

**Morgan (screen-reader-analyst):** I had the gallery read to me, so I can only talk about what came through as text. The keyboard storyboard is the first design document anyone has handed me that writes down exactly what the screen reader says on each step. I noticed that. It is also on paper, and paper never slips. The line saying it's "a structural walkthrough, not a usability result" was the most honest sentence in it.

On how the app is organised: I heard a lot of "the panel on the left" and "the bar at the top". That's fine for the people who can see it, but it doesn't tell me what the thing is called when I press H. I care whether the parts have names.

For today, my question is simple. When I lose something, where do I find it again? I don't mean a message that went past while I was tabbing. I mean something that stays on the page. The failure storyboard is mostly pictures in iframes to me.

And I'll say it now: I don't press Ctrl+Z in a browser until someone tells me what it's going to eat.

**Marcus (intelligence-analyst):** First thing I read was the line under the project name: "Nothing has been sent from this project." Good. That's the first question I ask about any tool, and I didn't have to ask it. Keep that line where it is.

The layout is fine once you get it. Graph, Data, Results, Notes down the left, the chart in the middle, numbers on the right. The chip that says "27 of 77 nodes, 3 steps" is useful. The panel also says "filtered graph, 27 of 77", so at least the two counts agree. Last tool I used, they didn't.

Still, it's coloured dots. I can't tell a person from a phone from a car without clicking. Until that changes, it's not a link chart to me.

The storyboards I mostly skimmed. The ones I read were someone working a case one step at a time, and that's the right idea. What I care about is whether I lose anything when I mis-click. That black bar at the bottom about 18 nodes being cleared shows up and goes away, right? I've been burned by that before.

**Nadia (alert-reviewer):** Honestly? First thing I did was look for a search box to paste an account number into. There's a magnifier next to "Graphs", but I think that searches the list of graphs, not accounts. Nobody's alert says "look at 3,000 accounts drawn as density". The alert names one account and one transfer. On the storyboards I kept waiting for that account to show up, and most of the time it was a big grey cloud first.

The left side is Graph, Data, Results, Notes. That's fine, I guess. But "Full graph" with a little funnel next to it, is that a filter or is that what I've got picked? I genuinely can't tell whether clicking stuff changes the data or just the view. That matters to me, because QA will ask.

The right panel is mostly numbers I'd never write in a disposition. Density 0.00101 means nothing to me.

What I'd actually judge it on is whether I can get one picture and three lines into the alert file inside ten minutes. I didn't see that in the storyboards.

**Dana (supply-chain-analyst):** The layout's fine. It looks like the Power BI setup I already know: list on the left, picture in the middle, table at the bottom. The table is the part I trust. I did notice the storyboards are all Les Miserables characters and not suppliers, so I'm guessing at how it works on my kind of data.

First thing I want before I say anything nice: where does my supplier list go when I load it? There's a line at the top that says "Nothing has been sent from this project", and I did read that. I'm not sure IT will take a grey line as the answer, but it's a start.

On today's topic, the only undo I care about is my filters. If I've spent twenty minutes narrowing it down to 18 suppliers and a click wipes that out, I'm not rebuilding it. I'll go back to the pivot where it was saved. The black box above the toolbar says the selection was cleared, fine. But it's small and it's in the middle of the picture, and I could easily miss it on my laptop screen.

I'll probably disagree with whoever says "just press Ctrl+Z". In Excel, Ctrl+Z has eaten the wrong thing on me more than once.

### Round 2: replies to each other

**Alex (analyst-alex):** Dana's right about Ctrl+Z, and it isn't only Excel. In Jupyter I've hit Ctrl+Z and undone a cell edit when what I wanted back was the whole dataframe. So when I ask what undo is going to do here, I'm really asking what it treats as one step. Is the step my selection, a filter, or the colours?

Marcus asked whether the black bar goes away. That's my question too. If the bar is the only place my 18 accounts live, it's useless to me, because I'll be looking at the table when it fades. What I'd actually do is rebuild the 18 from a saved query. Gephi taught me that.

Nadia wants a search box, and I want the same thing: somewhere to paste an ID. I'm not convinced a click history is how I'd find anything again.

What's missing is some way to save the 18 as a named list. If I can name it, I'm not relying on undo at all. The "frozen" sets might be that. Nobody told me what frozen means, though, so I left them alone.

**Morgan (screen-reader-analyst):** Marcus asked whether that black bar about the 18 nodes goes away. That's my question too, only worse for me. If it goes away and I was halfway through a table when it spoke, I'll hear three words of it at most. NVDA cuts one announcement off with the next one. So a bar that disappears on a timer doesn't exist for me, and it doesn't really exist for Dana on her laptop either.

Dana, I'm with you on Ctrl+Z. I'd take it further. I'll use it only if something on the page, written down where I can read it with the arrow keys, tells me what the next Ctrl+Z will undo. It has to name the actual thing, like "the selection of 18 nodes" or "filter step 2". "Undo last action" isn't good enough.

Here's what I'd need before I trusted any of this. After I've lost something, I want a heading I can jump to with H that lists what happened, in order, and keeps it there. Picked accounts are one line and filter steps are another. My NetworkX scripts never lose anything, so this tool starts behind on that count.

Alex, "Style stack. Top wins" confused me too. Was it spoken as a heading, or was it just text?

**Marcus (intelligence-analyst):** Trust comes down to one thing for me. Can I tell my sergeant exactly what the chart showed when I made the call? If a mis-click throws away 18 picks and all I get is a black bar that fades out, I can't say that. Nadia's right that it has to be fast. But fast and gone is worse than slow and still there.

Dana, I'm with you on Ctrl+Z. In Analyst's Notebook, undo has put back a link I deleted on purpose an hour earlier. I don't trust any single keystroke that won't tell me what it's about to reverse.

What's missing is a record. I don't mean a pop-up. I mean a list I can look at: picked 18, filtered by date, filtered by two-or-more contacts, cleared. Military habit. If it isn't written down, it didn't happen. Morgan said the same thing a different way. Something that stays on the page works for both of us.

Alex, the counts agreeing is good. What I also need is for the count to say what I lost. "18 cleared" is better than nothing. "18 cleared, your filters untouched" is what I actually need to read.

**Nadia (alert-reviewer):** Dana's right about Ctrl+Z. I've had it take back the wrong thing too. In our case system it once undid a note I'd typed and left the thing I actually wanted gone. So when Marcus says that black bar shows up and then goes away, that's my worry exactly. If I'm copying an account number over to the other screen when it pops up, I won't see it at all.

Morgan wants something that stays on the page, and I think that's the right idea for me too, but for a different reason. QA won't care how I got those 18 accounts back. What they care about is whether the picture in my alert file is showing the same filters I say it's showing. If a click wiped my picks, I need something to tell me in plain words that the three filter steps are still there. Otherwise I'll just start the alert over. That costs me five minutes, and with my queue I don't have five minutes.

What's missing for me is still the search box for one account. Honestly I'd never have 18 accounts picked in the first place. I'd have one.

**Dana (supply-chain-analyst):** Marcus asked whether the black bar goes away. That's my question too. If it disappears while I'm reading the table, I've lost the only clue about what just happened. In Excel I at least have the pivot saved in another tab. I don't see anything like that here.

Morgan, I'm with you on Ctrl+Z. I wouldn't press it either. My worry is that it undoes my filter steps and not the picking, and then I've lost two things instead of one.

Nadia wants to paste one account number and go. My work is the other way round: I build up to my 18 suppliers over twenty minutes. The steps chip that says "3 steps" helps, but it only tells me how many steps there are, not what they are. If step two was wrong, I want to fix step two and leave one and three alone.

What's missing for me is a way to save "these 18" under a name, like a saved view in Power BI. Then a stray click doesn't matter, because I just reopen it.

On trust: the counts agreeing, like Marcus said, is what makes me believe the rest.

### Round 3: what would make you quit, what would make you switch, one change

**Alex (analyst-alex):** I'd quit over one specific thing. Say I press Ctrl+Z to get my 18 back and it quietly undoes a filter step as well. The counts on the right would change and I wouldn't know why. After that I'd stop trusting every number on the screen and go back to a notebook, because my code never loses anything.

Marcus wants a written record and Morgan wants something that stays on the page. They're both right, but for me that's a close second. The one thing I'd change is Dana's idea: let me save the 18 as a named list. Nadia, I'm not asking for search instead of that. I'd want both. If I can name the list, a stray click just means reopening it, and I don't need to guess what undo is going to eat.

If you only give me undo, the line at the bottom has to spell out what the next Ctrl+Z will reverse. Morgan already said that, and I agree with it.

What would make me switch is a list I can name, paste IDs into, and export as a CSV.

**Morgan (screen-reader-analyst):** What makes me quit is simple. If a stray click takes my 18 accounts and the only trace is something spoken once and then gone, I close the tab and go back to my NetworkX script. The script never forgets what I picked.

Alex, I agree that saving the 18 under a name is the real fix. Dana said the same thing. If there's a named list I can find with H, I don't need undo at all. Marcus's written record gets you there by a different road, and I'd take either one.

Nadia, I don't agree with you that fast beats everything. For me, fast and silent is the same as broken.

The one thing I'd change: after anything is lost, a line stays on the page, under a heading, until I dismiss it. It should say what went, for example "18 picked nodes cleared, 3 filter steps unchanged", and it should say exactly what the next Ctrl+Z will put back. If it doesn't name the thing, I won't press the key.

**Marcus (intelligence-analyst):** What would make me quit is simple. A keystroke that brings back my 18 picks and quietly rolls back a filter step I meant to keep. If that happens once and I only find out after I've briefed the sergeant, I'm done. I'd go back to Analyst's Notebook and paper, because I trust paper.

Dana's saved list is the right idea, and so is Alex's. If I can name "these 18" I don't need undo at all. Nadia, you only ever pick one account, but the rest of us don't work that way.

The one thing to change is the record Morgan and I both asked for. I want a running list on the page that never fades out: picked 18, date filter, two-or-more contacts, cleared 18. Next to Ctrl+Z it should say in plain words what the key will reverse, and that the filters stay put. If the tool shows me that, I'll press the key. If it doesn't, I won't touch it.

**Nadia (alert-reviewer):** I'd quit if I had to start an alert over because I couldn't tell what a click did. That's the whole thing for me. I've got a queue. If it costs me five minutes every time I'm not sure whether my filters are still there, I'm going back to the case system and the spreadsheet export, ugly or not.

Marcus wants a written list of everything he did, and Morgan does too. I get why. I just won't read a list. I'd read one line that says "18 accounts cleared, your 3 filter steps are still on," and then gives me one button to get them back. If that line stays until I've dealt with it, it covers me for QA.

Dana and Alex want to save the 18 under a name. That's fine for them. My alerts are one account, so saving a list doesn't help me.

If I could change one thing it would be the search box. Let me paste the account number from the alert and land on it. Everything else comes after that.

**Dana (supply-chain-analyst):** I'd quit the first time a stray click costs me the 18 suppliers and I can't tell whether my filter steps went with them. I wouldn't file a complaint. I'd just rebuild it in Power BI, where the view is saved and I know it's still there tomorrow.

Marcus wants a written list of what happened, and I agree, but I'd go one step further. That list is where I want to fix things. If step two was wrong, I want to click step two, change it, and see step three still sitting there. I don't want Ctrl+Z walking backwards through everything I did.

Nadia, I get that you only ever have one account picked. My 18 took twenty minutes, though, and speed doesn't help me if they're gone.

The one thing I'd change is to let me save "these 18" under a name, the same as a saved view. Then Ctrl+Z hardly matters to me. Alex asked for the same thing, so it's not only me.

What would make me switch is getting the right answer about where my supplier file goes. I mean an answer I can forward to IT, not a grey line.

## Themes

Evidence counts are voices out of five. Severity uses Nielsen's 0-4 scale, judged for the design as shown, not for a finished product.

### 1. A loss notice that fades on a timer does not exist for these users

Voiced by: Marcus, Morgan, Dana, Alex, Nadia (5 of 5). Severity 4.

Every participant raised the dark bar that reports the cleared selection, and every one assumed or feared it disappears on its own. The reasons differ, which is what makes this more than an echo: Morgan hears at most a few words before NVDA cuts it off with the next announcement; Dana is reading the table on a laptop and it sits small in the middle of the graph; Nadia is copying an account number on another screen; Alex is looking at the table; Marcus needs to be able to say afterwards what was lost. Asked what they would quit over, four of five named some version of "a stray click takes my work and the only trace is gone". Requirement the group converged on: the notice stays until the person dismisses it, and it is reachable as text (Morgan: under a heading he can jump to with H).

Dissent: none on the principle. Nadia wants one line, not a list (see theme 3).

### 2. The notice must say what was lost AND what was kept

Voiced by: Marcus, Morgan, Nadia, Dana, Alex (5 of 5; Marcus and Morgan wrote near-identical wording independently in rounds 2-3). Severity 3.

"18 cleared" is not enough; the wording they asked for is "18 picked nodes cleared, 3 filter steps unchanged". The fear underneath is specific and shared: not knowing whether the filter steps went with the selection. Nadia's reason is QA (the picture in the file must show the filters she says it shows); Dana's and Alex's is that an unexplained change in the counts would make them distrust every number on the screen. This is the cheapest change in the discussion and the one with the widest reach.

### 3. Undo is trusted only if it names what the next press will reverse

Voiced by: Dana, Alex, Morgan, Marcus, Nadia (5 of 5 distrust a bare Ctrl+Z). Severity 3.

All five cited a past tool where undo reversed the wrong thing (Excel, Jupyter, Analyst's Notebook, a case system). The concrete question underneath, stated by Alex, is what undo treats as one step: the selection, a filter step, or a style change. Three participants (Morgan, Marcus, Alex) would press the key only if the page names its target in words, for example "the selection of 18 nodes" or "filter step 2", never "Undo last action". Nadia wants the same thing as a single restore button on the notice rather than a key. The most feared failure (Alex, Marcus, Dana): one press that restores the selection and also silently rolls back a filter step.

Dissent: none voiced in favour of a plain, unlabelled undo. See the group-think section: that is itself a warning sign.

### 4. Name the selection so undo stops mattering

Voiced by: Alex, Dana (originators), endorsed by Morgan and Marcus (4 of 5). Severity 3 for the multi-step workflows it serves.

Dana (a saved view, as in Power BI) and Alex (a named list he can paste IDs into and export as CSV) independently proposed saving "these 18" under a name; by round 3 Morgan and Marcus both called it "the real fix". Alex saw that the saved sets marked "frozen" might already be this, but did not touch them because nothing says what "frozen" means. That makes this partly a labelling problem in the existing design, not only a missing feature.

Dissent: Nadia. Her alerts involve one account, so a saved list does nothing for her. This is a real workflow difference, not a disagreement about quality.

### 5. A persistent, ordered record of what happened, which can be edited in place

Voiced by: Marcus, Morgan (asked for it), Dana (extends it), Alex (endorses as second priority) (4 of 5). Severity 2.

Marcus wants a running list that never fades ("picked 18, date filter, two-or-more contacts, cleared 18") so he can tell his sergeant what the chart showed. Morgan wants the same list under a heading. Dana goes further: the list is where she wants to repair work, changing step two and seeing step three still there, instead of walking undo backwards. Her round-2 note that the chip says "3 steps" but not what the steps are is the concrete gap. This overlaps with what the filter step list and project history may already offer elsewhere in the design; the test should check whether participants find it, not assume it is missing.

Dissent: Nadia will not read a list; one line is her limit. Alex is lukewarm ("a close second").

### 6. Going to one known item by ID

Voiced by: Nadia (strongly, every round), Alex (agrees in rounds 2-3) (2 of 5). Severity 3 for alert review; off the session topic.

Nadia's first action was to look for a box to paste an account number; the only magnifier she found searches the list of graphs. Alex wants the same box to paste IDs into a list. This is not about recovery, but for Nadia it decides whether the tool is usable at all, and it came up without prompting.

## Single-voice items (not group findings)

- Alex: "Style stack. Top wins. Drag to reorder." reads as developer language; Morgan asked whether it is even a heading. Two voices on wording, but raised in passing.
- Alex: the group legend shows only numbers; unclear whether group 2 is the largest or merely first.
- Marcus: nodes are undifferentiated dots; he cannot tell a person from a phone from a car. Blocks the link-chart use case entirely.
- Nadia: cannot tell whether "Full graph" with a funnel icon is a filter or the current selection, or whether a click changes the data or only the view.
- Nadia: density and similar whole-graph numbers mean nothing in her write-up; her yardstick is one picture and three lines in the alert file within ten minutes.
- Morgan: region names ("the panel on the left") are visual; he needs each part to have a name a screen reader announces.
- Privacy line: Alex, Marcus and Dana all read "Nothing has been sent from this project" first and valued it. Alex wants "sent" defined; Dana wants something she can forward to IT, not a grey line. Three voices, but off-topic for this session; recorded here so it is not lost.

## Group-think and artifacts to discount

- Ctrl+Z unanimity was primed. In round 1 Dana announced she would "disagree with whoever says just press Ctrl+Z" before anyone had said it, and every participant then opened round 2 by agreeing with her. No one argued the case for undo, so the group never tested whether a well-labelled undo would satisfy them. Keep theme 3's direction but not its strength; the task-based sessions should measure whether people press a labelled undo, not whether they say they would.
- The saved-list convergence snowballed. It started with Dana and Alex; Morgan and Marcus adopted it in round 3 largely by citing them ("Dana said the same thing", "Alex asked for the same thing"). Count it as two independent voices plus two endorsements.
- Marcus and Morgan reinforced each other's wording almost verbatim. Independent reasons (auditability, screen-reader access), but the specific phrasing should not be read as two separate designs.
- Whether the bar actually fades is an assumption. Nobody saw it disappear; they saw a static storyboard frame and assumed the behaviour. The finding is about the risk they perceive, and it holds either way, but do not report it as observed behaviour.
- Scenario borrowing: "18 accounts" and "18 suppliers" are the storyboard's 18 Les Miserables characters recast in each participant's domain. Nadia herself says she would never have 18 picked. The size of the loss is set by the storyboard, not by their work.
- Mock fidelity: the notice's position (small, in the middle of the graph) and its dark styling are mock choices. Dana's "easy to miss on a laptop" may be about this mock's rendering as much as about any notice.
- Morgan experienced most of the failure storyboard as unlabelled pictures in frames. His comments on the flow reflect the gallery's accessibility, not the app's.
- Several participants said they skimmed the storyboards ("too much text"). Anything they said is missing may exist in a storyboard they did not read; check before treating an absence as a gap.

## What to test next

- Task (no mention of undo): "You have narrowed the graph to a set of nodes and then clicked somewhere that cleared them. Get back to where you were, and tell me whether your filter steps are the same as before." Measure: whether the participant finds the notice before it would fade, whether they can state what was kept, what they press, and success without help.
- Compare two notice wordings with the same persistence: "Selection cleared" versus "18 picked nodes cleared. Filter steps unchanged. Undo restores the selection." Measure whether participants press undo and whether they can predict what it will reverse.
- First-click: "Save these nodes so you can come back to them tomorrow." Does anyone reach the saved sets, and does "frozen" versus "rule" help or stop them?
- Screen-reader run of the same recovery task with the notice under a named heading, to test Morgan's requirement directly rather than on paper.
- Separate task for the one-account path: "The alert names account X. Find it." Measure time to land on the node and where people look first.
