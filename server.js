const express = require("express");
const fs = require("fs");
const cors = require("cors");

const app = express();
const DB = "./keys.json";

// Cấu hình Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

/* --- LOAD/SAVE DATABASE --- */
let data = { keys: [] };
const loadDB = () => {
    if (fs.existsSync(DB)) {
        try {
            data = JSON.parse(fs.readFileSync(DB));
        } catch (e) {
            data = { keys: [] };
        }
    }
};
const saveDB = () => fs.writeFileSync(DB, JSON.stringify(data, null, 2));

loadDB();

/* --- ROUTES --- */

app.get("/", (req, res) => {
    res.send("API KEY ĐANG CHẠY - PHIÊN BẢN MỚI NHẤT");
});

// 1. Tạo Key
app.post("/createKey", (req, res) => {
    const days = parseInt(req.body.days) || 1;
    const maxDevice = parseInt(req.body.maxDevice) || 1;

    const key = "CDDZ-" + Math.random().toString(36).substring(2, 10).toUpperCase();
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
        days_set: days,
        max_device_set: maxDevice,
        expire_date: new Date(expire).toLocaleString("vi-VN")
    });
});

// 2. Kiểm tra Key (Login)
app.post("/checkKey", (req, res) => {
    const { key, deviceId } = req.body;
    const k = data.keys.find(x => x.key === key);

    if (!k) return res.json({ success: false, message: "Key không hợp lệ" });
    if (Date.now() > k.expire) return res.json({ success: false, message: "Key hết hạn" });

    if (!k.devices.includes(deviceId)) {
        if (k.devices.length >= k.maxDevice) {
            return res.json({ success: false, message: "Đã hết lượt đăng ký thiết bị" });
        }
        k.devices.push(deviceId);
        saveDB();
    }

    const daysLeft = Math.ceil((k.expire - Date.now()) / 86400000);
    res.json({ success: true, daysLeft, toggles: k.toggles || {} });
});

// 3. Quản lý Toggle (Lưu trạng thái bật/tắt tính năng)
app.post("/saveToggle", (req, res) => {
    const { key, toggle, value } = req.body;
    const k = data.keys.find(x => x.key === key);
    if (!k) return res.json({ success: false });

    if (!k.toggles) k.toggles = {};
    k.toggles[toggle] = value;
    saveDB();
    res.json({ success: true });
});

// 4. Lấy danh sách Key (Dùng để kiểm tra Admin)
app.get("/keys", (req, res) => {
    res.json(data.keys);
});

/* --- START SERVER --- */
const PORT = process.env.PORT || 8080; 
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
