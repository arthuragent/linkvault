# LinkVault

Personal link saver. One-click capture, colorful nested categories, optional AI summaries.

## Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Database**: Neon Postgres (HTTP driver)
- **ORM**: Drizzle ORM
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Deployment**: Vercel

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and set your Neon database URL:

```bash
cp .env.example .env
# Edit .env and set DATABASE_URL
```

### 3. Set up the database

The schema lives in `lib/schema.ts`. Tables are prefixed `linkvault_` so they
can coexist with other projects on the same Neon database.

```bash
npm run db:generate   # generate migration SQL from schema
npm run db:push       # push schema to Neon (or apply the SQL in drizzle/)
```

> ⚠️ `drizzle-kit push` needs an interactive TTY. If you're running in CI or
> a non-interactive shell, apply the generated SQL in `drizzle/*.sql` directly
> via `psql` or `@neondatabase/serverless`.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- **One-click capture** — bookmarklet at `/bookmarklet`. Drag to the bookmarks
  bar; click on any page to open LinkVault with the URL + title prefilled.
- **Nested categories** — each category has color, optional emoji, and an
  optional `parent_id` for tree structure. Expand / collapse in the UI.
- **Search** — full-text over title, URL, and summary.
- **Filter** — click a category chip to filter by that category.
- **AI summaries** — opt-in per link via the toggle in the save modal.
  Currently `POST /api/summarize` is a stub that returns a placeholder; wire
  it up to your AI provider of choice.

## API

| Method | Path                       | Description                       |
| ------ | -------------------------- | --------------------------------- |
| GET    | `/api/links`               | List all links (newest first)     |
| POST   | `/api/links`               | Create a link                     |
| PATCH  | `/api/links/[id]`          | Update a link                     |
| DELETE | `/api/links/[id]`          | Delete a link                     |
| GET    | `/api/categories`          | List all categories               |
| POST   | `/api/categories`          | Create a category                 |
| PATCH  | `/api/categories/[id]`     | Update a category                 |
| DELETE | `/api/categories/[id]`     | Delete a category                 |
| POST   | `/api/summarize`           | AI summary stub (placeholder)     |

## Project Layout

```
app/
├── page.tsx                  Dashboard (search, filter, groups)
├── layout.tsx                Root layout + metadata
├── globals.css               Tailwind + global styles
├── bookmarklet.tsx           Bookmarklet source builder
├── bookmarklet/page.tsx      Bookmarklet install page
├── api/
│   ├── links/route.ts
│   ├── links/[id]/route.ts
│   ├── categories/route.ts
│   ├── categories/[id]/route.ts
│   └── summarize/route.ts
└── components/
    ├── LinkCard.tsx
    ├── CategoryGroup.tsx
    ├── SaveLinkModal.tsx
    ├── AddCategoryModal.tsx
    ├── SearchBar.tsx
    ├── CategoryFilter.tsx
    ├── Modal.tsx
    ├── FloatingActionButton.tsx
    └── types.ts
lib/
├── db.ts                     Neon + Drizzle connection
├── schema.ts                 Drizzle schema (linkvault_categories, linkvault_links)
└── utils.ts                  cn(), URL helpers, color helpers
drizzle/                      Generated migrations
```

## Deploy to Vercel

```bash
# Push to GitHub
git remote add origin https://github.com/arthuragent/linkvault.git
git push -u origin main

# In Vercel dashboard:
# - Import the repo
# - Add DATABASE_URL env var
# - Deploy
```

## Scripts

| Script              | Purpose                                  |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | Dev server                               |
| `npm run build`     | Production build                         |
| `npm run start`     | Run production build                     |
| `npm run lint`      | ESLint                                   |
| `npm run db:generate` | Generate Drizzle migration from schema |
| `npm run db:push`   | Push schema to Neon (interactive)        |
| `npm run db:studio` | Drizzle Studio                           |
