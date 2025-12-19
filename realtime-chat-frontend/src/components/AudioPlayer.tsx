import React, { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faPause, faMicrophone } from "@fortawesome/free-solid-svg-icons";

interface AudioPlayerProps {
  audioUrl: string;
  senderProfilePic?: string;
  isMine: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, senderProfilePic, isMine }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // Renk Ayarları (Vivoria Teması)
    // isMine (Mor Zemin) -> Dalgalar Beyaz
    // !isMine (Beyaz Zemin) -> Dalgalar Gri/Mor
    const waveColor = isMine ? "#ffffffaf" : "#BDBDBD"; 
    const progressColor = isMine ? "#f5f5f5dc" : "#6F79FF"; 

    waveSurferRef.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: waveColor,
      progressColor: progressColor,
      cursorColor: "transparent",
      barWidth: 3,
      barGap: 2,
      barRadius: 3,
      height: 28, // Yükseklik azaltıldı (Daha kompakt)
      normalize: true,
    });

    waveSurferRef.current.load(audioUrl);

    waveSurferRef.current.on("ready", () => {
      setDuration(waveSurferRef.current?.getDuration() || 0);
    });

    waveSurferRef.current.on("audioprocess", () => {
      setCurrentTime(waveSurferRef.current?.getCurrentTime() || 0);
    });

    waveSurferRef.current.on("finish", () => {
      setIsPlaying(false);
      waveSurferRef.current?.seekTo(0);
      setCurrentTime(0);
    });

    return () => {
      waveSurferRef.current?.destroy();
    };
  }, [audioUrl, isMine]);

  const togglePlay = () => {
    if (waveSurferRef.current) {
      waveSurferRef.current.playPause();
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, width: "300px", padding: "0" }}>
      
      {/* 1. Profil Resmi + Küçük Mikrofon */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <div style={{
            width: 50, height: 50, borderRadius: "50%",
            backgroundImage: senderProfilePic ? `url(${senderProfilePic})` : "none",
            backgroundColor: isMine ? "rgba(255,255,255,0.2)" : "#DDD6FF",
            backgroundSize: "cover", backgroundPosition: "center",
            display: "flex", alignItems: "center", justifyContent: "center"
        }}>
             {!senderProfilePic && <span style={{fontSize:"10px"}}>?</span>}
        </div>
        <div style={{
            position: "absolute", bottom: -2, right: -4,
            color: isMine ? "#FFF" : "#6F79FF", // İkon rengi (Zemine göre değil ikona göre)
            // Zemin rengi yok, sadece ikon var (WhatsApp tarzı)
            fontSize: "14px",
            filter: "drop-shadow(0px 1px 1px rgba(0,0,0,0.2))"
        }}>
            <FontAwesomeIcon icon={faMicrophone} />
        </div>
      </div>

      {/* 2. Oynat Butonu */}
      <button 
        onClick={togglePlay}
        style={{
            background: "transparent", border: "none", 
            color: isMine ? "white" : "#6F79FF", // Renkler
            fontSize: "24px", cursor: "pointer", 
            padding: "0 4px", display: "flex", alignItems: "center",
            outline: "none"
        }}
      >
        <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
      </button>

      {/* 3. Dalga Formu ve Süre */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center"}}>
         {/* Waveform */}
        <div ref={containerRef} style={{ width: "100%", marginTop: "10px" }} />
        
        {/* Tek Sayaç (Solda) */}
        <div style={{ 
            fontSize: "11px", 
            color: isMine ? "rgba(255,255,255,0.8)" : "#8E88B9", 
            lineHeight: 1
        }}>
            {formatTime(currentTime > 0 ? currentTime : duration)}
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;