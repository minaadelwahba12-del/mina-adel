import React, { useState } from 'react';
import { Plus, Trash2, Banknote, Package } from 'lucide-react';
import Modal from './Modal';
import SupplierForm from './forms/SupplierForm';
import PurchaseForm from './forms/PurchaseForm';
import SupplierPaymentForm from './forms/SupplierPaymentForm';

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

function supplierBalance(supplierId, purchases, payments) {
  const owed = purchases
    .filter((p) => p.supplierId === supplierId && p.status === 'unpaid')
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const paid = payments
    .filter((p) => p.supplierId === supplierId)
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  return owed - paid;
}

export default function SuppliersTab({ suppliers, setSuppliers, purchases, setPurchases, payments, setPayments }) {
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [purchaseSupplierId, setPurchaseSupplierId] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentSupplierId, setPaymentSupplierId] = useState('');

  const rows = suppliers.map((s) => ({
    ...s,
    balance: supplierBalance(s.id, purchases, payments),
  }));

  const allPurchases = [...purchases]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((p) => ({ ...p, supplierName: suppliers.find((s) => s.id === p.supplierId)?.name || 'مورد محذوف' }));

  const allPayments = [...payments]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((p) => ({ ...p, supplierName: suppliers.find((s) => s.id === p.supplierId)?.name || 'مورد محذوف' }));

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
    setPurchaseSupplierId(supplierId || '');
    setPurchaseOpen(true);
  };
  const openPayment = (supplierId) => {
    setPaymentSupplierId(supplierId || '');
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
          <button className="ghost-btn" onClick={() => openPurchase('')}>
            <Package size={15} />
            توريد جديد
          </button>
          <button className="ghost-btn" onClick={() => openPayment('')}>
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
        <div className="empty-state">
          <div className="empty-title">لسه مفيش موردين</div>
          <div className="empty-hint">ضيف مورد عشان تتابع حسابه وتسجل التوريدات منه</div>
        </div>
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
                  <td className="cell-sub">{s.phone || '—'}</td>
                  <td className={s.balance > 0 ? 'cell-amount neg' : 'cell-amount pos'}>
                    {s.balance > 0
                      ? `عليك ${fmtMoney(s.balance)}`
                      : s.balance < 0
                      ? `لك رصيد ${fmtMoney(-s.balance)}`
                      : 'مفيش مستحقات'}
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
            <div className="empty-state">
              <div className="empty-title">لسه مفيش توريدات مسجّلة</div>
              <div className="empty-hint">سجّل أول توريد عن طريق زر "توريد جديد"</div>
            </div>
          ) : (
            <table className="ledger-table">
              <tbody>
                {allPurchases.map((p) => (
                  <tr key={p.id}>
                    <td className="cell-main">{p.supplierName}</td>
                    <td className="cell-sub">{fmtDate(p.date)}</td>
                    <td className={`cell-status ${p.status}`}>{p.status === 'paid' ? 'متسدد' : 'غير متسدد'}</td>
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
            <div className="empty-state">
              <div className="empty-title">لسه مفيش مدفوعات مسجّلة</div>
              <div className="empty-hint">سجّل أول دفعة عن طريق زر "دفع للمورد"</div>
            </div>
          ) : (
            <table className="ledger-table">
              <tbody>
                {allPayments.map((p) => (
                  <tr key={p.id}>
                    <td className="cell-main">{p.supplierName}</td>
                    <td className="cell-sub">{fmtDate(p.date)}</td>
                    <td className="cell-sub">{p.note || '—'}</td>
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
          title={editingSupplier ? 'تعديل بيانات المورد' : 'مورد جديد'}
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
