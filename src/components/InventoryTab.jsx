import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Modal from './Modal';
import ProductForm from './forms/ProductForm';

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const fmtMoney = (n) =>
  (Number(n) || 0).toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ج.م';
const LOW_STOCK_THRESHOLD = 5;

export default function InventoryTab({ products, setProducts }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const removeProduct = (id) => setProducts(products.filter((p) => p.id !== id));

  const saveProduct = (product) => {
    if (editing) {
      setProducts(products.map((p) => (p.id === editing.id ? { ...product, id: editing.id } : p)));
    } else {
      setProducts([{ ...product, id: uid() }, ...products]);
    }
    setShowForm(false);
    setEditing(null);
  };

  return (
    <div className="section">
      <div className="section-head">
        <div>
          <h2>المخزون</h2>
          <p className="section-hint">تابع أصناف المحل وأسعارها والكميات المتاحة</p>
        </div>
        <button
          className="primary-btn"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
          صنف جديد
        </button>
      </div>

      {products.length === 0 ? (
        <div className="empty-state">
          <div className="empty-title">لسه مفيش أصناف</div>
          <div className="empty-hint">اضغط "صنف جديد" عشان تضيف أول منتج</div>
        </div>
      ) : (
        <div className="panel">
          <table className="ledger-table wide">
            <thead>
              <tr>
                <th>الصنف</th>
                <th>التصنيف</th>
                <th>سعر الشراء</th>
                <th>سعر البيع</th>
                <th>هامش الربح</th>
                <th>الكمية</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const margin = Number(p.price) - Number(p.costPrice || 0);
                return (
                  <tr key={p.id}>
                    <td className="cell-main">{p.name}</td>
                    <td className="cell-sub">{p.category || '—'}</td>
                    <td className="cell-sub">{fmtMoney(p.costPrice || 0)}</td>
                    <td className="cell-amount">{fmtMoney(p.price)}</td>
                    <td className={margin < 0 ? 'cell-amount neg' : 'cell-amount'}>{fmtMoney(margin)}</td>
                    <td className={Number(p.qty) <= LOW_STOCK_THRESHOLD ? 'cell-amount warn' : 'cell-amount'}>
                      {p.qty}
                    </td>
                    <td className="row-actions">
                      <button
                        className="link-btn"
                        onClick={() => {
                          setEditing(p);
                          setShowForm(true);
                        }}
                      >
                        تعديل
                      </button>
                      <button className="icon-btn danger" onClick={() => removeProduct(p.id)}>
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal
          title={editing ? 'تعديل الصنف' : 'صنف جديد'}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
        >
          <ProductForm
            initial={editing}
            onSave={saveProduct}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
