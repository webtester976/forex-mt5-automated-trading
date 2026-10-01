import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { MT5Account, Position, PerformanceStats, RiskSettings, Subscription } from '../types/index.js';
import { useAuth } from './AuthContext.js';

interface TradingContextType {
  mt5Account: MT5Account | null;
  openTrades: Position[];
  closedTrades: Position[];
  stats: PerformanceStats | null;
  riskSettings: RiskSettings | null;
  subscription: Subscription | null;
  platformKillSwitchActive: boolean;
  effectiveManualClose: boolean;
  isLoading: boolean;
  refreshTradingData: () => Promise<void>;
  closePosition: (positionId: string) => Promise<boolean>;
  updateRiskSettings: (settings: Partial<RiskSettings>) => Promise<boolean>;
  connectMt5: (details: { 
    brokerName: string; 
    server: string; 
    loginId: string; 
    password: string; 
    accountType?: 'live' | 'demo';
    connectionMode?: 'demo' | 'read_only_investor';
    currency?: string;
    leverage?: number; 
  }) => Promise<{ success: boolean; error?: string; message?: string }>;
  disconnectMt5: () => Promise<boolean>;
  syncMt5: () => Promise<boolean>;
  testConnection: (details: { brokerName: string; server: string; loginId?: string }) => Promise<{ success: boolean; pingLatencyMs?: number; message?: string; error?: string }>;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [mt5Account, setMt5Account] = useState<MT5Account | null>(null);
  const [openTrades, setOpenTrades] = useState<Position[]>([]);
  const [closedTrades, setClosedTrades] = useState<Position[]>([]);
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [riskSettings, setRiskSettings] = useState<RiskSettings | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [platformKillSwitchActive, setPlatformKillSwitchActive] = useState<boolean>(false);
  const [effectiveManualClose, setEffectiveManualClose] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchOverview = useCallback(async () => {
    if (!token || user?.role !== 'customer') return;
    try {
      const res = await fetch('/api/customer/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMt5Account(data.mt5Account);
        setOpenTrades(data.openTrades || []);
        setStats(data.stats);
        setRiskSettings(data.riskSettings);
        setSubscription(data.subscription);
        setPlatformKillSwitchActive(data.platformKillSwitchActive);
        setEffectiveManualClose(Boolean(data.effectiveManualClose));
      }
    } catch (err) {
      console.error('Error fetching customer trading overview:', err);
    }
  }, [token, user]);

  const fetchTrades = useCallback(async () => {
    if (!token || user?.role !== 'customer') return;
    try {
      const res = await fetch('/api/customer/trades', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOpenTrades(data.openTrades || []);
        setClosedTrades(data.closedTrades || []);
      }
    } catch (err) {
      console.error('Error fetching trades:', err);
    }
  }, [token, user]);

  // Polling for live ticks & positions
  useEffect(() => {
    if (token && user?.role === 'customer') {
      setIsLoading(true);
      fetchOverview().finally(() => setIsLoading(false));

      const interval = setInterval(() => {
        fetchOverview();
        fetchTrades();
      }, 4000);

      return () => clearInterval(interval);
    } else {
      setMt5Account(null);
      setOpenTrades([]);
      setClosedTrades([]);
      setEffectiveManualClose(false);
    }
  }, [token, user, fetchOverview, fetchTrades]);

  const closePosition = async (positionId: string): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch('/api/customer/trades/close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ positionId }),
      });
      if (res.ok) {
        await fetchTrades();
        await fetchOverview();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const updateRiskSettings = async (newSettings: Partial<RiskSettings>): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch('/api/customer/risk-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newSettings),
      });
      if (res.ok) {
        const data = await res.json();
        setRiskSettings(data.settings);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const connectMt5 = async (details: { 
    brokerName: string; 
    server: string; 
    loginId: string; 
    password: string; 
    accountType?: 'live' | 'demo';
    connectionMode?: 'demo' | 'read_only_investor';
    currency?: string;
    leverage?: number; 
  }) => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const res = await fetch('/api/customer/mt5/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(details),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Connection failed' };
      }
      setMt5Account(data.account);
      await fetchOverview();
      await fetchTrades();
      return { success: true, message: data.message };
    } catch {
      return { success: false, error: 'Network error connecting to MT5 worker terminal' };
    }
  };

  const disconnectMt5 = async (): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch('/api/customer/mt5/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        await fetchOverview();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const syncMt5 = async (): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch('/api/customer/mt5/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setMt5Account(data.account);
        await fetchOverview();
        await fetchTrades();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const testConnection = async (details: { brokerName: string; server: string; loginId?: string }) => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const res = await fetch('/api/customer/mt5/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(details),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Handshake failed' };
      }
      return { 
        success: true, 
        pingLatencyMs: data.pingLatencyMs, 
        message: data.statusMessage 
      };
    } catch {
      return { success: false, error: 'Network error pinging broker server' };
    }
  };

  return (
    <TradingContext.Provider
      value={{
        mt5Account,
        openTrades,
        closedTrades,
        stats,
        riskSettings,
        subscription,
        platformKillSwitchActive,
        effectiveManualClose,
        isLoading,
        refreshTradingData: fetchOverview,
        closePosition,
        updateRiskSettings,
        connectMt5,
        disconnectMt5,
        syncMt5,
        testConnection,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
};

export const useTrading = () => {
  const context = useContext(TradingContext);
  if (!context) throw new Error('useTrading must be used within a TradingProvider');
  return context;
};
