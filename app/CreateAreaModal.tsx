'use client';

import { useState, type FormEvent } from 'react';

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface AreaData {
  name: string;
  items: LineItem[];
}

interface CreateAreaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (areaData: AreaData) => void;
}

const emptyItem = (): LineItem => ({ description: '', quantity: 1, unitPrice: 0 });

const inputClass =
  'bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500';

export default function CreateAreaModal({ isOpen, onClose, onSave }: CreateAreaModalProps) {
  const [areaName, setAreaName] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyItem()]);

  if (!isOpen) return null;

  const handleAddLineItem = () => {
    setLineItems([...lineItems, emptyItem()]);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const resetForm = () => {
    setAreaName('');
    setLineItems([emptyItem()]);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave({ name: areaName.trim(), items: lineItems });
    resetForm();
    onClose();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl max-w-2xl w-full p-6 shadow-2xl border border-slate-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-100">Create New Area</h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-200"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-300">Area Name</label>
            <input
              type="text"
              placeholder="e.g., Living Room / Exterior Trim"
              value={areaName}
              onChange={(e) => setAreaName(e.target.value)}
              className={`w-full ${inputClass}`}
              required
            />
          </div>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-300">Line Items</label>
            {lineItems.map((item, index) => (
              <div key={index} className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Item description"
                  value={item.description}
                  onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                  className={`flex-1 min-w-0 ${inputClass}`}
                  required
                />
                <input
                  type="number"
                  placeholder="Qty"
                  min={0}
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                  className={`w-20 ${inputClass}`}
                  aria-label="Quantity"
                />
                <input
                  type="number"
                  placeholder="Price"
                  min={0}
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                  className={`w-28 ${inputClass}`}
                  aria-label="Unit price"
                />
                {lineItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveLineItem(index)}
                    className="text-slate-400 hover:text-rose-400 px-1"
                    aria-label="Remove line item"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddLineItem}
              className="text-sm text-amber-500 hover:underline"
            >
              + Add another line item
            </button>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-slate-700 rounded-lg text-slate-200 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white font-bold rounded-lg shadow-lg shadow-blue-500/20 transition-all"
            >
              Save Area
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
