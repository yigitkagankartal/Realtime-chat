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

    // 1. URL Güvenliği
    const secureUrl = audioUrl.startsWith("http://")
      ? audioUrl.replace("http://", "https://")
      : audioUrl;

    const waveColor = isMine ? "#ffffffaf" : "#BDBDBD";
    const progressColor = isMine ? "#f5f5f5dc" : "#6F79FF";

    // WaveSurfer
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: waveColor,
      progressColor: progressColor,
      cursorColor: "transparent",
      barWidth: 3,
      barGap: 2,
      barRadius: 3,
      height: 28,
      normalize: true,
      backend: 'WebAudio', // CORS sorunları için gerekli
    });

    waveSurferRef.current = ws;

    // 2. Sesi Yükle
    try {
      ws.load(secureUrl);
    } catch (error) {
      console.error("Ses yükleme hatası:", error);
    }

   // 1. Hazır olduğunda süreyi al
    ws.on("ready", () => {
      const d = ws.getDuration();
      if (d !== Infinity && !isNaN(d)) {
        setDuration(d);
      }
    });

    // 2. Oynarken süreyi güncelle
    ws.on("audioprocess", () => {
      const time = ws.getCurrentTime();
      const totalDuration = ws.getDuration();

      if (totalDuration > 0 && totalDuration !== Infinity) {
        if (totalDuration - time < 0.1) {
           ws.pause();
           ws.seekTo(0);
           setIsPlaying(false);
           setCurrentTime(0);
           return; 
        }
      }

      setCurrentTime(time);
    });

    // 3. Oynatma başladığında
    ws.on("play", () => setIsPlaying(true));

    // 4. Duraklatıldığında
    ws.on("pause", () => setIsPlaying(false));

    // 5. Ses bittiğinde
    ws.on("finish", () => {
      setIsPlaying(false);
      setCurrentTime(0);
      ws.seekTo(0);
    });
    ws.on("error", (e) => {
      console.error("WaveSurfer Hatası:", e);
    });

    // Temizlik
    return () => {
      ws.destroy();
    };
  }, [audioUrl, isMine]);

  const togglePlay = () => {
    if (waveSurferRef.current) {
      waveSurferRef.current.playPause();
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", minWidth:"260px", maxWidth: "300px", padding: "0" }}>

      {/* 1. Profil Resmi + Küçük Mikrofon */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <div style={{
          width: 50, height: 50, borderRadius: "50%",
          backgroundImage: senderProfilePic ? `url(${senderProfilePic})` : "none",
          backgroundColor: isMine ? "rgba(255,255,255,0.2)" : "#DDD6FF",
          backgroundSize: "cover", backgroundPosition: "center",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          {!senderProfilePic && <span style={{ fontSize: "10px" }}>?</span>}
        </div>
        <div style={{
          position: "absolute", bottom: -2, right: -4,
          color: isMine ? "#FFF" : "#6F79FF",
          
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
          color: isMine ? "white" : "#6F79FF",
          fontSize: "24px", cursor: "pointer",
          padding: "0 4px", display: "flex", alignItems: "center",
          outline: "none"
        }}
      >
        <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
      </button>

      {/* 3. Dalga Formu ve Süre */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
        {/* Waveform */}
        <div ref={containerRef} style={{ width: "100%", marginTop: "10px" }} />

        {/* Tek Sayaç (Solda) */}
        <div style={{
          fontSize: "11px",
          color: isMine ? "rgba(255,255,255,0.8)" : "#8E88B9",
          lineHeight: 1,
          whiteSpace: "nowrap"
        }}>
          {formatTime(currentTime > 0 ? currentTime : duration)}
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;