<?php

namespace App\Http\Controllers;

use App\Services\AccountService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

/**
 * AccountController
 *
 * Handles all user account self-service operations:
 *   Profile, password, Stellar wallet, account deactivation.
 */
class AccountController extends Controller
{
    public function __construct(private readonly AccountService $account) {}

    // ─── Profile ─────────────────────────────────────────────────────────────

    /**
     * GET /api/account/profile
     * Get the authenticated user's full profile.
     */
    public function profile(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'user'    => $this->account->formatUser($request->user()),
        ]);
    }

    /**
     * PUT /api/account/profile
     * Update name, phone, avatar, specialization.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $request->validate([
            'name'           => 'sometimes|string|max:255',
            'phone'          => 'sometimes|string|max:20',
            'avatar_url'     => 'sometimes|url|max:500',
            'specialization' => 'sometimes|string|max:100',
        ]);

        try {
            $user = $this->account->updateProfile($request->user(), $request->only(
                'name', 'phone', 'avatar_url', 'specialization'
            ));
            return response()->json(['success' => true, 'user' => $user]);
        } catch (Throwable $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    // ─── Password ────────────────────────────────────────────────────────────

    /**
     * POST /api/account/change-password
     * Change password — requires current password.
     */
    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password'     => 'required|string|min:8|confirmed', // needs new_password_confirmation
        ]);

        try {
            $this->account->changePassword(
                $request->user(),
                $request->input('current_password'),
                $request->input('new_password')
            );
            return response()->json([
                'success' => true,
                'message' => 'Password changed. Please log in again on all devices.',
            ]);
        } catch (Throwable $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 422);
        }
    }

    /**
     * POST /api/account/forgot-password  (public)
     * Send password reset email.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);

        // Always return success — don't reveal if email exists
        $this->account->sendPasswordReset($request->input('email'));

        return response()->json([
            'success' => true,
            'message' => 'If that email exists, a reset link has been sent.',
        ]);
    }

    /**
     * POST /api/account/reset-password  (public)
     * Reset password using token from email.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email'                 => 'required|email',
            'token'                 => 'required|string',
            'new_password'          => 'required|string|min:8|confirmed',
        ]);

        try {
            $this->account->resetPassword(
                $request->input('email'),
                $request->input('token'),
                $request->input('new_password')
            );
            return response()->json([
                'success' => true,
                'message' => 'Password reset successfully. Please log in.',
            ]);
        } catch (Throwable $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 422);
        }
    }

    // ─── Stellar Wallet ──────────────────────────────────────────────────────

    /**
     * POST /api/account/wallet/generate
     * Generate a new Stellar keypair for this user.
     * Secret key is shown ONCE — user must save it.
     */
    public function generateWallet(Request $request): JsonResponse
    {
        try {
            $wallet = $this->account->generateWallet($request->user());
            return response()->json(['success' => true, 'wallet' => $wallet], 201);
        } catch (Throwable $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 422);
        }
    }

    /**
     * POST /api/account/wallet/link
     * Link an existing Stellar public key (Freighter, Lobstr, etc.)
     */
    public function linkWallet(Request $request): JsonResponse
    {
        $request->validate(['public_key' => 'required|string']);

        try {
            $this->account->linkWallet($request->user(), $request->input('public_key'));
            return response()->json([
                'success'    => true,
                'message'    => 'Stellar wallet linked successfully.',
                'public_key' => $request->input('public_key'),
            ]);
        } catch (Throwable $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 422);
        }
    }

    /**
     * POST /api/account/wallet/export
     * Export the encrypted wallet secret (requires password).
     * Use this for backup — never share this key.
     */
    public function exportWallet(Request $request): JsonResponse
    {
        $request->validate(['password' => 'required|string']);

        try {
            $secret = $this->account->exportWalletSecret(
                $request->user(),
                $request->input('password')
            );
            return response()->json([
                'success'    => true,
                'secret_key' => $secret,
                'warning'    => 'Never share this key. Store it securely offline.',
            ]);
        } catch (Throwable $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 422);
        }
    }

    /**
     * DELETE /api/account/wallet
     * Remove Stellar wallet from account (requires password).
     */
    public function removeWallet(Request $request): JsonResponse
    {
        $request->validate(['password' => 'required|string']);

        try {
            $this->account->removeWallet($request->user(), $request->input('password'));
            return response()->json(['success' => true, 'message' => 'Wallet removed from account.']);
        } catch (Throwable $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 422);
        }
    }

    // ─── Account ─────────────────────────────────────────────────────────────

    /**
     * DELETE /api/account
     * Deactivate account (requires password confirmation).
     */
    public function deactivate(Request $request): JsonResponse
    {
        $request->validate(['password' => 'required|string']);

        try {
            $this->account->deactivateAccount($request->user(), $request->input('password'));
            return response()->json(['success' => true, 'message' => 'Account deactivated.']);
        } catch (Throwable $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 422);
        }
    }
}
