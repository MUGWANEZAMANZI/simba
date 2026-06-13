// Semantic product search.
//
// Pipeline:
//   1. Lexical shortlist (cheap, deterministic) to keep the embedding work bounded.
//   2. Embed the user query (locally via @xenova/transformers, falling back to the
//      Hugging Face feature-extraction endpoint if the local model cannot load).
//   3. Cosine-similarity rank the shortlisted candidates against the cached product
//      embeddings built by server/productIndex.js.
//   4. Optional rerank pass with a Qwen LLM on Hugging Face (HF_TOKEN) to better
//      handle multi-intent natural-language queries (e.g. "hosting a party, need
//      drinks and snacks"). Falls back to the vector result if the LLM call fails.

import { embedTexts, getEmbeddingBackend } from "./embeddings.js";
import { buildProductIndex } from "./productIndex.js";

const QWEN_MODEL =
  process.env.QWEN_MODEL ||
  process.env.VITE_QWEN_MODEL ||
  "Qwen/Qwen2.5-72B-Instruct";

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function productSearchText(product) {
  return [
    product.name,
    product.category,
    `Price: ${product.price} RWF`,
    `Unit: ${product.unit}`,
    product.subcategory,
    product.brand,
    Array.isArray(product.tags) ? product.tags.join(" ") : "",
    product.location ? `Location: ${product.location}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
}

function lexicalScore(query, product) {
  const normalizedQuery = normalizeText(query);
  const haystack = normalizeText(productSearchText(product));
  if (!normalizedQuery || !haystack) return 0;

  const queryWords = normalizedQuery.split(/\s+/).filter((word) => word.length > 1);
  const exactPhraseBoost = haystack.includes(normalizedQuery) ? 10 : 0;
  const wordScore = queryWords.reduce((score, word) => {
    if (haystack.split(/\s+/).includes(word)) return score + 4;
    if (haystack.includes(word)) return score + 2;
    return score;
  }, 0);

  return exactPhraseBoost + wordScore;
}

function lexicalShortlist(query, products, limit) {
  return products
    .map((product) => ({
      product,
      score: lexicalScore(query, product),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function cosineSimilarity(a, b) {
  // Vectors are already unit-normalized at index time.
  let dot = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) dot += a[i] * b[i];
  return dot;
}

async function embedQuery(query) {
  const [vector] = await embedTexts([String(query || "").trim()]);
  if (!vector) {
    throw new Error("query embedding returned no vector");
  }
  return vector;
}

async function vectorRank(query, products, options) {
  const limit = Number(options.limit || 12);
  const candidatePool = Math.max(limit * 4, 40);
  const productsPath = options.productsPath;
  const { products: indexedProducts, vectors } = await buildProductIndex(products, { productsPath });
  const byId = new Map(indexedProducts.map((p) => [p.id, p]));
  const queryVector = await embedQuery(query);

  // Lexical shortlist to bound the cosine work; we still consider the long tail
  // by mixing in the top-K lexical matches with low vector scores.
  const lexical = lexicalShortlist(query, products, candidatePool);
  const lexicalIds = new Set(lexical.map(({ product }) => product.id));

  const lexicalVector = [];
  for (const { product, score } of lexical) {
    const idx = indexedProducts.findIndex((p) => p.id === product.id);
    if (idx === -1) continue;
    const similarity = cosineSimilarity(queryVector, vectors[idx]);
    lexicalVector.push({
      product: byId.get(product.id) || product,
      score: similarity * 100 + Math.min(score, 5) * 0.1,
      vectorScore: similarity,
      lexicalScore: score,
    });
  }

  lexicalVector.sort((a, b) => b.score - a.score);

  return {
    candidates: lexicalVector.slice(0, Math.max(limit * 2, 16)),
    queryVector,
    lexicalIds,
  };
}

async function rerankWithQwen(query, candidates) {
  const hfToken = process.env.HF_TOKEN || process.env.VITE_HF_TOKEN;
  if (!hfToken || candidates.length === 0) {
    return null;
  }

  const slice = candidates.slice(0, 24);
  const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${hfToken}`,
    },
    body: JSON.stringify({
      model: QWEN_MODEL,
      temperature: 0.1,
      max_tokens: 350,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a multilingual shopping search assistant for a Rwandan supermarket. " +
            "Given a buyer's natural-language request and a list of candidate products, " +
            "pick the products that best satisfy the request. Consider the full intent " +
            "(use case, audience, mood) — not just keywords. " +
            "Return strict JSON: {\"picks\": [{\"id\": <productId>, \"reason\": \"<short reason>\"}, ...]}. " +
            "Return at most 12 picks, ordered by relevance. If nothing matches, return {\"picks\": []}.",
        },
        {
          role: "user",
          content: JSON.stringify({
            query,
            candidates: slice.map(({ product }) => ({
              id: product.id,
              name: product.name,
              category: product.category,
              subcategory: product.subcategory,
              unit: product.unit,
              price: product.price,
              tags: product.tags,
            })),
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Qwen rerank failed: ${response.status}`);
  }
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) return null;
  const parsed = JSON.parse(text);
  if (!parsed || !Array.isArray(parsed.picks)) return null;

  return parsed.picks
    .map((pick) => {
      const match = slice.find(({ product }) => Number(product.id) === Number(pick.id));
      if (!match) return null;
      return {
        ...match.product,
        searchSource: "qwen",
        searchReason: String(pick.reason || "").slice(0, 140),
        vectorScore: match.vectorScore,
        lexicalScore: match.lexicalScore,
      };
    })
    .filter(Boolean);
}

export async function searchProducts(query, products, options = {}) {
  const limit = Number(options.limit || 12);
  const trimmedQuery = String(query || "").trim();
  const productsPath = options.productsPath;

  if (!trimmedQuery) {
    return { source: "empty", products: [] };
  }

  // 1. Vector rank with local MiniLM embeddings (or HF fallback).
  let vector;
  try {
    vector = await vectorRank(trimmedQuery, products, { limit, productsPath });
  } catch (err) {
    console.error("[search] vector rank failed, falling back to lexical:", err.message);
    return {
      source: "lexical",
      products: lexicalShortlist(trimmedQuery, products, limit).map(({ product, score }) => ({
        ...product,
        searchScore: score,
        searchSource: "lexical",
      })),
    };
  }

  const embeddingBackend = getEmbeddingBackend();
  const reranked = await rerankWithQwen(trimmedQuery, vector.candidates);

  if (reranked && reranked.length > 0) {
    return {
      source: "qwen",
      embeddingBackend,
      products: reranked.slice(0, limit),
    };
  }

  return {
    source: "vector",
    embeddingBackend,
    products: vector.candidates.slice(0, limit).map(({ product, vectorScore, lexicalScore: lexScore }) => ({
      ...product,
      searchScore: vectorScore,
      vectorScore,
      lexicalScore: lexScore,
      searchSource: "vector",
    })),
  };
}
