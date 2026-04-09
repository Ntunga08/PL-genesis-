import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import api from '@/lib/api';
import {
  FlaskConical, Pill, Stethoscope, Syringe, CheckCircle,
  AlertCircle, AlertTriangle, X, Loader2, Send, Plus, Trash2
} from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  visit: any;
  doctorId: string;
  onOrdersSubmitted: (visitId: string) => void;
}

interface LabOrder {
  testId: string;
  testName: string;
  testType: string;
  priority: 'Normal' | 'Urgent' | 'STAT';
  notes: string;
}

interface MedOrder {
  medicationId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: string;
  instructions: string;
}

interface ProcedureOrder {
  serviceId: string;
  serviceName: string;
  serviceType: string;
  basePrice: number;
  notes: string;
  quantity: number;
}

const ORDER_SECTIONS = [
  { key: 'lab',       label: 'Lab Tests',   icon: FlaskConical, color: 'blue' },
  { key: 'pharmacy',  label: 'Medications', icon: Pill,         color: 'purple' },
  { key: 'procedure', label: 'Procedures / Nursing / Vaccination', icon: Syringe, color: 'green' },
];

export function DoctorOrderSheet({ open, onClose, visit, doctorId, onOrdersSubmitted }: Props) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Lab state
  const [availableLabTests, setAvailableLabTests] = useState<any[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [labSearch, setLabSearch] = useState('');
  const [labPriority, setLabPriority] = useState<'Normal' | 'Urgent' | 'STAT'>('Normal');
  const [labNotes, setLabNotes] = useState('');

  // Medication state
  const [availableMeds, setAvailableMeds] = useState<any[]>([]);
  const [medOrders, setMedOrders] = useState<MedOrder[]>([]);
  const [medSearch, setMedSearch] = useState('');

  // Procedure state
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [procedureOrders, setProcedureOrders] = useState<ProcedureOrder[]>([]);
  const [serviceSearch, setServiceSearch] = useState('');

  const totalOrders = labOrders.length + medOrders.length + procedureOrders.length;

  useEffect(() => {
    if (!open) return;
    loadData();
  }, [open]);

  const loadData = async () => {
    const [labRes, medRes, svcRes] = await Promise.allSettled([
      api.get('/labs/services'),
      api.get('/pharmacy/medications'),
      api.get('/services'),
    ]);
    if (labRes.status === 'fulfilled') setAvailableLabTests(labRes.value.data.services || []);
    if (medRes.status === 'fulfilled') setAvailableMeds(medRes.value.data.medications || []);
    if (svcRes.status === 'fulfilled') {
      const all = svcRes.value.data.services || [];
      setAvailableServices(all.filter((s: any) =>
        ['Procedure', 'Vaccination', 'Diagnostic', 'Nursing'].includes(s.service_type)
      ));
    }
  };

  const toggleLabTest = (test: any) => {
    setLabOrders(prev => {
      const exists = prev.find(o => o.testId === test.id);
      if (exists) return prev.filter(o => o.testId !== test.id);
      return [...prev, { testId: test.id, testName: test.service_name || test.test_name, testType: test.service_type || test.test_type || 'Laboratory', priority: labPriority, notes: labNotes }];
    });
  };

  const toggleMed = (med: any) => {
    setMedOrders(prev => {
      const exists = prev.find(o => o.medicationId === med.id);
      if (exists) return prev.filter(o => o.medicationId !== med.id);
      return [...prev, { medicationId: med.id, medicationName: med.name, dosage: med.strength || '', frequency: '', duration: '', quantity: '', instructions: '' }];
    });
  };

  const updateMedOrder = (medId: string, field: string, value: string) => {
    setMedOrders(prev => prev.map(o => o.medicationId === medId ? { ...o, [field]: value } : o));
  };

  const toggleService = (svc: any) => {
    setProcedureOrders(prev => {
      const exists = prev.find(o => o.serviceId === svc.id);
      if (exists) return prev.filter(o => o.serviceId !== svc.id);
      return [...prev, { serviceId: svc.id, serviceName: svc.service_name, serviceType: svc.service_type, basePrice: Number(svc.base_price), notes: '', quantity: 1 }];
    });
  };

  const handleSubmitAll = async () => {
    if (totalOrders === 0) {
      toast.error('Add at least one order before submitting');
      return;
    }

    // Validate med orders
    for (const o of medOrders) {
      if (!o.dosage || !o.frequency || !o.duration || !o.quantity) {
        toast.error(`Fill in all required fields for ${o.medicationName}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const visitId = visit.id;
      const patientId = visit.patient_id;
      const today = new Date().toISOString().split('T')[0];

      // Track which departments are being dispatched to
      const destinations: string[] = [];

      // 1. Create lab test orders
      if (labOrders.length > 0) {
        for (const o of labOrders) {
          await api.post('/labs', {
            patient_id: patientId,
            doctor_id: doctorId,
            test_name: o.testName,
            test_type: o.testType,
            test_date: today,
            status: 'Pending',
            notes: o.notes || null,
            visit_id: visitId,
          });
        }
        destinations.push('lab');
      }

      // 2. Create prescription
      if (medOrders.length > 0) {
        await api.post('/prescriptions', {
          patient_id: patientId,
          doctor_id: doctorId,
          visit_id: visitId,
          prescription_date: new Date().toISOString(),
          diagnosis: visit.doctor_diagnosis || visit.provisional_diagnosis || null,
          items: medOrders.map(o => ({
            medication_id: o.medicationId,
            medication_name: o.medicationName,
            dosage: o.dosage,
            frequency: o.frequency,
            duration: o.duration,
            quantity: parseInt(o.quantity),
            instructions: o.instructions || null,
          })),
        });
        destinations.push('pharmacy');
      }

      // 3. Create procedure/service orders
      if (procedureOrders.length > 0) {
        for (const o of procedureOrders) {
          await api.post('/patient-services', {
            patient_id: patientId,
            service_id: o.serviceId,
            quantity: o.quantity,
            unit_price: o.basePrice,
            total_price: o.basePrice * o.quantity,
            service_date: today,
            status: 'Pending',
            notes: o.notes || `Ordered by doctor: ${o.serviceName}`,
            visit_id: visitId,
          });
        }
        destinations.push('nurse');
      }

      // 4. Update visit — set all relevant statuses simultaneously
      const visitUpdate: Record<string, any> = {
        doctor_status: 'Completed',
        doctor_completed_at: new Date().toISOString(),
      };

      if (destinations.includes('lab')) {
        visitUpdate.lab_status = 'Pending';
      }
      if (destinations.includes('pharmacy')) {
        visitUpdate.pharmacy_status = 'Pending';
      }
      if (destinations.includes('nurse')) {
        visitUpdate.nurse_status = 'Pending';
      }

      // Set current_stage: if multiple destinations, use 'multi_order'
      // otherwise use the single destination
      if (destinations.length > 1) {
        visitUpdate.current_stage = 'multi_order';
      } else if (destinations.length === 1) {
        visitUpdate.current_stage = destinations[0];
      }

      await api.put(`/visits/${visitId}`, visitUpdate);

      const destLabels = destinations.map(d =>
        d === 'lab' ? 'Lab' : d === 'pharmacy' ? 'Pharmacy' : 'Nurse'
      ).join(', ');

      toast.success(`${totalOrders} order(s) submitted → ${destLabels}`);
      onOrdersSubmitted(visitId);
      handleClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to submit orders');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setLabOrders([]);
    setMedOrders([]);
    setProcedureOrders([]);
    setLabSearch('');
    setMedSearch('');
    setServiceSearch('');
    setActiveSection(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Stethoscope className="h-5 w-5" />
            Doctor's Order Sheet — {visit?.patient?.full_name}
          </DialogTitle>
          <DialogDescription>
            Select all orders at once. Everything will be dispatched simultaneously.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Left — order sections */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-4">

                {/* ── LAB TESTS ── */}
                <SectionCard
                  icon={FlaskConical}
                  label="Lab Tests"
                  color="blue"
                  count={labOrders.length}
                  expanded={activeSection === 'lab'}
                  onToggle={() => setActiveSection(s => s === 'lab' ? null : 'lab')}
                >
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input placeholder="Search tests..." value={labSearch} onChange={e => setLabSearch(e.target.value)} className="flex-1" />
                      <Select value={labPriority} onValueChange={(v: any) => setLabPriority(v)}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Normal">Normal</SelectItem>
                          <SelectItem value="Urgent">Urgent</SelectItem>
                          <SelectItem value="STAT">STAT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {availableLabTests
                        .filter(t => (t.service_name || t.test_name || '').toLowerCase().includes(labSearch.toLowerCase()))
                        .map(test => {
                          const selected = labOrders.some(o => o.testId === test.id);
                          return (
                            <button key={test.id} onClick={() => toggleLabTest(test)}
                              className={`text-left p-2 rounded-lg border text-sm transition-colors ${selected ? 'bg-blue-50 border-blue-400 font-medium' : 'hover:bg-gray-50 border-gray-200'}`}>
                              <div className="flex items-center gap-2">
                                {selected && <CheckCircle className="h-3 w-3 text-blue-600 flex-shrink-0" />}
                                <span>{test.service_name || test.test_name}</span>
                              </div>
                              {test.base_price && <span className="text-xs text-muted-foreground">TSh {Number(test.base_price).toLocaleString()}</span>}
                            </button>
                          );
                        })}
                    </div>
                    <Textarea placeholder="Notes for lab..." value={labNotes} onChange={e => setLabNotes(e.target.value)} rows={2} />
                  </div>
                </SectionCard>

                {/* ── MEDICATIONS ── */}
                <SectionCard
                  icon={Pill}
                  label="Medications"
                  color="purple"
                  count={medOrders.length}
                  expanded={activeSection === 'pharmacy'}
                  onToggle={() => setActiveSection(s => s === 'pharmacy' ? null : 'pharmacy')}
                >
                  <div className="space-y-3">
                    <Input placeholder="Search medications..." value={medSearch} onChange={e => setMedSearch(e.target.value)} />
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {availableMeds
                        .filter(m => m.name.toLowerCase().includes(medSearch.toLowerCase()) || (m.generic_name || '').toLowerCase().includes(medSearch.toLowerCase()))
                        .map(med => {
                          const stock = med.stock_quantity || 0;
                          const selected = medOrders.some(o => o.medicationId === med.id);
                          return (
                            <button key={med.id} onClick={() => toggleMed(med)} disabled={stock === 0}
                              className={`text-left p-2 rounded-lg border text-sm transition-colors ${selected ? 'bg-purple-50 border-purple-400 font-medium' : stock === 0 ? 'opacity-40 cursor-not-allowed border-gray-200' : 'hover:bg-gray-50 border-gray-200'}`}>
                              <div className="flex items-center gap-2">
                                {selected && <CheckCircle className="h-3 w-3 text-purple-600 flex-shrink-0" />}
                                <span>{med.name}</span>
                                {med.strength && <Badge variant="outline" className="text-[10px] px-1 py-0">{med.strength}</Badge>}
                              </div>
                              <span className={`text-xs ${stock === 0 ? 'text-red-500' : stock < 10 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                                {stock === 0 ? 'Out of stock' : `Stock: ${stock}`}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                    {/* Inline forms for selected meds */}
                    {medOrders.map(o => (
                      <Card key={o.medicationId} className="bg-purple-50/50 border-purple-200">
                        <CardHeader className="py-2 px-3 flex flex-row items-center justify-between">
                          <CardTitle className="text-sm text-purple-900">{o.medicationName}</CardTitle>
                          <button onClick={() => setMedOrders(p => p.filter(m => m.medicationId !== o.medicationId))}>
                            <X className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                          </button>
                        </CardHeader>
                        <CardContent className="py-2 px-3 grid grid-cols-2 gap-2">
                          {[
                            { field: 'dosage', placeholder: 'Dosage e.g. 500mg', label: 'Dosage *' },
                            { field: 'frequency', placeholder: 'e.g. Twice daily', label: 'Frequency *' },
                            { field: 'duration', placeholder: 'e.g. 7 days', label: 'Duration *' },
                            { field: 'quantity', placeholder: 'e.g. 14', label: 'Quantity *' },
                          ].map(({ field, placeholder, label }) => (
                            <div key={field}>
                              <Label className="text-xs">{label}</Label>
                              <Input className="h-7 text-sm" placeholder={placeholder}
                                value={(o as any)[field]} onChange={e => updateMedOrder(o.medicationId, field, e.target.value)} />
                            </div>
                          ))}
                          <div className="col-span-2">
                            <Label className="text-xs">Instructions</Label>
                            <Input className="h-7 text-sm" placeholder="e.g. Take with food"
                              value={o.instructions} onChange={e => updateMedOrder(o.medicationId, 'instructions', e.target.value)} />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </SectionCard>

                {/* ── PROCEDURES / NURSING / VACCINATION ── */}
                <SectionCard
                  icon={Syringe}
                  label="Procedures / Nursing / Vaccination"
                  color="green"
                  count={procedureOrders.length}
                  expanded={activeSection === 'procedure'}
                  onToggle={() => setActiveSection(s => s === 'procedure' ? null : 'procedure')}
                >
                  <div className="space-y-3">
                    <Input placeholder="Search services..." value={serviceSearch} onChange={e => setServiceSearch(e.target.value)} />
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {availableServices
                        .filter(s => s.service_name.toLowerCase().includes(serviceSearch.toLowerCase()))
                        .map(svc => {
                          const selected = procedureOrders.some(o => o.serviceId === svc.id);
                          return (
                            <button key={svc.id} onClick={() => toggleService(svc)}
                              className={`text-left p-2 rounded-lg border text-sm transition-colors ${selected ? 'bg-green-50 border-green-400 font-medium' : 'hover:bg-gray-50 border-gray-200'}`}>
                              <div className="flex items-center gap-2">
                                {selected && <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />}
                                <span>{svc.service_name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] px-1 py-0">{svc.service_type}</Badge>
                                <span className="text-xs text-muted-foreground">TSh {Number(svc.base_price).toLocaleString()}</span>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                    {procedureOrders.map(o => (
                      <div key={o.serviceId} className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-2">
                        <span className="flex-1 text-sm font-medium">{o.serviceName}</span>
                        <Input className="w-16 h-7 text-sm text-center" type="number" min={1} value={o.quantity}
                          onChange={e => setProcedureOrders(p => p.map(x => x.serviceId === o.serviceId ? { ...x, quantity: parseInt(e.target.value) || 1 } : x))} />
                        <Input className="flex-1 h-7 text-sm" placeholder="Notes..."
                          value={o.notes} onChange={e => setProcedureOrders(p => p.map(x => x.serviceId === o.serviceId ? { ...x, notes: e.target.value } : x))} />
                        <button onClick={() => setProcedureOrders(p => p.filter(x => x.serviceId !== o.serviceId))}>
                          <X className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                </SectionCard>

              </div>
            </ScrollArea>
          </div>

          {/* Right — order summary */}
          <div className="w-64 border-l bg-gray-50 flex flex-col">
            <div className="px-4 py-3 border-b">
              <p className="font-semibold text-sm">Order Summary</p>
              <p className="text-xs text-muted-foreground">{totalOrders} order(s) ready</p>
            </div>
            <ScrollArea className="flex-1 px-4 py-3">
              <div className="space-y-3 text-sm">
                {labOrders.length > 0 && (
                  <div>
                    <p className="font-medium text-blue-700 flex items-center gap-1 mb-1">
                      <FlaskConical className="h-3 w-3" /> Lab ({labOrders.length})
                    </p>
                    {labOrders.map(o => (
                      <div key={o.testId} className="flex items-center justify-between text-xs py-0.5">
                        <span className="truncate">{o.testName}</span>
                        <Badge variant="outline" className="text-[10px] ml-1">{o.priority}</Badge>
                      </div>
                    ))}
                  </div>
                )}
                {medOrders.length > 0 && (
                  <div>
                    <p className="font-medium text-purple-700 flex items-center gap-1 mb-1">
                      <Pill className="h-3 w-3" /> Pharmacy ({medOrders.length})
                    </p>
                    {medOrders.map(o => (
                      <div key={o.medicationId} className="text-xs py-0.5 truncate">{o.medicationName}</div>
                    ))}
                  </div>
                )}
                {procedureOrders.length > 0 && (
                  <div>
                    <p className="font-medium text-green-700 flex items-center gap-1 mb-1">
                      <Syringe className="h-3 w-3" /> Nurse ({procedureOrders.length})
                    </p>
                    {procedureOrders.map(o => (
                      <div key={o.serviceId} className="text-xs py-0.5 truncate">{o.serviceName}</div>
                    ))}
                  </div>
                )}
                {totalOrders === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No orders yet</p>
                )}
              </div>
            </ScrollArea>
            <div className="px-4 py-3 border-t space-y-2">
              <Button className="w-full" disabled={totalOrders === 0 || submitting} onClick={handleSubmitAll}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Submit All Orders
              </Button>
              <Button variant="outline" className="w-full" onClick={handleClose}>Cancel</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Section Card helper ──
function SectionCard({ icon: Icon, label, color, count, expanded, onToggle, children }: {
  icon: any; label: string; color: string; count: number;
  expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  const colors: Record<string, string> = {
    blue: 'border-blue-200 bg-blue-50/30',
    purple: 'border-purple-200 bg-purple-50/30',
    green: 'border-green-200 bg-green-50/30',
  };
  const iconColors: Record<string, string> = {
    blue: 'text-blue-600', purple: 'text-purple-600', green: 'text-green-600',
  };
  return (
    <div className={`border rounded-lg overflow-hidden ${colors[color]}`}>
      <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-black/5 transition-colors" onClick={onToggle}>
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${iconColors[color]}`} />
          <span className="font-medium text-sm">{label}</span>
          {count > 0 && <Badge className="text-xs">{count} selected</Badge>}
        </div>
        <span className="text-xs text-muted-foreground">{expanded ? '▲ collapse' : '▼ expand'}</span>
      </button>
      {expanded && <div className="px-4 pb-4 pt-2 border-t">{children}</div>}
    </div>
  );
}
