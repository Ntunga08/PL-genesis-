export default function SuccessAlert({ message, txHash, onClose }) {
  if (!message) return null;

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className="text-xl">✅</span>
          <div>
            <p className="text-sm font-semibold text-green-800">Success</p>
            <p className="text-xs text-green-600 mt-1">{message}</p>
            {txHash && (
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline mt-1 inline-block"
              >
                View on Etherscan →
              </a>
            )}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-green-400 hover:text-green-600 text-lg"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
