export function parseError(error) {
  // User rejected transaction
  if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
    return 'Transaction rejected by user';
  }

  // Contract revert
  if (error.reason) {
    return error.reason;
  }

  // Network errors
  if (error.code === 'NETWORK_ERROR') {
    return 'Network error - check your connection';
  }

  // Insufficient funds
  if (error.message?.includes('insufficient funds')) {
    return 'Insufficient ETH for gas fees';
  }

  // Default
  return error.message || 'An error occurred';
}
