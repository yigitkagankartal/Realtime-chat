package com.yigitkagan.realtime_chat_backend.user;

public class UpdateProfileRequest {
    private String displayName;
    private String profilePictureUrl;
    private String about; // ✅ BU ALAN ŞART

    // Getter ve Setter'lar
    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getProfilePictureUrl() {
        return profilePictureUrl;
    }

    public void setProfilePictureUrl(String profilePictureUrl) {
        this.profilePictureUrl = profilePictureUrl;
    }

    public String getAbout() { // ✅ ŞART
        return about;
    }

    public void setAbout(String about) { // ✅ ŞART
        this.about = about;
    }
}