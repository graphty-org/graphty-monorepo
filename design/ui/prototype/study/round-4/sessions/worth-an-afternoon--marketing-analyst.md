# Is this file worth an afternoon? -- Jordan, marketing network analyst

Participant: Jordan, a growth-marketing analyst who does "the network stuff" one or two days a
week (Gephi, NodeXL, a colleague's networkx notebook, a listening suite the company already pays
for). Played at laptop width, 1440 by 900.

Task as given by the moderator: "A colleague sent this file. Is it worth an afternoon?"

Screens seen, in order: the start screen, the load step with the scores read as text, the load
step with repeated pairs, the graph after loading, and a glance at the first-look storyboard.
Renders: `shots/tasks/worth-an-afternoon/01-start-screen.png` to `04-frame-at-rest.png`, plus
`shots/record/screens__where-your-data-goes--study.png` and `shots/record/screens__load-step-report--study.png`.

---

## 1. The start screen

> OK. "Open a graph." First thing I'm looking for is import CSV or a drop box. There isn't a drop
> box. There's "Open..." down there under the samples, pretty small, with a folder icon. Fine, I'd
> probably just drag the file onto the window anyway and see what happens -- but nothing on the
> screen tells me dragging works. I'd try it. If it bounced I'd hit Open.
>
> Wait, before I do anything -- this line, "Files stay on this computer. graphty reads them in this
> browser and uploads nothing." That's the question I always have to ask. It's right under the
> title, I didn't have to go looking. OK. That's actually the first time a tool answered that
> before I asked.

She clicks "Where your data goes".

> Oh, this is a whole page. "It is written so you can forward it to whoever approves software
> where you work." Print or save as PDF. Honestly -- that's the thing. That's the email I send IT.
> "Data leaves the browser only through two features, both off until you turn them on: Connect to
> data source and the Assistant." Good. I'm not reading the rest, but I'd forward this. If Legal
> reads that and says fine, I can put CRM data in. That saves me a week of back-and-forth, not an
> afternoon.
>
> Samples: karate club, Les Miserables, protein interactions, bank transfers. None of that is
> mine. I don't load samples, I load my own thing. Skipping.
>
> No price anywhere, no sign-up. I kind of want to know what it costs before I sink time into it.
> No login is good, but "free forever" or "you'll get an invoice in March" -- I don't know which.

## 2. Opening the file -- and what the file actually is

She opens `ppi-core-300-evidence.tsv`.

> ...Proteins. My colleague sent me proteins? "protein_a, protein_b, source, confidence." OK, I
> guess this is Sam's side thing from the data-science team. Whatever -- it's shaped exactly like
> my mention exports. Two account columns, a source column, a score. If it handles this, it
> handles mine. I'm going to read it as if protein_a is an account.
>
> It picked the two ends by itself. Undirected. TSV, header row. I didn't have to tell it any of
> that. Good -- no "define your schema" screen. That's where NodeXL loses people.

The dialog shows "Issues 2" and the confidence column's "Read as" list is open.

> "confidence is read as text: 150 of 2,298 scores are NA." OK, so it noticed the NAs instead of
> just silently making them zero. Tableau would have made them zero and I'd find out in the
> meeting.
>
> The list: "Number, NA as missing -- 2,298 edges; 150 of them with no confidence." "Number, leave
> out the rows with NA -- 2,148 edges; the 150 rows are not loaded." "Text." I like that every
> option tells me the count it ends up with. I don't have to guess what "leave out" does. First
> one. Obviously. I'm not throwing away 150 rows because a score is blank.
>
> There's a table of the NA rows -- line 29, 31, 44. Fine, I can see they're real rows. I'm not
> going to read all 150.
>
> What's "unsettled first" over the columns? Is that a sort? It reads like a warning. I'm skipping
> it.
>
> "Role." Confidence has Role: None. Source has... none yet. What's a role? I'd leave it alone.
> I don't click things I don't understand in an import dialog.

After she picks the number reading, one issue is left.

> "865 pairs appear more than once. Each row is one evidence source for a pair (parallel edges)."
> Parallel edges. OK, in my world that's the same two accounts mentioning each other five times.
> That's not an error, that's the whole point -- that's engagement.
>
> So the options: "Keep each: 2,298 edges" or "Combine into one: 1,262 edges -- One edge per pair
> of proteins, with its highest confidence. The source column is not kept."
>
> Highest? I don't want highest. If I combine, I want how many times. Count of mentions. That's
> the weight. Five mentions beats one mention. There's no "count them" option and no "add them
> up." So I'd keep each, because combining throws away the number I actually care about, and then
> I have no idea if the influence thing later counts five edges as five or as one. It does say
> "A measure that needs one link per pair combines them itself and says so on its result" -- OK,
> fine, but combines them how? Highest again?
>
> At the bottom: "Weight: confidence, not used yet." Not used yet by what? I didn't ask it to
> weight anything. Is it going to weight by confidence automatically when I run something? That
> line makes me nervous rather than calmer.
>
> And "What will load: 300 nodes, 2,298 edges, 150 with no confidence. 2 proteins have no partner:
> GSK3B, NOTCH1." That's the summary I'd paste into Slack to Sam. Honestly that's half of "is it
> worth an afternoon" right there: small, pretty clean, two orphans, 150 blank scores.
>
> Load isn't greyed out even with the warning. Good. I hit Load.

## 3. After loading

> And... there's the hairball. Grey. Every dot the same grey. It's a smaller hairball than usual,
> I can kind of see five or six lumps around the outside, so there are probably clusters. But it's
> not coloured by anything, so I'm squinting.
>
> The labels: "the 12 proteins with the most partners." OK, that's degree. That's the thing that
> just tells me the top twenty are all big. Fine as a default, I guess. At least it says what it
> is instead of just labelling random ones.
>
> Right panel. Statistics. "Loaded: ppi-core-300-evidence.tsv, undirected, NA read as missing,
> repeated pairs kept, no numeric edge column." Wait -- "no numeric edge column"? I just told it
> confidence is a number. Did it forget? Oh -- maybe it means it's not using one as the weight.
> That's the "not used yet" thing again. Two different screens saying two different things about
> the same column and I don't know which one is true. That's my Talkwalker thing, the dashboard
> says 4,000 and the download says 3,100.
>
> Nodes 300, edges 2,298. Density 0.0281 -- I don't care. Connected components 3, 2 isolates --
> that's the two orphans, matches the import. Good, the numbers match between the two screens,
> that I do care about. Degree distribution, little bar chart. Fine.
>
> "Nothing has been sent from this project" top left, with a lock. And "Assistant Off. Nothing is
> sent." on the rail. OK, it keeps saying it. Good.
>
> Now: colour by cluster, size by something, table. That's my two minutes.
>
> Colour -- there's a little palette icon next to "Graph" at the top right. Maybe? "Style stack:
> Base style" with a plus. Style stack is a Photoshop word. I'd click the plus eventually, but I
> have no idea if that's where "colour by community" is.
>
> Clusters -- I don't see the word community or cluster anywhere. There's "Results" with a plus,
> which is empty. There's a lightning bolt on the bottom toolbar with no label. "Change
> overview..." -- overview of what? None of these say "Find influencers" or "Communities." Which of
> these little icons is the analysis? I'd hover the lightning bolt first. If it's a list of
> algorithm names, I pick "Louvain" because I know it from Gephi, but I'd be annoyed.
>
> Left side: "Graphs: Evidence rows." "Sets and paths." "Views." Sets and paths sounds like a
> maths class. Views I'd guess is saved screenshots? Not sure.
>
> Table -- there, bottom strip: "Table 300 nodes, 2,298 edges". It's a thin bar, I almost missed
> it, but it's there and it has counts, so I'd click it. That's what I need for the top-40 list.
> I can't tell from here if I can sort by a score and copy it out, because there's no score yet.
>
> Export. I don't see the word export anywhere on this screen. Not in the panel, not on the
> toolbar. Maybe under the hamburger menu top left. That's the hand-off and it's hidden, or I just
> can't see it. For me that's the one that decides whether I come back.
>
> Screen size -- at laptop width the canvas is fine actually. The panels take about a third. It's
> not the Gephi thing where the graph ends up in a strip.

## 4. The storyboard

> This is a comic strip of someone called Elena opening a Les Miserables file. It's a design
> document. There's a lot of small print. I'm not reading this -- it's not the tool, it's somebody
> explaining the tool.

## 5. Off-topic

> You know the funny thing -- the reason I'd even need this is Brandwatch dropped Instagram half
> the time, so now I get whatever CSV the vendor feels like exporting, with blanks in random
> columns. That NA screen is basically my life. Every export I get has a column that's half
> "N/A".
>
> And what happens with the whole customer base, like two million? Nothing on these screens says.
> I'd assume the browser dies. I'd want to know before I try, not after.

## 6. Verdict

> Is the file worth an afternoon? Honestly, I got the answer in about three minutes without
> running anything: 300 things, 2,298 links, 1,262 real pairs, 150 missing scores, 2 orphans, one
> big connected blob with visible lumps. For proteins, I'm not the person. If it were my mention
> export at that size, yes, it's worth an afternoon, it's small and clean.
>
> Is the TOOL worth an afternoon? Maybe. The data page alone might be worth it, because it's the
> first tool I could actually send to IT. The import is the best import I've used -- it told me
> what each choice does in counts, it didn't make me write a schema, and it caught the NAs. But the
> minute the graph is on screen I'm back to a grey hairball and a bunch of icons I don't
> understand, and I didn't find cluster colours, a size-by, or export in my two minutes. The table
> I found.

**Single Ease Question (1 = very difficult, 7 = very easy): 5.**

> Loading was easy, a 6 or 7. Figuring out what to do after it loaded pulls it down.

**Would she use this instead of her current tool?**

> Not instead. Next to. Instead of Gephi, maybe, for the first look at a file -- the import is
> much better and I don't have to install Java on my manager's laptop. Not instead of Brandwatch;
> we already pay for it and it does clusters, and I haven't seen this do clusters or give me a CSV
> of the top 40 yet. If the next screen gives me "colour by cluster" and a sortable table I can
> export in one click, then we're talking. If it's a list of algorithm names behind a lightning
> bolt, it's Gephi in a browser, which is fine, but it's not a reason to switch.

---

## What worked for her

- The one-line privacy statement on the start screen answered her data question before she asked
  it, and the "Where your data goes" page is something she would forward to IT unchanged.
- The load step detected the file's shape with no schema step, caught the blank scores, and gave
  every choice with the edge count it produces. She trusted it because of the counts.
- The import summary (nodes, edges, blank scores, the two unconnected names) answered most of the
  "is this file worth it" question on its own.
- The numbers matched between the import summary and the Statistics panel (two isolates both
  places), which is the check she runs on every tool.
- Load stayed available with an open caution, so she was not blocked by a warning.
- The canvas stayed a usable size at 1440 by 900.

## Where she stumbled

- **Combining repeated pairs offers only "highest confidence".** For her data, repeats are
  engagement; she wanted a count or a sum as the combined value. With no such option she kept
  every row and then could not tell how a later measure would treat five links between the same
  two accounts. Severity: high for her use.
- **Two screens seem to disagree about the confidence column.** The load step says "Weight:
  confidence, not used yet"; the Statistics line says "no numeric edge column". She read this as
  the tool contradicting itself, which is the exact thing that makes her distrust a tool.
  Severity: high.
- **No task words after loading.** Nothing on the loaded screen says clusters, communities,
  influencers, colour or size. "Results +", an unlabelled lightning bolt, "Change overview...",
  "Style stack" and "Sets and paths" did not tell her where to go. She did not find colour by
  cluster or size by a score within her two-minute window. Severity: high.
- **No visible export on the loaded screen.** She looked for the word export and did not find it;
  the hand-off is her deciding test. Severity: high (could not be tested further on these
  screens).
- **Nothing says drag-and-drop works on the start screen**, and "Open..." is small and below the
  samples. She would have tried dragging anyway. Severity: low.
- **"unsettled first" and "Role" in the load step** read as jargon; she left Role alone without
  knowing what it did. Severity: low.
- **No cost or scale statement.** She wanted to know what it costs and what happens at two
  million rows before investing an afternoon; neither is answered on these screens. Severity:
  medium.
- **The first-look storyboard** read to her as a design document about someone else, not as the
  tool. Severity: none for the product; noted for how the study presents pages.
