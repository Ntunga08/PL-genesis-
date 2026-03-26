import { useState, useEffect } from 'react';
import { fetchFromIPFS } from '../utils/ipfs';

export default function ChatBox({ contract, patientAddress, currentUser, isPatient }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    loadMessages();
    // Auto-refresh every 10 seconds
    const interval = setInterval(loadMessages, 10000);
    return () => clearInterval(interval);
  }, [contract, patientAddress]);

  const loadMessages = async () => {
    if (!contract || !patientAddress) return;
    
    setLoadingMessages(true);
    try {
      const records = isPatient 
        ? await contract.getMyRecords()
        : await contract.getRecords(patientAddress);
      
      // Filter chat messages (recordType = 'chat')
      const chatRecords = records.filter(r => r.recordType === 'chat');
      
      // Fetch actual messages from IPFS
      const messagesWithContent = await Promise.all(
        chatRecords.map(async (r) => {
          try {
            const data = await fetchFromIPFS(r.ipfsHash);
            const parsed = typeof data === 'string' ? JSON.parse(data) : data;
            return {
              message: parsed.message,
              sender: r.addedBy,
              timestamp: Number(r.timestamp),
              ipfsHash: r.ipfsHash
            };
          } catch (err) {
            console.error('Error fetching message:', err);
            return null;
          }
        })
      );
      
      // Filter to show only messages between current user and the other party
      const filteredMessages = messagesWithContent
        .filter(m => m !== null)
        .filter(m => {
          const sender = m.sender.toLowerCase();
          const patient = patientAddress.toLowerCase();
          const current = currentUser.toLowerCase();
          
          // Show message if:
          // 1. Current user sent it to this patient, OR
          // 2. This patient sent it to current user
          return (sender === current || sender === patient);
        })
        .sort((a, b) => a.timestamp - b.timestamp); // Oldest first
      
      setMessages(filteredMessages);
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !contract) return;
    
    setLoading(true);
    try {
      // Store message as JSON on IPFS
      const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_PINATA_JWT}`
        },
        body: JSON.stringify({
          pinataContent: {
            message: newMessage,
            sender: currentUser,
            timestamp: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to upload to IPFS');
      }

      const { IpfsHash } = await response.json();
      
      // Add to blockchain as 'chat' type
      const tx = await contract.addRecord(patientAddress, IpfsHash, 'chat');
      await tx.wait();
      
      setNewMessage('');
      await loadMessages();
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[500px]">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-lg">💬</span>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">
                {isPatient ? 'Chat with Doctor' : 'Chat with Patient'}
              </h3>
              <p className="text-xs text-slate-600 font-mono">
                {isPatient ? 'Your authorized healthcare provider' : `${patientAddress.slice(0, 6)}...${patientAddress.slice(-4)}`}
              </p>
            </div>
          </div>
          {loadingMessages && (
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Loading...
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl mb-2 block">💬</span>
            <p className="text-sm font-semibold text-slate-700">No messages yet</p>
            <p className="text-xs text-slate-500 mt-1">Start a conversation about medical records</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isOwn = msg.sender.toLowerCase() === currentUser.toLowerCase();
            return (
              <div key={idx} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${
                  isOwn 
                    ? 'bg-blue-600 text-white rounded-br-sm' 
                    : 'bg-white text-slate-900 border border-slate-200 rounded-bl-sm'
                }`}>
                  <p className="text-sm break-words leading-relaxed">{msg.message}</p>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p className={`text-xs ${isOwn ? 'text-blue-100' : 'text-slate-500'}`}>
                      {formatTime(msg.timestamp)}
                    </p>
                    {isOwn && (
                      <span className="text-xs text-blue-100">✓</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !loading && sendMessage()}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !newMessage.trim()}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
          >
            {loading ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              '📤'
            )}
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2 text-center">
          Messages are stored on blockchain • Requires gas fee
        </p>
      </div>
    </div>
  );
}
