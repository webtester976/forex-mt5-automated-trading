import React, { useState } from 'react';
import { Shield, TrendingUp, Cpu, Lock, Menu, X, ArrowRight, ExternalLink } from 'lucide-react';

interface PublicLayoutProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  children: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ currentPath, onNavigate, children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'About', path: '/about' },
    { label: 'How It Works', path: '/how-it-works' },
    { label: 'Features', path: '/features' },
    { label: 'Pricing', path: '/pricing' },
    { label: 'FAQ', path: '/faq' },
    { label: 'Contact', path: '/contact' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div
            onClick={() => onNavigate('/')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
                AURA<span className="text-blue-500 font-mono">MT5</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] text-slate-400 uppercase tracking-widest ml-1.5 font-semibold">
                Quant SaaS
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-full border border-slate-800">
            {navLinks.map(link => {
              const active = currentPath === link.path;
              return (
                <button
                  key={link.path}
                  onClick={() => onNavigate(link.path)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>

          {/* Right Action CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => onNavigate('/login')}
              className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-2 transition"
            >
              Client Login
            </button>
            <button
              onClick={() => onNavigate('/signup')}
              className="text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md shadow-blue-600/20 transition flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile hamburger */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-4 space-y-2">
            {navLinks.map(link => (
              <button
                key={link.path}
                onClick={() => {
                  onNavigate(link.path);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
                  currentPath === link.path ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {link.label}
              </button>
            ))}
            <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
              <button
                onClick={() => {
                  onNavigate('/login');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-center py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg"
              >
                Client Login
              </button>
              <button
                onClick={() => {
                  onNavigate('/signup');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-center py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg"
              >
                Sign Up Now
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Page Body */}
      <main className="flex-1">{children}</main>

      {/* Public Institutional Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span className="font-bold text-white text-base tracking-tight">AURAMT5 SaaS</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Institutional-grade algorithmic trading software connecting to your MetaTrader 5 broker terminal via sub-millisecond London Equinix LD4 VPS infrastructure.
              </p>
              <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                <span>Zero-Knowledge AES-256 MT5 Encryption</span>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-200 text-xs uppercase tracking-wider mb-3">Platform Navigation</h4>
              <ul className="space-y-2">
                <li><button onClick={() => onNavigate('/')} className="hover:text-white transition">Home</button></li>
                <li><button onClick={() => onNavigate('/features')} className="hover:text-white transition">Quantitative Features</button></li>
                <li><button onClick={() => onNavigate('/how-it-works')} className="hover:text-white transition">How MT5 Sync Works</button></li>
                <li><button onClick={() => onNavigate('/pricing')} className="hover:text-white transition">Subscription Plans</button></li>
                <li><button onClick={() => onNavigate('/faq')} className="hover:text-white transition">Frequently Asked Questions</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-200 text-xs uppercase tracking-wider mb-3">Client Portals</h4>
              <ul className="space-y-2">
                <li><button onClick={() => onNavigate('/login')} className="hover:text-white transition">Client Dashboard Login</button></li>
                <li><button onClick={() => onNavigate('/signup')} className="hover:text-white transition">Open Trading Account</button></li>
                <li><button onClick={() => onNavigate('/contact')} className="hover:text-white transition">Institutional Inquiries</button></li>
                <li className="pt-2">
                  <button
                    onClick={() => onNavigate('/admin/login')}
                    className="text-slate-400 hover:text-amber-400 transition flex items-center gap-1 font-mono text-[11px]"
                  >
                    <Lock className="w-3 h-3 text-amber-500" />
                    <span>Admin Control Portal</span>
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-200 text-xs uppercase tracking-wider mb-3">Infrastructure Specs</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-900 pb-1">
                  <span>Execution Facility</span>
                  <span className="font-mono text-slate-300">Equinix LD4 (London)</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-1">
                  <span>Terminal Protocol</span>
                  <span className="font-mono text-slate-300">MetaTrader 5 API</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-1">
                  <span>Average Latency</span>
                  <span className="font-mono text-emerald-400">1.2ms ECN direct</span>
                </div>
                <div className="flex justify-between">
                  <span>Emergency Kill Switch</span>
                  <span className="font-mono text-blue-400">Sub-Second Tripped</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mandatory Risk & Regulatory Compliance Disclaimer */}
          <div className="border-t border-slate-900 pt-6 space-y-3 text-[11px] text-slate-400 leading-relaxed">
            <p>
              <strong className="text-slate-300">High Risk Trading Warning: </strong>
              Trading foreign exchange (Forex), commodities, and Contracts for Difference (CFDs) on margin carries a high level of risk and may not be suitable for all investors. The high degree of leverage can work against you as well as for you. Before deciding to trade foreign exchange products, you should carefully consider your investment objectives, level of experience, and risk appetite. The possibility exists that you could sustain a loss of some or all of your initial investment.
            </p>
            <p>
              <strong className="text-slate-300">Software Disclaimer: </strong>
              AURAMT5 is a technology software platform providing algorithmic execution software for MetaTrader 5 terminals. AURAMT5 does not provide financial advice, broker-dealer services, or manage client capital directly. All client trading funds remain deposited solely with your selected regulated broker.
            </p>
            <div className="flex flex-wrap justify-between items-center gap-4 pt-3 border-t border-slate-900">
              <span>&copy; {new Date().getFullYear()} AURAMT5 Quant Technologies Ltd. All rights reserved.</span>
              <div className="flex items-center gap-4">
                <span className="hover:text-white cursor-pointer">Privacy Policy</span>
                <span className="hover:text-white cursor-pointer">Terms & Conditions</span>
                <span className="hover:text-white cursor-pointer">Risk Disclosure Statement</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
