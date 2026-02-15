import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api from '@/lib/api';
import { mobilePaymentService, MobilePaymentRequest } from '@/lib/mobilePaymentService';
import { ServiceFormDialog } from '@/components/ServiceFormDialog';
import { Loader2, Stethoscope, Plus } from 'lucide-react';

interface QuickServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: any; // Optional - can be null for walk-ins
  onSuccess: () => void;
}

export function QuickServiceDialog({ open, onOpenChange, patient, onSuccess }: QuickServiceDialogProps) {
  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Multiple services cart
  const [serviceCart, setServiceCart] = useState<Array<{service: any, quantity: number}>>([]);
  
  // Payment fields
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [mobilePhone, setMobilePhone] = useState<string>('');
  
  // Walk-in patient fields
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [walkInData, setWalkInData] = useState({
    full_name: '',
    phone: '',
    date_of_birth: '',
    gender: 'Male'
  });
  
  // Patient search for registered patients
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  
  // Service search functionality
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  
  // Service form handling
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceFormTemplate, setServiceFormTemplate] = useState<any>(null);
  const [currentVisit, setCurrentVisit] = useState<any>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchServices();
      setIsWalkIn(!patient); // If no patient, it's a walk-in
      setServiceCart([]); // Reset cart when dialog opens
      setSelectedService(''); // Reset service selection
      setQuantity(1); // Reset quantity
      setSelectedPatient(patient); // Set initial patient if provided
    }
  }, [open, patient]);

  // Patient search effect
  useEffect(() => {
    const searchPatients = async () => {
      if (patientSearchTerm.length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        const response = await api.get(`/patients?search=${encodeURIComponent(patientSearchTerm)}&limit=10`);
        setSearchResults(response.data.patients || []);
      } catch (error) {

        setSearchResults([]);
      }
    };

    const debounceTimer = setTimeout(searchPatients, 300);
    return () => clearTimeout(debounceTimer);
  }, [patientSearchTerm]);

  // Close service dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.service-search-container')) {
        setShowServiceDropdown(false);
      }
    };

    if (showServiceDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showServiceDropdown]);

  // Add service to cart
  const addToCart = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    if (!selectedService) {

      toast.error('Please select a service');
      return;
    }
    
    const service = services.find(s => String(s.id) === String(selectedService));

    if (!service) {

      toast.error('Service not found');
      return;
    }
    
    // Check if service already in cart
    const existingIndex = serviceCart.findIndex(item => String(item.service.id) === String(selectedService));

    if (existingIndex >= 0) {
      // Update quantity
      const updated = [...serviceCart];
      updated[existingIndex].quantity += quantity;

      setServiceCart(updated);
      toast.success(`Updated ${service.service_name} quantity`);
    } else {
      // Add new service
      const newCart = [...serviceCart, { service, quantity }];

      setServiceCart(newCart);
      toast.success(`Added ${service.service_name} to cart`);
    }
    
    // Reset selection

    setSelectedService('');
    setQuantity(1);
  };

  // Remove service from cart
  const removeFromCart = (serviceId: string) => {

    setServiceCart(serviceCart.filter(item => String(item.service.id) !== String(serviceId)));
  };

  // Calculate total amount from cart
  const calculateTotal = () => {
    const total = serviceCart.reduce((total, item) => {
      const itemTotal = item.service.base_price * item.quantity;

      return total + itemTotal;
    }, 0);

    return total;
  };

  const fetchServices = async () => {
    setLoading(true);
    try {
      const response = await api.get('/services');
      // Filter for active services
      // Quick service can handle ALL service types - patient will be routed to correct department
      const activeServices = response.data.services.filter((s: any) => s.is_active);
      setServices(activeServices);

    } catch (error) {

      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  // Filter services based on search term
  const filteredServices = services.filter(service => 
    service.service_name.toLowerCase().includes(serviceSearchTerm.toLowerCase()) ||
    service.service_type.toLowerCase().includes(serviceSearchTerm.toLowerCase()) ||
    service.service_code.toLowerCase().includes(serviceSearchTerm.toLowerCase())
  );

  const handleAssignService = async () => {
    if (serviceCart.length === 0) {
      toast.error('Please add at least one service to cart');
      return;
    }

    // Validate walk-in data if needed
    if (isWalkIn) {
      if (!walkInData.full_name || !walkInData.phone || !walkInData.date_of_birth) {
        toast.error('Please fill in all patient details');
        return;
      }
    } else if (!selectedPatient?.id) {
      toast.error('No patient selected');
      return;
    }

    // Validate payment
    const totalAmount = calculateTotal();
    
    if (!amountPaid || parseFloat(amountPaid) < totalAmount) {
      toast.error(`Payment required: TSh ${totalAmount.toLocaleString()}`);
      return;
    }

    // Validate mobile money phone if needed
    if (['M-Pesa', 'Airtel Money', 'Tigo Pesa', 'Halopesa'].includes(paymentMethod)) {
      if (!mobilePhone) {
        toast.error('Please enter mobile money phone number');
        return;
      }
      const phoneRegex = /^0[67][0-9]{8}$/;
      if (!phoneRegex.test(mobilePhone)) {
        toast.error('Invalid phone number format. Use 07xxxxxxxx or 06xxxxxxxx');
        return;
      }
    }

    setSubmitting(true);
    try {
      let patientId = selectedPatient?.id;

      // Register walk-in patient first if needed
      if (isWalkIn) {
        const registerRes = await api.post('/patients', {
          ...walkInData,
          status: 'Active',
          address: 'Walk-in',
          email: `walkin_${Date.now()}@temp.com` // Temporary email
        });
        
        if (registerRes.data.error) {
          throw new Error(registerRes.data.error);
        }
        
        patientId = registerRes.data.patient?.id || registerRes.data.patientId;
        toast.success(`Patient ${walkInData.full_name} registered`);
      }

      // Handle Mobile Money Payment
      if (['M-Pesa', 'Airtel Money', 'Tigo Pesa', 'Halopesa'].includes(paymentMethod)) {
        toast.info(`Initiating ${paymentMethod} payment for Quick Service...`);
        
        const serviceNames = serviceCart.map(item => item.service.service_name).join(', ');
        
        const paymentRequest: any = {
          phoneNumber: mobilePhone,
          amount: totalAmount,
          patientId: patientId,
          paymentType: 'Quick Service',
          paymentMethod: paymentMethod as 'M-Pesa' | 'Airtel Money' | 'Tigo Pesa' | 'Halopesa',
          description: `Quick Service: ${serviceNames}`,
          service_id: serviceCart[0].service.id,
          service_name: serviceNames,
          quantity: serviceCart.reduce((sum, item) => sum + item.quantity, 0),
          unit_price: totalAmount
        };

        const response = await mobilePaymentService.initiatePayment(paymentRequest);

        if (response.success && response.transactionId) {
          toast.success(
            `📱 ${paymentMethod} payment initiated!\n` +
            `Transaction ID: ${response.transactionId.slice(-8)}\n` +
            `Patient will receive payment prompt on their phone.`,
            { duration: 6000 }
          );
          
          // Close dialog and let webhook handle the rest
          onSuccess();
          onOpenChange(false);
          return;
        } else {
          throw new Error(response.error || 'Mobile payment initiation failed');
        }
      }
      
      // Create patient services for all items in cart
      for (const item of serviceCart) {
        await api.post('/patient-services', {
          patient_id: patientId,
          service_id: item.service.id,
          quantity: item.quantity,
          unit_price: item.service.base_price,
          total_price: item.service.base_price * item.quantity,
          service_date: new Date().toISOString().split('T')[0],
          status: 'Completed' // Mark as completed since payment is made upfront
        });
      }

      // Create invoice for all services
      const serviceNames = serviceCart.map(item => 
        `${item.service.service_name} (Qty: ${item.quantity})`
      ).join(', ');
      
      const invoiceRes = await api.post('/invoices', {
        patient_id: patientId,
        invoice_date: new Date().toISOString().split('T')[0],
        total_amount: totalAmount,
        paid_amount: parseFloat(amountPaid),
        balance: 0, // Fully paid
        status: 'Paid',
        notes: `Quick Service: ${serviceNames}`
      });

      const invoiceId = invoiceRes.data.invoice?.id || invoiceRes.data.invoiceId;

      // Create payment record linked to invoice
      await api.post('/payments', {
        patient_id: patientId,
        invoice_id: invoiceId,
        amount: parseFloat(amountPaid),
        payment_method: paymentMethod,
        payment_type: 'Quick Service',
        status: 'Completed',
        payment_date: new Date().toISOString(),
        notes: `Payment for ${serviceNames}`
      });

      // Determine routing based on service types in cart
      // If multiple services, prioritize: Lab > Doctor > Nurse > Pharmacy
      let currentStage = 'nurse'; // Default
      let nurseStatus = 'Not Required';
      let doctorStatus = 'Not Required';
      let labStatus = 'Not Required';
      let pharmacyStatus = 'Not Required';
      let billingStatus = 'Completed'; // Payment already received
      
      const serviceTypes = serviceCart.map(item => item.service.service_type);
      
      // Determine primary destination - all medical services go to appropriate medical staff
      if (serviceTypes.some(t => t === 'Laboratory' || t === 'Radiology' || t === 'Imaging')) {
        currentStage = 'lab';
        labStatus = 'Pending';
      } else if (serviceTypes.some(t => t === 'Consultation' || t === 'Medical')) {
        currentStage = 'doctor';
        doctorStatus = 'Pending';
      } else if (serviceTypes.some(t => t === 'Vaccination' || t === 'Procedure' || t === 'Diagnostic' || t === 'Nursing')) {
        // All medical procedures, vaccinations, and diagnostics handled by nurse
        currentStage = 'nurse';
        nurseStatus = 'Pending';
      } else if (serviceTypes.some(t => t === 'Pharmacy')) {
        currentStage = 'pharmacy';
        pharmacyStatus = 'Pending';
      } else {
        // Default fallback to nurse for any medical service
        currentStage = 'nurse';
        nurseStatus = 'Pending';
      }

      // Create a visit for quick service
      const visitNotes = `Quick Service: ${serviceCart.map(item => item.service.service_name).join(', ')} - Paid upfront`;
      
      const visitRes = await api.post('/visits', {
        patient_id: patientId,
        visit_date: new Date().toISOString().split('T')[0],
        reception_status: 'Completed',
        reception_completed_at: new Date().toISOString(),
        current_stage: currentStage,
        nurse_status: nurseStatus,
        doctor_status: doctorStatus,
        lab_status: labStatus,
        pharmacy_status: pharmacyStatus,
        billing_status: billingStatus,
        overall_status: 'Active',
        visit_type: 'Quick Service',
        notes: visitNotes
      });

      const visitId = visitRes.data.visit?.id || visitRes.data.visitId;

      // All services go through proper medical workflow - no immediate completion at reception

      const patientName = isWalkIn ? walkInData.full_name : selectedPatient.full_name;
      const change = parseFloat(amountPaid) - totalAmount;
      
      // Determine destination message based on primary service type
      let destination = 'nurse station';
      let destinationAction = 'sent to';
      
      if (serviceTypes.some(t => t === 'Laboratory' || t === 'Radiology' || t === 'Imaging')) {
        destination = 'laboratory';
      } else if (serviceTypes.some(t => t === 'Consultation' || t === 'Medical')) {
        destination = 'doctor';
      } else if (serviceTypes.some(t => t === 'Vaccination')) {
        destination = 'nurse station for vaccination';
      } else if (serviceTypes.some(t => t === 'Procedure')) {
        destination = 'nurse station for procedure';
      } else if (serviceTypes.some(t => t === 'Diagnostic')) {
        destination = 'nurse station for diagnostic';
      } else if (serviceTypes.some(t => t === 'Pharmacy')) {
        destination = 'pharmacy';
      }
      
      const serviceCount = serviceCart.length;
      const serviceList = serviceCart.map(item => item.service.service_name).join(', ');
      
      if (change > 0) {
        toast.success(`${serviceCount} service(s) assigned to ${patientName}. Change: TSh ${change.toLocaleString()}. Patient ${destinationAction} ${destination}.`, { duration: 5000 });
      } else {
        toast.success(`${serviceCount} service(s) (${serviceList}) assigned to ${patientName}. Payment received. Patient ${destinationAction} ${destination}.`);
      }
      
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      resetForm();
    } catch (error: any) {

      toast.error(error.response?.data?.error || 'Failed to assign service');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle service form submission for direct services
  const handleServiceFormSubmit = async (formData: any) => {
    setFormSubmitting(true);
    try {
      // Save form data
      await api.post('/service-forms', {
        visit_id: currentVisit.id,
        patient_id: currentVisit.patient_id,
        service_id: currentVisit.service.id,
        form_data: formData,
        submitted_at: new Date().toISOString()
      });

      // Complete the service immediately since it's a direct service
      await api.put(`/visits/${currentVisit.id}`, {
        current_stage: 'discharge',
        nurse_status: 'Completed',
        nurse_completed_at: new Date().toISOString(),
        overall_status: 'Completed',
        discharge_time: new Date().toISOString(),
        discharge_notes: `Quick Service completed: ${currentVisit.service.service_name} - Form submitted`
      });

      toast.success(`${currentVisit.service.service_name} completed successfully!`);
      
      // Close both dialogs
      setShowServiceForm(false);
      onSuccess();
      onOpenChange(false);
      
      // Reset all states
      resetForm();
      
    } catch (error: any) {

      toast.error(error.response?.data?.error || 'Failed to save service form');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Reset form function
  const resetForm = () => {
    setSelectedService('');
    setQuantity(1);
    setServiceCart([]);
    setPaymentMethod('Cash');
    setAmountPaid('');
    setMobilePhone('');
    setPatientSearchTerm('');
    setSearchResults([]);
    setSelectedPatient(null);
    setCurrentVisit(null);
    setServiceFormTemplate(null);
    setServiceSearchTerm('');
    setShowServiceDropdown(false);
    setWalkInData({
      full_name: '',
      phone: '',
      date_of_birth: '',
      gender: 'Male'
    });
  };

  const selectedServiceData = services.find(s => String(s.id) === String(selectedService));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Quick Service Assignment
          </DialogTitle>
          <DialogDescription>
            {isWalkIn ? 'Register walk-in patient and assign service' : selectedPatient ? `Assign a service directly to ${selectedPatient.full_name} without doctor consultation` : 'Select a registered patient and assign service'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto pr-2 flex-1">
            {/* Patient Type Toggle */}
            <div className="flex gap-2 p-2 bg-gray-50 rounded-md">
              <Button
                type="button"
                variant={!isWalkIn ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setIsWalkIn(false);
                  if (!patient) {
                    setSelectedPatient(null);
                  }
                }}
                className="flex-1"
              >
                Registered Patient
              </Button>
              <Button
                type="button"
                variant={isWalkIn ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setIsWalkIn(true);
                  setSelectedPatient(null);
                }}
                className="flex-1"
              >
                Walk-in Patient
              </Button>
            </div>

            {isWalkIn ? (
              <div className="space-y-3 p-3 bg-blue-50 rounded-md">
                <p className="text-sm font-medium text-blue-900">Walk-in Patient Registration</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="full_name" className="text-xs">Full Name *</Label>
                    <Input
                      id="full_name"
                      value={walkInData.full_name}
                      onChange={(e) => setWalkInData({...walkInData, full_name: e.target.value})}
                      placeholder="Patient name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="phone" className="text-xs">Phone *</Label>
                    <Input
                      id="phone"
                      value={walkInData.phone}
                      onChange={(e) => setWalkInData({...walkInData, phone: e.target.value})}
                      placeholder="+255..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="dob" className="text-xs">Date of Birth *</Label>
                    <Input
                      id="dob"
                      type="date"
                      max={new Date().toISOString().split('T')[0]}
                      value={walkInData.date_of_birth}
                      onChange={(e) => setWalkInData({...walkInData, date_of_birth: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="gender" className="text-xs">Gender *</Label>
                    <Select value={walkInData.gender} onValueChange={(value) => setWalkInData({...walkInData, gender: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Label>Select Registered Patient</Label>
                {selectedPatient ? (
                  <div className="p-3 bg-muted rounded-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{selectedPatient.full_name}</p>
                        <p className="text-sm text-muted-foreground">{selectedPatient.phone}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedPatient(null)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Change
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder="Search by name or phone..."
                      value={patientSearchTerm}
                      onChange={(e) => setPatientSearchTerm(e.target.value)}
                    />
                    {searchResults.length > 0 && (
                      <div className="max-h-32 overflow-y-auto border rounded-md">
                        {searchResults.map((patient) => (
                          <div
                            key={patient.id}
                            className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            onClick={() => {
                              setSelectedPatient(patient);
                              setPatientSearchTerm('');
                              setSearchResults([]);
                            }}
                          >
                            <p className="font-medium text-sm">{patient.full_name}</p>
                            <p className="text-xs text-muted-foreground">{patient.phone}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {patientSearchTerm.length >= 2 && searchResults.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        No patients found
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Service Cart */}
            {serviceCart.length > 0 && (
              <div className="space-y-2 p-3 bg-blue-50 rounded-md border-2 border-blue-200">
                <div className="flex items-center justify-between">
                  <Label className="text-blue-900 font-semibold">Services Cart ({serviceCart.length})</Label>
                  <Badge variant="default" className="bg-blue-600">
                    Total: TSh {calculateTotal().toLocaleString()}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {serviceCart.map((item) => (
                    <div key={item.service.id} className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.service.service_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Qty: {item.quantity} × TSh {item.service.base_price.toLocaleString()} = TSh {(item.service.base_price * item.quantity).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(String(item.service.id))}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Select Service *</Label>
              <div className="relative service-search-container">
                <Input
                  placeholder="Search services by name, type, or code..."
                  value={serviceSearchTerm}
                  onChange={(e) => {
                    setServiceSearchTerm(e.target.value);
                    setShowServiceDropdown(true);
                  }}
                  onFocus={() => setShowServiceDropdown(true)}
                  className="pr-10"
                />
                {selectedService && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-8 w-8 p-0"
                    onClick={() => {
                      setSelectedService('');
                      setServiceSearchTerm('');
                      setShowServiceDropdown(false);
                    }}
                  >
                    ✕
                  </Button>
                )}
                
                {showServiceDropdown && serviceSearchTerm.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredServices.length > 0 ? (
                      filteredServices.map((service) => (
                        <div
                          key={service.id}
                          className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                          onClick={() => {

                            setSelectedService(String(service.id));
                            setServiceSearchTerm(service.service_name);
                            setShowServiceDropdown(false);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{service.service_name}</p>
                              <p className="text-xs text-gray-500">Code: {service.service_code}</p>
                            </div>
                            <div className="flex flex-col items-end">
                              <Badge variant="outline" className="text-xs mb-1">
                                {service.service_type}
                              </Badge>
                              <span className="text-sm font-semibold text-green-600">
                                TSh {service.base_price.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-gray-500 text-sm">
                        No services found matching "{serviceSearchTerm}"
                      </div>
                    )}
                  </div>
                )}
                
                {showServiceDropdown && serviceSearchTerm.length === 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-3 text-center text-gray-500 text-sm">
                      Type to search for services...
                    </div>
                  </div>
                )}
              </div>
            </div>

            {selectedServiceData && (
              <div className="p-3 bg-blue-50 rounded-md space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Service Code:</span>
                  <span className="text-sm font-mono">{selectedServiceData.service_code}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Price:</span>
                  <span className="text-sm font-semibold">
                    TSh {selectedServiceData.base_price.toLocaleString()}
                  </span>
                </div>
                {selectedServiceData.description && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {selectedServiceData.description}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Quantity</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {

                    addToCart(e);
                  }}
                  disabled={!selectedService}
                  className="bg-blue-50 hover:bg-blue-100"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add to Cart
                </Button>
              </div>
            </div>

            {serviceCart.length > 0 && (
              <div className="p-3 bg-green-50 rounded-md border-2 border-green-200">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-green-900">Cart Total:</span>
                  <span className="text-lg font-bold text-green-700">
                    TSh {calculateTotal().toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Payment Section */}
            {serviceCart.length > 0 && (
              <div className="space-y-3 p-4 border-2 border-blue-200 rounded-lg bg-blue-50/50">
                <h4 className="font-semibold text-blue-900">Payment Details</h4>
                
                <div className="space-y-2">
                  <Label>Payment Method *</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">💵 Cash</SelectItem>
                      <SelectItem value="Card">💳 Card</SelectItem>
                      <SelectItem value="M-Pesa">📱 M-Pesa</SelectItem>
                      <SelectItem value="Airtel Money">📱 Airtel Money</SelectItem>
                      <SelectItem value="Tigo Pesa">📱 Tigo Pesa</SelectItem>
                      <SelectItem value="Halopesa">📱 Halopesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {['M-Pesa', 'Airtel Money', 'Tigo Pesa', 'Halopesa'].includes(paymentMethod) && (
                  <div className="space-y-2">
                    <Label>Mobile Money Phone Number *</Label>
                    <Input
                      type="tel"
                      placeholder="0712345678"
                      value={mobilePhone}
                      onChange={(e) => setMobilePhone(e.target.value)}
                      pattern="^0[67][0-9]{8}$"
                    />
                    <p className="text-xs text-blue-600">
                      📱 Payment request will be sent to this number
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Amount Paid *</Label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    min={calculateTotal()}
                  />
                </div>

                {amountPaid && parseFloat(amountPaid) > calculateTotal() && (
                  <div className="p-2 bg-green-100 rounded-md">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-800">Change:</span>
                      <span className="text-sm font-bold text-green-700">
                        TSh {(parseFloat(amountPaid) - calculateTotal()).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleAssignService} disabled={submitting || serviceCart.length === 0}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              `Assign ${serviceCart.length} Service${serviceCart.length !== 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
      
      {/* Service Form Dialog for direct services */}
      <ServiceFormDialog
        open={showServiceForm}
        onOpenChange={setShowServiceForm}
        formTemplate={serviceFormTemplate}
        visit={currentVisit}
        onSubmit={handleServiceFormSubmit}
        submitting={formSubmitting}
      />
    </Dialog>
  );
}
