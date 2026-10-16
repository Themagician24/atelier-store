import { SiteNav } from "@/components/site-nav";
import { getNavigation } from "@/lib/products";

// The menus are built from the catalogue, cached under the "products" tag,
// so the header stays in the static shell. No session read here: it would
// pull request-time work into every catalogue route.
export async function SiteHeader() {
  const navigation = await getNavigation();
  return <SiteNav navigation={navigation} />;
}
