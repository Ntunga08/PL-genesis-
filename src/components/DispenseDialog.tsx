import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Plus, Trash2, X, Package, Pill, Printer } from 'lucide-react';

interface DispenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescription: any;
  medications: any[];
  onDispense: (data: any) => void;
  loading?: boolean;
}

export function DispenseDialog({ 
  open, 
  onOpenChange, 
  prescription, 
  medications,
  onDispense,
  loading = false
}: DispenseDialogProps) {
  
  const [editableMedications, setEditableMedications] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [medicationSearchTerms, setMedicationSearchTerms] = useState<{[key: number]: string}>({});

  useEffect(() => {
    const prescriptionItems = prescription?.items || prescription?.medications || [];

    if (prescriptionItems.length > 0) {
      setEditableMedications(
        prescriptionItems.map((med: any) => ({
          ...med,
          dispensed_quantity: med.quantity,
          dispensed_dosage: med.dosage,
          // Keep original prescription values as defaults
          frequency: med.frequency || '',
          duration: med.duration || '',
          instructions: med.instructions || '',
          original_medication_name: med.medication_name,
          original_dosage: med.dosage,
          original_quantity: med.quantity,
          original_frequency: med.frequency,
          original_duration: med.duration,
          is_new: false
        }))
      );
      setNotes('');
    }
  }, [prescription]);

  const totalCost = editableMedications.reduce((sum: number, med: any) => {
    const medicationData = medications.find(m => m.id === med.medication_id);
    const unitPrice = medicationData?.unit_price || 0;
    const quantity = med.dispensed_quantity || 0;
    return sum + (unitPrice * quantity);
  }, 0);

  const updateMedication = (index: number, field: string, value: any) => {
    const updated = [...editableMedications];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'medication_id') {
      const selectedMed = medications.find(m => m.id === value);
      if (selectedMed) {
        const autoFilledDosage = selectedMed.strength ? 
          (selectedMed.strength + ' ' + (selectedMed.dosage_form || '')).trim() : 
          updated[index].dosage;

        updated[index] = {
          ...updated[index],
          medication_id: value,
          medication_name: selectedMed.name,
          dispensed_dosage: autoFilledDosage,
          prescribed_medication_name: selectedMed.name,
          prescribed_dosage: autoFilledDosage,
          original_medication_name: updated[index].original_medication_name || updated[index].medication_name,
          original_dosage: updated[index].original_dosage || updated[index].dosage,
          original_quantity: updated[index].original_quantity || updated[index].quantity
        };

      }
    }
    
    setEditableMedications(updated);
  };

  const addNewMedication = () => {
    const newMedication = {
      id: 'new_' + Date.now(),
      medication_id: '',
      medication_name: '',
      dosage: '',
      frequency: '',
      duration: '',
      quantity: 1,
      dispensed_quantity: 1,
      dispensed_dosage: '',
      instructions: '',
      prescribed_medication_name: '',
      prescribed_dosage: '',
      original_medication_name: '',
      original_dosage: '',
      original_quantity: 1,
      is_new: true
    };
    setEditableMedications([...editableMedications, newMedication]);
  };

  const removeMedication = (index: number) => {
    const updated = editableMedications.filter((_, i) => i !== index);
    setEditableMedications(updated);
  };

  const handleSubmit = () => {
    onDispense({
      medications: editableMedications,
      notes
    });
  };

  // Pull diagnosis from prescription or its linked visit (whichever has data)
  const getDiagnosis = () =>
    prescription?.diagnosis ||
    prescription?.visit?.doctor_diagnosis ||
    prescription?.visit?.provisional_diagnosis ||
    prescription?.visit?.final_diagnosis ||
    'Not recorded';

  const getAge = () => {
    if (!prescription?.patient?.date_of_birth) return 'N/A';
    return `${new Date().getFullYear() - new Date(prescription.patient.date_of_birth).getFullYear()} yrs`;
  };

  const handlePrint = () => {
    const p = prescription?.patient || {};
    const doctor = prescription?.doctor || {};
    const diagnosis = getDiagnosis();
    const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const medsRows = editableMedications.map((med: any, i: number) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${med.medication_name || med.original_medication_name || '—'}</strong><br/>
          <small>${med.dispensed_dosage || med.dosage || ''}</small></td>
        <td>${med.frequency || '—'}</td>
        <td>${med.duration || '—'}</td>
        <td>${med.dispensed_quantity || med.quantity || '—'}</td>
        <td>${med.instructions || '—'}</td>
      </tr>`).join('');

    const html = `
      <html><head><title>Prescription</title><style>
        body{font-family:Arial,sans-serif;margin:24px;font-size:13px}
        h2{text-align:center;margin-bottom:2px}
        h4{text-align:center;color:#555;margin-top:0;margin-bottom:16px}
        .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;margin-bottom:16px;border:1px solid #ddd;padding:10px;border-radius:4px}
        .info-grid div{font-size:12px} .info-grid span{color:#555}
        table{width:100%;border-collapse:collapse;margin-top:12px}
        th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;font-size:12px}
        th{background:#f5f5f5;font-weight:bold}
        .footer{margin-top:24px;display:flex;justify-content:space-between;font-size:11px;color:#666}
        .sig{border-top:1px solid #333;width:160px;text-align:center;padding-top:4px;margin-top:32px}
        @media print{body{margin:10px}}
      </style></head><body>
        <h2>PRESCRIPTION</h2>
        <h4>Date: ${date}</h4>
        <div class="info-grid">
          <div><span>Patient Name:</span> <strong>${p.full_name || '—'}</strong></div>
          <div><span>Age / Sex:</span> <strong>${getAge()} / ${p.gender || '—'}</strong></div>
          <div><span>Phone:</span> ${p.phone || '—'}</div>
          <div><span>Blood Group:</span> ${p.blood_group || '—'}</div>
          ${p.allergies ? `<div class="col-span-2" style="color:#c00"><span>⚠ Allergies:</span> <strong>${p.allergies}</strong></div>` : ''}
          <div style="grid-column:1/-1"><span>Diagnosis:</span> <strong>${diagnosis}</strong></div>
          ${prescription?.notes ? `<div style="grid-column:1/-1"><span>Notes:</span> ${prescription.notes}</div>` : ''}
        </div>
        <table>
          <thead><tr>
            <th>#</th><th>Medication</th><th>Frequency</th><th>Duration</th><th>Qty</th><th>Instructions</th>
          </tr></thead>
          <tbody>${medsRows}</tbody>
        </table>
        <div class="footer">
          <div>Prescribed by: <strong>${doctor?.name || doctor?.full_name || '—'}</strong></div>
          <div class="sig">Pharmacist Signature</div>
        </div>
        <script>window.onload=()=>{window.print();}</script>
      </body></html>`;

    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  };
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dispense Medication</DialogTitle>
          <DialogDescription>
            Review and confirm medication details before dispensing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold mb-3">Patient Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Patient:</span>
                <span className="ml-2 font-medium">{prescription?.patient?.full_name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Age:</span>
                <span className="ml-2 font-medium">
                  {prescription?.patient?.date_of_birth ? 
                    new Date().getFullYear() - new Date(prescription.patient.date_of_birth).getFullYear() : 'N/A'} years
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Gender:</span>
                <span className="ml-2 font-medium">{prescription?.patient?.gender || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Weight:</span>
                <span className="ml-2 font-medium">
                  {prescription?.patient?.weight || 
                   (prescription?.visit?.vital_signs && typeof prescription.visit.vital_signs === 'object' && prescription.visit.vital_signs.weight) || 
                   'Not recorded'} 
                  {(prescription?.patient?.weight || (prescription?.visit?.vital_signs && prescription.visit.vital_signs.weight)) && ' kg'}
                </span>
              </div>
              {prescription?.patient?.allergies && (
                <div className="col-span-2">
                  <span className="text-red-600 font-medium">⚠ Allergies:</span>
                  <span className="ml-2 text-red-600 font-medium">{prescription.patient.allergies}</span>
                </div>
              )}
              {prescription?.patient?.blood_group && (
                <div>
                  <span className="text-muted-foreground">Blood Group:</span>
                  <span className="ml-2 font-medium">{prescription.patient.blood_group}</span>
                </div>
              )}
              <div className="col-span-2">
                <span className="text-muted-foreground">Diagnosis:</span>
                <span className="ml-2 font-medium">{getDiagnosis()}</span>
              </div>
            </div>
          </div>

          {/* Dosing Safety Alerts */}
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Dosing Considerations
            </h4>
            <div className="text-sm space-y-1">
              {prescription?.patient?.date_of_birth && (() => {
                const age = new Date().getFullYear() - new Date(prescription.patient.date_of_birth).getFullYear();
                if (age < 18) {
                  return <div className="text-yellow-700">• <strong>Pediatric patient:</strong> Verify pediatric dosing guidelines</div>;
                } else if (age >= 65) {
                  return <div className="text-yellow-700">• <strong>Elderly patient:</strong> Consider dose reduction and drug interactions</div>;
                }
                return null;
              })()}
              
              {prescription?.patient?.gender === 'Female' && (
                <div className="text-yellow-700">• <strong>Female patient:</strong> Consider pregnancy status for medication safety</div>
              )}
              
              {prescription?.patient?.allergies && (
                <div className="text-red-700">• <strong>Known allergies:</strong> {prescription.patient.allergies}</div>
              )}
              
              {!prescription?.patient?.weight && !prescription?.visit?.vital_signs?.weight && (
                <div className="text-orange-700">• <strong>Weight not recorded:</strong> Consider weight-based dosing if applicable</div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Medications to Dispense (Editable)</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addNewMedication}
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Medication
              </Button>
            </div>
            
            {editableMedications.map((med: any, index: number) => {
              const medicationData = medications.find(m => m.id === med.medication_id);
              const unitPrice = medicationData?.unit_price || 0;
              const itemTotal = unitPrice * (med.dispensed_quantity || 0);
              const stockAvailable = medicationData?.stock_quantity || 0;
              
              return (
                <div key={index + '-' + med.medication_id} className="p-4 border rounded-lg bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">Medication {index + 1}</span>
                    {(editableMedications.length > 1 || med.is_new) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMedication(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs flex items-center gap-1">
                          <Pill className="h-3 w-3" />
                          Medication
                          <span className="text-muted-foreground">(Search by name, strength, or form)</span>
                        </Label>
                        {stockAvailable === 0 && (
                          <span className="text-xs text-red-600 font-medium">Out of Stock!</span>
                        )}
                      </div>
                      <Select
                        value={med.medication_id}
                        onValueChange={(value) => {
                          updateMedication(index, 'medication_id', value);
                          // Clear search term after selection
                          setMedicationSearchTerms(prev => ({ ...prev, [index]: '' }));
                        }}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="🔍 Click to search and select medication..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[400px] w-[600px]">
                          <div className="sticky top-0 bg-white p-3 border-b shadow-sm">
                            <div className="relative">
                              <Input
                                placeholder="🔍 Type medication name, strength, or form..."
                                value={medicationSearchTerms[index] || ''}
                                onChange={(e) => setMedicationSearchTerms(prev => ({ ...prev, [index]: e.target.value }))}
                                onClick={(e) => e.stopPropagation()}
                                className="h-10 pr-10 text-base"
                                autoFocus
                              />
                              {medicationSearchTerms[index] && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMedicationSearchTerms(prev => ({ ...prev, [index]: '' }));
                                  }}
                                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            {medicationSearchTerms[index] && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                {medications.filter(medication => {
                                  const searchTerm = medicationSearchTerms[index]?.toLowerCase() || '';
                                  return (
                                    medication.name.toLowerCase().includes(searchTerm) ||
                                    (medication.generic_name && medication.generic_name.toLowerCase().includes(searchTerm)) ||
                                    (medication.strength && medication.strength.toLowerCase().includes(searchTerm)) ||
                                    (medication.dosage_form && medication.dosage_form.toLowerCase().includes(searchTerm))
                                  );
                                }).length} medications found
                              </div>
                            )}
                          </div>
                          
                          <div className="max-h-[300px] overflow-y-auto">
                            {medications
                              .filter(medication => {
                                const searchTerm = medicationSearchTerms[index]?.toLowerCase() || '';
                                if (!searchTerm) return true;
                                return (
                                  medication.name.toLowerCase().includes(searchTerm) ||
                                  (medication.generic_name && medication.generic_name.toLowerCase().includes(searchTerm)) ||
                                  (medication.strength && medication.strength.toLowerCase().includes(searchTerm)) ||
                                  (medication.dosage_form && medication.dosage_form.toLowerCase().includes(searchTerm))
                                );
                              })
                              .sort((a, b) => {
                                // Sort by stock quantity (in stock first)
                                const stockA = a.stock_quantity || 0;
                                const stockB = b.stock_quantity || 0;
                                if (stockA > 0 && stockB === 0) return -1;
                                if (stockA === 0 && stockB > 0) return 1;
                                return a.name.localeCompare(b.name);
                              })
                              .map((medication) => {
                                const stock = medication.stock_quantity || 0;
                                const isLowStock = stock > 0 && stock <= 10;
                                const isOutOfStock = stock === 0;
                                
                                return (
                                  <SelectItem 
                                    key={medication.id} 
                                    value={medication.id}
                                    disabled={isOutOfStock}
                                    className={`p-3 ${isOutOfStock ? 'opacity-50' : ''}`}
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="font-medium">{medication.name}</span>
                                          {medication.strength && (
                                            <Badge variant="outline" className="text-xs">
                                              {medication.strength}
                                            </Badge>
                                          )}
                                          {isOutOfStock && (
                                            <Badge variant="destructive" className="text-xs">
                                              Out of Stock
                                            </Badge>
                                          )}
                                          {isLowStock && (
                                            <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                                              Low Stock
                                            </Badge>
                                          )}
                                          {stock > 10 && (
                                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                              In Stock
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {medication.generic_name && medication.generic_name !== medication.name && (
                                            <span>Generic: {medication.generic_name} • </span>
                                          )}
                                          {medication.dosage_form && (
                                            <span>Form: {medication.dosage_form} • </span>
                                          )}
                                          <span className={isLowStock ? 'text-orange-600 font-medium' : isOutOfStock ? 'text-red-600 font-medium' : ''}>
                                            Stock: {stock} units
                                          </span>
                                          {medication.unit_price && (
                                            <span> • Price: TSh {medication.unit_price.toLocaleString()}</span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 ml-2">
                                        {stock > 10 && (
                                          <CheckCircle className="h-4 w-4 text-green-500" />
                                        )}
                                        {isLowStock && (
                                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                                        )}
                                        {isOutOfStock && (
                                          <AlertTriangle className="h-4 w-4 text-red-500" />
                                        )}
                                      </div>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            
                            {medications.filter(medication => {
                              const searchTerm = medicationSearchTerms[index]?.toLowerCase() || '';
                              if (!searchTerm) return true;
                              return (
                                medication.name.toLowerCase().includes(searchTerm) ||
                                (medication.generic_name && medication.generic_name.toLowerCase().includes(searchTerm)) ||
                                (medication.strength && medication.strength.toLowerCase().includes(searchTerm)) ||
                                (medication.dosage_form && medication.dosage_form.toLowerCase().includes(searchTerm))
                              );
                            }).length === 0 && medicationSearchTerms[index] && (
                              <div className="p-6 text-center text-sm text-muted-foreground">
                                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="font-medium">No medications found</p>
                                <p>Try searching with different keywords:</p>
                                <ul className="text-xs mt-2 space-y-1">
                                  <li>• Medication name (e.g., "Paracetamol")</li>
                                  <li>• Generic name (e.g., "Acetaminophen")</li>
                                  <li>• Strength (e.g., "500mg")</li>
                                  <li>• Form (e.g., "Tablet")</li>
                                </ul>
                              </div>
                            )}
                            
                            {!medicationSearchTerms[index] && (
                              <div className="p-6 text-center text-sm text-muted-foreground">
                                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="font-medium">Search for medications</p>
                                <p>Type in the search box above to find medications</p>
                                <div className="text-xs mt-2 space-y-1">
                                  <p>💡 <strong>Tips:</strong></p>
                                  <p>• Search by name, generic name, strength, or form</p>
                                  <p>• Medications in stock appear first</p>
                                  <p>• Out of stock items are disabled</p>
                                  <p>• Stock levels and prices are shown</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Dosage</Label>
                        <Input
                          value={med.dispensed_dosage}
                          onChange={(e) => updateMedication(index, 'dispensed_dosage', e.target.value)}
                          placeholder="e.g., 500mg"
                          className="h-9"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          min="0"
                          max={stockAvailable}
                          value={med.dispensed_quantity}
                          onChange={(e) => updateMedication(index, 'dispensed_quantity', parseInt(e.target.value) || 0)}
                          className="h-9"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1">
                          Frequency (times per day)
                          {med.original_frequency && med.frequency !== med.original_frequency && (
                            <span className="text-orange-600 text-xs">• Modified</span>
                          )}
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          max="24"
                          value={med.frequency || ''}
                          onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                          placeholder={med.original_frequency ? `Original: ${med.original_frequency}` : "e.g., 3"}
                          className={`h-9 ${med.original_frequency && med.frequency !== med.original_frequency ? 'border-orange-400' : ''}`}
                        />
                        {med.original_frequency && (
                          <div className="text-xs text-muted-foreground">
                            Doctor prescribed: {med.original_frequency} times/day
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1">
                          Duration (days)
                          {med.original_duration && med.duration !== med.original_duration && (
                            <span className="text-orange-600 text-xs">• Modified</span>
                          )}
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          max="365"
                          value={med.duration || ''}
                          onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                          placeholder={med.original_duration ? `Original: ${med.original_duration}` : "e.g., 7"}
                          className={`h-9 ${med.original_duration && med.duration !== med.original_duration ? 'border-orange-400' : ''}`}
                        />
                        {med.original_duration && (
                          <div className="text-xs text-muted-foreground">
                            Doctor prescribed: {med.original_duration} days
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1 mt-3">
                      <Label className="text-xs">Instructions</Label>
                      <Input
                        value={med.instructions || ''}
                        onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                        placeholder="e.g., Take after meals"
                        className="h-9"
                      />
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t">
                      <div className="text-xs text-muted-foreground">
                        {med.frequency ? `${med.frequency} times/day` : 'Set frequency'} • {med.duration ? `${med.duration} days` : 'Set duration'}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-green-700">TSh {itemTotal.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">
                          {med.dispensed_quantity} × TSh {unitPrice.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Cost:</span>
              <span className="text-2xl font-bold text-green-700">
                TSh {totalCost.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {editableMedications.length} medication(s) • Total items: {editableMedications.reduce((sum, m) => sum + (m.dispensed_quantity || 0), 0)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Pharmacist Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes or warnings for the patient"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handlePrint} type="button">
              <Printer className="h-4 w-4 mr-2" />
              Print Prescription
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Processing...' : 'Dispense All (TSh ' + totalCost.toLocaleString() + ')'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}