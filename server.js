const express = require("express");
const fs = require("fs");
const cors = require("cors");

const app = express();

// Phải có 2 dòng này trên cùng để đọc được dữ liệu bạn gửi từ Hoppscotch
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const DB = "./keys.json";

/* ================= LOAD DATABASE ================= */
let data = { keys: [] };
if (fs.existsSync(DB)) {
    try {
        const rawData = fs.readFileSync(DB);
        data = JSON.parse(rawData);
    } catch (e) {
        data = { keys: [] };
    }
}

function saveDB() {
    fs.writeFileSync(DB, JSON.stringify(data, null, 2));
}

/* ================= TEST ROUTE ================= */
app.get("/", (req, res) => {
    res.send("KEY API IS ONLINE");
});

/* ================= CREATE KEY ================= */
app.post("/createKey", (req, res) => {
    // Lấy giá trị và ép kiểu về số (Number)
    const days = Number(req.body.days) || 1;
    const maxDevice = Number(req.body.maxDevice) || 1;

    const key = "CDDZ-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    
    // Tính toán thời gian hết hạn (ms)
    const expire = Date.now() + (days * 24 * 60 * 60 * 1000);

    const newKey = {
        key: key,
        expire: expire,
        maxDevice: maxDevice,
        devices: [],
        toggles: {}
    };

    data.keys.push(newKey);
    saveDB();

    res.json({
        success: true,
        key: key,
        days: days,
        maxDevice: maxDevice,
        expire: new Date(expire).toLocaleString("vi-VN")
    });
});

/* ================= CHECK KEY ================= */
app.post("/checkKey", (req, res) => {
    const { key, deviceId } = req.body;

    if (!key || !deviceId) {
        return res.json({ success: false, message: "Thiếu Key hoặc DeviceID" });
    }

    const k = data.keys.find(x => x.key === key);

    if (!k) {
        return res.json({ success: false, message: "Key không tồn tại" });
    }

    if (Date.now() > k.expire) {
        return res.json({ success: false, message: "Key đã hết hạn" });
    }

    // Quản lý thiết bị
    if (!k.devices.includes(deviceId)) {
        if (k.devices.length >= k.maxDevice) {
            return res.json({ success: false, message: "Đã đạt giới hạn thiết bị" });
        }
        k.devices.push(deviceId);
        saveDB();
    }

    const daysLeft = Math.ceil((k.expire - Date.now()) / (24 * 60 * 60 * 1000));

    res.json({
        success: true,
        daysLeft: daysLeft,
        toggles: k.toggles || {}
    });
});

/* ================= SAVE TOGGLE ================= */
app.post("/saveToggle", (req, res) => {
    const { key, toggle, value } = req.body;

    const k = data.keys.find(x => x.key === key);
    if (!k) return res.json({ success: false, message: "Key không hợp lệ" });

    if (!k.toggles) k.toggles = {};
    k.toggles[toggle] = value;
    
    saveDB();
    res.json({ success: true });
});

/* ================= GET TOGGLE ================= */
app.get("/getToggle", (req, res) => {
    const key = req.query.key;
    const k = data.keys.find(x => x.key === key);
    
    if (!k) return res.json({ success: false });

    res.json({
        success: true,
        toggles: k.toggles || {}
    });
});

/* ================= LIST ALL KEYS ================= */
app.get("/keys", (req, res) => {
    res.json(data.keys);
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server đang chạy tại port: ${PORT
