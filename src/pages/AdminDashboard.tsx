import React, { useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import { format, parseISO, isSameDay, formatDistanceToNow, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from "@/lib/utils";
import 'highlight.js/styles/github.css'; // For JSON syntax highlighting
import { 
  Search, 
  X, 
  Calendar as CalendarIcon, 
  Users, 
  UserPlus, 
  Activity, 
  Loader2, 
  Stethoscope, 
  DollarSign, 
  Edit, 
  Trash2, 
  Plus, 
  RefreshCw, 
  Eye, 
  FileText, 
  User, 
  ClipboardList, 
  Shield, 
  Phone, 
  Mail, 
  Home, 
  Clock, 
  Pill, 
  AlertTriangle, 
  FilePlus, 
  FileCheck, 
  FileX, 
  FileSearch,
  CheckCircle,
  Stethoscope as StethoscopeIcon,
  FileText as FileTextIcon,
  Image as ImageIcon
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import api from '@/lib/api';
import { toast } from 'sonner';
import { logActivity } from '@/lib/utils';
import AdminReports from '@/components/AdminReports';
import ActivityLogsView from '@/components/ActivityLogsView';
import PatientReports from '@/components/PatientReports';
import LowStockInventoryReport from '@/components/LowStockInventoryReport';
import { ICD10ImportManager } from '@/components/ICD10ImportManager';
// Using dynamic import for code splitting
const EnhancedAppointmentBooking = React.lazy(() => import('@/components/EnhancedAppointmentBooking'));

// Define the Patient interface at the top level
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
  blood_group?: string | null;
  status: 'Active' | 'Inactive' | 'Pending' | string;
  medical_history?: string;
  allergies?: string;
  medications?: string;
  insurance_provider?: string;
  insurance_policy_number?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  created_at: string;
  updated_at: string;
};

type MedicalRecord = {
  id: string;
  patient_id: string;
  record_type: 'Diagnosis' | 'Prescription' | 'Lab Result' | 'Note' | 'Other';
  title: string;
  description: string;
  date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type Appointment = {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'No Show';
  reason: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  doctor?: {
    full_name: string;
    specialization?: string;
  };
};

// Patient Detail View Component
interface PatientDetailViewProps {
  patient: Patient | null;
  records: MedicalRecord[];
  appointments: Appointment[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onClose: () => void;
  loading: boolean;
  isLoadingRecords?: boolean;
}

const PatientDetailView: React.FC<PatientDetailViewProps> = ({
  patient,
  records = [],
  appointments = [],
  activeTab = 'overview',
  onTabChange,
  onClose,
  loading = false,
  isLoadingRecords = false
}) => {
  if (!patient) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">No patient selected</p>
      </div>
    );
  }
  
  // Default values for optional fields
  const {
    full_name = '',
    first_name = '',
    last_name = '',
    date_of_birth = '',
    gender = '',
    phone = '',
    email = '',
    address = '',
    blood_group = null,
    medical_history = '',
    allergies = '',
    medications: manualMedications = '',
    insurance_provider = '',
    insurance_policy_number = ''
  } = patient;

  // Get current medications from recent prescriptions
  const currentMedications = React.useMemo(() => {
    if (manualMedications) return manualMedications;
    
    // Get medications from recent prescriptions (last 30 days)
    const recentPrescriptions = records.filter(r => 
      r.record_type === 'Prescription' && 
      new Date(r.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    
    if (recentPrescriptions.length === 0) return '';
    
    const meds = recentPrescriptions.flatMap((rx: any) => {
      const prescription = rx.prescription_data;
      const items = prescription?.medications || prescription?.items || [];
      return items.map((item: any) => 
        `${item.medication_name || item.name} - ${item.dosage} ${item.frequency}`
      );
    });
    
    return meds.length > 0 ? meds.join('\n') : '';
  }, [manualMedications, records]);

  const formatDate = (dateString?: string) => {
    return dateString ? format(new Date(dateString), 'MMM d, yyyy') : 'N/A';
  };

  const calculateAge = (dob?: string) => {
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

  return (
    <Dialog open={!!patient} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {full_name || `${first_name} ${last_name}`.trim()}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {gender} • {calculateAge(date_of_birth)} years • {blood_group || 'N/A'}
            </span>
          </DialogTitle>
          <DialogDescription>
            Patient ID: {patient.id}
          </DialogDescription>
        </DialogHeader>

        <div className="border-b">
          <div className="flex space-x-4">
            {['overview', 'records'].map((tab) => (
              <button
                key={tab}
                type="button"
                className={`py-2 px-4 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => onTabChange(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          {loading && (
            <div className="flex items-center justify-center p-8">
              <p>Loading patient data...</p>
            </div>
          )}
          {!loading && activeTab === 'overview' && (
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Personal Information</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Date of Birth</p>
                      <p>{formatDate(date_of_birth)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Age</p>
                      <p>{calculateAge(date_of_birth)} years</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center">
                      <Mail className="h-4 w-4 mr-1" /> Email
                    </p>
                    <p>{email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center">
                      <Phone className="h-4 w-4 mr-1" /> Phone
                    </p>
                    <p>{phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center">
                      <Home className="h-4 w-4 mr-1" /> Address
                    </p>
                    <p>{address || 'N/A'}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-2">
                    <StethoscopeIcon className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Medical Information</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center">
                      <FileTextIcon className="h-4 w-4 mr-1" /> Medical History
                    </p>
                    <p className="whitespace-pre-line mt-1">
                      {medical_history || 'No medical history recorded'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-1 text-amber-500" /> Allergies
                    </p>
                    <p className="whitespace-pre-line mt-1">
                      {allergies || 'No known allergies'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center">
                      <Pill className="h-4 w-4 mr-1 text-blue-500" /> Current Medications
                    </p>
                    <p className="whitespace-pre-line mt-1 text-sm">
                      {currentMedications || 'No current medications'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                      <CardTitle>Insurance Information</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Provider</p>
                        <p className="font-medium">{patient.insurance_provider || 'Not specified'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Policy Number</p>
                        <p className="font-mono">{patient.insurance_policy_number || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        
        {activeTab === 'records' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Medical Records
              </h3>
            </div>
            
            {isLoadingRecords ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : records.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>No medical records found for this patient.</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Created By</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {records.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>{format(new Date(record.date), 'MMM d, yyyy')}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{record.record_type}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">{record.title}</TableCell>
                            <TableCell className="max-w-xs truncate">
                              {record.description.substring(0, 50)}{record.description.length > 50 ? '...' : ''}
                            </TableCell>
                            <TableCell>{record.created_by}</TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  const rec = record as any;
                                  // Show record details based on type
                                  if (record.record_type === 'Prescription' && rec.prescription_data) {
                                    const rx = rec.prescription_data;
                                    const meds = rx.medications || rx.items || [];
                                    const medsList = meds.map((m: any) => 
                                      `• ${m.medication_name || m.name} - ${m.dosage} ${m.frequency} for ${m.duration}`
                                    ).join('\n');
                                    alert(`Prescription Details\n\nDate: ${format(new Date(record.date), 'PPP')}\nDoctor: ${record.created_by}\n${rx.diagnosis ? `Diagnosis: ${rx.diagnosis}\n` : ''}\nMedications:\n${medsList}${rx.notes ? `\n\nNotes: ${rx.notes}` : ''}`);
                                  } else if (rec.visit_data) {
                                    const visit = rec.visit_data;
                                    alert(`Visit Details\n\nDate: ${format(new Date(record.date), 'PPP')}\nStage: ${visit.current_stage || 'N/A'}\nStatus: ${visit.overall_status || 'N/A'}\n${visit.chief_complaint ? `Chief Complaint: ${visit.chief_complaint}\n` : ''}${visit.diagnosis ? `Diagnosis: ${visit.diagnosis}\n` : ''}${visit.notes ? `Notes: ${visit.notes}` : ''}`);
                                  }
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

          
          {activeTab === 'appointments' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium flex items-center">
                  <CalendarIcon className="h-5 w-5 mr-2" />
                  Appointments
                </h3>
                <Button variant="outline" size="sm" className="h-8">
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Appointment
                </Button>
              </div>
              
              {appointments.length === 0 ? (
                <div className="text-center py-12 border rounded-lg bg-muted/20">
                  <CalendarIcon className="h-10 w-10 mx-auto text-muted-foreground" />
                  <h4 className="mt-3 font-medium text-muted-foreground">No appointments scheduled</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Schedule a new appointment to get started
                  </p>
                  <Button variant="outline" size="sm" className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Appointment
                  </Button>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Doctor</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appointments.map((appointment) => (
                        <TableRow key={appointment.id}>
                          <TableCell>{format(new Date(appointment.appointment_date), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                              {appointment.appointment_time}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {appointment.doctor?.full_name || 'N/A'}
                            </div>
                            {appointment.doctor?.specialization && (
                              <p className="text-xs text-muted-foreground">
                                {appointment.doctor.specialization}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {appointment.reason}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                appointment.status === 'Completed' ? 'default' :
                                appointment.status === 'Scheduled' ? 'secondary' :
                                appointment.status === 'Cancelled' ? 'destructive' :
                                'outline'
                              }
                            >
                              {appointment.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="max-w-sm">
                                <div className="space-y-1 text-sm">
                                  <div><span className="text-muted-foreground">Doctor:</span> {appointment.doctor?.full_name || 'N/A'}</div>
                                  <div><span className="text-muted-foreground">Status:</span> {appointment.status}</div>
                                  <div><span className="text-muted-foreground">Reason:</span> {appointment.reason || 'N/A'}</div>
                                  <div><span className="text-muted-foreground">Time:</span> {appointment.appointment_time}</div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface PatientViewProps {
  patients: Patient[];
  view: 'day' | 'week' | 'all';
  onViewChange: (view: 'day' | 'week' | 'all') => void;
  loading: boolean;
  onViewPatient: (patient: Patient) => void;
  selectedPatient: Patient | null;
  patientRecords: MedicalRecord[];
  patientAppointments: Appointment[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onClosePatientView: () => void;
  isLoadingRecords: boolean;
}

const PatientView: React.FC<PatientViewProps> = ({
  patients,
  view,
  onViewChange,
  loading,
  onViewPatient,
  selectedPatient,
  patientRecords,
  patientAppointments,
  activeTab,
  onTabChange,
  onClosePatientView,
  isLoadingRecords
}) => {
  const filteredPatients = useMemo(() => {
    const now = new Date();
    return patients.filter(patient => {
      const patientDate = new Date(patient.created_at);
      
      switch (view) {
        case 'day':
          return patientDate.toDateString() === now.toDateString();
        case 'week': {
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          return patientDate >= weekAgo;
        }
        case 'all':
        default:
          return true;
      }
    });
  }, [patients, view]);

  const viewLabels = {
    day: 'Today',
    week: 'This Week',
    all: 'All Patients'
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <CardTitle>Patients Overview</CardTitle>
        <div className="flex items-center gap-2">
          {(['day', 'week', 'all'] as const).map((tab) => (
            <Button
              key={tab}
              variant={view === tab ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewChange(tab)}
              className="h-8"
            >
              {viewLabels[tab]}
            </Button>
          ))}
        </div>
      </div>
      
      <CardDescription>
        Viewing {filteredPatients.length} {view !== 'all' ? viewLabels[view].toLowerCase() : 'total'} patients
      </CardDescription>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Date of Birth</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Visit</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  <p className="mt-2 text-sm text-muted-foreground">Loading patients...</p>
                </TableCell>
              </TableRow>
            ) : filteredPatients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No patients found
                </TableCell>
              </TableRow>
            ) : (
              filteredPatients.map((patient) => (
                <TableRow key={patient.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <div>
                      {patient.full_name || `${patient.first_name} ${patient.last_name}`}
                      {patient.email && (
                        <p className="text-xs text-muted-foreground">{patient.email}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(patient.date_of_birth), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>{patient.gender}</TableCell>
                  <TableCell>{patient.phone}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        patient.status === 'Active' ? 'default' :
                        patient.status === 'Inactive' ? 'secondary' :
                        'outline'
                      }
                    >
                      {patient.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {patient.updated_at ? format(new Date(patient.updated_at), 'MMM d, yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={() => onViewPatient(patient)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Patient Detail View */}
      <PatientDetailView
        patient={selectedPatient}
        records={patientRecords}
        appointments={patientAppointments}
        activeTab={activeTab}
        onTabChange={onTabChange}
        onClose={onClosePatientView}
        loading={isLoadingRecords}
      />
    </div>
  );
};

// Billing Analysis Component
const BillingAnalysis = () => {
  const [billingStats, setBillingStats] = useState({
    totalRevenue: 0,
    unpaidAmount: 0,
    paidToday: 0,
    invoiceCount: 0,
    paidCount: 0,
    unpaidCount: 0
  });
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month'>('day');

  useEffect(() => {
    fetchBillingData();
  }, [timeFilter]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range based on filter
      const now = new Date();
      let startDate, endDate;
      
      switch (timeFilter) {
        case 'day':
          startDate = startOfDay(now);
          endDate = endOfDay(now);
          break;
        case 'week':
          startDate = startOfWeek(now);
          endDate = endOfWeek(now);
          break;
        case 'month':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
      }

      // Format dates as YYYY-MM-DD to avoid timezone issues
      const fromDate = format(startDate, 'yyyy-MM-dd');
      const toDate = format(endDate, 'yyyy-MM-dd');

      // Fetch payments (actual revenue) and invoices in parallel
      const [paymentsRes, invoicesRes] = await Promise.all([
        api.get('/payments', {
          params: {
            from: fromDate,
            to: toDate,
            limit: 1000,
            _cache: `${Date.now()}-${Math.random()}` // Strong cache buster
          },
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }).catch((err) => {


          return { data: { payments: [] } };
        }),
        api.get('/billing/invoices', {
          params: { limit: 1000 }
        }).catch((err) => {

          return { data: { invoices: [] } };
        })
      ]);
      
      const payments = paymentsRes.data.payments || [];
      const invoices = invoicesRes.data.invoices || [];

      // Calculate revenue from ALL completed payments in the period
      const totalRevenue = payments
        .filter(p => p.status === 'Completed')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      // Calculate unpaid amount from all invoices
      const unpaidAmount = invoices
        .filter(inv => inv.status !== 'Paid')
        .reduce((sum, inv) => sum + (Number(inv.total_amount) - Number(inv.paid_amount || 0)), 0);

      // Count paid invoices
      const paidCount = invoices.filter(inv => inv.status === 'Paid').length;
      const unpaidCount = invoices.filter(inv => inv.status === 'Unpaid' || inv.status === 'Pending').length;

      setBillingStats({
        totalRevenue,
        unpaidAmount,
        paidToday: totalRevenue, // Same as totalRevenue for the selected period
        invoiceCount: invoices.length,
        paidCount,
        unpaidCount
      });

      setRecentInvoices(invoices.slice(0, 10) || []);
    } catch (error) {

      setBillingStats({
        totalRevenue: 0,
        unpaidAmount: 0,
        paidToday: 0,
        invoiceCount: 0,
        paidCount: 0,
        unpaidCount: 0
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getFilterLabel = () => {
    switch (timeFilter) {
      case 'day': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Showing:</span>
          <div className="flex gap-2">
            <Button
              variant={timeFilter === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeFilter('day')}
            >
              Today
            </Button>
            <Button
              variant={timeFilter === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeFilter('week')}
            >
              This Week
            </Button>
            <Button
              variant={timeFilter === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeFilter('month')}
            >
              This Month
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">
              Revenue ({timeFilter === 'day' ? 'Today' : timeFilter === 'week' ? 'This Week' : 'This Month'})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              TSh {billingStats.totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From payments received
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Unpaid Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              TSh {billingStats.unpaidAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {billingStats.unpaidCount} unpaid invoices
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Paid ({getFilterLabel()})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              TSh {billingStats.paidToday.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Collections for {getFilterLabel().toLowerCase()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices */}
      <div>
        <h3 className="text-sm font-medium mb-3">Recent Invoices</h3>
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono text-sm">{invoice.invoice_number}</TableCell>
                  <TableCell>{invoice.patient?.full_name || 'Unknown'}</TableCell>
                  <TableCell>TSh {Number(invoice.total_amount).toLocaleString()}</TableCell>
                  <TableCell>TSh {Number(invoice.paid_amount || 0).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        invoice.status === 'Paid' ? 'success' :
                        invoice.status === 'Partially Paid' ? 'warning' :
                        'destructive'
                      }
                    >
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default function AdminDashboard() {
  interface User {
    id: string;
    email: string;
    full_name?: string;
    phone?: string;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
    };
    app_metadata?: {
      provider?: string;
    };
    created_at: string;
    last_sign_in_at?: string;
    role?: string;
    roles?: Array<{
      id: string;
      role: string;
      is_primary: boolean;
    }>;
  }
  
  interface ActivityLog {
    id: string;
    action: string;
    user_id: string;
    user_email?: string;
    user_name?: string;
    details: Record<string, any>;
    created_at: string;
  }

  interface Patient {
    id: string;
    first_name: string;
    last_name: string;
    full_name?: string;
    date_of_birth: string;
    gender: string;
    phone: string;
    email?: string;
    address?: string;
    blood_group?: string | null;
    status: 'Active' | 'Inactive' | 'Pending' | string;
    created_at: string;
    updated_at: string;
  }

  interface MedicalService {
    id: string;
    service_code: string;
    service_name: string;
    service_type: string;
    description?: string;
    base_price: number;
    currency: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }

  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientRecords, setPatientRecords] = useState<MedicalRecord[]>([]);
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [users, setUsers] = useState<Array<User & { activeRole?: string }>>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedAction, setSelectedAction] = useState('all');
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [selectedActionType, setSelectedActionType] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  const [userForm, setUserForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    role: 'receptionist'
  });
  const [stats, setStats] = useState({ 
    totalPatients: 0, 
    activeAppointments: 0, 
    totalUsers: 0, 
    totalServices: 0,
    totalPrescriptions: 0
  });
  const [loading, setLoading] = useState(false);
  const [medicalServices, setMedicalServices] = useState<MedicalService[]>([]);
  const [serviceForm, setServiceForm] = useState({
    service_code: '',
    service_name: '',
    service_type: '',
    description: '',
    base_price: 0,
    currency: 'TSh',
    is_active: true
  });
  const [editingService, setEditingService] = useState<MedicalService | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const { user } = useAuth();
  const [patientView, setPatientView] = useState<'day' | 'week' | 'all'>('day');
  const [roleUpdateIndicator, setRoleUpdateIndicator] = useState<string | null>(null);
  
  // Settings state
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showLogoDialog, setShowLogoDialog] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [systemSettings, setSystemSettings] = useState({
    consultation_fee: '50000',
    currency: 'TSh',
    hospital_name: 'Medical Center',
    hospital_address: '',
    hospital_phone: '',
    hospital_email: '',
    report_header: 'Healthcare Management System Report',
    enable_appointment_fees: 'true'
  });
  const [departmentFees, setDepartmentFees] = useState<Record<string, string>>({});
  const [savingSettings, setSavingSettings] = useState(false);
  
  // Department management state
  const [showDepartmentDialog, setShowDepartmentDialog] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<any>(null);
  const [departmentForm, setDepartmentForm] = useState({
    name: '',
    description: ''
  });
  const [showDoctorAssignDialog, setShowDoctorAssignDialog] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<any>(null);
  const [departmentDoctors, setDepartmentDoctors] = useState<any[]>([]);
  const [availableDoctors, setAvailableDoctors] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
    fetchSettings();
    fetchLogo();
    
    // Real-time updates would be implemented with Socket.io
    // For now, we'll use polling or manual refresh
  }, [user]);

  // Filter patients based on selected time period
  const filterPatientsByTime = useCallback((patientsList: Patient[], period: 'day' | 'week' | 'all') => {
    const now = new Date();
    
    return patientsList.filter(patient => {
      const patientDate = new Date(patient.created_at);
      
      switch (period) {
        case 'day':
          return patientDate.toDateString() === now.toDateString();
        case 'week': {
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          return patientDate >= weekAgo;
        }
        case 'all':
        default:
          return true;
      }
    });
  }, []);

  // Update filtered patients when patients or view changes
  useEffect(() => {
    if (patients.length > 0) {
      // The filtering is now handled in the PatientView component
    }
  }, [patients, patientView]);

  const fetchActivityLogs = async (userId?: string) => {
    try {
      setLogsLoading(true);
      const { data } = await api.get('/activity', {
        params: { limit: 100 }
      });
      
      const logs = data.logs || [];
      
      // Logs already include user info from backend
      const logsWithUserInfo = logs.map((log: any) => ({
        ...log,
        user_name: log.full_name || 'System',
        user_email: log.email || 'system@example.com',
        user_avatar: ''
      }));
      
      setActivityLogs(logsWithUserInfo);
    } catch (error) {

      toast.error('Failed to load activity logs');
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      // Fetch departments from API
      const { data } = await api.get('/departments');
      setDepartments(data.departments || []);
      
      // Fetch settings from backend
      try {

        const settingsRes = await api.get('/settings');

        // Backend returns settings as an array
        const settingsArray = settingsRes.data.settings || [];

        // Start with defaults
        const settingsObj: any = {
          consultation_fee: '50000',
          currency: 'TSh',
          hospital_name: 'Hospital Management System',
          hospital_address: '',
          hospital_phone: '',
          hospital_email: '',
          report_header: '',
          enable_appointment_fees: 'true'
        };
        
        // Convert array to object, overwriting defaults
        if (Array.isArray(settingsArray) && settingsArray.length > 0) {

          settingsArray.forEach((setting: any) => {
            if (setting && setting.key) {

              settingsObj[setting.key] = setting.value || '';
            }
          });
        } else {

        }
        
        setSystemSettings(settingsObj);

      } catch (error) {


        // Use defaults if settings don't exist yet
        setSystemSettings({
          consultation_fee: '50000',
          currency: 'TSh',
          hospital_name: 'Hospital Management System',
          hospital_address: '',
          hospital_phone: '',
          hospital_email: '',
          report_header: '',
          enable_appointment_fees: 'true'
        });
      }
      
      // Load department fees
      try {
        const feesResponse = await api.get('/departments/fees');
        const fees = feesResponse.data.fees || [];
        const feesObj: Record<string, string> = {};
        fees.forEach((fee: any) => {
          feesObj[fee.department_id] = fee.fee_amount.toString();
        });
        setDepartmentFees(feesObj);

      } catch (error) {

        setDepartmentFees({});
      }
    } catch (error) {

      toast.error('Failed to load settings');
    }
  };

  const fetchLogo = async () => {
    try {
      const response = await api.get('/settings/logo');
      if (response.data.logo_url) {
        setLogoUrl(response.data.logo_url);
        setLogoPreview(response.data.logo_url);
      }
    } catch (error) {

    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = async () => {
    if (!logoPreview) {
      toast.error('Please select an image first');
      return;
    }

    setUploadingLogo(true);
    try {
      await api.post('/settings/logo', { logo: logoPreview });
      setLogoUrl(logoPreview);
      
      // Update favicon immediately
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = logoPreview;
      
      toast.success('Logo updated successfully!');
      setShowLogoDialog(false);
      
      // Dispatch custom event to update logo everywhere without page reload
      window.dispatchEvent(new CustomEvent('logoUpdated', { detail: { logoUrl: logoPreview } }));
    } catch (error: any) {

      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      // Save each setting to the backend
      // Filter out numeric keys (array indices) and only keep string keys
      const settingsToSave = Object.keys(systemSettings)
        .filter(key => isNaN(Number(key))) // Only keep non-numeric keys
        .map(key => ({
          key,
          value: systemSettings[key]
        }));

      let created = 0;
      let updated = 0;

      for (const setting of settingsToSave) {
        try {

          await api.put(`/settings/${setting.key}`, { value: setting.value });
          updated++;
        } catch (error: any) {
          // If setting doesn't exist, create it
          if (error.response?.status === 404) {

            await api.post('/settings', { key: setting.key, value: setting.value });
            created++;
          } else {

            throw error;
          }
        }
      }

      // Save department fees if any are set
      let feesSaved = 0;
      for (const [deptId, fee] of Object.entries(departmentFees)) {
        if (fee && fee.trim() !== '') {
          try {

            await api.post('/departments/fees', {
              department_id: deptId,
              fee_amount: parseFloat(fee)
            });
            feesSaved++;
          } catch (error: any) {

          }
        }
      }
      
      if (feesSaved > 0) {

      }
      
      toast.success(`Settings saved successfully (${updated} updated, ${created} created, ${feesSaved} dept fees)`);
      setShowSettingsDialog(false);
      await logActivity('settings.update', { settings: systemSettings, departmentFees });
      fetchSettings(); // Reload settings
    } catch (error) {

      toast.error('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // Department management functions
  const handleAddDepartment = () => {
    setEditingDepartment(null);
    setDepartmentForm({ name: '', description: '' });
    setShowDepartmentDialog(true);
  };

  const handleEditDepartment = (dept: any) => {
    setEditingDepartment(dept);
    setDepartmentForm({ name: dept.name, description: dept.description || '' });
    setShowDepartmentDialog(true);
  };

  const handleSaveDepartment = async () => {
    if (!departmentForm.name.trim()) {
      toast.error('Department name is required');
      return;
    }

    try {
      if (editingDepartment) {
        await api.put(`/departments/${editingDepartment.id}`, departmentForm);
        toast.success('Department updated successfully');
      } else {
        await api.post('/departments', departmentForm);
        toast.success('Department created successfully');
      }
      
      setShowDepartmentDialog(false);
      fetchSettings(); // Refresh departments list
    } catch (error: any) {

      toast.error(error.response?.data?.error || 'Failed to save department');
    }
  };

  const handleDeleteDepartment = async (deptId: string) => {
    if (!confirm('Are you sure you want to delete this department? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/departments/${deptId}`);
      toast.success('Department deleted successfully');
      fetchSettings(); // Refresh departments list
    } catch (error: any) {

      toast.error(error.response?.data?.error || 'Failed to delete department');
    }
  };

  const handleManageDoctors = async (dept: any) => {
    setSelectedDepartment(dept);
    setShowDoctorAssignDialog(true);
    
    try {
      // Fetch all doctors
      const { data: usersData } = await api.get('/users');
      const allDoctors = usersData.users.filter((u: any) => u.role === 'doctor');

      // Fetch doctors assigned to this department
      const { data: deptData } = await api.get(`/departments/${dept.id}/doctors`);
      const assignedDoctors = deptData.doctors || [];
      const assignedDoctorIds = assignedDoctors.map((d: any) => d.id);


      setDepartmentDoctors(assignedDoctors);
      setAvailableDoctors(allDoctors.filter((d: any) => !assignedDoctorIds.includes(d.id)));
    } catch (error: any) {

      toast.error('Failed to load doctors');
    }
  };

  const handleAssignDoctor = async (doctorId: string) => {
    if (!selectedDepartment) return;
    
    try {
      await api.post(`/departments/${selectedDepartment.id}/doctors`, {
        doctor_id: doctorId
      });
      
      toast.success('Doctor assigned successfully');
      handleManageDoctors(selectedDepartment); // Refresh lists
    } catch (error: any) {

      toast.error(error.response?.data?.error || 'Failed to assign doctor');
    }
  };

  const handleRemoveDoctor = async (doctorId: string) => {
    if (!selectedDepartment) return;
    
    try {
      await api.delete(`/departments/${selectedDepartment.id}/doctors`, {
        data: { doctor_id: doctorId }
      });
      
      toast.success('Doctor removed successfully');
      handleManageDoctors(selectedDepartment); // Refresh lists
    } catch (error: any) {

      toast.error(error.response?.data?.error || 'Failed to remove doctor');
    }
  };

  const fetchData = async () => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    try {
      // Fetch ALL patients from MySQL API (remove limit)
      const { data: patientsResponse } = await api.get('/patients');
      const patientsData = patientsResponse.patients || [];

      // Fetch users with their roles from MySQL API
      const { data: usersResponse } = await api.get('/users');
      const usersData = usersResponse.users || [];

      // Users from API already include roles
      const usersWithRoles = usersData.map((user: any) => ({
        ...user,
        full_name: user.name || user.full_name || 'Unknown',
        roles: user.roles || [],
        activeRole: user.role || user.primaryRole || user.roles?.[0] || 'No role assigned'
      }));

      // Fetch appointments from MySQL API
      const { data: appointmentsResponse } = await api.get('/appointments');
      const appointmentsData = appointmentsResponse.appointments || [];

      // Fetch prescriptions from MySQL API
      let prescriptionsData = [];
      try {
        const { data: prescriptionsResponse } = await api.get('/prescriptions');
        prescriptionsData = prescriptionsResponse.prescriptions || [];
      } catch (error) {

      }

      // Fetch medical services from MySQL API
      let servicesData = [];
      try {
        const { data: servicesResponse } = await api.get('/services');
        servicesData = servicesResponse.services || [];
      } catch (error) {

      }

      // Calculate stats from the data we have
      const patientCount = patientsData.length;
      const appointmentCount = appointmentsData.filter((a: any) => 
        a.status !== 'Cancelled' && a.status !== 'Completed'
      ).length;
      const servicesCount = servicesData.length;
      const prescriptionCount = prescriptionsData.length;

      setPatients(patientsData);
      setUsers(usersWithRoles);
      setAppointments(appointmentsData);
      setMedicalServices(servicesData);
      setStats({
        totalPatients: patientCount,
        activeAppointments: appointmentCount,
        totalUsers: usersData.length,
        totalServices: servicesCount,
        totalPrescriptions: prescriptionCount
      });
      
    } catch (error: any) {


      // Set empty data to prevent crashes
      setPatients([]);
      setUsers([]);
      setStats({
        totalPatients: 0,
        activeAppointments: 0,
        totalUsers: 0,
        totalServices: 0,
        totalPrescriptions: 0
      });

      toast.error(`Failed to load dashboard data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPatient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const patientData = {
      full_name: formData.get('fullName') as string,
      date_of_birth: formData.get('dob') as string,
      gender: formData.get('gender') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      address: formData.get('address') as string,
      blood_group: formData.get('bloodGroup') as string,
    };

    try {
      // Create patient via MySQL API
      const { data } = await api.post('/patients', patientData);

      if (data && data.patientId) {
        toast.success('Patient added successfully');
        logActivity('patient.create', { full_name: patientData.full_name });
        setDialogOpen(false);
        fetchData();
      }
    } catch (error: any) {

      toast.error(error.response?.data?.error || 'Failed to add patient');
    }
  };

  const handleSetPrimaryRole = async (userId: string, roleId: string) => {
    try {
      // Role management not yet implemented in backend
      toast.info('Role management will be available soon');
    } catch (error) {

      toast.error('Failed to update primary role');
    }
  };

  const generateServiceCode = () => {
    const type = serviceForm.service_type;
    const prefix = type === 'Consultation' ? 'CONS' :
                   type === 'Procedure' ? 'PROC' :
                   type === 'Surgery' ? 'SURG' :
                   type === 'Emergency' ? 'EMER' :
                   type === 'Ward Stay' ? 'WARD' : 'OTHER';
    const code = `${prefix}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    setServiceForm(prev => ({ ...prev, service_code: code }));
  };

  const handleAddService = async () => {
    if (!serviceForm.service_code || !serviceForm.service_name || !serviceForm.service_type || !serviceForm.base_price) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await api.post('/services', serviceForm);
      toast.success('Medical service added successfully');
      setServiceDialogOpen(false);
      setServiceForm({
        service_code: '',
        service_name: '',
        service_type: '',
        description: '',
        base_price: 0,
        currency: 'TSh',
        is_active: true
      });
      fetchData(); // Refresh data
    } catch (error: any) {

      toast.error(error.response?.data?.error || 'Failed to add medical service');
    }
  };

  const handleEditService = (service: any) => {
    setEditingService(service);
    setServiceForm({
      service_code: service.service_code,
      service_name: service.service_name,
      service_type: service.service_type,
      description: service.description || '',
      base_price: service.base_price,
      currency: service.currency || 'TSh',
      is_active: service.is_active
    });
    setServiceDialogOpen(true);
  };

  const handleUpdateService = async () => {
    if (!editingService) return;

    try {
      await api.put(`/services/${editingService.id}`, serviceForm);
      toast.success('Medical service updated successfully');
      setServiceDialogOpen(false);
      setEditingService(null);
      setServiceForm({
        service_code: '',
        service_name: '',
        service_type: '',
        description: '',
        base_price: 0,
        currency: 'TSh',
        is_active: true
      });
      fetchData(); // Refresh data
    } catch (error: any) {

      toast.error(error.response?.data?.error || 'Failed to update medical service');
    }
  };

  const handleDeleteService = async (serviceId: string, serviceName: string) => {
    if (!confirm(`Are you sure you want to delete "${serviceName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/services/${serviceId}`);
      toast.success('Medical service deleted successfully');
      fetchData(); // Refresh data
    } catch (error: any) {

      toast.error(error.response?.data?.error || 'Failed to delete medical service');
    }
  };

  const resetServiceForm = () => {
    setServiceForm({
      service_code: '',
      service_name: '',
      service_type: '',
      description: '',
      base_price: 0,
      currency: 'TSh',
      is_active: true
    });
    setEditingService(null);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate and clean inputs
      const email = userForm.email.trim().toLowerCase();
      const password = userForm.password.trim();
      const fullName = userForm.full_name.trim();
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        toast.error('Please enter a valid email address (e.g., user@example.com)');
        return;
      }
      
      if (password.length < 8) {
        toast.error('Password must be at least 8 characters long');
        return;
      }
      
      if (!fullName) {
        toast.error('Please enter the user\'s full name');
        return;
      }

      // Create user via auth/register endpoint
      const { data } = await api.post('/auth/register', {
        email: email,
        password: password,
        name: fullName, // AuthController expects 'name', not 'full_name'
        phone: userForm.phone,
        role: userForm.role
      });

      if (data && data.userId) {
        toast.success(`User created successfully with ${userForm.role} role.`);
        setShowCreateUserDialog(false);
        setUserForm({
          full_name: '',
          email: '',
          phone: '',
          password: '',
          role: 'receptionist'
        });
        
        // Refresh data
        setTimeout(() => fetchData(), 500);
      }
    } catch (error: any) {


      // Provide more helpful error messages
      const errorData = error.response?.data;
      const errorMessage = errorData?.message || errorData?.error || error.message;
      const validationErrors = errorData?.errors;
      
      // Show validation errors if available
      if (validationErrors) {
        const errorMessages = Object.entries(validationErrors)
          .map(([field, messages]: [string, any]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('\n');

        toast.error(`Validation failed:\n${errorMessages}`);
      } else if (errorMessage?.includes('already')) {
        toast.error('A user with this email already exists');
      } else if (errorMessage?.includes('Password')) {
        toast.error('Password must be at least 8 characters');
      } else if (errorMessage?.includes('Email')) {
        toast.error('Please provide a valid email address');
      } else {
        toast.error(`Failed to create user: ${errorMessage}`);
      }
    }
  };

  const handleEditUser = (user: User & { activeRole?: string }) => {
    setEditingUser(user);
    setUserForm({
      full_name: user.full_name || '',
      email: user.email || '',
      phone: user.phone || '',
      password: '',
      role: user.activeRole || 'receptionist'
    });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    try {
      // Update user via MySQL API
      const { data } = await api.put(`/users/${editingUser.id}`, {
        email: userForm.email,
        full_name: userForm.full_name,
        phone: userForm.phone,
        role: userForm.role
      });

      if (data) {
        toast.success('User updated successfully');
        setEditingUser(null);
        
        // Update local state
        setUsers(prev => prev.map(u => 
          u.id === editingUser.id 
            ? { ...u, full_name: userForm.full_name, phone: userForm.phone, email: userForm.email }
            : u
        ));
        fetchData();
      }
    } catch (error: any) {

      toast.error(error.response?.data?.error || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user? They will no longer be able to log in.')) {
      return;
    }
    
    try {
      // Deactivate user instead of deleting (safer approach)
      await api.put(`/users/${userId}`, {
        is_active: false
      });
      toast.success('User deactivated successfully');
      
      // Refresh data to show updated status
      fetchData();
    } catch (error: any) {

      toast.error(error.response?.data?.error || 'Failed to deactivate user');
    }
  };

  const handleActivateUser = async (userId: string) => {
    if (!confirm('Are you sure you want to activate this user? They will be able to log in again.')) {
      return;
    }
    
    try {
      // Activate user
      await api.put(`/users/${userId}`, {
        is_active: true
      });
      toast.success('User activated successfully');
      
      // Refresh data to show updated status
      fetchData();
    } catch (error: any) {

      toast.error(error.response?.data?.error || 'Failed to activate user');
    }
  };

  const handleAssignRole = (user: User) => {
    setSelectedUserId(user.id);
    setRoleDialogOpen(true);
  };

  const handleRoleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!selectedUserId) {
      toast.error('No user selected for role assignment');
      return;
    }

    const formData = new FormData(e.currentTarget);
    const role = (formData.get('role') as string | null)?.trim();
    const isPrimary = formData.get('isPrimary') !== null;

    if (!role) {
      toast.error('Please select a role');
      return;
    }

    try {
      await api.post('/users/roles', {
        user_id: selectedUserId,
        role
      });
      
      toast.success(`Role ${role} assigned successfully`);
      setRoleDialogOpen(false);
      setSelectedUserId(null);
      
      // Refresh users list
      fetchData();
    } catch (error) {

      const message = (error as { message?: string })?.message || 'Failed to assign role';
      toast.error(message);
    }
  };

  const handleCSVFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0] || null;
    setImportFile(file);
    setImportPreview([]);
    if (!file) return;
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      setImportPreview(rows.slice(0, 10));
    } catch (err: any) {
      setImportError(err?.message || 'Failed to read CSV file');
    }
  };

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return [];
    const header = lines[0].split(',').map(h => h.trim());
    const required = ['service_code','service_name','service_type','base_price'];
    for (const r of required) {
      if (!header.includes(r)) {
        throw new Error(`Missing required column: ${r}`);
      }
    }
    const idx = (name: string) => header.indexOf(name);
    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length === 1 && cols[0].trim() === '') continue;
      const row = {
        service_code: cols[idx('service_code')]?.trim() || '',
        service_name: cols[idx('service_name')]?.trim() || '',
        service_type: cols[idx('service_type')]?.trim() || '',
        description: header.includes('description') ? (cols[idx('description')]?.trim() || '') : '',
        base_price: parseFloat(cols[idx('base_price')] || '0') || 0,
        currency: header.includes('currency') ? (cols[idx('currency')]?.trim() || 'TSh') : 'TSh',
        is_active: header.includes('is_active') ? ((cols[idx('is_active')]?.trim().toLowerCase() === 'true')) : true,
      };
      if (row.service_code && row.service_name && row.service_type && row.base_price > 0) {
        rows.push(row);
      }
    }
    return rows;
  };

  const handleImportServices = async () => {
    if (!importFile) {
      setImportError('Please choose a CSV file');
      return;
    }
    
    setImporting(true);
    setImportError(null);
    
    try {
      const text = await importFile.text();
      const rows = parseCSV(text);
      
      if (rows.length === 0) {
        setImportError('No valid rows found in CSV');
        setImporting(false);
        return;
      }
      
      // Import services via API
      const response = await api.post('/services/bulk', { services: rows });
      
      toast.success(`Successfully imported ${response.data.results.success} services`);
      if (response.data.results.failed > 0) {
        toast.warning(`${response.data.results.failed} services failed to import`);
      }
      
      setImportDialogOpen(false);
      setImportFile(null);
      setImportPreview([]);
      fetchData(); // Refresh data
    } catch (err: any) {

      setImportError(err.response?.data?.error || err?.message || 'Failed to import CSV');
    } finally {
      setImporting(false);
    }
  };

  const downloadServicesTemplate = () => {
    const csvContent = [
      'service_code,service_name,service_type,description,base_price,currency,is_active',
      'CONS-001,General Consultation,Consultation,General doctor consultation,50000,TSh,true',
      'PROC-001,Blood Test,Procedure,Complete blood count test,25000,TSh,true',
      'SURG-001,Minor Surgery,Surgery,Minor surgical procedure,150000,TSh,true',
      'EMER-001,Emergency Care,Emergency,Emergency room visit,100000,TSh,true',
      'WARD-001,Ward Admission,Ward Stay,General ward per day,75000,TSh,true'
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'medical_services_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const fetchPatientRecords = async (patientId: string) => {
    try {
      setIsLoadingRecords(true);
      
      // Fetch patient visits and prescriptions in parallel
      const [visitsRes, prescriptionsRes] = await Promise.all([
        api.get(`/visits?patient_id=${patientId}`).catch(() => ({ data: { visits: [] } })),
        api.get(`/prescriptions?patient_id=${patientId}`).catch(() => ({ data: { prescriptions: [] } }))
      ]);
      
      const visits = visitsRes.data.visits || [];
      const prescriptions = prescriptionsRes.data.prescriptions || [];
      
      // Transform visits into medical records format
      const visitRecords = visits.map((visit: any) => ({
        id: visit.id,
        date: visit.visit_date || visit.created_at,
        record_type: 'Visit',
        title: `${visit.current_stage || 'Medical'} Visit`,
        description: visit.chief_complaint || visit.diagnosis || visit.notes || 'Medical consultation',
        created_by: visit.doctor?.full_name || visit.doctor?.name || 'Doctor',
        visit_data: visit
      }));
      
      // Transform prescriptions into medical records format
      const prescriptionRecords = prescriptions.map((rx: any) => ({
        id: rx.id,
        date: rx.prescription_date || rx.created_at,
        record_type: 'Prescription',
        title: 'Prescription',
        description: `${rx.medications?.length || rx.items?.length || 0} medication(s) prescribed${rx.diagnosis ? ': ' + rx.diagnosis : ''}`,
        created_by: rx.doctor?.full_name || rx.doctor?.name || 'Doctor',
        prescription_data: rx
      }));
      
      // Combine and sort by date (newest first)
      const allRecords = [...visitRecords, ...prescriptionRecords].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      setPatientRecords(allRecords);
    } catch (error) {

      toast.error('Failed to load patient records');
      setPatientRecords([]);
    } finally {
      setIsLoadingRecords(false);
    }
  };
  
  const fetchPatientAppointments = async (patientId: string) => {
    try {
      // Fetch appointments via MySQL API
      const { data } = await api.get('/appointments', {
        params: { patient_id: patientId }
      });
      setPatientAppointments(data.appointments || []);
    } catch (error) {

      toast.error('Failed to load patient appointments');
    }
  };
  
  const handleViewPatient = async (patient: Patient) => {
    setSelectedPatient(patient);
    setActiveTab('overview');
    await Promise.all([
      fetchPatientRecords(patient.id),
      fetchPatientAppointments(patient.id)
    ]);
  };
  
  const handleClosePatientView = () => {
    setSelectedPatient(null);
    setPatientRecords([]);
    setPatientAppointments([]);
  };

  if (loading) {
    return (
      <DashboardLayout title="Admin Dashboard">
        <div className="space-y-8">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-200 animate-pulse rounded-lg"></div>)}
          </div>
          <div className="h-96 bg-gray-200 animate-pulse rounded-lg"></div>
        </div>
      </DashboardLayout>
    );
  }

    // Tabs for patient view
  const patientViewTabs = [
    { id: 'all' as const, label: 'All Patients' },
    { id: 'week' as const, label: 'This Week' },
    { id: 'day' as const, label: 'Today' },
  ];

  // Function to format JSON data with syntax highlighting
  const formatJson = (data: unknown): React.ReactNode => {
    try {
      if (!data) return <span className="text-muted-foreground">No data</span>;
      const jsonStr = JSON.stringify(data, null, 2);
      return (
        <pre className="bg-muted/50 p-3 rounded-md text-xs overflow-x-auto">
          <code className="language-json">
            {jsonStr}
          </code>
        </pre>
      );
    } catch (e) {
      return <span className="text-muted-foreground">Invalid data</span>;
    }
  };

  const uniqueUsers = Array.from(new Set(activityLogs.map(log => log.user_id)))
    .filter(Boolean) as string[];

  const actionTypes = Array.from(new Set(activityLogs.map(log => log.action.split('.')[0]))).filter(Boolean) as string[];
  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="space-y-4">
  


        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Overview
            </CardTitle>
            <CardDescription>Key metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard title="Patients" value={stats.totalPatients} icon={Users} color="green" sub="Total registered" />
              <StatCard title="Appointments" value={stats.activeAppointments} icon={CalendarIcon} color="blue" sub="Active now" />
              <StatCard title="Users" value={stats.totalUsers} icon={User} color="purple" sub="Platform users" />
              <StatCard title="Services" value={stats.totalServices} icon={ClipboardList} color="orange" sub="Active services" />
              <StatCard title="Prescriptions" value={stats.totalPrescriptions} icon={Pill} color="teal" sub="Total prescriptions" />
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Inventory Report */}
        <div className="no-print">
          <LowStockInventoryReport />
        </div>

        {/* System Settings Card */}
        <Card className="shadow-lg border-blue-200 no-print">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  System Settings
                </CardTitle>
                <CardDescription>Configure consultation fees and system preferences</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setShowLogoDialog(true)} 
                  className="gap-2"
                >
                  <ImageIcon className="h-4 w-4" />
                  Logo & Branding
                </Button>
                <Button onClick={() => setShowSettingsDialog(true)} className="gap-2">
                  <Edit className="h-4 w-4" />
                  Manage Settings
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <div className="p-4 border rounded-lg bg-blue-50/50">
                <div className="text-sm text-muted-foreground mb-1">Default Consultation Fee</div>
                <div className="text-2xl font-bold text-blue-600">
                  {systemSettings.currency} {parseFloat(systemSettings.consultation_fee).toLocaleString()}
                </div>
              </div>
              <div className="p-4 border rounded-lg bg-green-50/50">
                <div className="text-sm text-muted-foreground mb-1">Hospital Name</div>
                <div className="text-lg font-semibold text-green-700">
                  {systemSettings.hospital_name}
                </div>
              </div>
              <div className="p-4 border rounded-lg bg-amber-50/50">
                <div className="text-sm text-muted-foreground mb-1">Report Header</div>
                <div className="text-sm font-semibold text-amber-700 line-clamp-2">
                  {systemSettings.report_header || 'Not set'}
                </div>
              </div>
              <div className="p-4 border rounded-lg bg-purple-50/50">
                <div className="text-sm text-muted-foreground mb-1">Department Fees</div>
                <div className="text-lg font-semibold text-purple-700">
                  {Object.keys(departmentFees).length} configured
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
                <CardDescription>Manage users and roles</CardDescription>
              </div>
              <Button onClick={() => setShowCreateUserDialog(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Create User
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No users found</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Users will appear here once they are registered in the system.
                </p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Name</TableHead>
                      <TableHead className="min-w-[200px]">Email</TableHead>
                      <TableHead className="min-w-[120px]">Active Role</TableHead>

                      <TableHead className="w-[160px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id} className={(u as any).is_active === false ? 'opacity-60 bg-gray-50' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="font-medium">{u.full_name || u.user_metadata?.full_name || 'Unknown'}</div>
                            {(u as any).is_active === false && (
                              <Badge variant="destructive" className="text-xs">Inactive</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{u.activeRole || 'No role'}</Badge>
                        </TableCell>

                        <TableCell>
                          <div className="flex gap-2">
                            {(u as any).is_active !== false ? (
                              <>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEditUser(u)}>
                                  <Edit className="h-4 w-4" />
                                  <span className="sr-only">Edit</span>
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleAssignRole(u)}>
                                  <Shield className="h-4 w-4" />
                                  <span className="sr-only">Assign Role</span>
                                </Button>
                                <Button variant="destructive" size="sm" className="h-8 w-8 p-0" onClick={() => handleDeleteUser(u.id)}>
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Deactivate</span>
                                </Button>
                              </>
                            ) : (
                              <Button 
                                variant="default" 
                                size="sm" 
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleActivateUser(u.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Activate
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create User Dialog */}
        <Dialog open={showCreateUserDialog} onOpenChange={(open) => {
          setShowCreateUserDialog(open);
          if (!open) {
            // Clear form when closing
            setUserForm({
              full_name: '',
              email: '',
              phone: '',
              password: '',
              role: 'receptionist'
            });
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>Add a new user to the system with a specific role</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create_full_name">Full Name *</Label>
                <Input 
                  id="create_full_name" 
                  value={userForm.full_name} 
                  onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })} 
                  required
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create_email">Email *</Label>
                <Input 
                  id="create_email" 
                  type="email" 
                  value={userForm.email} 
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value.trim() })} 
                  required
                  placeholder="user@example.com"
                  pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create_phone">Phone</Label>
                <Input 
                  id="create_phone" 
                  value={userForm.phone} 
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} 
                  placeholder="+255 700 000 000"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create_password">Password *</Label>
                <Input 
                  id="create_password" 
                  type="password"
                  autoComplete="new-password" 
                  value={userForm.password} 
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} 
                  required
                  placeholder="Minimum 6 characters"
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create_role">Role *</Label>
                <Select value={userForm.role} onValueChange={(value) => setUserForm({ ...userForm, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="receptionist">Receptionist</SelectItem>
                    <SelectItem value="nurse">Nurse</SelectItem>
                    <SelectItem value="doctor">Doctor</SelectItem>
                    <SelectItem value="lab_technician">Lab Technician</SelectItem>
                    <SelectItem value="pharmacist">Pharmacist</SelectItem>
                    <SelectItem value="billing">Billing Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateUserDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create User
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update user details</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input id="full_name" value={userForm.full_name} onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} />
              </div>
              <Button type="submit" className="w-full">Save Changes</Button>
            </form>
          </DialogContent>
        </Dialog>

        <ActivityLogsView />

        {/* Billing Analysis */}
        <Card className="shadow-lg border-green-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Billing Overview & Analysis
                </CardTitle>
                <CardDescription>Financial summary and billing statistics</CardDescription>
              </div>

            </div>
          </CardHeader>
          <CardContent>
            <BillingAnalysis />
          </CardContent>
        </Card>

        {/* Department Management */}
        <Card className="shadow-lg border-purple-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-purple-600" />
                  Department Management
                </CardTitle>
                <CardDescription>Manage hospital departments</CardDescription>
              </div>
              <Button onClick={handleAddDepartment} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Department
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {departments.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/20">
                <Stethoscope className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="font-medium text-muted-foreground">No departments found</p>
                <p className="text-xs text-muted-foreground mt-1">Create your first department to get started</p>
                <Button onClick={handleAddDepartment} variant="outline" size="sm" className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Department
                </Button>
              </div>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Name</TableHead>
                      <TableHead className="min-w-[200px]">Description</TableHead>
                      <TableHead className="min-w-[120px]">Created</TableHead>
                      <TableHead className="text-right min-w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departments.map((dept) => (
                      <TableRow key={dept.id}>
                        <TableCell className="font-medium">{dept.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {dept.description || 'No description'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(dept.created_at), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleManageDoctors(dept)}
                            >
                              <Users className="h-3 w-3 mr-1" />
                              Doctors
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditDepartment(dept)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteDepartment(dept.id)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Department Dialog */}
        <Dialog open={showDepartmentDialog} onOpenChange={setShowDepartmentDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingDepartment ? 'Edit Department' : 'Add New Department'}
              </DialogTitle>
              <DialogDescription>
                {editingDepartment 
                  ? 'Update the department information below'
                  : 'Create a new department for your hospital'
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dept_name">Department Name *</Label>
                <Input
                  id="dept_name"
                  value={departmentForm.name}
                  onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
                  placeholder="e.g., Cardiology, Pediatrics"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dept_description">Description</Label>
                <Textarea
                  id="dept_description"
                  value={departmentForm.description}
                  onChange={(e) => setDepartmentForm({ ...departmentForm, description: e.target.value })}
                  placeholder="Brief description of the department"
                  rows={3}
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDepartmentDialog(false)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button onClick={handleSaveDepartment}>
                  {editingDepartment ? 'Update' : 'Create'} Department
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Doctor Assignment Dialog */}
        <Dialog open={showDoctorAssignDialog} onOpenChange={setShowDoctorAssignDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Manage Doctors - {selectedDepartment?.name}</DialogTitle>
              <DialogDescription>
                Assign doctors to this department for appointments
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Assigned Doctors */}
              <div>
                <h4 className="font-semibold mb-2">Assigned Doctors ({departmentDoctors.length})</h4>
                {departmentDoctors.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
                    No doctors assigned yet
                  </p>
                ) : (
                  <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                    {departmentDoctors.map((doctor) => (
                      <div key={doctor.id} className="flex items-center justify-between p-3">
                        <div>
                          <p className="font-medium">{doctor.full_name}</p>
                          <p className="text-sm text-muted-foreground">{doctor.email}</p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveDoctor(doctor.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Available Doctors */}
              <div>
                <h4 className="font-semibold mb-2">Available Doctors ({availableDoctors.length})</h4>
                {availableDoctors.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
                    All doctors are assigned
                  </p>
                ) : (
                  <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                    {availableDoctors.map((doctor) => (
                      <div key={doctor.id} className="flex items-center justify-between p-3">
                        <div>
                          <p className="font-medium">{doctor.full_name}</p>
                          <p className="text-sm text-muted-foreground">{doctor.email}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAssignDoctor(doctor.id)}
                        >
                          Assign
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Card className="shadow-lg">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Patients
              </CardTitle>
              <div className="flex items-center gap-2">
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search patients…"
                  className="h-8 w-48"
                />
              </div>
            </div>
            <CardDescription>Quickly view and inspect patients</CardDescription>
          </CardHeader>
          <CardContent>
            <PatientView
              patients={patients.filter((p) => {
                const name = (p.full_name || `${p.first_name} ${p.last_name}` || '').toLowerCase();
                const phone = (p.phone || '').toLowerCase();
                const q = searchTerm.toLowerCase();
                return name.includes(q) || phone.includes(q);
              })}
              view={patientView}
              onViewChange={setPatientView}
              loading={loading}
              onViewPatient={handleViewPatient}
              selectedPatient={selectedPatient}
              patientRecords={patientRecords}
              patientAppointments={patientAppointments}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onClosePatientView={handleClosePatientView}
              isLoadingRecords={isLoadingRecords}
            />
          </CardContent>
        </Card>

        {/* Reports Section */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Reports
            </CardTitle>
            <CardDescription>Generate and view system reports</CardDescription>
          </CardHeader>
          <CardContent>
            <AdminReports />
          </CardContent>
        </Card>

        {/* Patient Reports Section - For searching individual patient medical history */}
        <div className="no-print">
          <PatientReports />
        </div>

        {/* ICD-10 Import Manager */}
        <div className="no-print">
          <ICD10ImportManager />
        </div>

        {/* Medical services management moved to Medical Services page */}
        <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Role</DialogTitle>
              <DialogDescription>Select a role to assign to this user</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleRoleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select name="role" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="doctor">Doctor</SelectItem>
                    <SelectItem value="nurse">Nurse</SelectItem>
                    <SelectItem value="receptionist">Receptionist</SelectItem>
                    <SelectItem value="lab_tech">Lab Technician</SelectItem>
                    <SelectItem value="pharmacist">Pharmacist</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="isPrimary" name="isPrimary" />
                <Label 
                  htmlFor="isPrimary" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Set as active role (determines login redirect)
                </Label>
              </div>
              <Button type="submit" className="w-full">Assign Role</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Service dialogs and CSV import moved to Medical Services page */}

        {/* Settings Dialog */}
        <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                System Settings
              </DialogTitle>
              <DialogDescription>
                Configure consultation fees and system preferences
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4 overflow-y-auto flex-1 px-6 -mx-6">
              {/* Logo Upload Link */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <ImageIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-900">Hospital Logo & Branding</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Upload your hospital logo to customize the system appearance
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        setShowSettingsDialog(false);
                        setShowLogoDialog(true);
                      }}
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Manage Logo
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* General Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">General Settings</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hospital_name">Hospital/Clinic Name</Label>
                    <Input
                      id="hospital_name"
                      value={systemSettings.hospital_name}
                      onChange={(e) => setSystemSettings({...systemSettings, hospital_name: e.target.value})}
                      placeholder="Enter hospital name"
                    />
                    <p className="text-xs text-muted-foreground">
                      This name will appear on reports, invoices, and system headers
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hospital_address">Hospital Address</Label>
                    <Input
                      id="hospital_address"
                      value={systemSettings.hospital_address}
                      onChange={(e) => setSystemSettings({...systemSettings, hospital_address: e.target.value})}
                      placeholder="e.g., 123 Main Street, Dar es Salaam, Tanzania"
                    />
                    <p className="text-xs text-muted-foreground">
                      Full address displayed on patient reports and documents
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hospital_phone">Hospital Phone</Label>
                    <Input
                      id="hospital_phone"
                      value={systemSettings.hospital_phone}
                      onChange={(e) => setSystemSettings({...systemSettings, hospital_phone: e.target.value})}
                      placeholder="e.g., +255 712 345 678"
                    />
                    <p className="text-xs text-muted-foreground">
                      Contact phone number for patient inquiries
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hospital_email">Hospital Email</Label>
                    <Input
                      id="hospital_email"
                      type="email"
                      value={systemSettings.hospital_email}
                      onChange={(e) => setSystemSettings({...systemSettings, hospital_email: e.target.value})}
                      placeholder="e.g., info@hospital.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      Official email address for correspondence
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="report_header">Report Header</Label>
                    <Input
                      id="report_header"
                      value={systemSettings.report_header}
                      onChange={(e) => setSystemSettings({...systemSettings, report_header: e.target.value})}
                      placeholder="Enter report header text"
                    />
                    <p className="text-xs text-muted-foreground">
                      Custom header text for printed reports and documents
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select 
                      value={systemSettings.currency} 
                      onValueChange={(value) => setSystemSettings({...systemSettings, currency: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TSh">TSh (Tanzanian Shilling)</SelectItem>
                        <SelectItem value="USD">USD (US Dollar)</SelectItem>
                        <SelectItem value="EUR">EUR (Euro)</SelectItem>
                        <SelectItem value="KES">KES (Kenyan Shilling)</SelectItem>
                        <SelectItem value="UGX">UGX (Ugandan Shilling)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Default Consultation Fee */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Default Consultation Fee</h3>
                <div className="space-y-2">
                  <Label htmlFor="consultation_fee">Default Fee Amount</Label>
                  <div className="flex gap-2 items-center">
                    <span className="text-sm font-medium">{systemSettings.currency}</span>
                    <Input
                      id="consultation_fee"
                      type="number"
                      step="1000"
                      value={systemSettings.consultation_fee}
                      onChange={(e) => setSystemSettings({...systemSettings, consultation_fee: e.target.value})}
                      placeholder="50000"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This is the default consultation fee when no department-specific fee is set
                  </p>
                </div>
              </div>

              {/* Department-Specific Fees */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      Department-Specific Consultation Fees
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      💡 Set custom fees per department - these override the default fee
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-sm">
                    {departments.length} departments
                  </Badge>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-900">
                    <strong>How it works:</strong> Enter a fee amount for each department. Leave blank to use the default fee ({systemSettings.currency} {systemSettings.consultation_fee}). These fees will be automatically applied when booking appointments.
                  </p>
                </div>
                
                {departments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/20">
                    <Stethoscope className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="font-medium">No departments found</p>
                    <p className="text-xs mt-1">Create departments first to set department-specific fees</p>
                  </div>
                ) : (
                  <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg">
                        <div className="text-xs text-blue-600 font-medium">Total Departments</div>
                        <div className="text-2xl font-bold text-blue-700">{departments.length}</div>
                      </div>
                      <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg">
                        <div className="text-xs text-green-600 font-medium">Custom Fees Set</div>
                        <div className="text-2xl font-bold text-green-700">
                          {Object.keys(departmentFees).filter(k => departmentFees[k]).length}
                        </div>
                      </div>
                      <div className="p-3 bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-lg">
                        <div className="text-xs text-amber-600 font-medium">Using Default</div>
                        <div className="text-2xl font-bold text-amber-700">
                          {departments.length - Object.keys(departmentFees).filter(k => departmentFees[k]).length}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3 max-h-96 overflow-y-auto border-2 rounded-lg p-4 bg-gradient-to-br from-gray-50 to-gray-100">
                    {departments.map((dept) => (
                      <div key={dept.id} className="flex items-center gap-4 p-4 border-2 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{dept.name}</div>
                          {dept.description && (
                            <div className="text-xs text-muted-foreground mt-1">{dept.description}</div>
                          )}
                          {departmentFees[dept.id] && (
                            <Badge variant="outline" className="mt-2 bg-green-50 text-green-700 border-green-300">
                              Custom fee set
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 min-w-[220px]">
                          <span className="text-sm font-semibold text-gray-700">{systemSettings.currency}</span>
                          <Input
                            type="number"
                            step="1000"
                            value={departmentFees[dept.id] || ''}
                            onChange={(e) => setDepartmentFees({
                              ...departmentFees,
                              [dept.id]: e.target.value
                            })}
                            placeholder={`Default: ${systemSettings.consultation_fee}`}
                            className="w-32 font-medium"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  </>
                )}
              </div>

              {/* Enable/Disable Features */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Feature Toggles</h3>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Enable Department-Specific Fees</div>
                    <div className="text-xs text-muted-foreground">
                      When enabled, appointments will use department-specific fees instead of the default
                    </div>
                  </div>
                  <Checkbox
                    checked={systemSettings.enable_appointment_fees === 'true'}
                    onCheckedChange={(checked) => 
                      setSystemSettings(prev => ({
                        ...prev, 
                        enable_appointment_fees: checked ? 'true' : 'false'
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white z-10 -mx-6 px-6 pb-2">
              <Button 
                variant="outline" 
                onClick={() => setShowSettingsDialog(false)}
                disabled={savingSettings}
              >
                Cancel
              </Button>
              <Button 
                onClick={saveSettings}
                disabled={savingSettings}
                className="min-w-32"
              >
                {savingSettings ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Logo Upload Dialog */}
        <Dialog open={showLogoDialog} onOpenChange={setShowLogoDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Hospital Logo & Branding
              </DialogTitle>
              <DialogDescription>
                Upload your hospital logo. It will be displayed throughout the system.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Current Logo */}
              {logoUrl && (
                <div>
                  <Label>Current Logo</Label>
                  <div className="mt-2 p-6 border rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                    <div className="relative">
                      <img 
                        src={logoUrl} 
                        alt="Hospital Logo" 
                        className="h-32 w-32 object-cover rounded-full shadow-lg border-4 border-white ring-2 ring-gray-200"
                      />
                      <div className="absolute -bottom-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow">
                        Active
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview */}
              {logoPreview && logoPreview !== logoUrl && (
                <div>
                  <Label>Preview</Label>
                  <div className="mt-2 p-6 border-2 border-dashed border-blue-300 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
                    <div className="relative">
                      <img 
                        src={logoPreview} 
                        alt="Logo Preview" 
                        className="h-32 w-32 object-cover rounded-full shadow-lg border-4 border-white ring-2 ring-blue-300 animate-pulse"
                      />
                      <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full shadow">
                        Preview
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Upload */}
              <div className="space-y-2">
                <Label htmlFor="logo-upload">Upload New Logo</Label>
                <Input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFileChange}
                  disabled={uploadingLogo}
                />
                <p className="text-sm text-muted-foreground">
                  Supported formats: JPG, PNG, SVG. Max size: 2MB
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button 
                variant="outline"
                className="w-full sm:w-auto" 
                onClick={() => setShowLogoDialog(false)}
                disabled={uploadingLogo}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleLogoUpload} 
                disabled={uploadingLogo || !logoPreview || logoPreview === logoUrl}
              >
                {uploadingLogo ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Upload Logo
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
