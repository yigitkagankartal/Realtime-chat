import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock, faLaptop, faMobileAlt, faComments } from "@fortawesome/free-solid-svg-icons";

const WelcomeScreen: React.FC = () => {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      height: "100%",
      backgroundColor: "#F8F9FA",
      borderBottom: "6px solid #6F79FF", 
      color: "#3E3663",
      textAlign: "center",
      position: "relative"
    }}>
      
      {/* ORTA ALAN */}
      <div style={{ 
          flex: 1,
          display: "flex", 
          flexDirection: "column", 
          justifyContent: "center",
          alignItems: "center",
          paddingBottom: "50px", 
          width: "100%",
          maxWidth: "600px"
      }}>

        {/* Logo */}
        <div style={{
          width: "100px",
          height: "100px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #6F79FF 0%, #9B8CFF 100%)",
          color: "white",
          fontSize: "48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "10px",
          boxShadow: "0 10px 25px rgba(111, 121, 255, 0.3)"
        }}>
          <FontAwesomeIcon icon={faComments} />
        </div>

        {/* Başlık */}
        <h1 style={{ fontSize: "36px", fontWeight: "300", marginBottom: "15px", color: "#3E3663" }}>
          Vivoria Web
        </h1>

        {/* Açıklama */}
        <div style={{ lineHeight: "1.6", color: "#667781", fontSize: "15px", padding: "0 20px" }}>
          <p>
            Telefonunuzu bağlı tutmanıza gerek kalmadan mesaj gönderin ve alın.<br />
            Vivoria ile sohbetleriniz tüm cihazlarınızda senkronize.
          </p>
        </div>

        {/* Web / Mobil İkonları */}
        <div style={{ 
            display: "flex", 
            gap: "40px", 
            marginTop: "40px", 
            color: "#9B95C9"
        }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
               <FontAwesomeIcon icon={faLaptop} size="2x" />
               <span style={{ fontSize: "13px", fontWeight: "500" }}>Web</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
               <FontAwesomeIcon icon={faMobileAlt} size="2x" />
               <span style={{ fontSize: "13px", fontWeight: "500" }}>Mobil</span>
            </div>
        </div>

      </div>

      {/* ALT ALAN: Güvenlik Uyarısı */}
      <div style={{ 
        paddingBottom: "30px", 
        fontSize: "13px", 
        color: "#8696a0", 
        display: "flex", 
        alignItems: "center", 
        gap: "5px" 
      }}>
        <FontAwesomeIcon icon={faLock} style={{ fontSize: "11px" }} />
        Kişisel mesajlarınız <strong style={{ color: "#6F79FF" }}>uçtan uca şifrelidir</strong>.
      </div>

    </div>
  );
};

export default WelcomeScreen;