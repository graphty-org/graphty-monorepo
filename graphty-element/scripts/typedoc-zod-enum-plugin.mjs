/**
 * A TypeDoc plugin that stops the value members of a zod enum from counting as undocumented.
 *
 * TypeDoc reads `z.enum(["a", "b"])` as `ZodEnum<{ a: "a"; b: "b" }>` and makes a property for each
 * member of that record. Those properties come from zod's mapped type, so no doc comment in source
 * can reach them, and each one was reported as "does not have any documentation" (about 1,200 of
 * them, issue #8299). The enum's own declaration carries the documentation, and the generated page
 * still lists every value in the type.
 *
 * Only properties of the record handed to zod's `ZodEnum` as its type argument, whose type is the
 * string literal of their own name, are added to TypeDoc's `intentionallyNotDocumented` list.
 * Nothing else is touched, so a real field without a comment is still reported.
 */

import {
    Converter,
    DeclarationReflection,
    LiteralType,
    ReferenceType,
    ReflectionKind,
    ReflectionType,
    Type,
    UnknownType,
} from "typedoc";

/**
 * Calls `found` for every `ZodEnum<...>` reference inside a type, however deeply nested.
 * It does not descend into object literal types: their members are reflections of their own and
 * are walked when the project's reflections are.
 * @param {unknown} type A TypeDoc type, or anything else (ignored).
 * @param {(reference: ReferenceType) => void} found Called with each zod enum reference.
 */
function walkZodEnums(type, found) {
    if (!(type instanceof Type) || type instanceof ReflectionType) {
        return;
    }

    if (type instanceof ReferenceType && type.name === "ZodEnum" && type.package === "zod") {
        found(type);
    }

    for (const value of Object.values(type)) {
        for (const item of Array.isArray(value) ? value : [value]) {
            walkZodEnums(item, found);
        }
    }
}

/**
 * The value members of a zod enum's record type: every child is a property typed as the string
 * literal of its own name. Deep inside a nested schema TypeScript cuts the type short and TypeDoc
 * reads each member's type as `...`; that placeholder is accepted too, since the record is still
 * the one handed to `ZodEnum`. Returns nothing when the record is not that shape.
 * @param {ReflectionType} record The type argument of a `ZodEnum` reference.
 * @returns {DeclarationReflection[]} The value members, or an empty list.
 */
function enumValueMembers(record) {
    const members = record.declaration.children ?? [];
    const isValue = (member) =>
        member instanceof DeclarationReflection &&
        member.kindOf(ReflectionKind.Property) &&
        ((member.type instanceof LiteralType && member.type.value === member.name) ||
            (member.type instanceof UnknownType && member.type.name === "..."));

    return members.length > 0 && members.every((member) => isValue(member)) ? members : [];
}

/**
 * Registers the plugin.
 * @param {import("typedoc").Application} app The TypeDoc application.
 */
export function load(app) {
    app.converter.on(Converter.EVENT_RESOLVE_END, (context) => {
        const names = new Set();

        for (const reflection of Object.values(context.project.reflections)) {
            walkZodEnums(reflection.type, (reference) => {
                const [record] = reference.typeArguments ?? [];

                if (record instanceof ReflectionType) {
                    for (const member of enumValueMembers(record)) {
                        if (!member.hasComment()) {
                            names.add(member.getFriendlyFullName());
                        }
                    }
                }
            });
        }

        app.options.setValue("intentionallyNotDocumented", [
            ...app.options.getValue("intentionallyNotDocumented"),
            ...names,
        ]);
    });
}
