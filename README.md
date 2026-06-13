# Simba Supermarket

Modern Simba Supermarket storefront built with React and Vite using the provided `simba_products.json` dataset.

## Run

1. `npm install`
2. `npm run dev`

## Build

`npm run build`

## Deploy On Render

This project is a single full-stack service on Render:

- Vite builds the frontend into `dist`
- Express serves both `/api/*` and the built frontend

### Option A: Use `render.yaml` (recommended)

1. Push this repo to GitHub.
2. In Render, create a new Blueprint and point it to the repo.
3. Render will read `render.yaml` and create the web service.

### Option B: Manual Web Service Setup

- Build Command: `npm ci --include=dev && npm run build`
- Start Command: `npm start`

### Required Environment Variables

- `NODE_VERSION=20`
- `DATABASE_PATH=/var/data/simba.db`

### Persistent Disk (important)

SQLite needs persistent storage on Render.

1. Add a persistent disk to the service.
2. Mount path: `/var/data`
3. Keep `DATABASE_PATH=/var/data/simba.db`

Without a persistent disk, your orders/accounts database resets on each deploy/restart.

## Backend

- `npm run server` starts the SQLite order API on `http://localhost:8787`
- orders are stored in `server/data/simba.db`
- customer accounts are upserted by phone number after purchase

## Enrich Product Images With Unsplash

1. Create an Unsplash developer app and get an access key.
2. Set `UNSPLASH_ACCESS_KEY`.
3. Run `npm run enrich:images`.

This writes `simba_products.with_unsplash.json` with:

- `image` and `imageThumb`
- `imageQuery`
- `imageAttribution`
- `imageLookupError` when no result is found

Note: the script uses inferred search queries from product names and categories, so many matches will be approximate lifestyle/product photos, not exact SKU packshots.

## NLP Search with Qwen + Local Embeddings

The `/api/search` endpoint is a semantic search pipeline that interprets a
buyer's natural-language query (e.g. "I'm hosting a party and need drinks
and snacks" or "I feel tired and need a quick study boost") and returns the
products that best match their intent.

### Pipeline

1. **Lexical shortlist** — fast keyword filter on product name, category,
   brand, tags, and location. Bounds the work for the next step.
2. **Vector ranking** — the buyer's query is embedded with
   `Xenova/all-MiniLM-L6-v2` running in-process via `@xenova/transformers`.
   Product embeddings are pre-computed at server boot (and cached to
   `server/.cache/product-index.json`). Cosine similarity ranks the
   shortlisted candidates.
3. **Qwen rerank** — if `HF_TOKEN` is set, the top candidates are sent to a
   Qwen chat model on Hugging Face
   (`QWEN_MODEL`, default `Qwen/Qwen2.5-72B-Instruct`) with a multilingual
   system prompt. Qwen returns the final picks with short reasoning, so
   multi-intent queries work even when individual keywords don't match.

If the local embedding model cannot load (sandboxed environment, missing
native deps), the server transparently falls back to the Hugging Face
feature-extraction endpoint. If the Qwen rerank call fails, the vector
result is returned. The response includes a `source` field
(`"qwen" | "vector" | "lexical" | "empty"`) and an `embeddingBackend` field
(`"local" | "remote"`) so the UI can show what powered the result.

### Configuration

- `HF_TOKEN` / `VITE_HF_TOKEN` — Hugging Face token. Required only for the
  Qwen rerank step and the Aya recommendation flow; the rest of the search
  works without it.
- `QWEN_MODEL` / `VITE_QWEN_MODEL` — Qwen checkpoint to use for reranking.
  Any chat model on the HF router works (e.g. `Qwen/Qwen2.5-7B-Instruct`).

### Trying it out

```bash
curl 'http://localhost:8787/api/search?q=hosting%20a%20party%20need%20drinks%20and%20snacks&limit=6'
curl 'http://localhost:8787/api/search?q=feel%20tired%20need%20study%20boost&limit=6'
curl 'http://localhost:8787/api/search?q=cleaning%20supplies%20for%20the%20kitchen&limit=6'
```

## Aya Recommendations

Add a Hugging Face token with Inference Providers access:

1. Set `VITE_HF_TOKEN`
2. Optionally set `VITE_HF_MODEL` (default: `CohereLabs/aya-expanse-8b`)
3. Restart the dev server

The app uses a hybrid flow:

- shortlist products from `simba_products.json` locally
- send only shortlisted real products to Aya
- render clickable recommendations that open product detail or add to cart

If no token is configured, the UI falls back to local recommendation scoring.

## Delivery Distance And Pricing

- no maps API key is required for checkout
- checkout caches customer details in local storage
- delivery distance is estimated locally from selected branch to customer district/location
- current delivery formula: provider base fee + `(provider per-km fee * distance in km)`

## Features

- Product browsing by category
- Search, stock filter, and sorting
- Persistent cart drawer
- Mobile-first responsive layout
- Checkout demo with MoMo option
- English, French, and Kinyarwanda UI
- Product detail view
- Dark mode

## Test Accounts

- Buyer/customer: `buyer@test.com` / `password123`
- Admin, market rep, delivery, and branch access: `admin@test.com` / `Downtown2026`
