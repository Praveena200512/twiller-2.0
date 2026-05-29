import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
    },

    displayName: {
      type: String,
      required: true,
    },

    avatar: {
      type: String,
      default: "",
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    bio: {
      type: String,
      default: "",
    },

    location: {
      type: String,
      default: "",
    },

    website: {
      type: String,
      default: "",
    },

    joinedDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "User",
  userSchema
);