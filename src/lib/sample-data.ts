// Static site chrome only. Catalogue data lives in src/lib/products.ts.

export type NavLink = { label: string; href: string };

export const mainNav: NavLink[] = [
  { label: "New Arrivals", href: "/new-arrivals" },
  { label: "Women", href: "/collections/women" },
  { label: "Men", href: "/collections/men" },
  { label: "Bags", href: "/collections/bags" },
  { label: "Shoes", href: "/collections/shoes" },
  { label: "Accessories", href: "/collections/accessories" },
];

export const footerNav: { title: string; links: NavLink[] }[] = [
  {
    title: "Shop",
    links: mainNav,
  },
  {
    title: "Client Services",
    links: [
      { label: "Shipping & Returns", href: "/help/shipping" },
      { label: "Size Guide", href: "/help/sizing" },
      { label: "Garment Care", href: "/help/care" },
      { label: "Contact Us", href: "/help/contact" },
    ],
  },
  {
    title: "The House",
    links: [
      { label: "Our Ateliers", href: "/about" },
      { label: "Sustainability", href: "/sustainability" },
    ],
  },
];
