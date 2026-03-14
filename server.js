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
  data = JSON.parse(fs.readFileSync(DB));
}

function saveDB(){
  fs.writeFileSync(DB, JSON.stringify(data,null,2));
}

/* TEST */

app.get("/", (req,res)=>{
  res.send("KEY API RUNNING");
});

/* ================= CREATE KEY ================= */

app.post("/createKey",(req,res)=>{

const days = Number(req.body.days) || 1;
const maxDevice = Number(req.body.maxDevice) || 1;

  const key = "CDDZ-" + Math.random().toString(36).substring(2,10).toUpperCase();

  const expire = Date.now() + (days * 86400000);

  data.keys.push({
    key:key,
    expire:expire,
    maxDevice:maxDevice,
    devices:[],
    toggles:{}
  });

  saveDB();

  res.json({
    success:true,
    key:key,
    expire:new Date(expire).toISOString(),
    maxDevice:maxDevice
  });

});

/* ================= CHECK KEY ================= */

app.post("/checkKey",(req,res)=>{

  const {key,deviceId} = req.body;

  if(!deviceId){
    return res.json({
      success:false,
      message:"Device ID missing"
    });
  }

  const k = data.keys.find(x=>x.key === key);

  if(!k){
    return res.json({success:false,message:"Invalid key"});
  }

  if(Date.now() > k.expire){
    return res.json({success:false,message:"Key expired"});
  }

  if(!k.devices.includes(deviceId)){

    if(k.devices.length >= k.maxDevice){
      return res.json({success:false,message:"Device limit reached"});
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

  const {key,toggle,value} = req.body;

  const k = data.keys.find(x=>x.key===key);

  if(!k){
    return res.json({success:false});
  }

  if(!k.toggles){
    k.toggles={};
  }

  k.toggles[toggle]=value;

  saveDB();

  res.json({success:true});

});

/* ================= GET TOGGLE ================= */

app.get("/getToggle",(req,res)=>{

  const key=req.query.key;

  const k=data.keys.find(x=>x.key===key);

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

/* START */

const PORT = process.env.PORT || 3000;

app.listen(PORT,()=>{
  console.log("KEY API RUNNING");
});
