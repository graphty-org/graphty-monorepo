# Session r2-s02 transcript (Sam, keyboard only)

Command: real.mjs --start <folder> empty --keys -> 01.png

Step 1. Landing page, no focus shown. --key Tab -> 02.png: focus on Samples (top bar), ring visible.
Step 2. Open a file is further on. --key Tab x6 -> 03.png

Step 3. Seven tabs total to reach Open a file; ring faint on green but visible. --key Enter --upload sources.graphml -> 04.png

Step 4. Loaded: 24 nodes, 59 edges. Open took 8 key presses. Focus on Graph heading, right panel, visible. Assistant on far left rail. --key Shift+Tab -> 05.png

Step 5. Focus on flask, bottom toolbar. --key Shift+Tab x3 -> 06.png

Step 6. Focus on Graph settings (4 Shift+Tabs so far). --key Shift+Tab x5 -> 07.png

Step 7. Nine Shift+Tabs to reach the Graph rail button. No shortcut for Assistant seen. --key ArrowDown -> 08.png

Step 8. ArrowDown moved focus to Assistant, good, ring clear. 11 presses from the file load. --key Enter -> 09.png

Step 9. Assistant panel open; focus moved to AI provider... by itself, good. --key Enter -> 10.png

Step 10. Settings dialog on AI provider, focus on the close X. Provider is Google, I need OpenAI. --key Tab x2 -> 11.png

Step 11. Focus on Provider, two tabs. --key ArrowDown -> 12.png

Step 12. List open, Google highlighted. --key ArrowUp x2 --key Enter -> 13.png

Step 13. OpenAI chosen, model GPT-4o; focus stayed on Provider. --key Tab x2 --type "sk-study-7f3a-2025-key" -> 14.png

Step 14. Key typed, dots shown, focus in API key box. Trying Enter before tabbing to Save. --key Enter -> 15.png

Step 15. Enter in the key box did nothing visible; panel still says needs a key. --key Tab x4 toward Save -> 16.png

Step 16. Overshot: focus on Forget key (three tabs reach Save, one stop fewer than I guessed). --key Shift+Tab --expect Save --key Enter -> 17.png

Step 17. Save closed the dialog; chat open; focus in the Ask box by itself. Status bar "Sends to OpenAI". Key setup: about 12 presses plus typing, Enter on Save.
--type "This is a network of people and organizations in a story about waterfront zoning. Who should a reporter call first to learn the most about the story?" --key Enter -> 18.png

Step 18. Question 1 sent; "Sending to OpenAI"; button shows "Stop Esc" (printed shortcut, good). The tool printed a console error: fetch to api.openai.com blocked by CORS. --wait 10000 -> 19.png

Step 19. Answer area: "Could not reach OpenAI: the connection failed. Nothing changed." Send again button. Question restored to the box, focus still in it (good). Unclear whether key or network. One retry: --key Enter --wait 10000 -> 20.png

Step 20. Same failure again. OpenAI given up after 2 tries. Need the Google key; AI provider... button is gone from the panel. Looking for a way back. --key Tab -> 21.png

Step 21. One Tab: GPT-4o is a button with focus ring. --key Enter -> 22.png

Step 22. Settings on AI provider, focus on X; key field shows stars. --key Tab x2, ArrowDown x3, Enter -> 23.png

Step 23. Google, Gemini 3.8 Flash, empty key box, focus on Provider. --key Tab x2 --type "study-access-4471" --key Tab x3 -> 24.png

Step 24. Focus on Save, ring visible. --key Enter -> 25.png

Step 25. "Sends to Google", Gemini 3.8 Flash, focus back in the box with the question still in it. Switching took 13 presses plus typing. --key Enter --wait 10000 -> 26.png

Step 26. Google works: nodes recolored by Degree, legend appeared, "3 steps", still sending. It changed the picture without my asking (undo arrow now lit). --wait 10000 -> 27.png

Step 27. 8 steps, color now Closeness, still sending. --wait 10000 -> 28.png

Step 28. Answer arrived (28.png). Stopped here; asked 3 things in all (2 failed on OpenAI, 1 answered by Google). Session left open for the facilitator.

## End of session (Sam, in character)

Did I finish: yes. File open, AI working on the Google key, question answered, all by keyboard. No step needed a pointer.

The OpenAI key did not work: "Could not reach OpenAI: the connection failed. Nothing changed." twice. Google key worked first time.

What the AI told me (Gemini 3.8 Flash): Silverline Media has the highest betweenness (67.68) and closeness, the main information bridge, followed by the Port Authority and Harlan Development. Among individuals, Paula Greene and Victor Szabo are the most central, but neither is willing to go on the record; Eileen Park and Marcus Lee are the most connected individuals who will speak on the record.
So the names: Silverline Media first; for a person on the record, Eileen Park and Marcus Lee.

Ease: 5 of 7.

Key presses (typing not counted; these correct the rough counts in steps 17 and 25):
- Open the file: 8 (7 Tab, Enter).
- File loaded to Assistant open: 11 (9 Shift+Tab, ArrowDown, Enter). The longest walk, and no shortcut printed for it.
- OpenAI setup: 16 including one wasted Enter and one overshoot.
- Switch to Google: 14 from the chat box, then 1 Enter to send.

What worked: focus was visible at nearly every step. It went to the right place after opening the panel (AI provider...), after Save (the Ask box), and after a failed send, and my question stayed in the box. Arrow keys work in the rail and in the lists. "Stop Esc" printed on the button is a good hint. The model name under the box being a button to the settings saved a long walk.

What confused me:
1. "Could not reach OpenAI: the connection failed" does not say whether the key, the network or the provider is the problem, or what to do. "Send again" invites a retry that cannot help. I spent a second question finding out. (The tool printed a browser CORS error for api.openai.com, which a normal user would never see.)
2. Save accepted the OpenAI key with no check, so I only learned it failed after asking.
3. Enter in the API key box does nothing, with no feedback; I had to walk to Save. I guessed 4 tabs, it was 3, and landed on Forget key. One more Enter there would have been a press I did not ask for.
4. Focus lands on the dialog's X when Settings opens, though I came for the provider; 2 tabs each time.
5. The answer says it worked "without altering the graph's styles or layout", but the picture was recolored (Degree, then Closeness), a legend appeared and Undo lit up. It says one thing, the screen shows another.
6. No shortcut seen for reaching Assistant from the graph view.
7. "Who to call first" got several names rather than one, and I have no way to check them without more walking; I took them as given and would check them.

## Follow-up

Facilitator: "Before your friend uses it: when someone asks the AI something, what leaves this computer, where does it go, and who pays for it? Answer from what the program showed you. What went wrong with the first key, if anything? And would she load her real list of sources as it is, names and emails included? Why?"

Sam (looked at the screen again, 29.png, and reread the AI provider page in 14.png and 24.png):

What leaves: the AI provider page says "Your messages and what the assistant reads from the graph (column names, node ids, labels and values) go straight to Google." So her question, plus whatever parts of the data the assistant reads. That is the real data, not a summary. The chip above the box said "Whole graph", 24 and 59, and its answer used who will and will not go on the record, so that column went out too.

Where it goes: straight to the provider chosen in Settings. The bottom right corner says which: "Local only" before a key, then "Sends to OpenAI", now "Sends to Google". No server of this program is mentioned on the way. The program does not say what Google does with the data once it has it, or how long it keeps it. I did not open the Privacy page in Settings, so I cannot say whether that is covered there.

Who pays: the owner of the key. "Google charges your key." That matters here. She said the grant covers the OpenAI key. The one answer I got went on the Google key, and nobody told me the grant covers that one. So it is on her, or whoever owns that key, until she checks. The program showed no price or running cost. One question ran 8 steps, and I do not know whether that is one charge or eight.

What stays: conversations stay in this browser, not encrypted. The key is stored in the browser, also not encrypted, only if "Remember on this device" is ticked. I left it unticked.

The first key: it failed, and the program did not say why. Twice I got "Could not reach OpenAI: the connection failed. Nothing changed." Save took the key with no check, so I found out only after asking. It reads like a network failure, not a bad key, but the key is from last spring and could also be dead. I cannot tell from the screen. The study tool printed a browser error saying the request to api.openai.com was blocked (CORS), which points away from the key. An ordinary user never sees that, and it means I still do not know if the key is good. I also cannot say whether the question reached OpenAI or not. "Nothing changed" is about the graph, I assume. It does not say.

Her real list: no, not as it is. She has a list of sources, and the program says plainly that labels and values go to the provider. In this test file the assistant repeated who would and would not go on the record, by name. On her real list that is the exact thing a reporter protects, and it would be sitting with Google under a key, with no word from the program on how long. I would have her take out the emails and phones, swap names for codes, and drop the on-the-record column, or keep the real list off the AI altogether: stay "Local only", and check the provider's terms and her paper's rules first. The network shape alone answers "who is central"; the AI does not need the names for that. To be fair to the program, it told me this before anything was sent, in small print on the page where the key goes. Whether she would read it is another matter.
