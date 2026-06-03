import mongoose from "mongoose";

const UserSchema = mongoose.Schema({
  username: String,
  displayName: String,
  avatar: String,
  bio: String,
  email: String,
  website: String,
  location: String,

  keywordNotificationsEnabled: {
    type: Boolean,
    default: false,
  },

  joinedDate: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("User", UserSchema);