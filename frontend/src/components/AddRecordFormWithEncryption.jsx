import { useState } from 'react';
import { getEncryptionKey, encryptData } from '../utils/encryption';
import { uploadToPinata } from '../utils/ipfs';

const RECORD_TYPES = {
  consultation: { value: 'consultation', label: 'Consultation', icon: '🩺', color: 'blue' },
  'lab-test': { value: 'lab-test', label: 'Lab Test', icon: '🧪', color: 'purple' },
  imaging: { value: 'imaging', label: 'Imaging/Scan', icon: '📷', color: 'cyan' },
  prescription: { value: 'prescription', label: 'Prescription', icon: '💊', color: 'green' },
  procedure: { value: 'procedure', label: 'Procedure', icon: '⚕️', color: 'red' },
  vitals: { value: 'vitals', label: 'Vital Signs', icon: '❤️', color: 'pink' },
  vaccination: { value: 'vaccination', label: 'Vaccination', icon: '💉', color: 'yellow' },
  discharge: { value: 'discharge', label: 'Discharge Summary', icon: '📋', color: 'slate' }
};

export default function AddRecordFormWithEncryption({ contract, patientAddress, signer, onSuccess }) {
  const [recordType, setRecordType] = useState('consultation');
  const [formData, setFormData] = useState({
    // Common fields
    chiefComplaint: '',
    diagnosis: '',
    notes: '',
    
    // Consultation specific
    symptoms: '',
    examination: '',
    treatment: '',
    followUp: '',
    
    // Lab Test specific
    testName: '',
    testResults: '',
    referenceRange: '',
    
    // Imaging specific
    imagingType: '',
    findings: '',
    impression: '',
    
    // Prescription specific
    medications: [{ name: '', dosage: '', frequency: '', duration: '' }],
    
    // Procedure specific
    procedureName: '',
    procedureDetails: '',
    complications: '',
    
    // Vitals specific
    bloodPressure: '',
    heartRate: '',
    temperature: '',
    oxygenSaturation: '',
    weight: '',
    height: '',
    
    // Vaccination specific
    vaccineName: '',
    batchNumber: '',
    site: '',
    nextDose: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [attachments, setAttachments] = useState([]);

  const addMedication = () => {
    setFormData({
      ...formData,
      medications: [...formData.medications, { name: '', dosage: '', frequency: '', duration: '' }]
    });
  };

  const removeMedication = (index) => {
    setFormData({
      ...formData,
      medications: formData.medications.filter((_, i) => i !== index)
    });
  };

  const updateMedication = (index, field, value) => {
    const updated = [...formData.medications];
    updated[index][field] = value;
    setFormData({ ...formData, medications: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!contract || !patientAddress || !signer) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Get encryption key using PATIENT's address
      const encryptionKey = await getEncryptionKey(signer, patientAddress);
      
      // Upload attachments to IPFS first
      let attachmentHashes = [];
      if (attachments.length > 0) {
        for (const file of attachments) {
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_PINATA_JWT}`
            },
            body: formData
          });

          const result = await response.json();
          attachmentHashes.push({
            name: file.name,
            hash: result.IpfsHash,
            type: file.type
          });
        }
      }
      
      // Build record data based on type
      let recordData = {
        recordType,
        timestamp: new Date().toISOString(),
        chiefComplaint: formData.chiefComplaint,
        diagnosis: formData.diagnosis,
        notes: formData.notes,
        attachments: attachmentHashes
      };

      // Add type-specific fields
      switch (recordType) {
        case 'consultation':
          recordData = {
            ...recordData,
            symptoms: formData.symptoms,
            examination: formData.examination,
            treatment: formData.treatment,
            followUp: formData.followUp
          };
          break;
        case 'lab-test':
          recordData = {
            ...recordData,
            testName: formData.testName,
            testResults: formData.testResults,
            referenceRange: formData.referenceRange
          };
          break;
        case 'imaging':
          recordData = {
            ...recordData,
            imagingType: formData.imagingType,
            findings: formData.findings,
            impression: formData.impression
          };
          break;
        case 'prescription':
          recordData = {
            ...recordData,
            medications: formData.medications.filter(m => m.name && m.dosage)
          };
          break;
        case 'procedure':
          recordData = {
            ...recordData,
            procedureName: formData.procedureName,
            procedureDetails: formData.procedureDetails,
            complications: formData.complications
          };
          break;
        case 'vitals':
          recordData = {
            ...recordData,
            bloodPressure: formData.bloodPressure,
            heartRate: formData.heartRate,
            temperature: formData.temperature,
            oxygenSaturation: formData.oxygenSaturation,
            weight: formData.weight,
            height: formData.height
          };
          break;
        case 'vaccination':
          recordData = {
            ...recordData,
            vaccineName: formData.vaccineName,
            batchNumber: formData.batchNumber,
            site: formData.site,
            nextDose: formData.nextDose
          };
          break;
        case 'discharge':
          recordData = {
            ...recordData,
            admissionDate: formData.admissionDate,
            dischargeDate: formData.dischargeDate,
            finalDiagnosis: formData.finalDiagnosis,
            treatmentSummary: formData.treatmentSummary,
            medications: formData.medications.filter(m => m.name && m.dosage),
            followUpInstructions: formData.followUpInstructions
          };
          break;
      }
      
      // Encrypt the record data
      const encryptedData = encryptData(recordData, encryptionKey);
      
      // Upload to IPFS
      const ipfsHash = await uploadToPinata(encryptedData, {
        name: `${RECORD_TYPES[recordType].label} - ${new Date().toISOString()}`,
        type: recordType
      });
      
      // Store hash on blockchain
      const tx = await contract.addRecord(
        patientAddress,
        ipfsHash,
        'form'
      );
      await tx.wait();
      
      setSuccess(`✅ ${RECORD_TYPES[recordType].label} recorded successfully!`);
      
      // Reset form
      setFormData({
        chiefComplaint: '', diagnosis: '', notes: '', symptoms: '', examination: '',
        treatment: '', followUp: '', testName: '', testResults: '', referenceRange: '',
        imagingType: '', findings: '', impression: '', medications: [{ name: '', dosage: '', frequency: '', duration: '' }],
        procedureName: '', procedureDetails: '', complications: '', bloodPressure: '',
        heartRate: '', temperature: '', oxygenSaturation: '', weight: '', height: '',
        vaccineName: '', batchNumber: '', site: '', nextDose: ''
      });
      setAttachments([]);
      
      onSuccess?.();
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Failed to add record');
    } finally {
      setLoading(false);
    }
  };

  const renderFormFields = () => {
    return (
      <div className="space-y-4">
        {/* Record Type Selector */}
        <div className="grid grid-cols-4 gap-2">
          {Object.values(RECORD_TYPES).map(type => (
            <button
              key={type.value}
              type="button"
              onClick={() => setRecordType(type.value)}
              className={`p-3 rounded-lg border-2 transition-all text-center ${
                recordType === type.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-2xl block mb-1">{type.icon}</span>
              <span className="text-xs font-medium text-slate-700">{type.label}</span>
            </button>
          ))}
        </div>

        {/* Common Fields */}
        <div className="pt-4 border-t border-slate-200">
          <p className="text-xs font-bold text-slate-700 uppercase mb-3">Basic Information</p>
          
          <input
            type="text"
            value={formData.chiefComplaint}
            onChange={(e) => setFormData({...formData, chiefComplaint: e.target.value})}
            placeholder="Chief Complaint / Reason for Visit"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mb-3"
            required
          />

          <input
            type="text"
            value={formData.diagnosis}
            onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
            placeholder="Diagnosis / Assessment"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mb-3"
            required
          />
        </div>

        {/* Type-Specific Fields */}
        <div className="pt-4 border-t border-slate-200">
          <p className="text-xs font-bold text-slate-700 uppercase mb-3">{RECORD_TYPES[recordType].label} Details</p>
          
          {recordType === 'consultation' && (
            <>
              <textarea
                value={formData.symptoms}
                onChange={(e) => setFormData({...formData, symptoms: e.target.value})}
                placeholder="Symptoms & History"
                rows="2"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mb-3 resize-none"
              />
              <textarea
                value={formData.examination}
                onChange={(e) => setFormData({...formData, examination: e.target.value})}
                placeholder="Physical Examination Findings"
                rows="2"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mb-3 resize-none"
              />
              <textarea
                value={formData.treatment}
                onChange={(e) => setFormData({...formData, treatment: e.target.value})}
                placeholder="Treatment Plan"
                rows="2"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mb-3 resize-none"
              />
              <input
                type="text"
                value={formData.followUp}
                onChange={(e) => setFormData({...formData, followUp: e.target.value})}
                placeholder="Follow-up Instructions"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </>
          )}

          {recordType === 'lab-test' && (
            <>
              <input
                type="text"
                value={formData.testName}
                onChange={(e) => setFormData({...formData, testName: e.target.value})}
                placeholder="Test Name (e.g., Complete Blood Count)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mb-3"
                required
              />
              <textarea
                value={formData.testResults}
                onChange={(e) => setFormData({...formData, testResults: e.target.value})}
                placeholder="Test Results"
                rows="3"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mb-3 resize-none"
                required
              />
              <input
                type="text"
                value={formData.referenceRange}
                onChange={(e) => setFormData({...formData, referenceRange: e.target.value})}
                placeholder="Reference Range / Normal Values"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mb-3"
              />
              
              {/* Image Upload for Lab Results */}
              <div className="bg-purple-50 border-2 border-dashed border-purple-300 rounded-lg p-4">
                <p className="text-xs font-semibold text-purple-900 mb-2">📎 Attach Lab Report Images</p>
                <input
                  type="file"
                  onChange={(e) => setAttachments(Array.from(e.target.files))}
                  accept="image/*,.pdf"
                  multiple
                  className="w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200"
                />
                {attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {attachments.map((file, idx) => (
                      <div key={idx} className="text-xs text-purple-700 flex items-center gap-2">
                        <span>📄</span>
                        <span>{file.name}</span>
                        <span className="text-purple-500">({(file.size / 1024).toFixed(1)} KB)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {recordType === 'imaging' && (
            <>
              <input
                type="text"
                value={formData.imagingType}
                onChange={(e) => setFormData({...formData, imagingType: e.target.value})}
                placeholder="Imaging Type (e.g., X-Ray Chest, CT Scan, MRI)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mb-3"
                required
              />
              <textarea
                value={formData.findings}
                onChange={(e) => setFormData({...formData, findings: e.target.value})}
                placeholder="Findings / Observations"
                rows="3"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mb-3 resize-none"
                required
              />
              <textarea
                value={formData.impression}
                onChange={(e) => setFormData({...formData, impression: e.target.value})}
                placeholder="Impression / Conclusion"
                rows="2"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mb-3 resize-none"
              />
              
              {/* Image Upload for Scans */}
              <div className="bg-cyan-50 border-2 border-dashed border-cyan-300 rounded-lg p-4">
                <p className="text-xs font-semibold text-cyan-900 mb-2">📎 Attach Scan Images</p>
                <input
                  type="file"
                  onChange={(e) => setAttachments(Array.from(e.target.files))}
                  accept="image/*,.pdf,.dcm"
                  multiple
                  className="w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-100 file:text-cyan-700 hover:file:bg-cyan-200"
                />
                {attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {attachments.map((file, idx) => (
                      <div key={idx} className="text-xs text-cyan-700 flex items-center gap-2">
                        <span>🖼️</span>
                        <span>{file.name}</span>
                        <span className="text-cyan-500">({(file.size / 1024).toFixed(1)} KB)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {recordType === 'prescription' && (
            <div className="space-y-3">
              {formData.medications.map((med, index) => (
                <div key={index} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input
                      type="text"
                      value={med.name}
                      onChange={(e) => updateMedication(index, 'name', e.target.value)}
                      placeholder="Medication Name"
                      className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      required
                    />
                    <input
                      type="text"
                      value={med.dosage}
                      onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                      placeholder="Dosage (e.g., 500mg)"
                      className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={med.frequency}
                      onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                      placeholder="Frequency (e.g., Twice daily)"
                      className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={med.duration}
                        onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                        placeholder="Duration (e.g., 7 days)"
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      {formData.medications.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMedication(index)}
                          className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-sm"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addMedication}
                className="w-full px-4 py-2 border-2 border-dashed border-slate-300 text-slate-600 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors text-sm font-medium"
              >
                + Add Another Medication
              </button>
            </div>
          )}

          {recordType === 'procedure' && (
            <>
              <input
                type="text"
                value={formData.procedureName}
                onChange={(e) => setFormData({...formData, procedureName: e.target.value})}
                placeholder="Procedure Name"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mb-3"
                required
              />
              <textarea
                value={formData.procedureDetails}
                onChange={(e) => setFormData({...formData, procedureDetails: e.target.value})}
                placeholder="Procedure Details & Technique"
                rows="3"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mb-3 resize-none"
                required
              />
              <textarea
                value={formData.complications}
                onChange={(e) => setFormData({...formData, complications: e.target.value})}
                placeholder="Complications / Post-procedure Notes"
                rows="2"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              />
            </>
          )}

          {recordType === 'vitals' && (
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={formData.bloodPressure}
                onChange={(e) => setFormData({...formData, bloodPressure: e.target.value})}
                placeholder="Blood Pressure (e.g., 120/80)"
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <input
                type="text"
                value={formData.heartRate}
                onChange={(e) => setFormData({...formData, heartRate: e.target.value})}
                placeholder="Heart Rate (bpm)"
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <input
                type="text"
                value={formData.temperature}
                onChange={(e) => setFormData({...formData, temperature: e.target.value})}
                placeholder="Temperature (°C/°F)"
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <input
                type="text"
                value={formData.oxygenSaturation}
                onChange={(e) => setFormData({...formData, oxygenSaturation: e.target.value})}
                placeholder="O2 Saturation (%)"
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <input
                type="text"
                value={formData.weight}
                onChange={(e) => setFormData({...formData, weight: e.target.value})}
                placeholder="Weight (kg/lbs)"
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <input
                type="text"
                value={formData.height}
                onChange={(e) => setFormData({...formData, height: e.target.value})}
                placeholder="Height (cm/ft)"
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          )}

          {recordType === 'vaccination' && (
            <>
              <input
                type="text"
                value={formData.vaccineName}
                onChange={(e) => setFormData({...formData, vaccineName: e.target.value})}
                placeholder="Vaccine Name"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mb-3"
                required
              />
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input
                  type="text"
                  value={formData.batchNumber}
                  onChange={(e) => setFormData({...formData, batchNumber: e.target.value})}
                  placeholder="Batch/Lot Number"
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <input
                  type="text"
                  value={formData.site}
                  onChange={(e) => setFormData({...formData, site: e.target.value})}
                  placeholder="Injection Site"
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <input
                type="text"
                value={formData.nextDose}
                onChange={(e) => setFormData({...formData, nextDose: e.target.value})}
                placeholder="Next Dose Date (if applicable)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </>
          )}
        </div>

        {/* Notes */}
        <div className="pt-4 border-t border-slate-200">
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            placeholder="Additional Notes / Comments"
            rows="2"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow border border-slate-200">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {renderFormFields()}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-semibold"
        >
          {loading ? 'Processing...' : `🔒 Encrypt & Save ${RECORD_TYPES[recordType].label}`}
        </button>
      </form>

      {error && (
        <div className="mx-6 mb-6 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="mx-6 mb-6 p-3 bg-green-50 border border-green-200 rounded text-xs text-green-600">
          {success}
        </div>
      )}
    </div>
  );
}
