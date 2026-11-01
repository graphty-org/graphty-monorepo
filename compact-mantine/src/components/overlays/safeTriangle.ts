/**
 * TRY-OUT ONLY (branch try/safe-triangle-demo, never merged): the submenu "safe triangle" from
 * the SubmenuSafeTriangle story, applied to every compact-mantine menu. A submenu stays open
 * while the pointer moves diagonally across other parent rows toward it; a move away from it, or
 * resting on a row for 400 ms, closes it as before.
 */
/** How long the pointer may rest on another parent row before the submenu closes anyway. */
const REST_CLOSE_MS = 400;
const OPEN_SUBMENU_ROW = '[data-sub-menu-item][aria-expanded="true"]';

interface Point {
    x: number;
    y: number;
}

let last: Point | null = null;
let beforeLast: Point | null = null;
/** The parent row the pointer is on while the submenu is kept open for it, and that submenu's row. */
let pending: { row: Element; item: Element } | null = null;
let restTimer = 0;
let releasing = false;

/**
 * The open submenu row in the same safe-triangle menu as `element`, with its submenu.
 * @param element - a row or anything in a parent menu
 * @returns the open submenu row and its submenu, or null
 */
function openSubmenuOf(element: Element): { item: Element; submenu: Element } | null {
    const menu = element.closest("[data-menu-dropdown]");
    const item = menu?.querySelector(OPEN_SUBMENU_ROW);
    const submenu = item ? document.getElementById(item.getAttribute("aria-controls") ?? "") : null;
    return item && submenu ? { item, submenu } : null;
}

/**
 * Whether `p` lies in the triangle from the pointer's previous position to the submenu's near edge.
 * @param p - where the pointer is now
 * @param submenu - the open submenu
 * @returns true when the pointer is heading for the submenu
 */
function headingFor(p: Point, submenu: Element): boolean {
    const from = last && (last.x !== p.x || last.y !== p.y) ? last : beforeLast;
    if (!from) {
        return false;
    }
    const r = submenu.getBoundingClientRect();
    const edgeX = r.left >= from.x ? r.left : r.right;
    const a = from;
    const b = { x: edgeX, y: r.top };
    const c = { x: edgeX, y: r.bottom };
    const cross = (o: Point, u: Point, v: Point): number => (u.x - o.x) * (v.y - o.y) - (u.y - o.y) * (v.x - o.x);
    const d1 = cross(a, b, p);
    const d2 = cross(b, c, p);
    const d3 = cross(c, a, p);
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(hasNeg && hasPos);
}

/** Let the held-back move through: Mantine and compact-mantine close the submenu as they do today. */
function release(): void {
    window.clearTimeout(restTimer);
    if (!pending) {
        return;
    }
    const { row, item } = pending;
    pending = null;
    releasing = true;
    item.dispatchEvent(new MouseEvent("mouseout", { bubbles: true, relatedTarget: row }));
    row.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, relatedTarget: item }));
    releasing = false;
}

/**
 * A move onto another parent row while heading for the open submenu is held back from every other
 * listener (window capture runs first), so nothing closes the submenu or highlights that row.
 * @param event - a mouseover or mouseout anywhere
 */
function holdForTriangle(event: MouseEvent): void {
    if (releasing) {
        return;
    }
    const to = event.type === "mouseover" ? event.target : event.relatedTarget;
    const row = to instanceof Element ? to.closest("[data-menu-item]") : null;
    const open = row ? openSubmenuOf(row) : null;
    if (!row || !open || row === open.item || open.submenu.contains(row)) {
        if (event.type === "mouseover") {
            pending = null;
            window.clearTimeout(restTimer);
        }
        return;
    }
    if (headingFor({ x: event.clientX, y: event.clientY }, open.submenu)) {
        event.stopPropagation();
        pending = { row, item: open.item };
        window.clearTimeout(restTimer);
        restTimer = window.setTimeout(release, REST_CLOSE_MS);
    } else if (pending) {
        pending = null;
    }
}

/**
 * Track the pointer, and close the kept-open submenu when the pointer turns away from it while
 * still on a parent row (no boundary event fires for that).
 * @param event - a pointermove anywhere
 */
function trackPointer(event: PointerEvent): void {
    const p = { x: event.clientX, y: event.clientY };
    if (pending) {
        const open = openSubmenuOf(pending.row);
        if (!open || !headingFor(p, open.submenu)) {
            release();
        } else {
            window.clearTimeout(restTimer);
            restTimer = window.setTimeout(release, REST_CLOSE_MS);
        }
    }
    if (!last || last.x !== p.x || last.y !== p.y) {
        beforeLast = last;
        last = p;
    }
}

/** Install the safe triangle for every menu (window capture runs before the document listeners). */
export function installSafeTriangle(): void {
    window.addEventListener("mouseover", holdForTriangle, true);
    window.addEventListener("mouseout", holdForTriangle, true);
    window.addEventListener("pointermove", trackPointer, true);
}
