import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import multer from "multer";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

import User from "./modals/user.js";
import Tweet from "./modals/tweet.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://twiller-2-0-frontend.onrender.com",
      "https://twiller-2-0-pravee.vercel.app",
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/", (req, res) => {
  res.send("Twiller backend is running successfully");
});

const port = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => {
    console.log("Connected to DB");

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((err) => {
    console.log(err);
  });

/* =========================
   AUDIO OTP HELPERS
========================= */

const otpStore = new Map();
const verifiedAudioTokens = new Map();

const isAudioUploadAllowedNow = () => {
  const now = new Date();

  const istTime = new Date(
    now.toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    })
  );

  const hour = istTime.getHours();

  return true;
};

const sendOtpMail = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Twiller Audio Tweet OTP",
    text: `Your OTP for posting an audio tweet is ${otp}. It is valid for 5 minutes.`,
  });
};

const audioStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(process.cwd(), "uploads/audio");

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, {
        recursive: true,
      });
    }

    cb(null, dir);
  },

  filename: function (req, file, cb) {
    const uniqueName =
      Date.now() +
      "-" +
      file.originalname.replace(/\s+/g, "-");

    cb(null, uniqueName);
  },
});

const audioUpload = multer({
  storage: audioStorage,

  limits: {
    fileSize: 100 * 1024 * 1024,
  },

  fileFilter: function (req, file, cb) {
    if (!file.mimetype.startsWith("audio/")) {
      return cb(new Error("Only audio files are allowed"));
    }

    cb(null, true);
  },
});

/* =========================
   REGISTER
========================= */

app.post("/register", async (req, res) => {
  try {
    const existingUser = await User.findOne({
      email: req.body.email,
    });

    if (existingUser) {
      return res.status(200).json(existingUser);
    }

    const newUser = new User(req.body);

    await newUser.save();

    return res.status(201).json(newUser);
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
});

/* =========================
   LOGGED IN USER
========================= */

app.get("/loggedinuser", async (req, res) => {
  try {
    const { email } = req.query;

    const user = await User.findOne({
      email,
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.keywordNotificationsEnabled === undefined) {
      user.keywordNotificationsEnabled = false;
      await user.save();
    }

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
});

/* =========================
   UPDATE USER
========================= */

app.patch("/userupdate/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const updatedUser = await User.findOneAndUpdate(
      {
        email,
      },
      {
        $set: {
          ...req.body,
          keywordNotificationsEnabled:
            req.body.keywordNotificationsEnabled === true,
        },
      },
      {
        new: true,
      }
    );

    return res.status(200).json(updatedUser);
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
});

/* =========================
   SEND AUDIO OTP
========================= */

app.post("/audio-otp/send", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const user = await User.findOne({
      email,
    });

    if (!user) {
      return res.status(404).json({
        message: "Registered user not found",
      });
    }

    const otp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    otpStore.set(email, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    await sendOtpMail(email, otp);

    return res.status(200).json({
      message: "OTP sent to registered email",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to send OTP",
      error: error.message,
    });
  }
});

/* =========================
   VERIFY AUDIO OTP
========================= */

app.post("/audio-otp/verify", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const record = otpStore.get(email);

    if (!record) {
      return res.status(400).json({
        message: "OTP not found. Please request a new OTP.",
      });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(email);

      return res.status(400).json({
        message: "OTP expired. Please request a new OTP.",
      });
    }

    if (record.otp !== otp) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    otpStore.delete(email);

    const token =
      Math.random().toString(36).slice(2) +
      Date.now().toString(36);

    verifiedAudioTokens.set(email, {
      token,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    return res.status(200).json({
      message: "OTP verified",
      token,
    });
  } catch (error) {
    return res.status(500).json({
      message: "OTP verification failed",
      error: error.message,
    });
  }
});

/* =========================
   CREATE NORMAL TWEET
========================= */

app.post("/post", async (req, res) => {
  try {
    console.log("REQ BODY:", req.body);

    const newTweet = new Tweet({
      author: req.body.author,
      content: req.body.content,
      image: req.body.image || null,
    });

    await newTweet.save();

    const savedTweet = await Tweet.findById(newTweet._id).populate(
      "author"
    );

    return res.status(201).json(savedTweet);
  } catch (error) {
    console.log("POST ERROR:", error);

    return res.status(400).json({
      error: error.message,
    });
  }
});

/* =========================
   CREATE AUDIO TWEET
========================= */

app.post(
  "/audio-tweet",
  audioUpload.single("audio"),
  async (req, res) => {
    try {
      if (!isAudioUploadAllowedNow()) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }

        return res.status(403).json({
          message:
            "Audio tweets are allowed only between 2:00 PM and 7:00 PM IST.",
        });
      }

      const {
        author,
        email,
        content,
        audioDuration,
        otpToken,
      } = req.body;

      if (!author || !email || !otpToken) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }

        return res.status(400).json({
          message:
            "Author, email, and OTP token are required.",
        });
      }

      const verified = verifiedAudioTokens.get(email);

      if (
        !verified ||
        verified.token !== otpToken ||
        Date.now() > verified.expiresAt
      ) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }

        return res.status(403).json({
          message:
            "OTP verification required before uploading audio.",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message: "Audio file is required.",
        });
      }

      if (req.file.size > 100 * 1024 * 1024) {
        fs.unlinkSync(req.file.path);

        return res.status(400).json({
          message: "Audio file must not exceed 100 MB.",
        });
      }

      const duration = Number(audioDuration);

      if (!duration || duration > 300) {
        fs.unlinkSync(req.file.path);

        return res.status(400).json({
          message:
            "Audio duration must not exceed 5 minutes.",
        });
      }

      const audioUrl = `/uploads/audio/${req.file.filename}`;

      const newTweet = new Tweet({
        author,
        content: content || "",
        image: null,
        audioUrl,
        audioDuration: duration,
      });

      await newTweet.save();

      const savedTweet = await Tweet.findById(newTweet._id).populate(
        "author"
      );

      verifiedAudioTokens.delete(email);

      return res.status(201).json(savedTweet);
    } catch (error) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(500).json({
        message: "Audio tweet upload failed",
        error: error.message,
      });
    }
  }
);

/* =========================
   GET ALL TWEETS
========================= */

app.get("/post", async (req, res) => {
  try {
    const tweets = await Tweet.find()
      .sort({
        timestamp: -1,
      })
      .populate("author");

    console.log("TWEETS FOUND:", tweets.length);

    return res.status(200).json(tweets);
  } catch (error) {
    console.log("GET /post ERROR:", error);

    return res.status(400).json({
      error: error.message,
    });
  }
});

/* =========================
   LIKE TWEET
========================= */

app.post("/like/:tweetid", async (req, res) => {
  try {
    const { userId } = req.body;

    const tweet = await Tweet.findById(req.params.tweetid);

    if (!tweet.likedBy.includes(userId)) {
      tweet.likes += 1;
      tweet.likedBy.push(userId);
      await tweet.save();
    }

    return res.send(tweet);
  } catch (error) {
    return res.status(400).send({
      error: error.message,
    });
  }
});

/* =========================
   RETWEET
========================= */

app.post("/retweet/:tweetid", async (req, res) => {
  try {
    const { userId } = req.body;

    const tweet = await Tweet.findById(req.params.tweetid);

    if (!tweet.retweetedBy.includes(userId)) {
      tweet.retweets += 1;
      tweet.retweetedBy.push(userId);
      await tweet.save();
    }

    return res.send(tweet);
  } catch (error) {
    return res.status(400).send({
      error: error.message,
    });
  }
});