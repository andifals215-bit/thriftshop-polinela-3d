import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, X, Compass } from 'lucide-react';

const WangLinAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'assistant', text: 'Salam, Rekan Dao. Saya Wang Lin. Apakah ada hal mengenai jubah spiritual (pakaian thrift) Polinela yang ingin Anda tanyakan untuk membantu perjalanan kultivasi Anda hari ini?' }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputVal.trim() || loading) return;

    const userMessage = inputVal.trim();
    setMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
    setInputVal('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(prev => [...prev, { sender: 'assistant', text: data.response }]);
      } else {
        setMessages(prev => [...prev, { sender: 'assistant', text: 'Maaf Rekan Dao, aliran Qi saya terganggu. Gagal terhubung ke server.' }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { sender: 'assistant', text: 'Maaf Rekan Dao, formasi komunikasi spiritual ini terputus. Silakan coba lagi.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '90px', zIndex: 9999, fontFamily: 'var(--font-display)' }}>
      {/* Chat Box */}
      {isOpen && (
        <div className="glass-panel" style={{
          position: 'absolute',
          bottom: '100px',
          right: '0',
          width: '320px',
          height: '400px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: '16px',
          boxShadow: '0 10px 30px rgba(168, 85, 247, 0.2), 0 0 15px rgba(6, 182, 212, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          background: 'rgba(15, 15, 21, 0.95)'
        }}>
          {/* Header */}
          <div style={{
            padding: '16px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(6, 182, 212, 0.15))'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass size={18} className="text-glow-cyan" style={{ color: 'var(--accent-cyan)' }} />
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', color: '#fff' }}>Wang Lin AI</h4>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Kultivator Formasi Jiwa</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flexGrow: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {messages.map((m, idx) => (
              <div key={idx} style={{
                alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                padding: '10px 14px',
                borderRadius: '12px',
                fontSize: '12.5px',
                lineHeight: '1.4',
                background: m.sender === 'user' ? 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))' : 'rgba(255,255,255,0.05)',
                color: '#fff',
                border: m.sender === 'user' ? 'none' : '1px solid rgba(255,255,255,0.06)'
              }}>
                {m.text}
              </div>
            ))}
            {loading && (
              <div style={{
                alignSelf: 'flex-start',
                padding: '10px 14px',
                borderRadius: '12px',
                fontSize: '12px',
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text-secondary)',
                border: '1px solid rgba(255,255,255,0.06)'
              }}>
                Sedang memulihkan Qi... (Menghubungi Gemini)
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} style={{
            padding: '12px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            gap: '8px'
          }}>
            <input
              type="text"
              className="form-input"
              style={{
                margin: 0,
                padding: '8px 12px',
                fontSize: '13px',
                background: '#08080c',
                border: '1px solid rgba(255,255,255,0.08)'
              }}
              placeholder="Tanya kultivasi / pakaian..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0 12px', margin: 0, height: '38px', borderRadius: '10px' }} disabled={loading}>
              <Send size={14} />
            </button>
          </form>
        </div>
      )}

      {/* Wang Lin Character */}
      <div 
        onMouseEnter={() => setIsJumping(true)}
        onMouseLeave={() => setIsJumping(false)}
        onClick={() => setIsOpen(!isOpen)}
        className={`${isJumping ? 'luffy-jump' : 'luffy-float'}`}
        style={{
          width: '150px',
          height: '150px',
          cursor: 'pointer',
          position: 'relative',
          transition: 'transform 0.2s ease',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
        title="Tanya Wang Lin AI (Gemini)"
      >
        {/* Glow effect */}
        <div style={{
          position: 'absolute',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, var(--accent-cyan-glow) 0%, transparent 70%)',
          zIndex: 1,
          animation: 'pulse-slow 2s infinite alternate',
          opacity: 0.7
        }} />

        {/* Floating Flying Sword */}
        <svg 
          style={{
            position: 'absolute',
            top: '-20px',
            left: '10px',
            width: '32px',
            height: '32px',
            zIndex: 3,
            filter: 'drop-shadow(0 0 8px var(--accent-cyan))',
            animation: 'sword-spin 3s infinite linear'
          }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent-cyan)"
          strokeWidth="2"
        >
          <path d="M12 2v14M9 6h6M12 16v3M10 19h4" />
        </svg>

        {/* Wang Lin Image Avatar (Standing, no circle, twice as large) */}
        <div style={{
          width: '140px',
          height: '140px',
          zIndex: 2,
          position: 'relative',
          filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.8)) drop-shadow(0 0 8px rgba(6, 182, 212, 0.3))'
        }}>
          <img 
            src="/api/uploads/wanglin.png" 
            alt="Wang Lin Avatar" 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'contain',
              objectPosition: 'bottom center'
            }} 
          />
        </div>
      </div>

      {/* Styled Animations Injection */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse-slow {
          0% { transform: scale(0.9); opacity: 0.5; }
          100% { transform: scale(1.1); opacity: 0.8; }
        }
        @keyframes sword-spin {
          0% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-4px) rotate(15deg); }
          100% { transform: translateY(0) rotate(0deg); }
        }
        @keyframes waving-hand {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(20deg); }
        }
        .luffy-float {
          animation: luffy-floating 3s infinite ease-in-out;
        }
        .luffy-jump {
          animation: luffy-jumping 0.6s infinite ease-in-out;
        }
        @keyframes luffy-floating {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes luffy-jumping {
          0%, 100% { transform: translateY(0) scaleY(1); }
          50% { transform: translateY(-24px) scaleY(0.9) scaleX(1.05); }
        }
      `}} />
    </div>
  );
};

export default WangLinAssistant;
