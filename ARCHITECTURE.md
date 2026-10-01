# Forex MT5 Automated Trading SaaS - Production Architecture Specification

## 1. System Overview & Architecture

The Forex MT5 Automated Trading SaaS platform is engineered with a strict 3-tier boundary:
1. **Public Website Tier (`/`)**: Unauthenticated prospective customer marketing, features, pricing, FAQs, and entry points.
2. **Customer Portal Tier (`/dashboard/*`)**: Authenticated customer workspace with strict tenant isolation. Displays live MT5 connection health, open trade cards, live balance/equity/P&L calculations, historical analytics, and subscription management.
3. **Admin Application Tier (`/admin/*`)**: Isolated administrative namespace secured by server-side Role-Based Access Control (RBAC). Provides platform oversight, customer account controls, MT5 worker telemetry, algorithm lifecycle management, multi-tiered emergency kill switches, social media publishing approvals, and tamper-evident audit logs.

```
                           +-------------------------------------+
                           |            Clients (Browser)        |
                           +------------------+------------------+
                                              |
                          HTTPS Requests / SSE / WebSockets
                                              |
                                              v
                           +-------------------------------------+
                           |      Vite / Express Application     |
                           |   - Public Pages                    |
                           |   - Customer Dashboard SPA          |
                           |   - Admin Control Suite SPA         |
                           +------------------+------------------+
                                              |
                   +--------------------------+--------------------------+
                   |                          |                          |
                   v                          v                          v
          +------------------+       +------------------+       +------------------+
          |  /api/public/*   |       | /api/customer/*  |       |   /api/admin/*   |
          |  (Unrestricted)  |       | (Tenant Verified)|       |  (RBAC Enforced) |
          +------------------+       +------------------+       +------------------+
                                              |                          |
                   +--------------------------+--------------------------+
                   |
                   v
    +------------------------------+
    |  Trading & Risk Orchestrator |  <====>  [ Emergency Kill Switches (Global, User, Algo) ]
    +--------------+---------------+
                   |
                   | Redis Queue / Encrypted IPC
                   v
    +------------------------------+
    |    Isolated MT5 Workers      |  <====>  [ Windows VPS / MT5 Desktop Terminals ]
    |  - Read Account & Positions  |
    |  - Validate Order Parameters |
    |  - Execute Orders & Deals    |
    |  - Heartbeat & Telemetry     |
    +--------------+---------------+
                   |
                   v
    +------------------------------+
    |   Forex Brokers (ECN / STP)  |
    +------------------------------+
```

---

## 2. Directory Structure

```
├── .env.example
├── ARCHITECTURE.md
├── index.html
├── metadata.json
├── package.json
├── server.ts                       # Express + Vite Full-Stack Entry Point
├── server/
│   ├── config.ts                   # Environment configuration & defaults
│   ├── db/
│   │   ├── schema.sql              # Normalized PostgreSQL Schema DDL
│   │   └── store.ts                # In-Memory & Persistent Data Store with seed records
│   ├── middleware/
│   │   └── auth.ts                 # JWT extraction, session lookup, RBAC permission checks
│   ├── routes/
│   │   ├── admin.ts                # /api/admin/* endpoints
│   │   ├── auth.ts                 # /api/auth/* endpoints (Customer & Admin)
│   │   ├── customer.ts             # /api/customer/* endpoints (Tenant isolated)
│   │   ├── public.ts               # /api/public/* endpoints
│   │   ├── webhooks.ts             # /api/webhooks/* (Stripe/Payment idempotency)
│   │   └── worker.ts               # /api/worker/* (MT5 telemetry & reconciliation)
│   ├── security/
│   │   ├── encryption.ts           # AES-256-GCM encryption for MT5 credentials
│   │   └── rbac.ts                 # Role definitions & permission hierarchies
│   └── services/
│       ├── mt5Orchestrator.ts      # MT5 worker coordinator, sync & simulated terminal
│       └── riskEngine.ts           # Pre-trade risk validation & kill switch enforcement
├── src/
│   ├── App.tsx                     # Main router & layout dispatcher
│   ├── main.tsx                    # React client entry point
│   ├── index.css                   # Global styles with Tailwind CSS
│   ├── contexts/
│   │   ├── AuthContext.tsx         # Customer & Admin authentication state & RBAC
│   │   └── TradingContext.tsx      # Real-time tick quotes, trade cards & equity engine
│   ├── types/
│   │   └── index.ts                # TypeScript interfaces for all domain entities
│   ├── components/
│   │   ├── common/                 # Badges, modals, cards, stat widgets
│   │   ├── layouts/
│   │   │   ├── AdminLayout.tsx     # Admin dashboard sidebar, header & security banner
│   │   │   ├── CustomerLayout.tsx  # Customer portal sidebar, MT5 status pill, live ticker
│   │   │   └── PublicLayout.tsx    # Public landing header, nav & footer
│   │   ├── customer/
│   │   │   ├── ConnectMt5Modal.tsx # MT5 broker connection modal with credential security
│   │   │   ├── PerformanceChart.tsx# Equity curve & daily P&L visualization
│   │   │   └── TradeCard.tsx       # Live position card with SL, TP, P&L & lot size
│   │   └── admin/
│   │       ├── KillSwitchModal.tsx # Confirmation modal for emergency stops
│   │       └── SocialPostCard.tsx  # Preview & approval widget for trading reports
│   └── views/
│       ├── public/                 # Home, About, HowItWorks, Features, Pricing, FAQ, Contact
│       ├── auth/                   # CustomerLogin, CustomerSignup, AdminLogin
│       ├── customer/               # Overview, MT5, Trades, Performance, Subscription, Support
│       └── admin/                  # Overview, Users, MT5Accounts, Trades, Algos, Risk, System
```

---

## 3. Database Schema (PostgreSQL Normalized)

The database schema is partitioned across 8 primary domains:

1. **Identity & Access Control**:
   - `users` (id, email, password_hash, status, kyc_status, created_at, updated_at)
   - `roles` (id, name, description)
   - `permissions` (id, code, description)
   - `role_permissions` (role_id, permission_id)
   - `user_roles` (user_id, role_id)
   - `user_profiles` (user_id, first_name, last_name, country, phone, avatar_url)

2. **Broker & MetaTrader 5 Connectivity**:
   - `brokers` (id, name, server_list, min_deposit, leverage_max)
   - `mt5_accounts` (id, user_id, broker_name, server, login, encrypted_password, balance, equity, margin, free_margin, status, last_sync_at)
   - `mt5_connections` (id, account_id, worker_id, ip_address, ping_ms, connected_at, disconnected_at)

3. **Subscriptions & Monetization**:
   - `subscription_plans` (id, name, code, billing_interval, price_usd, max_accounts, profit_share_pct, is_active)
   - `subscriptions` (id, user_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end)
   - `payments` (id, subscription_id, user_id, provider, transaction_id, idempotency_key, amount_usd, status, created_at)
   - `invoices` (id, payment_id, invoice_number, pdf_url, issued_date)

4. **Trading Algorithms & Versioning**:
   - `algorithms` (id, code, name, description, risk_rating, status, author)
   - `algorithm_versions` (id, algorithm_id, version_number, changelog, parameters_schema, is_active, deployed_at)
   - `algorithm_assignments` (id, user_id, mt5_account_id, algorithm_version_id, allocation_pct, status, assigned_at)

5. **Trades & Execution Pipeline**:
   - `orders` (id, mt5_account_id, algorithm_version_id, symbol, type, lots, open_price, sl, tp, status, idempotency_key)
   - `positions` (id, mt5_account_id, position_ticket, symbol, type, lots, open_price, current_price, current_pnl, swap, status)
   - `deals` (id, position_id, deal_ticket, price, profit, commission, closed_at)

6. **Risk Management & Emergency Controls**:
   - `risk_profiles` (id, user_id, max_daily_loss_pct, max_drawdown_pct, max_lot_size, max_open_trades, emergency_stop)
   - `risk_events` (id, level, source, reason, metadata, resolved_at)
   - `system_kill_switches` (id, scope, target_id, is_active, activated_by, reason, activated_at)

7. **Social Media Automation & Reports**:
   - `social_templates` (id, platform, template_name, layout_json)
   - `social_posts` (id, platform, generated_image_url, caption, status, approved_by, published_at)

8. **Audit Trail & System Monitoring**:
   - `audit_logs` (id, actor_id, actor_role, action, resource, resource_id, diff, ip_address, created_at)
   - `worker_health` (id, worker_name, region, status, active_terminals, cpu_pct, memory_pct, last_heartbeat)

---

## 4. Authentication & Authorization Architecture

- **Customer vs Admin Separation**: Customers and Administrators use separate authentication endpoints and token verification pipelines.
- **Server-Side Verification**: Frontend state is strictly treated as presentation-only. Every API request validates authorization headers and server-side roles.
- **RBAC Matrix**:
  - `Super Admin`: Complete access including kill switches, system settings, worker controls, and role assignment.
  - `Risk Officer`: Access to risk profiles, emergency kill switches, trade audits, and performance reports.
  - `Support Specialist`: Access to customer search, ticket responses, and read-only account diagnostics.
  - `Finance Specialist`: Access to subscriptions, refunds, invoices, and payment histories.
- **Credential Protection**:
  - Passwords hashed using PBKDF2 with unique salts and 100,000 iterations.
  - MT5 trading/investor passwords encrypted using AES-256-GCM. Raw keys are never logged or returned to frontend responses.

---

## 5. MT5 Worker & Execution Architecture

1. **Isolation Principle**: The web application server never opens direct socket connections to broker terminals.
2. **Worker Pool**: Dedicated MT5 execution workers run on low-latency Windows/Linux VPS hosts close to broker servers (e.g. LD4, NY4).
3. **Execution Safety Pipeline**:
   - Step 1: Pre-Execution Risk Check (Drawdown limits, daily loss cap, session filters, kill-switch status).
   - Step 2: Idempotent Command Generation (UUID idempotency key).
   - Step 3: MT5 Worker Dispatch via secure channel.
   - Step 4: Broker Terminal Execution (`OrderSend()`).
   - Step 5: Trade Reconciliation & Deal Ingestion.
   - Step 6: Instant Client Notification via Server-Sent Events / Websockets.

---

## 6. Development Phases

- **Phase 1**: Architecture + Database + Project Structure + Security Foundation (Completed)
- **Phase 2**: Public Landing Website & Marketing Pages (Completed)
- **Phase 3**: Customer Authentication & Tenant State Management (Completed)
- **Phase 4**: Admin Authentication & Server-Side RBAC Enforcement (Completed)
- **Phase 5**: Customer Trading Dashboard Shell with Live Position Cards & Performance Analytics (Completed)
- **Phase 6**: Subscription Plans & Payment Webhook Flow Architecture (Completed)
- **Phase 7**: MT5 Broker Account Connection & Read-Only Synchronization (Completed)
- **Phase 8**: Admin Customer & Account Management Views (Completed)
- **Phase 9**: Trading Execution Safety Architecture (Completed)
- **Phase 10**: Risk Engine & Emergency Multi-Tier Kill Switches (Completed)
- **Phase 11**: Real-Time Performance & Report Generation (Completed)
- **Phase 12**: Multi-Channel Notification Engine (Completed)
- **Phase 13**: Social Media Report Generator & Approval Workflow (Completed)
- **Phase 14**: Support Desk, Referrals & Promotional Coupons (Completed)
- **Phase 15**: Worker Health Monitoring, Tamper-Evident Audit Logs & Production Readiness (Completed)
