import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, CheckCircle, AlertCircle, DollarSign } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface BillingStatusBadgeProps {
  patientId: string;
  showDetails?: boolean;
  className?: string;
}

interface BillingInfo {
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: 'paid' | 'partial' | 'pending' | 'none';
}

export function BillingStatusBadge({ patientId, showDetails = false, className = '' }: BillingStatusBadgeProps) {
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBillingStatus();
  }, [patientId]);

  const fetchBillingStatus = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/invoices?patient_id=${patientId}`);
      const invoices = data.invoices || [];
      
      let totalAmount = 0;
      let paidAmount = 0;
      let outstandingAmount = 0;
      
      for (const invoice of invoices) {
        totalAmount += parseFloat(invoice.total_amount || 0);
        paidAmount += parseFloat(invoice.paid_amount || 0);
        if (invoice.status !== 'Paid' && invoice.balance > 0) {
          outstandingAmount += parseFloat(invoice.balance);
        }
      }
      
      let status: BillingInfo['status'] = 'none';
      if (totalAmount === 0) {
        status = 'none';
      } else if (outstandingAmount === 0) {
        status = 'paid';
      } else if (paidAmount > 0) {
        status = 'partial';
      } else {
        status = 'pending';
      }
      
      setBillingInfo({
        totalAmount,
        paidAmount,
        outstandingAmount,
        status
      });
    } catch (error) {

      setBillingInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const showBillingDetails = () => {
    if (!billingInfo) return;
    
    const { totalAmount, paidAmount, outstandingAmount } = billingInfo;
    
    if (outstandingAmount > 0) {
      toast.info(
        `Billing: $${paidAmount.toFixed(2)} paid of $${totalAmount.toFixed(2)} total. Outstanding: $${outstandingAmount.toFixed(2)}`,
        { duration: 5000 }
      );
    } else if (totalAmount > 0) {
      toast.success(
        `Billing: Fully paid ($${paidAmount.toFixed(2)} total)`,
        { duration: 3000 }
      );
    } else {
      toast.info('No billing records found for this patient', { duration: 3000 });
    }
  };

  if (loading) {
    return (
      <Badge variant="outline" className={className}>
        <DollarSign className="h-3 w-3 mr-1" />
        Loading...
      </Badge>
    );
  }

  if (!billingInfo) {
    return (
      <Badge variant="outline" className={className}>
        <AlertCircle className="h-3 w-3 mr-1" />
        Billing Error
      </Badge>
    );
  }

  const { status, outstandingAmount, totalAmount } = billingInfo;

  const getBadgeProps = () => {
    switch (status) {
      case 'paid':
        return {
          variant: 'default' as const,
          className: 'bg-green-600 hover:bg-green-700',
          icon: CheckCircle,
          text: 'Paid'
        };
      case 'partial':
        return {
          variant: 'default' as const,
          className: 'bg-yellow-600 hover:bg-yellow-700',
          icon: CreditCard,
          text: `$${outstandingAmount.toFixed(0)} Due`
        };
      case 'pending':
        return {
          variant: 'destructive' as const,
          className: '',
          icon: AlertCircle,
          text: `$${outstandingAmount.toFixed(0)} Due`
        };
      case 'none':
        return {
          variant: 'secondary' as const,
          className: '',
          icon: DollarSign,
          text: 'No Billing'
        };
    }
  };

  const badgeProps = getBadgeProps();
  const Icon = badgeProps.icon;

  if (showDetails) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={showBillingDetails}
        className={`${className} ${badgeProps.className}`}
      >
        <Icon className="h-3 w-3 mr-1" />
        {badgeProps.text}
        {totalAmount > 0 && (
          <span className="ml-1 text-xs opacity-75">
            (${totalAmount.toFixed(0)} total)
          </span>
        )}
      </Button>
    );
  }

  return (
    <Badge 
      variant={badgeProps.variant} 
      className={`${className} ${badgeProps.className} cursor-pointer`}
      onClick={showBillingDetails}
    >
      <Icon className="h-3 w-3 mr-1" />
      {badgeProps.text}
    </Badge>
  );
}