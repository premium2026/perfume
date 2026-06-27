import React, { useState, useEffect, useCallback, useRef } from "react";
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
} from "./supabaseClient";

/* ============================================================
   CLUVÉ — tienda de perfumes de autor + sello de autenticidad
   ============================================================
   Paleta:
     fondo     #0F0D0C  (negro cálido)
     superficie #181513
     línea     #3A332C
     ámbar     #C08B3E  (acento)
     ámbar-d   #8C6328
     hueso     #EDE6DB
     hueso-mute#A89C8C
     salvia    #7A8B6F  (válido)
     terracota #A8504A  (inválido)
   Tipografía:
     display: 'Cormorant', serif
     cuerpo:  'Inter', sans-serif
     mono:    'JetBrains Mono', monospace
   ============================================================ */

const FONTS_LINK = "https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap";

const ADMIN_PASSWORD = "esencia2026";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin O/0/I/1 para evitar confusión

function generateCode() {
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

function formatARS(n) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
}

/* Los datos viven en Supabase (ver supabaseClient.js). No hay seed local:
   el catálogo inicial ya fue insertado por supabase-setup.sql */

/* ============================================================ */

export default function App() {
  const [view, setView] = useState("tienda"); // tienda | producto | carrito | verificar | admin | admin-login
  const [products, setProducts] = useState(null);
  const [codes, setCodes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeProduct, setActiveProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    (async () => {
      const [p, c, o] = await Promise.all([dbLoadProducts(), dbLoadCodes(), dbLoadOrders()]);
      setProducts(p);
      setCodes(c);
      setOrders(o);
      setLoading(false);
    })();
  }, []);

  const showToast = useCallback((msg, kind = "info") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 2800);
  }, []);

  const updateProducts = useCallback(async (next, changedProduct, deletedId) => {
    setProducts(next);
    if (deletedId) {
      await deleteProductRemote(deletedId);
    } else if (changedProduct) {
      await dbSaveProduct(changedProduct);
    }
  }, []);

  const updateCodes = useCallback(async (next, newOnes) => {
    setCodes(next);
    if (newOnes && newOnes.length > 0) {
      await dbInsertCodes(newOnes);
    }
  }, []);

  const updateOrders = useCallback(async (next) => {
    setOrders(next);
  }, []);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { id: product.id, qty: 1 }];
    });
    showToast(`${product.name} agregado al carrito`, "ok");
  };

  if (loading) {
    return (
      <div style={S.appShell}>
        <FontLoad />
        <div style={S.loadingScreen}>
          <div style={S.loadingMark}>E</div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.appShell}>
      <FontLoad />
      <Header view={view} setView={setView} cartCount={cart.reduce((a, i) => a + i.qty, 0)} isAdmin={isAdmin} />
      <main style={S.main}>
        {view === "tienda" && (
          <Tienda
            products={products}
            onSelect={(p) => {
              setActiveProduct(p);
              setView("producto");
            }}
            onAdd={addToCart}
          />
        )}
        {view === "producto" && activeProduct && (
          <Producto product={activeProduct} onAdd={addToCart} onBack={() => setView("tienda")} />
        )}
        {view === "carrito" && (
          <Carrito
            cart={cart}
            products={products}
            setCart={setCart}
            codes={codes}
            updateCodes={updateCodes}
            orders={orders}
            updateOrders={updateOrders}
            updateProducts={updateProducts}
            showToast={showToast}
            onDone={() => setView("tienda")}
          />
        )}
        {view === "verificar" && <Verificador codes={codes} />}
        {view === "admin-login" && (
          <AdminLogin
            onSuccess={() => {
              setIsAdmin(true);
              setView("admin");
            }}
            onBack={() => setView("tienda")}
          />
        )}
        {view === "admin" && isAdmin && (
          <AdminPanel
            products={products}
            updateProducts={updateProducts}
            codes={codes}
            updateCodes={updateCodes}
            orders={orders}
            showToast={showToast}
          />
        )}
      </main>
      <Footer setView={setView} />
      {toast && <Toast toast={toast} />}
    </div>
  );
}

function FontLoad() {
  return <link rel="stylesheet" href={FONTS_LINK} />;
}

/* ---------------- Header ---------------- */
function Header({ view, setView, cartCount, isAdmin }) {
  return (
    <header style={S.header}>
      <div style={S.headerInner}>
        <button style={S.brand} onClick={() => setView("tienda")} aria-label="Ir al inicio">
          ESENCIA ORIGINAL
        </button>
        <nav style={S.nav}>
          <button
            style={{ ...S.navLink, ...(view === "verificar" ? S.navLinkActive : {}) }}
            onClick={() => setView("verificar")}
          >
            Verificar autenticidad
          </button>
          <button
            style={{ ...S.navLink, ...(view === "admin" || view === "admin-login" ? S.navLinkActive : {}) }}
            onClick={() => setView(isAdmin ? "admin" : "admin-login")}
          >
            {isAdmin ? "Panel" : "Acceso tienda"}
          </button>
          <button style={S.cartBtn} onClick={() => setView("carrito")} aria-label="Ver carrito">
            Carrito
            {cartCount > 0 && <span style={S.cartBadge}>{cartCount}</span>}
          </button>
        </nav>
      </div>
    </header>
  );
}

function Footer({ setView }) {
  return (
    <footer style={S.footer}>
      <div style={S.footerInner}>
        <p style={S.footerText}>Esencia Original — perfumes de autor, hechos en lotes pequeños.</p>
        <button style={S.footerLink} onClick={() => setView("verificar")}>
          Verificar un código de envase ↗
        </button>
      </div>
    </footer>
  );
}

/* ---------------- Tienda (catálogo) ---------------- */
function Tienda({ products, onSelect, onAdd }) {
  return (
    <div>
      <section style={S.hero}>
        <p style={S.heroEyebrow}>Colección actual</p>
        <h1 style={S.heroTitle}>Cada frasco lleva un sello.<br />Cada sello, una historia.</h1>
        <p style={S.heroSub}>
          Fragancias formuladas y embotelladas en lotes pequeños. El código grabado en tu envase confirma que es nuestro, y solo nuestro.
        </p>
      </section>

      <section style={S.grid}>
        {products.map((p) => (
          <article key={p.id} style={S.card} onClick={() => onSelect(p)}>
            <div style={S.cardImageWrap}>
              <img src={p.image} alt={p.name} style={S.cardImage} />
              {p.stock <= 5 && p.stock > 0 && <span style={S.lowStock}>Últimas {p.stock} unidades</span>}
              {p.stock === 0 && <span style={S.outStock}>Agotado</span>}
            </div>
            <div style={S.cardBody}>
              <h3 style={S.cardTitle}>{p.name}</h3>
              <p style={S.cardNotes}>{p.notes}</p>
              <div style={S.cardFooter}>
                <span style={S.cardPrice}>{formatARS(p.price)}</span>
                <button
                  style={S.cardBtn}
                  disabled={p.stock === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdd(p);
                  }}
                >
                  {p.stock === 0 ? "Sin stock" : "Agregar"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function Producto({ product, onAdd, onBack }) {
  return (
    <div style={S.productPage}>
      <button style={S.backLink} onClick={onBack}>
        ← Volver al catálogo
      </button>
      <div style={S.productGrid}>
        <div style={S.productImageWrap}>
          <img src={product.image} alt={product.name} style={S.productImage} />
        </div>
        <div style={S.productInfo}>
          <p style={S.heroEyebrow}>{product.notes}</p>
          <h1 style={S.productTitle}>{product.name}</h1>
          <p style={S.productDesc}>{product.description}</p>
          <p style={S.productPrice}>{formatARS(product.price)}</p>
          <button
            style={{ ...S.primaryBtn, ...(product.stock === 0 ? S.btnDisabled : {}) }}
            disabled={product.stock === 0}
            onClick={() => onAdd(product)}
          >
            {product.stock === 0 ? "Sin stock por el momento" : "Agregar al carrito"}
          </button>
          <p style={S.stockNote}>
            {product.stock > 0 ? `${product.stock} unidades disponibles` : "Volveremos a tener stock pronto"}
          </p>
          <div style={S.authNote}>
            <p style={S.authNoteText}>
              Cada unidad incluye un código de 8 caracteres grabado en la base del frasco. Tras la compra, podés verificarlo en
              "Verificar autenticidad".
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Carrito + checkout simulado ---------------- */
function Carrito({ cart, products, setCart, codes, updateCodes, orders, updateOrders, updateProducts, showToast, onDone }) {
  const [step, setStep] = useState("revisar"); // revisar | datos | confirmado
  const [buyer, setBuyer] = useState({ name: "", email: "" });
  const [lastOrder, setLastOrder] = useState(null);

  const items = cart
    .map((ci) => {
      const p = products.find((pp) => pp.id === ci.id);
      return p ? { ...p, qty: ci.qty } : null;
    })
    .filter(Boolean);

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  const updateQty = (id, qty) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.id !== id));
    } else {
      setCart((prev) => prev.map((i) => (i.id === id ? { ...i, qty } : i)));
    }
  };

  const confirmPurchase = async () => {
    if (!buyer.name.trim() || !buyer.email.trim()) {
      showToast("Completá nombre y email para continuar", "error");
      return;
    }

    const assigned = [];
    const newlyInsertedCodes = [];
    const updatedCodeRows = [];

    for (const item of items) {
      for (let i = 0; i < item.qty; i++) {
        let available = await findOneAvailableCode(item.id);
        if (!available) {
          // generar uno nuevo al vuelo si el lote se quedó corto
          let newCode;
          do {
            newCode = generateCode();
          } while (await codeExists(newCode));
          available = {
            code: newCode,
            productId: item.id,
            sold: false,
            createdAt: new Date().toISOString(),
          };
          newlyInsertedCodes.push(available);
        }
        available.sold = true;
        available.soldAt = new Date().toISOString();
        available.buyerName = buyer.name.trim();
        available.buyerEmail = buyer.email.trim();
        updatedCodeRows.push(available);
        assigned.push({ code: available.code, productName: item.name });
      }
    }

    if (newlyInsertedCodes.length > 0) {
      await dbInsertCodes(newlyInsertedCodes.map((c) => ({ ...c, sold: false })));
    }
    for (const c of updatedCodeRows) {
      await updateCodeRemote(c);
    }
    const nextCodes = [...codes];
    for (const c of updatedCodeRows) {
      const idx = nextCodes.findIndex((x) => x.code === c.code);
      if (idx >= 0) nextCodes[idx] = c;
      else nextCodes.push(c);
    }
    setCodes(nextCodes);

    // descontar stock
    const nextProducts = products.map((p) => {
      const item = items.find((i) => i.id === p.id);
      if (!item) return p;
      return { ...p, stock: Math.max(0, p.stock - item.qty) };
    });
    setProducts(nextProducts);
    for (const item of items) {
      const p = nextProducts.find((pp) => pp.id === item.id);
      if (p) await updateStock(p.id, p.stock);
    }

    const order = {
      id: `ORD-${Date.now().toString(36).toUpperCase()}`,
      buyer,
      items: items.map((i) => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
      total,
      codes: assigned,
      createdAt: new Date().toISOString(),
    };
    await dbInsertOrder(order);
    setOrders([order, ...orders]);

    setLastOrder(order);
    setCart([]);
    setStep("confirmado");
  };

  if (items.length === 0 && step === "revisar") {
    return (
      <div style={S.emptyState}>
        <p style={S.emptyTitle}>Tu carrito está vacío</p>
        <button style={S.primaryBtn} onClick={onDone}>
          Ver catálogo
        </button>
      </div>
    );
  }

  if (step === "confirmado" && lastOrder) {
    return (
      <div style={S.confirmWrap}>
        <p style={S.heroEyebrow}>Pedido confirmado</p>
        <h2 style={S.confirmTitle}>Gracias, {lastOrder.buyer.name.split(" ")[0]}</h2>
        <p style={S.confirmText}>
          Tu pedido <span style={S.mono}>{lastOrder.id}</span> fue registrado por {formatARS(lastOrder.total)}. Te enviamos la
          confirmación a {lastOrder.buyer.email}.
        </p>
        <div style={S.confirmCodes}>
          <p style={S.confirmCodesLabel}>Códigos asignados a tus envases</p>
          {lastOrder.codes.map((c, idx) => (
            <div key={idx} style={S.confirmCodeRow}>
              <span style={S.mono}>{c.code}</span>
              <span style={S.confirmCodeProduct}>{c.productName}</span>
            </div>
          ))}
        </div>
        <p style={S.confirmHint}>
          Este código también vendrá grabado en la base del frasco. Guardalo: podés usarlo en cualquier momento desde
          "Verificar autenticidad".
        </p>
        <button style={S.primaryBtn} onClick={onDone}>
          Volver al catálogo
        </button>
      </div>
    );
  }

  return (
    <div style={S.cartWrap}>
      <h2 style={S.sectionTitle}>Tu carrito</h2>

      {step === "revisar" && (
        <>
          {items.map((item) => (
            <div key={item.id} style={S.cartRow}>
              <img src={item.image} alt={item.name} style={S.cartThumb} />
              <div style={S.cartRowInfo}>
                <p style={S.cartRowName}>{item.name}</p>
                <p style={S.cartRowPrice}>{formatARS(item.price)} c/u</p>
              </div>
              <div style={S.qtyControl}>
                <button style={S.qtyBtn} onClick={() => updateQty(item.id, item.qty - 1)} aria-label="Quitar uno">
                  −
                </button>
                <span style={S.qtyValue}>{item.qty}</span>
                <button
                  style={S.qtyBtn}
                  onClick={() => updateQty(item.id, item.qty + 1)}
                  disabled={item.qty >= item.stock}
                  aria-label="Agregar uno"
                >
                  +
                </button>
              </div>
              <span style={S.cartLineTotal}>{formatARS(item.price * item.qty)}</span>
            </div>
          ))}
          <div style={S.cartTotalRow}>
            <span>Total</span>
            <span style={S.cartTotalValue}>{formatARS(total)}</span>
          </div>
          <button style={S.primaryBtn} onClick={() => setStep("datos")}>
            Continuar
          </button>
        </>
      )}

      {step === "datos" && (
        <div style={S.checkoutForm}>
          <p style={S.checkoutNote}>
            Esta es una demostración funcional. Para producción real, este paso se conecta a un procesador de pagos (te lo
            explico al final).
          </p>
          <label style={S.label}>Nombre completo</label>
          <input
            style={S.input}
            value={buyer.name}
            onChange={(e) => setBuyer({ ...buyer, name: e.target.value })}
            placeholder="Tu nombre"
          />
          <label style={S.label}>Email</label>
          <input
            style={S.input}
            type="email"
            value={buyer.email}
            onChange={(e) => setBuyer({ ...buyer, email: e.target.value })}
            placeholder="tu@email.com"
          />
          <div style={S.checkoutTotalRow}>
            <span>Total a pagar</span>
            <span style={S.cartTotalValue}>{formatARS(total)}</span>
          </div>
          <button style={S.primaryBtn} onClick={confirmPurchase}>
            Confirmar compra
          </button>
          <button style={S.ghostBtn} onClick={() => setStep("revisar")}>
            Volver
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Verificador de autenticidad ---------------- */
function Verificador({ codes }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null); // null | {valid, code}
  const [checking, setChecking] = useState(false);

  const check = (e) => {
    e.preventDefault();
    const clean = input.trim().toUpperCase().replace(/\s/g, "");
    if (clean.length === 0) return;
    setChecking(true);
    setTimeout(() => {
      const found = codes.find((c) => c.code === clean);
      if (found && found.sold) {
        setResult({ valid: true, entry: found });
      } else {
        setResult({ valid: false });
      }
      setChecking(false);
    }, 550);
  };

  return (
    <div style={S.verifyWrap}>
      <p style={S.heroEyebrow}>Sello de autenticidad</p>
      <h2 style={S.sectionTitle}>Verificá tu frasco</h2>
      <p style={S.verifyHint}>Ingresá el código de 8 caracteres grabado en la base del envase.</p>

      <form onSubmit={check} style={S.verifyForm}>
        <input
          style={S.verifyInput}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setResult(null);
          }}
          placeholder="A3F7K9P2"
          maxLength={8}
          autoCapitalize="characters"
        />
        <button style={S.primaryBtn} type="submit" disabled={checking}>
          {checking ? "Verificando…" : "Verificar"}
        </button>
      </form>

      {(result || checking) && (
        <SealResult checking={checking} result={result} />
      )}
    </div>
  );
}

function SealResult({ checking, result }) {
  const valid = result && result.valid;
  return (
    <div style={S.sealWrap}>
      <div
        style={{
          ...S.sealRing,
          ...(checking ? S.sealRingChecking : valid ? S.sealRingValid : S.sealRingInvalid),
        }}
      >
        <div style={S.sealInner}>
          {checking ? (
            <span style={S.sealIconNeutral}>···</span>
          ) : valid ? (
            <span style={S.sealIconValid}>✓</span>
          ) : (
            <span style={S.sealIconInvalid}>✕</span>
          )}
        </div>
      </div>

      {!checking && result && (
        <div style={S.sealText}>
          {valid ? (
            <>
              <p style={S.sealTitleValid}>Producto Original</p>
              <p style={S.sealSub}>
                {result.entry.productName || "Tu producto"} · vendido el {formatDate(result.entry.soldAt)}
              </p>
              {(result.entry.buyerName) && (
                <p style={S.sealBuyerName}>{result.entry.buyerName}</p>
              )}
              <p style={S.sealExclusive}>
                Esta unidad pertenece a un lote limitado, formulado y embotellado a mano. Gracias por llevar una pieza
                genuina de Esencia Original.
              </p>
            </>
          ) : (
            <>
              <p style={S.sealTitleInvalid}>No pudimos confirmar este código</p>
              <p style={S.sealSub}>
                Revisá que esté bien escrito. Si el código es correcto y no figura como vendido por nosotros, escribinos a
                soporte@esenciaoriginal.com.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- Admin: login ---------------- */
function AdminLogin({ onSuccess, onBack }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (pw === ADMIN_PASSWORD) {
      onSuccess();
    } else {
      setError(true);
    }
  };

  return (
    <div style={S.loginWrap}>
      <h2 style={S.sectionTitle}>Acceso de tienda</h2>
      <p style={S.verifyHint}>Panel interno para gestionar precios, fotos, stock y lotes de códigos.</p>
      <form onSubmit={submit} style={S.checkoutForm}>
        <label style={S.label}>Contraseña</label>
        <input
          style={S.input}
          type="password"
          value={pw}
          onChange={(e) => {
            setPw(e.target.value);
            setError(false);
          }}
          autoFocus
        />
        {error && <p style={S.errorText}>Contraseña incorrecta</p>}
        <button style={S.primaryBtn} type="submit">
          Ingresar
        </button>
        <button style={S.ghostBtn} type="button" onClick={onBack}>
          Volver a la tienda
        </button>
      </form>
    </div>
  );
}

/* ---------------- Admin panel ---------------- */
function AdminPanel({ products, updateProducts, codes, updateCodes, orders, showToast }) {
  const [tab, setTab] = useState("productos"); // productos | lotes | pedidos
  const [editing, setEditing] = useState(null); // product object being edited

  const startEdit = (p) => setEditing({ ...p });
  const cancelEdit = () => setEditing(null);

  const saveEdit = async () => {
    const next = products.map((p) => (p.id === editing.id ? editing : p));
    await updateProducts(next, editing);
    setEditing(null);
    showToast("Producto actualizado", "ok");
  };

  const addProduct = async () => {
    const id = `p${Date.now()}`;
    const newProduct = {
      id,
      name: "Nuevo perfume",
      notes: "Notas por definir",
      price: 0,
      stock: 0,
      image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&q=80",
      description: "Descripción pendiente.",
    };
    await updateProducts([...products, newProduct], newProduct);
    setEditing(newProduct);
  };

  const removeProduct = async (id) => {
    await updateProducts(products.filter((p) => p.id !== id), null, id);
    showToast("Producto eliminado", "info");
  };

  return (
    <div style={S.adminWrap}>
      <h2 style={S.sectionTitle}>Panel de tienda</h2>

      <div style={S.tabs}>
        <button style={{ ...S.tab, ...(tab === "productos" ? S.tabActive : {}) }} onClick={() => setTab("productos")}>
          Productos
        </button>
        <button style={{ ...S.tab, ...(tab === "lotes" ? S.tabActive : {}) }} onClick={() => setTab("lotes")}>
          Lotes de códigos
        </button>
        <button style={{ ...S.tab, ...(tab === "pedidos" ? S.tabActive : {}) }} onClick={() => setTab("pedidos")}>
          Pedidos
        </button>
      </div>

      {tab === "productos" && (
        <div>
          <button style={S.secondaryBtn} onClick={addProduct}>
            + Agregar producto
          </button>
          <div style={S.adminGrid}>
            {products.map((p) => (
              <div key={p.id} style={S.adminCard}>
                <img src={p.image} alt={p.name} style={S.adminCardImg} />
                <div style={S.adminCardBody}>
                  <p style={S.adminCardName}>{p.name}</p>
                  <p style={S.adminCardMeta}>
                    {formatARS(p.price)} · stock {p.stock}
                  </p>
                  <div style={S.adminCardActions}>
                    <button style={S.smallBtn} onClick={() => startEdit(p)}>
                      Editar
                    </button>
                    <button style={S.smallBtnDanger} onClick={() => removeProduct(p.id)}>
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {editing && (
            <div style={S.editPanel}>
              <p style={S.editPanelTitle}>Editar producto</p>
              <label style={S.label}>Nombre</label>
              <input style={S.input} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              <label style={S.label}>Notas olfativas</label>
              <input style={S.input} value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              <label style={S.label}>Descripción</label>
              <textarea
                style={S.textarea}
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
              <label style={S.label}>URL de la foto</label>
              <input style={S.input} value={editing.image} onChange={(e) => setEditing({ ...editing, image: e.target.value })} />
              {editing.image && <img src={editing.image} alt="vista previa" style={S.previewImg} />}
              <div style={S.editRow2}>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>Precio (ARS)</label>
                  <input
                    style={S.input}
                    type="number"
                    value={editing.price}
                    onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>Stock</label>
                  <input
                    style={S.input}
                    type="number"
                    value={editing.stock}
                    onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div style={S.editActions}>
                <button style={S.primaryBtn} onClick={saveEdit}>
                  Guardar cambios
                </button>
                <button style={S.ghostBtn} onClick={cancelEdit}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "lotes" && <LotesPanel products={products} codes={codes} updateCodes={updateCodes} showToast={showToast} />}

      {tab === "pedidos" && (
        <div style={S.ordersList}>
          {orders.length === 0 && <p style={S.emptyTitle}>Todavía no hay pedidos registrados.</p>}
          {orders.map((o) => (
            <div key={o.id} style={S.orderCard}>
              <div style={S.orderHeader}>
                <span style={S.mono}>{o.id}</span>
                <span style={S.orderDate}>{formatDate(o.createdAt)}</span>
              </div>
              <p style={S.orderBuyer}>
                {o.buyer.name} · {o.buyer.email}
              </p>
              <ul style={S.orderItems}>
                {o.items.map((it, idx) => (
                  <li key={idx} style={S.orderItem}>
                    {it.qty}× {it.name} — {formatARS(it.price * it.qty)}
                  </li>
                ))}
              </ul>
              <p style={S.orderTotal}>Total: {formatARS(o.total)}</p>
              <div style={S.orderCodes}>
                {o.codes.map((c, idx) => (
                  <span key={idx} style={S.orderCodeChip}>
                    {c.code}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LotesPanel({ products, codes, updateCodes, showToast }) {
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [qty, setQty] = useState(20);

  // marcar vendido manualmente
  const [manualCode, setManualCode] = useState("");
  const [manualBuyer, setManualBuyer] = useState("");
  const [manualResult, setManualResult] = useState(null); // null | "ok" | "already" | "notfound"

  const generateBatch = async () => {
    if (!productId || qty <= 0) return;
    const existing = new Set(codes.map((c) => c.code));
    const newOnes = [];
    while (newOnes.length < qty) {
      const code = generateCode();
      if (!existing.has(code)) {
        existing.add(code);
        newOnes.push({ code, productId, sold: false, createdAt: new Date().toISOString() });
      }
    }
    await updateCodes([...codes, ...newOnes], newOnes);
    showToast(`${qty} códigos generados`, "ok");
  };

  const markAsSold = async () => {
    const clean = manualCode.trim().toUpperCase();
    if (!clean) return;
    const found = codes.find((c) => c.code === clean);
    if (!found) { setManualResult("notfound"); return; }
    if (found.sold) { setManualResult("already"); return; }

    const updated = {
      ...found,
      sold: true,
      soldAt: new Date().toISOString(),
      buyerName: manualBuyer.trim() || null,
      buyerEmail: null,
    };
    await updateCodeRemote(updated);
    const nextCodes = codes.map((c) => c.code === clean ? updated : c);
    updateCodes(nextCodes, []);
    setManualResult("ok");
    setManualCode("");
    setManualBuyer("");
    showToast(`Código ${clean} marcado como vendido`, "ok");
  };

  const productName = (id) => products.find((p) => p.id === id)?.name || "—";

  const summary = products.map((p) => {
    const total = codes.filter((c) => c.productId === p.id).length;
    const sold = codes.filter((c) => c.productId === p.id && c.sold).length;
    return { id: p.id, name: p.name, total, sold, available: total - sold };
  });

  return (
    <div>
      {/* ── Generar lote ── */}
      <div style={S.batchForm}>
        <div style={{ flex: 1 }}>
          <label style={S.label}>Producto</label>
          <select style={S.input} value={productId} onChange={(e) => setProductId(e.target.value)}>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={S.label}>Cantidad de códigos</label>
          <input
            style={{ ...S.input, width: 120 }}
            type="number" min={1} max={500}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
          />
        </div>
        <button style={S.primaryBtn} onClick={generateBatch}>Generar lote</button>
      </div>

      {/* ── Resumen por producto ── */}
      <div style={S.batchSummary}>
        {summary.map((s) => (
          <div key={s.id} style={S.batchSummaryRow}>
            <span style={S.batchSummaryName}>{s.name}</span>
            <span style={S.batchSummaryNums}>
              {s.available} disponibles · {s.sold} vendidos · {s.total} generados
            </span>
          </div>
        ))}
      </div>

      {/* ── Marcar vendido manualmente ── */}
      <div style={S.manualSellBox}>
        <p style={S.editPanelTitle}>Marcar código como vendido manualmente</p>
        <p style={{ fontSize: 12, color: COLORS.boneMute, marginBottom: 16, lineHeight: 1.6 }}>
          Usá esto cuando vendés por WhatsApp, en persona o por cualquier canal fuera de la tienda web.
        </p>
        <div style={S.manualSellForm}>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Código del envase</label>
            <input
              style={{ ...S.input, fontFamily: monoFont, letterSpacing: "0.08em", textTransform: "uppercase" }}
              value={manualCode}
              onChange={(e) => { setManualCode(e.target.value); setManualResult(null); }}
              placeholder="A3F7K9P2"
              maxLength={8}
            />
          </div>
          <div style={{ flex: 2 }}>
            <label style={S.label}>Nombre del comprador o frase (opcional)</label>
            <input
              style={S.input}
              value={manualBuyer}
              onChange={(e) => setManualBuyer(e.target.value)}
              placeholder="Ej: María García  /  Para siempre tuyo"
            />
          </div>
          <button style={{ ...S.primaryBtn, alignSelf: "flex-end" }} onClick={markAsSold}>
            Marcar vendido
          </button>
        </div>
        {manualResult === "ok" && <p style={{ color: COLORS.sage, fontSize: 13, marginTop: 10 }}>✓ Código marcado como vendido correctamente.</p>}
        {manualResult === "notfound" && <p style={{ color: COLORS.terracotta, fontSize: 13, marginTop: 10 }}>✕ No se encontró ese código. Verificá que esté bien escrito.</p>}
        {manualResult === "already" && <p style={{ color: COLORS.amber, fontSize: 13, marginTop: 10 }}>⚠ Ese código ya estaba marcado como vendido.</p>}
      </div>

      <p style={S.batchHint}>
        Generá los códigos antes de imprimir/grabar los envases. Al vender por la web, el sistema asigna automáticamente
        uno disponible; si vendés por otro canal, marcalo manualmente arriba.
      </p>

      {/* ── Listado de códigos ── */}
      <div style={S.codeTableWrap}>
        <p style={S.editPanelTitle}>Últimos códigos generados</p>
        <div style={S.codeTable}>
          {codes
            .slice().reverse().slice(0, 40)
            .map((c) => (
              <div key={c.code} style={S.codeRow}>
                <span style={S.mono}>{c.code}</span>
                <span style={S.codeRowProduct}>{productName(c.productId)}</span>
                <span style={S.codeRowBuyer}>{c.buyerName || (c.sold && c.buyerEmail) ? (c.buyerName || c.buyerEmail) : ""}</span>
                <span style={{ ...S.codeRowStatus, ...(c.sold ? S.codeSold : S.codeAvailable) }}>
                  {c.sold ? "Vendido" : "Disponible"}
                </span>
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

/* ============================================================
   ESTILOS
   ============================================================ */
const COLORS = {
  bg: "#0F0D0C",
  surface: "#181513",
  surfaceAlt: "#211D19",
  line: "#3A332C",
  amber: "#C08B3E",
  amberDark: "#8C6328",
  amberLight: "#E0C28A",
  bone: "#EDE6DB",
  boneMute: "#A89C8C",
  sage: "#7A8B6F",
  sageLight: "#1C2118",
  terracotta: "#A8504A",
  terracottaLight: "#231613",
};

const displayFont = "'Cormorant', Georgia, serif";
const bodyFont = "'Inter', -apple-system, sans-serif";
const monoFont = "'JetBrains Mono', monospace";

const S = {
  appShell: {
    background: COLORS.bg,
    color: COLORS.bone,
    fontFamily: bodyFont,
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  },
  loadingScreen: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "400px",
  },
  loadingMark: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    border: `1px solid ${COLORS.amber}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: displayFont,
    fontSize: 24,
    color: COLORS.amber,
  },

  header: {
    borderBottom: `1px solid ${COLORS.line}`,
    position: "sticky",
    top: 0,
    background: "rgba(15,13,12,0.92)",
    backdropFilter: "blur(6px)",
    zIndex: 10,
  },
  headerInner: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "20px 28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    fontFamily: displayFont,
    fontSize: 24,
    letterSpacing: "0.18em",
    background: "none",
    border: "none",
    color: COLORS.bone,
    cursor: "pointer",
    padding: 0,
    fontWeight: 500,
  },
  nav: { display: "flex", alignItems: "center", gap: 24 },
  navLink: {
    background: "none",
    border: "none",
    color: COLORS.boneMute,
    fontSize: 14,
    cursor: "pointer",
    padding: "6px 0",
    borderBottom: "1px solid transparent",
    fontFamily: bodyFont,
  },
  navLinkActive: { color: COLORS.amber, borderBottom: `1px solid ${COLORS.amber}` },
  cartBtn: {
    background: "none",
    border: `1px solid ${COLORS.line}`,
    color: COLORS.bone,
    fontSize: 13,
    cursor: "pointer",
    padding: "8px 16px",
    borderRadius: 2,
    position: "relative",
    fontFamily: bodyFont,
  },
  cartBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    background: COLORS.amber,
    color: COLORS.bg,
    fontSize: 11,
    fontWeight: 600,
    borderRadius: "50%",
    width: 18,
    height: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  main: { flex: 1, maxWidth: 1100, margin: "0 auto", padding: "0 28px", width: "100%", boxSizing: "border-box" },

  hero: { padding: "64px 0 48px", maxWidth: 640 },
  heroEyebrow: {
    fontSize: 12,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: COLORS.amber,
    marginBottom: 14,
    fontFamily: bodyFont,
  },
  heroTitle: { fontFamily: displayFont, fontSize: 46, lineHeight: 1.15, fontWeight: 500, margin: "0 0 20px" },
  heroSub: { fontSize: 16, lineHeight: 1.7, color: COLORS.boneMute, maxWidth: 520 },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 28,
    paddingBottom: 80,
  },
  card: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.line}`,
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
  },
  cardImageWrap: { position: "relative", aspectRatio: "4 / 5", overflow: "hidden" },
  cardImage: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  lowStock: {
    position: "absolute",
    top: 12,
    left: 12,
    background: COLORS.amberDark,
    color: COLORS.bone,
    fontSize: 11,
    padding: "4px 10px",
    letterSpacing: "0.04em",
  },
  outStock: {
    position: "absolute",
    top: 12,
    left: 12,
    background: COLORS.surfaceAlt,
    color: COLORS.boneMute,
    fontSize: 11,
    padding: "4px 10px",
    border: `1px solid ${COLORS.line}`,
  },
  cardBody: { padding: "20px 22px 22px", display: "flex", flexDirection: "column", gap: 6, flex: 1 },
  cardTitle: { fontFamily: displayFont, fontSize: 22, fontWeight: 500, margin: 0 },
  cardNotes: { fontSize: 13, color: COLORS.boneMute, margin: 0, flex: 1 },
  cardFooter: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 },
  cardPrice: { fontFamily: monoFont, fontSize: 14, color: COLORS.amberLight },
  cardBtn: {
    background: "none",
    border: `1px solid ${COLORS.amber}`,
    color: COLORS.amber,
    fontSize: 12,
    padding: "8px 16px",
    cursor: "pointer",
    letterSpacing: "0.04em",
    fontFamily: bodyFont,
  },

  productPage: { padding: "40px 0 80px" },
  backLink: { background: "none", border: "none", color: COLORS.boneMute, fontSize: 13, cursor: "pointer", marginBottom: 32, padding: 0, fontFamily: bodyFont },
  productGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56 },
  productImageWrap: { aspectRatio: "4 / 5", overflow: "hidden", background: COLORS.surface },
  productImage: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  productInfo: { display: "flex", flexDirection: "column" },
  productTitle: { fontFamily: displayFont, fontSize: 40, fontWeight: 500, margin: "0 0 18px" },
  productDesc: { fontSize: 15, lineHeight: 1.8, color: COLORS.boneMute, marginBottom: 24 },
  productPrice: { fontFamily: monoFont, fontSize: 22, color: COLORS.amberLight, marginBottom: 24 },
  stockNote: { fontSize: 13, color: COLORS.boneMute, marginTop: 14 },
  authNote: { marginTop: 40, paddingTop: 24, borderTop: `1px solid ${COLORS.line}` },
  authNoteText: { fontSize: 13, lineHeight: 1.7, color: COLORS.boneMute },

  primaryBtn: {
    background: COLORS.amber,
    color: COLORS.bg,
    border: "none",
    padding: "14px 28px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.03em",
    fontFamily: bodyFont,
  },
  btnDisabled: { opacity: 0.4, cursor: "not-allowed" },
  secondaryBtn: {
    background: "none",
    border: `1px solid ${COLORS.amber}`,
    color: COLORS.amber,
    padding: "10px 20px",
    fontSize: 13,
    cursor: "pointer",
    marginBottom: 24,
    fontFamily: bodyFont,
  },
  ghostBtn: {
    background: "none",
    border: "none",
    color: COLORS.boneMute,
    padding: "12px 0",
    fontSize: 13,
    cursor: "pointer",
    textAlign: "left",
    fontFamily: bodyFont,
  },

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
  qtyBtn: {
    width: 28,
    height: 28,
    background: "none",
    border: `1px solid ${COLORS.line}`,
    color: COLORS.bone,
    cursor: "pointer",
    fontSize: 15,
  },
  qtyValue: { fontFamily: monoFont, fontSize: 14, minWidth: 16, textAlign: "center" },
  cartLineTotal: { fontFamily: monoFont, fontSize: 14, minWidth: 90, textAlign: "right" },
  cartTotalRow: { display: "flex", justifyContent: "space-between", padding: "24px 0", fontSize: 16 },
  cartTotalValue: { fontFamily: monoFont, color: COLORS.amberLight },

  checkoutForm: { display: "flex", flexDirection: "column", gap: 4, maxWidth: 420 },
  checkoutNote: { fontSize: 12, color: COLORS.boneMute, marginBottom: 16, lineHeight: 1.6, fontStyle: "italic" },
  checkoutTotalRow: { display: "flex", justifyContent: "space-between", padding: "20px 0", fontSize: 16, borderTop: `1px solid ${COLORS.line}`, marginTop: 12 },
  label: { fontSize: 12, color: COLORS.boneMute, marginTop: 14, marginBottom: 6, letterSpacing: "0.02em" },
  input: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.line}`,
    color: COLORS.bone,
    padding: "11px 14px",
    fontSize: 14,
    fontFamily: bodyFont,
    outline: "none",
  },
  textarea: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.line}`,
    color: COLORS.bone,
    padding: "11px 14px",
    fontSize: 14,
    fontFamily: bodyFont,
    outline: "none",
    minHeight: 80,
    resize: "vertical",
  },
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
  verifyInput: {
    flex: 1,
    background: COLORS.surface,
    border: `1px solid ${COLORS.line}`,
    color: COLORS.bone,
    padding: "13px 16px",
    fontSize: 18,
    fontFamily: monoFont,
    letterSpacing: "0.12em",
    outline: "none",
    textTransform: "uppercase",
  },

  sealWrap: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginTop: 56 },
  sealRing: {
    width: 132,
    height: 132,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid",
    transition: "all 0.4s ease",
  },
  sealRingChecking: { borderColor: COLORS.line, background: COLORS.surface },
  sealRingValid: { borderColor: COLORS.sage, background: COLORS.sageLight, boxShadow: `0 0 0 1px ${COLORS.sage} inset` },
  sealRingInvalid: { borderColor: COLORS.terracotta, background: COLORS.terracottaLight, boxShadow: `0 0 0 1px ${COLORS.terracotta} inset` },
  sealInner: {
    width: 96,
    height: 96,
    borderRadius: "50%",
    border: `1px solid ${COLORS.line}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  sealIconNeutral: { fontSize: 22, color: COLORS.boneMute, letterSpacing: 2 },
  sealIconValid: { fontSize: 36, color: COLORS.sage },
  sealIconInvalid: { fontSize: 30, color: COLORS.terracotta },
  sealText: { marginTop: 24, maxWidth: 380 },
  manualSellBox: { margin: "28px 0", padding: 24, background: COLORS.surface, border: `1px solid ${COLORS.line}` },
  manualSellForm: { display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap" },

  sealBuyerName: {
    fontFamily: displayFont,
    fontSize: 20,
    color: COLORS.amberLight,
    fontStyle: "italic",
    margin: "10px 0 4px",
    letterSpacing: "0.02em",
  },
  sealTitleValid: { fontFamily: displayFont, fontSize: 26, color: COLORS.sage, fontWeight: 500, margin: "0 0 8px" },
  sealTitleInvalid: { fontFamily: displayFont, fontSize: 22, color: COLORS.terracotta, fontWeight: 500, margin: "0 0 8px" },
  sealSub: { fontSize: 13, color: COLORS.boneMute, margin: "0 0 14px" },
  sealExclusive: { fontSize: 13, lineHeight: 1.7, color: COLORS.bone },

  loginWrap: { padding: "56px 0 80px", maxWidth: 420 },

  adminWrap: { padding: "40px 0 80px" },
  tabs: { display: "flex", gap: 4, borderBottom: `1px solid ${COLORS.line}`, marginBottom: 28 },
  tab: {
    background: "none",
    border: "none",
    color: COLORS.boneMute,
    padding: "10px 18px",
    fontSize: 13,
    cursor: "pointer",
    borderBottom: "2px solid transparent",
    marginBottom: -1,
    fontFamily: bodyFont,
  },
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

  toast: {
    position: "fixed",
    bottom: 28,
    left: "50%",
    transform: "translateX(-50%)",
    background: COLORS.surfaceAlt,
    border: `1px solid ${COLORS.line}`,
    color: COLORS.bone,
    padding: "12px 22px",
    fontSize: 13,
    zIndex: 50,
  },
  toastOk: { borderColor: COLORS.sage, color: COLORS.sage },
  toastError: { borderColor: COLORS.terracotta, color: COLORS.terracotta },
};
