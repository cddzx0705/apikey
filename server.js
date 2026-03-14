const express = require("express");
const fs = require("fs");
const cors = require("cors");

const app = express();

/* MIDDLEWARE */

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cors());

/* DATABASE FILE */

const DB = "./keys.json";

/* LOAD DATABASE */

let data = { keys: [] };

if (fs.existsSync(DB)) {
  try {
    data = JSON.parse(fs.readFileSync(DB));
  } catch {
    data = { keys: [] };
  }
}

/* SAVE DATABASE */

function saveDB(){
  fs.writeFileSync(DB, JSON.stringify(data,null,2));
}

/* TEST SERVER */

app.get("/", (req,res)=>{
  res.send("KEY API RUNNING");
});

/* ================= CREATE KEY ================= */

app.post("/createKey",(req,res)=>{

  const body = req.body || {};

  const days = Number(body.days ?? 1);
  const maxDevice = Number(body.maxDevice ?? 1);

  console.log("CREATE KEY BODY:", body);

  const key = "CDDZ-" + Math.random().toString(36).substring(2,10).toUpperCase();

  const expire = Date.now() + (days * 86400000);

  data.keys.push({
    key: key,
    expire: expire,
    maxDevice: maxDevice,
    devices: [],
    toggles: {}
  });

  saveDB();

  res.json({
    success: true,
    key: key,
    expire: new Date(expire).toISOString(),
    maxDevice: maxDevice
  });

});

/* ================= CHECK KEY ================= */

app.post("/checkKey",(req,res)=>{

  const body = req.body || {};
  const key = body.key;
  const deviceId = body.deviceId;

  if(!deviceId){
    return res.json({
      success:false,
      message:"Device ID missing"
    });
  }

  const k = data.keys.find(x=>x.key === key);

  if(!k){
    return res.json({
      success:false,
      message:"Invalid key"
    });
  }

  if(Date.now() > k.expire){
    return res.json({
      success:false,
      message:"Key expired"
    });
  }

  if(!k.devices.includes(deviceId)){

    if(k.devices.length >= k.maxDevice){
      return res.json({
        success:false,
        message:"Device limit reached"
      });
    }

    k.devices.push(deviceId);
    saveDB();
  }

  const daysLeft = Math.ceil((k.expire - Date.now()) / 86400000);

  res.json({
    success:true,
    daysLeft:daysLeft,
    toggles:k.toggles || {}
  });

});

/* ================= SAVE TOGGLE ================= */

app.post("/saveToggle",(req,res)=>{

  const {key,toggle,value} = req.body || {};

  const k = data.keys.find(x=>x.key===key);

  if(!k){
    return res.json({success:false});
  }

  if(!k.toggles){
    k.toggles = {};
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

/* START SERVER */

const PORT = process.env.PORT || 3000;

app.listen(PORT,()=>{
  console.log("KEY API RUNNING ON PORT", PORT);
});
