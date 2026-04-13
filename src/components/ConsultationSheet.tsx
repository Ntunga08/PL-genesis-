import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import api from "@/lib/api";
import { FlaskConical, Pill, Syringe, CheckCircle, X, Loader2, Send, Save, AlertTriangle, Stethoscope, History, ChevronDown, ChevronUp } from "lucide-react";
import { ICD10Search } from "@/components/ICD10Search";

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
  const [activeTab, setActiveTab] = useState("1-history");

  // 1. History (from system)
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [historyData, setHistoryData] = useState<{ visits: any[]; prescriptions: any[]; labTests: any[] } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 2. Clinical History
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [historyPresentIllness, setHistoryPresentIllness] = useState("");
  const [reviewOfSystems, setReviewOfSystems] = useState("");
  const [pastMedicalHistory, setPastMedicalHistory] = useState("");
  const [obstetricHistory, setObstetricHistory] = useState("");
  const [familySocialHistory, setFamilySocialHistory] = useState("");
  const [developmentMilestones, setDevelopmentMilestones] = useState("");
  const [vaccinationHistory, setVaccinationHistory] = useState("");
  const [nutritionHistory, setNutritionHistory] = useState("");
  const [onExamination, setOnExamination] = useState("");

  // 3. Provisional Diagnosis
  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState("");
  const [provisionalIcd10, setProvisionalIcd10] = useState<{code:string;description:string}[]>([]);

  // 4. Investigation (Lab)
  const [labTests, setLabTests] = useState<any[]>([]);
  const [labOrders, setLabOrders] = useState<{testId:string;testName:string;testType:string;priority:string}[]>([]);
  const [labSearch, setLabSearch] = useState("");
  const [labPriority, setLabPriority] = useState("Normal");
  const [labNotes, setLabNotes] = useState("");

  // 5. Diagnosis
  const [diagnosis, setDiagnosis] = useState("");
  const [icd10Codes, setIcd10Codes] = useState<{code:string;description:string}[]>([]);

  // 6. Treatment
  const [meds, setMeds] = useState<any[]>([]);
  const [medOrders, setMedOrders] = useState<MedOrder[]>([]);
  const [medSearch, setMedSearch] = useState("");
  const [services, setServices] = useState<any[]>([]);
  const [procOrders, setProcOrders] = useState<ProcOrder[]>([]);
  const [svcSearch, setSvcSearch] = useState("");
  const [treatmentPlan, setTreatmentPlan] = useState("");

  // 7. Other Management
  const [otherManagement, setOtherManagement] = useState("");
  const [investigationPlan, setInvestigationPlan] = useState("");
  const [treatmentRx, setTreatmentRx] = useState("");
  const [finalDiagnosis, setFinalDiagnosis] = useState("");

  useEffect(() => {
    if (!open) return;
    // Load saved values
    setChiefComplaint(visit?.chief_complaint || "");
    setHistoryPresentIllness(visit?.history_present_illness || "");
    setReviewOfSystems(visit?.review_of_systems || "");
    setPastMedicalHistory(visit?.past_medical_history || "");
    setObstetricHistory(visit?.obstetric_history || "");
    setFamilySocialHistory(visit?.family_social_history || "");
    setDevelopmentMilestones(visit?.developmental_milestones || "");
    setVaccinationHistory(visit?.vaccination_history || "");
    setNutritionHistory(visit?.nutrition_history || "");
    setOnExamination(visit?.on_examination || "");
    setProvisionalDiagnosis(visit?.provisional_diagnosis || "");
    setDiagnosis(visit?.doctor_diagnosis || visit?.final_diagnosis || "");
    setTreatmentPlan(visit?.treatment_plan || "");
    setOtherManagement(visit?.other_management || "");
    setInvestigationPlan(visit?.investigation_plan || "");
    setTreatmentRx(visit?.treatment_rx || "");
    setFinalDiagnosis(visit?.final_diagnosis || "");
    // ICD10
    const raw = visit?.icd10_codes || visit?.icd10_code;
    if (Array.isArray(raw)) setIcd10Codes(raw);
    else if (raw && typeof raw === 'string') {
      try { setIcd10Codes(JSON.parse(raw)); } catch { setIcd10Codes([{ code: raw, description: visit?.icd10_description || '' }]); }
    } else setIcd10Codes([]);
    const rawP = visit?.provisional_icd10;
    if (Array.isArray(rawP)) setProvisionalIcd10(rawP);
    else setProvisionalIcd10([]);
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
    setChiefComplaint(""); setHistoryPresentIllness(""); setReviewOfSystems("");
    setPastMedicalHistory(""); setObstetricHistory(""); setFamilySocialHistory("");
    setDevelopmentMilestones(""); setVaccinationHistory(""); setNutritionHistory(""); setOnExamination("");
    setProvisionalDiagnosis(""); setProvisionalIcd10([]);
    setDiagnosis(""); setIcd10Codes([]);
    setLabOrders([]); setMedOrders([]); setProcOrders([]);
    setLabSearch(""); setMedSearch(""); setSvcSearch(""); setLabNotes("");
    setTreatmentPlan(""); setOtherManagement(""); setInvestigationPlan(""); setTreatmentRx(""); setFinalDiagnosis("");
    setHistoryExpanded(false); setHistoryData(null);
    setActiveTab("1-history");
  };

  const handleClose = () => { reset(); onClose(); };

  const saveNotes = async () => {
    await api.put(`/visits/${visit.id}`, {
      chief_complaint: chiefComplaint || undefined,
      history_present_illness: historyPresentIllness || undefined,
      review_of_systems: reviewOfSystems || undefined,
      past_medical_history: pastMedicalHistory || undefined,
      obstetric_history: obstetricHistory || undefined,
      family_social_history: familySocialHistory || undefined,
      developmental_milestones: developmentMilestones || undefined,
      provisional_diagnosis: provisionalDiagnosis || undefined,
      doctor_diagnosis: diagnosis || undefined,
      icd10_code: icd10Codes.length ? JSON.stringify(icd10Codes) : undefined,
      icd10_description: icd10Codes.map(c => c.description).join('; ') || undefined,
      treatment_plan: treatmentPlan || undefined,
      other_management: otherManagement || undefined,
      investigation_plan: investigationPlan || undefined,
      treatment_rx: treatmentRx || undefined,
      final_diagnosis: finalDiagnosis || undefined,
    }).catch(() => {});
  };

  const saveDraft = async () => {
    setSavingDraft(true);
    try {
      await saveNotes();
      toast.success("Draft saved — continue later");
      onClose();
    } catch { toast.error("Failed to save draft"); }
    finally { setSavingDraft(false); }
  };

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
      await api.put(`/visits/${visit.id}`, { lab_status: "Pending", current_stage: "multi_order" });
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
        prescription_date: new Date().toISOString(), diagnosis: diagnosis || provisionalDiagnosis || "Pending",
        items: medOrders.map(o => ({
          medication_id: o.medicationId, medication_name: o.medicationName,
          dosage: o.dosage, frequency: o.frequency, duration: o.duration,
          quantity: parseInt(o.quantity), instructions: o.instructions || null,
        })),
      });
      await api.put(`/visits/${visit.id}`, { pharmacy_status: "Pending", current_stage: "multi_order" });
      toast.success("Prescription sent to Pharmacy");
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
      await api.put(`/visits/${visit.id}`, { nurse_status: "Pending", current_stage: "multi_order" });
      toast.success(`${procOrders.length} procedure(s) sent to Nurse`);
      setProcOrders([]); setSvcSearch("");
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || "Failed to send to nurse");
    } finally { setSubmitting(false); }
  };

  const handleComplete = async () => {
    if (!diagnosis.trim() && !provisionalDiagnosis.trim()) {
      toast.error("Enter at least a provisional or final diagnosis"); return;
    }
    for (const o of medOrders) {
      if (!o.dosage || !o.frequency || !o.duration || !o.quantity) {
        toast.error(`Fill all fields for ${o.medicationName}`); return;
      }
    }
    setSubmitting(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const destinations: string[] = [];
      await saveNotes();

      if (labOrders.length > 0) {
        for (const o of labOrders) {
          await api.post("/labs", {
            patient_id: visit.patient_id, doctor_id: doctorId,
            test_name: o.testName, test_type: o.testType,
            test_date: today, status: "Pending", notes: labNotes || null, visit_id: visit.id,
          });
        }
        destinations.push("lab");
      }
      if (medOrders.length > 0) {
        await api.post("/prescriptions", {
          patient_id: visit.patient_id, doctor_id: doctorId, visit_id: visit.id,
          prescription_date: new Date().toISOString(),
          diagnosis: diagnosis || provisionalDiagnosis,
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

      const { data: cv } = await api.get(`/visits/${visit.id}`).catch(() => ({ data: visit }));
      if (cv.lab_status === "Pending" && !destinations.includes("lab")) destinations.push("lab");
      if (cv.pharmacy_status === "Pending" && !destinations.includes("pharmacy")) destinations.push("pharmacy");
      if (cv.nurse_status === "Pending" && !destinations.includes("nurse")) destinations.push("nurse");

      const upd: Record<string, any> = { doctor_status: "Completed", doctor_completed_at: new Date().toISOString() };
      if (destinations.includes("lab")) upd.lab_status = "Pending";
      if (destinations.includes("pharmacy")) upd.pharmacy_status = "Pending";
      if (destinations.includes("nurse")) upd.nurse_status = "Pending";
      upd.current_stage = destinations.length === 0 ? "billing" : destinations.length === 1 ? destinations[0] : "multi_order";
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

  const patient = visit?.patient || {};
  const age = patient.date_of_birth ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear() : null;
  const vitals = visit?.vital_signs || {};
  const nurseVitals = (() => {
    try {
      const raw = visit?.nurse_notes;
      if (!raw) return null;
      const n = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return n;
    } catch { return null; }
  })();

  const labResults = (visit?.labTests || []).filter((t: any) => t.status === 'Completed');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl h-[95vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-4 pb-3 border-b flex-shrink-0">
          <DialogTitle className="text-base flex items-center gap-2 flex-wrap">
            <Stethoscope className="h-4 w-4" />
            Consultation — {patient.full_name}
            <Badge variant="outline" className="text-xs font-normal">{age ? `${age} yrs` : ""}{patient.gender ? ` · ${patient.gender}` : ""}</Badge>
            {visit?.lab_completed_at && <Badge className="text-xs bg-green-600"><FlaskConical className="h-3 w-3 mr-1" />Lab Results Ready</Badge>}
            {patient.allergies && <Badge variant="destructive" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Allergies: {patient.allergies}</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar — patient info */}
          <div className="w-48 border-r bg-gray-50 flex-shrink-0 overflow-y-auto p-3 space-y-3 text-xs">
            <div>
              <p className="font-semibold text-gray-500 uppercase tracking-wide mb-1">Patient</p>
              <p className="font-medium">{patient.full_name}</p>
              <p className="text-muted-foreground">{patient.phone}</p>
              {patient.blood_group && <p>Blood: {patient.blood_group}</p>}
            </div>
            {nurseVitals && (
              <div>
                <p className="font-semibold text-gray-500 uppercase tracking-wide mb-1">Vitals</p>
                {[
                  { l: 'BP', v: nurseVitals.blood_pressure, u: 'mmHg' },
                  { l: 'HR', v: nurseVitals.heart_rate, u: 'bpm' },
                  { l: 'Temp', v: nurseVitals.temperature, u: '°C' },
                  { l: 'SpO₂', v: nurseVitals.oxygen_saturation, u: '%' },
                  { l: 'Wt', v: nurseVitals.weight, u: nurseVitals.weight_unit || 'kg' },
                  { l: 'Ht', v: nurseVitals.height, u: nurseVitals.height_unit || 'cm' },
                ].filter(r => r.v && String(r.v).trim()).map(r => (
                  <div key={r.l} className="flex justify-between">
                    <span className="text-muted-foreground">{r.l}</span>
                    <span className="font-medium">{r.v} {r.u}</span>
                  </div>
                ))}
              </div>
            )}
            {labResults.length > 0 && (
              <div>
                <p className="font-semibold text-gray-500 uppercase tracking-wide mb-1 text-green-700 flex items-center gap-1">
                  <FlaskConical className="h-3 w-3" /> Lab Results
                </p>
                {labResults.map((t: any) => {
                  let lines: string[] = [];
                  if (t.result_value) lines = [t.result_value];
                  else if (t.results) {
                    try {
                      const p = typeof t.results === 'string' ? JSON.parse(t.results) : t.results;
                      if (p.results) lines = Object.entries(p.results).map(([k, v]: any) => `${k}: ${v?.value ?? v}${v?.unit ? ' '+v.unit : ''}`);
                    } catch {}
                  }
                  return (
                    <div key={t.id} className="mb-1.5 bg-green-50 border border-green-200 rounded p-1.5">
                      <p className="font-medium text-green-900">{t.test_name}</p>
                      {lines.map((l, i) => <p key={i} className="text-muted-foreground">{l}</p>)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Main content — tabs */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
              <TabsList className="flex-shrink-0 mx-4 mt-3 grid grid-cols-7 h-auto gap-0.5">
                <TabsTrigger value="1-history" className="text-[10px] px-1 py-1.5 flex-col h-auto">
                  <History className="h-3 w-3 mb-0.5" />History
                </TabsTrigger>
                <TabsTrigger value="2-clinical" className="text-[10px] px-1 py-1.5 flex-col h-auto">
                  <Stethoscope className="h-3 w-3 mb-0.5" />Clinical
                </TabsTrigger>
                <TabsTrigger value="3-provisional" className="text-[10px] px-1 py-1.5 flex-col h-auto">
                  <CheckCircle className="h-3 w-3 mb-0.5" />Provisional Dx
                </TabsTrigger>
                <TabsTrigger value="4-investigation" className="text-[10px] px-1 py-1.5 flex-col h-auto">
                  <FlaskConical className="h-3 w-3 mb-0.5" />Investigation
                </TabsTrigger>
                <TabsTrigger value="5-diagnosis" className="text-[10px] px-1 py-1.5 flex-col h-auto">
                  <CheckCircle className="h-3 w-3 mb-0.5" />Diagnosis
                </TabsTrigger>
                <TabsTrigger value="6-treatment" className="text-[10px] px-1 py-1.5 flex-col h-auto">
                  <Pill className="h-3 w-3 mb-0.5" />Treatment
                </TabsTrigger>
                <TabsTrigger value="7-other" className="text-[10px] px-1 py-1.5 flex-col h-auto">
                  <Save className="h-3 w-3 mb-0.5" />Other Mgmt
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 px-4 pb-4">

                {/* ── TAB 1: History from system ── */}
                <TabsContent value="1-history" className="mt-3 space-y-3">
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Patient History from System</p>
                  <button type="button" className="w-full flex items-center justify-between px-4 py-2.5 bg-purple-50 hover:bg-purple-100 rounded-lg border text-left"
                    onClick={() => { setHistoryExpanded(p => !p); if (!historyExpanded) loadHistory(); }}>
                    <span className="text-xs font-medium text-purple-700 flex items-center gap-1"><History className="h-3 w-3" /> Load Previous Visits, Labs & Prescriptions</span>
                    {historyExpanded ? <ChevronUp className="h-3 w-3 text-purple-500" /> : <ChevronDown className="h-3 w-3 text-purple-500" />}
                  </button>
                  {historyExpanded && (
                    <div className="space-y-3 text-xs">
                      {historyLoading ? (
                        <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
                      ) : !historyData || (historyData.visits.length === 0 && historyData.labTests.length === 0 && historyData.prescriptions.length === 0) ? (
                        <p className="text-center text-muted-foreground py-4">No previous history found</p>
                      ) : (
                        <>
                          {historyData.visits.length > 0 && (
                            <div>
                              <p className="font-semibold text-gray-600 mb-1.5">Past Visits ({historyData.visits.length})</p>
                              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                {historyData.visits.map((v: any) => (
                                  <div key={v.id} className="border rounded p-2 bg-gray-50">
                                    <div className="flex justify-between">
                                      <span className="font-medium">{v.visit_date ? new Date(v.visit_date).toLocaleDateString() : 'N/A'}</span>
                                      <Badge variant="outline" className="text-[10px] h-4 px-1">{v.overall_status || v.status}</Badge>
                                    </div>
                                    {(v.doctor_diagnosis || v.provisional_diagnosis) && <p className="text-muted-foreground mt-0.5">Dx: {v.doctor_diagnosis || v.provisional_diagnosis}</p>}
                                    {v.doctor_notes && <p className="text-muted-foreground italic truncate">{v.doctor_notes}</p>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {historyData.labTests.length > 0 && (
                            <div>
                              <p className="font-semibold text-gray-600 mb-1.5">Past Lab Tests ({historyData.labTests.length})</p>
                              <div className="space-y-1 max-h-36 overflow-y-auto">
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
                          {historyData.prescriptions.length > 0 && (
                            <div>
                              <p className="font-semibold text-gray-600 mb-1.5">Past Prescriptions ({historyData.prescriptions.length})</p>
                              <div className="space-y-1 max-h-36 overflow-y-auto">
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
                </TabsContent>

                {/* ── TAB 2: Clinical History ── */}
                <TabsContent value="2-clinical" className="mt-3 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Clinical History</p>
                  {[
                    { label: "i. Chief Complaint", value: chiefComplaint, set: setChiefComplaint, placeholder: "Main reason for visit..." },
                    { label: "ii. History of Present Illness", value: historyPresentIllness, set: setHistoryPresentIllness, placeholder: "Onset, duration, character, associated symptoms..." },
                    { label: "iii. Review of Other Systems", value: reviewOfSystems, set: setReviewOfSystems, placeholder: "Systematic review..." },
                    { label: "iv. Past Medical & Surgical History", value: pastMedicalHistory, set: setPastMedicalHistory, placeholder: "Previous illnesses, surgeries, hospitalizations..." },
                    { label: "v. Obstetric History", value: obstetricHistory, set: setObstetricHistory, placeholder: "G_P_A_ LMP, pregnancies..." },
                    { label: "vi. Family & Social History", value: familySocialHistory, set: setFamilySocialHistory, placeholder: "Family diseases, occupation, lifestyle..." },
                    { label: "vii. Developmental Milestones", value: developmentMilestones, set: setDevelopmentMilestones, placeholder: "Motor, speech, social development..." },
                    { label: "viii. Vaccination History", value: vaccinationHistory, set: setVaccinationHistory, placeholder: "Immunizations received..." },
                    { label: "ix. Nutrition History", value: nutritionHistory, set: setNutritionHistory, placeholder: "Diet, feeding, nutritional status..." },
                    { label: "x. On Examination", value: onExamination, set: setOnExamination, placeholder: "General appearance, systems examination findings..." },
                  ].map(({ label, value, set, placeholder }) => (
                    <div key={label} className="space-y-1">
                      <Label className="text-xs font-medium text-gray-700">{label}</Label>
                      <Textarea placeholder={placeholder} value={value} onChange={e => set(e.target.value)} rows={2} className="text-sm" />
                    </div>
                  ))}
                </TabsContent>

                {/* ── TAB 3: Provisional Diagnosis ── */}
                <TabsContent value="3-provisional" className="mt-3 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Provisional Diagnosis</p>
                  <div className="space-y-1">
                    <Label>Provisional Diagnosis</Label>
                    <Textarea placeholder="Working diagnosis based on history and examination..." value={provisionalDiagnosis} onChange={e => setProvisionalDiagnosis(e.target.value)} rows={3} />
                  </div>
                  <ICD10Search multiple label="ICD-10 Codes (Provisional)" selectedCodes={provisionalIcd10} onSelect={setProvisionalIcd10} />
                  <div className="space-y-1">
                    <Label>Investigation Plan</Label>
                    <Textarea placeholder="Planned investigations to confirm diagnosis..." value={investigationPlan} onChange={e => setInvestigationPlan(e.target.value)} rows={2} />
                  </div>
                </TabsContent>

                {/* ── TAB 4: Investigation ── */}
                <TabsContent value="4-investigation" className="mt-3 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <FlaskConical className="h-3 w-3" /> Investigation — Send to Lab & View Results
                  </p>
                  {/* Lab results if available */}
                  {labResults.length > 0 ? (
                    <div className="space-y-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-xs font-semibold text-green-700 flex items-center gap-1">
                        <FlaskConical className="h-3 w-3" /> Lab Results Received
                      </p>
                      {labResults.map((t: any) => {
                        let lines: string[] = [];
                        if (t.result_value) lines = [t.result_value];
                        else if (t.results) {
                          try {
                            const p = typeof t.results === 'string' ? JSON.parse(t.results) : t.results;
                            if (p.results) lines = Object.entries(p.results).map(([k, v]: any) =>
                              `${k}: ${v?.value ?? v}${v?.unit ? ' '+v.unit : ''}${v?.status && v.status !== 'Normal' ? ' ⚠' : ''}`);
                          } catch {}
                        }
                        return (
                          <div key={t.id} className="bg-white border border-green-200 rounded p-2 text-xs">
                            <p className="font-medium text-green-900">{t.test_name}</p>
                            {lines.length > 0 ? lines.map((l, i) => <p key={i} className="text-gray-700">{l}</p>)
                              : <p className="text-muted-foreground italic">No values recorded</p>}
                            {t.notes && <p className="text-muted-foreground italic">{t.notes}</p>}
                          </div>
                        );
                      })}
                    </div>
                  ) : (visit?.lab_status === 'Pending' || visit?.lab_completed_at) ? (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800 flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin flex-shrink-0" />
                      {visit?.lab_completed_at ? 'Lab completed — results not yet linked to this visit.' : 'Lab tests pending — results will appear here when ready.'}
                    </div>
                  ) : null}
                  {/* Order new tests */}
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
                        <Send className="h-3 w-3" /> Send {labOrders.length} test(s) to Lab
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* ── TAB 5: Diagnosis ── */}
                <TabsContent value="5-diagnosis" className="mt-3 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Final Diagnosis</p>
                  <div className="space-y-1">
                    <Label>Diagnosis *</Label>
                    <Textarea placeholder="Final confirmed diagnosis..." value={diagnosis} onChange={e => setDiagnosis(e.target.value)} rows={3} />
                  </div>
                  <ICD10Search multiple label="ICD-10 Codes (Final)" selectedCodes={icd10Codes} onSelect={setIcd10Codes} />
                </TabsContent>

                {/* ── TAB 6: Treatment ── */}
                <TabsContent value="6-treatment" className="mt-3 space-y-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <Pill className="h-3 w-3" /> Treatment — Medications, Procedures & Plan
                  </p>
                  <div className="space-y-1">
                    <Label>Treatment Plan</Label>
                    <Textarea placeholder="Overall treatment plan..." value={treatmentPlan} onChange={e => setTreatmentPlan(e.target.value)} rows={2} />
                  </div>
                  <div className="space-y-1">
                    <Label>Treatment Rx Notes</Label>
                    <Textarea placeholder="Specific prescriptions and instructions..." value={treatmentRx} onChange={e => setTreatmentRx(e.target.value)} rows={2} />
                  </div>
                  {/* Medications */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-600 flex items-center gap-1"><Pill className="h-3 w-3" /> Medications {medOrders.length > 0 && <Badge className="ml-1 text-[10px] h-4 px-1">{medOrders.length}</Badge>}</p>
                    <Input placeholder="Search medications..." value={medSearch} onChange={e => setMedSearch(e.target.value)} />
                    {medSearch.trim().length >= 2 && (
                      <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                        {meds.filter(m => m.name.toLowerCase().includes(medSearch.toLowerCase()) || (m.generic_name && m.generic_name.toLowerCase().includes(medSearch.toLowerCase()))).map(m => {
                          const sel = medOrders.some(o => o.medicationId === m.id);
                          const stock = m.stock_quantity || m.quantity_in_stock || 0;
                          return (
                            <button key={m.id} onClick={() => toggleMed(m)} disabled={stock === 0}
                              className={`text-left p-2 rounded-lg border text-sm transition-colors ${sel ? "bg-green-50 border-green-400" : stock === 0 ? "opacity-40 cursor-not-allowed border-gray-200" : "hover:bg-gray-50 border-gray-200"}`}>
                              <div className="flex items-center gap-1">
                                {sel && <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />}
                                <span className="font-medium">{m.name}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">{m.strength} · Stock: {stock}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {medSearch.trim().length > 0 && medSearch.trim().length < 2 && (
                      <p className="text-xs text-muted-foreground">Type at least 2 characters to search...</p>
                    )}
                    {medOrders.map(o => (
                      <div key={o.medicationId} className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-2">
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{o.medicationName}</span>
                            <button onClick={() => setMedOrders(p => p.filter(x => x.medicationId !== o.medicationId))}><X className="h-4 w-4 text-muted-foreground hover:text-red-500" /></button>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <Input className="h-7 text-xs" placeholder="Dosage" value={o.dosage} onChange={e => updateMed(o.medicationId, 'dosage', e.target.value)} />
                            <Input className="h-7 text-xs" placeholder="Frequency" value={o.frequency} onChange={e => updateMed(o.medicationId, 'frequency', e.target.value)} />
                            <Input className="h-7 text-xs" placeholder="Duration" value={o.duration} onChange={e => updateMed(o.medicationId, 'duration', e.target.value)} />
                            <Input className="h-7 text-xs" placeholder="Qty" type="number" value={o.quantity} onChange={e => updateMed(o.medicationId, 'quantity', e.target.value)} />
                          </div>
                          <Input className="h-7 text-xs" placeholder="Instructions (optional)" value={o.instructions} onChange={e => updateMed(o.medicationId, 'instructions', e.target.value)} />
                        </div>
                      </div>
                    ))}
                    {medOrders.length > 0 && (
                      <Button size="sm" variant="outline" className="border-green-500 text-green-700 hover:bg-green-50 gap-1 w-full" onClick={sendToPharmacy} disabled={submitting}>
                        <Send className="h-3 w-3" /> Send {medOrders.length} medication(s) to Pharmacy
                      </Button>
                    )}
                  </div>
                  {/* Procedures */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-600 flex items-center gap-1"><Syringe className="h-3 w-3" /> Procedures / Nursing {procOrders.length > 0 && <Badge className="ml-1 text-[10px] h-4 px-1">{procOrders.length}</Badge>}</p>
                    <Input placeholder="Search procedures, vaccinations..." value={svcSearch} onChange={e => setSvcSearch(e.target.value)} />
                    {svcSearch.trim().length >= 2 && (
                      <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                        {services.filter(s => s.service_name.toLowerCase().includes(svcSearch.toLowerCase())).map(s => {
                          const sel = procOrders.some(o => o.serviceId === s.id);
                          return (
                            <button key={s.id} onClick={() => toggleSvc(s)}
                              className={`text-left p-2 rounded-lg border text-sm transition-colors ${sel ? "bg-orange-50 border-orange-400" : "hover:bg-gray-50 border-gray-200"}`}>
                              {sel && <CheckCircle className="h-3 w-3 text-orange-600 inline mr-1" />}
                              {s.service_name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {procOrders.map(o => (
                      <div key={o.serviceId} className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg p-2">
                        <span className="flex-1 text-sm font-medium">{o.serviceName}</span>
                        <Input className="w-14 h-7 text-sm text-center" type="number" min={1} value={o.quantity}
                          onChange={e => setProcOrders(p => p.map(x => x.serviceId === o.serviceId ? { ...x, quantity: parseInt(e.target.value) || 1 } : x))} />
                        <Input className="flex-1 h-7 text-sm" placeholder="Notes..."
                          value={o.notes} onChange={e => setProcOrders(p => p.map(x => x.serviceId === o.serviceId ? { ...x, notes: e.target.value } : x))} />
                        <button onClick={() => setProcOrders(p => p.filter(x => x.serviceId !== o.serviceId))}><X className="h-4 w-4 text-muted-foreground hover:text-red-500" /></button>
                      </div>
                    ))}
                    {procOrders.length > 0 && (
                      <Button size="sm" variant="outline" className="border-orange-500 text-orange-700 hover:bg-orange-50 gap-1 w-full" onClick={sendToNurse} disabled={submitting}>
                        <Send className="h-3 w-3" /> Send {procOrders.length} procedure(s) to Nurse
                      </Button>
                    )}
                  </div>
                </TabsContent>

                {/* ── TAB 7: Other Management ── */}
                <TabsContent value="7-other" className="mt-3 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Other Management</p>
                  <div className="space-y-1">
                    <Label>Final Diagnosis (Confirmed)</Label>
                    <Textarea placeholder="Confirmed final diagnosis after investigations..." value={finalDiagnosis} onChange={e => setFinalDiagnosis(e.target.value)} rows={2} />
                  </div>
                  <div className="space-y-1">
                    <Label>Other Management Notes</Label>
                    <Textarea placeholder="Follow-up, referrals, patient education, lifestyle advice..." value={otherManagement} onChange={e => setOtherManagement(e.target.value)} rows={4} />
                  </div>
                </TabsContent>

              </ScrollArea>
            </Tabs>

            {/* Footer actions */}
            <div className="flex-shrink-0 border-t px-4 py-3 flex items-center justify-end gap-2 bg-white">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
                <Button variant="outline" size="sm" onClick={saveDraft} disabled={savingDraft}>
                  {savingDraft ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                  Save Draft
                </Button>
                <Button size="sm" onClick={handleComplete} disabled={submitting} className="bg-green-600 hover:bg-green-700">
                  {submitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                  Complete Consultation
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
