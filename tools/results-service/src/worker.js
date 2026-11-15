// The results Worker's entry point. workerd takes every named export of the entry module for an entrypoint,
// so the code and its exports live in service.js and this module exports only the handler.
import { handle } from "./service.js";

export default { fetch: (request, env) => handle(request, env) };
