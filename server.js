const express = require("express");
const morgan = require("morgan");
const bodyParser = require("body-parser");

//** Main */
(() => {
  const app = express();

  app.use(express.static("public"));
  app.use(morgan("short"));
  app.use(bodyParser.json());
  
  app.get("/", (req, res) => {
    res.sendFile(__dirname, "/index.html");
  });
  
  app.post("/upload", (req, res) => {
    console.log(req.body);
    res.status(200).json();
  });
  
  app.listen(8080, () => {
    console.log("Server is running");
  });  
})()