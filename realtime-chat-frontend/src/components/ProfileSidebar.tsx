import React from 'react';
import type { MeResponse } from '../api/auth';

interface ProfileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  me: MeResponse;
}

const ProfileSidebar: React.FC<ProfileSidebarProps> = ({ isOpen, onClose, me }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        width: '100%',
        backgroundColor: '#F5F3FF',
        zIndex: 20,
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease-in-out',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header */}
      <div style={{ height: 120, background: 'linear-gradient(90deg, #6F79FF, #9B8CFF)', padding: 20, display: 'flex', alignItems: 'flex-end', color: 'white' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', marginRight: 15, cursor: 'pointer', fontSize: 20 }}>←</button>
        <span style={{ fontSize: 20, fontWeight: 600 }}>Profil</span>
      </div>

      {/* İçerik */}
      <div style={{ padding: 20, flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 30 }}>
          <div style={{ width: 150, height: 150, borderRadius: '50%', backgroundColor: '#E0D4FF', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 60, color: '#6F79FF', border: '5px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
            {me.displayName.charAt(0).toUpperCase()}
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: 15, borderRadius: 10, boxShadow: '0 2px 5px rgba(0,0,0,0.02)', marginBottom: 20 }}>
          <label style={{ fontSize: 13, color: '#6F79FF', fontWeight: 600 }}>Adınız</label>
          <div style={{ marginTop: 5, fontSize: 16, color: '#3E3663' }}>{me.displayName}</div>
        </div>

        <div style={{ backgroundColor: 'white', padding: 15, borderRadius: 10, boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
          <label style={{ fontSize: 13, color: '#6F79FF', fontWeight: 600 }}>Telefon</label>
          <div style={{ marginTop: 5, fontSize: 16, color: '#3E3663' }}>{me.phoneNumber}</div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSidebar;