
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LayoutGrid,
  FileText,
  Package,
  Wallet,
  Plus,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Loader2,
  Users,
  Banknote,
  Truck,
} from "lucide-react";

/* ---------------------------------------------------------
   Ledger & Vault — shop accounting
   Tabs: Dashboard / Invoices / Inventory / Expenses
   Persistence: window.storage (personal, not shared)
--------------------------------------------------------- */

const FONT_IMPORT_ID = "shop-accounts-fonts";

function ensureFonts() {
  if (typeof document === "undefined") return;
  if (document.getElementById(FONT_IMPORT_ID)) return;
  const link = document.createElement("link");
  link.id = FONT_IMPORT_ID;
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Tajawal:wght@500;700;900&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap";
  document.head.appendChild(link);
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const todayStr = () => new Date().toISOString().slice(0, 10);

const fmtMoney = (n) =>
  (Number(n) || 0).toLocaleString("ar-EG", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) +
  " ج.م";

const fmtDate = (d) => {
  try {
    return new Date(d).toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return d;
  }
};

const LOW_STOCK_THRESHOLD = 5;

function customerBalance(customerId, invoices, receipts) {
  const debt = invoices
    .filter((i) => i.customerId === customerId && i.status === "unpaid")
    .reduce((s, i) => s + i.total, 0);
  const received = receipts
    .filter((r) => r.customerId === customerId)
    .reduce((s, r) => s + Number(r.amount || 0), 0);
  return debt - received;
}

function supplierBalance(supplierId, purchases, payments) {
  const owed = purchases
    .filter((p) => p.supplierId === supplierId && p.status === "unpaid")
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const paid = payments
    .filter((p) => p.supplierId === supplierId)
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  return owed - paid;
}

/* ---------------- storage helpers ---------------- */

async function loadKey(key, fallback) {
  try {
    const res = await window.storage.get(key, false);
    if (res && typeof res.value === "string") {
      return JSON.parse(res.value);
    }
    return fallback;
  } catch {
    return fallback;
  }
}

async function saveKey(key, value) {
  try {
    await window.storage.set(key, JSON.stringify(value), false);
  } catch {
    // silently ignore — UI already reflects the change locally
  }
}

/* ---------------- shared UI bits ---------------- */

function StatCard({ label, value, tone = "ink", icon: Icon, sub }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon tone-${tone}`}>{Icon ? <Icon size={18} strokeWidth={2.25} /> : null}</div>
      <div className="stat-body">
        <div className="stat-label">{label}</div>
        <div className={`stat-value tone-${tone}`}>{value}</div>
        {sub ? <div className="stat-sub">{sub}</div> : null}
      </div>
    </div>
  );
}

function EmptyState({ title, hint }) {
  return (
    <div className="empty-state">
      <Circle size={26} strokeWidth={1.5} />
      <div className="empty-title">{title}</div>
      <div className="empty-hint">{hint}</div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

/* ==================================================
   MAIN APP
================================================== */

export default function ShopAccountsApp() {
  useEffect(() => {
    ensureFonts();
  }, []);

  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);

  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    (async () => {
      const [p, i, e, c, r, sup, pur, pay] = await Promise.all([
        loadKey("products", []),
        loadKey("invoices", []),
        loadKey("expenses", []),
        loadKey("customers", []),
        loadKey("receipts", []),
        loadKey("suppliers", []),
        loadKey("purchases", []),
        loadKey("payments", []),
      ]);
      setProducts(p);
      setInvoices(i);
      setExpenses(e);
      setCustomers(c);
      setReceipts(r);
      setSuppliers(sup);
      setPurchases(pur);
      setPayments(pay);
      setLoading(false);
    })();
  }, []);

  const updateProducts = useCallback((next) => {
    setProducts(next);
    saveKey("products", next);
  }, []);
  const updateInvoices = useCallback((next) => {
    setInvoices(next);
    saveKey("invoices", next);
  }, []);
  const updateExpenses = useCallback((next) => {
    setExpenses(next);
    saveKey("expenses", next);
  }, []);
  const updateCustomers = useCallback((next) => {
    setCustomers(next);
    saveKey("customers", next);
  }, []);
  const updateReceipts = useCallback((next) => {
    setReceipts(next);
    saveKey("receipts", next);
  }, []);
  const updateSuppliers = useCallback((next) => {
    setSuppliers(next);
    saveKey("suppliers", next);
  }, []);
  const updatePurchases = useCallback((next) => {
    setPurchases(next);
    saveKey("purchases", next);
  }, []);
  const updatePayments = useCallback((next) => {
    setPayments(next);
    saveKey("payments", next);
  }, []);

  const totals = useMemo(() => {
    const sales = invoices.reduce((s, inv) => s + inv.total, 0);
    const exp = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const lowStock = products.filter((p) => Number(p.qty) <= LOW_STOCK_THRESHOLD).length;
    const unpaid = invoices.filter((i) => i.status === "unpaid").reduce((s, i) => s + i.total, 0);
    const grossProfit = invoices.reduce(
      (s, inv) => s + inv.items.reduce((is, it) => is + (Number(it.price) - Number(it.cost || 0)) * it.qty, 0),
      0
    );
    const receivable = customers.reduce(
      (s, c) => s + Math.max(0, customerBalance(c.id, invoices, receipts)),
      0
    );
    const payable = suppliers.reduce(
      (s, sup) => s + Math.max(0, supplierBalance(sup.id, purchases, payments)),
      0
    );
    return { sales, exp, net: sales - exp, lowStock, unpaid, grossProfit, receivable, payable };
  }, [invoices, expenses, products, customers, receipts, suppliers, purchases, payments]);

  const TABS = [
    { id: "dashboard", label: "الرئيسية", icon: LayoutGrid },
    { id: "invoices", label: "الفواتير", icon: FileText },
    { id: "customers", label: "العملاء", icon: Users },
    { id: "suppliers", label: "الموردين", icon: Truck },
    { id: "inventory", label: "المخزون", icon: Package },
    { id: "expenses", label: "المصروفات", icon: Wallet },
  ];

  return (
    <div className="app-root" dir="rtl">
      <style>{CSS}</style>

      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">د</div>
          <div className="brand-text">
            <div className="brand-title">دفتر</div>
            <div className="brand-sub">حسابات المحل</div>
          </div>
        </div>
        <nav className="tabnav">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab-btn ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              <t.icon size={16} strokeWidth={2.25} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="page-wrap">
        {loading ? (
          <div className="loading-row">
            <Loader2 className="spin" size={20} />
            <span>بيتم تحميل البيانات…</span>
          </div>
        ) : (
          <div className="page">
            {tab === "dashboard" && (
              <Dashboard
                totals={totals}
                products={products}
                invoices={invoices}
                expenses={expenses}
                customers={customers}
                receipts={receipts}
                suppliers={suppliers}
                purchases={purchases}
                payments={payments}
                goTo={setTab}
              />
            )}
            {tab === "invoices" && (
              <InvoicesTab
                invoices={invoices}
                setInvoices={updateInvoices}
                products={products}
                setProducts={updateProducts}
                customers={customers}
                setCustomers={updateCustomers}
              />
            )}
            {tab === "customers" && (
              <CustomersTab
                customers={customers}
                setCustomers={updateCustomers}
                invoices={invoices}
                receipts={receipts}
                setReceipts={updateReceipts}
              />
            )}
            {tab === "suppliers" && (
              <SuppliersTab
                suppliers={suppliers}
                setSuppliers={updateSuppliers}
                purchases={purchases}
                setPurchases={updatePurchases}
                payments={payments}
                setPayments={updatePayments}
              />
            )}
            {tab === "inventory" && (
              <InventoryTab products={products} setProducts={updateProducts} />
            )}
            {tab === "expenses" && (
              <ExpensesTab expenses={expenses} setExpenses={updateExpenses} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

/* ==================================================
   DASHBOARD
================================================== */

function Dashboard({ totals, products, invoices, expenses, customers, receipts, suppliers, purchases, payments, goTo }) {
  const recentInvoices = [...invoices].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5);
  const lowStockItems = products.filter((p) => Number(p.qty) <= LOW_STOCK_THRESHOLD);

  return (
    <div className="dash">
      <div className="hero">
        <div className="hero-label">صافي الربح</div>
        <div className={`hero-number ${totals.net >= 0 ? "pos" : "neg"}`}>{fmtMoney(totals.net)}</div>
        <div className="hero-hint">
          {totals.net >= 0
            ? "مبيعاتك أكبر من مصروفاتك — استمر كده"
            : "مصروفاتك أكبر من مبيعاتك دلوقتي"}
        </div>
      </div>

      <div className="stat-grid">
        <StatCard label="إجمالي المبيعات" value={fmtMoney(totals.sales)} tone="green" icon={CheckCircle2} />
        <StatCard
          label="ربح البضاعة المباعة"
          value={fmtMoney(totals.grossProfit)}
          tone={totals.grossProfit >= 0 ? "green" : "brick"}
          icon={Package}
          sub="الفرق بين سعر البيع وسعر الشراء"
        />
        <StatCard label="إجمالي المصروفات" value={fmtMoney(totals.exp)} tone="brick" icon={Wallet} />
        <StatCard
          label="مستحق من العملاء"
          value={fmtMoney(totals.receivable)}
          tone={totals.receivable > 0 ? "gold" : "green"}
          icon={Users}
          sub="بعد خصم المقبوضات النقدية"
        />
        <StatCard
          label="مستحق للموردين"
          value={fmtMoney(totals.payable)}
          tone={totals.payable > 0 ? "brick" : "green"}
          icon={Truck}
          sub="بعد خصم المدفوعات"
        />
        <StatCard
          label="أصناف قاربت تخلص"
          value={totals.lowStock}
          tone={totals.lowStock > 0 ? "brick" : "green"}
          icon={AlertTriangle}
        />
      </div>

      <div className="dash-cols">
        <section className="panel">
          <div className="panel-head">
            <h3>أحدث الفواتير</h3>
            <button className="link-btn" onClick={() => goTo("invoices")}>
              عرض الكل
            </button>
          </div>
          {recentInvoices.length === 0 ? (
            <EmptyState title="لسه مفيش فواتير" hint="أول فاتورة تعملها هتظهر هنا" />
          ) : (
            <table className="ledger-table">
              <tbody>
                {recentInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="cell-main">{inv.customer || "عميل نقدي"}</td>
                    <td className="cell-sub">{fmtDate(inv.date)}</td>
                    <td className={`cell-status ${inv.status}`}>
                      {inv.status === "paid" ? "متحصلة" : "غير متحصلة"}
                    </td>
                    <td className="cell-amount">{fmtMoney(inv.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h3>مخزون منخفض</h3>
            <button className="link-btn" onClick={() => goTo("inventory")}>
              عرض الكل
            </button>
          </div>
          {lowStockItems.length === 0 ? (
            <EmptyState title="المخزون تمام" hint="مفيش صنف قارب يخلص" />
          ) : (
            <table className="ledger-table">
              <tbody>
                {lowStockItems.map((p) => (
                  <tr key={p.id}>
                    <td className="cell-main">{p.name}</td>
                    <td className="cell-sub">{p.category || "بدون تصنيف"}</td>
                    <td className="cell-amount warn">{p.qty} متبقي</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}

/* ==================================================
   INVOICES
================================================== */

function InvoicesTab({ invoices, setInvoices, products, setProducts, customers, setCustomers }) {
  const [showForm, setShowForm] = useState(false);
  const sorted = [...invoices].sort((a, b) => (a.date < b.date ? 1 : -1));

  const toggleStatus = (id) => {
    setInvoices(
      invoices.map((inv) =>
        inv.id === id ? { ...inv, status: inv.status === "paid" ? "unpaid" : "paid" } : inv
      )
    );
  };

  const removeInvoice = (id) => {
    setInvoices(invoices.filter((inv) => inv.id !== id));
  };

  const handleCreate = (invoice, stockChanges) => {
    setInvoices([invoice, ...invoices]);
    if (stockChanges.length) {
      setProducts(
        products.map((p) => {
          const change = stockChanges.find((c) => c.productId === p.id);
          return change ? { ...p, qty: Math.max(0, Number(p.qty) - change.qty) } : p;
        })
      );
    }
    setShowForm(false);
  };

  return (
    <div className="section">
      <div className="section-head">
        <div>
          <h2>الفواتير</h2>
          <p className="section-hint">سجّل فواتير البيع وتابع اللي اتحصّل واللي لسه</p>
        </div>
        <button className="primary-btn" onClick={() => setShowForm(true)}>
          <Plus size={16} strokeWidth={2.5} />
          فاتورة جديدة
        </button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState title="لسه مفيش فواتير" hint="اضغط “فاتورة جديدة” عشان تبدأ" />
      ) : (
        <div className="panel">
          <table className="ledger-table wide">
            <thead>
              <tr>
                <th>العميل</th>
                <th>التاريخ</th>
                <th>عدد الأصناف</th>
                <th>الإجمالي</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((inv) => (
                <tr key={inv.id}>
                  <td className="cell-main">{inv.customer || "عميل نقدي"}</td>
                  <td className="cell-sub">{fmtDate(inv.date)}</td>
                  <td className="cell-sub">{inv.items.length}</td>
                  <td className="cell-amount">{fmtMoney(inv.total)}</td>
                  <td>
                    <button
                      className={`status-pill ${inv.status}`}
                      onClick={() => toggleStatus(inv.id)}
                      title="اضغط لتغيير الحالة"
                    >
                      {inv.status === "paid" ? "متحصلة" : "غير متحصلة"}
                    </button>
                  </td>
                  <td>
                    <button className="icon-btn danger" onClick={() => removeInvoice(inv.id)}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal title="فاتورة جديدة" onClose={() => setShowForm(false)}>
          <InvoiceForm
            products={products}
            customers={customers}
            setCustomers={setCustomers}
            onCreate={handleCreate}
            onCancel={() => setShowForm(false)}
          />
        </Modal>
      )}
    </div>
  );
}

function InvoiceForm({ products, customers, setCustomers, onCreate, onCancel }) {
  const [customerId, setCustomerId] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [date, setDate] = useState(todayStr());
  const [status, setStatus] = useState("paid");
  const [lines, setLines] = useState([{ id: uid(), productId: "", qty: 1, price: 0, cost: 0, name: "" }]);
  const [error, setError] = useState("");

  const addLine = () =>
    setLines([...lines, { id: uid(), productId: "", qty: 1, price: 0, cost: 0, name: "" }]);
  const removeLine = (id) => setLines(lines.filter((l) => l.id !== id));

  const updateLine = (id, patch) => {
    setLines(
      lines.map((l) => {
        if (l.id !== id) return l;
        const next = { ...l, ...patch };
        if (patch.productId !== undefined) {
          const prod = products.find((p) => p.id === patch.productId);
          next.price = prod ? prod.price : 0;
          next.cost = prod ? Number(prod.costPrice || 0) : 0;
          next.name = prod ? prod.name : "";
        }
        return next;
      })
    );
  };

  const validLines = lines.filter((l) => l.productId && Number(l.qty) > 0);
  const total = validLines.reduce((s, l) => s + Number(l.qty) * Number(l.price), 0);

  const submit = () => {
    if (validLines.length === 0) {
      setError("لازم تختار صنف واحد على الأقل");
      return;
    }
    for (const l of validLines) {
      const prod = products.find((p) => p.id === l.productId);
      if (prod && Number(l.qty) > Number(prod.qty)) {
        setError(`الكمية المطلوبة من "${prod.name}" أكبر من المتاح بالمخزون (${prod.qty})`);
        return;
      }
    }
    const selectedCustomer = customers.find((c) => c.id === customerId);
    const invoice = {
      id: uid(),
      customerId: selectedCustomer ? selectedCustomer.id : null,
      customer: selectedCustomer ? selectedCustomer.name : "عميل نقدي",
      date,
      status,
      items: validLines.map((l) => ({
        name: l.name,
        qty: Number(l.qty),
        price: Number(l.price),
        cost: Number(l.cost || 0),
      })),
      total,
    };
    const stockChanges = validLines.map((l) => ({ productId: l.productId, qty: Number(l.qty) }));
    onCreate(invoice, stockChanges);
  };

  const confirmNewCustomer = () => {
    if (!newCustomerName.trim()) return;
    const newCustomer = { id: uid(), name: newCustomerName.trim(), phone: "" };
    setCustomers([newCustomer, ...customers]);
    setCustomerId(newCustomer.id);
    setNewCustomerName("");
    setAddingCustomer(false);
  };

  return (
    <div className="form">
      <div className="form-row two">
        <label>
          العميل
          {addingCustomer ? (
            <div className="inline-add">
              <input
                autoFocus
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="اسم العميل الجديد"
                onKeyDown={(e) => e.key === "Enter" && confirmNewCustomer()}
              />
              <button className="ghost-btn small" onClick={confirmNewCustomer}>
                إضافة
              </button>
              <button className="icon-btn" onClick={() => setAddingCustomer(false)}>
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="inline-add">
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">عميل نقدي (بدون تسجيل)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button className="ghost-btn small" onClick={() => setAddingCustomer(true)}>
                <Plus size={13} /> عميل جديد
              </button>
            </div>
          )}
        </label>
        <label>
          التاريخ
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>

      <div className="lines-head">
        <span>الأصناف</span>
      </div>

      {products.length === 0 ? (
        <div className="inline-hint">
          لسه معندكش أصناف بالمخزون. ضيف أصناف من تبويب “المخزون” الأول.
        </div>
      ) : (
        <div className="lines">
          {lines.map((line) => {
            const prod = products.find((p) => p.id === line.productId);
            return (
              <div className="line-row" key={line.id}>
                <select
                  value={line.productId}
                  onChange={(e) => updateLine(line.id, { productId: e.target.value })}
                >
                  <option value="">اختر صنف</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — متاح {p.qty}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  className="qty-input"
                  value={line.qty}
                  onChange={(e) => updateLine(line.id, { qty: e.target.value })}
                />
                <div className="line-price">{prod ? fmtMoney(prod.price * Number(line.qty || 0)) : "—"}</div>
                <button className="icon-btn danger" onClick={() => removeLine(line.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
          <button className="ghost-btn" onClick={addLine}>
            <Plus size={14} /> ضيف صنف
          </button>
        </div>
      )}

      <div className="form-row two">
        <label>
          حالة التحصيل
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="paid">متحصلة</option>
            <option value="unpaid">غير متحصلة</option>
          </select>
        </label>
        <div className="total-box">
          <span>الإجمالي</span>
          <strong>{fmtMoney(total)}</strong>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="form-actions">
        <button className="ghost-btn" onClick={onCancel}>
          إلغاء
        </button>
        <button className="primary-btn" onClick={submit}>
          حفظ الفاتورة
        </button>
      </div>
    </div>
  );
}

/* ==================================================
   INVENTORY
================================================== */

function InventoryTab({ products, setProducts }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const removeProduct = (id) => setProducts(products.filter((p) => p.id !== id));

  const saveProduct = (product) => {
    if (editing) {
      setProducts(products.map((p) => (p.id === editing.id ? { ...product, id: editing.id } : p)));
    } else {
      setProducts([{ ...product, id: uid() }, ...products]);
    }
    setShowForm(false);
    setEditing(null);
  };

  return (
    <div className="section">
      <div className="section-head">
        <div>
          <h2>المخزون</h2>
          <p className="section-hint">تابع أصناف المحل وأسعارها والكميات المتاحة</p>
        </div>
        <button
          className="primary-btn"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
          صنف جديد
        </button>
      </div>

      {products.length === 0 ? (
        <EmptyState title="لسه مفيش أصناف" hint="اضغط “صنف جديد” عشان تضيف أول منتج" />
      ) : (
        <div className="panel">
          <table className="ledger-table wide">
            <thead>
              <tr>
                <th>الصنف</th>
                <th>التصنيف</th>
                <th>سعر الشراء</th>
                <th>سعر البيع</th>
                <th>هامش الربح</th>
                <th>الكمية</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const margin = Number(p.price) - Number(p.costPrice || 0);
                return (
                <tr key={p.id}>
                  <td className="cell-main">{p.name}</td>
                  <td className="cell-sub">{p.category || "—"}</td>
                  <td className="cell-sub">{fmtMoney(p.costPrice || 0)}</td>
                  <td className="cell-amount">{fmtMoney(p.price)}</td>
                  <td className={margin < 0 ? "cell-amount neg" : "cell-amount"}>{fmtMoney(margin)}</td>
                  <td className={Number(p.qty) <= LOW_STOCK_THRESHOLD ? "cell-amount warn" : "cell-amount"}>
                    {p.qty}
                  </td>
                  <td className="row-actions">
                    <button
                      className="link-btn"
                      onClick={() => {
                        setEditing(p);
                        setShowForm(true);
                      }}
                    >
                      تعديل
                    </button>
                    <button className="icon-btn danger" onClick={() => removeProduct(p.id)}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal
          title={editing ? "تعديل الصنف" : "صنف جديد"}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
        >
          <ProductForm
            initial={editing}
            onSave={saveProduct}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function ProductForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || "");
  const [category, setCategory] = useState(initial?.category || "");
  const [costPrice, setCostPrice] = useState(initial?.costPrice ?? "");
  const [price, setPrice] = useState(initial?.price ?? "");
  const [qty, setQty] = useState(initial?.qty ?? "");
  const [error, setError] = useState("");

  const margin =
    price !== "" && costPrice !== "" ? Number(price) - Number(costPrice) : null;

  const submit = () => {
    if (!name.trim()) {
      setError("اكتب اسم الصنف");
      return;
    }
    if (costPrice === "" || Number(costPrice) < 0) {
      setError("اكتب سعر شراء صحيح");
      return;
    }
    if (price === "" || Number(price) < 0) {
      setError("اكتب سعر بيع صحيح");
      return;
    }
    if (qty === "" || Number(qty) < 0) {
      setError("اكتب كمية صحيحة");
      return;
    }
    onSave({
      name: name.trim(),
      category: category.trim(),
      costPrice: Number(costPrice),
      price: Number(price),
      qty: Number(qty),
    });
  };

  return (
    <div className="form">
      <label>
        اسم الصنف
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: زيت عباد الشمس ١ لتر" />
      </label>
      <label>
        التصنيف (اختياري)
        <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="مثال: بقالة" />
      </label>
      <div className="form-row two">
        <label>
          سعر الشراء
          <input
            type="number"
            min="0"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            placeholder="0"
          />
        </label>
        <label>
          سعر البيع
          <input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
        </label>
      </div>
      <label>
        الكمية المتاحة
        <input type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" />
      </label>
      {margin !== null && (
        <div className={`inline-hint ${margin < 0 ? "warn" : ""}`}>
          هامش الربح للوحدة: {fmtMoney(margin)}
          {margin < 0 ? " — سعر البيع أقل من سعر الشراء" : ""}
        </div>
      )}
      {error && <div className="form-error">{error}</div>}
      <div className="form-actions">
        <button className="ghost-btn" onClick={onCancel}>
          إلغاء
        </button>
        <button className="primary-btn" onClick={submit}>
          حفظ
        </button>
      </div>
    </div>
  );
}

/* ==================================================
   EXPENSES
================================================== */

function ExpensesTab({ expenses, setExpenses }) {
  const [showForm, setShowForm] = useState(false);
  const sorted = [...expenses].sort((a, b) => (a.date < b.date ? 1 : -1));

  const removeExpense = (id) => setExpenses(expenses.filter((e) => e.id !== id));

  const addExpense = (expense) => {
    setExpenses([{ ...expense, id: uid() }, ...expenses]);
    setShowForm(false);
  };

  return (
    <div className="section">
      <div className="section-head">
        <div>
          <h2>المصروفات</h2>
          <p className="section-hint">سجّل مصاريف المحل زي الإيجار والفواتير والتوريد</p>
        </div>
        <button className="primary-btn" onClick={() => setShowForm(true)}>
          <Plus size={16} strokeWidth={2.5} />
          مصروف جديد
        </button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState title="لسه مفيش مصروفات مسجّلة" hint="اضغط “مصروف جديد” عشان تبدأ التسجيل" />
      ) : (
        <div className="panel">
          <table className="ledger-table wide">
            <thead>
              <tr>
                <th>الوصف</th>
                <th>التصنيف</th>
                <th>التاريخ</th>
                <th>المبلغ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((e) => (
                <tr key={e.id}>
                  <td className="cell-main">{e.description}</td>
                  <td className="cell-sub">{e.category || "—"}</td>
                  <td className="cell-sub">{fmtDate(e.date)}</td>
                  <td className="cell-amount neg">{fmtMoney(e.amount)}</td>
                  <td>
                    <button className="icon-btn danger" onClick={() => removeExpense(e.id)}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal title="مصروف جديد" onClose={() => setShowForm(false)}>
          <ExpenseForm onSave={addExpense} onCancel={() => setShowForm(false)} />
        </Modal>
      )}
    </div>
  );
}

function ExpenseForm({ onSave, onCancel }) {
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayStr());
  const [error, setError] = useState("");

  const submit = () => {
    if (!description.trim()) {
      setError("اكتب وصف المصروف");
      return;
    }
    if (amount === "" || Number(amount) <= 0) {
      setError("اكتب مبلغ صحيح");
      return;
    }
    onSave({ description: description.trim(), category: category.trim(), amount: Number(amount), date });
  };

  return (
    <div className="form">
      <label>
        الوصف
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="مثال: إيجار المحل"
        />
      </label>
      <div className="form-row two">
        <label>
          التصنيف (اختياري)
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="مثال: إيجار" />
        </label>
        <label>
          التاريخ
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      <label>
        المبلغ
        <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
      </label>
      {error && <div className="form-error">{error}</div>}
      <div className="form-actions">
        <button className="ghost-btn" onClick={onCancel}>
          إلغاء
        </button>
        <button className="primary-btn" onClick={submit}>
          حفظ
        </button>
      </div>
    </div>
  );
}

/* ==================================================
   CUSTOMERS & CASH RECEIPTS
================================================== */

function CustomersTab({ customers, setCustomers, invoices, receipts, setReceipts }) {
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptCustomerId, setReceiptCustomerId] = useState("");

  const rows = customers.map((c) => ({
    ...c,
    balance: customerBalance(c.id, invoices, receipts),
  }));

  const allReceipts = [...receipts]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((r) => ({ ...r, customerName: customers.find((c) => c.id === r.customerId)?.name || "عميل محذوف" }));

  const saveCustomer = (data) => {
    if (editingCustomer) {
      setCustomers(customers.map((c) => (c.id === editingCustomer.id ? { ...data, id: editingCustomer.id } : c)));
    } else {
      setCustomers([{ ...data, id: uid() }, ...customers]);
    }
    setShowCustomerForm(false);
    setEditingCustomer(null);
  };

  const removeCustomer = (id) => {
    setCustomers(customers.filter((c) => c.id !== id));
  };

  const openReceipt = (customerId) => {
    setReceiptCustomerId(customerId || "");
    setReceiptOpen(true);
  };

  const saveReceipt = (receipt) => {
    setReceipts([{ ...receipt, id: uid() }, ...receipts]);
    setReceiptOpen(false);
  };

  const removeReceipt = (id) => {
    setReceipts(receipts.filter((r) => r.id !== id));
  };

  return (
    <div className="section">
      <div className="section-head">
        <div>
          <h2>العملاء</h2>
          <p className="section-hint">تابع حساب كل عميل وسجّل تحصيل النقدية منه</p>
        </div>
        <div className="head-actions">
          <button className="ghost-btn" onClick={() => openReceipt("")}>
            <Banknote size={15} />
            تحصيل جديد
          </button>
          <button
            className="primary-btn"
            onClick={() => {
              setEditingCustomer(null);
              setShowCustomerForm(true);
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            عميل جديد
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="لسه مفيش عملاء" hint="ضيف عميل عشان تتابع حسابه، أو اختاره وانت بتعمل فاتورة" />
      ) : (
        <div className="panel">
          <table className="ledger-table wide">
            <thead>
              <tr>
                <th>العميل</th>
                <th>التليفون</th>
                <th>الحساب</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="cell-main">{c.name}</td>
                  <td className="cell-sub">{c.phone || "—"}</td>
                  <td className={c.balance > 0 ? "cell-amount neg" : "cell-amount pos"}>
                    {c.balance > 0
                      ? `عليه ${fmtMoney(c.balance)}`
                      : c.balance < 0
                      ? `له رصيد ${fmtMoney(-c.balance)}`
                      : "لا يوجد مستحقات"}
                  </td>
                  <td className="row-actions">
                    <button className="link-btn" onClick={() => openReceipt(c.id)}>
                      <span className="link-btn-icon">
                        <Banknote size={13} />
                      </span>
                      تحصيل
                    </button>
                    <button
                      className="link-btn"
                      onClick={() => {
                        setEditingCustomer(c);
                        setShowCustomerForm(true);
                      }}
                    >
                      تعديل
                    </button>
                    <button className="icon-btn danger" onClick={() => removeCustomer(c.id)}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="panel">
        <div className="panel-head">
          <h3>سجل التحصيل النقدي</h3>
        </div>
        {allReceipts.length === 0 ? (
          <EmptyState title="لسه مفيش تحصيل مسجّل" hint="سجّل أول تحصيل عن طريق زر “تحصيل جديد”" />
        ) : (
          <table className="ledger-table">
            <tbody>
              {allReceipts.map((r) => (
                <tr key={r.id}>
                  <td className="cell-main">{r.customerName}</td>
                  <td className="cell-sub">{fmtDate(r.date)}</td>
                  <td className="cell-sub">{r.note || "—"}</td>
                  <td className="cell-amount pos">{fmtMoney(r.amount)}</td>
                  <td>
                    <button className="icon-btn danger" onClick={() => removeReceipt(r.id)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {showCustomerForm && (
        <Modal
          title={editingCustomer ? "تعديل بيانات العميل" : "عميل جديد"}
          onClose={() => {
            setShowCustomerForm(false);
            setEditingCustomer(null);
          }}
        >
          <CustomerForm
            initial={editingCustomer}
            onSave={saveCustomer}
            onCancel={() => {
              setShowCustomerForm(false);
              setEditingCustomer(null);
            }}
          />
        </Modal>
      )}

      {receiptOpen && (
        <Modal title="تحصيل نقدية من عميل" onClose={() => setReceiptOpen(false)}>
          <ReceiptForm
            customers={customers}
            invoices={invoices}
            receipts={receipts}
            initialCustomerId={receiptCustomerId}
            onSave={saveReceipt}
            onCancel={() => setReceiptOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
}

function CustomerForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [error, setError] = useState("");

  const submit = () => {
    if (!name.trim()) {
      setError("اكتب اسم العميل");
      return;
    }
    onSave({ name: name.trim(), phone: phone.trim() });
  };

  return (
    <div className="form">
      <label>
        اسم العميل
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: محمد أحمد" />
      </label>
      <label>
        رقم التليفون (اختياري)
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01xxxxxxxxx" />
      </label>
      {error && <div className="form-error">{error}</div>}
      <div className="form-actions">
        <button className="ghost-btn" onClick={onCancel}>
          إلغاء
        </button>
        <button className="primary-btn" onClick={submit}>
          حفظ
        </button>
      </div>
    </div>
  );
}

function ReceiptForm({ customers, invoices, receipts, initialCustomerId, onSave, onCancel }) {
  const [customerId, setCustomerId] = useState(initialCustomerId || "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const customer = customers.find((c) => c.id === customerId);
  const currentBalance = customer ? customerBalance(customer.id, invoices, receipts) : null;

  const submit = () => {
    if (!customerId) {
      setError("اختار عميل الأول");
      return;
    }
    if (amount === "" || Number(amount) <= 0) {
      setError("اكتب مبلغ صحيح");
      return;
    }
    onSave({ customerId, amount: Number(amount), date, note: note.trim() });
  };

  return (
    <div className="form">
      <label>
        العميل
        <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          <option value="">اختر عميل</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      {customer && (
        <div className="inline-hint">
          {currentBalance > 0
            ? `المستحق حالياً من ${customer.name}: ${fmtMoney(currentBalance)}`
            : currentBalance < 0
            ? `${customer.name} له رصيد دائن: ${fmtMoney(-currentBalance)}`
            : `${customer.name} ما عليهوش مستحقات دلوقتي`}
        </div>
      )}
      <div className="form-row two">
        <label>
          المبلغ المستلم
          <input
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
          />
        </label>
        <label>
          التاريخ
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      <label>
        ملاحظة (اختياري)
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثال: دفعة من حساب الشهر" />
      </label>
      {error && <div className="form-error">{error}</div>}
      <div className="form-actions">
        <button className="ghost-btn" onClick={onCancel}>
          إلغاء
        </button>
        <button className="primary-btn" onClick={submit}>
          تسجيل الاستلام
        </button>
      </div>
    </div>
  );
}

/* ==================================================
   SUPPLIERS & PAYMENTS
================================================== */

function SuppliersTab({ suppliers, setSuppliers, purchases, setPurchases, payments, setPayments }) {
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [purchaseSupplierId, setPurchaseSupplierId] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentSupplierId, setPaymentSupplierId] = useState("");

  const rows = suppliers.map((s) => ({
    ...s,
    balance: supplierBalance(s.id, purchases, payments),
  }));

  const allPurchases = [...purchases]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((p) => ({ ...p, supplierName: suppliers.find((s) => s.id === p.supplierId)?.name || "مورد محذوف" }));

  const allPayments = [...payments]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((p) => ({ ...p, supplierName: suppliers.find((s) => s.id === p.supplierId)?.name || "مورد محذوف" }));

  const saveSupplier = (data) => {
    if (editingSupplier) {
      setSuppliers(suppliers.map((s) => (s.id === editingSupplier.id ? { ...data, id: editingSupplier.id } : s)));
    } else {
      setSuppliers([{ ...data, id: uid() }, ...suppliers]);
    }
    setShowSupplierForm(false);
    setEditingSupplier(null);
  };

  const removeSupplier = (id) => setSuppliers(suppliers.filter((s) => s.id !== id));

  const openPurchase = (supplierId) => {
    setPurchaseSupplierId(supplierId || "");
    setPurchaseOpen(true);
  };
  const openPayment = (supplierId) => {
    setPaymentSupplierId(supplierId || "");
    setPaymentOpen(true);
  };

  const savePurchase = (purchase) => {
    setPurchases([{ ...purchase, id: uid() }, ...purchases]);
    setPurchaseOpen(false);
  };
  const savePayment = (payment) => {
    setPayments([{ ...payment, id: uid() }, ...payments]);
    setPaymentOpen(false);
  };
  const removePurchase = (id) => setPurchases(purchases.filter((p) => p.id !== id));
  const removePayment = (id) => setPayments(payments.filter((p) => p.id !== id));

  return (
    <div className="section">
      <div className="section-head">
        <div>
          <h2>الموردين</h2>
          <p className="section-hint">تابع اللي عليك للموردين وسجّل التوريدات والمدفوعات</p>
        </div>
        <div className="head-actions">
          <button className="ghost-btn" onClick={() => openPurchase("")}>
            <Package size={15} />
            توريد جديد
          </button>
          <button className="ghost-btn" onClick={() => openPayment("")}>
            <Banknote size={15} />
            دفع للمورد
          </button>
          <button
            className="primary-btn"
            onClick={() => {
              setEditingSupplier(null);
              setShowSupplierForm(true);
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            مورد جديد
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="لسه مفيش موردين" hint="ضيف مورد عشان تتابع حسابه وتسجل التوريدات منه" />
      ) : (
        <div className="panel">
          <table className="ledger-table wide">
            <thead>
              <tr>
                <th>المورد</th>
                <th>التليفون</th>
                <th>الحساب</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td className="cell-main">{s.name}</td>
                  <td className="cell-sub">{s.phone || "—"}</td>
                  <td className={s.balance > 0 ? "cell-amount neg" : "cell-amount pos"}>
                    {s.balance > 0
                      ? `عليك ${fmtMoney(s.balance)}`
                      : s.balance < 0
                      ? `لك رصيد ${fmtMoney(-s.balance)}`
                      : "مفيش مستحقات"}
                  </td>
                  <td className="row-actions">
                    <button className="link-btn" onClick={() => openPurchase(s.id)}>
                      توريد
                    </button>
                    <button className="link-btn" onClick={() => openPayment(s.id)}>
                      <span className="link-btn-icon">
                        <Banknote size={13} />
                      </span>
                      دفع
                    </button>
                    <button
                      className="link-btn"
                      onClick={() => {
                        setEditingSupplier(s);
                        setShowSupplierForm(true);
                      }}
                    >
                      تعديل
                    </button>
                    <button className="icon-btn danger" onClick={() => removeSupplier(s.id)}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="dash-cols">
        <section className="panel">
          <div className="panel-head">
            <h3>سجل التوريدات</h3>
          </div>
          {allPurchases.length === 0 ? (
            <EmptyState title="لسه مفيش توريدات مسجّلة" hint="سجّل أول توريد عن طريق زر “توريد جديد”" />
          ) : (
            <table className="ledger-table">
              <tbody>
                {allPurchases.map((p) => (
                  <tr key={p.id}>
                    <td className="cell-main">{p.supplierName}</td>
                    <td className="cell-sub">{fmtDate(p.date)}</td>
                    <td className={`cell-status ${p.status}`}>{p.status === "paid" ? "متسدد" : "غير متسدد"}</td>
                    <td className="cell-amount neg">{fmtMoney(p.amount)}</td>
                    <td>
                      <button className="icon-btn danger" onClick={() => removePurchase(p.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h3>سجل المدفوعات</h3>
          </div>
          {allPayments.length === 0 ? (
            <EmptyState title="لسه مفيش مدفوعات مسجّلة" hint="سجّل أول دفعة عن طريق زر “دفع للمورد”" />
          ) : (
            <table className="ledger-table">
              <tbody>
                {allPayments.map((p) => (
                  <tr key={p.id}>
                    <td className="cell-main">{p.supplierName}</td>
                    <td className="cell-sub">{fmtDate(p.date)}</td>
                    <td className="cell-sub">{p.note || "—"}</td>
                    <td className="cell-amount pos">{fmtMoney(p.amount)}</td>
                    <td>
                      <button className="icon-btn danger" onClick={() => removePayment(p.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {showSupplierForm && (
        <Modal
          title={editingSupplier ? "تعديل بيانات المورد" : "مورد جديد"}
          onClose={() => {
            setShowSupplierForm(false);
            setEditingSupplier(null);
          }}
        >
          <SupplierForm
            initial={editingSupplier}
            onSave={saveSupplier}
            onCancel={() => {
              setShowSupplierForm(false);
              setEditingSupplier(null);
            }}
          />
        </Modal>
      )}

      {purchaseOpen && (
        <Modal title="تسجيل توريد" onClose={() => setPurchaseOpen(false)}>
          <PurchaseForm
            suppliers={suppliers}
            initialSupplierId={purchaseSupplierId}
            onSave={savePurchase}
            onCancel={() => setPurchaseOpen(false)}
          />
        </Modal>
      )}

      {paymentOpen && (
        <Modal title="دفع للمورد" onClose={() => setPaymentOpen(false)}>
          <SupplierPaymentForm
            suppliers={suppliers}
            purchases={purchases}
            payments={payments}
            initialSupplierId={paymentSupplierId}
            onSave={savePayment}
            onCancel={() => setPaymentOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
}

function SupplierForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [error, setError] = useState("");

  const submit = () => {
    if (!name.trim()) {
      setError("اكتب اسم المورد");
      return;
    }
    onSave({ name: name.trim(), phone: phone.trim() });
  };

  return (
    <div className="form">
      <label>
        اسم المورد
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: شركة النور للتوريدات" />
      </label>
      <label>
        رقم التليفون (اختياري)
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01xxxxxxxxx" />
      </label>
      {error && <div className="form-error">{error}</div>}
      <div className="form-actions">
        <button className="ghost-btn" onClick={onCancel}>
          إلغاء
        </button>
        <button className="primary-btn" onClick={submit}>
          حفظ
        </button>
      </div>
    </div>
  );
}

function PurchaseForm({ suppliers, initialSupplierId, onSave, onCancel }) {
  const [supplierId, setSupplierId] = useState(initialSupplierId || "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayStr());
  const [status, setStatus] = useState("unpaid");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (!supplierId) {
      setError("اختار المورد الأول");
      return;
    }
    if (amount === "" || Number(amount) <= 0) {
      setError("اكتب مبلغ صحيح");
      return;
    }
    onSave({ supplierId, amount: Number(amount), date, status, note: note.trim() });
  };

  return (
    <div className="form">
      <label>
        المورد
        <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
          <option value="">اختر مورد</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <div className="form-row two">
        <label>
          قيمة التوريد
          <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        </label>
        <label>
          التاريخ
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      <label>
        وصف (اختياري)
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثال: توريد بضاعة رمضان" />
      </label>
      <label>
        حالة السداد
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="unpaid">غير متسدد (هيتضاف على حساب المورد)</option>
          <option value="paid">متسدد فوراً (كاش)</option>
        </select>
      </label>
      {error && <div className="form-error">{error}</div>}
      <div className="form-actions">
        <button className="ghost-btn" onClick={onCancel}>
          إلغاء
        </button>
        <button className="primary-btn" onClick={submit}>
          حفظ التوريد
        </button>
      </div>
    </div>
  );
}

function SupplierPaymentForm({ suppliers, purchases, payments, initialSupplierId, onSave, onCancel }) {
  const [supplierId, setSupplierId] = useState(initialSupplierId || "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const supplier = suppliers.find((s) => s.id === supplierId);
  const currentBalance = supplier ? supplierBalance(supplier.id, purchases, payments) : null;

  const submit = () => {
    if (!supplierId) {
      setError("اختار المورد الأول");
      return;
    }
    if (amount === "" || Number(amount) <= 0) {
      setError("اكتب مبلغ صحيح");
      return;
    }
    onSave({ supplierId, amount: Number(amount), date, note: note.trim() });
  };

  return (
    <div className="form">
      <label>
        المورد
        <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
          <option value="">اختر مورد</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      {supplier && (
        <div className="inline-hint">
          {currentBalance > 0
            ? `المستحق حالياً لـ ${supplier.name}: ${fmtMoney(currentBalance)}`
            : currentBalance < 0
            ? `لك رصيد عند ${supplier.name}: ${fmtMoney(-currentBalance)}`
            : `مفيش مستحقات لـ ${supplier.name} دلوقتي`}
        </div>
      )}
      <div className="form-row two">
        <label>
          المبلغ المدفوع
          <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        </label>
        <label>
          التاريخ
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      <label>
        ملاحظة (اختياري)
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثال: دفعة تحت الحساب" />
      </label>
      {error && <div className="form-error">{error}</div>}
      <div className="form-actions">
        <button className="ghost-btn" onClick={onCancel}>
          إلغاء
        </button>
        <button className="primary-btn" onClick={submit}>
          تسجيل الدفع
        </button>
      </div>
    </div>
  );
}

/* ==================================================
   STYLES
================================================== */

const CSS = `
:root {
  --ink: #1F2A24;
  --cover: #14231C;
  --cover-2: #1B3327;
  --page: #FBF8F0;
  --page-line: #E4DEC9;
  --gold: #C9A227;
  --gold-soft: #EADFB4;
  --green: #3B6E52;
  --green-soft: #E1EBE3;
  --brick: #A6432E;
  --brick-soft: #F3E0DA;
  --muted: #6B7168;
}

.app-root {
  font-family: 'IBM Plex Sans Arabic', 'Tajawal', sans-serif;
  background: var(--cover);
  background-image: radial-gradient(circle at 15% 0%, var(--cover-2), var(--cover) 55%);
  min-height: 100%;
  color: var(--ink);
  padding: 0 0 48px;
}

.app-root * { box-sizing: border-box; }

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px;
  flex-wrap: wrap;
  gap: 14px;
}

.brand { display: flex; align-items: center; gap: 12px; }
.brand-mark {
  width: 40px; height: 40px;
  border-radius: 10px;
  background: var(--gold);
  color: var(--cover);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Tajawal', sans-serif;
  font-weight: 900;
  font-size: 19px;
}
.brand-text { color: var(--page); line-height: 1.15; }
.brand-title { font-family: 'Tajawal', sans-serif; font-weight: 900; font-size: 19px; }
.brand-sub { font-size: 12.5px; color: #B9C4BA; }

.tabnav { display: flex; gap: 6px; background: rgba(251,248,240,0.06); padding: 5px; border-radius: 12px; }
.tab-btn {
  display: flex; align-items: center; gap: 7px;
  padding: 9px 16px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #C7D0C8;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.tab-btn:hover { background: rgba(251,248,240,0.08); }
.tab-btn.active { background: var(--page); color: var(--ink); font-weight: 600; }

.page-wrap { padding: 6px 28px 0; }
.page { max-width: 1080px; margin: 0 auto; }

.loading-row {
  display: flex; align-items: center; gap: 10px;
  color: var(--page);
  padding: 60px 0;
  justify-content: center;
  font-size: 14.5px;
}
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* dashboard */
.dash { display: flex; flex-direction: column; gap: 22px; }

.hero {
  background: var(--page);
  border-radius: 18px;
  padding: 30px 32px;
  text-align: center;
  border: 1px solid var(--page-line);
}
.hero-label { font-size: 14px; color: var(--muted); margin-bottom: 6px; }
.hero-number {
  font-family: 'Tajawal', sans-serif;
  font-weight: 900;
  font-size: clamp(34px, 6vw, 54px);
  letter-spacing: -0.5px;
}
.hero-number.pos { color: var(--green); }
.hero-number.neg { color: var(--brick); }
.hero-hint { font-size: 13.5px; color: var(--muted); margin-top: 6px; }

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
}
.stat-card {
  background: var(--page);
  border: 1px solid var(--page-line);
  border-radius: 14px;
  padding: 16px 18px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.stat-icon {
  width: 34px; height: 34px; border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.tone-green.stat-icon { background: var(--green-soft); color: var(--green); }
.tone-brick.stat-icon { background: var(--brick-soft); color: var(--brick); }
.tone-gold.stat-icon { background: var(--gold-soft); color: #8A6B10; }
.tone-ink.stat-icon { background: #ECEAE1; color: var(--ink); }

.stat-label { font-size: 12.5px; color: var(--muted); margin-bottom: 3px; }
.stat-value { font-family: 'Tajawal', sans-serif; font-weight: 700; font-size: 19px; }
.stat-value.tone-green { color: var(--green); }
.stat-value.tone-brick { color: var(--brick); }
.stat-value.tone-gold { color: #8A6B10; }
.stat-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }

.dash-cols {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.panel {
  background: var(--page);
  border: 1px solid var(--page-line);
  border-radius: 14px;
  padding: 18px 20px;
}
.panel-head {
  display: flex; align-items: baseline; justify-content: space-between;
  margin-bottom: 10px;
}
.panel-head h3 { font-family: 'Tajawal', sans-serif; font-size: 15.5px; font-weight: 700; margin: 0; }

.link-btn {
  background: none; border: none; cursor: pointer;
  color: #8A6B10; font-family: inherit; font-size: 13px; font-weight: 600;
  padding: 0;
}
.link-btn:hover { text-decoration: underline; }

/* section header */
.section { display: flex; flex-direction: column; gap: 18px; }
.section-head {
  display: flex; justify-content: space-between; align-items: flex-start;
  gap: 14px; flex-wrap: wrap;
}
.section-head h2 {
  font-family: 'Tajawal', sans-serif; color: var(--page); font-size: 24px;
  font-weight: 900; margin: 0 0 3px;
}
.section-hint { color: #B9C4BA; font-size: 13.5px; margin: 0; }
.head-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.head-actions .ghost-btn { background: var(--page); }

.primary-btn {
  display: flex; align-items: center; gap: 7px;
  background: var(--gold); color: var(--cover);
  border: none; border-radius: 10px;
  padding: 10px 18px;
  font-family: inherit; font-size: 14px; font-weight: 700;
  cursor: pointer;
  transition: filter 0.15s;
}
.primary-btn:hover { filter: brightness(1.06); }

.ghost-btn {
  display: flex; align-items: center; gap: 6px;
  background: transparent; border: 1px solid var(--page-line);
  border-radius: 9px; padding: 9px 16px;
  font-family: inherit; font-size: 13.5px; font-weight: 600; color: var(--ink);
  cursor: pointer;
}
.ghost-btn:hover { background: #F1EDE0; }

.icon-btn {
  border: none; background: transparent; cursor: pointer;
  color: var(--muted); padding: 6px; border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
}
.icon-btn:hover { background: #EFE9D8; }
.icon-btn.danger:hover { background: var(--brick-soft); color: var(--brick); }

/* tables */
.ledger-table { width: 100%; border-collapse: collapse; }
.ledger-table td, .ledger-table th {
  padding: 10px 8px;
  border-bottom: 1px solid var(--page-line);
  text-align: right;
  font-size: 13.5px;
}
.ledger-table th {
  color: var(--muted); font-weight: 600; font-size: 12.5px;
}
.ledger-table tr:last-child td { border-bottom: none; }
.cell-main { font-weight: 600; }
.cell-sub { color: var(--muted); }
.cell-amount { font-variant-numeric: tabular-nums; font-weight: 600; }
.cell-amount.warn { color: var(--brick); }
.cell-amount.neg { color: var(--brick); }
.cell-amount.pos { color: var(--green); }
.cell-status { font-size: 12.5px; font-weight: 600; }
.cell-status.paid { color: var(--green); }
.cell-status.unpaid { color: var(--brick); }
.row-actions { display: flex; gap: 4px; align-items: center; justify-content: flex-end; flex-wrap: wrap; }

.status-pill {
  border: none; border-radius: 999px; padding: 5px 12px;
  font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer;
}
.status-pill.paid { background: var(--green-soft); color: var(--green); }
.status-pill.unpaid { background: var(--brick-soft); color: var(--brick); }

/* empty state */
.empty-state {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 42px 20px; color: var(--muted); text-align: center;
}
.empty-title { font-weight: 700; color: var(--ink); font-size: 14.5px; }
.empty-hint { font-size: 13px; }

/* modal */
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(20,35,28,0.55);
  display: flex; align-items: center; justify-content: center;
  padding: 20px; z-index: 50;
}
.modal-card {
  background: var(--page); border-radius: 16px; width: 100%; max-width: 480px;
  max-height: 88vh; overflow-y: auto;
}
.modal-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: 18px 20px 12px; border-bottom: 1px solid var(--page-line);
}
.modal-head h3 { font-family: 'Tajawal', sans-serif; font-size: 16.5px; font-weight: 700; margin: 0; }
.modal-body { padding: 18px 20px 22px; }

/* forms */
.form { display: flex; flex-direction: column; gap: 14px; }
.form label {
  display: flex; flex-direction: column; gap: 6px;
  font-size: 13px; font-weight: 600; color: var(--muted);
}
.form input, .form select {
  font-family: inherit; font-size: 14px; color: var(--ink);
  border: 1px solid var(--page-line); border-radius: 9px;
  padding: 9px 11px; background: #fff;
}
.form input:focus, .form select:focus {
  outline: 2px solid var(--gold); outline-offset: 1px;
}
.form-row.two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.inline-add { display: flex; gap: 8px; align-items: center; }
.inline-add select, .inline-add input { flex: 1; }
.ghost-btn.small {
  padding: 8px 12px; font-size: 12.5px; white-space: nowrap;
  display: flex; align-items: center; gap: 4px;
}
.link-btn { display: inline-flex; align-items: center; gap: 4px; }
.link-btn-icon { display: inline-flex; }
.form-error {
  background: var(--brick-soft); color: var(--brick);
  border-radius: 8px; padding: 9px 12px; font-size: 13px; font-weight: 600;
}
.form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }

.lines-head { font-size: 13px; font-weight: 600; color: var(--muted); }
.lines { display: flex; flex-direction: column; gap: 8px; }
.line-row {
  display: grid; grid-template-columns: 1fr 64px 90px 30px; gap: 8px; align-items: center;
}
.line-row select, .line-row input {
  font-family: inherit; font-size: 13.5px;
  border: 1px solid var(--page-line); border-radius: 8px;
  padding: 8px 9px; background: #fff;
}
.qty-input { text-align: center; }
.line-price { font-size: 13px; font-weight: 600; text-align: center; }

.total-box {
  display: flex; align-items: center; justify-content: space-between;
  background: var(--gold-soft); border-radius: 10px; padding: 12px 14px;
  font-size: 13.5px; color: #6B540E;
}
.total-box strong { font-family: 'Tajawal', sans-serif; font-size: 17px; color: #6B540E; }

.inline-hint {
  background: var(--gold-soft); color: #6B540E; border-radius: 9px;
  padding: 10px 12px; font-size: 13px;
}
.inline-hint.warn {
  background: var(--brick-soft); color: var(--brick);
}

@media (max-width: 640px) {
  .topbar { padding: 16px 16px; }
  .page-wrap { padding: 0 14px; }
  .form-row.two { grid-template-columns: 1fr; }
  .line-row { grid-template-columns: 1fr 50px 70px 26px; }
}
`;
