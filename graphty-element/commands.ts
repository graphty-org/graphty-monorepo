/**
 * @file `@graphty/graphty-element/commands`: the serialisable form of every verb.
 *
 * The plan is that every method on a session is also a command, and every command is also a
 * method: autocomplete is how a stranger and a coding agent both discover an API, and
 * serialisation is what a recipe, a journal, an undo stack, a console and a tool call all need.
 * This entry point is where the serialisable half is published -- the `Command` union, the typed
 * builders that produce one, `parsePattern` and `formatCommand`, and the JSON Schema generated
 * from the union at build time -- so that an agent can be handed the element's whole vocabulary
 * as data rather than as prose.
 *
 * **Nothing of that exists yet**, so this module exports nothing. It is a real module with a
 * real name reserved in the exports map, and it is deliberately empty rather than filled with
 * functions that throw: a stub that compiles and then fails at run time costs a consumer an
 * afternoon, where an empty module costs them one autocomplete.
 *
 * What the element can do today is published as data by
 * `@graphty/graphty-element/catalog`, which an agent can read for the algorithms, layouts,
 * formats, palettes and scales that exist, with every option each one accepts.
 */

export {};
