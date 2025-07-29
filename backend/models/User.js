const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
	username: { type: String, unique: true },
	contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

module.exports = mongoose.model("User", userSchema);
