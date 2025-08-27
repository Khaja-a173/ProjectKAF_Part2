import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQRContext } from '../lib/api';
import { QrCode, AlertCircle } from 'lucide-react';

interface QRContext {
  tenant: {
    id: string;
    name: string;
    code: string;
    branding: any;
  };
  table: {
    id: string;
    number: string;
    section?: string;
    capacity: number;
  };
}

export default function ScanEntry() {
  const { tenantCode, tableNumber } = useParams<{ tenantCode: string; tableNumber: string }>();
  const navigate = useNavigate();
  const [context, setContext] = useState<QRContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tenantCode && tableNumber) {
      loadContext();
    }
  }, [tenantCode, tableNumber]);

  const loadContext = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getQRContext(tenantCode!, tableNumber!);
      setContext(data);
      
      // Store context in sessionStorage for use in other pages
      sessionStorage.setItem('qr_context', JSON.stringify(data));
      
      // Auto-navigate to menu after a brief delay
      setTimeout(() => {
        navigate(`/menu/${tenantCode}`);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to load restaurant information');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading restaurant information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to Load</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadContext}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!context) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Invalid QR code</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
        <QrCode className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome to {context.tenant.name}
        </h1>
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600 mb-1">You're seated at</p>
          <p className="text-lg font-semibold text-gray-900">
            Table {context.table.number}
            {context.table.section && (
              <span className="text-sm text-gray-500 ml-2">({context.table.section})</span>
            )}
          </p>
        </div>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mr-2"></div>
          <p className="text-gray-600">Loading menu...</p>
        </div>
      </div>
    </div>
  );
}