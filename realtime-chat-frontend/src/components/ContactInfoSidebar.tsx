import React, { useState, useEffect } from "react";
import type { UserListItem } from "../api/chat";

interface ContactInfoSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserListItem | null;
  onViewImage: (url: string) => void;
  lastSeenText: string;
}

const ContactInfoSidebar: React.FC<ContactInfoSidebarProps> = ({
  isOpen,
  onClose,
  user,
  onViewImage,
  lastSeenText,
}) => {
  // Mobil Kontrolü
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!user) return null;

  const isNameSet = user.displayName && user.displayName !== user.phoneNumber;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        // ✅ GENİŞLİK AYARI (ProfileSidebar ile aynı)
        width: isMobile ? "100%" : 330,
        height: "100%",
        backgroundColor: "#F5F3FF",
        zIndex: 2000,
        transform: isOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: "-2px 0 10px rgba(0,0,0,0.1)",
        display: "flex",
        flexDirection: "column",
        borderLeft: "1px solid #DDD6FF",
      }}
    >
      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", padding: "15px 20px", backgroundColor: "#F5F3FF" }}>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 24, color: "#3E3663", marginRight: 15, outline: "0" }}
        >
          ✕
        </button>
        <h3 style={{ margin: 0, color: "#3E3663", fontSize: 18 }}>Kişi bilgisi</h3>
      </div>

      {/* BODY */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 20 }}>

        {/* PROFİL FOTOĞRAFI & İSİM */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0 30px 0", backgroundColor: "#F5F3FF" }}>

          <div
            onClick={() => user.profilePictureUrl && onViewImage(user.profilePictureUrl)}
            style={{
              width: 150, height: 150, borderRadius: "50%",
              backgroundColor: "#E0D8FF",
              backgroundImage: user.profilePictureUrl ? `url(${user.profilePictureUrl})` : "none",
              backgroundSize: "cover", backgroundPosition: "center",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 50, color: "white", marginBottom: 15,
              cursor: user.profilePictureUrl ? "pointer" : "default",
              boxShadow: "0 4px 15px rgba(0,0,0,0.1)"
            }}
          >
            {!user.profilePictureUrl && user.displayName.charAt(0).toUpperCase()}
          </div>

          <div style={{ fontSize: 22, fontWeight: 700, color: "#3E3663", textAlign: "center", padding: "0 20px" }}>
            {isNameSet ? user.displayName : user.phoneNumber}
          </div>

          <div style={{ fontSize: 14, color: "#6F79FF", marginTop: 5 }}>
            {lastSeenText}
          </div>
        </div>

        {/* BİLGİ KARTLARI (Yontulmuş Köşeli Tasarım) */}
        <div style={{ padding: "0 15px" }}>

          {isNameSet && (
            <div style={{ backgroundColor: "white", padding: "15px", borderRadius: 12, marginBottom: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: 13, color: "#9B95C9", marginBottom: 5 }}>Telefon Numarası</div>
              <div style={{ fontSize: 16, color: "#3E3663" }}>{user.phoneNumber}</div>
            </div>
          )}

          <div style={{ backgroundColor: "white", padding: "15px", borderRadius: 12, marginBottom: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: 13, color: "#9B95C9", marginBottom: 5 }}>Hakkında</div>
            <div style={{ fontSize: 16, color: "#3E3663", lineHeight: 1.5 }}>
              {user.about || "Müsait"}
            </div>
          </div>

          <div style={{ backgroundColor: "white", padding: "15px", borderRadius: 12, marginTop: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
            <div style={{ fontSize: 16, color: "#3E3663" }}>Medya, bağlantı ve belgeler</div>
            <div style={{ color: "#9B95C9" }}>0 ›</div>
          </div>

          <div style={{ marginTop: 30 }}>
            <button style={{ width: "100%", padding: "15px", textAlign: "left", background: "none", border: "none", color: "#FF4D4D", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, outline: "0" }}>
              🚫 {isNameSet ? user.displayName : user.phoneNumber} kişisini engelle
            </button>
            <button style={{ width: "100%", padding: "15px", textAlign: "left", background: "none", border: "none", color: "#FF4D4D", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, outline: "0" }}>
              👎 {isNameSet ? user.displayName : user.phoneNumber} kişisini şikayet et
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactInfoSidebar;