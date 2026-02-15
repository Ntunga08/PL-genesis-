/**
 * ZenoPay Mobile Money Tanzania Integration
 * Unified API for all Tanzanian mobile money providers (M-Pesa, Airtel Money, Tigo Pesa, Halopesa)
 */

import api from '@/lib/api';

export interface MobilePaymentRequest {
  phoneNumber: string;
  amount: number;
  invoiceId?: string; // Optional - for invoice payments
  patientId?: string; // Optional - for direct payments (registration, consultation)
  paymentType?: string; // Optional - e.g., 'Registration', 'Consultation', 'Invoice', 'Quick Service'
  paymentMethod: 'M-Pesa' | 'Airtel Money' | 'Tigo Pesa' | 'Halopesa';
  description?: string;
  // Quick Service metadata
  service_id?: string;
  service_name?: string;
  quantity?: number;
  unit_price?: number;
}

export interface MobilePaymentResponse {
  success: boolean;
  message: string;
  transactionId?: string;
  orderId?: string;
  status?: 'pending' | 'completed' | 'failed';
  error?: string;
}

export interface PaymentWebhookData {
  order_id: string;
  payment_status: string;
  reference: string;
  metadata?: any;
}

// ZenoPay integration now handled securely through backend API
// API keys are stored in backend/.env and never exposed to frontend

class ZenoPayService {
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove any non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');

    // Handle different phone number formats for Tanzania
    if (cleaned.startsWith('255')) {
      return cleaned;
    } else if (cleaned.startsWith('0')) {
      return `255${cleaned.substring(1)}`;
    } else if (cleaned.length === 9) {
      return `255${cleaned}`;
    }

    return cleaned;
  }

  private generateOrderId(invoiceId: string): string {
    // Generate UUID-like order ID for ZenoPay
    return `${invoiceId}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  async initiatePayment(request: MobilePaymentRequest): Promise<MobilePaymentResponse> {
    const { phoneNumber, amount, invoiceId, patientId, paymentType, paymentMethod, description, service_id, service_name, quantity, unit_price } = request;

    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      // Call backend API instead of ZenoPay directly (more secure)
      const response = await api.post('/payments/zenopay/initiate', {
        invoice_id: invoiceId || null,
        patient_id: patientId || null,
        payment_type: paymentType || 'Payment',
        amount: Math.round(amount),
        customer_name: 'Patient',
        customer_email: 'patient@hospital.com',
        customer_phone: formattedPhone,
        payment_method: paymentMethod,
        description: description || `${paymentType || 'Payment'} - ${paymentMethod}`,
        // Quick Service metadata
        service_id: service_id || null,
        service_name: service_name || null,
        quantity: quantity || null,
        unit_price: unit_price || null
      });

      if (response.data.success) {

        return {
          success: true,
          message: `${paymentMethod} payment request sent successfully`,
          transactionId: response.data.reference,
          orderId: response.data.reference,
          status: 'pending',
          testMode: response.data.test_mode || false
        } as any;
      }

      return {
        success: false,
        message: response.data.message || 'Failed to initiate payment',
        error: 'PAYMENT_FAILED'
      };
    } catch (error: any) {

      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to initiate payment',
        error: 'PAYMENT_ERROR'
      };
    }
  }

  async checkPaymentStatus(orderId: string): Promise<MobilePaymentResponse> {
    try {
      // Call backend API to check status (secure - API key stays on backend)
      const response = await api.get(`/payments/zenopay/status/${orderId}`);

      if (response.data.success) {
        const payment = response.data.payment;
        return {
          success: true,
          message: 'Payment status retrieved successfully',
          transactionId: payment.reference_number,
          orderId: payment.reference_number,
          status: payment.status === 'Completed' ? 'completed' : 
                  payment.status === 'Failed' ? 'failed' : 'pending'
        };
      }

      return {
        success: false,
        message: 'Payment not found',
        status: 'pending'
      };
    } catch (error: any) {

      return {
        success: false,
        message: error.message || 'Failed to check payment status',
        error: 'STATUS_CHECK_ERROR'
      };
    }
  }

  private async updatePaymentStatus(orderId: string, status: string): Promise<void> {
    try {
      // Payment webhook processing not yet fully implemented

      // TODO: Implement payment status update via MySQL API
    } catch (error) {

    }
  }

  private async updateInvoiceAfterPayment(invoiceId: string, amount: number): Promise<void> {
    try {
      // Invoice update after payment not yet fully implemented

      // TODO: Implement invoice update via MySQL API
    } catch (error) {

    }
  }

  async handlePaymentWebhook(webhookData: PaymentWebhookData): Promise<boolean> {
    try {

      // Here you would typically:
      // 1. Verify the webhook is from ZenoPay (check x-api-key header)
      // 2. Update payment status in database
      // 3. Update invoice status
      // 4. Send confirmation notifications

      // For now, we'll simulate the webhook processing
      return true;
    } catch (error) {

      return false;
    }
  }
}

// Export singleton instance
export const mobilePaymentService = new ZenoPayService();
