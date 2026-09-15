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
  const { user, isAuthenticated, loading, isAdmin, isPetugasPenjualan, allowedTabs } = useAuth();
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

  // Petugas Penjualan: Strictly restricted to Sales only
  if (isPetugasPenjualan) {
    return (
      <Layout activeTab="sales" setActiveTab={() => {}}>
        <Sales />
      </Layout>
    );
  }

  // Petugas Kandang: Strictly restricted to ChickenRecording only
  if (!isAdmin) {
    return (
      <Layout activeTab="recording" setActiveTab={() => {}}>
        <ChickenRecording />
      </Layout>
    );
  }

  // Fallback guard: if activeTab is not allowed for user, fallback to first allowed tab
  const currentTab = allowedTabs.includes(activeTab) ? activeTab : allowedTabs[0] || 'dashboard';

  // ADMIN (Ketua BUMKam): Full access to all operational & financial modules
  return (
    <Layout activeTab={currentTab} setActiveTab={setActiveTab}>
      {currentTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
      {currentTab === 'sales' && <Sales />}
      {currentTab === 'recording' && <ChickenRecording />}
      {currentTab === 'cashbook' && <CashBook />}
      {currentTab === 'income' && <OtherIncome />}
      {currentTab === 'expenses' && <Expenses />}
      {currentTab === 'reports' && <Reports />}
      {currentTab === 'settings' && <Settings />}
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
