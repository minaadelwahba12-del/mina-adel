import React, { useState } from 'react';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function PurchaseForm({ suppliers, initialSupplierId, onSave, onCancel }) {
  const [supplierId, setSupplierId] = useState(initialSupplierId || '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const [status, setStatus] = useState('unpaid');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (!supplierId) {
      setError('اختار المورد الأول');
      return;
    }
    if (amount === '' || Number(amount) <= 0) {
      setError('اكتب مبلغ صحيح');
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
