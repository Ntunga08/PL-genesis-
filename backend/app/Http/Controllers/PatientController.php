<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PatientController extends Controller
{
    public function index(Request $request)
    {
        $query = Patient::with(['insuranceCompany']);

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('insurance_number', 'like', "%{$search}%");
            });
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('has_insurance')) {
            $query->whereNotNull('insurance_company_id');
        }

        if ($request->has('insurance_company_id')) {
            $query->where('insurance_company_id', $request->insurance_company_id);
        }

        // Date range filtering for reports
        if ($request->has('from') && $request->has('to')) {
            $query->whereBetween('created_at', [$request->from, $request->to]);
        }

        $patients = $query->orderBy('created_at', 'desc')
                         ->paginate($request->get('limit', 50));

        return response()->json(['patients' => $patients->items(), 'total' => $patients->total()]);
    }

    public function show($id)
    {
        $patient = Patient::with(['appointments', 'visits', 'prescriptions', 'invoices'])
                         ->findOrFail($id);
        return response()->json(['patient' => $patient]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'full_name' => 'required|string|max:255',
            'date_of_birth' => 'required|date',
            'gender' => 'required|in:Male,Female,Other',
            'phone' => 'required|string|max:20',
            'email' => 'nullable|email',
            'address' => 'required|string',
            'emergency_contact' => 'nullable|string',
            'emergency_phone' => 'nullable|string|max:20',
            'blood_group' => 'nullable|string|max:10',
            'allergies' => 'nullable|string',
            'medical_history' => 'nullable|string',
            'insurance_provider' => 'nullable|string',
            'insurance_number' => 'nullable|string|max:100',
            'insurance_company_id' => 'nullable|uuid|exists:insurance_companies,id',
            'status' => 'nullable|string|max:50',
        ]);

        $validated['id'] = (string) Str::uuid();
        $patient = Patient::create($validated);

        return response()->json(['patient' => $patient], 201);
    }

    public function update(Request $request, $id)
    {
        $patient = Patient::findOrFail($id);

        $validated = $request->validate([
            'full_name' => 'sometimes|string|max:255',
            'date_of_birth' => 'sometimes|date',
            'gender' => 'sometimes|in:Male,Female,Other',
            'phone' => 'sometimes|string|max:20',
            'email' => 'nullable|email',
            'address' => 'sometimes|string',
            'emergency_contact' => 'nullable|string',
            'emergency_phone' => 'nullable|string|max:20',
            'blood_group' => 'nullable|string|max:10',
            'allergies' => 'nullable|string',
            'medical_history' => 'nullable|string',
            'insurance_provider' => 'nullable|string',
            'insurance_number' => 'nullable|string|max:100',
            'insurance_company_id' => 'nullable|uuid|exists:insurance_companies,id',
            'status' => 'sometimes|in:Active,Inactive',
        ]);

        $patient->update($validated);

        return response()->json(['patient' => $patient]);
    }

    public function destroy($id)
    {
        $patient = Patient::findOrFail($id);
        $patient->delete();

        return response()->json(['message' => 'Patient deleted successfully']);
    }
}
