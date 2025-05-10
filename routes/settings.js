const express = require("express");
const router = express.Router();
const db = require('../config/database');
const path = require('path');
const fs = require('fs');


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

router.get('/a/settings', [isAuthenticated, checkPermissionLevel(2)], async (req, res) => {
    try {
        const result00 = await query("SELECT * FROM personel WHERE up_id=?", [req.session.user]);
        const settings = await query("SELECT * FROM site_settings LIMIT 1");
        const personeller = result00[0].yetki === 3 ?
            await query("SELECT * FROM personel WHERE yetki <= 2 ORDER BY isim ASC") : [];

        res.render('index/settings', {
            data: result00[0],
            settings: settings[0],
            personeller: personeller,
            error: null
        });
    } catch (error) {
        console.error(error);
        res.redirect('/');
    }
});

router.post('/a/settings', [isAuthenticated, checkPermissionLevel(2)], async (req, res) => {
    try {
        const { site_name, site_mail, site_phone, site_description } = req.body;
        let logo_path = null;
        if (req.files && req.files.logo) {
            const logo = req.files.logo;
            const existingSettings = await query("SELECT logo_path FROM site_settings LIMIT 1");
            if (existingSettings.length > 0 && existingSettings[0].logo_path) {
                try {
                    const oldLogoPath = path.join(__dirname, '../public', existingSettings[0].logo_path);
                    if (fs.existsSync(oldLogoPath)) {
                        fs.unlinkSync(oldLogoPath);
                    }
                } catch (err) {
                    console.error('Eski logo silinirken hata:', err);
                }
            }
            const uniqueName = Date.now() + '-' + logo.name;
            const uploadPath = path.join(__dirname, '../public/uploads/', uniqueName);
            await logo.mv(uploadPath);
            logo_path = '/uploads/' + uniqueName;
        }
        const existingSettings = await query("SELECT * FROM site_settings LIMIT 1");
        if (existingSettings.length > 0) {
            await query(
                "UPDATE site_settings SET site_name = ?, mail = ?, phone = ?, site_description = ?, logo_path = COALESCE(?, logo_path) WHERE id = ?",
                [site_name, site_mail, site_phone, site_description, logo_path, existingSettings[0].id]
            );
        } else {
            await query(
                "INSERT INTO site_settings (site_name, mail, phone, site_description, logo_path) VALUES (?, ?, ?, ?, ?)",
                [site_name, site_mail, site_phone, site_description, logo_path || '/img/default-logo.png']
            );
        }
        res.redirect('/a/settings');
    } catch (error) {
        console.error('Ayarlar güncellenirken hata:', error);
        res.redirect('/a/settings');
    }
});
router.post('/a/settings/yetki/:id', [isAuthenticated, checkPermissionLevel(3)], async (req, res) => {
    try {
        const personelId = req.params.id;
        const { yeni_yetki } = req.body;
        const hedefPersonel = await query("SELECT * FROM personel WHERE id=?", [personelId]);

        if (hedefPersonel.length > 0 &&
            hedefPersonel[0].yetki <= 2 &&
            (yeni_yetki === "1" || yeni_yetki === "2")) {

            await query(
                "UPDATE personel SET yetki = ? WHERE id = ?",
                [yeni_yetki, personelId]
            );
        }
        res.redirect('/a/settings');
    } catch (error) {
        console.error(error);
        res.redirect('/a/settings');
    }
});

module.exports = router;