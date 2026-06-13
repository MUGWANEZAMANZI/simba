// Build a semantic index over the Simba product catalog.
// Embeddings are computed lazily and cached to server/.cache/index.json so restarts
// don't have to re-encode the entire catalog (≈ 552 products).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { embedTexts, getEmbeddingSize } from "./embeddings.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CACHE_DIR = path.join(__dirname, ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "product-index.json");

let indexState = null; // { products, vectors, fingerprint, sourceHash }
let buildPromise = null;

function ensureCacheDir() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function productSearchText(product) {
  return [
    product.name,
    product.category,
    product.subcategory,
    product.brand,
    Array.isArray(product.tags) ? product.tags.join(" ") : "",
    product.unit ? `Unit: ${product.unit}` : "",
    product.location ? `Location: ${product.location}` : "",
    product.description ? product.description : "",
  ]
    .filter(Boolean)
    .join(" | ");
}

function buildProductFingerprint(products) {
  return JSON.stringify(
    products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      subcategory: p.subcategory,
      brand: p.brand,
      tags: p.tags,
      unit: p.unit,
      location: p.location,
    })),
  );
}

function fileFingerprint(productsPath) {
  try {
    const stats = fs.statSync(productsPath);
    return `${stats.mtimeMs}:${stats.size}`;
  } catch {
    return "missing";
  }
}

function readCache() {
  try {
    const raw = fs.readFileSync(CACHE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      Array.isArray(parsed.vectors) &&
      Array.isArray(parsed.ids) &&
      parsed.dim === getEmbeddingSize()
    ) {
      const vectors = parsed.vectors.map((row) => Float32Array.from(row));
      return { vectors, ids: parsed.ids, fingerprint: parsed.fingerprint };
    }
  } catch {
    // ignore
  }
  return null;
}

function writeCache(payload) {
  ensureCacheDir();
  const serializable = {
    dim: getEmbeddingSize(),
    fingerprint: payload.fingerprint,
    ids: payload.ids,
    vectors: payload.vectors.map((row) => Array.from(row)),
  };
  fs.writeFileSync(CACHE_FILE, JSON.stringify(serializable));
}

export async function buildProductIndex(products, options = {}) {
  const productsPath = options.productsPath;
  const fingerprint = buildProductFingerprint(products);
  const sourceFingerprint = productsPath ? fileFingerprint(productsPath) : "nopath";
  const cacheKey = `${sourceFingerprint}:${fingerprint.length}`;

  if (
    indexState &&
    indexState.fingerprint === cacheKey &&
    indexState.ids.length === products.length
  ) {
    return indexState;
  }

  if (buildPromise) {
    return buildPromise;
  }

  buildPromise = (async () => {
    const cached = readCache();
    if (
      cached &&
      cached.ids.length === products.length &&
      cached.fingerprint === cacheKey
    ) {
      indexState = {
        products,
        vectors: cached.vectors,
        ids: cached.ids,
        fingerprint: cacheKey,
        sourceHash: sourceFingerprint,
      };
      console.log(`[search] loaded ${cached.ids.length} cached embeddings from ${CACHE_FILE}`);
      return indexState;
    }

    console.log(`[search] building embeddings for ${products.length} products...`);
    const texts = products.map(productSearchText);
    const vectors = await embedTexts(texts);
    if (!vectors.length || vectors[0]?.length !== getEmbeddingSize()) {
      throw new Error("embedding pipeline returned unexpected shape");
    }
    const ids = products.map((p) => p.id);
    writeCache({ vectors, ids, fingerprint: cacheKey });
    indexState = { products, vectors, ids, fingerprint: cacheKey, sourceHash: sourceFingerprint };
    console.log(`[search] cached ${ids.length} embeddings to ${CACHE_FILE}`);
    return indexState;
  })().finally(() => {
    buildPromise = null;
  });

  return buildPromise;
}

export function getIndexState() {
  return indexState;
}
