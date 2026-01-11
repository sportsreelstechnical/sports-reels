import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Banknote, Calendar, Building, Wallet, Check, Clock, AlertCircle } from 'lucide-react';

interface PaymentOptionsProps {
  contract: any;
  userRole: 'team' | 'agent';
  onMakePayment: (paymentData: any) => void;
  onViewWallet?: () => void;
}

const PaymentOptions: React.FC<PaymentOptionsProps> = ({
  contract,
  userRole,
  onMakePayment,
  onViewWallet
}) => {
  const [paymentType, setPaymentType] = useState<'full' | 'installment'>('full');
  const [installmentPlan, setInstallmentPlan] = useState('3');
  const [isProcessing, setIsProcessing] = useState(false);

  const contractValue = contract?.contract_value || 0;
  const currency = contract?.currency || 'USD';

  const installmentPlans = {
    '2': { months: 2, label: '2 months' },
    '3': { months: 3, label: '3 months' },
    '6': { months: 6, label: '6 months' },
    '12': { months: 12, label: '12 months' }
  };

  const getInstallmentAmount = () => {
    const months = parseInt(installmentPlan);
    return Math.round(contractValue / months);
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      const paymentData = {
        contractId: contract.id,
        amount: paymentType === 'full' ? contractValue : getInstallmentAmount(),
        type: paymentType,
        installmentPlan: paymentType === 'installment' ? parseInt(installmentPlan) : null,
        currency
      };
      await onMakePayment(paymentData);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-gray-900">Payment Processing</CardTitle>
              <p className="text-sm text-gray-600">Complete the transfer payment</p>
            </div>
          </div>
          <Badge variant="secondary" className="px-3 py-1">
            Payment Required
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Contract Value Summary */}
        <div className="p-4 bg-white rounded-lg border">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900">Transfer Amount</h4>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">
                {currency} {contractValue.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">Total contract value</p>
            </div>
          </div>
          
          {/* Team Account Information */}
          <Separator className="my-3" />
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Building className="w-4 h-4" />
              <span>Payment to: {contract?.team?.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Wallet className="w-4 h-4" />
              <span>Account: {contract?.team?.account_number || '****-****-1234'}</span>
            </div>
          </div>
        </div>

        {/* Payment Options (Agent Only) */}
        {userRole === 'agent' && (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Payment Method</h4>
            
            <RadioGroup value={paymentType} onValueChange={(value: 'full' | 'installment') => setPaymentType(value)}>
              {/* Full Payment Option */}
              <div className="flex items-center space-x-3 p-4 bg-white rounded-lg border hover:border-green-300 transition-colors">
                <RadioGroupItem value="full" id="full" />
                <Label htmlFor="full" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Banknote className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium text-gray-900">Full Payment</p>
                        <p className="text-sm text-gray-600">Pay the entire amount at once</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{currency} {contractValue.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">One-time payment</p>
                    </div>
                  </div>
                </Label>
              </div>

              {/* Installment Payment Option */}
              <div className="flex items-center space-x-3 p-4 bg-white rounded-lg border hover:border-green-300 transition-colors">
                <RadioGroupItem value="installment" id="installment" />
                <Label htmlFor="installment" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">Installment Plan</p>
                        <p className="text-sm text-gray-600">Split payment across multiple months</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">
                        {currency} {getInstallmentAmount().toLocaleString()}/month
                      </p>
                      <p className="text-xs text-gray-500">
                        {installmentPlan} monthly payments
                      </p>
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            {/* Installment Plan Selection */}
            {paymentType === 'installment' && (
              <div className="ml-8 space-y-3">
                <Label htmlFor="installment-plan" className="text-sm font-medium text-gray-700">
                  Select Payment Schedule
                </Label>
                <Select value={installmentPlan} onValueChange={setInstallmentPlan}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose installment plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(installmentPlans).map(([value, plan]) => (
                      <SelectItem key={value} value={value}>
                        {plan.label} - {currency} {Math.round(contractValue / plan.months).toLocaleString()}/month
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Installment Schedule Preview */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h5 className="font-medium text-blue-900 mb-2">Payment Schedule</h5>
                  <div className="space-y-1 text-sm text-blue-700">
                    {Array.from({ length: parseInt(installmentPlan) }).map((_, index) => (
                      <div key={index} className="flex justify-between">
                        <span>Payment {index + 1}:</span>
                        <span className="font-medium">
                          {currency} {getInstallmentAmount().toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Payment Actions */}
        <div className="flex gap-3">
          {userRole === 'agent' && (
            <Button
              onClick={handlePayment}
              disabled={isProcessing}
              className="flex-1 bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  {paymentType === 'full' ? 'Pay Full Amount' : 'Start Installment Plan'}
                </>
              )}
            </Button>
          )}
          
          {userRole === 'team' && onViewWallet && (
            <Button
              onClick={onViewWallet}
              variant="outline"
              className="flex-1 border-green-500 text-green-600 hover:bg-green-50"
              size="lg"
            >
              <Wallet className="w-4 h-4 mr-2" />
              View Team Wallet
            </Button>
          )}
        </div>

        {/* Payment Methods Info */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <CreditCard className="w-3 h-3 text-blue-600" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-gray-900 mb-1">Supported Payment Methods</p>
              <p className="text-gray-700">
                • Credit/Debit Cards • Bank Transfer • USSD • Mobile Money
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Powered by Paystack - Secure and encrypted transactions
              </p>
            </div>
          </div>
        </div>

        {/* Important Notice */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-900 mb-1">Important Notice</p>
              <p className="text-yellow-800">
                Once payment is completed, the player's status will automatically change to "Transferred" 
                and they will be removed from the transfer market.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentOptions;
