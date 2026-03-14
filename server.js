const express = require("express");
const fs = require("fs");
const cors = require("cors");

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(cors());

const DB = "./keys.json";

/* ================= DATABASE ================= */

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
  res.send("API VERSION FINAL OK");
});

/* ================= CREATE KEY ================= */

app.post("/createKey", (req, res) => {

  console.log("BODY:", req.body);

  // ép kiểu AN TOÀN tuyệt đối
  const days = parseInt(req.body.days);
  const maxDevice = parseInt(req.body.maxDevice);

  if (isNaN(days) || days <= 0) {
    return res.json({ success:false, message:"Invalid days" });
  }

  if (isNaN(maxDevice) || maxDevice <= 0) {
    return res.json({ success:false, message:"Invalid maxDevice" });
  }

  const key =
    "CDDZ-" +
    Math.random().toString(36).substring(2,10).toUpperCase();

  const expire = Date.now() + days * 86400000;

  const newKey = {
    key,
    days,
    expire,
    maxDevice,
    devices: [],
    toggles: {}
  };

  data.keys.push(newKey);
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

  if (!key || !deviceId) {
    return res.json({
      success:false,
      message:"Missing key or deviceId"
    });
  }

  const k = data.keys.find(x => x.key === key);

  if (!k) {
    return res.json({ success:false, message:"Invalid key" });
  }

  if (Date.now() > k.expire) {
    return res.json({ success:false, message:"Key expired" });
  }

  // thêm device mới
  if (!k.devices.includes(deviceId)) {

    if (k.devices.length >= k.maxDevice) {
      return res.json({
        success:false,
        message:"Device limit reached"
      });
    }

    k.devices.push(deviceId);
    saveDB();
  }

  const daysLeft = Math.ceil(
    (k.expire - Date.now()) / 86400000
  );

  res.json({
    success:true,
    daysLeft,
    maxDevice:k.maxDevice,
    usedDevices:k.devices.length,
    toggles:k.toggles || {}
  });
});

/* ================= SAVE TOGGLE ================= */

app.post("/saveToggle", (req,res)=>{

  const { key, toggle, value } = req.body;

  const k = data.keys.find(x=>x.key===key);

  if(!k){
    return res.json({success:false});
  }

  k.toggles[toggle] = value;

  saveDB();

  res.json({success:true});
});

/* ================= GET TOGGLE ================= */

app.get("/getToggle",(req,res)=>{

  const key = req.query.key;

  const k = data.keys.find(x=>x.key===key);

  if(!k){
    return res.json({success:false});
  }

  res.json({
    success:true,
    toggles:k.toggles || {}
  });
});

/* ================= LIST KEYS ================= */

app.get("/keys",(req,res)=>{
  res.json(data.keys);
});

/* ================= START ================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT,()=>{
  console.log("SERVER RUNNING PORT", PORT);
});
