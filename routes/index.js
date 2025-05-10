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

router.get('/', isAuthenticated, async (req, res) => {
    try {
        const [result00, latestAnnouncement] = await Promise.all([
            query("SELECT * FROM personel WHERE up_id=?", [req.session.user]),
            query(`
                SELECT duyurular.*, personel.isim 
                FROM duyurular 
                JOIN personel ON duyurular.user_id = personel.up_id 
                ORDER BY date DESC 
                LIMIT 1
            `)
        ]);

        const ogrenciler = await query("SELECT * FROM ogrenci ORDER BY id DESC LIMIT 4");
        const personeller = result00[0].yetki >= 2 ?
            await query("SELECT * FROM personel ORDER BY id DESC LIMIT 4") : [];

        res.render('index/index', {
            data: result00[0],
            ogrenciler: ogrenciler,
            personeller: personeller,
            duyuru: latestAnnouncement[0] || null
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});
router.get('/a/site_settings', isAuthenticated, async (req, res) => {
    const result = await query("SELECT * FROM site_settings");
    if (result.length > 0) {
        res.json(result[0]);
    } else {
        res.status(404).json({ error: 'Site ayarları bulunamadı' });
    }
});

router.get('/duyurular', isAuthenticated, async (req, res) => {
    try {
        const announcements = await query(`
            SELECT duyurular.*, personel.isim 
            FROM duyurular 
            JOIN personel ON duyurular.user_id = personel.up_id 
            ORDER BY date DESC
        `);

        const result00 = await query("SELECT * FROM personel WHERE up_id=?", [req.session.user]);

        res.render('index/duyurular', {
            data: result00[0],
            duyurular: announcements
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

router.get('/duyuru_ekle', isAuthenticated, checkPermissionLevel(2), async (req, res) => {
    try {
        const result00 = await query("SELECT * FROM personel WHERE up_id=?", [req.session.user]);
        res.render('index/duyurular_ekle', { data: result00[0] });
    } catch (error) {
        console.error(error);
        res.redirect('/');
    }
});

router.post('/duyuru_ekle', isAuthenticated, checkPermissionLevel(2), async (req, res) => {
    try {
        const { announcement } = req.body;
        await query(
            "INSERT INTO duyurular (date, user_id, announcement) VALUES (NOW(), ?, ?)",
            [req.session.user, announcement]
        );
        res.redirect('/duyurular');
    } catch (error) {
        console.error(error);
        res.redirect('/duyuru_ekle');
    }
});

module.exports = router;


