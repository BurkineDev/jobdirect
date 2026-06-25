import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 : la « Routing Middleware » s'écrit désormais dans proxy.ts.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Ne s'exécute que sur l'espace admin (seule zone authentifiée).
  matcher: ["/admin/:path*"],
};
