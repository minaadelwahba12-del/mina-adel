import React, { useState } from 'react';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function ExpenseForm({ onSave, onCancel }) {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const [error, setError] = useState('');

  const submit = () => {
    if (!description.trim()) {
      setError('اكتب وصف المصروف');
      return;
    }
    if (amount === '' || Number(amount) <= 0) {
      setError('اكتب مبلغ صحيح');
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
