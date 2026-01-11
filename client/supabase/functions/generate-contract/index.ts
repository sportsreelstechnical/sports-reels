
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContractRequest {
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
    signOnBonus?: number;
    performanceBonus?: number;
    relocationSupport?: number;
  };
}

const generateContractHTML = (data: ContractRequest) => {
  const currentDate = new Date().toLocaleDateString();
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Transfer Contract - ${data.playerName}</title>
      <style>
        body { 
          font-family: 'Times New Roman', serif; 
          line-height: 1.6; 
          color: #333; 
          max-width: 800px; 
          margin: 0 auto; 
          padding: 40px 20px; 
        }
        .header { text-align: center; margin-bottom: 40px; }
        .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .subtitle { font-size: 16px; color: #666; }
        .section { margin: 30px 0; }
        .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 5px; }
        .clause { margin: 15px 0; }
        .amount { font-weight: bold; color: #d4af37; }
        .signature-section { margin-top: 60px; display: flex; justify-content: space-between; }
        .signature-box { width: 200px; border-top: 1px solid #333; padding-top: 10px; text-align: center; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">PROFESSIONAL FOOTBALL TRANSFER AGREEMENT</div>
        <div class="subtitle">Transfer of ${data.playerName} to ${data.teamName}</div>
        <div class="subtitle">Date: ${currentDate}</div>
      </div>

      <div class="section">
        <div class="section-title">1. PARTIES</div>
        <div class="clause">
          <strong>Player:</strong> ${data.playerName}<br>
          <strong>Acquiring Club:</strong> ${data.teamName}<br>
          <strong>Transfer Type:</strong> ${data.transferType.toUpperCase()}
        </div>
      </div>

      <div class="section">
        <div class="section-title">2. TRANSFER TERMS</div>
        <table>
          <tr>
            <th>Item</th>
            <th>Amount</th>
          </tr>
          ${data.transferType === 'permanent' && data.askingPrice ? `
            <tr>
              <td>Transfer Fee</td>
              <td class="amount">${data.currency} ${data.askingPrice.toLocaleString()}</td>
            </tr>
          ` : ''}
          ${data.transferType === 'loan' && data.loanFee ? `
            <tr>
              <td>Loan Fee</td>
              <td class="amount">${data.currency} ${data.loanFee.toLocaleString()}</td>
            </tr>
          ` : ''}
          <tr>
            <td>Player Salary (Annual)</td>
            <td class="amount">${data.currency} ${data.contractDetails.salary.toLocaleString()}</td>
          </tr>
          ${data.contractDetails.signOnBonus ? `
            <tr>
              <td>Sign-on Bonus</td>
              <td class="amount">${data.currency} ${data.contractDetails.signOnBonus.toLocaleString()}</td>
            </tr>
          ` : ''}
          ${data.contractDetails.performanceBonus ? `
            <tr>
              <td>Performance Bonus</td>
              <td class="amount">${data.currency} ${data.contractDetails.performanceBonus.toLocaleString()}</td>
            </tr>
          ` : ''}
          ${data.contractDetails.relocationSupport ? `
            <tr>
              <td>Relocation Support</td>
              <td class="amount">${data.currency} ${data.contractDetails.relocationSupport.toLocaleString()}</td>
            </tr>
          ` : ''}
        </table>
      </div>

      <div class="section">
        <div class="section-title">3. CONTRACT DURATION</div>
        <div class="clause">
          This agreement shall be valid for a period of <strong>${data.contractDetails.duration}</strong> 
          commencing from the date of signature by all parties.
        </div>
      </div>

      <div class="section">
        <div class="section-title">4. TERMS AND CONDITIONS</div>
        <div class="clause">
          4.1. The player agrees to perform their duties with the highest level of professionalism and commitment.
        </div>
        <div class="clause">
          4.2. The acquiring club agrees to provide all necessary facilities and support for the player's development.
        </div>
        <div class="clause">
          4.3. All payments shall be made according to the agreed schedule and currency specified above.
        </div>
        <div class="clause">
          4.4. This agreement is subject to the rules and regulations of the relevant football governing bodies.
        </div>
      </div>

      <div class="section">
        <div class="section-title">5. GOVERNING LAW</div>
        <div class="clause">
          This agreement shall be governed by and construed in accordance with applicable football regulations 
          and the laws of the jurisdiction where the acquiring club is registered.
        </div>
      </div>

      <div class="signature-section">
        <div class="signature-box">
          <div>Player Signature</div>
          <div style="margin-top: 10px; font-size: 14px;">${data.playerName}</div>
        </div>
        <div class="signature-box">
          <div>Club Representative</div>
          <div style="margin-top: 10px; font-size: 14px;">${data.teamName}</div>
        </div>
        <div class="signature-box">
          <div>Date</div>
          <div style="margin-top: 10px; font-size: 14px;">${currentDate}</div>
        </div>
      </div>
    </body>
    </html>
  `;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Contract generation request received');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const contractData: ContractRequest = await req.json();
    console.log('Contract data received:', contractData);
    
    // Generate the HTML contract
    const contractHTML = generateContractHTML(contractData);
    console.log('Contract HTML generated successfully');
    
    return new Response(JSON.stringify({ 
      contractHTML,
      success: true,
      message: 'Contract generated successfully'
    }), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
    });

  } catch (error) {
    console.error('Error generating contract:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
    });
  }
});
