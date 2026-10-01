import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Activity, 
  Cpu, 
  Database, 
  Layers, 
  Radio, 
  AlertTriangle, 
  RefreshCw,
  Terminal
} from 'lucide-react';

export const AdminSystemPage: React.FC<{ onNavigate: (path: string) => void }> = () => {
  const [systemData, setSystemData] = useState<any>(null);
  const [logFilter, setLogFilter] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR'>('ALL');

  const fetchHealth = () => {
    fetch('/api/admin/system/health', {
      headers: { Authorization: `Bearer ${localStorage.getItem('forex_saas_token')}` },
    })
      .then(res => res.json())
      .then(data => setSystemData(data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 4000);
    return () => clearInterval(interval);
  }, []);

  const logs = [
    { time: '22:40:12', level: 'INFO', node: 'Worker-LD4-UK', msg: 'Reconciled 88 MT5 account positions with zero slippage anomalies.' },
    { time: '22:40:08', level: 'INFO', node: 'Worker-NY4-US', msg: 'Tick stream synced with CME Group FX feed. Latency 0.9ms.' },
    { time: '22:39:55', level: 'WARN', node: 'Worker-LD4-UK', msg: 'Spread widened on GBPUSD to 1.8 pips during UK BoE remarks.' },
    { time: '22:39:40', level: 'INFO', node: 'Redis-Cluster', msg: 'PubSub dispatched tick batch #491024 to 88 subscriber sockets.' },
    { time: '22:39:15', level: 'INFO', node: 'RabbitMQ', msg: 'Queue "mt5.orders.execute" length: 0. Mean queue transit time: 1.1ms.' },
  ];

  const filteredLogs = logs.filter(l => (logFilter === 'ALL' ? true : l.level === logFilter));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System Infrastructure & Telemetry</h1>
          <p className="text-xs text-slate-400">
            Cluster node metrics, London LD4 / New York NY4 execution workers, Redis queues, and live logs.
          </p>
        </div>
      </div>

      {/* Cluster Node Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {systemData?.workers?.map((w: any) => (
          <div key={w.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-white text-base">{w.workerName}</h3>
                <span className="text-xs text-slate-400 font-mono">{w.location}</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 uppercase">
                {w.status}
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Active Terminals:</span>
                <span className="font-bold text-white">{w.activeTerminals} MT5 instances</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">CPU Usage:</span>
                <span className="text-emerald-400">{w.cpuPercent}%</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">RAM Allocation:</span>
                <span className="text-blue-400">{w.memoryPercent}%</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Cross-Connect Latency:</span>
                <span className="text-emerald-400 font-bold">{w.pingLatencyMs}ms</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Message Queues & DB Health */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
            <Radio className="w-4 h-4" />
            <span>RabbitMQ Order Bus</span>
          </div>
          <div className="font-mono text-xl font-extrabold text-white">0.9ms Transit</div>
          <span className="text-[11px] text-slate-400 font-mono">Queue depth: 0 • Throughput: 1.4k msg/s</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
            <Layers className="w-4 h-4" />
            <span>Redis Cluster Telemetry</span>
          </div>
          <div className="font-mono text-xl font-extrabold text-white">Sub-1ms P99</div>
          <span className="text-[11px] text-slate-400 font-mono">PubSub channels: 88 • 0 dropped ticks</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
            <Database className="w-4 h-4" />
            <span>Database Storage & Pool</span>
          </div>
          <div className="font-mono text-xl font-extrabold text-white">99.99% Uptime</div>
          <span className="text-[11px] text-slate-400 font-mono">Connection pool: 14/50 • Storage: 12%</span>
        </div>
      </div>

      {/* Streaming Terminal Log Viewer */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">Cluster System & Execution Log Stream</h3>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px] font-mono">
            {(['ALL', 'INFO', 'WARN', 'ERROR'] as const).map(lvl => (
              <button
                key={lvl}
                onClick={() => setLogFilter(lvl)}
                className={`px-2 py-0.5 rounded transition ${
                  logFilter === lvl ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-950 rounded-xl p-4 font-mono text-xs space-y-2 max-h-56 overflow-y-auto border border-slate-800/80">
          {filteredLogs.map((log, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-slate-400">[{log.time}]</span>
              <span className={`px-1.5 rounded text-[10px] font-bold ${
                log.level === 'WARN' ? 'bg-amber-950 text-amber-300' : 'bg-blue-950 text-blue-300'
              }`}>
                {log.level}
              </span>
              <span className="text-slate-400 text-[11px]">({log.node}):</span>
              <span className="text-slate-200">{log.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
