import React from 'react';
import { CheckCircle2, Package, Wallet, Users, Truck, AlertTriangle } from 'lucide-react';

const fmtMoney = (n) =>
  (Number(n) || 0).toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ج.م';

const fmtDate = (d) => {
  try {
    return new Date(d).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
};

const LOW_STOCK_THRESHOLD = 5;

function StatCard({ label, value, tone = 'ink', icon: Icon, sub }) {
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

export default function Dashboard({ totals, products, invoices, expenses, customers, receipts, suppliers, purchases, payments, goTo }) {
  const recentInvoices = [...invoices].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5);
  const lowStockItems = products.filter((p) => Number(p.qty) <= LOW_STOCK_THRESHOLD);

  return (
    <div className="dash">
      <div className="hero">
        <div className="hero-label">صافي الربح</div>
        <div className={`hero-number ${totals.net >= 0 ? 'pos' : 'neg'}`}>{fmtMoney(totals.net)}</div>
        <div className="hero-hint">
          {totals.net >= 0
            ? 'مبيعاتك أكبر من مصروفاتك — استمر كده'
            : 'مصروفاتك أكبر من مبيعاتك دلوقتي'}
        </div>
      </div>

      <div className="stat-grid">
        <StatCard label="إجمالي المبيعات" value={fmtMoney(totals.sales)} tone="green" icon={CheckCircle2} />
        <StatCard
          label="ربح البضاعة المباعة"
          value={fmtMoney(totals.grossProfit)}
          tone={totals.grossProfit >= 0 ? 'green' : 'brick'}
          icon={Package}
          sub="الفرق بين سعر البيع وسعر الشراء"
        />
        <StatCard label="إجمالي المصروفات" value={fmtMoney(totals.exp)} tone="brick" icon={Wallet} />
        <StatCard
          label="مستحق من العملاء"
          value={fmtMoney(totals.receivable)}
          tone={totals.receivable > 0 ? 'gold' : 'green'}
          icon={Users}
          sub="بعد خصم المقبوضات النقدية"
        />
        <StatCard
          label="مستحق للموردين"
          value={fmtMoney(totals.payable)}
          tone={totals.payable > 0 ? 'brick' : 'green'}
          icon={Truck}
          sub="بعد خصم المدفوعات"
        />
        <StatCard
          label="أصناف قاربت تخلص"
          value={totals.lowStock}
          tone={totals.lowStock > 0 ? 'brick' : 'green'}
          icon={AlertTriangle}
        />
      </div>

      <div className="dash-cols">
        <section className="panel">
          <div className="panel-head">
            <h3>أحدث الفواتير</h3>
            <button className="link-btn" onClick={() => goTo('invoices')}>
              عرض الكل
            </button>
          </div>
          {recentInvoices.length === 0 ? (
            <div className="empty-state">
              <div className="empty-title">لسه مفيش فواتير</div>
              <div className="empty-hint">أول فاتورة تعملها هتظهر هنا</div>
            </div>
          ) : (
            <table className="ledger-table">
              <tbody>
                {recentInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="cell-main">{inv.customer || 'عميل نقدي'}</td>
                    <td className="cell-sub">{fmtDate(inv.date)}</td>
                    <td className={`cell-status ${inv.status}`}>
                      {inv.status === 'paid' ? 'متحصلة' : 'غير متحصلة'}
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
            <button className="link-btn" onClick={() => goTo('inventory')}>
              عرض الكل
            </button>
          </div>
          {lowStockItems.length === 0 ? (
            <div className="empty-state">
              <div className="empty-title">المخزون تمام</div>
              <div className="empty-hint">مفيش صنف قارب يخلص</div>
            </div>
          ) : (
            <table className="ledger-table">
              <tbody>
                {lowStockItems.map((p) => (
                  <tr key={p.id}>
                    <td className="cell-main">{p.name}</td>
                    <td className="cell-sub">{p.category || 'بدون تصنيف'}</td>\n                    <td className="cell-amount warn">{p.qty} متبقي</td>
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
