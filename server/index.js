import express from "express";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbDir = path.join(__dirname, "data");
const dbPath = path.join(dbDir, "simba.db");

fs.mkdirSync(dbDir, { recursive: true });

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

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    created_at TEXT NOT NULL
  );
`);

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
    customer_name, phone, address, district, payment_method,
    delivery_provider, delivery_fee, latitude, longitude, items_json, subtotal, total, created_at
  ) VALUES (
    @customer_name, @phone, @address, @district, @payment_method,
    @delivery_provider, @delivery_fee, @latitude, @longitude, @items_json, @subtotal, @total, @created_at
  )
`);

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/orders", (req, res) => {
  const { customer, items, subtotal, deliveryFee, total } = req.body || {};

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

  return res.status(201).json({ id: result.lastInsertRowid });
});

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  console.log(`Simba API listening on http://localhost:${port}`);
});
