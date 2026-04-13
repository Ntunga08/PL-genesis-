<?php

namespace App\Http\Controllers;

use App\Models\MedicalService;
use App\Models\PatientService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ServiceController extends Controller
{
    public function index(Request $request)
    {
        $query = MedicalService::query();

        if ($request->has('service_type')) {
            $query->where('service_type', $request->service_type);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $services = $query->orderBy('service_name')->get();

        return response()->json(['services' => $services]);
    }

    public function show($id)
    {
        $service = MedicalService::findOrFail($id);
        return response()->json(['service' => $service]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'service_code' => 'required|string|max:50|unique:medical_services',
            'service_name' => 'required|string|max:255',
            'service_type' => 'required|string|max:100',
            'description' => 'nullable|string',
            'base_price' => 'required|numeric|min:0',
            'currency' => 'nullable|string|max:10',
        ]);

        $validated['id'] = (string) Str::uuid();
        $service = MedicalService::create($validated);

        return response()->json(['service' => $service], 201);
    }

    public function update(Request $request, $id)
    {
        $service = MedicalService::findOrFail($id);

        $validated = $request->validate([
            'service_name' => 'sometimes|string|max:255',
            'service_type' => 'sometimes|string|max:100',
            'description' => 'nullable|string',
            'base_price' => 'sometimes|numeric|min:0',
            'is_active' => 'sometimes|boolean',
        ]);

        $service->update($validated);

        return response()->json(['service' => $service]);
    }

    public function destroy($id)
    {
        $service = MedicalService::findOrFail($id);
        $service->delete();

        return response()->json(['message' => 'Service deleted successfully']);
    }

    // Patient Services
    public function assignToPatient(Request $request)
    {
        $validated = $request->validate([
            'patient_id' => 'required|uuid|exists:patients,id',
            'visit_id'   => 'nullable|uuid|exists:patient_visits,id',
            'service_id' => 'nullable|uuid|exists:medical_services,id',
            'service_name' => 'nullable|string|max:255',
            'quantity' => 'nullable|integer|min:1',
            'unit_price' => 'nullable|numeric|min:0',
            'total_price' => 'nullable|numeric|min:0',
            'service_date' => 'required|date',
            'status' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
        ]);

        // If service_id is provided, get pricing from service
        if (!empty($validated['service_id'])) {
            $service = MedicalService::findOrFail($validated['service_id']);
            $validated['unit_price'] = $service->base_price;
            $validated['total_price'] = $service->base_price * ($validated['quantity'] ?? 1);
            // Always populate service_name from the service record
            if (empty($validated['service_name'])) {
                $validated['service_name'] = $service->service_name;
            }
        } else {
            // For medications or custom items, use provided prices
            if (empty($validated['service_name'])) {
                return response()->json(['error' => 'Either service_id or service_name is required'], 400);
            }
            // Use provided unit_price and total_price, or calculate if missing
            if (empty($validated['unit_price'])) {
                $validated['unit_price'] = 0;
            }
            if (empty($validated['total_price'])) {
                $validated['total_price'] = $validated['unit_price'] * ($validated['quantity'] ?? 1);
            }
        }
        
        $validated['id'] = (string) Str::uuid();
        $validated['created_by'] = auth()->id();

        $patientService = PatientService::create($validated);

        return response()->json(['patient_service' => $patientService->load('service')], 201);
    }

    public function getPatientServices(Request $request, $patientId)
    {
        $services = PatientService::with('service')
                                  ->where('patient_id', $patientId)
                                  ->orderBy('service_date', 'desc')
                                  ->get();

        return response()->json(['services' => $services]);
    }

    public function getAllPatientServices(Request $request)
    {
        $query = PatientService::with(['service', 'patient']);

        // Filter by status if provided
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by patient if provided
        if ($request->has('patient_id')) {
            $query->where('patient_id', $request->patient_id);
        }

        // Filter by visit if provided
        if ($request->has('visit_id')) {
            $query->where('visit_id', $request->visit_id);
        }

        $services = $query->orderBy('service_date', 'desc')->get();

        return response()->json(['services' => $services]);
    }

    public function updatePatientService(Request $request, $id)
    {
        $patientService = PatientService::findOrFail($id);

        $validated = $request->validate([
            'status'       => 'sometimes|string',
            'notes'        => 'sometimes|nullable|string',
            'completed_by' => 'sometimes|nullable|exists:users,id',
            'completed_at' => 'sometimes|nullable|date',
        ]);

        if (isset($validated['status']) && $validated['status'] === 'Completed' && !isset($validated['completed_at'])) {
            $validated['completed_at'] = now();
            $validated['completed_by'] = auth()->id();
        }

        $patientService->update($validated);

        return response()->json(['patient_service' => $patientService->load('service')]);
    }
}
