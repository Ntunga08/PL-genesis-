import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import api from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  User, 
  Calendar, 
  Activity, 
  FlaskConical, 
  Pill, 
  Heart, 
  Thermometer, 
  FileText,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';

interface PatientMedicalHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: any;
}

interface MedicalHistoryData {
  visits: any[];
  labTests: any[];
  prescriptions: any[];
  vitals: any[];
  diagnoses: any[];
}

export function PatientMedicalHistory({ open, onOpenChange, patient }: PatientMedicalHistoryProps) {
  const [loading, setLoading] = useState(false);
  const [historyData, setHistoryData] = useState<MedicalHistoryData>({
    visits: [],
    labTests: [],
    prescriptions: [],
    vitals: [],
    diagnoses: []
  });

  useEffect(() => {
    if (open && patient) {
      fetchMedicalHistory();
    }
  }, [open, patient]);

  const fetchMedicalHistory = async () => {
    if (!patient?.id) {

      return;
    }

    setLoading(true);
    try {
      // Fetch all medical history data in parallel
      const [visitsRes, labTestsRes, prescriptionsRes] = await Promise.all([
        api.get(`/visits?patient_id=${patient.id}&limit=50`),
        api.get(`/labs?patient_id=${patient.id}&limit=100`),
        api.get(`/prescriptions?patient_id=${patient.id}&limit=100`)
      ]);



      // Process visits and extract diagnoses
      const visits = visitsRes.data.visits || [];
      const diagnoses = visits
        .filter(v => v.provisional_diagnosis || v.diagnosis)
        .map(v => ({
          id: v.id,
          diagnosis: v.provisional_diagnosis || v.diagnosis,
          date: v.visit_date,
          doctor: v.doctor?.name || v.doctor?.full_name || 'Unknown',
          notes: v.notes
        }));

      // Process lab tests
      const labTests = labTestsRes.data.labTests || labTestsRes.data.tests || [];
      
      // Process prescriptions - they should already include items from the API
      const prescriptions = prescriptionsRes.data.prescriptions || [];

      // Log prescription structure for debugging
      if (prescriptions.length > 0) {

      }

      setHistoryData({
        visits,
        labTests,
        prescriptions,
        vitals: [], // TODO: Add vitals API if available
        diagnoses
      });

    } catch (error) {

      toast.error('Failed to load medical history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      'Completed': 'bg-green-600',
      'Pending': 'bg-yellow-600',
      'Active': 'bg-blue-600',
      'Cancelled': 'bg-red-600',
      'In Progress': 'bg-purple-600'
    };
    
    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || 'bg-gray-600'}>
        {status}
      </Badge>
    );
  };

  const formatLabResults = (results: any) => {
    if (!results) return 'No results';
    
    try {
      const parsed = typeof results === 'string' ? JSON.parse(results) : results;
      if (parsed.results) {
        return Object.entries(parsed.results).map(([testName, result]: [string, any]) => (
          <div key={testName} className="text-sm">
            <span className="font-medium">{testName}:</span> {result.value} {result.unit}
            {result.status && (
              <Badge 
                variant={result.status === 'Normal' ? 'secondary' : 'destructive'} 
                className="ml-2 text-xs"
              >
                {result.status}
              </Badge>
            )}
          </div>
        ));
      }
      return 'Results available';
    } catch {
      return 'Results available';
    }
  };

  if (!patient) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Medical History - {patient.full_name}
          </DialogTitle>
          <DialogDescription>
            Complete medical history and records for this patient
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading medical history...</span>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="h-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="visits">Visits ({historyData.visits.length})</TabsTrigger>
              <TabsTrigger value="lab-tests">Lab Tests ({historyData.labTests.length})</TabsTrigger>
              <TabsTrigger value="prescriptions">Prescriptions ({historyData.prescriptions.length})</TabsTrigger>
              <TabsTrigger value="diagnoses">Diagnoses ({historyData.diagnoses.length})</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[600px] mt-4">
              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Patient Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Patient Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div><strong>Name:</strong> {patient.full_name}</div>
                      <div><strong>Phone:</strong> {patient.phone}</div>
                      <div><strong>Date of Birth:</strong> {patient.date_of_birth ? format(new Date(patient.date_of_birth), 'MMM dd, yyyy') : 'N/A'}</div>
                      <div><strong>Gender:</strong> {patient.gender}</div>
                      <div><strong>Address:</strong> {patient.address}</div>
                      <div><strong>Emergency Contact:</strong> {patient.emergency_contact}</div>
                    </CardContent>
                  </Card>

                  {/* Recent Activity Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Recent Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div><strong>Total Visits:</strong> {historyData.visits.length}</div>
                      <div><strong>Lab Tests:</strong> {historyData.labTests.length}</div>
                      <div><strong>Prescriptions:</strong> {historyData.prescriptions.length}</div>
                      <div><strong>Last Visit:</strong> {
                        historyData.visits.length > 0 
                          ? format(new Date(historyData.visits[0].visit_date), 'MMM dd, yyyy')
                          : 'No visits'
                      }</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Medical History */}
                {patient.medical_history && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Medical History
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{patient.medical_history}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Recent Diagnoses */}
                {historyData.diagnoses.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Recent Diagnoses
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {historyData.diagnoses.slice(0, 3).map((diagnosis) => (
                          <div key={diagnosis.id} className="flex justify-between items-start p-2 bg-gray-50 rounded">
                            <div>
                              <div className="font-medium">{diagnosis.diagnosis}</div>
                              <div className="text-sm text-gray-600">Dr. {diagnosis.doctor}</div>
                            </div>
                            <div className="text-xs text-gray-500">
                              {format(new Date(diagnosis.date), 'MMM dd, yyyy')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Visits Tab */}
              <TabsContent value="visits">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Visit History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Doctor</TableHead>
                          <TableHead>Diagnosis</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historyData.visits.map((visit) => (
                          <TableRow key={visit.id}>
                            <TableCell>
                              {format(new Date(visit.visit_date), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell>{visit.visit_type || 'Consultation'}</TableCell>
                            <TableCell>{visit.doctor?.name || 'N/A'}</TableCell>
                            <TableCell>{visit.diagnosis || 'N/A'}</TableCell>
                            <TableCell>{getStatusBadge(visit.overall_status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Lab Tests Tab */}
              <TabsContent value="lab-tests">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FlaskConical className="h-4 w-4" />
                      Laboratory Tests
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Test Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Results</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historyData.labTests.map((test) => (
                          <TableRow key={test.id}>
                            <TableCell>
                              {test.created_at ? format(new Date(test.created_at), 'MMM dd, yyyy') : 'N/A'}
                            </TableCell>
                            <TableCell className="font-medium">{test.test_name}</TableCell>
                            <TableCell>{test.test_type}</TableCell>
                            <TableCell>{getStatusBadge(test.status)}</TableCell>
                            <TableCell>
                              {test.status === 'Completed' ? formatLabResults(test.results) : 'Pending'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Prescriptions Tab */}
              <TabsContent value="prescriptions">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Pill className="h-4 w-4" />
                      Prescription History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {historyData.prescriptions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Pill className="h-12 w-12 mx-auto mb-2 opacity-30" />
                        <p>No prescriptions found for this patient.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {historyData.prescriptions.map((prescription) => (
                          <Card key={prescription.id} className="border-l-4 border-l-green-500">
                            <CardHeader className="pb-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <CardTitle className="text-lg">
                                    Prescription #{prescription.id.slice(-8)}
                                  </CardTitle>
                                  <CardDescription>
                                    {prescription.prescription_date ? format(new Date(prescription.prescription_date), 'MMM dd, yyyy') : 'N/A'}
                                    {prescription.doctor && ` • Dr. ${prescription.doctor.name || prescription.doctor.full_name}`}
                                  </CardDescription>
                                </div>
                                {getStatusBadge(prescription.status || 'Active')}
                              </div>
                              {prescription.diagnosis && (
                                <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                                  <strong>Diagnosis:</strong> {prescription.diagnosis}
                                </div>
                              )}
                            </CardHeader>
                            <CardContent>
                              {prescription.items && prescription.items.length > 0 ? (
                                <div className="space-y-3">
                                  <h4 className="font-medium text-sm text-gray-700">Medications:</h4>
                                  {prescription.items.map((item, index) => (
                                    <div key={item.id || index} className="flex justify-between items-start p-3 bg-gray-50 rounded">
                                      <div className="flex-1">
                                        <div className="font-medium text-sm">{item.medication_name}</div>
                                        <div className="text-xs text-gray-600 mt-1">
                                          <span className="mr-4"><strong>Dosage:</strong> {item.dosage}</span>
                                          <span className="mr-4"><strong>Frequency:</strong> {item.frequency}</span>
                                          <span><strong>Duration:</strong> {item.duration}</span>
                                        </div>
                                        {item.instructions && (
                                          <div className="text-xs text-gray-600 mt-1">
                                            <strong>Instructions:</strong> {item.instructions}
                                          </div>
                                        )}
                                      </div>
                                      {item.quantity && (
                                        <div className="text-xs text-gray-500 ml-4">
                                          Qty: {item.quantity}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : prescription.medications && prescription.medications.length > 0 ? (
                                <div className="space-y-3">
                                  <h4 className="font-medium text-sm text-gray-700">Medications:</h4>
                                  {prescription.medications.map((item, index) => (
                                    <div key={item.id || index} className="flex justify-between items-start p-3 bg-gray-50 rounded">
                                      <div className="flex-1">
                                        <div className="font-medium text-sm">{item.medication_name}</div>
                                        <div className="text-xs text-gray-600 mt-1">
                                          <span className="mr-4"><strong>Dosage:</strong> {item.dosage}</span>
                                          <span className="mr-4"><strong>Frequency:</strong> {item.frequency}</span>
                                          <span><strong>Duration:</strong> {item.duration}</span>
                                        </div>
                                        {item.instructions && (
                                          <div className="text-xs text-gray-600 mt-1">
                                            <strong>Instructions:</strong> {item.instructions}
                                          </div>
                                        )}
                                      </div>
                                      {item.quantity && (
                                        <div className="text-xs text-gray-500 ml-4">
                                          Qty: {item.quantity}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500">No medications listed</div>
                              )}
                              
                              {prescription.notes && (
                                <div className="mt-3 p-2 bg-yellow-50 rounded text-sm">
                                  <strong>Notes:</strong> {prescription.notes}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Diagnoses Tab */}
              <TabsContent value="diagnoses">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Diagnosis History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {historyData.diagnoses.map((diagnosis) => (
                        <Card key={diagnosis.id} className="border-l-4 border-l-blue-500">
                          <CardContent className="pt-4">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-semibold text-lg">{diagnosis.diagnosis}</h4>
                              <span className="text-sm text-gray-500">
                                {format(new Date(diagnosis.date), 'MMM dd, yyyy')}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              <strong>Doctor:</strong> Dr. {diagnosis.doctor}
                            </p>
                            {diagnosis.notes && (
                              <p className="text-sm">{diagnosis.notes}</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}