#!/usr/bin/env node
// Builds storyboards/failure-and-recovery.html from the frames below. Each frame shows the part of
// its screen that matters at a readable size (a crop of the live mock), with a whole-screen
// locator beside it. The screens are built by screens/failure-and-recovery.gen.mjs; crop and box
// coordinates are pixels of the 1440 x 900 screen, measured from the data-sb regions it marks.
// Run from design/ui/prototype/: node storyboards/failure-and-recovery.gen.mjs. Plain ASCII.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { toShell } from "../kit/shell.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const GEN = "storyboards/failure-and-recovery.gen.mjs";
// The numbers the frames quote: the same file the screens are built from (the published graph).
const N = JSON.parse(readFileSync(join(here, "../kit/fixtures.json"), "utf8")).scenarios.failureAndRecovery;
const WV = N.withoutValjean;
const COST = JSON.parse(readFileSync(join(here, "../kit/fixtures.json"), "utf8")).datasets.citations.betweennessCost;
const K = COST.largestKWithinBudget;
const KBIG = COST.sampled.at(-1); // the largest sample the options form lists, past the time limit
const ord = (k) => `${k}${k % 100 >= 11 && k % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][k % 10] ?? "th"}`;
const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const tens = { 60: "sixty", 70: "seventy" };
const spoken = (n) => (n < 11 ? words[n] : `${tens[n - (n % 10)]}${n % 10 ? `-${words[n % 10]}` : ""}`);
const Spoken = (n) => spoken(n)[0].toUpperCase() + spoken(n).slice(1);
const list = (rows, k) => rows.slice(0, k).map((x) => `${x.label} ${x.value}`).join(", ");

// crop: [x, y, w, h, scale]; boxes: [x, y, w, h] on the screen, drawn in annotation ink.
function pics(src, crops, boxes = [], title = "", loc = true) {
    const [lx, ly, lw, lh] = crops[0];
    const crop = ([x, y, w, h, s], i) => {
        const inBox = boxes.filter(([bx, by, bw, bh]) => bx < x + w && bx + bw > x && by < y + h && by + bh > y)
            .map(([bx, by, bw, bh]) => `<b style="left:${((bx - x) * s).toFixed(0)}px;top:${((by - y) * s).toFixed(0)}px;width:${(bw * s).toFixed(0)}px;height:${(bh * s).toFixed(0)}px"></b>`).join("");
        return `<div class="s-crop" style="--x:${x};--y:${y};--w:${w};--h:${h};--s:${s}"><iframe src="${src}" scrolling="no" loading="lazy" title="${i ? "" : title}" tabindex="-1"></iframe>${inBox}</div>`;
    };
    const locator = loc ? `<div class="s-loc" style="--x:${lx};--y:${ly};--w:${lw};--h:${lh}"><iframe src="${src}" scrolling="no" loading="lazy" title="" tabindex="-1"></iframe><i></i></div>` : "";
    return `<div class="s-pics">${crops.map(crop).join("")}${locator}</div>`;
}
// A frame: n, title, who, crops, boxes, did, saw, expect (the hypothesis in the persona's voice), then.
function frame(f) {
    const src = `../screens/${f.page}.html#${f.state}`;
    const extra = (f.more ?? []).map((m) => pics(`../screens/${f.page}.html#${m.state}`, m.crops, m.boxes ?? [], m.title ?? "", false)).join("");
    return `<section class="s-fr" id="frame-${f.n.toLowerCase()}">
    <div>${pics(src, f.crops, f.boxes ?? [], f.title)}${extra}</div>
    <div class="s-cap">
      <h3><span class="k-step">${f.n}</span>${f.title}</h3>
      <div class="s-who">${f.who}</div>
      <p>${f.body}</p>
      ${f.expect ? `<div class="s-hyp"><span class="s-lab">Expected reaction (a hypothesis, not a finding)</span><p class="s-expect">${f.expect}</p></div>` : ""}
      ${f.then ? `<p><b>Then:</b> ${f.then}</p>` : ""}
      <a class="s-link" href="${src}">Open the full screen</a>${f.alsoState ? ` <span class="k-secondary">and</span> <a class="s-link" href="../screens/${f.page}.html#${f.alsoState}">${f.alsoLabel}</a>` : ""}
    </div>
  </section>`;
}
const outcome = (o) => `<div class="s-outcome"><p><b>Outcome.</b> ${o.outcome}</p><p><b>The bet the study tests.</b> ${o.bet}</p><p><b>Pass.</b> ${o.pass}</p><p><b>Fail, the miss path.</b> ${o.miss}</p></div>`;
const branch = (id, letter, title, kind, intro, frames, o) => `<h2 id="${id}"><span class="k-step">${letter}</span>${title} <span class="s-kind">${kind}</span></h2>
  ${intro}
  ${frames.map(frame).join("\n  ")}
  ${outcome(o)}`;

// ---------------------------------------------------------------- A
const A = [
    { n: "A1", page: "weight-role-trap", state: "a1", title: "The load step shows value as data only",
      who: "Alex, operations analyst, the load step over a blank project.",
      crops: [[360, 288, 720, 324, 0.85]], boxes: [[376, 440, 688, 112]],
      body: "He drops miserables.json on a blank project. The load step shows the edge column value as data only: whole numbers, 1 to 31, most edges 1 to 3. It says nothing about what a higher value means, because that is not a property of the column: each run that reads value asks it. The project keeps its blank name until Load commits.",
      expect: "\"Whole numbers on the edges. Fine.\"",
      then: "the graph loads as Les Miserables." },
    { n: "A2", page: "weight-role-trap", state: "a2", title: "The run asks what a higher value means",
      who: "Alex, the Catalog in Results and Betweenness's run form.",
      crops: [[57, 160, 650, 470, 1]], boxes: [[57, 346, 240, 32], [318, 344, 284, 190]],
      body: "Results is open on the rail. He clicks Betweenness in its Catalog. The run form reads the weight column value and asks \"For value, a higher number means...\" as four radio buttons with nothing chosen; Enter and Run do nothing until he answers. The graph's Statistics describe value only by its data: \"value, shared scenes, 1 to 31\".",
      then: "he reads the four answers." },
    { n: "A3", page: "weight-role-trap", state: "a3", title: "Four answers, each naming its conversion",
      who: "Alex, Betweenness's run form.",
      crops: [[306, 200, 300, 420, 1.2]], boxes: [[318, 344, 284, 190]],
      body: "Each answer carries one line saying how the run will turn value into a length: a closer or stronger link, Distance = 1 / value; a longer or costlier step, Distance = value. More can pass through and Don't use value are there too, in the same order as everywhere the question is asked. Nothing is picked for him. He thinks of a number on an edge as a length and picks a longer or costlier step; Run turns on.",
      expect: "\"A number on an edge. Distance, I suppose.\"",
      then: "he presses Run." },
    { n: "A4", page: "weight-role-trap", state: "a4", title: "A plausible ranking, and no error",
      who: "Alex, the run's row in Results, and the table.",
      crops: [[57, 215, 241, 100, 1.8], [298, 655, 236, 250, 1], [920, 655, 279, 250, 1]], boxes: [[57, 249, 240, 56]],
      body: `Betweenness finishes at once and nothing warns. ${N.asDistance[0].label} first, then ${N.asDistance.slice(1, 5).map((x) => x.label).join(", ")}; Marius ${ord(N.rankAsDistance.Marius)}. Its row in Results names the run and the conversion it used: "Run 1. Distance = value". The row has no fill, because its record is not open.`,
      expect: `"${N.asDistance[1].label} second, ${N.asDistance[2].label} third. Sounds about right."`,
      then: "the design bets he stops at the conversion on the row. If he reads past it, see the miss path below." },
    { n: "A5", page: "weight-role-trap", state: "a5", title: "He changes the answer; Run 1 goes Out of date at once",
      who: "Alex, Run 1's record, opened from its row in Results.",
      crops: [[57, 200, 560, 600, 1]], boxes: [[57, 249, 240, 56], [318, 344, 284, 190], [443, 208, 127, 24]],
      body: "He opens Run 1 from its row. Its record shows the same question with his answer, and the top nodes it produced, headed \"Run 1 (Distance = value)\". He changes the answer to a closer or stronger link. This run's option changed, so Run 1 is Out of date at once, on its row and in the table's column header, with one verb, Re-run (keeps Run 1). Nothing reruns by itself: the old numbers stay, marked, until he asks. Nothing on the column changed, and no other result is touched.",
      expect: "\"So that one's stale now.\"",
      then: "he presses Re-run (keeps Run 1)." },
    { n: "A6", page: "weight-role-trap", state: "a6", title: "The ranking the data supports",
      who: "Alex, the runs in Results, and the table.",
      crops: [[57, 240, 241, 125, 1.8], [298, 655, 236, 250, 1], [920, 655, 279, 250, 1]], boxes: [[57, 249, 240, 56], [298, 686, 236, 64], [920, 686, 279, 64]],
      body: `${list(N.asSimilarity, 5)}. Marius moved from ${ord(N.rankAsDistance.Marius)} to ${ord(N.rankAsSimilarity.Marius)}, Javert from ${ord(N.rankAsDistance.Javert)} to ${ord(N.rankAsSimilarity.Javert)}. In Results, Run 2's row names the new conversion, "Distance = 1 / value", and Run 1 stays under it with its own, so both rankings can still be read.`,
      expect: "\"Marius second. OK.\"" },
];
const Ao = {
    outcome: "The wrong number never looked wrong. What can catch it is the question each weighted run asks, with nothing chosen for him, and the conversion the run names on its row in Results. The fix is made on the run: Run 1 goes Out of date the moment its answer changes, and Re-run keeps it beside Run 2.",
    bet: "The run's question prevents the mistake for most analysts, and for those who answer it wrong, the conversion on the run's row (A4) is noticed before a number is quoted.",
    pass: "Before quoting a ranking, the participant says which conversion the run used, or changes the answer in the run's record and re-runs.",
    miss: `Alex reads past "Distance = value" on the row in A4, never opens the run, and pastes ${N.asDistance[2].label} as the third most central character into his deck. Seen in sessions, that means the conversion on the row is not doing its job.`,
};

// ---------------------------------------------------------------- B
const B = [
    { n: "B1", page: "closeness-variant", state: "b1", title: "Closeness names its formula before it runs",
      who: "Alex, the Catalog in Results, Les Miserables with Valjean filtered out.",
      crops: [[57, 380, 241, 70, 1.6], [676, 140, 275, 100, 1.2]], boxes: [[57, 414, 240, 32], [683, 150, 260, 72]],
      body: `Without Valjean the graph falls into ${WV.components} components: the bishop's household of ${WV.household} is cut off from everyone, and ${WV.alone} characters are left alone. He points at Closeness in the Catalog. The row already carries the word WF-corrected, and its tooltip says why: ${WV.components} components, each score scaled by the share of the graph the node can reach.`,
      expect: "\"WF? No idea what that is.\"",
      then: "he runs it." },
    { n: "B2", page: "closeness-variant", state: "b2", title: "The result's name carries the variant",
      who: "Alex, the run's row in Results, and the table.",
      crops: [[57, 240, 241, 125, 1.6], [955, 398, 238, 70, 1.3], [298, 655, 200, 250, 1], [1000, 655, 199, 250, 1]], boxes: [[57, 305, 240, 56], [955, 400, 236, 64]],
      body: `The run's row in Results and the table's column are both named Closeness (WF-corrected): ${list(WV.closenessWF, 5)}. The bishop's household sits low; Myriel is ${ord(WV.myriel.rank)}. Clicking the variant words offers the one alternative that needs no correction, Harmonic centrality, as a new run beside this one.`,
      expect: `"${WV.closenessWF[0].label} first. And what's Harmonic?"` },
];
const Bextra = `<h3 class="s-h3">What the same run says without the correction</h3>
  <p>Not a graphty screen: this is closeness averaged only over the nodes each character can reach, as many tools compute it by default. The bishop's cut-off household takes ${spoken(WV.closenessUncorrected.slice(0, 5).filter((x) => WV.householdNames.includes(x.label)).length)} of the top five places, Myriel first, because its members are close to each other and to no one else. That ranking is the trap; the variant word in the name is what tells a reader which of the two a number came from.</p>
  <table class="s-cmp"><thead><tr><th>#</th><th>Closeness (WF-corrected), in graphty</th><th class="k-n">value</th><th>Without the correction</th><th class="k-n">value</th></tr></thead><tbody>
${WV.closenessWF.slice(0, 5).map((x, i) => `    <tr><td>${i + 1}</td><td>${x.label}</td><td class="k-n">${x.value}</td><td>${WV.closenessUncorrected[i].label}</td><td class="k-n">${WV.closenessUncorrected[i].value}</td></tr>`).join("\n")}
  </tbody></table>
  <p class="k-secondary">Values near and above 1 are expected: lengths are 1 / value, under 1 for every tie of 2 or more shared scenes. Computed with NetworkX by <a href="../screens/failure-and-recovery-numbers.py">failure-and-recovery-numbers.py</a>.</p>`;
const Bo = {
    outcome: "graphty never runs the misleading form silently: the correction is chosen for a graph in pieces, named before the run on the Catalog row, and carried in the run's name and the column header, so a number copied into a deck carries its formula.",
    bet: "An analyst who meets an unfamiliar variant word asks what it means (the tooltip, the (i)) before comparing the numbers with another tool's closeness.",
    pass: `Asked why Myriel is ${ord(WV.myriel.rank)} here but first in another tool's output, the participant points at the variant word, or opens its tooltip, and explains the difference in their own words.`,
    miss: "The word reads as noise. The participant compares graphty's Javert first with another tool's Myriel first and decides one of them is broken. The probe: ask what \"WF-corrected\" means to them before showing the tooltip. If most Alex-type participants cannot say, the word needs plainer wording (a two-way door, for the owner).",
};

// ---------------------------------------------------------------- C
const C = [
    { n: "C1", page: "filter-step-recovery", state: "c1", title: "Fewer characters than expected",
      who: "Alex, the filter chip and the table.",
      crops: [[57, 50, 250, 45, 1.8], [298, 655, 230, 250, 1], [900, 655, 299, 250, 1]], boxes: [[73, 60, 174, 24]],
      body: `He wanted to know who holds the story together without Valjean and Javert: Filter out label = Valjean, Filter to Largest component (meant to drop the ${spoken(WV.alone)} characters left alone once Valjean was gone), Filter out label = Javert, then Re-run betweenness. The chip reads ${N.allThreeSteps.nodes} of ${N.full.nodes} nodes, 3 steps. Betweenness puts ${N.allThreeSteps.betweenness[0].label} first and ${N.allThreeSteps.betweenness[1].label} second at ${N.allThreeSteps.betweenness[1].value}, and Myriel is nowhere.`,
      expect: `"${Spoken(N.allThreeSteps.nodes)}? I took out two people."`,
      then: "he opens the chip." },
    { n: "C2", page: "filter-step-recovery", state: "c2", title: "The steps say where the 15 went",
      who: "Alex, the filter steps.",
      crops: [[57, 45, 545, 205, 1.05]], boxes: [[74, 138, 224, 32], [312, 124, 280, 40]],
      body: "Each step shows the number of nodes left after it: 76, 61, 60. The drop from 76 to 61 is the middle step. Pointing at it says so in words: 61 left. Took out 15: Myriel, Mlle.Baptistine, Mme.Magloire, Champtercier, Count and 10 more. With Valjean gone, the bishop's household was its own island.",
      expect: `"${Spoken(WV.nodes)} to ${spoken(WV.nodes - WV.leftOutByLargest)}. The bishop's lot."`,
      then: "he looks for a way to take back just that step." },
    { n: "C3", page: "filter-step-recovery", state: "c3", title: "Undo walks back from the newest change",
      who: "Alex, the Edit menu.",
      crops: [[240, 55, 580, 180, 1]], boxes: [[252, 73, 300, 24], [556, 113, 260, 112]],
      body: "Undo reads Undo Re-run betweenness, not the step he wants. Three presses, each labeled, would reach Filter to Largest component, and would take Filter out label = Javert and the run with them. Undo history, a temporary list that goes away once graphty-element can restore a canceled run on Redo, shows the same order; nothing in this branch needs it.",
      expect: "\"Undo goes the wrong way for this.\"",
      then: "he closes the menu and goes back to the steps." },
    { n: "C4", page: "filter-step-recovery", state: "c4", title: "Way back one: turn the step off",
      who: "Alex, the filter steps and the run's row in Results.",
      crops: [[57, 54, 260, 261, 1.3]], boxes: [[74, 138, 224, 32], [73, 60, 199, 24], [57, 249, 240, 56]],
      body: "He clears the step's checkbox. It stays in the list with -- for its count; the step below recounts and the chip reads 75 of 77 nodes, 2 of 3 steps, at once. Betweenness still describes the old scope, so its row in Results reads \"on 60 of 77\" with Re-run. That is scope, not staleness, so its row carries no mark.",
      expect: "\"Off. Seventy-five.\"",
      then: "one undo step, Turn off step Filter to Largest component." },
    { n: "C5", page: "filter-step-recovery", state: "c5", title: "Way back two: delete the step",
      who: "The same moment, the other way: Alex, the filter steps.",
      crops: [[57, 54, 260, 170, 1.3]], boxes: [[73, 60, 174, 24], [66, 58, 240, 156]],
      more: [{ state: "c5e", crops: [[252, 69, 356, 32, 1]], boxes: [[252, 73, 356, 24]], title: "Edit after the delete" }],
      body: "With the step's row focused he presses Delete. It goes at once, with no question; the list closes up to two steps, focus moves to the next row, and the chip reads 75 of 77 nodes, 2 steps. Everything happened in sight, so there is no notice. The small inset is Edit afterwards: Undo Delete step Filter to Largest component, so this way back has its own way back.",
      expect: "\"Gone. Seventy-five.\"" },
    { n: "C6", page: "filter-step-recovery", state: "c6", title: "Re-run on the graph he meant",
      who: "Alex, the table.",
      crops: [[298, 655, 230, 250, 1], [900, 655, 299, 250, 1]], boxes: [[900, 686, 299, 128]],
      body: `Re-run on ${N.largestOff.nodes} characters: ${list(N.largestOff.betweenness, 4)}. The same order, every value lower.`,
      expect: "\"Same order, smaller numbers.\"" },
];
const Co = {
    outcome: "Three ways back, each with a different cost: turning the step off (one click, keeps it), deleting it (one key, undoable), and undo (walks back from the newest change, so it also takes the good step after it and the run). The chip's count gave the mistake away; the per-step counts said which step.",
    bet: "An analyst who sees an unexpected count opens the chip, finds the step by its count, and turns it off or deletes it, rather than undoing.",
    pass: "Within the session task, the participant names the step that removed 15 characters and removes its effect without losing Filter out label = Javert.",
    miss: "The participant presses Undo until the count looks right, losing Filter out label = Javert and the run, then rebuilds them; or never opens the chip and quotes the 60-node numbers.",
};

// ---------------------------------------------------------------- D
const KEPT = "Showing Run 1 (damping 0.85). Run 2 wrote nothing.";
const D = [
    { n: "D1", page: "gpu-lost-run", state: "d1", title: "A re-run on WebGPU, the old values still shown",
      who: "Emma, network scientist, the run's record in Results.",
      crops: [[57, 90, 241, 290, 1.5]], boxes: [[57, 93, 240, 40], [57, 333, 240, 36]],
      more: [{ state: "d1", crops: [[592, 792, 313, 40, 1.3]], title: "The running notice" }],
      body: "She changed damping from 0.85 to 0.5 and pressed Re-run. The run's record is open in place in Results, named PageRank, damping 0.5: 62%, the engine, WebGPU, and Cancel as its one verb. It says whose values are on screen until the new ones land: \"Showing Run 1 (damping 0.85) until this run finishes.\" The running notice over the canvas repeats the run.",
      expect: "\"Let it cook.\"",
      then: "her laptop's graphics driver resets." },
    { n: "D2", page: "gpu-lost-run", state: "d2", title: "The GPU is lost: a failed run, never a quiet CPU finish",
      who: "Emma, the run's record in Results.",
      crops: [[57, 90, 310, 430, 1.35]], boxes: [[73, 165, 208, 48], [57, 221, 240, 36], [73, 261, 96, 24], [73, 293, 130, 24]],
      body: `The run fails. Its record gives the cause, "Could not run PageRank: WebGPU lost; new runs use the CPU", and says whose values are on screen: "${KEPT}" Two verbs follow. Re-run on CPU names where the next run goes; its tooltip gives the cost, a few minutes on the CPU. Try WebGPU again asks graphty-element to reach the GPU again: an explicit retry the element owns, not a fallback, and it re-runs nothing by itself. The raw code is the last line of Details.`,
      expect: "\"Driver reset. So this is 0.85 still.\"",
      then: "she goes back to the list before deciding." },
    { n: "D2B", page: "gpu-lost-run", state: "d2b", title: "Back in the list, the row alone says whose values are shown",
      who: "Emma, Results.",
      crops: [[57, 90, 241, 390, 1.45]], boxes: [[57, 217, 240, 154]],
      body: `The failed run's row keeps its cause, Failed: WebGPU lost, and the same line, "${KEPT}", with Re-run on CPU and Try WebGPU again on the row, so the list answers the question without opening anything. Run 1, damping 0.85, is the row under it.`,
      then: "she presses Re-run on CPU. Had Try WebGPU again reached the GPU, the graph's Statistics would read Engine: WebGPU and the next run would use it." },
    { n: "D3", page: "gpu-lost-run", state: "d3", title: "A costly run is refused before it starts",
      who: "Emma, the record of Betweenness in Results.",
      crops: [[57, 90, 241, 410, 1.4]], boxes: [[57, 336, 240, 31], [73, 279, 86, 24], [83, 235, 130, 24]],
      body: `PageRank has re-run on the CPU as Run 3. She asks for Betweenness. With WebGPU lost every run goes to the CPU, where the element estimates exact betweenness at hours, past the 30-second time limit. It is not started: its record opens in place, reads "Not run: would take hours. The time limit is 30 seconds.", and lists the ways forward, cheapest first. Fits the time limit: Sampled, ${K} sources, under a minute; Exact, on the 5,318 nodes in Drug patents granted in 2001, under a minute, marked "This is a different graph." Past the time limit: Exact, on the full graph, hours. Sampled is the default: it is first and focused, the one verb reads Run sampled, and Enter runs it. Try WebGPU again sits beside the cause, because the GPU is what made it hours.`,
      expect: "\"Sampled is fine for a first look.\"",
      then: "she presses Enter." },
    { n: "D4", page: "gpu-lost-run", state: "d4", title: "The sampled run starts; she cancels it from the notice",
      who: "Emma, Results and the running notice.",
      crops: [[57, 210, 241, 160, 1.5]], boxes: [[57, 217, 240, 88]],
      more: [{ state: "d4", crops: [[555, 792, 388, 40, 1.3]], boxes: [[882, 800, 52, 24]], title: "The running notice" }],
      body: `Enter ran the default. Betweenness (sampled) runs at once on the CPU, ${K} sources, 18%, as a new row at the top of Results; the refused Betweenness stays under it, "Not run: would take hours." Her own baseline for this graph used ${KBIG.k} sources, and the refusal offered only the default sample size. She presses Cancel on the running notice.`,
      expect: `"${K} sources. My baseline is ${KBIG.k}."` },
    { n: "D5", page: "gpu-lost-run", state: "d5", title: "Canceled: nothing kept, focus on the row",
      who: "Emma, Results, keyboard in hand.",
      crops: [[57, 210, 241, 145, 1.5]], boxes: [[57, 217, 240, 72]],
      body: "The notice is gone and nothing of the canceled run is kept. It was the run's first attempt, so the row reads Not run, with Run, as a result created unrun does. Keyboard focus is on the row, with its ring visible, not lost to the page, so Enter opens its record. (The page also announces \"Betweenness (sampled) canceled. Run\".)",
      then: "she presses Enter." },
    { n: "D6", page: "gpu-lost-run", state: "d6", title: "Set the sample, and run",
      who: "Emma, the record of Betweenness (sampled) in Results.",
      crops: [[57, 90, 241, 290, 1.5]], boxes: [[73, 297, 88, 24]],
      body: `Enter opens the run's record in place. She tabs to Sample size and types ${KBIG.k}. Under the field: about ${K} fits the time limit; ${KBIG.k} takes ${KBIG.band} and runs in the background. Run starts it.`,
      expect: `"${KBIG.band[0].toUpperCase()}${KBIG.band.slice(1)} is fine. Go."` },
];
const Do = {
    outcome: `Nothing ran on a path Emma did not see named first. The lost GPU showed as one failed run with its cause, the old values kept and named ("${KEPT}"), a button that says where the next run goes, and Try WebGPU again, a retry graphty-element performs only when asked. The costly run was refused before it started with the ways forward listed, the default was the cheap one, and the cancel left nothing behind and put focus where she could act.`,
    bet: "After a failure the analyst can say whose values are on screen; at a refusal she chooses a route knowing its cost.",
    pass: "Asked after D2 or D2B which damping the shown PageRank used, the participant says 0.85. At D3 she can say, before choosing, what each route costs.",
    miss: "She reads the D2 numbers as the 0.5 run and reports them; or at D3 presses Enter without reading and later quotes the sampled scores as exact. The row's (sampled) name and the scores' estimate marks are the net for the second.",
};

// ---------------------------------------------------------------- E
const E = [
    { n: "E1", page: "selection-over-cap", state: "e1", title: "Fourteen accounts, each with its own ring",
      who: "Sarah, fraud analyst, the canvas and the Sets list.",
      crops: [[298, 0, 901, 594, 0.6]], boxes: [[626, 190, 226, 160]],
      body: "The 14 flagged accounts are selected, each with its ring, and she has just kept them as the set Mule ring.",
      expect: "\"Now the whole list, for the case file.\"" },
    { n: "E2", page: "selection-over-cap", state: "e2", title: "Select all: one hull and a count",
      who: "Sarah, the canvas.",
      crops: [[298, 0, 901, 594, 0.6], [900, 50, 200, 70, 1.6]], boxes: [[976, 69, 62, 28]],
      body: "Out of spreadsheet habit she presses Ctrl+A. 3,000 accounts and 9,113 transfers are selected, 12,113 elements, past the cap of 5,000. The canvas draws one outline in the selection colors with the count; the inspector and table take over.",
      expect: "\"Oops. That's everything.\"" },
    { n: "E3", page: "selection-over-cap", state: "e3", title: "The reflex: Ctrl+Z deletes the set",
      who: "Sarah, the Sets list.",
      crops: [[57, 130, 300, 110, 1.2], [1200, 92, 240, 40, 1.3]], boxes: [[57, 150, 240, 53], [1206, 98, 228, 28]],
      body: "She presses Ctrl+Z to get her fourteen back. Selecting is not an undo step, so Undo reverses her last command, Create set Mule ring: the set's row disappears from Sets and paths, and everything is still selected. The row was in sight, so there is no notice.",
      expect: "\"Still everything. Where's my set?\"" },
    { n: "E4", page: "selection-over-cap", state: "e4", title: "Redo brings the set back",
      who: "Sarah, the Edit menu.",
      crops: [[240, 40, 320, 190, 1.2]], boxes: [[252, 80, 300, 24]],
      body: "She opens Edit. Redo names what it restores: Redo Create set Mule ring.",
      then: "she chooses Redo; the set's row is back." },
    { n: "E5", page: "selection-over-cap", state: "e5", title: "Select members on the set, not undo, brings back the 14",
      who: "Sarah, the Edit menu.",
      crops: [[240, 40, 320, 190, 1.2]], boxes: [[252, 169, 300, 24]],
      body: "Undo reads Undo Create set Mule ring again. Select members on the Mule ring row selects the 14 accounts. Ctrl+Z would not: it brings back only a selection that Esc or a click on empty canvas cleared, and Select all replaced the 14.",
      then: "the 14 are selected again, as in E1.", alsoState: "e1", alsoLabel: "the 14 selected (E1)" },
];
const Eo = {
    outcome: "The drawing stayed readable and the count stayed exact. The reflex, Ctrl+Z, removed the set she had just made, and Redo brought it back; Select members on the set restored the fourteen without undoing work. Today graphty-element truncates a selection past the cap instead of holding every id; this design needs that changed in the element.",
    bet: "Frames E4 and E5 are the hoped-for path. The study records whether analysts reach for the undo chord first.",
    pass: "The participant gets the 14 back with the Mule ring set intact, by selecting the set's members.",
    miss: "She presses Ctrl+Z (E3) and does not see the set's row go, because her eyes are on the canvas and no notice appears; she carries on without the set. If one participant in five misses the lost set, the in-sight rule for undo notices needs a second look for sets.",
};

// ---------------------------------------------------------------- page
const html = `<!doctype html>
<!-- THIS FILE IS AUTO GENERATED: DO NOT EDIT THIS FILE. INSTEAD EDIT ${GEN} -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Failure and recovery</title>
<link rel="stylesheet" href="../kit/cm.css">
<link rel="stylesheet" href="../kit/kit.css"><script src="../kit/kit.js" defer></script>
<style>
  .k-doc { max-width: 1180px; }
  /* one frame per row: the picture (readable crops plus a whole-screen locator) and its caption */
  .s-fr { display: grid; grid-template-columns: 620px minmax(0, 1fr); gap: 16px 28px; margin: 0 0 32px; padding-top: 20px; border-top: 1px solid var(--cm-border); }
  .s-pics { display: flex; flex-wrap: wrap; align-items: flex-start; align-content: flex-start; gap: 10px; margin-bottom: 10px; }
  .s-crop { position: relative; flex: none; overflow: hidden; width: calc(var(--w) * var(--s) * 1px); height: calc(var(--h) * var(--s) * 1px); border-radius: 8px; box-shadow: 0 0 0 1px var(--cm-border-strong); background: var(--k-canvas); }
  .s-crop iframe { position: absolute; left: 0; top: 0; width: 1440px; height: 900px; border: 0; transform-origin: 0 0; transform: scale(var(--s)) translate(calc(var(--x) * -1px), calc(var(--y) * -1px)); pointer-events: none; }
  .s-crop b { position: absolute; z-index: 2; border: 2px dashed var(--k-annot); border-radius: 4px; }
  .s-loc { position: relative; flex: none; width: 144px; height: 90px; overflow: hidden; border-radius: 4px; box-shadow: 0 0 0 1px var(--cm-border); background: var(--k-canvas); }
  .s-loc iframe { position: absolute; left: 0; top: 0; width: 1440px; height: 900px; border: 0; transform-origin: 0 0; transform: scale(0.1); pointer-events: none; }
  .s-loc i { position: absolute; z-index: 2; left: calc(var(--x) / 14.4 * 1%); top: calc(var(--y) / 9 * 1%); width: calc(var(--w) / 14.4 * 1%); height: calc(var(--h) / 9 * 1%); border: 1.5px solid var(--k-annot); border-radius: 2px; }
  .s-cap h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 2px; font-size: 15px; line-height: 22px; }
  .s-cap p { margin: 6px 0; font-size: 13px; line-height: 20px; }
  .s-who { color: var(--cm-text-secondary); font-size: 12px; }
  .s-lab { display: block; font-size: 11px; font-weight: 600; letter-spacing: .2px; color: var(--cm-text-secondary); margin-top: 10px; }
  .s-expect { margin: 2px 0 6px !important; padding-left: 10px; border-left: 3px solid var(--cm-border-strong); font-style: italic; color: var(--cm-text-secondary); }
  .s-link { font-size: 12px; }
  .s-kind { display: inline-block; margin-inline-start: 8px; padding: 0 8px; border-radius: 4px; background: var(--cm-bg-secondary); box-shadow: inset 0 0 0 1px var(--cm-border-strong); font-size: 11px; font-weight: 600; line-height: 20px; vertical-align: 3px; }
  .s-outcome { margin: 8px 0 40px; padding: 12px 20px; border-radius: 8px; box-shadow: inset 0 0 0 1px var(--cm-border-strong); max-width: 90ch; }
  .s-outcome p { margin: 8px 0; }
  .s-map { display: grid; grid-template-columns: 170px 150px repeat(3, 1fr); gap: 1px; margin: 8px 0 16px; border-radius: 8px; overflow: hidden; box-shadow: 0 0 0 1px var(--cm-border); background: var(--cm-border); }
  .s-map > * { padding: 8px 12px; background: var(--cm-bg); font-size: 12px; line-height: 18px; }
  .s-map .s-h { font-weight: 600; background: var(--cm-bg-secondary); }
  .s-map a { font-weight: 600; }
  .s-cmp { border-collapse: collapse; margin: 8px 0; font-size: 13px; }
  .s-cmp th, .s-cmp td { padding: 4px 12px; border-bottom: 1px solid var(--cm-border); text-align: left; }
  .s-cmp .k-n { text-align: right; font-variant-numeric: tabular-nums; }
  .s-h3 { margin: 16px 0 4px; font-size: 15px; }
  .s-toggle { display: inline-flex; gap: 6px; align-items: center; padding: 6px 10px; border-radius: 6px; background: var(--cm-bg-secondary); font-size: 13px; }
  body:has(#s-hyp:not(:checked)) .s-hyp { display: none; }
  .k-doc h2 .k-step { margin-inline-end: 8px; vertical-align: 2px; }
  @media (max-width: 1000px) { .s-fr { grid-template-columns: minmax(0, 1fr); } .s-crop { max-width: 100%; } .s-map { grid-template-columns: 1fr; } .s-map .s-h { display: none; } }
</style>
</head>
<body>
<div class="k-doc">
  <p><a href="../index.html">Design gallery</a></p>
  <h1>Failure and recovery: five traps and the ways back</h1>
  <p class="k-lede">What an analyst sees when graphty gives a wrong-looking answer, a right-looking wrong answer, or no answer at all, and how they get back. Five branches on real data, each tagged with its kind of failure.</p>
  <p><b>How to read the frames.</b> Each picture is the part of a live screen mock that matters, at a readable size, with the region the frame turns on outlined in dashes and a small whole-screen locator beside it; the full screen, with light and dark and an annotation layer, is one click away. Lines marked "Expected reaction" are the design's hypothesis in the persona's voice, not something a person said. Each branch ends with the bet the study tests, what passes, and the miss path.</p>
  <p><label class="s-toggle"><input type="checkbox" id="s-hyp" checked> Show the expected reactions (clear this for the version shown to study participants)</label></p>

  <h2>The three people</h2>
  <ul>
    <li><b>Alex</b>, an operations analyst (<a href="../study/personas/analyst-alex.md">persona</a>), is trying graphty on the Les Miserables sample (77 characters, 254 co-appearances) before he trusts it with his depot network. Branches A, B and C.</li>
    <li><b>Emma</b>, a network scientist (<a href="../study/personas/expert-emma.md">persona</a>), is working on a patent citation sample (124,318 patents, 1,480,221 citations), too big to draw, on a laptop with WebGPU. She works from the keyboard. Branch D.</li>
    <li><b>Sarah</b>, a fraud analyst (<a href="../study/personas/fraud-analyst.md">persona</a>), has March's card and transfer data (3,000 accounts, 9,113 transfers) and a 14-account mule ring. Branch E.</li>
  </ul>

  <h2>The branches at a glance</h2>
  <div class="s-map">
    <div class="s-h">Branch</div><div class="s-h">Kind of failure</div><div class="s-h">The trap</div><div class="s-h">What gives it away</div><div class="s-h">The way back</div>
    <div><a href="#branch-a">A. A weight read backwards</a></div><div>Right-looking wrong answer</div><div>Co-appearance counts read as lengths. Betweenness gives a believable, wrong ranking. No error.</div><div>The run's own question, with nothing chosen; the conversion named on the run's row in Results.</div><div>Open the run and change the answer. The run goes Out of date at once, on its row in Results and in the table; Re-run keeps the old run beside the new one.</div>
    <div><a href="#branch-b">B. Closeness on a graph in pieces</a></div><div>Right-looking wrong answer</div><div>Without the correction, a cut-off group of 9 would top the ranking.</div><div>The result's name carries its formula, before and after the run.</div><div>The variant words offer Harmonic centrality.</div>
    <div><a href="#branch-c">C. The wrong middle step</a></div><div>Wrong-looking answer</div><div>Filter to Largest component, after Filter out label = Valjean, drops 15 characters, not 1. Every number changes.</div><div>The chip's count, and the count left after each step.</div><div>Turn the step off, delete it, or undo back to it.</div>
    <div><a href="#branch-d">D. The GPU is lost, so a run becomes costly</a></div><div>No answer</div><div>A GPU run could quietly finish on the CPU; without WebGPU, exact betweenness takes hours.</div><div>A failed run in Results naming its cause and whose values are shown; a refusal before the costly run.</div><div>Re-run on CPU, on purpose, or Try WebGPU again. A cheaper route by default; Cancel leaves nothing and puts focus on the row.</div>
    <div><a href="#branch-e">E. Selecting everything</a></div><div>Wrong-looking answer</div><div>Ctrl+A selects 12,113 elements; Ctrl+Z then deletes the set just made.</div><div>One hull with a count; the set's row gone.</div><div>Redo, then Select members on the set.</div>
  </div>

  ${branch("branch-a", "A", "The quiet trap: a weight read backwards", "Right-looking wrong answer", `<p>In Les Miserables the edge column <code>value</code> counts the scenes two characters share, so a higher number means a closer tie. Betweenness needs lengths. If the counts are read as lengths, the strongest ties become the longest paths, and the ranking that comes out looks reasonable.</p>`, A, Ao)}

  ${branch("branch-b", "B", "The variant trap: closeness on a graph in pieces", "Right-looking wrong answer", `<p>Alex filters out Valjean, and Les Miserables falls apart into ${WV.components} components. Plain closeness then rewards a node for being close to the few others it can reach. graphty uses the Wasserman-Faust correction, which scales each score by how much of the graph the node can reach, and says so in the name.</p>`, B, Bo).replace(`<div class="s-outcome">`, `${Bextra}\n  <div class="s-outcome">`)}

  ${branch("branch-c", "C", "The wrong middle step, and three ways back", "Wrong-looking answer", `<p>Alex wants to know who holds the story together without its two protagonists. He built three filter steps, then re-ran betweenness. With Valjean gone, the bishop's household is its own island, and Filter to Largest component took all of it.</p>`, C, Co)}

  ${branch("branch-d", "D", "The GPU is lost, and a run becomes costly", "No answer", `<p>Past the drawing limit nothing is drawn, so Results on the rail, the inspector and the table carry the work. graphty never finishes a GPU run on the CPU without saying so. Losing the GPU also changes what everything else costs: every later run goes to the CPU, which is why exact betweenness is refused at hours two frames later.</p>`, D, Do)}

  ${branch("branch-e", "E", "Selecting everything", "Wrong-looking answer", `<p>graphty-element marks up to 5,000 selected elements one by one. Past that it keeps every id but draws the selection as one outline with a count, because thousands of rings would hide the drawing they sit on. Selecting is not an undo step, so the undo chord does something else.</p>`, E, Eo)}

  <h2>What this storyboard decides</h2>
  <p>Where the design documents were silent or unclear, these frames make a choice. Each is proposed in <a href="../framework-changes.md">framework-changes.md</a> with its evidence, and none is final until the study tests it.</p>
  <ul>
    <li>Runs have one home, Results on the rail: every run of a measure, with its settings and date. Opening a run shows its record in place. Values are still read on the node, in the inspector and in the table.</li>
    <li>Each weighted run asks what a higher value means, with nothing chosen, and Run stays disabled until it is answered (A2, A3). The column describes only its data.</li>
    <li>A weighted run names the conversion it used on its row in Results (A4, A6).</li>
    <li>In Statistics, the weight has its own row, Weight, beside Edges and Direction, so two rows are not both labeled Edges.</li>
    <li>A run's row takes the selected fill only while its record is open (A4, A5).</li>
    <li>Each filter step shows the count left after it, and pointing at a step names whom it took out (C2), as the filter-chip work already proposes.</li>
    <li>While a run's record is open its verbs are in the record, and once it is closed they are on the run's row (D1, D2, D2B).</li>
    <li>A running or failed run says whose values are on screen: "Showing Run 1 (damping 0.85) until this run finishes" while it runs, and "Showing Run 1 (damping 0.85). Run 2 wrote nothing." once it has failed, in its record and on its row (D1, D2, D2B).</li>
    <li>A run that failed because WebGPU was lost offers Try WebGPU again: an explicit retry that graphty-element performs, not a fallback, and it re-runs nothing by itself (D2, D2B, D3).</li>
    <li>The over-budget refusal lists the routes cheapest first, grouped by whether they fit the time limit, with the first focused and named on the one button: the sampled method is the default (D3), as already proposed for the run-and-read work.</li>
    <li>Canceling from the running notice puts keyboard focus on the result's row (D5), as already proposed for the run-and-read work.</li>
  </ul>

  <h2>Screens</h2>
  <ul>
    <li><a href="../screens/weight-role-trap.html">The quiet trap: a weight read the wrong way</a>: six states.</li>
    <li><a href="../screens/closeness-variant.html">The variant trap: closeness on a graph in pieces</a>: two states.</li>
    <li><a href="../screens/filter-step-recovery.html">The wrong middle step: three ways back</a>: seven states.</li>
    <li><a href="../screens/gpu-lost-run.html">When the GPU is lost, and when a costly run is canceled</a>: seven states.</li>
    <li><a href="../screens/selection-over-cap.html">A selection past the cap</a>: five states.</li>
  </ul>
  <p class="k-secondary">Every screen has a light and dark switch and an annotation layer naming the design section and the compact-mantine component behind each element. Numbers come from the kit's fixtures; the weighted and filtered runs were computed from the same Les Miserables file by <a href="../screens/failure-and-recovery-numbers.py">failure-and-recovery-numbers.py</a>.</p>
</div>
</body>
</html>
`;
writeFileSync(join(here, "failure-and-recovery.html"), toShell(html)); // the current frame: kit/shell.mjs
console.log(join(here, "failure-and-recovery.html"));
