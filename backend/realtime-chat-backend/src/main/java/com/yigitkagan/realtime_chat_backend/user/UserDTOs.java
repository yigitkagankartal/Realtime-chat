package com.yigitkagan.realtime_chat_backend.user;

public class UserDTOs {

    public record UserMeResponse(
            Long id,
            String email,
            String phoneNumber,
            String displayName,
            String profilePictureUrl,
            String about,
            boolean isActivated,
            boolean isPhoneNumberVisible, // <--- EKLENDİ
            String role
    ) {}

    // Profil güncelleme isteği için DTO
    public static class UpdateProfileRequest {
        private String displayName;
        private String about;
        private String profilePictureUrl;

        // Getter - Setter
        public String getDisplayName() { return displayName; }
        public void setDisplayName(String displayName) { this.displayName = displayName; }
        public String getAbout() { return about; }
        public void setAbout(String about) { this.about = about; }
        public String getProfilePictureUrl() { return profilePictureUrl; }
        public void setProfilePictureUrl(String profilePictureUrl) { this.profilePictureUrl = profilePictureUrl; }
    }
    public record UserListItem(
            Long id,
            String email,
            String displayName,
            String profilePictureUrl,
            String about,
            String phoneNumber
    ) {}
}