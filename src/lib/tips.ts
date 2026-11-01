/** Tip jar providers. Each takes a username or a link and returns a full URL, or null. */
export type TipProvider = { id: string; label: string; emoji: string; placeholder: string; toUrl: (v: string) => string | null };

const fromHandle = (base: string, host: RegExp, re = /^[\w.\-]{1,60}$/) => (input: string) => {
  const v = input.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v) || host.test(v.split("/")[0])) {
    try {
      const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
      return host.test(u.hostname) ? u.toString() : null;
    } catch { return null; }
  }
  const name = v.replace(/^[@$]/, "");
  return re.test(name) ? `${base}${name}` : null;
};

export const TIP_PROVIDERS: TipProvider[] = [
  { id: "venmo", label: "Venmo", emoji: "💙", placeholder: "@yourname", toUrl: fromHandle("https://venmo.com/u/", /(^|\.)venmo\.com$/i) },
  { id: "cashapp", label: "Cash App", emoji: "💚", placeholder: "$yourname", toUrl: (v) => fromHandle("https://cash.app/$", /(^|\.)cash\.app$/i)(v) },
  { id: "paypal", label: "PayPal", emoji: "💛", placeholder: "paypal.me/yourname", toUrl: fromHandle("https://paypal.me/", /(^|\.)(paypal\.me|paypal\.com)$/i) },
  { id: "bmc", label: "Buy Me a Coffee", emoji: "☕", placeholder: "yourname", toUrl: fromHandle("https://buymeacoffee.com/", /(^|\.)buymeacoffee\.com$/i) },
  { id: "stripe", label: "Card (Stripe link)", emoji: "💳", placeholder: "buy.stripe.com/…", toUrl: fromHandle("", /(^|\.)(buy\.stripe\.com|donate\.stripe\.com)$/i, /^$/) },
];

export const tipProvider = (id: string) => TIP_PROVIDERS.find((p) => p.id === id);
