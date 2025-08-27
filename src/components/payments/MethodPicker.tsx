import React from 'react';
import { CreditCard, Wallet, Smartphone, Banknote, Building } from 'lucide-react';

interface MethodPickerProps {
  methods: string[];
  selectedMethod: string;
  onMethodSelect: (method: string) => void;
}

const METHOD_ICONS = {
  card: CreditCard,
  wallet: Wallet,
  upi: Smartphone,
  cash: Banknote,
  bank_transfer: Building
};

const METHOD_LABELS = {
  card: 'Credit/Debit Card',
  wallet: 'Digital Wallet',
  upi: 'UPI',
  cash: 'Cash on Delivery',
  bank_transfer: 'Bank Transfer'
};

export default function MethodPicker({ methods, selectedMethod, onMethodSelect }: MethodPickerProps) {
  if (methods.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No payment methods configured</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Choose Payment Method</h3>
      <div className="grid gap-3">
        {methods.map((method) => {
          const Icon = METHOD_ICONS[method as keyof typeof METHOD_ICONS] || CreditCard;
          const label = METHOD_LABELS[method as keyof typeof METHOD_LABELS] || method;
          
          return (
            <button
              key={method}
              onClick={() => onMethodSelect(method)}
              className={`flex items-center p-4 border-2 rounded-lg transition-all ${
                selectedMethod === method
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <Icon className="h-5 w-5 mr-3" />
              <span className="font-medium">{label}</span>
              {selectedMethod === method && (
                <div className="ml-auto w-2 h-2 bg-indigo-500 rounded-full"></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}