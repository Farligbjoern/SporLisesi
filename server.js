var port = 3000;

const express = require("express");
const session = require("express-session");
const fileUpload = require('express-fileupload');
const path = require("path");
const md5 = require("md5");
const app = express();
const db = require("./config/database");

const indexRouter = require("./routes/index");
const memberRouter = require("./routes/member");
const attendanceRouter = require("./routes/attendance");
const settingsRouter = require("./routes/settings");
const managementRouter = require("./routes/management");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(fileUpload({
    createParentPath: true,
    limits: { fileSize: 25 * 1024 * 1024 },
}));
app.use(session({
    secret: "yusufkurtyardımet", //Etmedi...
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        maxAge: 72 * 60 * 60 * 1000
    }
}));


app.use("/", indexRouter);
app.use("/", memberRouter);
app.use("/", attendanceRouter);
app.use("/", settingsRouter);
app.use("/", managementRouter);

app.get('*', (req, res) => {
    res.status(404).redirect('/');
});

app.listen(port, async (err) => {
    if (err) throw err;
    console.log("Server " + port + " portunda başlatıldı");
});
