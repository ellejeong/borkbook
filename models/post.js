const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  author: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    username: String,
  },
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
  createdAt: { type: Date, default: Date.now },
  description: String,
  image: String,
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  name: String,
});

module.exports = mongoose.model("Post", postSchema);
