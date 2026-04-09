import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import api from '@/lib/api';
import { format } from 'date-fns';
import {
  UserCheck, Stethoscope, FlaskConical, Pill, CreditCard, LogOut,
  Clock, CheckCircle2, XCircle, AlertCircle
} from 'lucide-react';

interface JourneyProps {
  visitId: string;
  patientName: string;
  open: boolean;
  onClose: () => void;
}

const STAGES = [
  { key: 'reception', label: 'Reception', Icon: UserCheck,   statusKey: 'reception_status', timeKey: 'reception_completed_at' },
  { key: 'nurse',     label: 'Triage',    Icon: AlertCircle, statusKey: 'nurse_status',      timeKey: 'nurse_completed_at' },
  { key: 'doctor',    label: 'Doctor',    Icon: Stethoscope, statusKey: 'doctor_status',     timeKey: 'doctor_completed_at' },
  { key: 'lab',       label: 'Lab',       Icon: FlaskConical,statusKey: 'lab_status',        timeKey: 'lab_completed_at' },
  { key: 'pharmacy',  label: 'Pharmacy',  Icon: Pill,        statusKey: 'pharmacy_status',   timeKey: 'pharmacy_completed_at' },
  { key: 'billing',   label: 'Billing',   Icon: CreditCard,  statusKey: 'billing_status',    timeKey: 'billing_completed_at' },
  { key: 'discharge', label: 'Discharge', Icon: LogOut,      statusKey: 'overall_status',    timeKey: null },
];

function StageNode({ stage, visit }: { stage: typeof STAGES[0]; visit: any }) {
  const status: string = visit[stage.statusKey] || '';
  const time: string | null = stage.timeKey ? visit[stage.timeKey] : null;
  const done = status === 'Completed' || status === 'Paid' || status === 'Discharged';
  const active = status === 'In Progress';
  const skipped = status === 'Skipped' || status === 'Not Required';

  return (
    <div className="flex flex-col items-center min-w-[80px]">
      <div className={`rounded-full p-2 border-2 ${done ? 'border-green-500 bg-green-50' : active ? 'border-blue-400 bg-blue-50' : skipped ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-gray-50'}`}>
        {done  && <CheckCircle2 className="h-5 w-5 text-green-600" />}
        {active && <Clock className="h-5 w-5 text-blue-500 animate-pulse" />}
        {skipped && <XCircle className="h-5 w-5 text-yellow-500" />}
        {!done && !active && !skipped && <stage.Icon className="h-5 w-5 text-gray-300" />}
      </div>
      <p className="text-xs font-medium mt-1 text-center">{stage.label}</p>
      {time && <p className="text-[10px] text-muted-foreground text-center">{format(new Date(time), 'HH:mm')}</p>}
      {status && <Badge variant="outline" className="text-[10px] mt-1 px-1 py-0">{status}</Badge>}
    </div>
  );
}

export function InsurancePatientJourney({ visitId, patientName, open, onClose }: JourneyProps) {
  const [visit, setVisit] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !visitId) return;
    setLoading(true);
    api.get(`/patient-visits/${visitId}`)
      .then(({ data }) => setVisit(data.visit || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, visitId]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Patient Journey — {patientName}</DialogTitle>
        </DialogHeader>

        {loading && <p className="text-center text-muted-foreground py-8">Loading...</p>}

        {visit && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 text-sm items-center">
              <span className="text-muted-foreground">Visit:</span>
              <span className="font-medium">{format(new Date(visit.visit_date), 'dd MMM yyyy HH:mm')}</span>
              {visit.icd10_code && (
                <span className="text-muted-foreground">| ICD-10: <span className="font-medium text-foreground">{visit.icd10_code} — {visit.icd10_description}</span></span>
              )}
              <Badge variant={visit.overall_status === 'Completed' ? 'default' : 'secondary'}>
                {visit.overall_status || 'Active'}
              </Badge>
            </div>

            {/* Timeline */}
            <Card>
              <CardContent className="pt-4 overflow-x-auto">
                <div className="flex items-start gap-0">
                  {STAGES.map((stage, idx) => (
                    <div key={stage.key} className="flex items-center">
                      <StageNode stage={stage} visit={visit} />
                      {idx < STAGES.length - 1 && (
                        <div className="w-6 h-0.5 bg-gray-200 mt-[-20px] mx-1 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Details */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {visit.chief_complaint && (
                <div><span className="text-muted-foreground">Chief Complaint:</span><p className="font-medium">{visit.chief_complaint}</p></div>
              )}
              {visit.doctor_diagnosis && (
                <div><span className="text-muted-foreground">Diagnosis:</span><p className="font-medium">{visit.doctor_diagnosis}</p></div>
              )}
              {visit.final_diagnosis && (
                <div><span className="text-muted-foreground">Final Diagnosis:</span><p className="font-medium">{visit.final_diagnosis}</p></div>
              )}
              {visit.nurse_notes && (
                <div><span className="text-muted-foreground">Nurse Notes:</span><p className="font-medium">{visit.nurse_notes}</p></div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
