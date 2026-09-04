import React, { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtMoney = (n) =>
  (Number(n) || 0).toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ج.م';

export default function InvoiceForm({ products, customers, setCustomers, onCreate, onCancel }) {
  const [customerId, setCustomerId] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [date, setDate] = useState(todayStr());
  const [status, setStatus] = useState('paid');
  const [lines, setLines] = useState([{ id: uid(), productId: '', qty: 1, price: 0, cost: 0, name: '' }]);
  const [error, setError] = useState('');

  const addLine = () =>
    setLines([...lines, { id: uid(), productId: '', qty: 1, price: 0, cost: 0, name: '' }]);
  const removeLine = (id) => setLines(lines.filter((l) => l.id !== id));

  const updateLine = (id, patch) => {
    setLines(
      lines.map((l) => {
        if (l.id !== id) return l;
        const next = { ...l, ...patch };
        if (patch.productId !== undefined) {
          const prod = products.find((p) => p.id === patch.productId);
          next.price = prod ? prod.price : 0;
          next.cost = prod ? Number(prod.costPrice || 0) : 0;
          next.name = prod ? prod.name : '';
        }
        return next;
      })
    );
  };

  const validLines = lines.filter((l) => l.productId && Number(l.qty) > 0);
  const total = validLines.reduce((s, l) => s + Number(l.qty) * Number(l.price), 0);

  const submit = () => {
    if (validLines.length === 0) {
      setError('لازم تختار صنف واحد على الأقل');
      return;
    }
    for (const l of validLines) {
      const prod = products.find((p) => p.id === l.productId);
      if (prod && Number(l.qty) > Number(prod.qty)) {
        setError(`الكمية المطلوبة من "${prod.name}" أكبر من المتاح بالمخزون (${prod.qty})`);
        return;
      }
    }
    const selectedCustomer = customers.find((c) => c.id === customerId);
    const invoice = {
      id: uid(),
      customerId: selectedCustomer ? selectedCustomer.id : null,
      customer: selectedCustomer ? selectedCustomer.name : 'عميل نقدي',
      date,
      status,
      items: validLines.map((l) => ({
        name: l.name,
        qty: Number(l.qty),
        price: Number(l.price),
        cost: Number(l.cost || 0),
      })),
      total,
    };
    const stockChanges = validLines.map((l) => ({ productId: l.productId, qty: Number(l.qty) }));
    onCreate(invoice, stockChanges);
  };

  const confirmNewCustomer = () => {
    if (!newCustomerName.trim()) return;
    const newCustomer = { id: uid(), name: newCustomerName.trim(), phone: '' };
    setCustomers([newCustomer, ...customers]);
    setCustomerId(newCustomer.id);
    setNewCustomerName('');
    setAddingCustomer(false);
  };

  return (
    <div className="form">
      <div className="form-row two">
        <label>
          العميل
          {addingCustomer ? (
            <div className="inline-add">
              <input
                autoFocus
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="اسم العميل الجديد"
                onKeyDown={(e) => e.key === 'Enter' && confirmNewCustomer()}
              />
              <button className="ghost-btn small" onClick={confirmNewCustomer}>
                إضافة
              </button>
              <button className="icon-btn" onClick={() => setAddingCustomer(false)}>
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="inline-add">
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">عميل نقدي (بدون تسجيل)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button className="ghost-btn small" onClick={() => setAddingCustomer(true)}>
                <Plus size={13} /> عميل جديد
              </button>
            </div>
          )}
        </label>
        <label>
          التاريخ
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>

      <div className="lines-head">
        <span>الأصناف</span>
      </div>

      {products.length === 0 ? (
        <div className="inline-hint">
          لسه معندكش أصناف بالمخزون. ضيف أصناف من تبويب "المخزون" الأول.
        </div>
      ) : (
        <div className="lines">
          {lines.map((line) => {
            const prod = products.find((p) => p.id === line.productId);
            return (
              <div className="line-row" key={line.id}>
                <select
                  value={line.productId}
                  onChange={(e) => updateLine(line.id, { productId: e.target.value })}
                >
                  <option value="">اختر صنف</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — متاح {p.qty}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  className="qty-input"
                  value={line.qty}
                  onChange={(e) => updateLine(line.id, { qty: e.target.value })}
                />
                <div className="line-price">{prod ? fmtMoney(prod.price * Number(line.qty || 0)) : '—'}</div>
                <button className="icon-btn danger" onClick={() => removeLine(line.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
          <button className="ghost-btn" onClick={addLine}>
            <Plus size={14} /> ضيف صنف
          </button>
        </div>
      )}

      <div className="form-row two">
        <label>
          حالة التحصيل
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="paid">متحصلة</option>
            <option value="unpaid">غير متحصلة</option>
          </select>
        </label>
        <div className="total-box">
          <span>الإجمالي</span>
          <strong>{fmtMoney(total)}</strong>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="form-actions">
        <button className="ghost-btn" onClick={onCancel}>
          إلغاء
        </button>
        <button className="primary-btn" onClick={submit}>
          حفظ الفاتورة
        </button>
      </div>
    </div>
  );
}
