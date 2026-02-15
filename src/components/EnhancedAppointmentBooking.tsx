import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Calendar as CalendarIcon } from 'lucide-react';

interface EnhancedAppointmentBookingProps {
  patients: any[];
  onSuccess: () => void;
}

const EnhancedAppointmentBooking = ({ patients, onSuccess }: EnhancedAppointmentBookingProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<any[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');

  useEffect(() => {
    if (dialogOpen) {
      fetchDepartments();
      fetchDoctors();
    }
  }, [dialogOpen]);

  useEffect(() => {
    if (selectedDepartment) {
      // Filter doctors by selected department
      const filtered = doctors.filter(doctor => doctor.department_id === selectedDepartment);
      setFilteredDoctors(filtered);
    } else {
      setFilteredDoctors(doctors);
    }
  }, [selectedDepartment, doctors]);

  const fetchDepartments = async () => {
    try {
      const { data } = await api.get('/departments');
      setDepartments(data.departments || []);
    } catch (error) {

      setDepartments([]);
    }
  };

  const fetchDoctors = async () => {
    try {
      // Fetch users with doctor role via MySQL API
      const { data } = await api.get('/users', { params: { role: 'doctor' } });
      const doctorList = data.users || [];
      setDoctors(doctorList);
      setFilteredDoctors(doctorList);
    } catch (error) {

      setDoctors([]);
      setFilteredDoctors([]);
    }
  };

  const handleBookAppointment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const appointmentData = {
      patient_id: formData.get('patientId') as string,
      doctor_id: formData.get('doctorId') as string,
      appointment_date: formData.get('appointmentDate') as string,
      appointment_time: formData.get('appointmentTime') as string,
      appointment_type: 'Consultation',
      reason: formData.get('reason') as string,
      notes: formData.get('notes') as string,
    };

    try {
      // Create appointment via MySQL API
      await api.post('/appointments', appointmentData);
      toast.success('Appointment booked successfully');
      setDialogOpen(false);
      onSuccess();
    } catch (error: any) {

      toast.error(error.response?.data?.error || 'Failed to book appointment');
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button>
          <CalendarIcon className="mr-2 h-4 w-4" />
          Book Appointment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Book New Appointment</DialogTitle>
          <DialogDescription>Schedule an appointment for a patient</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleBookAppointment} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="patientId">Patient</Label>
            <Select name="patientId" required>
              <SelectTrigger>
                <SelectValue placeholder="Select patient" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="departmentId">Department</Label>
            <Select
              name="departmentId"
              onValueChange={(value) => setSelectedDepartment(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="doctorId">Doctor</Label>
            <Select name="doctorId" required>
              <SelectTrigger>
                <SelectValue placeholder="Select doctor" />
              </SelectTrigger>
              <SelectContent>
                {filteredDoctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {doctor.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="appointmentDate">Appointment Date</Label>
              <Input
                id="appointmentDate"
                name="appointmentDate"
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="appointmentTime">Appointment Time</Label>
              <Input
                id="appointmentTime"
                name="appointmentTime"
                type="time"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Visit</Label>
            <Textarea
              id="reason"
              name="reason"
              placeholder="Describe the reason for the appointment"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Any special instructions or notes"
            />
          </div>

          <Button type="submit" className="w-full">Book Appointment</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default EnhancedAppointmentBooking;;
