package com.yigitkagan.realtime_chat_backend.contact;

public record ContactDto(
        Long userId,       // Karşı tarafın ID'si
        String nickname    // Atadığın isim
) {}