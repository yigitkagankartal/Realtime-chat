import React from 'react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose, onLogout }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        width: '100%',
        backgroundColor: '#F5F3FF',
        zIndex: 30, // Profilin de üstünde
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease-in-out',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header */}
      <div style={{ height: 80, background: 'linear-gradient(90deg, #6F79FF, #9B8CFF)', padding: 20, display: 'flex', alignItems: 'flex-end', color: 'white' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', marginRight: 15, cursor: 'pointer', fontSize: 20 }}>←</button>
        <span style={{ fontSize: 18, fontWeight: 600 }}>Ayarlar</span>
      </div>

      <div style={{ padding: 20 }}>
        <div style={{ backgroundColor: 'white', borderRadius: 10, overflow: 'hidden' }}>
            <button style={{ width: '100%', padding: 15, textAlign: 'left', background: 'white', border: 'none', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', color: '#3E3663' }}>
                🔔 Bildirimler
            </button>
            <button style={{ width: '100%', padding: 15, textAlign: 'left', background: 'white', border: 'none', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', color: '#3E3663' }}>
                🔒 Gizlilik
            </button>
            <button style={{ width: '100%', padding: 15, textAlign: 'left', background: 'white', border: 'none', cursor: 'pointer', color: '#3E3663' }}>
                🎨 Tema
            </button>
        </div>

        <button 
            onClick={onLogout}
            style={{ 
                marginTop: 30, 
                width: '100%', 
                padding: 15, 
                backgroundColor: '#FF6F6F', 
                color: 'white', 
                border: 'none', 
                borderRadius: 10, 
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(255, 111, 111, 0.3)'
            }}>
            Çıkış Yap
        </button>
      </div>
    </div>
  );
};

export default SettingsPanel;