import { QRCodeSVG } from 'qrcode.react';

export default function QRCodeCard({ address }) {
  const copyAddress = () => {
    navigator.clipboard.writeText(address);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
      <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <span>📱</span> Share Your Wallet
      </h3>

      <div className="flex flex-col items-center">
        <div className="bg-white p-4 rounded-lg border-2 border-slate-200">
          <QRCodeSVG 
            value={address} 
            size={160}
            level="H"
            includeMargin={true}
          />
        </div>

        <p className="font-mono text-xs text-slate-600 mt-4 break-all text-center">
          {address}
        </p>

        <button
          onClick={copyAddress}
          className="mt-3 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors text-sm font-medium"
        >
          📋 Copy Address
        </button>

        <p className="text-xs text-slate-500 mt-3 text-center">
          Medical staff can scan this QR code to get your wallet address
        </p>
      </div>
    </div>
  );
}
