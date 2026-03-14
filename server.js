const express = require("express");
const fs = require("fs");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

/* ======================
   CONFIG ADMIN
====================== */

const ADMIN_USER = "admin";
const ADMIN_PASS = "123456";

/* ======================
   DATABASE JSON
====================== */

const DB = "./keys.json";

let data = {
  keys: []
};

if (fs.existsSync(DB)) {
  data = JSON.parse(fs.readFileSync(DB));
}

function saveDB() {
  fs.writeFileSync(DB, JSON.stringify(data, null, 2));
}

/* ======================
   HOME
====================== */

app.get("/", (req, res) => {
  res.send("KEY SERVER RUNNING");
});

/* ======================
   ADMIN LOGIN
====================== */

app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    return res.json({ success: true });
  }

  res.json({ success: false, message: "Wrong admin account" });
});

/* ======================
   CREATE KEY
====================== */

app.post("/admin/createKey", (req, res) => {

  const { username, password, days, maxUse } = req.body;

  if (username !== ADMIN_USER || password !== ADMIN_PASS) {
    return res.json({ success:false, message:"Not admin" });
  }

  const newKey = "KEY-" + Math.random().toString(36).substring(2,10).toUpperCase();

  const expire = Date.now() + (days * 86400000);

  data.keys.push({
    key: newKey,
    expire,
    maxUse,
    used: 0,
    devices: []
  });

  saveDB();

  res.json({
    success:true,
    key:newKey,
    expire
  });
});

/* ======================
   CHECK KEY (USER)
====================== */

app.post("/checkKey", (req,res)=>{

  const { key, deviceId } = req.body;

  const k = data.keys.find(x=>x.key===key);

  if(!k)
    return res.json({success:false,message:"Invalid key"});

  if(Date.now() > k.expire)
    return res.json({success:false,message:"Key expired"});

  if(!k.devices.includes(deviceId)){

    if(k.used >= k.maxUse)
      return res.json({success:false,message:"Max device reached"});

    k.devices.push(deviceId);
    k.used++;
    saveDB();
  }

  res.json({success:true});
});

/* ======================
   LIST KEYS
====================== */

app.get("/admin/keys",(req,res)=>{
  res.json(data.keys);
});

/* ======================
   SERVER START
====================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT,()=>{
  console.log("KEY SERVER RUNNING");
});