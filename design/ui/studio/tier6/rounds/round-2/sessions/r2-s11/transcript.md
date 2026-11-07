# Session r2-s11 -- Grace, nonprofit operations analyst

Task: list of volunteers most likely to quit next quarter, using the AI.

## Step 1 (01.png)
Command: real.mjs --start <folder> setup:connected-volunteers.txt
Notes: Colleague opened the file and connected the AI. Looking at the screen.

## Step 2 (02.png)
Saw 24 nodes, 63 edges, three clusters, no names. "Sends to Google" in the corner worries me.
Command: --step --hover "Sends to Google"
Result: tooltip "Your messages and graph details go to Google. Opens AI provider". Plain words, but names would leave the laptop. Proceeding only because the director asked and a colleague connected it.

## Step 3 (03.png)
Opening Assistant.
Command: --step --click "Assistant"
Saw a chat panel: "Ask about this graph or change it. It can be wrong." Three suggested questions, Gemini 3.8 Flash, Send.

## Step 4 (04.png) -- AI question 1
Asking the director's question as she put it.
Command: --step --click "Ask about this graph" --type "Which volunteers are most likely to quit next quarter? My director wants a list so she can call them first." --click "Send" --wait 10000
Saw "2 steps", "Sending to Google", Stop button. Still working.

## Step 5 (05.png)
Waiting.
Command: --step --wait 10000
Saw: "The graph does not track retention or likelihood to quit. How would you like to identify volunteers to prioritize for outreach?" Options: Lowest logged hours / Untrained status / Fewest network connections. Also a chip "16" and "Show in table". Honest answer. Unclear what 16 means.

## Step 6 (06.png)
Looking at the table before choosing.
Command: --step --click "Show in table"
Saw the table: id, name, role, hours, trained, phone. The 16 selected rows are role = volunteer (of 24). Summary: hours 2 to 35, trained Yes 9 / No 7, phone 10 of 16. No column about leaving. Some have no phone.

## Step 7 (07.png) -- AI question 2 (answering its question)
Choosing the option I can defend in one sentence.
Command: --step --click "Lowest logged hours" --click "Answer" --wait 10000
AI answer: "The 5 volunteers with the lowest logged hours are Ahmed Saleh (2 hrs, 555-0119), Leo Novak (3 hrs), Fatima Diallo (4 hrs, 555-0112), Tobias Becker (6 hrs, 555-0104), and Mei Tanaka (7 hrs, 555-0122). I have selected these 5 volunteers on the graph." Summary: hours 2 to 7, trained No (5), phone 4 of 5. Leo has no phone, matches table.

## Step 8 (08.png)
Checking it against the table by sorting on hours.
Command: --step --click "hours"
Table now "Sorted by hours, highest first". Need lowest first.

## Step 9 (09.png)
Command: --step --click "hours"
Sorted lowest first. Checked by hand: Ahmed Saleh 2, Leo Novak 3, Fatima Diallo 4, Tobias Becker 6, Mei Tanaka 7. All volunteers, all trained = No. Paul Dubois (5) and Seun Okoro (8) are board so rightly out. AI's list is correct for "lowest hours". Next volunteers: Omar Haddad 9, Ivan Petrov 11.

## Step 10 (10.png) -- AI question 3
Asking whether I can tell the director these people are likely to quit.
Command: --step --click "Ask about this graph" --type "Can I tell my director these 5 are the most likely to quit? What does this list really show?" --click "Send" --wait 10000
AI answer: "No, you should not tell your director they are likely to quit, as the data contains no attrition or departure indicators. This list simply shows the 5 volunteers with the fewest logged hours, all of whom happen to be untrained, which may instead indicate they are new or need onboarding support."
("attrition" is a word I would not use with the board, but "departure" sits next to it, so I got it.)

Stopped here. Three AI questions used of about eight. Session left open for the facilitator.

## End of session, in character (Grace)

Did I finish? Yes, but not with the list she asked for, because the file cannot produce that list.

What I would give my director:
"We can't say who is likely to quit: our file has no information about anyone leaving. What I can give you is the five volunteers with the fewest logged hours. All five are also untrained. That might mean they are drifting, or it might just mean they are new and need onboarding, so treat these as check-in calls, not as a quit list."
1. Ahmed Saleh -- 2 hours -- 555-0119
2. Leo Novak -- 3 hours -- no phone on file, needs another way to reach him
3. Fatima Diallo -- 4 hours -- 555-0112
4. Tobias Becker -- 6 hours -- 555-0104
5. Mei Tanaka -- 7 hours -- 555-0122
If she wants more calls, the next volunteers are Omar Haddad (9 hours, 555-0108) and Ivan Petrov (11 hours, no phone showing).
I checked all of this by hand against the table sorted by hours. I would also tell her that the names went to Google through the AI, because I would want her to know that.

How easy: 6 out of 7. A few clicks, plain words, and it told me the truth instead of making up a quit list.

What confused me:
- The first reply showed a blue "16" with no words next to it. I only learned it meant the 16 volunteers by clicking "Show in table".
- The stand-in choices came with no advice on which one is sensible. I picked low hours on my own judgment, and only found out it might not mean much because I asked a further question. The warning would have been better with the list itself, since that first list reads like an answer to my quit question.
- "Hours" does not say over what period (this quarter? all time?). A new volunteer would look low either way, and I could not tell from the screen.
- "Sends to Google" was clear, but it only told me after the file was already connected. The tooltip says graph details go to Google; I cannot tell whether that means phone numbers too. The AI quoted phone numbers back, so I assume it does. That would worry me with donor names.
- Sorting put highest first on the first click; the label under the table made that easy to fix.
- I did not look for a way to copy the five rows into Excel; I would have typed them.

## Follow-up

Looked at the screen again (11.png): table sorted by hours, lowest first, the five rows highlighted, Summary panel on the right.

Facilitator: "How far can she rely on that, and what makes you say so?"

Grace: She can rely on it as a list of who has logged the fewest hours, and no further than that.

The facts she can lean on. The five names, their hours and their phone numbers are right as of this file. I don't have to take the AI's word for that: I sorted the hours column myself and read it off. Ahmed 2, Leo 3, Fatima 4, Tobias 6, Mei 7, all volunteers, all "No" under trained. Paul Dubois at 5 and Seun Okoro at 8 sit in between, but they are board, so leaving them out is correct. The panel on the right agrees: 5 nodes, hours 2 to 7, role volunteer (5), trained No (5), phone 4 of 5. So that part I would put my name on.

What she cannot lean on is that these people are going to quit. Nothing in the file says that. There are six columns: id, name, role, hours, trained, phone. Nobody's start date, last shift, or whether anyone has ever left. The AI said so twice, and I can see it's true by looking at the columns, so that isn't just its opinion. Low hours is a stand-in I chose out of three options, on my own judgment. It could just as easily be picking out new people. All five being untrained points that way as much as it points to drifting, and I can't tell which, because "hours" doesn't say over what period.

And I couldn't tell you the people who really are about to leave aren't further down. Someone with 30 hours who is burned out looks perfectly fine in this file. So she shouldn't take comfort from who is NOT on the list either.

So: good enough to decide who gets a friendly check-in call first, because a wasted call costs ten minutes and hurts nobody. Not good enough to write "at risk" next to anyone's name, tell the board, or plan next quarter's numbers. And before she calls, she should know who started recently, which I'd look up in our own records. The file can't answer that. Also, it's today's file: next quarter's export could change the order.

I wouldn't lean on the AI itself beyond what I checked. Its numbers held up this once, because I checked them, but the panel says "It can be wrong" and its first list read like an answer to the quit question until I pushed on it. The honest warning only came because I asked.
