import React, { useState } from 'react';
import { useOptimizedData } from '@/hooks/useOptimizedData';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppointmentListSkeleton, StatsCardSkeleton } from '@/components/skeletons/AppointmentListSkeleton';
import { Users, Clock, CheckCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import api from '@/lib/api';

/**
 * Optimized Doctor Dashboard
 * 
 * Features:
 * - Paginated data loading
 * - Skeleton loaders
 * - Backend caching (30s)
 * - Optional polling (60s)
 * - WebSocket real-time updates
 * - Proper cleanup
 * - No page refreshes
 */
export function OptimizedDoctorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    pending: 0
  });

  // Fetch appointments with pagination and caching
  const {
    data: appointments,
    pagination: appointmentsPagination,
    loading: appointmentsLoading,
    refresh: refreshAppointments,
    loadMore: loadMoreAppointments,
    hasMore: hasMoreAppointments,
    isLoadingMore: isLoadingMoreAppointments
  } = useOptimizedData({
    endpoint: '/appointments',
    params: {
      doctor_id: user?.id,
      status: 'Scheduled'
    },
    enabled: !!user?.id,
    pollInterval: 60000, // Poll every 60 seconds
    onSuccess: (data) => {

    }
  });

  // Fetch patient visits (doctor queue)
  const {
    data: visits,
    pagination: visitsPagination,
    loading: visitsLoading,
    refresh: refreshVisits,
    loadMore: loadMoreVisits,
    hasMore: hasMoreVisits,
    isLoadingMore: isLoadingMoreVisits
  } = useOptimizedData({
    endpoint: '/visits',
    params: {
      current_stage: 'doctor',
      doctor_status: 'Pending',
      overall_status: 'Active'
    },
    enabled: !!user?.id,
    pollInterval: 30000, // Poll every 30 seconds (more frequent for queue)
  });

  // Fetch stats (heavily cached on backend)
  React.useEffect(() => {
    if (!user?.id) return;

    const fetchStats = async () => {
      try {
        const response = await api.get('/appointments/counts', {
          params: { doctor_id: user.id }
        });
        setStats({
          total: response.data.total || 0,
          today: response.data.today || 0,
          pending: response.data.today_scheduled || 0
        });
      } catch (error) {

      }
    };

    fetchStats();
    
    // Refresh stats every 60 seconds
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // WebSocket real-time updates
  useWebSocket({
    channel: 'doctor-queue',
    event: 'visit.updated',
    enabled: !!user?.id,
    onMessage: (data) => {

      // Refresh visits if it affects doctor queue
      if (data.current_stage === 'doctor') {
        refreshVisits();
      }
    }
  });

  useWebSocket({
    channel: `doctor-${user?.id}`,
    event: 'appointment.updated',
    enabled: !!user?.id,
    onMessage: (data) => {

      refreshAppointments();
    }
  });

  // Handle complete consultation
  const handleCompleteConsultation = async (visitId: string) => {
    try {
      await api.put(`/visits/${visitId}`, {
        doctor_status: 'Completed',
        doctor_completed_at: new Date().toISOString(),
        current_stage: 'completed',
        overall_status: 'Completed'
      });

      // Remove from local state immediately
      refreshVisits();
      
      toast.success('Consultation completed');
    } catch (error) {

      toast.error('Failed to complete consultation');
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {appointmentsLoading && !stats.total ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.today}</div>
                <p className="text-xs text-muted-foreground">{stats.pending} pending</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Patients Waiting</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{visits.length}</div>
                <p className="text-xs text-muted-foreground">In queue</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Patient Queue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Patients Waiting for Consultation</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {visitsPagination?.total || 0} patients in queue
              </p>
            </div>
            <Button
              onClick={refreshVisits}
              variant="outline"
              size="sm"
              disabled={visitsLoading}
            >
              <RefreshCw className={`h-4 w-4 ${visitsLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {visitsLoading && visits.length === 0 ? (
            <AppointmentListSkeleton count={3} />
          ) : visits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No patients waiting
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {visits.map((visit: any) => (
                  <div
                    key={visit.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{visit.patient?.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Checked in: {format(new Date(visit.created_at), 'HH:mm')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{visit.doctor_status}</Badge>
                      <Button
                        onClick={() => handleCompleteConsultation(visit.id)}
                        size="sm"
                      >
                        Start Consultation
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More Button */}
              {hasMoreVisits && (
                <div className="mt-4 text-center">
                  <Button
                    onClick={loadMoreVisits}
                    variant="outline"
                    disabled={isLoadingMoreVisits}
                  >
                    {isLoadingMoreVisits ? 'Loading...' : 'Load More'}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Appointments List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Scheduled Appointments</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {appointmentsPagination?.total || 0} total appointments
              </p>
            </div>
            <Button
              onClick={refreshAppointments}
              variant="outline"
              size="sm"
              disabled={appointmentsLoading}
            >
              <RefreshCw className={`h-4 w-4 ${appointmentsLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {appointmentsLoading && appointments.length === 0 ? (
            <AppointmentListSkeleton count={5} />
          ) : appointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No scheduled appointments
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {appointments.map((appointment: any) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{appointment.patient?.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(appointment.appointment_date), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                    <Badge>{appointment.status}</Badge>
                  </div>
                ))}
              </div>

              {/* Load More Button */}
              {hasMoreAppointments && (
                <div className="mt-4 text-center">
                  <Button
                    onClick={loadMoreAppointments}
                    variant="outline"
                    disabled={isLoadingMoreAppointments}
                  >
                    {isLoadingMoreAppointments ? 'Loading...' : 'Load More'}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
