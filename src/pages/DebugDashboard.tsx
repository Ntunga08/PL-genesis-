import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, User, AlertCircle, CheckCircle } from 'lucide-react';

export default function DebugDashboard() {
  const { user, roles, primaryRole, hasRole, refreshRoles } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [assigningRole, setAssigningRole] = useState(false);

  useEffect(() => {
    fetchDebugInfo();
  }, [user]);

  const assignRole = async (role: string) => {
    setAssigningRole(true);
    try {
      await api.post('/users/roles', {
        user_id: user.id,
        role: role
      });

      toast.success(`${role} role assigned successfully!`);
      fetchDebugInfo();
      refreshRoles(); // Refresh the auth context roles
    } catch (error: any) {

      toast.error(`Failed to assign ${role} role: ${error.response?.data?.error || error.message}`);
    } finally {
      setAssigningRole(false);
    }
  };

  const fetchDebugInfo = async () => {
    if (!user) return;

    try {
      // Test database connection and permissions
      const { data: rolesData } = await api.get(`/users/${user.id}/roles`);
      const userRoles = rolesData.roles || [];

      const { data: patientData } = await api.get('/patients?limit=1');
      const testPatient = patientData.patients || [];

      setDebugInfo({
        userRoles: userRoles,
        rolesError: null,
        patientError: null,
        canViewPatients: testPatient.length > 0,
        user: {
          id: user.id,
          email: user.email,
        }
      });
    } catch (error: any) {

      setDebugInfo({ error: error.message });
    }
  };

  const testPatientRegistration = async () => {
    setTesting(true);
    try {
      const testPatient = {
        full_name: `Test Patient ${Date.now()}`,
        date_of_birth: '1990-01-01',
        gender: 'Male',
        phone: '+255700000000',
        email: `test${Date.now()}@example.com`,
        status: 'Active'
      };

      const { data } = await api.post('/patients', testPatient);
      toast.success('Test patient registered successfully!');

      fetchDebugInfo();
    } catch (error: any) {
      toast.error(`Registration failed: ${error.response?.data?.message || error.message}`);

    } finally {
      setTesting(false);
    }
  };

  const testPatientVisitCreation = async () => {
    if (!debugInfo?.userRoles?.length) return;

    setTesting(true);
    try {
      // First create a test patient
      const testPatient = {
        full_name: `Visit Test Patient ${Date.now()}`,
        date_of_birth: '1990-01-01',
        gender: 'Male',
        phone: '+255700000001',
        email: `visittest${Date.now()}@example.com`,
        status: 'Active'
      };

      const { data: patientData } = await api.post('/patients', testPatient);
      const patient = patientData.patient;

      // Now create patient visit
      const visitData = {
        patient_id: patient.id,
        reception_status: 'Checked In',
        reception_completed_at: new Date().toISOString(),
        current_stage: 'nurse',
        nurse_status: 'Pending',
        overall_status: 'Active'
      };

      const { data: visitResponse } = await api.post('/patient-visits', visitData);
      toast.success('Test patient visit created successfully!');

      fetchDebugInfo();
    } catch (error: any) {
      toast.error(`Visit creation error: ${error.response?.data?.message || error.message}`);

    } finally {
      setTesting(false);
    }
  };

  if (!user) {
    return (
      <DashboardLayout title="Debug Dashboard">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">Please log in to access this page.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Debug Dashboard">
      <div className="space-y-6">
        {/* Current User Info */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Current User Information
            </CardTitle>
            <CardDescription>Debug information for the current user session</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-semibold mb-2">Frontend Roles:</h4>
                <div className="flex flex-wrap gap-2">
                  {roles.length > 0 ? (
                    roles.map(role => (
                      <Badge key={role} variant={primaryRole === role ? 'default' : 'secondary'}>
                        {role}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="destructive">No roles found</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Primary Role: {primaryRole || 'None'}
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Database Check:</h4>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">User ID: {user.id.slice(0, 8)}...</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Email: {user.email}</span>
                  </div>
                  {debugInfo?.canViewPatients ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Can view patients</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm">Cannot view patients</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Database Roles */}
            <div>
              <h4 className="font-semibold mb-2">Database Roles:</h4>
              {debugInfo?.userRoles?.length > 0 ? (
                <div className="space-y-2">
                  {debugInfo.userRoles.map((role: any) => (
                    <div key={role.id} className="flex items-center justify-between p-2 border rounded">
                      <Badge variant={role.is_primary ? 'default' : 'outline'}>
                        {role.role}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Created: {new Date(role.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No roles found in database. User may need roles assigned.
                    {debugInfo?.rolesError && (
                      <div className="mt-2 text-red-600">
                        Error: {debugInfo.rolesError}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Role Assignment */}
            <div>
              <h4 className="font-semibold mb-2">Assign Roles:</h4>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => assignRole('admin')}
                  disabled={assigningRole}
                  variant="outline"
                  size="sm"
                >
                  {assigningRole ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Admin
                </Button>
                <Button
                  onClick={() => assignRole('receptionist')}
                  disabled={assigningRole}
                  variant="outline"
                  size="sm"
                >
                  {assigningRole ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Receptionist
                </Button>
                <Button
                  onClick={() => assignRole('doctor')}
                  disabled={assigningRole}
                  variant="outline"
                  size="sm"
                >
                  {assigningRole ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Doctor
                </Button>
                <Button
                  onClick={() => assignRole('nurse')}
                  disabled={assigningRole}
                  variant="outline"
                  size="sm"
                >
                  {assigningRole ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Nurse
                </Button>
                <Button
                  onClick={() => assignRole('pharmacist')}
                  disabled={assigningRole}
                  variant="outline"
                  size="sm"
                >
                  {assigningRole ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Pharmacist
                </Button>
                <Button
                  onClick={() => assignRole('billing')}
                  disabled={assigningRole}
                  variant="outline"
                  size="sm"
                >
                  {assigningRole ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Billing
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                💡 Click any role above to assign it to your account. This will give you the necessary permissions.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Error Information */}
        {debugInfo?.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Debug Error:</strong> {debugInfo.error}
            </AlertDescription>
          </Alert>
        )}

        {/* Role Requirements */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Role Requirements</CardTitle>
            <CardDescription>Required roles for different operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-semibold mb-2">Patient Registration:</h4>
                <ul className="text-sm space-y-1">
                  <li>• Frontend: receptionist role</li>
                  <li>• Database: receptionist or admin</li>
                  <li>• Current: {hasRole('receptionist') ? '✅ Has receptionist role' : '❌ Missing receptionist role'}</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Patient Visit Creation:</h4>
                <ul className="text-sm space-y-1">
                  <li>• Frontend: receptionist role</li>
                  <li>• Database: receptionist or admin</li>
                  <li>• Current: {hasRole('receptionist') ? '✅ Has receptionist role' : '❌ Missing receptionist role'}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
