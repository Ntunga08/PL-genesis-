'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Upload, Image as ImageIcon } from 'lucide-react';

export default function SettingsPage() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchLogo();
  }, []);

  const fetchLogo = async () => {
    try {
      const response = await api.get('/settings/logo');
      if (response.data.logo_url) {
        setLogoUrl(response.data.logo_url);
        setPreviewUrl(response.data.logo_url);
      }
    } catch (error) {

    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    // Read file and convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setPreviewUrl(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!previewUrl) {
      toast.error('Please select an image first');
      return;
    }

    setUploading(true);
    try {
      await api.post('/settings/logo', {
        logo: previewUrl
      });
      
      setLogoUrl(previewUrl);
      toast.success('Logo updated successfully!');
      
      // Dispatch custom event to update logo everywhere without page reload
      window.dispatchEvent(new CustomEvent('logoUpdated', { detail: { logoUrl: previewUrl } }));
    } catch (error: any) {

      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout title="Settings">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Hospital Logo
            </CardTitle>
            <CardDescription>
              Upload your hospital logo. It will be displayed throughout the system.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Logo */}
            {logoUrl && (
              <div>
                <Label>Current Logo</Label>
                <div className="mt-2 p-6 border rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                  <div className="relative">
                    <img 
                      src={logoUrl} 
                      alt="Hospital Logo" 
                      className="h-32 w-32 object-cover rounded-full shadow-lg border-4 border-white ring-2 ring-gray-200"
                    />
                    <div className="absolute -bottom-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow">
                      Active
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Preview */}
            {previewUrl && previewUrl !== logoUrl && (
              <div>
                <Label>Preview</Label>
                <div className="mt-2 p-6 border-2 border-dashed border-blue-300 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
                  <div className="relative">
                    <img 
                      src={previewUrl} 
                      alt="Logo Preview" 
                      className="h-32 w-32 object-cover rounded-full shadow-lg border-4 border-white ring-2 ring-blue-300 animate-pulse"
                    />
                    <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full shadow">
                      Preview
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Upload */}
            <div className="space-y-2">
              <Label htmlFor="logo-upload">Upload New Logo</Label>
              <Input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading}
              />
              <p className="text-sm text-muted-foreground">
                Supported formats: JPG, PNG, SVG. Max size: 2MB
              </p>
            </div>

            {/* Upload Button */}
            <Button 
              onClick={handleUpload} 
              disabled={uploading || !previewUrl || previewUrl === logoUrl}
              className="w-full"
            >
              {uploading ? (
                <>Uploading...</>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Logo
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
