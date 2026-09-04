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
import Dashboard from "./Dashboard";
import InvoicesTab from "./InvoicesTab";
import InventoryTab from "./InventoryTab";
import ExpensesTab from "./ExpensesTab";
import CustomersTab from "./CustomersTab";
import SuppliersTab from "./SuppliersTab";

/* ---------------------------------------------------------
   Ledger & Vault — shop accounting (Desktop App)
   Tabs: Dashboard / Invoices / Inventory / Expenses / Customers / Suppliers
   Persistence: Electron IPC with local file storage
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

/* ---------------- storage helpers for Electron ---------------- */

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
  } catch (error) {
    console.error("Error saving to storage:", error);
  }
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
  min-height: 100vh;
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

/* section */
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
  background: transparent; border: 1px solid var(--page-line);\n  border-radius: 9px; padding: 9px 16px;
  font-family: inherit; font-size: 13.5px; font-weight: 600; color: var(--ink);
  cursor: pointer;
}
.ghost-btn:hover { background: #F1EDE0; }
.ghost-btn.small {
  padding: 8px 12px; font-size: 12.5px; white-space: nowrap;
  display: flex; align-items: center; gap: 4px;
}

.icon-btn {
  border: none; background: transparent; cursor: pointer;
  color: var(--muted); padding: 6px; border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
}
.icon-btn:hover { background: #EFE9D8; }
.icon-btn.danger:hover { background: var(--brick-soft); color: var(--brick); }

.link-btn {
  background: none; border: none; cursor: pointer;
  color: #8A6B10; font-family: inherit; font-size: 13px; font-weight: 600;
  padding: 0; display: inline-flex; align-items: center; gap: 4px;
}
.link-btn:hover { text-decoration: underline; }
.link-btn-icon { display: inline-flex; }

/* panel */
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

@media (max-width: 640px) {
  .topbar { padding: 16px 16px; }
  .page-wrap { padding: 0 14px; }
  .form-row.two { grid-template-columns: 1fr; }
  .line-row { grid-template-columns: 1fr 50px 70px 26px; }
  .section-head { flex-direction: column; }
  .head-actions { width: 100%; flex-direction: column; }
  .head-actions button { width: 100%; }
}
`;
