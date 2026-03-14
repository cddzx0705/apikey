const express = require("express");
const fs = require("fs");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const DB = "./keys.json";

/* LOAD DATABASE */
let data = { keys: [] };

if (fs.existsSync(DB)) {
    try {
        data = JSON.parse(fs.readFileSync(DB));
    } catch (e) {
        console.error("Lỗi đọc file DB, khởi tạo mới");
        data = { keys: [] };
    }
}

function saveDB() {
    fs.writeFileSync(DB, JSON.stringify(data, null, 2));
}

/* TEST */
app.get("/", (req, res) => {
    res.send("KEY API RUNNING");
});

/* ================= CREATE KEY ================= */
app.post("/createKey", (req, res) => {
    // Lấy thông tin từ body, mặc định là 1 ngày và 1 máy
    const days = parseInt(req.body.days) || 1;
    const maxDevice = parseInt(req.body.maxDevice) || 1;

    const key = "CDDZ-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    
    // 86400000 ms = 1 ngày
    const expire = Date.now() + (days * 86400000);

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
        expire: new Date(expire).toLocaleString()
    });
});

/* ================= CHECK KEY ================= */
app.post("/checkKey", (req, res) => {
    const { key, deviceId } = req.body;

    if (!key || !deviceId) {
        return res.json({ success: false, message: "Missing key or deviceId" });
    }

    const k = data.keys.find(x => x.key === key);

    if (!k) {
        return res.json({ success: false, message: "Invalid key" });
    }

    if (Date.now() > k.expire) {
        return res.json({ success: false, message: "Key expired" });
    }

    // Kiểm tra thiết bị
    if (!k.devices.includes(deviceId)) {
        if (k.devices.length >= k.maxDevice) {
            return res.json({ success: false, message: "Device limit reached" });
        }
        k.devices.push(deviceId);
        saveDB();
    }

    const timeLeft = k.expire - Date.now();
    const daysLeft = Math.ceil(timeLeft / 86400000);

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
    if (!k) return res.json({ success: false, message: "Key not found" });

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

/* ================= LIST ALL KEYS (Admin only) ================= */
app.get("/keys", (req, res) => {
    res.json(data.keys);
});

/* START SERVER */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`SERVER IS RUNNING ON PORT ${PORT}`);
});
