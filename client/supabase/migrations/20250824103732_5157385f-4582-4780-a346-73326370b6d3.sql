
-- Enhanced contract system with all requested features

-- Contract templates table for professional templates
CREATE TABLE IF NOT EXISTS contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('permanent', 'loan', 'renewal', 'pre_contract')),
  language_code TEXT NOT NULL DEFAULT 'en',
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Contract versions for revision tracking
CREATE TABLE IF NOT EXISTS contract_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  changes_summary TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Contract comments for collaboration
CREATE TABLE IF NOT EXISTS contract_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Contract audit trail
CREATE TABLE IF NOT EXISTS contract_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Contract notifications/reminders
CREATE TABLE IF NOT EXISTS contract_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('expiration', 'response_deadline', 'review_due', 'renewal')),
  reminder_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Contract analytics/metrics
CREATE TABLE IF NOT EXISTS contract_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  metric_value NUMERIC,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enhanced contracts table with new fields
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS pitch_id UUID REFERENCES transfer_pitches(id),
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS deal_stage TEXT DEFAULT 'draft' CHECK (deal_stage IN ('draft', 'negotiating', 'under_review', 'signed', 'rejected', 'expired')),
ADD COLUMN IF NOT EXISTS response_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS auto_expire_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS financial_summary JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS compliance_status JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS digital_signature_status JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS language_code TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS priority_level TEXT DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS contract_value NUMERIC,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS negotiation_rounds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Enable RLS on new tables
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies for contract templates
CREATE POLICY "Everyone can view active templates" ON contract_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can create templates" ON contract_templates
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Template creators can update their templates" ON contract_templates
  FOR UPDATE USING (created_by = auth.uid());

-- RLS policies for contract versions
CREATE POLICY "Users can view contract versions they have access to" ON contract_versions
  FOR SELECT USING (
    contract_id IN (
      SELECT id FROM contracts 
      WHERE (team_id IN (SELECT id FROM teams WHERE profile_id = auth.uid()))
      OR (agent_id IN (SELECT id FROM agents WHERE profile_id = auth.uid()))
    )
  );

CREATE POLICY "Users can create versions for their contracts" ON contract_versions
  FOR INSERT WITH CHECK (
    contract_id IN (
      SELECT id FROM contracts 
      WHERE (team_id IN (SELECT id FROM teams WHERE profile_id = auth.uid()))
      OR (agent_id IN (SELECT id FROM agents WHERE profile_id = auth.uid()))
    )
  );

-- RLS policies for contract comments
CREATE POLICY "Users can view comments on their contracts" ON contract_comments
  FOR SELECT USING (
    contract_id IN (
      SELECT id FROM contracts 
      WHERE (team_id IN (SELECT id FROM teams WHERE profile_id = auth.uid()))
      OR (agent_id IN (SELECT id FROM agents WHERE profile_id = auth.uid()))
    )
  );

CREATE POLICY "Users can create comments on their contracts" ON contract_comments
  FOR INSERT WITH CHECK (
    contract_id IN (
      SELECT id FROM contracts 
      WHERE (team_id IN (SELECT id FROM teams WHERE profile_id = auth.uid()))
      OR (agent_id IN (SELECT id FROM agents WHERE profile_id = auth.uid()))
    )
    AND user_id = auth.uid()
  );

-- RLS policies for audit log (read-only for contract parties)
CREATE POLICY "Users can view audit log for their contracts" ON contract_audit_log
  FOR SELECT USING (
    contract_id IN (
      SELECT id FROM contracts 
      WHERE (team_id IN (SELECT id FROM teams WHERE profile_id = auth.uid()))
      OR (agent_id IN (SELECT id FROM agents WHERE profile_id = auth.uid()))
    )
  );

-- RLS policies for reminders
CREATE POLICY "Users can manage reminders for their contracts" ON contract_reminders
  FOR ALL USING (
    contract_id IN (
      SELECT id FROM contracts 
      WHERE (team_id IN (SELECT id FROM teams WHERE profile_id = auth.uid()))
      OR (agent_id IN (SELECT id FROM agents WHERE profile_id = auth.uid()))
    )
  );

-- RLS policies for metrics
CREATE POLICY "Users can view metrics for their contracts" ON contract_metrics
  FOR SELECT USING (
    contract_id IN (
      SELECT id FROM contracts 
      WHERE (team_id IN (SELECT id FROM teams WHERE profile_id = auth.uid()))
      OR (agent_id IN (SELECT id FROM agents WHERE profile_id = auth.uid()))
    )
  );

-- Functions for contract management
CREATE OR REPLACE FUNCTION create_contract_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Create new version when contract terms change
  IF OLD.terms IS DISTINCT FROM NEW.terms THEN
    INSERT INTO contract_versions (contract_id, version_number, content, created_by)
    VALUES (NEW.id, NEW.version, NEW.terms::text, auth.uid());
    
    NEW.version = NEW.version + 1;
    NEW.negotiation_rounds = NEW.negotiation_rounds + 1;
  END IF;
  
  NEW.last_activity = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION log_contract_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO contract_audit_log (contract_id, action, old_values, new_values, user_id)
  VALUES (
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE row_to_json(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW) END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS contract_version_trigger ON contracts;
CREATE TRIGGER contract_version_trigger
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION create_contract_version();

DROP TRIGGER IF EXISTS contract_audit_trigger ON contracts;
CREATE TRIGGER contract_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION log_contract_changes();

-- Insert default professional templates
INSERT INTO contract_templates (name, template_type, language_code, content) VALUES
('Professional Transfer Contract', 'permanent', 'en', '
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Professional Football Transfer Agreement</title>
  <style>
    body { font-family: "Times New Roman", serif; line-height: 1.6; margin: 0; padding: 40px; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #000; padding-bottom: 20px; }
    .title { font-size: 24px; font-weight: bold; text-transform: uppercase; }
    .subtitle { font-size: 16px; margin-top: 10px; }
    .section { margin: 30px 0; page-break-inside: avoid; }
    .section-title { font-size: 18px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 15px; }
    .clause { margin: 15px 0; text-align: justify; }
    .financial-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .financial-table th, .financial-table td { border: 1px solid #000; padding: 12px; text-align: left; }
    .financial-table th { background-color: #f0f0f0; font-weight: bold; }
    .signature-section { margin-top: 80px; display: flex; justify-content: space-between; page-break-inside: avoid; }
    .signature-box { width: 250px; text-align: center; }
    .signature-line { border-top: 1px solid #000; margin-top: 60px; padding-top: 10px; }
    .legal-text { font-size: 11px; color: #666; margin-top: 40px; text-align: justify; }
    @page { margin: 2cm; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">Professional Football Transfer Agreement</div>
    <div class="subtitle">FIFA Regulation Compliant Contract</div>
  </div>

  <div class="section">
    <div class="section-title">Article 1 - Parties to the Agreement</div>
    <div class="clause">
      <strong>1.1 The Club:</strong> {{teamName}}<br>
      Address: {{teamAddress}}<br>
      Registration Number: {{teamRegistration}}<br>
      FIFA/Association ID: {{teamFifaId}}
    </div>
    <div class="clause">
      <strong>1.2 The Player:</strong> {{playerName}}<br>
      Date of Birth: {{playerDob}}<br>
      Nationality: {{playerNationality}}<br>
      FIFA ID: {{playerFifaId}}<br>
      Passport/ID Number: {{playerPassport}}
    </div>
    <div class="clause">
      <strong>1.3 The Previous Club:</strong> {{previousClub}} (if applicable)<br>
      Transfer Reference: {{transferReference}}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Article 2 - Transfer Terms and Conditions</div>
    <div class="clause">
      <strong>2.1 Transfer Type:</strong> {{transferType}}<br>
      <strong>2.2 Contract Duration:</strong> {{contractDuration}}<br>
      <strong>2.3 Effective Date:</strong> {{effectiveDate}}<br>
      <strong>2.4 Registration Window:</strong> {{registrationWindow}}
    </div>
    
    <table class="financial-table">
      <thead>
        <tr>
          <th>Financial Component</th>
          <th>Amount</th>
          <th>Currency</th>
          <th>Payment Terms</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Transfer Fee</td>
          <td>{{transferFee}}</td>
          <td>{{currency}}</td>
          <td>{{transferPaymentTerms}}</td>
        </tr>
        <tr>
          <td>Annual Salary</td>
          <td>{{annualSalary}}</td>
          <td>{{currency}}</td>
          <td>Monthly installments</td>
        </tr>
        <tr>
          <td>Sign-on Bonus</td>
          <td>{{signOnBonus}}</td>
          <td>{{currency}}</td>
          <td>Upon contract signature</td>
        </tr>
        <tr>
          <td>Performance Bonuses</td>
          <td>{{performanceBonus}}</td>
          <td>{{currency}}</td>
          <td>As per performance criteria</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Article 3 - FIFA Regulations Compliance</div>
    <div class="clause">
      <strong>3.1 Registration:</strong> This transfer is subject to FIFA Regulations on the Status and Transfer of Players (RSTP) and the relevant association regulations.
    </div>
    <div class="clause">
      <strong>3.2 Transfer Windows:</strong> The player registration must be completed within the official transfer window periods as defined by FIFA and the relevant association.
    </div>
    <div class="clause">
      <strong>3.3 Third Party Ownership:</strong> The parties confirm that no third party owns, wholly or partially, the economic rights of the player or has the ability to influence the club in employment matters.
    </div>
    <div class="clause">
      <strong>3.4 Training Compensation:</strong> Any training compensation due shall be calculated in accordance with FIFA regulations and paid within 30 days of player registration.
    </div>
  </div>

  <div class="section">
    <div class="section-title">Article 4 - Player Obligations and Rights</div>
    <div class="clause">
      <strong>4.1 Professional Conduct:</strong> The player undertakes to conduct themselves with the utmost professionalism and in accordance with the club''s code of conduct.
    </div>
    <div class="clause">
      <strong>4.2 Medical Requirements:</strong> The player must pass the club''s medical examination and maintain physical fitness standards.
    </div>
    <div class="clause">
      <strong>4.3 Image Rights:</strong> {{imageRightsClause}}
    </div>
    <div class="clause">
      <strong>4.4 Disciplinary Matters:</strong> The player is subject to the disciplinary regulations of the club and the relevant football association.
    </div>
  </div>

  <div class="section">
    <div class="section-title">Article 5 - Termination and Dispute Resolution</div>
    <div class="clause">
      <strong>5.1 Contract Termination:</strong> This contract may be terminated in accordance with FIFA RSTP regulations and applicable employment law.
    </div>
    <div class="clause">
      <strong>5.2 Dispute Resolution:</strong> Any disputes arising from this contract shall be submitted to FIFA DRC or the relevant association''s dispute resolution body.
    </div>
    <div class="clause">
      <strong>5.3 Governing Law:</strong> This contract is governed by the laws of {{governingLaw}} and FIFA regulations.
    </div>
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-line">
        <strong>Player Signature</strong><br>
        {{playerName}}<br>
        Date: {{signatureDate}}
      </div>
    </div>
    <div class="signature-box">
      <div class="signature-line">
        <strong>Club Representative</strong><br>
        {{clubRepresentative}}<br>
        Date: {{signatureDate}}
      </div>
    </div>
    <div class="signature-box">
      <div class="signature-line">
        <strong>Witness/Agent</strong><br>
        {{witnessName}}<br>
        Date: {{signatureDate}}
      </div>
    </div>
  </div>

  <div class="legal-text">
    This contract has been prepared in accordance with FIFA Regulations on the Status and Transfer of Players. 
    All parties acknowledge they have read, understood, and agree to be bound by the terms and conditions set forth herein. 
    This contract constitutes the entire agreement between the parties and supersedes all prior negotiations, 
    representations, or agreements relating to the subject matter hereof.
  </div>
</body>
</html>
'),

('Loan Agreement Contract', 'loan', 'en', '
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Professional Football Loan Agreement</title>
  <style>
    body { font-family: "Times New Roman", serif; line-height: 1.6; margin: 0; padding: 40px; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #000; padding-bottom: 20px; }
    .title { font-size: 24px; font-weight: bold; text-transform: uppercase; }
    .section { margin: 30px 0; }
    .section-title { font-size: 18px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 15px; }
    .clause { margin: 15px 0; text-align: justify; }
    .loan-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .loan-table th, .loan-table td { border: 1px solid #000; padding: 12px; text-align: left; }
    .loan-table th { background-color: #f0f0f0; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">Professional Football Loan Agreement</div>
  </div>

  <div class="section">
    <div class="section-title">Article 1 - Loan Parties</div>
    <div class="clause">
      <strong>1.1 Parent Club:</strong> {{parentClub}}<br>
      <strong>1.2 Loan Club:</strong> {{loanClub}}<br>
      <strong>1.3 Player:</strong> {{playerName}}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Article 2 - Loan Terms</div>
    <table class="loan-table">
      <tr><td><strong>Loan Period</strong></td><td>{{loanPeriod}}</td></tr>
      <tr><td><strong>Loan Fee</strong></td><td>{{loanFee}} {{currency}}</td></tr>
      <tr><td><strong>Salary Responsibility</strong></td><td>{{salaryResponsibility}}</td></tr>
      <tr><td><strong>Option to Purchase</strong></td><td>{{optionToPurchase}}</td></tr>
      <tr><td><strong>Purchase Option Fee</strong></td><td>{{optionFee}} {{currency}}</td></tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Article 3 - Loan Conditions</div>
    <div class="clause">
      <strong>3.1 Player Development:</strong> The loan club commits to providing adequate playing opportunities for the player''s development.
    </div>
    <div class="clause">
      <strong>3.2 Recall Clause:</strong> {{recallClause}}
    </div>
    <div class="clause">
      <strong>3.3 Medical Insurance:</strong> {{medicalInsurance}}
    </div>
  </div>
</body>
</html>
');
