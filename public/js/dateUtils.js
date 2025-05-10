function formatDate(dateStr) {
    if (!dateStr || dateStr === '0001-01-01') {
        return new Date().toISOString().split('T')[0];
    }
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            return new Date().toISOString().split('T')[0];
        }
        return date.toISOString().split('T')[0];
    } catch (e) {
        return new Date().toISOString().split('T')[0];
    }
}

module.exports = formatDate;
