import React, { useState } from 'react';

const fmtMoney = (n) =>
  (Number(n) || 0).toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ج.م';

export default function ProductForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || '');
  const [category, setCategory] = useState(initial?.category || '');
  const [costPrice, setCostPrice] = useState(initial?.costPrice ?? '');
  const [price, setPrice] = useState(initial?.price ?? '');
  const [qty, setQty] = useState(initial?.qty ?? '');
  const [error, setError] = useState('');

  const margin =
    price !== '' && costPrice !== '' ? Number(price) - Number(costPrice) : null;

  const submit = () => {
    if (!name.trim()) {
      setError('اكتب اسم الصنف');
      return;
    }
    if (costPrice === '' || Number(costPrice) < 0) {
      setError('اكتب سعر شراء صحيح');
      return;
    }
    if (price === '' || Number(price) < 0) {
      setError('اكتب سعر بيع صحيح');
      return;
    }
    if (qty === '' || Number(qty) < 0) {
      setError('اكتب كمية صحيحة');
      return;
    }
    onSave({
      name: name.trim(),
      category: category.trim(),
      costPrice: Number(costPrice),
      price: Number(price),
      qty: Number(qty),
    });
  };

  return (
    <div className="form">
      <label>
        اسم الصنف
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: زيت عباد الشمس ١ لتر" />
      </label>
      <label>
        التصنيف (اختياري)
        <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="مثال: بقالة" />
      </label>
      <div className="form-row two">
        <label>
          سعر الشراء
          <input
            type="number"
            min="0"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            placeholder="0"
          />
        </label>
        <label>
          سعر البيع
          <input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
        </label>
      </div>
      <label>
        الكمية المتاحة
        <input type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" />
      </label>
      {margin !== null && (
        <div className={`inline-hint ${margin < 0 ? 'warn' : ''}`}>
          هامش الربح للوحدة: {fmtMoney(margin)}
          {margin < 0 ? ' — سعر البيع أقل من سعر الشراء' : ''}
        </div>
      )}
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
