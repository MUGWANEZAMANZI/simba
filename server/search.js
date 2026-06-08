import { Document } from "@langchain/core/documents";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { Embeddings } from "@langchain/core/embeddings";

class XenovaEmbeddings extends Embeddings {
  constructor() {
    super({});
    this.extractorPromise = null;
  }

  async getExtractor() {
    if (!this.extractorPromise) {
      const { pipeline } = await import("@xenova/transformers");
      this.extractorPromise = pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    }
    return this.extractorPromise;
  }

  async embedDocuments(texts) {
    const extractor = await this.getExtractor();
    return Promise.all(texts.map((text) => this.embedQuery(text)));
  }

  async embedQuery(text) {
    const extractor = await this.getExtractor();
    const output = await extractor(text, { pooling: "mean", normalize: true });
    return Array.from(output.data);
  }
}

const embeddings = new XenovaEmbeddings();
let vectorStore = null;
let lastIndexedKey = "";

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

async function getVectorStore(products) {
  const cacheKey = products.map((p) => `${p.id}:${p.name}`).join("|");
  
  if (vectorStore && lastIndexedKey === cacheKey) {
    return vectorStore;
  }

  const documents = products.map((product) => {
    return new Document({
      pageContent: productSearchText(product),
      metadata: { ...product },
    });
  });

  try {
    // We recreate or connect to the Chroma collection
    // Note: In a production app, we'd check if the collection is already populated.
    // For this demo, we use a ephemeral-like or local connection.
    vectorStore = await Chroma.fromDocuments(documents, embeddings, {
      collectionName: "simba_products",
      url: process.env.CHROMA_URL || "http://localhost:8000",
    });
    lastIndexedKey = cacheKey;
    return vectorStore;
  } catch (error) {
    console.error("Failed to initialize Chroma vector store:", error.message);
    throw error;
  }
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
    const store = await getVectorStore(products);
    const results = await store.similaritySearch(trimmedQuery, limit);

    const productsWithScores = results.map((doc) => {
      const product = doc.metadata;
      const keywordBoost = lexicalScore(trimmedQuery, product) / 100;
      
      return {
        ...product,
        searchScore: 1 + keywordBoost, // similaritySearch doesn't always return a score in this LangChain version/config
        searchSource: "langchain-chroma",
      };
    });

    return {
      source: "ai",
      products: productsWithScores,
    };
  } catch (error) {
    console.error("LangChain search failed, using fallback:", error.message);
    return {
      source: "local",
      products: fallbackSearch(trimmedQuery, products, limit),
    };
  }
}
