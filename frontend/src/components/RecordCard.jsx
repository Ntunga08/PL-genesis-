const RECORD_TYPE_CONFIG = {
  'consultation': { icon: '🩺', label: 'Consultation', color: 'blue' },
  'lab-test': { icon: '🧪', label: 'Lab Test', color: 'purple' },
  'imaging': { icon: '📷', label: 'Imaging', color: 'cyan' },
  'prescription': { icon: '💊', label: 'Prescription', color: 'green' },
  'procedure': { icon: '⚕️', label: 'Procedure', color: 'red' },
  'vitals': { icon: '❤️', label: 'Vitals', color: 'pink' },
  'vaccination': { icon: '💉', label: 'Vaccination', color: 'yellow' },
  'discharge': { icon: '📋', label: 'Discharge', color: 'slate' },
  'form': { icon: '📝', label: 'Medical Record', color: 'blue' }
};

export default function RecordCard({ record }) {
  const formatDate = (timestamp) => {
    try {
      if (!timestamp) return 'Unknown date';
      const date = new Date(Number(timestamp) * 1000);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      console.error('Date formatting error:', err);
      return 'Invalid date';
    }
  };

  const hasDecryptedData = record.decryptedData && Object.keys(record.decryptedData).length > 0;
  const isEncrypted = record.recordType === 'form' && !hasDecryptedData && !record.decryptionError;
  const hasDecryptionError = record.decryptionError && record.decryptionError.includes('Decryption failed');
  const isLegacyRecord = hasDecryptionError;

  // Get record type from decrypted data or default to 'form'
  const actualRecordType = record.decryptedData?.recordType || 'form';
  const typeConfig = RECORD_TYPE_CONFIG[actualRecordType] || RECORD_TYPE_CONFIG['form'];

  return (
    <div className="bg-white rounded-lg border border-slate-200 hover:shadow-md transition-all overflow-hidden">
      {/* Header */}
      <div className={`p-4 border-b border-slate-200 bg-${typeConfig.color}-50`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-${typeConfig.color}-100`}>
              <span className="text-xl">{typeConfig.icon}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{typeConfig.label}</p>
              <p className="text-xs text-slate-500">{formatDate(record.timestamp)}</p>
            </div>
          </div>
          
          {record.recordType !== 'form' && record.ipfsHash && (
            <a
              href={`https://gateway.pinata.cloud/ipfs/${record.ipfsHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors flex-shrink-0"
            >
              View File →
            </a>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Metadata */}
        <div className="flex items-center gap-4 text-xs text-slate-600 mb-3 overflow-hidden">
          <div className="flex items-center gap-1 min-w-0">
            <span className="flex-shrink-0">🔗</span>
            <span className="font-mono truncate">
              {record.ipfsHash?.slice(0, 8) || 'N/A'}...{record.ipfsHash?.slice(-6) || ''}
            </span>
          </div>
          <div className="flex items-center gap-1 min-w-0">
            <span className="flex-shrink-0">👨‍⚕️</span>
            <span className="font-mono truncate">
              {record.addedBy?.slice(0, 6) || 'N/A'}...{record.addedBy?.slice(-4) || ''}
            </span>
          </div>
        </div>

        {/* Encrypted State */}
        {isEncrypted && !isLegacyRecord && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
            <span className="text-2xl mb-1 block">🔒</span>
            <p className="text-xs font-semibold text-amber-900">Encrypted Record</p>
            <p className="text-xs text-amber-700 mt-1">Click "Decrypt All" button above to view details</p>
          </div>
        )}

        {/* Legacy Record (V1) - Only show after actual decryption attempt */}
        {isLegacyRecord && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
            <span className="text-2xl mb-1 block">🔐</span>
            <p className="text-xs font-semibold text-orange-900">Decryption Failed</p>
            <p className="text-xs text-orange-700 mt-1">
              This record may be from V1 or encrypted with a different key.
              <br />
              View on <a 
                href={`https://gateway.pinata.cloud/ipfs/${record.ipfsHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-orange-900"
              >IPFS</a>
            </p>
          </div>
        )}

        {/* Decrypted Data */}
        {hasDecryptedData && (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center mb-3">
              <span className="text-xs font-semibold text-green-900">🔓 Decrypted</span>
            </div>

            {/* Common Fields */}
            {record.decryptedData.chiefComplaint && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-700 mb-1">Chief Complaint</p>
                <p className="text-sm text-slate-900 break-words">{record.decryptedData.chiefComplaint}</p>
              </div>
            )}

            {record.decryptedData.diagnosis && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-700 mb-1">Diagnosis</p>
                <p className="text-sm text-slate-900 break-words">{record.decryptedData.diagnosis}</p>
              </div>
            )}

            {/* Consultation Fields */}
            {actualRecordType === 'consultation' && (
              <>
                {record.decryptedData.symptoms && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-blue-900 mb-1">Symptoms & History</p>
                    <p className="text-sm text-blue-900 break-words">{record.decryptedData.symptoms}</p>
                  </div>
                )}
                {record.decryptedData.examination && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-blue-900 mb-1">Examination</p>
                    <p className="text-sm text-blue-900 break-words">{record.decryptedData.examination}</p>
                  </div>
                )}
                {record.decryptedData.treatment && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-blue-900 mb-1">Treatment Plan</p>
                    <p className="text-sm text-blue-900 break-words">{record.decryptedData.treatment}</p>
                  </div>
                )}
                {record.decryptedData.followUp && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-blue-900 mb-1">Follow-up</p>
                    <p className="text-sm text-blue-900 break-words">{record.decryptedData.followUp}</p>
                  </div>
                )}
              </>
            )}

            {/* Lab Test Fields */}
            {actualRecordType === 'lab-test' && (
              <>
                {record.decryptedData.testName && (
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-purple-900 mb-1">Test Name</p>
                    <p className="text-sm text-purple-900 break-words font-semibold">{record.decryptedData.testName}</p>
                  </div>
                )}
                {record.decryptedData.testResults && (
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-purple-900 mb-1">Results</p>
                    <p className="text-sm text-purple-900 break-words">{record.decryptedData.testResults}</p>
                  </div>
                )}
                {record.decryptedData.referenceRange && (
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-purple-900 mb-1">Reference Range</p>
                    <p className="text-sm text-purple-900 break-words">{record.decryptedData.referenceRange}</p>
                  </div>
                )}
                {record.decryptedData.attachments && record.decryptedData.attachments.length > 0 && (
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-purple-900 mb-2">📎 Attached Reports</p>
                    <div className="space-y-2">
                      {record.decryptedData.attachments.map((att, idx) => (
                        <a
                          key={idx}
                          href={`https://gateway.pinata.cloud/ipfs/${att.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 bg-white rounded border border-purple-200 hover:border-purple-400 transition-colors"
                        >
                          <span className="text-lg">📄</span>
                          <span className="text-xs text-purple-900 flex-1">{att.name}</span>
                          <span className="text-xs text-purple-600">View →</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Imaging Fields */}
            {actualRecordType === 'imaging' && (
              <>
                {record.decryptedData.imagingType && (
                  <div className="bg-cyan-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-cyan-900 mb-1">Imaging Type</p>
                    <p className="text-sm text-cyan-900 break-words font-semibold">{record.decryptedData.imagingType}</p>
                  </div>
                )}
                {record.decryptedData.findings && (
                  <div className="bg-cyan-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-cyan-900 mb-1">Findings</p>
                    <p className="text-sm text-cyan-900 break-words">{record.decryptedData.findings}</p>
                  </div>
                )}
                {record.decryptedData.impression && (
                  <div className="bg-cyan-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-cyan-900 mb-1">Impression</p>
                    <p className="text-sm text-cyan-900 break-words">{record.decryptedData.impression}</p>
                  </div>
                )}
                {record.decryptedData.attachments && record.decryptedData.attachments.length > 0 && (
                  <div className="bg-cyan-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-cyan-900 mb-2">📎 Scan Images</p>
                    <div className="grid grid-cols-2 gap-2">
                      {record.decryptedData.attachments.map((att, idx) => (
                        <a
                          key={idx}
                          href={`https://gateway.pinata.cloud/ipfs/${att.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative group"
                        >
                          {att.type?.startsWith('image/') ? (
                            <img
                              src={`https://gateway.pinata.cloud/ipfs/${att.hash}`}
                              alt={att.name}
                              className="w-full h-32 object-cover rounded border-2 border-cyan-200 group-hover:border-cyan-400 transition-colors"
                            />
                          ) : (
                            <div className="w-full h-32 flex flex-col items-center justify-center bg-white rounded border-2 border-cyan-200 group-hover:border-cyan-400 transition-colors">
                              <span className="text-3xl mb-1">📄</span>
                              <span className="text-xs text-cyan-700 px-2 text-center">{att.name}</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded transition-all flex items-center justify-center">
                            <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-semibold">View →</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Prescription Fields */}
            {actualRecordType === 'prescription' && record.decryptedData.medications && (
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-green-900 mb-2">Medications</p>
                <div className="space-y-2">
                  {record.decryptedData.medications.map((med, idx) => (
                    <div key={idx} className="bg-white rounded p-2 border border-green-200">
                      <p className="text-sm font-semibold text-green-900">{med.name}</p>
                      <p className="text-xs text-green-700">
                        {med.dosage} • {med.frequency} • {med.duration}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Procedure Fields */}
            {actualRecordType === 'procedure' && (
              <>
                {record.decryptedData.procedureName && (
                  <div className="bg-red-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-red-900 mb-1">Procedure</p>
                    <p className="text-sm text-red-900 break-words font-semibold">{record.decryptedData.procedureName}</p>
                  </div>
                )}
                {record.decryptedData.procedureDetails && (
                  <div className="bg-red-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-red-900 mb-1">Details</p>
                    <p className="text-sm text-red-900 break-words">{record.decryptedData.procedureDetails}</p>
                  </div>
                )}
                {record.decryptedData.complications && (
                  <div className="bg-red-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-red-900 mb-1">Complications</p>
                    <p className="text-sm text-red-900 break-words">{record.decryptedData.complications}</p>
                  </div>
                )}
              </>
            )}

            {/* Vitals Fields */}
            {actualRecordType === 'vitals' && (
              <div className="bg-pink-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-pink-900 mb-2">Vital Signs</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {record.decryptedData.bloodPressure && (
                    <div><span className="text-pink-700">BP:</span> <span className="font-semibold text-pink-900">{record.decryptedData.bloodPressure}</span></div>
                  )}
                  {record.decryptedData.heartRate && (
                    <div><span className="text-pink-700">HR:</span> <span className="font-semibold text-pink-900">{record.decryptedData.heartRate} bpm</span></div>
                  )}
                  {record.decryptedData.temperature && (
                    <div><span className="text-pink-700">Temp:</span> <span className="font-semibold text-pink-900">{record.decryptedData.temperature}</span></div>
                  )}
                  {record.decryptedData.oxygenSaturation && (
                    <div><span className="text-pink-700">O2:</span> <span className="font-semibold text-pink-900">{record.decryptedData.oxygenSaturation}%</span></div>
                  )}
                  {record.decryptedData.weight && (
                    <div><span className="text-pink-700">Weight:</span> <span className="font-semibold text-pink-900">{record.decryptedData.weight}</span></div>
                  )}
                  {record.decryptedData.height && (
                    <div><span className="text-pink-700">Height:</span> <span className="font-semibold text-pink-900">{record.decryptedData.height}</span></div>
                  )}
                </div>
              </div>
            )}

            {/* Vaccination Fields */}
            {actualRecordType === 'vaccination' && (
              <>
                {record.decryptedData.vaccineName && (
                  <div className="bg-yellow-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-yellow-900 mb-1">Vaccine</p>
                    <p className="text-sm text-yellow-900 break-words font-semibold">{record.decryptedData.vaccineName}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {record.decryptedData.batchNumber && (
                    <div className="bg-yellow-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-yellow-900 mb-1">Batch #</p>
                      <p className="text-sm text-yellow-900 break-words">{record.decryptedData.batchNumber}</p>
                    </div>
                  )}
                  {record.decryptedData.site && (
                    <div className="bg-yellow-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-yellow-900 mb-1">Site</p>
                      <p className="text-sm text-yellow-900 break-words">{record.decryptedData.site}</p>
                    </div>
                  )}
                </div>
                {record.decryptedData.nextDose && (
                  <div className="bg-yellow-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-yellow-900 mb-1">Next Dose</p>
                    <p className="text-sm text-yellow-900 break-words">{record.decryptedData.nextDose}</p>
                  </div>
                )}
              </>
            )}

            {/* Notes */}
            {record.decryptedData.notes && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-700 mb-1">Notes</p>
                <p className="text-sm text-slate-900 break-words">{record.decryptedData.notes}</p>
              </div>
            )}

            {/* Legacy fields for backward compatibility */}
            {record.decryptedData.symptoms && !actualRecordType && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-700 mb-1">Symptoms</p>
                <p className="text-sm text-slate-900 break-words">{record.decryptedData.symptoms}</p>
              </div>
            )}

            {record.decryptedData.treatment && !actualRecordType && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-700 mb-1">Treatment</p>
                <p className="text-sm text-slate-900 break-words">{record.decryptedData.treatment}</p>
              </div>
            )}

            {record.decryptedData.customFields && Object.keys(record.decryptedData.customFields).length > 0 && (
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-blue-900 mb-2">Additional Information</p>
                <div className="space-y-2">
                  {Object.entries(record.decryptedData.customFields).map(([key, value]) => (
                    <div key={key} className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-blue-800">{key}:</span>
                      <span className="text-sm text-blue-900 font-semibold break-words">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
