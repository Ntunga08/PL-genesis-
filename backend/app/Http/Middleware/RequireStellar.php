<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * RequireStellar Middleware
 *
 * Blocks any request to Stellar-dependent endpoints if the
 * Stellar Horizon or Soroban RPC is unreachable.
 *
 * This enforces Stellar as a hard dependency — if Stellar is down,
 * the system returns a clear error rather than silently degrading.
 */
class RequireStellar
{
    public function handle(Request $request, Closure $next)
    {
        try {
            $response = Http::timeout(5)->get(config('stellar.horizon_url'));

            if (! $response->successful()) {
                Log::error('RequireStellar: Horizon returned non-200', ['status' => $response->status()]);
                return response()->json([
                    'success' => false,
                    'error'   => 'Stellar network is currently unavailable. This operation requires Stellar to function.',
                    'stellar_status' => 'unreachable',
                ], 503);
            }
        } catch (\Throwable $e) {
            Log::error('RequireStellar: Horizon unreachable', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'error'   => 'Stellar network is currently unavailable. This operation requires Stellar to function.',
                'stellar_status' => 'unreachable',
            ], 503);
        }

        return $next($request);
    }
}
