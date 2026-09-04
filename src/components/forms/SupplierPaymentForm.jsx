import React, { useState } from 'react';

const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtMoney = (n) =>
  (Number(n) || 0).toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ج.م';

function supplierBalance(supplierId, purchases, payments) {
  const owed = purchases
    .filter((p) => p.supplierId === supplierId && p.status === 'unpaid')
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const paid = payments
    .filter((p) => p.supplierId === supplierId)
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  return owed - paid;
}

export default function SupplierPaymentForm({ suppliers, purchases, payments, initialSupplierId, onSave, onCancel }) {
  const [supplierId, setSupplierId] = useState(initialSupplierId || '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const supplier = suppliers.find((s) => s.id === supplierId);
  const currentBalance = supplier ? supplierBalance(supplier.id, purchases, payments) : null;

  const submit = () => {
    if (!supplierId) {
      setError('اختار المورد الأول');
      return;
    }
    if (amount === '' || Number(amount) <= 0) {
      setError('اكتب مبلغ صحيح');
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
