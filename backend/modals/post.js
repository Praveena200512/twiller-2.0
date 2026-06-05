const postSchema = new mongoose.Schema({
  content: String,
  image: String,

  audioUrl: {
    type: String,
    default: "",
  },

  audioDuration: {
    type: Number,
    default: 0,
  },

  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  timestamp: {
    type: Date,
    default: Date.now,
  },
});