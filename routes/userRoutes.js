const express = require("express");
const router = express.Router();
const User = require("../models/User");

// Save User Data
router.post("/", async (req, res) => {
  try {
    const { name, role } = req.body;
    const newUser = new User({ name, role });
    await newUser.save();
    res.status(201).json({ message: "User session saved successfully!" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;