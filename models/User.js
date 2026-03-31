const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  loginTime: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", UserSchema);