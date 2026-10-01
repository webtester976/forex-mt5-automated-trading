import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext.js';
import { TradingProvider } from './contexts/TradingContext.js';
import { RoleSwitcherBanner } from './components/common/RoleSwitcherBanner.js';

// Layouts
import { PublicLayout } from './components/layouts/PublicLayout.js';
import { CustomerLayout } from './components/layouts/CustomerLayout.js';
import { AdminLayout } from './components/layouts/AdminLayout.js';

// Public Views
import { HomePage } from './views/public/HomePage.js';
import { HowItWorksPage } from './views/public/HowItWorksPage.js';
import { FeaturesPage } from './views/public/FeaturesPage.js';
import { PricingPage } from './views/public/PricingPage.js';
import { FaqPage } from './views/public/FaqPage.js';
import { ContactPage } from './views/public/ContactPage.js';
import { AboutPage } from './views/public/AboutPage.js';

// Auth Views
import { CustomerLoginPage } from './views/auth/CustomerLoginPage.js';
import { CustomerSignupPage } from './views/auth/CustomerSignupPage.js';
import { AdminLoginPage } from './views/auth/AdminLoginPage.js';

// Customer Views
import { CustomerOverviewPage } from './views/customer/CustomerOverviewPage.js';
import { CustomerMt5Page } from './views/customer/CustomerMt5Page.js';
import { CustomerTradesPage } from './views/customer/CustomerTradesPage.js';
import { CustomerPerformancePage } from './views/customer/CustomerPerformancePage.js';
import { CustomerSubscriptionPage } from './views/customer/CustomerSubscriptionPage.js';
import { CustomerSettingsPage } from './views/customer/CustomerSettingsPage.js';
import { CustomerRiskPage } from './views/customer/CustomerRiskPage.js';
import { CustomerSupportPage } from './views/customer/CustomerSupportPage.js';
import { CustomerNotificationsPage } from './views/customer/CustomerNotificationsPage.js';
import { CustomerProfilePage } from './views/customer/CustomerProfilePage.js';

// Admin Views
import { AdminOverviewPage } from './views/admin/AdminOverviewPage.js';
import { AdminUsersPage } from './views/admin/AdminUsersPage.js';
import { AdminAccountsPage } from './views/admin/AdminAccountsPage.js';
import { AdminTradesPage } from './views/admin/AdminTradesPage.js';
import { AdminSubscriptionsPage } from './views/admin/AdminSubscriptionsPage.js';
import { AdminPaymentsPage } from './views/admin/AdminPaymentsPage.js';
import { AdminAlgorithmsPage } from './views/admin/AdminAlgorithmsPage.js';
import { AdminRiskPage } from './views/admin/AdminRiskPage.js';
import { AdminReportsPage } from './views/admin/AdminReportsPage.js';
import { AdminNotificationsPage } from './views/admin/AdminNotificationsPage.js';
import { AdminSocialPage } from './views/admin/AdminSocialPage.js';
import { AdminSupportPage } from './views/admin/AdminSupportPage.js';
import { AdminAuditLogsPage } from './views/admin/AdminAuditLogsPage.js';
import { AdminSystemPage } from './views/admin/AdminSystemPage.js';
import { AdminSettingsPage } from './views/admin/AdminSettingsPage.js';
import { ShieldAlert } from 'lucide-react';

function MainRouter() {
  const { user, isAuthenticated, isAdmin, isLoading, logout } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname && window.location.pathname !== '/'
      ? window.location.pathname
      : '/';
  });

  // Keep browser URL updated on navigation
  const navigate = (path: string) => {
    setCurrentPath(path);
    window.history.pushState({}, '', path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Public Layout Pages
  const renderPublicView = () => {
    switch (currentPath) {
      case '/how-it-works':
        return <HowItWorksPage onNavigate={navigate} />;
      case '/features':
        return <FeaturesPage onNavigate={navigate} />;
      case '/pricing':
        return <PricingPage onNavigate={navigate} />;
      case '/performance':
        return (
          <div className="max-w-7xl mx-auto px-4 py-8">
            <CustomerPerformancePage onNavigate={navigate} />
          </div>
        );
      case '/faq':
        return <FaqPage onNavigate={navigate} />;
      case '/contact':
        return <ContactPage onNavigate={navigate} />;
      case '/about':
        return <AboutPage onNavigate={navigate} />;
      case '/login':
        return <CustomerLoginPage onNavigate={navigate} />;
      case '/signup':
        return <CustomerSignupPage onNavigate={navigate} />;
      case '/admin/login':
        return <AdminLoginPage onNavigate={navigate} />;
      case '/':
      default:
        return <HomePage onNavigate={navigate} />;
    }
  };

  // Customer Dashboard Pages
  const renderCustomerView = () => {
    switch (currentPath) {
      case '/dashboard/mt5':
        return <CustomerMt5Page onNavigate={navigate} />;
      case '/dashboard/trades':
        return <CustomerTradesPage onNavigate={navigate} />;
      case '/dashboard/performance':
        return <CustomerPerformancePage onNavigate={navigate} />;
      case '/dashboard/subscription':
        return <CustomerSubscriptionPage onNavigate={navigate} />;
      case '/dashboard/risk':
      case '/dashboard/settings':
        return <CustomerRiskPage onNavigate={navigate} />;
      case '/dashboard/support':
        return <CustomerSupportPage onNavigate={navigate} />;
      case '/dashboard/notifications':
        return <CustomerNotificationsPage onNavigate={navigate} />;
      case '/dashboard/profile':
        return <CustomerProfilePage onNavigate={navigate} />;
      case '/dashboard':
      default:
        return <CustomerOverviewPage onNavigate={navigate} />;
    }
  };

  // Admin Dashboard Pages
  const renderAdminView = () => {
    switch (currentPath) {
      case '/admin/users':
        return <AdminUsersPage onNavigate={navigate} />;
      case '/admin/mt5-accounts':
      case '/admin/accounts':
        return <AdminAccountsPage onNavigate={navigate} />;
      case '/admin/trades':
        return <AdminTradesPage onNavigate={navigate} />;
      case '/admin/subscriptions':
        return <AdminSubscriptionsPage onNavigate={navigate} />;
      case '/admin/payments':
        return <AdminPaymentsPage onNavigate={navigate} />;
      case '/admin/algorithms':
        return <AdminAlgorithmsPage onNavigate={navigate} />;
      case '/admin/risk':
        return <AdminRiskPage onNavigate={navigate} />;
      case '/admin/reports':
        return <AdminReportsPage onNavigate={navigate} />;
      case '/admin/notifications':
        return <AdminNotificationsPage onNavigate={navigate} />;
      case '/admin/support':
        return <AdminSupportPage onNavigate={navigate} />;
      case '/admin/audit-logs':
        return <AdminAuditLogsPage onNavigate={navigate} />;
      case '/admin/system':
        return <AdminSystemPage onNavigate={navigate} />;
      case '/admin/settings':
        return <AdminSettingsPage onNavigate={navigate} />;
      case '/admin':
      default:
        return <AdminOverviewPage onNavigate={navigate} />;
    }
  };

  // Decide which Layout to wrap with
  const isAdminRoute = currentPath.startsWith('/admin') && currentPath !== '/admin/login';
  const isCustomerRoute = currentPath.startsWith('/dashboard');

  // Enforce frontend route guards (in addition to strict server-side protection)
  useEffect(() => {
    // CRITICAL: Never evaluate redirect guards while initial session restoration is loading
    if (isLoading) return;

    // If authenticated and visiting public login/signup pages, redirect to respective portal
    if (isAuthenticated) {
      if (currentPath === '/login' || currentPath === '/signup') {
        navigate(isAdmin ? '/admin' : '/dashboard');
        return;
      }
      if (currentPath === '/admin/login' && isAdmin) {
        navigate('/admin');
        return;
      }
    }

    // 1. If trying to access customer dashboard without authentication, redirect to /login
    if (isCustomerRoute && !isAuthenticated) {
      navigate('/login');
      return;
    }

    // 2. If trying to access admin dashboard:
    if (isAdminRoute) {
      // If not logged in at all, redirect to admin login
      if (!isAuthenticated) {
        navigate('/admin/login');
        return;
      }
      // Note: If logged in as customer, we present the dedicated authorization error barrier below
    }
  }, [currentPath, isAuthenticated, isAdmin, isCustomerRoute, isAdminRoute, isLoading]);

  // If session is currently restoring on refresh or initial startup, show full-page loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono text-slate-400 tracking-wider">RESTORING SECURE SESSION...</p>
        </div>
      </div>
    );
  }

  // If unauthorized user lands on a customer protected route, show client login barrier
  if (isCustomerRoute && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        {import.meta.env.DEV && <RoleSwitcherBanner currentPath={currentPath} onNavigate={navigate} />}
        <PublicLayout currentPath={currentPath} onNavigate={navigate}>
          <CustomerLoginPage onNavigate={navigate} />
        </PublicLayout>
      </div>
    );
  }

  // If unauthorized user lands on an admin route:
  if (isAdminRoute && (!isAuthenticated || !isAdmin)) {
    // If logged in as a normal customer, display explicit authorization error
    if (isAuthenticated && !isAdmin) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
          {import.meta.env.DEV && <RoleSwitcherBanner currentPath={currentPath} onNavigate={navigate} />}
          <PublicLayout currentPath={currentPath} onNavigate={navigate}>
            <div className="max-w-md mx-auto px-4 py-16">
              <div className="bg-slate-900 border border-rose-800/80 rounded-3xl p-8 space-y-6 shadow-2xl text-center">
                <div className="w-12 h-12 rounded-2xl bg-rose-950/80 text-rose-400 border border-rose-800 flex items-center justify-center mx-auto mb-2">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">Access Denied: Administrative Role Required</h2>
                <p className="text-xs text-rose-400 font-mono">ERR_UNAUTHORIZED_ADMIN_PORTAL</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Your signed-in account (<span className="text-slate-200 font-semibold">{user?.email}</span>) holds the role of <span className="text-amber-400 font-mono font-semibold uppercase">{user?.role}</span> and is strictly forbidden from accessing administrative control portals.
                </p>
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition"
                  >
                    Return to Customer Dashboard
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      navigate('/admin/login');
                    }}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
                  >
                    Sign in with Admin Credentials
                  </button>
                </div>
              </div>
            </div>
          </PublicLayout>
        </div>
      );
    }

    // Unauthenticated: redirect/show admin login
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        {import.meta.env.DEV && <RoleSwitcherBanner currentPath={currentPath} onNavigate={navigate} />}
        <PublicLayout currentPath={currentPath} onNavigate={navigate}>
          <AdminLoginPage onNavigate={navigate} />
        </PublicLayout>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Quick Test Role Switcher Banner (Development-only) */}
      {import.meta.env.DEV && <RoleSwitcherBanner currentPath={currentPath} onNavigate={navigate} />}

      {/* Role-isolated View Routing */}
      {isAdminRoute ? (
        <AdminLayout currentPath={currentPath} onNavigate={navigate}>
          {renderAdminView()}
        </AdminLayout>
      ) : isCustomerRoute ? (
        <CustomerLayout currentPath={currentPath} onNavigate={navigate}>
          {renderCustomerView()}
        </CustomerLayout>
      ) : (
        <PublicLayout currentPath={currentPath} onNavigate={navigate}>
          {renderPublicView()}
        </PublicLayout>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TradingProvider>
        <MainRouter />
      </TradingProvider>
    </AuthProvider>
  );
}
