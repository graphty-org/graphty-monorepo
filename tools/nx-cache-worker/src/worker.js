// The nx cache Worker's entry point. workerd takes every named export of the entry module for an entrypoint,
// so the code lives in cache.js and this module exports only the handler and the cap counter's Durable Object.
import { handle } from "./cache.js";

export { DailyCount } from "./cap.js";

export default { fetch: (request, env) => handle(request, env) };
