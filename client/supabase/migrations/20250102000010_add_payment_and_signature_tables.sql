-- Add signature tracking to contracts table
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS signatures JSONB DEFAULT '{}';

-- Create payments table for tracking transfer payments
CREATE TABLE IF NOT EXISTS contract_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_type TEXT NOT NULL CHECK (payment_type IN ('full', 'installment')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  payment_method TEXT,
  paystack_transaction_id TEXT,
  installment_plan INTEGER,
  installment_current INTEGER DEFAULT 1,
  next_payment_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create team wallets table
CREATE TABLE IF NOT EXISTS team_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE UNIQUE,
  balance NUMERIC DEFAULT 0,
  pending_balance NUMERIC DEFAULT 0,
  reserved_balance NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  account_number TEXT,
  bank_details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create wallet transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES team_wallets(id) ON DELETE CASCADE,
  contract_payment_id UUID REFERENCES contract_payments(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('incoming', 'outgoing', 'fee', 'refund')),
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create agent payment history table
CREATE TABLE IF NOT EXISTS agent_payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  contract_payment_id UUID REFERENCES contract_payments(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL CHECK (status IN ('completed', 'pending', 'failed', 'installment_active')),
  payment_method TEXT,
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contract_payments_contract_id ON contract_payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_payments_agent_id ON contract_payments(agent_id);
CREATE INDEX IF NOT EXISTS idx_contract_payments_status ON contract_payments(status);
CREATE INDEX IF NOT EXISTS idx_team_wallets_team_id ON team_wallets(team_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_agent_payment_history_agent_id ON agent_payment_history(agent_id);

-- Enable RLS on new tables
ALTER TABLE contract_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_payment_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for contract_payments
CREATE POLICY "Users can view their contract payments" ON contract_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id = contract_payments.contract_id
      AND (
        EXISTS (SELECT 1 FROM teams t WHERE t.id = c.team_id AND t.profile_id = auth.uid())
        OR EXISTS (SELECT 1 FROM agents a WHERE a.id = c.agent_id AND a.profile_id = auth.uid())
      )
    )
  );

CREATE POLICY "Agents can create payments for their contracts" ON contract_payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = contract_payments.agent_id
      AND a.profile_id = auth.uid()
    )
  );

CREATE POLICY "System can update payment status" ON contract_payments
  FOR UPDATE USING (true);

-- RLS policies for team_wallets
CREATE POLICY "Teams can view their wallet" ON team_wallets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_wallets.team_id
      AND t.profile_id = auth.uid()
    )
  );

CREATE POLICY "Teams can update their wallet" ON team_wallets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_wallets.team_id
      AND t.profile_id = auth.uid()
    )
  );

-- RLS policies for wallet_transactions
CREATE POLICY "Teams can view their wallet transactions" ON wallet_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_wallets tw
      JOIN teams t ON t.id = tw.team_id
      WHERE tw.id = wallet_transactions.wallet_id
      AND t.profile_id = auth.uid()
    )
  );

-- RLS policies for agent_payment_history
CREATE POLICY "Agents can view their payment history" ON agent_payment_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = agent_payment_history.agent_id
      AND a.profile_id = auth.uid()
    )
  );

-- Function to create wallet for new teams
CREATE OR REPLACE FUNCTION create_team_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO team_wallets (team_id, currency)
  VALUES (NEW.id, 'USD');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create wallet for new teams
CREATE TRIGGER create_team_wallet_trigger
  AFTER INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION create_team_wallet();

-- Function to update wallet balance on payment completion
CREATE OR REPLACE FUNCTION update_wallet_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Add to team wallet
    UPDATE team_wallets 
    SET 
      balance = balance + NEW.amount,
      updated_at = now()
    WHERE team_id = NEW.team_id;
    
    -- Create wallet transaction record
    INSERT INTO wallet_transactions (
      wallet_id,
      contract_payment_id,
      transaction_type,
      amount,
      currency,
      description,
      status
    )
    SELECT 
      tw.id,
      NEW.id,
      'incoming',
      NEW.amount,
      NEW.currency,
      'Transfer payment received',
      'completed'
    FROM team_wallets tw
    WHERE tw.team_id = NEW.team_id;
    
    -- Update contract status to completed
    UPDATE contracts 
    SET 
      status = 'completed',
      current_step = 'completed',
      deal_stage = 'signed',
      updated_at = now()
    WHERE id = NEW.contract_id;
    
    -- Update player status to transferred (if player exists)
    UPDATE players 
    SET 
      status = 'transferred',
      updated_at = now()
    WHERE id = (
      SELECT player_id FROM contracts WHERE id = NEW.contract_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update wallet on payment completion
CREATE TRIGGER update_wallet_on_payment_trigger
  AFTER UPDATE ON contract_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_on_payment();

-- Create wallets for existing teams
INSERT INTO team_wallets (team_id, currency)
SELECT id, 'USD'
FROM teams
WHERE id NOT IN (SELECT team_id FROM team_wallets WHERE team_id IS NOT NULL);
