import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://apysmekdvsoxlcweclgw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFweXNtZWtkdnNveGxjd2VjbGd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNzI4NTMsImV4cCI6MjA5NzY0ODg1M30.EjeHYMcziViW01gCyUwTZ1L3iFHlMGLsAR3PGiZK2Lc";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ---------- helpers de mapeo entre la forma de la app y la tabla SQL ---------- */

function rowToProduct(row) {
  return {
    id: row.id,
    name: row.name,
    notes: row.notes,
    description: row.description,
    price: Number(row.price),
    stock: Number(row.stock),
    image: row.image,
  };
}

function productToRow(p) {
  return {
    id: p.id,
    name: p.name,
    notes: p.notes,
    description: p.description,
    price: p.price,
    stock: p.stock,
    image: p.image,
  };
}

function rowToCode(row) {
  return {
    code: row.code,
    productId: row.product_id,
    sold: row.sold,
    createdAt: row.created_at,
    soldAt: row.sold_at,
    buyerName: row.buyer_name,
    buyerEmail: row.buyer_email,
  };
}

function codeToRow(c) {
  return {
    code: c.code,
    product_id: c.productId,
    sold: c.sold,
    created_at: c.createdAt,
    sold_at: c.soldAt || null,
    buyer_name: c.buyerName || null,
    buyer_email: c.buyerEmail || null,
  };
}

function rowToOrder(row) {
  return {
    id: row.id,
    buyer: { name: row.buyer_name, email: row.buyer_email },
    items: row.items,
    total: Number(row.total),
    codes: row.codes,
    createdAt: row.created_at,
  };
}

function orderToRow(o) {
  return {
    id: o.id,
    buyer_name: o.buyer.name,
    buyer_email: o.buyer.email,
    items: o.items,
    total: o.total,
    codes: o.codes,
    created_at: o.createdAt,
  };
}

/* ---------- productos ---------- */

export async function loadProducts() {
  const { data, error } = await supabase.from("products").select("*").order("name");
  if (error) {
    console.error("Error cargando productos", error);
    return [];
  }
  return data.map(rowToProduct);
}

export async function saveProduct(product) {
  const { error } = await supabase.from("products").upsert(productToRow(product));
  if (error) console.error("Error guardando producto", error);
}

export async function deleteProductRemote(id) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) console.error("Error eliminando producto", error);
}

/* ---------- códigos ---------- */

export async function loadCodes() {
  const { data, error } = await supabase.from("codes").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("Error cargando códigos", error);
    return [];
  }
  return data.map(rowToCode);
}

export async function insertCodes(codes) {
  const rows = codes.map(codeToRow);
  const { error } = await supabase.from("codes").insert(rows);
  if (error) console.error("Error insertando códigos", error);
}

export async function updateCodeRemote(code) {
  const { error } = await supabase.from("codes").update(codeToRow(code)).eq("code", code.code);
  if (error) console.error("Error actualizando código", error);
}

export async function findOneAvailableCode(productId) {
  const { data, error } = await supabase
    .from("codes")
    .select("*")
    .eq("product_id", productId)
    .eq("sold", false)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("Error buscando código disponible", error);
    return null;
  }
  return data ? rowToCode(data) : null;
}

export async function codeExists(code) {
  const { data, error } = await supabase.from("codes").select("code").eq("code", code).maybeSingle();
  if (error) return false;
  return !!data;
}

/* ---------- pedidos ---------- */

export async function loadOrders() {
  const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("Error cargando pedidos", error);
    return [];
  }
  return data.map(rowToOrder);
}

export async function insertOrder(order) {
  const { error } = await supabase.from("orders").insert(orderToRow(order));
  if (error) console.error("Error guardando pedido", error);
}

export async function updateStock(productId, newStock) {
  const { error } = await supabase.from("products").update({ stock: newStock }).eq("id", productId);
  if (error) console.error("Error actualizando stock", error);
}

/* ---------- tipo de cambio ---------- */

export async function loadExchangeRate() {
  const { data, error } = await supabase.from("settings").select("value").eq("key", "exchange_rate").maybeSingle();
  if (error || !data) return 1000;
  return parseFloat(data.value);
}

export async function saveExchangeRate(rate) {
  const { error } = await supabase.from("settings").upsert({ key: "exchange_rate", value: String(rate) });
  if (error) console.error("Error guardando tipo de cambio", error);
}
