import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Printer, Download } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Logo from '@/components/Logo';


type DateFilter = 'today' | 'week' | 'month' | 'all';

export default function AdminReports() {
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [reportData, setReportData] = useState<any>({
    patients: [],
    appointments: [],
    visits: [],
    prescriptions: [],
    labTests: [],
    invoices: []
  });
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalAppointments: 0,
    totalVisits: 0,
    totalPrescriptions: 0,
    totalLabTests: 0,
    totalInvoices: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    hospitalName: 'Medical Center',
    reportHeader: 'Healthcare Management System Report',
    consultationFee: 2000,
    includePatientDetails: true,
    includeAppointments: true,
    includeVisits: true,
    includePrescriptions: true,
    includeLabTests: true,
    includeInvoices: true
  });

  useEffect(() => {
    fetchReportData();
    fetchSystemSettings();
  }, [dateFilter]);

  const fetchSystemSettings = async () => {
    try {
      const { data } = await api.get('/settings');
      const settings = data.settings || [];

      if (settings.length > 0) {
        const settingsMap: Record<string, string> = {};
        settings.forEach((setting: any) => {
          settingsMap[setting.key] = setting.value;
        });

        setSettings(prev => ({
          ...prev,
          consultationFee: Number(settingsMap.consultation_fee || prev.consultationFee),
          hospitalName: settingsMap.hospital_name || prev.hospitalName,
          reportHeader: settingsMap.report_header || prev.reportHeader
        }));
      }
    } catch (error) {

    }
  };

  const getDateRange = () => {
    const now = new Date();
    
    switch (dateFilter) {
      case 'today':
        return {
          start: startOfDay(now),
          end: endOfDay(now)
        };
      case 'week':
        return {
          start: startOfWeek(now),
          end: endOfWeek(now)
        };
      case 'month':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
      case 'all':
        return {
          start: new Date('2000-01-01'),
          end: now
        };
      default:
        return {
          start: startOfDay(now),
          end: endOfDay(now)
        };
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      const startStr = start.toISOString();
      const endStr = end.toISOString();

      // Fetch all data from MySQL API with individual error handling
      const [patientsRes, appointmentsRes, visitsRes, prescriptionsRes, labTestsRes, invoicesRes] = await Promise.allSettled([
        api.get(`/patients?from=${startStr}&to=${endStr}`),
        api.get(`/appointments?from=${startStr}&to=${endStr}`),
        api.get(`/visits?from=${startStr}&to=${endStr}`),
        api.get(`/prescriptions?from=${startStr}&to=${endStr}`),
        api.get(`/lab-tests?from=${startStr}&to=${endStr}`),
        api.get(`/billing/invoices?from=${startStr}&to=${endStr}&limit=1000`)
      ]);

      const patientsData = patientsRes.status === 'fulfilled' ? (patientsRes.value.data.patients || []) : [];
      const appointmentsData = appointmentsRes.status === 'fulfilled' ? (appointmentsRes.value.data.appointments || []) : [];
      const visitsData = visitsRes.status === 'fulfilled' ? (visitsRes.value.data.visits || []) : [];
      const prescriptionsData = prescriptionsRes.status === 'fulfilled' ? (prescriptionsRes.value.data.prescriptions || []) : [];
      const labTestsData = labTestsRes.status === 'fulfilled' ? (labTestsRes.value.data.labTests || labTestsRes.value.data.tests || []) : [];
      const invoicesData = invoicesRes.status === 'fulfilled' ? (invoicesRes.value.data.invoices || []) : [];



      // Calculate total revenue from invoices
      const totalRevenue = invoicesData.reduce((sum: number, inv: any) => sum + (Number(inv.total_amount) || 0), 0);
      
      // Calculate total invoice amounts (same as revenue but kept separate for clarity)
      const totalInvoiceAmount = invoicesData.reduce((sum: number, inv: any) => sum + (Number(inv.total_amount) || 0), 0);
      
      // Calculate total lab test count (keeping as count since lab tests don't have individual prices in the table)
      const totalLabTestCount = labTestsData.length;




      setReportData({
        patients: patientsData,
        appointments: appointmentsData,
        visits: visitsData,
        prescriptions: prescriptionsData,
        labTests: labTestsData,
        invoices: invoicesData
      });

      setStats({
        totalPatients: patientsData.length,
        totalAppointments: appointmentsData.length,
        totalVisits: visitsData.length,
        totalPrescriptions: prescriptionsData.length,
        totalLabTests: totalLabTestCount,
        totalInvoices: totalInvoiceAmount,
        totalRevenue: totalRevenue
      });

    } catch (error) {

      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const csvContent = generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${dateFilter}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Report exported successfully');
  };

  const generateCSV = () => {
    let csv = `${settings.reportHeader}\n`;
    csv += `Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}\n`;
    csv += `Period: ${dateFilter.toUpperCase()}\n\n`;

    // Summary
    csv += 'SUMMARY\n';
    csv += `Total Patients,${stats.totalPatients}\n`;
    csv += `Total Appointments,${stats.totalAppointments}\n`;
    csv += `Total Visits,${stats.totalVisits}\n`;
    csv += `Total Prescriptions,${stats.totalPrescriptions}\n`;
    csv += `Total Lab Tests,${stats.totalLabTests}\n\n`;

    // Patients
    if (settings.includePatientDetails && reportData.patients.length > 0) {
      csv += 'PATIENTS\n';
      csv += 'Name,Phone,Gender,Blood Group,Date of Birth,Status\n';
      reportData.patients.forEach((p: any) => {
        csv += `${p.full_name},${p.phone},${p.gender},${p.blood_group || 'N/A'},${p.date_of_birth},${p.status}\n`;
      });
      csv += '\n';
    }

    // Appointments
    if (settings.includeAppointments && reportData.appointments.length > 0) {
      csv += 'APPOINTMENTS\n';
      csv += 'Patient,Doctor,Date,Time,Status,Reason\n';
      reportData.appointments.forEach((a: any) => {
        csv += `${a.patient?.full_name || 'N/A'},${a.doctor?.full_name || 'N/A'},${a.appointment_date},${a.appointment_time},${a.status},${a.reason || 'N/A'}\n`;
      });
      csv += '\n';
    }

    return csv;
  };

  const getFilterLabel = () => {
    switch (dateFilter) {
      case 'today': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'all': return 'All Time';
      default: return 'Today';
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-20 bg-gray-200 animate-pulse rounded-lg"></div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-lg"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 print:space-y-4">
      {/* Header - Hidden on print */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-2xl font-bold">Admin Reports</h2>
          <p className="text-muted-foreground">Generate and export system reports</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateFilter} onValueChange={(value: DateFilter) => setDateFilter(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>



      {/* Professional Print Report - Only visible on print */}
      <div className="hidden print:block" style={{ padding: '20px', fontFamily: 'monospace' }}>
        {/* Header with Logo - Simple Lines Style */}
        <div style={{ borderTop: '3px solid #000', borderBottom: '3px solid #000', padding: '20px 0', marginBottom: '30px' }}>
          {/* Logo - Centered */}
          <div style={{ width: '100px', height: '120px', margin: '0 auto 15px auto' }}>
            <Logo size="xl" showText={false} />
          </div>
          
          {/* Title - Centered */}
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px 0', letterSpacing: '3px', color: '#000' }}>
              HASET HOSPITAL
            </h1>
            <h2 style={{ fontSize: '20px', margin: '0 0 15px 0', fontWeight: '700', color: '#000' }}>
              SYSTEM STATISTICS REPORT
            </h2>
            
            <div style={{ fontSize: '12px', color: '#333', marginTop: '12px' }}>
              <span><strong>Report Period:</strong> {getFilterLabel()}</span>
              <span style={{ margin: '0 10px' }}>|</span>
              <span><strong>Generated:</strong> {format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
            </div>
          </div>
        </div>

        {/* Summary Statistics */}
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '25px' }}>
          HOSPITAL STATISTICS SUMMARY
        </h3>

        <div style={{ lineHeight: '1.8', maxWidth: '700px', margin: '0 auto' }}>
          {/* Patient Statistics */}
          <div style={{ marginBottom: '25px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>PATIENT STATISTICS</h4>
            <div style={{ paddingLeft: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Patients:</span>
                <span style={{ fontWeight: 'bold', minWidth: '100px', textAlign: 'right' }}>{stats.totalPatients}</span>
              </div>
            </div>
          </div>

          {/* Appointment Statistics */}
          <div style={{ marginBottom: '25px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>APPOINTMENT STATISTICS</h4>
            <div style={{ paddingLeft: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Appointments:</span>
                <span style={{ fontWeight: 'bold', minWidth: '100px', textAlign: 'right' }}>{stats.totalAppointments}</span>
              </div>
            </div>
          </div>

          {/* Visit Statistics */}
          <div style={{ marginBottom: '25px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>VISIT STATISTICS</h4>
            <div style={{ paddingLeft: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Visits:</span>
                <span style={{ fontWeight: 'bold', minWidth: '100px', textAlign: 'right' }}>{stats.totalVisits}</span>
              </div>
            </div>
          </div>

          {/* Prescription Statistics */}
          <div style={{ marginBottom: '25px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>PRESCRIPTION STATISTICS</h4>
            <div style={{ paddingLeft: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Prescriptions:</span>
                <span style={{ fontWeight: 'bold', minWidth: '100px', textAlign: 'right' }}>{stats.totalPrescriptions}</span>
              </div>
            </div>
          </div>

          {/* Lab Test Statistics */}
          <div style={{ marginBottom: '25px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>LAB TEST STATISTICS</h4>
            <div style={{ paddingLeft: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Lab Tests:</span>
                <span style={{ fontWeight: 'bold', minWidth: '100px', textAlign: 'right' }}>{stats.totalLabTests}</span>
              </div>
            </div>
          </div>

          {/* Billing Statistics */}
          {reportData.invoices.length > 0 && (
            <div style={{ marginBottom: '25px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>BILLING STATISTICS</h4>
              <div style={{ paddingLeft: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span>Total Invoices:</span>
                  <span style={{ fontWeight: 'bold', minWidth: '150px', textAlign: 'right' }}>{reportData.invoices.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span>Paid Invoices:</span>
                  <span style={{ fontWeight: 'bold', minWidth: '150px', textAlign: 'right' }}>
                    {reportData.invoices.filter((inv: any) => inv.status === 'Paid').length}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                  <span>Pending Invoices:</span>
                  <span style={{ fontWeight: 'bold', minWidth: '150px', textAlign: 'right' }}>
                    {reportData.invoices.filter((inv: any) => inv.status !== 'Paid').length}
                  </span>
                </div>
                <div style={{ borderTop: '1px solid #000', paddingTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontWeight: 'bold' }}>Total Revenue:</span>
                    <span style={{ fontWeight: 'bold', minWidth: '150px', textAlign: 'right' }}>
                      TSh {reportData.invoices
                        .filter((inv: any) => inv.status === 'Paid')
                        .reduce((sum: number, inv: any) => sum + Number(inv.total_amount || 0), 0)
                        .toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Outstanding Amount:</span>
                    <span style={{ fontWeight: 'bold', minWidth: '150px', textAlign: 'right' }}>
                      TSh {reportData.invoices
                        .filter((inv: any) => inv.status !== 'Paid')
                        .reduce((sum: number, inv: any) => sum + (Number(inv.total_amount || 0) - Number(inv.paid_amount || 0)), 0)
                        .toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Compact */}
        <div style={{ textAlign: 'center', borderTop: '1px solid #000', padding: '8px 0', marginTop: '30px' }}>
          <p style={{ margin: '0', fontSize: '10px', fontWeight: 'bold' }}>End of Report | Generated by Hospital Management System</p>
        </div>
      </div>

      {/* Stats Cards - Hidden on print */}
      <div className="grid gap-4 md:grid-cols-5 print:hidden">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPatients}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAppointments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Visits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVisits}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Prescriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPrescriptions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Lab Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLabTests}</div>
          </CardContent>
        </Card>
      </div>


      {/* Print Styles */}
      <style>{`
        @media print {
          /* Hide ALL elements first */
          * {
            visibility: hidden;
          }
          
          /* Show ONLY the print report */
          .hidden.print\\:block,
          .hidden.print\\:block * {
            visibility: visible !important;
          }
          
          /* Position print report at top of page */
          .hidden.print\\:block {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          
          /* Remove height from hidden elements to prevent extra pages */
          .space-y-8 > *:not(.hidden) {
            height: 0 !important;
            overflow: hidden !important;
          }
          
          /* Prevent page breaks */
          .hidden.print\\:block {
            page-break-after: avoid !important;
          }
          
          @page {
            margin: 1cm;
            /* Remove browser default headers and footers */
            size: auto;
          }
          
          /* Hide browser print headers/footers */
          @page {
            margin-top: 0;
            margin-bottom: 0;
          }
          
          /* Ensure body doesn't create extra pages */
          body {
            height: auto !important;
          }
        }
      `}</style>
    </div>
  );
}
