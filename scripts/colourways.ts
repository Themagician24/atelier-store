/*
 * Extra colourways, rendered from the packshot by rotating its hue on
 * Unsplash's imgix CDN. Only flat packshots of a saturated piece qualify:
 * on a model (or a hand) the skin turns too, and black, white or grey don't
 * move. A coloured backdrop, prop or brass buckle turns with the piece, so
 * those photos stay out too, as do fragrances and names that state a colour.
 * Each becomes a variant (stocked like the first colour) and a photo.
 * `hue` is the rotation in degrees; names were checked against the renders.
 *
 * Keyed by slug across both catalogues: scripts/seed.ts applies it to every
 * piece, scripts/seed-extend.ts adds what a live database is missing.
 */
export type Colourway = { name: string; hue: number };

export const colourways: Record<string, Colourway[]> = {
  "chevron-shoulder-bag": [
    { name: "Powder blue", hue: -140 },
    { name: "Sage", hue: 130 },
    { name: "Lilac", hue: -75 },
  ],
  "leather-lace-up-boots": [
    { name: "Aubergine", hue: -30 },
    { name: "Olive", hue: 50 },
    { name: "Navy", hue: -165 },
  ],
  "top-handle-bag": [
    { name: "Raspberry", hue: 170 },
    { name: "Olive", hue: -135 },
    { name: "Cobalt", hue: 40 },
  ],
  "denim-trucker-jacket": [
    { name: "Forest", hue: -75 },
    { name: "Burgundy", hue: 120 },
    { name: "Plum", hue: 65 },
  ],
  "floral-satin-pumps": [
    { name: "Pink floral", hue: 115 },
    { name: "Green floral", hue: -85 },
    { name: "Peach floral", hue: -165 },
  ],
  "raw-denim-jeans": [
    { name: "Bottle green", hue: -75 },
    { name: "Oxblood", hue: 125 },
    { name: "Aubergine", hue: 60 },
  ],
  "woven-wicker-handbag": [
    { name: "Fuchsia", hue: -65 },
    { name: "Jade", hue: 155 },
    { name: "Chartreuse", hue: 65 },
  ],
  "leather-backpack": [
    { name: "Plum", hue: -33 },
    { name: "Olive", hue: 42 },
    { name: "Steel blue", hue: -168 },
  ],
  "structured-top-handle-bag": [
    { name: "Cobalt", hue: -145 },
    { name: "Emerald", hue: 140 },
    { name: "Marigold", hue: 35 },
  ],
  "canvas-daypack": [
    { name: "Forest", hue: -75 },
    { name: "Burgundy", hue: 120 },
    { name: "Aubergine", hue: 65 },
  ],
  "leather-belt": [
    { name: "Raspberry", hue: -35 },
    { name: "Mustard", hue: 45 },
    { name: "Denim blue", hue: -170 },
  ],
  "bifold-leather-wallet": [
    { name: "Raspberry", hue: -30 },
    { name: "Bottle green", hue: 120 },
    { name: "Navy", hue: -165 },
  ],
  "leather-satchel": [
    { name: "Rose", hue: -60 },
    { name: "Jade", hue: 135 },
    { name: "Powder blue", hue: 180 },
  ],
  "high-rise-denim-shorts": [
    { name: "Blush", hue: 140 },
    { name: "Mint", hue: -60 },
    { name: "Lilac", hue: 65 },
  ],
  "polka-dot-chambray-shirt": [
    { name: "Sage", hue: -50 },
    { name: "Mauve", hue: 100 },
    { name: "Dusty rose", hue: 150 },
  ],

  // Extended catalogue. On a watch only the dial or strap turns; the steel stays.
  "regulator-tourbillon": [
    { name: "Cobalt", hue: -150 },
    { name: "Fuchsia", hue: -50 },
    { name: "Green", hue: 150 },
  ],
  "sunray-automatic-39": [
    { name: "Green", hue: -50 },
    { name: "Violet", hue: 50 },
    { name: "Burgundy", hue: 150 },
  ],
  "mesh-bracelet-40": [
    { name: "Green", hue: -100 },
    { name: "Purple", hue: 50 },
    { name: "Red", hue: 150 },
  ],
  "hand-antiqued-chelsea-boot": [
    { name: "Navy", hue: -150 },
    { name: "Plum", hue: -50 },
    { name: "Bottle green", hue: 150 },
  ],
  "suede-driving-loafer": [
    { name: "Cobalt", hue: -150 },
    { name: "Raspberry", hue: -50 },
    { name: "Emerald", hue: 150 },
  ],
  "suede-bit-loafer": [
    { name: "Periwinkle", hue: -150 },
    { name: "Dusty rose", hue: -50 },
    { name: "Teal", hue: 150 },
  ],
  "suede-penny-loafer": [
    { name: "Royal blue", hue: -150 },
    { name: "Raspberry", hue: -50 },
    { name: "Emerald", hue: 150 },
  ],
  "polished-penny-loafer": [
    { name: "Cobalt", hue: -150 },
    { name: "Purple", hue: -50 },
    { name: "Bottle green", hue: 150 },
  ],
  "crossover-slide": [
    { name: "Cobalt", hue: -150 },
    { name: "Fuchsia", hue: -50 },
    { name: "Jade", hue: 150 },
  ],
  "crossover-mule": [
    { name: "Violet", hue: -100 },
    { name: "Jade", hue: 150 },
    { name: "Turquoise", hue: 180 },
  ],
  // Only this one: further round, the hedge beside it turns too.
  "field-messenger": [{ name: "Plum", hue: -50 }],
  "quilted-top-handle-bag": [
    { name: "Cornflower", hue: -150 },
    { name: "Lavender", hue: -100 },
    { name: "Mint", hue: 150 },
  ],
  "market-tote": [
    { name: "Cobalt", hue: -150 },
    { name: "Raspberry", hue: -50 },
    { name: "Emerald", hue: 150 },
  ],
  "structured-doctor-bag": [
    { name: "Cobalt", hue: -150 },
    { name: "Fuchsia", hue: -50 },
    { name: "Emerald", hue: 150 },
  ],
  "soft-shoulder-bag": [
    { name: "Royal blue", hue: -150 },
    { name: "Fuchsia", hue: -50 },
    { name: "Petrol", hue: 180 },
  ],
  "buckled-top-handle-bag": [
    { name: "Cobalt", hue: -150 },
    { name: "Orchid", hue: -50 },
    { name: "Jade", hue: 150 },
  ],
  "pocket-crossbody": [
    { name: "Cobalt", hue: -150 },
    { name: "Plum", hue: -50 },
    { name: "Emerald", hue: 150 },
  ],
  "hobo-bag": [
    { name: "Cobalt", hue: -150 },
    { name: "Plum", hue: -50 },
    { name: "Petrol", hue: 180 },
  ],
  "croc-embossed-top-handle-bag": [
    { name: "Lilac", hue: -150 },
    { name: "Coral", hue: -50 },
    { name: "Cornflower", hue: 180 },
  ],
  "camera-bag": [
    { name: "Cobalt", hue: -150 },
    { name: "Plum", hue: -50 },
    { name: "Petrol", hue: 180 },
  ],
  "zip-backpack": [
    { name: "Steel blue", hue: -150 },
    { name: "Ochre", hue: 50 },
    { name: "Teal", hue: 180 },
  ],
  "front-pocket-backpack": [
    { name: "Denim blue", hue: -150 },
    { name: "Orchid", hue: -50 },
    { name: "Teal", hue: 180 },
  ],
  "flap-rucksack": [
    { name: "Cornflower", hue: -150 },
    { name: "Orchid", hue: -50 },
    { name: "Jade", hue: 150 },
  ],
  billfold: [
    { name: "Denim blue", hue: -150 },
    { name: "Plum", hue: -50 },
    { name: "Jade", hue: 150 },
  ],
  "braided-leather-belt": [
    { name: "Navy", hue: -150 },
    { name: "Plum", hue: -50 },
    { name: "Bottle green", hue: 150 },
  ],
  "linen-shirt": [
    { name: "Olive", hue: -150 },
    { name: "Forest green", hue: -50 },
    { name: "Plum", hue: 100 },
  ],
  "short-sleeve-band-collar-shirt": [
    { name: "Olive", hue: -150 },
    { name: "Forest green", hue: -50 },
    { name: "Plum", hue: 100 },
  ],
  "raglan-sweater": [
    { name: "Denim blue", hue: -150 },
    { name: "Mauve", hue: -50 },
    { name: "Moss green", hue: 100 },
  ],
  "slim-jean": [
    { name: "Olive", hue: -150 },
    { name: "Bottle green", hue: -50 },
    { name: "Oxblood", hue: 150 },
  ],
  "rinse-jean": [
    { name: "Bottle green", hue: -50 },
    { name: "Aubergine", hue: 100 },
    { name: "Tobacco", hue: 180 },
  ],
  "cropped-jean": [
    { name: "Moss", hue: -100 },
    { name: "Brick red", hue: 150 },
    { name: "Tobacco", hue: 180 },
  ],
};

/** A colourway's photo: the packshot with its hue rotated, tied to the colour. */
export function colourwayImage(productName: string, packshotUrl: string, { name, hue }: Colourway) {
  return {
    url: `${packshotUrl}?hue=${hue}`,
    alt: `${productName} in ${name.toLowerCase()}`,
    colour: name,
  };
}
