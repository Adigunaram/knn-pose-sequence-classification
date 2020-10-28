const express = require("express");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const mqtt = require('mqtt')

const DEFAULT_PORT = 8080;

const STORAGE = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, path.join(__dirname, "/storage/uploads"));
  },
  filename: function (req, file, callback) {
    callback(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
  },
});

/** Main */
(() => {
  const client  = mqtt.connect('mqtt://127.0.0.1:1883')
  const app = express();

  app.use(express.static("public"));
  app.use(bodyParser.json());
  app.use(morgan("tiny"));

  /** serve client */
  app.get("/", (req, res) => {
    return res.sendFile(__dirname, "/index.html");
  });
  
  /** upload file from client */
  app.post("/upload", multer({ storage: STORAGE }).single("canvas"), (req, res) => {
    try {      
      return res.status(200).json();
    } catch (error) {
      return res.status(500).json({ message: error.message })
    }
  });

  /** publish to mqtt serverr */
  app.post("/publish", async (req, res) => {
    const payload = JSON.stringify(req.body);
    
    await client.publish("predict", payload)
    
    return res.status(200).json({
      message: "published"
    })
  });
  
  /** listen http */
  app.listen(DEFAULT_PORT, () => {
    console.log(`server is running on ${DEFAULT_PORT}`);
  });  
})()