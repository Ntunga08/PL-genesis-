import React from 'react';
import { useDataPolling } from '@/hooks/useDataPolling';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Appointment {
  id: string;
  patient_name: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  department: string;
}

/**
 * Example component showing how to use polling for appointments
 * Updates automatically every 30 seconds without page reload
 */
export function AppointmentsPollingExample() {
  // Use the polling hook - data updates automatically
  const {
    data: appointments,
    loading,
    error,
    lastUpdated,
    refresh
  } = useDataPolling<Appointment[]>({
    endpoint: '/appointments?status=Scheduled',
    interval: 30000, // Poll every 30 seconds
    enabled: true, // Enable polling
    showErrorToast: false, // Don't show toast on error
    transform: (response) => response.appointments || [], // Transform response
    onSuccess: (data) => {

    }
  });

  // Handle manual refresh
  const handleRefresh = () => {
    refresh();
  };

  if (loading && !appointments) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <p className="text-red-600 mb-4">Error loading appointments</p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Scheduled Appointments</CardTitle>
            <CardDescription>
              Auto-updates every 30 seconds
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Updated {format(lastUpdated, 'HH:mm:ss')}</span>
              </div>
            )}
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {appointments && appointments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No scheduled appointments
          </div>
        ) : (
          <div className="space-y-3">
            {appointments?.map((appointment) => (
              <div
                key={appointment.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="font-medium">{appointment.patient_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {appointment.appointment_time} • {appointment.department}
                  </p>
                </div>
                <Badge variant="secondary">{appointment.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
