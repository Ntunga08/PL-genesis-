import { useState } from 'react';

export function useTransaction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [txHash, setTxHash] = useState(null);

  const executeTransaction = async (txFunction) => {
    setLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const tx = await txFunction();
      setTxHash(tx.hash);
      await tx.wait();
      return tx;
    } catch (err) {
      const errorMessage = err.reason || err.message || 'Transaction failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setLoading(false);
    setError(null);
    setTxHash(null);
  };

  return {
    loading,
    error,
    txHash,
    executeTransaction,
    reset
  };
}
