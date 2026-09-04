import React, { useState } from 'react';

export default function SupplierForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || '');
  const [phone, setPhone] = useState(initial?.phone || '');
  const [error, setError] = useState('');

  const submit = () => {
    if (!name.trim()) {
      setError('اكتب اسم المورد');
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
