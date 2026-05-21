// const express = require('express');
// const router = express.Router();
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const User = require('../models/User');

// // Register
// router.post('/register', async (req, res) => {
//   try {
//     const { name, email, password, photoURL } = req.body;

//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res.status(400).json({ message: 'User already exists' });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);
//     const user = await User.create({ name, email, password: hashedPassword, photoURL });

//     const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

//     res.cookie('token', token, {
//       httpOnly: true,
//       secure: false,
//       sameSite: 'lax',
//       maxAge: 7 * 24 * 60 * 60 * 1000
//     });

//     res.status(201).json({ message: 'User created successfully', user: { name, email, photoURL } });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// // Login
// router.post('/login', async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(400).json({ message: 'User not found' });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ message: 'Invalid credentials' });
//     }

//     const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

//     res.cookie('token', token, {
//       httpOnly: true,
//       secure: false,
//       sameSite: 'lax',
//       maxAge: 7 * 24 * 60 * 60 * 1000
//     });

//     res.json({ message: 'Login successful', user: { name: user.name, email: user.email, photoURL: user.photoURL } });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// // Google Login
// router.post('/google-login', async (req, res) => {
//   try {
//     const { name, email, photoURL } = req.body;

//     let user = await User.findOne({ email });
//     if (!user) {
//       user = await User.create({ name, email, photoURL });
//     }

//     const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

//     res.cookie('token', token, {
//       httpOnly: true,
//       secure: false,
//       sameSite: 'lax',
//       maxAge: 7 * 24 * 60 * 60 * 1000
//     });

//     res.json({ message: 'Login successful', user: { name: user.name, email: user.email, photoURL: user.photoURL } });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// // Logout
// router.post('/logout', (req, res) => {
//   res.clearCookie('token');
//   res.json({ message: 'Logged out successfully' });
// });

// // Get current user
// router.get('/me', async (req, res) => {
//   try {
//     const token = req.cookies?.token;
//     if (!token) return res.status(401).json({ message: 'Unauthorized' });

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const user = await User.findOne({ email: decoded.email }).select('-password');
//     res.json(user);
//   } catch (error) {
//     res.status(401).json({ message: 'Invalid token' });
//   }
// });
// // Top Contributors
// router.get('/top-contributors', async (req, res) => {
//   try {
//     const Comment = require('../models/Comment');
//     const Idea = require('../models/Idea');

//     const users = await User.find().select('-password');

//     const contributors = await Promise.all(
//       users.map(async (user) => {
//         const ideaCount = await Idea.countDocuments({ authorEmail: user.email });
//         const commentCount = await Comment.countDocuments({ userEmail: user.email });
//         return {
//           name: user.name,
//           email: user.email,
//           photoURL: user.photoURL,
//           ideaCount,
//           commentCount,
//           score: ideaCount * 3 + commentCount,
//         };
//       })
//     );

//     const sorted = contributors
//       .filter((c) => c.score > 0)
//       .sort((a, b) => b.score - a.score)
//       .slice(0, 4);

//     res.json(sorted);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// // Update Profile
// router.put('/update-profile', async (req, res) => {
//   try {
//     const token = req.cookies?.token;
//     if (!token) return res.status(401).json({ message: 'Unauthorized' });

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const { name, photoURL } = req.body;

//     const user = await User.findOneAndUpdate(
//       { email: decoded.email },
//       { name, photoURL },
//       { new: true }
//     ).select('-password');

//     res.json({ message: 'Profile updated', user });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// module.exports = router;