import express from "express";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbDir = path.join(__dirname, "data");
const dbPath = process.env.DATABASE_PATH || path.join(dbDir, "simba.db");
const productsPath = path.join(__dirname, "../simba_products.json");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.exec(`
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

const BRANCH_SEED = [
  {
    name: "Union Trade Centre",
    location: "3336+MHV Union Trade Centre, 1 KN 4 Ave, Kigali",
    admin_secret: "UTC2026",
  },
  {
    name: "KN 5 Road",
    location: "KN 5 Rd, Kigali",
    admin_secret: "KN5Road2026",
  },
  {
    name: "KG 541 Street",
    location: "KG 541 St, Kigali",
    admin_secret: "KG5412026",
  },
  {
    name: "Nyamirambo",
    location: "24Q5+R2R, Kigali",
    admin_secret: "Nyamirambo2026",
  },
  {
    name: "Kimironko",
    location: "24XF+XVV, KG 192 St, Kigali",
    admin_secret: "Kimironko2026",
  },
  {
    name: "Cosmos Area",
    location: "23H4+26V, Kigali",
    admin_secret: "Cosmos2026",
  },
  {
    name: "Kigali Central East",
    location: "24G3+MCV, Kigali",
    admin_secret: "CentralEast2026",
  },
  {
    name: "KK 35 Avenue",
    location: "KK 35 Ave, Kigali",
    admin_secret: "KK35Ave2026",
  },
  {
    name: "City Link",
    location: "24J3+Q3, Kigali",
    admin_secret: "CityLink2026",
  },
  {
    name: "Gisenyi",
    location: "8754+P7W, Gisenyi",
    admin_secret: "Gisenyi2026",
  },
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
  const products = data.products.slice(0, 50);
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

const app = express();
app.use(express.json({ limit: "1mb" }));

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
  const branch = db.prepare("SELECT * FROM branches WHERE name = ? AND admin_secret = ?").get(name, secret);
  if (branch) {
    res.json({ id: branch.id, name: branch.name, location: branch.location });
  } else {
    res.status(401).json({ error: "Invalid credentials." });
  }
});

// Products API
app.get("/api/products", (req, res) => {
  const { branchId, page = 1, limit = 25 } = req.query;
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

  if (!customer?.fullname || !customer?.phone || !customer?.address || !customer?.district) {
    return res.status(400).json({ error: "Missing customer details." });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Cart is empty." });
  }

  const timestamp = new Date().toISOString();
  upsertAccount.run({
    full_name: customer.fullname,
    phone: customer.phone,
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
    phone: customer.phone,
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
