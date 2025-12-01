package com.yigitkagan.realtime_chat_backend.user;

public record UserMeResponse(
        Long id,
        String email,
        String displayName
) {}
