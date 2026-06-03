import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

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

    const user = await User.findOne({ email });

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
      { email },
      {
        $set: {
          ...req.body,
          keywordNotificationsEnabled:
            req.body.keywordNotificationsEnabled === true,
        },
      },
      { new: true }
    );

    return res.status(200).json(updatedUser);
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
});

/* =========================
   CREATE TWEET
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
   GET ALL TWEETS
========================= */

app.get("/post", async (req, res) => {
  try {
    const tweets = await Tweet.find()
      .sort({ timestamp: -1 })
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

//
//  LIKE TWEET
app.post("/like/:tweetid", async (req, res) => {
  try {
    const { userId } = req.body;
    const tweet = await Tweet.findById(req.params.tweetid);
    if (!tweet.likedBy.includes(userId)) {
      tweet.likes += 1;
      tweet.likedBy.push(userId);
      await tweet.save();
    }
    res.send(tweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// retweet 
app.post("/retweet/:tweetid", async (req, res) => {
  try {
    const { userId } = req.body;
    const tweet = await Tweet.findById(req.params.tweetid);
    if (!tweet.retweetedBy.includes(userId)) {
      tweet.retweets += 1;
      tweet.retweetedBy.push(userId);
      await tweet.save();
    }
    res.send(tweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});