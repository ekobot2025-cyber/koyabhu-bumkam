import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  FileText,
  Settings,
  X,
  Layers
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

export default function Sidebar({ activeTab, setActiveTab, isOpen, onClose }) {
  const { user, isAdmin } = useAuth();

  const menuSections = isAdmin
    ? [
        {
          title: null,
          items: [
            { id: 'dashboard', label: 'Beranda', icon: LayoutDashboard }
          ]
        },
        {
          title: 'OPERASIONAL',
          items: [
            { id: 'sales', label: 'Penjualan Telur', icon: ShoppingCart },
            { id: 'recording', label: 'Recording Ayam', icon: ClipboardList }
          ]
        },
        {
          title: 'KEUANGAN',
          items: [
            { id: 'cashbook', label: 'Buku Kas', icon: Wallet },
            { id: 'income', label: 'Pemasukan Lainnya', icon: ArrowDownRight },
            { id: 'expenses', label: 'Pengeluaran', icon: ArrowUpRight }
          ]
        },
        {
          title: 'LAPORAN',
          items: [
            { id: 'reports', label: 'Pusat Laporan', icon: FileText }
          ]
        },
        {
          title: 'SISTEM',
          items: [
            { id: 'settings', label: 'Pengaturan', icon: Settings }
          ]
        }
      ]
    : [
        {
          title: 'OPERASIONAL KANDANG',
          items: [
            { id: 'recording', label: 'Recording Ayam', icon: ClipboardList }
          ]
        }
      ];

  const handleNavClick = (id) => {
    setActiveTab(id);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#142b17] text-slate-200 flex flex-col border-r border-[#1e3c23] transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-20 px-5 flex items-center justify-between border-b border-[#1e3c23] bg-[#0d1e10]">
          <div className="flex items-center gap-3">
            <div className="p-1 rounded-xl bg-white/10 border border-white/15">
              <img
                src="/logo.svg"
                alt="Logo KOYABHU"
                className="w-9 h-9 rounded-lg shrink-0"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-black text-white tracking-wider text-base leading-tight">
                  KOYABHU
                </h1>
                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-[#55a938] text-white font-bold">
                  BUMKam
                </span>
              </div>
              <span className="text-[11px] font-medium text-[#edf6d7] block tracking-wide">
                Peternakan Ayam Petelur
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {menuSections.map((section, sIdx) => (
            <div key={sIdx}>
              {section.title && (
                <div className="px-3 mb-2 text-[10px] font-bold text-[#8eb892] tracking-wider uppercase">
                  {section.title}
                </div>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-[#55a938] text-white shadow-md font-bold'
                          : 'text-slate-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#8eb892]'}`} />
                      <span>{item.label}</span>
                      {isActive && (
                        <div className="ml-auto w-1.5 h-4 bg-[#edf6d7] rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom system badge */}
        <div className="p-3.5 border-t border-[#1e3c23] bg-[#0d1e10] text-xs text-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#55a938] animate-pulse" />
            <span className="text-[11px] font-semibold text-[#edf6d7]">Sistem Terintegrasi</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">WIT (Jayapura)</span>
        </div>
      </aside>
    </>
  );
}
