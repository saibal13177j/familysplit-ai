import React from 'react';
import Button from './Button.jsx';
import Card from './Card.jsx';

export default function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', danger, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center" onClick={onCancel}>
      <Card className="w-full max-w-sm p-5 sm:m-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
        {description && <p className="mt-1.5 text-sm text-gray-500">{description}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </Card>
    </div>
  );
}
