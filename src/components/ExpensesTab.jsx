import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Modal from './Modal';
import ExpenseForm from './forms/ExpenseForm';

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

export default function ExpensesTab({ expenses, setExpenses }) {
  const [showForm, setShowForm] = useState(false);
  const sorted = [...expenses].sort((a, b) => (a.date < b.date ? 1 : -1));

  const removeExpense = (id) => setExpenses(expenses.filter((e) => e.id !== id));

  const addExpense = (expense) => {
    setExpenses([{ ...expense, id: uid() }, ...expenses]);
    setShowForm(false);
  };

  return (
    <div className="section">
      <div className="section-head">
        <div>
          <h2>المصروفات</h2>
          <p className="section-hint">سجّل مصاريف المحل زي الإيجار والفواتير والتوريد</p>
        </div>
        <button className="primary-btn" onClick={() => setShowForm(true)}>
          <Plus size={16} strokeWidth={2.5} />
          مصروف جديد
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="empty-state">
          <div className="empty-title">لسه مفيش مصروفات مسجّلة</div>
          <div className="empty-hint">اضغط "مصروف جديد" عشان تبدأ التسجيل</div>
        </div>
      ) : (
        <div className="panel">
          <table className="ledger-table wide">
            <thead>
              <tr>
                <th>الوصف</th>
                <th>التصنيف</th>
                <th>التاريخ</th>
                <th>المبلغ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((e) => (
                <tr key={e.id}>
                  <td className="cell-main">{e.description}</td>
                  <td className="cell-sub">{e.category || '—'}</td>
                  <td className="cell-sub">{fmtDate(e.date)}</td>
                  <td className="cell-amount neg">{fmtMoney(e.amount)}</td>
                  <td>
                    <button className="icon-btn danger" onClick={() => removeExpense(e.id)}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal title="مصروف جديد" onClose={() => setShowForm(false)}>
          <ExpenseForm onSave={addExpense} onCancel={() => setShowForm(false)} />
        </Modal>
      )}
    </div>
  );
}
