package com.yigitkagan.realtime_chat_backend.user;

public class UpdateProfileRequest {
    private String displayName;
    private String about;
    private String profilePictureUrl;
    private Boolean isPhoneNumberVisible;

    // Getter ve Setter'lar
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public String getAbout() { return about; }
    public void setAbout(String about) { this.about = about; }
    public String getProfilePictureUrl() { return profilePictureUrl; }
    public void setProfilePictureUrl(String profilePictureUrl) { this.profilePictureUrl = profilePictureUrl; }
    public Boolean getIsPhoneNumberVisible() { return isPhoneNumberVisible; }
    public void setIsPhoneNumberVisible(Boolean phoneNumberVisible) { isPhoneNumberVisible = phoneNumberVisible; }
}