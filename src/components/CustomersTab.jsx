import React, { useState } from 'react';
import { Plus, Trash2, Banknote } from 'lucide-react';
import Modal from './Modal';
import CustomerForm from './forms/CustomerForm';
import ReceiptForm from './forms/ReceiptForm';

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

function customerBalance(customerId, invoices, receipts) {
  const debt = invoices
    .filter((i) => i.customerId === customerId && i.status === 'unpaid')
    .reduce((s, i) => s + i.total, 0);
  const received = receipts
    .filter((r) => r.customerId === customerId)
    .reduce((s, r) => s + Number(r.amount || 0), 0);
  return debt - received;
}

export default function CustomersTab({ customers, setCustomers, invoices, receipts, setReceipts }) {
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptCustomerId, setReceiptCustomerId] = useState('');

  const rows = customers.map((c) => ({
    ...c,
    balance: customerBalance(c.id, invoices, receipts),
  }));

  const allReceipts = [...receipts]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((r) => ({ ...r, customerName: customers.find((c) => c.id === r.customerId)?.name || 'عميل محذوف' }));

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
    setReceiptCustomerId(customerId || '');
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
          <button className="ghost-btn" onClick={() => openReceipt('')}>
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
        <div className="empty-state">
          <div className="empty-title">لسه مفيش عملاء</div>
          <div className="empty-hint">ضيف عميل عشان تتابع حسابه، أو اختاره وانت بتعمل فاتورة</div>
        </div>
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
                  <td className="cell-sub">{c.phone || '—'}</td>
                  <td className={c.balance > 0 ? 'cell-amount neg' : 'cell-amount pos'}>
                    {c.balance > 0
                      ? `عليه ${fmtMoney(c.balance)}`
                      : c.balance < 0
                      ? `له رصيد ${fmtMoney(-c.balance)}`
                      : 'لا يوجد مستحقات'}
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
          <div className="empty-state">
            <div className="empty-title">لسه مفيش تحصيل مسجّل</div>
            <div className="empty-hint">سجّل أول تحصيل عن طريق زر "تحصيل جديد"</div>
          </div>
        ) : (
          <table className="ledger-table">
            <tbody>
              {allReceipts.map((r) => (
                <tr key={r.id}>
                  <td className="cell-main">{r.customerName}</td>
                  <td className="cell-sub">{fmtDate(r.date)}</td>
                  <td className="cell-sub">{r.note || '—'}</td>
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
          title={editingCustomer ? 'تعديل بيانات العميل' : 'عميل جديد'}
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
