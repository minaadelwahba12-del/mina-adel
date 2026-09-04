import React, { useState } from 'react';

const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtMoney = (n) =>
  (Number(n) || 0).toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ج.م';

function customerBalance(customerId, invoices, receipts) {
  const debt = invoices
    .filter((i) => i.customerId === customerId && i.status === 'unpaid')
    .reduce((s, i) => s + i.total, 0);
  const received = receipts
    .filter((r) => r.customerId === customerId)
    .reduce((s, r) => s + Number(r.amount || 0), 0);
  return debt - received;
}

export default function ReceiptForm({ customers, invoices, receipts, initialCustomerId, onSave, onCancel }) {
  const [customerId, setCustomerId] = useState(initialCustomerId || '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const customer = customers.find((c) => c.id === customerId);
  const currentBalance = customer ? customerBalance(customer.id, invoices, receipts) : null;

  const submit = () => {
    if (!customerId) {
      setError('اختار عميل الأول');
      return;
    }
    if (amount === '' || Number(amount) <= 0) {
      setError('اكتب مبلغ صحيح');
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
