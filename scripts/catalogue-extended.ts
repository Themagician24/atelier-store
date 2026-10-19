import { unsplash } from "../src/lib/unsplash";

/*
 * The extended catalogue: ~330 pieces across watches, jewellery, fragrance,
 * shoes, bags, accessories and ready-to-wear. Unbranded, like the rest of the
 * shop. Every photo was checked by eye: it exists on Unsplash's CDN, shows
 * the piece it is named for, and carries no visible maker's logo. One photo,
 * one piece; the name, colour and alt text describe what the photo shows.
 *
 * Prices, stock and sale prices are drawn from a PRNG seeded by the slug, so
 * every run produces the same catalogue.
 */

/**
 * [Unsplash id, name, colour, alt, fit]. `fit` ("men" | "women") picks the
 * size run; on a ready-to-wear line it also files the piece under that
 * collection, while shoes stay in Shoes whoever they are cut for.
 */
type Entry = [id: string, name: string, colour: string, alt: string, fit?: string];

type Copy = { description: (name: string, colour: string) => string; details: string[] };

type Line = {
  category: string;
  /** Sizes, small to large; may depend on the entry's category. */
  sizes: (category: string) => string[];
  /** Whole dollars, inclusive. */
  price: [number, number];
  threshold?: number;
  /** Highest quantity per size. */
  maxStock?: number;
  /** Share of the line made to order (0–1), with the note shown beside it. */
  madeToOrder?: [share: number, detail: string];
  copy: Copy[];
  care: string;
  entries: Entry[];
};

export type ExtendedProduct = {
  slug: string;
  name: string;
  categorySlug: string;
  priceCents: number;
  compareAtCents: number | null;
  madeToOrder: boolean;
  stockDetail: string | null;
  lowStockThreshold: number;
  description: string;
  details: string[];
  care: string;
  images: { url: string; alt: string }[];
  sizes: string[];
  colours: { name: string; stock: number[] }[];
};

const ONE_SIZE = ["One size"];
const one = () => ONE_SIZE;
const apparel = (c: string) => (c === "women" ? ["XS", "S", "M", "L"] : ["S", "M", "L", "XL"]);
const shoes = (c: string) =>
  c === "women" ? ["36", "37", "38", "39", "40"] : ["40", "41", "42", "43", "44", "45"];
const lower = (s: string) => s.toLowerCase();

const lines: Line[] = [
  // ─── Watches ────────────────────────────────────────────────────────────
  {
    category: "watches",
    sizes: one,
    price: [690, 9800],
    threshold: 1,
    maxStock: 3,
    copy: [
      {
        description: (n, c) =>
          `The ${n} in ${lower(c)}: a case finished by hand, alternating brushed and polished surfaces, under a domed sapphire crystal. Sized to sit flat under a shirt cuff.`,
        details: ["Stainless steel case", "Domed sapphire crystal", "Water resistant to 100 m", "Two-year guarantee"],
      },
      {
        description: (n, c) =>
          `A ${lower(c)} ${n.toLowerCase()} built around a Swiss automatic movement with a 38-hour reserve, visible through the exhibition caseback.`,
        details: ["Swiss automatic movement", "Exhibition caseback", "Screw-down crown", "Water resistant to 50 m"],
      },
      {
        description: (n, c) =>
          `Our ${n}, ${lower(c)}, with applied indices and luminous hands that read at a glance in low light. The strap changes without tools.`,
        details: ["Applied indices", "Luminous hands and markers", "Quick-release strap", "Water resistant to 100 m"],
      },
    ],
    care: "Wipe with a soft, dry cloth. Have the water resistance checked every two years and the movement serviced every five.",
    entries: [
      ["1618215650148-e8e61eae521c", "Open-Worked Automatic", "Steel", "A man wearing an open-worked automatic watch with a dark suit"],
      ["1670177257750-9b47927f68eb", "Pilot Chronograph 42", "Brown", "A chronograph with a brown dial and leather strap resting on a rock"],
      ["1600003014608-c2ccc1570a65", "Bronze Diver 41", "Bronze", "A bronze dive watch with a copper dial in a wooden box"],
      ["1524805444758-089113d48a6d", "Regulator Tourbillon", "Cognac", "A white-dial tourbillon watch on a cognac leather strap"],
      ["1767009951316-c3d2b63179ef", "Gilt Dial Diver 40", "Gold dial", "A dive watch with a textured gold dial on a steel bracelet"],
      ["1604242692760-2f7b0c26856d", "Field Watch 38", "Ivory dial", "Watches with ivory dials laid out in a navy watch box"],
      ["1634140704051-58a787556cd1", "Skeleton Automatic 40", "Black", "A skeleton automatic watch on top of a black box"],
      ["1636639818651-d97365346a5c", "Sunray Automatic 39", "Blue", "A watch with a blue sunray dial on a steel bracelet against black"],
      ["1773755060442-6d128b70dd20", "Panda Chronograph 41", "Navy and rose gold", "A chronograph with a navy dial and rose-gold case on a steel bracelet"],
      ["1772638904164-eed7c6b1e57e", "Sport Diver 42", "Slate", "A dive watch with a slate dial on a dark background"],
      ["1612817159949-195b6eb9e31a", "Dress Automatic 38", "Black", "A black-dial dress watch on a leather strap in low light"],
      ["1524592094714-0f0654e20314", "Minimal Quartz 36", "Taupe", "A hand holding a minimal white-dial watch on a taupe strap"],
      ["1582150264904-e0bea5ef0ad1", "Mesh Bracelet 40", "Blue", "A blue-dial watch on a fine steel mesh bracelet"],
      ["1629581678313-36cf745a9af9", "Steel Chronograph 42", "Teal", "A chronograph with a teal dial on a steel link bracelet"],
      ["1590995505834-e5380bba1865", "Slim Mesh 34", "Rose gold", "A slim rose-gold watch with a white dial worn on a wrist"],
      ["1580837428500-74aa7eefc672", "Classic Quartz 36", "White", "A white-dial watch worn with a burgundy sweater by the water"],
      ["1715702485014-3860cdd32697", "Colour Strap 38", "Yellow", "A grey-dial watch on a yellow strap worn on a wrist"],
      ["1575260279086-4d6bd9efcbeb", "Steel Quartz 38", "Blue", "Two people wearing steel watches with blue dials"],
      ["1786217414328-e8a1428014fe", "Field Quartz 42", "Grey", "A black wristwatch with a grey strap on river stones"],
      ["1779409919727-bafd9a982269", "Matte Black 40", "Black", "A matte black wristwatch on a weathered tree trunk"],
      ["1580226223521-5412ec88237a", "Ceramic White 38", "White", "A white watch on a white strap on a wooden table"],
      ["1579171931975-97962e46be2d", "Classic 32", "Tan", "A white-dial watch on a tan strap worn with a beige trench coat"],
      ["1786908067257-a3deb5e1e52b", "Mesh Quartz 39", "Black", "Four black wristwatches with mesh bracelets arranged in a circle"],
    ],
  },

  // ─── Jewellery ──────────────────────────────────────────────────────────
  {
    category: "jewellery",
    sizes: one,
    price: [180, 2400],
    threshold: 2,
    copy: [
      {
        description: (n, c) =>
          `The ${n} in ${lower(c)}, cast and polished in our jewellery workshop. Each link is soldered shut, so it keeps its line and never snags.`,
        details: ["18k gold vermeil on sterling silver", "Soldered links", "Lobster clasp", "Adjustable length"],
      },
      {
        description: (n, c) =>
          `A ${n.toLowerCase()} in ${lower(c)}, weighty enough to wear on its own and fine enough to layer.`,
        details: ["Solid sterling silver, gold plated", "Hand-finished", "Hypoallergenic", "Presented in a linen pouch"],
      },
    ],
    care: "Store on its own in the pouch provided. Remove before swimming or applying perfume; polish with a soft dry cloth.",
    entries: [
      ["1602173574767-37ac01994b2a", "Chunky Link Bracelet", "Gold", "A chunky gold link bracelet on an open magazine"],
      ["1616837874254-8d5aaa63e273", "Herringbone Necklace", "Gold", "A woman in a black blazer wearing a flat gold herringbone necklace"],
      ["1635767798638-3e25273a8236", "Layered Coin Necklace", "Gold", "Layered paperclip chains with a gold coin pendant"],
      ["1633555234296-657a18d8b81a", "Fine Box Chain", "Gold", "A woman in a white shirt wearing a fine gold chain"],
      ["1633810542706-90e5ff7557be", "Paperclip Chain Necklace", "Gold", "A woman in black wearing a gold paperclip chain and bracelet"],
      ["1625908733875-efa9c75c084d", "Two-Tone Link Bracelet", "Silver", "A silver link bracelet on black fabric"],
      ["1599459182681-c938b7f65af0", "Layered Pendant Set", "Gold", "A woman wearing layered gold chains with small pendants"],
      ["1631050165155-421c47e306f7", "Beaded Station Chain", "Gold", "A fine gold chain with bead stations on white linen"],
      ["1599459183200-59c7687a0275", "Coin Pendant Duo", "Gold", "A woman in a gold dress wearing two layered necklaces with a coin pendant"],
      ["1728647771865-636b715674f4", "Chunky Chain Collar", "Gold", "A woman in a white jacket wearing a chunky gold chain"],
      ["1659708701940-e60893ef03d0", "Graduated Link Chains", "Gold", "Gold link chains of graduated sizes on a dark surface"],
      ["1721807550979-6e662d370e92", "Cuban Curb Chain", "Gold", "A heavy gold curb chain on a black background"],
      ["1613498510372-8901cad084a2", "Figaro Chain 5 mm", "Gold", "A man in a dark coat wearing a gold figaro chain"],
      ["1708220040856-131e4f86a1aa", "Curb Chain Bracelet", "Gold", "A gold curb chain draped over a white plinth"],
      ["1585711715631-1e6bf224f092", "Rolo Chain", "Gold", "A close-up of a gold rolo chain on grey fabric"],
      ["1662434923031-b9bf1b6c10e2", "Fine Chain Trio", "Gold", "Three fine gold chains laid on a stone ledge"],
      ["1688406264720-e2f9389c9ed1", "Fringe Necklace", "Gold", "A gold fringe necklace on a black display bust"],
      ["1758995115682-1452a1a9e35b", "Mesh Bib Necklace and Earrings", "Gold", "A gold mesh bib necklace and matching earrings on a display bust"],
      ["1775212429587-82779c6f8775", "Fine Chain Bracelet", "Gold", "A fine gold chain bracelet and ring worn on a hand"],
      ["1633810543462-77c4a3b13f07", "Oval Link Bracelet", "Gold", "A gold oval link bracelet worn on a wrist"],
      ["1777999802051-f6f0296e76af", "ID Tag Bracelet", "Gold", "A fine gold bracelet with a polished ID tag"],
      ["1611107683227-e9060eccd846", "Textured Bangle Stack", "Gold", "A stack of textured gold bangles on white"],
      ["1778000000743-87e855360c51", "Charm Chain Bracelets", "Gold", "Fine gold bracelets with small charms on white"],
      ["1679156271456-d6068c543ee7", "Crystal Tennis Bracelet", "Gold", "Gold bracelets set with crystals on a dark surface"],
      ["1777817117657-d2fa6aacef06", "Beaded Cuff Pair", "Gold and red", "Beaded cuffs in gold, black and red worn on a woman's arms"],
      ["1655707063513-a08dad26440e", "Pavé Crossover Bangle", "Gold", "A gold crossover bangle set with pavé stones on white silk"],
      ["1689397136362-dce64e557fcc", "Halo Chain Bracelet", "Rose gold", "A rose-gold chain bracelet with a halo stone on a grey cushion"],
      ["1689367436442-76c859315008", "Citrine Bangle", "Gold", "A gold bangle set with four citrine stones on stone"],
      ["1689367436629-1d288f1e23b6", "Citrine Bangle, Slim", "Gold", "A slim gold bangle set with citrine stones, side on"],
      ["1629118639934-2b241503956c", "Pavé Bangle Pair", "Gold", "Two gold bangles set with pavé stones on pink silk"],
    ],
  },
  {
    category: "jewellery",
    sizes: () => ["5", "6", "7", "8"],
    price: [240, 4800],
    threshold: 2,
    maxStock: 3,
    madeToOrder: [0.3, "Set to your size in our jewellery workshop, ready in three weeks."],
    copy: [
      {
        description: (n, c) =>
          `The ${n} in ${lower(c)}, its stones set by hand and the band shaped to sit comfortably beside others.`,
        details: ["18k gold", "Hand-set stones", "Comfort-fit band", "Resizing available"],
      },
      {
        description: (n, c) =>
          `A ${n.toLowerCase()} in ${lower(c)}, cast from a hand-carved wax and finished to a soft high polish.`,
        details: ["Solid 14k gold", "Cast from a carved wax", "High polish", "Hallmarked"],
      },
    ],
    care: "Take off before washing your hands or exercising. Clean with warm soapy water and a soft brush; dry with a lint-free cloth.",
    entries: [
      ["1543294001-f7cd5d7fb516", "Pavé Stacking Rings", "Gold", "Three gold stacking rings set with pavé diamonds"],
      ["1611955167811-4711904bb9f8", "Cluster Cocktail Ring", "Rose gold", "A rose-gold cluster ring set with pale stones on linen"],
      ["1589207212797-cfd546dea0fe", "Polished Band", "Rose gold", "A plain polished rose-gold band on a dark wooden table"],
      ["1713950920412-97799efdf870", "Solitaire Engagement Ring", "Rose gold", "A rose-gold solitaire ring on a black surface"],
      ["1705326455036-0fab8ecba04d", "Engraved Signet", "Gold", "A heavy gold signet ring with an engraved face"],
      ["1727784635912-6f6e95d2f66a", "Statement Signet Trio", "Gold", "Three gold statement rings among leaves on pale green"],
      ["1561812350-932aed735105", "Sapphire Pavé Ring", "Gold", "A gold ring with a blue sapphire and pavé shoulders"],
      ["1626122780071-c09d403b8e32", "Mixed Ring Set", "Gold", "A scattered set of gold rings on taupe fabric"],
      ["1626784214536-d859187e0bd0", "Jewelled Dome Ring", "Gold", "A domed gold ring set with coloured stones on black fabric"],
      ["1701777696682-16e569fa8597", "Diamond Wrap Ring", "Gold", "A gold wrap ring set with diamonds on white cloth"],
      ["1626784213922-d9f1e050cf8f", "Flower Cluster Ring", "Gold", "A gold flower cluster ring with a central diamond on dark fabric"],
      ["1701777696655-17fb18395ccc", "Starlight Wrap Ring", "Gold", "A gold spiral ring set with small diamond stars"],
      ["1654521883301-070279dd0ae1", "Wedding Band Pair", "Rose gold", "A pair of rose-gold bands on a cream knit"],
      ["1758995116142-c626a962a682", "Filigree Ring", "Gold", "Ornate filigree gold rings displayed on cream stands"],
    ],
  },
  {
    category: "jewellery",
    sizes: one,
    price: [160, 1900],
    threshold: 2,
    copy: [
      {
        description: (n, c) =>
          `The ${n} in ${lower(c)}, light enough to wear all day, on posts of solid gold.`,
        details: ["18k gold vermeil", "Solid gold posts", "Butterfly backs", "Sold as a pair"],
      },
      {
        description: (n, c) => `A pair of ${n.toLowerCase()} in ${lower(c)}, finished by hand.`,
        details: ["Sterling silver, gold plated", "Hypoallergenic", "Sold as a pair"],
      },
    ],
    care: "Store separately to avoid scratches. Keep away from perfume and water; wipe clean with a dry cloth.",
    entries: [
      ["1617038220319-276d3cfab638", "Twisted Hoops", "Gold", "Two twisted gold hoop earrings on white stones"],
      ["1535632066927-ab7c9ab60908", "Sapphire Drop Earrings", "Silver and blue", "Silver drop earrings set with blue stones on a palm leaf"],
      ["1693212793204-bcea856c75fe", "Laurel Crystal Earrings", "Silver", "Crystal laurel-wreath earrings on black satin"],
      ["1764181106586-1ca290a3a395", "Heart Hoops", "Gold", "Gold heart-shaped hoops displayed on seashells"],
      ["1590166223826-12dee1677420", "Pearl Drop Earrings", "Gold and pearl", "A woman with red hair wearing a gold and pearl drop earring"],
      ["1778182553300-7593326ca29d", "Seashell Earrings", "Gold", "Gold seashell earrings resting on a white dish"],
      ["1787520309842-6a8e4b7cdd7f", "Diamond Studs", "Gold", "Gold stud earrings with round diamonds on stone"],
      ["1777999745582-781ebbd8c7b9", "Pavé Huggies", "Gold", "Gold huggie earrings set with diamonds on white satin"],
      ["1655255114527-d0a834d9a774", "Dome Hoops", "Gold", "Polished gold dome hoops beside a fine snake chain"],
    ],
  },

  // ─── Fragrance ──────────────────────────────────────────────────────────
  {
    category: "fragrance",
    sizes: () => ["100 ml"],
    price: [140, 420],
    threshold: 4,
    maxStock: 12,
    copy: [
      {
        description: (n) =>
          `${n}: an eau de parfum composed in Grasse, opening bright and drying down warm over the day. Concentrated at 18%, so a little goes a long way.`,
        details: ["Eau de parfum, 18% concentration", "100 ml glass bottle with a weighted cap", "Composed in Grasse", "Refillable"],
      },
      {
        description: (n) =>
          `${n}, a fragrance built on three natural materials and nothing to cover them up. Close to the skin at first, it carries further once it settles.`,
        details: ["Eau de parfum", "100 ml", "Natural raw materials", "Vegan formula"],
      },
    ],
    care: "Keep away from light and heat, cap on. Apply to pulse points; do not rub.",
    entries: [
      ["1784183972601-17a1b00ea05e", "Ambre Nu", "Amber", "Hands spraying perfume from a glass bottle"],
      ["1622618991746-fe6004db3a47", "Soleil d'Été", "Gold", "A square glass perfume bottle and two small jars on a yellow surface"],
      ["1760920250029-36af9369a0bb", "Musc Blanc", "Clear", "A clear cylindrical perfume bottle with a black cap"],
      ["1594125311687-3b1b3eafa9f4", "Eau Fraîche", "Clear", "Two square perfume bottles on a white table"],
      ["1615108395437-df128ad79e80", "Fleur d'Oranger", "Clear", "A faceted perfume bottle among pale orange blossom"],
      ["1733660227163-01bc46e0d7d7", "Oud Doré", "Amber", "A round amber perfume bottle on cream silk"],
      ["1733660227168-444e3c751a1e", "Vétiver Fumé", "Amber", "A square amber perfume bottle beaded with water"],
      ["1602928298849-325cec8771c0", "Ambre Absolu", "Gold", "Golden perfume oil dripping into small glass vials"],
      ["1608721279136-cd41b752fa41", "Nuit Bleue", "Blue", "A blue perfume bottle against iridescent light"],
      ["1705899853374-d91c048b81d2", "Pierre Blanche", "Clear", "A perfume bottle with a blank label on a pale rock"],
      ["1705899844877-81bb0a0665c1", "Bois Sec", "Amber", "An amber perfume bottle lying among rocks"],
      ["1572566202186-611ceb4042f0", "Linge Propre", "Frosted", "A frosted glass perfume bottle in soft light"],
      ["1647507653704-bde7f2d6dbf0", "Cuir Noir", "Black", "A black perfume bottle on a dark display stand"],
      ["1743309043742-9b4976a16478", "Résine", "Amber", "An amber perfume bottle with a black cap among rocks and driftwood"],
    ],
  },

  // ─── Shoes ──────────────────────────────────────────────────────────────
  {
    category: "shoes",
    sizes: () => ["38", "39", "40", "41", "42", "43", "44"],
    price: [290, 690],
    copy: [
      {
        description: (n, c) =>
          `The ${n} in ${lower(c)}: a clean low profile on a stitched cupsole, lined in calf so it needs no breaking in.`,
        details: ["Upper in full-grain calf", "Calf leather lining", "Stitched rubber cupsole", "Made in Portugal"],
      },
      {
        description: (n, c) =>
          `A ${n.toLowerCase()} in ${lower(c)}, light underfoot with a cushioned removable insole and waxed cotton laces.`,
        details: ["Leather and suede upper", "Removable cushioned insole", "Waxed cotton laces", "Natural rubber sole"],
      },
    ],
    care: "Wipe with a damp cloth. Use a leather balm on smooth leather and a suede brush on suede.",
    entries: [
      ["1759306188476-99169b6259e3", "Canvas Low-Top", "Orange", "A pair of orange low-top sneakers worn on grass"],
      ["1560769629-975ec94e6a86", "Panelled Runner", "Sand and mint", "A pair of panelled runners in sand and mint on a white box"],
      ["1599670998937-441a3a74b2f1", "Court Sneaker", "White", "A hand lacing a white leather court sneaker"],
      ["1632497775901-50ba4637399f", "Leather Low-Top", "Black", "A black leather low-top sneaker hanging on a white wall"],
      ["1606846859455-1af0b84947f3", "Knit Slip-On", "Navy", "Navy knit slip-on shoes with white soles on a red chair"],
      ["1736555142217-916540c7f1b7", "Retro Court Sneaker", "Off-white", "Off-white sneakers worn with checked trousers on paving"],
      ["1641574006916-d95bb480d8b9", "Canvas High-Top", "White", "White canvas high-tops worn on a terrace"],
      ["1603808033192-082d6919d3e1", "Suede-Trim Sneaker", "White and sand", "A white sneaker with sand suede trim on an orange background"],
      ["1632497775897-815042a13216", "Minimal Leather Sneaker", "Black", "A black leather sneaker hanging against a white wall"],
      ["1603808033596-5d1fa1629eae", "Two-Tone Sneaker", "White and tan", "Two-tone sneakers balanced on pale stones against orange"],
      ["1622760808027-095ea611f657", "Perforated Court Sneaker", "Blush", "A hand holding a white and blush perforated sneaker"],
      ["1622760806530-3cb6301c087d", "Basketball Low", "Cream", "A pair of cream leather low-top sneakers on white sheets"],
    ],
  },
  {
    category: "shoes",
    sizes: shoes,
    price: [490, 980],
    copy: [
      {
        description: (n, c) =>
          `The ${n} in ${lower(c)}, Goodyear-welted so the sole can be replaced, with elastic gussets that hold the ankle without laces.`,
        details: ["Calf leather upper", "Goodyear-welted leather sole", "Elastic side gussets", "Leather lining"],
      },
      {
        description: (n, c) =>
          `A ${n.toLowerCase()} in ${lower(c)} with a chiselled toe and a stacked heel, cut from a single piece of leather at the back.`,
        details: ["Hand-burnished leather", "Stacked leather heel", "Rubber-inset sole", "Made in Spain"],
      },
    ],
    care: "Use shoe trees between wears. Feed with a neutral cream; brush suede against the nap.",
    entries: [
      ["1608629601270-a0007becead3", "Suede Chelsea Boot", "Tan", "A pair of tan suede Chelsea boots on navy cloth", "men"],
      ["1534233812932-59b8fa1b780c", "Pull-On Ankle Boot", "Black", "A pair of black leather ankle boots on a wooden floor", "men"],
      ["1788478963160-1c38139e2932", "Burnished Chelsea Boot", "Black and brown", "Black and brown Chelsea boots from above on dark wood", "men"],
      ["1788478963145-4b90e3010698", "Country Chelsea Boot", "Dark brown", "Dark brown Chelsea boots on a wooden porch beside firewood", "men"],
      ["1788478963173-39bb60c744e7", "Chelsea Boot, Round Toe", "Brown", "Brown Chelsea boots beside a bucket of firewood", "men"],
      ["1777987601423-f350ac29b3e9", "Polished Chelsea Boot", "Espresso", "Espresso leather Chelsea boots on a slab of wood", "men"],
      ["1788478963164-a2eb8fabc3bc", "Weekend Chelsea Boot", "Brown", "Brown Chelsea boots on a wooden deck near firewood", "men"],
      ["1777987601677-3059be0e1388", "Hand-Antiqued Chelsea Boot", "Chestnut", "Polished chestnut Chelsea boots against a grey background", "men"],
    ],
  },
  {
    category: "shoes",
    sizes: shoes,
    price: [390, 790],
    copy: [
      {
        description: (n, c) =>
          `The ${n} in ${lower(c)}, built on a soft unlined last so it moves with the foot from the first wear.`,
        details: ["Unlined leather or suede upper", "Leather sole with rubber heel", "Hand-stitched apron", "Made in Italy"],
      },
      {
        description: (n, c) => `A ${n.toLowerCase()} in ${lower(c)}, light enough for summer and smart enough for the office.`,
        details: ["Calf leather lining", "Cushioned footbed", "Blake-stitched sole"],
      },
    ],
    care: "Rest a day between wears. Brush suede; polish leather with a neutral cream.",
    entries: [
      ["1616406432452-07bc5938759d", "Horsebit Loafer", "Cognac", "Cognac leather loafers with a metal bit on navy fabric", "men"],
      ["1662541089338-c7d53b88be70", "Suede Driving Loafer", "Tan", "Tan suede driving loafers on a marble surface", "men"],
      ["1760616172899-0681b97a2de3", "Penny Loafer", "Black", "Black leather penny loafers worn with black trousers", "men"],
      ["1784822041091-c827cb005dcd", "Woven Velvet Slipper", "Black", "Black woven velvet slippers on a white ledge", "men"],
      ["1676121270762-47c8d3a7b9d5", "Suede Bit Loafer", "Tobacco", "Tobacco suede loafers with gold bits from above", "men"],
      ["1556004583-d2aaffbba592", "Unlined Suede Loafer", "Taupe", "Taupe suede penny loafers worn on a city street", "men"],
      ["1784822041003-504771076494", "Studded Slipper", "Black", "Black studded velvet slippers against a white wall", "men"],
      ["1663010968803-09f5e2dcfc61", "Embroidered Slipper", "Powder blue", "Powder-blue suede slippers with floral embroidery", "women"],
      ["1784822041102-274cf37c7304", "Houndstooth Slipper", "Black and white", "Black and white woven slippers in black and white", "men"],
      ["1576792741377-eb0f4f6d1a47", "Suede Penny Loafer", "Brown", "Brown suede penny loafers on a patterned rug", "men"],
      ["1777987601447-266e128de448", "Polished Penny Loafer", "Chestnut", "Chestnut leather penny loafers on a black stool", "men"],
    ],
  },
  {
    category: "shoes",
    sizes: () => ["36", "37", "38", "39", "40", "41"],
    price: [420, 890],
    copy: [
      {
        description: (n, c) =>
          `The ${n} in ${lower(c)}, on a slim heel set slightly forward for balance, with a padded footbed that makes an evening of it.`,
        details: ["Leather upper", "Padded leather footbed", "Leather sole", "Heel height 9 cm"],
      },
      {
        description: (n, c) => `A ${n.toLowerCase()} in ${lower(c)}, pointed and pared back, cut low at the sides.`,
        details: ["Leather lining", "Covered heel", "Heel height 10 cm", "Made in Italy"],
      },
    ],
    care: "Store in the dust bags provided. Have heel tips replaced before they wear through.",
    entries: [
      ["1535043934128-cf0b28d52f95", "Textured Leather Pump", "Ivory", "A pair of ivory textured leather pumps on a dark floor", "women"],
      ["1573100925118-870b8efc799d", "Patent Stiletto", "Fuchsia", "Fuchsia patent stilettos worn with legs crossed", "women"],
      ["1775202192060-b16d3fe9d260", "Pointed Pump", "Black", "Black pointed pumps worn on a grey chair", "women"],
      ["1596703263926-eb0762ee17e4", "Classic Pump 100", "Black", "A hand holding a black leather pump", "women"],
      ["1590099033615-be195f8d575c", "Bow Ankle-Strap Sandal", "Nude", "Nude ankle-strap heels with bows on an orange background", "women"],
      ["1551489186-ccb95a1ea6a3", "Patent Pump", "Black", "Black patent pumps worn with checked trousers", "women"],
      ["1518049362265-d5b2a6467637", "Lace Pump", "Ivory", "Ivory lace pumps in the snow", "women"],
      ["1632793039179-8d97795d20c6", "Glitter Pump", "Rose", "Rose glitter pumps under violet light", "women"],
      ["1562687848-c1664eff566d", "Bridal Stiletto", "Ivory", "An ivory leather stiletto against a dark background", "women"],
    ],
  },
  {
    category: "shoes",
    sizes: shoes,
    price: [190, 520],
    copy: [
      {
        description: (n, c) =>
          `The ${n} in ${lower(c)}, on a cork and latex footbed that moulds to the foot, with straps in vegetable-tanned leather.`,
        details: ["Vegetable-tanned leather straps", "Cork and latex footbed", "Rubber sole", "Made in Portugal"],
      },
      {
        description: (n, c) => `A ${n.toLowerCase()} in ${lower(c)}, cut from soft leather with a padded insole.`,
        details: ["Leather upper and lining", "Padded insole", "Rubber sole"],
      },
    ],
    care: "Let leather dry naturally away from heat if it gets wet. Wipe the footbed with a damp cloth.",
    entries: [
      ["1562273138-f46be4ebdf33", "Platform Cross-Strap Sandal", "Burgundy", "Burgundy cross-strap platform sandals on a pink background", "women"],
      ["1585120824848-8a5cd41493d2", "Toe-Post Sandal", "Black and brown", "Black and brown leather toe-post sandals on a slatted bench", "men"],
      ["1628375385879-1af64230c2e1", "Two-Strap Sandal", "Black", "Black two-strap sandals worn with white trousers", "men"],
      ["1605445175147-8d2340ea9065", "Buckle Footbed Sandal", "Black", "Black buckled footbed sandals worn on pale ground", "women"],
      ["1625318880107-49baad6765fd", "Double-Buckle Sandal", "Black", "Black double-buckle footbed sandals on grass", "men"],
      ["1741783895531-ccc860eb946a", "Multi-Strap Sandal", "Tan", "A tan multi-strap sandal on a rock by water", "women"],
      ["1613662632164-7f2b081a5b46", "Crossover Slide", "Tan", "Tan crossover leather slides on a pale surface", "women"],
      ["1613912804931-c3512f360cd3", "Crossover Mule", "Tan", "A close-up of tan crossover leather mules", "women"],
      ["1630407332126-70ebb700976b", "Strappy Heeled Sandal", "Pink", "A hand holding pink strappy heeled sandals among orchids", "women"],
      ["1663693586817-f7e0ceb27bd7", "Wide-Band Slide", "Black and tan", "Black and tan leather slides on grass", "men"],
    ],
  },

  // ─── Bags ───────────────────────────────────────────────────────────────
  {
    category: "bags",
    sizes: one,
    price: [490, 3200],
    threshold: 2,
    maxStock: 4,
    copy: [
      {
        description: (n, c) =>
          `The ${n} in ${lower(c)}, cut from full-grain leather that darkens with use, with edges painted and burnished by hand.`,
        details: ["Full-grain calf leather", "Hand-painted edges", "Cotton twill lining", "Brass hardware"],
      },
      {
        description: (n, c) =>
          `A ${n.toLowerCase()} in ${lower(c)}, structured enough to hold its shape when empty and lined in a cotton twill that wipes clean.`,
        details: ["Grained leather", "Interior zip pocket and two slip pockets", "Cotton twill lining", "Gold-tone hardware"],
      },
      {
        description: (n, c) =>
          `Our ${n} in ${lower(c)}, saddle-stitched with waxed linen thread so the seams outlast the leather.`,
        details: ["Vegetable-tanned leather", "Saddle-stitched by hand", "Suede lining", "Made in Florence"],
      },
    ],
    care: "Stuff with tissue when not in use and store in the dust bag. Condition the leather twice a year.",
    entries: [
      ["1605733513597-a8f8341084e6", "Buckled Satchel", "Grey", "A grey leather satchel with gold buckles on a white surface"],
      ["1705909237050-7a7625b47fac", "Bowling Bag", "Black", "A black grained-leather bowling bag on a yellow background"],
      ["1473188588951-666fce8e7c68", "Field Messenger", "Saddle brown", "A distressed brown leather messenger on grey stone"],
      ["1681747685985-a401c271156c", "Quilted Top-Handle Bag", "Blush", "A blush quilted top-handle bag on a marble counter"],
      ["1624687943971-e86af76d57de", "Market Tote", "Cognac", "A cognac leather tote against a cream wall"],
      ["1691480150204-66dd1eb77391", "Structured Doctor Bag", "Chestnut", "A chestnut leather bag with buckled straps on white"],
      ["1637759292654-a12cb2be085e", "Soft Shoulder Bag", "Caramel", "A close-up of a caramel leather shoulder bag"],
      ["1691480250099-a63081ecfcb8", "Buckled Top-Handle Bag", "Tan", "A tan leather top-handle bag with buckled pockets on white"],
      ["1603219527847-24c87f552a77", "Leather Briefcase", "Dark brown", "A dark brown leather briefcase on a round wooden stool"],
      ["1657603738389-951c374b740c", "Pocket Crossbody", "Tan", "A tan leather crossbody bag with a front pocket"],
      ["1711548244653-72219aa9ac27", "Washed Leather Satchel", "Stone", "A washed stone-coloured leather satchel with a turn-lock"],
      ["1560891958-68bb1fe7fb78", "Mini Top-Handle Bag", "Navy", "A woman in red holding a navy mini top-handle bag"],
      ["1746880223690-359948154c53", "Hobo Bag", "Tan", "A close-up of a tan leather hobo bag with a dark handle"],
      ["1732613838357-b6f6931cdb97", "Pocket Shoulder Bag", "Espresso", "An espresso leather shoulder bag on a stack of books"],
      ["1640901555383-7335ec5a6476", "Croc-Embossed Top-Handle Bag", "Yellow", "A yellow croc-embossed top-handle bag on white"],
      ["1598099947145-e85739e7ca28", "Twist-Lock Flap Bag", "Cognac", "A cognac flap bag with a twist lock beside a laptop"],
      ["1657603719375-8ffdacaac790", "Camera Bag", "Tan", "A tan leather camera bag with pockets, side on"],
      ["1654707636750-ab67a11b21b7", "Bucket Tote", "Dark brown", "A dark brown leather tote on a side table beside an open book"],
      ["1760624294582-5341f33f9fa4", "Pocket Tote", "Camel", "Three leather totes with front pockets in cream, tan and camel"],
      ["1760624294469-550753ec203a", "Slouch Bucket Bag", "Tan", "A woman in black carrying a tan leather bucket bag"],
      ["1760624295064-2de890f64524", "Wave-Stitched Shoulder Bag", "Teal", "A teal leather shoulder bag with wave stitching on marble"],
      ["1760624294504-211e763ee0fb", "Weekend Tote", "Cognac", "A woman holding a large cognac leather tote"],
      ["1760624089496-01ae68a92d58", "Vintage Messenger", "Brown", "Brown leather bags and small leather goods on a plinth"],
      ["1774389080971-01bf5d938a92", "Tweed Tote, Green Trim", "Green", "A tweed tote with green leather stripe and handles"],
      ["1760624294535-40dfdc84a48f", "Soft Bucket Bag", "Pale blue", "A woman in a denim jacket holding a pale blue bucket bag"],
      ["1774389489708-dd5df89c9f94", "Tweed Tote, Burgundy Trim", "Burgundy", "A tweed tote with burgundy leather trim from above"],
      ["1637762647056-998cc4715de7", "Waxed Canvas Messenger", "Olive", "An olive waxed-canvas messenger with leather straps on a window sill"],
      ["1774390304435-9c33140f9de6", "Tweed Tote, Leopard Trim", "Brown", "A tweed tote with a leopard-print stripe and brown handles"],
      ["1622560480654-d96214fdc887", "Zip Backpack", "Burgundy", "A burgundy leather backpack against a pale wall"],
      ["1622560480605-d83c853bc5c3", "Front-Pocket Backpack", "Rosewood", "A rosewood leather backpack with a front zip pocket"],
      ["1622560481156-01fc7e1693e6", "City Backpack", "Burgundy", "A black and a burgundy leather backpack side by side"],
      ["1577733975197-3b950ca5cabe", "Strapped Rucksack", "Forest green", "A forest-green canvas rucksack with leather straps on a path"],
      ["1549943872-f7ff0b2b51be", "Drawstring Rucksack", "Brown", "A brown leather drawstring rucksack on mossy ground"],
      ["1577733966973-d680bffd2e80", "Waxed Canvas Rucksack", "Green", "A green waxed-canvas rucksack with brown leather straps on steps"],
      ["1541267732407-8f72c182cf11", "Drawstring Daypack", "Black", "A black drawstring daypack hanging on a white brick wall"],
      ["1622560482379-c9813322e95a", "Zip Backpack, Large", "Burgundy", "A close-up of a burgundy leather backpack"],
      ["1569097941209-aca563eb07d8", "Flap Rucksack", "Tan", "A tan leather flap rucksack with two buckled straps"],
    ],
  },

  // ─── Accessories ────────────────────────────────────────────────────────
  {
    category: "accessories",
    sizes: one,
    price: [120, 420],
    copy: [
      {
        description: (n, c) =>
          `The ${n} in ${lower(c)}, folded and edge-painted from a single piece of leather, slim enough for a front pocket.`,
        details: ["Calf leather", "Hand-painted edges", "Six card slots", "Made in Italy"],
      },
      {
        description: (n, c) => `A ${n.toLowerCase()} in ${lower(c)}, stitched by hand with waxed linen thread.`,
        details: ["Vegetable-tanned leather", "Saddle-stitched", "Ages to a deep patina"],
      },
    ],
    care: "Keep away from water. Condition with a neutral cream once a year.",
    entries: [
      ["1601592996763-f05c9c80a7f1", "Card Holder Pair", "Black", "Two black leather card holders on grey concrete"],
      ["1579014134953-1580d7f123f3", "Bifold Wallet", "Black", "A black leather bifold wallet holding banknotes"],
      ["1614330316567-11d8e572db16", "Snap Wallet", "Brown", "Hands opening a brown leather snap wallet"],
      ["1620109176813-e91290f6c795", "Billfold", "Saddle brown", "A saddle-brown bifold wallet on black leather"],
      ["1777892505691-9da582ddc715", "Wristlet Pouch", "Cognac", "A cognac leather wristlet pouch hanging from its strap"],
      ["1612023395494-1c4050b68647", "Compact Bifold", "Black", "A small black bifold wallet on a grey floor"],
      ["1635462684825-3621c1df5403", "Leather Watch Case", "Black", "Black-dial watches resting in a leather watch case"],
    ],
  },
  {
    category: "accessories",
    sizes: () => ["80", "85", "90", "95", "100"],
    price: [140, 380],
    copy: [
      {
        description: (n, c) =>
          `The ${n} in ${lower(c)}, 3.5 cm wide, cut from a single strip of bridle leather that keeps its shape for decades.`,
        details: ["Bridle leather", "Solid brass buckle", "3.5 cm wide", "Five holes"],
      },
      {
        description: (n, c) => `A ${n.toLowerCase()} in ${lower(c)} with a slim, brushed buckle that sits flat under a jumper.`,
        details: ["Calf leather", "Brushed metal buckle", "3 cm wide"],
      },
    ],
    care: "Hang or roll loosely. Condition with a neutral cream when the leather looks dry.",
    entries: [
      ["1664286074176-5206ee5dc878", "Stitched Leather Belt", "Dark brown", "A rolled dark brown stitched leather belt on a dark surface"],
      ["1711443982852-b3df5c563448", "Braided Leather Belt", "Cognac", "Cognac braided leather belts draped over a white tube"],
      ["1784832555222-230841ae7b34", "Waist Belt", "Tan", "Hands fastening a tan leather belt over a check skirt"],
      ["1624222247344-550fb60583dc", "Roller Buckle Belt", "Tan", "A close-up of a tan leather belt with a steel roller buckle"],
      ["1705493655920-20c572928501", "Distressed Leather Belt", "Whisky", "A rolled whisky-coloured leather belt on weathered wood"],
      ["1752386223406-b3d94092d790", "Suede Belt", "Olive", "A rolled olive suede belt with a brass buckle on white"],
      ["1664286074240-d7059e004dff", "Two-Tone Belt", "Navy and brown", "A rolled navy and brown leather belt on a dark surface"],
      ["1611937685025-8d1df67a80b6", "Jeans Belt", "Brown", "A brown leather belt worn with blue jeans and a silk shirt"],
    ],
  },
  {
    category: "accessories",
    sizes: one,
    price: [240, 520],
    copy: [
      {
        description: (n, c) =>
          `The ${n} in ${lower(c)}, with lenses that block all UVA and UVB light and hinges riveted through the frame.`,
        details: ["Hand-polished acetate or metal frame", "Category 3 lenses, 100% UV protection", "Five-barrel hinges", "Comes with a leather case"],
      },
      {
        description: (n, c) => `A pair of ${n.toLowerCase()} in ${lower(c)}, light on the nose with adjustable pads.`,
        details: ["Titanium frame", "Polarised lenses", "Adjustable nose pads", "Leather case"],
      },
    ],
    care: "Clean the lenses with the cloth provided. Fold before setting down, lenses up.",
    entries: [
      ["1577803645773-f96470509666", "Crystal Round Sunglasses", "Crystal", "Clear-framed sunglasses with brown lenses on sand by the sea"],
      ["1584036553516-bf83210aa16c", "Browline Sunglasses", "Black", "Black browline sunglasses on a white surface"],
      ["1610136649349-0f646f318053", "Wraparound Sunglasses", "Black", "Black sunglasses against a peach background"],
      ["1508296695146-257a814070b4", "Oversized Cat-Eye", "Champagne", "Champagne cat-eye sunglasses with smoke lenses"],
      ["1618677366787-9727aacca7ea", "Round Wire Sunglasses", "Black", "Round black metal sunglasses on a pink background"],
      ["1587310311582-aa7610e90826", "Panto Sunglasses", "Tortoiseshell", "Tortoiseshell panto sunglasses on a white table"],
      ["1590564310418-66304f55a2c2", "Round Gold-Rim Sunglasses", "Gold", "Round gold-rimmed sunglasses beside a coffee cup"],
      ["1599705709640-9f9eb5964485", "Navigator Sunglasses", "Silver", "Silver navigator sunglasses against a blue wall"],
      ["1589642380614-4a8c2147b857", "Gradient Navigator", "Gold", "Gold navigator sunglasses with gradient lenses on yellow"],
      ["1612902457652-33aff0a641fa", "Square Acetate Sunglasses", "Tortoiseshell", "Tortoiseshell sunglasses beside dried grasses"],
      ["1562548726-43b650c82f8e", "Classic Aviator", "Gold", "Gold aviator sunglasses resting on sand"],
    ],
  },
  {
    category: "accessories",
    sizes: one,
    price: [160, 480],
    copy: [
      {
        description: (n, c) =>
          `The ${n} in ${lower(c)}, printed on silk twill with up to twelve screens, its edges rolled and stitched by hand.`,
        details: ["100% silk twill", "Hand-rolled edges", "90 × 90 cm", "Made in Como"],
      },
    ],
    care: "Dry clean only. Iron on the reverse at a low setting.",
    entries: [
      ["1677478863154-55ecce8c7536", "Silk Twill Scarf", "Saffron", "A woman by a lake with a saffron silk scarf blowing around her"],
      ["1689193502879-362660fad4a8", "Printed Silk Square", "Red", "A woman wearing a red printed silk square as a headscarf"],
      ["1761369332487-777e59fa4bcf", "Fine Wool Stole", "Assorted", "Wool stoles in assorted colours hanging on a rail"],
      ["1776127839720-c0ab710d9d37", "Silk Pocket Square", "Assorted", "Printed silk squares folded on wooden shelves"],
      ["1791378587300-a4e2678a2358", "Botanical Silk Scarf", "Yellow and blue", "A mannequin in a yellow and blue botanical silk headscarf"],
    ],
  },
  {
    category: "accessories",
    sizes: one,
    price: [90, 220],
    maxStock: 8,
    copy: [
      {
        description: (n, c) =>
          `The ${n} in ${lower(c)}, knitted in a deep rib from undyed merino and cashmere, with a turn-up you can wear high or low.`,
        details: ["70% merino wool, 30% cashmere", "Deep rib knit", "Double turn-up", "Knitted in Scotland"],
      },
      {
        description: (n, c) => `A ${n.toLowerCase()} in ${lower(c)}, soft against the forehead and warm without bulk.`,
        details: ["100% lambswool", "Fisherman rib", "One size"],
      },
    ],
    care: "Hand wash cold with wool detergent. Dry flat.",
    entries: [
      ["1576871337632-b9aef4c17ab9", "Rib Beanie", "Assorted", "Ribbed beanies in brown, pink, green and yellow on stone"],
      ["1612887726773-e64e20cf08fe", "Turn-Up Beanie", "Rust", "A hand holding a rust ribbed beanie"],
      ["1606453914790-b9be7cdb321f", "Fisherman Beanie", "Black", "A man wearing a black fisherman beanie"],
      ["1630691650107-53dd500d2907", "Short Fisherman Beanie", "Mustard", "A mustard fisherman beanie on a yellow background"],
      ["1664289321749-07316ab5e374", "Chunky Rib Beanie", "Oatmeal", "An oatmeal chunky-rib beanie on a wooden table"],
      ["1532073150508-0c1df022bdd1", "Lambswool Beanie", "Red", "A woman in a denim jacket wearing a red beanie"],
      ["1664289321831-6e1c6452b43c", "Marl Beanie", "Navy marl", "A navy marl knitted beanie on a wooden table"],
      ["1607265705067-ab09cf1f18d0", "Cashmere Rib Beanie", "Lilac", "A lilac ribbed beanie on a lilac and yellow background"],
      ["1605894631816-37f383bafa99", "Slouch Beanie", "Grey", "A woman in a denim jacket wearing a grey slouch beanie"],
    ],
  },

  // ─── Outerwear ──────────────────────────────────────────────────────────
  {
    category: "men",
    sizes: apparel,
    price: [690, 1890],
    copy: [
      {
        description: (n, c) =>
          `The ${n} in ${lower(c)}, filled with responsibly sourced 90/10 goose down and baffled so the fill stays where it should.`,
        details: ["Recycled nylon shell, water-repellent", "90/10 RDS-certified goose down", "Two-way zip", "Packs into its own pocket"],
      },
      {
        description: (n, c) =>
          `A ${n.toLowerCase()} in ${lower(c)}: high-lofted, with a stand collar that closes up to the chin and storm cuffs at the wrist.`,
        details: ["Down and feather fill", "Stand collar with hidden hood", "Storm cuffs", "Zipped hand pockets"],
      },
    ],
    care: "Machine wash cold on a delicate cycle with down detergent. Tumble dry low with dryer balls.",
    entries: [
      ["1769689387719-f11faac08cbe", "Gloss Puffer Jacket", "Black", "A man in a glossy black hooded puffer jacket and cap"],
      ["1678884399113-0a2b079a31f5", "Oversized Down Jacket", "Ecru", "A woman in an oversized ecru down jacket with the collar up", "women"],
      ["1769689388217-c3c8fec7099d", "Hooded Gloss Puffer", "Black", "A man in a glossy black hooded puffer jacket, side on"],
      ["1614079290101-0c2181ac8ea3", "Cocoon Puffer", "Olive", "A man in an oversized olive puffer jacket on a riverside path"],
      ["1611025504703-8c143abe6996", "Long Belted Puffer", "Black", "A woman in a long belted black puffer coat by a white wall", "women"],
      ["1677123718817-5a203404d638", "Expedition Parka", "Orange", "A man in an orange hooded parka with a fur-trimmed hood"],
      ["1614031679232-0dae776a72ee", "Quilted Down Jacket", "Black", "A man in a black quilted down jacket by a concrete wall"],
    ],
  },
  {
    category: "men",
    sizes: apparel,
    price: [590, 2890],
    copy: [
      {
        description: (n, c) =>
          `The ${n} in ${lower(c)}, cut close through the body and finished with hand-set hardware. It softens and takes the wearer's shape within a season.`,
        details: ["Hand-selected hides and cloths", "Cupro lining", "Metal hardware", "Inside pocket"],
      },
      {
        description: (n, c) =>
          `A ${n.toLowerCase()} in ${lower(c)}, made to wear open over knitwear or closed against the wind.`,
        details: ["Lined body", "Zipped and patch pockets", "Made in Italy"],
      },
    ],
    care: "Leather and suede: specialist clean only. Cotton and denim: machine wash cold. Hang on a wide hanger.",
    entries: [
      ["1617114919297-3c8ddb01f599", "Suede Overshirt", "Tan", "A man in a tan suede overshirt and jeans leaning on a stone wall"],
      ["1521223890158-f9f7c3d5d504", "Lambskin Biker", "Black", "A man fastening a black lambskin biker jacket"],
      ["1614252368727-99517bc90d7b", "Café Racer Jacket", "Cognac", "A man in a cognac leather racer jacket and sunglasses"],
      ["1544022613-e87ca75a784a", "Utility Field Jacket", "Olive", "A woman in an olive cotton field jacket over a white top", "women"],
      ["1516257984-b1b4d707412e", "Washed Denim Jacket", "Light blue", "A man in a light-blue washed denim jacket"],
      ["1559551409-dadc959f76b8", "Shearling Flying Jacket", "Dark brown", "Shearling-collared leather flying jackets hanging on brick"],
      ["1578198576866-7e0ba6078128", "Zip Leather Jacket", "Brown", "A brown leather zip-up jacket worn over a dark top"],
      ["1487222477894-8943e31ef7b2", "Belted Biker", "Brown", "A man in a brown leather biker jacket and round sunglasses"],
      ["1675877879221-871aa9f7c314", "Classic Biker", "Black", "A man in a black leather biker jacket and roll-neck"],
      ["1646300451176-f16171b2d03d", "Paisley-Lined Leather Jacket", "Black", "A black leather jacket open on a paisley lining"],
      ["1589591990984-68a20755020d", "Leather Trucker Jacket", "Bottle green", "A man in a bottle-green leather jacket under a stone arch"],
      ["1553591589-2e96ef7eca65", "Asymmetric Biker", "Forest green", "A man in a forest-green asymmetric leather biker jacket"],
      ["1787435906030-f52e34c2b440", "Corduroy Sherpa Jacket", "Sand", "A man in a sand corduroy sherpa-collar jacket and olive trousers"],
    ],
  },
  {
    category: "women",
    sizes: apparel,
    price: [890, 2690],
    copy: [
      {
        description: (n, c) =>
          `The ${n} in ${lower(c)}, in a double-faced wool and cashmere that needs no lining, its seams turned and stitched by hand.`,
        details: ["80% virgin wool, 20% cashmere", "Double-faced, unlined", "Hand-finished seams", "Made in Italy"],
      },
      {
        description: (n, c) => `A ${n.toLowerCase()} in ${lower(c)}, long and easy, with deep pockets and a collar that turns up.`,
        details: ["Wool blend", "Fully lined", "Horn buttons"],
      },
    ],
    care: "Dry clean only. Brush after wearing and rest on a shaped hanger.",
    entries: [
      ["1539533113208-f6df8cc8b543", "Belted Wrap Coat", "Camel", "A woman in a belted camel wrap coat by a stone wall"],
      ["1608635680046-aebf91c1a9c8", "Single-Breasted Coat", "Camel", "A woman in a camel single-breasted coat over a black dress"],
      ["1619603364937-8d7af41ef206", "Raglan Overcoat", "Camel", "A man in a camel raglan overcoat and roll-neck", "men"],
      ["1737508945707-ebdccee97cc5", "Double-Breasted Trench", "Cream", "A man in a cream double-breasted trench coat on a street", "men"],
      ["1550872199-63f4382fe925", "Shawl-Collar Wrap Coat", "Cream", "A woman in a cream shawl-collar wrap coat over a red dress"],
      ["1739301722226-b60b59c3590a", "Tailored Wool Coat", "Grey", "A woman in a grey tailored wool coat and sunglasses"],
      ["1765099271937-b56f29e7679f", "Boiled Wool Coat", "Tangerine", "A close-up of a tangerine boiled-wool coat sleeve"],
      ["1620247405612-18f042ea68cf", "Shearling Jacket", "Cream", "A woman in glasses wearing a cream shearling jacket"],
      ["1680690395101-1b2a56c0ac21", "Double-Breasted Coat", "Ivory", "A close-up of an ivory double-breasted coat"],
      ["1781454230007-7c4beb40d34b", "Oversized Coat", "Camel", "A woman in an oversized camel coat by hazy water"],
    ],
  },

  // ─── Tailoring ──────────────────────────────────────────────────────────
  {
    category: "men",
    sizes: (c) => (c === "women" ? ["36", "38", "40", "42"] : ["46", "48", "50", "52", "54"]),
    price: [1290, 3400],
    maxStock: 3,
    madeToOrder: [0.35, "Cut to your size in our Biella workshop, ready in four weeks."],
    copy: [
      {
        description: (n, c) =>
          `The ${n} in ${lower(c)}, half-canvassed with a soft natural shoulder. The jacket's sleeves are left long, to be finished to your arm.`,
        details: ["Super 110s wool", "Half-canvas construction", "Unfinished sleeve hems", "Working cuff buttons"],
      },
      {
        description: (n, c) =>
          `A ${n.toLowerCase()} in ${lower(c)}, cut slim through the waist with high armholes for ease of movement.`,
        details: ["Wool and mohair", "Fully lined in Bemberg", "Horn buttons", "Made in Italy"],
      },
    ],
    care: "Dry clean sparingly. Steam to refresh and rest on a shaped hanger between wears.",
    entries: [
      ["1618886614638-80e3c103d31a", "Two-Button Suit", "Black", "A man in a black two-button suit walking on a concrete plaza"],
      ["1480429370139-e0132c086e2a", "Double-Breasted Pinstripe Suit", "Light grey", "A man in a light-grey pinstripe double-breasted suit and navy tie"],
      ["1777390329674-09285b035781", "Three-Piece Suit", "Charcoal", "A grey-haired man in a charcoal three-piece suit"],
      ["1617137968427-85924c800a22", "Slim Two-Piece Suit", "Navy", "A man in a slim navy suit walking past a glass building"],
      ["1767329300923-6994e8d770dd", "Three-Piece Trouser Suit", "Sand", "A woman in a sand three-piece trouser suit on a vintage car", "women"],
      ["1617137984095-74e4e5e3613f", "Single-Breasted Suit", "Royal blue", "A man in a royal-blue single-breasted suit and white shirt"],
      ["1623880840102-7df0a9f3545b", "Business Suit", "Navy", "A man in a navy suit carrying a leather document case"],
      ["1622497170185-5d668f816a56", "Textured Blazer", "Grey", "A man in a textured grey blazer and dark tie on stone steps"],
      ["1617113930975-f9c7243ae527", "Evening Suit", "Black", "A man in a black suit and open-collar shirt with sunglasses"],
      ["1782372159696-1c12a8d71ed2", "Wool Suit", "Black", "A man in a black suit on a misty hill at dawn"],
      ["1600091166971-7f9faad6c1e2", "Windowpane Check Blazer", "Blue-grey", "A blue-grey windowpane check blazer on a mannequin"],
      ["1767329300783-78ee1201a4cd", "Waistcoat Trouser Suit", "Cream", "A woman in a cream suit and waistcoat seated on a car", "women"],
      ["1603394151492-5e9b974b090b", "Check Suit", "Navy", "A close-up of hands at the cuff of a navy check suit"],
      ["1593030103066-0093718efeb9", "Notch-Lapel Suit", "Navy", "A man in a navy notch-lapel suit adjusting his cuff"],
      ["1522968439036-e6338d0ed84f", "Shawl-Collar Tuxedo", "Black", "A black shawl-collar tuxedo and bow tie in black and white"],
    ],
  },

  // ─── Tops ───────────────────────────────────────────────────────────────
  {
    category: "men",
    sizes: apparel,
    price: [90, 290],
    maxStock: 9,
    copy: [
      {
        description: (n, c) =>
          `The ${n} in ${lower(c)}, knitted from long-staple cotton in a dense 220 g jersey that holds its shape wash after wash.`,
        details: ["100% organic cotton, 220 g/m²", "Ribbed crew neck", "Garment-dyed", "Made in Portugal"],
      },
      {
        description: (n, c) => `A ${n.toLowerCase()} in ${lower(c)}, boxy through the body with dropped shoulders.`,
        details: ["Heavyweight cotton jersey", "Taped shoulder seams", "Pre-shrunk"],
      },
    ],
    care: "Machine wash at 30°C inside out. Dry flat; do not tumble dry.",
    entries: [
      ["1581655353564-df123a1eb820", "Heavyweight T-Shirt", "White", "A white T-shirt on a hanger against a dark plaster wall"],
      ["1521572163474-6864f9cf17ab", "Crew-Neck T-Shirt", "White", "A man wearing a white crew-neck T-shirt"],
      ["1778671394516-8270eac13c42", "Everyday T-Shirt", "White", "A plain white T-shirt on a wooden hanger"],
      ["1651761179569-4ba2aa054997", "Boxy T-Shirt", "White", "A boxy white T-shirt laid flat on white"],
      ["1759572095384-1a7e646d0d4f", "T-Shirt Two-Pack", "Black and sage", "A black and a sage T-shirt folded with cotton sprigs"],
      ["1622445275463-afa2ab738c34", "Relaxed T-Shirt", "Pale grey", "A man in a pale-grey T-shirt in a garden"],
      ["1562157873-818bc0726f68", "Pocket T-Shirt", "Assorted", "Folded T-shirts in assorted colours on a wooden surface"],
      ["1620799140408-edc6dcb6d633", "Loopback Sweatshirt", "White", "A white crew-neck sweatshirt laid flat beside sneakers"],
      ["1782822940008-1d8ae6b49ea6", "Fitted T-Shirt", "White", "A young man in a white T-shirt leaning against a doorway"],
    ],
  },
  {
    category: "men",
    sizes: apparel,
    price: [160, 340],
    maxStock: 8,
    copy: [
      {
        description: (n, c) =>
          `The ${n} in ${lower(c)}, in a 400 g loopback cotton brushed on the inside, with a double-layered hood and flat drawcords.`,
        details: ["100% organic cotton loopback, 400 g/m²", "Double-layered hood", "Kangaroo pocket", "Made in Portugal"],
      },
      {
        description: (n, c) => `A ${n.toLowerCase()} in ${lower(c)}, roomy through the body with ribbed cuffs and hem.`,
        details: ["Heavyweight cotton fleece", "Ribbed trims", "Garment-dyed"],
      },
    ],
    care: "Machine wash at 30°C inside out. Dry flat; do not tumble dry.",
    entries: [
      ["1620799140188-3b2a02fd9a77", "Fleece-Back Hoodie", "White", "A white hoodie and light jeans hanging on a rope"],
      ["1556821840-3a63f95609a7", "Pullover Hoodie", "Grey marl", "A man in a grey marl pullover hoodie, seen from behind"],
      ["1564557287817-3785e38ec1f5", "Heavy Hoodie", "Sand", "A man in a sand hoodie and sunglasses against a wall"],
      ["1579572331145-5e53b299c64e", "Garment-Dyed Hoodie", "Teal", "A man in a deep teal hoodie with the hood up"],
      ["1578768079052-aa76e52ff62e", "Oversized Hoodie", "Clay", "A person in a clay oversized hoodie on a staircase"],
      ["1601063476271-a159c71ab0b3", "Loopback Hoodie", "Light grey", "A man in a light-grey hoodie seated on a red bench"],
      ["1611817757591-c3f345024273", "Cotton Hoodie", "Mink", "A man in a mink hoodie with the hood up between buildings"],
    ],
  },
  {
    category: "men",
    sizes: apparel,
    price: [190, 420],
    copy: [
      {
        description: (n, c) =>
          `The ${n} in ${lower(c)}, cut from washed European linen that gets softer every time it is laundered.`,
        details: ["100% European linen", "Mother-of-pearl buttons", "Garment-washed", "Made in Portugal"],
      },
      {
        description: (n, c) => `A ${n.toLowerCase()} in ${lower(c)}, relaxed through the body with a curved hem to wear in or out.`,
        details: ["Cotton poplin or linen", "Single-needle stitching", "Curved hem"],
      },
    ],
    care: "Machine wash at 30°C. Hang to dry and iron while damp.",
    entries: [
      ["1740711152088-88a009e877bb", "Linen Shirt", "Navy", "A navy linen shirt over a white T-shirt on a hanger"],
      ["1713881587420-113c1c43e28a", "Short-Sleeve Linen Shirt", "Ecru", "An ecru short-sleeve linen shirt hanging from a branch"],
      ["1713881842156-3d9ef36418cc", "Striped Band-Collar Shirt", "Pale blue", "A pale-blue striped short-sleeve shirt hanging from a branch"],
      ["1617117475026-2eb3e68b63cf", "Bengal Stripe Shirt", "Blue", "A close-up of a blue Bengal-stripe shirt with daisies in the pocket"],
      ["1591357037205-166318b51afd", "Camp-Collar Shirt", "Khaki", "A man in a khaki camp-collar shirt against the sky"],
      ["1782329993533-bc53478a82c5", "Washed Linen Shirt", "Cornflower", "A man in a cornflower linen shirt with mountains behind"],
      ["1713881676551-b16f22ce4719", "Boxy Linen Top", "White", "A white boxy linen top hanging from a branch", "women"],
      ["1713881649391-a1c8ddaf83cd", "Short-Sleeve Band-Collar Shirt", "Navy", "A navy short-sleeve shirt hanging from a branch"],
      ["1582261484646-a545de6d2382", "Chambray Shirt", "Sky blue", "A close-up of a sky-blue chambray shirt with flowers in the pocket"],
      ["1780387477222-730504564368", "Utility Jumpsuit", "Stone", "A woman in a stone utility jumpsuit sitting on a stool", "women"],
      ["1776633733518-d81137214dc9", "Oversized Poplin Shirt", "White", "A woman buttoning an oversized white poplin shirt", "women"],
      ["1627686011747-74adda3d2343", "Grandad-Collar Shirt", "Ecru", "A man in an ecru grandad-collar shirt by a garden wall"],
      ["1791631064348-0337580f80d1", "Candy Stripe Shirt", "Brown stripe", "A man buttoning a brown and white candy-stripe shirt"],
    ],
  },
  {
    category: "women",
    sizes: apparel,
    price: [290, 790],
    maxStock: 5,
    copy: [
      {
        description: (n, c) =>
          `The ${n} in ${lower(c)}, knitted from Mongolian cashmere and lambswool, then washed for a soft, lofty hand.`,
        details: ["70% lambswool, 30% cashmere", "Ribbed cuffs and hem", "Fully fashioned", "Knitted in Scotland"],
      },
      {
        description: (n, c) => `A ${n.toLowerCase()} in ${lower(c)}, easy and slouchy, with dropped shoulders.`,
        details: ["Merino wool", "Relaxed fit", "Hand-linked seams"],
      },
    ],
    care: "Hand wash cold with wool detergent. Dry flat, away from heat.",
    entries: [
      ["1574201635302-388dd92a4c3f", "Ribbed Cashmere Sweater", "Ivory", "A woman pulling on an ivory ribbed sweater"],
      ["1773747310662-e7cc9e681226", "Hand-Knit Crew", "Brown", "A brown hand-knitted sweater on a white hanger"],
      ["1773747203295-dc002c421c33", "Raglan Sweater", "Terracotta", "A terracotta raglan sweater laid flat with loose yarn"],
      ["1773747203076-27b247d32a4a", "Ombré Mohair Sweater", "Ombré", "A close-up of a mohair sweater shading from green to yellow"],
      ["1643015862949-5c8d15a4242e", "Cable Cardigan", "Sage", "Sage and cream cable-knit cardigans hanging together"],
      ["1641642231157-0849081598a2", "Lambswool Crew", "Neutral", "A stack of neutral knitwear on a wooden chair", "men"],
      ["1646270968802-6bad28659329", "Merino Crew", "Mustard", "A stack of folded sweaters in cream, brown and mustard", "men"],
      ["1588271968087-4c51abe05afc", "Pointelle Sweater", "Cream", "A woman in a cream pointelle sweater"],
      ["1760127537832-0bae1e09bfbb", "Daisy Cardigan", "Forest green", "A forest-green cardigan embroidered with daisies"],
    ],
  },

  // ─── Denim, dresses and skirts ──────────────────────────────────────────
  {
    category: "men",
    sizes: (c) => (c === "women" ? ["24", "26", "28", "30"] : ["30", "32", "34", "36"]),
    price: [190, 390],
    copy: [
      {
        description: (n, c) =>
          `The ${n} in ${lower(c)}, woven on narrow shuttle looms and washed by hand to a lived-in fade.`,
        details: ["100% cotton selvedge denim", "Button fly", "Chain-stitched hems", "Made in Japan"],
      },
      {
        description: (n, c) => `A pair of ${n.toLowerCase()} in ${lower(c)}, straight from hip to hem with a mid rise.`,
        details: ["Cotton denim with a touch of stretch", "Five pockets", "Zip fly"],
      },
    ],
    care: "Wash inside out, cold, as rarely as you can. Line dry.",
    entries: [
      ["1602293589930-45aad59ba3ab", "Straight Jean", "Light wash", "Light-wash straight jeans on a wooden hanger"],
      ["1714729382668-7bc3bb261662", "Selvedge Jean", "Indigo", "Jeans in a range of washes hanging on a rail"],
      ["1637069585336-827b298fe84a", "Relaxed Jean", "Mid wash", "Folded jeans in mid and light washes, stacked"],
      ["1714143136372-ddaf8b606da7", "Slim Jean", "Mid wash", "Mid-wash slim jeans laid flat on white"],
      ["1671624759834-bcf0d3dd2517", "Raw Selvedge Jean", "Raw indigo", "A close-up of raw indigo denim at the back pocket"],
      ["1576995853123-5a10305d93c0", "Vintage Straight Jean", "Bleach wash", "Bleach-wash jeans hanging on wooden hangers", "women"],
      ["1713880453396-aa0493e308ec", "Rinse Jean", "Dark wash", "A stack of dark-wash jeans with turned-up hems"],
      ["1714143136367-7bb68f3f0669", "Cropped Jean", "Mid blue", "Folded mid-blue cropped jeans on white", "women"],
      ["1718252540511-e958742e4165", "Skinny Jean", "Black", "Black skinny jeans laid flat on white", "women"],
      ["1715758890151-2c15d5d482aa", "High-Rise Jean", "Mid wash", "Mid-wash high-rise jeans on a rail", "women"],
    ],
  },
  {
    category: "women",
    sizes: apparel,
    price: [390, 1490],
    copy: [
      {
        description: (n, c) =>
          `The ${n} in ${lower(c)}, cut on the bias from sand-washed silk so it skims rather than clings.`,
        details: ["100% silk charmeuse", "Bias cut", "French seams", "Made in Italy"],
      },
      {
        description: (n, c) => `A ${n.toLowerCase()} in ${lower(c)}, fluid and floor-skimming, with a softly gathered waist.`,
        details: ["Viscose satin", "Fully lined", "Concealed side zip"],
      },
    ],
    care: "Dry clean only. Steam to release creases.",
    entries: [
      ["1651047666890-8eab731ee345", "Open-Back Slip Dress", "Scarlet", "A woman in a scarlet satin slip dress with a crossed open back"],
      ["1742794559863-c5f9711a46dd", "Puff-Sleeve Midi Dress", "Butter", "A woman in a butter-yellow puff-sleeve midi dress on a garden path"],
      ["1768479620138-e3fac68b6fc5", "Cut-Out Column Dress", "Ivory", "A close-up of an ivory cut-out column dress with a high slit"],
      ["1742794572842-6836a8d0b11b", "Silk Bias Skirt Set", "Copper", "A woman in a copper silk skirt and cream sweater against wood"],
      ["1767972463975-dec5af1f3938", "Draped Bandeau Dress", "White", "A white draped bandeau dress in black and white"],
      ["1704775990154-b87562565d4c", "Satin Shirt Dress", "Chocolate", "A woman in a chocolate satin shirt dress holding a straw bag"],
      ["1777894851675-c787ecde9acb", "Cowl-Neck Slip Dress", "Silver", "A woman in a silver cowl-neck slip dress by a window"],
      ["1642776669775-94f657988a43", "Wrap Shirt Dress", "Cornflower", "A woman in a cornflower satin wrap dress against a white wall"],
      ["1642609881805-c8b7b54d97b3", "Satin Midi Shirt Dress", "Cornflower", "A woman in a cornflower satin shirt dress on white steps"],
      ["1704775990248-4c1c1a276b4f", "Asymmetric Satin Dress", "Midnight", "A woman in a midnight satin dress on a red background"],
      ["1762395500105-988d1860c152", "Halterneck Gown", "Champagne", "A woman in a champagne halterneck gown on a cream sofa"],
      ["1773921636042-a4ed88f78feb", "Column Slip Dress", "Oyster", "A woman in an oyster column slip dress in a green field"],
      ["1704775983143-2c83798831db", "Sleeveless Satin Midi", "Midnight", "A woman in a midnight sleeveless satin midi on burgundy"],
    ],
  },
  {
    category: "women",
    sizes: apparel,
    price: [190, 690],
    copy: [
      {
        description: (n, c) =>
          `The ${n} in ${lower(c)}, sitting high on the waist with a concealed side zip and a hem that moves.`,
        details: ["Concealed side zip", "Fully lined", "Made in Portugal"],
      },
      {
        description: (n, c) => `A ${n.toLowerCase()} in ${lower(c)}, cut close at the hip and finished with a clean hem.`,
        details: ["Cotton or denim", "Back slit", "Belt loops"],
      },
    ],
    care: "Machine wash at 30°C on a gentle cycle. Line dry.",
    entries: [
      ["1509182469511-7f0b50bfa63e", "Gingham Midi Skirt", "Yellow", "A woman in a full yellow gingham midi skirt holding a small trunk bag"],
      ["1503283821925-00aedcaae382", "Cotton Midi Skirt", "White", "A woman in a white midi skirt and green polka-dot shirt"],
      ["1615898290907-0ad011905389", "Tweed Mini Skirt", "Black and white", "A woman in a black and white tweed mini skirt and black blazer"],
      ["1789110519765-58b53b0b05d7", "Button-Front Denim Skirt", "White", "A white button-front denim mini skirt worn with sneakers"],
      ["1789110854402-7aa666508ef4", "Embellished Denim Skirt", "White", "A white denim pencil skirt with crystal embellishment"],
      ["1763256293894-33a149cd9fc7", "Tiered Print Maxi Skirt", "Multicolour", "A woman in a tiered printed maxi skirt and black roll-neck"],
      ["1777324968759-fc8c6048d85c", "Swing Mini Skirt", "Bottle green", "A woman in a bottle-green mini skirt and boots against red"],
      ["1758186168047-00dd2621d27f", "Tiered Cotton Maxi Skirt", "White", "A woman in a long tiered white cotton skirt walking on tiles"],
      ["1789111161052-fa79455e89e9", "Denim Mini Skirt", "White", "A white denim mini skirt and sneakers on a white background"],
      ["1677680127378-2525b64715b7", "Leather Mini Skirt", "Black", "A woman in a black leather mini skirt and knee boots by a wall"],
    ],
  },
];

// ─── Generation ───────────────────────────────────────────────────────────

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Deterministic 0–1 stream, seeded by a string (mulberry32 over FNV-1a). */
function random(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Whole dollars to cents, rounded to a retail-looking figure. */
function retail(dollars: number) {
  const step = dollars >= 1000 ? 50 : dollars >= 200 ? 10 : 5;
  return Math.round(dollars / step) * step * 100;
}

function build(): ExtendedProduct[] {
  const taken = new Set<string>();
  const perLine = lines.map((line) =>
    line.entries.map(([id, name, colour, alt, fit = line.category], index) => {
      const apparelLine = line.category === "men" || line.category === "women";
      const category = apparelLine ? fit : line.category;
      let slug = slugify(name);
      if (taken.has(slug)) slug = slugify(`${name} ${colour}`);
      for (let n = 2; taken.has(slug); n++) slug = `${slugify(name)}-${n}`;
      taken.add(slug);

      const rand = random(slug);
      const sizes = line.sizes(fit);
      const [low, high] = line.price;
      const priceCents = retail(low + (high - low) * rand() ** 1.6);
      const onSale = rand() < 0.12;
      const [mtoShare, mtoDetail] = line.madeToOrder ?? [0, ""];
      const madeToOrder = rand() < mtoShare;
      const max = line.maxStock ?? 6;
      const soldOut = !madeToOrder && rand() < 0.04;
      const stock = sizes.map(() =>
        madeToOrder || soldOut ? 0 : Math.floor(rand() * (max + 1)),
      );
      // A piece that drew zero everywhere by chance still gets one in the
      // middle size: only the explicit draw above sells a piece out.
      if (!madeToOrder && !soldOut && !stock.some((q) => q > 0)) {
        stock[Math.floor(sizes.length / 2)] = 1;
      }
      const copy = line.copy[index % line.copy.length];

      return {
        slug,
        name,
        categorySlug: category,
        priceCents,
        compareAtCents: onSale ? retail((priceCents / 100) * (1.25 + rand() * 0.2)) : null,
        madeToOrder,
        stockDetail: madeToOrder ? mtoDetail : null,
        lowStockThreshold: line.threshold ?? 3,
        description: copy.description(name, colour),
        details: copy.details,
        care: line.care,
        images: [{ url: unsplash(id), alt }],
        sizes,
        colours: [{ name: colour, stock }],
      } satisfies ExtendedProduct;
    }),
  );

  // Interleave the lines so "newest first" mixes watches, shoes, bags and
  // clothes instead of listing 24 watches in a row.
  const out: ExtendedProduct[] = [];
  for (let i = 0; out.length < perLine.flat().length; i++) {
    for (const items of perLine) if (items[i]) out.push(items[i]);
  }
  return out;
}

export const extendedProducts = build();

/**
 * One minute apart, starting the day after the original catalogue's base
 * date (2026-10-01 UTC), so these lead "newest first" in a stable order.
 */
export function extendedCreatedAt(index: number) {
  return new Date(Date.UTC(2026, 9, 2) - index * 60_000);
}

/** New collections, listed after the original five. */
export const extendedCategories = [
  {
    slug: "watches",
    name: "Watches",
    imageUrl: unsplash("1636639818651-d97365346a5c"),
    imageAlt: "A watch with a blue sunray dial on a steel bracelet against black",
  },
  {
    slug: "jewellery",
    name: "Jewellery",
    imageUrl: unsplash("1721807550979-6e662d370e92"),
    imageAlt: "A heavy gold curb chain on a black background",
  },
  {
    slug: "fragrance",
    name: "Fragrance",
    imageUrl: unsplash("1733660227163-01bc46e0d7d7"),
    imageAlt: "A round amber perfume bottle on cream silk",
  },
];

/** Accessories had no cover; with eight collections the homepage grid fills two rows. */
export const accessoriesCover = {
  imageUrl: unsplash("1590564310418-66304f55a2c2"),
  imageAlt: "Round gold-rimmed sunglasses beside a coffee cup",
};
