
import { supabase } from '@/integrations/supabase/client';

export interface ContractData {
  pitchId: string;
  playerName: string;
  teamName: string;
  transferType: 'permanent' | 'loan';
  askingPrice?: number;
  loanFee?: number;
  currency: string;
  contractDetails: {
    duration: string;
    salary: number;
    signOnBonus: number;
    performanceBonus: number;
    relocationSupport: number;
  };
}

// Enhanced contract data interfaces
export interface PermanentTransferContract {
  // Basic Information
  playerName: string;
  playerPosition: string;
  playerNationality: string;
  teamName: string;
  teamCountry: string;
  contractDate: string;
  
  // Transfer Details
  transferFee: number;
  currency: string;
  contractDuration: string;
  
  // Financial Terms
  playerSalary: {
    annual: number;
    monthly: number;
    weekly: number;
  };
  signOnBonus: number;
  performanceBonus: {
    appearance: number;
    goal: number;
    assist: number;
    cleanSheet: number;
    teamSuccess: number;
  };
  
  // Support & Benefits
  relocationSupport: {
    housing: number;
    transportation: number;
    familySupport: number;
    languageTraining: number;
  };
  medicalInsurance: boolean;
  imageRights: {
    percentage: number;
    terms: string;
  };
  
  // Additional Terms
  releaseClause: number;
  sellOnPercentage: number;
  buybackClause: {
    active: boolean;
    amount: number;
    duration: string;
  };
}

export interface LoanTransferContract {
  // Basic Information
  playerName: string;
  playerPosition: string;
  playerNationality: string;
  parentClub: string;
  loanClub: string;
  contractDate: string;
  currency: string;
  
  // Loan Details
  loanDuration: string;
  loanType: 'with-options' | 'without-options' | 'with-obligations';
  
  // Financial Terms
  loanFee: {
    base: number;
    withOptions: number;
    withoutOptions: number;
    withObligations: number;
  };
  salaryCoverage: {
    parentClub: number;
    loanClub: number;
    percentage: number;
  };
  
  // Performance Clauses
  appearanceClause: number;
  goalBonus: number;
  assistBonus: number;
  promotionBonus: number;
  
  // Options & Obligations
  purchaseOption: {
    active: boolean;
    amount: number;
    conditions: string[];
  };
  obligationToBuy: {
    active: boolean;
    amount: number;
    triggers: string[];
  };
  
  // Additional Terms
  recallClause: {
    active: boolean;
    conditions: string[];
    noticePeriod: string;
  };
  extensionOption: {
    active: boolean;
    duration: string;
    conditions: string[];
  };
}

export const contractService = {
  async generatePermanentTransferContract(data: PermanentTransferContract): Promise<string> {
    // Helper function to safely format numbers
    const formatNumber = (value: number | null | undefined): string => {
      if (value === null || value === undefined || isNaN(value)) {
        return '0';
      }
      return value.toLocaleString();
    };

    try {
      const contractHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Permanent Transfer Contract - ${data.playerName || 'Player'}</title>
          <style>
            body { font-family: 'Times New Roman', serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
            .header { text-align: center; border-bottom: 3px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            .contract-title { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
            .section { margin: 25px 0; }
            .section-title { font-size: 18px; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 15px; }
            .subsection { margin: 15px 0; }
            .subsection-title { font-size: 16px; font-weight: bold; margin-bottom: 8px; }
            .term { margin: 8px 0; display: flex; justify-content: space-between; }
            .term-label { font-weight: bold; }
            .term-value { text-align: right; }
            .signature-section { margin-top: 40px; display: flex; justify-content: space-between; }
            .signature-box { width: 200px; border-top: 1px solid #000; padding-top: 10px; text-align: center; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
            .highlight { background-color: #f0f0f0; padding: 10px; border-left: 4px solid #007bff; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="contract-title">PERMANENT TRANSFER CONTRACT</div>
            <div>Professional Football Player Transfer Agreement</div>
            <div>Date: ${data.contractDate || new Date().toISOString().split('T')[0]}</div>
          </div>

          <div class="section">
            <div class="section-title">1. PARTIES TO THE AGREEMENT</div>
            <div class="term">
              <span class="term-label">Player:</span>
              <span class="term-value">${data.playerName || 'Player Name'} (${data.playerPosition || 'Position'})</span>
            </div>
            <div class="term">
              <span class="term-label">Nationality:</span>
              <span class="term-value">${data.playerNationality || 'Nationality'}</span>
            </div>
            <div class="term">
              <span class="term-label">Acquiring Club:</span>
              <span class="term-value">${data.teamName || 'Club Name'}</span>
            </div>
            <div class="term">
              <span class="term-label">Country:</span>
              <span class="term-value">${data.teamCountry || 'Country'}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">2. TRANSFER DETAILS</div>
            <div class="highlight">
              <div class="term">
                <span class="term-label">Transfer Fee:</span>
                <span class="term-value">${data.currency || 'USD'} ${formatNumber(data.transferFee)}</span>
              </div>
              <div class="term">
                <span class="term-label">Contract Duration:</span>
                <span class="term-value">${data.contractDuration || '3 years'}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">3. FINANCIAL TERMS</div>
            
            <div class="subsection">
              <div class="subsection-title">3.1 Player Salary</div>
              <div class="term">
                <span class="term-label">Annual Salary:</span>
                <span class="term-value">${data.currency || 'USD'} ${formatNumber(data.playerSalary?.annual)}</span>
              </div>
              <div class="term">
                <span class="term-label">Monthly Salary:</span>
                <span class="term-value">${data.currency || 'USD'} ${formatNumber(data.playerSalary?.monthly)}</span>
              </div>
              <div class="term">
                <span class="term-label">Weekly Salary:</span>
                <span class="term-value">${data.currency || 'USD'} ${formatNumber(data.playerSalary?.weekly)}</span>
              </div>
            </div>

            <div class="subsection">
              <div class="subsection-title">3.2 Sign-on Bonus</div>
              <div class="term">
                <span class="term-label">Amount:</span>
                <span class="term-value">${data.currency || 'USD'} ${formatNumber(data.signOnBonus)}</span>
              </div>
            </div>

            <div class="subsection">
              <div class="subsection-title">3.3 Performance Bonuses</div>
              <div class="term">
                <span class="term-label">Appearance Bonus:</span>
                <span class="term-value">${data.currency || 'USD'} ${formatNumber(data.performanceBonus?.appearance)}</span>
              </div>
              <div class="term">
                <span class="term-label">Goal Bonus:</span>
                <span class="term-value">${data.currency || 'USD'} ${formatNumber(data.performanceBonus?.goal)}</span>
              </div>
              <div class="term">
                <span class="term-label">Assist Bonus:</span>
                <span class="term-value">${data.currency || 'USD'} ${formatNumber(data.performanceBonus?.assist)}</span>
              </div>
              <div class="term">
                <span class="term-label">Clean Sheet Bonus:</span>
                <span class="term-value">${data.currency || 'USD'} ${formatNumber(data.performanceBonus?.cleanSheet)}</span>
              </div>
              <div class="term">
                <span class="term-label">Team Success Bonus:</span>
                <span class="term-value">${data.currency || 'USD'} ${formatNumber(data.performanceBonus?.teamSuccess)}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">4. SUPPORT & RELOCATION BENEFITS</div>
            
            <div class="subsection">
              <div class="subsection-title">4.1 Relocation Support</div>
              <div class="term">
                <span class="term-label">Housing Allowance:</span>
                <span class="term-value">${data.currency || 'USD'} ${formatNumber(data.relocationSupport?.housing)}</span>
              </div>
              <div class="term">
                <span class="term-label">Transportation:</span>
                <span class="term-value">${data.currency || 'USD'} ${formatNumber(data.relocationSupport?.transportation)}</span>
              </div>
              <div class="term">
                <span class="term-label">Family Support:</span>
                <span class="term-value">${data.currency || 'USD'} ${formatNumber(data.relocationSupport?.familySupport)}</span>
              </div>
              <div class="term">
                <span class="term-label">Language Training:</span>
                <span class="term-value">${data.currency || 'USD'} ${formatNumber(data.relocationSupport?.languageTraining)}</span>
              </div>
            </div>

            <div class="subsection">
              <div class="subsection-title">4.2 Additional Benefits</div>
              <div class="term">
                <span class="term-label">Medical Insurance:</span>
                <span class="term-value">${data.medicalInsurance ? 'Included' : 'Not Included'}</span>
              </div>
              <div class="term">
                <span class="term-label">Image Rights:</span>
                <span class="term-value">${data.imageRights?.percentage || 0}% - ${data.imageRights?.terms || 'Standard terms'}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">5. TRANSFER CLAUSES</div>
            
            <div class="subsection">
              <div class="subsection-title">5.1 Release Clause</div>
              <div class="term">
                <span class="term-label">Amount:</span>
                <span class="term-value">${data.currency || 'USD'} ${formatNumber(data.releaseClause)}</span>
              </div>
            </div>

            <div class="subsection">
              <div class="subsection-title">5.2 Sell-on Clause</div>
              <div class="term">
                <span class="term-label">Percentage:</span>
                <span class="term-value">${data.sellOnPercentage || 0}%</span>
              </div>
            </div>

            <div class="subsection">
              <div class="subsection-title">5.3 Buyback Clause</div>
              <div class="term">
                <span class="term-label">Active:</span>
                <span class="term-value">${data.buybackClause?.active ? 'Yes' : 'No'}</span>
              </div>
              ${data.buybackClause?.active ? `
              <div class="term">
                <span class="term-label">Amount:</span>
                <span class="term-value">${data.currency || 'USD'} ${formatNumber(data.buybackClause?.amount)}</span>
              </div>
              <div class="term">
                <span class="term-label">Duration:</span>
                <span class="term-value">${data.buybackClause?.duration || 'Not specified'}</span>
              </div>
              ` : ''}
            </div>
          </div>

          <div class="signature-section">
            <div class="signature-box">
              <div>Player Signature</div>
              <div>Date: _______________</div>
            </div>
            <div class="signature-box">
              <div>Club Representative</div>
              <div>Date: _______________</div>
            </div>
          </div>

          <div class="footer">
            <p>This contract is generated electronically and is legally binding upon signature by both parties.</p>
            <p>Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>
        </body>
        </html>
      `;

      return contractHtml;
    } catch (error) {
      console.error('Error generating permanent transfer contract:', error);
      throw error;
    }
  },

  async generateLoanTransferContract(data: LoanTransferContract): Promise<string> {
    // Helper function to safely format numbers
    const formatNumber = (value: number | null | undefined): string => {
      if (value === null || value === undefined || isNaN(value)) {
        return '0';
      }
      return value.toLocaleString();
    };

    try {
      const contractHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Loan Transfer Contract - ${data.playerName || 'Player'}</title>
          <style>
            body { font-family: 'Times New Roman', serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
            .header { text-align: center; border-bottom: 3px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            .contract-title { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
            .section { margin: 25px 0; }
            .section-title { font-size: 18px; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 15px; }
            .subsection { margin: 15px 0; }
            .subsection-title { font-size: 16px; font-weight: bold; margin-bottom: 8px; }
            .term { margin: 8px 0; display: flex; justify-content: space-between; }
            .term-label { font-weight: bold; }
            .term-value { text-align: right; }
            .signature-section { margin-top: 40px; display: flex; justify-content: space-between; }
            .signature-box { width: 200px; border-top: 1px solid #000; padding-top: 10px; text-align: center; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
            .highlight { background-color: #f0f0f0; padding: 10px; border-left: 4px solid #007bff; margin: 10px 0; }
            .loan-type { background-color: #e8f5e8; padding: 10px; border-left: 4px solid #28a745; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="contract-title">LOAN TRANSFER AGREEMENT</div>
            <div>Professional Football Player Loan Contract</div>
            <div>Date: ${data.contractDate || new Date().toISOString().split('T')[0]}</div>
          </div>

          <div class="section">
            <div class="section-title">1. PARTIES TO THE AGREEMENT</div>
            <div class="term">
              <span class="term-label">Player:</span>
              <span class="term-value">${data.playerName || 'Player Name'} (${data.playerPosition || 'Position'})</span>
            </div>
            <div class="term">
              <span class="term-label">Nationality:</span>
              <span class="term-value">${data.playerNationality || 'Nationality'}</span>
            </div>
            <div class="term">
              <span class="term-label">Parent Club:</span>
              <span class="term-value">${data.parentClub || 'Parent Club'}</span>
            </div>
            <div class="term">
              <span class="term-label">Loan Club:</span>
              <span class="term-value">${data.loanClub || 'Loan Club'}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">2. LOAN DETAILS</div>
            <div class="loan-type">
              <div class="term">
                <span class="term-label">Loan Duration:</span>
                <span class="term-value">${data.loanDuration || '1 year'}</span>
              </div>
              <div class="term">
                <span class="term-label">Loan Type:</span>
                <span class="term-value">${(data.loanType || 'with-options').replace('-', ' ').toUpperCase()}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">3. FINANCIAL TERMS</div>
            
            <div class="subsection">
              <div class="subsection-title">3.1 Loan Fees</div>
              <div class="term">
                <span class="term-label">Base Loan Fee:</span>
                <span class="term-value">${data.currency || 'USD'} ${formatNumber(data.loanFee?.base)}</span>
              </div>
              <div class="term">
                <span class="term-label">With Options:</span>
                <span class="term-value">${data.currency || 'USD'} ${formatNumber(data.loanFee?.withOptions)}</span>
              </div>
              <div class="term">
                <span class="term-label">Without Options:</span>
                <span class="term-value">${data.currency || 'USD'} ${formatNumber(data.loanFee?.withoutOptions)}</span>
              </div>
              <div class="term">
                <span class="term-label">With Obligations:</span>
                <span class="term-value">${data.currency || 'USD'} ${formatNumber(data.loanFee?.withObligations)}</span>
              </div>
            </div>

            <div class="subsection">
              <div class="subsection-title">3.2 Salary Coverage</div>
              <div class="term">
                <span class="term-label">Parent Club Contribution:</span>
                <span class="term-value">${data.currency || 'USD'} ${formatNumber(data.salaryCoverage?.parentClub)}</span>
              </div>
              <div class="term">
                <span class="term-label">Loan Club Contribution:</span>
                <span class="term-value">${data.currency || 'USD'} ${formatNumber(data.salaryCoverage?.loanClub)}</span>
              </div>
              <div class="term">
                <span class="term-label">Coverage Percentage:</span>
                <span class="term-value">${data.salaryCoverage?.percentage || 0}%</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">4. PERFORMANCE CLAUSES</div>
            
            <div class="subsection">
              <div class="subsection-title">4.1 Appearance & Performance Bonuses</div>
              <div class="term">
                <span class="term-label">Appearance Clause:</span>
                <span class="term-value">${data.currency || 'USD'} ${formatNumber(data.appearanceClause)}</span>
              </div>
              <div class="term">
                <span class="term-label">Goal Bonus:</span>
                <span class="term-value">${data.currency || 'USD'} ${formatNumber(data.goalBonus)}</span>
              </div>
              <div class="term">
                <span class="term-label">Assist Bonus:</span>
                <span class="term-value">${data.currency || 'USD'} ${formatNumber(data.assistBonus)}</span>
              </div>
              <div class="term">
                <span class="term-label">Promotion Bonus:</span>
                <span class="term-value">${data.currency || 'USD'} ${formatNumber(data.promotionBonus)}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">5. OPTIONS & OBLIGATIONS</div>
            
            <div class="subsection">
              <div class="subsection-title">5.1 Purchase Option</div>
              <div class="term">
                <span class="term-label">Active:</span>
                <span class="term-value">${data.purchaseOption?.active ? 'Yes' : 'No'}</span>
              </div>
              ${data.purchaseOption?.active ? `
              <div class="term">
                <span class="term-label">Amount:</span>
                <span class="term-value">${data.currency || 'USD'} ${formatNumber(data.purchaseOption?.amount)}</span>
              </div>
              <div class="term">
                <span class="term-label">Conditions:</span>
                <span class="term-value">${data.purchaseOption?.conditions?.join(', ') || 'Standard conditions'}</span>
              </div>
              ` : ''}
            </div>

            <div class="subsection">
              <div class="subsection-title">5.2 Obligation to Buy</div>
              <div class="term">
                <span class="term-label">Active:</span>
                <span class="term-value">${data.obligationToBuy?.active ? 'Yes' : 'No'}</span>
              </div>
              ${data.obligationToBuy?.active ? `
              <div class="term">
                <span class="term-label">Amount:</span>
                <span class="term-value">${data.currency || 'USD'} ${formatNumber(data.obligationToBuy?.amount)}</span>
              </div>
              <div class="term">
                <span class="term-label">Triggers:</span>
                <span class="term-value">${data.obligationToBuy?.triggers?.join(', ') || 'Standard triggers'}</span>
              </div>
              ` : ''}
            </div>
          </div>

          <div class="section">
            <div class="section-title">6. ADDITIONAL TERMS</div>
            
            <div class="subsection">
              <div class="subsection-title">6.1 Recall Clause</div>
              <div class="term">
                <span class="term-label">Active:</span>
                <span class="term-value">${data.recallClause?.active ? 'Yes' : 'No'}</span>
              </div>
              ${data.recallClause?.active ? `
              <div class="term">
                <span class="term-label">Conditions:</span>
                <span class="term-value">${data.recallClause?.conditions?.join(', ') || 'Standard conditions'}</span>
              </div>
              <div class="term">
                <span class="term-label">Notice Period:</span>
                <span class="term-value">${data.recallClause?.noticePeriod || 'Standard notice'}</span>
              </div>
              ` : ''}
            </div>

            <div class="subsection">
              <div class="subsection-title">6.2 Extension Option</div>
              <div class="term">
                <span class="term-label">Active:</span>
                <span class="term-value">${data.extensionOption?.active ? 'Yes' : 'No'}</span>
              </div>
              ${data.extensionOption?.active ? `
              <div class="term">
                <span class="term-label">Duration:</span>
                <span class="term-value">${data.extensionOption?.duration || 'Standard duration'}</span>
              </div>
              <div class="term">
                <span class="term-label">Conditions:</span>
                <span class="term-value">${data.extensionOption?.conditions?.join(', ') || 'Standard conditions'}</span>
              </div>
              ` : ''}
            </div>
          </div>

          <div class="signature-section">
            <div class="signature-box">
              <div>Parent Club Representative</div>
              <div>Date: _______________</div>
            </div>
            <div class="signature-box">
              <div>Loan Club Representative</div>
              <div>Date: _______________</div>
            </div>
          </div>

          <div class="footer">
            <p>This loan agreement is generated electronically and is legally binding upon signature by both parties.</p>
            <p>Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>
        </body>
        </html>
      `;

      return contractHtml;
    } catch (error) {
      console.error('Error generating loan transfer contract:', error);
      throw error;
    }
  },

  async generateContract(contractData: ContractData): Promise<string> {
    try {
      // Generate contract HTML content
      const contractHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
          <h1 style="text-align: center; color: #333;">TRANSFER CONTRACT</h1>
          
          <div style="margin: 20px 0;">
            <h2>Contract Details</h2>
            <p><strong>Player:</strong> ${contractData.playerName}</p>
            <p><strong>Team:</strong> ${contractData.teamName}</p>
            <p><strong>Transfer Type:</strong> ${contractData.transferType === 'permanent' ? 'Permanent Transfer' : 'Loan Agreement'}</p>
            ${contractData.transferType === 'permanent' 
              ? `<p><strong>Transfer Fee:</strong> ${contractData.currency} ${contractData.askingPrice?.toLocaleString()}</p>`
              : `<p><strong>Loan Fee:</strong> ${contractData.currency} ${contractData.loanFee?.toLocaleString()}</p>`
            }
          </div>

          <div style="margin: 20px 0;">
            <h2>Financial Terms</h2>
            <p><strong>Contract Duration:</strong> ${contractData.contractDetails.duration}</p>
            <p><strong>Monthly Salary:</strong> ${contractData.currency} ${contractData.contractDetails.salary.toLocaleString()}</p>
            <p><strong>Sign-on Bonus:</strong> ${contractData.currency} ${contractData.contractDetails.signOnBonus.toLocaleString()}</p>
            <p><strong>Performance Bonus:</strong> ${contractData.currency} ${contractData.contractDetails.performanceBonus.toLocaleString()}</p>
            <p><strong>Relocation Support:</strong> ${contractData.currency} ${contractData.contractDetails.relocationSupport.toLocaleString()}</p>
          </div>

          <div style="margin: 40px 0; text-align: center;">
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
        </div>
      `;

      return contractHtml;
    } catch (error) {
      console.error('Error generating contract:', error);
      throw error;
    }
  },

  async downloadContract(contractHtml: string, fileName: string): Promise<void> {
    try {
      // Create a blob with the HTML content
      const blob = new Blob([contractHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading contract:', error);
      throw error;
    }
  },

  async previewContract(contractHtml: string): Promise<void> {
    try {
      // Open contract in new window for preview
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(contractHtml);
        newWindow.document.close();
      }
    } catch (error) {
      console.error('Error previewing contract:', error);
      throw error;
    }
  },

  async testBucketAccess(): Promise<boolean> {
    try {
      const { data, error } = await supabase.storage.getBucket('contracts');
      if (error) {
        console.error('Error accessing contracts bucket:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error testing bucket access:', error);
      return false;
    }
  }
};
