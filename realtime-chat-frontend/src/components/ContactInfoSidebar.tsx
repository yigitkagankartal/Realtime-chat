import React from "react";
import type { UserListItem } from "../api/chat";

interface ContactInfoSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserListItem | null; // Görüntülenen kullanıcı
  onViewImage: (url: string) => void;
  lastSeenText: string | null;
}

const ContactInfoSidebar: React.FC<ContactInfoSidebarProps> = ({
  isOpen,
  onClose,
  user,
  onViewImage,
  lastSeenText,
}) => {
  if (!user) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0, // 🔥 SAĞ TARAFTA
        width: 380,
        height: "100%",
        backgroundColor: "#F0F2F5",
        zIndex: 1000,
        transform: isOpen ? "translateX(0)" : "translateX(100%)", // Sağdan gelir
        transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: "-2px 0 10px rgba(0,0,0,0.1)", // Gölge solda
        display: "flex",
        flexDirection: "column",
        borderLeft: "1px solid #DDD6FF",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          height: "65px",
          backgroundColor: "#F0F2F5",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          color: "#3E3663",
          borderBottom: "1px solid #EAE6FF",
          flexShrink: 0,
        }}
      >
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#3E3663",
            cursor: "pointer",
            marginRight: 15,
            fontSize: 20,
            display: "flex",
            alignItems: "center",
          }}
        >
          ✕ {/* Kapatma çarpısı */}
        </button>
        <div style={{ fontWeight: 600, fontSize: 16 }}>Kişi bilgisi</div>
      </div>

      {/* BODY */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 20 }}>
        
        {/* PROFİL FOTOĞRAFI */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "40px 0 20px 0",
            backgroundColor: "#F0F2F5",
          }}
        >
          <div
            onClick={() => {
                if (user.profilePictureUrl) onViewImage(user.profilePictureUrl);
            }}
            style={{
              width: 200,
              height: 200,
              borderRadius: "50%",
              backgroundColor: "#E0D8FF",
              backgroundImage: user.profilePictureUrl ? `url(${user.profilePictureUrl})` : "none",
              backgroundSize: "cover",
              backgroundPosition: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 60,
              color: "white",
              cursor: user.profilePictureUrl ? "pointer" : "default",
              boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
            }}
          >
             {!user.profilePictureUrl && user.displayName.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* İSİM & NUMARA */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
            <h2 style={{ margin: "0 0 5px 0", color: "#3E3663", fontSize: 22 }}>{user.displayName}</h2>
            <div style={{ color: "#8E88B9", fontSize: 16 }}>
        
                ~{user.displayName} 
           </div>
                {/* 🟢 Son Görülme Bilgisi */}
                <div style={{ color: "#6F79FF", fontSize: 14, fontWeight: 500 }}>
                    {lastSeenText}
                </div>
            </div>

        {/* HAKKINDA */}
        <div style={{ padding: "14px 30px", backgroundColor: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: 10 }}>
          <div style={{ color: "#6F79FF", fontSize: 14, marginBottom: 8, fontWeight: 500 }}>Hakkında</div>
          <div style={{ fontSize: 16, color: "#3E3663" }}>
            {user.about || "Müsait"}
          </div>
        </div>

         {/* MEDYA, BAĞLANTILAR vs. (Görsel Süs) */}
         <div style={{ padding: "14px 30px", backgroundColor: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer" }}>
            <div style={{ color: "#3E3663", fontSize: 16 }}>Medya, bağlantı ve belgeler</div>
            <div style={{ color: "#8E88B9" }}>0 ›</div>
        </div>

        {/* ENGELLE / ŞİKAYET ET (Görsel Süs) */}
        <div style={{ marginTop: 20, padding: "20px 30px", backgroundColor: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
             <div style={{ color: "#EF5350", marginBottom: 15, cursor:"pointer", display:"flex", alignItems:"center", gap:10 }}>
                🚫 {user.displayName} kişisini engelle
             </div>
             <div style={{ color: "#EF5350", cursor:"pointer", display:"flex", alignItems:"center", gap:10 }}>
                👎 {user.displayName} kişisini şikayet et
             </div>
        </div>

      </div>
    </div>
  );
};

export default ContactInfoSidebar;