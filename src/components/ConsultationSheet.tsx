import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import api from "@/lib/api";
import { FlaskConical, Pill, Syringe, CheckCircle, X, Loader2, Send, Save, AlertTriangle, Stethoscope, History, ChevronDown, ChevronUp } from "lucide-react";
import { ICD10Search } from "@/components/ICD10Search";
import { PatientMedicalHistory } from "@/components/PatientMedicalHistory";

interface Props {
  open: boolean;
  onClose: () => void;
  visit: any;
  doctorId: string;
  onCompleted: (visitId: string, destinations: string[]) => void;
}
interface MedOrder {
  medicationId: string; medicationName: string;
  dosage: string; frequency: string; duration: string; quantity: string; instructions: string;
}
interface ProcOrder {
  serviceId: string; serviceName: string; serviceType: string;
  basePrice: number; notes: string; quantity: number;
}

export function ConsultationSheet({ open, onClose, visit, doctorId, onCompleted }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [historyData, setHistoryData] = useState<{ visits: any[]; prescriptions: any[]; labTests: any[] } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState("");
  const [icd10Codes, setIcd10Codes] = useState<{code:string;description:string}[]>([]);
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [notes, setNotes] = useState("");
  const [treatmentPlan, setTreatmentPlan] = useState("");
  const [labTests, setLabTests] = useState<any[]>([]);
  const [labOrders, setLabOrders] = useState<{testId:string;testName:string;testType:string;priority:string}[]>([]);
  const [labSearch, setLabSearch] = useState("");
  const [labPriority, setLabPriority] = useState("Normal");
  const [labNotes, setLabNotes] = useState("");
  const [meds, setMeds] = useState<any[]>([]);
  const [medOrders, setMedOrders] = useState<MedOrder[]>([]);
  const [medSearch, setMedSearch] = useState("");
  const [services, setServices] = useState<any[]>([]);
  const [procOrders, setProcOrders] = useState<ProcOrder[]>([]);
  const [svcSearch, setSvcSearch] = useState("");
  const totalOrders = labOrders.length + medOrders.length + procOrders.length;

  useEffect(() => {
    if (!open) return;
    setDiagnosis(visit?.doctor_diagnosis || visit?.provisional_diagnosis || "");
    // Load existing ICD-10 codes — stored as JSON array or legacy single string
    const raw = visit?.icd10_codes || visit?.icd10_code;
    if (Array.isArray(raw)) {
      setIcd10Codes(raw);
    } else if (raw && typeof raw === 'string') {
      try { setIcd10Codes(JSON.parse(raw)); } catch { setIcd10Codes([{ code: raw, description: visit?.icd10_description || '' }]); }
    } else {
      setIcd10Codes([]);
    }
    setChiefComplaint(visit?.chief_complaint || "");
    setNotes(visit?.doctor_notes || "");
    setTreatmentPlan(visit?.treatment_plan || "");
    loadCatalogs();
  }, [open]);

  const loadCatalogs = async () => {
    const [l, m, s] = await Promise.allSettled([
      api.get("/labs/services"),
      api.get("/pharmacy/medications"),
      api.get("/services"),
    ]);
    if (l.status === "fulfilled") setLabTests(l.value.data.services || []);
    if (m.status === "fulfilled") setMeds(m.value.data.medications || []);
    if (s.status === "fulfilled") setServices((s.value.data.services || []).filter((x: any) =>
      ["Procedure","Vaccination","Diagnostic","Nursing"].includes(x.service_type)));
  };

  const loadHistory = async () => {
    if (!visit?.patient_id || historyData) return;
    setHistoryLoading(true);
    try {
      const [visitsRes, labsRes, rxRes] = await Promise.allSettled([
        api.get(`/visits?patient_id=${visit.patient_id}&limit=10`),
        api.get(`/labs?patient_id=${visit.patient_id}&limit=20`),
        api.get(`/prescriptions?patient_id=${visit.patient_id}&limit=20`),
      ]);
      setHistoryData({
        visits: visitsRes.status === "fulfilled" ? (visitsRes.value.data.visits || []).filter((v: any) => v.id !== visit.id) : [],
        labTests: labsRes.status === "fulfilled" ? (labsRes.value.data.labTests || []) : [],
        prescriptions: rxRes.status === "fulfilled" ? (rxRes.value.data.prescriptions || []) : [],
      });
    } catch { /* silent */ }
    finally { setHistoryLoading(false); }
  };

  const toggleLab = (t: any) => setLabOrders(p => p.find(o => o.testId === t.id)
    ? p.filter(o => o.testId !== t.id)
    : [...p, { testId: t.id, testName: t.service_name || t.test_name, testType: t.service_type || "Laboratory", priority: labPriority }]);

  const toggleMed = (m: any) => setMedOrders(p => p.find(o => o.medicationId === m.id)
    ? p.filter(o => o.medicationId !== m.id)
    : [...p, { medicationId: m.id, medicationName: m.name, dosage: m.strength || "", frequency: "", duration: "", quantity: "", instructions: "" }]);

  const updateMed = (id: string, f: string, v: string) =>
    setMedOrders(p => p.map(o => o.medicationId === id ? { ...o, [f]: v } : o));

  const toggleSvc = (s: any) => setProcOrders(p => p.find(o => o.serviceId === s.id)
    ? p.filter(o => o.serviceId !== s.id)
    : [...p, { serviceId: s.id, serviceName: s.service_name, serviceType: s.service_type, basePrice: Number(s.base_price), notes: "", quantity: 1 }]);

  const reset = () => {
    setDiagnosis(""); setIcd10Codes([]); setChiefComplaint(""); setNotes(""); setTreatmentPlan("");
    setLabOrders([]); setMedOrders([]); setProcOrders([]);
    setLabSearch(""); setMedSearch(""); setSvcSearch(""); setLabNotes("");
    setHistoryExpanded(false); setHistoryData(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const saveDraft = async () => {
    if (!diagnosis.trim()) { toast.error("Enter a diagnosis before saving"); return; }
    setSavingDraft(true);
    try {
      await api.put(`/visits/${visit.id}`, {
        doctor_diagnosis: diagnosis, icd10_code: icd10Codes.length ? JSON.stringify(icd10Codes) : undefined,
        icd10_description: icd10Codes.map(c => c.description).join('; ') || undefined,
        chief_complaint: chiefComplaint,
        doctor_notes: notes, treatment_plan: treatmentPlan,
        doctor_status: "In Consultation",
        doctor_consultation_saved_at: new Date().toISOString(),
      });
      toast.success("Draft saved — continue later");
      onClose();
    } catch { toast.error("Failed to save draft"); }
    finally { setSavingDraft(false); }
  };

  const handleSubmit = async () => {
    if (!diagnosis.trim()) { toast.error("Diagnosis is required"); return; }
    for (const o of medOrders) {
      if (!o.dosage || !o.frequency || !o.duration || !o.quantity) {
        toast.error(`Fill all fields for ${o.medicationName}`); return;
      }
    }
    setSubmitting(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const destinations: string[] = [];

      // Save clinical notes + any remaining orders
      await api.put(`/visits/${visit.id}`, {
        doctor_diagnosis: diagnosis, icd10_code: icd10Codes.length ? JSON.stringify(icd10Codes) : undefined,
        icd10_description: icd10Codes.map(c => c.description).join('; ') || undefined,
        chief_complaint: chiefComplaint,
        doctor_notes: notes, treatment_plan: treatmentPlan,
        doctor_consultation_saved_at: new Date().toISOString(),
      });

      if (labOrders.length > 0) {
        for (const o of labOrders) {
          await api.post("/labs", {
            patient_id: visit.patient_id, doctor_id: doctorId,
            test_name: o.testName, test_type: o.testType,
            test_date: today, status: "Pending",
            notes: labNotes || null, visit_id: visit.id,
          });
        }
        destinations.push("lab");
      }
      if (medOrders.length > 0) {
        await api.post("/prescriptions", {
          patient_id: visit.patient_id, doctor_id: doctorId, visit_id: visit.id,
          prescription_date: new Date().toISOString(), diagnosis,
          items: medOrders.map(o => ({
            medication_id: o.medicationId, medication_name: o.medicationName,
            dosage: o.dosage, frequency: o.frequency, duration: o.duration,
            quantity: parseInt(o.quantity), instructions: o.instructions || null,
          })),
        });
        destinations.push("pharmacy");
      }
      if (procOrders.length > 0) {
        for (const o of procOrders) {
          await api.post("/patient-services", {
            patient_id: visit.patient_id, service_id: o.serviceId,
            quantity: o.quantity, unit_price: o.basePrice,
            total_price: o.basePrice * o.quantity,
            service_date: today, status: "Pending",
            notes: o.notes || `Ordered: ${o.serviceName}`, visit_id: visit.id,
          });
        }
        destinations.push("nurse");
      }

      // Fetch current visit to check what was already dispatched via quick-send
      const { data: currentVisit } = await api.get(`/visits/${visit.id}`).catch(() => ({ data: visit }));
      if (currentVisit.lab_status === "Pending" && !destinations.includes("lab")) destinations.push("lab");
      if (currentVisit.pharmacy_status === "Pending" && !destinations.includes("pharmacy")) destinations.push("pharmacy");
      if (currentVisit.nurse_status === "Pending" && !destinations.includes("nurse")) destinations.push("nurse");

      const upd: Record<string, any> = {
        doctor_status: "Completed",
        doctor_completed_at: new Date().toISOString(),
      };
      if (destinations.includes("lab"))      upd.lab_status = "Pending";
      if (destinations.includes("pharmacy")) upd.pharmacy_status = "Pending";
      if (destinations.includes("nurse"))    upd.nurse_status = "Pending";
      upd.current_stage = destinations.length === 0 ? "billing"
        : destinations.length === 1 ? destinations[0] : "multi_order";
      if (destinations.length === 0) upd.billing_status = "Pending";
      await api.put(`/visits/${visit.id}`, upd);

      const label = destinations.length === 0 ? "Billing"
        : destinations.map(d => d === "lab" ? "Lab" : d === "pharmacy" ? "Pharmacy" : "Nurse").join(", ");
      toast.success(`Consultation complete → ${label}`);
      reset();
      onCompleted(visit.id, destinations);
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || "Failed to submit");
    } finally { setSubmitting(false); }
  };

  // Save current clinical notes to visit without completing
  const saveNotes = async () => {
    if (diagnosis.trim() || chiefComplaint.trim() || notes.trim()) {
      await api.put(`/visits/${visit.id}`, {
        doctor_diagnosis: diagnosis || undefined,
        icd10_code: icd10Codes.length ? JSON.stringify(icd10Codes) : undefined,
        icd10_description: icd10Codes.map(c => c.description).join('; ') || undefined,
        chief_complaint: chiefComplaint || undefined,
        doctor_notes: notes || undefined,
        treatment_plan: treatmentPlan || undefined,
      }).catch(() => {});
    }
  };

  // Quick-dispatch: send only this tab's orders immediately, keep form open
  const sendToLab = async () => {
    if (labOrders.length === 0) { toast.error("No lab tests selected"); return; }
    setSubmitting(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      await saveNotes();
      for (const o of labOrders) {
        await api.post("/labs", {
          patient_id: visit.patient_id, doctor_id: doctorId,
          test_name: o.testName, test_type: o.testType,
          test_date: today, status: "Pending",
          notes: labNotes || null, visit_id: visit.id,
        });
      }
      // Update visit: mark lab pending, set current_stage to multi_order so patient appears in lab queue
      await api.put(`/visits/${visit.id}`, {
        lab_status: "Pending",
        current_stage: "multi_order",
      });
      toast.success(`${labOrders.length} test(s) sent to Lab`);
      setLabOrders([]); setLabSearch(""); setLabNotes("");
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || "Failed to send to lab");
    } finally { setSubmitting(false); }
  };

  const sendToPharmacy = async () => {
    if (medOrders.length === 0) { toast.error("No medications selected"); return; }
    for (const o of medOrders) {
      if (!o.dosage || !o.frequency || !o.duration || !o.quantity) {
        toast.error(`Fill all fields for ${o.medicationName}`); return;
      }
    }
    setSubmitting(true);
    try {
      await saveNotes();
      await api.post("/prescriptions", {
        patient_id: visit.patient_id, doctor_id: doctorId, visit_id: visit.id,
        prescription_date: new Date().toISOString(), diagnosis: diagnosis || "Pending diagnosis",
        items: medOrders.map(o => ({
          medication_id: o.medicationId, medication_name: o.medicationName,
          dosage: o.dosage, frequency: o.frequency, duration: o.duration,
          quantity: parseInt(o.quantity), instructions: o.instructions || null,
        })),
      });
      await api.put(`/visits/${visit.id}`, {
        pharmacy_status: "Pending",
        current_stage: "multi_order",
      });
      toast.success(`Prescription sent to Pharmacy`);
      setMedOrders([]); setMedSearch("");
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || "Failed to send to pharmacy");
    } finally { setSubmitting(false); }
  };

  const sendToNurse = async () => {
    if (procOrders.length === 0) { toast.error("No procedures selected"); return; }
    setSubmitting(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      await saveNotes();
      for (const o of procOrders) {
        await api.post("/patient-services", {
          patient_id: visit.patient_id, service_id: o.serviceId,
          quantity: o.quantity, unit_price: o.basePrice,
          total_price: o.basePrice * o.quantity,
          service_date: today, status: "Pending",
          notes: o.notes || `Ordered: ${o.serviceName}`, visit_id: visit.id,
        });
      }
      await api.put(`/visits/${visit.id}`, {
        nurse_status: "Pending",
        current_stage: "multi_order",
      });
      toast.success(`${procOrders.length} procedure(s) sent to Nurse`);
      setProcOrders([]); setSvcSearch("");
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || "Failed to send to nurse");
    } finally { setSubmitting(false); }
  };

  const patient = visit?.patient || {};
  const age = patient.date_of_birth ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear() : null;
  const vitals = visit?.vital_signs || {};

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl h-[92vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b flex-shrink-0">
          <DialogTitle className="text-lg flex items-center gap-2 flex-wrap">
            {visit?.lab_completed_at ? "Post-Lab Review — " : "Consultation — "}{patient.full_name}
            <Badge variant="outline" className="text-xs font-normal">
              {age ? `${age} yrs` : ""}{patient.gender ? ` · ${patient.gender}` : ""}
            </Badge>
            {visit?.lab_completed_at && (
              <Badge className="text-xs bg-green-600">
                <FlaskConical className="h-3 w-3 mr-1" />Lab Results Ready
              </Badge>
            )}
            {patient.allergies && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />Allergies: {patient.allergies}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-52 border-r bg-gray-50 flex-shrink-0 overflow-y-auto p-3 space-y-3 text-xs">
            <div>
              <p className="font-semibold text-gray-500 uppercase tracking-wide mb-1">Patient</p>
              <p className="font-medium">{patient.full_name}</p>
              <p className="text-muted-foreground">{patient.phone}</p>
              {patient.blood_group && <p>Blood: {patient.blood_group}</p>}
            </div>
            {Object.keys(vitals).length > 0 && (
              <div>
                <p className="font-semibold text-gray-500 uppercase tracking-wide mb-1">Vitals</p>
                {Object.entries(vitals)
                  .filter(([k]) => !k.endsWith('_unit') && vitals[k] !== '' && vitals[k] != null)
                  .map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs">
                      <span className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</span>
                      <span className="font-medium">{String(v)}{vitals[k + '_unit'] ? ` ${vitals[k + '_unit']}` : ''}</span>
                    </div>
                  ))}
              </div>
            )}
            {visit?.chief_complaint && (
              <div>
                <p className="font-semibold text-gray-500 uppercase tracking-wide mb-1">Chief Complaint</p>
                <p className="text-muted-foreground">{visit.chief_complaint}</p>
              </div>
            )}
            {visit?.nurse_notes && (
              <div>
                <p className="font-semibold text-gray-500 uppercase tracking-wide mb-1">Vitals & Nurse Notes</p>
                {(() => {
                  try {
                    const raw = visit.nurse_notes;
                    const n = typeof raw === 'string' ? JSON.parse(raw) : raw;
                    const vitalRows = [
                      { label: 'Blood Pressure', value: n.blood_pressure, unit: 'mmHg' },
                      { label: 'Heart Rate',     value: n.heart_rate,     unit: 'bpm' },
                      { label: 'Temperature',    value: n.temperature,    unit: '°C' },
                      { label: 'SpO₂',           value: n.oxygen_saturation, unit: '%' },
                      { label: 'Weight',         value: n.weight,         unit: n.weight_unit || 'kg' },
                      { label: 'Height',         value: n.height,         unit: n.height_unit || 'cm' },
                      { label: 'MUAC',           value: n.muac,           unit: n.muac_unit || 'cm' },
                    ].filter(r => r.value && String(r.value).trim() !== '');
                    return (
                      <div className="space-y-1">
                        {vitalRows.map(r => (
                          <div key={r.label} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{r.label}</span>
                            <span className="font-medium">{r.value} <span className="text-muted-foreground">{r.unit}</span></span>
                          </div>
                        ))}
                        {n.notes && n.notes.trim() && (
                          <p className="text-xs text-muted-foreground mt-1 italic border-t pt-1">{n.notes}</p>
                        )}
                      </div>
                    );
                  } catch {
                    return <p className="text-xs text-muted-foreground">{visit.nurse_notes}</p>;
                  }
                })()}
              </div>
            )}
            {/* Lab Results — shown when results are back */}
            {(visit?.labTests || []).filter((t: any) => t.status === 'Completed').length > 0 && (
              <div>
                <p className="font-semibold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <FlaskConical className="h-3 w-3 text-green-600" />
                  <span className="text-green-700">Lab Results</span>
                </p>
                {(visit.labTests as any[]).filter((t: any) => t.status === 'Completed').map((t: any) => {
                  // parse results — could be JSON or plain string
                  let resultLines: string[] = [];
                  if (t.result_value) {
                    resultLines = [t.result_value];
                  } else if (t.results) {
                    try {
                      const parsed = typeof t.results === 'string' ? JSON.parse(t.results) : t.results;
                      if (parsed.results) {
                        resultLines = Object.entries(parsed.results).map(([k, v]: any) =>
                          `${k}: ${v?.value ?? v}${v?.unit ? ' ' + v.unit : ''}${v?.status && v.status !== 'Normal' ? ' ⚠' : ''}`
                        );
                      }
                    } catch {}
                  } else if (Array.isArray(t.lab_results)) {
                    resultLines = t.lab_results.map((r: any) =>
                      `${r.result_value}${r.unit ? ' ' + r.unit : ''}${r.abnormal_flag ? ' ⚠' : ''}`
                    );
                  }
                  return (
                    <div key={t.id} className="mb-2 bg-green-50 border border-green-200 rounded p-1.5">
                      <p className="font-medium text-green-900">{t.test_name}</p>
                      {resultLines.length > 0
                        ? resultLines.map((line, i) => <p key={i} className="text-muted-foreground">{line}</p>)
                        : <p className="text-muted-foreground italic">No values recorded</p>
                      }
                      {t.notes && <p className="text-muted-foreground mt-0.5 italic">{t.notes}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <ScrollArea className="flex-1">
            <div className="p-5 space-y-5">

              {/* ── 0. Patient History ── */}
              <div className="border rounded-lg overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-purple-50 hover:bg-purple-100 transition-colors text-left"
                  onClick={() => { setHistoryExpanded(p => !p); if (!historyExpanded) loadHistory(); }}
                >
                  <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide flex items-center gap-1">
                    <History className="h-3 w-3" /> Patient History
                  </span>
                  {historyExpanded ? <ChevronUp className="h-3 w-3 text-purple-500" /> : <ChevronDown className="h-3 w-3 text-purple-500" />}
                </button>

                {historyExpanded && (
                  <div className="p-3 space-y-3 bg-white text-xs">
                    {historyLoading ? (
                      <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading history...
                      </div>
                    ) : !historyData || (historyData.visits.length === 0 && historyData.labTests.length === 0 && historyData.prescriptions.length === 0) ? (
                      <p className="text-center text-muted-foreground py-3">No previous history found</p>
                    ) : (
                      <>
                        {/* Past Visits */}
                        {historyData.visits.length > 0 && (
                          <div>
                            <p className="font-semibold text-gray-600 mb-1.5">Past Visits ({historyData.visits.length})</p>
                            <div className="space-y-1.5 max-h-40 overflow-y-auto">
                              {historyData.visits.map((v: any) => (
                                <div key={v.id} className="border rounded p-2 bg-gray-50">
                                  <div className="flex justify-between items-start">
                                    <span className="font-medium text-gray-700">
                                      {v.visit_date ? new Date(v.visit_date).toLocaleDateString() : 'N/A'}
                                    </span>
                                    <Badge variant="outline" className="text-[10px] h-4 px-1">{v.overall_status || v.status}</Badge>
                                  </div>
                                  {(v.doctor_diagnosis || v.provisional_diagnosis) && (
                                    <p className="text-muted-foreground mt-0.5">Dx: {v.doctor_diagnosis || v.provisional_diagnosis}</p>
                                  )}
                                  {v.doctor_notes && <p className="text-muted-foreground italic truncate">{v.doctor_notes}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Past Lab Tests */}
                        {historyData.labTests.length > 0 && (
                          <div>
                            <p className="font-semibold text-gray-600 mb-1.5">Past Lab Tests ({historyData.labTests.length})</p>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {historyData.labTests.map((t: any) => (
                                <div key={t.id} className="flex justify-between items-center border rounded p-1.5 bg-gray-50">
                                  <span className="font-medium">{t.test_name}</span>
                                  <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground">{t.test_date ? new Date(t.test_date).toLocaleDateString() : ''}</span>
                                    <Badge variant={t.status === 'Completed' ? 'default' : 'secondary'} className="text-[10px] h-4 px-1">{t.status}</Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Past Prescriptions */}
                        {historyData.prescriptions.length > 0 && (
                          <div>
                            <p className="font-semibold text-gray-600 mb-1.5">Past Prescriptions ({historyData.prescriptions.length})</p>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {historyData.prescriptions.map((rx: any) => (
                                <div key={rx.id} className="border rounded p-1.5 bg-gray-50">
                                  <div className="flex justify-between">
                                    <span className="font-medium">{rx.diagnosis || 'Prescription'}</span>
                                    <span className="text-muted-foreground">{rx.prescription_date ? new Date(rx.prescription_date).toLocaleDateString() : ''}</span>
                                  </div>
                                  {(rx.items || []).slice(0, 3).map((item: any, i: number) => (
                                    <p key={i} className="text-muted-foreground">• {item.medication_name} {item.dosage} × {item.frequency}</p>
                                  ))}
                                  {(rx.items || []).length > 3 && <p className="text-muted-foreground italic">+{rx.items.length - 3} more</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t" />

              {/* ── 1. Clinical Notes ── */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                  <Stethoscope className="h-3 w-3" /> Clinical Notes
                </p>
                <div className="space-y-1">
                  <Label>Diagnosis *</Label>
                  <Textarea placeholder="Enter diagnosis..." value={diagnosis} onChange={e => setDiagnosis(e.target.value)} rows={2} />
                </div>
                <ICD10Search
                  multiple
                  label="ICD-10 Codes"
                  selectedCodes={icd10Codes}
                  onSelect={setIcd10Codes}
                />
                <div className="space-y-1">
                  <Label>Chief Complaint</Label>
                  <Input placeholder="Patient main complaint..." value={chiefComplaint} onChange={e => setChiefComplaint(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Consultation Notes</Label>
                  <Textarea placeholder="History, examination findings..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
                </div>
                <div className="space-y-1">
                  <Label>Treatment Plan</Label>
                  <Textarea placeholder="Overall treatment plan..." value={treatmentPlan} onChange={e => setTreatmentPlan(e.target.value)} rows={2} />
                </div>
              </div>

              <div className="border-t" />

              {/* ── 2. Lab Tests ── */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                  <FlaskConical className="h-3 w-3" /> Lab Tests
                  {labOrders.length > 0 && <Badge className="ml-1 text-[10px] h-4 px-1">{labOrders.length} selected</Badge>}
                </p>
                <div className="flex gap-2">
                  <Input placeholder="Search lab tests..." value={labSearch} onChange={e => setLabSearch(e.target.value)} className="flex-1" />
                  <Select value={labPriority} onValueChange={setLabPriority}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                      <SelectItem value="STAT">STAT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto">
                  {labSearch.trim() === "" ? (
                    <p className="col-span-2 text-xs text-muted-foreground text-center py-4">Type to search lab tests...</p>
                  ) : labTests.filter(t => (t.service_name || t.test_name || "").toLowerCase().includes(labSearch.toLowerCase())).length === 0 ? (
                    <p className="col-span-2 text-xs text-muted-foreground text-center py-4">No tests found</p>
                  ) : labTests.filter(t => (t.service_name || t.test_name || "").toLowerCase().includes(labSearch.toLowerCase())).map(t => {
                    const sel = labOrders.some(o => o.testId === t.id);
                    return (
                      <button key={t.id} onClick={() => toggleLab(t)}
                        className={`text-left p-2 rounded-lg border text-sm transition-colors ${sel ? "bg-blue-50 border-blue-400 font-medium" : "hover:bg-gray-50 border-gray-200"}`}>
                        <div className="flex items-center gap-2">
                          {sel && <CheckCircle className="h-3 w-3 text-blue-600 flex-shrink-0" />}
                          <span>{t.service_name || t.test_name}</span>
                        </div>
                        {t.base_price && <span className="text-xs text-muted-foreground">TSh {Number(t.base_price).toLocaleString()}</span>}
                      </button>
                    );
                  })}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Lab Notes / Instructions</Label>
                  <Textarea placeholder="Special instructions for lab..." value={labNotes} onChange={e => setLabNotes(e.target.value)} rows={1} />
                </div>
                {labOrders.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {labOrders.map(o => (
                        <Badge key={o.testId} variant="secondary" className="gap-1">
                          {o.testName} · {o.priority}
                          <button onClick={() => setLabOrders(p => p.filter(x => x.testId !== o.testId))}><X className="h-3 w-3" /></button>
                        </Badge>
                      ))}
                    </div>
                    <Button size="sm" variant="outline" className="border-blue-400 text-blue-700 hover:bg-blue-50 gap-1 w-full" onClick={sendToLab} disabled={submitting}>
                      <Send className="h-3 w-3" /> Send {labOrders.length} test(s) to Lab now
                    </Button>
                  </div>
                )}
              </div>

              <div className="border-t" />

              {/* ── 3. Medications ── */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                  <Pill className="h-3 w-3" /> Medications
                  {medOrders.length > 0 && <Badge className="ml-1 text-[10px] h-4 px-1">{medOrders.length} selected</Badge>}
                </p>
                <Input placeholder="Search medications..." value={medSearch} onChange={e => setMedSearch(e.target.value)} />
                <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto">
                  {medSearch.trim() === "" ? (
                    <p className="col-span-2 text-xs text-muted-foreground text-center py-4">Type to search medications...</p>
                  ) : meds.filter(m => m.name.toLowerCase().includes(medSearch.toLowerCase()) || (m.generic_name || "").toLowerCase().includes(medSearch.toLowerCase())).length === 0 ? (
                    <p className="col-span-2 text-xs text-muted-foreground text-center py-4">No medications found</p>
                  ) : meds.filter(m => m.name.toLowerCase().includes(medSearch.toLowerCase()) || (m.generic_name || "").toLowerCase().includes(medSearch.toLowerCase())).map(m => {
                    const stock = m.stock_quantity || 0;
                    const sel = medOrders.some(o => o.medicationId === m.id);
                    return (
                      <button key={m.id} onClick={() => toggleMed(m)} disabled={stock === 0}
                        className={`text-left p-2 rounded-lg border text-sm transition-colors ${sel ? "bg-purple-50 border-purple-400 font-medium" : stock === 0 ? "opacity-40 cursor-not-allowed border-gray-200" : "hover:bg-gray-50 border-gray-200"}`}>
                        <div className="flex items-center gap-2">
                          {sel && <CheckCircle className="h-3 w-3 text-purple-600 flex-shrink-0" />}
                          <span>{m.name}</span>
                          {m.strength && <Badge variant="outline" className="text-[10px] px-1 py-0">{m.strength}</Badge>}
                        </div>
                        <span className={`text-xs ${stock === 0 ? "text-red-500" : stock < 10 ? "text-orange-500" : "text-muted-foreground"}`}>
                          {stock === 0 ? "Out of stock" : `Stock: ${stock}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {medOrders.map(o => (
                  <Card key={o.medicationId} className="bg-purple-50/50 border-purple-200">
                    <CardContent className="py-3 px-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm text-purple-900">{o.medicationName}</p>
                        <button onClick={() => setMedOrders(p => p.filter(m => m.medicationId !== o.medicationId))}><X className="h-4 w-4 text-muted-foreground hover:text-red-500" /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {(["dosage","frequency","duration","quantity"] as const).map(f => (
                          <div key={f}>
                            <Label className="text-xs capitalize">{f} *</Label>
                            <Input className="h-7 text-sm"
                              placeholder={f === "dosage" ? "e.g. 500mg" : f === "frequency" ? "e.g. Twice daily" : f === "duration" ? "e.g. 7 days" : "e.g. 14"}
                              value={(o as any)[f]} onChange={e => updateMed(o.medicationId, f, e.target.value)} />
                          </div>
                        ))}
                        <div className="col-span-2">
                          <Label className="text-xs">Instructions</Label>
                          <Input className="h-7 text-sm" placeholder="e.g. Take after meals"
                            value={o.instructions} onChange={e => updateMed(o.medicationId, "instructions", e.target.value)} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {medOrders.length > 0 && (
                  <Button size="sm" variant="outline" className="border-purple-400 text-purple-700 hover:bg-purple-50 gap-1 w-full" onClick={sendToPharmacy} disabled={submitting}>
                    <Send className="h-3 w-3" /> Send prescription to Pharmacy now
                  </Button>
                )}
              </div>

              <div className="border-t" />

              {/* ── 4. Procedures / Nursing / Vaccination ── */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                  <Syringe className="h-3 w-3" /> Procedures / Nursing / Vaccination
                  {procOrders.length > 0 && <Badge className="ml-1 text-[10px] h-4 px-1">{procOrders.length} selected</Badge>}
                </p>
                <Input placeholder="Search procedures, vaccinations..." value={svcSearch} onChange={e => setSvcSearch(e.target.value)} />
                <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto">
                  {svcSearch.trim() === "" ? (
                    <p className="col-span-2 text-xs text-muted-foreground text-center py-4">Type to search procedures...</p>
                  ) : services.filter(s => s.service_name.toLowerCase().includes(svcSearch.toLowerCase())).length === 0 ? (
                    <p className="col-span-2 text-xs text-muted-foreground text-center py-4">No procedures found</p>
                  ) : services.filter(s => s.service_name.toLowerCase().includes(svcSearch.toLowerCase())).map(s => {
                    const sel = procOrders.some(o => o.serviceId === s.id);
                    return (
                      <button key={s.id} onClick={() => toggleSvc(s)}
                        className={`text-left p-2 rounded-lg border text-sm transition-colors ${sel ? "bg-green-50 border-green-400 font-medium" : "hover:bg-gray-50 border-gray-200"}`}>
                        <div className="flex items-center gap-2">
                          {sel && <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />}
                          <span>{s.service_name}</span>
                        </div>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-[10px] px-1 py-0">{s.service_type}</Badge>
                          <span className="text-xs text-muted-foreground">TSh {Number(s.base_price).toLocaleString()}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {procOrders.map(o => (
                  <div key={o.serviceId} className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-2">
                    <span className="flex-1 text-sm font-medium">{o.serviceName}</span>
                    <Input className="w-14 h-7 text-sm text-center" type="number" min={1} value={o.quantity}
                      onChange={e => setProcOrders(p => p.map(x => x.serviceId === o.serviceId ? { ...x, quantity: parseInt(e.target.value) || 1 } : x))} />
                    <Input className="flex-1 h-7 text-sm" placeholder="Notes..."
                      value={o.notes} onChange={e => setProcOrders(p => p.map(x => x.serviceId === o.serviceId ? { ...x, notes: e.target.value } : x))} />
                    <button onClick={() => setProcOrders(p => p.filter(x => x.serviceId !== o.serviceId))}><X className="h-4 w-4 text-muted-foreground hover:text-red-500" /></button>
                  </div>
                ))}
                {procOrders.length > 0 && (
                  <Button size="sm" variant="outline" className="border-green-500 text-green-700 hover:bg-green-50 gap-1 w-full" onClick={sendToNurse} disabled={submitting}>
                    <Send className="h-3 w-3" /> Send {procOrders.length} procedure(s) to Nurse now
                  </Button>
                )}
              </div>

            </div>
          </ScrollArea>
        </div>

        <div className="border-t px-6 py-3 flex items-center justify-between bg-white flex-shrink-0">
          <p className="text-sm text-muted-foreground">
            {totalOrders === 0 ? "No orders — patient will go to Billing" :
              [labOrders.length > 0 && `${labOrders.length} lab`, medOrders.length > 0 && `${medOrders.length} rx`, procOrders.length > 0 && `${procOrders.length} proc`].filter(Boolean).join(" · ")}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button variant="outline" onClick={saveDraft} disabled={savingDraft}>
              {savingDraft ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Draft
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Complete & Dispatch
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
