document.addEventListener('DOMContentLoaded', function () {
    const izinDurumuElements = document.querySelectorAll('.izin-durumu');

    izinDurumuElements.forEach(element => {
        const izinTarihiStr = element.getAttribute('data-tarih');

        if (!izinTarihiStr) {
            element.innerHTML = '<strong style="color: red;">Hayır</strong>';
            return;
        }
        const today = new Date();
        const tarihParcalari = izinTarihiStr.split('.');

        if (tarihParcalari.length !== 3) {
            element.innerHTML = '<strong style="color: red;">Hayır</strong>';
            return;
        }

        const izinTarihi = new Date(
            parseInt(tarihParcalari[2]),
            parseInt(tarihParcalari[1]) - 1,
            parseInt(tarihParcalari[0])
        );

        if (izinTarihi > today) {
            const diff = izinTarihi - today;
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const months = Math.floor(days / 30);
            const years = Math.floor(months / 12);
            const remainingMonths = months % 12;
            const remainingDays = days % 30;

            let kalanSure = '';
            if (years > 0) kalanSure += `${years} yıl `;
            if (remainingMonths > 0) kalanSure += `${remainingMonths} ay `;
            if (remainingDays > 0) kalanSure += `${remainingDays} gün`;

            element.innerHTML = `<strong style="color: green;">Evet</strong> <span style="color: #1976D2;">(${kalanSure})</span>`;
        } else {
            element.innerHTML = '<strong style="color: red;">Hayır</strong>';
            //Renkleri değiştirip değiştirmemekte halen tereddütteyim
        }
    });

    /*Maaş */
    const maasDurumuElements = document.querySelectorAll('.maas-durumu');
    maasDurumuElements.forEach(element => {
        const maasTarihiStr = element.getAttribute('data-maas-tarih');

        if (!maasTarihiStr || maasTarihiStr === '0001-01-01') {
            element.innerHTML = '<strong style="color: red;">Maaş Ödenmedi</strong>';
            return;
        }

        const today = new Date();
        const maasTarihi = new Date(maasTarihiStr);
        const diffTime = today - maasTarihi;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 30) {
            element.innerHTML = '<strong style="color: green;">Maaş Ödendi</strong>';
        } else {
            element.innerHTML = '<strong style="color: red;">Maaş Ödenmedi</strong>';
        }
    });
});

function convertDateFormat(dateStr) {
    if (!dateStr || dateStr === '0001-01-01' || dateStr === '01.01.0001') return '0001-01-01';
    if (dateStr.includes('-')) return dateStr;
    const parts = dateStr.split('.');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
}

document.addEventListener('DOMContentLoaded', function () {
    const sakatlikDurumuElements = document.querySelectorAll('.sakatlik-durumu');

    sakatlikDurumuElements.forEach(element => {
        const sakatlikTarihiStr = element.getAttribute('data-tarih');
        const formattedDate = convertDateFormat(sakatlikTarihiStr);

        if (!formattedDate || formattedDate === '0001-01-01') {
            element.innerHTML = '<strong style="color: green;">Sakatlık Yok</strong>';
            return;
        }

        const today = new Date();
        const sakatlikTarihi = new Date(formattedDate);

        if (sakatlikTarihi > today) {
            const diff = sakatlikTarihi - today;
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const months = Math.floor(days / 30);
            const years = Math.floor(months / 12);
            const remainingMonths = months % 12;
            const remainingDays = days % 30;

            let kalanSure = '';
            if (years > 0) kalanSure += `${years} yıl `;
            if (remainingMonths > 0) kalanSure += `${remainingMonths} ay `;
            if (remainingDays > 0) kalanSure += `${remainingDays} gün`;

            element.innerHTML = `<strong style="color: red;">Sakatlık Var</strong> <br><small>Dönüş: ${kalanSure}</small>`;
        } else {
            element.innerHTML = '<strong style="color: green;">Sakatlık Yok</strong>';
        }
    });
});

/*
Canım çıktı insafsızlar
*/