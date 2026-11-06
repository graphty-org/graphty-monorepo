// The study tool's name matcher (real.mjs --click "<name>" and its variants), and the facts of a
// refusal it prints, which a replay compares instead of the refusal's wording.
// node --test design/ui/studio/tool/match.test.mjs checks both.
import { NAME_CHARS } from "./measure.mjs";

export const ROLES = [
    "button",
    "link",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "tab",
    "treeitem",
    "switch",
    "option",
    "checkbox",
    "radio",
    "combobox",
    "textbox",
    "searchbox",
];
export const TIP = "[role=tooltip], .mantine-Tooltip-tooltip";
// What a click can land on. CONTROL is a control by its tag or role; an element that is one only by
// a negative tabindex (a modal dialog, a heading the app focuses on navigation, a filter card's
// group) is a container focus is moved to, never a control a person clicks by name
const CONTROL =
    "button,a[href],input,select,textarea,label,tr,[role=button],[role=link],[role=menuitem],[role=menuitemcheckbox],[role=menuitemradio],[role=tab],[role=treeitem],[role=switch],[role=option],[role=row],[role=checkbox],[role=radio],[role=combobox]";
// The control a click names: "<name>", "<name>#2" or "role=<role>:<name>". Exact names before partial
// ones, controls before containers, containers before text, a text box's placeholder only when no
// name matches; a name several controls share is refused with the list of them. With no control of
// that name, a node whose label is drawn on the canvas, at its center.
export async function find(page, raw) {
    let name = raw,
        role = null,
        nth = 0;
    const r = raw.match(/^role=([a-z]+):(.+)$/);
    if (r) [role, name] = [r[1], r[2]];
    const n = name.match(/^(.*\S)#(\d+)$/);
    if (n) [name, nth] = [n[1], +n[2]];
    for (const exact of [true, false]) {
        const locs = role
            ? [page.getByRole(role, { name, exact })]
            : [
                  ...ROLES.map((x) => page.getByRole(x, { name, exact })),
                  page.getByLabel(name, { exact }),
                  page.getByText(name, { exact }),
              ];
        const seen = new Map(); // one entry per control: text inside a button is that button
        let behind = 0; // controls of that name behind an open modal dialog, which a person cannot reach
        // a box is also named by the words it shows: its placeholder, when no accessible name matches
        for (let loc of [...locs, ...(role ? [] : ["placeholder"])]) {
            if (loc === "placeholder") {
                if (seen.size || behind) break;
                loc = page.getByPlaceholder(name, { exact });
            }
            let handles = await loc.filter({ visible: true }).elementHandles();
            // a radio or checkbox drawn only by its label (a segmented control hides its input):
            // the label is what a person sees and clicks
            if (role && !handles.length)
                handles = (
                    await Promise.all(
                        (await loc.elementHandles()).map(async (h) =>
                            (
                                await h.evaluateHandle((e) => (e.labels?.[0]?.checkVisibility() ? e.labels[0] : null))
                            ).asElement(),
                        ),
                    )
                ).filter(Boolean);
            for (const el of handles) {
                const [key, desc, control, kind, container] = await el.evaluate(
                    (e, [tip, chars, sel]) => {
                        // a tooltip bubble, hidden text and the graph's canvas are not controls
                        if (e.closest(`${tip}, [aria-hidden=true], graphty-element, canvas`)) return [null];
                        // with a modal dialog open, only it (and a list or menu it opened) can be used
                        const modal = [...document.querySelectorAll("[aria-modal=true]")]
                            .filter((m) => m.checkVisibility())
                            .pop();
                        if (modal && !modal.contains(e) && !e.closest("[role=listbox],[role=menu]")) return ["behind"];
                        const found = e.closest(`${sel},[tabindex]`);
                        const hit = found || e;
                        // a label and the control it labels are one control to a person
                        const c = hit.tagName === "LABEL" && hit.control ? hit.control : hit;
                        c.dataset.tryKey ??= String((window.__tryKeys = (window.__tryKeys || 0) + 1));
                        const said = (c.getAttribute("aria-label") || c.innerText || c.value || "")
                            .trim()
                            .replace(/\s+/g, " ")
                            .slice(0, chars);
                        const input = { checkbox: "checkbox", radio: "radio", range: "slider" }[c.type] || "textbox";
                        const kind =
                            c.getAttribute("role") ||
                            { TR: "row", A: "link", SELECT: "combobox", TEXTAREA: "textbox", INPUT: input }[
                                c.tagName
                            ] ||
                            c.tagName.toLowerCase();
                        // where a person sees it: an open list or menu sits over the panel behind it
                        const where = c.closest("[role=listbox],[role=menu]") ? " in the open list" : "";
                        const container = found !== null && !found.matches(sel) && found.tabIndex < 0;
                        return [c.dataset.tryKey, `${kind} "${said}"${where}`, found !== null, kind, container];
                    },
                    [TIP, NAME_CHARS, CONTROL],
                );
                if (key === "behind") behind++;
                else if (key && !seen.has(key)) seen.set(key, { el, desc, control, kind, container });
            }
        }
        let all = [...seen.values()];
        // controls before containers before text: a dialog, heading or card whose words include the
        // name gives way to the control that bears it (tier 4: the Server form's dialog took every
        // field's label, the canvas heading the rail's Graph button); words that only read the name
        // (a stat's label and its group) give way to both
        if (all.some((x) => x.control && !x.container)) all = all.filter((x) => x.control && !x.container);
        else if (all.some((x) => x.control)) all = all.filter((x) => x.control);
        if (!all.length && behind)
            return { miss: `nothing in the open dialog is called "${name}" (a control behind the dialog is)` };
        if (!all.length && !role) all = await nodesNamed(page, name, exact);
        if (!all.length) continue;
        if (nth > all.length)
            return {
                miss: `"${raw}": only ${all.length} control${all.length === 1 ? " is" : "s are"} called "${name}" (${all.map((x) => x.desc).join(", ")})`,
            };
        // "#n" picks by position, which a person never sees; among different kinds of control (a
        // panel row and the open list's option) it is refused: in round 2 "weight#2" took the panel
        // row, not the option the participant meant, and threw away a half-made filter step
        const kinds = [...new Set(all.map((x) => x.kind).filter(Boolean))];
        // a shared name is refused, never resolved to the first: in round 1 that clicked the wrong
        // table row (the first of five "Enjolras" cells) and a panel heading for a list row. Among
        // different kinds, each candidate is offered by kind ("role=link:Samples", "#n" only among
        // controls of one kind), because a bare "#n" there is refused below
        if (!nth && all.length > 1)
            return {
                miss: `ambiguous: "${name}" matches ${all.length} controls, so the step did nothing; name one: ${pickNames(role || kinds.length < 2 ? null : name, name, all)}`,
            };
        if (nth && !role && kinds.length > 1)
            return {
                miss: `ambiguous: "${raw}" picks by position among different kinds of control, so the step did nothing; name it by kind: ${kinds.map((k) => `"role=${k}:${name}"`).join(", ")} (${all.map((x) => x.desc).join(", ")})`,
            };
        return all[Math.max(nth, 1) - 1];
    }
    return { miss: `nothing on screen is called "${name}"` };
}
// How to name each of several controls that share a name, in a form the matcher takes: "<name>#n",
// or, when byKind is the name (different kinds share it), "role=<kind>:<name>" with "#n" counted
// only among controls of that kind
function pickNames(byKind, name, all) {
    const seen = {};
    return all
        .map((x, i) => {
            if (!byKind) return `"${name}#${i + 1}" ${x.desc}`;
            const same = all.filter((y) => y.kind === x.kind).length;
            seen[x.kind] = (seen[x.kind] ?? 0) + 1;
            return `"role=${x.kind}:${name}${same > 1 ? `#${seen[x.kind]}` : ""}" ${x.desc}`;
        })
        .join(", ");
}
// Nodes whose label reads <name> and is drawn, on screen: graphty-element's labelOf and nodeScreenPosition
async function nodesNamed(page, name, exact) {
    return page
        .evaluate(
            ([w, exact]) => {
                const el = document.querySelector("graphty-element");
                if (!el || typeof el.labelOf !== "function") return [];
                const box = el.getBoundingClientRect();
                const hits = [];
                for (const node of el.getNodes()) {
                    const label = el.labelOf(node.id);
                    if (!label?.drawn) continue;
                    const text = label.text.trim();
                    if (exact ? text !== w : !text.toLowerCase().includes(w.toLowerCase())) continue;
                    const at = el.nodeScreenPosition(node.id);
                    if (!at?.visible) continue;
                    const x = Math.round(box.x + at.x),
                        y = Math.round(box.y + at.y);
                    hits.push({ at: [x, y], desc: `node "${text}" on the canvas, at ${x},${y}` });
                }
                return hits;
            },
            [name, exact],
        )
        .catch(() => []);
}

// ---------- a refusal's facts, for a replay ----------
// A replay compares what was refused and the candidates offered, never the sentence around them: the
// tool's own wording changed ("Graph#1" became "role=button:Graph") and broke 8 recorded tier 4 walks
// where the app had not changed. A candidate that is not a control (a dialog, a heading, a card's
// group: the matcher no longer offers those beside a control) is left out when a control is offered.
const KINDS = new Set([...ROLES, "row", "slider", "node", "spinbutton"]);
const kindOf = (desc) => desc.match(/^([a-z]+) /)?.[1];
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// "Graph" was refused when recorded; the replay checks the name, never acts (real.mjs, run)
export const resolvedLine = (name, desc) => `"${name}" was refused when recorded; it names ${desc} now; not done`;
// The name a printed line refused, or null
export function refusedName(line) {
    return line.match(/^ambiguous: "(.*?)" (?:matches \d+ controls|picks by position)/)?.[1] ?? null;
}
// One line's facts: `refused "<name>": <candidates, sorted>` for a refusal (in any of its wordings,
// or a name a replay found resolved where the recording refused it); any other line as it is
export function refusalFacts(line) {
    let name, list;
    const one = line.match(/^ambiguous: "(.*?)" matches \d+ controls, so the step did nothing; name one: (.*)$/);
    const pos = line.match(/^ambiguous: "(.*?)" picks by position among different kinds of control, .*? \((.*)\)$/);
    const now = line.match(/^"(.*)" was refused when recorded; it names (.*) now; not done$/);
    if (one) {
        name = one[1];
        // each candidate follows the form that picks it: "Graph#2", "role=button:Graph", "role=row:Ann#2"
        const pick = new RegExp(`(?:^|, )"(?:role=[a-z]+:)?${escape(name)}(?:#\\d+)?" `);
        list = one[2].split(pick).filter(Boolean);
    } else if (pos) {
        name = pos[1];
        list = pos[2].split(/, (?=[a-z]+ ")/);
    } else if (now) [name, list] = [now[1], [now[2]]];
    else return line;
    if (list.some((d) => KINDS.has(kindOf(d)))) list = list.filter((d) => KINDS.has(kindOf(d)));
    return `refused "${name}": ${list.sort().join(" | ")}`;
}
