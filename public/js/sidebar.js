document.addEventListener('DOMContentLoaded', function () {
    const dropdownTriggers = document.querySelectorAll('.dropdown-trigger');

    dropdownTriggers.forEach(trigger => {
        trigger.addEventListener('click', function () {
            const targetId = this.getAttribute('data-target');
            const dropdownContent = document.getElementById(targetId);
            this.classList.toggle('active');
            dropdownContent.classList.toggle('active');
            dropdownTriggers.forEach(otherTrigger => {
                if (otherTrigger !== trigger) {
                    const otherId = otherTrigger.getAttribute('data-target');
                    const otherDropdown = document.getElementById(otherId);
                    otherTrigger.classList.remove('active');
                    otherDropdown.classList.remove('active');
                }
            });
        });
    });

    fetch("/a/site_settings")
        .then(response => {
            if (!response.ok) {
                throw new Error('Ağ hatası: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            console.log('Gelen veri:', data);
            const siteName = document.getElementById('site-name');
            const siteTitle = document.getElementById('site-title');

            if (siteName && data.site_name) {
                let desc_twitter = document.querySelector('meta[name="twitter:description"]');
                let desc_meta = document.querySelector('meta[name="description"]');
                let ogDesc = document.querySelector('meta[property="og:description"]');
                siteName.textContent = data.site_name;
                siteTitle.textContent = data.site_name;
                favicon(data.logo_path);
                if (!desc_twitter) {
                    desc_twitter = document.createElement('meta');
                    desc_twitter.name = "twitter:description";
                    document.head.appendChild(desc_twitter);
                }
                if (!desc_meta) {
                    desc_meta = document.createElement('meta');
                    desc_meta.name = "description";
                    document.head.appendChild(desc_meta);
                }
                if (!ogDesc) {
                    ogDesc = document.createElement('meta');
                    ogDesc.setAttribute('property', 'og:description');
                    document.head.appendChild(ogDesc);
                }
            } else {
                if (!siteName) {
                    console.error('site-name sınıfına sahip element bulunamadı');
                }
                if (!data.site_name) {
                    console.error('API yanıtında site_name propertysi yok');
                }
            }
        })
        .catch(error => console.error('Hata:', error));
});

function favicon(logoPath) {
    const head = document.head || document.getElementsByTagName('head')[0];
    const links1 = document.querySelectorAll('link[rel*="icon"]');
    const apple = document.createElement('link');
    const favicon2 = document.createElement('link');
    links1.forEach(link => head.removeChild(link));
    favicon2.rel = 'icon';
    favicon2.href = logoPath;
    favicon2.type = image_type(logoPath);
    head.appendChild(favicon2);
    apple.rel = 'apple-touch-icon';
    apple.href = logoPath;
    head.appendChild(apple);

    console.log('Dinamik favicon ayarlandı:', logoPath);
}

function image_type(path) {
    const extension = path.split('.').pop().toLowerCase();
    switch (extension) {
        case 'png': return 'image/png';
        case 'jpg':
        case 'jpeg': return 'image/jpeg';
        case 'svg': return 'image/svg+xml';
        case 'ico': return 'image/x-icon';
        default: return 'image/png';
    }
}