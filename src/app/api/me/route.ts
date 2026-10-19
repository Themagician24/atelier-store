import { bagItemCount } from "@/lib/cart";
import { firstName } from "@/lib/display-name";
import { getCurrentUser } from "@/lib/session";
import type { MeResponse } from "@/lib/session-store";

/*
 * What the header island needs about the visitor, read from the validated
 * session: never the email or the id, only a first name, the admin flag
 * (which only decides whether a link is shown; /admin guards itself) and the
 * bag count as getBag() caps it (one aggregate), so the badge and the bag
 * page agree.
 */
export async function GET(): Promise<Response> {
  const user = await getCurrentUser();
  const body: MeResponse = user
    ? {
        user: { firstName: firstName(user.name), isAdmin: user.role === "admin" },
        bagCount: await bagItemCount(user.id),
      }
    : { user: null, bagCount: 0 };

  return Response.json(body, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
