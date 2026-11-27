// Chapter 3, Create and load styles, beat 6: recipes. A placeholder: the app saves a recipe (Save
// as... > Recipe only writes the analyses and the layout as steps) but has no way to apply one to new
// data: opening the file onto another graph says "Added ... to this project" and runs none of its
// steps, because the app never asks graphty-element to apply it (session.recipes.apply, or
// project.open with applyRecipe).
export default {
    id: "styles-recipes",
    chapter: 3,
    caption: "Recipes: replay your steps on new data",
    placeholder:
        "Save the analyses, layout and styles as steps, then apply them to new data in one step (placeholder: the app cannot apply a recipe yet)",
    seconds: 4,
};
