import "dotenv/config";
import { db } from "../src/db";
import {
  categories,
  productImages,
  products,
  productVariants,
} from "../src/db/schema";
import { unsplash } from "../src/lib/unsplash";
import {
  accessoriesCover,
  extendedCategories,
  extendedCreatedAt,
  extendedProducts,
} from "./catalogue-extended";

/*
 * Idempotent: wipes the catalogue and re-inserts it in one db.batch(), which
 * runs as a single transaction, so the shop never sees a half-seeded state.
 * IDs are generated here so foreign keys can be wired without `returning`.
 */

type SeedCategory = typeof categories.$inferInsert;

type SeedProduct = Omit<
  typeof products.$inferInsert,
  "id" | "categoryId" | "createdAt" | "updatedAt"
> & {
  categorySlug: string;
  /** `colour` ties a photo to a variant colour; leave it off the packshot. */
  images: { url: string; alt: string; colour?: string }[];
  /** Small to large. */
  sizes: string[];
  /** `stock` holds one quantity per entry in `sizes`. */
  colours: { name: string; stock: number[] }[];
};

const ONE_SIZE = ["One size"];

const skuPart = (s: string) =>
  s
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const categoryRows: SeedCategory[] = [
  {
    slug: "women",
    name: "Women",
    imageUrl: unsplash("1485968579580-b6d095142e6e"),
    imageAlt: "A woman in a long tartan coat walking down a city street",
  },
  {
    slug: "men",
    name: "Men",
    imageUrl: unsplash("1617127365659-c47fa864d8bc"),
    imageAlt: "A man in a black suit and open-collar shirt",
  },
  {
    slug: "bags",
    name: "Bags",
    imageUrl: unsplash("1594223274512-ad4803739b7c"),
    imageAlt: "A teal leather top-handle bag beside a palm leaf",
  },
  {
    slug: "shoes",
    name: "Shoes",
    imageUrl: unsplash("1608256246200-53e635b5b65f"),
    imageAlt: "A pair of brown leather lace-up boots on a dark ground",
  },
  { slug: "accessories", name: "Accessories", ...accessoriesCover },
  ...extendedCategories,
];

/*
 * Extra colourways, rendered from the packshot by rotating its hue on
 * Unsplash's imgix CDN. Only flat packshots of a saturated piece qualify:
 * on a model (or a hand) the skin turns too, and black, white or grey don't
 * move. Each becomes a variant (stocked like the first colour) and a photo.
 * `hue` is the rotation in degrees; names were checked against the renders.
 */
const colourways: Record<string, { name: string; hue: number }[]> = {
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
};

// Newest first; createdAt is backdated from a fixed base so order is stable.
const BASE_DATE = Date.UTC(2026, 9, 1);
const day = 24 * 60 * 60 * 1000;

const productRows: SeedProduct[] = [
  {
    slug: "cropped-leather-biker",
    name: "Cropped Leather Biker",
    categorySlug: "women",
    priceCents: 219000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ["XS", "S", "M", "L"],
    colours: [
      { name: "Black", stock: [2, 3, 3, 1] },
    ],
    stockDetail: null,
    description:
      "A shorter, closer-cut take on the biker in smooth lambskin, ending at the waist. Silver-tone hardware, a wide notched collar and zipped cuffs that can be worn open.",
    details: [
      "100% lambskin leather",
      "Viscose twill lining",
      "Asymmetric front zip",
      "Zipped cuffs and three zipped pockets",
      "Cropped to the waist",
    ],
    care: "Specialist leather clean only. Hang on a wide hanger away from direct heat.",
    images: [
      {
        url: unsplash("1551028719-00167b16eac5"),
        alt: "A black leather biker jacket laid on a white sheet",
      },
    ],
  },
  {
    slug: "two-button-wool-suit",
    name: "Two-Button Wool Suit",
    categorySlug: "men",
    priceCents: 168000,
    compareAtCents: null,
    madeToOrder: true,
    sizes: ["46", "48", "50", "52", "54"],
    colours: [
      { name: "Navy", stock: [0, 0, 0, 0, 0] },
    ],
    stockDetail: "Cut to your size in our Biella workshop, ready in four weeks.",
    description:
      "A single-breasted two-button suit in a light Super 120s wool, half-canvassed with soft shoulders. The trousers are slim through the leg and finished without a break.",
    details: [
      "100% Super 120s wool",
      "Half-canvas construction",
      "Two-button jacket with jetted pockets",
      "Flat-front trousers",
      "Made to order",
    ],
    care: "Dry clean only. Brush after wear and rest on a shaped hanger.",
    images: [
      {
        url: unsplash("1617137968427-85924c800a22"),
        alt: "A man in a navy suit and white shirt walking past a glass façade",
      },
    ],
  },
  {
    slug: "polka-dot-chambray-shirt",
    name: "Polka-Dot Chambray Shirt",
    categorySlug: "women",
    priceCents: 26000,
    compareAtCents: 32000,
    madeToOrder: false,
    sizes: ["XS", "S", "M", "L"],
    colours: [
      { name: "Chambray blue", stock: [3, 5, 4, 2] },
    ],
    stockDetail: null,
    description:
      "A lightweight chambray shirt woven with a scattered white dot, cut straight with three-quarter sleeves that roll and button at the elbow.",
    details: [
      "100% cotton chambray",
      "Point collar",
      "Mother-of-pearl buttons",
      "Roll-up sleeve tabs",
      "Chest pocket",
    ],
    care: "Machine wash at 30°C. Iron while damp.",
    images: [
      {
        url: unsplash("1596755094514-f87e34085b2c"),
        alt: "A blue chambray shirt with small white dots on a wall hook",
      },
    ],
  },
  {
    slug: "cotton-poplin-shirt",
    name: "Cotton Poplin Shirt",
    categorySlug: "men",
    priceCents: 19000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ["S", "M", "L", "XL"],
    colours: [
      { name: "White", stock: [4, 6, 6, 3] },
      { name: "Sky blue", stock: [2, 4, 4, 2] },
      { name: "Pale pink", stock: [1, 2, 2, 0] },
    ],
    stockDetail: null,
    description:
      "A crisp two-ply poplin shirt with a semi-spread collar and single-button cuffs. Regular fit, long enough to stay tucked.",
    details: [
      "100% two-ply cotton poplin",
      "Semi-spread collar",
      "Single-button barrel cuffs",
      "Split yoke, curved hem",
    ],
    care: "Machine wash at 40°C. Iron while damp.",
    images: [
      {
        url: unsplash("1603252109303-2751441dd157"),
        alt: "White, blue and pink shirts on wooden hangers on a rail",
      },
    ],
  },
  {
    slug: "leather-biker-jacket",
    name: "Leather Biker Jacket",
    categorySlug: "men",
    priceCents: 249000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ["S", "M", "L", "XL"],
    colours: [
      { name: "Black", stock: [1, 2, 2, 1] },
      { name: "Dark brown", stock: [0, 1, 1, 0] },
    ],
    stockDetail: null,
    description:
      "A classic asymmetric biker cut in supple lambskin, with an off-centre zip, notched lapels and a belted hem. Fitted through the shoulder, with room to layer a knit underneath.",
    details: [
      "100% lambskin leather",
      "Cupro lining",
      "Asymmetric front zip",
      "Zipped cuffs and three zipped pockets",
      "Buckled belt at hem",
    ],
    care: "Specialist leather clean only. Hang on a wide hanger away from direct heat.",
    images: [
      {
        url: unsplash("1520975954732-35dd22299614"),
        alt: "A man crouched on a steel beam in a black leather biker jacket",
      },
    ],
  },
  {
    slug: "chevron-shoulder-bag",
    name: "Chevron Leather Shoulder Bag",
    categorySlug: "bags",
    priceCents: 189000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ONE_SIZE,
    colours: [
      { name: "Blush", stock: [3] },
    ],
    stockDetail: "The last pieces from this season's run.",
    description:
      "A structured flap bag in smooth calfskin, crossed by an inlaid chevron in cream and saffron. Carried on a fine chain that sits on the shoulder or doubles for a shorter drop.",
    details: [
      "Calfskin leather with leather inlay",
      "Palladium-finish chain strap",
      "Magnetic flap closure",
      "One interior slip pocket",
      "W 24 × H 16 × D 6 cm",
    ],
    care: "Wipe with a soft dry cloth. Store stuffed, in its dust bag.",
    images: [
      {
        url: unsplash("1566150905458-1bf1fc113f0d"),
        alt: "A pink leather shoulder bag with a cream and yellow chevron",
      },
    ],
  },
  {
    slug: "open-knit-poncho",
    name: "Open-Knit Cotton Poncho",
    categorySlug: "women",
    priceCents: 98000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ONE_SIZE,
    colours: [
      { name: "Ivory", stock: [8] },
    ],
    stockDetail: null,
    description:
      "Hand-crocheted in an open mesh of mercerised cotton, with a deep V neck and a knotted fringe at the hem. Light enough for late summer, generous enough to layer over a coat collar.",
    details: [
      "100% mercerised cotton",
      "Hand-crocheted",
      "V neck",
      "Knotted fringe hem",
      "One size",
    ],
    care: "Hand wash cold and dry flat. Do not hang when wet.",
    images: [
      {
        url: unsplash("1434389677669-e08b4cac3105"),
        alt: "A cream open-knit poncho with fringed hem on a hanger",
      },
    ],
  },
  {
    slug: "leather-lace-up-boots",
    name: "Leather Lace-Up Boots",
    categorySlug: "shoes",
    priceCents: 112000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ["40", "41", "42", "43", "44", "45"],
    colours: [
      { name: "Chestnut", stock: [1, 2, 3, 2, 1, 1] },
      { name: "Black", stock: [0, 1, 2, 2, 1, 0] },
    ],
    stockDetail: null,
    description:
      "A rounded-toe ankle boot in waxed calf, Goodyear-welted onto a stacked leather sole with a rubber heel tip. The leather darkens and softens with wear.",
    details: [
      "Waxed calfskin upper",
      "Leather lining",
      "Goodyear-welted leather sole",
      "Rubber heel tip",
      "Eight eyelets, waxed cotton laces",
    ],
    care: "Brush after wear and condition with neutral wax. Use cedar shoe trees.",
    images: [
      {
        url: unsplash("1608256246200-53e635b5b65f"),
        alt: "Brown leather lace-up ankle boots",
      },
    ],
  },
  {
    slug: "satin-bomber-jacket",
    name: "Satin Bomber Jacket",
    categorySlug: "women",
    priceCents: 165000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ["XS", "S", "M", "L", "XL"],
    colours: [
      { name: "Rust", stock: [1, 1, 2, 1, 0] },
    ],
    stockDetail: null,
    description:
      "A cropped bomber in heavy duchess satin with a soft sheen, finished with rib-knit collar, cuffs and hem. Lightly padded for structure without bulk.",
    details: [
      "Duchess satin, 100% silk",
      "Lightweight padding",
      "Rib-knit trims",
      "Two-way front zip",
      "Two welt pockets",
    ],
    care: "Dry clean only.",
    images: [
      {
        url: unsplash("1591047139829-d91aecb6caea"),
        alt: "A rust satin bomber jacket on a hanger",
      },
    ],
  },
  {
    slug: "top-handle-bag",
    name: "Top-Handle Bag",
    categorySlug: "bags",
    priceCents: 225000,
    compareAtCents: null,
    madeToOrder: true,
    sizes: ONE_SIZE,
    colours: [
      { name: "Teal", stock: [0] },
      { name: "Ivory", stock: [0] },
    ],
    stockDetail:
      "Cut and stitched to order in our leather workshop. Allow six weeks.",
    description:
      "A compact top-handle bag in grained calfskin with a turn-lock clasp. The rolled handle is stitched by hand; a detachable strap lets it be worn across the body.",
    details: [
      "Grained calfskin",
      "Gold-finish turn-lock clasp",
      "Hand-stitched rolled handle",
      "Detachable shoulder strap",
      "W 26 × H 19 × D 11 cm",
    ],
    care: "Wipe with a soft dry cloth. Keep away from water and direct sunlight.",
    images: [
      {
        url: unsplash("1594223274512-ad4803739b7c"),
        alt: "A teal leather top-handle bag with a gold clasp",
      },
    ],
  },
  {
    slug: "tapered-trousers",
    name: "Tapered Crêpe Trousers",
    categorySlug: "women",
    priceCents: 79000,
    compareAtCents: 99000,
    madeToOrder: false,
    sizes: ["XS", "S", "M", "L", "XL"],
    colours: [
      { name: "Blush", stock: [1, 2, 2, 1, 1] },
    ],
    stockDetail: null,
    description:
      "High-waisted trousers in fluid wool crêpe, gathered at an elasticated waist and tapering to cuffed ankles. Patch pockets at the hip.",
    details: [
      "Wool crêpe, 100% virgin wool",
      "Elasticated waist with drawstring",
      "Cuffed ankles",
      "Two patch pockets",
    ],
    care: "Dry clean only.",
    images: [
      {
        url: unsplash("1594633312681-425c7b97ccd1"),
        alt: "Blush crêpe trousers with gathered cuffs, worn with heels",
      },
    ],
  },
  {
    slug: "denim-trucker-jacket",
    name: "Denim Trucker Jacket",
    categorySlug: "men",
    priceCents: 125000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ["S", "M", "L", "XL"],
    colours: [
      { name: "Indigo", stock: [0, 1, 1, 0] },
    ],
    stockDetail: "Only two left in this wash.",
    description:
      "A trucker jacket in rigid selvedge denim with a corduroy collar. Cut boxy and slightly cropped, with pleated front panels and adjustable waist tabs.",
    details: [
      "100% cotton selvedge denim, 14 oz",
      "Cotton corduroy collar",
      "Copper shank buttons",
      "Two flap chest pockets",
      "Adjustable waist tabs",
    ],
    care: "Wash inside out, cold, as rarely as possible. Line dry.",
    images: [
      {
        url: unsplash("1611312449408-fcece27cdbb7"),
        alt: "A dark denim jacket with a corduroy collar on a hanger",
      },
    ],
  },
  {
    slug: "floral-satin-pumps",
    name: "Floral Satin Pumps",
    categorySlug: "shoes",
    priceCents: 89000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ["36", "37", "38", "39", "40", "41"],
    colours: [
      { name: "Blue floral", stock: [0, 1, 1, 1, 1, 0] },
    ],
    stockDetail: null,
    description:
      "A pointed-toe pump in printed silk satin on a slim 100 mm heel. The print is placed by hand so no two pairs fall the same way.",
    details: [
      "Printed silk satin upper",
      "Leather lining and sole",
      "100 mm stiletto heel",
      "Pointed toe",
    ],
    care: "Keep dry. Store in the dust bags provided.",
    images: [
      {
        url: unsplash("1543163521-1bf539c55dd2"),
        alt: "Blue floral satin stiletto pumps on a white plinth",
      },
    ],
  },
  {
    slug: "cotton-fleece-sweatshirt",
    name: "Cotton Fleece Sweatshirt",
    categorySlug: "men",
    priceCents: 69000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ["S", "M", "L", "XL"],
    colours: [
      { name: "Optic white", stock: [3, 4, 4, 3] },
      { name: "Heather grey", stock: [2, 3, 3, 2] },
    ],
    stockDetail: null,
    description:
      "A crewneck sweatshirt in heavyweight loopback cotton, garment-washed for a soft hand. Dropped shoulders and a relaxed, straight body.",
    details: [
      "100% organic cotton loopback, 480 g/m²",
      "Rib-knit collar, cuffs and hem",
      "Dropped shoulders",
      "Garment-washed",
    ],
    care: "Machine wash at 30°C inside out. Dry flat.",
    images: [
      {
        url: unsplash("1620799140408-edc6dcb6d633"),
        alt: "A plain white crewneck sweatshirt laid flat",
      },
    ],
  },
  {
    slug: "round-metal-sunglasses",
    name: "Round Metal Sunglasses",
    categorySlug: "accessories",
    priceCents: 42000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ONE_SIZE,
    colours: [
      { name: "Gold / green", stock: [9] },
    ],
    stockDetail: null,
    description:
      "Round sunglasses with a fine titanium frame, keyhole bridge and bottle-green mineral glass lenses. Adjustable nose pads and acetate temple tips.",
    details: [
      "Titanium frame, gold finish",
      "Mineral glass lenses, 100% UV protection",
      "Adjustable nose pads",
      "Lens width 49 mm",
      "Leather case included",
    ],
    care: "Clean with the microfibre cloth provided. Store in the case.",
    images: [
      {
        url: unsplash("1511499767150-a48a237f0083"),
        alt: "Round sunglasses with thin gold frames and green lenses",
      },
    ],
  },
  {
    slug: "raw-denim-jeans",
    name: "Raw Denim Jeans",
    categorySlug: "men",
    priceCents: 59000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ["28", "30", "32", "34", "36"],
    colours: [
      { name: "Raw indigo", stock: [0, 1, 1, 1, 0] },
    ],
    stockDetail: null,
    description:
      "Straight-leg jeans in unwashed selvedge denim that fades to the way you wear it. Mid rise, with a button fly and a chain-stitched hem.",
    details: [
      "100% cotton selvedge denim, 15 oz",
      "Button fly",
      "Five pockets",
      "Chain-stitched hem",
    ],
    care: "Wear for months before the first wash. Then wash inside out, cold, and line dry.",
    images: [
      {
        url: unsplash("1624378439575-d8705ad7ae80"),
        alt: "Dark indigo straight-leg jeans hanging flat",
      },
    ],
  },
  {
    slug: "heavyweight-cotton-t-shirt",
    name: "Heavyweight Cotton T-Shirt",
    categorySlug: "men",
    priceCents: 32000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ["S", "M", "L", "XL"],
    colours: [
      { name: "White", stock: [0, 0, 0, 0] },
      { name: "Black", stock: [0, 0, 0, 0] },
    ],
    stockDetail: "A new run is being knitted.",
    description:
      "A boxy T-shirt in dense tubular-knit jersey, with a narrow collar that keeps its shape wash after wash.",
    details: [
      "100% cotton jersey, 260 g/m²",
      "Tubular knit, no side seams",
      "Narrow rib collar",
    ],
    care: "Machine wash at 30°C. Do not tumble dry.",
    images: [
      {
        url: unsplash("1521572163474-6864f9cf17ab"),
        alt: "A plain white crewneck T-shirt, worn",
      },
    ],
  },
  {
    slug: "long-wool-coat",
    name: "Long Wool Coat",
    categorySlug: "women",
    priceCents: 198000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ["XS", "S", "M", "L"],
    colours: [
      { name: "Sky blue", stock: [1, 2, 2, 1] },
    ],
    stockDetail: null,
    description:
      "A single-breasted coat in double-faced wool, cut long and loose with dropped shoulders and a notched collar. Unlined, so it drapes rather than stands.",
    details: [
      "Double-faced wool, 90% wool, 10% cashmere",
      "Unlined, hand-finished seams",
      "Concealed button front",
      "Two side-seam pockets",
    ],
    care: "Dry clean only. Brush after wear.",
    images: [
      {
        url: unsplash("1539109136881-3be0616acf4b"),
        alt: "A woman in a long sky-blue wool coat in front of a cathedral",
      },
    ],
  },
  {
    slug: "cotton-twill-chinos",
    name: "Cotton Twill Chinos",
    categorySlug: "men",
    priceCents: 39000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ["28", "30", "32", "34", "36"],
    colours: [
      { name: "Khaki", stock: [2, 4, 5, 4, 2] },
      { name: "Navy", stock: [1, 2, 3, 2, 1] },
    ],
    stockDetail: null,
    description:
      "Slim, tapered chinos in a dense brushed twill with a touch of stretch. Mid rise, with a clean front and a cuffable hem.",
    details: [
      "98% cotton, 2% elastane twill",
      "Zip fly with button",
      "Slant side pockets, two back welt pockets",
      "Slim tapered leg",
    ],
    care: "Machine wash at 30°C. Line dry and press warm.",
    images: [
      {
        url: unsplash("1473966968600-fa801b869a1a"),
        alt: "Khaki cotton chinos worn with white trainers",
      },
    ],
  },
  {
    slug: "structured-top-handle-bag",
    name: "Structured Top-Handle Bag",
    categorySlug: "bags",
    priceCents: 245000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ONE_SIZE,
    colours: [
      { name: "Poppy red", stock: [2] },
      { name: "Black", stock: [4] },
    ],
    stockDetail: null,
    description:
      "A boxy top-handle bag in smooth box calf, with a polished-metal hinge clasp and a single arched handle. Feet underneath keep it upright on a desk.",
    details: [
      "Box calf leather",
      "Palladium hinge clasp",
      "Detachable shoulder strap",
      "Two interior compartments",
      "W 27 × H 21 × D 12 cm",
    ],
    care: "Wipe with a soft dry cloth. Store stuffed, in its dust bag.",
    images: [
      {
        url: unsplash("1584917865442-de89df76afd3"),
        alt: "A red leather top-handle bag with a silver clasp",
      },
    ],
  },
  {
    slug: "floral-wrap-dress",
    name: "Floral Wrap Dress",
    categorySlug: "women",
    priceCents: 72000,
    compareAtCents: 89000,
    madeToOrder: false,
    sizes: ["XS", "S", "M", "L", "XL"],
    colours: [
      { name: "Ivory floral", stock: [1, 3, 3, 2, 1] },
    ],
    stockDetail: null,
    description:
      "A flutter-sleeved wrap dress in printed silk crêpe de chine, tied at the waist and falling to a ruffled, uneven hem.",
    details: [
      "100% silk crêpe de chine",
      "Wrap front with waist tie",
      "Flutter sleeves",
      "Ruffled asymmetric hem",
    ],
    care: "Hand wash cold or dry clean. Iron on the reverse.",
    images: [
      {
        url: unsplash("1496747611176-843222e1e57c"),
        alt: "A woman in an ivory floral wrap dress by the sea",
      },
    ],
  },
  {
    slug: "twisted-gold-hoops",
    name: "Twisted Gold Hoops",
    categorySlug: "accessories",
    priceCents: 28000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ONE_SIZE,
    colours: [
      { name: "Gold", stock: [12] },
    ],
    stockDetail: null,
    description:
      "Small chunky hoops in a twisted rope pattern, cast in recycled sterling silver and plated in a thick layer of 18 ct gold.",
    details: [
      "Recycled sterling silver, 18 ct gold vermeil",
      "Hinged snap closure",
      "Diameter 18 mm",
      "Sold as a pair",
    ],
    care: "Remove before swimming. Polish with a soft cloth.",
    images: [
      {
        url: unsplash("1617038220319-276d3cfab638"),
        alt: "A pair of twisted gold hoop earrings beside a pale stone",
      },
    ],
  },
  {
    slug: "brushed-fleece-hoodie",
    name: "Brushed Fleece Hoodie",
    categorySlug: "men",
    priceCents: 74000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ["S", "M", "L", "XL"],
    colours: [
      { name: "Heather grey", stock: [2, 4, 4, 2] },
    ],
    stockDetail: null,
    description:
      "A pullover hoodie in heavyweight brushed-back fleece, with a double-layered hood and a kangaroo pocket. Soft inside, dense enough to hold its shape.",
    details: [
      "100% organic cotton fleece, 500 g/m²",
      "Double-layered hood, no drawcord",
      "Kangaroo pocket",
      "Rib-knit cuffs and hem",
    ],
    care: "Machine wash at 30°C inside out. Dry flat.",
    images: [
      {
        url: unsplash("1556821840-3a63f95609a7"),
        alt: "A man seen from behind in a grey hooded sweatshirt",
      },
    ],
  },
  {
    slug: "suede-court-shoes",
    name: "Suede Court Shoes",
    categorySlug: "shoes",
    priceCents: 69000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ["36", "37", "38", "39", "40", "41"],
    colours: [
      { name: "Navy", stock: [1, 2, 2, 2, 1, 1] },
    ],
    stockDetail: null,
    description:
      "A rounded-almond court shoe in soft kid suede, set on a 90 mm heel wrapped in natural leather.",
    details: [
      "Kid suede upper",
      "Leather lining and sole",
      "90 mm leather-wrapped heel",
      "Padded footbed",
    ],
    care: "Brush with a suede brush. Treat with a protective spray before first wear.",
    images: [
      {
        url: unsplash("1515347619252-60a4bf4fff4f"),
        alt: "Navy suede court shoes with tan heels held by their backs",
      },
    ],
  },
  {
    slug: "woven-wicker-handbag",
    name: "Woven Wicker Handbag",
    categorySlug: "bags",
    priceCents: 135000,
    compareAtCents: null,
    madeToOrder: true,
    sizes: ONE_SIZE,
    colours: [
      { name: "Tangerine", stock: [0] },
    ],
    stockDetail: "Woven by hand to order. Allow four weeks.",
    description:
      "A wicker basket body under a leather flap and handle, with a hinge clasp. Light to carry and stiff enough to stand on its own.",
    details: [
      "Hand-woven rattan body",
      "Calfskin flap, handle and trims",
      "Gold-finish hinge clasp",
      "Cotton canvas lining",
      "W 25 × H 22 × D 13 cm",
    ],
    care: "Keep dry. Dust the weave with a soft brush.",
    images: [
      {
        url: unsplash("1590874103328-eac38a683ce7"),
        alt: "An orange wicker handbag with a leather flap and handle",
      },
    ],
  },
  {
    slug: "navy-wool-suit",
    name: "Navy Wool Suit",
    categorySlug: "men",
    priceCents: 289000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ["46", "48", "50", "52", "54"],
    colours: [
      { name: "Navy", stock: [1, 2, 2, 1, 1] },
    ],
    stockDetail: null,
    description:
      "A two-button suit in Super 120s wool, half-canvassed for a soft roll to the lapel. Trousers are flat-fronted with side adjusters.",
    details: [
      "Super 120s wool",
      "Half-canvas construction",
      "Notched lapels, two-button front",
      "Flat-front trousers with side adjusters",
      "Sold as a set",
    ],
    care: "Dry clean sparingly. Hang on a shaped hanger and steam between wears.",
    images: [
      {
        url: unsplash("1507679799987-c73779587ccf"),
        alt: "A man in a navy suit and striped tie buttoning his jacket",
      },
    ],
  },
  {
    slug: "red-silk-maxi-dress",
    name: "Silk Chiffon Maxi Dress",
    categorySlug: "women",
    priceCents: 158000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ["XS", "S", "M", "L"],
    colours: [
      { name: "Scarlet", stock: [0, 1, 0, 0] },
    ],
    stockDetail: "One left, in size S.",
    description:
      "A halterneck maxi dress in layered silk chiffon, cut on the bias so the skirt swings wide with every step.",
    details: [
      "100% silk chiffon, fully lined",
      "Halter neck with button fastening",
      "Bias-cut full skirt",
      "Concealed side zip",
    ],
    care: "Dry clean only.",
    images: [
      {
        url: unsplash("1595777457583-95e059d581b8"),
        alt: "A woman twirling in a flowing red maxi dress",
      },
    ],
  },
  {
    slug: "leather-backpack",
    name: "Leather Backpack",
    categorySlug: "bags",
    priceCents: 129000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ONE_SIZE,
    colours: [
      { name: "Cognac", stock: [3] },
    ],
    stockDetail: null,
    description:
      "A rounded backpack in pull-up leather that marks and burnishes with use. A padded sleeve takes a 15-inch laptop.",
    details: [
      "Pull-up cowhide leather",
      "Padded laptop sleeve, up to 15 in",
      "Zipped front pocket",
      "Adjustable padded straps",
      "W 30 × H 42 × D 14 cm",
    ],
    care: "Condition twice a year with neutral leather balm.",
    images: [
      {
        url: unsplash("1622560480605-d83c853bc5c3"),
        alt: "A brown leather backpack with a front pocket",
      },
    ],
  },
  {
    slug: "leather-strap-watch",
    name: "Leather-Strap Watch",
    categorySlug: "accessories",
    priceCents: 54000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ONE_SIZE,
    colours: [
      { name: "Rose gold / taupe", stock: [6] },
    ],
    stockDetail: null,
    description:
      "A slim three-hand watch with a 36 mm rose-gold case, a white dial with baton indices and a soft taupe calfskin strap.",
    details: [
      "Stainless steel case, rose-gold PVD",
      "Swiss quartz movement",
      "Sapphire crystal",
      "Water resistant to 30 m",
      "Interchangeable calfskin strap",
    ],
    care: "Keep the strap away from water. Battery replacement every three years.",
    images: [
      {
        url: unsplash("1524592094714-0f0654e20314"),
        alt: "A hand holding a rose-gold watch with a taupe leather strap",
      },
    ],
  },
  {
    slug: "belted-camel-wrap-coat",
    name: "Belted Camel Wrap Coat",
    categorySlug: "women",
    priceCents: 215000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ["XS", "S", "M", "L"],
    colours: [
      { name: "Camel", stock: [1, 2, 1, 1] },
    ],
    stockDetail: null,
    description:
      "A collarless wrap coat in camel hair, closed only by its belt. Deep shawl front and slit cuffs.",
    details: [
      "100% camel hair",
      "Silk lining",
      "Self-tie belt",
      "Two patch pockets",
    ],
    care: "Dry clean only. Store on a wide hanger under a breathable cover.",
    images: [
      {
        url: unsplash("1539533018447-63fcce2678e3"),
        alt: "A woman on stone steps in a belted camel wrap coat",
      },
    ],
  },
  {
    slug: "poplin-dress-shirt",
    name: "Poplin Dress Shirt",
    categorySlug: "men",
    priceCents: 29000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ["S", "M", "L", "XL"],
    colours: [
      { name: "White", stock: [4, 6, 6, 3] },
      { name: "Slate", stock: [2, 3, 3, 2] },
      { name: "Burgundy", stock: [1, 2, 2, 1] },
    ],
    stockDetail: null,
    description:
      "A crisp shirt in two-fold cotton poplin with a semi-spread collar and single-button cuffs. Mother-of-pearl buttons.",
    details: [
      "100% two-fold cotton poplin",
      "Semi-spread collar",
      "Mother-of-pearl buttons",
      "Single-button barrel cuffs",
    ],
    care: "Machine wash at 40°C. Iron damp.",
    images: [
      {
        url: unsplash("1602810318383-e386cc2a3ccf"),
        alt: "Three folded dress shirts in slate, white and burgundy on a wooden table",
      },
    ],
  },
  {
    slug: "cropped-puffer-jacket",
    name: "Cropped Puffer Jacket",
    categorySlug: "women",
    priceCents: 96000,
    compareAtCents: 128000,
    madeToOrder: false,
    sizes: ["XS", "S", "M", "L"],
    colours: [
      { name: "Sunflower", stock: [0, 1, 2, 1] },
    ],
    stockDetail: null,
    description:
      "A cropped puffer with an oversized stand collar, filled with responsibly sourced down and shelled in a water-repellent recycled nylon.",
    details: [
      "Recycled nylon shell, water-repellent",
      "Responsibly sourced down, 700 fill",
      "Stand collar",
      "Two-way zip",
    ],
    care: "Machine wash cold on a gentle cycle. Tumble dry low with dryer balls.",
    images: [
      {
        url: unsplash("1548624313-0396c75e4b1a"),
        alt: "A woman in an oversized cropped yellow puffer jacket",
      },
    ],
  },
  {
    slug: "sapphire-statement-earrings",
    name: "Sapphire Statement Earrings",
    categorySlug: "accessories",
    priceCents: 36000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ONE_SIZE,
    colours: [
      { name: "Silver / blue", stock: [2] },
    ],
    stockDetail: "The last two pairs of this design.",
    description:
      "Drop earrings framed in baguette-cut crystals around a deep blue pear-cut stone. Made for evenings.",
    details: [
      "Rhodium-plated brass",
      "Glass crystals and synthetic sapphire",
      "Post back",
      "Length 6 cm",
    ],
    care: "Store separately. Avoid perfume and water.",
    images: [
      {
        url: unsplash("1535632066927-ab7c9ab60908"),
        alt: "A pair of crystal drop earrings with blue stones on a green leaf",
      },
    ],
  },
  {
    slug: "panelled-runner-sneakers",
    name: "Panelled Runner Sneakers",
    categorySlug: "shoes",
    priceCents: 49000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ["38", "39", "40", "41", "42", "43", "44"],
    colours: [
      { name: "Multicolour", stock: [1, 2, 3, 3, 3, 2, 1] },
    ],
    stockDetail: null,
    description:
      "A chunky runner layering suede, mesh and leather panels in pastel tones over a sculpted rubber sole. Red laces come in the box as an alternative.",
    details: [
      "Suede, mesh and leather upper",
      "Moulded EVA midsole",
      "Rubber outsole",
      "Two pairs of laces",
    ],
    care: "Spot clean with a damp cloth. Air dry away from heat.",
    images: [
      {
        url: unsplash("1560769629-975ec94e6a86"),
        alt: "A pair of chunky multicoloured sneakers on white plinths",
      },
    ],
  },
  {
    slug: "canvas-daypack",
    name: "Canvas Daypack",
    categorySlug: "bags",
    priceCents: 38000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ONE_SIZE,
    colours: [
      { name: "Midnight", stock: [7] },
    ],
    stockDetail: null,
    description:
      "A clean-lined backpack in waxed cotton canvas with a hidden zip back pocket for a passport or phone.",
    details: [
      "Waxed cotton canvas",
      "Padded laptop sleeve, up to 14 in",
      "Hidden back pocket",
      "Water-resistant zips",
      "18 L",
    ],
    care: "Spot clean. Re-wax once a year.",
    images: [
      {
        url: unsplash("1553062407-98eeb64c6a62"),
        alt: "A navy canvas backpack standing on a pale floor",
      },
    ],
  },
  {
    slug: "fleece-jogger-set",
    name: "Fleece Jogger Set",
    categorySlug: "women",
    priceCents: 58000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ["XS", "S", "M", "L"],
    colours: [
      { name: "Saffron", stock: [2, 3, 3, 2] },
    ],
    stockDetail: null,
    description:
      "A cropped hoodie and relaxed joggers in brushed cotton fleece, dyed a bright saffron. Sold together as a set.",
    details: [
      "100% cotton fleece",
      "Cropped hoodie with drawcord",
      "Joggers with elasticated waist and cuffs",
      "Sold as a set",
    ],
    care: "Machine wash at 30°C inside out with like colours.",
    images: [
      {
        url: unsplash("1515886657613-9f3515b0c78f"),
        alt: "A woman on a basketball court in a saffron fleece hoodie and joggers",
      },
    ],
  },
  {
    slug: "leather-belt",
    name: "Leather Belt",
    categorySlug: "accessories",
    priceCents: 18000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ["80", "85", "90", "95", "100"],
    colours: [
      { name: "Tan", stock: [2, 4, 5, 4, 2] },
    ],
    stockDetail: null,
    description:
      "A 35 mm belt cut from a single strip of vegetable-tanned bridle leather, stitched along both edges and finished with a brushed-steel buckle.",
    details: [
      "Vegetable-tanned bridle leather",
      "Brushed stainless steel buckle",
      "Width 35 mm",
      "Five holes, 25 mm apart",
    ],
    care: "Condition occasionally with neutral wax.",
    images: [
      {
        url: unsplash("1624222247344-550fb60583dc"),
        alt: "A close-up of a tan leather belt with a steel buckle",
      },
    ],
  },
  {
    slug: "oxford-cotton-shirt",
    name: "Oxford Cotton Shirt",
    categorySlug: "men",
    priceCents: 26000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ["S", "M", "L", "XL"],
    colours: [
      { name: "Sky blue", stock: [0, 0, 0, 0] },
    ],
    stockDetail: "Restocking soon.",
    description:
      "A regular-fit shirt in soft Oxford cotton, with a narrow point collar so it works under a tie or open on its own.",
    details: [
      "100% cotton Oxford weave",
      "Point collar",
      "Single chest pocket",
      "Curved hem",
    ],
    care: "Machine wash at 40°C. Iron damp.",
    images: [
      {
        url: unsplash("1620012253295-c15cc3e65df4"),
        alt: "A man in a sky-blue shirt and patterned tie adjusting his cuff",
      },
    ],
  },
  {
    slug: "belted-floral-midi-dress",
    name: "Belted Floral Midi Dress",
    categorySlug: "women",
    priceCents: 84000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ["XS", "S", "M", "L", "XL"],
    colours: [
      { name: "Red floral", stock: [1, 2, 3, 2, 1] },
    ],
    stockDetail: null,
    description:
      "A V-neck midi dress in printed cotton voile with a full gathered skirt, cinched by a wide belt with a covered buckle.",
    details: [
      "100% cotton voile, cotton lining",
      "V neck, short ruffled sleeves",
      "Wide self-covered belt",
      "Concealed back zip",
    ],
    care: "Machine wash at 30°C on a delicate cycle. Line dry.",
    images: [
      {
        url: unsplash("1572804013309-59a88b7e92f1"),
        alt: "A woman in a red floral belted midi dress against an ochre wall",
      },
    ],
  },
  {
    slug: "croc-embossed-mini-bag",
    name: "Croc-Embossed Mini Bag",
    categorySlug: "bags",
    priceCents: 112000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ONE_SIZE,
    colours: [
      { name: "Oxblood", stock: [2] },
    ],
    stockDetail: null,
    description:
      "A small upright bag in glossy croc-embossed calfskin with a square gold clasp and a fine leather handle.",
    details: [
      "Croc-embossed calfskin",
      "Gold-finish push-lock clasp",
      "Leather top handle",
      "Fits a phone and cards",
      "W 15 × H 19 × D 7 cm",
    ],
    care: "Wipe with a soft dry cloth. Keep away from rain.",
    images: [
      {
        url: unsplash("1575032617751-6ddec2089882"),
        alt: "A hand holding an oxblood croc-embossed mini bag with a gold clasp",
      },
    ],
  },
  {
    slug: "oversized-field-jacket",
    name: "Oversized Field Jacket",
    categorySlug: "women",
    priceCents: 89000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ["XS", "S", "M", "L"],
    colours: [
      { name: "Olive", stock: [2, 3, 2, 1] },
    ],
    stockDetail: null,
    description:
      "A roomy four-pocket field jacket in garment-dyed cotton sateen, with a drawcord waist and snap-down storm flap.",
    details: [
      "100% cotton sateen, garment-dyed",
      "Four bellows pockets",
      "Internal drawcord waist",
      "Zip and snap front",
    ],
    care: "Machine wash at 30°C. Line dry.",
    images: [
      {
        url: unsplash("1544022613-e87ca75a784a"),
        alt: "A woman in a black beanie and an oversized olive field jacket",
      },
    ],
  },
  {
    slug: "wool-felt-fedora",
    name: "Wool Felt Fedora",
    categorySlug: "accessories",
    priceCents: 31000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ["S", "M", "L"],
    colours: [
      { name: "Slate blue", stock: [1, 3, 2] },
    ],
    stockDetail: null,
    description:
      "A wide-brimmed fedora blocked by hand from rabbit-and-wool felt, with a grosgrain band in a darker tone.",
    details: [
      "Wool and rabbit felt",
      "Grosgrain ribbon band",
      "Brim 8 cm",
      "Cotton sweatband",
    ],
    care: "Handle by the brim. Store crown-down in a hat box.",
    images: [
      {
        url: unsplash("1514327605112-b887c0e61c0a"),
        alt: "A woman with long hair wearing a slate-blue wide-brimmed fedora",
      },
    ],
  },
  {
    slug: "windowpane-check-suit",
    name: "Windowpane Check Three-Piece Suit",
    categorySlug: "men",
    priceCents: 335000,
    compareAtCents: null,
    madeToOrder: true,
    sizes: ["46", "48", "50", "52", "54"],
    colours: [
      { name: "Blue check", stock: [0, 0, 0, 0, 0] },
    ],
    stockDetail: "Cut to your size in our tailoring workshop. Allow eight weeks.",
    description:
      "A three-piece suit in a bold windowpane-check worsted, with a five-button waistcoat and flat-fronted trousers.",
    details: [
      "Worsted wool, 280 g/m²",
      "Full-canvas jacket",
      "Five-button waistcoat",
      "Flat-front trousers",
      "Sold as a set",
    ],
    care: "Dry clean sparingly. Steam between wears.",
    images: [
      {
        url: unsplash("1594938298603-c8148c4dae35"),
        alt: "A man in a blue windowpane-check three-piece suit",
      },
    ],
  },
  {
    slug: "studded-chain-shoulder-bag",
    name: "Studded Chain Shoulder Bag",
    categorySlug: "bags",
    priceCents: 198000,
    compareAtCents: 245000,
    madeToOrder: false,
    sizes: ONE_SIZE,
    colours: [
      { name: "Dove grey", stock: [1] },
    ],
    stockDetail: "Last piece, from the archive sale.",
    description:
      "A compact flap bag in smooth calfskin, studded along the centre and finished with a lock clasp. The chain strap slides to wear long or doubled.",
    details: [
      "Calfskin leather",
      "Gold-finish studs and lock",
      "Sliding chain and leather strap",
      "W 22 × H 15 × D 7 cm",
    ],
    care: "Wipe with a soft dry cloth. Store in its dust bag.",
    images: [
      {
        url: unsplash("1559563458-527698bf5295"),
        alt: "A grey studded shoulder bag with a gold chain on a white desk",
      },
    ],
  },
  {
    slug: "chambray-shirt-dress",
    name: "Chambray Shirt Dress",
    categorySlug: "women",
    priceCents: 64000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ["XS", "S", "M", "L", "XL"],
    colours: [
      { name: "Light indigo", stock: [2, 3, 3, 2, 1] },
    ],
    stockDetail: null,
    description:
      "A short-sleeved shirt dress in washed cotton chambray, buttoned all the way down, with a gathered skirt and two flap chest pockets.",
    details: [
      "100% cotton chambray",
      "Full button front",
      "Two flap chest pockets",
      "Gathered knee-length skirt",
    ],
    care: "Machine wash at 30°C. Line dry.",
    images: [
      {
        url: unsplash("1591369822096-ffd140ec948f"),
        alt: "A light indigo chambray shirt dress with a gathered skirt",
      },
    ],
  },
  {
    slug: "bifold-leather-wallet",
    name: "Bifold Leather Wallet",
    categorySlug: "accessories",
    priceCents: 16000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ONE_SIZE,
    colours: [
      { name: "Chestnut", stock: [10] },
    ],
    stockDetail: null,
    description:
      "A slim bifold in waxed vegetable-tanned leather, saddle-stitched by hand. It darkens to a deep patina with use.",
    details: [
      "Vegetable-tanned leather",
      "Hand saddle-stitched",
      "Six card slots, one note pocket",
      "W 11 × H 9 cm closed",
    ],
    care: "Condition occasionally with neutral wax.",
    images: [
      {
        url: unsplash("1627123424574-724758594e93"),
        alt: "A worn chestnut leather bifold wallet against a dark background",
      },
    ],
  },
  {
    slug: "patent-pointed-pumps",
    name: "Patent Pointed Pumps",
    categorySlug: "shoes",
    priceCents: 62000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ["36", "37", "38", "39", "40", "41"],
    colours: [
      { name: "Black", stock: [0, 0, 0, 0, 0, 0] },
    ],
    stockDetail: "Back in early December.",
    description:
      "A sharply pointed pump in mirror-shine patent leather on a slim 95 mm heel. The classic, done precisely.",
    details: [
      "Patent calfskin upper",
      "Leather lining and sole",
      "95 mm stiletto heel",
    ],
    care: "Wipe with a damp cloth. Store in the dust bags provided.",
    images: [
      {
        url: unsplash("1596703263926-eb0762ee17e4"),
        alt: "A black pointed stiletto pump held up by its heel",
      },
    ],
  },
  {
    slug: "striped-wide-leg-trousers",
    name: "Striped Wide-Leg Trousers",
    categorySlug: "women",
    priceCents: 56000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ["XS", "S", "M", "L"],
    colours: [
      { name: "Black / ivory", stock: [1, 2, 2, 1] },
    ],
    stockDetail: null,
    description:
      "High-waisted palazzo trousers in a fluid viscose twill, woven with a bold vertical stripe that lengthens the leg.",
    details: [
      "100% viscose twill",
      "High waist with side zip",
      "Pressed front crease",
      "Wide, floor-skimming leg",
    ],
    care: "Hand wash cold or dry clean.",
    images: [
      {
        url: unsplash("1509631179647-0177331693ae"),
        alt: "A woman against a teal wall in black and white striped wide-leg trousers",
      },
    ],
  },
  {
    slug: "rib-knit-beanie",
    name: "Rib-Knit Beanie",
    categorySlug: "accessories",
    priceCents: 9000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ONE_SIZE,
    colours: [
      { name: "Chocolate", stock: [8] },
      { name: "Blush", stock: [6] },
      { name: "Bottle green", stock: [5] },
    ],
    stockDetail: null,
    description:
      "A chunky fisherman beanie in a deep rib of lambswool, with a turn-up cuff.",
    details: [
      "100% lambswool",
      "Fisherman rib",
      "Turn-up cuff",
    ],
    care: "Hand wash cold and dry flat.",
    images: [
      {
        url: unsplash("1576871337632-b9aef4c17ab9"),
        alt: "Rib-knit beanies in brown, pink and green on a stone floor",
      },
    ],
  },
  {
    slug: "leather-satchel",
    name: "Leather Satchel",
    categorySlug: "bags",
    priceCents: 148000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ONE_SIZE,
    colours: [
      { name: "Mustard", stock: [3] },
      { name: "Black", stock: [2] },
    ],
    stockDetail: null,
    description:
      "A wide flap satchel in pebbled calfskin with a metal push-lock, roomy enough for a laptop and the day's papers.",
    details: [
      "Pebbled calfskin",
      "Metal push-lock",
      "Adjustable shoulder strap",
      "Fits a 13-inch laptop",
      "W 35 × H 26 × D 9 cm",
    ],
    care: "Wipe with a soft dry cloth. Store stuffed.",
    images: [
      {
        url: unsplash("1612902456551-333ac5afa26e"),
        alt: "A mustard leather satchel with a metal clasp in warm sunlight",
      },
    ],
  },
  {
    slug: "cotton-crewneck-sweatshirt",
    name: "Cotton Crewneck Sweatshirt",
    categorySlug: "women",
    priceCents: 42000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ["XS", "S", "M", "L"],
    colours: [
      { name: "Marigold", stock: [3, 4, 4, 2] },
    ],
    stockDetail: null,
    description:
      "A soft crewneck in garment-dyed loopback cotton with a relaxed body and long rib cuffs.",
    details: [
      "100% organic cotton loopback",
      "Garment-dyed",
      "Long rib cuffs",
      "Relaxed fit",
    ],
    care: "Machine wash at 30°C with like colours. Dry flat.",
    images: [
      {
        url: unsplash("1578587018452-892bacefd3f2"),
        alt: "A woman in a marigold crewneck sweatshirt and jeans",
      },
    ],
  },
  {
    slug: "layered-chain-necklace",
    name: "Layered Chain Necklace",
    categorySlug: "accessories",
    priceCents: 24000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ONE_SIZE,
    colours: [
      { name: "Gold", stock: [7] },
    ],
    stockDetail: null,
    description:
      "Two fine chains on one clasp: a short herringbone collar and a longer cable chain with a small pearl drop.",
    details: [
      "18 ct gold vermeil",
      "Freshwater pearl",
      "Lengths 40 and 50 cm",
      "Lobster clasp",
    ],
    care: "Remove before swimming. Polish with a soft cloth.",
    images: [
      {
        url: unsplash("1590548784585-643d2b9f2925"),
        alt: "Layered gold chain necklaces worn over an olive top",
      },
    ],
  },
  {
    slug: "off-shoulder-jersey-top",
    name: "Off-Shoulder Jersey Top",
    categorySlug: "women",
    priceCents: 34000,
    compareAtCents: 45000,
    madeToOrder: false,
    sizes: ["XS", "S", "M", "L"],
    colours: [
      { name: "Plum", stock: [1, 2, 1, 0] },
    ],
    stockDetail: null,
    description:
      "A fitted bardot top in heavy stretch jersey, with a folded neckline that sits just off the shoulder.",
    details: [
      "92% viscose, 8% elastane jersey",
      "Folded bardot neckline",
      "Fitted body",
    ],
    care: "Machine wash at 30°C on a delicate cycle. Dry flat.",
    images: [
      {
        url: unsplash("1566174053879-31528523f8ae"),
        alt: "A woman in a plum off-shoulder top against a violet backdrop",
      },
    ],
  },
  {
    slug: "high-rise-denim-shorts",
    name: "High-Rise Denim Shorts",
    categorySlug: "women",
    priceCents: 22000,
    compareAtCents: null,
    madeToOrder: false,
    sizes: ["24", "26", "28", "30"],
    colours: [
      { name: "Bleached blue", stock: [2, 4, 3, 2] },
    ],
    stockDetail: null,
    description:
      "High-waisted shorts in rigid cotton denim, washed light and distressed by hand, with rolled hems.",
    details: [
      "100% cotton denim",
      "High rise, button fly",
      "Hand-distressed",
      "Rolled hems",
    ],
    care: "Machine wash at 30°C inside out. Line dry.",
    images: [
      {
        url: unsplash("1591195853828-11db59a44f6b"),
        alt: "Light-wash distressed denim shorts laid flat",
      },
    ],
  },
];

async function main() {
  const categoryIds = new Map(
    categoryRows.map((c) => [c.slug, crypto.randomUUID()]),
  );

  // The extended catalogue (scripts/catalogue-extended.ts) is dated just
  // after the original pieces, so it leads "newest first".
  const rows = [
    ...productRows.map((row, i) => ({ row, createdAt: new Date(BASE_DATE - i * day) })),
    ...extendedProducts.map((row, i) => ({ row, createdAt: extendedCreatedAt(i) })),
  ];
  const slugs = new Set(rows.map(({ row }) => row.slug));
  if (slugs.size !== rows.length) throw new Error("Duplicate product slug");

  const seeded = rows.map(
    ({ row: { categorySlug, images: ownImages, sizes, colours: ownColours, ...row }, createdAt }) => {
      const categoryId = categoryIds.get(categorySlug);
      if (!categoryId) throw new Error(`Unknown category "${categorySlug}"`);
      const id = crypto.randomUUID();
      const extra = colourways[row.slug] ?? [];
      const colours = [
        ...ownColours,
        ...extra.map(({ name }) => ({ name, stock: ownColours[0].stock })),
      ];
      const images = [
        ...ownImages,
        ...extra.map(({ name, hue }) => ({
          url: `${ownImages[0].url}?hue=${hue}`,
          alt: `${row.name} in ${name.toLowerCase()}`,
          colour: name,
        })),
      ];
      const variants = colours.flatMap((colour) => {
        if (colour.stock.length !== sizes.length) {
          throw new Error(`${row.slug} / ${colour.name}: one quantity per size`);
        }
        return sizes.map((size, s) => ({
          productId: id,
          sku: [row.slug, colour.name, size].map(skuPart).join("-"),
          colour: colour.name,
          size,
          stockQuantity: colour.stock[s],
        }));
      });
      return {
        variants: variants.map((v, position) => ({ ...v, position })),
        product: {
          ...row,
          id,
          categoryId,
          createdAt,
        },
        images: images.map((image, position) => ({
          ...image,
          productId: id,
          position,
        })),
      };
    },
  );
  const productValues = seeded.map((s) => s.product);
  const imageValues = seeded.flatMap((s) => s.images);
  const variantValues = seeded.flatMap((s) => s.variants);

  await db.batch([
    // Children first: products restrict category deletes.
    db.delete(productVariants),
    db.delete(productImages),
    db.delete(products),
    db.delete(categories),
    // Collections are listed oldest first, so the order above is kept.
    db.insert(categories).values(
      categoryRows.map((c, i) => ({
        ...c,
        id: categoryIds.get(c.slug),
        createdAt: new Date(BASE_DATE + i * 1000),
      })),
    ),
    db.insert(products).values(productValues),
    db.insert(productImages).values(imageValues),
    db.insert(productVariants).values(variantValues),
  ]);

  console.log(
    `Seeded ${categoryRows.length} categories, ${productValues.length} products, ${variantValues.length} variants, ${imageValues.length} images.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
