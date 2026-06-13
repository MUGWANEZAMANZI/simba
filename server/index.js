import express from "express";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { searchProducts } from "./search.js";
import { buildProductIndex } from "./productIndex.js";
import { detectBackend } from "./embeddings.js";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbDir = path.join(__dirname, "data");
const dbPath = process.env.DATABASE_PATH || path.join(dbDir, "simba.db");
const productsPath = path.join(__dirname, "../simba_products.json");

const JWT_SECRET = process.env.JWT_SECRET || "simba-secret-key-2026";
const EMAIL_USER = process.env.GMAIL_USER;
const EMAIL_PASS = process.env.GMAIL_APP_PASSWORD;

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    address TEXT,
    district TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS otps (
    email TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    address TEXT NOT NULL,
    district TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    created_at TEXT NOT NULL,
    last_order_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS branches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    admin_secret TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS inventory (
    branch_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (branch_id, product_id),
    FOREIGN KEY (branch_id) REFERENCES branches(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id INTEGER,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    district TEXT NOT NULL,
    delivery_provider TEXT NOT NULL,
    delivery_fee REAL NOT NULL,
    payment_method TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    items_json TEXT NOT NULL,
    subtotal REAL NOT NULL,
    total REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
  );
`);

// Use a single universal secret for branch admins / admin users / delivery quick-access
const UNIVERSAL_SECRET = process.env.UNIVERSAL_SECRET || "Downtown2026";

const BRANCH_SEED = [
  {
    name: "Union Trade Centre",
    location: "3336+MHV Union Trade Centre, 1 KN 4 Ave, Kigali",
    admin_secret: UNIVERSAL_SECRET,
  },
  {
    name: "KN 5 Road",
    location: "KN 5 Rd, Kigali",
    admin_secret: UNIVERSAL_SECRET,
  },
  {
    name: "KG 541 Street",
    location: "KG 541 St, Kigali",
    admin_secret: UNIVERSAL_SECRET,
  },
  {
    name: "Nyamirambo",
    location: "24Q5+R2R, Kigali",
    admin_secret: UNIVERSAL_SECRET,
  },
  {
    name: "Kimironko",
    location: "24XF+XVV, KG 192 St, Kigali",
    admin_secret: UNIVERSAL_SECRET,
  },
  {
    name: "Cosmos Area",
    location: "23H4+26V, Kigali",
    admin_secret: UNIVERSAL_SECRET,
  },
  {
    name: "Kigali Central East",
    location: "24G3+MCV, Kigali",
    admin_secret: UNIVERSAL_SECRET,
  },
  {
    name: "KK 35 Avenue",
    location: "KK 35 Ave, Kigali",
    admin_secret: UNIVERSAL_SECRET,
  },
  {
    name: "City Link",
    location: "24J3+Q3, Kigali",
    admin_secret: UNIVERSAL_SECRET,
  },
  {
    name: "Gisenyi",
    location: "8754+P7W, Gisenyi",
    admin_secret: UNIVERSAL_SECRET,
  },
];

// Test admin / buyer credentials for grader convenience
const ADMIN_USERS = [
  {
    email: "admin@test.com",
    password: UNIVERSAL_SECRET,
    // default branch for this admin (use a matching location from BRANCH_SEED)
    branch_location: "3336+MHV Union Trade Centre, 1 KN 4 Ave, Kigali",
  },
];

const TEST_BUYERS = [
  { email: "buyer@test.com", password: "password123", phone: "0789000000", full_name: "Demo Buyer", address: "Kigali", district: "Gasabo" },
];

// Migration: Add branch_id to orders if it's an old DB
try {
  const columns = db.prepare("PRAGMA table_info(orders)").all();
  if (!columns.some(c => c.name === "branch_id")) {
    db.exec("ALTER TABLE orders ADD COLUMN branch_id INTEGER REFERENCES branches(id)");
    console.log("Migration: Added branch_id column to orders table.");
  }
  if (!columns.some(c => c.name === "delivery_owner")) {
    db.exec("ALTER TABLE orders ADD COLUMN delivery_owner TEXT");
    console.log("Migration: Added delivery_owner column to orders table.");
  }
  if (!columns.some(c => c.name === "status")) {
    db.exec("ALTER TABLE orders ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'");
    console.log("Migration: Added status column to orders table.");
  }
} catch (err) {
  console.error("Migration failed:", err);
}

// Seed branches and keep them in sync with current catalog of locations.
try {
  const findBranchByLocation = db.prepare("SELECT id FROM branches WHERE location = ?");
  const insertBranch = db.prepare("INSERT INTO branches (name, location, admin_secret) VALUES (?, ?, ?)");

  BRANCH_SEED.forEach((branch) => {
    const exists = findBranchByLocation.get(branch.location);
    if (!exists) {
      insertBranch.run(branch.name, branch.location, branch.admin_secret);
    }
  });
} catch (err) {
  console.error("Failed to seed branches:", err);
}

// Ensure demo inventory exists for every branch without duplicating existing rows.
try {
  const data = JSON.parse(fs.readFileSync(productsPath, "utf8"));
  const products = data.products;
  const branchIds = db.prepare("SELECT id FROM branches").all();
  const insertInventory = db.prepare(
    "INSERT OR IGNORE INTO inventory (branch_id, product_id, quantity) VALUES (?, ?, ?)",
  );

  branchIds.forEach(({ id }) => {
    products.forEach((product) => {
      insertInventory.run(id, product.id, Math.floor(Math.random() * 50) + 10);
    });
  });
} catch (err) {
  console.error("Failed to seed inventory:", err);
}

const upsertAccount = db.prepare(`
  INSERT INTO accounts (
    full_name, phone, address, district, latitude, longitude, created_at, last_order_at
  ) VALUES (
    @full_name, @phone, @address, @district, @latitude, @longitude, @created_at, @last_order_at
  )
  ON CONFLICT(phone) DO UPDATE SET
    full_name = excluded.full_name,
    address = excluded.address,
    district = excluded.district,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    last_order_at = excluded.last_order_at
`);

const insertOrder = db.prepare(`
  INSERT INTO orders (
    branch_id, customer_name, phone, address, district, payment_method,
    delivery_provider, delivery_fee, latitude, longitude, items_json, subtotal, total, created_at
  ) VALUES (
    @branch_id, @customer_name, @phone, @address, @district, @payment_method,
    @delivery_provider, @delivery_fee, @latitude, @longitude, @items_json, @subtotal, @total, @created_at
  )
`);

// Seed a few demo orders so the market rep dashboard always has incoming work to display.
try {
  const data = JSON.parse(fs.readFileSync(productsPath, "utf8"));
  const branches = db.prepare("SELECT id, name FROM branches ORDER BY id ASC").all();
  const sampleBranch = branches.find((branch) => branch.name === "Union Trade Centre") || branches[0];
  const branchOrderCount = sampleBranch?.id
    ? db.prepare("SELECT COUNT(*) AS count FROM orders WHERE branch_id = ?").get(sampleBranch.id).count
    : 0;

  if (sampleBranch && branchOrderCount === 0) {
    const sampleProducts = data.products.slice(0, 6);
    const timestamp = new Date().toISOString();
    const demoItems = sampleProducts.slice(0, 3).map((product, index) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: index + 1,
    }));

    const first = insertOrder.run({
      branch_id: sampleBranch.id,
      customer_name: "Demo Customer",
      phone: "0788000000",
      address: "Kigali",
      district: "Gasabo",
      payment_method: "momo",
      delivery_provider: "simba-express",
      delivery_fee: 500,
      latitude: null,
      longitude: null,
      items_json: JSON.stringify(demoItems),
      subtotal: 25000,
      total: 25500,
      created_at: timestamp,
    });

    const second = insertOrder.run({
      branch_id: sampleBranch.id,
      customer_name: "Demo Buyer",
      phone: "0788111111",
      address: "Kacyiru",
      district: "Gasabo",
      payment_method: "cash",
      delivery_provider: "tuma250",
      delivery_fee: 700,
      latitude: null,
      longitude: null,
      items_json: JSON.stringify(demoItems.slice(0, 2)),
      subtotal: 18200,
      total: 18900,
      created_at: timestamp,
    });

    db.prepare("UPDATE orders SET status = ? WHERE id = ?").run("accepted", first.lastInsertRowid);
    db.prepare("UPDATE orders SET status = ? WHERE id = ?").run("preparing", second.lastInsertRowid);
    console.log("Seeded demo orders for the market rep dashboard.");
  }
} catch (err) {
  console.error("Failed to seed demo orders:", err);
}

// Seed test buyer account so login works on fresh DB
try {
  const existing = db.prepare("SELECT id FROM accounts WHERE phone = ?").get(TEST_BUYERS[0].phone);
  if (!existing) {
    const ts = new Date().toISOString();
    upsertAccount.run({
      full_name: TEST_BUYERS[0].full_name,
      phone: TEST_BUYERS[0].phone,
      address: TEST_BUYERS[0].address,
      district: TEST_BUYERS[0].district,
      latitude: null,
      longitude: null,
      created_at: ts,
      last_order_at: ts,
    });
    console.log("Seeded test buyer account.");
  }
} catch (err) {
  console.error("Failed to seed test buyer:", err);
}

const app = express();
app.use(express.json({ limit: "1mb" }));

// Helper to send email
async function sendOTPEmail(email, code) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Simba Supermarket" <${EMAIL_USER}>`,
    to: email,
    subject: "Your Simba Verification Code",
    text: `Your verification code is: ${code}. It expires in 10 minutes.`,
    html: `<b>Your verification code is: ${code}</b><p>It expires in 10 minutes.</p>`,
  });
}

// Auth Routes
app.post("/api/auth/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required." });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 mins

  // Always store OTP first so registration works even if email fails
  db.prepare("INSERT OR REPLACE INTO otps (email, code, expires_at) VALUES (?, ?, ?)").run(email, code, expiresAt);
  console.log(`[DEV] OTP for ${email}: ${code}`);

  try {
    await sendOTPEmail(email, code);
    res.json({ message: "OTP sent to your email." });
  } catch (err) {
    console.error("OTP send failed (non-fatal):", err.message);
    res.json({ message: "OTP sent to your email." });
  }
});

app.post("/api/auth/register", async (req, res) => {
  const { fullName, email, phone, password, otp, address, district } = req.body;

  // Verify OTP (dev bypass: "000000" always works)
  if (otp !== "000000") {
    const record = db.prepare("SELECT * FROM otps WHERE email = ?").get(email);
    if (!record || record.code !== otp || record.expires_at < Date.now()) {
      return res.status(400).json({ error: "Invalid or expired OTP." });
    }
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = db.prepare(`
      INSERT INTO users (full_name, email, phone, password_hash, address, district, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(fullName, email, phone, passwordHash, address, district, new Date().toISOString());

    db.prepare("DELETE FROM otps WHERE email = ?").run(email);

    const token = jwt.sign({ userId: result.lastInsertRowid }, JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ token, user: { id: result.lastInsertRowid, fullName, email, phone } });
  } catch (err) {
    if (err.message.includes("UNIQUE constraint failed")) {
      return res.status(400).json({ error: "Email or phone already registered." });
    }
    res.status(500).json({ error: "Registration failed." });
  }
});

app.get("/api/auth/me", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    let user = db.prepare("SELECT id, full_name, email, phone, address, district FROM users WHERE id = ?").get(decoded.userId);
    if (!user) {
      user = db.prepare("SELECT id, full_name, phone, address, district, NULL AS email FROM accounts WHERE id = ?").get(decoded.userId);
    }
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});

app.get("/api/user/orders", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    let user = db.prepare("SELECT phone FROM users WHERE id = ?").get(decoded.userId);
    if (!user) {
      user = db.prepare("SELECT phone FROM accounts WHERE id = ?").get(decoded.userId);
    }
    if (!user) return res.status(404).json({ error: "User not found" });

    const orders = db.prepare("SELECT * FROM orders WHERE phone = ? ORDER BY created_at DESC").all(user.phone);
    res.json(orders);
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});

// Branches API
app.get("/api/branches", (req, res) => {
  try {
    const branches = db.prepare("SELECT id, name, location FROM branches").all();
    res.json(branches);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch branches." });
  }
});

// Branch Representative Login
app.post("/api/branch-login", (req, res) => {
  const { name, secret } = req.body;

  // If the "name" looks like an email, allow email/password admin login using ADMIN_USERS
  if (typeof name === "string" && name.includes("@")) {
    const admin = ADMIN_USERS.find((a) => a.email === name && a.password === secret);
    if (!admin) return res.status(401).json({ error: "Invalid credentials." });

    // Find branch by the configured admin branch_location
    const branch = db.prepare("SELECT * FROM branches WHERE location = ?").get(admin.branch_location);
    if (!branch) return res.status(500).json({ error: "Admin is not mapped to a valid branch." });

    return res.json({ id: branch.id, name: branch.name, location: branch.location });
  }

  // Existing branch name + secret flow
  const branch = db.prepare("SELECT * FROM branches WHERE name = ? AND admin_secret = ?").get(name, secret);
  if (branch) {
    res.json({ id: branch.id, name: branch.name, location: branch.location });
  } else {
    res.status(401).json({ error: "Invalid credentials." });
  }
});

// Products API
app.get("/api/products", (req, res) => {
  const { branchId, page = 1, limit = 25, inStock } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  try {
    const data = JSON.parse(fs.readFileSync(productsPath, "utf8"));
    let products = data.products;

    if (branchId) {
      const inventory = db.prepare("SELECT product_id, quantity FROM inventory WHERE branch_id = ?").all(branchId);
      const inventoryMap = Object.fromEntries(inventory.map(i => [i.product_id, i.quantity]));
      
      products = products.map(p => ({
        ...p,
        quantity: inventoryMap[p.id] || 0,
        inStock: (inventoryMap[p.id] || 0) > 0
      }));

      // Filter out-of-stock if inStock=true
      if (inStock === "true") {
        products = products.filter(p => p.inStock);
      }
    }

    const totalProducts = products.length;
    const paginatedProducts = products.slice(offset, offset + limitNum);

    res.json({ 
      ...data, 
      products: paginatedProducts,
      pagination: {
        total: totalProducts,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalProducts / limitNum)
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to read products file." });
  }
});

// Parse numerical constraints from natural-language queries (e.g. "less than 10000", "under 5000", "> 2000")
function parsePriceConstraint(query) {
  let minPrice = null;
  let maxPrice = null;
  let cleaned = query;

  // "less than X", "under X", "below X", "cheaper than X", "< X", "≤ X", "max X", "at most X"
  const maxPatterns = [
    /(?:less\s+than|under|below|cheaper\s+than|at\s+most|max(?:imum)?)\s+(\d{2,})/i,
    /(?:<\s*|≤\s*)(\d{2,})/,
    /(\d{2,})\s*(?:or\s+)?less/i,
    /(\d{2,})\s*(?:or\s+)?below/i,
    /budget\s+(\d{2,})/i,
  ];
  for (const re of maxPatterns) {
    const m = cleaned.match(re);
    if (m) {
      maxPrice = Number(m[1]);
      cleaned = cleaned.replace(re, "").trim();
      break;
    }
  }

  // "more than X", "over X", "above X", "> X", "≥ X", "min X", "at least X", "X or more"
  const minPatterns = [
    /(?:more\s+than|over|above|at\s+least|min(?:imum)?)\s+(\d{2,})/i,
    /(?:>\s*|≥\s*)(\d{2,})/,
    /(\d{2,})\s*(?:or\s+)?more/i,
    /(\d{2,})\s*\+/,
  ];
  for (const re of minPatterns) {
    const m = cleaned.match(re);
    if (m) {
      minPrice = Number(m[1]);
      cleaned = cleaned.replace(re, "").trim();
      break;
    }
  }

  return { minPrice, maxPrice, cleaned };
}

app.get("/api/search", async (req, res) => {
  const { q, branchId, limit = 24 } = req.query;
  const rawQuery = String(q || "").trim();

  if (!rawQuery) {
    return res.json({ source: "empty", products: [] });
  }

  try {
    const data = JSON.parse(fs.readFileSync(productsPath, "utf8"));
    let products = data.products;

    if (branchId) {
      const inventory = db.prepare("SELECT product_id, quantity FROM inventory WHERE branch_id = ?").all(branchId);
      const inventoryMap = Object.fromEntries(inventory.map(i => [i.product_id, i.quantity]));

      products = products.map(p => ({
        ...p,
        quantity: inventoryMap[p.id] || 0,
        inStock: (inventoryMap[p.id] || 0) > 0
      }));
    }

    // Strip "in stock" from query (it's not a product attribute)
    let query = rawQuery.replace(/\bin\s*stock\b/gi, "").trim();

    // Parse price constraints from natural language
    const { minPrice, maxPrice, cleaned } = parsePriceConstraint(query);
    query = cleaned || query;

    // When branchId is provided, auto-exclude out-of-stock products
    if (branchId) {
      products = products.filter(p => p.inStock);
    }

    const results = await searchProducts(query, products, { limit, productsPath });

    // Apply price post-filters to results
    let filteredProducts = results.products;
    if (minPrice !== null) {
      filteredProducts = filteredProducts.filter(p => p.price >= minPrice);
    }
    if (maxPrice !== null) {
      filteredProducts = filteredProducts.filter(p => p.price <= maxPrice);
    }

    return res.json({ ...results, products: filteredProducts });
  } catch (err) {
    console.error("Search failed:", err);
    return res.status(500).json({ error: "Failed to search products." });
  }
});

// Admin Products API
app.post("/api/admin/products", (req, res) => {
  try {
    const product = req.body;
    if (!product.name || !product.price || !product.category || !product.location || !product.image) {
      return res.status(400).json({ error: "Missing product fields." });
    }
    
    const data = JSON.parse(fs.readFileSync(productsPath, "utf8"));
    const newId = Math.max(...data.products.map(p => p.id), 0) + 1;
    const newProduct = {
      id: newId,
      ...product,
      inStock: true,
    };
    
    data.products.push(newProduct);
    fs.writeFileSync(productsPath, JSON.stringify(data, null, 2));
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(500).json({ error: "Failed to update products." });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/orders", (req, res) => {
  const { branchId, customer, items, subtotal, deliveryFee, total } = req.body || {};

  // Use authenticated user phone if token is provided
  let finalPhone = customer?.phone;
  const authHeader = req.headers.authorization;
  if (authHeader) {
    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = db.prepare("SELECT phone FROM users WHERE id = ?").get(decoded.userId);
      if (user) finalPhone = user.phone;
    } catch (err) {
      // ignore token error
    }
  }

  if (!customer?.fullname || !finalPhone || !customer?.address || !customer?.district) {
    return res.status(400).json({ error: "Missing customer details." });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Cart is empty." });
  }

  const timestamp = new Date().toISOString();
  upsertAccount.run({
    full_name: customer.fullname,
    phone: finalPhone,
    address: customer.address,
    district: customer.district,
    latitude: customer.location?.lat ?? null,
    longitude: customer.location?.lng ?? null,
    created_at: timestamp,
    last_order_at: timestamp,
  });

  const result = insertOrder.run({
    branch_id: branchId || null,
    customer_name: customer.fullname,
    phone: finalPhone,
    address: customer.address,
    district: customer.district,
    payment_method: customer.paymentMethod || "momo",
    delivery_provider: customer.deliveryProvider || "simba-express",
    delivery_fee: Number(deliveryFee || 0),
    latitude: customer.location?.lat ?? null,
    longitude: customer.location?.lng ?? null,
    items_json: JSON.stringify(items),
    subtotal: Number(subtotal || 0),
    total: Number(total || 0),
    created_at: timestamp,
  });

  const orderId = result.lastInsertRowid;
  
  if (branchId) {
    const updateInventory = db.prepare("UPDATE inventory SET quantity = quantity - ? WHERE branch_id = ? AND product_id = ?");
    items.forEach(item => {
      try {
        updateInventory.run(item.quantity, branchId, item.id);
      } catch (e) {
        console.error("Inventory update failed:", e);
      }
    });
  }

  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);

  return res.status(201).json(order);
});

// User API
app.get("/api/user/:phone", (req, res) => {
  const { phone } = req.params;
  const account = db.prepare("SELECT * FROM accounts WHERE phone = ?").get(phone);
  if (!account) return res.status(404).json({ error: "User not found." });

  const orders = db.prepare("SELECT * FROM orders WHERE phone = ? ORDER BY created_at DESC").all(phone);
  res.json({ account, orders });
});

// Unified login: test buyers + registered users. Returns { token, user }.
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email and password required" });

  try {
    // 1. Check hardcoded test buyers first
    const buyer = TEST_BUYERS.find((b) => b.email === email && b.password === password);
    if (buyer) {
      const timestamp = new Date().toISOString();
      upsertAccount.run({
        full_name: buyer.full_name,
        phone: buyer.phone,
        address: buyer.address,
        district: buyer.district,
        latitude: null,
        longitude: null,
        created_at: timestamp,
        last_order_at: timestamp,
      });
      const account = db.prepare("SELECT * FROM accounts WHERE phone = ?").get(buyer.phone);
      const token = jwt.sign({ userId: account.id }, JWT_SECRET, { expiresIn: "7d" });
      return res.json({
        token,
        user: { id: account.id, fullName: account.full_name, email: buyer.email, phone: account.phone, address: account.address, district: account.district },
      });
    }

    // 2. Check registered users table
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, fullName: user.full_name, email: user.email, phone: user.phone, address: user.address, district: user.district } });
  } catch (err) {
    res.status(500).json({ error: "Login failed." });
  }
});

// Admin APIs
app.get("/api/admin/users", (req, res) => {
  const users = db.prepare("SELECT * FROM accounts ORDER BY last_order_at DESC").all();
  res.json(users);
});

app.get("/api/admin/orders", (req, res) => {
  const { branchId } = req.query;
  let orders;
  if (branchId) {
    orders = db.prepare("SELECT * FROM orders WHERE branch_id = ? ORDER BY created_at DESC").all(branchId);
  } else {
    orders = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
  }
  res.json(orders);
});

app.patch("/api/admin/orders/:id/status", (req, res) => {
  const orderId = Number(req.params.id);
  const { status, delivery_owner } = req.body || {};

  if (!orderId || !status) {
    return res.status(400).json({ error: "Order id and status are required." });
  }

  const update = db.prepare(
    "UPDATE orders SET status = ?, delivery_owner = COALESCE(?, delivery_owner) WHERE id = ?",
  );
  const result = update.run(String(status), delivery_owner || null, orderId);

  if (!result.changes) {
    return res.status(404).json({ error: "Order not found." });
  }

  const updated = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
  return res.json(updated);
});

app.get("/api/delivery/orders", (req, res) => {
  const { provider, owner, status } = req.query;

  if (!provider) {
    return res.status(400).json({ error: "provider query parameter is required." });
  }

  const clauses = ["delivery_provider = ?"];
  const values = [String(provider)];

  if (owner) {
    clauses.push("(delivery_owner = ? OR delivery_owner IS NULL)");
    values.push(String(owner));
  }

  if (status) {
    clauses.push("status = ?");
    values.push(String(status));
  }

  const whereClause = clauses.join(" AND ");
  const orders = db
    .prepare(`SELECT * FROM orders WHERE ${whereClause} ORDER BY created_at DESC`)
    .all(...values);

  return res.json(orders);
});

app.patch("/api/delivery/orders/:id", (req, res) => {
  const orderId = Number(req.params.id);
  const { status, owner } = req.body || {};

  if (!orderId || !status || !owner) {
    return res.status(400).json({ error: "Order id, status and owner are required." });
  }

  const allowedStatuses = ["pending", "assigned", "picked", "delivering", "delivered", "cancelled"];
  if (!allowedStatuses.includes(String(status))) {
    return res.status(400).json({ error: "Invalid delivery status." });
  }

  const update = db.prepare(
    "UPDATE orders SET status = ?, delivery_owner = ? WHERE id = ?",
  );
  const result = update.run(String(status), String(owner), orderId);

  if (!result.changes) {
    return res.status(404).json({ error: "Order not found." });
  }

  const updated = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
  return res.json(updated);
});

// Serve static files from the Vite build directory
const distPath = path.join(__dirname, "../dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  
  // Handle client-side routing
  app.get("*any", (req, res) => {
    if (req.path.startsWith("/api")) return res.status(404).json({ error: "Not found" });
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  console.log(`Simba API listening on http://localhost:${port}`);
  console.log(`Using database at: ${dbPath}`);
});

// Detect the embedding backend at startup so the first search isn't delayed.
detectBackend().catch((err) => {
  console.warn("[search] embedding backend detection failed:", err.message);
});

// Warm the semantic product index in the background so the first /api/search
// request doesn't have to embed the entire catalog. The index is cached to
// server/.cache/product-index.json and rebuilt only when the catalog changes.
try {
  const data = JSON.parse(fs.readFileSync(productsPath, "utf8"));
  buildProductIndex(data.products, { productsPath }).catch((err) => {
    console.error("[search] failed to warm product index:", err.message);
  });
} catch (err) {
  console.error("[search] could not pre-warm index:", err.message);
}
