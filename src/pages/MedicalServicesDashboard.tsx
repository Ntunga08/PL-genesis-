import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { logActivity } from '@/lib/utils';
import { Plus, Stethoscope, DollarSign, Loader2, Trash2, Pencil, Check, X } from 'lucide-react';
import { 
  createMedicalService, 
  getMedicalServices, 
  updateMedicalService, 
  deleteMedicalService,
  toggleServiceStatus,
  bulkImportServices,
  type MedicalService 
} from '@/services/medicalService';

const SERVICE_TYPES = [
  'Consultation',
  'Laboratory',
  'Procedure',
  'Test',
  'Therapy',
  'Surgery',
  'Other'
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'KES', 'UGX', 'TZS'];

interface PatientService {
  id: string;
  patient_id: string;
  service_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  service_date: string;
  status: string;
  service?: MedicalService;
}

export default function MedicalServicesDashboard() {
  const { user, hasRole } = useAuth();
  const [services, setServices] = useState<MedicalService[]>([]);
  const [patientServices, setPatientServices] = useState<PatientService[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const [newService, setNewService] = useState({
    service_code: '',
    service_name: '',
    service_type: '',
    description: '',
    base_price: 0,
    currency: 'TSh'
  });

  const [editingService, setEditingService] = useState<MedicalService | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const serviceTypes = [
    'Consultation',
    'Laboratory',
    'Procedure',
    'Surgery',
    'Emergency',
    'Ward Stay',
    'Other'
  ];

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return [];
    const header = lines[0].split(',').map(h => h.trim());
    const required = ['service_code','service_name','service_type','base_price'];
    for (const r of required) {
      if (!header.includes(r)) {
        throw new Error(`Missing required column: ${r}`);
      }
    }
    const idx = (name: string) => header.indexOf(name);
    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length === 1 && cols[0].trim() === '') continue;
      const row = {
        service_code: cols[idx('service_code')]?.trim() || '',
        service_name: cols[idx('service_name')]?.trim() || '',
        service_type: cols[idx('service_type')]?.trim() || '',
        description: header.includes('description') ? (cols[idx('description')]?.trim() || '') : '',
        base_price: parseFloat(cols[idx('base_price')] || '0') || 0,
        currency: header.includes('currency') ? (cols[idx('currency')]?.trim() || 'TSh') : 'TSh',
        is_active: header.includes('is_active') ? ((cols[idx('is_active')]?.trim().toLowerCase() === 'true')) : true,
      };
      if (row.service_code && row.service_name && row.service_type && row.base_price > 0) {
        rows.push(row);
      }
    }
    return rows;
  };



  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    setLoading(true);
    try {

      const { data: servicesData, error: servicesError } = await getMedicalServices();
      
      if (servicesError) {

        toast.error('Failed to load medical services. Check console for details.');
      } else {


        setServices(servicesData || []);
        
        // Always show a message about loaded services
        const count = servicesData?.length || 0;

        if (count > 0) {
          toast.success(`Loaded ${count} medical services`);
        } else {
          toast.info('No medical services found');
        }
      }
      
      // Patient services and patients would be fetched from their respective endpoints
      setPatientServices([]);
      setPatients([]);
    } catch (error) {

      toast.error('Failed to load medical services data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = async () => {
    if (!newService.service_code || !newService.service_name || !newService.service_type || !newService.base_price) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { data, error } = await createMedicalService({
        ...newService,
        is_active: true
      }, user!.id);
      
      if (error) {

        toast.error('Failed to add medical service');
      } else {
        toast.success('Medical service added successfully');

        setShowAddDialog(false);
        setNewService({
          service_code: '',
          service_name: '',
          service_type: '',
          description: '',
          base_price: 0,
          currency: 'TSh'
        });
        
        // Force refresh with a small delay
        setTimeout(() => {
          fetchData();
        }, 500);
      }
    } catch (error) {

      toast.error('Failed to add medical service');
    }
  };

  const handleEditService = (service: MedicalService) => {
    setEditingService(service);
    setShowEditDialog(true);
  };

  const handleUpdateService = async () => {
    if (!editingService) return;

    if (!editingService.service_code || !editingService.service_name || !editingService.service_type || !editingService.base_price) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await updateMedicalService(editingService.id!, {
        service_code: editingService.service_code,
        service_name: editingService.service_name,
        service_type: editingService.service_type,
        description: editingService.description,
        base_price: editingService.base_price,
        currency: editingService.currency,
        is_active: editingService.is_active
      }, user!.id);

      if (error) {

        toast.error('Failed to update medical service');
      } else {
        toast.success('Medical service updated successfully');
        setShowEditDialog(false);
        setEditingService(null);
        fetchData();
      }
    } catch (error) {

      toast.error('Failed to update medical service');
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await deleteMedicalService(serviceId, user!.id);

      if (error) {

        toast.error('Failed to delete medical service');
      } else {
        toast.success('Medical service deleted successfully');
        fetchData();
      }
    } catch (error) {

      toast.error('Failed to delete medical service');
    }
  };

  // Removed assign-to-patient flow from this page per requirements

  const generateServiceCode = () => {
    const type = newService.service_type;
    const prefix = type === 'Consultation' ? 'CONS' :
                   type === 'Laboratory' ? 'LAB' :
                   type === 'Procedure' ? 'PROC' :
                   type === 'Surgery' ? 'SURG' :
                   type === 'Emergency' ? 'EMER' :
                   type === 'Ward Stay' ? 'WARD' : 'OTHER';
    const code = `${prefix}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    setNewService(prev => ({ ...prev, service_code: code }));
  };

  // Only allow medical staff to access this
  if (!user || !hasRole('doctor') && !hasRole('nurse') && !hasRole('admin')) {
    return (
      <DashboardLayout title="Medical Services">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Stethoscope className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">Only medical staff can access this page.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout title="Medical Services">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Medical Services Management">
      <div className="space-y-6">
        {/* Header with Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Medical Services & Lab Tests</h1>
            <p className="text-muted-foreground">Manage medical services, lab tests, procedures, and their pricing</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add New Service
            </Button>
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>Import CSV</Button>
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-blue-500" />
                Available Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{services.length}</div>
              <p className="text-sm text-muted-foreground">Total services in catalog</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                Avg Service Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                TSh{services.length > 0 
                  ? (services.reduce((sum, s) => sum + (Number(s.base_price) || 0), 0) / services.length).toFixed(0)
                  : '0'}
              </div>
              <p className="text-sm text-muted-foreground">Average price per service</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-5 w-5 text-purple-500" />
                Services Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {patientServices.filter(ps => ps.service_date === new Date().toISOString().split('T')[0]).length}
              </div>
              <p className="text-sm text-muted-foreground">Services provided today</p>
            </CardContent>
          </Card>
        </div>

        {/* Services Table */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Medical Services & Lab Tests Catalog</CardTitle>
            <CardDescription>
              All available medical services, lab tests, procedures, and their pricing. 
              Use the import feature to bulk upload lab tests from CSV.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service Code</TableHead>
                    <TableHead>Service Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="font-mono text-sm">{service.service_code}</TableCell>
                      <TableCell className="font-medium">{service.service_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{service.service_type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {service.description || 'No description'}
                      </TableCell>
                      <TableCell className="font-semibold">
                        TSh{service.base_price.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={service.is_active ? 'default' : 'secondary'}>
                          {service.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditService(service)}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteService(service.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Patient Services */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Recent Patient Services</CardTitle>
            <CardDescription>Services provided to patients recently</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patientServices.slice(0, 10).map((ps) => (
                    <TableRow key={ps.id}>
                      <TableCell className="font-medium">
                        {/* Find patient name - this would need a join in real implementation */}
                        Patient ID: {ps.patient_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>{ps.service?.service_name || 'Unknown Service'}</TableCell>
                      <TableCell>{ps.quantity}</TableCell>
                      <TableCell>TSh{ps.unit_price.toLocaleString()}</TableCell>
                      <TableCell className="font-semibold">TSh{ps.total_price.toLocaleString()}</TableCell>
                      <TableCell>{new Date(ps.service_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={ps.status === 'Completed' ? 'default' : 'secondary'}>
                          {ps.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Add Service Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Medical Service</DialogTitle>
              <DialogDescription>Add a new medical problem, test, or service with pricing</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="service_type">Service Type *</Label>
                  <Select
                    value={newService.service_type}
                    onValueChange={(value) => {
                      setNewService(prev => ({ ...prev, service_type: value }));
                      setTimeout(generateServiceCode, 100);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service_code">Service Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="service_code"
                      value={newService.service_code}
                      onChange={(e) => setNewService(prev => ({ ...prev, service_code: e.target.value }))}
                      placeholder="LAB-001, CONS-001, PROC-001"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={generateServiceCode}>
                      Auto
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="service_name">Service Name *</Label>
                <Input
                  id="service_name"
                  value={newService.service_name}
                  onChange={(e) => setNewService(prev => ({ ...prev, service_name: e.target.value }))}
                  placeholder="General Consultation"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newService.description}
                  onChange={(e) => setNewService(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the service"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="base_price">Base Price (TSh) *</Label>
                <Input
                  id="base_price"
                  type="number"
                  value={newService.base_price}
                  onChange={(e) => setNewService(prev => ({ ...prev, base_price: parseFloat(e.target.value) || 0 }))}
                  placeholder="50000"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddService}>
                  Add Service
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Service Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Medical Service</DialogTitle>
              <DialogDescription>Update service details and pricing</DialogDescription>
            </DialogHeader>
            {editingService && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_service_type">Service Type *</Label>
                    <Select
                      value={editingService.service_type}
                      onValueChange={(value) => {
                        setEditingService(prev => prev ? { ...prev, service_type: value } : null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_service_code">Service Code *</Label>
                    <Input
                      id="edit_service_code"
                      value={editingService.service_code}
                      onChange={(e) => setEditingService(prev => prev ? { ...prev, service_code: e.target.value } : null)}
                      placeholder="LAB-001, CONS-001, PROC-001"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_service_name">Service Name *</Label>
                  <Input
                    id="edit_service_name"
                    value={editingService.service_name}
                    onChange={(e) => setEditingService(prev => prev ? { ...prev, service_name: e.target.value } : null)}
                    placeholder="General Consultation"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_description">Description</Label>
                  <Textarea
                    id="edit_description"
                    value={editingService.description || ''}
                    onChange={(e) => setEditingService(prev => prev ? { ...prev, description: e.target.value } : null)}
                    placeholder="Brief description of the service"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_base_price">Base Price (TSh) *</Label>
                  <Input
                    id="edit_base_price"
                    type="number"
                    value={editingService.base_price}
                    onChange={(e) => setEditingService(prev => prev ? { ...prev, base_price: parseFloat(e.target.value) || 0 } : null)}
                    placeholder="50000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_is_active">Status</Label>
                  <Select
                    value={editingService.is_active ? 'active' : 'inactive'}
                    onValueChange={(value) => {
                      setEditingService(prev => prev ? { ...prev, is_active: value === 'active' } : null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => {
                    setShowEditDialog(false);
                    setEditingService(null);
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateService}>
                    Update Service
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Import Services Dialog */}
        <Dialog open={importDialogOpen} onOpenChange={(open) => {
          setImportDialogOpen(open);
          if (!open) {
            setImportFile(null);
            setImportPreview([]);
            setImportError(null);
          }
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Import Medical Services & Lab Tests (CSV)</DialogTitle>
              <DialogDescription>
                Upload a CSV file to bulk import lab tests and medical services.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* CSV Format Instructions */}
              <div className="border rounded-lg p-4 bg-muted/50 space-y-3">
                <h4 className="font-semibold text-sm">CSV Format Required:</h4>
                <div className="space-y-2 text-sm">
                  <p className="font-mono text-xs bg-background p-2 rounded border">
                    service_code,service_name,service_type,description,base_price,currency
                  </p>
                  <div className="space-y-1 text-muted-foreground">
                    <p><strong>service_code:</strong> Unique code (e.g., LAB001, CONS001)</p>
                    <p><strong>service_name:</strong> Name of service (e.g., MALARIA TEST, X-RAY CHEST)</p>
                    <p><strong>service_type:</strong> Laboratory, Radiology, Consultation, Procedure, Surgery, Emergency, Ward Stay, or Other</p>
                    <p><strong>description:</strong> Brief description (optional)</p>
                    <p><strong>base_price:</strong> Price in numbers (e.g., 5000, 25000)</p>
                    <p><strong>currency:</strong> TSH, USD, etc. (optional, defaults to TSH)</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="font-semibold text-sm">Example rows:</p>
                  <div className="font-mono text-xs bg-background p-2 rounded border space-y-1">
                    <p>LAB001,MALARIA (MRDT),Laboratory,Malaria Rapid Test,5000,TSH</p>
                    <p>LAB002,BLOOD GLUCOSE,Laboratory,Blood Glucose Test,3000,TSH</p>
                    <p>RAD001,X-RAY CHEST,Radiology,Chest X-Ray,25000,TSH</p>
                    <p>CONS001,GENERAL CONSULTATION,Consultation,General Medical Consultation,20000,TSH</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="csvFile">Select CSV File</Label>
                <Input id="csvFile" type="file" accept=".csv" onChange={async (e) => {
                  setImportError(null);
                  const file = e.target.files?.[0] || null;
                  setImportFile(file);
                  setImportPreview([]);
                  if (!file) return;
                  try {
                    const text = await file.text();
                    const rows = parseCSV(text);
                    setImportPreview(rows.slice(0, 10));
                  } catch (err: any) {
                    setImportError(err?.message || 'Failed to read CSV file');
                  }
                }} />
              </div>
              {importError && (
                <div className="text-sm text-red-600">{importError}</div>
              )}
              {importPreview.length > 0 && (
                <div className="border rounded-md overflow-hidden">
                  <div className="px-3 py-2 text-sm font-medium bg-muted">Preview (first 10 rows)</div>
                  <div className="max-h-64 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importPreview.map((row, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-xs">{row.service_code}</TableCell>
                            <TableCell className="text-sm">{row.service_name}</TableCell>
                            <TableCell><Badge variant="outline">{row.service_type}</Badge></TableCell>
                            <TableCell className="font-semibold">TSh{Number(row.base_price || 0).toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant={row.is_active ? 'default' : 'secondary'}>
                                {row.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancel</Button>
                <Button onClick={async () => {
                  if (!importFile) {
                    setImportError('Please choose a CSV file');
                    return;
                  }
                  setImporting(true);
                  setImportError(null);
                  try {
                    const text = await importFile.text();
                    const rows = parseCSV(text);
                    if (rows.length === 0) {
                      setImportError('No valid rows found in CSV');
                      setImporting(false);
                      return;
                    }
                    
                    const { data, error } = await bulkImportServices(rows);
                    
                    if (error) {
                      setImportError('Failed to import services');
                      toast.error('Failed to import services');
                    } else {
                      toast.success(`Successfully imported ${data?.results?.success || 0} services`);
                      if (data?.results?.failed > 0) {
                        toast.warning(`${data.results.failed} services failed to import`);
                      }
                      setImportDialogOpen(false);
                      setImportFile(null);
                      setImportPreview([]);
                      fetchData(); // Refresh the list
                    }
                  } catch (err: any) {

                    setImportError(err?.message || 'Failed to import CSV');
                  } finally {
                    setImporting(false);
                  }
                }} disabled={importing || !importFile}>
                  {importing ? 'Importing…' : 'Import Services'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
