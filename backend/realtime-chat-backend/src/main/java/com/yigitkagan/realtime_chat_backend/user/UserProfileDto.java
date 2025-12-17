package com.yigitkagan.realtime_chat_backend.user;

public record UserProfileDto(
        Long id,
        String phoneNumber,
        String profilePictureUrl,
        String about
) {}