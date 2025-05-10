const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'spor_tesisi'
});

connection.connect((err) => {
    if (err) {
        console.log("Mysql bağlantı hatası:", err);
        return;
    }
    console.log("Mysql bağlantısı başarılı.");
});


module.exports = connection;
