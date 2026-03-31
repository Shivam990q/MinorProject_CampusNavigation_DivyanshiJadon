require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// TEST ROUTE
app.get("/api/test", (req, res) => {
  res.send("API working properly");
});

// Mongo connection
mongoose.connect("mongodb://127.0.0.1:27017/campus_navigation")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

// Home route
app.get("/", (req, res) => {
  res.send("Backend Running");
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
