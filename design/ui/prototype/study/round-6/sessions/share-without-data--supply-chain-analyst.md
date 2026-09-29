# Session: share the setup without the data -- Dana Okafor, supply chain risk analyst

Task as given by the moderator: "Share your setup with a partner, without your data."

Screens used: the Export dialog (its "Share the setup, without data" state), the recipe storyboard
(what the person who receives it sees), and the Data panel (where the export starts and where the
sent file is listed afterwards). The mocks are drawn on a lab's protein project and a payments
project; Dana reads them as if it were her supplier project.

## Think-aloud

**Reading the task.** "Partner. OK, for me that is the consultant we brought in for the dual-sourcing
study, or the risk team at our sister plant in Monterrey. They want to see how I flagged the
single-source parts and colored by country. They do NOT get the supplier list. That list is under
NDA with half our suppliers. If this thing can't guarantee that, I'm sending them a screenshot of
my Excel conditional formatting rules and calling it a day."

**Finding where to start (Data panel).** "Left side, Data. There's an Export... button right next to
the word Data. That's where I'd click. I'm not hunting through menus, good." Scrolls down the panel.
"'Applied recipes -- None yet. A recipe is a file of styles, sets or runs, from a colleague or another
project; a file of colors and sizes is a recipe too.' OK, so a 'recipe' is their word for the setup.
Fine. I would never have called it that, but that one grey sentence told me. Small grey text,
though -- I had to lean in on the laptop."

**Opening Export.** Clicks Export... "Big dialog. Left column is a list of what I can make: Figures,
Rows, Report, Graph data... and there, 'Share the setup, without data'. That is literally my task.
Checkbox 'Recipe (.graphty)'. I'd tick that." Ticks it.

**What happens when she ticks it.** "Everything else went grey and there's a bar across the top:
'Figures, images, tables, the report, graph data and the project file are off: they would carry your
data.' OK. I like that it turned the other stuff off instead of letting me also tick Table by
accident and email the whole list. That's the mistake I would actually make at 4:50 on a Thursday."

"Scope is greyed: 'A recipe takes definitions, not a scope of data.' I don't fully get 'definitions'
but I get that it's not taking rows. Moving on."

**Reading the preview (right side).** "'No data inside. No genes, interactions, fold-change values,
positions or notes on genes.' -- in my case that'd say no suppliers, no sites, no spend, I assume.
That's the first line and it's in bold, which is right, because that's the only line my IT person will
read."

"Three columns. 'Travels', 'You supply', 'Not included'. That's a good layout, actually. That's how I'd
explain it to legal."

- "'Not included': 300 proteins, 1,262 interactions -- data. 300 fold-change values -- data. Positions --
  layout. Notes -- notes. For me that column has to say 1,400 suppliers, spend, lead times. If I saw
  my spend column listed under 'Not included' by name, I'd believe it."
- "'You supply': gene symbols to join a table, a fold change, a confidence per interaction. So the
  partner has to bring their own list with their own columns. For Monterrey that's fine, they have
  the same SAP export. For the consultant... they have nothing, they'd open it and get an empty
  screen. That's fine, that's the point. It's a template."
- "'Travels': 3 runs -- PageRank, damping 0.85, Louvain, resolution 1, seed 7. Degree. I don't know
  what any of that is. I'd skip it. Style layers, filter, layout, view -- OK, those I get."

**The part that worries her.** "'1 note, on the confidence filter' -- and it travels. It's a whole
sentence someone typed. Here's my problem: my filter note would say something like 'excluded the
Penang resin supplier because the survey answer was stale.' That's a supplier name. That's the
thing I'm under NDA for. And the filter itself -- if my filter is 'country is not China' fine, but if
it's 'supplier is not Acme Plastics' then the supplier name is IN the setup, isn't it? The preview says
'No data inside' in big letters, but the note text and whatever I typed into a filter or a color rule
is my text, and it's going along. Does it check that? Does it show me the note text before I send it?"
Looks again. "It does show the note text, the whole quote, right there with a bar next to it. OK, so I
could read it. But nothing tells me 'hey, this note mentions something that looks like one of your
suppliers.' It just says No data inside. I'd trust it less than the headline suggests, and I'd open
the file in Notepad before sending it."

**Checking the file.** "'Readable text (JSON)'. OK, so I CAN open it in Notepad and Ctrl+F for our
top twenty supplier names before it goes out. That's actually what I'd do, and that's what IT would ask
me to do. Readable is the right call. If it were some binary blob I wouldn't send it, full stop."

**The name and the footer.** "Name: 'Expression overlay' -- I'd rename it 'Single-source flags Q3'.
Footer: '1 file goes to your Downloads folder. Nothing is uploaded.' Good. That's the second sentence my
IT person reads. Export 1 file. Click."

**After.** Back in the Data panel. "Under 'Saved to this computer': 'Mule ring triage -- Recipe:
definitions, no data, Apr 20.' So it keeps a record that I sent a no-data file and when. Good for when
somebody asks me in three months 'what did you give the consultant?'"

**What the partner sees (storyboard).** "The person who opens it gets a card: 'Expects: a network with
... and your own table of ...' and 'Data stays on this computer.' Then an Apply dialog that tells them
84 of 96 matched and which ones didn't. Honestly, that matching screen is better than what I get from
our own ERP merge. The '2 ids look like spreadsheet dates' thing -- ha, yes, that happens with part
numbers too." Pause. "But the partner needs this graphty thing to open it. 'Opens in graphty or any app
with graphty-element.' I don't know what graphty-element is. Does the consultant need to install
something? Does their IT need to approve it too? That's a second security review, on their side. I
can't send them a file they can't open."

**The Power BI question.** "And none of this goes to Power BI. The setup is only useful to someone who
also runs this tool. For Monterrey, who all live in the same Power BI tenant as me, the natural way to
'share the setup' is to publish the report. This is only a win if they're already using it."

## Single Ease Question

**5 out of 7.** Finding it was easy -- the words on the checkbox group are the words of the task, and
the tool switched the dangerous outputs off for me. I lose points because the headline "No data inside"
is stronger than what it can promise: my own typed notes and filter values go along, and nothing warns
me if they name a supplier. I'd still have to open the file and check it by hand before it leaves the
building. And I'm not sure the other side can even open it.

## Would she use this instead of her current tool?

"For this exact job -- handing someone my method without my list -- yes, I'd use this over what I do
now, which is a screenshot of my Excel rules and a paragraph in an email. The 'Travels / You supply / Not
included' preview is something I could paste into the ticket for IT. But only if the partner already
has the tool and their IT approved it; otherwise it's a file nobody on their side can open, and I'm back
to the screenshot. And it doesn't replace Power BI for anyone inside the company."

## Problems observed

1. **"No data inside" over-promises when typed text travels.** Notes on definitions, and any value
   typed into a filter or a style rule (a supplier name, a site), go along with the recipe. The preview
   shows the note text, but the headline does not qualify it and nothing flags a note or filter value
   that matches a name in her data. Severity: high for her -- NDA data leaking through a note is the one
   failure she cannot afford, and the headline invites her not to look.
2. **The receiver's requirement is unclear.** "Opens in graphty or any app with graphty-element" does
   not tell her whether her partner must install anything or pass their own IT review. She cannot tell
   whether the file is usable at the other end. Severity: medium.
3. **Graph-theory run names in "Travels"** (PageRank damping, Louvain resolution and seed) mean nothing to
   her; she skipped them. Not a blocker for this task, but she cannot confirm what her partner will get.
   Severity: low.
4. **Small grey explanatory text.** The sentence that taught her the word "recipe" (Applied recipes, "None
   yet...") and the row descriptions in the dialog are small grey text; she had to lean in on a 14-inch
   screen. Severity: low.
5. **No route to Power BI.** Sharing a setup only helps partners who run the same tool. Outside the
   tool's reach, but it limits the feature's value to her. Severity: low (not fixable in the dialog).

## What worked

- The group heading "Share the setup, without data" matches the task word for word; no hunting.
- Ticking Recipe turns every data-carrying output off with a one-line reason, which prevents the
  accidental "also ticked Table" mistake.
- The three-column preview (Travels / You supply / Not included) is something she could paste into an
  IT ticket as is.
- "Readable text (JSON)" lets her verify the file herself before it goes out.
- "1 file goes to your Downloads folder. Nothing is uploaded." answers the IT question in one line.
- The Data panel keeps a dated record of the no-data file under "Saved to this computer".
