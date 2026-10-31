import NextLink from "next/link";
import type { Link as LinkRow, User } from "@/db";
import { getTheme } from "@/lib/themes";

export function ProfileView({ user, links, preview = false }: {
  user: Pick<User, "handle" | "displayName" | "bio" | "theme">;
  links: Pick<LinkRow, "id" | "title" | "url">[];
  preview?: boolean;
}) {
  const theme = getTheme(user.theme);
  const name = user.displayName || user.handle;
  return (
    <div className={`flex min-h-full flex-col items-center px-5 py-12 ${theme.page}`}>
      <div className="flex w-full max-w-md flex-1 flex-col items-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-current/15 text-4xl font-black uppercase">
          {name.slice(0, 1)}
        </div>
        <h1 className="mt-4 text-xl font-bold">{name}</h1>
        <p className={`text-sm ${theme.muted}`}>@{user.handle}</p>
        {user.bio && <p className="mt-3 text-center">{user.bio}</p>}
        <ul className="mt-8 w-full space-y-3">
          {links.map((l) => (
            <li key={l.id}>
              <a
                href={preview ? l.url : `/go/${l.id}`}
                target={preview ? "_blank" : undefined}
                rel="noopener noreferrer nofollow"
                className={`block rounded-xl px-5 py-4 text-center font-semibold transition ${theme.button}`}
              >
                {l.title}
              </a>
            </li>
          ))}
          {links.length === 0 && <li className={`text-center text-sm ${theme.muted}`}>Nothing here yet. Check back soon.</li>}
        </ul>
      </div>
      <NextLink href="/" className={`mt-12 font-mono text-xs ${theme.muted} hover:underline`}>
        made with linksh.it
      </NextLink>
    </div>
  );
}
