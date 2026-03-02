package com.yigitkagan.realtime_chat_backend.file;

import com.cloudinary.Cloudinary;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
@Service
public class FileService {

    private final Cloudinary cloudinary;

    public FileService(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }
    public String uploadFile(MultipartFile file) throws IOException {
        Map<String, Object> params = new HashMap<>();

        String baseFolder = "realtime_chat";
        String subFolder = "";
        String contentType = file.getContentType();
        if (contentType != null && contentType.startsWith("image")) {
            subFolder = "images";
        } else if (contentType != null && contentType.startsWith("audio")) {
            subFolder = "voice_records";
        } else {
            subFolder = "documents";
        }
        params.put("folder", baseFolder + "/" + subFolder);
        params.put("resource_type", "auto");
        Map uploadResult = cloudinary.uploader().upload(file.getBytes(), params);
        return uploadResult.get("url").toString();
    }
}