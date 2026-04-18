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

## Google Maps Checkout

- set `VITE_GOOGLE_MAPS_API_KEY`
- the checkout caches customer details in local storage
- delivery pricing is computed from the Simba Kicukiro origin to the selected home pin
- current delivery formula: provider base fee + `100 RWF * distance in km`

## Features

- Product browsing by category
- Search, stock filter, and sorting
- Persistent cart drawer
- Mobile-first responsive layout
- Checkout demo with MoMo option
- English, French, and Kinyarwanda UI
- Product detail view
- Dark mode
