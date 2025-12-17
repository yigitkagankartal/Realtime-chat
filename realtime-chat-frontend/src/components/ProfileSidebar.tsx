import React, { useState, useEffect, useRef } from "react";
import { updateProfile } from "../api/auth";
import { uploadProfileImage } from "../api/user"; // ✅ Import edildi
import type { MeResponse } from "../api/auth";

interface ProfileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  me: MeResponse;
  onUpdateMe: (updated: MeResponse) => void;
  onViewImage: (url: string) => void;
}

const ProfileSidebar: React.FC<ProfileSidebarProps> = ({
  isOpen,
  onClose,
  me,
  onUpdateMe,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [isUploading, setIsUploading] = useState(false); // Resim yükleme durumu
  
  const [tempName, setTempName] = useState(me.displayName);
  const [tempAbout, setTempAbout] = useState(me.about || "");

  // Dosya input referansı
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempName(me.displayName);
    setTempAbout(me.about || "");
  }, [me, isOpen]);

  // ✅ RESİM YÜKLEME FONKSİYONU
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Backend'e gönder
      const updatedUser = await uploadProfileImage(file);
      // State'i güncelle (App.tsx'teki ana state güncellenir)
      onUpdateMe(updatedUser);
    } catch (error) {
      console.error("Resim yüklenemedi:", error);
      alert("Resim yüklenirken bir hata oluştu.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveName = async () => {
    if (!tempName.trim()) return;
    try {
      const updated = await updateProfile({ displayName: tempName });
      onUpdateMe(updated);
      setIsEditingName(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveAbout = async () => {
    try {
      const updated = await updateProfile({ about: tempAbout });
      onUpdateMe(updated);
      setIsEditingAbout(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      style={{
        position: "fixed", top: 0, left: 0, width: 330, height: "100%",
        backgroundColor: "#F5F3FF", zIndex: 1000,
        transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: "2px 0 10px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column",
        borderRight: "1px solid #DDD6FF",
      }}
    >
      {/* HEADER */}
      <div style={{ height: 65, backgroundColor: "#6F79FF", display: "flex", alignItems: "center", padding: "0 20px", color: "white" }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "white", cursor: "pointer", marginRight: 20, fontSize: 18, display: "flex", alignItems: "center" }}>
          ←
        </button>
        <div style={{ fontWeight: 600, fontSize: 16 }}>Profil</div>
      </div>

      {/* BODY */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 20 }}>
        
        {/* PROFİL FOTOĞRAFI */}
        <div style={{ display: "flex", justifyContent: "center", padding: "30px 0", backgroundColor: "#F5F3FF" }}>
          
          {/* Gizli Input */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            hidden 
            accept="image/*"
          />

          <div
            onClick={() => fileInputRef.current?.click()} // Tıklayınca dosya seç
            style={{
              width: 200, height: 200, borderRadius: "50%",
              backgroundColor: "#E0D8FF",
              backgroundImage: me.profilePictureUrl ? `url(${me.profilePictureUrl})` : "none",
              backgroundSize: "cover", backgroundPosition: "center",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 50, color: "white", position: "relative", cursor: "pointer",
              overflow: "hidden" // Overlay taşmasın diye
            }}
          >
            {!me.profilePictureUrl && me.displayName?.charAt(0).toUpperCase()}
            
            {/* HOVER / LOADING EFFECT */}
            <div style={{
                position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center",
                opacity: isUploading ? 1 : 0, // Yüklenirken görünür, yoksa gizli
                transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
            onMouseLeave={(e) => !isUploading && (e.currentTarget.style.opacity = "0")}
            >
                <span style={{ fontSize: 16, color: "white", fontWeight: "bold" }}>
                    {isUploading ? "Yükleniyor..." : "📷 Değiştir"}
                </span>
            </div>

          </div>
        </div>

        {/* ADINIZ */}
        <div style={{ padding: "14px 24px 10px", backgroundColor: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ color: "#6F79FF", fontSize: 13, marginBottom: 14 }}>Adınız</div>
          
          {isEditingName ? (
            <div style={{ display: "flex", alignItems: "center", borderBottom: "2px solid #6F79FF" }}>
              <input 
                 value={tempName}
                 onChange={(e)=>setTempName(e.target.value)}
                 style={{ flex:1, border:"none", outline:"none", fontSize:16, padding: "4px 0" }}
                 autoFocus
              />
              <button onClick={handleSaveName} style={{border:"none", background:"none", cursor:"pointer"}}>✔️</button>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 16, color: "#3E3663" }}>{me.displayName}</div>
              <button onClick={() => setIsEditingName(true)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 16 }}>✏️</button>
            </div>
          )}
          
          <div style={{ fontSize: 12, color: "#9B95C9", marginTop: 10 }}>
            Bu kullanıcı adınız değil, takma adınızdır. Kişilerinize böyle görünürsünüz.
          </div>
        </div>

        {/* HAKKINDA */}
        <div style={{ marginTop: 12, padding: "14px 24px 10px", backgroundColor: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ color: "#6F79FF", fontSize: 13, marginBottom: 14 }}>Hakkında</div>
          {isEditingAbout ? (
            <div style={{ display: "flex", alignItems: "center", borderBottom: "2px solid #6F79FF" }}>
              <input value={tempAbout} onChange={(e)=>setTempAbout(e.target.value)} style={{ flex:1, border:"none", outline:"none", fontSize:16, padding: "4px 0" }} autoFocus />
              <button onClick={handleSaveAbout} style={{border:"none", background:"none", cursor:"pointer"}}>✔️</button>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 16, color: "#3E3663" }}>{me.about || "Müsait"}</div>
              <button onClick={() => setIsEditingAbout(true)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 16 }}>✏️</button>
            </div>
          )}
        </div>

         {/* TELEFON NUMARASI */}
         <div style={{ marginTop: 12, padding: "14px 24px 10px", backgroundColor: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ color: "#6F79FF", fontSize: 13, marginBottom: 14 }}>Telefon Numarası</div>
            <div style={{ fontSize: 16, color: "#3E3663" }}>{me.phoneNumber}</div>
        </div>

      </div>
    </div>
  );
};

export default ProfileSidebar;