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

router.get('/yoklama', [isAuthenticated, checkPermissionLevel(1)], async (req, res) => {
    try {
        const result00 = await query("SELECT * FROM personel WHERE up_id=?", [req.session.user]);
        const ogrenciler = await query("SELECT * FROM ogrenci ORDER BY isim ASC");
        const today = new Date().toISOString().split('T')[0];
        const yoklamalar = await query(
            "SELECT * FROM yoklama WHERE tarih = ? ORDER BY ogrenci_id",
            [today]
        );

        res.render('attendance/ogrenci_attendance', {
            error: "yok",
            error_type: "yok",
            data: result00[0],
            ogrenciler: ogrenciler,
            yoklamalar: yoklamalar
        });
    } catch (error) {
        console.error(error);
        res.redirect('/');
    }
});

router.post('/yoklama', [isAuthenticated, checkPermissionLevel(1)], async (req, res) => {
    try {
        const { ogrenci_ids, durum } = req.body;
        const today = new Date().toISOString().split('T')[0];
        const personel = await query("SELECT * FROM personel WHERE up_id=?", [req.session.user]);

        await query("DELETE FROM yoklama WHERE tarih = ?", [today]);

        for (let i = 0; i < ogrenci_ids.length; i++) {
            await query(
                `INSERT INTO yoklama (ogrenci_id, personel_id, tarih, durum) 
                VALUES (?, ?, ?, ?)`,
                [ogrenci_ids[i], personel[0].id, today, durum[i]]
            );
        }

        res.redirect('/yoklama');
    } catch (error) {
        console.error(error);
        res.redirect('/yoklama');
    }
});

router.get('/personel-yoklama', [isAuthenticated, checkPermissionLevel(2)], async (req, res) => {
    try {
        const result00 = await query("SELECT * FROM personel WHERE up_id=?", [req.session.user]);
        const personeller = await query("SELECT * FROM personel ORDER BY departman, isim ASC");
        const today = new Date().toISOString().split('T')[0];
        const yoklamalar = await query(
            "SELECT * FROM personel_yoklama WHERE tarih = ? ORDER BY personel_id",
            [today]
        );

        res.render('attendance/personel_attendance', {
            error: "yok",
            error_type: "yok",
            data: result00[0],
            personeller: personeller,
            yoklamalar: yoklamalar
        });
    } catch (error) {
        console.error(error);
        res.redirect('/');
    }
});

router.post('/personel-yoklama', [isAuthenticated, checkPermissionLevel(2)], async (req, res) => {
    try {
        const { personel_ids, durum } = req.body;
        const today = new Date().toISOString().split('T')[0];
        const yonetici = await query("SELECT * FROM personel WHERE up_id=?", [req.session.user]);

        await query("DELETE FROM personel_yoklama WHERE tarih = ?", [today]);

        for (let i = 0; i < personel_ids.length; i++) {
            await query(
                `INSERT INTO personel_yoklama (personel_id, yonetici_id, tarih, durum) 
                VALUES (?, ?, ?, ?)`,
                [personel_ids[i], yonetici[0].id, today, durum[i]]
            );
        }

        res.redirect('/personel-yoklama');
    } catch (error) {
        console.error(error);
        res.redirect('/personel-yoklama');
    }
});

router.get('/personel-yoklama/gecmis', [isAuthenticated, checkPermissionLevel(2)], async (req, res) => {
    try {
        const result00 = await query("SELECT * FROM personel WHERE up_id=?", [req.session.user]);
        const yoklamalar = await query(`
            SELECT y.*, 
                p.isim as personel_isim, p.soyisim as personel_soyisim, p.departman,
                y2.isim as yonetici_isim, y2.soyisim as yonetici_soyisim
            FROM personel_yoklama y
            INNER JOIN personel p ON p.id = y.personel_id
            INNER JOIN personel y2 ON y2.id = y.yonetici_id
            ORDER BY y.tarih DESC, p.isim ASC
            LIMIT 100
        `);

        res.render('attendance/personel_history', {
            error: "yok",
            error_type: "yok",
            data: result00[0],
            yoklamalar: yoklamalar
        });
    } catch (error) {
        console.error(error);
        res.redirect('/');
    }
});

router.get('/yoklama/gecmis', [isAuthenticated, checkPermissionLevel(1)], async (req, res) => {
    try {
        const result00 = await query("SELECT * FROM personel WHERE up_id=?", [req.session.user]);
        const yoklamalar = await query(`
            SELECT y.*, 
                o.isim as ogrenci_isim, o.soyisim as ogrenci_soyisim,
                p.isim as personel_isim, p.soyisim as personel_soyisim
            FROM yoklama y
            INNER JOIN ogrenci o ON o.id = y.ogrenci_id
            INNER JOIN personel p ON p.id = y.personel_id
            ORDER BY y.tarih DESC, o.isim ASC
            LIMIT 100
        `);

        res.render('attendance/ogrenci_history', {
            error: "yok",
            error_type: "yok",
            data: result00[0],
            yoklamalar: yoklamalar
        });
    } catch (error) {
        console.error(error);
        res.redirect('/');
    }
});

module.exports = router;


