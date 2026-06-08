let extractorPromise = null;
let vectorCache = {
  key: "",
  products: [],
};

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
    product.unit,
    product.subcategory,
    product.brand,
    Array.isArray(product.tags) ? product.tags.join(" ") : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i += 1) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (!normA || !normB) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
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

function fallbackSearch(query, products, limit) {
  return products
    .map((product) => ({
      ...product,
      searchScore: lexicalScore(query, product),
      searchSource: "local",
    }))
    .filter((product) => product.searchScore > 0)
    .sort((a, b) => b.searchScore - a.searchScore || a.name.localeCompare(b.name))
    .slice(0, limit);
}

async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = import("@xenova/transformers").then(({ pipeline }) =>
      pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2"),
    );
  }

  return extractorPromise;
}

async function embedText(extractor, text) {
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

async function buildVectorIndex(products) {
  const cacheKey = products.map((product) => `${product.id}:${product.name}`).join("|");
  if (vectorCache.key === cacheKey) return vectorCache.products;

  const extractor = await getExtractor();
  const indexedProducts = await Promise.all(
    products.map(async (product) => ({
      ...product,
      vector: await embedText(extractor, productSearchText(product)),
    })),
  );

  vectorCache = {
    key: cacheKey,
    products: indexedProducts,
  };

  return indexedProducts;
}

export async function searchProducts(query, products, options = {}) {
  const limit = Number(options.limit || 12);
  const trimmedQuery = String(query || "").trim();

  if (!trimmedQuery) {
    return {
      source: "empty",
      products: [],
    };
  }

  try {
    const extractor = await getExtractor();
    const queryVector = await embedText(extractor, trimmedQuery);
    const indexedProducts = await buildVectorIndex(products);

    const results = indexedProducts
      .map((product) => {
        const semanticScore = cosineSimilarity(queryVector, product.vector);
        const keywordBoost = lexicalScore(trimmedQuery, product) / 100;
        const { vector, ...publicProduct } = product;

        return {
          ...publicProduct,
          searchScore: semanticScore + keywordBoost,
          searchSource: "ai",
        };
      })
      .sort((a, b) => b.searchScore - a.searchScore || a.name.localeCompare(b.name))
      .slice(0, limit);

    return {
      source: "ai",
      products: results,
    };
  } catch (error) {
    console.error("AI search unavailable, using local search:", error.message);
    return {
      source: "local",
      products: fallbackSearch(trimmedQuery, products, limit),
    };
  }
}
