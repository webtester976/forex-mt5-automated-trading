-- ==============================================================================
-- FOREX MT5 AUTOMATED TRADING SAAS - PRODUCTION POSTGRESQL SCHEMA DDL
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS & PROFILES
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(64) NOT NULL,
    is_email_verified BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending_verification')),
    kyc_status VARCHAR(50) DEFAULT 'unverified' CHECK (kyc_status IN ('unverified', 'pending', 'verified', 'rejected')),
    manual_trade_close_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    country VARCHAR(10),
    timezone VARCHAR(50) DEFAULT 'UTC',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. RBAC: ROLES & PERMISSIONS
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS permissions (
    id VARCHAR(100) PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id VARCHAR(50) REFERENCES roles(id) ON DELETE CASCADE,
    permission_id VARCHAR(100) REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id VARCHAR(50) REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id)
);

-- 3. BROKERS & MT5 ACCOUNTS
CREATE TABLE IF NOT EXISTS brokers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    server_list JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mt5_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    broker_name VARCHAR(100) NOT NULL,
    server VARCHAR(100) NOT NULL,
    login_id VARCHAR(100) NOT NULL,
    encrypted_password TEXT NOT NULL,
    account_type VARCHAR(20) DEFAULT 'live' CHECK (account_type IN ('live', 'demo')),
    currency VARCHAR(10) DEFAULT 'USD',
    leverage INT DEFAULT 100,
    balance NUMERIC(14, 2) DEFAULT 0.00,
    equity NUMERIC(14, 2) DEFAULT 0.00,
    margin NUMERIC(14, 2) DEFAULT 0.00,
    free_margin NUMERIC(14, 2) DEFAULT 0.00,
    margin_level NUMERIC(10, 2) DEFAULT 0.00,
    floating_pnl NUMERIC(14, 2) DEFAULT 0.00,
    connection_status VARCHAR(50) DEFAULT 'disconnected' CHECK (connection_status IN ('connected', 'connecting', 'disconnected', 'error', 'maintenance')),
    assigned_worker_id VARCHAR(100),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_broker_login UNIQUE (broker_name, server, login_id)
);

CREATE TABLE IF NOT EXISTS mt5_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mt5_account_id UUID REFERENCES mt5_accounts(id) ON DELETE CASCADE,
    worker_node_id VARCHAR(100) NOT NULL,
    latency_ms INT DEFAULT 0,
    ip_address VARCHAR(45),
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    disconnected_at TIMESTAMP WITH TIME ZONE
);

-- 4. SUBSCRIPTION PLANS & PAYMENTS
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    interval VARCHAR(20) NOT NULL CHECK (interval IN ('monthly', 'quarterly', 'biannual', 'yearly', 'profit_share')),
    price_usd NUMERIC(10, 2) NOT NULL,
    profit_share_pct NUMERIC(5, 2) DEFAULT 0.00,
    max_mt5_accounts INT DEFAULT 1,
    max_trading_volume_lots NUMERIC(10, 2) DEFAULT 50.00,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'expired')),
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'stripe',
    provider_transaction_id VARCHAR(255) UNIQUE,
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    amount_usd NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID UNIQUE REFERENCES payments(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    tax NUMERIC(10, 2) DEFAULT 0.00,
    total NUMERIC(10, 2) NOT NULL,
    issued_date DATE NOT NULL,
    pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. ALGORITHMS & VERSIONS
CREATE TABLE IF NOT EXISTS algorithms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    strategy_type VARCHAR(50) NOT NULL,
    risk_tier VARCHAR(20) NOT NULL CHECK (risk_tier IN ('low', 'medium', 'high')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS algorithm_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    algorithm_id UUID NOT NULL REFERENCES algorithms(id) ON DELETE CASCADE,
    version_string VARCHAR(20) NOT NULL,
    parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    changelog TEXT,
    status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'staging', 'production', 'deprecated')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_algo_version UNIQUE (algorithm_id, version_string)
);

CREATE TABLE IF NOT EXISTS algorithm_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mt5_account_id UUID NOT NULL REFERENCES mt5_accounts(id) ON DELETE CASCADE,
    algorithm_version_id UUID NOT NULL REFERENCES algorithm_versions(id) ON DELETE RESTRICT,
    allocation_pct NUMERIC(5, 2) DEFAULT 100.00,
    status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'stopped')),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. ORDERS, POSITIONS & DEALS
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mt5_account_id UUID NOT NULL REFERENCES mt5_accounts(id) ON DELETE CASCADE,
    order_ticket BIGINT,
    symbol VARCHAR(20) NOT NULL,
    order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('BUY', 'SELL', 'BUY_LIMIT', 'SELL_LIMIT', 'BUY_STOP', 'SELL_STOP')),
    lots NUMERIC(10, 2) NOT NULL,
    price NUMERIC(14, 5) NOT NULL,
    stop_loss NUMERIC(14, 5),
    take_profit NUMERIC(14, 5),
    status VARCHAR(30) NOT NULL CHECK (status IN ('pending', 'filled', 'canceled', 'rejected', 'expired')),
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mt5_account_id UUID NOT NULL REFERENCES mt5_accounts(id) ON DELETE CASCADE,
    position_ticket BIGINT UNIQUE NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    position_type VARCHAR(10) NOT NULL CHECK (position_type IN ('BUY', 'SELL')),
    lots NUMERIC(10, 2) NOT NULL,
    open_price NUMERIC(14, 5) NOT NULL,
    current_price NUMERIC(14, 5) NOT NULL,
    stop_loss NUMERIC(14, 5),
    take_profit NUMERIC(14, 5),
    current_pnl NUMERIC(14, 2) DEFAULT 0.00,
    swap NUMERIC(10, 2) DEFAULT 0.00,
    commission NUMERIC(10, 2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    opened_at TIMESTAMP WITH TIME ZONE NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
    deal_ticket BIGINT UNIQUE NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    entry_type VARCHAR(20) NOT NULL,
    price NUMERIC(14, 5) NOT NULL,
    profit NUMERIC(14, 2) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 7. PERFORMANCE & SNAPSHOTS
CREATE TABLE IF NOT EXISTS account_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mt5_account_id UUID NOT NULL REFERENCES mt5_accounts(id) ON DELETE CASCADE,
    balance NUMERIC(14, 2) NOT NULL,
    equity NUMERIC(14, 2) NOT NULL,
    margin NUMERIC(14, 2) NOT NULL,
    floating_pnl NUMERIC(14, 2) NOT NULL,
    open_positions_count INT NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mt5_account_id UUID NOT NULL REFERENCES mt5_accounts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    starting_balance NUMERIC(14, 2) NOT NULL,
    ending_balance NUMERIC(14, 2) NOT NULL,
    net_profit NUMERIC(14, 2) NOT NULL,
    total_trades INT DEFAULT 0,
    winning_trades INT DEFAULT 0,
    losing_trades INT DEFAULT 0,
    max_drawdown_pct NUMERIC(6, 2) DEFAULT 0.00,
    CONSTRAINT unique_account_daily UNIQUE (mt5_account_id, date)
);

-- 8. RISK PROFILES & CONTROLS
CREATE TABLE IF NOT EXISTS risk_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    risk_tier VARCHAR(20) DEFAULT 'moderate' CHECK (risk_tier IN ('conservative', 'moderate', 'aggressive')),
    max_daily_loss_pct NUMERIC(5, 2) DEFAULT 3.00,
    max_drawdown_pct NUMERIC(5, 2) DEFAULT 8.00,
    max_lot_size NUMERIC(10, 2) DEFAULT 2.00,
    max_open_trades INT DEFAULT 5,
    emergency_stop BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS risk_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mt5_account_id UUID REFERENCES mt5_accounts(id) ON DELETE SET NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical', 'emergency')),
    rule_violated VARCHAR(100) NOT NULL,
    details TEXT,
    action_taken VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. NOTIFICATIONS & PREFERENCES
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    email_trade_opened BOOLEAN DEFAULT FALSE,
    email_trade_closed BOOLEAN DEFAULT TRUE,
    email_daily_digest BOOLEAN DEFAULT TRUE,
    email_risk_alerts BOOLEAN DEFAULT TRUE,
    email_subscription_renewal BOOLEAN DEFAULT TRUE
);

-- 10. SOCIAL MEDIA AUTOMATION
CREATE TABLE IF NOT EXISTS social_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform VARCHAR(50) NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    layout_meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS social_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    summary_text TEXT NOT NULL,
    image_url TEXT,
    performance_metrics JSONB NOT NULL,
    status VARCHAR(30) DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'published', 'rejected')),
    approved_by UUID REFERENCES users(id),
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. REFERRALS & COUPONS
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_user_id UUID NOT NULL REFERENCES users(id),
    referred_user_id UUID UNIQUE NOT NULL REFERENCES users(id),
    commission_earned NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_pct NUMERIC(5, 2) NOT NULL,
    max_uses INT DEFAULT 100,
    times_used INT DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

-- 12. SUPPORT TICKETS & MESSAGES
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    status VARCHAR(30) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_admin_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('customer', 'admin', 'system')),
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. AUDIT & SYSTEM LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id VARCHAR(100),
    changes JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS worker_health (
    id VARCHAR(100) PRIMARY KEY,
    worker_name VARCHAR(100) NOT NULL,
    region VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL CHECK (status IN ('online', 'offline', 'connecting', 'error', 'maintenance')),
    active_terminals INT DEFAULT 0,
    cpu_percent NUMERIC(5, 2) DEFAULT 0.00,
    memory_percent NUMERIC(5, 2) DEFAULT 0.00,
    ping_latency_ms INT DEFAULT 1,
    last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mt5_account_id UUID NOT NULL REFERENCES mt5_accounts(id) ON DELETE CASCADE,
    ticket BIGINT UNIQUE NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    trade_type VARCHAR(10) NOT NULL CHECK (trade_type IN ('BUY', 'SELL')),
    lots NUMERIC(10, 2) NOT NULL,
    open_price NUMERIC(14, 5) NOT NULL,
    close_price NUMERIC(14, 5) NOT NULL,
    stop_loss NUMERIC(14, 5),
    take_profit NUMERIC(14, 5),
    profit NUMERIC(14, 2) NOT NULL,
    commission NUMERIC(10, 2) DEFAULT 0.00,
    swap NUMERIC(10, 2) DEFAULT 0.00,
    open_time TIMESTAMP WITH TIME ZONE NOT NULL,
    close_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS performance_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mt5_account_id UUID REFERENCES mt5_accounts(id) ON DELETE CASCADE,
    win_rate NUMERIC(5, 2) DEFAULT 0.00,
    profit_factor NUMERIC(6, 2) DEFAULT 0.00,
    total_pnl NUMERIC(14, 2) DEFAULT 0.00,
    max_drawdown NUMERIC(5, 2) DEFAULT 0.00,
    winning_trades INT DEFAULT 0,
    losing_trades INT DEFAULT 0,
    total_trades INT DEFAULT 0,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_name VARCHAR(100) NOT NULL DEFAULT 'default',
    job_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying')),
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    error_message TEXT,
    run_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES FOR FAST RETRIEVAL & HIGH PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_mt5_accounts_user_id ON mt5_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_account_status ON positions(mt5_account_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_account_status ON orders(mt5_account_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created ON audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_trades_account_time ON trades(mt5_account_id, close_time DESC);
CREATE INDEX IF NOT EXISTS idx_performance_snapshots_user ON performance_snapshots(user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status_run ON jobs(status, run_at);
