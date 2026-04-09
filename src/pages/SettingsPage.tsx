'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Upload, Image as ImageIcon, Building2, Phone, Mail, Globe, FileText, Loader2, Save } from 'lucide-react';

const SETTING_KEYS = [
  { key: 'hospital_name',    label: 'Hospital / Facility Name',  icon: Building2, placeholder: 'e.g. Haset Medical Center' },
  { key: 'hospital_address', label: 'Address',                   icon: Building2, placeholder: 'e.g. Mwanza, Tanzania',     textarea: true },
  { key: 'hospital_phone',   label: 'Phone Number',              icon: Phone,     placeholder: 'e.g. +255 28 250 0000' },
  { key: 'hospital_email',   label: 'Email',                     icon: Mail,      placeholder: 'e.g. info@hospital.co.tz' },
  { key: 'hospital_website', label: 'Website',                   icon: Globe,     placeholder: 'e.g. www.hospital.co.tz' },
  { key: 'hospital_license', label: 'License / Registration No', icon: FileText,  placeholder: 'e.g. MSD/2024/001' },
  { key: 'hospital_tagline', label: 'Tagline / Motto',           icon: FileText,  placeholder: 'e.g. Your Health, Our Priority' },
];

export default function SettingsPage() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [settingsRes, logoRes] = await Promise.allSettled([
        api.get('/settings'),
        api.get('/settings/logo'),
      ]);

      if (settingsRes.status === 'fulfilled') {
        const obj: Record<string, string> = {};
        (settingsRes.value.data.settings || []).forEach((s: any) => {
          obj[s.key] = s.value || '';
        });
        setSettings(obj);
      }

      if (logoRes.status === 'fulfilled' && logoRes.value.data.logo_url) {
        setLogoUrl(logoRes.value.data.logo_url);
        setPreviewUrl(logoRes.value.data.logo_url);
      }
    } catch {}
  };

  const handleSaveInfo = async () => {
    setSaving(true);
    try {
      await Promise.all(
        SETTING_KEYS.map(({ key }) =>
          api.put(`/settings/${key}`, { value: settings[key] || '' })
        )
      );
      toast.success('Hospital information saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUploadLogo = async () => {
    if (!previewUrl) { toast.error('Select an image first'); return; }
    setUploading(true);
    try {
      await api.post('/settings/logo', { logo: previewUrl });
      setLogoUrl(previewUrl);
      toast.success('Logo updated');
      window.dispatchEvent(new CustomEvent('logoUpdated', { detail: { logoUrl: previewUrl } }));
    } catch {
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout title="Settings">
      <div className="space-y-6 max-w-2xl">

        {/* Hospital Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Hospital Information
            </CardTitle>
            <CardDescription>
              This information appears on all printed reports, invoices, and documents.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {SETTING_KEYS.map(({ key, label, placeholder, textarea }) => (
              <div key={key} className="space-y-1">
                <Label>{label}</Label>
                {textarea ? (
                  <Textarea
                    placeholder={placeholder}
                    value={settings[key] || ''}
                    onChange={e => setSettings(p => ({ ...p, [key]: e.target.value }))}
                    rows={2}
                  />
                ) : (
                  <Input
                    placeholder={placeholder}
                    value={settings[key] || ''}
                    onChange={e => setSettings(p => ({ ...p, [key]: e.target.value }))}
                  />
                )}
              </div>
            ))}
            <Button onClick={handleSaveInfo} disabled={saving} className="w-full mt-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Information
            </Button>
          </CardContent>
        </Card>

        {/* Logo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Hospital Logo
            </CardTitle>
            <CardDescription>
              Appears on reports and printed documents. Max 2MB, JPG/PNG/SVG.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current / Preview */}
            <div className="flex gap-6 items-center">
              {logoUrl && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Current</p>
                  <img src={logoUrl} alt="Logo" className="h-24 w-24 object-contain rounded-lg border" />
                </div>
              )}
              {previewUrl && previewUrl !== logoUrl && (
                <div className="text-center">
                  <p className="text-xs text-blue-600 mb-1">Preview</p>
                  <img src={previewUrl} alt="Preview" className="h-24 w-24 object-contain rounded-lg border-2 border-blue-300" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo-upload">Upload New Logo</Label>
              <Input id="logo-upload" type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} />
            </div>

            <Button onClick={handleUploadLogo} disabled={uploading || !previewUrl || previewUrl === logoUrl} className="w-full">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload Logo
            </Button>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}
