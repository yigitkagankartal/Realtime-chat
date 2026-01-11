import React, { useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faChevronDown, faReply, faPen, faTrash, faCopy,
  faFileAlt, faFilePdf, faDownload,faShare,faStar
} from "@fortawesome/free-solid-svg-icons";
import AudioPlayer from "./AudioPlayer"; 
import { reactToMessage } from "../api/chat";
import type { ChatMessageResponse } from "../api/chat";
import  type { MeResponse } from "../api/auth";

interface MessageBubbleProps {
  message: ChatMessageResponse;
  me: MeResponse;
  isMine: boolean;
  onReply?: (msg: ChatMessageResponse) => void;
  onEdit?: (msg: ChatMessageResponse) => void;
  onDelete?: (msg: ChatMessageResponse) => void;
  onViewImage: (url: string) => void; 
}

// Helper: 15 Dakika kontrolü
const isEditable = (createdAt: string) => {
  const diff = Date.now() - new Date(createdAt).getTime();
  return diff < 15 * 60 * 1000; 
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, me, isMine, onReply, onEdit, onDelete, onViewImage 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<"top" | "bottom">("bottom");
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const handleMenuOpen = () => {
    if (menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setMenuPosition(spaceBelow < 320 ? "top" : "bottom");
    }
    setShowMenu(!showMenu);
  };

  const handleReaction = async (emoji: string) => {
    try {
      await reactToMessage(message.id, me.id, emoji);
      setShowMenu(false);
    } catch (error) {
      console.error("Tepki hatası", error);
    }
  };
  const renderContent = () => {
    // 1. SES
    if (message.content.startsWith("AUDIO::")) {
      return <div style={{ padding: "8px" }}><AudioPlayer audioUrl={message.content.replace("AUDIO::", "")} isMine={isMine} /></div>;
    }
    // 2. RESİM
    if (message.content.startsWith("IMAGE::")) {
      const url = message.content.split("::")[1];
      return <img src={url} onClick={() => onViewImage(url)} style={{ borderRadius: "12px", maxWidth: "100%", maxHeight: "350px", objectFit: "cover", cursor: "pointer", display:"block" }} />;
    }
    // 3. VİDEO
    if (message.content.startsWith("VIDEO::")) {
        const url = message.content.split("::")[1];
        return <video src={url} controls style={{ borderRadius: "12px", maxWidth: "100%", maxHeight: "350px" }} />;
    }
    // 4. BELGE (DOCUMENT) - Senin gri kutulu tasarımın
    if (message.content.startsWith("DOCUMENT::")) {
        const parts = message.content.split("::");
        const url = parts[1];
        const fileName = parts[2] || "Dosya";
        const fileSize = parts[3] || "";
        const isPdf = fileName.toLowerCase().endsWith(".pdf");
        const thumb = isPdf ? url.replace(".pdf", ".jpg") : null;

        return (
            <div style={{ width: "260px", overflow: "hidden" }}>
                <div style={{ height: "140px", backgroundColor: "#E0E0E0", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", borderTopLeftRadius: "12px", borderTopRightRadius: "12px", overflow: "hidden" }}>
                    {thumb ? (
                    <img src={thumb} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.9 }} onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.querySelector('.fallback-icon')!.removeAttribute('style'); }} />
                    ) : null}
                    
                    <FontAwesomeIcon icon={faFileAlt} className="fallback-icon" style={{ fontSize: "50px", color: "#888", display: thumb ? 'none' : 'block' }} />
                    
                    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <a href={url} download={fileName} style={{ color: "white" }}><FontAwesomeIcon icon={faDownload} /></a>
                    </div>
                </div>
                <div style={{ padding: "10px", backgroundColor: isMine ? "rgba(0,0,0,0.1)" : "rgba(0,0,0,0.03)", display: "flex", alignItems: "center", gap: "10px", borderBottomLeftRadius: "12px", borderBottomRightRadius: "12px" }}>
                    <div style={{ fontSize: "24px", color: "#F15C6D" }}><FontAwesomeIcon icon={isPdf ? faFilePdf : faFileAlt} /></div>
                    <div style={{ flex: 1, overflow: "hidden" }}>
                        <div style={{ fontSize: "14px", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fileName}</div>
                        <div style={{ fontSize: "11px", opacity: 0.7 }}>{fileSize} • {isPdf ? "PDF" : "Dosya"}</div>
                    </div>
                </div>
            </div>
        );
    }

    // 5. NORMAL TEXT
    return <div style={{ padding: "8px 12px", whiteSpace:"pre-wrap" }}>{message.content}</div>;
  };

const reactions = Array.isArray((message as any).reactions) ? (message as any).reactions : [];

  return (
    <div 
      style={{ 
        position: "relative", 
        maxWidth: "70%", 
        marginBottom: 10,
        alignSelf: isMine ? "flex-end" : "flex-start" 
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* BALONCUK */}
      <div style={{
        backgroundColor: isMine ? "#5865F2" : "#FFFFFF",
        color: isMine ? "white" : "#3E3663",
        borderRadius: 16,
        borderTopRightRadius: isMine ? 0 : 16,
        borderTopLeftRadius: !isMine ? 0 : 16,
        boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
        position: "relative",
        minWidth: "120px"
      }}>
        
        {/* İÇERİK */}
        {renderContent()}

        {/* SAAT VE TİKLER */}
        <div style={{ 
            textAlign: "right", fontSize: 11, padding: "0 10px 6px 0", 
            color: isMine ? "rgba(255,255,255,0.7)" : "#9B95C9",
            display:"flex", alignItems:"center", justifyContent:"flex-end", gap:4
        }}>
           {/* Düzenlendi yazısı */}
           {message.updatedAt && (
             <span style={{ fontStyle: "italic", fontSize: "10px", opacity: 0.8, marginRight: "2px" }}>
               düzenlendi
             </span>
           )}

           {/* Saat */}
           {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
           
           {/* Tikler */}
           {isMine && <span>{message.status === "SEEN" ? "✓✓" : "✓"}</span>}
        </div>

        {/* REAKSİYONLAR */}
        {reactions.length > 0 && (
          <div style={{
            position: "absolute", bottom: "-12px",
            [isMine ? "right" : "left"]: "10px",
            backgroundColor: "white", borderRadius: "20px", padding: "2px 4px",
            boxShadow: "0 2px 5px rgba(0,0,0,0.2)", display: "flex", gap: "2px",
            zIndex: 2, border: "1px solid #eee", fontSize: "11px"
          }}>
            {reactions.map((r: any, idx: number) => (
               <div key={idx} style={{ 
                   cursor:"pointer", padding:"1px 4px", borderRadius:"10px", 
                   backgroundColor: r.isMe ? "#E7F3FF" : "transparent" 
               }} onClick={() => handleReaction(r.emoji)}>
                  {r.emoji} {r.count > 1 && <span style={{fontWeight:"bold", marginLeft:2}}>{r.count}</span>}
               </div>
            ))}
          </div>
        )}

        {/* GİZLİ OK BUTONU */}
        {(isHovered || showMenu) && (
          <button
            ref={menuButtonRef}
            onClick={handleMenuOpen}
            style={{
              position: "absolute", top: 0, right: 0,
              background: "linear-gradient(270deg, rgba(0,0,0,0.1) 0%, transparent 100%)",
              border: "none", color: isMine ? "white" : "#9B95C9",
              width: "30px", height: "30px", borderTopRightRadius: isMine ? 0 : 16,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.8
            }}
          >
            <FontAwesomeIcon icon={faChevronDown} fontSize={12} />
          </button>
        )}
      </div>

      {/* POPUP MENÜ */}
      {showMenu && (
        <>
          <div style={{position:"fixed", top:0, left:0, width:"100%", height:"100%", zIndex:99}} onClick={() => setShowMenu(false)} />
          <div style={{
            position: "absolute",
            top: menuPosition === "bottom" ? "100%" : "auto",
            bottom: menuPosition === "top" ? "100%" : "auto",
            right: isMine ? 0 : "auto", left: !isMine ? 0 : "auto",
            zIndex: 100, backgroundColor: "white", borderRadius: "16px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.15)", padding: "8px",
            marginTop: "5px", marginBottom: "5px", minWidth: "220px",
            transformOrigin: menuPosition === "bottom" ? "top right" : "bottom right",
            animation: "popupMenuEnter 0.2s ease-out"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px", borderBottom: "1px solid #f0f0f0", marginBottom: "5px" }}>
              {["👍", "❤️", "😂", "😮", "😢", "🙏"].map(emoji => (
                <button key={emoji} onClick={() => handleReaction(emoji)} style={{ background:"transparent", border:"none", fontSize:"20px", cursor:"pointer", transition:"transform 0.1s" }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.3)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>{emoji}</button>
              ))}
              <button style={{background:"transparent", border:"none", fontSize:"16px", cursor:"pointer", color:"#999"}}>+</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
               <MenuItem icon={faReply} text="Cevapla" onClick={() => { onReply && onReply(message); setShowMenu(false); }} />
               <MenuItem icon={faCopy} text="Kopyala" onClick={() => { navigator.clipboard.writeText(message.content); setShowMenu(false); }} />
               <MenuItem icon={faShare} text="İlet" onClick={() => { alert("İlet özelliği yakında..."); setShowMenu(false); }} />
               <MenuItem icon={faStar} text="Yıldızla" onClick={() => { alert("Yıldız özelliği yakında..."); setShowMenu(false); }} />
               {isMine && isEditable(message.createdAt) && <MenuItem icon={faPen} text="Düzenle" onClick={() => { onEdit && onEdit(message); setShowMenu(false); }} />}
               <div style={{ height: 1, background: "#f0f0f0", margin: "4px 0" }} />
               {isMine && <MenuItem icon={faTrash} text="Benden sil" color="#FF4D4D" onClick={() => { onDelete && onDelete(message); setShowMenu(false); }} />}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const MenuItem = ({ icon, text, onClick, color = "#3E3663" }: any) => (
  <button onClick={onClick} style={{ background: "transparent", border: "none", padding: "10px 12px", textAlign: "left", cursor: "pointer", color: color, fontSize: "14px", fontWeight: 500, display: "flex", alignItems: "center", gap: "12px", borderRadius: "8px", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.backgroundColor = "#F5F3FF"} onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}><div style={{width: 20, textAlign:"center"}}><FontAwesomeIcon icon={icon} /></div>{text}</button>
);

export default MessageBubble;