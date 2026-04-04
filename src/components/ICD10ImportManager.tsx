import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, Database, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

export function ICD10ImportManager() {
  const [stats, setStats]         = useState<{ total: number; source: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [result, setResult]       = useState<{ imported: number; skipped: number; message: string } | null>(null);
  const [dragOver, setDragOver]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchStats = async () => {
    try {
      const res = await api.get('/icd10/stats');
      setStats(res.data);
    } catch {
      setStats({ total: 0, source: 'builtin' });
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const handleFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls', 'txt', 'pdf'].includes(ext || '')) {
      toast.error('Only CSV, TXT, XLS, XLSX or PDF files are supported.');
      return;
    }

    setUploading(true);
    setProgress(10);
    setResult(null);

    const form = new FormData();
    form.append('file', file);

    try {
      const interval = setInterval(() => {
        setProgress(p => Math.min(p + 8, 85));
      }, 400);

      const res = await api.post('/icd10/import', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });

      clearInterval(interval);
      setProgress(100);
      setResult(res.data);
      toast.success(res.data.message);
      fetchStats();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Import failed. Check the file format.';
      toast.error(msg);
      setProgress(0);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Database className="h-5 w-5 text-blue-600" />
          ICD-10 Code Database
        </CardTitle>
        <CardDescription>
          Import ICD-10 classification codes. Doctors use these when recording diagnoses and submitting insurance claims.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">

        {/* Current status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-center gap-3">
            <Database className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-sm font-medium">Current dataset</p>
              <p className="text-xs text-muted-foreground">
                {stats === null ? 'Loading...' : stats.total === 0 ? 'No codes loaded yet' : `${(stats.total ?? 0).toLocaleString()} codes in database`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {stats && stats.total > 0 && (
              <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                <CheckCircle className="h-3 w-3 mr-1" /> Active
              </Badge>
            )}
            {stats && stats.total === 0 && (
              <Badge variant="outline" className="text-orange-700 border-orange-300 bg-orange-50">
                <AlertCircle className="h-3 w-3 mr-1" /> Using built-in (120 codes)
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={fetchStats}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => !uploading && fileRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}
            ${uploading ? 'pointer-events-none opacity-60' : ''}`}
        >
          <Upload className="h-8 w-8 mx-auto mb-3 text-gray-400" />
          <p className="text-sm font-medium text-gray-700">
            {uploading ? 'Importing...' : 'Drop your file here or click to browse'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            CSV, TXT, XLS, XLSX, PDF — max 20MB
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt,.xlsx,.xls,.pdf"
            className="hidden"
            onChange={onFileChange}
          />
        </div>

        {/* Progress */}
        {uploading && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Importing codes...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Result */}
        {result && !uploading && (
          <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-green-800">{result.message}</p>
              {result.skipped > 0 && (
                <p className="text-green-700 text-xs mt-0.5">{result.skipped} rows skipped (invalid format)</p>
              )}
            </div>
          </div>
        )}

        {/* Paste text fallback */}
        <PasteImport onImported={fetchStats} />

      </CardContent>
    </Card>
  );
}

// ── Paste Import ──────────────────────────────────────────────────────────────

function PasteImport({ onImported }: { onImported: () => void }) {
  const [open, setOpen]       = useState(false);
  const [text, setText]       = useState('');
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    if (!text.trim()) return;
    setLoading(true);

    const blob = new Blob([text], { type: 'text/plain' });
    const file = new File([blob], 'pasted.txt', { type: 'text/plain' });
    const form = new FormData();
    form.append('file', file);

    try {
      const res = await api.post('/icd10/import', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setText('');
      setOpen(false);
      onImported();
      toast.success(res.data.message);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <div className="border-t pt-3">
        <button
          onClick={() => setOpen(true)}
          className="text-xs text-blue-600 hover:underline"
        >
          Paste text directly →
        </button>
      </div>
    );
  }

  return (
    <div className="border-t pt-4 space-y-3">
      <p className="text-xs font-medium text-gray-700">
        Paste ICD-10 codes below — one per line, code then description.
      </p>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={10}
        placeholder={"A00.0 Cholera due to Vibrio cholerae\nA01.0 Typhoid fever\n1. Asthma J45"}
        className="w-full text-xs font-mono border rounded p-2 resize-y focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleImport} disabled={loading || !text.trim()}>
          {loading ? 'Importing...' : 'Import'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => { setOpen(false); setText(''); }}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
