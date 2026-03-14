const express = require("express");
const fs = require("fs");
const cors = require("cors");

const app = express();

/* ================= BODY PARSER (QUAN TRỌNG NHẤT) ================= */

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ================= DATABASE ================= */

const DB = "./keys.json";

let data = { keys: [] };

if (fs.existsSync(DB)) {
  try {
    data = JSON.parse(fs.readFileSync(DB, "utf8"));
  } catch {
    data = { keys: [] };
  }
}

function saveDB() {
  fs.writeFileSync(DB, JSON.stringify(data, null, 2));
}

/* ================= TEST ================= */

app.get("/", (req, res) => {
  res.send("KEY API RUNNING NEW");
});

/* ================= CREATE KEY ================= */

app.post("/createKey", (req, res) => {

  console.log("BODY RECEIVED:", req.body); // DEBUG

  // ép kiểu chắc chắn
  const days = Number(req.body.days);
  const maxDevice = Number(req.body.maxDevice);

  // validate input
  if (!days || !maxDevice) {
    return res.json({
      success: false,
      message: "days or maxDevice missing",
      body: req.body
    });
  }

  const key =
    "CDDZ-" +
    Math.random().toString(36).substring(2, 10).toUpperCase();

  const expire = Date.now() + days * 86400000;

  data.keys.push({
    key,
    days,
    expire,
    maxDevice,
    devices: [],
    toggles: {}
  });

  saveDB();

  res.json({
    success: true,
    key,
    days,
    maxDevice
  });
});

/* ================= CHECK KEY ================= */

app.post("/checkKey", (req, res) => {

  const { key, deviceId } = req.body;

  if (!deviceId)
    return res.json({ success: false, message: "Device missing" });

  const k = data.keys.find(x => x.key === key);

  if (!k)
    return res.json({ success: false, message: "Invalid key" });

  if (Date.now() > k.expire)
    return res.json({ success: false, message: "Expired" });

  if (!k.devices.includes(deviceId)) {

    if (k.devices.length >= k.maxDevice)
      return res.json({ success: false, message: "Device limit reached" });

    k.devices.push(deviceId);
    saveDB();
  }

  const daysLeft = Math.ceil((k.expire - Date.now()) / 86400000);

  res.json({
    success: true,
    daysLeft,
    toggles: k.toggles || {}
  });
});

/* ================= START ================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("SERVER RUNNING ON", PORT);
});
