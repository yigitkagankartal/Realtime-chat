import React, { useState, useEffect } from "react";
import { updateProfile } from "../api/auth";
import { uploadProfileImage } from "../api/user";
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
  onViewImage,
}) => {
  // Form state'leri
  const [displayName, setDisplayName] = useState(me.displayName);
  const [about, setAbout] = useState(me.about || "");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isHoveringImage, setIsHoveringImage] = useState(false);

  // Mobil Kontrolü
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Props değişince local state'i güncelle
  useEffect(() => {
    setDisplayName(me.displayName);
    setAbout(me.about || "");
  }, [me]);

  // Profil Güncelleme
  const handleSave = async (field: "name" | "about") => {
    try {
      const data: any = {};
      if (field === "name") {
        if (!displayName.trim()) return;
        data.displayName = displayName;
      } else {
        data.about = about;
      }

      const updatedUser = await updateProfile(data);
      onUpdateMe(updatedUser);

      if (field === "name") setIsEditingName(false);
      else setIsEditingAbout(false);
    } catch (error) {
      console.error("Profil güncellenemedi:", error);
    }
  };

  // Resim Yükleme
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsUploading(true);
      try {
        const res = await uploadProfileImage(file);
        onUpdateMe(res);
      } catch (err) {
        console.error("Resim yükleme hatası:", err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        // ✅ GENİŞLİK AYARI:
        // Eğer 300px'lik bir sol panel kullanıyorsan, paddinglerle birlikte 330px civarı yer kaplar.
        // Burayı senin isteğine göre 330px'e sabitledim.
        width: isMobile ? "100%" : 330, 
        height: "100%",
        backgroundColor: "#F0F2F5",
        zIndex: 2000,
        // ✅ ANİMASYON MANTIĞI:
        // shouldRender'ı kaldırdık. Artık panel hep var ama isOpen false ise -100% solda saklanıyor.
        transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)", // ContactInfoSidebar ile aynı efekt
        boxShadow: isOpen ? "2px 0 10px rgba(0,0,0,0.1)" : "none",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid #DDD6FF",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          height: "65px",
          backgroundColor: "#6F79FF",
          color: "white",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          boxSizing: "border-box",
          flexShrink: 0
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, width: "100%" }}>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "white",
              fontSize: 24,
              cursor: "pointer",
              display: "flex", alignItems: "center",
              padding: 0
            }}
          >
            ←
          </button>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 600 }}>Profil</h2>
        </div>
      </div>

      {/* BODY */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 20 }}>
        
        {/* FOTOĞRAF ALANI */}
        <div style={{ display: "flex", justifyContent: "center", padding: "28px 0" }}>
          <div 
            style={{ position: "relative", width: 200, height: 200, cursor: "pointer" }}
            onMouseEnter={() => setIsHoveringImage(true)}
            onMouseLeave={() => setIsHoveringImage(false)}
          >
            <div
              onClick={() => !isHoveringImage && me.profilePictureUrl && onViewImage(me.profilePictureUrl)}
              style={{
                width: "100%", height: "100%", borderRadius: "50%",
                backgroundColor: "#DDD6FF",
                backgroundImage: me.profilePictureUrl ? `url(${me.profilePictureUrl})` : "none",
                backgroundSize: "cover", backgroundPosition: "center",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 60, color: "white",
              }}
            >
              {!me.profilePictureUrl && me.displayName.charAt(0).toUpperCase()}
            </div>

            {(isHoveringImage || isUploading) && (
                <label 
                  style={{
                    position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                    borderRadius: "50%",
                    backgroundColor: "rgba(0,0,0,0.5)",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    color: "white",
                    textAlign: "center",
                    cursor: "pointer"
                  }}
                >
                    {isUploading ? <span>⌛ Yükleniyor...</span> : (
                        <>
                            <span style={{ fontSize: 24, marginBottom: 5 }}>📷</span>
                            <span style={{ fontSize: 12, width: "70%", lineHeight: 1.2 }}>Profil resmini değiştir</span>
                        </>
                    )}
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
                </label>
            )}
          </div>
        </div>

        {/* İSİM ALANI */}
        <div style={{ padding: "14px 30px", backgroundColor: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: 10 }}>
          <div style={{ fontSize: 13, color: "#6F79FF", marginBottom: 14 }}>Adınız</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {isEditingName ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", borderBottom: "2px solid #6F79FF" }}>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={25}
                  style={{ width: "100%", border: "none", outline: "none", fontSize: 17, padding: "5px 0" }}
                  autoFocus
                />
                <div style={{ fontSize: 12, color: "#ccc", marginLeft: 10 }}>{25 - displayName.length}</div>
              </div>
            ) : (
              <div style={{ fontSize: 17, color: "#3b4a54", flex: 1 }}>{me.displayName}</div>
            )}
            <button 
              onClick={() => isEditingName ? handleSave("name") : setIsEditingName(true)} 
              style={{ background: "none", border: "none", fontSize: isEditingName ? 20 : 18, cursor: "pointer", color: isEditingName ? "#6F79FF" : "#9B95C9" }}
            >
              {isEditingName ? "✓" : "✎"}
            </button>
          </div>
        </div>

        {/* HAKKINDA ALANI */}
        <div style={{ padding: "14px 30px", backgroundColor: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: 10 }}>
          <div style={{ fontSize: 13, color: "#6F79FF", marginBottom: 14 }}>Hakkında</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {isEditingAbout ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", borderBottom: "2px solid #6F79FF" }}>
                <input
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  style={{ width: "100%", border: "none", outline: "none", fontSize: 17, padding: "5px 0" }}
                  autoFocus
                />
              </div>
            ) : (
              <div style={{ fontSize: 17, color: "#3b4a54", flex: 1, whiteSpace: "pre-wrap" }}>{me.about || "Müsait"}</div>
            )}
            <button 
              onClick={() => isEditingAbout ? handleSave("about") : setIsEditingAbout(true)} 
              style={{ background: "none", border: "none", fontSize: isEditingAbout ? 20 : 18, cursor: "pointer", color: isEditingAbout ? "#6F79FF" : "#9B95C9" }}
            >
              {isEditingAbout ? "✓" : "✎"}
            </button>
          </div>
        </div>

         {/* TELEFON NUMARASI */}
         <div style={{ padding: "14px 30px", backgroundColor: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
             <div style={{ fontSize: 13, color: "#6F79FF", marginBottom: 5 }}>Telefon Numarası</div>
             <div style={{ fontSize: 17, color: "#3b4a54" }}>{me.phoneNumber}</div>
         </div>
      </div>
    </div>
  );
};

export default ProfileSidebar;