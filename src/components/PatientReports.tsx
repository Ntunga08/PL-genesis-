import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Search, Printer, Calendar as CalendarIcon, Loader2, FileText, User, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import api from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Patient = {
  id: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  email?: string;
  address?: string;
  blood_group?: string;
  created_at: string;
};

type PatientHistory = {
  appointments: any[];
  visits: any[];
  prescriptions: any[];
  labTests: any[];
  invoices: any[];
  totalSpent: number;
};

export default function PatientReports() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [patientHistory, setPatientHistory] = useState<PatientHistory | null>(null);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [showPreview, setShowPreview] = useState(false);
  const [systemSettings, setSystemSettings] = useState({
    hospital_name: 'Hospital Management System',
    hospital_address: '[Address to be configured]',
    hospital_phone: '[Phone to be configured]',
    hospital_email: '[Email to be configured]'
  });

  useEffect(() => {
    fetchPatients();
    fetchSystemSettings();
  }, []);

  const fetchSystemSettings = async () => {
    try {
      const { data } = await api.get('/settings');

      // Handle both formats: settings object or settingsArray
      let settings: any = {};
      if (data.settingsArray && Array.isArray(data.settingsArray)) {
        // Convert array to object
        data.settingsArray.forEach((setting: any) => {
          settings[setting.key] = setting.value;
        });
      } else if (data.settings) {
        settings = data.settings;
      }

      setSystemSettings({
        hospital_name: settings.hospital_name || 'Hospital Management System',
        hospital_address: settings.hospital_address || '[Address to be configured]',
        hospital_phone: settings.hospital_phone || '[Phone to be configured]',
        hospital_email: settings.hospital_email || '[Email to be configured]'
      });
    } catch (error) {

      // Keep default values
    }
  };

  useEffect(() => {
    if (patientHistory) {

    }
  }, [patientHistory]);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/patients', { params: { limit: 1000 } });
      setPatients(data.patients || []);
    } catch (error) {

      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientHistory = async (patientId: string) => {
    setLoadingHistory(true);
    try {
      const params: any = {};
      if (dateRange.from) params.from = dateRange.from.toISOString();
      if (dateRange.to) params.to = dateRange.to.toISOString();

      // Fetch all patient data
      const [appointmentsRes, prescriptionsRes, labTestsRes, invoicesRes, visitsRes] = await Promise.all([
        api.get(`/appointments`, { params: { ...params, patient_id: patientId } }).catch(() => ({ data: { appointments: [] } })),
        api.get(`/prescriptions`, { params: { ...params, patient_id: patientId } }).catch(() => ({ data: { prescriptions: [] } })),
        api.get(`/labs`, { params: { ...params, patient_id: patientId } }).catch(() => ({ data: { labTests: [] } })),
        api.get(`/billing/invoices`, { params: { ...params, patient_id: patientId } }).catch(() => ({ data: { invoices: [] } })),
        api.get(`/visits`, { params: { ...params, patient_id: patientId } }).catch(() => ({ data: { visits: [] } })),
      ]);

      const invoices = invoicesRes.data.invoices || [];
      const totalSpent = invoices
        .filter((inv: any) => inv.status === 'Paid')
        .reduce((sum: number, inv: any) => sum + Number(inv.total_amount || 0), 0);

      // Debug logging





      const appointments = appointmentsRes.data.appointments || [];
      const prescriptions = prescriptionsRes.data.prescriptions || [];
      const labTests = labTestsRes.data.labTests || [];
      const visits = visitsRes.data.visits || [];

      setPatientHistory({
        appointments,
        visits,
        prescriptions,
        labTests,
        invoices,
        totalSpent
      });
    } catch (error) {

      toast.error('Failed to load patient history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    fetchPatientHistory(patient.id);
  };

  const handlePrint = async () => {
    if (!selectedPatient || !patientHistory) {
      toast.error('Please select a patient first');
      return;
    }

    // Check billing status before printing
    try {
      const { checkBillingBeforePrint } = await import('@/utils/billingCheck');
      const canPrint = await checkBillingBeforePrint(selectedPatient.id);
      
      if (!canPrint) {
        return; // Billing check failed, don't print
      }
    } catch (error) {

      toast.error('Unable to verify billing status');
      return;
    }
    
    // Get the patient report content
    const patientPrint = document.getElementById('patient-report-print');
    if (!patientPrint) {
      toast.error('Report content not found');
      return;
    }
    
    // Create print element with proper isolation
    const printDiv = document.createElement('div');
    printDiv.id = 'patient-report-print-content';
    printDiv.className = 'patient-print-only';
    printDiv.style.display = 'none'; // Hide on screen
    
    // Create and add styles to head (not as innerHTML)
    const styleElement = document.createElement('style');
    styleElement.id = 'patient-print-styles';
    styleElement.textContent = `
      /* Hide patient print content on screen */
      .patient-print-only {
        display: none;
      }
      
      /* Show only patient print content when printing */
      @media print {
        @page {
          margin: 1cm;
          size: A4;
        }
        
        /* Hide everything first */
        body * {
          visibility: hidden !important;
        }
        
        /* Show only patient report */
        .patient-print-only {
          display: block !important;
          visibility: visible !important;
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          z-index: 9999 !important;
          font-family: 'Times New Roman', serif !important;
          line-height: 1.6 !important;
          color: #000 !important;
          padding: 0 !important;
          background: white !important;
        }
        
        .patient-print-only * {
          visibility: visible !important;
          display: block !important;
        }
        
        /* Header styling */
        .patient-print-only .report-header {
          text-align: center !important;
          border-bottom: 3px solid #1e40af !important;
          padding: 20px 0 !important;
          margin-bottom: 25px !important;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%) !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        .patient-print-only img {
          display: block !important;
          visibility: visible !important;
          width: 80px !important;
          height: 80px !important;
          margin: 0 auto 15px !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        .patient-print-only .hospital-name {
          font-size: 28px !important;
          font-weight: bold !important;
          color: #1e40af !important;
          margin: 10px 0 !important;
          text-transform: uppercase !important;
          letter-spacing: 2px !important;
        }
        
        .patient-print-only .report-title {
          font-size: 20px !important;
          color: #475569 !important;
          margin: 5px 0 !important;
          font-weight: 600 !important;
        }
        
        .patient-print-only .contact-info {
          font-size: 12px !important;
          color: #64748b !important;
          margin: 3px 0 !important;
        }
        
        /* Content sections */
        .patient-print-only .info-section {
          background: #f8fafc !important;
          padding: 15px !important;
          margin: 20px 0 !important;
          border-left: 4px solid #3b82f6 !important;
          border-radius: 0 6px 6px 0 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        .patient-print-only .section-title {
          font-size: 16px !important;
          font-weight: bold !important;
          color: #1e40af !important;
          margin: 0 0 15px 0 !important;
          border-bottom: 1px solid #cbd5e1 !important;
          padding-bottom: 5px !important;
        }
        
        .patient-print-only .info-grid {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 10px 20px !important;
        }
        
        .patient-print-only .info-item {
          margin: 8px 0 !important;
        }
        
        .patient-print-only .info-label {
          font-weight: bold !important;
          color: #374151 !important;
          font-size: 13px !important;
        }
        
        .patient-print-only .info-value {
          color: #1f2937 !important;
          font-size: 14px !important;
          margin-top: 2px !important;
        }
        
        /* Report ID box */
        .patient-print-only .report-id {
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%) !important;
          padding: 15px !important;
          text-align: center !important;
          margin: 20px 0 !important;
          border: 2px solid #3b82f6 !important;
          border-radius: 8px !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        .patient-print-only .report-id-title {
          font-size: 16px !important;
          font-weight: bold !important;
          color: #1e40af !important;
          margin-bottom: 5px !important;
        }
        
        .patient-print-only .report-id-details {
          font-family: 'Courier New', monospace !important;
          font-size: 12px !important;
          color: #374151 !important;
        }
        
        /* Footer */
        .patient-print-only .report-footer {
          margin-top: 40px !important;
          border-top: 3px solid #1e40af !important;
          padding-top: 20px !important;
          text-align: center !important;
          font-size: 11px !important;
          color: #6b7280 !important;
        }
        
        .patient-print-only .disclaimer {
          background: #fef3c7 !important;
          border: 1px solid #f59e0b !important;
          padding: 10px !important;
          margin-top: 20px !important;
          border-radius: 4px !important;
          font-size: 10px !important;
          text-align: center !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `;
    
    // Remove existing styles if any
    const existingStyles = document.getElementById('patient-print-styles');
    if (existingStyles) {
      existingStyles.remove();
    }
    
    // Add styles to head
    document.head.appendChild(styleElement);
    
    // Calculate patient age
    const calculateAge = (dob: string) => {
      if (!dob) return 'N/A';
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    };

    // Generate report ID
    const reportId = `PAT-RPT-${format(new Date(), 'yyyyMMdd')}-${selectedPatient.id.slice(-8).toUpperCase()}`;

    // Build content with professional styling
    const content = `
      <div class="report-header">
        <img src="/placeholder.svg" alt="Hospital Logo" style="width: 80px; height: 80px; margin: 0 auto 15px; display: block;" />
        <div class="hospital-name">${systemSettings.hospital_name}</div>
        <div class="report-title">PATIENT MEDICAL HISTORY REPORT</div>
        <div class="contact-info">📍 ${systemSettings.hospital_address}</div>
        <div class="contact-info">📞 ${systemSettings.hospital_phone} | ✉️ ${systemSettings.hospital_email}</div>
        <div class="contact-info">Medical Records Department</div>
      </div>

      <div class="report-id">
        <div class="report-id-title">📋 OFFICIAL MEDICAL HISTORY REPORT</div>
        <div class="report-id-details">
          Report ID: ${reportId} | Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')} | ${systemSettings.hospital_name}
        </div>
      </div>

      <div class="info-section">
        <div class="section-title">👤 Patient Information</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Full Name:</div>
            <div class="info-value">${selectedPatient.full_name || `${selectedPatient.first_name} ${selectedPatient.last_name}`}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Patient ID:</div>
            <div class="info-value">${selectedPatient.id}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Phone Number:</div>
            <div class="info-value">${selectedPatient.phone}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Gender:</div>
            <div class="info-value">${selectedPatient.gender}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Date of Birth:</div>
            <div class="info-value">${selectedPatient.date_of_birth ? format(new Date(selectedPatient.date_of_birth), 'MMM dd, yyyy') + ` (Age: ${calculateAge(selectedPatient.date_of_birth)})` : 'N/A'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Blood Group:</div>
            <div class="info-value">${selectedPatient.blood_group || 'Not Specified'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Email:</div>
            <div class="info-value">${selectedPatient.email || 'Not Provided'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Address:</div>
            <div class="info-value">${selectedPatient.address || 'Not Provided'}</div>
          </div>
        </div>
      </div>

      <div class="info-section">
        <div class="section-title">📊 Medical History Summary</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Total Appointments:</div>
            <div class="info-value">${patientHistory.appointments?.length || 0}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Total Prescriptions:</div>
            <div class="info-value">${patientHistory.prescriptions?.length || 0}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Total Lab Tests:</div>
            <div class="info-value">${patientHistory.labTests?.length || 0}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Total Amount Spent:</div>
            <div class="info-value">TSh ${(patientHistory.totalSpent || 0).toLocaleString()}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Registration Date:</div>
            <div class="info-value">${selectedPatient.created_at ? format(new Date(selectedPatient.created_at), 'MMM dd, yyyy') : 'N/A'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Last Visit:</div>
            <div class="info-value">${patientHistory.appointments?.length > 0 ? format(new Date(patientHistory.appointments[0].appointment_date), 'MMM dd, yyyy') : 'No visits recorded'}</div>
          </div>
        </div>
      </div>

      ${patientHistory.prescriptions?.length > 0 ? `
        <div class="info-section">
          <div class="section-title">💊 Recent Prescriptions</div>
          ${patientHistory.prescriptions.slice(0, 3).map((rx: any, index: number) => `
            <div class="info-item">
              <div class="info-label">Prescription ${index + 1}:</div>
              <div class="info-value">${format(new Date(rx.prescription_date || rx.created_at), 'MMM dd, yyyy')} - ${rx.medications?.length || 0} medication(s)</div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div class="report-footer">
        <div><strong>Generated by:</strong> ${systemSettings.hospital_name}</div>
        <div><strong>Report Date:</strong> ${format(new Date(), 'PPP')} at ${format(new Date(), 'p')}</div>
        <div><strong>Authorized by:</strong> Medical Records Department</div>
        
        <div class="disclaimer">
          <strong>CONFIDENTIAL MEDICAL RECORD</strong><br>
          This document contains confidential patient information protected by medical privacy laws.<br>
          Unauthorized disclosure is strictly prohibited. For queries: ${systemSettings.hospital_phone}
        </div>
      </div>
    `;
    
    printDiv.innerHTML = content;

    // Remove any existing print content
    const existingPrint = document.getElementById('patient-report-print-content');
    if (existingPrint) {
      existingPrint.remove();
    }

    // Add print content to page
    document.body.appendChild(printDiv);

    // Trigger print
    setTimeout(() => {

      window.print();
      
      // Clean up after printing
      setTimeout(() => {
        const printElement = document.getElementById('patient-report-print-content');
        const styleElement = document.getElementById('patient-print-styles');
        if (printElement) {
          printElement.remove();
        }
        if (styleElement) {
          styleElement.remove();
        }

      }, 1000);
    }, 100);
    
    toast.success('Print dialog opened');
  };

  const parseLabResult = (t: any): string => {
    if (t.result_value) return t.result_value;
    if (t.results) {
      try {
        const parsed = typeof t.results === 'string' ? JSON.parse(t.results) : t.results;
        if (parsed.results) {
          return Object.entries(parsed.results)
            .map(([k, rv]: any) => `${k}: ${rv?.value ?? rv}${rv?.unit ? ' ' + rv.unit : ''}`)
            .join(', ');
        }
        if (parsed.result_value) return parsed.result_value;
      } catch {}
    }
    if (Array.isArray(t.lab_results) && t.lab_results.length > 0) {
      return t.lab_results.map((r: any) => `${r.result_value}${r.unit ? ' ' + r.unit : ''}${r.abnormal_flag ? ' ⚠' : ''}`).join(', ');
    }
    return '';
  };

  const filteredPatients = patients.filter(p => {
    const fullName = p.full_name || `${p.first_name} ${p.last_name}`;
    return fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           p.phone.includes(searchTerm);
  });

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <>
      {/* No complex print styles needed - using new window approach */}
      {selectedPatient && patientHistory && (
        <div>{/* Placeholder for any future print styles if needed */}</div>
      )}

      {selectedPatient && patientHistory && (
        <style>{`
          /* Simple styles for the hidden print div */
          #patient-report-print {
            display: none;
          }
              
          
          /* Ensure proper display for elements */
          #patient-report-print div {
            display: block !important;
          }
          
          #patient-report-print span,
          #patient-report-print strong,
          #patient-report-print em {
            display: inline !important;
          }
          
          #patient-report-print table {
            display: table !important;
          }
          
          #patient-report-print thead {
            display: table-header-group !important;
          }
          
          #patient-report-print tbody {
            display: table-row-group !important;
          }
          
          #patient-report-print tr {
            display: table-row !important;
          }
          
          #patient-report-print td,
          #patient-report-print th {
            display: table-cell !important;
          }
          
          #patient-report-print p,
          #patient-report-print h1,
          #patient-report-print h2,
          #patient-report-print h3 {
            display: block !important;
          }
          
          /* Support flex layouts */
          #patient-report-print div[style*="display: flex"],
          #patient-report-print div[style*="display:flex"] {
            display: flex !important;
          }
          
          /* Page settings */
          @page {
            margin: 1cm;
            size: A4;
          }
          
          /* Position and style patient report */
          #patient-report-print { 
            display: block !important;
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100% !important;
            max-width: 210mm !important;
            padding: 0 !important;
            margin: 0 !important;
            font-family: Arial, sans-serif !important;
            font-size: 12pt !important;
            line-height: 1.4 !important;
            color: #000 !important;
          }
          
          /* Headers */
          #patient-report-print h1 {
            font-size: 20pt !important;
            font-weight: bold !important;
            margin: 0 0 10px 0 !important;
            color: #000 !important;
          }
          
          #patient-report-print h2 {
            font-size: 14pt !important;
            font-weight: bold !important;
            margin: 20px 0 10px 0 !important;
            padding-bottom: 5px !important;
            border-bottom: 1px solid #333 !important;
            color: #000 !important;
          }
          
          /* Paragraphs */
          #patient-report-print p {
            margin: 5px 0 !important;
            line-height: 1.4 !important;
          }
          
          /* Tables */
          #patient-report-print table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin: 10px 0 !important;
            page-break-inside: avoid !important;
          }
          
          #patient-report-print th {
            background-color: #f0f0f0 !important;
            font-weight: bold !important;
            text-align: left !important;
            padding: 8px !important;
            border: 1px solid #999 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          #patient-report-print td {
            padding: 6px 8px !important;
            border: 1px solid #ccc !important;
            vertical-align: top !important;
          }
          
          #patient-report-print tbody tr:nth-child(even) {
            background-color: #fafafa !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Divs and sections */
          #patient-report-print > div {
            page-break-inside: avoid !important;
          }
          
          /* Summary boxes */
          #patient-report-print div[style*="border: 1px solid"] {
            border: 1px solid #999 !important;
            padding: 10px !important;
            margin: 5px !important;
            background-color: #f9f9f9 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Prescription boxes */
          #patient-report-print div[style*="backgroundColor: '#f9f9f9'"] {
            background-color: #f0f0f0 !important;
            padding: 10px !important;
            margin-bottom: 10px !important;
            border-radius: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Status badges */
          #patient-report-print span[style*="padding: '2px 6px'"] {
            padding: 2px 6px !important;
            border: 1px solid #999 !important;
            border-radius: 3px !important;
            font-size: 10pt !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Footer */
          #patient-report-print div[style*="borderTop: '1px solid #ddd'"] {
            margin-top: 30px !important;
            padding-top: 15px !important;
            border-top: 1px solid #999 !important;
            font-size: 9pt !important;
            color: #666 !important;
            text-align: center !important;
          }
          
          /* Avoid page breaks */
          #patient-report-print h2,
          #patient-report-print table {
            page-break-after: avoid !important;
          }
          
          #patient-report-print tr {
            page-break-inside: avoid !important;
          }
        }
      `}</style>
      )}

      <Card className="no-print">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Patient Reports
              </CardTitle>
              <CardDescription>Search and print patient medical history reports</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Patient Search */}
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label>Search Patient</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            {/* Patient List */}
            {searchTerm && (
              <div className="border rounded-lg max-h-60 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </div>
                ) : filteredPatients.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No patients found
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredPatients.slice(0, 10).map((patient) => (
                      <button
                        key={patient.id}
                        onClick={() => handleSelectPatient(patient)}
                        className="w-full p-3 text-left hover:bg-muted/50 transition-colors"
                      >
                        <div className="font-medium">
                          {patient.full_name || `${patient.first_name} ${patient.last_name}`}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {patient.phone} • {patient.gender} • {calculateAge(patient.date_of_birth)} years
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected Patient & Date Filter */}
          {selectedPatient && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">
                    {selectedPatient.full_name || `${selectedPatient.first_name} ${selectedPatient.last_name}`}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Patient ID: {selectedPatient.id}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowPreview(true)} disabled={loadingHistory || !patientHistory} className="gap-2">
                    <Eye className="h-4 w-4" />
                    View Report
                  </Button>
                  <Button onClick={handlePrint} className="gap-2" disabled={loadingHistory || !patientHistory}>
                    <Printer className="h-4 w-4" />
                    Print Report
                  </Button>
                </div>
              </div>

              {/* Date Range Filter */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>From Date (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? format(dateRange.from, 'PPP') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) => {
                          setDateRange(prev => ({ ...prev, from: date }));
                          if (selectedPatient) fetchPatientHistory(selectedPatient.id);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex-1">
                  <Label>To Date (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.to ? format(dateRange.to, 'PPP') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) => {
                          setDateRange(prev => ({ ...prev, to: date }));
                          if (selectedPatient) fetchPatientHistory(selectedPatient.id);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Patient History Summary */}
              {loadingHistory ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : patientHistory ? (
                <>
                  <div className="grid gap-4 md:grid-cols-5">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Appointments</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{patientHistory.appointments?.length || 0}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Prescriptions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{patientHistory.prescriptions?.length || 0}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Medications</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {patientHistory.prescriptions?.reduce((sum, rx) => 
                            sum + (rx.medications?.length || 0), 0
                          ) || 0}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Lab Tests</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{patientHistory.labTests?.length || 0}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">TSh {(patientHistory.totalSpent || 0).toLocaleString()}</div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      {selectedPatient && patientHistory && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-5 pb-3 border-b flex-shrink-0 flex flex-row items-center justify-between">
              <DialogTitle className="text-lg">
                Report Preview — {selectedPatient.full_name || `${selectedPatient.first_name} ${selectedPatient.last_name}`}
              </DialogTitle>
              <Button onClick={() => { setShowPreview(false); handlePrint(); }} className="gap-2 mr-8">
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </DialogHeader>
            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-6 text-sm">

                {/* Patient Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-bold text-blue-900 mb-3 text-base">Patient Information</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-muted-foreground">Name:</span> <strong>{selectedPatient.full_name}</strong></div>
                    <div><span className="text-muted-foreground">Phone:</span> {selectedPatient.phone}</div>
                    <div><span className="text-muted-foreground">Gender:</span> {selectedPatient.gender}</div>
                    <div><span className="text-muted-foreground">DOB:</span> {selectedPatient.date_of_birth ? format(new Date(selectedPatient.date_of_birth), 'dd MMM yyyy') : 'N/A'} ({calculateAge(selectedPatient.date_of_birth)} yrs)</div>
                    <div><span className="text-muted-foreground">Blood Group:</span> <strong className="text-red-600">{selectedPatient.blood_group || 'N/A'}</strong></div>
                    <div><span className="text-muted-foreground">Registered:</span> {selectedPatient.created_at ? format(new Date(selectedPatient.created_at), 'dd MMM yyyy') : 'N/A'}</div>
                  </div>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Visits', value: patientHistory.visits?.length || 0 },
                    { label: 'Prescriptions', value: patientHistory.prescriptions?.length || 0 },
                    { label: 'Lab Tests', value: patientHistory.labTests?.length || 0 },
                    { label: 'Total Spent', value: `TSh ${(patientHistory.totalSpent || 0).toLocaleString()}` },
                  ].map(s => (
                    <div key={s.label} className="border rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="font-bold text-lg">{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Visit Journey Timeline */}
                {patientHistory.visits?.length > 0 && (
                  <div>
                    <h3 className="font-bold text-blue-900 mb-3 border-b pb-1">Visit History & Clinical Journey</h3>
                    <div className="space-y-5">
                      {patientHistory.visits.map((v: any, i: number) => {
                        // Enrich visit with linked data
                        const visitPrescriptions = patientHistory.prescriptions.filter((rx: any) => rx.visit_id === v.id);
                        const visitLabTests = patientHistory.labTests.filter((t: any) => t.visit_id === v.id);
                        const visitInvoice = patientHistory.invoices.find((inv: any) => inv.visit_id === v.id);

                        // Parse ICD-10 codes
                        let icd10Codes: {code:string;description:string}[] = [];
                        if (v.icd10_code) {
                          try { icd10Codes = JSON.parse(v.icd10_code); } catch { icd10Codes = [{ code: v.icd10_code, description: v.icd10_description || '' }]; }
                        }

                        return (
                          <div key={i} className="border rounded-lg overflow-hidden shadow-sm">

                            {/* ── Visit Header ── */}
                            <div className="bg-slate-700 text-white px-4 py-2.5 flex flex-wrap gap-3 items-center text-xs">
                              <span className="font-bold text-sm">
                                Visit #{patientHistory.visits.length - i}
                              </span>
                              <span className="text-slate-300">{v.created_at ? format(new Date(v.created_at), 'dd MMM yyyy, HH:mm') : 'N/A'}</span>
                              {v.visit_type && <Badge variant="outline" className="text-[10px] border-slate-400 text-slate-200">{v.visit_type}</Badge>}
                              <Badge className={`text-[10px] ml-auto ${v.overall_status === 'Completed' ? 'bg-green-600' : 'bg-yellow-600'}`}>
                                {v.overall_status || 'Active'}
                              </Badge>
                            </div>

                            <div className="divide-y">

                              {/* ── Reception ── */}
                              {v.reception_status && (
                                <div className="px-4 py-3 flex items-start gap-3">
                                  <span className={`mt-1 shrink-0 w-2 h-2 rounded-full ${v.reception_status === 'Completed' ? 'bg-green-500' : 'bg-orange-400'}`} />
                                  <div className="flex-1 space-y-0.5 text-xs">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-semibold text-slate-700">Reception</span>
                                      <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${v.reception_status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{v.reception_status}</span>
                                    </div>
                                    {v.reception_completed_at && <p className="text-muted-foreground">Check-in: <strong>{format(new Date(v.reception_completed_at), 'dd MMM yyyy, HH:mm')}</strong></p>}
                                    {v.visit_type && <p className="text-muted-foreground">Visit type: <strong>{v.visit_type}</strong></p>}
                                  </div>
                                </div>
                              )}

                              {/* ── Nurse / Triage ── */}
                              {v.nurse_status && (() => {
                                let vitals: Record<string, any> = {};
                                if (v.vital_signs && typeof v.vital_signs === 'object' && Object.keys(v.vital_signs).length > 0) {
                                  vitals = v.vital_signs;
                                } else if (v.nurse_notes && typeof v.nurse_notes === 'string' && v.nurse_notes.trim().startsWith('{')) {
                                  try { vitals = JSON.parse(v.nurse_notes); } catch {}
                                }
                                const nurseNote = v.nurse_notes && typeof v.nurse_notes === 'string' && !v.nurse_notes.trim().startsWith('{') ? v.nurse_notes : null;
                                return (
                                  <div className="px-4 py-3 flex items-start gap-3">
                                    <span className={`mt-1 shrink-0 w-2 h-2 rounded-full ${v.nurse_status === 'Completed' ? 'bg-green-500' : v.nurse_status === 'In Progress' ? 'bg-blue-500' : 'bg-orange-400'}`} />
                                    <div className="flex-1 space-y-1 text-xs">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-slate-700">Nurse / Triage</span>
                                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${v.nurse_status === 'Completed' ? 'bg-green-100 text-green-700' : v.nurse_status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{v.nurse_status}</span>
                                      </div>
                                      {v.nurse_completed_at && <p className="text-muted-foreground">Completed: <strong>{format(new Date(v.nurse_completed_at), 'dd MMM yyyy, HH:mm')}</strong></p>}
                                      {Object.keys(vitals).length > 0 ? (
                                        <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 mt-1">
                                          {Object.entries(vitals).map(([k, val]) => (
                                            <span key={k}><span className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}:</span> <strong>{String(val)}</strong></span>
                                          ))}
                                        </div>
                                      ) : <p className="text-muted-foreground italic">No vitals recorded</p>}
                                      {nurseNote && <p className="text-muted-foreground italic">{nurseNote}</p>}
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* ── Doctor ── */}
                              {v.doctor_status && (
                                <div className="px-4 py-3 flex items-start gap-3 bg-blue-50/30">
                                  <span className={`mt-1 shrink-0 w-2 h-2 rounded-full ${v.doctor_status === 'Completed' ? 'bg-green-500' : v.doctor_status === 'In Progress' || v.doctor_status === 'In Consultation' ? 'bg-blue-500' : 'bg-orange-400'}`} />
                                  <div className="flex-1 space-y-0.5 text-xs">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-semibold text-slate-700">Doctor Consultation</span>
                                      <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${v.doctor_status === 'Completed' ? 'bg-green-100 text-green-700' : v.doctor_status === 'In Progress' || v.doctor_status === 'In Consultation' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{v.doctor_status}</span>
                                    </div>
                                    {v.doctor_started_at && <p className="text-muted-foreground">Started: <strong>{format(new Date(v.doctor_started_at), 'dd MMM yyyy, HH:mm')}</strong></p>}
                                    {v.doctor_completed_at && <p className="text-muted-foreground">Completed: <strong>{format(new Date(v.doctor_completed_at), 'dd MMM yyyy, HH:mm')}</strong></p>}
                                    {v.chief_complaint && <p><span className="text-muted-foreground">Chief Complaint:</span> <strong>{v.chief_complaint}</strong></p>}
                                    {(v.doctor_diagnosis || v.provisional_diagnosis) && <p><span className="text-muted-foreground">Diagnosis (Dx):</span> <strong className="text-blue-900">{v.doctor_diagnosis || v.provisional_diagnosis}</strong></p>}
                                    {icd10Codes.length > 0 && (
                                      <div className="flex flex-wrap gap-1 items-center pt-0.5">
                                        <span className="text-muted-foreground">ICD-10:</span>
                                        {icd10Codes.map((c: any) => (
                                          <span key={c.code} className="inline-flex items-center gap-1 bg-blue-100 border border-blue-300 rounded px-1.5 py-0.5 text-[10px]">
                                            <span className="font-mono font-bold text-blue-800">{c.code}</span>
                                            <span className="text-blue-700">{c.description}</span>
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    {v.doctor_notes && <p><span className="text-muted-foreground">Clinical Notes:</span> {v.doctor_notes}</p>}
                                    {v.treatment_plan && <p><span className="text-muted-foreground">Treatment Plan (Tx):</span> {v.treatment_plan}</p>}
                                    {!v.doctor_diagnosis && !v.provisional_diagnosis && !v.chief_complaint && !v.doctor_notes && <p className="text-muted-foreground italic">No consultation notes saved yet</p>}
                                  </div>
                                </div>
                              )}

                              {/* ── Lab ── */}
                              {v.lab_status && v.lab_status !== 'Not Required' && (
                                <div className="px-4 py-3 flex items-start gap-3">
                                  <span className={`mt-1 shrink-0 w-2 h-2 rounded-full ${v.lab_status === 'Completed' ? 'bg-green-500' : 'bg-orange-400'}`} />
                                  <div className="flex-1 space-y-1 text-xs">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-semibold text-slate-700">Laboratory</span>
                                      <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${v.lab_status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{v.lab_status}</span>
                                    </div>
                                    {v.lab_completed_at && <p className="text-muted-foreground">Completed: <strong>{format(new Date(v.lab_completed_at), 'dd MMM yyyy, HH:mm')}</strong></p>}
                                    {visitLabTests.length > 0 ? (
                                      <table className="w-full border-collapse mt-1">
                                        <thead>
                                          <tr className="bg-purple-50 text-purple-800">
                                            <th className="text-left px-2 py-1 border border-purple-100">Test</th>
                                            <th className="text-left px-2 py-1 border border-purple-100">Status</th>
                                            <th className="text-left px-2 py-1 border border-purple-100">Result</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {visitLabTests.map((t: any, ti: number) => {
                                            let resultText = t.result_value || '';
                                            if (!resultText && t.results) {
                                              try {
                                                const parsed = typeof t.results === 'string' ? JSON.parse(t.results) : t.results;
                                                if (parsed.results) resultText = Object.entries(parsed.results).map(([k, rv]: any) => `${k}: ${rv?.value ?? rv}${rv?.unit ? ' '+rv.unit : ''}`).join(', ');
                                              } catch {}
                                            }
                                            if (!resultText && Array.isArray(t.lab_results)) {
                                              resultText = t.lab_results.map((r: any) => `${r.result_value}${r.unit ? ' '+r.unit : ''}${r.abnormal_flag ? ' ⚠' : ''}`).join(', ');
                                            }
                                            return (
                                              <tr key={ti} className={ti % 2 === 0 ? 'bg-white' : 'bg-purple-50/20'}>
                                                <td className="px-2 py-1 border border-purple-100 font-medium">{t.test_name}</td>
                                                <td className="px-2 py-1 border border-purple-100"><span className={`px-1 py-0.5 rounded text-[10px] ${t.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{t.status}</span></td>
                                                <td className="px-2 py-1 border border-purple-100">{resultText || <span className="italic text-muted-foreground">Pending</span>}</td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    ) : <p className="text-muted-foreground italic">No tests linked to this visit</p>}
                                  </div>
                                </div>
                              )}

                              {/* ── Pharmacy ── */}
                              {v.pharmacy_status && v.pharmacy_status !== 'Not Required' && (
                                <div className="px-4 py-3 flex items-start gap-3 bg-orange-50/20">
                                  <span className={`mt-1 shrink-0 w-2 h-2 rounded-full ${v.pharmacy_status === 'Completed' ? 'bg-green-500' : 'bg-orange-400'}`} />
                                  <div className="flex-1 space-y-1 text-xs">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-semibold text-slate-700">Pharmacy</span>
                                      <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${v.pharmacy_status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{v.pharmacy_status}</span>
                                    </div>
                                    {v.pharmacy_completed_at && <p className="text-muted-foreground">Dispensed: <strong>{format(new Date(v.pharmacy_completed_at), 'dd MMM yyyy, HH:mm')}</strong></p>}
                                    {visitPrescriptions.length > 0 ? visitPrescriptions.map((rx: any, ri: number) => (
                                      <div key={ri} className="mt-1">
                                        {rx.doctor?.full_name && <p className="text-muted-foreground mb-1">Prescribed by: <strong>Dr. {rx.doctor.full_name}</strong></p>}
                                        <table className="w-full border-collapse">
                                          <thead>
                                            <tr className="bg-orange-50 text-orange-800">
                                              <th className="text-left px-2 py-1 border border-orange-100">Medication</th>
                                              <th className="text-left px-2 py-1 border border-orange-100">Dosage</th>
                                              <th className="text-left px-2 py-1 border border-orange-100">Frequency</th>
                                              <th className="text-left px-2 py-1 border border-orange-100">Duration</th>
                                              <th className="text-center px-2 py-1 border border-orange-100">Qty</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {(rx.medications || rx.items || []).map((med: any, mi: number) => (
                                              <tr key={mi} className={mi % 2 === 0 ? 'bg-white' : 'bg-orange-50/30'}>
                                                <td className="px-2 py-1 border border-orange-100 font-medium">{med.medication_name || '—'}</td>
                                                <td className="px-2 py-1 border border-orange-100">{med.dosage || '—'}</td>
                                                <td className="px-2 py-1 border border-orange-100">{med.frequency || '—'}</td>
                                                <td className="px-2 py-1 border border-orange-100">{med.duration || '—'}</td>
                                                <td className="px-2 py-1 border border-orange-100 text-center font-bold">{med.quantity || '—'}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )) : <p className="text-muted-foreground italic">No prescriptions linked to this visit</p>}
                                  </div>
                                </div>
                              )}

                              {/* ── Billing ── */}
                              {v.billing_status && v.billing_status !== 'Not Required' && (
                                <div className="px-4 py-3 flex items-start gap-3">
                                  <span className={`mt-1 shrink-0 w-2 h-2 rounded-full ${v.billing_status === 'Completed' ? 'bg-green-500' : 'bg-orange-400'}`} />
                                  <div className="flex-1 space-y-0.5 text-xs">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-semibold text-slate-700">Billing</span>
                                      <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${v.billing_status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{v.billing_status}</span>
                                    </div>
                                    {v.billing_completed_at && <p className="text-muted-foreground">Paid at: <strong>{format(new Date(v.billing_completed_at), 'dd MMM yyyy, HH:mm')}</strong></p>}
                                    {visitInvoice ? (
                                      <>
                                        <p><span className="text-muted-foreground">Invoice #:</span> <span className="font-mono font-medium">{visitInvoice.invoice_number}</span></p>
                                        <p><span className="text-muted-foreground">Total:</span> <strong>TSh {Number(visitInvoice.total_amount || 0).toLocaleString()}</strong></p>
                                        <p><span className="text-muted-foreground">Paid:</span> <strong className="text-green-700">TSh {Number(visitInvoice.paid_amount || 0).toLocaleString()}</strong></p>
                                        {Number(visitInvoice.total_amount) - Number(visitInvoice.paid_amount || 0) > 0 && (
                                          <p><span className="text-muted-foreground">Balance:</span> <strong className="text-red-600">TSh {(Number(visitInvoice.total_amount) - Number(visitInvoice.paid_amount || 0)).toLocaleString()}</strong></p>
                                        )}
                                        <p><span className="text-muted-foreground">Status:</span> <span className={`font-medium ${visitInvoice.status === 'Paid' ? 'text-green-700' : 'text-red-600'}`}>{visitInvoice.status}</span></p>
                                      </>
                                    ) : <p className="text-muted-foreground italic">No invoice found for this visit</p>}
                                  </div>
                                </div>
                              )}

                              {/* ── Triage / Vitals (legacy fallback if no nurse_status) ── */}
                              {!v.nurse_status && v.vital_signs && Object.keys(v.vital_signs).length > 0 && (
                                <div className="px-4 py-3">
                                  <p className="text-[11px] font-bold text-green-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                                    🩺 Triage / Vitals
                                  </p>
                                  <div className="grid grid-cols-3 gap-x-6 gap-y-1 text-xs">
                                    {Object.entries(v.vital_signs).map(([k, val]) => (
                                      <span key={k}>
                                        <span className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}:</span>{' '}
                                        <strong>{String(val)}</strong>
                                      </span>
                                    ))}
                                  </div>
                                  {v.nurse_notes && typeof v.nurse_notes === 'string' && !v.nurse_notes.startsWith('{') && (
                                    <p className="text-xs mt-2 text-muted-foreground italic">Nurse notes: {v.nurse_notes}</p>
                                  )}
                                </div>
                              )}

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Prescriptions */}
                {patientHistory.prescriptions?.length > 0 && (
                  <div>
                    <h3 className="font-bold text-blue-900 mb-2 border-b pb-1">Prescriptions & Medications</h3>
                    {patientHistory.prescriptions.map((rx: any, i: number) => (
                      <div key={i} className="mb-3 border rounded-lg overflow-hidden">
                        <div className="bg-blue-50 px-3 py-2 text-xs flex gap-4">
                          <span><strong>Date:</strong> {format(new Date(rx.prescription_date || rx.created_at), 'dd MMM yyyy')}</span>
                          {rx.doctor?.full_name && <span><strong>Doctor:</strong> {rx.doctor.full_name}</span>}
                          <span><strong>Status:</strong> <Badge variant={rx.status === 'Completed' ? 'default' : 'secondary'} className="text-[10px]">{rx.status}</Badge></span>
                          {rx.diagnosis && <span><strong>Diagnosis:</strong> {rx.diagnosis}</span>}
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Medication</TableHead>
                              <TableHead>Dosage</TableHead>
                              <TableHead>Frequency</TableHead>
                              <TableHead>Duration</TableHead>
                              <TableHead>Qty</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(rx.medications || rx.items || []).map((med: any, j: number) => (
                              <TableRow key={j}>
                                <TableCell className="font-medium">{med.medication_name || '—'}</TableCell>
                                <TableCell>{med.dosage || '—'}</TableCell>
                                <TableCell>{med.frequency || '—'}</TableCell>
                                <TableCell>{med.duration || '—'}</TableCell>
                                <TableCell>{med.quantity || '—'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                  </div>
                )}

                {/* Lab Tests */}
                {patientHistory.labTests?.length > 0 && (
                  <div>
                    <h3 className="font-bold text-blue-900 mb-2 border-b pb-1">Laboratory Tests</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Test Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Result</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {patientHistory.labTests.map((t: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell>{format(new Date(t.test_date || t.created_at), 'dd MMM yyyy')}</TableCell>
                            <TableCell className="font-medium">{t.test_name}</TableCell>
                            <TableCell>{t.test_type || '—'}</TableCell>
                            <TableCell><Badge variant={t.status === 'Completed' ? 'default' : 'secondary'} className="text-[10px]">{t.status}</Badge></TableCell>
                            <TableCell className="text-xs">{parseLabResult(t) || <span className="italic text-muted-foreground">Pending</span>}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Billing */}
                {patientHistory.invoices?.length > 0 && (
                  <div>
                    <h3 className="font-bold text-blue-900 mb-2 border-b pb-1">Billing Summary</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Paid</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {patientHistory.invoices.map((inv: any, i: number) => {
                          const bal = Number(inv.total_amount) - Number(inv.paid_amount || 0);
                          return (
                            <TableRow key={i}>
                              <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                              <TableCell>{format(new Date(inv.invoice_date), 'dd MMM yyyy')}</TableCell>
                              <TableCell className="text-right">TSh {Number(inv.total_amount).toLocaleString()}</TableCell>
                              <TableCell className="text-right text-green-700">TSh {Number(inv.paid_amount || 0).toLocaleString()}</TableCell>
                              <TableCell className={`text-right font-semibold ${bal > 0 ? 'text-red-600' : 'text-green-600'}`}>TSh {bal.toLocaleString()}</TableCell>
                              <TableCell><Badge variant={inv.status === 'Paid' ? 'default' : 'secondary'} className="text-[10px]">{inv.status}</Badge></TableCell>
                            </TableRow>
                          );
                        })}
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell colSpan={2}>Total</TableCell>
                          <TableCell className="text-right">TSh {patientHistory.invoices.reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right text-green-700">TSh {patientHistory.totalSpent.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-red-600">TSh {(patientHistory.invoices.reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0) - patientHistory.totalSpent).toLocaleString()}</TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}

              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}

      {/* Print View */}
      {selectedPatient && patientHistory && (
        <div id="patient-report-print" style={{ display: 'none' }}>
          <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px 30px', lineHeight: '1.4' }}>
            {/* Header with Logo */}
            <div style={{ marginBottom: '20px', borderBottom: '2px solid #2563eb', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                {/* Hospital Logo */}
                <div style={{ width: '80px', height: '95px', flexShrink: 0 }}>
                  <img 
                    src="/placeholder.svg" 
                    alt="Hospital Logo" 
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
                
                {/* Hospital Info */}
                <div style={{ flex: 1, textAlign: 'center', paddingLeft: '20px' }}>
                  <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', color: '#1e40af', fontWeight: 'bold', letterSpacing: '1.5px' }}>
                    {systemSettings.hospital_name.toUpperCase()}
                  </h1>
                  <p style={{ margin: '0', fontSize: '13px', color: '#6b7280', lineHeight: '1.5' }}>
                    Excellence in Healthcare | Comprehensive Medical Services
                  </p>
                </div>
                
                {/* Report ID */}
                <div style={{ width: '80px', textAlign: 'right' }}>
                  <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '4px' }}>Report ID</div>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e40af', fontFamily: 'monospace' }}>
                    {selectedPatient.id.substring(0, 8).toUpperCase()}
                  </div>
                </div>
              </div>
              
              <div style={{ textAlign: 'center', paddingTop: '15px', borderTop: '1px solid #e2e8f0' }}>
                <p style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#374151', fontWeight: '600' }}>PATIENT MEDICAL HISTORY REPORT</p>
                <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>
                  Generated on {format(new Date(), 'PPP')} at {format(new Date(), 'p')}
                </p>
              </div>
            </div>

            {/* Patient Demographics */}
            <div style={{ marginBottom: '20px', backgroundColor: '#f8fafc', padding: '15px 20px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '16px', color: '#1e40af', fontWeight: 'bold', marginBottom: '12px', marginTop: '0' }}>
                PATIENT INFORMATION
              </h2>
              <table style={{ width: '100%', fontSize: '14px', lineHeight: '2' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px 0', fontWeight: '600', width: '35%', color: '#475569' }}>Name:</td>
                    <td style={{ padding: '8px 0', color: '#1e293b', fontSize: '15px' }}>
                      {selectedPatient.full_name || `${selectedPatient.first_name} ${selectedPatient.last_name}`}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', fontWeight: '600', color: '#475569' }}>Patient ID:</td>
                    <td style={{ padding: '8px 0', color: '#1e293b', fontFamily: 'monospace', fontSize: '13px' }}>{selectedPatient.id}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', fontWeight: '600', color: '#475569' }}>Date of Birth:</td>
                    <td style={{ padding: '8px 0', color: '#1e293b' }}>
                      {format(new Date(selectedPatient.date_of_birth), 'PPP')} ({calculateAge(selectedPatient.date_of_birth)} years old)
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', fontWeight: '600', color: '#475569' }}>Gender:</td>
                    <td style={{ padding: '8px 0', color: '#1e293b' }}>{selectedPatient.gender}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', fontWeight: '600', color: '#475569' }}>Phone:</td>
                    <td style={{ padding: '8px 0', color: '#1e293b' }}>{selectedPatient.phone}</td>
                  </tr>
                  {selectedPatient.email && (
                    <tr>
                      <td style={{ padding: '8px 0', fontWeight: '600', color: '#475569' }}>Email:</td>
                      <td style={{ padding: '8px 0', color: '#1e293b' }}>{selectedPatient.email}</td>
                    </tr>
                  )}
                  {selectedPatient.blood_group && (
                    <tr>
                      <td style={{ padding: '8px 0', fontWeight: '600', color: '#475569' }}>Blood Group:</td>
                      <td style={{ padding: '8px 0', color: '#dc2626', fontWeight: 'bold', fontSize: '16px' }}>{selectedPatient.blood_group}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Appointment History */}
            {patientHistory.appointments.length > 0 && (
              <div style={{ marginBottom: '35px', pageBreakInside: 'avoid' }}>
                <h2 style={{ fontSize: '18px', color: '#1e40af', fontWeight: 'bold', marginBottom: '18px', marginTop: '0', paddingBottom: '10px', borderBottom: '2px solid #3b82f6' }}>
                  APPOINTMENT HISTORY
                </h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                      <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Date</th>
                      <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Time</th>
                      <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Doctor</th>
                      <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Reason</th>
                      <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patientHistory.appointments.map((appointment: any, idx: number) => (
                      <tr key={idx}>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                          {format(new Date(appointment.appointment_date), 'MMM dd, yyyy')}
                        </td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{appointment.appointment_time || 'N/A'}</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{appointment.doctor?.full_name || 'N/A'}</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{appointment.reason || 'N/A'}</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{appointment.status || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Prescriptions & Medications Provided */}
            <div style={{ marginBottom: '35px', pageBreakInside: 'avoid' }}>
              <h2 style={{ fontSize: '18px', color: '#1e40af', fontWeight: 'bold', marginBottom: '18px', marginTop: '0', paddingBottom: '10px', borderBottom: '2px solid #3b82f6' }}>
                PRESCRIPTIONS & MEDICATIONS PROVIDED
              </h2>
              {(() => {
                const hasData = patientHistory.prescriptions && patientHistory.prescriptions.length > 0;

                return null;
              })()}
              {patientHistory.prescriptions && patientHistory.prescriptions.length > 0 ? (
                <>
                  {patientHistory.prescriptions.map((rx: any, rxIdx: number) => (
                    <div key={rxIdx} style={{ marginBottom: '25px', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ backgroundColor: '#eff6ff', padding: '15px 20px', borderBottom: '1px solid #bfdbfe' }}>
                      <strong style={{ color: '#1e40af' }}>📋 Prescription Date:</strong> <span style={{ color: '#1e293b' }}>{format(new Date(rx.prescription_date || rx.created_at), 'MMM dd, yyyy')}</span>
                      {rx.doctor?.full_name && (
                        <span style={{ marginLeft: '20px' }}>
                          <strong style={{ color: '#1e40af' }}>Doctor:</strong> <span style={{ color: '#1e293b' }}>{rx.doctor.full_name}</span>
                        </span>
                      )}
                      {rx.status && (
                        <span style={{ marginLeft: '20px' }}>
                          <strong style={{ color: '#1e40af' }}>Status:</strong> <span style={{ color: rx.status === 'Active' ? '#059669' : '#6b7280', fontWeight: '600' }}>{rx.status}</span>
                        </span>
                      )}
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#dbeafe' }}>
                          <th style={{ border: '1px solid #93c5fd', padding: '12px 15px', textAlign: 'left', color: '#1e40af', fontWeight: '600' }}>Medication</th>
                          <th style={{ border: '1px solid #93c5fd', padding: '12px 15px', textAlign: 'left', color: '#1e40af', fontWeight: '600' }}>Dosage</th>
                          <th style={{ border: '1px solid #93c5fd', padding: '12px 15px', textAlign: 'left', color: '#1e40af', fontWeight: '600' }}>Frequency</th>
                          <th style={{ border: '1px solid #93c5fd', padding: '12px 15px', textAlign: 'left', color: '#1e40af', fontWeight: '600' }}>Duration</th>
                          <th style={{ border: '1px solid #93c5fd', padding: '12px 15px', textAlign: 'center', color: '#1e40af', fontWeight: '600' }}>Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(rx.medications || []).map((med: any, medIdx: number) => (
                          <tr key={medIdx} style={{ backgroundColor: medIdx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                            <td style={{ border: '1px solid #e2e8f0', padding: '12px 15px', color: '#1e293b', fontWeight: '500' }}>{med.medication_name || 'N/A'}</td>
                            <td style={{ border: '1px solid #e2e8f0', padding: '12px 15px', color: '#475569' }}>{med.dosage || 'N/A'}</td>
                            <td style={{ border: '1px solid #e2e8f0', padding: '12px 15px', color: '#475569' }}>{med.frequency || 'N/A'}</td>
                            <td style={{ border: '1px solid #e2e8f0', padding: '12px 15px', color: '#475569' }}>{med.duration || 'N/A'}</td>
                            <td style={{ border: '1px solid #e2e8f0', padding: '12px 15px', textAlign: 'center', color: '#1e293b', fontWeight: '600' }}>{med.quantity || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {rx.instructions && (
                      <div style={{ fontSize: '13px', color: '#475569', backgroundColor: '#fef3c7', padding: '15px 20px', borderTop: '1px solid #fde047', lineHeight: '1.6' }}>
                        <strong style={{ color: '#92400e' }}>⚠️ Instructions:</strong> <span style={{ color: '#78350f' }}>{rx.instructions}</span>
                      </div>
                    )}
                  </div>
                  ))}
                </>
              ) : (
                <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                  No prescriptions found for this patient.
                </p>
              )}
            </div>

            {/* Lab Tests & Results */}
            <div style={{ marginBottom: '35px', pageBreakInside: 'avoid' }}>
              <h2 style={{ fontSize: '18px', color: '#1e40af', fontWeight: 'bold', marginBottom: '18px', marginTop: '0', paddingBottom: '10px', borderBottom: '2px solid #3b82f6' }}>
                LABORATORY TESTS & RESULTS
              </h2>
              {(() => {
                const hasData = patientHistory.labTests && patientHistory.labTests.length > 0;

                return null;
              })()}
              {patientHistory.labTests && patientHistory.labTests.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                      <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Date Ordered</th>
                      <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Test Name</th>
                      <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Test Type</th>
                      <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Result</th>
                      <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Status</th>
                      <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patientHistory.labTests.map((test: any, idx: number) => (
                      <tr key={idx}>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                          {format(new Date(test.test_date || test.created_at), 'MMM dd, yyyy')}
                        </td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{test.test_name || 'N/A'}</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{test.test_type || 'N/A'}</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                          {(() => {
                            const r = parseLabResult(test);
                            return r || (test.status === 'Completed' ? 'No values recorded' : 'Pending');
                          })()}
                          {test.reference_range && (
                            <div style={{ fontSize: '10px', color: '#666' }}>
                              Normal: {test.reference_range}
                            </div>
                          )}
                        </td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                          <span style={{ 
                            padding: '2px 6px', 
                            borderRadius: '3px',
                            backgroundColor: test.status === 'Completed' ? '#d4edda' : 
                                           test.status === 'Pending' ? '#fff3cd' : '#f8d7da',
                            color: test.status === 'Completed' ? '#155724' : 
                                   test.status === 'Pending' ? '#856404' : '#721c24',
                            fontSize: '11px'
                          }}>
                            {test.status || 'N/A'}
                          </span>
                        </td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                          {test.completed_at ? format(new Date(test.completed_at), 'MMM dd, yyyy') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                  No lab tests found for this patient.
                </p>
              )}
            </div>

            {/* Billing Summary */}
            {patientHistory.invoices.length > 0 && (
              <div style={{ marginBottom: '35px', pageBreakInside: 'avoid' }}>
                <h2 style={{ fontSize: '18px', color: '#1e40af', fontWeight: 'bold', marginBottom: '18px', marginTop: '0', paddingBottom: '10px', borderBottom: '2px solid #3b82f6' }}>
                  BILLING SUMMARY
                </h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                      <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Invoice #</th>
                      <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Date</th>
                      <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>Amount</th>
                      <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patientHistory.invoices.map((invoice: any, idx: number) => (
                      <tr key={idx}>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{invoice.invoice_number}</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                          {format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}
                        </td>
                        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
                          TSh {Number(invoice.total_amount).toLocaleString()}
                        </td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{invoice.status}</td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                      <td colSpan={2} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
                        Total Spent:
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
                        TSh {patientHistory.totalSpent.toLocaleString()}
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer - Compact */}
            <div style={{ marginTop: '30px', paddingTop: '12px', borderTop: '1px solid #cbd5e1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#64748b', lineHeight: '1.3' }}>
                <div>
                  <span style={{ fontWeight: '600', color: '#475569' }}>{systemSettings.hospital_name}</span> | 
                  📍 {systemSettings.hospital_address} | 
                  📞 {systemSettings.hospital_phone} | 
                  ✉️ {systemSettings.hospital_email}
                </div>
                <div style={{ textAlign: 'right' }}>
                  Generated: {format(new Date(), 'dd/MM/yyyy HH:mm')} | Patient ID: {selectedPatient.id}
                </div>
              </div>
              <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '8px', color: '#9ca3af' }}>
                Confidential medical report - Unauthorized disclosure prohibited
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
