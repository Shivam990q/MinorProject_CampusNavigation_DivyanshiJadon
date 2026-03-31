const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema({
  block: String,
  floor: String,
  room: String,
  name: String,
  type: String,   // classroom, lab, office, washroom
  latitude: Number,
  longitude: Number,
  description: String
});

module.exports = mongoose.model("Location", locationSchema);
