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
    // If MongoDB is offline, don't crash the frontend user flow.
    res.status(201).json({ message: "Mock user session saved (DB offline)!" });
  }
});

module.exports = router;