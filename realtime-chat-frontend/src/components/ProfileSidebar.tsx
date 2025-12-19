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
  const [displayName, setDisplayName] = useState(me.displayName);
  const [about, setAbout] = useState(me.about || "");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isHoveringImage, setIsHoveringImage] = useState(false);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setDisplayName(me.displayName);
    setAbout(me.about || "");
  }, [me]);

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
        width: isMobile ? "100%" : 330,
        height: "100%",
        backgroundColor: "#F5F3FF", // ContactInfoSidebar ile aynı zemin
        zIndex: 2000,
        transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: "2px 0 10px rgba(0,0,0,0.1)",
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
              padding: 0,
              outline: 0
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
            style={{ position: "relative", width: 160, height: 160, cursor: "pointer" }}
            onMouseEnter={() => setIsHoveringImage(true)}
            onMouseLeave={() => setIsHoveringImage(false)}
          >
            <div
              onClick={() => !isHoveringImage && me.profilePictureUrl && onViewImage(me.profilePictureUrl)}
              style={{
                width: "100%", height: "100%", borderRadius: "50%",
                backgroundColor: "#E0D8FF",
                backgroundImage: me.profilePictureUrl ? `url(${me.profilePictureUrl})` : "none",
                backgroundSize: "cover", backgroundPosition: "center",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 50, color: "white",
                boxShadow: "0 4px 15px rgba(0,0,0,0.1)"
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
                    {isUploading ? <span>⌛</span> : <span style={{ fontSize: 24 }}>📷</span>}
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
                </label>
            )}
          </div>
        </div>

        {/* BİLGİ KARTLARI KAPSAYICISI (ContactInfoSidebar tarzı padding) */}
        <div style={{ padding: "0 15px" }}>

            {/* İSİM KARTI */}
            <div style={{ backgroundColor: "white", padding: "15px", borderRadius: 12, marginBottom: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: 13, color: "#9B95C9", marginBottom: 5 }}>Adınız</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                {isEditingName ? (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", borderBottom: "2px solid #6F79FF" }}>
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      maxLength={25}
                      style={{ width: "100%", border: "none", outline: "none", fontSize: 16, padding: "5px 0", color: "#3E3663" }}
                      autoFocus
                    />
                    <div style={{ fontSize: 12, color: "#ccc", marginLeft: 10 }}>{25 - displayName.length}</div>
                  </div>
                ) : (
                  <div style={{ fontSize: 16, color: "#3E3663", fontWeight: 500, flex: 1 }}>{me.displayName}</div>
                )}
                <button 
                  onClick={() => isEditingName ? handleSave("name") : setIsEditingName(true)} 
                  style={{ background: "none", border: "none", fontSize: isEditingName ? 20 : 18, cursor: "pointer", color: isEditingName ? "#6F79FF" : "#9B95C9", padding: 0, outline: 0 }}
                >
                  {isEditingName ? "✓" : "✎"}
                </button>
              </div>
            </div>

            {/* HAKKINDA KARTI */}
            <div style={{ backgroundColor: "white", padding: "15px", borderRadius: 12, marginBottom: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: 13, color: "#9B95C9", marginBottom: 5 }}>Hakkında</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                {isEditingAbout ? (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", borderBottom: "2px solid #6F79FF" }}>
                    <input
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
                      style={{ width: "100%", border: "none", outline: "none", fontSize: 16, padding: "5px 0", color: "#3E3663" }}
                      autoFocus
                    />
                  </div>
                ) : (
                  <div style={{ fontSize: 16, color: "#3E3663", flex: 1, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{me.about || "Müsait"}</div>
                )}
                <button 
                  onClick={() => isEditingAbout ? handleSave("about") : setIsEditingAbout(true)} 
                  style={{ background: "none", border: "none", fontSize: isEditingAbout ? 20 : 18, cursor: "pointer", color: isEditingAbout ? "#6F79FF" : "#9B95C9", padding: 0, outline: 0 }}
                >
                  {isEditingAbout ? "✓" : "✎"}
                </button>
              </div>
            </div>

             {/* TELEFON NUMARASI KARTI */}
             <div style={{ backgroundColor: "white", padding: "15px", borderRadius: 12, marginBottom: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                 <div style={{ fontSize: 13, color: "#9B95C9", marginBottom: 5 }}>Telefon Numarası</div>
                 <div style={{ fontSize: 16, color: "#3E3663" }}>{me.phoneNumber}</div>
             </div>

        </div>
      </div>
    </div>
  );
};

export default ProfileSidebar;