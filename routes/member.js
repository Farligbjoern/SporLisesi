const express = require("express");
const router = express.Router();
const md5 = require('md5');
const db = require('../config/database');
const formatDate = require('../public/js/dateUtils');


const query = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
};

const isAuthenticated = (req, res, next) => {
    if (req.session.user) next();
    else res.redirect('/login');
};

const checkPermissionLevel = (minLevel) => {
    return async (req, res, next) => {
        try {
            const result = await query("SELECT * FROM personel WHERE up_id=?", [req.session.user]);
            if (result[0]?.yetki >= minLevel) next();
            else res.redirect('/');
        } catch (error) {
            console.error(error);
            res.redirect('/');
        }
    };
};


router.get("/login", async (req, res) => {
    var user = req.session.user;
    if (user) {
        res.redirect('/');
    } else {
        if (!user) {
            res.render("index/login", { error: "yok" });
        }
    }
});

router.post("/login", async (req, res) => {
    var { tc, password } = req.body;
    var password2 = md5(password);
    if (tc && password) {
        const result = await query("SELECT * FROM users WHERE tc=? AND sifre=?", [tc, password2]);
        if (result.length > 0) {
            req.session.user = result[0].id;
            res.redirect('/');
        } else {
            res.render("index/login", {
                error: "notfound",
            });
        }
    } else {
        if (tc && !password) {
            res.render("index/login", {
                error: "notpassword"
            });
        } else if (!tc && password) {
            res.render("index/login", {
                error: "nottc"
            });
        } else {
            res.render("index/login", {
                error: "notpassortc"
            });
        }
    }
});

router.get("/logout", async (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error(err);
        }
        res.redirect('/login');
    });
});


router.get('/ogrenci/kayit', [isAuthenticated, checkPermissionLevel(2)], async (req, res) => {
    const result00 = await query("SELECT * FROM personel WHERE up_id=?", [req.session.user]);
    res.render('user/ogrenci_kayit', {
        error: "yok",
        error_type: "yok",
        data: result00[0]
    });
});

router.post('/ogrenci/kayit', [isAuthenticated, checkPermissionLevel(2)], async (req, res) => {
    try {
        const {
            ogrenci_tc,
            ogrenci_ad,
            ogrenci_soyad,
            ogrenci_cinsiyet,
            ogrenci_dogum,
            ogrenci_telno,
            ogrenci_mail,
            ogrenci_sakatlik,
            veli_tc,
            veli_ad,
            veli_soyad,
            veli_tel,
            veli_mail
        } = req.body;

        // Form validasyonu
        const gerekli_form = {
            'ogrenci_tc': 'Öğrenci TC',
            'ogrenci_ad': 'Öğrenci Adı',
            'ogrenci_soyad': 'Öğrenci Soyadı',
            'ogrenci_cinsiyet': 'Öğrenci Cinsiyeti',
            'ogrenci_dogum': 'Öğrenci Doğum Tarihi',
            'ogrenci_telno': 'Öğrenci Telefon',
            'ogrenci_mail': 'Öğrenci E-posta',
            'veli_tc': 'Veli TC',
            'veli_ad': 'Veli Adı',
            'veli_soyad': 'Veli Soyadı',
            'veli_tel': 'Veli Telefon',
            'veli_mail': 'Veli E-posta'
        };

        // Boş alan kontrolü
        const gerekli_form2 = Object.keys(gerekli_form).find(field => !req.body[field]);
        if (gerekli_form2) {
            const result00 = await query("SELECT * FROM personel WHERE up_id=?", [req.session.user]);
            return res.render('user/ogrenci_kayit', {
                error_type: "bosalan",
                error: `${gerekli_form[gerekli_form2]} alanı boş bırakılamaz.`,
                data: result00[0]
            });
        }

        // TC kontrolü
        const existingUser = await query("SELECT * FROM users WHERE tc=?", [ogrenci_tc]);
        if (existingUser.length > 0) {
            const result00 = await query("SELECT * FROM personel WHERE up_id=?", [req.session.user]);
            return res.render('user/ogrenci_kayit', {
                error_type: "tc",
                error: "Bu TC Kimlik Numarası ile kayıtlı bir öğrenci bulunmaktadır.",
                data: result00[0]
            });
        }

        // Transaction başlat
        await query('START TRANSACTION');

        try {
            // Önce users tablosuna ekle
            const userResult = await query(
                "INSERT INTO users (tc) VALUES (?)",
                [ogrenci_tc]
            );

            if (!userResult.insertId) {
                throw new Error("Kullanıcı kaydı oluşturulamadı");
            }

            // Sonra öğrenci tablosuna ekle
            const ogrenciResult = await query(
                `INSERT INTO ogrenci (
                    up_id, ogrenci_tc, isim, soyisim, cinsiyet, dogum_tarihi, 
                    telno, mail, sakatlık_tarihi, veli_tc, veli_isim, 
                    veli_soyisim, veli_telno, veli_mail
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userResult.insertId,
                    ogrenci_tc,
                    ogrenci_ad,
                    ogrenci_soyad,
                    ogrenci_cinsiyet,
                    ogrenci_dogum,
                    ogrenci_telno,
                    ogrenci_mail,
                    ogrenci_sakatlik || '0001-01-01',
                    veli_tc,
                    veli_ad,
                    veli_soyad,
                    veli_tel,
                    veli_mail
                ]
            );

            // İşlem başarılı, commit
            await query('COMMIT');
            res.redirect('/ogrenci/all');

        } catch (error) {
            // Hata durumunda rollback
            await query('ROLLBACK');
            const result00 = await query("SELECT * FROM personel WHERE up_id=?", [req.session.user]);
            res.render('user/ogrenci_kayit', {
                error_type: "kayit",
                error: "Öğrenci kaydedilirken bir hata oluştu: " + error.message,
                data: result00[0]
            });
        }
    } catch (error) {
        console.error("Genel hata:", error);
        const result00 = await query("SELECT * FROM personel WHERE up_id=?", [req.session.user]);
        res.render('user/ogrenci_kayit', {
            error_type: "kayit",
            error: "İşlem sırasında bir hata oluştu",
            data: result00[0]
        });
    }
});

router.get('/ogrenci/all', [isAuthenticated, checkPermissionLevel(1)], async (req, res) => {
    const result00 = await query("SELECT * FROM personel WHERE up_id=?", [req.session.user]);
    const ogrenciler = await query("SELECT * FROM ogrenci ORDER BY isim ASC");
    res.render('user/ogrenci_all', {
        ogrenciler: ogrenciler,
        data: result00[0]
    });
});

router.get('/ogrenci/view/:id', [isAuthenticated, checkPermissionLevel(1)], async (req, res) => {
    var id = req.session.user;
    const ogrenciId = req.params.id;

    if (id) {
        const result00 = await query("SELECT * FROM personel WHERE up_id=?", [id]);
        if (result00[0].yetki >= 1) {
            const ogrenci = await query("SELECT * FROM ogrenci WHERE id=?", [ogrenciId]);
            const aidatlar = await query(`SELECT o.* FROM odemeler o INNER JOIN ogrenci og ON og.id = o.odenen_id WHERE o.odenen_id = ? ORDER BY o.odenen_tarih DESC`, [ogrenciId]);
            const yoklamalar = await query(`
                SELECT y.*, p.isim as personel_isim, p.soyisim as personel_soyisim
                FROM yoklama y
                INNER JOIN personel p ON p.id = y.personel_id
                WHERE y.ogrenci_id = ?
                ORDER BY y.tarih DESC
                LIMIT 30
            `, [ogrenciId]);

            if (ogrenci.length > 0) {
                const ogrenci_tc = await query("SELECT * FROM users WHERE tc=?", [ogrenci[0].ogrenci_tc]);
                res.render('user/ogrenci_view', {
                    error: "yok",
                    error_type: "yok",
                    data: result00[0],
                    ogrenci: ogrenci[0],
                    ogrenciTc: ogrenci_tc[0].tc,
                    aidatlar: aidatlar.length > 0 ? aidatlar : [],
                    yoklamalar: yoklamalar,
                    formatDate
                });
            } else {
                res.redirect('/ogrenci/all');
            }
        } else {
            res.redirect('/');
        }
    } else {
        res.redirect('/login');
    }
});

router.post('/ogrenci/view/:id', [isAuthenticated, checkPermissionLevel(2)], async (req, res) => {
    var id = req.session.user;
    const ogrenciId = req.params.id;
    const {
        ogrenci_tc,
        ogrenci_isim,
        ogrenci_soyisim,
        ogrenci_cinsiyet,
        ogrenci_dogum_tarihi,
        ogrenci_mail,
        ogrenci_telno,
        sakatlik,
        veli_tc,
        veli_isim,
        veli_soyisim,
        veli_mail,
        veli_telno
    } = req.body;

    if (id) {
        const result00 = await query("SELECT * FROM personel WHERE up_id=?", [id]);
        if (result00[0].yetki == 1 || result00[0].yetki == 2) {
            const updateOgrenci = await query(
                `UPDATE ogrenci SET isim=?, soyisim=?, cinsiyet=?, dogum_tarihi=?, mail=?, telno=?, sakatlık_tarihi=?, veli_tc=?, veli_isim=?, veli_soyisim=?, veli_mail=?, veli_telno=? WHERE id=?`,
                [
                    ogrenci_isim, ogrenci_soyisim, ogrenci_cinsiyet, ogrenci_dogum_tarihi, ogrenci_mail, ogrenci_telno, sakatlik || '0001-01-01', veli_tc, veli_isim, veli_soyisim, veli_mail, veli_telno, ogrenciId
                ]
            );

            const updateTC = await query("UPDATE users SET tc=? WHERE id=?", [ogrenci_tc, ogrenciId]);

            if (updateOgrenci && updateTC) {
                const ogrenci = await query("SELECT * FROM ogrenci WHERE id=?", [ogrenciId]);
                const ogrenci_tc = await query("SELECT * FROM users WHERE id=?", [ogrenciId]);

                res.render('user/ogrenci_view', {
                    error: "Öğrenci bilgileri başarıyla güncellendi.",
                    error_type: "success",
                    data: result00[0],
                    ogrenci: ogrenci[0],
                    ogrenciTc: ogrenci_tc[0].tc
                });
            } else {
                res.render('user/ogrenci_view', {
                    error: "Öğrenci bilgileri güncellenirken bir hata oluştu.",
                    error_type: "error",
                    data: result00[0],
                    ogrenci: ogrenci[0],
                    ogrenciTc: ogrenci_tc[0].tc
                });
            }
        } else {
            res.redirect('/');
        }
    } else {
        res.redirect('/login');
    }
});

router.get('/personel/kayit', [isAuthenticated, checkPermissionLevel(2)], async (req, res) => {
    const result00 = await query("SELECT * FROM personel WHERE up_id=?", [req.session.user]);
    res.render('user/personel_kayit', {
        error: "yok",
        error_type: "yok",
        data: result00[0]
    });
});

router.post('/personel/kayit', [isAuthenticated, checkPermissionLevel(2)], async (req, res) => {
    try {
        const {
            tc,
            yetki,
            isim,
            soyisim,
            cinsiyet,
            telno,
            mail,
            dogum_tarihi,
            departman,
            izin_durumu
        } = req.body;

        // Form validasyonu
        const gerekli_form = {
            'tc': 'TC Kimlik No',
            'isim': 'İsim',
            'soyisim': 'Soyisim',
            'cinsiyet': 'Cinsiyet',
            'telno': 'Telefon Numarası',
            'mail': 'Mail Adresi',
            'dogum_tarihi': 'Doğum Tarihi',
            'departman': 'Departman'
        };

        const gerekli_form2 = Object.keys(gerekli_form).find(field => !req.body[field]);
        if (gerekli_form2) {
            const result00 = await query("SELECT * FROM personel WHERE up_id=?", [req.session.user]);
            return res.render('user/personel_kayit', {
                error_type: "bosalan",
                error: `${gerekli_form[gerekli_form2]} alanı boş bırakılamaz.`,
                data: result00[0]
            });
        }

        // TC kontrolü
        const existingUser = await query("SELECT * FROM users WHERE tc=?", [tc]);
        if (existingUser.length > 0) {
            const result00 = await query("SELECT * FROM personel WHERE up_id=?", [req.session.user]);
            return res.render('user/personel_kayit', {
                error_type: "tc",
                error: "Bu TC Kimlik Numarası ile kayıtlı bir personel bulunmaktadır.",
                data: result00[0]
            });
        }

        // Transaction başlat
        await query('START TRANSACTION');

        try {
            // Önce users tablosuna ekle
            const userResult = await query(
                "INSERT INTO users (tc) VALUES (?)",
                [tc]
            );

            if (!userResult.insertId) {
                throw new Error("Kullanıcı kaydı oluşturulamadı");
            }

            // Sonra personel tablosuna ekle
            const personelResult = await query(
                `INSERT INTO personel (
                    up_id, yetki, isim, soyisim, cinsiyet, telno, mail, 
                    dogum_tarihi, departman, izin_durumu
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userResult.insertId,
                    yetki || 1,
                    isim,
                    soyisim,
                    cinsiyet,
                    telno,
                    mail,
                    dogum_tarihi,
                    departman,
                    izin_durumu || '0001-01-01'
                ]
            );

            // İşlem başarılı, commit
            await query('COMMIT');
            res.redirect('/personel/all');

        } catch (error) {
            // Hata durumunda rollback
            await query('ROLLBACK');
            const result00 = await query("SELECT * FROM personel WHERE up_id=?", [req.session.user]);
            res.render('user/personel_kayit', {
                error_type: "kayit",
                error: "Personel kaydedilirken bir hata oluştu: " + error.message,
                data: result00[0]
            });
        }
    } catch (error) {
        console.error("Genel hata:", error);
        const result00 = await query("SELECT * FROM personel WHERE up_id=?", [req.session.user]);
        res.render('user/personel_kayit', {
            error_type: "kayit",
            error: "İşlem sırasında bir hata oluştu",
            data: result00[0]
        });
    }
});

router.get('/personel/all', [isAuthenticated, checkPermissionLevel(1)], async (req, res) => {
    const result00 = await query("SELECT * FROM personel WHERE up_id=?", [req.session.user]);
    const personeller = await query("SELECT * FROM personel ORDER BY id DESC");
    res.render('user/personel_all', {
        personeller: personeller,
        data: result00[0],
        error: null
    });
});

router.get('/personel/view/:id', [isAuthenticated, checkPermissionLevel(1)], async (req, res) => {
    try {
        const personelId = req.params.id;
        const result00 = await query("SELECT * FROM personel WHERE up_id=?", [req.session.user]);
        const personel = await query("SELECT p.*, u.tc FROM personel p JOIN users u ON p.up_id = u.id WHERE p.id=?", [personelId]);
        const maas = await query(`
            SELECT o.*
            FROM odemeler o
            WHERE o.odenen_id = ? 
            AND EXISTS (
                SELECT 1 FROM personel WHERE id = o.odenen_id
            )
            AND o.odeme_aciklama LIKE '%Maaş%'
            ORDER BY o.odenen_tarih DESC`,
            [personelId]
        );
        const yoklamalar = await query(`
            SELECT y.*, p.isim as yonetici_isim, p.soyisim as yonetici_soyisim
            FROM personel_yoklama y
            INNER JOIN personel p ON p.id = y.yonetici_id
            WHERE y.personel_id = ?
            ORDER BY y.tarih DESC
            LIMIT 30
        `, [personelId]);

        if (!personel.length) {
            return res.redirect('/personel/all');
        }

        res.render('user/personel_view', {
            error: "yok",
            error_type: "yok",
            data: result00[0],
            personel: personel[0],
            maas: maas.length > 0 ? maas : "yok",
            yoklamalar: yoklamalar,
            personelTc: personel[0].tc,
            formatDate
        });
    } catch (error) {
        console.error(error);
        res.redirect('/personel/all');
    }
});

router.post('/personel/view/:id', [isAuthenticated, checkPermissionLevel(2)], async (req, res) => {
    try {
        const personelId = req.params.id;
        const {
            personel_tc,
            personel_isim,
            personel_soyisim,
            personel_cinsiyet,
            personel_dogum_tarihi,
            personel_mail,
            personel_telno,
            personel_departman,
            personel_maas,
            personel_maas_doviz,
            personel_izin
        } = req.body;

        const updatePersonel = await query(
            `UPDATE personel SET isim=?, soyisim=?, cinsiyet=?, dogum_tarihi=?, mail=?, telno=?, departman=?, personel_maas=?, personel_maas_doviz=?, izin_durumu=? WHERE id=?`,
            [
                personel_isim, personel_soyisim, personel_cinsiyet, personel_dogum_tarihi, personel_mail, personel_telno, personel_departman, personel_maas, personel_maas_doviz, personel_izin || '0001-01-01', personelId
            ]
        );

        const updateTC = await query(
            "UPDATE users SET tc=? WHERE id=?",
            [personel_tc, personelId]
        );

        const result00 = await query("SELECT * FROM personel WHERE up_id=?", [req.session.user]);
        const personel = await query("SELECT * FROM personel WHERE id=?", [personelId]);
        const maas = await query("SELECT * FROM odemeler WHERE odenen_id=?", [personelId]);
        const personel_tc_new = await query("SELECT * FROM users WHERE id=?", [personelId]);

        res.render('user/personel_view', {
            error: updatePersonel && updateTC ? "Personel bilgileri başarıyla güncellendi." : "Personel bilgileri güncellenirken bir hata oluştu.",
            error_type: updatePersonel && updateTC ? "success" : "error",
            data: result00[0],
            personel: personel[0],
            maas: maas.length > 0 ? maas : "yok",
            personelTc: personel_tc_new[0].tc
        });
    } catch (error) {
        console.error(error);
        res.redirect('/personel/all');
    }
});

// Payment Routes
router.get('/personel/pay', [isAuthenticated, checkPermissionLevel(2)], async (req, res) => {
    try {
        const result00 = await query("SELECT * FROM personel WHERE up_id=?", [req.session.user]);
        const personeller = await query("SELECT * FROM personel ORDER BY isim ASC");
        const odemeler = await query(`
            SELECT o.*, p.isim as odenen_isim, p.soyisim as odenen_soyisim 
            FROM odemeler o 
            INNER JOIN personel p ON p.id = o.odenen_id 
            WHERE EXISTS (
                SELECT 1 FROM personel WHERE id = o.odenen_id
            )
            ORDER BY o.odenen_tarih DESC LIMIT 10
        `);

        res.render('user/personel_pay', {
            error: "yok",
            error_type: "yok",
            data: result00[0],
            personeller: personeller,
            odemeler: odemeler
        });
    } catch (error) {
        console.error(error);
        res.redirect('/');
    }
});

router.post('/personel/pay', [isAuthenticated, checkPermissionLevel(2)], async (req, res) => {
    try {
        const {
            odenen_id,
            odeme_miktari,
            odeme_sekli,
            odeme_aciklama
        } = req.body;

        const odeyen = await query("SELECT * FROM personel WHERE up_id=?", [req.session.user]);
        const odeyen_tc = await query("SELECT * FROM users WHERE id=?", [req.session.user]);

        const kaydet_odeme = await query(
            `INSERT INTO odemeler (
                odeyen_tc, 
                odeyen_isim, 
                odeyen_soyisim, 
                odenen_id, 
                odenen_tarih, 
                odeme_miktari, 
                odeme_sekli, 
                odeme_aciklama
            ) VALUES (?, ?, ?, ?, NOW(), ?, ?, ?)`,
            [
                odeyen_tc[0].tc,
                odeyen[0].isim,
                odeyen[0].soyisim,
                odenen_id,
                odeme_miktari,
                odeme_sekli,
                odeme_aciklama || 'Maaş ödemesi'
            ]
        );

        if (kaydet_odeme) {
            res.redirect('/personel/pay');
        } else {
            const result00 = await query("SELECT * FROM personel WHERE up_id=?", [req.session.user]);
            const personeller = await query("SELECT * FROM personel ORDER BY isim ASC");
            const odemeler = await query(`
                SELECT o.*, p.isim as odenen_isim, p.soyisim as odenen_soyisim 
                FROM odemeler o 
                INNER JOIN personel p ON p.id = o.odenen_id 
                WHERE EXISTS (
                    SELECT 1 FROM personel WHERE id = o.odenen_id
                )
                ORDER BY o.odenen_tarih DESC LIMIT 10
            `);

            res.render('user/personel_pay', {
                error: "Ödeme kaydedilirken bir hata oluştu.",
                error_type: "error",
                data: result00[0],
                personeller: personeller,
                odemeler: odemeler
            });
        }
    } catch (error) {
        console.error(error);
        res.redirect('/personel/pay');
    }
});

router.get('/ogrenci/pay', [isAuthenticated, checkPermissionLevel(2)], async (req, res) => {
    try {
        const result00 = await query("SELECT * FROM personel WHERE up_id=?", [req.session.user]);
        const ogrenciler = await query("SELECT * FROM ogrenci ORDER BY isim ASC");
        const odemeler = await query(`
            SELECT o.*, og.isim as odenen_isim, og.soyisim as odenen_soyisim 
            FROM odemeler o 
            INNER JOIN ogrenci og ON og.id = o.odenen_id 
            WHERE EXISTS (
                SELECT 1 FROM ogrenci WHERE id = o.odenen_id
            )
            ORDER BY o.odenen_tarih DESC LIMIT 10
        `);

        res.render('user/ogrenci_pay', {
            error: "yok",
            error_type: "yok",
            data: result00[0],
            ogrenciler: ogrenciler,
            odemeler: odemeler
        });
    } catch (error) {
        console.error(error);
        res.redirect('/');
    }
});

router.post('/ogrenci/pay', [isAuthenticated, checkPermissionLevel(2)], async (req, res) => {
    try {
        const {
            odenen_id,
            odeme_miktari,
            odeme_sekli,
            odeme_aciklama,
            odeyen_tc,
            odeyen_isim,
            odeyen_soyisim
        } = req.body;

        const kaydet_odeme = await query(
            `INSERT INTO odemeler (
                odeyen_tc, 
                odeyen_isim, 
                odeyen_soyisim, 
                odenen_id, 
                odenen_tarih, 
                odeme_miktari, 
                odeme_sekli, 
                odeme_aciklama
            ) VALUES (?, ?, ?, ?, NOW(), ?, ?, ?)`,
            [
                odeyen_tc,
                odeyen_isim,
                odeyen_soyisim,
                odenen_id,
                odeme_miktari,
                odeme_sekli,
                odeme_aciklama || 'Aidat ödemesi'
            ]
        );

        if (kaydet_odeme) {
            res.redirect('/ogrenci/pay');
        } else {
            const result00 = await query("SELECT * FROM personel WHERE up_id=?", [req.session.user]);
            const ogrenciler = await query("SELECT * FROM ogrenci ORDER BY isim ASC");
            const odemeler = await query(`
                SELECT o.*, og.isim as odenen_isim, og.soyisim as odenen_soyisim 
                FROM odemeler o 
                INNER JOIN ogrenci og ON og.id = o.odenen_id 
                WHERE EXISTS (
                    SELECT 1 FROM ogrenci WHERE id = o.odenen_id
                )
                ORDER BY o.odenen_tarih DESC LIMIT 10
            `);

            res.render('user/ogrenci_pay', {
                error: "Ödeme kaydedilirken bir hata oluştu.",
                error_type: "error",
                data: result00[0],
                ogrenciler: ogrenciler,
                odemeler: odemeler
            });
        }
    } catch (error) {
        console.error(error);
        res.redirect('/ogrenci/pay');
    }
});

module.exports = router;
