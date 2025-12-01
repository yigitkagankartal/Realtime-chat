package com.yigitkagan.realtime_chat_backend.message;

public enum MessageStatus {
    SENT,       // Gönderildi (tek tik)
    DELIVERED,  // Karşı tarafa ulaştı (çift tik)
    SEEN        // Karşı taraf sohbeti gördü (mor çift tik)
}
