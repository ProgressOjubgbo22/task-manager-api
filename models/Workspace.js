const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const workspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    avatar: { type: String, default: null },
    inviteCode: { type: String, unique: true, default: () => uuidv4().slice(0, 8).toUpperCase() },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Workspace", workspaceSchema);
