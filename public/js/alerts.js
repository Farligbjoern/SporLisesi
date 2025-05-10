function showAlert(error, name) {
    if (!error || error === "yok") return;

    let message = "";

    switch (error) {
        case "notfound":
            message = "TC Kimlik No veya şifre yanlış!";
            break;
        case "notpassword":
            message = "Şifre alanı boş bırakılamaz!";
            break;
        case "nottc":
            message = "TC Kimlik No alanı boş bırakılamaz!";
            break;
        case "notpassortc":
            message = "TC Kimlik No ve şifre alanları boş bırakılamaz!";
            break;
        case "past_date":
            message = "Geçmiş tarihlere seans eklenemez. Lütfen bugün veya ileri bir tarih seçiniz.";
            break;
        case "expired_session":
            message = "Tarihi geçmiş seanslar düzenlenemez.";
            break;
        case "conflict_facility":
            message = "Bu salonda seçilen tarih ve saatlerde başka bir seans bulunmaktadır. Lütfen farklı bir saat veya tarih seçiniz.";
            break;
        case "conflict_personel":
            message = name + " adlı personel seçilen tarih ve saatlerde başka bir seansta görevlidir.";
            break;
        case "conflict_student":
            message = name + " adlı öğrencinin seçilen tarih ve saatlerde başka bir seansı bulunmaktadır.";
            break;
        case "tc":
            message = "Bu TC Kimlik Numarası ile kayıtlı bir öğrenci bulunmaktadır.";
            break;
        case "failed":
            message = "İşlem sırasında bir hata oluştu. Lütfen tekrar deneyiniz.";
            break;

        default:
            message = error;
            break;
    }

    if (message) {
        alert(message);
    }
}