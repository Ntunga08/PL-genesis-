import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { toast } from 'sonner';
import { FlaskConical, AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function LabDashboard() {
  const [labTests, setLabTests] = useState<any[]>([]);
  const [stats, setStats] = useState({ pending: 0, inProgress: 0, completed: 0 });
  const [loading, setLoading] = useState(true); // Initial load only
  const [refreshing, setRefreshing] = useState(false); // Background refresh
  const [selectedPatientTests, setSelectedPatientTests] = useState<any[]>([]);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [batchResults, setBatchResults] = useState<Record<string, any>>({});
  const [groupedTests, setGroupedTests] = useState<Record<string, any[]>>({});
  const [isViewMode, setIsViewMode] = useState(false); // Track if dialog is in view-only mode
  const [addTestDialogOpen, setAddTestDialogOpen] = useState(false);
  const [labTestServices, setLabTestServices] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState(''); // Search functionality

  const [newTestData, setNewTestData] = useState({
    test_name: '',
    test_type: 'Laboratory',
    priority: 'Routine',
    notes: ''
  });

  useEffect(() => {
    fetchData(true); // Initial load with loading screen
    fetchLabTestServices(); // Fetch available lab test services

    // Use polling instead of realtime subscriptions
    const interval = setInterval(() => fetchData(false), 30000); // Background refresh every 30 seconds

    return () => {
      clearInterval(interval);
    };
  }, []);

  const fetchLabTestServices = async () => {
    try {
      const { data } = await api.get('/labs/services');
      setLabTestServices(data.services || []);
    } catch (error) {

      // Don't show error toast, just log it
    }
  };

  const fetchData = async (isInitialLoad = true) => {
    if (isInitialLoad) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    
    try {
      // Fetch lab tests
      const { data } = await api.get('/labs?limit=50');
      const testsData = data.labTests || data.tests || [];

      // Also fetch visits in lab stage with no tests (sent by nurse)
      const visitsRes = await api.get('/visits?current_stage=lab&lab_status=Pending&limit=50');
      const visitsInLab = visitsRes.data.visits || [];
      
      // Filter visits that have no lab tests yet (sent by nurse)
      const visitsWithoutTests = visitsInLab.filter(visit => {
        const hasTests = testsData.some(test => test.patient_id === visit.patient_id);
        return !hasTests;
      });

      // Remove duplicates based on ID
      const uniqueTests = testsData?.filter((test, index, self) =>
        index === self.findIndex(t => t.id === test.id)
      ) || [];

      // Filter to only show tests that are NOT completed or cancelled
      // For patients returning to lab, only show tests ordered today or recently
      const today = new Date().toISOString().split('T')[0];
      const activeTests = uniqueTests.filter(t => {
        // Always show non-completed tests
        if (t.status === 'Completed' || t.status === 'Cancelled') {
          return false;
        }
        
        // For pending tests, only show if they were ordered today or recently
        // This prevents showing old completed tests that were re-ordered
        if (t.status === 'Pending' || t.status === 'Ordered') {
          // Use created_at for accurate timestamp, fallback to test_date
          const testDate = t.created_at || t.test_date;
          if (testDate) {
            const testDateOnly = new Date(testDate).toISOString().split('T')[0];
            return testDateOnly === today;
          }
        }
        
        // Show all in-progress tests regardless of date
        return true;
      });

      // Calculate stats from ACTIVE tests (what's actually displayed)
      const pending = activeTests.filter(t => t.status === 'Pending' || t.status === 'Ordered' || t.status === 'Sample Collected').length;
      const inProgress = activeTests.filter(t => t.status === 'In Progress').length;
      const completed = uniqueTests.filter(t => t.status === 'Completed').length;
      
      // Add visits without tests to pending count only if they actually exist and are displayed
      const actualVisitsWithoutTests = visitsWithoutTests.filter(visit => {
        // Only count visits that don't already have a patient in activeTests
        return !activeTests.some(test => test.patient_id === visit.patient_id);
      });
      
      const finalPending = pending + actualVisitsWithoutTests.length;

      setStats({ pending: finalPending, inProgress, completed });

      setLabTests(activeTests);

      // Group tests by patient
      const grouped = activeTests.reduce((acc: Record<string, any[]>, test) => {
        const patientId = test.patient_id;
        if (!acc[patientId]) {
          acc[patientId] = [];
        }
        acc[patientId].push(test);
        return acc;
      }, {});
      
      // Add visits without tests as empty groups (nurse sent, no tests entered yet)
      visitsWithoutTests.forEach(visit => {
        if (!grouped[visit.patient_id]) {
          grouped[visit.patient_id] = [{
            id: `visit-${visit.id}`,
            patient_id: visit.patient_id,
            visit_id: visit.id,
            patient: visit.patient,
            visit: visit,
            test_name: 'No tests entered yet',
            status: 'Awaiting Tests',
            priority: 'Routine',
            ordered_date: visit.created_at,
            notes: 'Sent by nurse - tests to be entered by lab tech',
            isPlaceholder: true // Flag to identify placeholder
          }];
        }
      });
      
      setGroupedTests(grouped);
    } catch (error) {

      toast.error('Failed to load lab tests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };



  const handleBatchTestSubmit = async (patientId: string) => {
    // Get all tests for this patient that are pending, ordered, sample collected, or in progress
    const patientTests = labTests.filter(
      test => test.patient_id === patientId && 
      (test.status === 'Pending' || test.status === 'Ordered' || test.status === 'Sample Collected' || test.status === 'In Progress')
    );
    
    if (patientTests.length === 0) {
      toast.error('No pending tests for this patient');
      return;
    }

    // Auto-start all ordered/sample collected tests
    const pendingTests = patientTests.filter(t => t.status === 'Ordered' || t.status === 'Sample Collected');
    if (pendingTests.length > 0) {
      await Promise.all(
        pendingTests.map(test => 
          api.put(`/labs/${test.id}`, { status: 'In Progress' })
        )
      );
      toast.info(`Started ${pendingTests.length} test(s)`);
    }



    setSelectedPatientTests(patientTests);
    setIsViewMode(false); // Set to edit mode
    // Initialize batch results with empty values
    const initialResults: Record<string, any> = {};
    patientTests.forEach(test => {
      initialResults[test.id] = {
        result_value: '',
        reference_range: '',
        unit: '',
        abnormal_flag: false,
        notes: ''
      };
    });
    setBatchResults(initialResults);
    setBatchDialogOpen(true);
  };

  const handleAddTestToPatient = async () => {
    if (!newTestData.test_name.trim()) {
      toast.error('Please enter a test name');
      return;
    }

    if (!selectedPatientTests[0]?.patient_id) {
      toast.error('No patient selected');
      return;
    }

    try {
      const response = await api.post('/labs', {
        patient_id: selectedPatientTests[0].patient_id,
        visit_id: selectedPatientTests[0].visit_id || selectedPatientTests[0].id,
        test_name: newTestData.test_name,
        test_type: newTestData.test_type,
        priority: newTestData.priority,
        notes: newTestData.notes,
        status: 'Pending'
      });

      toast.success(`Test "${newTestData.test_name}" added successfully`);
      
      // Reset form
      setNewTestData({
        test_name: '',
        test_type: 'Laboratory',
        priority: 'Routine',
        notes: ''
      });
      setAddTestDialogOpen(false);
      
      // Refresh data to show new test
      await fetchData(false);
      
      // Update selected patient tests to include the new test
      const updatedTests = [...selectedPatientTests, response.data.labTest];
      setSelectedPatientTests(updatedTests);
      
      // Initialize batch result for new test
      setBatchResults(prev => ({
        ...prev,
        [response.data.labTest.id]: {
          result_value: '',
          reference_range: '',
          unit: '',
          abnormal_flag: false,
          notes: ''
        }
      }));
    } catch (error) {

      toast.error('Failed to add test');
    }
  };

  const handleBatchResultChange = (testId: string, field: string, value: any) => {
    setBatchResults(prev => ({
      ...prev,
      [testId]: {
        ...prev[testId],
        [field]: value
      }
    }));
  };



  const handleSubmitBatchResults = async () => {
    try {
      const resultsToInsert = [];
      const testsToUpdate = [];
      const testsWithoutResults = [];

      for (const test of selectedPatientTests) {
        const result = batchResults[test.id];
        if (result && result.result_value) {
          // Format results as JSON for storage in the results field
          const formattedResults = {
            test_date: new Date().toISOString(),
            performed_by: 'Lab Technician',
            results: {
              [test.test_name]: {
                value: result.result_value,
                unit: result.unit || '',
                normal_range: result.reference_range || '',
                status: result.abnormal_flag ? 'Abnormal' : 'Normal'
              }
            },
            interpretation: result.notes || '',
            recommendations: ''
          };

          resultsToInsert.push({
            test_id: test.id,
            results: JSON.stringify(formattedResults)
          });
          testsToUpdate.push(test.id);
        }
      }

      if (resultsToInsert.length === 0) {
        toast.error('Please fill in at least one test result');
        return;
      }

      // Insert all results using batch endpoint
      await api.post('/labs/results/batch', {
        results: resultsToInsert,
        testIds: testsToUpdate
      });

      // Update patient workflow
      let patientId = null;
      if (selectedPatientTests.length > 0) {
        patientId = selectedPatientTests[0].patient_id;
        await updatePatientWorkflow(patientId);
      }

      toast.success(`${resultsToInsert.length} test results submitted successfully`);
      
      // Update local state immediately to remove completed tests
      if (patientId) {
        setGroupedTests(prev => {
          const updated = { ...prev };
          delete updated[patientId];
          return updated;
        });
        setLabTests(prev => prev.filter(t => t.patient_id !== patientId));
      }
      
      // Close dialog and reset
      setBatchDialogOpen(false);
      setSelectedPatientTests([]);
      setBatchResults({});
      setIsViewMode(false);
      
      // Refresh data after a delay to ensure backend has processed
      setTimeout(() => {
        fetchData();
      }, 1000);
    } catch (error) {

      toast.error('Failed to submit batch results');
    }
  };

  // Handle discharge for direct-to-lab patients
  const handleDischargePatient = async (patientId: string) => {
    try {
      // Get the patient's visit
      const { data } = await api.get(`/visits?patient_id=${patientId}&current_stage=lab&overall_status=Active&limit=1`);
      const visits = data.visits || [];

      if (visits && visits.length > 0) {
        const visit = visits[0];
        
        // Check if this is a direct-to-lab visit (Quick Service Laboratory)
        const isDirectToLab = visit.visit_type === 'Quick Service' && visit.notes?.includes('Laboratory');
        
        if (isDirectToLab) {
          // Discharge the patient directly
          await api.put(`/visits/${visit.id}`, {
            lab_status: 'Completed',
            lab_completed_at: new Date().toISOString(),
            current_stage: 'completed',
            overall_status: 'Completed',
            discharge_time: new Date().toISOString(),
            discharge_notes: 'Direct-to-lab service completed and patient discharged'
          });
          
          toast.success('Patient discharged successfully');
          
          // Remove from local state
          setGroupedTests(prev => {
            const updated = { ...prev };
            delete updated[patientId];
            return updated;
          });
          setLabTests(prev => prev.filter(t => t.patient_id !== patientId));
          
          // Refresh data
          setTimeout(() => fetchData(false), 1000);
        } else {
          toast.error('Only direct-to-lab patients can be discharged from lab');
        }
      } else {
        toast.error('No active visit found for this patient');
      }
    } catch (error) {

      toast.error('Failed to discharge patient');
    }
  };

  const updatePatientWorkflow = async (patientId: string) => {
    try {

      // Get active visits for this patient that are in lab stage
      const { data } = await api.get(`/visits?patient_id=${patientId}&current_stage=lab&limit=1`);
      const visits = data.visits || [];

      if (visits && visits.length > 0) {
        const visit = visits[0];
        const visitId = visit.id;

        // IMPROVED WORKFLOW: Determine where to send patient based on who ordered the tests
        // 1. Doctor ordered tests → Send back to doctor for review
        // 2. Nurse ordered tests → Send back to nurse for next steps
        // 3. Direct lab orders → Send to billing
        
        // IMPROVED: Better detection logic for who ordered the tests
        const orderedByDoctor = (
          // Has doctor involvement
          (visit.doctor_status !== 'Not Required' && visit.doctor_id) ||
          // Visit type is consultation (not Lab Only)
          (visit.visit_type === 'Consultation' && visit.doctor_id) ||
          // Doctor status indicates involvement
          (visit.doctor_status === 'Pending Review' || visit.doctor_status === 'In Progress' || visit.doctor_status === 'In Consultation')
        );
        
        const orderedByNurse = (
          // Nurse completed and doctor not required (nurse workflow)
          (visit.nurse_status === 'Completed' && visit.doctor_status === 'Not Required') || 
          // Notes indicate nurse ordering
          (visit.notes && visit.notes.includes('nurse'))
        );
        
        const isLabOnlyVisit = visit.visit_type === 'Lab Only';

        let updateData;
        if (orderedByDoctor) {
          // Lab tests ordered by doctor → send back to doctor for review
          updateData = {
            lab_status: 'Completed',
            lab_completed_at: new Date().toISOString(),
            current_stage: 'doctor',
            doctor_status: 'Pending Review'
          };

        } else if (orderedByNurse && !isLabOnlyVisit) {
          // Lab tests ordered by nurse in consultation → send back to nurse for review
          updateData = {
            lab_status: 'Completed',
            lab_completed_at: new Date().toISOString(),
            current_stage: 'nurse',
            nurse_status: 'Pending Review' // Nurse needs to review lab results
          };

        } else if (isLabOnlyVisit || orderedByNurse) {
          // Lab Only visits or nurse-ordered direct lab → send to billing
          updateData = {
            lab_status: 'Completed',
            lab_completed_at: new Date().toISOString(),
            current_stage: 'billing',
            billing_status: 'Pending'
          };

        } else {
          // Direct lab orders (Lab Only visits) → send to billing
          // Consultation visits with unclear routing → send to billing as fallback
          updateData = {
            lab_status: 'Completed',
            lab_completed_at: new Date().toISOString(),
            current_stage: 'billing',
            billing_status: 'Pending'
          };

        }
        
        const response = await api.put(`/visits/${visitId}`, updateData);

        if (orderedByDoctor) {
          toast.success('Lab tests completed. Patient sent back to doctor for review.');
        } else if (orderedByNurse) {
          toast.success('Lab tests completed. Patient sent back to nurse for review.');
        } else {
          toast.success('Lab tests completed. Patient sent to billing for payment.');
        }
        
        // Refresh the lab dashboard to remove completed patient from queue
        await fetchData(false);
      } else {

        // Get the test to find the doctor
        const test = selectedPatientTests[0];
        if (test && test.doctor_id) {
          // Create a new visit for this patient
          const newVisit = {
            patient_id: patientId,
            doctor_id: test.doctor_id,
            visit_date: new Date().toISOString(),
            status: 'Active',
            current_stage: 'doctor',
            lab_status: 'Completed',
            lab_completed_at: new Date().toISOString(),
            doctor_status: 'Pending Review',
            overall_status: 'Active'
          };

          const response = await api.post('/visits', newVisit);

          // Update the lab tests with the new visit_id
          if (response.data.visit && response.data.visit.id) {
            for (const test of selectedPatientTests) {
              await api.put(`/labs/${test.id}`, { visit_id: response.data.visit.id });
            }
          }
          
          toast.success('Lab results sent to doctor for review');
          
          // Refresh the lab dashboard
          await fetchData(false);
        } else {
          toast.warning('Could not create visit - no doctor assigned');
        }
      }
    } catch (error: any) {


      toast.error(`Failed to update workflow: ${error.response?.data?.error || error.message}`);
      // Don't throw error - results were already saved successfully
    }
  };

  const handleUpdateStatus = async (testId: string, newStatus: string, patientId?: string) => {
    try {
      await api.put(`/labs/${testId}`, {
        status: newStatus,
        completed_date: newStatus === 'Completed' ? new Date().toISOString() : null
      });
    } catch (error) {
      toast.error('Failed to update test status');
      return;
    }

    // If test is completed and we have patient ID, update workflow
    if (newStatus === 'Completed' && patientId) {

      // Check if patient already has active prescriptions before proceeding
      const { data: prescData } = await api.get(`/prescriptions?patient_id=${patientId}&status=Pending,Active&limit=1`);
      const existingPrescriptions = prescData.prescriptions || [];

      if (existingPrescriptions && existingPrescriptions.length > 0) {

        toast.success('Lab test completed - patient already has prescriptions assigned');
        fetchData();
        return;
      }

      // First, let's find the correct patient visit for this patient (in lab stage)
      const { data: visitData } = await api.get(`/visits?patient_id=${patientId}&current_stage=lab&limit=5`);
      const visits = visitData.visits || [];

      if (visits && visits.length > 0) {
        // Find the most appropriate visit to update (prefer one in lab stage)
        let visitToUpdate = visits.find(v => v.current_stage === 'lab') || visits[0];

        try {
          await api.put(`/visits/${visitToUpdate.id}`, {
            lab_status: 'Completed',
            lab_completed_at: new Date().toISOString(),
            current_stage: 'doctor',
            doctor_status: 'Pending Review'
          });

          toast.success('Lab tests completed. Patient sent back to doctor for review.');
        } catch (workflowError) {

          toast.error('Test completed but failed to update workflow');
        }
      } else {


        // Create a patient visit if none exists
        try {
          await api.post('/visits', {
            patient_id: patientId,
            visit_date: new Date().toISOString().split('T')[0],
            current_stage: 'doctor',
            overall_status: 'Active',
            reception_status: 'Checked In',
            nurse_status: 'Completed',
            lab_status: 'Completed',
            doctor_status: 'Pending',
            lab_completed_at: new Date().toISOString()
          });

          toast.success('Lab result submitted and patient moved to doctor consultation');
        } catch (createError) {

          toast.error('Test completed but failed to create patient visit');
        }
      }
    }

    toast.success('Test status updated');
    fetchData();
};



  if (loading) {
    return (
      <DashboardLayout title="Laboratory Dashboard">
        <div className="space-y-8">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-lg"></div>)}
          </div>
          <div className="h-96 bg-gray-200 animate-pulse rounded-lg"></div>
        </div>
      </DashboardLayout>
    );
  }
  return (
    <DashboardLayout title="Laboratory Dashboard">
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

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-yellow-200 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Tests</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <FlaskConical className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            </CardContent>
          </Card>

          <Card className="border-green-200 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Lab Tests Table */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FlaskConical className="h-5 w-5" />
                  Lab Tests Queue
                  <Badge variant="default" className="bg-blue-600">
                    {Object.entries(groupedTests).filter(([_, tests]) => 
                      tests.some(t => t.status === 'Pending' || t.status === 'Ordered' || t.status === 'Sample Collected' || t.status === 'In Progress' || t.status === 'Awaiting Tests')
                    ).length} patient{Object.entries(groupedTests).filter(([_, tests]) => 
                      tests.some(t => t.status === 'Pending' || t.status === 'Ordered' || t.status === 'Sample Collected' || t.status === 'In Progress' || t.status === 'Awaiting Tests')
                    ).length !== 1 ? 's' : ''}
                  </Badge>
                </CardTitle>
                <CardDescription>Manage and process laboratory tests</CardDescription>
              </div>

            </div>
          </CardHeader>
          <CardContent>
            {/* Search Bar */}
            <div className="mb-4">
              <Input
                type="text"
                placeholder="Search by patient name, phone, or test name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Total Tests</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ordered</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(groupedTests)
                    .filter(([_, tests]) => {
                      // Filter by status - include visits without tests (Awaiting Tests)
                      const hasActiveTests = tests.some(t => 
                        t.status === 'Pending' || 
                        t.status === 'Ordered' || 
                        t.status === 'Sample Collected' || 
                        t.status === 'In Progress' ||
                        t.status === 'Awaiting Tests'
                      );
                      if (!hasActiveTests) return false;
                      
                      // Filter by search term
                      if (!searchTerm) return true;
                      const searchLower = searchTerm.toLowerCase();
                      const latestTest = tests[0];
                      const patientName = latestTest.patient?.full_name?.toLowerCase() || '';
                      const patientPhone = latestTest.patient?.phone?.toLowerCase() || '';
                      const testNames = tests.map(t => t.test_name?.toLowerCase() || '').join(' ');
                      
                      return patientName.includes(searchLower) || 
                             patientPhone.includes(searchLower) || 
                             testNames.includes(searchLower);
                    })
                    .map(([patientId, tests]) => {
                      const pendingCount = tests.filter(t => t.status === 'Ordered' || t.status === 'Sample Collected').length;
                      const inProgressCount = tests.filter(t => t.status === 'In Progress').length;
                      const completedCount = tests.filter(t => t.status === 'Completed').length;
                      const hasSTAT = tests.some(t => t.priority === 'STAT');
                      const hasUrgent = tests.some(t => t.priority === 'Urgent');
                      const latestTest = tests.sort((a, b) => {
                        // Use created_at for accurate sorting, fallback to other dates
                        const dateA = a.created_at ? new Date(a.created_at).getTime() : 
                                     (a.ordered_date ? new Date(a.ordered_date).getTime() : 0);
                        const dateB = b.created_at ? new Date(b.created_at).getTime() : 
                                     (b.ordered_date ? new Date(b.ordered_date).getTime() : 0);
                        return dateB - dateA;
                      })[0];

                      return (
                        <TableRow key={patientId} className="hover:bg-blue-50/50">
                          <TableCell>
                            <div>
                              <div className="font-medium">{latestTest.patient?.full_name || 'Unknown'}</div>
                              <div className="text-xs text-muted-foreground">{latestTest.patient?.phone}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {tests[0]?.isPlaceholder ? (
                                <Badge variant="outline" className="bg-orange-50 text-orange-700">
                                  Awaiting Tests
                                </Badge>
                              ) : (
                                <>
                                  <Badge variant="outline" className="bg-blue-50">
                                    {tests.length} test{tests.length !== 1 ? 's' : ''}
                                  </Badge>
                                  {pendingCount > 0 && (
                                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 text-xs">
                                      {pendingCount} pending
                                    </Badge>
                                  )}
                                  {inProgressCount > 0 && (
                                    <Badge variant="outline" className="bg-blue-100 text-blue-700 text-xs">
                                      {inProgressCount} in progress
                                    </Badge>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {hasSTAT ? (
                              <Badge variant="destructive" className="text-xs">
                                STAT
                              </Badge>
                            ) : hasUrgent ? (
                              <Badge variant="warning" className="text-xs">
                                Urgent
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                Normal
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {tests[0]?.isPlaceholder ? (
                              <Badge variant="outline" className="bg-orange-50 text-orange-800">
                                Sent by Nurse
                              </Badge>
                            ) : inProgressCount > 0 ? (
                              <Badge variant="info" className="bg-blue-100 text-blue-800">
                                In Progress
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-800">
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {(() => {
                                // Use created_at for accurate timestamp, fallback to other dates
                                const dateToUse = latestTest.created_at || latestTest.ordered_date || latestTest.test_date;
                                if (dateToUse && !isNaN(new Date(dateToUse).getTime())) {
                                  return format(new Date(dateToUse), 'MMM dd, HH:mm');
                                }
                                return 'N/A';
                              })()}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {tests[0]?.isPlaceholder ? (
                                // Patient sent by nurse - no tests entered yet
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => {
                                    // Open dialog to add tests for this patient
                                    setSelectedPatientTests(tests);
                                    setAddTestDialogOpen(true);
                                  }}
                                  className="flex items-center gap-1 bg-orange-600 hover:bg-orange-700"
                                >
                                  <FlaskConical className="h-3 w-3" />
                                  Enter Tests
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {


                                      // Show all tests for this patient (including completed ones)
                                      setSelectedPatientTests(tests);
                                      setIsViewMode(true); // Set view mode
                                      setBatchResults({}); // Clear results
                                      setBatchDialogOpen(true);
                                    }}
                                    className="flex items-center gap-1"
                                  >
                                    <FlaskConical className="h-3 w-3" />
                                    View Tests
                                  </Button>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleBatchTestSubmit(patientId)}
                                    className="flex items-center gap-1"
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                    Submit Results
                                  </Button>
                                  {(() => {
                                    // Check if this is a direct-to-lab patient (Quick Service)
                                    const isDirectToLab = tests.some(t => 
                                      t.visit?.visit_type === 'Quick Service' && 
                                      t.visit?.notes?.includes('Laboratory')
                                    );
                                    
                                    if (isDirectToLab && completedCount === tests.length) {
                                      return (
                                        <Button
                                          variant="default"
                                          size="sm"
                                          onClick={() => handleDischargePatient(patientId)}
                                          className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
                                        >
                                          <CheckCircle className="h-3 w-3" />
                                          Discharge
                                        </Button>
                                      );
                                    }
                                    return null;
                                  })()}
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  {Object.entries(groupedTests).filter(([_, tests]) => 
                    tests.some(t => t.status === 'Pending' || t.status === 'Ordered' || t.status === 'Sample Collected' || t.status === 'In Progress' || t.status === 'Awaiting Tests')
                  ).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        <FlaskConical className="h-12 w-12 mx-auto mb-2 opacity-30" />
                        <p>No pending lab tests</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>



        {/* View Tests Dialog - Read Only (What needs to be tested) */}
        <Dialog open={batchDialogOpen && isViewMode && selectedPatientTests.length > 0} onOpenChange={(open) => {
          if (!open) {
            setBatchDialogOpen(false);
            setSelectedPatientTests([]);
            setIsViewMode(false);
          }
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5" />
                Lab Tests for {selectedPatientTests[0]?.patient?.full_name}
              </DialogTitle>
              <DialogDescription>
                Tests to be performed: {selectedPatientTests.length} test(s)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {selectedPatientTests.map((test, index) => (
                <Card key={test.id} className="border-2 border-blue-100">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-semibold text-lg">{test.test_name}</h4>
                          <p className="text-sm text-muted-foreground">{test.test_type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={
                            test.priority === 'STAT' ? 'destructive' : 
                            test.priority === 'Urgent' ? 'default' : 
                            'secondary'
                          }
                        >
                          {test.priority}
                        </Badge>
                        <Badge 
                          variant={
                            test.status === 'Completed' ? 'default' :
                            test.status === 'In Progress' ? 'secondary' :
                            'outline'
                          }
                        >
                          {test.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm bg-blue-50 p-2 rounded border border-blue-200">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span><strong>Ordered:</strong> {(() => {
                          // Use created_at for accurate timestamp, fallback to other dates
                          const dateToUse = test.created_at || test.ordered_date || test.test_date;
                          if (dateToUse && !isNaN(new Date(dateToUse).getTime())) {
                            return format(new Date(dateToUse), 'MMM dd, yyyy HH:mm');
                          }
                          return 'N/A';
                        })()}</span>
                      </div>
                      {test.notes && (
                        <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                          <div className="flex items-start gap-2">
                            <span className="text-lg">💡</span>
                            <div>
                              <strong className="text-yellow-800 text-sm">Doctor's Instructions:</strong>
                              <p className="text-yellow-700 text-sm mt-1">{test.notes}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
              <div className="flex justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => {
                  setBatchDialogOpen(false);
                  setSelectedPatientTests([]);
                  setIsViewMode(false);
                }}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Submit Results Dialog - With Form */}
        <Dialog open={batchDialogOpen && !isViewMode && selectedPatientTests.length > 0} onOpenChange={(open) => {
          if (!open) {
            setBatchDialogOpen(false);
            setSelectedPatientTests([]);
            setBatchResults({});
            setIsViewMode(false);
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="flex items-center gap-2">
                    <FlaskConical className="h-5 w-5" />
                    Submit Results for {selectedPatientTests[0]?.patient?.full_name}
                  </DialogTitle>
                  <DialogDescription>
                    Enter results for {selectedPatientTests.filter(t => t.status === 'Pending' || t.status === 'Ordered' || t.status === 'Sample Collected' || t.status === 'In Progress').length} test(s)
                  </DialogDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddTestDialogOpen(true)}
                >
                  ➕ Add Test
                </Button>
              </div>
            </DialogHeader>
            <div className="space-y-4">
              {selectedPatientTests
                .filter(test => test.status === 'Pending' || test.status === 'Ordered' || test.status === 'Sample Collected' || test.status === 'In Progress')
                .map((test, index) => (
                <Card key={test.id} className="border-2">
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-semibold text-lg">{test.test_name}</h4>
                          <p className="text-sm text-muted-foreground">{test.test_type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={
                            test.priority === 'STAT' ? 'destructive' : 
                            test.priority === 'Urgent' ? 'default' : 
                            'secondary'
                          }
                        >
                          {test.priority}
                        </Badge>
                        <Badge 
                          variant={
                            test.status === 'In Progress' ? 'secondary' : 'outline'
                          }
                        >
                          {test.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={async () => {
                            if (confirm(`Cancel test: ${test.test_name}?\n\nThis will remove the test from the patient's order.`)) {
                              try {
                                // Update test status to Cancelled instead of deleting
                                await api.put(`/labs/${test.id}`, { 
                                  status: 'Cancelled',
                                  cancelled_at: new Date().toISOString()
                                });
                                toast.success(`Test "${test.test_name}" cancelled`);
                                
                                // Remove from local state in dialog
                                const updatedTests = selectedPatientTests.filter(t => t.id !== test.id);
                                setSelectedPatientTests(updatedTests);
                                
                                // Update grouped tests - only remove patient if NO tests remain
                                setLabTests(prev => prev.map(t => 
                                  t.id === test.id ? { ...t, status: 'Cancelled' } : t
                                ).filter(t => t.status !== 'Cancelled'));
                                
                                setGroupedTests(prev => {
                                  const updated = { ...prev };
                                  const patientId = test.patient_id;
                                  
                                  // Filter out cancelled test
                                  const remainingTests = (updated[patientId] || []).filter(t => t.id !== test.id);
                                  
                                  // Only remove patient from queue if NO tests remain
                                  if (remainingTests.length === 0) {
                                    delete updated[patientId];
                                  } else {
                                    updated[patientId] = remainingTests;
                                  }
                                  
                                  return updated;
                                });
                                
                                // If no more tests for this patient, close dialog
                                if (updatedTests.length === 0) {
                                  setBatchDialogOpen(false);
                                  setSelectedPatientTests([]);
                                  setBatchResults({});
                                }
                                
                                // Refresh data with a small delay to ensure backend has processed
                                setTimeout(() => {
                                  fetchData(false);
                                }, 500);
                              } catch (error) {

                                toast.error('Failed to cancel test');
                              }
                            }
                          }}
                        >
                          🗑️ Cancel
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`result_${test.id}`}>Result Value *</Label>
                        <Input
                          id={`result_${test.id}`}
                          value={batchResults[test.id]?.result_value || ''}
                          onChange={(e) => handleBatchResultChange(test.id, 'result_value', e.target.value)}
                          placeholder="Enter result"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`unit_${test.id}`}>Unit</Label>
                        <Input
                          id={`unit_${test.id}`}
                          value={batchResults[test.id]?.unit || ''}
                          onChange={(e) => handleBatchResultChange(test.id, 'unit', e.target.value)}
                          placeholder="mg/dL, mmol/L, etc."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`range_${test.id}`}>Reference Range</Label>
                        <Input
                          id={`range_${test.id}`}
                          value={batchResults[test.id]?.reference_range || ''}
                          onChange={(e) => handleBatchResultChange(test.id, 'reference_range', e.target.value)}
                          placeholder="e.g., 70-100"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`abnormal_${test.id}`}>Status</Label>
                        <Select
                          value={batchResults[test.id]?.abnormal_flag ? 'true' : 'false'}
                          onValueChange={(value) => handleBatchResultChange(test.id, 'abnormal_flag', value === 'true')}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="false">Normal</SelectItem>
                            <SelectItem value="true">Abnormal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`notes_${test.id}`}>Lab Notes</Label>
                      <Textarea
                        id={`notes_${test.id}`}
                        value={batchResults[test.id]?.notes || ''}
                        onChange={(e) => handleBatchResultChange(test.id, 'notes', e.target.value)}
                        placeholder="Additional notes..."
                        rows={2}
                      />
                    </div>
                  </div>
                </Card>
              ))}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => {
                  setBatchDialogOpen(false);
                  setSelectedPatientTests([]);
                  setBatchResults({});
                  setIsViewMode(false);
                }}>
                  Cancel
                </Button>
                
                
                <Button onClick={handleSubmitBatchResults}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Submit All Results
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Test Dialog */}
        <Dialog open={addTestDialogOpen} onOpenChange={setAddTestDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5" />
                Add Additional Test
              </DialogTitle>
              <DialogDescription>
                Add a new lab test for {selectedPatientTests[0]?.patient?.full_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test_name">Test Name *</Label>
                <Select
                  value={newTestData.test_name}
                  onValueChange={(value) => {
                    // Find the selected service to auto-fill test_type
                    const selectedService = labTestServices.find(s => s.service_name === value);
                    setNewTestData({ 
                      ...newTestData, 
                      test_name: value,
                      test_type: selectedService?.service_type || 'Laboratory'
                    });
                  }}
                >
                  <SelectTrigger id="test_name">
                    <SelectValue placeholder="Select a lab test" />
                  </SelectTrigger>
                  <SelectContent>
                    {labTestServices.length === 0 ? (
                      <SelectItem value="no-tests" disabled>No lab tests available</SelectItem>
                    ) : (
                      labTestServices.map((service) => (
                        <SelectItem key={service.id} value={service.service_name}>
                          {service.service_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="test_type">Test Type</Label>
                <Select
                  value={newTestData.test_type}
                  onValueChange={(value) => setNewTestData({ ...newTestData, test_type: value })}
                >
                  <SelectTrigger id="test_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Laboratory">Laboratory</SelectItem>
                    <SelectItem value="Radiology">Radiology</SelectItem>
                    <SelectItem value="Pathology">Pathology</SelectItem>
                    <SelectItem value="Microbiology">Microbiology</SelectItem>
                    <SelectItem value="Hematology">Hematology</SelectItem>
                    <SelectItem value="Chemistry">Chemistry</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={newTestData.priority}
                  onValueChange={(value) => setNewTestData({ ...newTestData, priority: value })}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Routine">Routine</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                    <SelectItem value="STAT">STAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={newTestData.notes}
                  onChange={(e) => setNewTestData({ ...newTestData, notes: e.target.value })}
                  placeholder="Any special instructions or notes..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAddTestDialogOpen(false);
                    setNewTestData({
                      test_name: '',
                      test_type: 'Laboratory',
                      priority: 'Routine',
                      notes: ''
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddTestToPatient}>
                  <FlaskConical className="h-4 w-4 mr-2" />
                  Add Test
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
