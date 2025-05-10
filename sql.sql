-- Veritabanını oluştur
CREATE DATABASE IF NOT EXISTS spor_tesisi DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE spor_tesisi;

-- Kullanıcılar tablosu
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tc VARCHAR(11) UNIQUE NOT NULL,
    sifre VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Personel tablosu
CREATE TABLE personel (
    id INT AUTO_INCREMENT PRIMARY KEY,
    up_id INT UNIQUE,
    yetki TINYINT DEFAULT 1,
    isim VARCHAR(100) NOT NULL,
    soyisim VARCHAR(100) NOT NULL,
    cinsiyet ENUM('E', 'K') NOT NULL,
    telno VARCHAR(20) NOT NULL,
    mail VARCHAR(100) NOT NULL,
    dogum_tarihi DATE NOT NULL,
    departman VARCHAR(100) NOT NULL,
    izin_durumu DATE,
    personel_maas DECIMAL(10,2),
    personel_maas_doviz VARCHAR(10) DEFAULT 'TL',
    aktif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (up_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Öğrenci tablosu
CREATE TABLE ogrenci (
    id INT AUTO_INCREMENT PRIMARY KEY,
    up_id INT UNIQUE,
    ogrenci_tc VARCHAR(11) NOT NULL,
    isim VARCHAR(100) NOT NULL,
    soyisim VARCHAR(100) NOT NULL,
    cinsiyet ENUM('E', 'K') NOT NULL,
    dogum_tarihi DATE NOT NULL,
    telno VARCHAR(20) NOT NULL,
    mail VARCHAR(100) NOT NULL,
    sakatlık_tarihi DATE,
    veli_tc VARCHAR(11) NOT NULL,
    veli_isim VARCHAR(100) NOT NULL,
    veli_soyisim VARCHAR(100) NOT NULL,
    veli_telno VARCHAR(20) NOT NULL,
    veli_mail VARCHAR(100) NOT NULL,
    aktif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (up_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Spor dalları tablosu
CREATE TABLE spor_dallari (
    id INT AUTO_INCREMENT PRIMARY KEY,
    spor_adi VARCHAR(100) NOT NULL,
    salon_tipi VARCHAR(50) NOT NULL,
    aktif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- İş dalları tablosu
CREATE TABLE is_dallari (
    id INT AUTO_INCREMENT PRIMARY KEY,
    is_adi VARCHAR(100) NOT NULL,
    bolum VARCHAR(100) NOT NULL,
    aktif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tesisler tablosu
CREATE TABLE tesisler (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tesis_adi VARCHAR(100) NOT NULL,
    tesis_tipi VARCHAR(50) NOT NULL,
    kapasite INT NOT NULL,
    aktif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seanslar tablosu
CREATE TABLE seanslar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seans_adi VARCHAR(100) NOT NULL,
    seans_tarihi DATE NOT NULL,
    baslangic_saati TIME NOT NULL,
    bitis_saati TIME NOT NULL,
    kapasite INT NOT NULL,
    tesis_id INT NOT NULL,
    aktif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tesis_id) REFERENCES tesisler(id) ON DELETE CASCADE
);

-- Seans-Personel ilişki tablosu
CREATE TABLE seans_personel (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seans_id INT NOT NULL,
    personel_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seans_id) REFERENCES seanslar(id) ON DELETE CASCADE,
    FOREIGN KEY (personel_id) REFERENCES personel(id) ON DELETE CASCADE,
    UNIQUE KEY unique_seans_personel (seans_id, personel_id)
);

-- Seans-Öğrenci ilişki tablosu
CREATE TABLE seans_ogrenci (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seans_id INT NOT NULL,
    ogrenci_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seans_id) REFERENCES seanslar(id) ON DELETE CASCADE,
    FOREIGN KEY (ogrenci_id) REFERENCES ogrenci(id) ON DELETE CASCADE,
    UNIQUE KEY unique_seans_ogrenci (seans_id, ogrenci_id)
);

-- Ödemeler tablosu
CREATE TABLE odemeler (
    id INT AUTO_INCREMENT PRIMARY KEY,
    odeyen_tc VARCHAR(11) NOT NULL,
    odeyen_isim VARCHAR(100) NOT NULL,
    odeyen_soyisim VARCHAR(100) NOT NULL,
    odenen_id INT NOT NULL,
    odenen_tarih DATETIME NOT NULL,
    odeme_miktari DECIMAL(10,2) NOT NULL,
    odeme_sekli VARCHAR(50) NOT NULL,
    odeme_aciklama TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_odenen (odenen_id),
    INDEX idx_tarih (odenen_tarih)
);

-- Personel yoklama tablosu
CREATE TABLE personel_yoklama (
    id INT AUTO_INCREMENT PRIMARY KEY,
    personel_id INT NOT NULL,
    yonetici_id INT NOT NULL,
    tarih DATETIME NOT NULL,
    durum VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (personel_id) REFERENCES personel(id) ON DELETE CASCADE,
    FOREIGN KEY (yonetici_id) REFERENCES personel(id) ON DELETE CASCADE,
    INDEX idx_tarih (tarih)
);

-- Öğrenci yoklama tablosu
CREATE TABLE yoklama (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ogrenci_id INT NOT NULL,
    personel_id INT NOT NULL,
    tarih DATETIME NOT NULL,
    durum VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ogrenci_id) REFERENCES ogrenci(id) ON DELETE CASCADE,
    FOREIGN KEY (personel_id) REFERENCES personel(id) ON DELETE CASCADE,
    INDEX idx_tarih (tarih)
);

-- Site ayarları tablosu
CREATE TABLE site_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    site_name VARCHAR(100) NOT NULL,
    mail VARCHAR(100),
    phone VARCHAR(20),
    site_description TEXT,
    logo_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Örnek yönetici kullanıcı oluşturma
INSERT INTO users (tc, sifre) VALUES ('11111111111', MD5('admin123'));
INSERT INTO personel (up_id, yetki, isim, soyisim, cinsiyet, telno, mail, dogum_tarihi, departman) 
VALUES (LAST_INSERT_ID(), 3, 'Admin', 'User', 'E', '5555555555', 'admin@example.com', '1990-01-01', 'Yönetim');

-- İndeksler
CREATE INDEX idx_users_tc ON users(tc);
CREATE INDEX idx_personel_upid ON personel(up_id);
CREATE INDEX idx_ogrenci_upid ON ogrenci(up_id);
CREATE INDEX idx_ogrenci_tc ON ogrenci(ogrenci_tc);
CREATE INDEX idx_veli_tc ON ogrenci(veli_tc);
CREATE INDEX idx_seans_tarih ON seanslar(seans_tarihi);
CREATE INDEX idx_tesisler_aktif ON tesisler(aktif);
CREATE INDEX idx_spor_dallari_aktif ON spor_dallari(aktif);
CREATE INDEX idx_is_dallari_aktif ON is_dallari(aktif);

-- Duyurular tablosu
CREATE TABLE duyurular (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    announcement TEXT NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_date (date)
);