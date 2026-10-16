import type { NavProduct, NavSection } from "@/lib/nav-types";

/*
 * Header search over the catalogue shipped with the page: no request per
 * keystroke. Accent- and case-insensitive; every word typed must match the
 * name, category or a colour. A few French words map to the catalogue's
 * English so "sac cuir" finds the leather bags.
 */

const SYNONYMS: Record<string, string[]> = {
  sac: ["bag"],
  sacs: ["bag"],
  chaussure: ["shoe", "boot"],
  chaussures: ["shoe", "boot"],
  botte: ["boot"],
  bottes: ["boot"],
  veste: ["jacket", "blazer"],
  blouson: ["jacket", "bomber"],
  manteau: ["coat"],
  pantalon: ["trouser"],
  robe: ["dress"],
  pull: ["sweater", "knit", "jumper"],
  maille: ["knit"],
  chemise: ["shirt"],
  jupe: ["skirt"],
  cuir: ["leather"],
  laine: ["wool"],
  soie: ["silk"],
  femme: ["women"],
  homme: ["men"],
  noir: ["black"],
  blanc: ["white", "ivory"],
  bleu: ["blue", "navy", "indigo", "cobalt"],
  rouge: ["red", "burgundy", "oxblood"],
  vert: ["green", "olive", "sage", "jade"],
  rose: ["pink", "blush", "rose"],
  marron: ["brown", "chestnut", "tobacco"],
  accessoire: ["accessor"],
  accessoires: ["accessor"],
  nouveau: ["new"],
  nouveautes: ["new"],
};

export function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** The spellings a typed word may match: itself, its singular, synonyms. */
function variants(word: string) {
  const forms = [word];
  if (word.length > 3 && word.endsWith("s")) forms.push(word.slice(0, -1));
  for (const form of [...forms]) forms.push(...(SYNONYMS[form] ?? []));
  return forms;
}

/** Word starts only, so "men" doesn't find "women". */
function startsWord(text: string, form: string) {
  return ` ${text}`.includes(` ${form}`);
}

/** 3 on a word start in the name, 2 inside the name, 1 elsewhere, 0 no match. */
function wordScore(forms: string[], name: string, rest: string) {
  let best = 0;
  for (const form of forms) {
    if (startsWord(name, form)) return 3;
    if (name.includes(form)) best = Math.max(best, 2);
    else if (startsWord(rest, form)) best = Math.max(best, 1);
  }
  return best;
}

export function searchProducts(products: NavProduct[], query: string) {
  const words = normalize(query).split(/\s+/).filter(Boolean).map(variants);
  if (words.length === 0) return [];

  const scored = products.flatMap((product) => {
    const name = normalize(product.name);
    const rest = normalize(
      [product.category.name, product.category.slug, ...product.colours].join(" "),
    );
    let total = 0;
    for (const forms of words) {
      const score = wordScore(forms, name, rest);
      if (score === 0) return [];
      total += score;
    }
    return [{ product, total }];
  });
  // Stable sort: equal scores keep the catalogue's newest-first order.
  return scored.sort((a, b) => b.total - a.total).map((s) => s.product);
}

export function searchSections(sections: NavSection[], query: string) {
  const words = normalize(query).split(/\s+/).filter(Boolean).map(variants);
  if (words.length === 0) return [];
  return sections.filter((section) => {
    const label = normalize(`${section.label} ${section.slug}`);
    return words.some((forms) => forms.some((form) => startsWord(label, form)));
  });
}
