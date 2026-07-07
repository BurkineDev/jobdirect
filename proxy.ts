import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 : la « Routing Middleware » s'écrit désormais dans proxy.ts.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Zones authentifiées : admin + compte utilisateur.
  matcher: ["/admin/:path*", "/mon-compte/:path*"],
};
