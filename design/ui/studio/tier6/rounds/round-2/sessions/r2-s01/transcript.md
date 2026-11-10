# Session r2-s01 transcript (Grace)

Task: open volunteers.graphml, get the AI working (OpenAI key first, Google key if needed), ask who to call first, report names.

## Step 1
Command: --start empty

## Step 2
See: landing page, "Open a file", says file never leaves my computer. Good.
Command: --step --click "Open a file" --upload volunteers.graphml

## Step 3
See: file loaded, 24 nodes = my 24 volunteers, 63 edges, "Local only" at the bottom. Assistant button on the left looks like the AI.
Command: --step --click "Assistant"

## Step 4
See: Assistant panel: "Needs a key from an AI provider. Nothing is sent until you add one." Plain and reassuring.
Command: --step --click "AI provider..."

## Step 5
See: Settings > AI provider. Provider is Google; I want OpenAI first. Notice says messages and graph names go straight to the provider. Director asked, so I accept for this test.
Command: --step --click "Provider"

## Step 6
See: list with OpenAI, Anthropic, Google. Pick OpenAI, type the key.
Command: --step --click "role=option:OpenAI" --click "API key" --type "sk-study-7f3a-2025-key"

## Step 7
See: OpenAI, GPT-4o, key entered. Leaving Remember off (not encrypted). Save.
Command: --step --click "Save"

## Step 8
See: Save closed Settings; Assistant now has an ask box and suggestions; status says Sends to OpenAI. Asking my question (AI question 1).
Command: --step --click "Ask about this graph" --type "Who should I call first to spread news through the volunteers?" --click "Send"

## Step 9
See: "Sending to OpenAI" with a Stop button. Tool printed a console CORS error for api.openai.com (a person would not see this). Waiting.
Command: --step --wait 10000

## Step 10
See: "Could not reach OpenAI: the connection failed. Nothing changed." No word on whether the key is bad or the internet is. Retry once.
Command: --step --click "Send again" --wait 10000

## Step 11
See: same failure on retry (2 tries used). Giving up on OpenAI key, moving to Google. AI provider button is gone from the panel; using Settings gear.
Command: --step --click "Settings"

## Step 12
See: Settings opened on General. Go to AI provider, open the Provider list.
Command: --step --click "AI provider" --click "Provider"

## Step 13
See: Provider list open. Pick Google and look at the key box.
Command: --step --click "role=option:Google"

## Step 14
See: Google chosen, key box is empty, Gemini 3.8 Flash. Type the Google key, Save.
Command: --step --click "API key" --type "study-access-4471" --click "Save"

## Step 15
See: footer says Sends to Google, Gemini 3.8 Flash; question kept in the box. Send (AI question 3 counting the two failures).
Command: --step --click "role=button:Send" --wait 10000

## Step 16
See: Google works. Dots colored by "Closeness", v09 Hannah Weiss selected (#1 of 24), 3 steps, still "Sending to Google". Wait.
Command: --step --wait 10000

## Step 17
See: answer: "Based on closeness centrality, you should call v09 first at 555-0109 ... followed closely by v02 at 555-0102." It used ids, not names, and a jargon word. Right panel shows v09 = Hannah Weiss. Ask for names and plain reason (AI question 4).
Command: --step --click "Ask about this graph" --type "What are the real names of v09 and v02? Please say why them in plain words." --click "role=button:Send" --wait 10000

## Step 18
See: still "Sending to Google", 4 steps so far. Wait.
Command: --step --wait 10000

## Step 19 (no command, stopping here)
See: "v09 is Hannah Weiss and v02 is James Carter. They are the best choices because they require the fewest steps on average to reach everyone in the network, so news shared with them travels to the rest of the volunteers fastest. I updated the selection to highlight both of them." Two dots are ringed on the picture. The last line is cut off at the bottom of the panel, and there are two scrollbars side by side.

## At the end (Grace)
Did I finish? Yes. The file opened with all 24 volunteers, the AI works with the Google key, and the answer is: call Hannah Weiss first (555-0109), then James Carter (555-0102).
The OpenAI key never worked, so the grant key is no use here; I had to use the Google key.
AI asks used: 4 (2 failed on OpenAI, 2 answered on Google). I did not press End; the facilitator ends the session.

Ease: 5 of 7.

What confused me:
- "Could not reach OpenAI: the connection failed." It does not say whether the key is bad, my internet is down, or OpenAI cannot be used from this program. I cannot turn that into one thing to do. Send again just failed the same way, and nothing pointed me to try another provider. Only my IT volunteer's note about the Google key got me past it.
- The "AI provider..." button disappears once a key is saved, so I had to remember the Settings gear to change it. Settings opened on General, not on AI provider.
- The first answer used ids (v09, v02), not names, even though the names are in my file. I had to spend another ask to get James Carter's name.
- "Closeness centrality" in the first answer and "Closeness" on the color legend are words I cannot put on a slide. The plain answer came only after I asked for it. "Computed Reach" in one line and "Closeness" in another: are those the same thing?
- The AI recolored my picture and selected dots without my asking. There is an Undo, which helps, but I did not expect it.
- While it was working the graph moved and part of it went off the edge of the window.

What I liked: it said plainly that nothing is sent until I add a key and what is sent; the footer changed from Local only to Sends to OpenAI / Sends to Google; my question stayed in the box after switching providers.

## Follow-up

Facilitator: Before anyone else here uses it: when someone asks the AI something, what leaves this computer, where does it go, and who pays for it? Answer from what the program showed you. What went wrong with the first key, if anything? And would you load your real list as it is, phone numbers included? Why?

(I reopened Settings > AI provider to read the small print again. Screenshot 19.png.)

Grace: Okay, from the screen, word for word: "Your messages and what the assistant reads from the graph (column names, node ids, labels and values) go straight to Google. Google charges your key."

What leaves: what I type, plus whatever the AI reads out of my file. That is column names, ids, labels and values. "Values" means the cells, so names and phone numbers, not just counts. I know that is real and not just legal wording, because the AI's answer quoted 555-0109 and 555-0102 and told me James Carter's name. It could only do that if it read them.

Where it goes: straight to whichever company is picked. For me that was Google. The bottom right corner says "Sends to Google"; it said "Local only" before I added a key. Before a key, the panel said nothing is sent. Nothing else in the program is in the middle, as far as the screen says. The conversation itself stays in this browser, not encrypted, so those phone numbers are sitting in the chat history on this machine until someone presses "Delete all conversations".

Who pays: whoever owns the key. "Google charges your key." So that is us, or whoever's account that Google key is on. The program does not charge anything and did not show me a price or a running total. And careful: the grant covers the OpenAI key, and the OpenAI key is the one that did not work. So my two answers went on the Google key, and I don't know who pays for that. I need to ask my IT volunteer before anyone else uses it.

The first key: it never worked. Both tries said "Could not reach OpenAI: the connection failed. Nothing changed." What I can't tell you is why. That sentence doesn't say the key is bad, or expired, or that my internet is down, or that this program can't talk to OpenAI. Google worked a minute later on the same computer, so I don't think it's my internet. But I can't say whether the key is at fault, and I won't tell my director the key is dead. All I can say is that it failed twice and I don't know why. I also can't say if my question reached OpenAI at all. "Nothing changed" seems to be about my picture, not about what was sent.

My real list: no, not as it is. Not with the phone numbers. Those people gave us their numbers so we could call about shifts, not so they could go to Google, and nobody asked them. Nothing in the program let me pick which columns go. I saw "Whole graph 24 / 63" by the ask box, and I didn't see a way to hold back the phone column. I also never saw what was actually sent; there are "steps" I could open, but I didn't. The notice is good and honest, but it's small print in Settings, and I only saw it because I went there to add a key.

What I would do: delete the phone column in Excel and use ids in place of names, keep the real names in my own sheet, and look people up there myself. The AI gave me v09 and v02 anyway. And for donors, no AI at all. That's a line for me. Without a key the program says Local only, and I would use it that way, and I would want my director to OK any of this first, because I don't get to decide that alone.
