import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Upload, File, CheckCircle, AlertCircle, Pill, AlertTriangle, Package, Plus, Edit, Loader2, Users, FileText, Trash2, X } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { generateInvoiceNumber, logActivity } from '@/lib/utils';
import { DispenseDialog } from '@/components/DispenseDialog';
import api from '@/lib/api';


interface Medication {
  id: string;
  name: string;
  stock_quantity: number;
  initial_quantity?: number;
  quantity_in_stock?: number; // Legacy field for compatibility
  reorder_level: number;
  [key: string]: any;
}

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  email?: string;
  [key: string]: any;
}

interface MedicationInfo {
  id: string;
  name: string;
  dosage_form?: string;
  strength?: string;
  manufacturer?: string;
  [key: string]: any;
}

interface PrescriptionMedication {
  medication_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration?: string;
  quantity: number;
  instructions?: string;
}

interface Prescription {
  id: string;
  patient_id: string;
  patient?: UserProfile;
  medications: PrescriptionMedication[];
  doctor_id?: string;
  doctor_profile?: UserProfile;
  status: 'Active' | 'Completed' | 'Cancelled' | string;
  lab_result_id?: string;
  prescribed_date: string;
  prescription_date?: string;
  [key: string]: any;
}

export default function PharmacyDashboard() {
  const { user } = useAuth() || {} as { user: UserProfile | null };
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);

  const [medications, setMedications] = useState<Medication[]>([]);
  const [stats, setStats] = useState({ pendingPrescriptions: 0, lowStock: 0, totalMedications: 0 });
  const [loading, setLoading] = useState(true); // Initial load only
  const [refreshing, setRefreshing] = useState(false); // Background refresh
  const [medicationDialogOpen, setMedicationDialogOpen] = useState<boolean>(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [stockDialogOpen, setStockDialogOpen] = useState<boolean>(false);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [loadingStates, setLoadingStates] = useState<{[key: string]: boolean}>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [prescriptionFilter, setPrescriptionFilter] = useState<'pending' | 'all'>('pending');
  const [dispenseDialogOpen, setDispenseDialogOpen] = useState(false);
  const [selectedPrescriptionForDispense, setSelectedPrescriptionForDispense] = useState<any>(null);
  const [expandedPatients, setExpandedPatients] = useState<Set<string>>(new Set());
  const [patientQueue, setPatientQueue] = useState<any[]>([]); // Legacy - will be replaced
  
  // Separate queues for different pharmacy workflows
  const [directPharmacyQueue, setDirectPharmacyQueue] = useState<any[]>([]); // Direct-to-pharmacy patients
  const [prescriptionQueue, setPrescriptionQueue] = useState<any[]>([]); // Doctor prescription patients
  const [createPrescriptionDialogOpen, setCreatePrescriptionDialogOpen] = useState(false);

  // Walk-in patient registration (pharmacist)
  const [walkInDialogOpen, setWalkInDialogOpen] = useState(false);
  const [walkInLoading, setWalkInLoading] = useState(false);
  const [walkInForm, setWalkInForm] = useState({
    full_name: '', date_of_birth: '', gender: '', phone: '', address: ''
  });
  const [walkInMode, setWalkInMode] = useState<'search' | 'new'>('search');
  const [walkInSearch, setWalkInSearch] = useState('');
  const [walkInSearchResults, setWalkInSearchResults] = useState<any[]>([]);
  const [walkInSearchLoading, setWalkInSearchLoading] = useState(false);
  
  const [selectedPatientForPrescription, setSelectedPatientForPrescription] = useState<any>(null);
  const [existingPrescriptions, setExistingPrescriptions] = useState<any[]>([]); // Doctor prescriptions for current patient
  const [removedPrescriptionItems, setRemovedPrescriptionItems] = useState<Set<string>>(new Set()); // Track removed prescription items
  const [medicationSearchTerm, setMedicationSearchTerm] = useState('');
  const [inventorySearchTerm, setInventorySearchTerm] = useState('');
  const [newPrescriptionItems, setNewPrescriptionItems] = useState<any[]>([{
    medication_id: '',
    medication_name: '',
    dosage: '',
    frequency: '',
    duration: '',
    quantity: '',
    instructions: ''
  }]);
  
  // Type for the combined prescription data
  interface PrescriptionWithRelations extends Prescription {
    patient: UserProfile | null;
    doctor_profile: UserProfile | null;
  }

  const loadPharmacyData = async (isInitialLoad = true) => {
    if (!user) {
      const errorMsg = 'User not authenticated';
      setLoadError(errorMsg);
      if (isInitialLoad) toast.error(errorMsg);
      return;
    }

    try {
      // Only show full loading screen on initial load
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setLoadError(null);

      // Fetch all the data we need from MySQL API
      const [
        prescriptionsRes,
        medicationsRes,
        patientsRes,
        doctorsRes,
        patientQueueRes
      ] = await Promise.allSettled([
        api.get('/prescriptions?limit=100'),
        api.get('/pharmacy/medications'),
        api.get('/patients'),
        api.get('/users/profiles?role=doctor'),
        api.get('/visits?current_stage=pharmacy&pharmacy_status=Pending&limit=50')
      ]);
      
      const prescriptionsData = prescriptionsRes.status === 'fulfilled' ? (prescriptionsRes.value.data.prescriptions || []) : [];
      const medicationsData = medicationsRes.status === 'fulfilled' ? (medicationsRes.value.data.medications || []) : [];
      const patientsData = patientsRes.status === 'fulfilled' ? (patientsRes.value.data.patients || []) : [];
      const doctorsData = doctorsRes.status === 'fulfilled' ? (doctorsRes.value.data.profiles || []) : [];
      const patientQueueData = patientQueueRes.status === 'fulfilled' ? (patientQueueRes.value.data.visits || []) : [];

      // Combine the data manually
      // Note: medications array is already parsed from JSON by the backend
      const combinedPrescriptions: PrescriptionWithRelations[] = await Promise.all(
        (prescriptionsData || []).map(async (prescription: any) => {
          let patient = (patientsData || []).find((p: any) => p.id === prescription.patient_id);
          let doctor = (doctorsData || []).find((d: any) => d.id === prescription.doctor_id);
          
          // If patient not found in initial load, fetch individually
          if (!patient && prescription.patient_id) {
            try {
              const patientRes = await api.get('/patients/' + prescription.patient_id);
              patient = patientRes.data.patient || patientRes.data;
            } catch (error) {

              patient = null;
            }
          }
          
          // If doctor not found in initial load, fetch individually
          if (!doctor && prescription.doctor_id) {
            try {
              const doctorRes = await api.get('/users/profiles?ids=' + prescription.doctor_id);
              const profiles = doctorRes.data.profiles || [];
              doctor = profiles.find((d: any) => d.id === prescription.doctor_id);
            } catch (error) {

              doctor = null;
            }
          }
          
          return {
            ...prescription,
            patient: patient || { id: prescription.patient_id, full_name: 'Unknown Patient', phone: 'N/A' },
            doctor_profile: doctor || { id: prescription.doctor_id, full_name: 'Unknown Doctor', name: 'Unknown Doctor' },
            // medications array is already included in prescription from backend
          };
        })
      );

      setPrescriptions(combinedPrescriptions);
      setMedications(medicationsData || []);
      
      // Map patient data to visits (visits already filtered by API)
      const allPharmacyVisits = (patientQueueData || []).map((visit: any) => {
        // If visit already has patient data, use it; otherwise find from patientsData
        const patient = visit.patient || (patientsData || []).find((p: any) => p.id === visit.patient_id);
        
        return {
          ...visit,
          patient: patient || { id: visit.patient_id, full_name: 'Unknown Patient', phone: 'N/A' }
        };
      });
      
      // Separate queues based on visit type and source
      const directPharmacy = allPharmacyVisits.filter(visit => 
        visit.visit_type === 'Pharmacy Only' || 
        (visit.doctor_status === 'Not Required' && visit.nurse_status === 'Not Required') ||
        visit.visit_type === 'Direct Pharmacy'
      );
      
      const doctorPrescriptions = allPharmacyVisits.filter(visit => {
        // Include visits that are NOT direct pharmacy visits
        const isNotDirectPharmacy = visit.visit_type !== 'Pharmacy Only' && visit.visit_type !== 'Direct Pharmacy';
        
        // For consultation visits, assume they came from doctor (since they're in pharmacy stage)
        const isConsultationVisit = visit.visit_type === 'Consultation' || !visit.visit_type;
        
        // Has doctor involvement (either status, ID, or is consultation visit)
        const hasDoctorInvolvement = 
          visit.doctor_status === 'Completed' || 
          visit.doctor_status === 'In Progress' || 
          visit.doctor_id ||
          isConsultationVisit; // If it's a consultation visit in pharmacy, assume doctor sent it
        
        return isNotDirectPharmacy && hasDoctorInvolvement;
      });

      setDirectPharmacyQueue(directPharmacy);
      setPrescriptionQueue(doctorPrescriptions);
      setPatientQueue(allPharmacyVisits); // Keep for backward compatibility

      const pending = (prescriptionsData || []).filter(p => p.status === 'Active' || p.status === 'Pending').length;
      const lowStock = (medicationsData || []).filter(m => (m.stock_quantity || m.quantity_in_stock || 0) <= m.reorder_level).length;

      setStats({
        pendingPrescriptions: pending,
        lowStock,
        totalMedications: (medicationsData || []).length
      });
      
      // Silently load data - no toast needed for background refresh
    } catch (error) {

      const errorMsg = error instanceof Error ? error.message : 'Failed to load pharmacy data';
      setLoadError(errorMsg);
      
      if (isInitialLoad) {
        toast.error(errorMsg, {
          action: {
            label: 'Retry',
            onClick: () => loadPharmacyData(true)
          }
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial data load and polling for updates
  useEffect(() => {
    if (!user) return;
    
    loadPharmacyData(true); // Initial load with loading screen

    // Set up polling instead of real-time subscriptions (every 30 seconds)
    const intervalId = setInterval(() => {
      loadPharmacyData(false); // Background refresh without loading screen
    }, 30000);

    // Cleanup interval on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [user]);

  const handleOpenDispenseDialog = async (prescription: any) => {
    try {
      // Fetch full prescription details with items
      const response = await api.get('/prescriptions/' + prescription.id);
      const fullPrescription = response.data.prescription;
      
      // Merge with existing prescription data (patient, doctor info)
      setSelectedPrescriptionForDispense({
        ...prescription,
        ...fullPrescription,
        items: fullPrescription.items || fullPrescription.medications || []
      });
      setDispenseDialogOpen(true);
    } catch (error) {

      toast.error('Failed to load prescription details');
    }
  };

  const handleOpenPrescriptionDialog = async (visit: any) => {
    setSelectedPatientForPrescription(visit);
    
    // If this is a prescription queue patient, fetch existing prescriptions
    if (prescriptionQueue.some(v => v.id === visit.id)) {
      try {
        const prescriptionsRes = await api.get('/prescriptions?patient_id=' + visit.patient_id);
        const patientPrescriptions = prescriptionsRes.data.prescriptions || [];
        
        // Filter for active/pending prescriptions from doctor
        const activePrescriptions = patientPrescriptions.filter((p: any) => 
          p.status === 'Active' || p.status === 'Pending'
        );
        
        setExistingPrescriptions(activePrescriptions);

      } catch (error: any) {

        setExistingPrescriptions([]);
        toast.error('Failed to load existing prescriptions');
      }
    } else {
      // Direct pharmacy patient - no existing prescriptions
      setExistingPrescriptions([]);
    }
    
    setCreatePrescriptionDialogOpen(true);
  };

  const handleWalkInSearch = async (q: string) => {
    setWalkInSearch(q);
    if (!q.trim()) { setWalkInSearchResults([]); return; }
    setWalkInSearchLoading(true);
    try {
      const res = await api.get(`/patients?search=${encodeURIComponent(q)}&limit=10`);
      setWalkInSearchResults(res.data.patients || []);
    } catch { setWalkInSearchResults([]); }
    finally { setWalkInSearchLoading(false); }
  };

  const handleServeExistingPatient = async (patient: any) => {
    setWalkInLoading(true);
    try {
      await api.post('/visits', {
        patient_id: patient.id,
        visit_date: new Date().toISOString().split('T')[0],
        visit_type: 'Pharmacy Only',
        reception_status: 'Completed',
        reception_completed_at: new Date().toISOString(),
        current_stage: 'pharmacy',
        nurse_status: 'Not Required',
        doctor_status: 'Not Required',
        lab_status: 'Not Required',
        pharmacy_status: 'Pending',
        billing_status: 'Not Required',
        overall_status: 'Active',
        notes: 'Returning patient — walk-in pharmacy',
      });
      toast.success(`${patient.full_name} added to pharmacy queue`);
      setWalkInDialogOpen(false);
      setWalkInSearch('');
      setWalkInSearchResults([]);
      setWalkInMode('search');
      loadPharmacyData(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add patient to queue');
    } finally { setWalkInLoading(false); }
  };

  const handleWalkInRegister = async () => {
    const { full_name, date_of_birth, gender, phone, address } = walkInForm;
    if (!full_name || !date_of_birth || !gender || !phone) {
      toast.error('Name, date of birth, gender and phone are required');
      return;
    }
    if (!['Male', 'Female', 'Other'].includes(gender)) {
      toast.error('Gender must be Male, Female, or Other');
      return;
    }
    setWalkInLoading(true);
    try {
      // 1. Register patient
      const patientRes = await api.post('/patients', {
        full_name, date_of_birth, gender, phone,
        address: address || 'Walk-in',
        status: 'Active',
      });
      const patient = patientRes.data.patient || patientRes.data;

      // 2. Create Pharmacy Only visit — goes straight to pharmacy queue
      await api.post('/visits', {
        patient_id: patient.id,
        visit_date: new Date().toISOString().split('T')[0],
        visit_type: 'Pharmacy Only',
        reception_status: 'Completed',
        reception_completed_at: new Date().toISOString(),
        current_stage: 'pharmacy',
        nurse_status: 'Not Required',
        doctor_status: 'Not Required',
        lab_status: 'Not Required',
        pharmacy_status: 'Pending',
        billing_status: 'Not Required',
        overall_status: 'Active',
        notes: 'Walk-in pharmacy patient registered by pharmacist',
      });

      toast.success(`${full_name} registered and added to pharmacy queue`);
      setWalkInDialogOpen(false);
      setWalkInForm({ full_name: '', date_of_birth: '', gender: '', phone: '', address: '' });
      setWalkInMode('search');
      setWalkInSearch('');
      setWalkInSearchResults([]);
      loadPharmacyData(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Registration failed');
    } finally {
      setWalkInLoading(false);
    }
  };

  const handleRestoreStock = async (medicationName: string, quantity: number) => {
    try {
      // Find the medication by name
      const medication = medications.find(med => med.name === medicationName);
      if (!medication) {

        return;
      }

      // Calculate new stock quantity
      const currentStock = medication.stock_quantity || medication.quantity_in_stock || 0;
      const newStock = currentStock + quantity;

      // Update stock in database
      await api.put(`/pharmacy/medications/${medication.id}`, {
        ...medication,
        stock_quantity: newStock,
        quantity_in_stock: newStock
      });

      // Update local state
      setMedications(prev => prev.map(med => 
        med.id === medication.id 
          ? { ...med, stock_quantity: newStock, quantity_in_stock: newStock }
          : med
      ));

      await logActivity('pharmacy.stock.restored', {
        medication_id: medication.id,
        medication_name: medicationName,
        quantity_restored: quantity,
        new_stock: newStock,
        reason: 'Medication removed from prescription'
      });

    } catch (error: any) {

      toast.error(`Failed to restore stock for ${medicationName}`);
    }
  };

  const handleDispenseWithDetails = async (dispenseData: any) => {
    if (!selectedPrescriptionForDispense || !user?.id) {
      toast.error('Missing prescription or user information');
      return;
    }

    const prescriptionId = selectedPrescriptionForDispense.id;
    const patientId = selectedPrescriptionForDispense.patient_id;

    setLoadingStates(prev => ({ ...prev, [prescriptionId]: true }));

    try {
      // Continue with dispensing using the edited dosage and quantity
      await handleDispensePrescription(prescriptionId, patientId, dispenseData);
      setDispenseDialogOpen(false);
      setSelectedPrescriptionForDispense(null);
    } catch (error) {

      toast.error('Failed to process dispensing');
    } finally {
      setLoadingStates(prev => ({ ...prev, [prescriptionId]: false }));
    }
  };

  const handleDispensePrescription = async (prescriptionId: string, patientId: string, dispenseData?: any) => {
    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }
    
    setLoadingStates(prev => ({ ...prev, [prescriptionId]: true }));

    try {
      await logActivity('pharmacy.dispense.start', { 
        user_id: user.id,
        prescription_id: prescriptionId,
        patient_id: patientId,
        timestamp: new Date().toISOString()
      });

      // First, get the prescription details
      let prescriptionRes;
      try {
        prescriptionRes = await api.get(`/prescriptions/${prescriptionId}`);
      } catch (error: any) {

        await logActivity('pharmacy.dispense.error', { 
          error: 'Failed to fetch prescription',
          details: error.message 
        });
        toast.error('Failed to fetch prescription details');
        return;
      }
      const prescription = prescriptionRes.data.prescription;

      if (!prescription) {
        await logActivity('pharmacy.dispense.error', { 
          error: 'Prescription not found',
          prescription_id: prescriptionId 
        });
        toast.error('Prescription not found');
        return;
      }

      // Check if prescription has medications (items)
      const prescriptionItems = prescription.items || prescription.medications || [];
      if (prescriptionItems.length === 0) {
        await logActivity('pharmacy.dispense.error', { 
          error: 'No medications in prescription',
          prescription_id: prescriptionId
        });
        toast.error('Prescription does not have any medications');
        return;
      }

      // Use edited medications from dispenseData if available, otherwise use prescription items
      const medicationsToDispense = dispenseData?.medications || prescriptionItems;
      const medicationDetails = [];
      
      // Fetch all medication details
      for (const med of medicationsToDispense) {
        try {
          const medicationRes = await api.get(`/pharmacy/medications/${med.medication_id}`);
          medicationDetails.push({
            ...medicationRes.data.medication,
            // Use dispensed quantities/dosages if available
            prescribed_quantity: med.dispensed_quantity || med.quantity,
            prescribed_dosage: med.dispensed_dosage || med.dosage,
            prescribed_frequency: med.frequency,
            prescribed_instructions: med.instructions
          });
        } catch (error: any) {

          toast.error(`Failed to fetch medication details for ${med.medication_name}`);
          return;
        }
      }

      // STEP 1: Add medications as patient-services (for comprehensive billing)
      // This allows billing to create ONE invoice with all services (lab tests + medications)
      try {



        // Validate patient ID format (should be UUID)
        if (!patientId || typeof patientId !== 'string') {
          throw new Error('Invalid patient ID: ' + patientId);
        }
        
        for (const medDetail of medicationDetails) {
          // Validate medication data
          if (!medDetail.name) {

            continue;
          }
          
          if (!medDetail.prescribed_quantity || isNaN(parseInt(medDetail.prescribed_quantity))) {

            continue;
          }
          
          if (isNaN(parseFloat(medDetail.unit_price))) {

            continue;
          }
          
          // Validate data before sending
          const serviceData = {
            patient_id: patientId,
            service_id: null, // Medications don't have a service_id
            service_name: medDetail.name + ' - ' + medDetail.prescribed_dosage,
            quantity: parseInt(medDetail.prescribed_quantity) || 1,
            unit_price: parseFloat(medDetail.unit_price) || 0,
            total_price: (parseFloat(medDetail.unit_price) || 0) * (parseInt(medDetail.prescribed_quantity) || 1),
            service_date: new Date().toISOString().split('T')[0],
            status: 'Completed',
            notes: 'Medication: ' + medDetail.prescribed_frequency + (medDetail.prescribed_instructions ? '. ' + medDetail.prescribed_instructions : '')
          };

          await api.post('/patient-services', serviceData);

        }
      } catch (error: any) {


        let errorMsg = 'Unknown error';
        if (error.response?.data?.errors) {
          // Laravel validation errors
          const validationErrors = Object.values(error.response.data.errors).flat();
          errorMsg = validationErrors.join(', ');
        } else if (error.response?.data?.message) {
          errorMsg = error.response.data.message;
        } else if (error.response?.data?.error) {
          errorMsg = error.response.data.error;
        } else if (error.message) {
          errorMsg = error.message;
        }
        
        toast.error('Failed to add medications to billing: ' + errorMsg);
        await logActivity('pharmacy.dispense.error', { 
          error: 'Failed to add medications to patient services',
          details: errorMsg,
          fullError: error.response?.data,
          response: error.response?.data
        });
        return; // STOP HERE if adding to services fails
      }

      // STEP 2: Update medication stock
      for (const medDetail of medicationDetails) {
        const dispensedQuantity = medDetail.prescribed_quantity;
        const currentStock = medDetail.stock_quantity || medDetail.quantity_in_stock || 0;
        const newStock = currentStock - dispensedQuantity;
        
        if (newStock < 0) {
          toast.error(`Insufficient stock for ${medDetail.name}`);
          await logActivity('pharmacy.dispense.error', { 
            error: 'Insufficient stock',
            medication_id: medDetail.id,
            medication_name: medDetail.name,
            required: dispensedQuantity,
            available: currentStock
          });
          return;
        }
        
        try {
          await api.put(`/pharmacy/medications/${medDetail.id}`, {
            stock_quantity: newStock,
            quantity_in_stock: newStock // Send both for compatibility
          });
        } catch (error: any) {

          toast.error(`Failed to update stock for ${medDetail.name}: ${error.message}`);
          return;
        }
      }

      // STEP 3: Update prescription status
      const updateData: any = {
        status: 'Completed'
      };

      if (dispenseData?.notes) {
        updateData.notes = dispenseData.notes;
      }

      try {
        await api.put(`/prescriptions/${prescriptionId}`, updateData);
      } catch (error: any) {

        await logActivity('pharmacy.dispense.error', { 
          error: 'Failed to update prescription',
          details: error.message,
          prescription_id: prescriptionId
        });
        toast.error(`Failed to update prescription: ${error.message}`);
        return;
      }

      // STEP 4: Check if this is the last pending prescription for this patient
      let prescriptionsRes;
      try {
        prescriptionsRes = await api.get(`/prescriptions?patient_id=${patientId}`);
      } catch (error: any) {

        prescriptionsRes = { data: { prescriptions: [] } };
      }
      
      const allPatientPrescriptions = prescriptionsRes.data.prescriptions;
      const pendingCount = allPatientPrescriptions?.filter((p: any) => p.status === 'Active' && p.id !== prescriptionId).length || 0;
      const isLastPrescription = pendingCount === 0;

      // Only update patient visit to billing if this is the last prescription
      if (isLastPrescription) {

        let visitsRes;
        try {
          visitsRes = await api.get(`/visits?patient_id=${patientId}&overall_status=Active&limit=1`);
        } catch (error: any) {

          visitsRes = { data: { visits: [] } };
        }
        
        const visits = visitsRes.data.visits;

        if (visits && visits.length > 0) {
          const visit = visits[0];

          // Create invoice for medications
          try {
            const totalAmount = medicationDetails.reduce((sum, med) => 
              sum + Number(med.unit_price || 0) * med.prescribed_quantity, 0
            );

            const invoiceRes = await api.post('/invoices', {
              patient_id: patientId,
              invoice_date: new Date().toISOString().split('T')[0],
              total_amount: totalAmount,
              paid_amount: 0,
              balance: totalAmount,
              status: 'Pending',
              notes: `Pharmacy medications from prescription ${prescriptionId}`,
              items: medicationDetails.map(med => ({
                service_name: `${med.name} - ${med.prescribed_dosage}`,
                description: `${med.prescribed_frequency}${med.prescribed_instructions ? '. ' + med.prescribed_instructions : ''}`,
                quantity: med.prescribed_quantity,
                unit_price: Number(med.unit_price || 0),
                total_price: Number(med.unit_price || 0) * med.prescribed_quantity
              }))
            });

          } catch (error: any) {

            // Don't fail the whole process if invoice creation fails
            toast.warning('Medications dispensed but invoice creation failed');
          }
          
          try {
            await api.put(`/visits/${visit.id}`, {
              pharmacy_status: 'Completed',
              pharmacy_completed_at: new Date().toISOString(),
              current_stage: 'billing',
              billing_status: 'Pending',
              overall_status: 'Active',
              updated_at: new Date().toISOString()
            });

          await logActivity('pharmacy.visit.moved_to_billing', {
            visit_id: visit.id,
            patient_id: patientId,
            user_id: user.id
          });
        } catch (error: any) {

          toast.error(`Failed to update patient visit: ${error.message}`);
          return;
        }
        } else {

        }
      } else {

      }

      // STEP 5: Log successful dispense
      await logActivity('pharmacy.dispense.success', {
        user_id: user.id,
        prescription_id: prescriptionId,
        patient_id: patientId,
        medications: medicationDetails.map(m => ({
          medication_id: m.id,
          medication_name: m.name,
          quantity: m.prescribed_quantity
        })),
        medication_count: medicationDetails.length,
        timestamp: new Date().toISOString()
      });

      
      toast.success('Prescription dispensed successfully');
      
      // Update local state
      setPrescriptions(prev => prev.filter(p => p.id !== prescriptionId));
    } catch (error) {

      const errorMsg = error instanceof Error ? error.message : 'Failed to dispense prescription';
      
      await logActivity('pharmacy.dispense.error', {
        error: errorMsg,
        prescription_id: prescriptionId,
        user_id: user?.id,
        timestamp: new Date().toISOString()
      });
      
      toast.error(errorMsg);
    } finally {
      setLoadingStates(prev => ({ ...prev, [prescriptionId]: false }));
    }
  };

  const handleUpdateStock = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMedication) return;

    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const quantity = formData.get('quantity');
    const newQuantity = quantity ? Number(quantity) : 0;
    
    if (isNaN(newQuantity) || newQuantity < 0) {
      toast.error('Please enter a valid quantity (must be 0 or greater)');
      return;
    }

    const isRestock = newQuantity > (selectedMedication.stock_quantity || 0);

    try {
      await api.put(`/pharmacy/medications/${selectedMedication.id}`, { 
        stock_quantity: newQuantity,
        quantity_in_stock: newQuantity,
        ...(isRestock ? { initial_quantity: newQuantity } : {}),
      });

      const now = new Date().toISOString();
      setMedications(prev => prev.map(med => 
        med.id === selectedMedication.id 
          ? { 
              ...med, 
              stock_quantity: newQuantity, 
              quantity_in_stock: newQuantity,
              stock_updated_at: now,
              ...(isRestock ? { initial_quantity: newQuantity } : {}),
            }
          : med
      ));
      
      const updatedMeds = medications.map(med => 
        med.id === selectedMedication.id 
          ? { ...med, stock_quantity: newQuantity }
          : med
      );
      const lowStock = updatedMeds.filter(m => (m.stock_quantity || 0) <= m.reorder_level).length;
      setStats(prev => ({ ...prev, lowStock }));
      
      toast.success(`Stock updated to ${newQuantity} units`);
      setStockDialogOpen(false);
      setSelectedMedication(null);
      setTimeout(() => loadPharmacyData(false), 500);
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to update stock');
      return;
    }
  };

  const handleSaveMedication = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const quantity = formData.get('quantity');
    const reorderLevel = formData.get('reorderLevel');
    const unitPrice = formData.get('unitPrice');
    
    if (!name || !quantity || !reorderLevel || !unitPrice) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    const quantityNum = Number(quantity);
    const reorderLevelNum = Number(reorderLevel);
    const unitPriceNum = Number(unitPrice);
    
    if (isNaN(quantityNum) || isNaN(reorderLevelNum) || isNaN(unitPriceNum)) {
      toast.error('Please enter valid numbers for quantity, reorder level, and unit price');
      return;
    }

    const medicationData = {
      name: formData.get('name') as string,
      generic_name: formData.get('genericName') as string || '',
      description: formData.get('description') as string || '',
      quantity_in_stock: Number(quantity),
      reorder_level: Number(reorderLevel),
      unit_price: Number(unitPrice),
      manufacturer: formData.get('manufacturer') as string || '',
      dosage_form: formData.get('dosageForm') as string || '',
      strength: formData.get('strength') as string || '',
      expiry_date: formData.get('expiryDate') as string || null,
    };

    try {
      if (editingMedication) {
        const response = await api.put(`/pharmacy/medications/${editingMedication.id}`, medicationData);
        
        // Immediately update local state
        setMedications(prev => prev.map(med => 
          med.id === editingMedication.id 
            ? { ...med, ...medicationData, stock_quantity: medicationData.quantity_in_stock }
            : med
        ));
        
        // Recalculate stats
        const updatedMeds = medications.map(med => 
          med.id === editingMedication.id 
            ? { ...med, ...medicationData, stock_quantity: medicationData.quantity_in_stock }
            : med
        );
        
        const lowStock = updatedMeds.filter(m => 
          (m.stock_quantity || m.quantity_in_stock || 0) <= m.reorder_level
        ).length;
        
        setStats(prev => ({ ...prev, lowStock, totalMedications: updatedMeds.length }));
      } else {
        const response = await api.post('/pharmacy/medications', medicationData);
        const newMed = response.data.medication;
        
        // Add new medication to local state
        if (newMed) {
          setMedications(prev => [...prev, { ...newMed, stock_quantity: newMed.quantity_in_stock }]);
          setStats(prev => ({ 
            ...prev, 
            totalMedications: prev.totalMedications + 1,
            lowStock: (newMed.quantity_in_stock || 0) <= (newMed.reorder_level || 0) 
              ? prev.lowStock + 1 
              : prev.lowStock
          }));
        }
      }
    } catch (error: any) {

      toast.error(error.response?.data?.error || `Failed to ${editingMedication ? 'update' : 'add'} medication`);
      return;
    }

    toast.success(`Medication ${editingMedication ? 'updated' : 'added'} successfully`);
    setMedicationDialogOpen(false);
    setEditingMedication(null);
    
    // Also refresh from server to ensure consistency
    setTimeout(() => loadPharmacyData(false), 500);
  };

  const openStockDialog = (medication: any) => {
    setSelectedMedication(medication);
    setStockDialogOpen(true);
  };

  const openEditDialog = (medication: any) => {
    setEditingMedication(medication);
    setMedicationDialogOpen(true);
  };

  const handleDeleteMedication = async (medication: any) => {
    // First, check if medication might be in use (optional pre-check)
    try {
      // We could add a pre-check here, but for now let's proceed with the delete attempt
      
      // Create a more detailed confirmation message
      const confirmMessage = `Are you sure you want to delete "${medication.name}"?\n\n` +
        `Details:\n` +
        `• Name: ${medication.name}\n` +
        `• Strength: ${medication.strength || 'N/A'}\n` +
        `• Stock: ${medication.stock_quantity || medication.quantity_in_stock || 0}\n` +
        `• Unit Price: TSh${Number(medication.unit_price || 0).toFixed(2)}\n\n` +
        `⚠️ This action cannot be undone!\n` +
        `⚠️ If this medication is used in prescriptions, deletion will be prevented.`;

      if (!confirm(confirmMessage)) {
        return;
      }

      const response = await api.delete(`/pharmacy/medications/${medication.id}`);
      
      // Remove from local state
      setMedications(prev => prev.filter(med => med.id !== medication.id));
      
      // Recalculate stats
      const updatedMeds = medications.filter(med => med.id !== medication.id);
      const totalMeds = updatedMeds.length;
      const lowStockMeds = updatedMeds.filter(med => (med.stock_quantity || med.quantity_in_stock || 0) <= (med.reorder_level || 0)).length;
      const outOfStockMeds = updatedMeds.filter(med => (med.stock_quantity || med.quantity_in_stock || 0) === 0).length;
      const totalValue = updatedMeds.reduce((sum, med) => sum + ((med.stock_quantity || med.quantity_in_stock || 0) * Number(med.unit_price || 0)), 0);
      
      setStats({
        totalMedications: totalMeds,
        lowStock: lowStockMeds,
        outOfStock: outOfStockMeds,
        totalValue: totalValue
      });

      toast.success(`Medication "${medication.name}" deleted successfully`);
      
      await logActivity('pharmacy.medication.deleted', {
        medication_id: medication.id,
        medication_name: medication.name,
        reason: 'Deleted by pharmacy staff'
      });

    } catch (error: any) {


      // Handle specific error messages from backend
      if (error.response?.status === 422) {
        const errorMessage = error.response?.data?.message || 
                           error.response?.data?.error || 
                           'Cannot delete medication - it may be in use';
        
        // Show a more detailed error with guidance
        toast.error(
          `❌ ${errorMessage}\n\n` +
          `💡 To delete this medication:\n` +
          `1. Go to patient prescriptions\n` +
          `2. Remove this medication from all prescriptions\n` +
          `3. Then try deleting again`,
          { duration: 8000 } // Show longer for detailed message
        );
      } else if (error.response?.status === 404) {
        toast.error('Medication not found - it may have already been deleted');
      } else {
        const errorMessage = error.response?.data?.message || 
                           error.response?.data?.error || 
                           error.message || 
                           'Failed to delete medication';
        toast.error(`Failed to delete medication: ${errorMessage}`);
      }
    }
  };



  const parseCSV = (text: string) => {
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    return lines.slice(1).map((line, index) => {
      if (!line.trim()) return null;

      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const medication: any = {};

      headers.forEach((header, i) => {
        const value = values[i] || '';
        switch (header.toLowerCase()) {
          case 'name':
            medication.name = value;
            break;
          case 'generic_name':
          case 'generic name':
            medication.generic_name = value || null;
            break;
          case 'strength':
            medication.strength = value;
            break;
          case 'dosage_form':
          case 'dosage form':
            medication.dosage_form = value || 'Tablet';
            break;
          case 'manufacturer':
            medication.manufacturer = value || null;
            break;
          case 'quantity_in_stock':
          case 'quantity':
          case 'stock':
            medication.quantity_in_stock = parseInt(value) || 0;
            break;
          case 'reorder_level':
          case 'reorder level':
            medication.reorder_level = parseInt(value) || 10;
            break;
          case 'unit_price':
          case 'unit price':
          case 'price':
            medication.unit_price = parseFloat(value) || 0;
            break;
          case 'expiry_date':
          case 'expiry date':
            medication.expiry_date = value || null;
            break;
        }
      });

      // Validate required fields
      if (!medication.name || !medication.strength) {
        medication.error = 'Missing required fields: name or strength';
      }

      return medication;
    }).filter(Boolean);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setImportFile(file);

    const text = await file.text();
    const medications = parseCSV(text);

    const validMedications = medications.filter(med => !med.error);
    const invalidMedications = medications.filter(med => med.error);

    setImportPreview(validMedications);

    if (invalidMedications.length > 0) {
      toast.warning(`${invalidMedications.length} rows have errors and will be skipped`);
    }

    if (validMedications.length === 0) {
      toast.error('No valid medications found in the file');
      return;
    }

    toast.success(`Found ${validMedications.length} valid medications to import`);
  };

  const handleBulkImport = async () => {
    if (importPreview.length === 0) {
      toast.error('No medications to import');
      return;
    }

    setImportLoading(true);
    setImportProgress(0);

    const medicationsToImport = importPreview.map(med => ({
      name: med.name,
      generic_name: med.generic_name,
      strength: med.strength,
      dosage_form: med.dosage_form,
      manufacturer: med.manufacturer,
      quantity_in_stock: med.quantity_in_stock,
      reorder_level: med.reorder_level,
      unit_price: med.unit_price,
      expiry_date: med.expiry_date,
    }));

    try {
      await api.post('/pharmacy/medications/bulk', { medications: medicationsToImport });
      toast.success(`Successfully imported ${medicationsToImport.length} medications`);
      setImportDialogOpen(false);
      setImportFile(null);
      setImportPreview([]);
      loadPharmacyData(false); // Background refresh
    } catch (error: any) {

      toast.error(`Failed to import medications: ${error.message}`);
    } finally {
      setImportLoading(false);
      setImportProgress(0);
    }
  };

  const createInvoiceFromPrescription = async (prescription: {
    id: string;
    medication_id: string;
    patient_id: string;
    quantity: number;
    dosage: string;
    [key: string]: any;
  }) => {
    try {

      if (!prescription.medication_id) {
        throw new Error('Prescription does not have a valid medication ID');
      }

      // Get medication details to calculate pricing

      let medicationRes;
      try {
        medicationRes = await api.get(`/pharmacy/medications/${prescription.medication_id}`);
      } catch (error: any) {

        throw new Error(`Failed to fetch medication details: ${error.message}`);
      }

      const medicationData = medicationRes.data.medication;

      if (!medicationData) {
        throw new Error('Medication not found');
      }

      // Calculate total amount (medication price * quantity + 10% tax)
      const subtotal = Number(medicationData.unit_price || 0) * prescription.quantity;
      const tax = subtotal * 0.1;
      const totalAmount = subtotal + tax;

      // Create invoice with retry logic for duplicate invoice numbers
      let invoice = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          const invoiceNumber = await generateInvoiceNumber();
          const invoiceData = {
            invoice_number: invoiceNumber,
            patient_id: prescription.patient_id,
            total_amount: totalAmount,
            tax: tax,
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            notes: `Auto-generated invoice for prescription: ${medicationData.name} (${prescription.dosage})`,
            status: 'Pending' // Using 'Pending' as it's a valid invoice status
          };

          let data;
          try {
            const invoiceRes = await api.post('/billing/invoices', invoiceData);
            data = invoiceRes.data.invoice;
          } catch (error: any) {

            // If it's a duplicate key error and we have retries left, try again
            if (error.response?.status === 409 || (error as any).code === '23505') {
              if (attempts < maxAttempts - 1) {

                attempts++;

                // Add an increasing delay between retries
                await new Promise(resolve => setTimeout(resolve, 200 * attempts));
                continue;
              } else {
                // If we're out of retries, try one last time with a timestamp-based number

                const timestamp = Date.now().toString().slice(-6);
                const fallbackInvoiceNumber = `INV-${timestamp}`;
                
                try {
                  const fallbackRes = await api.post('/billing/invoices', {
                    ...invoiceData,
                    invoice_number: fallbackInvoiceNumber,
                    status: 'Pending' // Ensure status is set for fallback as well
                  });
                  
                  data = fallbackRes.data.invoice;
                } catch (fallbackError: any) {

                  throw new Error(`Failed to create invoice after ${maxAttempts} attempts and fallback: ${fallbackError.message}`);
                }
                
                break;
              }
            }
            // If it's a different error, throw it
            throw new Error(`Failed to create invoice: ${error.message}`);
          }


          
          invoice = data;
          break; // Success, exit the retry loop
          
        } catch (error) {
          if (attempts >= maxAttempts - 1) {

            throw error;
          }
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      if (!invoice) {
        throw new Error('Failed to create invoice after multiple attempts');
      }

      // Create invoice item
      const invoiceItemData = {
        invoice_id: invoice.id,
        description: `${medicationData.name} ${prescription.dosage}`,
        item_type: 'medication',
        quantity: prescription.quantity,
        unit_price: medicationData.unit_price,
        total_price: subtotal,
        medication_id: prescription.medication_id
      };

      try {
        await api.post('/billing/invoice-items', invoiceItemData);
      } catch (error: any) {

        throw new Error(`Failed to create invoice item: ${error.message}`);
      }

      return invoice;
    } catch (error) {

      throw error;
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Pharmacy Dashboard">
        <div className="space-y-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-lg"></div>)}
          </div>
          <div className="h-96 bg-gray-200 animate-pulse rounded-lg"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Pharmacy Dashboard">
      <div className="space-y-6">
        {/* Background Refresh Indicator */}
        {refreshing && (
          <div className="fixed top-4 right-4 z-50 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 shadow-sm animate-in slide-in-from-right-2">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Updating...</span>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Prescriptions</CardTitle>
              <Pill className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingPrescriptions}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingPrescriptions === 0 ? 'All caught up!' : 'Awaiting fulfillment'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.lowStock}</div>
              <p className="text-xs text-muted-foreground">
                {stats.lowStock === 0 ? 'Stock levels good' : 'Below reorder level'}
              </p>

            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Medications</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMedications}</div>
              <p className="text-xs text-muted-foreground">In inventory</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="prescriptions" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
            <TabsTrigger value="queue">
              Patient Queue {directPharmacyQueue.length > 0 && <Badge className="ml-2" variant="destructive">{directPharmacyQueue.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
          </TabsList>

          <TabsContent value="prescriptions">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Prescriptions</CardTitle>
                  <CardDescription>
                    {prescriptionFilter === 'pending' 
                      ? (prescriptions.filter(p => p.status === 'Active' || p.status === 'Pending').length > 0 
                          ? `Showing ${Math.min(prescriptions.filter(p => p.status === 'Active' || p.status === 'Pending').length, 10)} of ${prescriptions.filter(p => p.status === 'Active' || p.status === 'Pending').length} pending`
                          : 'No pending prescriptions')
                      : (prescriptions.length > 0 
                          ? `Showing ${Math.min(prescriptions.length, 10)} of ${prescriptions.length} prescriptions`
                          : 'No prescriptions found')}
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                    <Button
                      variant={prescriptionFilter === 'pending' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setPrescriptionFilter('pending')}
                    >
                      Pending
                    </Button>
                    <Button
                      variant={prescriptionFilter === 'all' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setPrescriptionFilter('all')}
                    >
                      All
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {(prescriptionFilter === 'pending' 
                    ? prescriptions.filter(p => p.status === 'Active' || p.status === 'Pending') 
                    : prescriptions
                  ).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Package className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">
                      {prescriptionFilter === 'pending' ? 'No pending prescriptions' : 'No prescriptions found'}
                    </h3>
                    <p className="text-muted-foreground text-sm mt-1">
                      When prescriptions are created, they will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(() => {
                      // Group prescriptions by patient
                      const filteredPrescriptions = prescriptionFilter === 'pending' 
                        ? prescriptions.filter(p => p.status === 'Active' || p.status === 'Pending') 
                        : prescriptions;
                      
                      const groupedByPatient = filteredPrescriptions.reduce((acc: any, prescription) => {
                        const patientId = prescription.patient_id;
                        if (!acc[patientId]) {
                          acc[patientId] = {
                            patient: prescription.patient,
                            prescriptions: []
                          };
                        }
                        acc[patientId].prescriptions.push(prescription);
                        return acc;
                      }, {});

                      return Object.entries(groupedByPatient).slice(0, 10).map(([patientId, data]: [string, any]) => {
                        const isExpanded = expandedPatients.has(patientId);
                        const patientPrescriptions = data.prescriptions;
                        const firstPrescription = patientPrescriptions[0];
                        
                        return (
                          <Card key={patientId} className="overflow-hidden">
                            <div 
                              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => {
                                const newExpanded = new Set(expandedPatients);
                                if (isExpanded) {
                                  newExpanded.delete(patientId);
                                } else {
                                  newExpanded.add(patientId);
                                }
                                setExpandedPatients(newExpanded);
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3">
                                    <div className="font-semibold text-lg">{data.patient?.full_name || 'Unknown Patient'}</div>
                                    <Badge variant="secondary">
                                      {patientPrescriptions.length} prescription{patientPrescriptions.length !== 1 ? 's' : ''}
                                    </Badge>
                                    {patientPrescriptions.some((p: any) => p.status === 'Active' || p.status === 'Pending') && (
                                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                                        Pending
                                      </Badge>
                                    )}
                                  </div>
                                  {data.patient?.date_of_birth && (
                                    <div className="text-sm text-muted-foreground mt-1">
                                      DOB: {format(new Date(data.patient.date_of_birth), 'MM/dd/yyyy')} • {data.patient?.phone || 'No phone'}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {patientPrescriptions.some((p: any) => p.status === 'Active' || p.status === 'Pending') && (
                                    <Button 
                                      variant="default" 
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Dispense all pending prescriptions
                                        const pendingPrescriptions = patientPrescriptions.filter((p: any) => p.status === 'Active' || p.status === 'Pending');
                                        if (pendingPrescriptions.length > 0) {
                                          handleOpenDispenseDialog(pendingPrescriptions[0]);
                                        }
                                      }}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Dispense All ({patientPrescriptions.filter((p: any) => p.status === 'Active' || p.status === 'Pending').length})
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="sm">
                                    {isExpanded ? 'Hide' : 'View'} Prescriptions
                                  </Button>
                                </div>
                              </div>
                            </div>
                            
                            {isExpanded && (
                              <div className="border-t">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Medication</TableHead>
                                      <TableHead>Dosage</TableHead>
                                      <TableHead>Quantity</TableHead>
                                      <TableHead>Prescribed By</TableHead>
                                      <TableHead>Date</TableHead>
                                      <TableHead>Status</TableHead>
                                      <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {patientPrescriptions.flatMap((prescription: any) => {
                                      // Get items or medications (support both formats)
                                      const prescriptionItems = prescription.items || prescription.medications || [];
                                      const meds = Array.isArray(prescriptionItems) 
                                        ? prescriptionItems 
                                        : (typeof prescriptionItems === 'string' 
                                            ? JSON.parse(prescriptionItems) 
                                            : [prescription]);
                                      
                                      // Create a row for each medication in the prescription
                                      return meds.map((med: any, index: number) => (
                                        <TableRow 
                                          key={`${prescription.id}-${index}`}
                                          className={loadingStates[prescription.id] ? 'opacity-50' : ''}
                                        >
                                          <TableCell>
                                            <div className="font-medium">
                                              {med.medication_name || med.name}
                                            </div>
                                            {med.instructions && (
                                              <div className="text-xs text-muted-foreground">
                                                {med.instructions}
                                              </div>
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            <div className="text-sm">{med.dosage}</div>
                                            <div className="text-xs text-muted-foreground">
                                              {med.frequency ? `${med.frequency} times/day` : 'Frequency not set'}
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            <div className="font-medium">{med.quantity}</div>
                                            <div className="text-xs text-muted-foreground">
                                              {med.duration ? `${med.duration} days` : 'Duration not set'}
                                            </div>
                                          </TableCell>
                                        <TableCell>
                                          {prescription.doctor_profile ? (
                                            <div className="text-sm">{prescription.doctor_profile.full_name}</div>
                                          ) : (
                                            <span className="text-muted-foreground text-sm">-</span>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {(() => {
                                            const dateValue = prescription.prescribed_date || prescription.prescription_date || prescription.created_at;
                                            if (!dateValue) return <span className="text-muted-foreground text-sm">-</span>;
                                            try {
                                              const date = new Date(dateValue);
                                              if (isNaN(date.getTime())) return <span className="text-muted-foreground text-sm">-</span>;
                                              return (
                                                <>
                                                  <div className="text-sm">{format(date, 'MMM d')}</div>
                                                  <div className="text-xs text-muted-foreground">
                                                    {format(date, 'h:mm a')}
                                                  </div>
                                                </>
                                              );
                                            } catch (e) {
                                              return <span className="text-muted-foreground text-sm">-</span>;
                                            }
                                          })()}
                                        </TableCell>
                                        <TableCell>
                                          <Badge
                                            variant={
                                              prescription.status === 'Dispensed'
                                                ? 'default'
                                                : prescription.status === 'Cancelled'
                                                ? 'destructive'
                                                : 'secondary'
                                            }
                                            className="capitalize"
                                          >
                                            {prescription.status.toLowerCase()}
                                          </Badge>
                                        </TableCell>
                                          <TableCell className="text-right">
                                            {index === 0 && (prescription.status === 'Active' || prescription.status === 'Pending') ? (
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleOpenDispenseDialog(prescription);
                                                }}
                                                disabled={loadingStates[prescription.id]}
                                              >
                                                {loadingStates[prescription.id] ? (
                                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                ) : (
                                                  <CheckCircle className="h-4 w-4 mr-2" />
                                                )}
                                                Dispense All
                                              </Button>
                                            ) : index === 0 ? (
                                              <span className="text-muted-foreground text-sm">
                                                Dispensed
                                              </span>
                                            ) : null}
                                          </TableCell>
                                        </TableRow>
                                      ));
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </Card>
                        );
                      });
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="queue" className="space-y-6">
            {/* Direct Pharmacy Queue */}
            <Card className="shadow-lg border-green-200 bg-green-50/30">
              <CardHeader className="bg-green-100/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-green-800">
                      <Users className="h-5 w-5" />
                      Direct Pharmacy Queue ({directPharmacyQueue.length})
                    </CardTitle>
                    <CardDescription>Patients who came directly to pharmacy (no prescription needed)</CardDescription>
                  </div>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => setWalkInDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Register Walk-in Patient
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {directPharmacyQueue.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No direct pharmacy patients</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient</TableHead>
                        <TableHead>Visit Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {directPharmacyQueue.map((visit) => (
                        <TableRow key={visit.id} className="bg-green-50/50">
                          <TableCell>
                            <div className="font-medium">{visit.patient?.full_name || 'Unknown'}</div>
                            <div className="text-sm text-muted-foreground">{visit.patient?.phone}</div>
                          </TableCell>
                          <TableCell>{format(new Date(visit.visit_date), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                              Direct Pharmacy
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => handleOpenPrescriptionDialog(visit)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Pill className="h-4 w-4 mr-1" />
                              Add Medications
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>


          </TabsContent>

          <TabsContent value="inventory">
            {/* Critical Low Stock Alert */}
            {medications.filter(m => (m.stock_quantity || m.quantity_in_stock || 0) <= 5).length > 0 && (
              <Card className="shadow-lg border-red-200 bg-red-50 mb-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-5 w-5" />
                    Critical Low Stock Alert
                  </CardTitle>
                  <CardDescription className="text-red-600">
                    {medications.filter(m => (m.stock_quantity || m.quantity_in_stock || 0) <= 5).length} medication(s) have 5 or fewer units remaining
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {medications
                      .filter(m => (m.stock_quantity || m.quantity_in_stock || 0) <= 5)
                      .sort((a, b) => (a.stock_quantity || a.quantity_in_stock || 0) - (b.stock_quantity || b.quantity_in_stock || 0))
                      .map(med => (
                        <div key={med.id} className="flex items-center justify-between p-3 bg-white rounded-md border border-red-200">
                          <div className="flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-red-600" />
                            <div>
                              <p className="font-medium text-red-900">{med.name} ({med.strength})</p>
                              <p className="text-sm text-red-700">
                                Only <span className="font-bold">{med.stock_quantity || med.quantity_in_stock || 0}</span> units left
                                {(med.stock_quantity || med.quantity_in_stock || 0) === 0 && <span className="ml-2 text-red-800 font-bold">OUT OF STOCK!</span>}
                              </p>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => openStockDialog(med)}
                          >
                            Restock Now
                          </Button>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Medication Inventory</CardTitle>
                  <CardDescription>Track and manage medication stock levels</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Import Medications
                  </Button>
                  <Button onClick={() => setMedicationDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Medication
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search Bar */}
                <div className="mb-4">
                  <Input
                    type="text"
                    placeholder="Search medications by name, generic name, or strength..."
                    value={inventorySearchTerm}
                    onChange={(e) => setInventorySearchTerm(e.target.value)}
                    className="max-w-md"
                  />
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Generic Name</TableHead>
                        <TableHead>Strength</TableHead>
                        <TableHead>Form</TableHead>
                        <TableHead>Stock (Remaining / Uploaded)</TableHead>
                        <TableHead>Reorder Level</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Last Restocked</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {medications.filter(med => {
                        if (!inventorySearchTerm) return true;
                        const searchLower = inventorySearchTerm.toLowerCase();
                        return (
                          med.name.toLowerCase().includes(searchLower) ||
                          (med.generic_name && med.generic_name.toLowerCase().includes(searchLower)) ||
                          (med.strength && med.strength.toLowerCase().includes(searchLower))
                        );
                      }).map((med) => {
                        const isLowStock = (med.stock_quantity || med.quantity_in_stock || 0) <= med.reorder_level;
                        return (
                          <TableRow key={med.id}>
                            <TableCell className="font-medium">{med.name}</TableCell>
                            <TableCell className="text-muted-foreground">{med.generic_name || 'Not specified'}</TableCell>
                            <TableCell>{med.strength}</TableCell>
                            <TableCell className="text-muted-foreground">{med.dosage_form || 'Tablet'}</TableCell>
                            <TableCell className="font-semibold">
                              <span className={`${(med.stock_quantity || med.quantity_in_stock || 0) === 0 ? 'text-red-600' : ''}`}>
                                {med.stock_quantity || med.quantity_in_stock || 0}
                              </span>
                              {med.initial_quantity > 0 && (
                                <span className="text-muted-foreground text-xs ml-1">/ {med.initial_quantity}</span>
                              )}
                            </TableCell>
                            <TableCell>{med.reorder_level}</TableCell>
                            <TableCell className="font-medium">TSh{Number(med.unit_price).toFixed(2)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {med.stock_updated_at
                                ? format(new Date(med.stock_updated_at), 'dd MMM yyyy')
                                : '—'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={isLowStock ? 'destructive' : 'default'}>
                                {isLowStock ? 'Low Stock' : 'In Stock'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => openEditDialog(med)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button size="sm" onClick={() => openStockDialog(med)}>
                                  Update Stock
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => handleDeleteMedication(med)}
                                  title="Delete medication (may be prevented if used in prescriptions)"
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="ml-1 hidden sm:inline">Delete</span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>

              {/* Import Medications Dialog */}
              <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Bulk Import Medications</DialogTitle>
                    <DialogDescription>
                      Upload a CSV file to import multiple medications at once
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* CSV Format Instructions */}
                    <div className="border rounded-lg p-4 bg-muted/50 space-y-3">
                      <h4 className="font-semibold text-sm">CSV Format Required:</h4>
                      <div className="space-y-2 text-sm">
                        <p className="font-mono text-xs bg-background p-2 rounded border">
                          name,generic_name,strength,dosage_form,manufacturer,quantity_in_stock,reorder_level,unit_price,expiry_date
                        </p>
                        <div className="space-y-1 text-muted-foreground">
                          <p><strong>name:</strong> Brand/Trade name (e.g., Panadol, Amoxil)</p>
                          <p><strong>generic_name:</strong> Generic name (e.g., Paracetamol, Amoxicillin)</p>
                          <p><strong>strength:</strong> Dosage strength (e.g., 500mg, 250mg/5ml)</p>
                          <p><strong>dosage_form:</strong> Tablet, Capsule, Syrup, Injection, etc.</p>
                          <p><strong>manufacturer:</strong> Manufacturer name</p>
                          <p><strong>quantity_in_stock:</strong> Current stock quantity (number)</p>
                          <p><strong>reorder_level:</strong> Minimum stock level before reorder (number)</p>
                          <p><strong>unit_price:</strong> Price per unit in TSh (number)</p>
                          <p><strong>expiry_date:</strong> Expiry date in YYYY-MM-DD format</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="font-semibold text-sm">Example rows:</p>
                        <div className="font-mono text-xs bg-background p-2 rounded border space-y-1">
                          <p>Panadol,Paracetamol,500mg,Tablet,GSK,1000,100,500,2025-12-31</p>
                          <p>Amoxil,Amoxicillin,250mg,Capsule,GSK,500,50,1500,2025-06-30</p>
                          <p>Brufen,Ibuprofen,400mg,Tablet,Abbott,800,80,800,2025-09-15</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="csvFile">Select CSV File</Label>
                      <Input
                        id="csvFile"
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        disabled={importLoading}
                      />
                    </div>

                    {importPreview.length > 0 && (
                      <div className="space-y-2">
                        <Label>Preview ({importPreview.length} medications)</Label>
                        <div className="border rounded-lg max-h-60 overflow-y-auto">
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Name</TableHead>
                                  <TableHead>Strength</TableHead>
                                  <TableHead>Stock</TableHead>
                                  <TableHead>Price</TableHead>
                                  <TableHead>Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {importPreview.slice(0, 10).map((med, index) => (
                                  <TableRow key={med.name + med.strength || index}>
                                    <TableCell className="font-medium">{med.name}</TableCell>
                                    <TableCell>{med.strength}</TableCell>
                                    <TableCell>{med.stock_quantity || med.quantity_in_stock || 0}</TableCell>
                                    <TableCell>TSh{Number(med.unit_price).toFixed(2)}</TableCell>
                                    <TableCell>
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                    </TableCell>
                                  </TableRow>
                                ))}
                                {importPreview.length > 10 && (
                                  <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                                      ... and {importPreview.length - 10} more medications
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setImportDialogOpen(false);
                          setImportFile(null);
                          setImportPreview([]);
                        }}
                        disabled={importLoading}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleBulkImport}
                        disabled={importPreview.length === 0 || importLoading}
                      >
                        {importLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Import {importPreview.length} Medications
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Add/Edit Medication Dialog */}
              <Dialog open={medicationDialogOpen} onOpenChange={(open) => {
                setMedicationDialogOpen(open);
                if (!open) setEditingMedication(null);
              }}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingMedication ? 'Edit' : 'Add'} Medication</DialogTitle>
                    <DialogDescription>
                      {editingMedication ? 'Update' : 'Enter'} medication details
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSaveMedication} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Medication Name *</Label>
                        <Input id="name" name="name" defaultValue={editingMedication?.name} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="genericName">Generic Name</Label>
                        <Input id="genericName" name="genericName" defaultValue={editingMedication?.generic_name} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="strength">Strength *</Label>
                        <Input id="strength" name="strength" placeholder="e.g., 500mg" defaultValue={editingMedication?.strength} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dosageForm">Dosage Form *</Label>
                        <Select name="dosageForm" defaultValue={editingMedication?.dosage_form || "Tablet"}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Tablet">Tablet</SelectItem>
                            <SelectItem value="Capsule">Capsule</SelectItem>
                            <SelectItem value="Syrup">Syrup</SelectItem>
                            <SelectItem value="Injection">Injection</SelectItem>
                            <SelectItem value="Cream">Cream</SelectItem>
                            <SelectItem value="Drops">Drops</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manufacturer">Manufacturer</Label>
                      <Input id="manufacturer" name="manufacturer" defaultValue={editingMedication?.manufacturer} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity in Stock *</Label>
                        <Input id="quantity" name="quantity" type="number" defaultValue={editingMedication?.quantity_in_stock} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reorderLevel">Reorder Level *</Label>
                        <Input id="reorderLevel" name="reorderLevel" type="number" defaultValue={editingMedication?.reorder_level || 10} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="unitPrice">Unit Price *</Label>
                        <Input id="unitPrice" name="unitPrice" type="number" step="0.01" defaultValue={editingMedication?.unit_price} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiryDate">Expiry Date</Label>
                      <Input 
                        id="expiryDate" 
                        name="expiryDate" 
                        type="date" 
                        defaultValue={editingMedication?.expiry_date}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      {editingMedication ? 'Update' : 'Add'} Medication
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Update Stock Dialog */}
              <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Update Stock</DialogTitle>
                    <DialogDescription>
                      Update stock quantity for {selectedMedication?.name}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleUpdateStock} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm bg-muted/40 rounded-lg p-3">
                      <div>
                        <p className="text-muted-foreground">Current Stock</p>
                        <p className="font-semibold text-lg">{selectedMedication?.stock_quantity || 0}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Uploaded (Initial)</p>
                        <p className="font-semibold text-lg">{selectedMedication?.initial_quantity || 0}</p>
                      </div>
                      {selectedMedication?.stock_updated_at && (
                        <div className="col-span-2">
                          <p className="text-muted-foreground">Last Updated</p>
                          <p className="font-medium">{format(new Date(selectedMedication.stock_updated_at), 'dd MMM yyyy, HH:mm')}</p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quantity">New Stock Quantity *</Label>
                      <Input
                        id="quantity"
                        name="quantity"
                        type="number"
                        defaultValue={selectedMedication?.stock_quantity || 0}
                        required
                      />
                      <p className="text-xs text-muted-foreground">Setting a higher value will also update the uploaded quantity.</p>
                    </div>
                    <Button type="submit" className="w-full">Update Stock</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dispense Dialog */}
        {selectedPrescriptionForDispense && (
          <DispenseDialog
            open={dispenseDialogOpen}
            onOpenChange={setDispenseDialogOpen}
            prescription={selectedPrescriptionForDispense}
            medications={medications}
            onDispense={handleDispenseWithDetails}
            loading={loadingStates[selectedPrescriptionForDispense.id]}
          />
        )}

        {/* Walk-in Patient Registration Dialog */}
        <Dialog open={walkInDialogOpen} onOpenChange={(o) => {
          if (!o) { setWalkInMode('search'); setWalkInSearch(''); setWalkInSearchResults([]); }
          setWalkInDialogOpen(o);
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Walk-in Pharmacy Patient
              </DialogTitle>
              <DialogDescription>
                Search for an existing patient or register a new one.
              </DialogDescription>
            </DialogHeader>

            {/* Mode toggle */}
            <div className="flex gap-2 border rounded-lg p-1 bg-muted/40">
              <button onClick={() => setWalkInMode('search')}
                className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${walkInMode === 'search' ? 'bg-white shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                Search Existing
              </button>
              <button onClick={() => setWalkInMode('new')}
                className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${walkInMode === 'new' ? 'bg-white shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                Register New
              </button>
            </div>

            {walkInMode === 'search' ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Search by name or phone number</Label>
                  <Input
                    placeholder="e.g. John or 0712345678"
                    value={walkInSearch}
                    onChange={e => handleWalkInSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {walkInSearchLoading && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {!walkInSearchLoading && walkInSearch && walkInSearchResults.length === 0 && (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      No patients found.{' '}
                      <button className="text-blue-600 underline" onClick={() => setWalkInMode('new')}>
                        Register new patient
                      </button>
                    </div>
                  )}
                  {walkInSearchResults.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                      <div>
                        <p className="font-medium text-sm">{p.full_name}</p>
                        <p className="text-xs text-muted-foreground">{p.phone} · {p.gender}</p>
                      </div>
                      <Button size="sm" disabled={walkInLoading}
                        onClick={() => handleServeExistingPatient(p)}
                        className="bg-green-600 hover:bg-green-700 text-white">
                        {walkInLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add to Queue'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Full Name *</Label>
                  <Input placeholder="e.g. John Doe" value={walkInForm.full_name}
                    onChange={e => setWalkInForm(p => ({ ...p, full_name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Date of Birth *</Label>
                    <Input type="date" value={walkInForm.date_of_birth}
                      onChange={e => setWalkInForm(p => ({ ...p, date_of_birth: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Gender *</Label>
                    <Select value={walkInForm.gender} onValueChange={v => setWalkInForm(p => ({ ...p, gender: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Phone *</Label>
                  <Input placeholder="e.g. 0712345678" value={walkInForm.phone}
                    onChange={e => setWalkInForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Address</Label>
                  <Input placeholder="Optional" value={walkInForm.address}
                    onChange={e => setWalkInForm(p => ({ ...p, address: e.target.value }))} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setWalkInDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleWalkInRegister} disabled={walkInLoading}
                    className="bg-green-600 hover:bg-green-700">
                    {walkInLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    Register & Add to Queue
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create Prescription Dialog */}
        <Dialog open={createPrescriptionDialogOpen} onOpenChange={setCreatePrescriptionDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5" />
                {/* Show different title based on queue type */}
                {directPharmacyQueue.some(v => v.id === selectedPatientForPrescription?.id) 
                  ? 'Add Medications' 
                  : prescriptionQueue.some(v => v.id === selectedPatientForPrescription?.id)
                  ? 'Dispense Prescription'
                  : 'Create Prescription'
                }
              </DialogTitle>
              <DialogDescription>
                {directPharmacyQueue.some(v => v.id === selectedPatientForPrescription?.id) 
                  ? `Add medications for direct pharmacy patient: ${selectedPatientForPrescription?.patient?.full_name}`
                  : prescriptionQueue.some(v => v.id === selectedPatientForPrescription?.id)
                  ? `Dispense doctor's prescription for: ${selectedPatientForPrescription?.patient?.full_name}`
                  : `Create prescription for ${selectedPatientForPrescription?.patient?.full_name}`
                }
              </DialogDescription>
            </DialogHeader>

            {/* Queue Type Indicator */}
            {selectedPatientForPrescription && (
              <div className="flex items-center gap-2 p-3 rounded-lg border">
                {directPharmacyQueue.some(v => v.id === selectedPatientForPrescription?.id) ? (
                  <div className="flex items-center gap-2 text-green-700">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">Direct Pharmacy Patient</span>
                    <span className="text-xs bg-green-100 px-2 py-1 rounded">Add any medications needed</span>
                  </div>
                ) : prescriptionQueue.some(v => v.id === selectedPatientForPrescription?.id) ? (
                  <div className="flex items-center gap-2 text-blue-700">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium">Doctor Prescription Patient</span>
                    <span className="text-xs bg-blue-100 px-2 py-1 rounded">
                      {existingPrescriptions.length > 0 
                        ? `${existingPrescriptions.length} prescription(s) to dispense + add more if needed`
                        : 'Dispense prescribed medications + add more if needed'
                      }
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-700">
                    <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                    <span className="text-sm font-medium">General Patient</span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              {/* Show existing prescriptions for prescription queue patients */}
              {prescriptionQueue.some(v => v.id === selectedPatientForPrescription?.id) && existingPrescriptions.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold text-blue-800">Doctor's Prescriptions to Dispense</Label>
                  <div className="space-y-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    {existingPrescriptions.map((prescription: any) => (
                      <div key={prescription.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-blue-900">
                            Prescription #{prescription.id} - {prescription.status}
                          </span>
                          <span className="text-xs text-blue-600">
                            {prescription.prescription_items?.length || 0} medication(s)
                          </span>
                        </div>
                        {prescription.prescription_items?.map((item: any, index: number) => (
                          <div key={index} className="ml-4 p-2 bg-white rounded border border-blue-100 flex items-center justify-between">
                            <div className="flex-1">
                              <div className="text-sm font-medium">{item.medication_name}</div>
                              <div className="text-xs text-gray-600">
                                {item.dosage} • {item.frequency ? `${item.frequency} times/day` : 'No frequency'} • {item.duration ? `${item.duration} days` : 'No duration'} • Qty: {item.quantity}
                              </div>
                              {item.instructions && (
                                <div className="text-xs text-gray-500 italic">{item.instructions}</div>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-2"
                              onClick={async () => {
                                try {
                                  // Restore stock for this medication
                                  const quantity = parseInt(item.quantity);
                                  if (!isNaN(quantity) && quantity > 0) {
                                    await handleRestoreStock(item.medication_name, quantity);
                                  }

                                  // Remove the item from the prescription in database
                                  await api.delete(`/prescriptions/${prescription.id}/items/${item.id}`);

                                  // Update local state - remove the item from existing prescriptions
                                  setExistingPrescriptions(prev => 
                                    prev.map(p => 
                                      p.id === prescription.id 
                                        ? {
                                            ...p,
                                            prescription_items: p.prescription_items?.filter((pItem: any) => pItem.id !== item.id) || []
                                          }
                                        : p
                                    ).filter(p => p.prescription_items && p.prescription_items.length > 0) // Remove prescriptions with no items
                                  );

                                  toast.success(`Removed ${item.medication_name} and restored stock (+${quantity})`);
                                  
                                  await logActivity('pharmacy.prescription.item.removed', {
                                    prescription_id: prescription.id,
                                    medication_name: item.medication_name,
                                    quantity_restored: quantity,
                                    reason: 'Medication removed from doctor prescription'
                                  });

                                } catch (error: any) {

                                  toast.error(`Failed to remove ${item.medication_name}`);
                                }
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ))}
                    {existingPrescriptions.some(p => p.prescription_items && p.prescription_items.length > 0) ? (
                      <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-800 flex items-center justify-between">
                        <span>💡 These are the medications prescribed by the doctor. You can dispense these and/or add additional medications below.</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-2 text-xs h-6 px-2 border-blue-300 text-blue-700 hover:bg-blue-200"
                          onClick={async () => {
                            try {
                              // Dispense all existing prescriptions
                              for (const prescription of existingPrescriptions) {
                                if (prescription.status === 'Active' || prescription.status === 'Pending') {
                                  await handleDispensePrescription(prescription.id, prescription.patient_id);
                                }
                              }
                              toast.success('All doctor prescriptions dispensed successfully!');
                            } catch (error: any) {

                              toast.error('Failed to dispense some prescriptions');
                            }
                          }}
                        >
                          Quick Dispense All
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-3 p-2 bg-yellow-100 rounded text-xs text-yellow-800">
                        ⚠️ All prescribed medications have been removed. You can add new medications below if needed.
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  {prescriptionQueue.some(v => v.id === selectedPatientForPrescription?.id) 
                    ? 'Additional Medications (Optional)' 
                    : 'Medications'
                  }
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNewPrescriptionItems([...newPrescriptionItems, {
                      medication_id: '',
                      medication_name: '',
                      dosage: '',
                      frequency: '',
                      duration: '',
                      quantity: '',
                      instructions: ''
                    }]);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Medication
                </Button>
              </div>

              {newPrescriptionItems.map((item, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium">Medication {index + 1}</span>
                    {newPrescriptionItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          const itemToRemove = newPrescriptionItems[index];
                          
                          // If medication has been selected and quantity specified, restore stock
                          if (itemToRemove.medication_name && itemToRemove.quantity) {
                            const quantity = parseInt(itemToRemove.quantity);
                            if (!isNaN(quantity) && quantity > 0) {
                              await handleRestoreStock(itemToRemove.medication_name, quantity);
                              toast.success(`Stock restored: +${quantity} ${itemToRemove.medication_name}`);
                            }
                          }
                          
                          setNewPrescriptionItems(newPrescriptionItems.filter((_, i) => i !== index));
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2 col-span-2">
                      <Label className="flex items-center gap-2">
                        <Pill className="h-4 w-4" />
                        Medication Name *
                        <span className="text-xs text-muted-foreground">(Search by name, generic, or strength)</span>
                      </Label>
                      <Select
                        value={item.medication_id || ''}
                        onValueChange={(value) => {
                          const updated = [...newPrescriptionItems];
                          
                          // Find the selected medication by ID
                          const med = medications.find(m => m.id === value);
                          if (med) {
                            updated[index].medication_id = value;
                            updated[index].medication_name = med.name;
                            
                            // Auto-fill dosage
                            if (med.strength) {
                              updated[index].dosage = `${med.strength} ${med.dosage_form || ''}`.trim();
                            }
                            
                            // Clear search term after selection
                            setMedicationSearchTerm('');
                          }
                          
                          setNewPrescriptionItems(updated);
                        }}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="🔍 Click to search and select medication..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[400px] w-[500px]">
                          <div className="sticky top-0 bg-white p-3 border-b shadow-sm">
                            <div className="relative">
                              <Input
                                placeholder="🔍 Type medication name, generic name, or strength..."
                                value={medicationSearchTerm}
                                onChange={(e) => setMedicationSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="h-10 pr-10 text-base"
                                autoFocus
                              />
                              {medicationSearchTerm && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMedicationSearchTerm('');
                                  }}
                                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            {medicationSearchTerm && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                {medications.filter(med => {
                                  const searchLower = medicationSearchTerm.toLowerCase();
                                  return (
                                    med.name.toLowerCase().includes(searchLower) ||
                                    (med.generic_name && med.generic_name.toLowerCase().includes(searchLower)) ||
                                    (med.strength && med.strength.toLowerCase().includes(searchLower))
                                  );
                                }).length} medications found
                              </div>
                            )}
                          </div>
                          
                          <div className="max-h-[300px] overflow-y-auto">
                            {medications
                              .filter(med => {
                                if (!medicationSearchTerm) return true;
                                const searchLower = medicationSearchTerm.toLowerCase();
                                return (
                                  med.name.toLowerCase().includes(searchLower) ||
                                  (med.generic_name && med.generic_name.toLowerCase().includes(searchLower)) ||
                                  (med.strength && med.strength.toLowerCase().includes(searchLower)) ||
                                  (med.dosage_form && med.dosage_form.toLowerCase().includes(searchLower))
                                );
                              })
                              .sort((a, b) => {
                                // Sort by stock quantity (in stock first)
                                const stockA = a.stock_quantity || a.quantity_in_stock || 0;
                                const stockB = b.stock_quantity || b.quantity_in_stock || 0;
                                if (stockA > 0 && stockB === 0) return -1;
                                if (stockA === 0 && stockB > 0) return 1;
                                return a.name.localeCompare(b.name);
                              })
                              .map((med) => {
                                const stock = med.stock_quantity || med.quantity_in_stock || 0;
                                const isLowStock = stock <= (med.reorder_level || 10);
                                const isOutOfStock = stock === 0;
                                
                                return (
                                  <SelectItem 
                                    key={med.id} 
                                    value={med.id}
                                    disabled={isOutOfStock}
                                    className={`p-3 ${isOutOfStock ? 'opacity-50' : ''}`}
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">{med.name}</span>
                                          {med.strength && (
                                            <Badge variant="outline" className="text-xs">
                                              {med.strength}
                                            </Badge>
                                          )}
                                          {isOutOfStock && (
                                            <Badge variant="destructive" className="text-xs">
                                              Out of Stock
                                            </Badge>
                                          )}
                                          {isLowStock && !isOutOfStock && (
                                            <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                                              Low Stock
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                          {med.generic_name && (
                                            <span>Generic: {med.generic_name} • </span>
                                          )}
                                          {med.dosage_form && (
                                            <span>Form: {med.dosage_form} • </span>
                                          )}
                                          <span className={isLowStock ? 'text-orange-600 font-medium' : ''}>
                                            Stock: {stock} units
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 ml-2">
                                        {stock > 0 && (
                                          <CheckCircle className="h-4 w-4 text-green-500" />
                                        )}
                                        {isLowStock && !isOutOfStock && (
                                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                                        )}
                                        {isOutOfStock && (
                                          <AlertCircle className="h-4 w-4 text-red-500" />
                                        )}
                                      </div>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            
                            {medications.filter(med => {
                              if (!medicationSearchTerm) return true;
                              const searchLower = medicationSearchTerm.toLowerCase();
                              return (
                                med.name.toLowerCase().includes(searchLower) ||
                                (med.generic_name && med.generic_name.toLowerCase().includes(searchLower)) ||
                                (med.strength && med.strength.toLowerCase().includes(searchLower)) ||
                                (med.dosage_form && med.dosage_form.toLowerCase().includes(searchLower))
                              );
                            }).length === 0 && medicationSearchTerm && (
                              <div className="p-6 text-center text-sm text-muted-foreground">
                                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="font-medium">No medications found</p>
                                <p>Try searching with different keywords:</p>
                                <ul className="text-xs mt-2 space-y-1">
                                  <li>• Medication name (e.g., "Paracetamol")</li>
                                  <li>• Generic name (e.g., "Acetaminophen")</li>
                                  <li>• Strength (e.g., "500mg")</li>
                                  <li>• Form (e.g., "Tablet")</li>
                                </ul>
                              </div>
                            )}
                            
                            {!medicationSearchTerm && (
                              <div className="p-6 text-center text-sm text-muted-foreground">
                                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="font-medium">Search for medications</p>
                                <p>Type in the search box above to find medications</p>
                                <div className="text-xs mt-2 space-y-1">
                                  <p>💡 <strong>Tips:</strong></p>
                                  <p>• Search by name, generic name, or strength</p>
                                  <p>• Medications in stock appear first</p>
                                  <p>• Out of stock items are disabled</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Dosage *</Label>
                      <Input
                        placeholder="e.g., 500mg"
                        value={item.dosage}
                        onChange={(e) => {
                          const updated = [...newPrescriptionItems];
                          updated[index].dosage = e.target.value;
                          setNewPrescriptionItems(updated);
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Frequency *</Label>
                      <Select
                        value={item.frequency}
                        onValueChange={(value) => {
                          const updated = [...newPrescriptionItems];
                          updated[index].frequency = value;
                          setNewPrescriptionItems(updated);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Once daily">Once daily</SelectItem>
                          <SelectItem value="Twice daily">Twice daily</SelectItem>
                          <SelectItem value="3 times daily">3 times daily</SelectItem>
                          <SelectItem value="4 times daily">4 times daily</SelectItem>
                          <SelectItem value="Every 4 hours">Every 4 hours</SelectItem>
                          <SelectItem value="Every 6 hours">Every 6 hours</SelectItem>
                          <SelectItem value="Every 8 hours">Every 8 hours</SelectItem>
                          <SelectItem value="Every 12 hours">Every 12 hours</SelectItem>
                          <SelectItem value="As needed">As needed</SelectItem>
                          <SelectItem value="Before meals">Before meals</SelectItem>
                          <SelectItem value="After meals">After meals</SelectItem>
                          <SelectItem value="At bedtime">At bedtime</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Duration *</Label>
                      <Select
                        value={item.duration}
                        onValueChange={(value) => {
                          const updated = [...newPrescriptionItems];
                          updated[index].duration = value;
                          setNewPrescriptionItems(updated);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3 days">3 days</SelectItem>
                          <SelectItem value="5 days">5 days</SelectItem>
                          <SelectItem value="7 days">7 days (1 week)</SelectItem>
                          <SelectItem value="10 days">10 days</SelectItem>
                          <SelectItem value="14 days">14 days (2 weeks)</SelectItem>
                          <SelectItem value="21 days">21 days (3 weeks)</SelectItem>
                          <SelectItem value="30 days">30 days (1 month)</SelectItem>
                          <SelectItem value="60 days">60 days (2 months)</SelectItem>
                          <SelectItem value="90 days">90 days (3 months)</SelectItem>
                          <SelectItem value="Until finished">Until finished</SelectItem>
                          <SelectItem value="As needed">As needed</SelectItem>
                          <SelectItem value="Ongoing">Ongoing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Quantity *</Label>
                      <Input
                        placeholder="e.g., 21"
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...newPrescriptionItems];
                          updated[index].quantity = e.target.value;
                          setNewPrescriptionItems(updated);
                        }}
                        className={(() => {
                          const medication = medications.find(m => m.name === item.medication_name);
                          const requestedQty = parseInt(item.quantity) || 0;
                          const availableStock = medication?.stock_quantity || medication?.quantity_in_stock || 0;
                          
                          if (requestedQty > availableStock) {
                            return "border-red-500 focus:border-red-500";
                          }
                          return "";
                        })()}
                      />
                      {(() => {
                        const medication = medications.find(m => m.name === item.medication_name);
                        const requestedQty = parseInt(item.quantity) || 0;
                        const availableStock = medication?.stock_quantity || medication?.quantity_in_stock || 0;
                        
                        if (item.medication_name && requestedQty > 0) {
                          if (requestedQty > availableStock) {
                            return (
                              <p className="text-xs text-red-600">
                                ⚠️ Insufficient stock! Available: {availableStock}, Requested: {requestedQty}
                              </p>
                            );
                          } else if (availableStock <= 5) {
                            return (
                              <p className="text-xs text-yellow-600">
                                ⚠️ Low stock warning! Available: {availableStock}
                              </p>
                            );
                          } else {
                            return (
                              <p className="text-xs text-green-600">
                                ✅ Available: {availableStock}
                              </p>
                            );
                          }
                        }
                        return null;
                      })()}
                    </div>

                    <div className="space-y-2">
                      <Label>Instructions</Label>
                      <Input
                        placeholder="e.g., Take after meals"
                        value={item.instructions}
                        onChange={(e) => {
                          const updated = [...newPrescriptionItems];
                          updated[index].instructions = e.target.value;
                          setNewPrescriptionItems(updated);
                        }}
                      />
                    </div>
                  </div>
                </Card>
              ))}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setCreatePrescriptionDialogOpen(false);
                    setSelectedPatientForPrescription(null);
                    setExistingPrescriptions([]);
                    setRemovedPrescriptionItems(new Set());
                    setNewPrescriptionItems([{
                      medication_id: '',
                      medication_name: '',
                      dosage: '',
                      frequency: '',
                      duration: '',
                      quantity: '',
                      instructions: ''
                    }]);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={async () => {
                    try {
                      // Validate
                      const validItems = newPrescriptionItems.filter(item => 
                        item.medication_id && item.medication_name && item.dosage && item.frequency && item.duration && item.quantity
                      );

                      if (validItems.length === 0) {
                        toast.error('Please add at least one complete medication');
                        return;
                      }

                      // Check if this is a direct pharmacy patient
                      const isDirectPharmacy = directPharmacyQueue.some(v => v.id === selectedPatientForPrescription?.id);

                      if (isDirectPharmacy) {
                        // For direct pharmacy patients: dispense immediately and create billing

                        // Add medications as patient services for billing
                        for (const item of validItems) {
                          const medication = medications.find(m => m.id === item.medication_id);
                          if (medication) {
                            const quantity = parseInt(item.quantity) || 1;
                            const unitPrice = parseFloat(medication.unit_price) || 0;
                            const totalPrice = unitPrice * quantity;
                            
                            // Add to patient services
                            const serviceData = {
                              patient_id: selectedPatientForPrescription.patient_id,
                              service_id: null,
                              service_name: `${medication.name} - ${item.dosage}`,
                              quantity: quantity,
                              unit_price: unitPrice,
                              total_price: totalPrice,
                              service_date: new Date().toISOString().split('T')[0],
                              status: 'Completed',
                              notes: `Direct pharmacy: ${item.frequency}${item.instructions ? '. ' + item.instructions : ''}`
                            };
                            
                            await api.post('/patient-services', serviceData);

                            // Update stock
                            const currentStock = medication.stock_quantity || medication.quantity_in_stock || 0;
                            const newStock = Math.max(0, currentStock - quantity);
                            
                            await api.put(`/pharmacy/medications/${medication.id}`, {
                              stock_quantity: newStock,
                              quantity_in_stock: newStock
                            });
                            
                            // Update local state
                            setMedications(prev => prev.map(med => 
                              med.id === medication.id 
                                ? { ...med, stock_quantity: newStock, quantity_in_stock: newStock }
                                : med
                            ));

                          }
                        }
                        
                        // Create invoice for direct pharmacy medications
                        try {
                          const totalAmount = validItems.reduce((sum, item) => {
                            const medication = medications.find(m => m.id === item.medication_id);
                            const unitPrice = parseFloat(medication?.unit_price || '0') || 0;
                            const quantity = parseInt(item.quantity) || 1;
                            return sum + (unitPrice * quantity);
                          }, 0);

                          const invoiceRes = await api.post('/invoices', {
                            patient_id: selectedPatientForPrescription.patient_id,
                            invoice_date: new Date().toISOString().split('T')[0],
                            total_amount: totalAmount,
                            paid_amount: 0,
                            balance: totalAmount,
                            status: 'Pending',
                            notes: `Direct pharmacy medications`,
                            items: validItems.map(item => {
                              const medication = medications.find(m => m.id === item.medication_id);
                              const unitPrice = parseFloat(medication?.unit_price || '0') || 0;
                              const quantity = parseInt(item.quantity) || 1;
                              return {
                                service_name: `${medication?.name} - ${item.dosage}`,
                                description: `${item.frequency}${item.instructions ? '. ' + item.instructions : ''}`,
                                quantity: quantity,
                                unit_price: unitPrice,
                                total_price: unitPrice * quantity
                              };
                            })
                          });

                        } catch (error: any) {

                          toast.warning('Medications dispensed but invoice creation failed');
                        }
                        
                        // Update visit to billing stage
                        await api.put(`/visits/${selectedPatientForPrescription.id}`, {
                          pharmacy_status: 'Completed',
                          pharmacy_completed_at: new Date().toISOString(),
                          current_stage: 'billing',
                          billing_status: 'Pending',
                          notes: `${selectedPatientForPrescription.notes || ''} - Direct pharmacy medications dispensed`.trim()
                        });

                        toast.success(`${validItems.length} medication(s) dispensed! Patient moved to billing.`);
                        
                      } else {
                        // For prescription queue patients: create prescription as before

                        // Create prescription
                        const prescriptionData = {
                          patient_id: selectedPatientForPrescription.patient_id,
                          doctor_id: user?.id,
                          visit_id: selectedPatientForPrescription.id,
                          prescription_date: new Date().toISOString().split('T')[0],
                          diagnosis: 'Prescription queue',
                          notes: 'Prescription created by pharmacy staff',
                          items: validItems.map(item => {
                            const med = medications.find(m => m.id === item.medication_id);
                            return {
                              medication_id: med?.id || null,
                              medication_name: item.medication_name,
                              dosage: item.dosage,
                              frequency: item.frequency,
                              duration: item.duration,
                              quantity: parseInt(item.quantity) || 1,
                              instructions: item.instructions || ''
                            };
                          })
                        };

                        await api.post('/prescriptions', prescriptionData);
                        
                        // For prescription queue: just create prescription, don't decrease stock yet
                        // Stock will be decreased when prescription is actually dispensed
                        
                        // Update visit status to remove from queue
                        try {
                          await api.put(`/visits/${selectedPatientForPrescription.id}`, {
                            pharmacy_status: 'In Progress',
                            notes: `${selectedPatientForPrescription.notes || ''} - Prescription created by pharmacy staff`.trim()
                          });

                        } catch (visitError) {

                        }
                        
                        toast.success(`Prescription created with ${validItems.length} medication(s)! Patient removed from queue.`);
                      }
                      
                      // Remove from all queues immediately
                      setPatientQueue(prev => prev.filter(v => v.id !== selectedPatientForPrescription.id));
                      setDirectPharmacyQueue(prev => prev.filter(v => v.id !== selectedPatientForPrescription.id));
                      setPrescriptionQueue(prev => prev.filter(v => v.id !== selectedPatientForPrescription.id));
                      setCreatePrescriptionDialogOpen(false);
                      setSelectedPatientForPrescription(null);
                      setExistingPrescriptions([]);
                      setRemovedPrescriptionItems(new Set());
                      setNewPrescriptionItems([{
                        medication_id: '',
                        medication_name: '',
                        dosage: '',
                        frequency: '',
                        duration: '',
                        quantity: '',
                        instructions: ''
                      }]);
                      setMedicationSearchTerm(''); // Clear search
                      
                      // Refresh data
                      loadPharmacyData(false);
                    } catch (error: any) {

                      toast.error(error.response?.data?.error || 'Failed to create prescription');
                    }
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {directPharmacyQueue.some(v => v.id === selectedPatientForPrescription?.id) 
                    ? 'Add Medications' 
                    : prescriptionQueue.some(v => v.id === selectedPatientForPrescription?.id)
                    ? 'Dispense Prescription'
                    : 'Create Prescription'
                  }
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
