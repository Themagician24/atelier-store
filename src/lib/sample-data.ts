// Static site chrome only. Catalogue data lives in src/lib/products.ts.

export type NavLink = { label: string; href: string };

export const mainNav: NavLink[] = [
  { label: "New Arrivals", href: "/new-arrivals" },
  { label: "Women", href: "/collections/women" },
  { label: "Men", href: "/collections/men" },
  { label: "Bags", href: "/collections/bags" },
  { label: "Shoes", href: "/collections/shoes" },
  { label: "Accessories", href: "/collections/accessories" },
  { label: "Watches", href: "/collections/watches" },
  { label: "Jewellery", href: "/collections/jewellery" },
  { label: "Fragrance", href: "/collections/fragrance" },
];

export const footerNav: { title: string; links: NavLink[] }[] = [
  {
    title: "Shop",
    links: mainNav,
  },
  {
    title: "Client Services",
    links: [
      { label: "Shipping", href: "/help/shipping" },
      { label: "Contact Us", href: "/help/contact" },
      { label: "Your Orders", href: "/account/orders" },
      { label: "Search", href: "/search" },
    ],
  },
];
