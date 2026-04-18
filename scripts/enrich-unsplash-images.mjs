import fs from "node:fs/promises";
import path from "node:path";

const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const INPUT_FILE = path.resolve("simba_products.json");
const OUTPUT_FILE = path.resolve("simba_products.with_unsplash.json");
const APP_NAME = process.env.UNSPLASH_APP_NAME || "simba-supermarket";
const DELAY_MS = Number(process.env.UNSPLASH_DELAY_MS || 450);

const categoryFallbacks = {
  "Alcoholic Drinks": ["wine bottle", "beer bottle", "spirits bottle"],
  "Baby Products": ["baby milk", "baby care product", "baby food"],
  "Cleaning & Sanitary": ["cleaning supplies", "detergent bottle", "household cleaner"],
  "Cosmetics & Personal Care": ["soap bottle", "personal care product", "beauty product"],
  "Food Products": ["groceries", "food ingredient", "packaged food"],
  General: ["supermarket item", "household item"],
  "Kitchenware & Electronics": ["kitchen appliance", "cookware", "kitchen gadget"],
  "Sports & Fitness": ["fitness equipment", "sports gear"],
  Stationery: ["notebook", "office supplies", "stationery"],
};

const stopWords = new Set([
  "ml",
  "g",
  "kg",
  "l",
  "pcs",
  "pc",
  "pack",
  "roll",
  "rolls",
  "x",
  "cm",
  "mm",
  "set",
  "art",
  "new",
  "simba",
  "super",
  "selection",
]);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function compactWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function stripVariantNoise(name) {
  return compactWhitespace(
    name
      .replace(/\b\d+([.,]\d+)?\s?(ml|g|kg|l|cl|cm|mm|sheets?)\b/gi, " ")
      .replace(/\b\d+\s?(pcs?|pack|rolls?)\b/gi, " ")
      .replace(/[^\p{L}\p{N}\s&-]/gu, " "),
  );
}

function extractKeywordQuery(name) {
  const tokens = stripVariantNoise(name)
    .split(/\s+/)
    .filter((token) => token.length > 2)
    .filter((token) => !stopWords.has(token.toLowerCase()));

  return compactWhitespace(tokens.slice(0, 4).join(" "));
}

function buildQueries(product) {
  const queries = [
    compactWhitespace(product.name),
    stripVariantNoise(product.name),
    extractKeywordQuery(product.name),
    ...(categoryFallbacks[product.category] || []),
  ];

  return [...new Set(queries.filter(Boolean))];
}

async function searchUnsplash(query) {
  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("page", "1");
  url.searchParams.set("per_page", "1");
  url.searchParams.set("orientation", "squarish");
  url.searchParams.set("content_filter", "high");

  const response = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${ACCESS_KEY}`,
      "Accept-Version": "v1",
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Unsplash ${response.status}: ${message}`);
  }

  const payload = await response.json();
  return payload.results?.[0] || null;
}

function mapPhoto(photo, query) {
  return {
    image: photo.urls.regular,
    imageThumb: photo.urls.thumb,
    imageAlt: photo.alt_description || photo.description || query,
    imageSource: "unsplash",
    imageQuery: query,
    imageAttribution: {
      photographer: photo.user.name,
      profile: `${photo.user.links.html}?utm_source=${APP_NAME}&utm_medium=referral`,
      unsplash: `https://unsplash.com/?utm_source=${APP_NAME}&utm_medium=referral`,
      downloadLocation: photo.links.download_location,
    },
  };
}

async function enrichProduct(product) {
  const queries = buildQueries(product);

  for (const query of queries) {
    try {
      const photo = await searchUnsplash(query);
      if (photo) {
        return { ...product, ...mapPhoto(photo, query) };
      }
    } catch (error) {
      return {
        ...product,
        imageLookupError: error.message,
      };
    } finally {
      await delay(DELAY_MS);
    }
  }

  return {
    ...product,
    imageLookupError: "No Unsplash match found",
  };
}

async function main() {
  if (!ACCESS_KEY) {
    throw new Error(
      "Missing UNSPLASH_ACCESS_KEY. Create an Unsplash app and set the access key before running this script.",
    );
  }

  const raw = await fs.readFile(INPUT_FILE, "utf8");
  const data = JSON.parse(raw);
  const enrichedProducts = [];

  for (const [index, product] of data.products.entries()) {
    const enriched = await enrichProduct(product);
    enrichedProducts.push(enriched);
    console.log(`[${index + 1}/${data.products.length}] ${product.name}`);
  }

  const output = {
    ...data,
    products: enrichedProducts,
    imageProvider: "Unsplash API",
    imageProviderNotes:
      "Queries are inferred from product names and categories. Many results will be representative lifestyle photos rather than exact retail packshots.",
    generatedAt: new Date().toISOString(),
  };

  await fs.writeFile(OUTPUT_FILE, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Wrote ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
