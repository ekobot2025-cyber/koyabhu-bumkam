import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout({ activeTab, setActiveTab, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f4f8f5] flex">
      {/* Sidebar navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        <footer className="py-4 px-6 border-t border-emerald-100/70 bg-white text-center text-xs text-slate-500 font-medium no-print">
          © 2026 KOMPLIT - BUMKAM KOYABHU • Kelompok 3 Kelas B • Teknologi Digital Akuntansi • S1 Akuntansi FEB Uncen • All rights reserved.
        </footer>
      </div>
    </div>
  );
}
