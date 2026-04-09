import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ServiceFormDialog } from '@/components/ServiceFormDialog';
import api from '@/lib/api';
import { Calendar, Users, Activity, Heart, Thermometer, Loader2, Stethoscope, Clock, Search, Printer, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function NurseDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [vitalSigns, setVitalSigns] = useState<any[]>([]);
  const [labResultsReady, setLabResultsReady] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showVitalsDialog, setShowVitalsDialog] = useState(false);
  const [showLabResultsDialog, setShowLabResultsDialog] = useState(false);
  const [selectedVisitForResults, setSelectedVisitForResults] = useState<any>(null);
  const [labTestResults, setLabTestResults] = useState<any[]>([]);
  const [showOrderLabTestsDialog, setShowOrderLabTestsDialog] = useState(false);
  const [selectedPatientForLabTests, setSelectedPatientForLabTests] = useState<any>(null);
  const [availableLabTests, setAvailableLabTests] = useState<any[]>([]);
  const [selectedLabTests, setSelectedLabTests] = useState<string[]>([]);
  const [showServiceFormDialog, setShowServiceFormDialog] = useState(false);
  const [selectedVisitForForm, setSelectedVisitForForm] = useState<any>(null);
  const [serviceFormTemplate, setServiceFormTemplate] = useState<any>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [showRegisterPatientDialog, setShowRegisterPatientDialog] = useState(false);
  const [newPatientForm, setNewPatientForm] = useState({
    full_name: '',
    phone: '',
    gender: '',
    date_of_birth: '',
    address: ''
  });
  
  // Patient selection mode for lab registration
  const [isNewPatientMode, setIsNewPatientMode] = useState(true);
  const [labPatientSearchTerm, setLabPatientSearchTerm] = useState('');
  
  // Patient services for Quick Service visits
  const [patientServices, setPatientServices] = useState<Record<string, any[]>>({});
  const [labPatientSearchResults, setLabPatientSearchResults] = useState<any[]>([]);
  const [selectedLabPatient, setSelectedLabPatient] = useState<any>(null);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [hospitalSettings, setHospitalSettings] = useState({
    hospital_name: 'Hospital Management System',
    hospital_address: '[Address to be configured]',
    hospital_phone: '[Phone to be configured]',
    hospital_email: '[Email to be configured]'
  });
  const [logoUrl, setLogoUrl] = useState('/placeholder.svg');
  const [vitalsForm, setVitalsForm] = useState({
    blood_pressure: '',
    heart_rate: '',
    temperature: '',
    oxygen_saturation: '',
    weight: '',
    weight_unit: 'kg',
    height: '',
    height_unit: 'cm',
    muac: '',
    muac_unit: 'cm',
    notes: ''
  });
  const [notesForm, setNotesForm] = useState({
    patient_id: '',
    notes: '',
    category: 'general'
  });
  const [scheduleForm, setScheduleForm] = useState({
    patient_id: '',
    appointment_date: '',
    appointment_time: '',
    reason: '',
    department_id: ''
  });
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayAppointments: 0,
    pendingVitals: 0,
    completedTasks: 0
  });
  const [loading, setLoading] = useState(true); // Initial load only
  const [refreshing, setRefreshing] = useState(false); // Background refresh
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [pendingVisits, setPendingVisits] = useState<any[]>([]);

  // FIXED: Professional lab report print function that actually works
  const printLabReport = (patient: any, labTests: any[]) => {


    // Validate required data
    if (!patient) {
      toast.error('Patient data is required for printing');
      return;
    }
    
    if (!labTests || labTests.length === 0) {
      toast.error('No lab test data available for printing');
      return;
    }

    // Use static data (no API calls that can fail)
    const billingInfo = null;

    // Generate patient age safely
    let patientAge = 'N/A';
    try {
      if (patient?.date_of_birth) {
        const dob = new Date(patient.date_of_birth);
        patientAge = String(new Date().getFullYear() - dob.getFullYear());
      }
    } catch (e) {
      patientAge = 'N/A';
    }

    // Generate report ID safely
    const today = new Date();
    const dateStr = today.getFullYear() + String(today.getMonth() + 1).padStart(2, '0') + String(today.getDate()).padStart(2, '0');
    const reportId = `HMC-LAB-${dateStr}-${String(patient?.id || '000').slice(-8)}`;




    // Generate current date/time strings safely
    const currentDate = today.toLocaleDateString();
    const currentTime = today.toLocaleTimeString();
    const currentDateTime = `${currentDate} ${currentTime}`;

    // Format patient DOB safely
    let patientDOB = 'N/A';
    try {
      if (patient?.date_of_birth) {
        patientDOB = new Date(patient.date_of_birth).toLocaleDateString() + ` (Age: ${patientAge})`;
      }
    } catch (e) {
      patientDOB = 'N/A';
    }

    // Create print element with proper approach
    const printDiv = document.createElement('div');
    printDiv.id = 'lab-report-print-content';
    printDiv.className = 'print-only-content';
    printDiv.style.display = 'none'; // Hide on screen
    
    // Create and add styles to head (not as innerHTML)
    const styleElement = document.createElement('style');
    styleElement.id = 'lab-print-styles';
    styleElement.textContent = `
      /* Hide print content on screen */
      .print-only-content {
        display: none;
      }
      
      /* Show only print content when printing */
      @media print {
        @page {
          margin: 1cm;
          size: A4;
        }
        
        body * {
          visibility: hidden !important;
        }
        
        .print-only-content {
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
        
        .print-only-content * {
          visibility: visible !important;
          display: block !important;
        }
        
        /* Header styling */
        .print-only-content .report-header {
          text-align: center !important;
          border-bottom: 3px solid #1e40af !important;
          padding: 20px 0 !important;
          margin-bottom: 25px !important;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%) !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        .print-only-content img {
          display: block !important;
          visibility: visible !important;
          width: 80px !important;
          height: 80px !important;
          margin: 0 auto 15px !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        .print-only-content .hospital-name {
          font-size: 28px !important;
          font-weight: bold !important;
          color: #1e40af !important;
          margin: 10px 0 !important;
          text-transform: uppercase !important;
          letter-spacing: 2px !important;
        }
        
        .print-only-content .report-title {
          font-size: 20px !important;
          color: #475569 !important;
          margin: 5px 0 !important;
          font-weight: 600 !important;
        }
        
        .print-only-content .contact-info {
          font-size: 12px !important;
          color: #64748b !important;
          margin: 3px 0 !important;
        }
        
        /* Content sections */
        .print-only-content .info-section {
          background: #f8fafc !important;
          padding: 15px !important;
          margin: 20px 0 !important;
          border-left: 4px solid #3b82f6 !important;
          border-radius: 0 6px 6px 0 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        .print-only-content .section-title {
          font-size: 16px !important;
          font-weight: bold !important;
          color: #1e40af !important;
          margin: 0 0 15px 0 !important;
          border-bottom: 1px solid #cbd5e1 !important;
          padding-bottom: 5px !important;
        }
        
        .print-only-content .info-grid {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 10px 20px !important;
        }
        
        .print-only-content .info-item {
          margin: 8px 0 !important;
        }
        
        .print-only-content .info-label {
          font-weight: bold !important;
          color: #374151 !important;
          font-size: 13px !important;
        }
        
        .print-only-content .info-value {
          color: #1f2937 !important;
          font-size: 14px !important;
          margin-top: 2px !important;
        }
        
        /* Test sections */
        .print-only-content .test-section {
          margin: 20px 0 !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 6px !important;
          overflow: hidden !important;
          page-break-inside: avoid !important;
        }
        
        .print-only-content .test-header {
          background: #3b82f6 !important;
          color: white !important;
          padding: 12px 15px !important;
          font-weight: bold !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        .print-only-content .test-content {
          padding: 15px !important;
          background: white !important;
        }
        
        /* Report ID box */
        .print-only-content .report-id {
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%) !important;
          padding: 15px !important;
          text-align: center !important;
          margin: 20px 0 !important;
          border: 2px solid #3b82f6 !important;
          border-radius: 8px !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        .print-only-content .report-id-title {
          font-size: 16px !important;
          font-weight: bold !important;
          color: #1e40af !important;
          margin-bottom: 5px !important;
        }
        
        .print-only-content .report-id-details {
          font-family: 'Courier New', monospace !important;
          font-size: 12px !important;
          color: #374151 !important;
        }
        
        /* Billing notice */
        .print-only-content .billing-notice {
          background: #fef3c7 !important;
          border: 2px solid #f59e0b !important;
          padding: 15px !important;
          margin: 15px 0 !important;
          text-align: center !important;
          border-radius: 6px !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        /* Footer */
        .print-only-content .report-footer {
          margin-top: 40px !important;
          border-top: 3px solid #1e40af !important;
          padding-top: 20px !important;
        }
        
        .print-only-content .signatures {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 40px !important;
          margin-top: 40px !important;
        }
        
        .print-only-content .signature-box {
          text-align: center !important;
        }
        
        .print-only-content .signature-line {
          border-top: 2px solid #374151 !important;
          padding-top: 8px !important;
          margin-top: 40px !important;
          font-weight: bold !important;
        }
        
        .print-only-content .signature-subtitle {
          font-size: 11px !important;
          color: #6b7280 !important;
          margin-top: 5px !important;
        }
        
        .print-only-content .disclaimer {
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
    const existingStyles = document.getElementById('lab-print-styles');
    if (existingStyles) {
      existingStyles.remove();
    }
    
    // Add styles to head
    document.head.appendChild(styleElement);
    
    // Build content with professional styling
    const content = `
      <div class="report-header">
        <img src="${logoUrl}" alt="Hospital Logo" style="width: 80px; height: 80px; margin: 0 auto 15px; display: block; object-fit: contain;" onerror="this.src='/placeholder.svg'" />
        <div class="hospital-name">${hospitalSettings.hospital_name}</div>
        <div class="report-title">LABORATORY TEST REPORT</div>
        <div class="contact-info">📍 ${hospitalSettings.hospital_address}</div>
        <div class="contact-info">📞 ${hospitalSettings.hospital_phone} | ✉️ ${hospitalSettings.hospital_email}</div>
        <div class="contact-info">Laboratory Department</div>
      </div>

      <div class="report-id">
        <div class="report-id-title">📋 OFFICIAL LABORATORY REPORT</div>
        <div class="report-id-details">
          Report ID: ${reportId} | Generated: ${currentDateTime} | ${hospitalSettings.hospital_name}
        </div>
      </div>

      <div class="info-section">
        <div class="section-title">👤 Patient Information</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Patient ID:</div>
            <div class="info-value">PAT-${String(patient?.id || '000').slice(-6)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Full Name:</div>
            <div class="info-value">${patient?.full_name || 'N/A'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Phone Number:</div>
            <div class="info-value">${patient?.phone || 'N/A'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Date of Birth:</div>
            <div class="info-value">${patientDOB}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Gender:</div>
            <div class="info-value">${patient?.gender || 'N/A'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Blood Group:</div>
            <div class="info-value">${patient?.blood_group || 'Not Specified'}</div>
          </div>
        </div>
      </div>

      <div class="billing-notice">
        <strong>💳 BILLING STATUS:</strong> Patient must complete payment at billing counter before discharge.<br>
        <small>Lab test charges will be calculated at billing. This report can be reprinted if needed.</small>
      </div>

      ${labTests.map((test, index) => `
        <div class="test-section">
          <div class="test-header">
            🔬 ${index + 1}. ${test.test_name || 'Lab Test'}
            <div style="font-size: 12px; font-weight: normal; margin-top: 5px;">
              Status: ✅ Completed | Date: ${test.completed_at ? new Date(test.completed_at).toLocaleDateString() : 'N/A'} | 
              Technician: ${test.performed_by || 'Lab Staff'}
            </div>
          </div>
          <div class="test-content">
            <div class="info-item">
              <div class="info-label">Test Code:</div>
              <div class="info-value">${test.test_code || test.id || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Category:</div>
              <div class="info-value">${test.test_type || test.category || 'General'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Result:</div>
              <div class="info-value">${test.result_value || 'Test completed - Results available'}</div>
            </div>
            ${test.reference_range ? `
              <div class="info-item">
                <div class="info-label">Reference Range:</div>
                <div class="info-value">${test.reference_range}</div>
              </div>
            ` : ''}
            ${test.notes ? `
              <div class="info-item">
                <div class="info-label">Notes:</div>
                <div class="info-value">${test.notes}</div>
              </div>
            ` : ''}
          </div>
        </div>
      `).join('')}

      <div class="report-footer">
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">🔬 Laboratory Technician:</div>
            <div class="info-value">${labTests[0]?.performed_by || 'Lab Staff'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">👩‍⚕️ Reviewed by:</div>
            <div class="info-value">Nurse ${user?.full_name || 'Staff'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">🏥 Department:</div>
            <div class="info-value">Laboratory Services</div>
          </div>
          <div class="info-item">
            <div class="info-label">📅 Generated:</div>
            <div class="info-value">${currentDateTime}</div>
          </div>
          <div class="info-item">
            <div class="info-label">💻 System:</div>
            <div class="info-value">${hospitalSettings.hospital_name} - HMS v2.0</div>
          </div>
          <div class="info-item">
            <div class="info-label">🏥 Status:</div>
            <div class="info-value"><strong>READY FOR BILLING</strong></div>
          </div>
        </div>

        <div class="signatures">
          <div class="signature-box">
            <div class="signature-line">Laboratory Technician</div>
            <div class="signature-subtitle">Print Name, Signature & Date</div>
            <div class="signature-subtitle">License No: _____________</div>
          </div>
          <div class="signature-box">
            <div class="signature-line">Reviewing Nurse</div>
            <div class="signature-subtitle">Print Name, Signature & Date</div>
            <div class="signature-subtitle">License No: _____________</div>
          </div>
        </div>

        <div class="disclaimer">
          <strong>IMPORTANT NOTICE:</strong> This is an official laboratory report generated by ${hospitalSettings.hospital_name}.<br>
          Any alterations or modifications to this report are strictly prohibited.<br>
          For queries, contact the Laboratory Department at ${hospitalSettings.hospital_phone}
        </div>
      </div>
    `;
    
    printDiv.innerHTML = content;

    // Remove any existing print content
    const existingPrint = document.getElementById('lab-report-print-content');
    if (existingPrint) {
      existingPrint.remove();
    }

    // Add print content to page
    document.body.appendChild(printDiv);


    // Trigger print
    setTimeout(() => {

      window.print();
      toast.success(`Lab report for ${patient.full_name} opened for printing`);
      
      // Clean up after printing
      setTimeout(() => {
        const printElement = document.getElementById('lab-report-print-content');
        const styleElement = document.getElementById('lab-print-styles');
        if (printElement) {
          printElement.remove();
        }
        if (styleElement) {
          styleElement.remove();
        }

      }, 1000);
    }, 100);
  };

  // Generate HTML content for printing
  const generatePrintHTML = (patient: any, labTests: any[], billingInfo: any) => {
    return `
      <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              line-height: 1.5; 
              color: #333;
              background: white;
            }
            .letterhead { 
              text-align: center; 
              border-bottom: 3px solid #1e40af; 
              padding: 20px; 
              margin-bottom: 25px; 
              background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            }
            .logo-section {
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 15px;
            }
            .text-logo {
              font-size: 60px;
              margin-right: 20px;
              width: 80px;
              height: 80px;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 50%;
              border: 3px solid #1e40af;
              background: white;
            }
            .hospital-name h1 { 
              color: #1e40af; 
              margin: 0; 
              font-size: 28px; 
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .hospital-name .subtitle { 
              color: #475569; 
              margin: 5px 0 0 0; 
              font-size: 18px;
              font-weight: 600;
              text-transform: uppercase;
            }
            .letterhead .hospital-info { 
              color: #64748b; 
              margin: 3px 0; 
              font-size: 13px;
            }
            .patient-section { 
              background: #f8fafc; 
              padding: 15px; 
              margin-bottom: 20px; 
              border-left: 4px solid #3b82f6;
            }
            .patient-section h3 { 
              color: #1e40af; 
              margin: 0 0 15px 0; 
              font-size: 16px;
            }
            .patient-grid-print {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px 20px;
            }
            .patient-row {
              margin: 8px 0;
              overflow: hidden;
              border-bottom: 1px dotted #cbd5e1;
              padding-bottom: 5px;
            }
            .patient-row .label {
              font-weight: bold;
              color: #374151;
              font-size: 13px;
            }
            .patient-row .value {
              color: #1f2937;
              font-size: 14px;
              margin-top: 2px;
            }
            .test-container { 
              margin-bottom: 25px; 
              border: 1px solid #e2e8f0;
              page-break-inside: avoid;
            }
            .test-header { 
              background: #3b82f6; 
              color: white;
              padding: 12px 15px; 
              margin: 0;
            }
            .test-header h4 { 
              margin: 0; 
              font-size: 16px;
            }
            .test-info {
              font-size: 13px;
              margin-top: 5px;
            }
            .results-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 0;
            }
            .results-table th { 
              background: #f1f5f9; 
              padding: 10px 8px; 
              text-align: left;
              font-weight: bold; 
              color: #374151;
              border-bottom: 2px solid #e2e8f0;
              font-size: 14px;
            }
            .results-table td { 
              padding: 10px 8px; 
              border-bottom: 1px solid #f1f5f9;
              font-size: 14px;
            }
            .parameter-name { 
              font-weight: bold;
            }
            .result-value { 
              font-weight: bold;
              color: #1e40af;
            }
            .status-normal { 
              color: #16a34a; 
              font-weight: bold;
              background: #dcfce7;
              padding: 3px 6px;
              border-radius: 3px;
              font-size: 11px;
            }
            .status-abnormal { 
              color: #dc2626; 
              font-weight: bold;
              background: #fee2e2;
              padding: 3px 6px;
              border-radius: 3px;
              font-size: 11px;
            }
            .interpretation-box { 
              background: #eff6ff; 
              padding: 12px; 
              border-left: 4px solid #3b82f6; 
              margin: 15px;
            }
            .interpretation-title {
              font-weight: bold;
              color: #1e40af;
              margin-bottom: 5px;
            }
            .billing-notice { 
              background: #fef3c7; 
              border: 2px solid #f59e0b; 
              padding: 15px; 
              margin: 15px 0; 
              text-align: center;
              border-radius: 6px;
            }
            .billing-notice strong {
              color: #92400e;
              font-size: 16px;
            }
            .payment-info {
              text-align: left;
            }
            .payment-details {
              margin-top: 8px;
              font-size: 14px;
              color: #374151;
              background: rgba(255,255,255,0.7);
              padding: 10px;
              border-radius: 4px;
            }
            .footer-section { 
              margin-top: 30px; 
              border-top: 3px solid #1e40af; 
              padding-top: 20px; 
            }
            .footer-section h4 {
              color: #1e40af;
              margin: 0 0 15px 0;
              font-size: 16px;
            }
            .footer-grid-print {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px 20px;
              margin-bottom: 20px;
            }
            .footer-row {
              margin: 8px 0;
              overflow: hidden;
              border-bottom: 1px dotted #cbd5e1;
              padding-bottom: 5px;
            }
            .footer-row .label {
              font-weight: bold;
              color: #374151;
              font-size: 13px;
            }
            .footer-row .value {
              color: #1f2937;
              font-size: 14px;
              margin-top: 2px;
            }
            .disclaimer {
              background: #fef3c7;
              border: 1px solid #f59e0b;
              padding: 10px;
              margin-top: 20px;
              border-radius: 4px;
              font-size: 11px;
              text-align: center;
            }
            .signature-area { 
              margin-top: 40px; 
              overflow: hidden;
            }
            .signature-box { 
              float: left;
              width: 45%;
              text-align: center;
              margin: 0 2.5%;
            }
            .signature-line {
              border-top: 2px solid #374151; 
              padding-top: 8px;
              margin-top: 40px;
              font-weight: bold;
            }
            .signature-subtitle {
              font-size: 12px; 
              color: #6b7280;
              margin-top: 5px;
            }
            .report-id {
              background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
              padding: 15px;
              text-align: center;
              margin: 20px 0;
              border: 2px solid #3b82f6;
              border-radius: 8px;
            }
            .report-header {
              font-size: 16px;
              font-weight: bold;
              color: #1e40af;
              margin-bottom: 5px;
            }
            .report-details {
              font-family: monospace;
              font-size: 12px;
              color: #374151;
            }
            .clearfix::after {
              content: "";
              display: table;
              clear: both;
            }
            @media print {
              body { margin: 0; padding: 15px; }
              .no-print { display: none !important; }
              .test-container { page-break-inside: avoid; }
              .letterhead { background: white !important; }
            }
          </style>
        </head>
        <body>
          <div class="letterhead">
            <div class="logo-section">
              <img src="${logoUrl}" alt="Hospital Logo" style="width: 60px; height: 60px; object-fit: contain; margin-right: 15px;" onerror="this.src='/placeholder.svg'" />
              <div class="hospital-name">
                <h1>${hospitalSettings.hospital_name}</h1>
                <div class="subtitle">LABORATORY TEST REPORT</div>
              </div>
            </div>
            <div class="hospital-info">📍 [Address to be configured]</div>
            <div class="hospital-info">📞 Emergency: [Phone to be configured] | 🌐 [Website to be configured]</div>
            <div class="hospital-info">✉️ [Email to be configured] | Laboratory Services</div>
          </div>
          
          <div class="patient-section">
            <h3>👤 Patient Information</h3>
            <div class="patient-grid-print">
              <div class="patient-row">
                <div class="label">Patient ID:</div>
                <div class="value">${patient?.id ? `PAT-${String(patient.id).padStart(6, '0')}` : 'N/A'}</div>
              </div>
              <div class="patient-row">
                <div class="label">Full Name:</div>
                <div class="value">${patient?.full_name || 'N/A'}</div>
              </div>
              <div class="patient-row">
                <div class="label">Phone Number:</div>
                <div class="value">${patient?.phone || 'N/A'}</div>
              </div>
              <div class="patient-row">
                <div class="label">Date of Birth:</div>
                <div class="value">${(() => {
                  if (!patient?.date_of_birth) return 'N/A';
                  try {
                    const dob = new Date(patient.date_of_birth);
                    const age = new Date().getFullYear() - dob.getFullYear();
                    return format(dob, 'MMM dd, yyyy') + ` (Age: ${age})`;
                  } catch (e) {
                    return 'Invalid date';
                  }
                })()}</div>
              </div>
              <div class="patient-row">
                <div class="label">Gender:</div>
                <div class="value">${patient?.gender || 'N/A'}</div>
              </div>
              <div class="patient-row">
                <div class="label">Blood Group:</div>
                <div class="value">${patient?.blood_group || 'Not Specified'}</div>
              </div>
              <div class="patient-row">
                <div class="label">Address:</div>
                <div class="value">${patient?.address || 'Not Provided'}</div>
              </div>
              <div class="patient-row">
                <div class="label">Registration Date:</div>
                <div class="value">${(() => {
                  if (!patient?.created_at) return 'N/A';
                  try {
                    return format(new Date(patient.created_at), 'MMM dd, yyyy');
                  } catch (e) {
                    return 'Invalid date';
                  }
                })()}</div>
              </div>
              <div class="patient-row">
                <div class="label">Report Generated:</div>
                <div class="value">${format(new Date(), 'MMM dd, yyyy HH:mm')}</div>
              </div>
              <div class="patient-row">
                <div class="label">Generated By:</div>
                <div class="value">Nurse ${user?.full_name || 'Staff'}</div>
              </div>
            </div>
          </div>

          <div class="report-id">
            <div class="report-header">
              <strong>📋 OFFICIAL LABORATORY REPORT</strong>
            </div>
            <div class="report-details">
              Report ID: HMS-LAB-${format(new Date(), 'yyyyMMdd')}-${String(patient?.id || Math.floor(Math.random() * 1000)).padStart(4, '0')} | 
              Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')} | 
              Hospital Management System
            </div>
          </div>

          <div class="billing-notice">
            ${billingInfo ? `
              <div class="payment-info">
                <strong>💳 PAYMENT STATUS: ${billingInfo.payment_status || 'PENDING'}</strong><br>
                <div class="payment-details">
                  Total Amount: ${billingInfo.total_amount ? `${billingInfo.currency || 'TZS'} ${billingInfo.total_amount.toLocaleString()}` : 'Calculating...'}<br>
                  ${billingInfo.payment_method ? `Payment Method: ${billingInfo.payment_method}<br>` : ''}
                  ${billingInfo.payment_date ? `Paid On: ${format(new Date(billingInfo.payment_date), 'MMM dd, yyyy HH:mm')}<br>` : ''}
                  ${billingInfo.receipt_number ? `Receipt No: ${billingInfo.receipt_number}<br>` : ''}
                  Status: ${billingInfo.payment_status === 'Paid' ? '✅ PAYMENT COMPLETED' : '⏳ PAYMENT REQUIRED AT BILLING COUNTER'}
                </div>
              </div>
            ` : `
              <strong>💳 BILLING STATUS:</strong> Patient must complete payment at billing counter before discharge.<br>
              <small>Lab test charges will be calculated at billing. This report can be reprinted if needed.</small>
            `}
          </div>

          ${labTests.map((test, index) => {
            let results = {};
            let interpretation = '';
            let testDate = '';
            
            try {
              if (typeof test.results === 'string') {
                const parsedResults = JSON.parse(test.results);
                results = parsedResults?.results || parsedResults || {};
                interpretation = parsedResults?.interpretation || '';
                testDate = parsedResults?.test_date || '';
              } else if (test.results && typeof test.results === 'object') {
                results = test.results?.results || test.results;
                interpretation = test.results?.interpretation || '';
                testDate = test.results?.test_date || '';
              }
            } catch (e) {

              results = {};
            }

            const hasResults = Object.keys(results).length > 0;

            return `
              <div class="test-container">
                <div class="test-header">
                  <h4>🔬 ${index + 1}. ${test.test_name || 'Lab Test'}</h4>
                  <div class="test-info">
                    Test Code: ${test.test_code || test.id || 'N/A'} | 
                    Category: ${test.test_type || test.category || 'General'} | 
                    Status: ✅ Completed | 
                    Performed: ${(() => {
                      const testPerformedDate = testDate || test.completed_at || test.test_date;
                      if (!testPerformedDate) return 'N/A';
                      try {
                        return format(new Date(testPerformedDate), 'MMM dd, yyyy HH:mm');
                      } catch (e) {
                        return 'Invalid date';
                      }
                    })()} | 
                    Technician: ${test.performed_by || 'Lab Staff'}
                  </div>
                </div>
                
                ${hasResults ? `
                  <table class="results-table">
                    <thead>
                      <tr>
                        <th>Parameter</th>
                        <th>Result</th>
                        <th>Unit</th>
                        <th>Reference Range</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${Object.entries(results).map(([param, data]: [string, any]) => {
                        const isNormal = data.status === 'Normal' || data.status === 'normal';
                        return `
                          <tr>
                            <td class="parameter-name">${param}</td>
                            <td class="result-value">${data.value || data.result_value || 'N/A'}</td>
                            <td>${data.unit || '-'}</td>
                            <td>${data.normal_range || data.reference_range || '-'}</td>
                            <td>
                              <span class="${isNormal ? 'status-normal' : 'status-abnormal'}">
                                ${isNormal ? 'NORMAL' : 'ABNORMAL'}
                              </span>
                            </td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                ` : `
                  <div style="padding: 20px; text-align: center; color: #6b7280;">
                    <p>Test completed - Detailed results being processed</p>
                    ${test.results && typeof test.results === 'string' ? `
                      <div style="background: #f8fafc; padding: 15px; margin: 10px 0; text-align: left;">
                        <strong>Raw Results:</strong><br>
                        <pre style="white-space: pre-wrap; font-family: monospace; font-size: 12px;">${test.results}</pre>
                      </div>
                    ` : ''}
                  </div>
                `}
                
                ${interpretation ? `
                  <div class="interpretation-box">
                    <div class="interpretation-title">Clinical Interpretation:</div>
                    <div>${interpretation}</div>
                  </div>
                ` : hasResults ? `
                  <div class="interpretation-box">
                    <div class="interpretation-title">Clinical Interpretation:</div>
                    <div>
                      ${Object.values(results).every((r: any) => r.status === 'Normal' || r.status === 'normal') 
                        ? 'All parameters are within normal limits. No immediate medical intervention required.' 
                        : 'Some parameters may require medical attention. Please consult with healthcare provider.'}
                    </div>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}

          <div class="footer-section">
            <h4>📋 Report Verification & Authorization</h4>
            <div class="footer-grid-print">
              <div class="footer-row">
                <div class="label">🔬 Laboratory Technician:</div>
                <div class="value">${labTests[0]?.performed_by || 'Lab Staff'}</div>
              </div>
              <div class="footer-row">
                <div class="label">👩‍⚕️ Reviewed by Nurse:</div>
                <div class="value">${user?.full_name || 'Nursing Staff'}</div>
              </div>
              <div class="footer-row">
                <div class="label">🏥 Department:</div>
                <div class="value">Laboratory Services</div>
              </div>
              <div class="footer-row">
                <div class="label">📅 Report Generated:</div>
                <div class="value">${format(new Date(), 'MMM dd, yyyy HH:mm')}</div>
              </div>
              <div class="footer-row">
                <div class="label">💻 System:</div>
                <div class="value">Hospital Management System - HMS v2.0</div>
              </div>
              <div class="footer-row">
                <div class="label">🏥 Status:</div>
                <div class="value"><strong>READY FOR BILLING & DISCHARGE</strong></div>
              </div>
            </div>
            
            <div class="signature-area clearfix">
              <div class="signature-box">
                <div class="signature-line">Laboratory Technician</div>
                <div class="signature-subtitle">Print Name, Signature & Date</div>
                <div class="signature-subtitle">License No: _____________</div>
              </div>
              <div class="signature-box">
                <div class="signature-line">Reviewing Nurse</div>
                <div class="signature-subtitle">Print Name, Signature & Date</div>
                <div class="signature-subtitle">License No: _____________</div>
              </div>
            </div>
            
            <div class="disclaimer">
              <p><strong>IMPORTANT NOTICE:</strong> This is an official laboratory report generated by Hospital Management System. 
              Any alterations or modifications to this report are strictly prohibited. For queries, contact the Laboratory Department at [Phone to be configured].</p>
            </div>
          </div>
      </style>
      
      <div class="letterhead">
        <div class="logo-section">
          <img src="${logoUrl}" alt="Hospital Logo" style="width: 60px; height: 60px; object-fit: contain; margin-right: 15px;" onerror="this.src='/placeholder.svg'" />
          <div class="hospital-name">
            <h1>${hospitalSettings.hospital_name}</h1>
            <div class="subtitle">LABORATORY TEST REPORT</div>
          </div>
        </div>
        <div class="hospital-info">📍 [Address to be configured]</div>
        <div class="hospital-info">📞 Emergency: [Phone to be configured] | 🌐 [Website to be configured]</div>
        <div class="hospital-info">✉️ [Email to be configured] | Laboratory Department</div>
      </div>
      
      <div class="patient-section">
        <h3>👤 Patient Information</h3>
        <div class="patient-grid-print">
          <div class="patient-row">
            <div class="label">Patient ID:</div>
            <div class="value">\${patient?.id ? \`PAT-\${String(patient.id).padStart(6, '0')}\` : 'N/A'}</div>
          </div>
          <div class="patient-row">
            <div class="label">Full Name:</div>
            <div class="value">\${patient?.full_name || 'N/A'}</div>
          </div>
          <div class="patient-row">
            <div class="label">Phone Number:</div>
            <div class="value">\${patient?.phone || 'N/A'}</div>
          </div>
          <div class="patient-row">
            <div class="label">Date of Birth:</div>
            <div class="value">\${(() => {
              if (!patient?.date_of_birth) return 'N/A';
              try {
                const dob = new Date(patient.date_of_birth);
                const age = new Date().getFullYear() - dob.getFullYear();
                return format(dob, 'MMM dd, yyyy') + \` (Age: \${age})\`;
              } catch (e) {
                return 'Invalid date';
              }
            })()}</div>
          </div>
          <div class="patient-row">
            <div class="label">Gender:</div>
            <div class="value">\${patient?.gender || 'N/A'}</div>
          </div>
          <div class="patient-row">
            <div class="label">Blood Group:</div>
            <div class="value">\${patient?.blood_group || 'Not Specified'}</div>
          </div>
          <div class="patient-row">
            <div class="label">Address:</div>
            <div class="value">\${patient?.address || 'Not Provided'}</div>
          </div>
          <div class="patient-row">
            <div class="label">Registration Date:</div>
            <div class="value">\${(() => {
              if (!patient?.created_at) return 'N/A';
              try {
                return format(new Date(patient.created_at), 'MMM dd, yyyy');
              } catch (e) {
                return 'Invalid date';
              }
            })()}</div>
          </div>
          <div class="patient-row">
            <div class="label">Report Generated:</div>
            <div class="value">\${format(new Date(), 'MMM dd, yyyy HH:mm')}</div>
          </div>
          <div class="patient-row">
            <div class="label">Generated By:</div>
            <div class="value">Nurse \${user?.full_name || 'Staff'}</div>
          </div>
        </div>
      </div>

      <div class="report-id">
        <div class="report-header">
          <strong>📋 OFFICIAL LABORATORY REPORT</strong>
        </div>
        <div class="report-details">
          Report ID: HMS-LAB-\${format(new Date(), 'yyyyMMdd')}-\${String(patient?.id || Math.floor(Math.random() * 1000)).padStart(4, '0')} | 
          Generated: \${format(new Date(), 'yyyy-MM-dd HH:mm:ss')} | 
          Hospital Management System
        </div>
      </div>

      <div class="billing-notice">
        \${billingInfo ? \`
          <div class="payment-info">
            <strong>💳 PAYMENT STATUS: \${billingInfo.payment_status || 'PENDING'}</strong><br>
            <div class="payment-details">
              Total Amount: \${billingInfo.total_amount ? \`\${billingInfo.currency || 'TZS'} \${billingInfo.total_amount.toLocaleString()}\` : 'Calculating...'}<br>
              \${billingInfo.payment_method ? \`Payment Method: \${billingInfo.payment_method}<br>\` : ''}
              \${billingInfo.payment_date ? \`Paid On: \${format(new Date(billingInfo.payment_date), 'MMM dd, yyyy HH:mm')}<br>\` : ''}
              \${billingInfo.receipt_number ? \`Receipt No: \${billingInfo.receipt_number}<br>\` : ''}
              Status: \${billingInfo.payment_status === 'Paid' ? '✅ PAYMENT COMPLETED' : '⏳ PAYMENT REQUIRED AT BILLING COUNTER'}
            </div>
          </div>
        \` : \`
          <strong>💳 BILLING STATUS:</strong> Patient must complete payment at billing counter before discharge.<br>
          <small>Lab test charges will be calculated at billing. This report can be reprinted if needed.</small>
        \`}
      </div>

      \${labTests.map((test, index) => {
        let results = {};
        let interpretation = '';
        let testDate = '';
        
        try {
          if (typeof test.results === 'string') {
            const parsedResults = JSON.parse(test.results);
            results = parsedResults?.results || parsedResults || {};
            interpretation = parsedResults?.interpretation || '';
            testDate = parsedResults?.test_date || '';
          } else if (test.results && typeof test.results === 'object') {
            results = test.results?.results || test.results;
            interpretation = test.results?.interpretation || '';
            testDate = test.results?.test_date || '';
          }
        } catch (e) {

          results = {};
        }

        const hasResults = Object.keys(results).length > 0;

        return \`
          <div class="test-container">
            <div class="test-header">
              <h4>🔬 \${index + 1}. \${test.test_name || 'Lab Test'}</h4>
              <div class="test-info">
                Test Code: \${test.test_code || test.id || 'N/A'} | 
                Category: \${test.test_type || test.category || 'General'} | 
                Status: ✅ Completed | 
                Performed: \${(() => {
                  const testPerformedDate = testDate || test.completed_at || test.test_date;
                  if (!testPerformedDate) return 'N/A';
                  try {
                    return format(new Date(testPerformedDate), 'MMM dd, yyyy HH:mm');
                  } catch (e) {
                    return 'Invalid date';
                  }
                })()} | 
                Technician: \${test.performed_by || 'Lab Staff'}
              </div>
            </div>
            
            \${hasResults ? \`
              <table class="results-table">
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Result</th>
                    <th>Unit</th>
                    <th>Reference Range</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  \${Object.entries(results).map(([param, data]: [string, any]) => {
                    const isNormal = data.status === 'Normal' || data.status === 'normal';
                    return \`
                      <tr>
                        <td class="parameter-name">\${param}</td>
                        <td class="result-value">\${data.value || data.result_value || 'N/A'}</td>
                        <td>\${data.unit || '-'}</td>
                        <td>\${data.normal_range || data.reference_range || '-'}</td>
                        <td>
                          <span class="\${isNormal ? 'status-normal' : 'status-abnormal'}">
                            \${isNormal ? 'NORMAL' : 'ABNORMAL'}
                          </span>
                        </td>
                      </tr>
                    \`;
                  }).join('')}
                </tbody>
              </table>
            \` : \`
              <div style="padding: 20px; text-align: center; color: #6b7280;">
                <p>Test completed - Detailed results being processed</p>
                \${test.results && typeof test.results === 'string' ? \`
                  <div style="background: #f8fafc; padding: 15px; margin: 10px 0; text-align: left;">
                    <strong>Raw Results:</strong><br>
                    <pre style="white-space: pre-wrap; font-family: monospace; font-size: 12px;">\${test.results}</pre>
                  </div>
                \` : ''}
              </div>
            \`}
            
            \${interpretation ? \`
              <div class="interpretation-box">
                <div class="interpretation-title">Clinical Interpretation:</div>
                <div>\${interpretation}</div>
              </div>
            \` : hasResults ? \`
              <div class="interpretation-box">
                <div class="interpretation-title">Clinical Interpretation:</div>
                <div>
                  \${Object.values(results).every((r: any) => r.status === 'Normal' || r.status === 'normal') 
                    ? 'All parameters are within normal limits. No immediate medical intervention required.' 
                    : 'Some parameters may require medical attention. Please consult with healthcare provider.'}
                </div>
              </div>
            \` : ''}
          </div>
        \`;
      }).join('')}

      <div class="footer-section">
        <h4>📋 Report Verification & Authorization</h4>
        <div class="footer-grid-print">
          <div class="footer-row">
            <div class="label">🔬 Laboratory Technician:</div>
            <div class="value">\${labTests[0]?.performed_by || 'Lab Staff'}</div>
          </div>
          <div class="footer-row">
            <div class="label">👩‍⚕️ Reviewed by Nurse:</div>
            <div class="value">\${user?.full_name || 'Nursing Staff'}</div>
          </div>
          <div class="footer-row">
            <div class="label">🏥 Department:</div>
            <div class="value">Laboratory Services</div>
          </div>
          <div class="footer-row">
            <div class="label">📅 Report Generated:</div>
            <div class="value">\${format(new Date(), 'MMM dd, yyyy HH:mm')}</div>
          </div>
          <div class="footer-row">
            <div class="label">💻 System:</div>
            <div class="value">Hospital Management System - HMS v2.0</div>
          </div>
          <div class="footer-row">
            <div class="label">🏥 Status:</div>
            <div class="value"><strong>READY FOR BILLING & DISCHARGE</strong></div>
          </div>
        </div>
        
        <div class="signature-area clearfix">
          <div class="signature-box">
            <div class="signature-line">Laboratory Technician</div>
            <div class="signature-subtitle">Print Name, Signature & Date</div>
            <div class="signature-subtitle">License No: _____________</div>
          </div>
          <div class="signature-box">
            <div class="signature-line">Reviewing Nurse</div>
            <div class="signature-subtitle">Print Name, Signature & Date</div>
            <div class="signature-subtitle">License No: _____________</div>
          </div>
        </div>
        
        <div class="disclaimer">
          <p><strong>IMPORTANT NOTICE:</strong> This is an official laboratory report generated by Hospital Management System. 
          Any alterations or modifications to this report are strictly prohibited. For queries, contact the Laboratory Department at [Phone to be configured].</p>
        </div>
      </div>
    `;
  };

  // Handler functions
  const handleRecordVitals = (patient: any) => {
    setSelectedPatient(patient);
    setVitalsForm({
      blood_pressure: '',
      heart_rate: '',
      temperature: '',
      oxygen_saturation: '',
      weight: '',
      weight_unit: 'kg',
      height: '',
      height_unit: 'cm',
      muac: '',
      muac_unit: 'cm',
      notes: ''
    });
    setShowVitalsDialog(true);
  };

  const handleAddNotes = (patient: any) => {
    setSelectedPatient(patient);
    setNotesForm({
      patient_id: patient.id,
      notes: '',
      category: 'general'
    });
    setShowNotesDialog(true);
  };

  const handleScheduleFollowUp = (patient: any) => {
    setSelectedPatient(patient);
    setScheduleForm({
      patient_id: patient.id,
      appointment_date: '',
      appointment_time: '',
      reason: '',
      department_id: ''
    });
    setShowScheduleDialog(true);
  };

  const handleCompleteQuickService = async (visit: any) => {
    try {

      // Get patient services for this visit
      const visitServices = patientServices[visit.id] || [];

      if (visitServices.length === 0) {

        // Try to fetch services if not already loaded
        try {
          const servicesRes = await api.get(`/patient-services?patient_id=${visit.patient_id}&service_date=${visit.visit_date}`);
          const freshServices = servicesRes.data.services || [];
          if (freshServices.length > 0) {
            // Update local state
            setPatientServices(prev => ({ ...prev, [visit.id]: freshServices }));
            visitServices.push(...freshServices);
          }
        } catch (error) {

        }
      }
      
      // Always fetch fresh services data to ensure we have the latest forms
      const servicesRes = await api.get('/services');
      const allServices = servicesRes.data.services || [];

      // Find the primary service from patient services
      let primaryService = null;
      if (visitServices.length > 0) {
        const patientService = visitServices[0];
        primaryService = allServices.find((s: any) => s.id === patientService.service_id);

      }
      
      // Fallback: try to extract service name from visit notes if no patient services
      if (!primaryService) {
        const serviceMatch = visit.notes?.match(/Quick Service: ([^-,]+)/);
        const serviceName = serviceMatch ? serviceMatch[1].trim() : null;

        if (serviceName) {
          // Try exact match first
          primaryService = allServices.find((s: any) => s.service_name === serviceName);
          
          // If no exact match, try partial match
          if (!primaryService) {
            primaryService = allServices.find((s: any) => 
              serviceName.includes(s.service_name) || s.service_name.includes(serviceName)
            );
          }
        }
      }



      // Check if service requires form or create default form for medical services
      let shouldShowForm = false;
      let formTemplate = null;
      
      if (primaryService && primaryService.requires_form && primaryService.form_template) {
        shouldShowForm = true;
        formTemplate = primaryService.form_template;

      } else if (primaryService) {
        // Create default forms for common medical services that don't have templates
        const serviceType = primaryService.service_type?.toLowerCase() || '';
        const serviceName = primaryService.service_name?.toLowerCase() || '';
        
        if (serviceType === 'vaccination' || serviceName.includes('vaccination') || serviceName.includes('vaccine') || serviceName.includes('immunization')) {
          shouldShowForm = true;
          formTemplate = {
            title: 'Vaccination Record',
            fields: [
              { name: 'vaccine_name', label: 'Vaccine Name', type: 'text', required: true, value: primaryService.service_name },
              { name: 'batch_number', label: 'Batch Number', type: 'text', required: true },
              { name: 'expiry_date', label: 'Expiry Date', type: 'date', required: true },
              { name: 'site_of_injection', label: 'Site of Injection', type: 'select', required: true, options: ['Left arm', 'Right arm', 'Left thigh', 'Right thigh'] },
              { name: 'dose', label: 'Dose (ml)', type: 'number', required: true, step: '0.1' },
              { name: 'adverse_reactions', label: 'Adverse Reactions', type: 'textarea', required: false },
              { name: 'next_dose_date', label: 'Next Dose Date (if applicable)', type: 'date', required: false },
              { name: 'notes', label: 'Additional Notes', type: 'textarea', required: false }
            ]
          };

        } else if (serviceType === 'injection' || serviceName.includes('injection') || serviceName.includes('shot')) {
          shouldShowForm = true;
          formTemplate = {
            title: 'Injection Record',
            fields: [
              { name: 'medication_name', label: 'Medication Name', type: 'text', required: true },
              { name: 'dosage', label: 'Dosage', type: 'text', required: true },
              { name: 'route', label: 'Route', type: 'select', required: true, options: ['Intramuscular', 'Subcutaneous', 'Intravenous', 'Intradermal'] },
              { name: 'site_of_injection', label: 'Site of Injection', type: 'select', required: true, options: ['Left arm', 'Right arm', 'Left thigh', 'Right thigh', 'Abdomen', 'Other'] },
              { name: 'adverse_reactions', label: 'Adverse Reactions', type: 'textarea', required: false },
              { name: 'notes', label: 'Additional Notes', type: 'textarea', required: false }
            ]
          };

        } else if (serviceType === 'procedure' || serviceName.includes('wound') || serviceName.includes('dressing')) {
          shouldShowForm = true;
          formTemplate = {
            title: 'Procedure Record',
            fields: [
              { name: 'procedure_name', label: 'Procedure Name', type: 'text', required: true, value: primaryService.service_name },
              { name: 'procedure_site', label: 'Procedure Site', type: 'text', required: true },
              { name: 'materials_used', label: 'Materials Used', type: 'textarea', required: true },
              { name: 'procedure_notes', label: 'Procedure Notes', type: 'textarea', required: true },
              { name: 'patient_response', label: 'Patient Response', type: 'textarea', required: false },
              { name: 'follow_up_required', label: 'Follow-up Required', type: 'select', required: true, options: ['Yes', 'No'] },
              { name: 'follow_up_date', label: 'Follow-up Date (if required)', type: 'date', required: false },
              { name: 'complications', label: 'Complications', type: 'textarea', required: false }
            ]
          };

        } else if (serviceType === 'surgery' || serviceName.includes('surgery') || serviceName.includes('surgical') || serviceName.includes('operation')) {
          shouldShowForm = true;
          formTemplate = {
            title: 'Surgery Record',
            fields: [
              { name: 'surgery_name', label: 'Surgery Name', type: 'text', required: true, value: primaryService.service_name },
              { name: 'surgeon', label: 'Surgeon', type: 'text', required: true },
              { name: 'anesthesia_type', label: 'Anesthesia Type', type: 'select', required: true, options: ['Local', 'General', 'Regional', 'Sedation'] },
              { name: 'surgery_duration', label: 'Surgery Duration (minutes)', type: 'number', required: true },
              { name: 'surgery_notes', label: 'Surgery Notes', type: 'textarea', required: true },
              { name: 'complications', label: 'Complications', type: 'textarea', required: false },
              { name: 'post_op_instructions', label: 'Post-Op Instructions', type: 'textarea', required: true },
              { name: 'follow_up_date', label: 'Follow-up Date', type: 'date', required: true }
            ]
          };

        } else if (serviceName.includes('pressure') || serviceName.includes('bp') || serviceName.includes('blood pressure')) {
          shouldShowForm = true;
          formTemplate = {
            title: 'Blood Pressure Monitoring',
            fields: [
              { name: 'systolic', label: 'Systolic Pressure (mmHg)', type: 'number', required: true },
              { name: 'diastolic', label: 'Diastolic Pressure (mmHg)', type: 'number', required: true },
              { name: 'pulse_rate', label: 'Pulse Rate (bpm)', type: 'number', required: true },
              { name: 'measurement_position', label: 'Measurement Position', type: 'select', required: true, options: ['Sitting', 'Standing', 'Lying down'] },
              { name: 'interpretation', label: 'Interpretation', type: 'select', required: true, options: ['Normal', 'Elevated', 'High Stage 1', 'High Stage 2', 'Hypertensive Crisis'] },
              { name: 'recommendations', label: 'Recommendations', type: 'textarea', required: false }
            ]
          };

        } else if (serviceName.includes('bed') || serviceName.includes('admission') || serviceName.includes('ward')) {
          shouldShowForm = true;
          formTemplate = {
            title: 'Bed Assignment & Admission',
            fields: [
              { name: 'ward_name', label: 'Ward Name', type: 'text', required: true },
              { name: 'bed_number', label: 'Bed Number', type: 'text', required: true },
              { name: 'admission_reason', label: 'Admission Reason', type: 'textarea', required: true },
              { name: 'admission_type', label: 'Admission Type', type: 'select', required: true, options: ['Emergency', 'Elective', 'Observation', 'Day Care'] },
              { name: 'special_requirements', label: 'Special Requirements', type: 'textarea', required: false },
              { name: 'nursing_notes', label: 'Nursing Notes', type: 'textarea', required: true }
            ]
          };

        } else if (serviceName.includes('iv') || serviceName.includes('drip') || serviceName.includes('infusion')) {
          shouldShowForm = true;
          formTemplate = {
            title: 'IV Therapy Record',
            fields: [
              { name: 'iv_solution', label: 'IV Solution', type: 'text', required: true },
              { name: 'volume', label: 'Volume (ml)', type: 'number', required: true },
              { name: 'flow_rate', label: 'Flow Rate (ml/hr)', type: 'number', required: true },
              { name: 'insertion_site', label: 'Insertion Site', type: 'select', required: true, options: ['Left hand', 'Right hand', 'Left forearm', 'Right forearm'] },
              { name: 'start_time', label: 'Start Time', type: 'datetime-local', required: true },
              { name: 'patient_response', label: 'Patient Response', type: 'textarea', required: false }
            ]
          };

        } else if (serviceType === 'surgery' || serviceName.includes('surgery') || serviceName.includes('surgical') || serviceName.includes('operation')) {
          shouldShowForm = true;
          formTemplate = {
            title: 'Surgery Record',
            fields: [
              { name: 'surgery_name', label: 'Surgery Name', type: 'text', required: true, value: primaryService.service_name },
              { name: 'surgeon', label: 'Surgeon', type: 'text', required: true },
              { name: 'anesthesia_type', label: 'Anesthesia Type', type: 'select', required: true, options: ['Local', 'General', 'Regional', 'Sedation'] },
              { name: 'surgery_duration', label: 'Surgery Duration (minutes)', type: 'number', required: true },
              { name: 'surgery_notes', label: 'Surgery Notes', type: 'textarea', required: true },
              { name: 'complications', label: 'Complications', type: 'textarea', required: false },
              { name: 'post_op_instructions', label: 'Post-Op Instructions', type: 'textarea', required: true },
              { name: 'follow_up_date', label: 'Follow-up Date', type: 'date', required: true },
              { name: 'discharge_condition', label: 'Discharge Condition', type: 'select', required: true, options: ['Stable', 'Critical', 'Observation Required'] }
            ]
          };

        } else if (serviceName.includes('pressure') || serviceName.includes('bp') || serviceName.includes('blood pressure')) {
          shouldShowForm = true;
          formTemplate = {
            title: 'Blood Pressure Monitoring',
            fields: [
              { name: 'systolic', label: 'Systolic Pressure (mmHg)', type: 'number', required: true },
              { name: 'diastolic', label: 'Diastolic Pressure (mmHg)', type: 'number', required: true },
              { name: 'pulse_rate', label: 'Pulse Rate (bpm)', type: 'number', required: true },
              { name: 'measurement_position', label: 'Measurement Position', type: 'select', required: true, options: ['Sitting', 'Standing', 'Lying down'] },
              { name: 'arm_used', label: 'Arm Used', type: 'select', required: true, options: ['Left', 'Right'] },
              { name: 'cuff_size', label: 'Cuff Size', type: 'select', required: true, options: ['Adult', 'Large Adult', 'Pediatric'] },
              { name: 'interpretation', label: 'Interpretation', type: 'select', required: true, options: ['Normal', 'Elevated', 'High Stage 1', 'High Stage 2', 'Hypertensive Crisis'] },
              { name: 'recommendations', label: 'Recommendations', type: 'textarea', required: false },
              { name: 'follow_up_required', label: 'Follow-up Required', type: 'select', required: true, options: ['Yes', 'No'] }
            ]
          };

        } else if (serviceName.includes('bed') || serviceName.includes('admission') || serviceName.includes('ward')) {
          shouldShowForm = true;
          formTemplate = {
            title: 'Bed Assignment & Admission',
            fields: [
              { name: 'ward_name', label: 'Ward Name', type: 'text', required: true },
              { name: 'bed_number', label: 'Bed Number', type: 'text', required: true },
              { name: 'admission_reason', label: 'Admission Reason', type: 'textarea', required: true },
              { name: 'admission_type', label: 'Admission Type', type: 'select', required: true, options: ['Emergency', 'Elective', 'Observation', 'Day Care'] },
              { name: 'expected_duration', label: 'Expected Duration (days)', type: 'number', required: false },
              { name: 'special_requirements', label: 'Special Requirements', type: 'textarea', required: false },
              { name: 'diet_instructions', label: 'Diet Instructions', type: 'textarea', required: false },
              { name: 'mobility_status', label: 'Mobility Status', type: 'select', required: true, options: ['Ambulatory', 'Bed Rest', 'Limited Mobility', 'Wheelchair'] },
              { name: 'nursing_notes', label: 'Nursing Notes', type: 'textarea', required: true }
            ]
          };

        } else if (serviceName.includes('iv') || serviceName.includes('drip') || serviceName.includes('infusion')) {
          shouldShowForm = true;
          formTemplate = {
            title: 'IV Therapy Record',
            fields: [
              { name: 'iv_solution', label: 'IV Solution', type: 'text', required: true },
              { name: 'volume', label: 'Volume (ml)', type: 'number', required: true },
              { name: 'flow_rate', label: 'Flow Rate (ml/hr)', type: 'number', required: true },
              { name: 'insertion_site', label: 'Insertion Site', type: 'select', required: true, options: ['Left hand', 'Right hand', 'Left forearm', 'Right forearm', 'Left antecubital', 'Right antecubital'] },
              { name: 'catheter_size', label: 'Catheter Size', type: 'select', required: true, options: ['18G', '20G', '22G', '24G'] },
              { name: 'start_time', label: 'Start Time', type: 'datetime-local', required: true },
              { name: 'expected_duration', label: 'Expected Duration (hours)', type: 'number', required: true },
              { name: 'complications', label: 'Complications', type: 'textarea', required: false },
              { name: 'patient_response', label: 'Patient Response', type: 'textarea', required: false }
            ]
          };

        } else if (serviceName.includes('suture') || serviceName.includes('stitch') || serviceName.includes('laceration')) {
          shouldShowForm = true;
          formTemplate = {
            title: 'Suturing Record',
            fields: [
              { name: 'wound_location', label: 'Wound Location', type: 'text', required: true },
              { name: 'wound_size', label: 'Wound Size (cm)', type: 'text', required: true },
              { name: 'suture_type', label: 'Suture Type', type: 'select', required: true, options: ['Absorbable', 'Non-absorbable', 'Silk', 'Nylon', 'Vicryl'] },
              { name: 'suture_size', label: 'Suture Size', type: 'select', required: true, options: ['2-0', '3-0', '4-0', '5-0', '6-0'] },
              { name: 'number_of_sutures', label: 'Number of Sutures', type: 'number', required: true },
              { name: 'anesthesia_used', label: 'Local Anesthesia Used', type: 'select', required: true, options: ['Yes', 'No'] },
              { name: 'wound_cleaning', label: 'Wound Cleaning Method', type: 'text', required: true },
              { name: 'suture_removal_date', label: 'Suture Removal Date', type: 'date', required: true },
              { name: 'post_care_instructions', label: 'Post-Care Instructions', type: 'textarea', required: true }
            ]
          };

        } else {
          // Generic form for any service we haven't specifically created a form for
          shouldShowForm = true;
          formTemplate = {
            title: `${primaryService.service_name} - Service Record`,
            fields: [
              { name: 'service_name', label: 'Service Name', type: 'text', required: true, value: primaryService.service_name, readonly: true },
              { name: 'service_type', label: 'Service Type', type: 'text', required: true, value: primaryService.service_type || 'Medical Service', readonly: true },
              { name: 'service_provided', label: 'Service Provided', type: 'textarea', required: true, placeholder: 'Describe the service provided to the patient...' },
              { name: 'patient_condition_before', label: 'Patient Condition Before Service', type: 'textarea', required: true, placeholder: 'Describe patient condition before service...' },
              { name: 'procedure_details', label: 'Procedure/Service Details', type: 'textarea', required: true, placeholder: 'Detailed description of what was done...' },
              { name: 'materials_used', label: 'Materials/Equipment Used', type: 'textarea', required: false, placeholder: 'List any materials or equipment used...' },
              { name: 'patient_response', label: 'Patient Response', type: 'textarea', required: true, placeholder: 'How did the patient respond to the service?' },
              { name: 'patient_condition_after', label: 'Patient Condition After Service', type: 'textarea', required: true, placeholder: 'Describe patient condition after service...' },
              { name: 'complications', label: 'Complications (if any)', type: 'textarea', required: false, placeholder: 'Any complications or adverse reactions...' },
              { name: 'follow_up_required', label: 'Follow-up Required', type: 'select', required: true, options: ['Yes', 'No'] },
              { name: 'follow_up_date', label: 'Follow-up Date (if required)', type: 'date', required: false },
              { name: 'follow_up_instructions', label: 'Follow-up Instructions', type: 'textarea', required: false, placeholder: 'Instructions for follow-up care...' },
              { name: 'discharge_instructions', label: 'Discharge Instructions', type: 'textarea', required: true, placeholder: 'Instructions for patient after discharge...' },
              { name: 'additional_notes', label: 'Additional Notes', type: 'textarea', required: false, placeholder: 'Any additional observations or notes...' }
            ]
          };

        }
      }
      
      if (shouldShowForm && formTemplate) {

        // Show form dialog
        setSelectedVisitForForm({
          ...visit,
          service: primaryService,
          patientServices: visitServices
        });
        setServiceFormTemplate(formTemplate);
        setShowServiceFormDialog(true);
        return;
      }

      // No form required - direct discharge
      await dischargeQuickServicePatient(visit);
    } catch (error: any) {

      toast.error(error.response?.data?.error || 'Failed to complete service');
    }
  };

  const dischargeQuickServicePatient = async (visit: any) => {
    try {
      await api.put(`/visits/${visit.id}`, {
        nurse_status: 'Completed',
        nurse_completed_at: new Date().toISOString(),
        current_stage: 'completed',
        overall_status: 'Completed',
        discharge_time: new Date().toISOString(),
        discharge_notes: `Quick Service completed: ${visit.notes || 'Service provided'}`
      });

      toast.success(`Service completed for ${visit.patient?.full_name}. Patient discharged.`);
      
      // Remove from pending visits
      setPendingVisits(prev => prev.filter(v => v.id !== visit.id));
      
      // Refresh data
      setTimeout(() => {
        fetchData(false);
      }, 1000);
    } catch (error: any) {

      toast.error(error.response?.data?.error || 'Failed to discharge patient');
    }
  };

  const handleServiceFormSubmit = async (formData: any) => {
    setFormSubmitting(true);
    try {
      // Save form data
      await api.post('/service-forms', {
        visit_id: selectedVisitForForm.id,
        patient_id: selectedVisitForForm.patient_id,
        form_data: formData,
        completed_by: user?.id
      });
      
      toast.success('Form saved successfully');
      
      // Close form dialog
      setShowServiceFormDialog(false);
      
      // Discharge patient
      await dischargeQuickServicePatient(selectedVisitForForm);
      
      // Reset form state
      setSelectedVisitForForm(null);
      setServiceFormTemplate(null);
    } catch (error: any) {

      toast.error(error.response?.data?.error || 'Failed to save form');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handlePatientSearch = () => {
    setShowPatientSearch(true);
    setSearchQuery('');
    setSearchResults([]);
  };

  const searchPatients = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await api.get(`/patients?search=${encodeURIComponent(query)}&limit=20`);
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      setSearchResults(response.data.patients || []);
    } catch (error: any) {

      toast.error(error.response?.data?.error || 'Failed to search patients');
    }
  };



  // Real-time search effect
  useEffect(() => {
    if (!showPatientSearch) return;
    
    const timeoutId = setTimeout(() => {
      searchPatients(searchQuery);
    }, 300); // Debounce for 300ms

    return () => clearTimeout(timeoutId);
  }, [searchQuery, showPatientSearch]);

  // Lab patient search effect
  useEffect(() => {
    const searchLabPatients = async () => {
      if (labPatientSearchTerm.length < 1) {
        setLabPatientSearchResults([]);
        return;
      }

      try {
        const response = await api.get(`/patients?search=${encodeURIComponent(labPatientSearchTerm)}&limit=10`);
        setLabPatientSearchResults(response.data.patients || []);
      } catch (error) {

        setLabPatientSearchResults([]);
      }
    };

    const debounceTimer = setTimeout(searchLabPatients, 300);
    return () => clearTimeout(debounceTimer);
  }, [labPatientSearchTerm]);



  const submitVitals = async () => {
    if (!selectedPatient) return;

    try {
      // Find the active visit for this patient
      const visitsResponse = await api.get(`/visits?patient_id=${selectedPatient.id}&current_stage=nurse&overall_status=Active&limit=1`);
      const visits = visitsResponse.data.visits || [];

      if (visits.length === 0) {
        toast.error('No active visit found for this patient');
        return;
      }

      const visit = visits[0];

      // Prepare vitals data as JSON string
      const vitalsData = JSON.stringify(vitalsForm);


      // Determine next stage based on visit type
      const visitType = visit.visit_type || 'Consultation';
      let nextStage = 'doctor';
      let nextStatus = 'Pending';
      let successMessage = 'Vital signs recorded. Patient sent to doctor.';
      
      if (visitType === 'Lab Only') {
        nextStage = 'lab';
        nextStatus = 'Pending';
        successMessage = 'Sample collected. Patient sent to lab.';
      }
      
      // Update visit with vitals and move to next stage
      const updateData: any = {
        nurse_status: 'Completed',
        nurse_notes: vitalsData,
        nurse_completed_at: new Date().toISOString(),
        current_stage: nextStage
      };
      
      if (nextStage === 'doctor') {
        updateData.doctor_status = nextStatus;
      } else if (nextStage === 'lab') {
        updateData.lab_status = nextStatus;
      }
      
      const response = await api.put(`/visits/${visit.id}`, updateData);

      toast.success(successMessage);
      
      // Update local state immediately to remove patient from list
      setPendingVisits(prev => prev.filter(v => v.id !== visit.id));
      
      // Close dialog and reset form
      setShowVitalsDialog(false);
      setSelectedPatient(null);
      
      // Reset vitals form
      setVitalsForm({
        blood_pressure: '',
        heart_rate: '',
        temperature: '',
        oxygen_saturation: '',
        weight: '',
        weight_unit: 'kg',
        height: '',
        height_unit: 'cm',
        muac: '',
        muac_unit: 'cm',
        notes: ''
      });
      
      // Refresh data after a delay to ensure backend has processed
      setTimeout(() => {

        fetchData(false);
      }, 2000); // Increased to 2 seconds
    } catch (error: any) {

      toast.error(error.response?.data?.error || 'Failed to record vital signs');
    }
  };

  const submitNotes = async () => {
    if (!selectedPatient) return;

    try {
      // TODO: Implement notes API endpoint
      toast.success(`Notes added for ${selectedPatient.full_name}`);
      setShowNotesDialog(false);
      setSelectedPatient(null);
    } catch (error) {

      toast.error('Failed to add notes');
    }
  };

  const submitScheduleFollowUp = async () => {
    if (!selectedPatient) return;

    try {
      await api.post('/appointments', {
        patient_id: selectedPatient.id,
        doctor_id: user?.id,
        appointment_date: scheduleForm.appointment_date,
        appointment_time: scheduleForm.appointment_time,
        reason: scheduleForm.reason,
        appointment_type: 'Follow-up',
        status: 'Scheduled'
      });

      toast.success(`Follow-up scheduled for ${selectedPatient.full_name}`);
      setShowScheduleDialog(false);
      setSelectedPatient(null);
      
      // Reset form
      setScheduleForm({
        patient_id: '',
        appointment_date: '',
        appointment_time: '',
        reason: '',
        department_id: ''
      });
    } catch (error: any) {

      toast.error(error.response?.data?.error || 'Failed to schedule follow-up');
    }
  };

  useEffect(() => {
    if (!user) return;
    
    fetchData(true); // Initial load with loading indicator

    // Set up periodic refresh instead of realtime subscriptions
    const refreshInterval = setInterval(() => {
      fetchData(false); // Background refresh without loading indicator
    }, 30000); // Refresh every 30 seconds

    return () => {
      clearInterval(refreshInterval);
    };
  }, [user]);

  const fetchData = async (isInitialLoad = true) => {
    if (!user) return;

    try {
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      // Fetch visits waiting for nurse - don't filter by nurse_status in API call
      // because some visits may have NULL nurse_status
      const visitsResponse = await api.get('/visits?current_stage=nurse&overall_status=Active');
      const allVisits = Array.isArray(visitsResponse.data.visits) ? visitsResponse.data.visits : [];
      
      // Filter for visits that are pending for nurse (including patients returning from lab)
      const visitsData = allVisits.filter(v => 
        v.current_stage === 'nurse' && 
        (!v.nurse_status || 
         v.nurse_status === 'Pending' || 
         v.nurse_status === 'Pending Review' || // Patients returning from lab
         v.nurse_status === '')
      );

      // Fetch today's appointments for this nurse
      const today = new Date().toISOString().split('T')[0];
      const appointmentsResponse = await api.get(`/appointments?date=${today}`);
      const appointmentsData = Array.isArray(appointmentsResponse.data.appointments) ? appointmentsResponse.data.appointments : [];

      // Fetch recent patients
      const patientsResponse = await api.get('/patients?limit=10&sort=updated_at&order=desc');
      const patientsData = Array.isArray(patientsResponse.data.patients) ? patientsResponse.data.patients : [];
      const totalPatientsCount = patientsResponse.data.total || patientsData.length;

      // Fetch completed tasks for today
      const completedResponse = await api.get(`/visits?nurse_status=Completed&nurse_completed_at=${today}`);
      const completedVisitsToday = Array.isArray(completedResponse.data.visits) ? completedResponse.data.visits : [];

      // Fetch patients returning from lab (Lab Only visits with completed lab tests)
      const labResultsResponse = await api.get('/visits?visit_type=Lab Only&lab_status=Completed&current_stage=nurse');
      const labResultsData = Array.isArray(labResultsResponse.data.visits) ? labResultsResponse.data.visits : [];

      // Fetch patient services for Quick Service visits
      const quickServiceVisits = visitsData.filter(v => v.visit_type === 'Quick Service');
      const servicesMap: Record<string, any[]> = {};
      
      for (const visit of quickServiceVisits) {
        try {
          const servicesRes = await api.get(`/patient-services?patient_id=${visit.patient_id}&service_date=${visit.visit_date}`);
          servicesMap[visit.id] = servicesRes.data.services || [];
        } catch (error) {

          servicesMap[visit.id] = [];
        }
      }
      
      setPatientServices(servicesMap);

      // Calculate stats
      setPendingVisits(visitsData);
      setLabResultsReady(labResultsData);
      setAppointments(appointmentsData);
      setPatients(patientsData);
      
      // Fetch available lab test services
      try {
        const labServicesRes = await api.get('/labs/services');
        setAvailableLabTests(labServicesRes.data.services || []);
      } catch (error) {

      }
      
      // Count today's appointments - extract date from datetime string
      const todayCount = appointmentsData.filter((a: any) => {
        if (!a.appointment_date) return false;
        const aptDate = typeof a.appointment_date === 'string' ? a.appointment_date.split('T')[0] : '';
        return aptDate === today;
      }).length;
      
      setStats({
        totalPatients: totalPatientsCount, // Use total from API, not just fetched count
        todayAppointments: todayCount,
        pendingVitals: visitsData.length,
        completedTasks: completedVisitsToday.length
      });

      // Fetch hospital settings
      try {
        const settingsRes = await api.get('/settings');
        const settings = settingsRes.data.settings || [];
        
        const settingsObj: any = {};
        settings.forEach((setting: any) => {
          settingsObj[setting.key] = setting.value;
        });

        setHospitalSettings({
          hospital_name: settingsObj.hospital_name || 'Hospital Management System',
          hospital_address: settingsObj.hospital_address || '[Address to be configured]',
          hospital_phone: settingsObj.hospital_phone || '[Phone to be configured]',
          hospital_email: settingsObj.hospital_email || '[Email to be configured]'
        });

        // Fetch logo
        const logoRes = await api.get('/settings/logo');
        if (logoRes.data.logo_url) {
          setLogoUrl(logoRes.data.logo_url);
        }
      } catch (error) {

      }

    } catch (error: any) {

      // Set empty data to prevent crashes
      setPendingVisits([]);
      setAppointments([]);
      setPatients([]);
      setStats({
        totalPatients: 0,
        todayAppointments: 0,
        pendingVitals: 0,
        completedTasks: 0
      });

      toast.error(`Failed to load dashboard data: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Nurse Dashboard">
        <div className="space-y-8">
          <div className="h-20 bg-gray-200 animate-pulse rounded-lg"></div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-lg"></div>)}
          </div>
          <div className="h-96 bg-gray-200 animate-pulse rounded-lg"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Nurse Dashboard">
      <div className="space-y-8">
        {/* Background Refresh Indicator */}
        {refreshing && (
          <div className="fixed top-4 right-4 z-50 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 shadow-sm animate-in slide-in-from-right-2">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Updating...</span>
            </div>
          </div>
        )}

        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <Stethoscope className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Welcome back, Nurse!</h2>
              <p className="text-gray-600">Here's your patient care overview for today</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-blue-200 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Patients</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.totalPatients}</div>
              <p className="text-xs text-muted-foreground">Total assigned patients</p>
            </CardContent>
          </Card>

          <Card className="border-green-200 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Schedule</CardTitle>
              <Calendar className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.todayAppointments}</div>
              <p className="text-xs text-muted-foreground">Appointments today</p>
            </CardContent>
          </Card>

          <Card className="border-orange-200 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Vitals</CardTitle>
              <Thermometer className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pendingVitals}</div>
              <p className="text-xs text-muted-foreground">Vital signs to record</p>
            </CardContent>
          </Card>

          <Card className="border-purple-200 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
              <Activity className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.completedTasks}</div>
              <p className="text-xs text-muted-foreground">Tasks completed today</p>
            </CardContent>
          </Card>
        </div>

        {/* Lab Results Ready - Patients returning from lab */}
        {labResultsReady.length > 0 && (
          <Card className="shadow-lg border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <Activity className="h-5 w-5" />
                Lab Results Ready (Nurse-Ordered Tests)
              </CardTitle>
              <CardDescription>Patients returning from lab with completed nurse-ordered tests - print reports and send to billing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {labResultsReady.map((visit) => (
                  <div key={visit.id} className="flex items-center justify-between p-3 border border-green-300 rounded-lg bg-white">
                    <div>
                      <p className="font-medium">{visit.patient?.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Phone: {visit.patient?.phone}
                      </p>
                      <Badge variant="default" className="mt-1 bg-green-600">Lab Tests Completed</Badge>
                    </div>
                    <Button 
                      onClick={async () => {
                        try {
                          // Fetch lab test results for this patient
                          const response = await api.get(`/labs?patient_id=${visit.patient_id}`);
                          const tests = response.data.labTests || response.data.tests || [];


                          // Filter to only show:
                          // 1. Completed tests
                          // 2. Tests from this specific visit (nurse-ordered, not doctor-ordered)
                          // 3. Tests where visit_type is "Lab Only" (nurse → lab → nurse workflow)
                          const completedTests = tests.filter((t: any) => {
                            const isCompleted = t.status === 'Completed';
                            const isFromThisVisit = t.visit_id === visit.id || t.visit?.id === visit.id;
                            const isLabOnlyVisit = visit.visit_type === 'Lab Only';
                            const isNurseSentToLab = visit.notes && visit.notes.includes('nurse');
                            
                            // For nurse-sent patients, check if test was created after the visit
                            const visitDate = new Date(visit.created_at);
                            const testDate = new Date(t.created_at);
                            const isRecentTest = testDate >= visitDate;

                            // Show completed tests if:
                            // 1. From this specific visit, OR
                            // 2. Lab Only visit type, OR  
                            // 3. Nurse sent to lab and test was created after visit
                            return isCompleted && (isFromThisVisit || isLabOnlyVisit || (isNurseSentToLab && isRecentTest));
                          });

                          if (completedTests.length === 0) {
                            toast.info('No completed lab tests found for this visit');
                            return;
                          }
                          
                          setLabTestResults(completedTests);
                          setSelectedVisitForResults(visit);
                          setShowLabResultsDialog(true);
                        } catch (error) {

                          toast.error('Failed to load lab results');
                        }
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Activity className="h-4 w-4 mr-2" />
                      View & Print Results
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Patients (Nurse Stage) */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Patients Waiting for Nurse
            </CardTitle>
            <CardDescription>Patients ready for vital signs assessment or lab test ordering</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingVisits.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No patients waiting</p>
              ) : (
              <div className="space-y-3">
                {pendingVisits.map((visit) => (
                  <div key={visit.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{visit.patient?.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Phone: {visit.patient?.phone} • Blood Group: {visit.patient?.blood_group || 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Checked in: {(() => {
                          const checkInTime = visit.reception_completed_at || visit.created_at;
                          if (!checkInTime) return 'N/A';
                          try {
                            return format(new Date(checkInTime), 'MMM dd, yyyy HH:mm');
                          } catch (e) {
                            return 'Invalid date';
                          }
                        })()}
                      </p>
                      {visit.visit_type && visit.visit_type !== 'Consultation' && (
                        <Badge variant="outline" className="mt-1">{visit.visit_type}</Badge>
                      )}
                      {visit.visit_type === 'Quick Service' && visit.notes && (
                        <p className="text-xs text-blue-600 mt-1">📋 {visit.notes}</p>
                      )}
                    </div>
                    {visit.visit_type === 'Lab Only' ? (
                      <Button 
                        onClick={() => {
                          setSelectedPatientForLabTests(visit);
                          setSelectedLabTests([]);
                          setShowOrderLabTestsDialog(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Activity className="h-4 w-4 mr-2" />
                        Order Lab Tests
                      </Button>
                    ) : visit.visit_type === 'Quick Service' ? (
                      (() => {
                        // Get actual patient services for this visit
                        const visitServices = patientServices[visit.id] || [];

                        // Determine service type from actual services assigned
                        if (visitServices.length > 0) {
                          const primaryService = visitServices[0];
                          const serviceName = primaryService.service_name?.toLowerCase() || '';
                          const serviceType = primaryService.service_type?.toLowerCase() || '';
                          
                          // Check service type first, then service name
                          if (serviceType === 'vaccination' || serviceName.includes('vaccination') || serviceName.includes('vaccine') || serviceName.includes('immunization')) {
                            buttonText = 'Administer Vaccination';
                            icon = <Stethoscope className="h-4 w-4 mr-2" />;
                          } else if (serviceType === 'injection' || serviceName.includes('injection') || serviceName.includes('shot')) {
                            buttonText = 'Give Injection';
                            icon = <Stethoscope className="h-4 w-4 mr-2" />;
                          } else if (serviceType === 'procedure' || serviceName.includes('wound') || serviceName.includes('dressing')) {
                            buttonText = 'Perform Procedure';
                            icon = <Stethoscope className="h-4 w-4 mr-2" />;
                          } else if (serviceName.includes('blood pressure') || serviceName.includes('bp check')) {
                            buttonText = 'Check Blood Pressure';
                            icon = <Thermometer className="h-4 w-4 mr-2" />;
                          } else if (serviceName.includes('suturing') || serviceName.includes('stitch')) {
                            buttonText = 'Perform Suturing';
                            icon = <Stethoscope className="h-4 w-4 mr-2" />;
                          } else if (serviceName.includes('iv') || serviceName.includes('drip') || serviceName.includes('infusion')) {
                            buttonText = 'Set Up IV Drip';
                            icon = <Stethoscope className="h-4 w-4 mr-2" />;
                          } else if (serviceType === 'diagnostic' || serviceName.includes('test') || serviceName.includes('screening')) {
                            buttonText = 'Perform Diagnostic';
                            icon = <Activity className="h-4 w-4 mr-2" />;
                          } else if (serviceType === 'nursing' || serviceType === 'procedure') {
                            buttonText = `Complete ${primaryService.service_name}`;
                            icon = <Stethoscope className="h-4 w-4 mr-2" />;
                          }
                          
                          // If multiple services, show generic text
                          if (visitServices.length > 1) {
                            buttonText = `Complete ${visitServices.length} Services`;
                          }
                        }
                        
                        // Always check visit notes as additional fallback (even if services found)
                        const visitNotes = visit.notes?.toLowerCase() || '';

                        if (!visitServices.length || buttonText === 'Complete Service') {
                          // Enhanced fallback to checking visit notes
                          if (visitNotes.includes('vaccination') || visitNotes.includes('vaccine') || visitNotes.includes('immunization')) {
                            buttonText = 'Administer Vaccination';
                            icon = <Stethoscope className="h-4 w-4 mr-2" />;
                          } else if (visitNotes.includes('injection') || visitNotes.includes('shot')) {
                            buttonText = 'Give Injection';
                            icon = <Stethoscope className="h-4 w-4 mr-2" />;
                          } else if (visitNotes.includes('surgery') || visitNotes.includes('surgical')) {
                            buttonText = 'Complete Surgery';
                            icon = <Stethoscope className="h-4 w-4 mr-2" />;
                          } else if (visitNotes.includes('pressure') || visitNotes.includes('bp')) {
                            buttonText = 'Check Blood Pressure';
                            icon = <Thermometer className="h-4 w-4 mr-2" />;
                          } else if (visitNotes.includes('iv') || visitNotes.includes('drip')) {
                            buttonText = 'Set Up IV Drip';
                            icon = <Stethoscope className="h-4 w-4 mr-2" />;
                          }
                        }
                          
                        return (
                          <Button 
                            onClick={() => handleCompleteQuickService(visit)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {icon}
                            {buttonText}
                          </Button>
                        );
                      })()
                    ) : (
                      <Button onClick={() => handleRecordVitals(visit.patient)}>
                        <Thermometer className="h-4 w-4 mr-2" />
                        Record Vitals
                      </Button>
                    )}
                </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Patient Search & Register */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Register new patient or search existing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="default"
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={() => {
                setNewPatientForm({
                  full_name: '',
                  phone: '',
                  gender: '',
                  date_of_birth: '',
                  address: ''
                });
                setShowRegisterPatientDialog(true);
              }}
            >
              <Users className="h-5 w-5 mr-2" />
              Register New Patient (Lab Only)
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={handlePatientSearch}
            >
              <Users className="h-5 w-5 mr-2" />
              Search Patients
            </Button>
          </CardContent>
        </Card>


      </div>

      {/* Vitals Dialog */}
      <Dialog open={showVitalsDialog} onOpenChange={setShowVitalsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Thermometer className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl">Record Vital Signs</DialogTitle>
                <DialogDescription className="text-sm">
                  Recording vitals for <span className="font-semibold text-foreground">{selectedPatient?.full_name}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Primary Vitals Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Primary Vitals
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="blood_pressure" className="text-sm font-medium flex items-center gap-2">
                    Blood Pressure <span className="text-xs text-muted-foreground">(mmHg)</span>
                  </Label>
                  <Input
                    id="blood_pressure"
                    placeholder="120/80"
                    value={vitalsForm.blood_pressure}
                    onChange={(e) => setVitalsForm({...vitalsForm, blood_pressure: e.target.value})}
                    className="h-11 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heart_rate" className="text-sm font-medium flex items-center gap-2">
                    Heart Rate <span className="text-xs text-muted-foreground">(bpm)</span>
                  </Label>
                  <Input
                    id="heart_rate"
                    type="number"
                    placeholder="72"
                    value={vitalsForm.heart_rate}
                    onChange={(e) => setVitalsForm({...vitalsForm, heart_rate: e.target.value})}
                    className="h-11 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="temperature" className="text-sm font-medium flex items-center gap-2">
                    Temperature <span className="text-xs text-muted-foreground">(°C or °F)</span>
                  </Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    placeholder="37.0"
                    value={vitalsForm.temperature}
                    onChange={(e) => setVitalsForm({...vitalsForm, temperature: e.target.value})}
                    className="h-11 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="oxygen_saturation" className="text-sm font-medium flex items-center gap-2">
                    Oxygen Saturation <span className="text-xs text-muted-foreground">(%)</span>
                  </Label>
                  <Input
                    id="oxygen_saturation"
                    type="number"
                    placeholder="98"
                    value={vitalsForm.oxygen_saturation}
                    onChange={(e) => setVitalsForm({...vitalsForm, oxygen_saturation: e.target.value})}
                    className="h-11 text-base"
                  />
                </div>
              </div>
            </div>

            {/* Body Measurements Section */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Body Measurements
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight" className="text-sm font-medium">Weight</Label>
                  <div className="flex gap-2">
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      placeholder="70.5"
                      value={vitalsForm.weight}
                      onChange={(e) => setVitalsForm({...vitalsForm, weight: e.target.value})}
                      className="flex-1 h-11 text-base"
                    />
                    <Select 
                      value={vitalsForm.weight_unit} 
                      onValueChange={(value) => setVitalsForm({...vitalsForm, weight_unit: value})}
                    >
                      <SelectTrigger className="w-24 h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="lbs">lbs</SelectItem>
                        <SelectItem value="g">g</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height" className="text-sm font-medium">Height</Label>
                  <div className="flex gap-2">
                    <Input
                      id="height"
                      type="number"
                      step="0.1"
                      placeholder="175"
                      value={vitalsForm.height}
                      onChange={(e) => setVitalsForm({...vitalsForm, height: e.target.value})}
                      className="flex-1 h-11 text-base"
                    />
                    <Select 
                      value={vitalsForm.height_unit} 
                      onValueChange={(value) => setVitalsForm({...vitalsForm, height_unit: value})}
                    >
                      <SelectTrigger className="w-24 h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cm">cm</SelectItem>
                        <SelectItem value="m">m</SelectItem>
                        <SelectItem value="ft">ft</SelectItem>
                        <SelectItem value="in">in</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="muac" className="text-sm font-medium">
                    MUAC <span className="text-xs text-muted-foreground">(Mid-Upper Arm Circumference)</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="muac"
                      type="number"
                      step="0.1"
                      placeholder="25.5"
                      value={vitalsForm.muac}
                      onChange={(e) => setVitalsForm({...vitalsForm, muac: e.target.value})}
                      className="flex-1 h-11 text-base"
                      title="Mid-Upper Arm Circumference"
                    />
                    <Select 
                      value={vitalsForm.muac_unit} 
                      onValueChange={(value) => setVitalsForm({...vitalsForm, muac_unit: value})}
                    >
                      <SelectTrigger className="w-24 h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cm">cm</SelectItem>
                        <SelectItem value="mm">mm</SelectItem>
                        <SelectItem value="in">in</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-2 pt-4 border-t">
              <Label htmlFor="vitals_notes" className="text-sm font-medium">Additional Notes</Label>
              <Textarea
                id="vitals_notes"
                placeholder="Any observations or additional information..."
                value={vitalsForm.notes}
                onChange={(e) => setVitalsForm({...vitalsForm, notes: e.target.value})}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowVitalsDialog(false)} className="min-w-24">
              Cancel
            </Button>
            <Button onClick={submitVitals} className="min-w-32 bg-blue-600 hover:bg-blue-700">
              <Thermometer className="h-4 w-4 mr-2" />
              Record Vitals
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Patient Notes</DialogTitle>
            <DialogDescription>
              Add notes for {selectedPatient?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes_category">Category</Label>
              <Select value={notesForm.category} onValueChange={(value) => setNotesForm({...notesForm, category: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="medication">Medication</SelectItem>
                  <SelectItem value="symptoms">Symptoms</SelectItem>
                  <SelectItem value="treatment">Treatment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="patient_notes">Notes</Label>
              <Textarea
                id="patient_notes"
                placeholder="Enter your notes..."
                value={notesForm.notes}
                onChange={(e) => setNotesForm({...notesForm, notes: e.target.value})}
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNotesDialog(false)}>
                Cancel
              </Button>
              <Button onClick={submitNotes}>Add Notes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Follow-up Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Follow-up</DialogTitle>
            <DialogDescription>
              Schedule a follow-up appointment for {selectedPatient?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="appointment_date">Date</Label>
                <Input
                  id="appointment_date"
                  type="date"
                  value={scheduleForm.appointment_date}
                  onChange={(e) => setScheduleForm({...scheduleForm, appointment_date: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <Label htmlFor="appointment_time">Time</Label>
                <Input
                  id="appointment_time"
                  type="time"
                  value={scheduleForm.appointment_time}
                  onChange={(e) => setScheduleForm({...scheduleForm, appointment_time: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="reason">Reason</Label>
              <Input
                id="reason"
                placeholder="Follow-up reason"
                value={scheduleForm.reason}
                onChange={(e) => setScheduleForm({...scheduleForm, reason: e.target.value})}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
                Cancel
              </Button>
              <Button onClick={submitScheduleFollowUp}>Schedule</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Patient Search Dialog */}
      <Dialog open={showPatientSearch} onOpenChange={setShowPatientSearch}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Search Patients</DialogTitle>
            <DialogDescription>
              Search for patients by name or phone number
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1">
                Start typing to search in real-time
              </p>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {searchResults.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {searchQuery ? 'No patients found' : 'Enter search term to find patients'}
                </p>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((patient) => (
                    <div key={patient.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{patient.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {patient.phone} • DOB: {(() => {
                              if (!patient.date_of_birth) return 'N/A';
                              try {
                                return format(new Date(patient.date_of_birth), 'MMM dd, yyyy');
                              } catch (e) {
                                return 'Invalid date';
                              }
                            })()}
                          </p>
                        </div>
                        <Badge variant={patient.status === 'Active' ? 'default' : 'secondary'}>
                          {patient.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lab Results Print Dialog */}
      <Dialog open={showLabResultsDialog} onOpenChange={setShowLabResultsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Lab Test Results - {selectedVisitForResults?.patient?.full_name}
            </DialogTitle>
            <DialogDescription>
              Lab test results completed - Review results and send patient to billing for payment
            </DialogDescription>
          </DialogHeader>

          <div id="lab-results-print-area" className="space-y-6">
            {/* Header for Print */}
            <div className="text-center border-b pb-4 print:block">
              <h1 className="text-2xl font-bold">Laboratory Test Results</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Patient: {selectedVisitForResults?.patient?.full_name} | 
                Phone: {selectedVisitForResults?.patient?.phone} | 
                Date: {selectedVisitForResults?.visit_date ? format(new Date(selectedVisitForResults.visit_date), 'MMM dd, yyyy') : 'N/A'}
              </p>
            </div>

            {/* Lab Test Results Table */}
            {labTestResults.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No completed lab tests found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {labTestResults.map((test, index) => (
                  <Card key={test.id} className="print:border print:shadow-none">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{index + 1}. {test.test_name}</CardTitle>
                          <CardDescription>{test.test_type}</CardDescription>
                        </div>
                        <Badge variant="default" className="bg-green-600">Completed</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {/* Test Results */}
                        {test.lab_results && test.lab_results.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Parameter</TableHead>
                                <TableHead>Result</TableHead>
                                <TableHead>Unit</TableHead>
                                <TableHead>Reference Range</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {test.lab_results.map((result: any, idx: number) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-medium">{result.parameter || result.test_name || '-'}</TableCell>
                                  <TableCell className="font-semibold">{result.result_value || result.value || '-'}</TableCell>
                                  <TableCell>{result.unit || '-'}</TableCell>
                                  <TableCell>{result.reference_range || '-'}</TableCell>
                                  <TableCell>
                                    {result.abnormal_flag ? (
                                      <Badge variant="destructive">Abnormal</Badge>
                                    ) : (
                                      <Badge variant="secondary">Normal</Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : test.results ? (
                          (() => {
                            try {
                              // Parse the JSON results and display them nicely
                              const parsedResults = typeof test.results === 'string' ? JSON.parse(test.results) : test.results;
                              const testResults = parsedResults.results || {};
                              
                              return (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Parameter</TableHead>
                                      <TableHead>Result</TableHead>
                                      <TableHead>Unit</TableHead>
                                      <TableHead>Reference Range</TableHead>
                                      <TableHead>Status</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {Object.entries(testResults).map(([testName, result]: [string, any]) => (
                                      <TableRow key={testName}>
                                        <TableCell className="font-medium">{testName}</TableCell>
                                        <TableCell className="font-semibold">{result.value || '-'}</TableCell>
                                        <TableCell>{result.unit || '-'}</TableCell>
                                        <TableCell>{result.normal_range || '-'}</TableCell>
                                        <TableCell>
                                          {result.status === 'Abnormal' ? (
                                            <Badge variant="destructive">Abnormal</Badge>
                                          ) : (
                                            <Badge variant="secondary">Normal</Badge>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              );
                            } catch (error) {
                              // Fallback to raw display if parsing fails
                              return (
                                <div className="p-4 bg-muted rounded-lg">
                                  <p className="font-medium mb-2">Results:</p>
                                  <p className="whitespace-pre-wrap">{typeof test.results === 'string' ? test.results : JSON.stringify(test.results, null, 2)}</p>
                                </div>
                              );
                            }
                          })()
                        ) : (
                          <p className="text-muted-foreground">No detailed results available</p>
                        )}

                        {/* Notes */}
                        {test.notes && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm font-medium text-blue-900">Notes:</p>
                            <p className="text-sm text-blue-800 mt-1">{test.notes}</p>
                          </div>
                        )}

                        {/* Test Details */}
                        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mt-3 pt-3 border-t">
                          <div>
                            <span className="font-medium">Test Date:</span> {test.test_date ? format(new Date(test.test_date), 'MMM dd, yyyy') : 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Completed:</span> {test.completed_at ? format(new Date(test.completed_at), 'MMM dd, yyyy HH:mm') : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}


          </div>

          <div className="flex gap-2 pt-4 print:hidden">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowLabResultsDialog(false);
                setSelectedVisitForResults(null);
                setLabTestResults([]);
              }}
            >
              Cancel
            </Button>
            
            {/* Print Lab Report Button - with billing check */}
            <Button
              variant="outline"
              className="flex-1"
              onClick={async () => {
                if (!selectedVisitForResults?.patient || !labTestResults.length) {
                  toast.error('No lab results to print');
                  return;
                }

                // Check billing status before printing
                try {
                  const { checkBillingBeforePrint } = await import('@/utils/billingCheck');
                  const canPrint = await checkBillingBeforePrint(selectedVisitForResults.patient.id);
                  
                  if (!canPrint) {
                    return; // Billing check failed, don't print
                  }
                } catch (error) {

                  toast.error('Unable to verify billing status');
                  return;
                }

                // Print the lab report
                printLabReport(selectedVisitForResults.patient, labTestResults);
              }}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Report
            </Button>
            
            {/* All patients must go to billing - no free results */}
            <Button
              className="flex-1"
              onClick={async () => {
                try {
                  // Create billing entries for completed lab tests
                  if (labTestResults && labTestResults.length > 0) {
                    for (const test of labTestResults) {
                      try {
                        // Find the corresponding medical service for this lab test
                        const servicesRes = await api.get('/labs/services');
                        const services = servicesRes.data.services || [];
                        const matchingService = services.find(s => 
                          s.service_name === test.test_name || 
                          s.service_name.includes(test.test_name) ||
                          test.test_name.includes(s.service_name)
                        );
                        
                        if (matchingService) {
                          // Create patient-service entry for billing
                          await api.post('/patient-services', {
                            patient_id: selectedVisitForResults.patient_id,
                            service_id: matchingService.id,
                            quantity: 1,
                            unit_price: matchingService.base_price,
                            total_price: matchingService.base_price,
                            service_date: new Date().toISOString().split('T')[0],
                            status: 'Pending',
                            notes: `Lab test: ${test.test_name} - completed and reviewed by nurse`
                          });

                        }
                      } catch (billingError) {

                        // Continue with other tests
                      }
                    }
                  }
                  
                  // Update visit to send to billing - ALL patients must pay
                  await api.put(`/visits/${selectedVisitForResults.id}`, {
                    current_stage: 'billing',
                    billing_status: 'Pending',
                    nurse_status: 'Completed',
                    nurse_completed_at: new Date().toISOString(),
                    notes: (selectedVisitForResults.notes || '') + ' | Lab results reviewed by nurse - sent to billing for payment'
                  });
                  
                  toast.success('Lab services added to bill. Patient sent to billing for payment.');
                  setShowLabResultsDialog(false);
                  setLabResultsReady(prev => prev.filter(v => v.id !== selectedVisitForResults.id));
                  setSelectedVisitForResults(null);
                  setLabTestResults([]);
                } catch (error) {

                  toast.error('Failed to send patient to billing');
                }
              }}
            >
              Send to Billing
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send to Lab Dialog - Simplified (Lab tech will enter tests) */}
      <Dialog open={showOrderLabTestsDialog} onOpenChange={setShowOrderLabTestsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Send Patient to Lab
            </DialogTitle>
            <DialogDescription>
              Send {selectedPatientForLabTests?.patient?.full_name} to lab for testing
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> The lab technician will enter the specific tests and perform the procedures.
              </p>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium">Patient Information:</p>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedPatientForLabTests?.patient?.full_name}
              </p>
              <p className="text-sm text-muted-foreground">
                {selectedPatientForLabTests?.patient?.phone}
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowOrderLabTestsDialog(false);
                  setSelectedPatientForLabTests(null);
                  setSelectedLabTests([]);
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={async () => {
                  try {
                    const visit = selectedPatientForLabTests;
                    
                    // Just update visit to send to lab
                    // Lab technician will enter the specific tests themselves
                    // Set doctor_status to 'Not Required' so lab knows to send to billing (not doctor)
                    await api.put(`/visits/${visit.id}`, {
                      nurse_status: 'Completed',
                      nurse_completed_at: new Date().toISOString(),
                      current_stage: 'lab',
                      lab_status: 'Pending',
                      doctor_status: 'Not Required', // Lab will route to billing instead of doctor
                      notes: (visit.notes || '') + ' | Sent to lab by nurse - tests to be determined by lab tech'
                    });

                    toast.success(`Patient sent to lab. Lab technician will enter the tests.`);
                    setShowOrderLabTestsDialog(false);
                    setSelectedPatientForLabTests(null);
                    setSelectedLabTests([]);
                    setPendingVisits(prev => prev.filter(v => v.id !== visit.id));
                    
                    // Refresh data
                    fetchData();
                  } catch (error: any) {

                    toast.error(error.response?.data?.error || 'Failed to send patient to lab');
                  }
                }}
              >
                <Activity className="h-4 w-4 mr-2" />
                Send to Lab
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Register New Patient Dialog */}
      <Dialog open={showRegisterPatientDialog} onOpenChange={setShowRegisterPatientDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Add Patient for Lab Tests
            </DialogTitle>
            <DialogDescription>
              {isNewPatientMode ? 'Register a new walk-in patient who needs lab tests only' : 'Select an existing patient for lab tests'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Patient Type Toggle */}
            <div className="flex gap-2 p-2 bg-gray-50 rounded-md">
              <Button
                type="button"
                variant={isNewPatientMode ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setIsNewPatientMode(true);
                  setSelectedLabPatient(null);
                  setLabPatientSearchTerm('');
                  setLabPatientSearchResults([]);
                }}
                className="flex-1"
              >
                New Patient
              </Button>
              <Button
                type="button"
                variant={!isNewPatientMode ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setIsNewPatientMode(false);
                  setNewPatientForm({
                    full_name: '',
                    phone: '',
                    gender: '',
                    date_of_birth: '',
                    address: ''
                  });
                }}
                className="flex-1"
              >
                Existing Patient
              </Button>
            </div>

            {isNewPatientMode ? (
              // New Patient Form
              <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={newPatientForm.full_name}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, full_name: e.target.value })}
                  placeholder="Patient full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={newPatientForm.phone}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, phone: e.target.value })}
                  placeholder="+255..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select
                  value={newPatientForm.gender}
                  onValueChange={(value) => setNewPatientForm({ ...newPatientForm, gender: value })}
                >
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth *</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={newPatientForm.date_of_birth}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, date_of_birth: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="address">Address (Optional)</Label>
                <Input
                  id="address"
                  value={newPatientForm.address}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, address: e.target.value })}
                  placeholder="Patient address"
                />
              </div>
            </div>
              </div>
            ) : (
              // Existing Patient Selection
              <div className="space-y-4">
                {!selectedLabPatient ? (
                  <>
                    <div>
                      <Label htmlFor="lab-patient-search">Search Patient</Label>
                      <Input
                        id="lab-patient-search"
                        placeholder="Enter patient name or phone number..."
                        value={labPatientSearchTerm}
                        onChange={(e) => setLabPatientSearchTerm(e.target.value)}
                        autoFocus
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Start typing to search for existing patients
                      </p>
                    </div>

                    <div className="max-h-60 overflow-y-auto">
                      {labPatientSearchResults.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          {labPatientSearchTerm ? 'No patients found' : 'Enter search term to find patients'}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {labPatientSearchResults.map((patient) => (
                            <div
                              key={patient.id}
                              className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                              onClick={() => setSelectedLabPatient(patient)}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-medium">{patient.full_name}</h4>
                                  <p className="text-sm text-muted-foreground">Phone: {patient.phone}</p>
                                  <p className="text-sm text-muted-foreground">
                                    DOB: {patient.date_of_birth ? format(new Date(patient.date_of_birth), 'MMM dd, yyyy') : 'N/A'}
                                  </p>
                                </div>
                                <Button size="sm" variant="outline">
                                  Select
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-blue-900">Selected Patient</h4>
                        <p className="text-blue-700">{selectedLabPatient.full_name}</p>
                        <p className="text-sm text-blue-600">Phone: {selectedLabPatient.phone}</p>
                        <p className="text-sm text-blue-600">
                          DOB: {selectedLabPatient.date_of_birth ? format(new Date(selectedLabPatient.date_of_birth), 'MMM dd, yyyy') : 'N/A'}
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setSelectedLabPatient(null)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        Change
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowRegisterPatientDialog(false);
                  setNewPatientForm({
                    full_name: '',
                    phone: '',
                    gender: '',
                    date_of_birth: '',
                    address: ''
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={isNewPatientMode ? false : !selectedLabPatient}
                onClick={async () => {
                  try {
                    let patientToUse = null;

                    if (isNewPatientMode) {
                      // Validate required fields for new patient
                      if (!newPatientForm.full_name || !newPatientForm.phone || !newPatientForm.gender || !newPatientForm.date_of_birth) {
                        toast.error('Please fill in all required fields');
                        return;
                      }

                      // Register new patient
                      const patientRes = await api.post('/patients', {
                        full_name: newPatientForm.full_name,
                        phone: newPatientForm.phone,
                        gender: newPatientForm.gender,
                        date_of_birth: newPatientForm.date_of_birth,
                        address: newPatientForm.address || 'Walk-in',
                        status: 'Active'
                      });

                      patientToUse = patientRes.data.patient || patientRes.data;
                      toast.success(`${newPatientForm.full_name} registered successfully!`);
                    } else {
                      // Use existing patient
                      if (!selectedLabPatient) {
                        toast.error('Please select a patient');
                        return;
                      }
                      patientToUse = selectedLabPatient;
                    }

                    // Create Lab Only visit for the patient
                    const visitRes = await api.post('/visits', {
                      patient_id: patientToUse.id,
                      visit_date: new Date().toISOString().split('T')[0],
                      visit_type: 'Lab Only',
                      status: 'Active',
                      current_stage: 'nurse',
                      nurse_status: 'Pending',
                      overall_status: 'Active',
                      notes: `Direct lab registration by Nurse ${user?.full_name || 'Staff'} - Patient: ${patientToUse.full_name}`
                    });

                    const newVisit = visitRes.data.visit || visitRes.data;
                    
                    // Close registration dialog
                    setShowRegisterPatientDialog(false);
                    setNewPatientForm({
                      full_name: '',
                      phone: '',
                      gender: '',
                      date_of_birth: '',
                      address: ''
                    });
                    setSelectedLabPatient(null);
                    setLabPatientSearchTerm('');
                    setLabPatientSearchResults([]);

                    // Immediately open lab test ordering dialog for this patient
                    setSelectedPatientForLabTests({
                      ...newVisit,
                      patient: patientToUse,
                      patient_id: patientToUse.id
                    });
                    setSelectedLabTests([]);
                    setShowOrderLabTestsDialog(true);

                    // Refresh data in background
                    fetchData();
                  } catch (error: any) {

                    toast.error(error.response?.data?.error || 'Failed to register patient');
                  }
                }}
              >
                <Users className="h-4 w-4 mr-2" />
                Register & Add to Queue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Service Form Dialog */}
      <ServiceFormDialog
        open={showServiceFormDialog}
        onOpenChange={setShowServiceFormDialog}
        formTemplate={serviceFormTemplate}
        visit={selectedVisitForForm}
        onSubmit={handleServiceFormSubmit}
        submitting={formSubmitting}
      />


    </DashboardLayout>
  );
}
