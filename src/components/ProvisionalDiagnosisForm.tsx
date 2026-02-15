import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Save, FileText } from 'lucide-react';

interface ProvisionalDiagnosisFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visit: any;
  onSave: (data: ProvisionalDiagnosisData) => void;
  loading?: boolean;
}

interface ProvisionalDiagnosisData {
  chief_complaint_detailed: string;
  history_present_illness: string;
  review_of_systems: string;
  past_medical_history: string;
  family_social_history: string;
  obstetric_history: string;
  developmental_milestones: string;
  provisional_diagnosis: string;
  investigation_plan: string;
  final_diagnosis: string;
  treatment_rx: string;
  other_management: string;
  provisional_diagnosis_completed: boolean;
}

export function ProvisionalDiagnosisForm({ 
  open, 
  onOpenChange, 
  visit, 
  onSave, 
  loading = false 
}: ProvisionalDiagnosisFormProps) {
  const [formData, setFormData] = useState<ProvisionalDiagnosisData>({
    chief_complaint_detailed: '',
    history_present_illness: '',
    review_of_systems: '',
    past_medical_history: '',
    family_social_history: '',
    obstetric_history: '',
    developmental_milestones: '',
    provisional_diagnosis: '',
    investigation_plan: '',
    final_diagnosis: '',
    treatment_rx: '',
    other_management: '',
    provisional_diagnosis_completed: false
  });

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    history: true,
    diagnosis: true,
    management: true
  });

  const [hasDraft, setHasDraft] = useState(false);

  // Load existing data when visit changes
  useEffect(() => {
    if (visit) {
      // Check for draft data in localStorage first
      const draftKey = `provisional_diagnosis_draft_${visit.id}`;
      const savedDraft = localStorage.getItem(draftKey);
      
      let initialData = {
        chief_complaint_detailed: visit.chief_complaint_detailed || '',
        history_present_illness: visit.history_present_illness || '',
        review_of_systems: visit.review_of_systems || '',
        past_medical_history: visit.past_medical_history || '',
        family_social_history: visit.family_social_history || '',
        obstetric_history: visit.obstetric_history || '',
        developmental_milestones: visit.developmental_milestones || '',
        provisional_diagnosis: visit.provisional_diagnosis || visit.doctor_diagnosis || '',
        investigation_plan: visit.investigation_plan || '',
        final_diagnosis: visit.final_diagnosis || '',
        treatment_rx: visit.treatment_rx || '',
        other_management: visit.other_management || '',
        provisional_diagnosis_completed: visit.provisional_diagnosis_completed || false
      };

      // If there's a draft and it's more recent than the saved data, use the draft
      if (savedDraft) {
        try {
          const draftData = JSON.parse(savedDraft);
          const draftTimestamp = draftData.timestamp || 0;
          const visitTimestamp = new Date(visit.updated_at || visit.created_at).getTime();
          
          // Use draft if it's newer than the last saved visit data
          if (draftTimestamp > visitTimestamp) {
            initialData = { ...initialData, ...draftData.data };
            setHasDraft(true);
          }
        } catch (error) {

        }
      }

      setFormData(initialData);
    }
  }, [visit]);

  // Auto-save draft data when form changes
  useEffect(() => {
    if (visit && formData.chief_complaint_detailed) {
      const draftKey = `provisional_diagnosis_draft_${visit.id}`;
      const draftData = {
        data: formData,
        timestamp: Date.now()
      };
      
      // Debounce the save to avoid too many localStorage writes
      const timeoutId = setTimeout(() => {
        localStorage.setItem(draftKey, JSON.stringify(draftData));
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [formData, visit]);

  const handleInputChange = (field: keyof ProvisionalDiagnosisData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleSave = () => {
    // Clear the draft when saving
    if (visit) {
      const draftKey = `provisional_diagnosis_draft_${visit.id}`;
      localStorage.removeItem(draftKey);
      setHasDraft(false);
    }
    onSave(formData);
  };

  const clearDraft = () => {
    if (visit) {
      const draftKey = `provisional_diagnosis_draft_${visit.id}`;
      localStorage.removeItem(draftKey);
      setHasDraft(false);
      
      // Reset to saved data
      const savedData = {
        chief_complaint_detailed: visit.chief_complaint_detailed || '',
        history_present_illness: visit.history_present_illness || '',
        review_of_systems: visit.review_of_systems || '',
        past_medical_history: visit.past_medical_history || '',
        family_social_history: visit.family_social_history || '',
        obstetric_history: visit.obstetric_history || '',
        developmental_milestones: visit.developmental_milestones || '',
        provisional_diagnosis: visit.provisional_diagnosis || visit.doctor_diagnosis || '',
        investigation_plan: visit.investigation_plan || '',
        final_diagnosis: visit.final_diagnosis || '',
        treatment_rx: visit.treatment_rx || '',
        other_management: visit.other_management || '',
        provisional_diagnosis_completed: visit.provisional_diagnosis_completed || false
      };
      setFormData(savedData);
    }
  };

  const isPatientFemale = visit?.patient?.gender === 'Female';
  const isPatientChild = visit?.patient?.date_of_birth && 
    new Date().getFullYear() - new Date(visit.patient.date_of_birth).getFullYear() < 18;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[95vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Provisional Diagnosis Form
            {hasDraft && (
              <Badge variant="secondary" className="ml-2">
                Draft Available
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Complete medical assessment for {visit?.patient?.full_name}
            {hasDraft && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-orange-600">
                  Unsaved changes detected from previous session
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearDraft}
                  className="text-xs h-6"
                >
                  Clear Draft
                </Button>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 max-h-[calc(95vh-120px)]">
          <div className="space-y-6 pb-4">
            
            {/* History Section */}
            <Card>
              <Collapsible 
                open={expandedSections.history} 
                onOpenChange={() => toggleSection('history')}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-gray-50">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <span>Medical History</span>
                      {expandedSections.history ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronRight className="h-4 w-4" />
                      }
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    
                    {/* Chief Complaint */}
                    <div>
                      <Label htmlFor="chief_complaint_detailed" className="text-sm font-medium">
                        Chief Complaint (C/C) *
                      </Label>
                      <Textarea
                        id="chief_complaint_detailed"
                        placeholder="Detailed chief complaint..."
                        value={formData.chief_complaint_detailed}
                        onChange={(e) => handleInputChange('chief_complaint_detailed', e.target.value)}
                        rows={3}
                        className="mt-1"
                      />
                    </div>

                    {/* History of Present Illness */}
                    <div>
                      <Label htmlFor="history_present_illness" className="text-sm font-medium">
                        History of Present Illness (H.P.I)
                      </Label>
                      <Textarea
                        id="history_present_illness"
                        placeholder="Detailed history of present illness..."
                        value={formData.history_present_illness}
                        onChange={(e) => handleInputChange('history_present_illness', e.target.value)}
                        rows={4}
                        className="mt-1"
                      />
                    </div>

                    {/* Review of Systems */}
                    <div>
                      <Label htmlFor="review_of_systems" className="text-sm font-medium">
                        Review of Systems (R.O.S)
                      </Label>
                      <Textarea
                        id="review_of_systems"
                        placeholder="Systematic review of body systems..."
                        value={formData.review_of_systems}
                        onChange={(e) => handleInputChange('review_of_systems', e.target.value)}
                        rows={4}
                        className="mt-1"
                      />
                    </div>

                    {/* Past Medical History */}
                    <div>
                      <Label htmlFor="past_medical_history" className="text-sm font-medium">
                        Past Medical History (P.M.H)
                      </Label>
                      <Textarea
                        id="past_medical_history"
                        placeholder="Previous medical conditions, surgeries, hospitalizations..."
                        value={formData.past_medical_history}
                        onChange={(e) => handleInputChange('past_medical_history', e.target.value)}
                        rows={3}
                        className="mt-1"
                      />
                    </div>

                    {/* Family Social History */}
                    <div>
                      <Label htmlFor="family_social_history" className="text-sm font-medium">
                        Family & Social History (F.S.H)
                      </Label>
                      <Textarea
                        id="family_social_history"
                        placeholder="Family medical history, social habits, occupation..."
                        value={formData.family_social_history}
                        onChange={(e) => handleInputChange('family_social_history', e.target.value)}
                        rows={3}
                        className="mt-1"
                      />
                    </div>

                    {/* Obstetric History - Only for females */}
                    {isPatientFemale && (
                      <div>
                        <Label htmlFor="obstetric_history" className="text-sm font-medium">
                          Obstetric History
                        </Label>
                        <Textarea
                          id="obstetric_history"
                          placeholder="Pregnancy history, deliveries, complications..."
                          value={formData.obstetric_history}
                          onChange={(e) => handleInputChange('obstetric_history', e.target.value)}
                          rows={3}
                          className="mt-1"
                        />
                      </div>
                    )}

                    {/* Developmental Milestones - Only for children */}
                    {isPatientChild && (
                      <div>
                        <Label htmlFor="developmental_milestones" className="text-sm font-medium">
                          Developmental Milestones
                        </Label>
                        <Textarea
                          id="developmental_milestones"
                          placeholder="Growth and developmental milestones..."
                          value={formData.developmental_milestones}
                          onChange={(e) => handleInputChange('developmental_milestones', e.target.value)}
                          rows={3}
                          className="mt-1"
                        />
                      </div>
                    )}

                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Diagnosis Section */}
            <Card>
              <Collapsible 
                open={expandedSections.diagnosis} 
                onOpenChange={() => toggleSection('diagnosis')}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-gray-50">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <span>Diagnosis & Investigation</span>
                      {expandedSections.diagnosis ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronRight className="h-4 w-4" />
                      }
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    
                    {/* Provisional Diagnosis */}
                    <div>
                      <Label htmlFor="provisional_diagnosis" className="text-sm font-medium">
                        Provisional Diagnosis *
                      </Label>
                      <Textarea
                        id="provisional_diagnosis"
                        placeholder="Working diagnosis based on assessment..."
                        value={formData.provisional_diagnosis}
                        onChange={(e) => handleInputChange('provisional_diagnosis', e.target.value)}
                        rows={3}
                        className="mt-1"
                      />
                    </div>

                    {/* Investigation Plan */}
                    <div>
                      <Label htmlFor="investigation_plan" className="text-sm font-medium">
                        Investigation Plan
                      </Label>
                      <Textarea
                        id="investigation_plan"
                        placeholder="Laboratory tests, imaging, other investigations..."
                        value={formData.investigation_plan}
                        onChange={(e) => handleInputChange('investigation_plan', e.target.value)}
                        rows={3}
                        className="mt-1"
                      />
                    </div>

                    {/* Final Diagnosis */}
                    <div>
                      <Label htmlFor="final_diagnosis" className="text-sm font-medium">
                        Final Diagnosis
                      </Label>
                      <Textarea
                        id="final_diagnosis"
                        placeholder="Confirmed diagnosis after investigations..."
                        value={formData.final_diagnosis}
                        onChange={(e) => handleInputChange('final_diagnosis', e.target.value)}
                        rows={3}
                        className="mt-1"
                      />
                    </div>

                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Management Section */}
            <Card>
              <Collapsible 
                open={expandedSections.management} 
                onOpenChange={() => toggleSection('management')}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-gray-50">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <span>Treatment & Management</span>
                      {expandedSections.management ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronRight className="h-4 w-4" />
                      }
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    
                    {/* Treatment (Rx) */}
                    <div>
                      <Label htmlFor="treatment_rx" className="text-sm font-medium">
                        Treatment (Rx)
                      </Label>
                      <Textarea
                        id="treatment_rx"
                        placeholder="Medications, dosages, duration..."
                        value={formData.treatment_rx}
                        onChange={(e) => handleInputChange('treatment_rx', e.target.value)}
                        rows={4}
                        className="mt-1"
                      />
                    </div>

                    {/* Other Management */}
                    <div>
                      <Label htmlFor="other_management" className="text-sm font-medium">
                        Other Management
                      </Label>
                      <Textarea
                        id="other_management"
                        placeholder="Non-pharmacological management, follow-up, referrals..."
                        value={formData.other_management}
                        onChange={(e) => handleInputChange('other_management', e.target.value)}
                        rows={4}
                        className="mt-1"
                      />
                    </div>

                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Completion Checkbox */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="provisional_diagnosis_completed"
                    checked={formData.provisional_diagnosis_completed}
                    onCheckedChange={(checked) => 
                      handleInputChange('provisional_diagnosis_completed', checked as boolean)
                    }
                  />
                  <Label 
                    htmlFor="provisional_diagnosis_completed" 
                    className="text-sm font-medium cursor-pointer"
                  >
                    Mark provisional diagnosis as completed
                  </Label>
                </div>
              </CardContent>
            </Card>

          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={loading || !formData.chief_complaint_detailed || !formData.provisional_diagnosis}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Saving...' : 'Save Diagnosis'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}