import { G as f } from "./index-hDuyXkBS.js";
import "./preload-helper-BXl3LOEh.js";
const u = { ok: !1, code: "graphviz.unavailable", params: { package: f, feature: "graphviz" } };
function v() {
    return new Worker(new URL("/assets/worker-_aMBHBU3.js", import.meta.url), {
        type: "module",
        name: "graphty-graphviz",
    });
}
function g(e, l = {}) {
    const s = e.kind === "layout" ? e.engine : null;
    if (typeof Worker > "u") return Promise.resolve(u);
    const { signal: r, timeoutMs: t } = l;
    return r?.aborted === !0
        ? Promise.reject(r.reason)
        : new Promise((i, c) => {
              const a = v();
              let p;
              const n = () => {
                      (clearTimeout(p), r?.removeEventListener("abort", m), a.terminate());
                  },
                  m = () => {
                      (n(), c(r?.reason));
                  };
              (a.addEventListener("message", (o) => {
                  (n(), i(o.data));
              }),
                  a.addEventListener("error", (o) => {
                      (o.preventDefault(),
                          n(),
                          i(
                              e.kind === "probe"
                                  ? u
                                  : {
                                        ok: !1,
                                        code: "graphviz.crashed",
                                        params: { engine: s, message: o.message || "the Graphviz worker stopped" },
                                    },
                          ));
                  }),
                  r?.addEventListener("abort", m, { once: !0 }),
                  t !== void 0 &&
                      Number.isFinite(t) &&
                      (p = setTimeout(() => {
                          (n(), i({ ok: !1, code: "graphviz.timeout", params: { engine: s, ms: t } }));
                      }, t)),
                  a.postMessage(e));
          });
}
let d = null;
function b() {
    return (
        (d ??= g({ kind: "probe" }, { timeoutMs: 3e4 }).then(
            (e) => e.ok,
            () => !1,
        )),
        d
    );
}
export { b as probeGraphviz, g as runGraphviz };
//# sourceMappingURL=host-BwF42rwo.js.map
