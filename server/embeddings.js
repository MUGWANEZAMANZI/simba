// Local embedding pipeline for semantic product search.
// Strategy:
//   1. Try to use @xenova/transformers (MiniLM) in-process — no API quota, runs on CPU.
//   2. If the local model cannot load (sandbox / missing native deps), fall back to the
//      Hugging Face feature-extraction endpoint using HF_TOKEN.
// The module exposes a single `embedTexts(texts)` function returning Float32Array[].

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HF_MODEL = "Xenova/all-MiniLM-L6-v2";
const HF_INFERENCE_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const OLLAMA_MODEL = process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text";
const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const EMBEDDING_DIM = 384; // all-MiniLM-L6-v2; nomic-embed-text is 768.

async function embedViaOllama(texts) {
  const results = [];
  for (const text of texts) {
    const response = await fetch(`${OLLAMA_HOST}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt: text }),
    });
    if (!response.ok) {
      throw new Error(`Ollama embedding failed: ${response.status}`);
    }
    const { embedding } = await response.json();
    results.push(normalize(new Float32Array(embedding)));
  }
  return results;
}

async function getLocalPipeline() {
  if (localPipelinePromise) return localPipelinePromise;
  if (localDisabledReason) throw new Error(localDisabledReason);
  localPipelinePromise = (async () => {
    const { pipeline, env } = await import("@xenova/transformers");
    env.allowLocalModels = true;
    env.useBrowserCache = false;
    const cacheRoot = path.join(__dirname, ".cache", "xenova");
    fs.mkdirSync(cacheRoot, { recursive: true });
    env.cacheDir = cacheRoot;
    const extractor = await pipeline("feature-extraction", HF_MODEL, { quantized: true });
    return extractor;
  })();
  try {
    return await localPipelinePromise;
  } catch (err) {
    localPipelinePromise = null;
    localDisabledReason = `local embeddings disabled: ${err?.message || err}`;
    throw new Error(localDisabledReason);
  }
}

function meanPoolFromTensor(tensor) {
  // @xenova/transformers returns a Tensor shaped [tokens, hidden] when pooling="none".
  // We mean-pool across the token axis and normalize to unit length.
  const [tokens, hidden] = tensor.dims;
  const data = tensor.data;
  const out = new Float32Array(hidden);
  for (let t = 0; t < tokens; t += 1) {
    for (let h = 0; h < hidden; h += 1) {
      out[h] += data[t * hidden + h];
    }
  }
  for (let h = 0; h < hidden; h += 1) out[h] /= tokens;
  let norm = 0;
  for (let h = 0; h < hidden; h += 1) norm += out[h] * out[h];
  norm = Math.sqrt(norm) || 1;
  for (let h = 0; h < hidden; h += 1) out[h] /= norm;
  return out;
}

function normalize(vec) {
  let norm = 0;
  for (let i = 0; i < vec.length; i += 1) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  const out = new Float32Array(vec.length);
  for (let i = 0; i < vec.length; i += 1) out[i] = vec[i] / norm;
  return out;
}

async function embedLocally(texts) {
  const extractor = await getLocalPipeline();
  const results = [];
  for (const text of texts) {
    const tensor = await extractor(text, { pooling: "none", normalize: false });
    results.push(meanPoolFromTensor(tensor));
  }
  return results;
}

async function embedViaHF(texts) {
  const token = process.env.HF_TOKEN || process.env.VITE_HF_TOKEN;
  if (!token) {
    throw new Error("HF_TOKEN not set; cannot call remote embedding endpoint.");
  }
  const response = await fetch(
    `https://router.huggingface.co/hf-inference/models/${HF_INFERENCE_MODEL}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ inputs: texts, options: { wait_for_model: true } }),
    },
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`HF inference embedding failed: ${response.status} ${detail}`);
  }
  const payload = await response.json();
  // HF returns Array<Array<number>> when given a batch. We mean-pool + normalize.
  return payload.map((row) => {
    const dim = row.length;
    const mean = new Float32Array(dim);
    for (let i = 0; i < dim; i += 1) mean[i] = row[i];
    return normalize(mean);
  });
}

let backend = "pending";
let currentEmbeddingDim = EMBEDDING_DIM;
let localPipelinePromise = null;
let localDisabledReason = null;

async function detectBackend() {
  if (backend !== "pending") return backend;

  // 1. Try Ollama
  try {
    const probe = await embedViaOllama(["ping"]);
    if (probe?.length === 1) {
      backend = "ollama";
      currentEmbeddingDim = probe[0].length;
      console.log(`[search] embeddings: ollama ${OLLAMA_MODEL} ready (dim=${currentEmbeddingDim})`);
      return backend;
    }
  } catch (err) {
    console.log(`[search] ollama embeddings unavailable: ${err.message}`);
  }

  // 2. Try Local Transformers
  try {
    const probe = await embedLocally(["ping"]);
    if (probe?.length === 1 && probe[0]?.length === EMBEDDING_DIM) {
      backend = "local";
      currentEmbeddingDim = EMBEDDING_DIM;
      console.log(`[search] embeddings: local ${HF_MODEL} ready`);
      return backend;
    }
    throw new Error("local embedding produced unexpected shape");
  } catch (err) {
    console.warn(`[search] local embeddings unavailable (${err.message}); falling back to HF inference`);
    backend = "remote";
    currentEmbeddingDim = EMBEDDING_DIM;
    return backend;
  }
}

export async function embedTexts(texts) {
  if (!Array.isArray(texts) || texts.length === 0) return [];
  await detectBackend();
  try {
    if (backend === "ollama") {
      return await embedViaOllama(texts);
    }
    if (backend === "local") {
      return await embedLocally(texts);
    }
    return await embedViaHF(texts);
  } catch (err) {
    if (backend === "local" || backend === "ollama") {
      console.warn(`[search] ${backend} embedding failed, retrying via HF: ${err.message}`);
      backend = "remote";
      currentEmbeddingDim = EMBEDDING_DIM; // HF fallback usually 384 for this model
      return await embedViaHF(texts);
    }
    throw err;
  }
}

export function getEmbeddingBackend() {
  return backend;
}

export function getEmbeddingSize() {
  return currentEmbeddingDim;
}

export { detectBackend };
