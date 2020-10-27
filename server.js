const express = require("express");
const morgan = require("morgan");

const app = express();

app.use(express.static("public"));
app.use(morgan("short"));

app.get("/", (req, res) => {
  res.sendFile(__dirname, "/index.html");
});

app.post("/receive", (req, res) => {
  console.log(req.body);
  res.send(req.body);
});

app.listen(8080, () => {
  console.log("Server is running");
});
