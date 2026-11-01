import { NextResponse, type NextRequest } from "next/server";
import { isMainHost } from "@/lib/domains";

// Someone's custom domain (links.example.com) shows their page at its root.
export function proxy(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  if (!host || isMainHost(host)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = `/domain/${encodeURIComponent(host.toLowerCase().replace(/:\d+$/, ""))}`;
  return NextResponse.rewrite(url);
}

export const config = { matcher: "/" };
