import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import ChickenRecording from './pages/ChickenRecording';
import CashBook from './pages/CashBook';
import OtherIncome from './pages/OtherIncome';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

function AppContent() {
  const { user, isAuthenticated, loading, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="relative mb-4">
          <img src="/logo.svg" alt="KOYABHU" className="w-16 h-16 animate-pulse" />
        </div>
        <h2 className="text-lg font-bold tracking-wider text-emerald-400">KOYABHU BUMKam</h2>
        <p className="text-xs text-slate-400 mt-1">Memuat Sistem Informasi Peternakan & Keuangan...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  // PETUGAS KANDANG: Strictly restricted to ChickenRecording only
  if (!isAdmin) {
    return (
      <Layout activeTab="recording" setActiveTab={() => {}}>
        <ChickenRecording />
      </Layout>
    );
  }

  // ADMIN (Ketua BUMKam): Full access to all operational & financial modules
  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
      {activeTab === 'sales' && <Sales />}
      {activeTab === 'recording' && <ChickenRecording />}
      {activeTab === 'cashbook' && <CashBook />}
      {activeTab === 'income' && <OtherIncome />}
      {activeTab === 'expenses' && <Expenses />}
      {activeTab === 'reports' && <Reports />}
      {activeTab === 'settings' && <Settings />}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
