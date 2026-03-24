export default function ErrorAlert({ message, onClose }) {
  if (!message) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-red-800">Error</p>
            <p className="text-xs text-red-600 mt-1">{message}</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-red-400 hover:text-red-600 text-lg"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
