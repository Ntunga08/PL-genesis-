import api from '@/lib/api';
import { logActivity } from '@/lib/utils';

export interface MedicalService {
  id?: string;
  service_code: string;
  service_name: string;
  service_type: string;
  description?: string;
  base_price: number;
  currency: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Create a new medical service
export const createMedicalService = async (service: Omit<MedicalService, 'id' | 'created_at' | 'updated_at'>, userId: string) => {
  try {
    const response = await api.post('/services', service);
    await logActivity('medical_service.create', { service_name: service.service_name });
    return { data: response.data.service, error: null };
  } catch (error) {

    return { data: null, error };
  }
};

// Get all medical services
export const getMedicalServices = async (filters?: { is_active?: boolean; service_type?: string }) => {
  try {
    const params = new URLSearchParams();
    if (filters?.is_active !== undefined) {
      params.append('is_active', filters.is_active.toString());
    }
    if (filters?.service_type) {
      params.append('service_type', filters.service_type);
    }

    const response = await api.get(`/services?${params.toString()}`);

    return { data: response.data.services || [], error: null };
  } catch (error: any) {


    return { data: [], error };
  }
};

// Get a single medical service by ID
export const getMedicalServiceById = async (id: string) => {
  try {
    const response = await api.get(`/services/${id}`);
    return { data: response.data.service, error: null };
  } catch (error) {

    return { data: null, error };
  }
};

// Update a medical service
export const updateMedicalService = async (id: string, updates: Partial<MedicalService>, userId: string) => {
  try {
    const response = await api.put(`/services/${id}`, updates);
    await logActivity('medical_service.update', { service_id: id });
    return { data: response.data.service, error: null };
  } catch (error) {

    return { data: null, error };
  }
};

// Delete a medical service
export const deleteMedicalService = async (id: string, userId: string) => {
  try {
    await api.delete(`/services/${id}`);
    await logActivity('medical_service.delete', { service_id: id });
    return { error: null };
  } catch (error) {

    return { error };
  }
};

// Toggle service active status
export const toggleServiceStatus = async (id: string, currentStatus: boolean, userId: string) => {
  try {
    const response = await api.put(`/services/${id}`, { is_active: !currentStatus });
    await logActivity('medical_service.toggle', { service_id: id, new_status: !currentStatus });
    return { data: response.data.service, error: null };
  } catch (error) {

    return { data: null, error };
  }
};

// Bulk import services
export const bulkImportServices = async (services: Omit<MedicalService, 'id' | 'created_at' | 'updated_at'>[]) => {
  try {
    const response = await api.post('/services/bulk', { services });
    return { data: response.data, error: null };
  } catch (error) {

    return { data: null, error };
  }
};
