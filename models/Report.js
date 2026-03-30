const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  videoId: { type: mongoose.Schema.Types.ObjectId, ref: "Video" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reason: String
}, { timestamps: true });

module.exports = mongoose.model("Report", reportSchema);
