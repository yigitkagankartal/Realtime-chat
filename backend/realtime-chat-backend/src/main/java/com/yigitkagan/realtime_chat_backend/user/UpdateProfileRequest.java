package com.yigitkagan.realtime_chat_backend.user;

public class UpdateProfileRequest {
    private String displayName;
    private String about;
    private String profilePictureUrl;
    private Boolean isPhoneNumberHidden;

    // Getter ve Setter'lar
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public String getAbout() { return about; }
    public void setAbout(String about) { this.about = about; }

    public String getProfilePictureUrl() { return profilePictureUrl; }
    public void setProfilePictureUrl(String profilePictureUrl) { this.profilePictureUrl = profilePictureUrl; }

    public Boolean getIsPhoneNumberHidden() { return isPhoneNumberHidden; }
    public void setIsPhoneNumberHidden(Boolean isPhoneNumberHidden) { this.isPhoneNumberHidden = isPhoneNumberHidden; }
}