const express = require("express");
const router = express.Router();
const db = require('../config/database');


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


/* Seanslar */
router.get('/seanslar', [isAuthenticated, checkPermissionLevel(2)], async (req, res) => {
    try {
        const result00 = await query("SELECT * FROM personel WHERE up_id=?", [req.session.user]);
        const personeller = await query("SELECT * FROM personel ORDER BY isim ASC");
        const ogrenciler = await query("SELECT * FROM ogrenci ORDER BY isim ASC");
        const tesisler = await query("SELECT * FROM tesisler WHERE aktif = 1 ORDER BY tesis_adi ASC");
        const seanslar = await query(`
            SELECT s.*, t.tesis_adi,
            GROUP_CONCAT(DISTINCT p.isim, ' ', p.soyisim) as personel_isimleri,
            COUNT(DISTINCT so.ogrenci_id) as uye_sayisi
            FROM seanslar s
            LEFT JOIN tesisler t ON s.tesis_id = t.id
            LEFT JOIN seans_personel sp ON s.id = sp.seans_id
            LEFT JOIN personel p ON sp.personel_id = p.id
            LEFT JOIN seans_ogrenci so ON s.id = so.seans_id
            GROUP BY s.id
            ORDER BY s.seans_tarihi ASC, s.baslangic_saati ASC
        `);

        for (let seans of seanslar) {
            const personelResults = await query(`
                SELECT personel_id
                FROM seans_personel
                WHERE seans_id = ?
            `, [seans.id]);
            seans.personel_ids = personelResults.map(p => p.personel_id);
            const ogrenciResults = await query(`
                SELECT ogrenci_id
                FROM seans_ogrenci
                WHERE seans_id = ?
            `, [seans.id]);
            seans.ogrenci_ids = ogrenciResults.map(o => o.ogrenci_id);
        }

        res.render('management/seanslar', {
            error: req.query.error || "yok",
            error_type: "yok",
            data: result00[0],
            personeller,
            ogrenciler,
            tesisler,
            seanslar
        });
    } catch (error) {
        console.error(error);
        res.redirect('/');
    }
});

router.post('/seanslar/ekle', [isAuthenticated, checkPermissionLevel(2)], async (req, res) => {
    try {
        const {
            seans_adi,
            seans_tarihi,
            baslangic_saati,
            bitis_saati,
            kapasite,
            tesis,
            personeller,
            ogrenciler
        } = req.body;
        const today = new Date().toISOString().split('T')[0];
        if (seans_tarihi < today) {
            return res.redirect('/seanslar?error=past_date');
        }
        const existingSessionInFacility = await query(
            `SELECT * FROM seanslar 
            WHERE tesis_id = ? AND seans_tarihi = ? AND (
                (? BETWEEN baslangic_saati AND bitis_saati) OR
                (? BETWEEN baslangic_saati AND bitis_saati) OR
                (baslangic_saati BETWEEN ? AND ?) OR
                (bitis_saati BETWEEN ? AND ?)
            )`,
            [tesis, seans_tarihi, baslangic_saati, bitis_saati, baslangic_saati, bitis_saati, baslangic_saati, bitis_saati]
        );

        if (existingSessionInFacility.length > 0) {
            return res.redirect('/seanslar?error=conflict_facility');
        }
        if (Array.isArray(personeller) && personeller.length > 0) {
            const existingSessionForPersonel = await query(
                `SELECT DISTINCT s.*, p.isim, p.soyisim
                FROM seanslar s
                INNER JOIN seans_personel sp ON s.id = sp.seans_id
                INNER JOIN personel p ON sp.personel_id = p.id
                WHERE sp.personel_id IN (?) 
                AND s.seans_tarihi = ?
                AND (
                    (? BETWEEN s.baslangic_saati AND s.bitis_saati) OR
                    (? BETWEEN s.baslangic_saati AND s.bitis_saati) OR
                    (s.baslangic_saati BETWEEN ? AND ?) OR
                    (s.bitis_saati BETWEEN ? AND ?)
                )`,
                [personeller, seans_tarihi, baslangic_saati, bitis_saati, baslangic_saati, bitis_saati, baslangic_saati, bitis_saati]
            );

            if (existingSessionForPersonel.length > 0) {
                const conflictingPersonel = existingSessionForPersonel[0];
                return res.redirect(`/seanslar?error=conflict_personel&name=${encodeURIComponent(conflictingPersonel.isim + ' ' + conflictingPersonel.soyisim)}`);
            }
        }
        if (Array.isArray(ogrenciler) && ogrenciler.length > 0) {
            const existingSessionForStudent = await query(
                `SELECT DISTINCT s.*, o.isim, o.soyisim
                FROM seanslar s
                INNER JOIN seans_ogrenci so ON s.id = so.seans_id
                INNER JOIN ogrenci o ON so.ogrenci_id = o.id
                WHERE so.ogrenci_id IN (?) 
                AND s.seans_tarihi = ?
                AND (
                    (? BETWEEN s.baslangic_saati AND s.bitis_saati) OR
                    (? BETWEEN s.baslangic_saati AND s.bitis_saati) OR
                    (s.baslangic_saati BETWEEN ? AND ?) OR
                    (s.bitis_saati BETWEEN ? AND ?)
                )`,
                [ogrenciler, seans_tarihi, baslangic_saati, bitis_saati, baslangic_saati, bitis_saati, baslangic_saati, bitis_saati]
            );

            if (existingSessionForStudent.length > 0) {
                const conflictingStudent = existingSessionForStudent[0];
                return res.redirect(`/seanslar?error=conflict_student&name=${encodeURIComponent(conflictingStudent.isim + ' ' + conflictingStudent.soyisim)}`);
            }
        }
        await query('START TRANSACTION');
        const result = await query(
            "INSERT INTO seanslar (seans_adi, seans_tarihi, baslangic_saati, bitis_saati, kapasite, tesis_id) VALUES (?, ?, ?, ?, ?, ?)",
            [seans_adi, seans_tarihi, baslangic_saati, bitis_saati, kapasite, tesis]
        );

        const seansId = result.insertId;
        if (Array.isArray(personeller)) {
            for (const personelId of personeller) {
                await query(
                    "INSERT INTO seans_personel (seans_id, personel_id) VALUES (?, ?)",
                    [seansId, personelId]
                );
            }
        }
        if (Array.isArray(ogrenciler)) {
            for (const ogrenciId of ogrenciler) {
                await query(
                    "INSERT INTO seans_ogrenci (seans_id, ogrenci_id) VALUES (?, ?)",
                    [seansId, ogrenciId]
                );
            }
        }
        await query('COMMIT');
        res.redirect('/seanslar');
    } catch (error) {
        await query('ROLLBACK');
        console.error(error);
        res.redirect('/seanslar?error=failed');
    }
});

router.post('/seanslar/duzenle/:id', [isAuthenticated, checkPermissionLevel(2)], async (req, res) => {
    try {
        const seansId = req.params.id;
        const {
            seans_adi,
            seans_tarihi,
            baslangic_saati,
            bitis_saati,
            kapasite,
            tesis,
            personeller,
            ogrenciler
        } = req.body;
        const currentSession = await query("SELECT seans_tarihi FROM seanslar WHERE id = ?", [seansId]);
        const today = new Date().toISOString().split('T')[0];

        if (currentSession[0].seans_tarihi < today) {
            return res.redirect(`/seanslar/duzenle/${seansId}?error=expired_session`);
        }
        if (seans_tarihi < today) {
            return res.redirect(`/seanslar/duzenle/${seansId}?error=past_date`);
        }
        const existingSessionInFacility = await query(
            `SELECT * FROM seanslar 
            WHERE tesis_id = ? AND id != ? AND seans_tarihi = ? AND (
                (? BETWEEN baslangic_saati AND bitis_saati) OR
                (? BETWEEN baslangic_saati AND bitis_saati) OR
                (baslangic_saati BETWEEN ? AND ?) OR
                (bitis_saati BETWEEN ? AND ?)
            )`,
            [tesis, seansId, seans_tarihi, baslangic_saati, bitis_saati, baslangic_saati, bitis_saati, baslangic_saati, bitis_saati]
        );

        if (existingSessionInFacility.length > 0) {
            return res.redirect(`/seanslar/duzenle/${seansId}?error=conflict_facility`);
        }
        if (Array.isArray(personeller) && personeller.length > 0) {
            const existingSessionForPersonel = await query(
                `SELECT DISTINCT s.*, p.isim, p.soyisim
                FROM seanslar s
                INNER JOIN seans_personel sp ON s.id = sp.seans_id
                INNER JOIN personel p ON sp.personel_id = p.id
                WHERE sp.personel_id IN (?) 
                AND s.id != ?
                AND s.seans_tarihi = ?
                AND (
                    (? BETWEEN s.baslangic_saati AND s.bitis_saati) OR
                    (? BETWEEN s.baslangic_saati AND s.bitis_saati) OR
                    (s.baslangic_saati BETWEEN ? AND ?) OR
                    (s.bitis_saati BETWEEN ? AND ?)
                )`,
                [personeller, seansId, seans_tarihi, baslangic_saati, bitis_saati, baslangic_saati, bitis_saati, baslangic_saati, bitis_saati]
            );

            if (existingSessionForPersonel.length > 0) {
                const conflictingPersonel = existingSessionForPersonel[0];
                return res.redirect(`/seanslar/duzenle/${seansId}?error=conflict_personel&name=${encodeURIComponent(conflictingPersonel.isim + ' ' + conflictingPersonel.soyisim)}`);
            }
        }
        if (Array.isArray(ogrenciler) && ogrenciler.length > 0) {
            const existingSessionForStudent = await query(
                `SELECT DISTINCT s.*, o.isim, o.soyisim
                FROM seanslar s
                INNER JOIN seans_ogrenci so ON s.id = so.seans_id
                INNER JOIN ogrenci o ON so.ogrenci_id = o.id
                WHERE so.ogrenci_id IN (?) 
                AND s.id != ?
                AND s.seans_tarihi = ?
                AND (
                    (? BETWEEN s.baslangic_saati AND s.bitis_saati) OR
                    (? BETWEEN s.baslangic_saati AND s.bitis_saati) OR
                    (s.baslangic_saati BETWEEN ? AND ?) OR
                    (s.bitis_saati BETWEEN ? AND ?)
                )`,
                [ogrenciler, seansId, seans_tarihi, baslangic_saati, bitis_saati, baslangic_saati, bitis_saati, baslangic_saati, bitis_saati]
            );

            if (existingSessionForStudent.length > 0) {
                const conflictingStudent = existingSessionForStudent[0];
                return res.redirect(`/seanslar/duzenle/${seansId}?error=conflict_student&name=${encodeURIComponent(conflictingStudent.isim + ' ' + conflictingStudent.soyisim)}`);
            }
        }
        await query('START TRANSACTION');
        await query(
            "UPDATE seanslar SET seans_adi = ?, seans_tarihi = ?, baslangic_saati = ?, bitis_saati = ?, kapasite = ?, tesis_id = ? WHERE id = ?",
            [seans_adi, seans_tarihi, baslangic_saati, bitis_saati, kapasite, tesis, seansId]
        );
        await query("DELETE FROM seans_personel WHERE seans_id = ?", [seansId]);
        if (Array.isArray(personeller)) {
            for (const personelId of personeller) {
                await query(
                    "INSERT INTO seans_personel (seans_id, personel_id) VALUES (?, ?)",
                    [seansId, personelId]
                );
            }
        }
        await query("DELETE FROM seans_ogrenci WHERE seans_id = ?", [seansId]);
        if (Array.isArray(ogrenciler)) {
            for (const ogrenciId of ogrenciler) {
                await query(
                    "INSERT INTO seans_ogrenci (seans_id, ogrenci_id) VALUES (?, ?)",
                    [seansId, ogrenciId]
                );
            }
        }
        await query('COMMIT');
        res.redirect('/seanslar');
    } catch (error) {
        await query('ROLLBACK');
        console.error(error);
        res.redirect(`/seanslar/duzenle/${seansId}?error=failed`);
    }
});

router.get('/seanslar/duzenle/:id', [isAuthenticated, checkPermissionLevel(2)], async (req, res) => {
    try {
        const seansId = req.params.id;
        const result00 = await query("SELECT * FROM personel WHERE up_id=?", [req.session.user]);
        const today = new Date().toISOString().split('T')[0];
        const seans = (await query(`
            SELECT s.*, t.tesis_adi 
            FROM seanslar s
            LEFT JOIN tesisler t ON s.tesis_id = t.id
            WHERE s.id = ?
        `, [seansId]))[0];

        if (!seans) {
            return res.redirect('/seanslar');
        }
        if (seans.seans_tarihi < today) {
            return res.redirect('/seanslar?error=expired_session');
        }
        const personeller = await query("SELECT * FROM personel ORDER BY isim ASC");
        const ogrenciler = await query("SELECT * FROM ogrenci ORDER BY isim ASC");
        const tesisler = await query("SELECT * FROM tesisler WHERE aktif = 1 ORDER BY tesis_adi ASC");
        const sporDallari = await query("SELECT * FROM spor_dallari WHERE aktif = 1 ORDER BY spor_adi ASC");
        const personelResults = await query(`
            SELECT p.id, p.isim, p.soyisim 
            FROM seans_personel sp
            INNER JOIN personel p ON p.id = sp.personel_id
            WHERE sp.seans_id = ?
        `, [seansId]);
        seans.personel_ids = personelResults.map(p => p.id);
        seans.personel_isimleri = personelResults.map(p => `${p.isim} ${p.soyisim}`).join(", ");
        const ogrenciResults = await query(`
            SELECT o.id, o.isim, o.soyisim
            FROM seans_ogrenci so
            INNER JOIN ogrenci o ON o.id = so.ogrenci_id
            WHERE so.seans_id = ?
        `, [seansId]);
        seans.ogrenci_ids = ogrenciResults.map(o => o.id);
        seans.ogrenci_isimleri = ogrenciResults.map(o => `${o.isim} ${o.soyisim}`).join(", ");

        res.render('management/seans_duzenle', {
            error: req.query.error || "yok",
            error_type: "yok",
            data: result00[0],
            seans,
            personeller,
            ogrenciler,
            tesisler,
            sporDallari
        });
    } catch (error) {
        console.error(error);
        res.redirect('/seanslar');
    }
});

router.get('/seanslar/sil/:id', [isAuthenticated, checkPermissionLevel(2)], async (req, res) => {
    try {
        const seansId = req.params.id;
        await query('START TRANSACTION');
        await query("DELETE FROM seans_personel WHERE seans_id = ?", [seansId]);
        await query("DELETE FROM seans_ogrenci WHERE seans_id = ?", [seansId]);
        await query("DELETE FROM seanslar WHERE id = ?", [seansId]);

        await query('COMMIT');
        res.redirect('/seanslar');
    } catch (error) {
        await query('ROLLBACK');
        console.error(error);
        res.redirect('/seanslar');
    }
});
/* Seanslar */


/* Spor dallari */
router.get('/spor-dallari', [isAuthenticated, checkPermissionLevel(2)], async (req, res) => {
    try {
        const result00 = await query("SELECT * FROM personel WHERE up_id=?", [req.session.user]);
        const sporDallari = await query("SELECT * FROM spor_dallari ORDER BY id DESC");

        res.render('management/spor_dallari', {
            error: "yok",
            error_type: "yok",
            data: result00[0],
            sporDallari: sporDallari
        });
    } catch (error) {
        console.error(error);
        res.redirect('/');
    }
});

router.post('/spor-dallari/ekle', [isAuthenticated, checkPermissionLevel(2)], async (req, res) => {
    try {
        const { spor_adi, salon_tipi, aktif } = req.body;

        await query(
            "INSERT INTO spor_dallari (spor_adi, salon_tipi, aktif) VALUES (?, ?, ?)",
            [spor_adi, salon_tipi, aktif === 'on' ? 1 : 0]
        );

        res.redirect('/spor-dallari');
    } catch (error) {
        console.error(error);
        res.redirect('/spor-dallari');
    }
});

router.post('/spor-dallari/guncelle/:id', [isAuthenticated, checkPermissionLevel(2)], async (req, res) => {
    try {
        const sporId = req.params.id;
        const { aktif } = req.body;
        await query("DELETE FROM spor_dallari WHERE id = ?", [sporId]);
        res.redirect('/spor-dallari');
    } catch (error) {
        console.error(error);
        res.redirect('/spor-dallari');
    }
});
/* Spor dallari */

/*İş dalları*/
router.get('/is-dallari', [isAuthenticated, checkPermissionLevel(2)], async (req, res) => {
    try {
        const result00 = await query("SELECT * FROM personel WHERE up_id=?", [req.session.user]);
        const isDallari = await query("SELECT * FROM is_dallari ORDER BY id DESC");

        res.render('management/is_dallari', {
            error: "yok",
            error_type: "yok",
            data: result00[0],
            isDallari: isDallari
        });
    } catch (error) {
        console.error(error);
        res.redirect('/');
    }
});

router.post('/is-dallari/ekle', [isAuthenticated, checkPermissionLevel(2)], async (req, res) => {
    try {
        const { is_adi, bolum, aktif } = req.body;

        await query(
            "INSERT INTO is_dallari (is_adi, bolum, aktif) VALUES (?, ?, ?)",
            [is_adi, bolum, aktif === 'on' ? 1 : 0]
        );

        res.redirect('/is-dallari');
    } catch (error) {
        console.error(error);
        res.redirect('/is-dallari');
    }
});

router.post('/is-dallari/guncelle/:id', [isAuthenticated, checkPermissionLevel(2)], async (req, res) => {
    try {
        const isId = req.params.id;
        const { aktif } = req.body;

        await query("DELETE FROM is_dallari WHERE id = ?", [isId]);
        res.redirect('/is-dallari');
    } catch (error) {
        console.log(error);
        res.redirect('/is-dallari');
    }
});
/*İş dalları*/


/*Tesisler*/
router.get('/tesisler', [isAuthenticated, checkPermissionLevel(2)], async (req, res) => {
    try {
        const result00 = await query("SELECT * FROM personel WHERE up_id=?", [req.session.user]);
        const tesisler = await query("SELECT * FROM tesisler ORDER BY id DESC");

        res.render('management/tesisler', {
            error: "yok",
            error_type: "yok",
            data: result00[0],
            tesisler: tesisler
        });
    } catch (error) {
        console.error(error);
        res.redirect('/');
    }
});

router.post('/tesisler/ekle', [isAuthenticated, checkPermissionLevel(2)], async (req, res) => {
    try {
        const { tesis_adi, tesis_tipi, kapasite, aktif } = req.body;

        await query(
            "INSERT INTO tesisler (tesis_adi, tesis_tipi, kapasite, aktif) VALUES (?, ?, ?, ?)",
            [tesis_adi, tesis_tipi, kapasite, aktif === 'on' ? 1 : 0]
        );

        res.redirect('/tesisler');
    } catch (error) {
        console.error(error);
        res.redirect('/tesisler');
    }
});

router.post('/tesisler/guncelle/:id', [isAuthenticated, checkPermissionLevel(2)], async (req, res) => {
    try {
        const { id } = req.params;
        const { aktif } = req.body;
        await query("DELETE FROM tesisler WHERE id = ?", [id]);
        res.redirect('/tesisler');
    } catch (error) {
        console.error(error);
        res.redirect('/tesisler');
    }
});
/*Tesisler*/

/*Özel ders */

/*Özel ders */

module.exports = router;