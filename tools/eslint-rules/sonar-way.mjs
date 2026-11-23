/**
 * sonar-way.mjs -- SonarQube's "Sonar way" rules for TypeScript and JavaScript, run by ESLint.
 *
 * The rules SonarQube applied here, in the profile this repository ran (graphty-way: "Sonar way" minus
 * the rules it turned off), each mapped to the ESLint rule SonarJS runs for it: SonarSource's own rules
 * from eslint-plugin-sonarjs, and the rules SonarJS borrows from eslint-plugin-unicorn, typescript-eslint,
 * eslint-plugin-react, eslint-plugin-react-hooks, eslint-plugin-jsx-a11y and ESLint itself. Each rule's
 * comment names its Sonar key, so a "// NOSONAR(Sxxxx)" in old history can be traced to its rule here.
 *
 * Where it applies, as in SonarQube: the main-code rules to every file except tests, and the test rules to
 * tests only. A test is what the retired sonar-project.properties called one (SONAR_TESTS below). A rule the root
 * config already turns on for the same files is not repeated here, so its options stay as they are.
 *
 * Existing findings are held in each package's eslint-suppressions.json (and the repository root's, for
 * tools/, benchmarks/ and the root scripts, linted by tools/lint-root-scripts.mjs), so only a new one fails
 * lint (tools/README.md, "Lint").
 *
 * Left out:
 * - The rules that need type information (sonarWayTypedOff below, S5852 sonarjs/slow-regex among them) on
 *   every file ESLint lints without it: all .js, .mjs and .cjs files, configs, scripts and benchmarks
 *   (eslint.config.js "CONFIGS, SCRIPTS AND BENCHMARKS"), the stories outside their package's tsconfig and
 *   compact-mantine/tests. SonarQube ran them there with types. Giving those files type information (an
 *   allowJs tsconfig, or the project service's allowDefaultProject) would bring the rules back.
 * - Directories the root config ignores, which SonarQube analyzed: .storybook (graphty and compact-mantine
 *   keep it out of every tsconfig, and the others have unfixed findings), each package's examples
 *   (demonstration code), each package's docs (VitePress sites, graph-io/docs/examples among them, so the
 *   per-file exceptions SonarQube had for two of those files are gone too) and webgpu-graph-algorithms/demo
 *   (in no tsconfig on purpose). eslint.config.js gives each one's reason beside its ignore.
 * - The CSS and HTML rules: ESLint lints neither. stylelint is the tool if CSS checks are wanted.
 * - The @angular-eslint rules: there is no Angular code.
 * - S1874 sonarjs/deprecation: off for TypeScript (Deprecated API used), and on JavaScript it needs type
 *   information, which .js files have none of here.
 * - S2259 sonarjs/null-dereference: JavaScript only in the profile, and it needs type information, which .js
 *   files have none of here.
 * - S2301 sonarjs/no-selector-parameter: off for TypeScript (Boolean parameter selects the action), and on
 *   JavaScript it needs type information, which .js files have none of here.
 * - S2699 sonarjs/assertions-in-tests: off for TypeScript (Test has no assertion), and on JavaScript it needs
 *   type information, which .js files have none of here.
 * - S2814 @typescript-eslint/no-redeclare: JavaScript only in the profile, and it is a typescript-eslint rule,
 *   which does not run on .js here (eslint:recommended no-redeclare covers it).
 * - S3403 sonarjs/different-types-comparison: JavaScript only in the profile, and it needs type information,
 *   which .js files have none of here.
 * - S3735 sonarjs/void-use: off for TypeScript (The void operator), and on JavaScript it needs type
 *   information, which .js files have none of here.
 * - S3782 sonarjs/argument-type: JavaScript only in the profile, and it needs type information, which .js
 *   files have none of here.
 * - S3785 sonarjs/in-operator-type-error: JavaScript only in the profile, and it needs type information, which
 *   .js files have none of here.
 * - S3796 sonarjs/array-callback-without-return: JavaScript only in the profile, and it needs type
 *   information, which .js files have none of here.
 * - S3800 sonarjs/function-return-type: JavaScript only in the profile, and it needs type information, which
 *   .js files have none of here.
 * - S3854 "super()" should be invoked appropriately: SonarJS original rule super-invocation is not shipped in
 *   eslint-plugin-sonarjs.
 * - S3863 import/no-duplicates: eslint-plugin-import is not installed.
 * - S4138 @typescript-eslint/prefer-for-of: off for TypeScript (for...of over an index loop), and on
 *   JavaScript it is a typescript-eslint rule, which does not run on .js here.
 * - S6859 import/no-absolute-path: eslint-plugin-import is not installed.
 * - S6861 import/no-mutable-exports: eslint-plugin-import is not installed.
 * - S7060 import/no-self-import: eslint-plugin-import is not installed.
 * - Sonar's "touch it, fix it" band (cognitive complexity 16 to 20 on an edited function): ESLint has no
 *   notion of an edited function. With suppressions, any edit that raises a file's count fails instead.
 */

import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import sonarjs from "eslint-plugin-sonarjs";
import unicorn from "eslint-plugin-unicorn";

/** Test code, as the retired sonar-project.properties sonar.test.inclusions named it. */
const SONAR_TESTS = [
    "**/*.test.{ts,tsx,mjs,js}",
    "**/*.spec.{ts,tsx}",
    "**/*.test-d.ts",
    "**/test/**",
    "**/tests/**",
    "**/stories/**",
    "**/*.stories.{ts,tsx}",
];

/** Files SonarQube did not analyze (sonar.exclusions) that ESLint still reaches. */
const SONAR_EXCLUDED = [
    "**/*.d.ts",
    // tables written by graph-samples/scripts/convert-datasets.mjs
    "graph-samples/src/datasets/**",
    "algorithms/benchmark-results/**",
    // archived research probes, run by nothing
    "webgpu-graph-algorithms/docs/**",
];

const TS = ["**/*.ts", "**/*.tsx"];
const JS = ["**/*.js", "**/*.mjs", "**/*.cjs", "**/*.jsx"];
const plugins = { sonarjs, unicorn };
const jsxPlugins = { react, "react-hooks": reactHooks, "jsx-a11y": jsxA11y };

/**
 * The Sonar rules that need type information. Spread into a block that turns type information off
 * (tseslint.configs.disableTypeChecked turns off only typescript-eslint's), so they are off there
 * rather than silently skipping every file.
 */
export const sonarWayTypedOff = Object.fromEntries(
    [
        "sonarjs/anchor-precedence",
        "sonarjs/arguments-order",
        "sonarjs/bitwise-operators",
        "sonarjs/concise-regex",
        "sonarjs/disabled-auto-escaping",
        "sonarjs/disabled-resource-integrity",
        "sonarjs/duplicates-in-character-class",
        "sonarjs/empty-string-repetition",
        "sonarjs/existing-groups",
        "sonarjs/index-of-compare-to-positive-number",
        "sonarjs/jsx-no-leaked-render",
        "sonarjs/new-operator-misuse",
        "sonarjs/no-alphabetical-sort",
        "sonarjs/no-array-delete",
        "sonarjs/no-associative-arrays",
        "sonarjs/no-async-constructor",
        "sonarjs/no-collection-size-mischeck",
        "sonarjs/no-control-regex",
        "sonarjs/no-empty-after-reluctant",
        "sonarjs/no-empty-alternatives",
        "sonarjs/no-empty-character-class",
        "sonarjs/no-empty-group",
        "sonarjs/no-ignored-return",
        "sonarjs/no-in-misuse",
        "sonarjs/no-invalid-regexp",
        "sonarjs/no-misleading-array-reverse",
        "sonarjs/no-misleading-character-class",
        "sonarjs/no-regex-spaces",
        "sonarjs/no-small-switch",
        "sonarjs/no-try-promise",
        "sonarjs/no-undefined-argument",
        "sonarjs/no-useless-intersection",
        "sonarjs/post-message",
        "sonarjs/prefer-read-only-props",
        "sonarjs/prefer-regexp-exec",
        "sonarjs/reduce-initial-value",
        "sonarjs/single-char-in-character-classes",
        "sonarjs/single-character-alternation",
        "sonarjs/slow-regex",
        "sonarjs/sql-queries",
        "sonarjs/unused-named-groups",
    ].map((rule) => [rule, "off"]),
);

/*
 * Turned off in SonarQube's profile (graphty-way) after a review of every finding, and so not on here
 * (the number is how many findings each had):
 *   sonarjs/no-empty-test-file (S2187): Test file with no test case (17). The files register their cases
 *     through a shared harness or ESLint's RuleTester, which the rule does not follow; Vitest already fails a
 *     file that registers no test.
 *   sonarjs/no-redundant-optional (S4782): Optional property declared with `| undefined` (624). graph-format,
 *     graph-io, webgpu-graph-algorithms and graphty-element typecheck their published types under
 *     exactOptionalPropertyTypes, where `prop?: T | undefined` and `prop?: T` differ; the `| undefined` is
 *     deliberate, and "fixing" it breaks strict consumers who pass undefined.
 *   sonarjs/regex-complexity (S5843): Regular expression too complex (9). Each site is the one regex for a
 *     token of a format's grammar, checked against that format's specification; S5852 (backtracking) stays
 *     on.
 *   unicorn/catch-error-name (S7718): Catch parameter must be named error (6). Error is used where it reads
 *     best; the others say what was caught (cause, passed on as { cause }; reason, state, thrown), and where
 *     error is taken the rule asks for error_, which says less.
 *   unicorn/no-negated-condition (S7735): Negated condition with an else (71). Almost every site is a
 *     presence check (`x !== null ? use(x) : fallback`) that puts the present case first on purpose.
 *   unicorn/no-useless-spread (S7747): Unnecessary spread (21). Every site is `for (const x of
 *     [...collection])`, a copy taken on purpose because the loop adds to or deletes from the collection it
 *     walks.
 */

export default [
    {
        name: "sonar-way/main",
        files: [...TS, ...JS],
        ignores: [...SONAR_TESTS, ...SONAR_EXCLUDED],
        plugins,
        rules: {
            "max-params": ["error", { max: 7 }], // S107 Functions should not have too many parameters
            "new-cap": ["error", { newIsCap: true, capIsNew: false, properties: false }], // S2430 Constructor names should start with an upper case letter
            "no-caller": "error", // S2685 "arguments.caller" and "arguments.callee" should not be used
            "no-constructor-return": "error", // S6635 Constructors should not return values
            "no-extend-native": "error", // S6643 Prototypes of builtin objects should not be modified
            "no-extra-bind": "error", // S6637 Unnecessary calls to ".bind()" should not be used
            "no-lone-blocks": "error", // S1199 Nested code blocks should not be used
            "no-lonely-if": "error", // S6660 If statements should not be the only statement in else blocks
            "no-multi-str": "error", // S1516 Multiline string literals should not be used
            "no-octal-escape": "error", // S6657 Octal escape sequences should not be used
            "no-proto": "error", // S6654 __proto__ property should not be used
            "no-self-compare": "error", // S6679 "Number.isNaN()" should be used to check for "NaN" value
            "no-sequences": "error", // S878 Comma operator should not be used
            "no-unreachable-loop": "error", // S1751 Loops with at most one iteration should be refactored
            "no-useless-call": "error", // S6676 Calls to ".call()" and ".apply()" methods should not be redundant
            "prefer-object-has-own": "error", // S6653 Use Object.hasOwn static method instead of hasOwnProperty
            "prefer-object-spread": "error", // S6661 Object spread syntax should be used instead of "Object.assign"
            "prefer-regex-literals": "error", // S6325 Regular expression literals should be used when possible
            "sonarjs/block-scoped-var": "error", // S2392 Variables should be used in the blocks where they are declared
            "sonarjs/call-argument-line": "error", // S1472 Function call arguments should not start on new lines
            "sonarjs/class-name": ["error", { format: "^[A-Z][a-zA-Z0-9]*$" }], // S101 Class names should comply with a naming convention
            "sonarjs/code-eval": "error", // S1523 Dynamically executing code is security-sensitive
            "sonarjs/cognitive-complexity": ["error", 15], // S3776 Cognitive Complexity of functions should not be too high
            "sonarjs/comma-or-logical-or-case": "error", // S3616 Comma and logical OR operators should not be used in switch cases
            "sonarjs/confidential-information-logging": "error", // S5757 Allowing confidential information to be logged is security-sensitive
            "sonarjs/constructor-for-side-effects": "error", // S1848 Objects should not be created to be dropped immediately without being used
            "sonarjs/content-length": "error", // S5693 Allowing requests with excessive content length is security-sensitive
            "sonarjs/content-security-policy": "error", // S5728 Disabling content security policy fetch directives is security-sensitive
            "sonarjs/cookie-no-httponly": "error", // S3330 Creating cookies without the "HttpOnly" flag is security-sensitive
            "sonarjs/cors": "error", // S5122 Having a permissive Cross-Origin Resource Sharing policy is security-sensitive
            "sonarjs/csrf": "error", // S4502 Disabling CSRF protections is security-sensitive
            "sonarjs/dynamically-constructed-templates": "error", // S7790 Templates should not be constructed dynamically
            "sonarjs/encryption-secure-mode": "error", // S5542 Encryption algorithms should be used with secure mode and padding scheme
            "sonarjs/file-permissions": "error", // S2612 Setting loose POSIX file permissions is security-sensitive
            "sonarjs/file-uploads": "error", // S2598 File uploads should be restricted
            "sonarjs/fixme-tag": "error", // S1134 Track uses of "FIXME" tags
            "sonarjs/for-loop-increment-sign": "error", // S2251 A "for" loop update clause should move the counter in the right direction
            "sonarjs/frame-ancestors": "error", // S5732 Disabling content security policy frame-ancestors directive is security-sensitive
            "sonarjs/function-inside-loop": "error", // S1515 Functions should not be defined inside loops
            "sonarjs/generator-without-yield": "error", // S3531 Generators should explicitly "yield" a value
            "sonarjs/hardcoded-secret-signatures": "error", // S6437 Credentials should not be hard-coded
            "sonarjs/hashing": "error", // S4790 Using weak hashing algorithms is security-sensitive
            "sonarjs/hidden-files": "error", // S5691 Statically serving hidden files is security-sensitive
            "sonarjs/insecure-cookie": "error", // S2092 Creating cookies without the "secure" flag is security-sensitive
            "sonarjs/insecure-jwt-token": "error", // S5659 JWT should be signed and verified with strong cipher algorithms
            "sonarjs/label-position": "error", // S1439 Only "while", "do", "for" and "switch" statements should be labeled
            "sonarjs/link-with-target-blank": "error", // S5148 Authorizing an opened window to access back to the originating window is security-sensitive
            "sonarjs/max-switch-cases": "error", // S1479 "switch" statements should not have too many "case" clauses
            "sonarjs/misplaced-loop-counter": "error", // S1994 "for" loop increment clauses should modify the loops' counters
            "sonarjs/no-all-duplicated-branches": "error", // S3923 All branches in a conditional structure should not have exactly the same implementation
            "sonarjs/no-angular-bypass-sanitization": "error", // S6268 Disabling Angular built-in sanitization is security-sensitive
            "sonarjs/no-case-label-in-switch": "error", // S1219 "switch" statements should not contain non-case labels
            "sonarjs/no-clear-text-protocols": "error", // S5332 Using clear-text protocols is security-sensitive
            "sonarjs/no-commented-code": "error", // S125 Sections of code should not be commented out
            "sonarjs/no-dead-store": "error", // S1854 Unused assignments should be removed
            "sonarjs/no-delete-var": "error", // S3001 "delete" should be used only with object properties
            "sonarjs/no-duplicated-branches": "error", // S1871 Two branches in a conditional structure should not have exactly the same implementation
            "sonarjs/no-element-overwrite": "error", // S4143 Collection elements should not be replaced unconditionally
            "sonarjs/no-empty-collection": "error", // S4158 Empty collections should not be accessed or iterated
            "sonarjs/no-equals-in-for-termination": "error", // S888 Equality operators should not be used in "for" loop termination conditions
            "sonarjs/no-fallthrough": "error", // S128 Switch cases should end with an unconditional "break" statement
            "sonarjs/no-global-this": "error", // S2990 The global "this" object should not be used
            "sonarjs/no-globals-shadowing": "error", // S2137 Special identifiers should not be bound or assigned
            "sonarjs/no-gratuitous-expressions": "error", // S2589 Boolean expressions should not be gratuitous
            "sonarjs/no-hardcoded-ip": "error", // S1313 Using hardcoded IP addresses is security-sensitive
            "sonarjs/no-hardcoded-passwords": "error", // S2068 Hard-coded passwords are security-sensitive
            "sonarjs/no-hardcoded-secrets": "error", // S6418 Hard-coded secrets are security-sensitive
            "sonarjs/no-hook-setter-in-body": "error", // S6442 React's useState hook should not be used directly in the render function or body of a component
            "sonarjs/no-identical-conditions": "error", // S1862 "if/else if" chains and "switch" cases should not have the same condition
            "sonarjs/no-identical-expressions": "error", // S1764 Identical expressions should not be used on both sides of a binary operator
            "sonarjs/no-identical-functions": "error", // S4144 Functions should not have identical implementations
            "sonarjs/no-ignored-exceptions": "error", // S2486 Exceptions should not be ignored
            "sonarjs/no-internal-api-use": "error", // S6627 Users should not use internal APIs
            "sonarjs/no-intrusive-permissions": "error", // S5604 Using intrusive permissions is security-sensitive
            "sonarjs/no-invariant-returns": "error", // S3516 Function returns should not be invariant
            "sonarjs/no-inverted-boolean-check": "error", // S1940 Boolean checks should not be inverted
            "sonarjs/no-ip-forward": "error", // S5759 Forwarding client IP address is security-sensitive
            "sonarjs/no-labels": "error", // S1119 Labels should not be used
            "sonarjs/no-literal-call": "error", // S6958 Literals should not be used as functions
            "sonarjs/no-mime-sniff": "error", // S5734 Allowing browsers to sniff MIME types is security-sensitive
            "sonarjs/no-mixed-content": "error", // S5730 Allowing mixed-content is security-sensitive
            "sonarjs/no-nested-assignment": "error", // S1121 Assignments should not be made from within sub-expressions
            "sonarjs/no-nested-template-literals": "error", // S4624 Template literals should not be nested
            "sonarjs/no-os-command-from-path": "error", // S4036 Searching OS commands in PATH is security-sensitive
            "sonarjs/no-parameter-reassignment": "error", // S1226 Initial values of parameters, caught exceptions, and loop variables should not be ignored
            "sonarjs/no-primitive-wrappers": "error", // S1533 Wrapper objects should not be used for primitive types
            "sonarjs/no-redundant-assignments": "error", // S4165 Assignments should not be redundant
            "sonarjs/no-redundant-boolean": "error", // S1125 Boolean literals should not be used in comparisons
            "sonarjs/no-redundant-jump": "error", // S3626 Jump statements should not be redundant
            "sonarjs/no-referrer-policy": "error", // S5736 Disabling strict HTTP no-referrer policy is security-sensitive
            "sonarjs/no-same-line-conditional": "error", // S3972 Conditionals should start on new lines
            "sonarjs/no-table-as-layout": "error", // S5257 HTML "<table>" should not be used for layout purposes
            "sonarjs/no-unenclosed-multiline-block": "error", // S2681 Multiline blocks should be enclosed in curly braces
            "sonarjs/no-uniq-key": "error", // S6486 JSX list components keys should match up between renders
            "sonarjs/no-unsafe-unzip": "error", // S5042 Expanding archive files without controlling resource consumption is security-sensitive
            "sonarjs/no-unthrown-error": "error", // S3984 Errors should not be created without being thrown
            "sonarjs/no-unused-collection": "error", // S4030 Collection contents should be used
            "sonarjs/no-use-of-empty-return-value": "error", // S3699 The return value of void functions should not be used
            "sonarjs/no-useless-catch": "error", // S2737 "catch" clauses should do more than rethrow
            "sonarjs/no-useless-increment": "error", // S2123 Values should not be uselessly incremented
            "sonarjs/no-useless-react-setstate": "error", // S6443 React state setter function should not be called with its matching state variable
            "sonarjs/no-weak-cipher": "error", // S5547 Cipher algorithms should be robust
            "sonarjs/no-weak-keys": "error", // S4426 Cryptographic keys should be robust
            "sonarjs/non-existent-operator": "error", // S2757 Non-existent operators '=+', '=-' and '=!' should not be used
            "sonarjs/object-alt-content": "error", // S5264 "<object>" tags should provide an alternative content
            "sonarjs/os-command": "error", // S4721 Using shell interpreter when executing OS commands is security-sensitive
            "sonarjs/prefer-default-last": "error", // S4524 "default" clauses should be last
            "sonarjs/prefer-while": "error", // S1264 A "while" loop should be used instead of a "for" loop
            "sonarjs/production-debug": "error", // S4507 Delivering code in production with debug features activated is security-sensitive
            "sonarjs/pseudo-random": "error", // S2245 Using pseudorandom number generators (PRNGs) is security-sensitive
            "sonarjs/publicly-writable-directories": "error", // S5443 Using publicly writable directories is security-sensitive
            "sonarjs/review-blockchain-mnemonic": "error", // S7639 Wallet phrases should not be hard-coded
            "sonarjs/session-regeneration": "error", // S5876 A new session should be created during user authentication
            "sonarjs/stateful-regex": "error", // S6351 Regular expressions with the global flag should be used with caution
            "sonarjs/strict-transport-security": "error", // S5739 Disabling Strict-Transport-Security policy is security-sensitive
            "sonarjs/table-header": "error", // S5256 Tables should have headers
            "sonarjs/table-header-reference": "error", // S5260 Table cells should reference their headers
            "sonarjs/todo-tag": "error", // S1135 Track uses of "TODO" tags
            "sonarjs/unverified-certificate": "error", // S4830 Server certificates should be verified during SSL/TLS connections
            "sonarjs/unverified-hostname": "error", // S5527 Server hostnames should be verified during SSL/TLS connections
            "sonarjs/updated-loop-counter": "error", // S2310 Loop counters should not be assigned within the loop body
            "sonarjs/x-powered-by": "error", // S5689 Disclosing fingerprints from web application technologies is security-sensitive
            "sonarjs/xml-parser-xxe": "error", // S2755 XML parsers should not be vulnerable to XXE attacks
            "unicorn/consistent-date-clone": "error", // S7719 Date objects should be cloned directly without calling "getTime()"
            "unicorn/consistent-empty-array-spread": "error", // S7720 Ternary expressions in array spreads should use consistent types
            "unicorn/consistent-function-scoping": ["error", { checkArrowFunctions: false }], // S7721 Functions should be moved to the highest possible scope
            "unicorn/dom-node-dataset": "error", // S7761 Data attributes should be accessed using ".dataset"
            "unicorn/error-message": "error", // S7722 Built-in error objects should have meaningful messages
            "unicorn/new-for-builtins": "error", // S7723 Built-in constructors should be called consistently with or without "new"
            "unicorn/no-abusive-eslint-disable": "error", // S7724 ESLint disable comments should specify which rules to disable
            "unicorn/no-accessor-recursion": "error", // S7725 Getters and setters should not recursively access the same property
            "unicorn/no-anonymous-default-export": "error", // S7726 Default exports should be named
            "unicorn/no-array-callback-reference": "error", // S7727 Function references should not be passed directly to iterator methods
            "unicorn/no-array-method-this-argument": "error", // S7729 Array method callbacks should not use the "thisArg" parameter
            "unicorn/no-instanceof-builtins": "error", // S7732 "instanceof" should not be used with built-in objects
            "unicorn/no-invalid-fetch-options": "error", // S7733 HTTP GET and HEAD requests should not include a request body
            "unicorn/no-named-default": "error", // S7734 Default imports and exports should use the dedicated syntax
            "unicorn/no-negation-in-equality-check": "error", // S7736 Negated expressions should not be used in equality checks
            "unicorn/no-object-as-default-parameter": "error", // S7737 Objects should not be used as default parameters
            "unicorn/no-single-promise-in-promise-methods": "error", // S7738 Single-element arrays should not be passed to Promise methods
            "unicorn/no-thenable": "error", // S7739 Objects should not have a "then" property
            "unicorn/no-this-assignment": "error", // S7740 Variables should not be assigned the value of "this"
            "unicorn/no-typeof-undefined": "error", // S7741 "typeof" should not be used to check for "undefined"
            "unicorn/no-unnecessary-polyfills": "error", // S7742 Polyfills should not be used when native support is available in target environments
            "unicorn/no-unreadable-iife": "error", // S7743 Immediately invoked arrow functions with parenthesized expressions should be avoided
            "unicorn/no-useless-fallback-in-spread": "error", // S7744 Unnecessary fallback objects should not be used when spreading in object literals
            "unicorn/no-useless-length-check": "error", // S7745 Array length checks should not be used before "some()" and "every()" calls
            "unicorn/no-useless-promise-resolve-reject": "error", // S7746 Promise.resolve() and Promise.reject() should not be used in async functions or promise callbacks
            "unicorn/no-zero-fractions": "error", // S7748 Number literals should not have unnecessary decimal points or trailing zeros
            "unicorn/numeric-separators-style": [
                "error",
                { onlyIfContainsSeparator: true, number: { minimumDigits: 0, groupLength: 3 } },
            ], // S7749 Numeric literals should use consistent digit grouping with separators
            "unicorn/prefer-array-find": "error", // S7750 Array methods ".find()" and ".findLast()" should be preferred over ".filter()" for single element retrieval
            "unicorn/prefer-array-flat": "error", // S7751 Array flattening should use the native "flat()" method
            "unicorn/prefer-array-flat-map": "error", // S7752 Array methods ".map().flat()" should be replaced with ".flatMap()"
            "unicorn/prefer-array-index-of": "error", // S7753 "indexOf()" and "lastIndexOf()" should be used instead of "findIndex()" and "findLastIndex()" for simple equality searches
            "unicorn/prefer-array-some": "error", // S7754 Use ".some()" instead of ".filter().length" checks or ".find()" for existence testing
            "unicorn/prefer-at": "error", // S7755 Complex index access patterns should be replaced with ".at()" method
            "unicorn/prefer-blob-reading-methods": "error", // S7756 Modern Blob methods should be used instead of FileReader
            "unicorn/prefer-class-fields": "error", // S7757 Class properties should be declared as fields rather than assigned in constructors
            "unicorn/prefer-code-point": "error", // S7758 Unicode-aware string methods should be used for proper character handling
            "unicorn/prefer-date-now": "error", // S7759 Use "Date.now()" instead of creating Date objects to get current timestamp
            "unicorn/prefer-default-parameters": "error", // S7760 Default parameters should be used instead of reassigning parameters with literal fallback values
            "unicorn/prefer-dom-node-remove": "error", // S7762 DOM nodes should be removed using "remove()" instead of "removeChild()"
            "unicorn/prefer-export-from": "error", // S7763 Re-exports should use "export...from" syntax
            "unicorn/prefer-global-this": "error", // S7764 Use "globalThis" instead of "window", "self", or "global"
            "unicorn/prefer-includes": "error", // S7765 Existence checks should use ".includes()" instead of ".indexOf()" or ".lastIndexOf()"
            "unicorn/prefer-math-min-max": "error", // S7766 Ternary expressions should be replaced with "Math.min()" or "Math.max()" for simple comparisons
            "unicorn/prefer-math-trunc": "error", // S7767 Bitwise operators should not be used to truncate numbers
            "unicorn/prefer-modern-dom-apis": "error", // S7768 Modern DOM manipulation methods should be used instead of legacy alternatives
            "unicorn/prefer-modern-math-apis": "error", // S7769 Modern Math APIs should be used instead of legacy mathematical expressions
            "unicorn/prefer-native-coercion-functions": "error", // S7770 Wrapper functions around built-in type conversion functions should be avoided
            "unicorn/prefer-negative-index": "error", // S7771 Negative indices should be used instead of length calculations
            "unicorn/prefer-node-protocol": "error", // S7772 Node.js built-in modules should be imported using the "node:" protocol
            "unicorn/prefer-number-properties": "error", // S7773 Number static methods and properties should be preferred over global equivalents
            "unicorn/prefer-prototype-methods": "error", // S7774 Methods should be accessed from prototypes, not instances
            "unicorn/prefer-set-has": "error", // S7776 Arrays used only for existence checks should be Sets
            "unicorn/prefer-set-size": "error", // S7777 Set size should be accessed directly instead of converting to array first
            "unicorn/prefer-single-call": "error", // S7778 Multiple consecutive calls to methods that accept multiple arguments should be combined
            "unicorn/prefer-string-raw": "error", // S7780 String literals with escaped backslashes should use `String.raw` template literals
            "unicorn/prefer-string-replace-all": "error", // S7781 Strings should use "replaceAll()" instead of "replace()" with global regex
            "unicorn/prefer-string-trim-start-end": "error", // S7783 "trimLeft()" and "trimRight()" should be replaced with "trimStart()" and "trimEnd()"
            "unicorn/prefer-structured-clone": "error", // S7784 "structuredClone()" should be used instead of other deep cloning methods
            "unicorn/prefer-top-level-await": "error", // S7785 Top-level await should be preferred over wrapped async operations
            "unicorn/prefer-type-error": "error", // S7786 Generic "Error" should be "TypeError" when thrown after type checking
        },
    },
    {
        name: "sonar-way/main-typescript",
        files: TS,
        ignores: [...SONAR_TESTS, ...SONAR_EXCLUDED],
        plugins,
        rules: {
            "@typescript-eslint/default-param-last": "error", // S1788 Function parameters with default values should be last
            "@typescript-eslint/no-confusing-non-null-assertion": "error", // S6568 Non-null assertions should not be used misleadingly
            "@typescript-eslint/no-empty-function": [
                "error",
                { allow: ["arrowFunctions", "constructors", "private-constructors"] },
            ], // S1186 Functions should not be empty
            "@typescript-eslint/prefer-enum-initializers": "error", // S6572 Enum member values should be either all initialized or none
            "@typescript-eslint/prefer-function-type": "error", // S6598 Function types should be preferred
            "@typescript-eslint/prefer-nullish-coalescing": [
                "error",
                {
                    allowRuleToRunWithoutStrictNullChecksIKnowWhatIAmDoing: true,
                    ignoreConditionalTests: true,
                    ignoreMixedLogicalExpressions: true,
                    ignoreTernaryTests: false,
                    ignorePrimitives: true,
                },
            ], // S6606 Nullish coalescing should be preferred
            "@typescript-eslint/prefer-optional-chain": "error", // S6582 Optional chaining should be preferred
            "@typescript-eslint/prefer-readonly": "error", // S2933 Fields that are only assigned in the constructor should be "readonly"
            "@typescript-eslint/prefer-string-starts-ends-with": "error", // S6557 Ends of strings should be checked with "startsWith()" and "endsWith()"
            "sonarjs/anchor-precedence": "error", // S5850 Alternatives in regular expressions should be grouped when used with anchors
            "sonarjs/arguments-order": "error", // S2234 Parameters should be passed in the correct order
            "sonarjs/bitwise-operators": "error", // S1529 Bitwise operators should not be used in boolean contexts
            "sonarjs/concise-regex": "error", // S6353 Regular expression quantifiers and character classes should be used concisely
            "sonarjs/disabled-auto-escaping": "error", // S5247 Disabling auto-escaping in template engines is security-sensitive
            "sonarjs/disabled-resource-integrity": "error", // S5725 Using remote artifacts without integrity checks is security-sensitive
            "sonarjs/duplicates-in-character-class": "error", // S5869 Character classes in regular expressions should not contain the same character twice
            "sonarjs/empty-string-repetition": "error", // S5842 Repeated patterns in regular expressions should not match the empty string
            "sonarjs/existing-groups": "error", // S6328 Replacement strings should reference existing regular expression groups
            "sonarjs/index-of-compare-to-positive-number": "error", // S2692 "indexOf" checks should not be for positive numbers
            "sonarjs/jsx-no-leaked-render": "error", // S6439 React components should not render non-boolean condition values
            "sonarjs/new-operator-misuse": "error", // S2999 "new" should only be used with functions and classes
            "sonarjs/no-alphabetical-sort": "error", // S2871 "Array.prototype.sort()" and "Array.prototype.toSorted()" should use a compare function
            "sonarjs/no-array-delete": "error", // S2870 "delete" should not be used on arrays
            "sonarjs/no-associative-arrays": "error", // S3579 Array indexes should be numeric
            "sonarjs/no-async-constructor": "error", // S7059 Constructors should not contain asynchronous operations
            "sonarjs/no-collection-size-mischeck": "error", // S3981 Collection size and array length comparisons should make sense
            "sonarjs/no-control-regex": "error", // S6324 Regular expressions should not contain control characters
            "sonarjs/no-duplicate-in-composite": "error", // S4621 Union and intersection types should not include duplicated constituents
            "sonarjs/no-empty-after-reluctant": "error", // S6019 Reluctant quantifiers in regular expressions should be followed by an expression that can't match the empty string
            "sonarjs/no-empty-alternatives": "error", // S6323 Alternation in regular expressions should not contain empty alternatives
            "sonarjs/no-empty-character-class": "error", // S2639 Empty character classes should not be used
            "sonarjs/no-empty-group": "error", // S6331 Regular expressions should not contain empty groups
            "sonarjs/no-ignored-return": "error", // S2201 Return values from functions without side effects should not be ignored
            "sonarjs/no-in-misuse": "error", // S4619 "in" should not be used on arrays
            "sonarjs/no-invalid-regexp": "error", // S5856 Regular expressions should be syntactically valid
            "sonarjs/no-misleading-array-reverse": "error", // S4043 Array-mutating methods should not be used misleadingly
            "sonarjs/no-misleading-character-class": "error", // S5868 Unicode Grapheme Clusters should be avoided inside regex character classes
            "sonarjs/no-regex-spaces": "error", // S6326 Regular expressions should not contain multiple spaces
            "sonarjs/no-small-switch": "error", // S1301 "if" statements should be preferred over "switch" when simpler
            "sonarjs/no-try-promise": "error", // S4822 Promise rejections should not be caught by "try" blocks
            "sonarjs/no-undefined-argument": "error", // S4623 "undefined" should not be passed as the value of optional parameters
            "sonarjs/no-useless-intersection": "error", // S4335 Type intersections should use meaningful types
            "sonarjs/post-message": "error", // S2819 Origins should be verified during cross-origin communications
            "sonarjs/prefer-read-only-props": "error", // S6759 React props should be read-only
            "sonarjs/prefer-regexp-exec": "error", // S6594 "RegExp.exec()" should be preferred over "String.match()"
            "sonarjs/prefer-type-guard": "error", // S4322 Type predicates should be used
            "sonarjs/public-static-readonly": "error", // S1444 Public "static" fields should be read-only
            "sonarjs/reduce-initial-value": "error", // S6959 "Array.reduce()" calls should include an initial value
            "sonarjs/redundant-type-aliases": "error", // S6564 Redundant type aliases should not be used
            "sonarjs/single-char-in-character-classes": "error", // S6397 Character classes in regular expressions should not contain only one character
            "sonarjs/single-character-alternation": "error", // S6035 Single-character alternations in regular expressions should be replaced with character classes
            "sonarjs/slow-regex": "error", // S5852 Using slow regular expressions is security-sensitive
            "sonarjs/sql-queries": "error", // S2077 Formatting SQL queries is security-sensitive
            "sonarjs/unused-named-groups": "error", // S5860 Names of regular expressions named groups should be used
            "sonarjs/use-type-alias": "error", // S4323 Type aliases should be used
        },
    },
    {
        // Core rules the root config turns on for .ts alone, and rules graphty-way turned off for
        // TypeScript only (their reasons are above).
        name: "sonar-way/main-javascript",
        files: JS,
        ignores: [...SONAR_TESTS, ...SONAR_EXCLUDED],
        plugins,
        rules: {
            "no-nested-ternary": "error", // S3358 Ternary operators should not be nested
            "no-throw-literal": "error", // S3696 Literals should not be thrown
            "no-undef-init": "error", // S6645 Variables should not be initialized to undefined
            "no-unmodified-loop-condition": "error", // S2189 Loops should not be infinite
            "no-unneeded-ternary": "error", // S6644 Ternary operator should not be used instead of simpler alternatives
            "no-useless-constructor": "error", // S6647 Unnecessary constructors should be removed
            "no-useless-rename": "error", // S6650 Renaming import, export, and destructuring assignments should not be to the same name
            "no-var": "error", // S3504 Variables should be declared with "let" or "const"
            "prefer-spread": "error", // S6666 Spread syntax should be used instead of "apply()"
            "sonarjs/future-reserved-words": "error", // S1527 Future reserved words should not be used as identifiers
            "sonarjs/inconsistent-function-call": "error", // S3686 Functions should be called consistently with or without "new"
            "sonarjs/no-extra-arguments": "error", // S930 Function calls should not pass extra arguments
            "sonarjs/no-implicit-global": "error", // S2703 Variables should be declared explicitly
            "sonarjs/no-nested-functions": ["error", { threshold: 4 }], // S2004 Functions should not be nested too deeply
            "sonarjs/prefer-promise-shorthand": "error", // S4634 Shorthand promises should be used
            "sonarjs/prefer-single-boolean-return": "error", // S1126 Return of boolean expressions should not be wrapped into an "if-then-else" statement
            "sonarjs/updated-const-var": "error", // S3500 "const" variables should not be reassigned
            "unicorn/require-module-specifiers": "error", // S7787 Import and export statements should not have empty specifier lists
        },
    },
    {
        name: "sonar-way/main-jsx",
        files: ["**/*.tsx", "**/*.jsx"],
        ignores: [...SONAR_TESTS, ...SONAR_EXCLUDED],
        plugins: jsxPlugins,
        settings: { react: { version: "detect" } },
        rules: {
            "jsx-a11y/alt-text": "error", // S1077 Image, area, button with image and object elements should have an alternative text
            "jsx-a11y/anchor-has-content": "error", // S6827 Anchors should contain accessible content
            "jsx-a11y/anchor-is-valid": "error", // S6844 Anchor tags should not be used as buttons
            "jsx-a11y/aria-activedescendant-has-tabindex": "error", // S6823 DOM elements with the `aria-activedescendant` property should be accessible via the tab key
            "jsx-a11y/aria-props": "error", // S6747 JSX elements should not use unknown properties and attributes
            "jsx-a11y/aria-proptypes": "error", // S6793 ARIA properties in DOM elements should have valid values
            "jsx-a11y/aria-role": "error", // S6821 DOM elements with ARIA roles should have a valid non-abstract role
            "jsx-a11y/aria-unsupported-elements": "error", // S6824 No ARIA role or property for unsupported DOM elements
            "jsx-a11y/autocomplete-valid": "error", // S6840 DOM elements should use the "autocomplete" attribute correctly
            "jsx-a11y/click-events-have-key-events": "error", // S1082 Mouse events should have corresponding keyboard events
            "jsx-a11y/heading-has-content": "error", // S6850 Heading elements should have accessible content
            "jsx-a11y/html-has-lang": "error", // S5254 HTML elements should have a valid language attribute
            "jsx-a11y/iframe-has-title": "error", // S1090 iFrames must have a title
            "jsx-a11y/img-redundant-alt": "error", // S6851 Images should have a non-redundant alternate description
            "jsx-a11y/interactive-supports-focus": "error", // S6852 Elements with an interactive role should support focus
            "jsx-a11y/label-has-associated-control": "error", // S6853 Label elements should have a text label and an associated control
            "jsx-a11y/lang": "error", // S5254 HTML elements should have a valid language attribute
            "jsx-a11y/media-has-caption": "error", // S4084 Media elements should have captions
            "jsx-a11y/mouse-events-have-key-events": "error", // S1082 Mouse events should have corresponding keyboard events
            "jsx-a11y/no-access-key": "error", // S6846 DOM elements should not use the "accesskey" property
            "jsx-a11y/no-aria-hidden-on-focusable": "error", // S6825 Focusable elements should not have "aria-hidden" attribute
            "jsx-a11y/no-interactive-element-to-noninteractive-role": "error", // S6843 Interactive DOM elements should not have non-interactive ARIA roles
            "jsx-a11y/no-noninteractive-element-interactions": "error", // S6847 Non-interactive elements shouldn't have event handlers
            "jsx-a11y/no-noninteractive-element-to-interactive-role": "error", // S6842 Non-interactive DOM elements should not have interactive ARIA roles
            "jsx-a11y/no-noninteractive-tabindex": "error", // S6845 Non-interactive DOM elements should not have the `tabIndex` property
            "jsx-a11y/no-redundant-roles": "error", // S6822 No redundant ARIA role
            "jsx-a11y/no-static-element-interactions": "error", // S6848 Non-interactive DOM elements should not have an interactive handler
            "jsx-a11y/prefer-tag-over-role": "error", // S6819 Prefer tag over ARIA role
            "jsx-a11y/role-has-required-aria-props": "error", // S6807 DOM elements with ARIA roles should have the required properties
            "jsx-a11y/role-supports-aria-props": "error", // S6811 DOM elements with ARIA role should only have supported properties
            "jsx-a11y/tabindex-no-positive": "error", // S6841 "tabIndex" values should be 0 or -1
            "react-hooks/rules-of-hooks": "error", // S6440 React Hooks should be properly called
            "react/default-props-match-prop-types": "error", // S6775 All "defaultProps" should have non-required PropTypes
            "react/jsx-child-element-spacing": "error", // S6772 Spacing between inline elements should be explicit
            "react/jsx-key": "error", // S6477 JSX list components should have a key property
            "react/jsx-no-comment-textnodes": "error", // S6438 Comments inside JSX expressions should be enclosed in curly braces
            "react/jsx-no-constructed-context-values": "error", // S6481 React Context Provider values should have stable identities
            "react/jsx-no-useless-fragment": ["error", { allowExpressions: true }], // S6749 Redundant JSX fragments should be removed
            "react/jsx-pascal-case": "error", // S6770 User-defined JSX components should use Pascal case
            "react/no-access-state-in-setstate": "error", // S6756 "setState" should use a callback when referencing the previous state
            "react/no-array-index-key": "error", // S6479 JSX list components should not use array indexes as key
            "react/no-children-prop": "error", // S6748 React "children" should not be passed as prop
            "react/no-danger-with-children": "error", // S6761 "children" and "dangerouslySetInnerHTML" should not be used together
            "react/no-deprecated": "error", // S6957 Deprecated React APIs should not be used
            "react/no-direct-mutation-state": "error", // S6746 In React "this.state" should not be mutated directly
            "react/no-find-dom-node": "error", // S6788 React's "findDOMNode" should not be used
            "react/no-is-mounted": "error", // S6789 React's "isMounted" should not be used
            "react/no-redundant-should-component-update": "error", // S6763 "shouldComponentUpdate" should not be defined when extending "React.PureComponent"
            "react/no-render-return-value": "error", // S6750 The return value of "ReactDOM.render" should not be used
            "react/no-string-refs": "error", // S6790 String references should not be used
            "react/no-this-in-sfc": "error", // S6757 "this" should not be used in functional components
            "react/no-unescaped-entities": ["error", { forbid: [">", "}"] }], // S6766 JSX special characters should be escaped
            "react/no-unknown-property": ["error", { ignore: [] }], // S6747 JSX elements should not use unknown properties and attributes
            "react/no-unsafe": ["error", { checkAliases: true }], // S6791 React legacy lifecycle methods should not be used
            "react/no-unstable-nested-components": "error", // S6478 React components should not be nested
            "react/no-unused-class-component-methods": "error", // S6441 Unused methods of React components should be removed
            "react/require-render-return": "error", // S6435 React "render" functions should return a value
        },
    },
    {
        name: "sonar-way/main-jsx-javascript",
        files: ["**/*.jsx"],
        ignores: [...SONAR_TESTS, ...SONAR_EXCLUDED],
        plugins: jsxPlugins,
        rules: {
            "react/hook-use-state": ["error", { allowDestructuredState: true }], // S6754 The return value of "useState" should be destructured and named symmetrically
            "react/no-unused-prop-types": "error", // S6767 Unused React typed props should be removed
            "react/prop-types": "error", // S6774 React components should validate prop types
        },
    },
    {
        // SonarQube runs these only where package.json depends on aws-cdk-lib, which is the pipeline
        // health stack alone; elsewhere they cost lint time and can find nothing.
        name: "sonar-way/aws-cdk",
        files: ["tools/pipeline-health/**/*.ts"],
        ignores: [...SONAR_TESTS, ...SONAR_EXCLUDED],
        plugins,
        rules: {
            "sonarjs/aws-apigateway-public-api": "error", // S6333 Creating public APIs is security-sensitive
            "sonarjs/aws-ec2-rds-dms-public": "error", // S6329 Allowing public network access to cloud resources is security-sensitive
            "sonarjs/aws-ec2-unencrypted-ebs-volume": "error", // S6275 Using unencrypted EBS volumes is security-sensitive
            "sonarjs/aws-efs-unencrypted": "error", // S6332 Using unencrypted EFS file systems is security-sensitive
            "sonarjs/aws-iam-all-privileges": "error", // S6302 Policies granting all privileges are security-sensitive
            "sonarjs/aws-iam-privilege-escalation": "error", // S6317 AWS IAM policies should limit the scope of permissions given
            "sonarjs/aws-iam-public-access": "error", // S6270 Policies authorizing public access to resources are security-sensitive
            "sonarjs/aws-opensearchservice-domain": "error", // S6308 Using unencrypted Opensearch domains is security-sensitive
            "sonarjs/aws-rds-unencrypted-databases": "error", // S6303 Using unencrypted RDS DB resources is security-sensitive
            "sonarjs/aws-restricted-ip-admin-access": "error", // S6321 Administration services access should be restricted to specific IP addresses
            "sonarjs/aws-s3-bucket-granted-access": "error", // S6265 Granting access to S3 buckets to all or authenticated users is security-sensitive
            "sonarjs/aws-s3-bucket-insecure-http": "error", // S6249 Authorizing HTTP communications with S3 buckets is security-sensitive
            "sonarjs/aws-s3-bucket-public-access": "error", // S6281 Allowing public ACLs or policies on a S3 bucket is security-sensitive
            "sonarjs/aws-s3-bucket-versioning": "error", // S6252 Disabling versioning of S3 buckets is security-sensitive
            "sonarjs/aws-sagemaker-unencrypted-notebook": "error", // S6319 Using unencrypted SageMaker notebook instances is security-sensitive
            "sonarjs/aws-sns-unencrypted-topics": "error", // S6327 Using unencrypted SNS topics is security-sensitive
            "sonarjs/aws-sqs-unencrypted-queue": "error", // S6330 Using unencrypted SQS queues is security-sensitive
            "sonarjs/weak-ssl": "error", // S4423 Weak SSL/TLS protocols should not be used
        },
    },
    {
        name: "sonar-way/tests",
        files: SONAR_TESTS,
        ignores: SONAR_EXCLUDED,
        plugins,
        rules: {
            "sonarjs/chai-determinate-assertion": "error", // S6092 Chai assertions should have only one reason to succeed
            "sonarjs/disabled-timeout": "error", // S6080 Disabling Mocha timeouts should be explicit
            "sonarjs/dynamically-constructed-templates": "error", // S7790 Templates should not be constructed dynamically
            "sonarjs/inverted-assertion-arguments": "error", // S3415 Assertion arguments should be passed in the correct order
            "sonarjs/no-code-after-done": "error", // S6079 Tests should not execute any code after "done()" is called
            "sonarjs/no-exclusive-tests": "error", // S6426 Exclusive tests should not be committed to version control
            "sonarjs/no-incomplete-assertions": "error", // S2970 Assertions should be complete
            "sonarjs/no-same-argument-assert": "error", // S5863 Assertions should not be given twice the same argument
            "sonarjs/no-skipped-tests": "error", // S1607 Tests should not be skipped without providing a reason
            "sonarjs/review-blockchain-mnemonic": "error", // S7639 Wallet phrases should not be hard-coded
            "sonarjs/stable-tests": "error", // S5973 Tests should be stable
            "sonarjs/test-check-exception": "error", // S5958 Tests should check which exception is thrown
        },
    },
];
