import { useEffect, useMemo, useState } from "react";
import CartDrawer from "./components/CartDrawer";
import UserProfile from "./components/UserProfile";
import OrderTracker from "./components/OrderTracker";
import AdminPortal from "./components/AdminPortal";

const ADMIN_SECRET = "NobOdyLikesMe";

const STORAGE_KEYS = {
  cart: "simba-cart",
  theme: "simba-theme",
  language: "simba-language",
  customer: "simba-customer",
  loggedInPhone: "simba-logged-in-phone",
};

const categoryImages = {
  "Alcoholic Drinks":
    "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80",
  "Baby Products":
    "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=1200&q=80",
  "Cleaning & Sanitary":
    "https://images.unsplash.com/photo-1583947582886-f40ec95dd752?auto=format&fit=crop&w=1200&q=80",
  "Cosmetics & Personal Care":
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80",
  "Food Products":
    "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
  General:
    "https://images.unsplash.com/photo-1511556820780-d912e42b4980?auto=format&fit=crop&w=1200&q=80",
  "Kitchenware & Electronics":
    "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=80",
  "Sports & Wellness":
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
  "Kitchen Storage":
    "https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?auto=format&fit=crop&w=1200&q=80",
  "Pet Care":
    "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=1200&q=80",
  Stationery:
    "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80",
};

const productImageOverrides = [
  {
    test: /soap|hand ?wash|shower gel|liquid soap/i,
    image:
      "https://images.unsplash.com/photo-1725940889761-35d90aead72d?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=1200",
  },
  {
    test: /toilet paper|kitchen towel|paper towel|tissue/i,
    image:
      "https://images.unsplash.com/photo-1652450201521-b5e94bb35b89?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=1200",
  },
  {
    test: /notebook|paper a4|photocopying paper|copy paper|stationery|pen/i,
    image:
      "https://images.unsplash.com/photo-1683921070230-9f046e462e46?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=1200",
  },
  {
    test: /milk|lactogen/i,
    image:
      "https://images.unsplash.com/photo-1632200823229-376320621350?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=1200",
  },
  {
    test: /coffee/i,
    image:
      "https://images.unsplash.com/photo-1750378626882-b6598228d724?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=1200",
  },
  {
    test: /cleaner|bleach|detergent|spray|dishwashing|scouring/i,
    image:
      "https://images.unsplash.com/photo-1550963295-019d8a8a61c5?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=1200",
  },
  {
    test: /pan|kitchenware|cookware/i,
    image:
      "https://images.unsplash.com/photo-1656711781745-ba68661d06b7?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=1200",
  },
  {
    test: /wine|whisky|vodka|tequila|cognac|vermouth|campari|gin|beer/i,
    image:
      "https://images.unsplash.com/photo-1599113655968-b7d7b5cb889b?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=1200",
  },
];

const languages = {
  en: {
    locale: "en-RW",
    currency: "RWF",
    heroBadge: "Fresh picks across Kigali",
    heroTitle: "The faster, brighter way to shop Simba Supermarket.",
    heroText:
      "Browse 552 real products, organize your basket in seconds, and check out with a smooth mobile-first flow built for Rwanda.",
    searchPlaceholder: "Search milk, soap, juice, notebooks...",
    allCategories: "All categories",
    inStockOnly: "In stock only",
    cheapest: "Cheapest first",
    priciest: "Most expensive",
    nameAZ: "Name A-Z",
    cart: "Cart",
    items: "items",
    categories: "Categories",
    discover: "Discover products",
    featured: "Popular right now",
    quickAdd: "Quick add",
    added: "Added",
    viewDetails: "View details",
    unit: "Unit",
    per: "per",
    subtotal: "Subtotal",
    continueShopping: "Continue shopping",
    checkout: "Checkout",
    deliveryStep: "Delivery",
    paymentStep: "Payment",
    reviewStep: "Review",
    fullname: "Full name",
    phone: "Phone number",
    address: "Delivery address",
    district: "District",
    paymentMethod: "Payment method",
    momo: "Mobile Money",
    cash: "Cash on delivery",
    card: "Card on delivery",
    placeOrder: "Place order",
    emptyCart: "Your cart is empty.",
    backToShop: "Back to shop",
    orderReady: "Order confirmed",
    orderText:
      "This is a simulated checkout flow. Your basket is ready for demo submission.",
    darkMode: "Dark mode",
    lightMode: "Light mode",
    language: "Language",
    tagline: "Rwanda's online supermarket",
    detailBack: "Back to products",
    productInfo: "Product information",
    relatedProducts: "Related products",
    searchResults: "products found",
    categorySpotlight: "Category spotlight",
    deliveryPromise: "Same-day delivery in Kigali on eligible orders.",
    paymentHint: "MoMo flow is simulated for demo purposes.",
    speechSearch: "Speak search",
    speechListening: "Listening...",
    speechUnsupported: "Speech search is not supported in this browser.",
    locationPicker: "Tap the map to set your delivery position",
    deliveryMissing: "Enter your name, phone, address, and map location before checkout.",
    locationMissing: "Select your location on the map before placing the order.",
    orderSaving: "Saving order...",
    orderFailed: "Could not save the order.",
    chooseLocation: "Choose on map",
  },
  fr: {
    locale: "fr-FR",
    currency: "RWF",
    heroBadge: "Sélection fraîche à Kigali",
    heroTitle: "La nouvelle façon rapide et élégante d'acheter chez Simba.",
    heroText:
      "Parcourez 552 produits réels, organisez votre panier rapidement et validez avec un parcours mobile-first pensé pour le Rwanda.",
    searchPlaceholder: "Rechercher lait, savon, jus, cahiers...",
    allCategories: "Toutes les catégories",
    inStockOnly: "En stock seulement",
    cheapest: "Moins cher d'abord",
    priciest: "Plus cher d'abord",
    nameAZ: "Nom A-Z",
    cart: "Panier",
    items: "articles",
    categories: "Catégories",
    discover: "Découvrir les produits",
    featured: "Tendances du moment",
    quickAdd: "Ajouter",
    added: "Ajouté",
    viewDetails: "Voir le détail",
    unit: "Unité",
    per: "par",
    subtotal: "Sous-total",
    continueShopping: "Continuer",
    checkout: "Commander",
    deliveryStep: "Livraison",
    paymentStep: "Paiement",
    reviewStep: "Récapitulatif",
    fullname: "Nom complet",
    phone: "Numéro de téléphone",
    address: "Adresse de livraison",
    district: "District",
    paymentMethod: "Mode de paiement",
    momo: "Mobile Money",
    cash: "Paiement à la livraison",
    card: "Carte à la livraison",
    placeOrder: "Valider la commande",
    emptyCart: "Votre panier est vide.",
    backToShop: "Retour à la boutique",
    orderReady: "Commande confirmée",
    orderText:
      "Ceci est un parcours de paiement simulé. Votre panier est prêt pour la démo.",
    darkMode: "Mode sombre",
    lightMode: "Mode clair",
    language: "Langue",
    tagline: "Le supermarché en ligne du Rwanda",
    detailBack: "Retour aux produits",
    productInfo: "Informations produit",
    relatedProducts: "Produits similaires",
    searchResults: "produits trouvés",
    categorySpotlight: "Catégorie à l'honneur",
    deliveryPromise: "Livraison le jour même à Kigali selon éligibilité.",
    paymentHint: "Le flux MoMo est simulé pour la démo.",
    speechSearch: "Recherche vocale",
    speechListening: "Écoute...",
    speechUnsupported: "La recherche vocale n'est pas prise en charge par ce navigateur.",
    locationPicker: "Touchez la carte pour choisir votre position de livraison",
    deliveryMissing: "Saisissez votre nom, téléphone, adresse et position sur la carte avant de continuer.",
    locationMissing: "Choisissez votre position sur la carte avant de valider la commande.",
    orderSaving: "Enregistrement de la commande...",
    orderFailed: "Impossible d'enregistrer la commande.",
    chooseLocation: "Choisir sur la carte",
  },
  rw: {
    locale: "rw-RW",
    currency: "RWF",
    heroBadge: "Ibyatoranyijwe bishya i Kigali",
    heroTitle: "Guhaha muri Simba byihuse, bigezweho kandi byiza.",
    heroText:
      "Reba ibicuruzwa 552 by'ukuri, tegura igare ryawe vuba, unishyure ukoresheje uburyo bubereye telefone.",
    searchPlaceholder: "Shakisha amata, isabune, umutobe, amakayi...",
    allCategories: "Ibyiciro byose",
    inStockOnly: "Ibihari gusa",
    cheapest: "Ibitangirira hasi",
    priciest: "Ibitangirira hejuru",
    nameAZ: "A-Z",
    cart: "Igare",
    items: "ibicuruzwa",
    categories: "Ibyiciro",
    discover: "Reba ibicuruzwa",
    featured: "Bikunzwe ubu",
    quickAdd: "Shyira mu igare",
    added: "Byongewe",
    viewDetails: "Reba ibisobanuro",
    unit: "Igipimo",
    per: "kuri",
    subtotal: "Igiteranyo",
    continueShopping: "Komeza guhaha",
    checkout: "Komeza wishyure",
    deliveryStep: "Kohereza",
    paymentStep: "Kwishyura",
    reviewStep: "Gusuzuma",
    fullname: "Amazina yose",
    phone: "Nimero ya telefone",
    address: "Aderesi yo koherezaho",
    district: "Akarere",
    paymentMethod: "Uburyo bwo kwishyura",
    momo: "Mobile Money",
    cash: "Cash upon delivery",
    card: "Ikarita igihe cyo kwakira",
    placeOrder: "Ohereza commande",
    emptyCart: "Igare ryawe ririmo ubusa.",
    backToShop: "Subira guhaha",
    orderReady: "Commande yakiriwe",
    orderText:
      "Ubu ni uburyo bwo kwishyura bwa demo. Igare ryawe riteguye kwerekanwa.",
    darkMode: "Dark mode",
    lightMode: "Light mode",
    language: "Ururimi",
    tagline: "Supermarket yo kuri internet mu Rwanda",
    detailBack: "Subira ku bicuruzwa",
    productInfo: "Ibisobanuro by'igicuruzwa",
    relatedProducts: "Ibisa na cyo",
    searchResults: "ibicuruzwa byabonetse",
    categorySpotlight: "Icyiciro cyatoranyijwe",
    deliveryPromise: "Kohereza umunsi umwe i Kigali ku byujuje ibisabwa.",
    paymentHint: "Uburyo bwa MoMo ni demo.",
    speechSearch: "Shakisha uvuga",
    speechListening: "Ndakumva...",
    speechUnsupported: "Ubu buryo bwo gushakisha uvuga ntibukora muri iyi browser.",
    locationPicker: "Kanda ku ikarita ushyireho aho uherereye",
    deliveryMissing: "Andika izina, telefone, aderesi n'aho uherereye ku ikarita mbere yo gukomeza.",
    locationMissing: "Hitamo aho uherereye ku ikarita mbere yo kohereza commande.",
    orderSaving: "Ndabika commande...",
    orderFailed: "Ntibyakunze kubika commande.",
    chooseLocation: "Hitamo ku ikarita",
  },
};

const paymentMethods = ["momo", "cash", "card"];
const sortOptions = ["name", "price-asc", "price-desc"];
const HF_MODEL = import.meta.env.VITE_HF_MODEL || "CohereLabs/aya-expanse-8b";
const HF_TOKEN = import.meta.env.VITE_HF_TOKEN;
const DELIVERY_PROVIDERS = [
  { id: "vuba-vuba", name: "Vuba Vuba", baseFee: 700, perKmFee: 220 },
  { id: "tuma250", name: "Tuma250", baseFee: 500, perKmFee: 170 },
  { id: "simba-express", name: "Simba Express", baseFee: 300, perKmFee: 120 },
];

const BRANCH_COORDS = {
  Downtown: { lat: -1.9441, lng: 30.0619 },
  Kimironko: { lat: -1.9367, lng: 30.1105 },
  Gikondo: { lat: -1.9869, lng: 30.0784 },
};

const BRANCH_COORDS_BY_LOCATION = {
  "3336+MHV Union Trade Centre, 1 KN 4 Ave, Kigali": { lat: -1.9499, lng: 30.0588 },
  "KN 5 Rd, Kigali": { lat: -1.9512, lng: 30.0674 },
  "KG 541 St, Kigali": { lat: -1.9388, lng: 30.1014 },
  "24Q5+R2R, Kigali": { lat: -1.969, lng: 30.0487 },
  "24XF+XVV, KG 192 St, Kigali": { lat: -1.9367, lng: 30.1105 },
  "23H4+26V, Kigali": { lat: -1.9822, lng: 30.0498 },
  "24G3+MCV, Kigali": { lat: -1.9627, lng: 30.0778 },
  "KK 35 Ave, Kigali": { lat: -1.9706, lng: 30.1038 },
  "24J3+Q3, Kigali": { lat: -1.9553, lng: 30.0714 },
  "8754+P7W, Gisenyi": { lat: -1.7028, lng: 29.2568 },
};

const BRANCH_STORIES = {
  "3336+MHV Union Trade Centre, 1 KN 4 Ave, Kigali": {
    reviewer: "Richard Madete",
    quote: "Largest and best supermarket in Kigali city center and the country in general.",
  },
  "KN 5 Rd, Kigali": {
    reviewer: "Stella Matutina",
    quote: "First supermarket in Kigali where you can find almost everything, including cooked food.",
  },
  "KG 541 St, Kigali": {
    reviewer: "Dipankar Lahkar",
    quote: "Great location in Kigali to buy groceries and home items.",
  },
  "24Q5+R2R, Kigali": {
    reviewer: "MUHOZA Rene",
    quote: "Packed with nearly everything needed food-wise in Rwanda.",
  },
  "24XF+XVV, KG 192 St, Kigali": {
    reviewer: "Niyotwiringiye Charles",
    quote: "Kimironko branch known as a reliable supermarket stop.",
  },
  "23H4+26V, Kigali": {
    reviewer: "Cyuzuzo Ngenzi",
    quote: "Mixed experiences were reported, showing why consistency matters across branches.",
  },
  "24G3+MCV, Kigali": {
    reviewer: "SIBOMANA Eugene",
    quote: "Go-to supermarket branch for regular shopping in Kigali.",
  },
  "KK 35 Ave, Kigali": {
    reviewer: "Matylda B",
    quote: "International customers highlighted service expectations and treatment.",
  },
  "24J3+Q3, Kigali": {
    reviewer: "Bethany Mattison",
    quote: "Noted quality differences between branches.",
  },
  "8754+P7W, Gisenyi": {
    reviewer: "1 mutuyimana",
    quote: "Supermarket branch serving Gisenyi area.",
  },
};

const DISTRICT_COORDS = {
  Gasabo: { lat: -1.9237, lng: 30.0946 },
  Kicukiro: { lat: -1.9706, lng: 30.1038 },
  Nyarugenge: { lat: -1.9499, lng: 30.0588 },
  Musanze: { lat: -1.4996, lng: 29.6347 },
  Rubavu: { lat: -1.678, lng: 29.2589 },
};

const moodKeywordBoosts = {
  energy: ["coffee", "tea", "juice", "chocolate", "energy", "breakfast", "snack"],
  stress: ["tea", "chocolate", "juice", "bath", "soap", "freshener", "candle"],
  sick: ["tissue", "toilet", "soap", "water", "tea", "cleaner"],
  study: ["notebook", "paper", "pen", "stationery", "coffee", "juice"],
  workout: ["water", "sports", "fitness", "protein", "juice"],
  cleaning: ["cleaner", "bleach", "detergent", "soap", "tissue", "sanitary"],
  cooking: ["pan", "kitchen", "food", "sauce", "oil", "spice"],
  baby: ["baby", "milk", "soap", "care"],
  party: ["wine", "beer", "whisky", "vodka", "juice", "snack"],
};

const getQueryState = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    category: params.get("category") ?? "All",
    productId: Number(params.get("product")) || null,
  };
};

const formatCurrency = (value, locale, currency) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);

function resolveProductImage(product) {
  if (!/placehold\.co/i.test(product.image)) return product.image;
  const override = productImageOverrides.find((entry) => entry.test.test(product.name));
  if (override) return override.image;
  return categoryImages[product.category] || product.image;
}

function tokenize(value) {
  return value.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function haversineKm(pointA, pointB) {
  if (!pointA || !pointB) return 0;
  const toRadians = (degree) => (degree * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(pointB.lat - pointA.lat);
  const dLng = toRadians(pointB.lng - pointA.lng);
  const lat1 = toRadians(pointA.lat);
  const lat2 = toRadians(pointB.lat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function estimateDeliveryDistanceKm(form, selectedBranch) {
  const branchPoint =
    BRANCH_COORDS_BY_LOCATION[selectedBranch?.location] ||
    BRANCH_COORDS[selectedBranch?.name] ||
    BRANCH_COORDS.Downtown;
  const customerPoint = form.location || DISTRICT_COORDS[form.district] || DISTRICT_COORDS.Gasabo;
  const distance = haversineKm(branchPoint, customerPoint);
  return Math.max(1, Math.round(distance * 10) / 10);
}

function inferMoodBuckets(feeling) {
  const text = feeling.toLowerCase();
  const buckets = [];

  if (/(tired|sleepy|exhausted|low energy|drained)/.test(text)) buckets.push("energy");
  if (/(stress|stressed|anxious|sad|down|overwhelmed)/.test(text)) buckets.push("stress");
  if (/(sick|cold|flu|headache|unwell)/.test(text)) buckets.push("sick");
  if (/(study|studying|exam|school|office|work)/.test(text)) buckets.push("study");
  if (/(gym|workout|training|fitness|exercise)/.test(text)) buckets.push("workout");
  if (/(clean|dirty|laundry|sanitize|sanitary)/.test(text)) buckets.push("cleaning");
  if (/(cook|cooking|kitchen|dinner|lunch|breakfast)/.test(text)) buckets.push("cooking");
  if (/(baby|newborn|toddler|infant)/.test(text)) buckets.push("baby");
  if (/(party|celebrate|guests|weekend|hosting)/.test(text)) buckets.push("party");

  return buckets;
}

function scoreProductForFeeling(product, feeling) {
  const feelingTokens = tokenize(feeling);
  const haystack = `${product.name} ${product.category} ${product.unit}`.toLowerCase();
  const haystackTokens = new Set(tokenize(haystack));
  let score = product.inStock ? 4 : -10;

  for (const token of feelingTokens) {
    if (haystack.includes(token)) score += 5;
    if (haystackTokens.has(token)) score += 8;
  }

  for (const bucket of inferMoodBuckets(feeling)) {
    for (const keyword of moodKeywordBoosts[bucket] || []) {
      if (haystack.includes(keyword)) score += 6;
    }
  }

  if (/alcoholic drinks/i.test(product.category) && !/(party|celebrate|wine|beer|drink|hosting)/i.test(feeling)) {
    score -= 5;
  }

  if (/baby/i.test(product.category) && !/baby|newborn|toddler|infant/i.test(feeling)) {
    score -= 4;
  }

  return score;
}

function buildLocalCandidates(feeling, products, limit = 24) {
  return [...products]
    .map((product) => ({
      ...product,
      recommendationScore: scoreProductForFeeling(product, feeling),
    }))
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, limit);
}

function buildFallbackRecommendations(feeling, products, limit = 6) {
  return buildLocalCandidates(feeling, products, limit).map((product, index) => ({
    id: product.id,
    reason:
      index === 0
        ? `Strong match for "${feeling}" based on category and product keywords.`
        : `Relevant option for "${feeling}" with good availability and category fit.`,
  }));
}

async function fetchAyaRecommendations(feeling, candidates) {
  const fallback = buildFallbackRecommendations(feeling, candidates);
  if (!HF_TOKEN) {
    return {
      source: "fallback",
      picks: fallback,
      note: "Set VITE_HF_TOKEN to enable Gasuku recommendations from Hugging Face.",
    };
  }

  const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${HF_TOKEN}`,
    },
    body: JSON.stringify({
      model: HF_MODEL,
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a supermarket shopping assistant. Use only the provided candidate products. Return strict JSON with keys source, intro, picks. Picks must be an array of up to 6 objects with id and reason.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Recommend products for how the shopper feels.",
            shopper_feeling: feeling,
            candidate_products: candidates.map((product) => ({
              id: product.id,
              name: product.name,
              category: product.category,
              price: product.price,
              inStock: product.inStock,
              unit: product.unit,
            })),
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Gasuku request failed with status ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  const parsed = JSON.parse(text);
  return {
    source: parsed.source || "aya",
    intro: parsed.intro || "",
    picks: Array.isArray(parsed.picks) ? parsed.picks : fallback,
  };
}

function usePersistentState(key, initialValue) {
  const [state, setState] = useState(() => {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState];
}

function App() {
  const initialQuery = getQueryState();
  const [language, setLanguage] = usePersistentState(STORAGE_KEYS.language, "en");
  const [theme, setTheme] = usePersistentState(STORAGE_KEYS.theme, "light");
  const [cart, setCart] = usePersistentState(STORAGE_KEYS.cart, {});
  const [category, setCategory] = useState(initialQuery.category);
  const [search, setSearch] = useState("");
  const [stockOnly, setStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState("name");
  const [selectedProductId, setSelectedProductId] = useState(initialQuery.productId);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechListening, setSpeechListening] = useState(false);
  const [feeling, setFeeling] = useState("");
  const [recommendationIds, setRecommendationIds] = useState([]);
  const [recommendationIntro, setRecommendationIntro] = useState("");
  const [recommendationSource, setRecommendationSource] = useState("");
  const [recommendationError, setRecommendationError] = useState("");
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(0);
  const [checkoutComplete, setCheckoutComplete] = useState(false);
  const [form, setForm] = usePersistentState(STORAGE_KEYS.customer, {
    fullname: "",
    phone: "",
    address: "",
    district: "Gasabo",
    paymentMethod: "momo",
    deliveryProvider: "simba-express",
    location: null,
  });
  const [orderStatus, setOrderStatus] = useState("idle");

  // New States
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = usePersistentState("simba-selected-branch", null);
  const [view, setView] = useState("home"); // home, profile, admin, tracking
  const [activeOrder, setActiveOrder] = useState(null);
  const [loggedInPhone, setLoggedInPhone] = usePersistentState(STORAGE_KEYS.loggedInPhone, null);
  const [adminName, setAdminName] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminAuthorized, setAdminAuthorized] = useState(false);
  const [adminDisplayName, setAdminDisplayName] = useState("");

  useEffect(() => {
    fetch("/api/branches")
      .then(res => res.json())
      .then(data => setBranches(data || []))
      .catch(err => console.error("Failed to load branches:", err));
  }, []);

  useEffect(() => {
    if (!selectedBranch && view === "home") {
      setProductsLoading(false);
      return;
    }

    setProductsLoading(true);
    const branchQuery = selectedBranch ? `branchId=${selectedBranch.id}` : "";
    const url = `/api/products?${branchQuery}&page=${currentPage}&limit=25`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setProducts(data.products || []);
        setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
        setProductsLoading(false);
      })
      .catch(err => {
        console.error("Failed to load products:", err);
        setProductsLoading(false);
      });
  }, [selectedBranch, view, currentPage]);

  const normalizeProducts = useMemo(() => {
    return products.map((product) => ({
      ...product,
      slug: `${product.id}-${product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    }));
  }, [products]);

  const t = languages[language];
  const categories = useMemo(
    () => ["All", ...new Set(normalizeProducts.map((product) => product.category))],
    [normalizeProducts],
  );


  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition || null;
    setSpeechSupported(Boolean(SpeechRecognition));
  }, []);

  useEffect(() => {
    const syncFromUrl = () => {
      const next = getQueryState();
      if (categories.includes(next.category)) {
        setCategory(next.category);
      }
      setSelectedProductId(next.productId);
    };

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, [categories]);

  const selectedProduct = useMemo(() => {
    return normalizeProducts.find((product) => product.id === selectedProductId) ?? null;
  }, [selectedProductId]);

  const filteredProducts = useMemo(() => {
    const value = search.trim().toLowerCase();

    // Create a regex from the search words (min length 3)
    // Speech transcripts often have filler words, so we split and match any significant word
    const words = value.split(/\s+/).filter((w) => w.length >= 3);
    const pattern = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    const searchRegex = words.length > 0 ? new RegExp(pattern, "i") : null;

    const results = normalizeProducts
      .filter((product) => (category === "All" ? true : product.category === category))
      .filter((product) => (stockOnly ? product.inStock : true))
      .filter((product) => {
        if (!value) return true;
        const haystack = [product.name, product.category, product.unit]
          .join(" ")
          .toLowerCase();

        // If we have enough words for a regex, match any of them
        if (searchRegex) return searchRegex.test(haystack);
        // Fallback to simple includes for very short queries
        return haystack.includes(value);
      })
      .sort((a, b) => {
        // If searching, prioritize by number of word matches (relevance)
        if (value && words.length > 0) {
          const getScore = (product) => {
            const haystack = [product.name, product.category, product.unit]
              .join(" ")
              .toLowerCase();
            const score = words.reduce(
              (acc, word) => acc + (haystack.includes(word) ? 1 : 0),
              0,
            );
            if (haystack.includes(value)) return score + 5; // Bonus for exact phrase
            return score;
          };

          const scoreA = getScore(a);
          const scoreB = getScore(b);

          if (scoreB !== scoreA) return scoreB - scoreA;
        }

        // Standard tie-breakers
        if (sortBy === "price-asc") return a.price - b.price;
        if (sortBy === "price-desc") return b.price - a.price;
        return a.name.localeCompare(b.name);
      });

    return results;
  }, [category, search, sortBy, stockOnly]);

  const featuredCategories = useMemo(
    () =>
      categories
        .filter((item) => item !== "All")
        .map((item) => ({
          name: item,
          image: categoryImages[item],
          count: normalizeProducts.filter((product) => product.category === item).length,
        })),
    [categories],
  );

  const relatedProducts = useMemo(() => {
    if (!selectedProduct) return [];
    return normalizeProducts
      .filter(
        (product) =>
          product.category === selectedProduct.category && product.id !== selectedProduct.id,
      )
      .slice(0, 4);
  }, [selectedProduct]);

  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, quantity]) => {
          const product = normalizeProducts.find((item) => item.id === Number(id));
          return product ? { ...product, quantity } : null;
        })
        .filter(Boolean),
    [cart],
  );

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const deliveryDistanceKm = useMemo(
    () => estimateDeliveryDistanceKm(form, selectedBranch),
    [form.district, form.location, selectedBranch],
  );
  const deliveryOptions = DELIVERY_PROVIDERS.map((provider) => ({
    ...provider,
    fee: Math.round(provider.baseFee + provider.perKmFee * deliveryDistanceKm),
  }));
  const selectedDelivery =
    deliveryOptions.find((option) => option.id === form.deliveryProvider) || deliveryOptions[0];
  const grandTotal = subtotal + (selectedDelivery?.fee || 0);
  const recommendationProducts = recommendationIds
    .map((pick) => {
      const product = normalizeProducts.find((item) => item.id === pick.id);
      return product ? { ...product, recommendationReason: pick.reason } : null;
    })
    .filter(Boolean);

  function updateQuery(nextParams) {
    const params = new URLSearchParams(window.location.search);
    Object.entries(nextParams).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    const next = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, "", next);
    const queryState = getQueryState();
    if (categories.includes(queryState.category)) {
      setCategory(queryState.category);
    }
    setSelectedProductId(queryState.productId);
  }

  function addToCart(productId) {
    setCart((current) => ({
      ...current,
      [productId]: (current[productId] ?? 0) + 1,
    }));
    setCartOpen(true);
  }

  function updateQuantity(productId, nextQuantity) {
    setCart((current) => {
      if (nextQuantity <= 0) {
        const clone = { ...current };
        delete clone[productId];
        return clone;
      }
      return { ...current, [productId]: nextQuantity };
    });
  }

  function openProduct(product) {
    setSelectedProductId(product.id);
    updateQuery({ product: product.id, category: product.category });
  }

  function selectCategory(nextCategory) {
    setCategory(nextCategory);
    setSelectedProductId(null);
    setSearch("");
    setCurrentPage(1);
    updateQuery({
      category: nextCategory === "All" ? null : nextCategory,
      product: null,
    });
    window.setTimeout(() => {
      document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function closeProduct() {
    setSelectedProductId(null);
    updateQuery({ product: null });
  }

  function canAdvanceFromDelivery() {
    return Boolean(
      form.fullname.trim() &&
      form.phone.trim() &&
      form.address.trim() &&
      form.deliveryProvider,
    );
  }

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash === "admin") setView("admin");
      else if (hash === "profile") setView("profile");
      else if (hash.startsWith("track-")) {
        const orderId = hash.split("-")[1];
        fetch(`/api/admin/orders`) // Simplification: fetch all and find or add a specific endpoint
          .then(res => res.json())
          .then(orders => {
            const found = orders.find(o => o.id === Number(orderId));
            if (found) {
              setActiveOrder(found);
              setView("tracking");
            }
          });
      }
      else setView("home");
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  async function submitOrder() {
    setOrderStatus("saving");
    setRecommendationError("");

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          branchId: selectedBranch?.id,
          customer: form,
          subtotal,
          deliveryFee: selectedDelivery?.fee || 0,
          total: grandTotal,
          items: cartItems.map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Order API failed with status ${response.status}`);
      }

      const order = await response.json();
      setCheckoutComplete(true);
      setCart({});
      setOrderStatus("idle");
      setLoggedInPhone(form.phone);
      setActiveOrder(order);
      window.location.hash = `track-${order.id}`;
    } catch (error) {
      setOrderStatus("error");
      setRecommendationError(error.message || t.orderFailed);
    }
  }

  async function handleRecommend() {
    const value = feeling.trim();
    if (!value) {
      setRecommendationError("Describe how you feel first.");
      return;
    }

    setRecommendationLoading(true);
    setRecommendationError("");

    try {
      const candidates = buildLocalCandidates(value, normalizeProducts);
      const result = await fetchAyaRecommendations(value, candidates);
      setRecommendationIds(result.picks || []);
      setRecommendationIntro(result.intro || "");
      setRecommendationSource(result.source || "");
    } catch (error) {
      const fallback = buildFallbackRecommendations(value, normalizeProducts);
      setRecommendationIds(fallback);
      setRecommendationIntro("Gasuku was unavailable, so local inventory matching was used instead.");
      setRecommendationSource("fallback");
      setRecommendationError(error.message);
    } finally {
      setRecommendationLoading(false);
    }
  }

  function handleSpeechSearch() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition || null;

    if (!SpeechRecognition) {
      setRecommendationError(t.speechUnsupported);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang =
      language === "fr" ? "fr-FR" : language === "rw" ? "rw-RW" : "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setSpeechListening(true);
      setRecommendationError("");
    };

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim() || "";
      if (transcript) {
        setSearch(transcript);
        setCategory("All");
        document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth" });
      }
    };

    recognition.onerror = () => {
      setRecommendationError(t.speechUnsupported);
    };

    recognition.onend = () => {
      setSpeechListening(false);
    };

    recognition.start();
  }

  async function handleAdminLogin(event) {
    event.preventDefault();
    const name = adminName.trim();

    if (!name) {
      setAdminError("Enter branch name to continue.");
      return;
    }

    try {
      const response = await fetch("/api/branch-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, secret: adminCode })
      });

      if (!response.ok) {
        throw new Error("Invalid branch name or secret.");
      }

      const branch = await response.json();
      setAdminAuthorized(true);
      setAdminDisplayName(branch.name);
      setAdminCode("");
      setAdminError("");
      // Store branch info in admin state
      localStorage.setItem("simba-admin-branch", JSON.stringify(branch));
    } catch (err) {
      setAdminError(err.message);
    }
  }

  function handleAdminLogout() {
    setAdminAuthorized(false);
    setAdminDisplayName("");
    setAdminCode("");
    setAdminError("");
    window.location.hash = "";
  }

  const heroCategory =
    category === "All" ? featuredCategories[0] : featuredCategories.find((item) => item.name === category);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow" style={{ cursor: 'pointer' }} onClick={() => window.location.hash = ''}>Simba Supermarket</p>
          <h1 style={{ cursor: 'pointer' }} onClick={() => window.location.hash = ''}>
            {t.tagline} {selectedBranch ? ` - ${selectedBranch.name}` : ""}
          </h1>
        </div>
        <div className="topbar-actions">
          {selectedBranch && (
            <button className="ghost-button" onClick={() => setSelectedBranch(null)}>Change Branch</button>
          )}
          <button className="ghost-button" onClick={() => window.location.hash = 'admin'}>Admin</button>
          {loggedInPhone && (
            <button className="ghost-button" onClick={() => window.location.hash = 'profile'}>Profile</button>
          )}
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            aria-label={t.language}
          >
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="rw">Kinyarwanda</option>
          </select>
          <button
            className="ghost-button"
            onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
          >
            {theme === "light" ? t.darkMode : t.lightMode}
          </button>
          <button className="cart-button" onClick={() => setCartOpen(true)}>
            {t.cart} ({cartCount})
          </button>
        </div>
      </header>

      <main className="page">
        {(productsLoading && selectedBranch) ? (
          <div className="card" style={{ textAlign: "center", padding: "4rem" }}>
            <h2>Loading inventory...</h2>
          </div>
        ) : (
          <>
            {view === "admin" && (
              adminAuthorized ? (
                <AdminPortal
                  onBack={() => window.location.hash = ""}
                  onLogout={handleAdminLogout}
                  adminName={adminDisplayName}
                  branchId={JSON.parse(localStorage.getItem("simba-admin-branch"))?.id}
                  t={t}
                  formatCurrency={formatCurrency}
                />
              ) : (
                <section className="admin-auth card">
                  <h2>Branch Management</h2>
                  <p>Enter branch name and secret code (e.g., Downtown / Downtown2026)</p>
                  <form className="admin-auth-form" onSubmit={handleAdminLogin}>
                    <input
                      type="text"
                      placeholder="Your name"
                      value={adminName}
                      onChange={(event) => setAdminName(event.target.value)}
                      required
                    />
                    <input
                      type="password"
                      placeholder="Secret code"
                      value={adminCode}
                      onChange={(event) => setAdminCode(event.target.value)}
                      required
                    />
                    {adminError ? <p className="admin-auth-error">{adminError}</p> : null}
                    <div className="admin-auth-actions">
                      <button type="submit">Open Admin Portal</button>
                      <button type="button" className="ghost-button" onClick={() => window.location.hash = ""}>
                        Back to Shop
                      </button>
                    </div>
                  </form>
                </section>
              )
            )}

            {view === "profile" && (
              <UserProfile
                phone={loggedInPhone}
                onLogout={() => {
                  setLoggedInPhone(null);
                  window.location.hash = "";
                }}
                t={t}
                formatCurrency={formatCurrency}
              />
            )}

            {view === "tracking" && activeOrder && (
              <OrderTracker
                order={activeOrder}
                onBack={() => window.location.hash = "profile"}
              />
            )}

            {view === "home" && (
              !selectedBranch ? (
                <section className="branch-selection card">
                  <div className="section-heading">
                    <h3>Simba Branches Across Rwanda</h3>
                    <p>Select one of the 10 known locations to view available inventory and delivery estimates.</p>
                  </div>
                  <div className="branch-grid">
                    {branches.map(branch => (
                      <button
                        key={branch.id}
                        className="branch-card"
                        onClick={() => setSelectedBranch(branch)}
                      >
                        <strong>{branch.name}</strong>
                        <span>{branch.location}</span>
                        {BRANCH_STORIES[branch.location] ? (
                          <>
                            <p className="branch-review">"{BRANCH_STORIES[branch.location].quote}"</p>
                            <small className="branch-reviewer">{BRANCH_STORIES[branch.location].reviewer}</small>
                          </>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </section>
              ) : (
                <>
                  <section className="hero">
                    <div className="hero-copy">
                      <span className="pill">{t.heroBadge}</span>
                      <h2>{t.heroTitle}</h2>
                      <p>{t.heroText}</p>
                      <div className="hero-search">
                        <input
                          value={search}
                          onChange={(event) => {
                            setSearch(event.target.value);
                            setCurrentPage(1);
                          }}
                          placeholder={t.searchPlaceholder}
                        />
                        <div className="hero-search-actions">
                          <button onClick={() => document.getElementById("catalogue")?.scrollIntoView()}>
                            {t.discover}
                          </button>
                          <button
                            className="secondary-button"
                            onClick={handleSpeechSearch}
                            disabled={!speechSupported || speechListening}
                          >
                            {speechListening ? t.speechListening : t.speechSearch}
                          </button>
                        </div>
                      </div>
                      <p className="hero-meta">{t.deliveryPromise}</p>
                    </div>
                    <div
                      className="hero-card"
                      style={{ backgroundImage: `linear-gradient(180deg, transparent, rgba(12,16,28,0.82)), url(${heroCategory?.image})` }}
                    >
                      <span>{t.categorySpotlight}</span>
                      <strong>{heroCategory?.name}</strong>
                      <small>
                        {heroCategory?.count} {t.items}
                      </small>
                    </div>
                  </section>

                  <section className="recommendation-panel recommendation-panel-feature">
                    <div className="section-heading">
                      <div>
                        <span className="recommendation-kicker">Gasuku picks</span>
                        <h3>Feel-based recommendations</h3>
                      </div>
                      <p>
                        Describe your mood or need and Gasuku will rank real products from the dataset.
                      </p>
                    </div>
                    <div className="recommendation-controls recommendation-controls-feature">
                      <input
                        value={feeling}
                        onChange={(event) => setFeeling(event.target.value)}
                        placeholder="I feel tired and need a quick study boost"
                      />
                      <button onClick={handleRecommend} disabled={recommendationLoading}>
                        {recommendationLoading ? "Thinking..." : "Get recommendations"}
                      </button>
                    </div>
                    {recommendationIntro ? <p className="hero-meta">{recommendationIntro}</p> : null}
                    {recommendationSource ? (
                      <p className="hero-meta">
                        Source: {recommendationSource === "fallback" ? "Local fallback" : `Gasuku via ${HF_MODEL}`}
                      </p>
                    ) : null}
                    {recommendationError ? <p className="error-text">{recommendationError}</p> : null}
                    {recommendationProducts.length > 0 ? (
                      <div className="recommendation-grid">
                        {recommendationProducts.map((product) => (
                          <article className="mini-card recommendation-card" key={product.id}>
                            <img src={resolveProductImage(product)} alt={product.name} />
                            <div className="mini-card-body">
                              <p className="product-category">{product.category}</p>
                              <button onClick={() => openProduct(product)}>{product.name}</button>
                              <span>{formatCurrency(product.price, t.locale, t.currency)}</span>
                              <p className="recommendation-reason">{product.recommendationReason}</p>
                              <div className="recommendation-actions">
                                <button className="secondary-button" onClick={() => openProduct(product)}>
                                  {t.viewDetails}
                                </button>
                                <button onClick={() => addToCart(product.id)}>{t.quickAdd}</button>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : null}
                  </section>

                  <section className="categories-panel">
                    <div className="section-heading">
                      <h3>{t.categories}</h3>
                      <p>
                        {filteredProducts.length} {t.searchResults}
                      </p>
                    </div>
                    <div className="category-strip">
                      {featuredCategories.map((item) => (
                        <button
                          key={item.name}
                          className={item.name === category ? "category-card active" : "category-card"}
                          onClick={() => selectCategory(item.name)}
                          style={{ backgroundImage: `linear-gradient(180deg, rgba(10,17,28,0.15), rgba(10,17,28,0.78)), url(${item.image})` }}
                        >
                          <span>{item.count}</span>
                          <strong>{item.name}</strong>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="controls" id="catalogue">
                    <div className="section-heading">
                      <h3>{t.discover}</h3>
                      <p>{t.featured}</p>
                    </div>
                    <div className="filters">
                      <select
                        value={category}
                        onChange={(event) => selectCategory(event.target.value)}
                      >
                        <option value="All">{t.allCategories}</option>
                        {categories
                          .filter((item) => item !== "All")
                          .map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                      </select>
                      <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                        {sortOptions.map((option) => (
                          <option key={option} value={option}>
                            {option === "name"
                              ? t.nameAZ
                              : option === "price-asc"
                                ? t.cheapest
                                : t.priciest}
                          </option>
                        ))}
                      </select>
                      <label className="toggle">
                        <input
                          type="checkbox"
                          checked={stockOnly}
                          onChange={(event) => setStockOnly(event.target.checked)}
                        />
                        {t.inStockOnly}
                      </label>
                      <button
                        className="ghost-button"
                        onClick={() => {
                          setCategory("All");
                          setSearch("");
                          setStockOnly(false);
                          setSortBy("name");
                          updateQuery({ category: null, product: null });
                        }}
                      >
                        Reset
                      </button>
                    </div>
                  </section>

                  {!selectedProduct ? (
                    <>
                      <section className="product-grid">
                        {filteredProducts.map((product) => (
                          <article className="product-card" key={product.id}>
                            <button className="product-image" onClick={() => openProduct(product)}>
                              <img src={resolveProductImage(product)} alt={product.name} loading="lazy" />
                            </button>
                            <div className="product-body">
                              <p className="product-category">{product.category}</p>
                              <button className="product-name" onClick={() => openProduct(product)}>
                                {product.name}
                              </button>
                              <div className="product-meta">
                                <span>{formatCurrency(product.price, t.locale, t.currency)}</span>
                                <small>
                                  {product.quantity} {product.unit} available
                                </small>
                              </div>
                            </div>
                            <div className="product-actions">
                              <button className="secondary-button" onClick={() => openProduct(product)}>
                                {t.viewDetails}
                              </button>
                              <button onClick={() => addToCart(product.id)}>{t.quickAdd}</button>
                            </div>
                          </article>
                        ))}
                      </section>
                      {pagination.totalPages > 1 && (
                        <div className="pagination-controls">
                          <button
                            disabled={currentPage === 1}
                            onClick={() => {
                              setCurrentPage(p => Math.max(1, p - 1));
                              window.scrollTo({ top: document.getElementById('catalogue').offsetTop, behavior: 'smooth' });
                            }}
                          >
                            Previous
                          </button>
                          <span>Page {currentPage} of {pagination.totalPages}</span>
                          <button
                            disabled={currentPage === pagination.totalPages}
                            onClick={() => {
                              setCurrentPage(p => Math.min(pagination.totalPages, p + 1));
                              window.scrollTo({ top: document.getElementById('catalogue').offsetTop, behavior: 'smooth' });
                            }}
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <section className="detail-layout">
                      <button className="back-link" onClick={closeProduct}>
                        {t.detailBack}
                      </button>
                      <div className="detail-card">
                        <div className="detail-image-wrap">
                          <img src={resolveProductImage(selectedProduct)} alt={selectedProduct.name} />
                        </div>
                        <div className="detail-copy">
                          <p className="product-category">{selectedProduct.category}</p>
                          <h3>{selectedProduct.name}</h3>
                          <strong>
                            {formatCurrency(selectedProduct.price, t.locale, t.currency)}
                          </strong>
                          <p>{t.paymentHint}</p>
                          {/placehold\.co/i.test(selectedProduct.image) ? (
                            <p className="hero-meta">Using a curated Unsplash fallback matched to the product title.</p>
                          ) : null}
                          <dl className="detail-specs">
                            <div>
                              <dt>Quantity</dt>
                              <dd>{selectedProduct.quantity} {selectedProduct.unit}</dd>
                            </div>
                            <div>
                              <dt>Branch</dt>
                              <dd>{selectedBranch.name}</dd>
                            </div>
                            <div>
                              <dt>Status</dt>
                              <dd>{selectedProduct.inStock ? "In stock" : "Unavailable"}</dd>
                            </div>
                            <div>
                              <dt>ID</dt>
                              <dd>#{selectedProduct.id}</dd>
                            </div>
                          </dl>
                          <div className="detail-actions">
                            <button onClick={() => addToCart(selectedProduct.id)}>{t.quickAdd}</button>
                            <button className="secondary-button" onClick={() => setCartOpen(true)}>
                              {t.cart}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="related-section">
                        <div className="section-heading">
                          <h3>{t.relatedProducts}</h3>
                          <p>{t.productInfo}</p>
                        </div>
                        <div className="related-grid">
                          {relatedProducts.map((product) => (
                            <article className="mini-card" key={product.id}>
                              <img src={resolveProductImage(product)} alt={product.name} />
                              <button onClick={() => openProduct(product)}>{product.name}</button>
                              <span>{formatCurrency(product.price, t.locale, t.currency)}</span>
                            </article>
                          ))}
                        </div>
                      </div>
                    </section>
                  )}
                </>
              )
            )}
          </>
        )}
      </main>

      <CartDrawer
        cartOpen={cartOpen}
        setCartOpen={setCartOpen}
        t={t}
        cartCount={cartCount}
        cartItems={cartItems}
        checkoutComplete={checkoutComplete}
        setCheckoutComplete={setCheckoutComplete}
        setCheckoutStep={setCheckoutStep}
        checkoutStep={checkoutStep}
        form={form}
        setForm={setForm}
        updateQuantity={updateQuantity}
        formatCurrency={formatCurrency}
        subtotal={subtotal}
        selectedDelivery={selectedDelivery}
        grandTotal={grandTotal}
        canAdvanceFromDelivery={canAdvanceFromDelivery}
        setRecommendationError={setRecommendationError}
        orderStatus={orderStatus}
        submitOrder={submitOrder}
        resolveProductImage={resolveProductImage}
        deliveryOptions={deliveryOptions}
        deliveryDistanceKm={deliveryDistanceKm}
      />
      {cartOpen && <div className="overlay" onClick={() => setCartOpen(false)} />}
    </div>
  );
}

export default App;
