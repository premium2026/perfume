import React, { useState, useEffect, useCallback } from "react";
import {
  loadProducts as dbLoadProducts,
  saveProduct as dbSaveProduct,
  deleteProductRemote,
  loadCodes as dbLoadCodes,
  insertCodes as dbInsertCodes,
  updateCodeRemote,
  findOneAvailableCode,
  codeExists,
  loadOrders as dbLoadOrders,
  insertOrder as dbInsertOrder,
  updateStock,
  loadExchangeRate,
  saveExchangeRate,
} from "./supabaseClient";

/* ============================================================
   CLUVÉ — tienda de perfumes de autor
   ============================================================ */

const FONTS_LINK = "https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap";

const ADMIN_PASSWORD = "esencia-original2026";
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode() {
  let code = "";
  for (let i = 0; i < 8; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

function formatARS(n) {
  return "$ " + new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);
}
function formatUSD(n) {
  return "USD " + new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}
function formatDate(iso, lang) {
  const locale = lang === "en" ? "en-US" : "es-AR";
  return new Date(iso).toLocaleDateString(locale, { day: "2-digit", month: "long", year: "numeric" });
}

/* ---------- Diccionario bilingüe ---------- */
const T = {
  es: {
    brand: "CLUVÉ",
    verifyNav: "Verificar autenticidad",
    panel: "Panel",
    access: "Acceso tienda",
    cart: "Carrito",
    collection: "Colección actual",
    heroTitle: "Cada frasco lleva un sello.\nCada sello, una historia.",
    heroSub: "Fragancias formuladas y embotelladas en lotes pequeños. El código grabado en tu envase confirma que es nuestro, y solo nuestro.",
    lastUnits: (n) => `Últimas ${n} unidades`,
    soldOut: "Agotado",
    addToCart: "Agregar",
    noStock: "Sin stock",
    back: "← Volver al catálogo",
    addBtn: "Agregar al carrito",
    noStockBtn: "Sin stock por el momento",
    stockNote: (n) => `${n} unidades disponibles`,
    soonBack: "Volveremos a tener stock pronto",
    authNote: "Cada unidad incluye un código de 8 caracteres grabado en la base del frasco. Tras la compra, podés verificarlo en \"Verificar autenticidad\".",
    cartTitle: "Tu carrito",
    emptyCart: "Tu carrito está vacío",
    seeCatalog: "Ver catálogo",
    continue: "Continuar",
    checkoutNote: "Esta es una demostración funcional. Para producción real, este paso se conecta a un procesador de pagos.",
    fullName: "Nombre completo",
    email: "Email",
    totalToPay: "Total a pagar",
    confirmBtn: "Confirmar compra",
    goBack: "Volver",
    fillFields: "Completá nombre y email para continuar",
    orderConfirmed: "Pedido confirmado",
    thanks: (name) => `Gracias, ${name}`,
    orderRegistered: (id, total, email) => `Tu pedido ${id} fue registrado por ${total}. Te enviamos la confirmación a ${email}.`,
    codesAssigned: "Códigos asignados a tus envases",
    codeHint: "Este código también vendrá grabado en la base del frasco. Guardalo: podés usarlo en cualquier momento desde \"Verificar autenticidad\".",
    backCatalog: "Volver al catálogo",
    verifyTitle: "Sello de autenticidad",
    verifyH2: "Verificá tu frasco",
    verifyHint: "Ingresá el código de 8 caracteres grabado en la base del envase.",
    verifyBtn: "Verificar",
    verifying: "Verificando…",
    sealValid: "Producto Original",
    sealExclusive: "Esta unidad pertenece a un lote limitado, formulado y embotellado a mano. Gracias por llevar una pieza genuina de CLUVÉ.",
    sealInvalid: "No pudimos confirmar este código",
    sealInvalidSub: (email) => `Revisá que esté bien escrito. Si el código es correcto y no figura como vendido por nosotros, escribinos a ${email}.`,
    soldOn: (date) => `vendido el ${date}`,
    adminTitle: "Panel de tienda",
    tabProducts: "Productos",
    tabCodes: "Lotes de códigos",
    tabOrders: "Pedidos",
    addProduct: "+ Agregar producto",
    edit: "Editar",
    delete: "Eliminar",
    editProduct: "Editar producto",
    name: "Nombre",
    olfNotes: "Notas olfativas",
    description: "Descripción",
    photoUrl: "URL de la foto",
    priceUSD: "Precio (USD)",
    stock: "Stock",
    save: "Guardar cambios",
    cancel: "Cancelar",
    productUpdated: "Producto actualizado",
    productDeleted: "Producto eliminado",
    generateBatch: "Generar lote",
    product: "Producto",
    codeQty: "Cantidad de códigos",
    codesGenerated: (n) => `${n} códigos generados`,
    available: "disponibles",
    sold: "vendidos",
    generated: "generados",
    markSoldTitle: "Marcar código como vendido manualmente",
    markSoldDesc: "Usá esto cuando vendés por WhatsApp, en persona o por cualquier canal fuera de la tienda web.",
    codeField: "Código del envase",
    buyerField: "Nombre del comprador o frase (opcional)",
    buyerPlaceholder: "Ej: María García  /  Para siempre tuyo",
    markSoldBtn: "Marcar vendido",
    markOk: "✓ Código marcado como vendido correctamente.",
    markNotFound: "✕ No se encontró ese código. Verificá que esté bien escrito.",
    markAlready: "⚠ Ese código ya estaba marcado como vendido.",
    batchHint: "Generá los códigos antes de imprimir/grabar los envases. Al vender por la web, el sistema asigna automáticamente uno disponible; si vendés por otro canal, marcalo manualmente arriba.",
    lastCodes: "Últimos códigos generados",
    disponible: "Disponible",
    vendido: "Vendido",
    noOrders: "Todavía no hay pedidos registrados.",
    loginTitle: "Acceso de tienda",
    loginHint: "Panel interno para gestionar precios, fotos, stock y lotes de códigos.",
    password: "Contraseña",
    enter: "Ingresar",
    wrongPassword: "Contraseña incorrecta",
    exchangeRate: "Tipo de cambio",
    exchangeLabel: "USD 1 =",
    exchangeHint: "Los precios se muestran en USD. El equivalente en ARS se calcula con este tipo de cambio.",
    footerText: "CLUVÉ — perfumes de autor, hechos en lotes pequeños.",
    verifyFooter: "Verificar un código de envase ↗",
    perUnit: "c/u",
    total: "Total",
  },
  en: {
    brand: "CLUVÉ",
    verifyNav: "Verify authenticity",
    panel: "Panel",
    access: "Store access",
    cart: "Cart",
    collection: "Current collection",
    heroTitle: "Every bottle carries a seal.\nEvery seal, a story.",
    heroSub: "Fragrances formulated and bottled in small batches. The code engraved on your bottle confirms it's ours, and ours alone.",
    lastUnits: (n) => `Last ${n} units`,
    soldOut: "Sold out",
    addToCart: "Add",
    noStock: "No stock",
    back: "← Back to catalog",
    addBtn: "Add to cart",
    noStockBtn: "Currently out of stock",
    stockNote: (n) => `${n} units available`,
    soonBack: "We'll restock soon",
    authNote: "Each unit includes an 8-character code engraved on the bottom of the bottle. After purchase, you can verify it under \"Verify authenticity\".",
    cartTitle: "Your cart",
    emptyCart: "Your cart is empty",
    seeCatalog: "Browse catalog",
    continue: "Continue",
    checkoutNote: "This is a functional demo. For real production, this step connects to a payment processor.",
    fullName: "Full name",
    email: "Email",
    totalToPay: "Total to pay",
    confirmBtn: "Confirm order",
    goBack: "Go back",
    fillFields: "Please fill in your name and email to continue",
    orderConfirmed: "Order confirmed",
    thanks: (name) => `Thank you, ${name}`,
    orderRegistered: (id, total, email) => `Your order ${id} was registered for ${total}. We sent a confirmation to ${email}.`,
    codesAssigned: "Codes assigned to your bottles",
    codeHint: "This code will also be engraved on the bottom of the bottle. Save it: you can use it anytime under \"Verify authenticity\".",
    backCatalog: "Back to catalog",
    verifyTitle: "Authenticity seal",
    verifyH2: "Verify your bottle",
    verifyHint: "Enter the 8-character code engraved on the bottom of the bottle.",
    verifyBtn: "Verify",
    verifying: "Verifying…",
    sealValid: "Original Product",
    sealExclusive: "This unit belongs to a limited batch, formulated and hand-bottled. Thank you for carrying a genuine piece of CLUVÉ.",
    sealInvalid: "We couldn't confirm this code",
    sealInvalidSub: (email) => `Check that it's written correctly. If the code is correct and doesn't appear as sold by us, write to ${email}.`,
    soldOn: (date) => `sold on ${date}`,
    adminTitle: "Store panel",
    tabProducts: "Products",
    tabCodes: "Code batches",
    tabOrders: "Orders",
    addProduct: "+ Add product",
    edit: "Edit",
    delete: "Delete",
    editProduct: "Edit product",
    name: "Name",
    olfNotes: "Olfactory notes",
    description: "Description",
    photoUrl: "Photo URL",
    priceUSD: "Price (USD)",
    stock: "Stock",
    save: "Save changes",
    cancel: "Cancel",
    productUpdated: "Product updated",
    productDeleted: "Product deleted",
    generateBatch: "Generate batch",
    product: "Product",
    codeQty: "Number of codes",
    codesGenerated: (n) => `${n} codes generated`,
    available: "available",
    sold: "sold",
    generated: "generated",
    markSoldTitle: "Mark code as sold manually",
    markSoldDesc: "Use this when you sell via WhatsApp, in person, or through any channel outside the web store.",
    codeField: "Bottle code",
    buyerField: "Buyer name or phrase (optional)",
    buyerPlaceholder: "E.g.: John Smith  /  Forever yours",
    markSoldBtn: "Mark as sold",
    markOk: "✓ Code successfully marked as sold.",
    markNotFound: "✕ Code not found. Check that it's written correctly.",
    markAlready: "⚠ That code was already marked as sold.",
    batchHint: "Generate codes before printing/engraving the bottles. When selling online, the system automatically assigns an available code; if you sell through another channel, mark it manually above.",
    lastCodes: "Latest generated codes",
    disponible: "Available",
    vendido: "Sold",
    noOrders: "No orders registered yet.",
    loginTitle: "Store access",
    loginHint: "Internal panel to manage prices, photos, stock and code batches.",
    password: "Password",
    enter: "Enter",
    wrongPassword: "Wrong password",
    exchangeRate: "Exchange rate",
    exchangeLabel: "USD 1 =",
    exchangeHint: "Prices are shown in USD. The ARS equivalent is calculated using this exchange rate.",
    footerText: "CLUVÉ — author fragrances, made in small batches.",
    verifyFooter: "Verify a bottle code ↗",
    perUnit: "each",
    total: "Total",
  },
};

/* ============================================================ */

export default function App() {
  const [view, setView] = useState("tienda");
  const [products, setProducts] = useState(null);
  const [codes, setCodes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeProduct, setActiveProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [toast, setToast] = useState(null);
  const [lang, setLang] = useState("es");
  const [exchangeRate, setExchangeRate] = useState(1000);

  const t = T[lang];

  useEffect(() => {
    (async () => {
      const [p, c, o, rate] = await Promise.all([dbLoadProducts(), dbLoadCodes(), dbLoadOrders(), loadExchangeRate()]);
      setProducts(p);
      setCodes(c);
      setOrders(o);
      setExchangeRate(rate);
      setLoading(false);
    })();
  }, []);

  const showToast = useCallback((msg, kind = "info") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 2800);
  }, []);

  const updateProducts = useCallback(async (next, changedProduct, deletedId) => {
    setProducts(next);
    if (deletedId) await deleteProductRemote(deletedId);
    else if (changedProduct) await dbSaveProduct(changedProduct);
  }, []);

  const updateCodes = useCallback(async (next, newOnes) => {
    setCodes(next);
    if (newOnes && newOnes.length > 0) await dbInsertCodes(newOnes);
  }, []);

  const updateOrders = useCallback(async (next) => { setOrders(next); }, []);

  const updateExchangeRate = async (rate) => {
    setExchangeRate(rate);
    await saveExchangeRate(rate);
  };

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) return prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { id: product.id, qty: 1 }];
    });
    showToast(`${product.name} ${lang === "es" ? "agregado al carrito" : "added to cart"}`, "ok");
  };

  if (loading) {
    return (
      <div style={S.appShell}>
        <FontLoad />
        <div style={S.loadingScreen}><div style={S.loadingMark}>C</div></div>
      </div>
    );
  }

  const commonProps = { t, lang, exchangeRate };

  return (
    <div style={S.appShell}>
      <FontLoad />
      <Header view={view} setView={setView} cartCount={cart.reduce((a, i) => a + i.qty, 0)} isAdmin={isAdmin} t={t} lang={lang} setLang={setLang} />
      <ExchangeRateBanner exchangeRate={exchangeRate} t={t} />
      <main style={S.main}>
        {view === "tienda" && <Tienda products={products} onSelect={(p) => { setActiveProduct(p); setView("producto"); }} onAdd={addToCart} {...commonProps} />}
        {view === "producto" && activeProduct && <Producto product={activeProduct} onAdd={addToCart} onBack={() => setView("tienda")} {...commonProps} />}
        {view === "carrito" && (
          <Carrito cart={cart} products={products} setCart={setCart} codes={codes} updateCodes={updateCodes}
            orders={orders} updateOrders={updateOrders} updateProducts={updateProducts}
            showToast={showToast} onDone={() => setView("tienda")} {...commonProps} />
        )}
        {view === "verificar" && <Verificador codes={codes} {...commonProps} />}
        {view === "admin-login" && <AdminLogin onSuccess={() => { setIsAdmin(true); setView("admin"); }} onBack={() => setView("tienda")} t={t} />}
        {view === "admin" && isAdmin && (
          <AdminPanel products={products} updateProducts={updateProducts} codes={codes} updateCodes={updateCodes}
            orders={orders} showToast={showToast} exchangeRate={exchangeRate} updateExchangeRate={updateExchangeRate} t={t} />
        )}
      </main>
      <Footer setView={setView} t={t} isAdmin={isAdmin} />
      {toast && <Toast toast={toast} />}
    </div>
  );
}

function FontLoad() { return <link rel="stylesheet" href={FONTS_LINK} />; }

/* ---- Precio formateado ---- */
function Price({ usd, exchangeRate, style = {} }) {
  const ars = usd * exchangeRate;
  return (
    <span style={style}>
      <span style={{ color: COLORS.amberLight, fontFamily: monoFont }}>{formatUSD(usd)}</span>
      <span style={{ color: COLORS.boneMute, fontSize: "0.82em", marginLeft: 8 }}>({formatARS(ars)})</span>
    </span>
  );
}

/* ---- Banner tipo de cambio (solo lectura para clientes) ---- */
function ExchangeRateBanner({ exchangeRate, t }) {
  return (
    <div style={S.exchangeBanner}>
      <span style={S.exchangeLabel}>{t.exchangeLabel}</span>
      <span style={S.exchangeValue}>{formatARS(exchangeRate)}</span>
      <span style={S.exchangeHint}>{t.exchangeHint}</span>
    </div>
  );
}

/* ---- Header ---- */
function Header({ view, setView, cartCount, isAdmin, t, lang, setLang }) {
  return (
    <header style={S.header}>
      <div style={S.headerInner}>
        <button style={S.brand} onClick={() => setView("tienda")}>{t.brand}</button>
        <nav style={S.nav}>
          <button style={{ ...S.navLink, ...S.navLinkVerify, ...(view === "verificar" ? S.navLinkActive : {}) }} onClick={() => setView("verificar")}>{t.verifyNav}</button>
          <div style={S.langSwitch}>
            <button style={{ ...S.langBtn, ...(lang === "es" ? S.langBtnActive : {}) }} onClick={() => setLang("es")}>ES</button>
            <span style={S.langSep}>|</span>
            <button style={{ ...S.langBtn, ...(lang === "en" ? S.langBtnActive : {}) }} onClick={() => setLang("en")}>EN</button>
          </div>
          <button style={S.cartBtn} onClick={() => setView("carrito")}>
            {t.cart}{cartCount > 0 && <span style={S.cartBadge}>{cartCount}</span>}
          </button>
        </nav>
      </div>
    </header>
  );
}

function Footer({ setView, t, isAdmin }) {
  return (
    <footer style={S.footer}>
      <div style={S.footerInner}>
        <p style={S.footerText}>{t.footerText}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <button style={S.footerLink} onClick={() => setView("verificar")}>{t.verifyFooter}</button>
          <button style={S.adminFooterBtn} onClick={() => setView(isAdmin ? "admin" : "admin-login")}>⚙</button>
        </div>
      </div>
    </footer>
  );
}

/* ---- Tienda ---- */
function Tienda({ products, onSelect, onAdd, t, exchangeRate }) {
  return (
    <div>
      <section style={S.hero}>
        <p style={S.heroEyebrow}>{t.collection}</p>
        <h1 style={S.heroTitle}>{t.heroTitle.split("\n").map((l, i) => <span key={i}>{l}{i === 0 && <br />}</span>)}</h1>
        <p style={S.heroSub}>{t.heroSub}</p>
      </section>
      <section style={S.grid}>
        {products.map((p) => (
          <article key={p.id} style={S.card} onClick={() => onSelect(p)}>
            <div style={S.cardImageWrap}>
              <img src={p.image} alt={p.name} style={S.cardImage} />
              {p.stock <= 5 && p.stock > 0 && <span style={S.lowStock}>{t.lastUnits(p.stock)}</span>}
              {p.stock === 0 && <span style={S.outStock}>{t.soldOut}</span>}
            </div>
            <div style={S.cardBody}>
              <h3 style={S.cardTitle}>{p.name}</h3>
              <p style={S.cardNotes}>{p.notes}</p>
              <div style={S.cardFooter}>
                <Price usd={p.price} exchangeRate={exchangeRate} />
                <button style={S.cardBtn} disabled={p.stock === 0} onClick={(e) => { e.stopPropagation(); onAdd(p); }}>
                  {p.stock === 0 ? t.noStock : t.addToCart}
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function Producto({ product, onAdd, onBack, t, exchangeRate }) {
  return (
    <div style={S.productPage}>
      <button style={S.backLink} onClick={onBack}>{t.back}</button>
      <div style={S.productGrid}>
        <div style={S.productImageWrap}><img src={product.image} alt={product.name} style={S.productImage} /></div>
        <div style={S.productInfo}>
          <p style={S.heroEyebrow}>{product.notes}</p>
          <h1 style={S.productTitle}>{product.name}</h1>
          <p style={S.productDesc}>{product.description}</p>
          <Price usd={product.price} exchangeRate={exchangeRate} style={{ fontSize: 22, display: "block", marginBottom: 24 }} />
          <button style={{ ...S.primaryBtn, ...(product.stock === 0 ? S.btnDisabled : {}) }} disabled={product.stock === 0} onClick={() => onAdd(product)}>
            {product.stock === 0 ? t.noStockBtn : t.addBtn}
          </button>
          <p style={S.stockNote}>{product.stock > 0 ? t.stockNote(product.stock) : t.soonBack}</p>
          <div style={S.authNote}><p style={S.authNoteText}>{t.authNote}</p></div>
        </div>
      </div>
    </div>
  );
}

/* ---- Carrito ---- */
function Carrito({ cart, products, setCart, codes, updateCodes, orders, updateOrders, updateProducts, showToast, onDone, t, lang, exchangeRate }) {
  const [step, setStep] = useState("revisar");
  const [buyer, setBuyer] = useState({ name: "", email: "" });
  const [lastOrder, setLastOrder] = useState(null);

  const items = cart.map((ci) => { const p = products.find((pp) => pp.id === ci.id); return p ? { ...p, qty: ci.qty } : null; }).filter(Boolean);
  const totalUSD = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  const updateQty = (id, qty) => {
    if (qty <= 0) setCart((prev) => prev.filter((i) => i.id !== id));
    else setCart((prev) => prev.map((i) => (i.id === id ? { ...i, qty } : i)));
  };

  const confirmPurchase = async () => {
    if (!buyer.name.trim() || !buyer.email.trim()) { showToast(t.fillFields, "error"); return; }
    const assigned = [], newlyInserted = [], updatedRows = [];
    for (const item of items) {
      for (let i = 0; i < item.qty; i++) {
        let available = await findOneAvailableCode(item.id);
        if (!available) {
          let newCode;
          do { newCode = generateCode(); } while (await codeExists(newCode));
          available = { code: newCode, productId: item.id, sold: false, createdAt: new Date().toISOString() };
          newlyInserted.push(available);
        }
        available = { ...available, sold: true, soldAt: new Date().toISOString(), buyerName: buyer.name.trim(), buyerEmail: buyer.email.trim() };
        updatedRows.push(available);
        assigned.push({ code: available.code, productName: item.name });
      }
    }
    if (newlyInserted.length > 0) await dbInsertCodes(newlyInserted.map((c) => ({ ...c, sold: false })));
    for (const c of updatedRows) await updateCodeRemote(c);
    const nextCodes = [...codes];
    for (const c of updatedRows) { const idx = nextCodes.findIndex((x) => x.code === c.code); if (idx >= 0) nextCodes[idx] = c; else nextCodes.push(c); }
    setCodes ? null : null;
    const nextProducts = products.map((p) => { const item = items.find((i) => i.id === p.id); if (!item) return p; return { ...p, stock: Math.max(0, p.stock - item.qty) }; });
    for (const item of items) { const p = nextProducts.find((pp) => pp.id === item.id); if (p) await updateStock(p.id, p.stock); }
    const order = { id: `ORD-${Date.now().toString(36).toUpperCase()}`, buyer, items: items.map((i) => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })), total: totalUSD, codes: assigned, createdAt: new Date().toISOString() };
    await dbInsertOrder(order);
    setLastOrder(order);
    setCart([]);
    setStep("confirmado");
  };

  if (items.length === 0 && step === "revisar") return (
    <div style={S.emptyState}>
      <p style={S.emptyTitle}>{t.emptyCart}</p>
      <button style={S.primaryBtn} onClick={onDone}>{t.seeCatalog}</button>
    </div>
  );

  if (step === "confirmado" && lastOrder) return (
    <div style={S.confirmWrap}>
      <p style={S.heroEyebrow}>{t.orderConfirmed}</p>
      <h2 style={S.confirmTitle}>{t.thanks(lastOrder.buyer.name.split(" ")[0])}</h2>
      <p style={S.confirmText}>{t.orderRegistered(lastOrder.id, formatUSD(lastOrder.total), lastOrder.buyer.email)}</p>
      <div style={S.confirmCodes}>
        <p style={S.confirmCodesLabel}>{t.codesAssigned}</p>
        {lastOrder.codes.map((c, idx) => (
          <div key={idx} style={S.confirmCodeRow}>
            <span style={S.mono}>{c.code}</span>
            <span style={S.confirmCodeProduct}>{c.productName}</span>
          </div>
        ))}
      </div>
      <p style={S.confirmHint}>{t.codeHint}</p>
      <button style={S.primaryBtn} onClick={onDone}>{t.backCatalog}</button>
    </div>
  );

  return (
    <div style={S.cartWrap}>
      <h2 style={S.sectionTitle}>{t.cartTitle}</h2>
      {step === "revisar" && (
        <>
          {items.map((item) => (
            <div key={item.id} style={S.cartRow}>
              <img src={item.image} alt={item.name} style={S.cartThumb} />
              <div style={S.cartRowInfo}>
                <p style={S.cartRowName}>{item.name}</p>
                <p style={S.cartRowPrice}><Price usd={item.price} exchangeRate={exchangeRate} /> {t.perUnit}</p>
              </div>
              <div style={S.qtyControl}>
                <button style={S.qtyBtn} onClick={() => updateQty(item.id, item.qty - 1)}>−</button>
                <span style={S.qtyValue}>{item.qty}</span>
                <button style={S.qtyBtn} onClick={() => updateQty(item.id, item.qty + 1)} disabled={item.qty >= item.stock}>+</button>
              </div>
              <Price usd={item.price * item.qty} exchangeRate={exchangeRate} style={{ minWidth: 120, textAlign: "right" }} />
            </div>
          ))}
          <div style={S.cartTotalRow}>
            <span>{t.total}</span>
            <Price usd={totalUSD} exchangeRate={exchangeRate} />
          </div>
          <button style={S.primaryBtn} onClick={() => setStep("datos")}>{t.continue}</button>
        </>
      )}
      {step === "datos" && (
        <div style={S.checkoutForm}>
          <p style={S.checkoutNote}>{t.checkoutNote}</p>
          <label style={S.label}>{t.fullName}</label>
          <input style={S.input} value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} />
          <label style={S.label}>{t.email}</label>
          <input style={S.input} type="email" value={buyer.email} onChange={(e) => setBuyer({ ...buyer, email: e.target.value })} />
          <div style={S.checkoutTotalRow}>
            <span>{t.totalToPay}</span>
            <Price usd={totalUSD} exchangeRate={exchangeRate} />
          </div>
          <button style={S.primaryBtn} onClick={confirmPurchase}>{t.confirmBtn}</button>
          <button style={S.ghostBtn} onClick={() => setStep("revisar")}>{t.goBack}</button>
        </div>
      )}
    </div>
  );
}

/* ---- Verificador ---- */
function Verificador({ codes, t, lang }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);

  const check = (e) => {
    e.preventDefault();
    const clean = input.trim().toUpperCase().replace(/\s/g, "");
    if (!clean.length) return;
    setChecking(true);
    setTimeout(() => {
      const found = codes.find((c) => c.code === clean);
      setResult(found && found.sold ? { valid: true, entry: found } : { valid: false });
      setChecking(false);
    }, 550);
  };

  return (
    <div style={S.verifyWrap}>
      <p style={S.heroEyebrow}>{t.verifyTitle}</p>
      <h2 style={S.sectionTitle}>{t.verifyH2}</h2>
      <p style={S.verifyHint}>{t.verifyHint}</p>
      <form onSubmit={check} style={S.verifyForm}>
        <input style={S.verifyInput} value={input} onChange={(e) => { setInput(e.target.value); setResult(null); }} placeholder="A3F7K9P2" maxLength={8} autoCapitalize="characters" />
        <button style={S.primaryBtn} type="submit" disabled={checking}>{checking ? t.verifying : t.verifyBtn}</button>
      </form>
      {(result || checking) && <SealResult checking={checking} result={result} t={t} lang={lang} />}
    </div>
  );
}

function SealResult({ checking, result, t, lang }) {
  const valid = result && result.valid;
  return (
    <div style={S.sealWrap}>
      <div style={{ ...S.sealRing, ...(checking ? S.sealRingChecking : valid ? S.sealRingValid : S.sealRingInvalid) }}>
        <div style={S.sealInner}>
          {checking ? <span style={S.sealIconNeutral}>···</span> : valid ? <span style={S.sealIconValid}>✓</span> : <span style={S.sealIconInvalid}>✕</span>}
        </div>
      </div>
      {!checking && result && (
        <div style={S.sealText}>
          {valid ? (
            <>
              <p style={S.sealTitleValid}>{t.sealValid}</p>
              <p style={S.sealSub}>{result.entry.productName} · {t.soldOn(formatDate(result.entry.soldAt, lang))}</p>
              {result.entry.buyerName && <p style={S.sealBuyerName}>{result.entry.buyerName}</p>}
              <p style={S.sealExclusive}>{t.sealExclusive}</p>
            </>
          ) : (
            <>
              <p style={S.sealTitleInvalid}>{t.sealInvalid}</p>
              <p style={S.sealSub}>{t.sealInvalidSub("soporte@cluve.com")}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ---- Admin login ---- */
function AdminLogin({ onSuccess, onBack, t }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);
  const submit = (e) => { e.preventDefault(); if (pw === ADMIN_PASSWORD) onSuccess(); else setError(true); };
  return (
    <div style={S.loginWrap}>
      <h2 style={S.sectionTitle}>{t.loginTitle}</h2>
      <p style={S.verifyHint}>{t.loginHint}</p>
      <form onSubmit={submit} style={S.checkoutForm}>
        <label style={S.label}>{t.password}</label>
        <input style={S.input} type="password" value={pw} onChange={(e) => { setPw(e.target.value); setError(false); }} autoFocus />
        {error && <p style={S.errorText}>{t.wrongPassword}</p>}
        <button style={S.primaryBtn} type="submit">{t.enter}</button>
        <button style={S.ghostBtn} type="button" onClick={onBack}>{t.back}</button>
      </form>
    </div>
  );
}

/* ---- Admin panel ---- */
function AdminPanel({ products, updateProducts, codes, updateCodes, orders, showToast, exchangeRate, updateExchangeRate, t }) {
  const [tab, setTab] = useState("productos");
  const [editing, setEditing] = useState(null);

  const saveEdit = async () => {
    const next = products.map((p) => (p.id === editing.id ? editing : p));
    await updateProducts(next, editing);
    setEditing(null);
    showToast(t.productUpdated, "ok");
  };

  const addProduct = async () => {
    const id = `p${Date.now()}`;
    const np = { id, name: "New perfume", notes: "", price: 0, stock: 0, image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&q=80", description: "" };
    await updateProducts([...products, np], np);
    setEditing(np);
  };

  const removeProduct = async (id) => {
    await updateProducts(products.filter((p) => p.id !== id), null, id);
    showToast(t.productDeleted, "info");
  };

  return (
    <div style={S.adminWrap}>
      <h2 style={S.sectionTitle}>{t.adminTitle}</h2>

      {/* ── Tipo de cambio ── */}
      <ExchangeRateEditor exchangeRate={exchangeRate} updateExchangeRate={updateExchangeRate} t={t} />

      <div style={S.tabs}>
        {["productos", "lotes", "pedidos"].map((tabId, i) => (
          <button key={tabId} style={{ ...S.tab, ...(tab === tabId ? S.tabActive : {}) }} onClick={() => setTab(tabId)}>
            {[t.tabProducts, t.tabCodes, t.tabOrders][i]}
          </button>
        ))}
      </div>

      {tab === "productos" && (
        <div>
          <button style={S.secondaryBtn} onClick={addProduct}>{t.addProduct}</button>
          <div style={S.adminGrid}>
            {products.map((p) => (
              <div key={p.id} style={S.adminCard}>
                <img src={p.image} alt={p.name} style={S.adminCardImg} />
                <div style={S.adminCardBody}>
                  <p style={S.adminCardName}>{p.name}</p>
                  <p style={S.adminCardMeta}>{formatUSD(p.price)} · stock {p.stock}</p>
                  <div style={S.adminCardActions}>
                    <button style={S.smallBtn} onClick={() => setEditing({ ...p })}>{t.edit}</button>
                    <button style={S.smallBtnDanger} onClick={() => removeProduct(p.id)}>{t.delete}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {editing && (
            <div style={S.editPanel}>
              <p style={S.editPanelTitle}>{t.editProduct}</p>
              <label style={S.label}>{t.name}</label>
              <input style={S.input} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              <label style={S.label}>{t.olfNotes}</label>
              <input style={S.input} value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              <label style={S.label}>{t.description}</label>
              <textarea style={S.textarea} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              <label style={S.label}>{t.photoUrl}</label>
              <input style={S.input} value={editing.image} onChange={(e) => setEditing({ ...editing, image: e.target.value })} />
              {editing.image && <img src={editing.image} alt="preview" style={S.previewImg} />}
              <div style={S.editRow2}>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>{t.priceUSD}</label>
                  <input style={S.input} type="number" value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>{t.stock}</label>
                  <input style={S.input} type="number" value={editing.stock} onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })} />
                </div>
              </div>
              <div style={S.editActions}>
                <button style={S.primaryBtn} onClick={saveEdit}>{t.save}</button>
                <button style={S.ghostBtn} onClick={() => setEditing(null)}>{t.cancel}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "lotes" && <LotesPanel products={products} codes={codes} updateCodes={updateCodes} showToast={showToast} t={t} />}

      {tab === "pedidos" && (
        <div style={S.ordersList}>
          {orders.length === 0 && <p style={S.emptyTitle}>{t.noOrders}</p>}
          {orders.map((o) => (
            <div key={o.id} style={S.orderCard}>
              <div style={S.orderHeader}>
                <span style={S.mono}>{o.id}</span>
                <span style={S.orderDate}>{new Date(o.createdAt).toLocaleDateString("es-AR")}</span>
              </div>
              <p style={S.orderBuyer}>{o.buyer.name} · {o.buyer.email}</p>
              <ul style={S.orderItems}>
                {o.items.map((it, idx) => <li key={idx} style={S.orderItem}>{it.qty}× {it.name} — {formatUSD(it.price * it.qty)}</li>)}
              </ul>
              <p style={S.orderTotal}>Total: {formatUSD(o.total)}</p>
              <div style={S.orderCodes}>
                {o.codes.map((c, idx) => <span key={idx} style={S.orderCodeChip}>{c.code}</span>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExchangeRateEditor({ exchangeRate, updateExchangeRate, t }) {
  const [val, setVal] = useState(String(exchangeRate));
  const [saved, setSaved] = useState(false);

  const save = () => {
    const n = parseFloat(val);
    if (!isNaN(n) && n > 0) {
      updateExchangeRate(n);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div style={S.exchangeEditorBox}>
      <p style={S.editPanelTitle}>{t.exchangeRate}</p>
      <p style={{ fontSize: 12, color: COLORS.boneMute, marginBottom: 14, lineHeight: 1.6 }}>
        {t.exchangeHint}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={S.exchangeLabel}>{t.exchangeLabel}</span>
        <input
          style={S.exchangeInput}
          value={val}
          onChange={(e) => { setVal(e.target.value); setSaved(false); }}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="1000"
        />
        <button style={S.primaryBtn} onClick={save}>
          {saved ? "✓" : t.save}
        </button>
      </div>
      {saved && <p style={{ color: COLORS.sage, fontSize: 12, marginTop: 10 }}>✓ Tipo de cambio actualizado. Los clientes ya ven el nuevo valor.</p>}
    </div>
  );
}

function LotesPanel({ products, codes, updateCodes, showToast, t }) {
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [qty, setQty] = useState(20);
  const [manualCode, setManualCode] = useState("");
  const [manualBuyer, setManualBuyer] = useState("");
  const [manualResult, setManualResult] = useState(null);

  const generateBatch = async () => {
    if (!productId || qty <= 0) return;
    const existing = new Set(codes.map((c) => c.code));
    const newOnes = [];
    while (newOnes.length < qty) {
      const code = generateCode();
      if (!existing.has(code)) { existing.add(code); newOnes.push({ code, productId, sold: false, createdAt: new Date().toISOString() }); }
    }
    await updateCodes([...codes, ...newOnes], newOnes);
    showToast(t.codesGenerated(qty), "ok");
  };

  const markAsSold = async () => {
    const clean = manualCode.trim().toUpperCase();
    if (!clean) return;
    const found = codes.find((c) => c.code === clean);
    if (!found) { setManualResult("notfound"); return; }
    if (found.sold) { setManualResult("already"); return; }
    const updated = { ...found, sold: true, soldAt: new Date().toISOString(), buyerName: manualBuyer.trim() || null, buyerEmail: null };
    await updateCodeRemote(updated);
    updateCodes(codes.map((c) => c.code === clean ? updated : c), []);
    setManualResult("ok");
    setManualCode("");
    setManualBuyer("");
    showToast(`${t.markOk}`, "ok");
  };

  const productName = (id) => products.find((p) => p.id === id)?.name || "—";
  const summary = products.map((p) => {
    const total = codes.filter((c) => c.productId === p.id).length;
    const sold = codes.filter((c) => c.productId === p.id && c.sold).length;
    return { id: p.id, name: p.name, total, sold, available: total - sold };
  });

  return (
    <div>
      <div style={S.batchForm}>
        <div style={{ flex: 1 }}>
          <label style={S.label}>{t.product}</label>
          <select style={S.input} value={productId} onChange={(e) => setProductId(e.target.value)}>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label style={S.label}>{t.codeQty}</label>
          <input style={{ ...S.input, width: 120 }} type="number" min={1} max={500} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
        </div>
        <button style={S.primaryBtn} onClick={generateBatch}>{t.generateBatch}</button>
      </div>

      <div style={S.batchSummary}>
        {summary.map((s) => (
          <div key={s.id} style={S.batchSummaryRow}>
            <span style={S.batchSummaryName}>{s.name}</span>
            <span style={S.batchSummaryNums}>{s.available} {t.available} · {s.sold} {t.sold} · {s.total} {t.generated}</span>
          </div>
        ))}
      </div>

      <div style={S.manualSellBox}>
        <p style={S.editPanelTitle}>{t.markSoldTitle}</p>
        <p style={{ fontSize: 12, color: COLORS.boneMute, marginBottom: 16, lineHeight: 1.6 }}>{t.markSoldDesc}</p>
        <div style={S.manualSellForm}>
          <div style={{ flex: 1 }}>
            <label style={S.label}>{t.codeField}</label>
            <input style={{ ...S.input, fontFamily: monoFont, letterSpacing: "0.08em", textTransform: "uppercase" }} value={manualCode} onChange={(e) => { setManualCode(e.target.value); setManualResult(null); }} placeholder="A3F7K9P2" maxLength={8} />
          </div>
          <div style={{ flex: 2 }}>
            <label style={S.label}>{t.buyerField}</label>
            <input style={S.input} value={manualBuyer} onChange={(e) => setManualBuyer(e.target.value)} placeholder={t.buyerPlaceholder} />
          </div>
          <button style={{ ...S.primaryBtn, alignSelf: "flex-end" }} onClick={markAsSold}>{t.markSoldBtn}</button>
        </div>
        {manualResult === "ok" && <p style={{ color: COLORS.sage, fontSize: 13, marginTop: 10 }}>{t.markOk}</p>}
        {manualResult === "notfound" && <p style={{ color: COLORS.terracotta, fontSize: 13, marginTop: 10 }}>{t.markNotFound}</p>}
        {manualResult === "already" && <p style={{ color: COLORS.amber, fontSize: 13, marginTop: 10 }}>{t.markAlready}</p>}
      </div>

      <p style={S.batchHint}>{t.batchHint}</p>

      <div style={S.codeTableWrap}>
        <p style={S.editPanelTitle}>{t.lastCodes}</p>
        <div style={S.codeTable}>
          {codes.slice().reverse().slice(0, 40).map((c) => (
            <div key={c.code} style={S.codeRow}>
              <span style={S.mono}>{c.code}</span>
              <span style={S.codeRowProduct}>{productName(c.productId)}</span>
              <span style={S.codeRowBuyer}>{c.buyerName || ""}</span>
              <span style={{ ...S.codeRowStatus, ...(c.sold ? S.codeSold : S.codeAvailable) }}>{c.sold ? t.vendido : t.disponible}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Toast({ toast }) {
  return (
    <div style={{ ...S.toast, ...(toast.kind === "error" ? S.toastError : toast.kind === "ok" ? S.toastOk : {}) }}>
      {toast.msg}
    </div>
  );
}

/* ============================================================ ESTILOS ============================================================ */
const COLORS = {
  bg: "#0F0D0C", surface: "#181513", surfaceAlt: "#211D19", line: "#3A332C",
  amber: "#C08B3E", amberDark: "#8C6328", amberLight: "#E0C28A",
  bone: "#EDE6DB", boneMute: "#A89C8C", sage: "#7A8B6F", sageLight: "#1C2118",
  terracotta: "#A8504A", terracottaLight: "#231613",
};
const displayFont = "'Cormorant', Georgia, serif";
const bodyFont = "'Inter', -apple-system, sans-serif";
const monoFont = "'JetBrains Mono', monospace";

const S = {
  appShell: { background: COLORS.bg, color: COLORS.bone, fontFamily: bodyFont, minHeight: "100vh", display: "flex", flexDirection: "column" },
  loadingScreen: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "400px" },
  loadingMark: { width: 56, height: 56, borderRadius: "50%", border: `1px solid ${COLORS.amber}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: displayFont, fontSize: 24, color: COLORS.amber },
  header: { borderBottom: `1px solid ${COLORS.line}`, position: "sticky", top: 0, background: "rgba(15,13,12,0.92)", backdropFilter: "blur(6px)", zIndex: 10 },
  headerInner: { maxWidth: 1100, margin: "0 auto", padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  brand: { fontFamily: displayFont, fontSize: 24, letterSpacing: "0.18em", background: "none", border: "none", color: COLORS.bone, cursor: "pointer", padding: 0, fontWeight: 500 },
  nav: { display: "flex", alignItems: "center", gap: 20 },
  navLink: { background: "none", border: "none", color: COLORS.boneMute, fontSize: 13, cursor: "pointer", padding: "6px 0", borderBottom: "1px solid transparent", fontFamily: bodyFont },
  navLinkVerify: { fontSize: 15, color: COLORS.bone, fontWeight: 500, letterSpacing: "0.01em" },
  navLinkActive: { color: COLORS.amber, borderBottom: `1px solid ${COLORS.amber}` },
  langSwitch: { display: "flex", alignItems: "center", gap: 4, border: `1px solid ${COLORS.line}`, padding: "4px 8px" },
  langBtn: { background: "none", border: "none", color: COLORS.boneMute, fontSize: 12, cursor: "pointer", fontFamily: bodyFont, padding: "2px 4px" },
  langBtnActive: { color: COLORS.amber, fontWeight: 600 },
  langSep: { color: COLORS.line, fontSize: 11 },
  cartBtn: { background: "none", border: `1px solid ${COLORS.line}`, color: COLORS.bone, fontSize: 13, cursor: "pointer", padding: "8px 16px", borderRadius: 2, position: "relative", fontFamily: bodyFont },
  cartBadge: { position: "absolute", top: -8, right: -8, background: COLORS.amber, color: COLORS.bg, fontSize: 11, fontWeight: 600, borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" },
  exchangeEditorBox: { background: COLORS.surface, border: `1px solid ${COLORS.line}`, padding: "20px 24px", marginBottom: 28 },
  exchangeLabel: { fontSize: 12, color: COLORS.boneMute, fontFamily: monoFont },
  exchangeValue: { fontSize: 13, color: COLORS.amberLight, fontFamily: monoFont },
  exchangeInput: { background: COLORS.bg, border: `1px solid ${COLORS.amber}`, color: COLORS.bone, padding: "4px 10px", fontSize: 13, fontFamily: monoFont, width: 100, outline: "none" },
  exchangeBtn: { background: COLORS.amber, border: "none", color: COLORS.bg, padding: "4px 10px", fontSize: 12, cursor: "pointer", fontWeight: 600 },
  exchangeBtnCancel: { background: "none", border: `1px solid ${COLORS.line}`, color: COLORS.boneMute, padding: "4px 10px", fontSize: 12, cursor: "pointer" },
  exchangeEditBtn: { background: "none", border: "none", color: COLORS.amber, fontSize: 11, cursor: "pointer", padding: "2px 6px", fontFamily: bodyFont },
  exchangeHint: { fontSize: 11, color: COLORS.boneMute, marginLeft: 8 },
  main: { flex: 1, maxWidth: 1100, margin: "0 auto", padding: "0 28px", width: "100%", boxSizing: "border-box" },
  hero: { padding: "64px 0 48px", maxWidth: 640 },
  heroEyebrow: { fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: COLORS.amber, marginBottom: 14, fontFamily: bodyFont },
  heroTitle: { fontFamily: displayFont, fontSize: 46, lineHeight: 1.15, fontWeight: 500, margin: "0 0 20px" },
  heroSub: { fontSize: 16, lineHeight: 1.7, color: COLORS.boneMute, maxWidth: 520 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 28, paddingBottom: 80 },
  card: { background: COLORS.surface, border: `1px solid ${COLORS.line}`, cursor: "pointer", display: "flex", flexDirection: "column" },
  cardImageWrap: { position: "relative", aspectRatio: "4 / 5", overflow: "hidden" },
  cardImage: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  lowStock: { position: "absolute", top: 12, left: 12, background: COLORS.amberDark, color: COLORS.bone, fontSize: 11, padding: "4px 10px" },
  outStock: { position: "absolute", top: 12, left: 12, background: COLORS.surfaceAlt, color: COLORS.boneMute, fontSize: 11, padding: "4px 10px", border: `1px solid ${COLORS.line}` },
  cardBody: { padding: "20px 22px 22px", display: "flex", flexDirection: "column", gap: 6, flex: 1 },
  cardTitle: { fontFamily: displayFont, fontSize: 22, fontWeight: 500, margin: 0 },
  cardNotes: { fontSize: 13, color: COLORS.boneMute, margin: 0, flex: 1 },
  cardFooter: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 },
  cardBtn: { background: "none", border: `1px solid ${COLORS.amber}`, color: COLORS.amber, fontSize: 12, padding: "8px 16px", cursor: "pointer", letterSpacing: "0.04em", fontFamily: bodyFont },
  productPage: { padding: "40px 0 80px" },
  backLink: { background: "none", border: "none", color: COLORS.boneMute, fontSize: 13, cursor: "pointer", marginBottom: 32, padding: 0, fontFamily: bodyFont },
  productGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56 },
  productImageWrap: { aspectRatio: "4 / 5", overflow: "hidden", background: COLORS.surface },
  productImage: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  productInfo: { display: "flex", flexDirection: "column" },
  productTitle: { fontFamily: displayFont, fontSize: 40, fontWeight: 500, margin: "0 0 18px" },
  productDesc: { fontSize: 15, lineHeight: 1.8, color: COLORS.boneMute, marginBottom: 24 },
  stockNote: { fontSize: 13, color: COLORS.boneMute, marginTop: 14 },
  authNote: { marginTop: 40, paddingTop: 24, borderTop: `1px solid ${COLORS.line}` },
  authNoteText: { fontSize: 13, lineHeight: 1.7, color: COLORS.boneMute },
  primaryBtn: { background: COLORS.amber, color: COLORS.bg, border: "none", padding: "14px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer", letterSpacing: "0.03em", fontFamily: bodyFont },
  btnDisabled: { opacity: 0.4, cursor: "not-allowed" },
  secondaryBtn: { background: "none", border: `1px solid ${COLORS.amber}`, color: COLORS.amber, padding: "10px 20px", fontSize: 13, cursor: "pointer", marginBottom: 24, fontFamily: bodyFont },
  ghostBtn: { background: "none", border: "none", color: COLORS.boneMute, padding: "12px 0", fontSize: 13, cursor: "pointer", textAlign: "left", fontFamily: bodyFont },
  emptyState: { padding: "80px 0", textAlign: "center" },
  emptyTitle: { color: COLORS.boneMute, fontSize: 15, marginBottom: 20 },
  cartWrap: { padding: "48px 0 80px", maxWidth: 700 },
  sectionTitle: { fontFamily: displayFont, fontSize: 32, fontWeight: 500, marginBottom: 28 },
  cartRow: { display: "flex", alignItems: "center", gap: 16, padding: "16px 0", borderBottom: `1px solid ${COLORS.line}` },
  cartThumb: { width: 64, height: 64, objectFit: "cover" },
  cartRowInfo: { flex: 1 },
  cartRowName: { fontSize: 15, margin: 0 },
  cartRowPrice: { fontSize: 13, color: COLORS.boneMute, margin: "4px 0 0" },
  qtyControl: { display: "flex", alignItems: "center", gap: 10 },
  qtyBtn: { width: 28, height: 28, background: "none", border: `1px solid ${COLORS.line}`, color: COLORS.bone, cursor: "pointer", fontSize: 15 },
  qtyValue: { fontFamily: monoFont, fontSize: 14, minWidth: 16, textAlign: "center" },
  cartTotalRow: { display: "flex", justifyContent: "space-between", padding: "24px 0", fontSize: 16 },
  checkoutForm: { display: "flex", flexDirection: "column", gap: 4, maxWidth: 420 },
  checkoutNote: { fontSize: 12, color: COLORS.boneMute, marginBottom: 16, lineHeight: 1.6, fontStyle: "italic" },
  checkoutTotalRow: { display: "flex", justifyContent: "space-between", padding: "20px 0", fontSize: 16, borderTop: `1px solid ${COLORS.line}`, marginTop: 12 },
  label: { fontSize: 12, color: COLORS.boneMute, marginTop: 14, marginBottom: 6, letterSpacing: "0.02em" },
  input: { background: COLORS.surface, border: `1px solid ${COLORS.line}`, color: COLORS.bone, padding: "11px 14px", fontSize: 14, fontFamily: bodyFont, outline: "none" },
  textarea: { background: COLORS.surface, border: `1px solid ${COLORS.line}`, color: COLORS.bone, padding: "11px 14px", fontSize: 14, fontFamily: bodyFont, outline: "none", minHeight: 80, resize: "vertical" },
  errorText: { color: COLORS.terracotta, fontSize: 12, marginTop: 8 },
  confirmWrap: { padding: "56px 0 80px", maxWidth: 540 },
  confirmTitle: { fontFamily: displayFont, fontSize: 34, fontWeight: 500, margin: "10px 0 16px" },
  confirmText: { fontSize: 14, lineHeight: 1.7, color: COLORS.boneMute, marginBottom: 28 },
  mono: { fontFamily: monoFont, color: COLORS.amberLight, letterSpacing: "0.04em" },
  confirmCodes: { background: COLORS.surface, border: `1px solid ${COLORS.line}`, padding: 20, marginBottom: 20 },
  confirmCodesLabel: { fontSize: 12, color: COLORS.boneMute, marginBottom: 12, letterSpacing: "0.04em", textTransform: "uppercase" },
  confirmCodeRow: { display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 14 },
  confirmCodeProduct: { color: COLORS.boneMute, fontSize: 13 },
  confirmHint: { fontSize: 12, color: COLORS.boneMute, lineHeight: 1.7, marginBottom: 28 },
  verifyWrap: { padding: "56px 0 80px", maxWidth: 480 },
  verifyHint: { fontSize: 14, color: COLORS.boneMute, marginBottom: 32, lineHeight: 1.6 },
  verifyForm: { display: "flex", gap: 12, marginBottom: 8 },
  verifyInput: { flex: 1, background: COLORS.surface, border: `1px solid ${COLORS.line}`, color: COLORS.bone, padding: "13px 16px", fontSize: 18, fontFamily: monoFont, letterSpacing: "0.12em", outline: "none", textTransform: "uppercase" },
  sealWrap: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginTop: 56 },
  sealRing: { width: 132, height: 132, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid", transition: "all 0.4s ease" },
  sealRingChecking: { borderColor: COLORS.line, background: COLORS.surface },
  sealRingValid: { borderColor: COLORS.sage, background: COLORS.sageLight, boxShadow: `0 0 0 1px ${COLORS.sage} inset` },
  sealRingInvalid: { borderColor: COLORS.terracotta, background: COLORS.terracottaLight, boxShadow: `0 0 0 1px ${COLORS.terracotta} inset` },
  sealInner: { width: 96, height: 96, borderRadius: "50%", border: `1px solid ${COLORS.line}`, display: "flex", alignItems: "center", justifyContent: "center" },
  sealIconNeutral: { fontSize: 22, color: COLORS.boneMute, letterSpacing: 2 },
  sealIconValid: { fontSize: 36, color: COLORS.sage },
  sealIconInvalid: { fontSize: 30, color: COLORS.terracotta },
  sealText: { marginTop: 24, maxWidth: 380 },
  sealTitleValid: { fontFamily: displayFont, fontSize: 26, color: COLORS.sage, fontWeight: 500, margin: "0 0 8px" },
  sealTitleInvalid: { fontFamily: displayFont, fontSize: 22, color: COLORS.terracotta, fontWeight: 500, margin: "0 0 8px" },
  sealSub: { fontSize: 13, color: COLORS.boneMute, margin: "0 0 14px" },
  sealBuyerName: { fontFamily: displayFont, fontSize: 20, color: COLORS.amberLight, fontStyle: "italic", margin: "10px 0 4px", letterSpacing: "0.02em" },
  sealExclusive: { fontSize: 13, lineHeight: 1.7, color: COLORS.bone },
  loginWrap: { padding: "56px 0 80px", maxWidth: 420 },
  adminWrap: { padding: "40px 0 80px" },
  tabs: { display: "flex", gap: 4, borderBottom: `1px solid ${COLORS.line}`, marginBottom: 28 },
  tab: { background: "none", border: "none", color: COLORS.boneMute, padding: "10px 18px", fontSize: 13, cursor: "pointer", borderBottom: "2px solid transparent", marginBottom: -1, fontFamily: bodyFont },
  tabActive: { color: COLORS.amber, borderBottom: `2px solid ${COLORS.amber}` },
  adminGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18, marginTop: 4 },
  adminCard: { background: COLORS.surface, border: `1px solid ${COLORS.line}` },
  adminCardImg: { width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" },
  adminCardBody: { padding: 14 },
  adminCardName: { fontSize: 14, margin: "0 0 4px" },
  adminCardMeta: { fontSize: 12, color: COLORS.boneMute, margin: "0 0 12px", fontFamily: monoFont },
  adminCardActions: { display: "flex", gap: 8 },
  smallBtn: { background: "none", border: `1px solid ${COLORS.line}`, color: COLORS.bone, fontSize: 11, padding: "6px 12px", cursor: "pointer", fontFamily: bodyFont },
  smallBtnDanger: { background: "none", border: `1px solid ${COLORS.terracotta}`, color: COLORS.terracotta, fontSize: 11, padding: "6px 12px", cursor: "pointer", fontFamily: bodyFont },
  editPanel: { marginTop: 32, padding: 24, background: COLORS.surface, border: `1px solid ${COLORS.line}`, maxWidth: 480 },
  editPanelTitle: { fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase", color: COLORS.amber, marginBottom: 4 },
  previewImg: { width: 100, height: 100, objectFit: "cover", marginTop: 10 },
  editRow2: { display: "flex", gap: 16, marginTop: 4 },
  editActions: { display: "flex", gap: 12, marginTop: 24, alignItems: "center" },
  batchForm: { display: "flex", gap: 16, alignItems: "flex-end", marginBottom: 28, flexWrap: "wrap" },
  batchSummary: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 },
  batchSummaryRow: { display: "flex", justifyContent: "space-between", fontSize: 13, padding: "10px 0", borderBottom: `1px solid ${COLORS.line}` },
  batchSummaryName: { color: COLORS.bone },
  batchSummaryNums: { color: COLORS.boneMute, fontFamily: monoFont, fontSize: 12 },
  batchHint: { fontSize: 12, color: COLORS.boneMute, lineHeight: 1.7, marginBottom: 32, maxWidth: 560 },
  manualSellBox: { margin: "28px 0", padding: 24, background: COLORS.surface, border: `1px solid ${COLORS.line}` },
  manualSellForm: { display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap" },
  codeTableWrap: { marginTop: 8 },
  codeTable: { display: "flex", flexDirection: "column" },
  codeRow: { display: "grid", gridTemplateColumns: "120px 1fr 1fr 100px", gap: 12, padding: "8px 0", borderBottom: `1px solid ${COLORS.line}`, alignItems: "center" },
  codeRowProduct: { fontSize: 13, color: COLORS.boneMute },
  codeRowBuyer: { fontSize: 12, color: COLORS.amberLight, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  codeRowStatus: { fontSize: 11, padding: "4px 10px", textAlign: "center", letterSpacing: "0.02em" },
  codeSold: { background: COLORS.sageLight, color: COLORS.sage, border: `1px solid ${COLORS.sage}` },
  codeAvailable: { background: COLORS.surfaceAlt, color: COLORS.boneMute, border: `1px solid ${COLORS.line}` },
  ordersList: { display: "flex", flexDirection: "column", gap: 16 },
  orderCard: { background: COLORS.surface, border: `1px solid ${COLORS.line}`, padding: 20 },
  orderHeader: { display: "flex", justifyContent: "space-between", marginBottom: 10 },
  orderDate: { fontSize: 12, color: COLORS.boneMute },
  orderBuyer: { fontSize: 13, color: COLORS.boneMute, marginBottom: 12 },
  orderItems: { listStyle: "none", padding: 0, margin: "0 0 12px", fontSize: 13, lineHeight: 1.8 },
  orderItem: {},
  orderTotal: { fontSize: 14, color: COLORS.amberLight, fontFamily: monoFont, marginBottom: 12 },
  orderCodes: { display: "flex", flexWrap: "wrap", gap: 8 },
  orderCodeChip: { fontFamily: monoFont, fontSize: 11, padding: "4px 10px", background: COLORS.surfaceAlt, border: `1px solid ${COLORS.line}`, color: COLORS.amberLight },
  footer: { borderTop: `1px solid ${COLORS.line}`, marginTop: 40 },
  footerInner: { maxWidth: 1100, margin: "0 auto", padding: "28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 },
  footerText: { fontSize: 12, color: COLORS.boneMute, margin: 0 },
  footerLink: { background: "none", border: "none", color: COLORS.amber, fontSize: 12, cursor: "pointer", padding: 0, fontFamily: bodyFont },
  adminFooterBtn: { background: "none", border: "none", color: COLORS.line, fontSize: 14, cursor: "pointer", padding: "4px 6px", fontFamily: bodyFont, opacity: 0.5 },
  toast: { position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: COLORS.surfaceAlt, border: `1px solid ${COLORS.line}`, color: COLORS.bone, padding: "12px 22px", fontSize: 13, zIndex: 50 },
  toastOk: { borderColor: COLORS.sage, color: COLORS.sage },
  toastError: { borderColor: COLORS.terracotta, color: COLORS.terracotta },
};
