/**
 * @file `@graphty/graphty-element/react`: typed React wrappers for the custom element.
 *
 * React 19 assigns a JSX prop that matches a custom element property as a property rather than
 * an attribute, so a React 19 application needs nothing from this package beyond
 * `import "@graphty/graphty-element"` and the tag. React 18 does not: it stringifies everything,
 * so rich values never arrive and `onNodeClick` is not a thing React knows how to bind. That is
 * what this entry point is for -- `@lit/react` wrappers with the real property names and typed
 * event payloads, plus the upgrade-timing defence a wrapper has to carry.
 *
 * **Nothing of that exists yet**, so this module exports nothing. Building it means taking
 * `@lit/react` as an optional peer dependency and having the element's twenty-three DOM events
 * declared with their `detail` types, neither of which is true today. It is a real module with a
 * real name reserved in the exports map, deliberately empty rather than a wrapper that compiles
 * and mis-binds.
 *
 * A React 18 consumer today attaches listeners with a ref, which is what a wrapper would do for
 * them.
 */

export {};
