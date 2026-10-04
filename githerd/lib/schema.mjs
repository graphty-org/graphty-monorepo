/**
 * Validates MCP tool arguments against a JSON Schema subset: exactly the keywords githerd's tool
 * schemas use (design section 3). A schema that uses any other keyword is a programming error and
 * throws, so a constraint is never silently skipped.
 */

const KEYWORDS = new Set([
    "type",
    "enum",
    "pattern",
    "minimum",
    "maximum",
    "minLength",
    "maxLength",
    "minItems",
    "maxItems",
    "items",
    "properties",
    "required",
    "default",
    "additionalProperties",
    "description",
]);

/**
 * A JSON Schema made only of the supported keywords.
 * @typedef {object} Schema
 * @property {"object" | "array" | "string" | "integer" | "number" | "boolean" | "null"} [type] the value's type
 * @property {unknown[]} [enum] the allowed values
 * @property {string} [pattern] a regular expression a string must match
 * @property {number} [minimum] the smallest allowed number
 * @property {number} [maximum] the largest allowed number
 * @property {number} [minLength] the fewest characters a string may have
 * @property {number} [maxLength] the most characters a string may have
 * @property {number} [minItems] the fewest items an array may have
 * @property {number} [maxItems] the most items an array may have
 * @property {Schema} [items] the schema every array item must match
 * @property {Record<string, Schema>} [properties] the schemas of an object's known properties
 * @property {string[]} [required] properties an object must have
 * @property {unknown} [default] filled in when the property is absent
 * @property {false} [additionalProperties] false refuses properties not listed
 * @property {string} [description] documentation only
 */

/**
 * Names the JSON Schema type of a value.
 * @param {unknown} value any JSON value
 * @returns {string} the JSON Schema type name of the value
 */
function typeOf(value) {
    if (value === null) return "null";
    if (Array.isArray(value)) return "array";
    if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number";
    return typeof value;
}

/**
 * Compares a wanted type with a value's type; an integer is also a number.
 * @param {string} want the schema's type
 * @param {string} got the value's type, from typeOf
 * @returns {boolean} whether the value has the wanted type
 */
function typeMatches(want, got) {
    return want === got || (want === "number" && got === "integer");
}

/**
 * Validates `value` against `schema` and fills object properties that are absent and have a
 * `default`. The input is not modified.
 * @param {Schema} schema the schema
 * @param {unknown} value the arguments
 * @returns {{ok: true, value: unknown} | {ok: false, errors: string[]}} the value with defaults
 *   filled, or one message per violation, each starting with the path of the offending value
 */
export function validate(schema, value) {
    /** @type {string[]} */
    const errors = [];
    assertSupported(schema, "arguments");
    const out = check(schema, value, "arguments", errors);
    return errors.length === 0 ? { ok: true, value: out } : { ok: false, errors };
}

/**
 * Throws when the schema, or any schema nested in it, uses a keyword this validator does not
 * implement.
 * @param {Schema} schema the schema to inspect
 * @param {string} path where the schema sits, for the message
 */
export function assertSupported(schema, path = "schema") {
    for (const key of Object.keys(schema)) {
        if (!KEYWORDS.has(key)) throw new TypeError(`${path} uses unsupported keyword "${key}"`);
    }
    if (schema.items !== undefined) assertSupported(schema.items, `${path}.items`);
    for (const [name, sub] of Object.entries(schema.properties ?? {})) {
        assertSupported(sub, `${path}.properties.${name}`);
    }
}

/**
 * Validates one value against one schema.
 * @param {Schema} schema the schema
 * @param {unknown} value the value
 * @param {string} path where the value sits, for messages
 * @param {string[]} errors collects violations
 * @returns {unknown} the value with defaults filled
 */
function check(schema, value, path, errors) {
    const got = typeOf(value);
    if (schema.type !== undefined && !typeMatches(schema.type, got)) {
        errors.push(`${path}: expected ${schema.type}, got ${got}`);
        return value;
    }
    if (schema.enum !== undefined && !schema.enum.includes(value)) {
        errors.push(`${path}: must be one of ${schema.enum.map((v) => JSON.stringify(v)).join(", ")}`);
    }
    if (typeof value === "string") checkString(schema, value, path, errors);
    if (typeof value === "number") checkNumber(schema, value, path, errors);
    if (Array.isArray(value)) {
        checkLength(schema, value, path, errors);
        if (schema.items !== undefined) {
            return value.map((item, i) => check(schema.items, item, `${path}[${i}]`, errors));
        }
    }
    if (got === "object") return checkObject(schema, /** @type {Record<string, unknown>} */ (value), path, errors);
    return value;
}

/**
 * Validates a string's length and pattern.
 * @param {Schema} schema the schema
 * @param {string} value the string
 * @param {string} path where the value sits, for messages
 * @param {string[]} errors collects violations
 */
function checkString(schema, value, path, errors) {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
        errors.push(`${path}: shorter than ${schema.minLength} characters`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        errors.push(`${path}: longer than ${schema.maxLength} characters`);
    }
    if (schema.pattern !== undefined && !new RegExp(schema.pattern, "u").test(value)) {
        errors.push(`${path}: does not match ${schema.pattern}`);
    }
}

/**
 * Validates a number's bounds.
 * @param {Schema} schema the schema
 * @param {number} value the number
 * @param {string} path where the value sits, for messages
 * @param {string[]} errors collects violations
 */
function checkNumber(schema, value, path, errors) {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path}: less than ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${path}: greater than ${schema.maximum}`);
}

/**
 * Validates an array's length.
 * @param {Schema} schema the schema
 * @param {unknown[]} value the array
 * @param {string} path where the value sits, for messages
 * @param {string[]} errors collects violations
 */
function checkLength(schema, value, path, errors) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
        errors.push(`${path}: fewer than ${schema.minItems} items`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
        errors.push(`${path}: more than ${schema.maxItems} items`);
    }
}

/**
 * Validates an object's required, known and unknown properties.
 * @param {Schema} schema the object schema
 * @param {Record<string, unknown>} value the object
 * @param {string} path where the object sits, for messages
 * @param {string[]} errors collects violations
 * @returns {Record<string, unknown>} a copy with defaults filled
 */
function checkObject(schema, value, path, errors) {
    const properties = schema.properties ?? {};
    const out = { ...value };
    for (const name of schema.required ?? []) {
        if (!Object.hasOwn(value, name)) errors.push(`${path}.${name}: required`);
    }
    for (const [name, sub] of Object.entries(value)) {
        if (Object.hasOwn(properties, name)) {
            out[name] = check(properties[name], sub, `${path}.${name}`, errors);
        } else if (schema.additionalProperties === false) {
            errors.push(`${path}.${name}: unknown property`);
        }
    }
    for (const [name, sub] of Object.entries(properties)) {
        if (!Object.hasOwn(value, name) && sub.default !== undefined) out[name] = structuredClone(sub.default);
    }
    return out;
}
