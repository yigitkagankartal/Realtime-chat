package com.yigitkagan.realtime_chat_backend.file;

import com.cloudinary.Cloudinary;
// import com.cloudinary.utils.ObjectUtils; // Bunu kullanmıyorsan silebilirsin
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap; // EKLENDİ: Bu import eksikti
import java.util.Map;
// import java.util.UUID; // Şu an kodda kullanmadığın için silebilirsin

@Service
public class FileService {

    private final Cloudinary cloudinary;

    public FileService(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    public String uploadFile(MultipartFile file) throws IOException {
        Map<String, Object> params = new HashMap<>();

        // 1. Ana klasör ismini sabitle
        String baseFolder = "realtime_chat";
        String subFolder = "";

        // 2. Dosya tipine göre alt klasör belirle
        // Null check yapmak güvenlidir, dosya tipi boş gelirse hata patlamasın
        String contentType = file.getContentType();

        if (contentType != null && contentType.startsWith("image")) {
            subFolder = "images";
        } else if (contentType != null && contentType.startsWith("audio")) {
            subFolder = "voice_records";
        } else {
            subFolder = "documents";
        }

        // 3. Klasör parametresini ekle
        params.put("folder", baseFolder + "/" + subFolder);

        // KRİTİK AYAR: Ses ve PDF dosyalarının hata vermemesi için "auto" yapılmalı
        // Varsayılan olarak sadece resim bekler.
        params.put("resource_type", "auto");

        // Yükleme işlemi
        Map uploadResult = cloudinary.uploader().upload(file.getBytes(), params);

        // URL'i dön (Dilersen secure_url de kullanabilirsin)
        return uploadResult.get("url").toString();
    }
}