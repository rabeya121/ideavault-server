
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");

require("dotenv").config();

// --------------------DB ----------------------------
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected!"))
  .catch((err) => console.error("❌ MongoDB Error:", err.message));

// --------------------MODELS ----------------------------
const User = mongoose.model("User", new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  photoURL: { type: String },
  role: { type: String, default: "user" },
  bookmarks: [{ type: String }],
}, { timestamps: true }));

const Idea = mongoose.model("Idea", new mongoose.Schema({
  title: { type: String, required: true },
  shortDescription: { type: String, required: true },
  detailedDescription: { type: String, required: true },
  category: { type: String, required: true },
  tags: [String],
  imageURL: { type: String },
  estimatedBudget: { type: String },
  targetAudience: { type: String },
  problemStatement: { type: String },
  proposedSolution: { type: String },
  authorEmail: { type: String, required: true },
  authorName: { type: String, required: true },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  likedBy: [{ type: String }],
}, { timestamps: true }));

const Comment = mongoose.model("Comment", new mongoose.Schema({
  ideaId: { type: mongoose.Schema.Types.ObjectId, ref: "Idea", required: true },
  userEmail: { type: String, required: true },
  userName: { type: String, required: true },
  text: { type: String, required: true },
}, { timestamps: true }));

// --------------------APP ----------------------------
const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "https://ideavault-client-beta.vercel.app",
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// --------------------COOKIE OPTIONS ------------------------
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// ---------------------------VERIFY TOKEN ----------------------------------
const verifyToken = async (req, res, next) => {
  const cookieToken = req.cookies?.token;
  const authHeader = req.headers?.authorization;
  const headerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (cookieToken) {
    try {
      const decoded = jwt.verify(cookieToken, process.env.JWT_SECRET);
      req.user = decoded;
      return next();
    } catch {
      return res.status(403).json({ message: "Invalid token" });
    }
  }

  if (headerToken) {
    try {
      const JWKS = createRemoteJWKSet(
        new URL(`${process.env.BETTER_AUTH_URL}/api/auth/jwks`)
      );
      const { payload } = await jwtVerify(headerToken, JWKS);
      req.user = payload;
      return next();
    } catch {
      return res.status(403).json({ message: "Invalid token" });
    }
  }

  return res.status(401).json({ message: "Unauthorized" });
};

// --------------------AUTH ROUTES ------------------------
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, photoURL } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword, photoURL });
    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, cookieOptions);
    res.status(201).json({ message: "User created successfully", user: { name, email, photoURL } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });
    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, cookieOptions);
    res.json({ message: "Login successful!", user: { name: user.name, email: user.email, photoURL: user.photoURL } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/auth/google-login", async (req, res) => {
  try {
    const { name, email, photoURL } = req.body;
    let user = await User.findOne({ email });
    if (!user) user = await User.create({ name, email, photoURL });
    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, cookieOptions);
    res.json({ message: "Login successful", user: { name: user.name, email: user.email, photoURL: user.photoURL } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("token", cookieOptions);
  res.json({ message: "Logged out successfully" });
});

app.get("/api/auth/me", async (req, res) => {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: "Unauthorized" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ email: decoded.email }).select("-password");
    res.json(user);
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
});

app.get("/api/auth/top-contributors", async (req, res) => {
  try {
    const users = await User.find().select("-password");
    const contributors = await Promise.all(users.map(async (user) => {
      const ideaCount = await Idea.countDocuments({ authorEmail: user.email });
      const commentCount = await Comment.countDocuments({ userEmail: user.email });
      return { name: user.name, email: user.email, photoURL: user.photoURL, ideaCount, commentCount, score: ideaCount * 3 + commentCount };
    }));
    const sorted = contributors.filter((c) => c.score > 0).sort((a, b) => b.score - a.score).slice(0, 4);
    res.json(sorted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put("/api/auth/update-profile", async (req, res) => {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: "Unauthorized" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { name, photoURL } = req.body;
    const user = await User.findOneAndUpdate({ email: decoded.email }, { name, photoURL }, { new: true }).select("-password");
    res.json({ message: "Profile updated", user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --------------------IDEA ROUTES ------------------------
app.get("/api/ideas", async (req, res) => {
  try {
    const { search, category, date } = req.query;
    let query = {};
    if (search) query.title = { $regex: search, $options: "i" };
    if (category) query.category = category;
    if (date) {
      const now = new Date();
      let startDate;
      if (date === "today") startDate = new Date(now.setHours(0, 0, 0, 0));
      else if (date === "week") startDate = new Date(now.setDate(now.getDate() - 7));
      else if (date === "month") startDate = new Date(now.setMonth(now.getMonth() - 1));
      if (startDate) query.createdAt = { $gte: startDate };
    }
    const ideas = await Idea.find(query).sort({ createdAt: -1 });
    res.json(ideas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/ideas/trending", async (req, res) => {
  try {
    const ideas = await Idea.find();
    const now = Date.now();
    const scored = ideas.map((idea) => {
      const ageInHours = (now - new Date(idea.createdAt).getTime()) / (1000 * 60 * 60);
      const recencyBonus = Math.max(0, 100 - ageInHours);
      const score = idea.views * 1 + (idea.likes || 0) * 3 + recencyBonus;
      return { ...idea.toObject(), trendingScore: score };
    });
    const trending = scored.sort((a, b) => b.trendingScore - a.trendingScore).slice(0, 6);
    res.json(trending);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ← specific routes must be defined before general ones to avoid conflicts
app.get("/api/ideas/user/:email", verifyToken, async (req, res) => {
  try {
    const ideas = await Idea.find({ authorEmail: req.params.email });
    res.json(ideas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/ideas/:id/like", verifyToken, async (req, res) => {
  try {
    const { email } = req.user;
    const idea = await Idea.findById(req.params.id);
    if (idea.likedBy.includes(email)) {
      return res.status(400).json({ message: "Already liked" });
    }
    idea.likes += 1;
    idea.likedBy.push(email);
    await idea.save();
    res.json({ likes: idea.likes, liked: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/ideas/:id/unlike", verifyToken, async (req, res) => {
  try {
    const { email } = req.user;
    const idea = await Idea.findById(req.params.id);
    idea.likes = Math.max(0, idea.likes - 1);
    idea.likedBy = idea.likedBy.filter((e) => e !== email);
    await idea.save();
    res.json({ likes: idea.likes, liked: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//  :id routes
app.get("/api/ideas/:id", async (req, res) => {
  try {
    const idea = await Idea.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }, { new: true });
    if (!idea) return res.status(404).json({ message: "Idea not found" });
    res.json(idea);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/ideas", verifyToken, async (req, res) => {
  try {
    const idea = await Idea.create(req.body);
    res.status(201).json(idea);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put("/api/ideas/:id", verifyToken, async (req, res) => {
  try {
    const idea = await Idea.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(idea);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete("/api/ideas/:id", verifyToken, async (req, res) => {
  try {
    await Idea.findByIdAndDelete(req.params.id);
    res.json({ message: "Idea deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//----------------------------- BOOKMARK ROUTES -----------------------
app.post("/api/bookmark/:ideaId", verifyToken, async (req, res) => {
  try {
    const { email } = req.user;
    const user = await User.findOne({ email });
    if (user.bookmarks.includes(req.params.ideaId)) {
      return res.status(400).json({ message: "Already bookmarked" });
    }
    user.bookmarks.push(req.params.ideaId);
    await user.save();
    res.json({ message: "Bookmarked!", bookmarks: user.bookmarks });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete("/api/bookmark/:ideaId", verifyToken, async (req, res) => {
  try {
    const { email } = req.user;
    const user = await User.findOne({ email });
    user.bookmarks = user.bookmarks.filter((id) => id !== req.params.ideaId);
    await user.save();
    res.json({ message: "Bookmark removed!", bookmarks: user.bookmarks });
  } 
  catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/bookmarks", verifyToken, async (req, res) => {
  try {
    const { email } = req.user;
    const user = await User.findOne({ email });
    const ideas = await Idea.find({ _id: { $in: user.bookmarks } });
    res.json(ideas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// -----------------------COMMENT ROUTES -------------------------------
app.get("/api/comments/user/:email", verifyToken, async (req, res) => {
  try {
    const comments = await Comment.find({ userEmail: req.params.email }).sort({ createdAt: -1 });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/comments/:ideaId", async (req, res) => {
  try {
    const comments = await Comment.find({ ideaId: req.params.ideaId }).sort({ createdAt: -1 });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/comments", verifyToken, async (req, res) => {
  try {
    const comment = await Comment.create(req.body);
    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put("/api/comments/:id", verifyToken, async (req, res) => {
  try {
    const comment = await Comment.findByIdAndUpdate(req.params.id, { text: req.body.text }, { new: true });
    res.json(comment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete("/api/comments/:id", verifyToken, async (req, res) => {
  try {
    await Comment.findByIdAndDelete(req.params.id);
    res.json({ message: "Comment deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --------------------ROOT ----------------------------
app.get("/", (req, res) => {
  res.send("IdeaVault Server Running Now! 🚀");
});


// --------------------START ----------------------------
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`✅ Server running on this  port ${PORT}`));