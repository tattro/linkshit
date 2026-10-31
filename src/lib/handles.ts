// Handles live at linksh.it/<handle>, so anything that is (or might become)
// a real route has to be reserved.
export const RESERVED_HANDLES = new Set([
  "admin", "administrator", "api", "app", "auth", "login", "logout", "signin",
  "signup", "register", "dashboard", "settings", "account", "go", "help",
  "support", "about", "terms", "privacy", "legal", "blog", "pricing", "static",
  "public", "assets", "images", "img", "_next", "favicon.ico", "robots.txt",
  "sitemap.xml", "www", "mail", "root", "staff", "official", "linksh",
  "linkshit", "null", "undefined", "me", "you", "edit", "new", "explore",
  "search", "status", "security", "billing", "contact", "jobs", "careers",
]);

export const HANDLE_RE = /^[a-z0-9_]{3,30}$/;

export function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@/, "").toLowerCase();
}

/** Returns an error message, or null if the handle's shape is fine. */
export function handleProblem(handle: string): string | null {
  if (handle.length < 3) return "Handles need at least 3 characters.";
  if (handle.length > 30) return "Keep it to 30 characters or fewer.";
  if (!HANDLE_RE.test(handle)) return "Use only letters, numbers and underscores.";
  if (RESERVED_HANDLES.has(handle)) return "That one's reserved. Try another.";
  return null;
}
