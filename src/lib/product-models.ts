/*
 * Which products have a 3D model, and what their parts are called. The
 * models themselves are built in code (src/components/product-3d/), so this
 * map is the whole registry: a slug listed here swaps the photo gallery's
 * lead image for the exploded-view stage. No three.js import, so the
 * product page can ask without pulling it into the server bundle.
 */

export type ModelKind = "watch" | "sneaker";

const MODELS: Record<string, ModelKind> = {
  "leather-strap-watch": "watch",
  "panelled-runner-sneakers": "sneaker",
};

export function productModel(slug: string): ModelKind | null {
  return MODELS[slug] ?? null;
}

/** Labels shown beside each part once the piece is exploded. */
export const PART_LABELS = {
  watch: {
    crystal: "Sapphire crystal",
    bezel: "Bezel",
    hands: "Hands",
    dial: "Dial",
    case: "36 mm case",
    crown: "Crown",
    movement: "Quartz movement",
    caseback: "Caseback",
    strap: "Calfskin strap",
  },
  sneaker: {
    laces: "Laces",
    tongue: "Tongue",
    collar: "Collar",
    toe: "Toe cap",
    panels: "Mesh panels",
    heel: "Heel counter",
    upper: "Upper",
    insole: "Insole",
    midsole: "EVA midsole",
    outsole: "Outsole",
  },
} as const satisfies Record<ModelKind, Record<string, string>>;

/** One sentence naming every part, for the stage's accessible label. */
export function modelDescription(kind: ModelKind, productName: string) {
  const parts = Object.values(PART_LABELS[kind]).join(", ").toLowerCase();
  return `Exploded 3D view of the ${productName}: ${parts}.`;
}
