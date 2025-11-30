import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { getPaymentTypeLabel, PAYMENT_TYPES } from "@/lib/payment-types";

interface PaymentAccountDetailsProps {
  project: {
    id: string;
    name: string;
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
    routingNumber?: string;
    swiftCode?: string;
    zelleEmail?: string;
    zellePhone?: string;
    cashappHandle?: string;
    venmoHandle?: string;
    paypalEmail?: string;
    paymentInstructions?: string;
    allowedPaymentTypes?: string;
  };
  selectedPaymentType: string;
}

export function PaymentAccountDetails({ project, selectedPaymentType }: PaymentAccountDetailsProps) {
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string>("");

  const allowedPaymentTypes = project.allowedPaymentTypes 
    ? JSON.parse(project.allowedPaymentTypes) 
    : PAYMENT_TYPES.map(type => type.value);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast({
        title: "Copied!",
        description: `${fieldName} copied to clipboard`,
      });
      setTimeout(() => setCopiedField(""), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const getAccountDetailsForPaymentType = (paymentType: string) => {
    const details: Array<{ label: string; value: string; field: string }> = [];

    switch (paymentType) {
      case "bank_transfer":
      case "mobile_money":
        if (project.accountName) details.push({ label: "Account Name", value: project.accountName, field: "accountName" });
        if (project.accountNumber) details.push({ label: "Account Number", value: project.accountNumber, field: "accountNumber" });
        if (project.bankName) details.push({ label: "Bank Name", value: project.bankName, field: "bankName" });
        break;
      
      case "zelle":
        if (project.zelleEmail) details.push({ label: "Zelle Email", value: project.zelleEmail, field: "zelleEmail" });
        if (project.zellePhone) details.push({ label: "Zelle Phone", value: project.zellePhone, field: "zellePhone" });
        break;
      
      case "cashapp":
        if (project.cashappHandle) details.push({ label: "Cash App Handle", value: project.cashappHandle, field: "cashappHandle" });
        break;
      
      case "venmo":
        if (project.venmoHandle) details.push({ label: "Venmo Handle", value: project.venmoHandle, field: "venmoHandle" });
        break;
      
      case "paypal":
        if (project.paypalEmail) details.push({ label: "PayPal Email", value: project.paypalEmail, field: "paypalEmail" });
        break;
      
      case "wire_transfer":
        if (project.accountName) details.push({ label: "Account Name", value: project.accountName, field: "accountName" });
        if (project.accountNumber) details.push({ label: "Account Number", value: project.accountNumber, field: "accountNumber" });
        if (project.bankName) details.push({ label: "Bank Name", value: project.bankName, field: "bankName" });
        if (project.routingNumber) details.push({ label: "Routing Number", value: project.routingNumber, field: "routingNumber" });
        if (project.swiftCode) details.push({ label: "SWIFT Code", value: project.swiftCode, field: "swiftCode" });
        break;
    }

    return details;
  };

  if (!selectedPaymentType || !allowedPaymentTypes.includes(selectedPaymentType)) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="pt-6">
          <div className="flex items-center text-orange-800">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span>Please select a payment method to view account details</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const accountDetails = getAccountDetailsForPaymentType(selectedPaymentType);
  const paymentTypeInfo = PAYMENT_TYPES.find(type => type.value === selectedPaymentType);

  if (accountDetails.length === 0 && selectedPaymentType !== "cash") {
    return null;
  }

  return (
    <div className="space-y-4">
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <CheckCircle2 className="h-5 w-5 mr-2 text-green-600" />
            Payment Details for {getPaymentTypeLabel(selectedPaymentType)}
          </CardTitle>
          {paymentTypeInfo && (
            <p className="text-sm text-green-700">{paymentTypeInfo.description}</p>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          {selectedPaymentType === "cash" ? (
            <div className="flex items-center text-green-800">
              <Info className="h-5 w-5 mr-2" />
              <span>Cash payment - coordinate directly with the group admin</span>
            </div>
          ) : (
            <div className="space-y-3">
              {accountDetails.map((detail, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{detail.label}</p>
                    <p className="text-lg font-mono text-gray-900">{detail.value}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(detail.value, detail.label)}
                    className="ml-4"
                  >
                    {copiedField === detail.field ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          {/* Payment Instructions */}
          {project.paymentInstructions && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Special Instructions</h4>
                  <p className="text-sm text-blue-800 whitespace-pre-wrap">
                    {project.paymentInstructions}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* General Payment Reminder */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>📸 Remember:</strong> Take a screenshot or photo of your payment confirmation 
              and upload it as proof of payment below.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}