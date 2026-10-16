import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { auth } from "@/lib/auth";

// Client components only. Same origin, so no baseURL.
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
});
