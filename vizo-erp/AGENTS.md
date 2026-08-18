<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Rendering speed is a requirement here

The people using this app came off a FoxPro system running on a LAN. It
answered instantly. If a screen takes a second to appear they will say the old
one was better, and they will be right. Treat navigation speed the way you
treat correctness — not as a polish item at the end.

**None of this trades away the UI.** Every rule below is about where code runs
and what ships to the browser. The design stays exactly as ambitious.

## Where we stand (measured 2026-08-18)

| | |
|---|---|
| Client components | **134 of 152** `.tsx` files |
| Total client chunks | **5.6 MB** |
| Largest single chunk | **336 KB** (carries recharts) |

That first number is the problem. Almost the entire app ships to the browser
and hydrates, when most of it is read-only markup that could have arrived as
finished HTML.

## Rules

### 1. Server Component by default; `"use client"` only on the island

Do not put `"use client"` at the top of a page and be done. Push it down to
the smallest piece that actually needs a hook, an event handler, or browser
state — the filter bar, the line-item grid, the dialog. The page shell, the
header, the read-only tables and cards stay on the server.

A page that is 90% static markup should ship ~10% of itself as JavaScript.

### 2. Fetch on the server, pass as props

Never `useEffect` + `fetch` for the primary data of a page. That gives the user
four sequential waits: download JS → hydrate → request → render. Fetch in the
server component and hand the data down. Use `Suspense` so slow sections stream
in without holding up the rest of the page.

### 3. Never render a full list

This business has 14,477 invoices, 1,504 accounts and 957 items — and that is
before the new system adds any. Server-side pagination is the default. Where a
long scroll is genuinely wanted, virtualise it. `DataTable` paginates; keep it
that way and do not add a "show all" that maps over thousands of rows.

### 4. Heavy and rare means dynamic

Charts, print layouts, exporters, the command palette — anything big that most
sessions never open — load with `next/dynamic` and `ssr: false`. recharts alone
is most of a 336 KB chunk; it must never sit in a shared bundle.

### 5. Import narrowly

- No barrel imports in client code. `from "@/components/dialogs"` drags in every
  dialog; import the one file.
- Icons one at a time from `lucide-react`, never a namespace import.
- Keep data modules out of client components once the API exists. A client
  component that imports a data file ships that file.

### 6. Keep state where it is used

One context or one `useState` near the root re-renders everything under it.
Filters, search boxes and dialog open/close belong in the component that owns
them. `useMemo` the derived lists that feed a table.

### 7. Prove it before saying it is fast

`next dev` compiles each route the first time you visit it — that lag is the
dev server, not the app, and it misleads everyone. Judge speed only from
`next build && next start`. When a screen feels slow, look at the route's
First Load JS and the number of client components under it before guessing.

## Quick checklist for any new screen

- [ ] Is the page itself a Server Component?
- [ ] Is `"use client"` on the smallest possible child?
- [ ] Is the data fetched server-side and passed down?
- [ ] Is every list paginated or virtualised?
- [ ] Is anything heavy behind `next/dynamic`?
- [ ] Are imports specific — no barrels, no namespace icon imports?
