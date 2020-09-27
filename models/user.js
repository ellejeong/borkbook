const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema({
  avatar: String,
  email: {
    type: String,
    unique: true,
    required: true,
  },
  firstName: String,
  lastName: String,
  password: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  username: {
    type: String,
    unique: true,
    required: true,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);
