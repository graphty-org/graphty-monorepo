# Is this file worth an afternoon? -- Tom, the recipe recipient

**Participant:** Tom, 52, lab manager of a twelve-person cell biology lab. Twenty years at the
bench, no network training. Receives files from the lab's computational postdoc and reads them;
never builds one. Managed 13-inch laptop, no admin rights, browser zoom at 110 percent, reading
glasses, mild red-green colour weakness. Gives a new tool about two minutes and two attempts.

**Task as given:** "A colleague sent this file. Is it worth an afternoon?" (The same wording as
the previous round.)

**What he was sent:** `ppi-core-300-evidence.tsv`, from the postdoc, with a one-line email: "the
core interaction set, have a look when you can." No screenshot.

**Screens seen (study view, 1440 by 900):**

- Start screen: `shots/tasks/worth-an-afternoon/01-start-screen.png`
- "Where your data goes", which he opened from the start screen: `shots/r6-tom-worth-data-location.png`
- Start screen while he dragged the file over it: `shots/r6-tom-worth-start-drop.png`
- Open dialog, the confidence column: `shots/tasks/worth-an-afternoon/02-load-step-blocked.png`
- Open dialog, repeated pairs: `shots/tasks/worth-an-afternoon/03-load-step-policy.png`
- The loaded graph: `shots/tasks/worth-an-afternoon/04-frame-at-rest.png`

**Outcome:** he opened the file himself with no install, got through the open dialog, and for
the first time could say which number to give the PI: 1,262 pairs of proteins, from 2,298 rows.
He trusted the dialog more than before because each choice said how many rows it would keep. The
graph came up grey again with no word on why, under a title he did not recognise, and a line on
the side panel seemed to contradict a choice he had just made. Verdict: not worth his afternoon;
worth fifteen minutes if the postdoc sends it already coloured. Single Ease Question: 4.

---

## Transcript

### 0. Before the browser

> A .tsv. Double-click, Excel opens it, naturally. protein_a, protein_b, source, confidence.
> Ctrl-End... row 2,299. So 2,298 rows plus the header. I'm writing that on the pad.
>
> Confidence has some NAs. Source says things like "coexpression", "textmining". Nothing turned
> into a date as far as I can see. Close, don't save.
>
> She says open it in graphty. A web page. Fine, no IT ticket.

### 1. Start screen (`01-start-screen.png`)

> "Open a graph." First line: "Files stay on this computer. graphty reads them in this browser and
> uploads nothing." And "Projects are kept in this browser." OK. It's her data, not mine, but if
> this goes anywhere I'm the one who answers for it. "Where your data goes" -- I'll look.

He clicked "Where your data goes" (`r6-tom-worth-data-location.png`).

> "It is written so you can forward it to whoever approves software where you work." That's IT.
> "Print or save as PDF", good, that goes on the ticket. "Files you open are read by this browser
> and are not uploaded. graphty has no account and no server." Clear. Two things send data out,
> both off until you turn them on. I won't turn them on.
>
> "CSV, JSON, GraphML, GEXF, GML, DOT and Pajek files." Mine's a TSV. Tabs. Is that on the list or
> not? It doesn't say. I'll find out the hard way, I suppose.

Back to the start screen.

> Samples. Four pictures. "Protein interactions, 300 proteins." Hers is "ppi-core-300". Same
> thing? It's the one with the colours. No -- it says Samples. Those are examples. I'm not
> presenting someone's example to the PI.
>
> "Open..." It's small, under the pictures. I'll just drag the file from the email, that's what I
> do.

He dragged the attachment from the mail window onto the middle of the page
(`r6-tom-worth-start-drop.png`).

> Wait -- the file's sitting on top of the Protein interactions picture. Is it going to go INTO
> that one? ... No, the line underneath has gone blue and says "Drop to open". OK, it's that one
> that's catching it. I'll move down onto it to be safe. Let go.

### 2. Open dialog, the confidence column (`02-load-step-blocked.png`)

> "Open ppi-core-300-evidence.tsv." So it did read a TSV. Good. Could have just said so on that
> other page.
>
> Format, each row is an edge, ends, direction... all filled in. Not touching them. On the right,
> "Issues 2" with yellow marks. I don't like yellow.
>
> "confidence is read as text: 150 of 2,298 scores are NA."
>
> 2,298. That's my number from Excel. Good. It read everything.

He read the heading. The grey sentence under it ("The rest are numbers between 0 and 1...") he
read only partly, after looking at the menu.

> And there's a menu open. At the top, "confidence: 2,148 numbers, 150 NA." 2,148 plus 150 is
> 2,298. Fine, it adds up.
>
> "Number, NA as missing: 2,298 edges; 150 of them with no confidence."
> "Number, leave out the rows with NA: 2,148 edges; the 150 rows are not loaded."
> "Text: 2,298 edges; confidence labels and filters, but is not a number."
>
> Well, the middle one throws away 150 of her rows. Not doing that. It actually says so, which I
> appreciate -- last time something like this just ate rows and didn't tell me. Between the other
> two... the first one keeps all 2,298 and she clearly meant confidence to be a number, it's zero
> to one. The first one's lit up blue. Text has the tick.
>
> Which is the one it's recommending, the tick or the blue? I think the tick is what it's set to
> now and the blue is where my mouse is. Or it's what it wants. I'll take the first one either way,
> because it keeps all the rows and it's a number. That one I can actually defend.

### 3. Open dialog, repeated pairs (`03-load-step-policy.png`)

> One issue left. "865 pairs appear more than once. Each row is one evidence source for a pair."
> Yes, that's what "source" is. Same pair from databases, text mining, experiments.
>
> "Keep each: 2,298 edges. One edge per row, so a pair reported by three sources is linked three
> times."
> "Combine into one: 1,262 edges. One edge per pair of proteins, with its highest confidence. The
> source column is not kept."
>
> So 1,262 is the number of actual pairs, and 2,298 is the rows. That's the first time that's been
> put to me in plain words. The PI will want the pairs. But "the source column is not kept" --
> that's her column, I'm not losing it. Keep each. It's got the tick already, so I think I'm not
> changing anything.
>
> Down the bottom: "What will load: nodes 300, edges 2,298, with no confidence 150." All three I
> can check. "2 proteins have no partner in the file: GSK3B, NOTCH1. They are loaded unconnected."
> NOTCH1 in a core set with nobody attached? That's a question for her. Writing it down.
>
> "Weight: confidence, not used yet." Don't know what weight is. It says "not used", so it's not
> doing anything to me. Load.
>
> Hang on, behind the dialog. "Recent: Human protein interactions (300 proteins), Sep 21." I have
> never opened this thing in my life. Whose is that? Is that on this laptop? ...Never mind. Load.

He pressed Load.

### 4. The loaded graph (`04-frame-at-rest.png`)

> ...Grey.
>
> The Protein interactions picture on the first page had coloured clumps. This is grey dots, grey
> lines. Did I do that? Was it because I picked the wrong thing on the confidence menu? Or did it
> never have colours?

(The file has nothing that would colour the proteins, so grey is correct. Nothing on the screen
says so.)

> Title at the top: "Human protein interactions." That's not her file name. That's the name from
> that Recent line. So is this hers or is this the one from September 21st? Under it, a little
> tag, "ppi-core-300-..." cut off. And on the left, "Graphs: Evidence rows". I didn't call it
> that. She didn't either, I don't think.

He looked at the right-hand panel, which he would normally skip, because he was hunting for the
file name.

> "Statistics. Loaded: ppi-core-300-evidence.tsv, undirected, NA read as missing, repeated pairs
> kept, no numeric edge column."
>
> OK. That's hers. That's her full file name and it's the two things I just chose -- NA as missing,
> pairs kept. So it did what I told it. Good. That line I'd actually read out.
>
> But then "no numeric edge column". I just told it confidence is a number. That was the whole
> point of the first question. Is it a number or not? Did it take my answer and then throw it
> away? This is the kind of thing where I'd assume I got it wrong.
>
> "Nodes 300 nodes. Edges 2,298 edges (rows). Linked pairs 1,262 linked pairs." Right. That's the
> number for the PI. 1,262 pairs, 300 proteins. And the 2,298 rows match my spreadsheet. The last
> time something like this gave me one number and I didn't know which it was. Here it's both, with
> what each one is. That's the most useful thing on the screen.
>
> "Connected components 3 (2 isolates)." Two isolates -- GSK3B and NOTCH1, the two dots on their
> own, top right and bottom. Consistent. Density, degree distribution, overview General, "Change
> overview..." -- no. Not mine.
>
> "Nothing has been sent from this project." Good. "Assistant Off. Nothing is sent." Good.

The label card:

> "Labels: the 12 proteins with the most partners. 2 more hidden where they overlap." That's a
> sentence. UBB, UBC, HSP90AA1, YWHAZ, MYC, AKT1, TP53, MAPK1... ubiquitin, heat shock, 14-3-3.
> The sticky ones. They're in every network ever drawn. So the middle is the usual suspects.
>
> Now the thing I actually have to answer. There are six or seven clumps round the edge. Are those
> real -- proteasome, ribosome, whatever -- or is that just where the dots landed? That's what the
> PI will ask: "is it clustered, or is that the drawing?" I can see "RPL28" and "RPS8" on one
> clump, that's ribosome, so maybe that one's real. The others have no names. Nothing tells me.
>
> "Force-directed" with a play button. Not pressing that. "Quick actions". No.
>
> And she had a "source" column -- experiments, databases, text mining. That's the thing I'd want
> to see. Which of these lines are experiments and which are some computer reading abstracts. It's
> all the same grey line. It knows the column's there -- it asked me about it. But it doesn't show
> me.

About four and a half minutes in:

> So. It opened, it counted right, and it told me the pairs number, which is more than I usually
> get. But the picture doesn't tell me anything a list of the twelve names wouldn't, and one line
> on the side says the opposite of what I picked. That's one and a half things I don't trust. I'm
> going to email her and ask for the coloured version.

---

## Debrief

**Moderator: On a scale of 1 to 7, how easy was that?**

> Four. Opening it was easy, the dialog was easier than I expected because every choice said how
> many rows I'd end up with, and I could check those against Excel. I only half guessed on the
> first menu -- I still don't know if blue or the tick is the one it wants. Then the picture's grey
> and I don't know why, the title isn't her file, and "no numeric edge column" after I said
> number. Not a disaster. Not easy.

**Moderator: Is it worth an afternoon?**

> Not mine. I can't tell from this whether the clusters are biology or the drawing, and that's the
> only question that matters. If she colours it by what the clumps are, and the lines by where the
> evidence came from, and sends me that, I'd give it fifteen minutes. The counts part I'd use today
> -- 1,262 pairs, 300 proteins, two with no partner. I've already got a question for her about
> NOTCH1 out of it.

**Moderator: Would you use this instead of what you use now?**

> Now is her sending me a PNG and a spreadsheet. For opening something without calling IT, yes,
> I'd rather this than the Java thing. For deciding whether her network is any good, the PNG she
> sends me would have more in it, because she'd have coloured it. So, not instead. Alongside,
> if she does the setting up.

**Moderator: What would you change?**

> I don't know, that's her side. I'd want to know why it's grey. And whether my number answer took.

---

## What the session showed

**Worked for him**

- No install, no sign-in, and the "Where your data goes" page with a PDF to forward to IT.
- While he dragged the file, the Open row lit up and read "Drop to open", which told him where the
  file was going when it was hovering over the Protein interactions sample card.
- Every choice in the open dialog said what it would load in rows he could count: 2,298 edges,
  2,148 edges with 150 rows not loaded, 1,262 edges when combined. He rejected "leave out the
  rows" because it named the 150 rows it would drop, and he chose with reasons rather than by
  colour.
- The difference between rows and pairs was finally said in plain words, in the dialog ("a pair
  reported by three sources is linked three times") and on the graph's panel ("2,298 edges
  (rows)", "1,262 linked pairs"). He left with the number for the PI, which he could not get last
  time.
- The "Loaded:" line on the side panel carried the full file name and his two choices, which is
  how he confirmed the project was the postdoc's file.
- GSK3B and NOTCH1 were named in the dialog and matched "2 isolates" and two lone dots. He wrote a
  question for the postdoc out of it.
- The label card sentence ("the 12 proteins with the most partners").

**Where he stumbled, most serious first**

1. **The graph was grey and nothing said why.** He had just seen the coloured Protein interactions
   sample (also "300 proteins") and wondered whether his confidence choice had removed the
   colour. The file has nothing that colours proteins, but the screen does not say so. This ended
   the session, as in the previous round.
2. **"No numeric edge column" on the Loaded line contradicts the choice he had just made.** He set
   confidence to "Number, NA as missing"; the dialog then said "Weight: confidence, not used yet".
   The graph's Loaded line says "NA read as missing ... no numeric edge column". He read it as the
   tool discarding his answer, and this was the half-failure he counted against it.
3. **The project title is not the file's name and matches a Recent entry he never made.** The
   title reads "Human protein interactions"; a Recent row behind the dialog read "Human protein
   interactions (300 proteins), Sep 21", although he had never used the app, and the start screen
   he came from had no Recent section. The file chip under the title is cut off. The graph row
   says "Evidence rows", a name nobody gave it. He found the file name only on the Loaded line.
4. **Nothing tells him whether the clusters are real or an artefact of the layout.** This is his
   first question about any network he is sent. Only one clump had labels he could recognise.
5. **The source column the dialog asked about is not visible on the graph.** He wanted to see
   which interactions came from experiments and which from text mining; every edge is the same
   grey. He noticed that the tool knew the column (it had asked him about it) but did not show it.
6. **In both dialog menus the tick and the blue highlight sit on different options.** He could not
   tell which one the tool was recommending. The counts carried him through, not the menu's look.
7. **TSV is not in the list of formats on "Where your data goes".** He wondered whether his file
   would open. It did, and the dialog title then showed it read a TSV.
8. **With the file hovering over a sample card, he briefly feared the drop would go into the
   sample.** The "Drop to open" row resolved it, but only because he looked down.

**Single Ease Question:** 4 of 7 (3 in the previous round).

**Instead of his current tool (a PNG and a spreadsheet from the postdoc)?** Not instead. He would
use it to open files without an install and to get the counts, alongside a coloured version the
postdoc prepares.
