import React, { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import Modal from './Modal';
import InvoiceForm from './forms/InvoiceForm';

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const fmtMoney = (n) =>
  (Number(n) || 0).toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ج.م';
const fmtDate = (d) => {
  try {
    return new Date(d).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
};

export default function InvoicesTab({ invoices, setInvoices, products, setProducts, customers, setCustomers }) {
  const [showForm, setShowForm] = useState(false);
  const sorted = [...invoices].sort((a, b) => (a.date < b.date ? 1 : -1));

  const toggleStatus = (id) => {
    setInvoices(
      invoices.map((inv) =>
        inv.id === id ? { ...inv, status: inv.status === 'paid' ? 'unpaid' : 'paid' } : inv
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
        <div className="empty-state">
          <div className="empty-title">لسه مفيش فواتير</div>
          <div className="empty-hint">اضغط "فاتورة جديدة" عشان تبدأ</div>
        </div>
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
                  <td className="cell-main">{inv.customer || 'عميل نقدي'}</td>
                  <td className="cell-sub">{fmtDate(inv.date)}</td>
                  <td className="cell-sub">{inv.items.length}</td>
                  <td className="cell-amount">{fmtMoney(inv.total)}</td>
                  <td>
                    <button
                      className={`status-pill ${inv.status}`}
                      onClick={() => toggleStatus(inv.id)}
                      title="اضغط لتغيير الحالة"
                    >
                      {inv.status === 'paid' ? 'متحصلة' : 'غير متحصلة'}
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
