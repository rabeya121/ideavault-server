// const express = require('express');
// const router = express.Router();
// const Comment = require('../models/Comment');
// const verifyToken = require('../middleware/verifyToken');

// // Get comments for an idea
// router.get('/:ideaId', async (req, res) => {
//   try {
//     const comments = await Comment.find({ ideaId: req.params.ideaId }).sort({ createdAt: -1 });
//     res.json(comments);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// // Add comment (private)
// router.post('/', verifyToken, async (req, res) => {
//   try {
//     const comment = await Comment.create(req.body);
//     res.status(201).json(comment);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// // Update comment (private)
// router.put('/:id', verifyToken, async (req, res) => {
//   try {
//     const comment = await Comment.findByIdAndUpdate(req.params.id, { text: req.body.text }, { new: true });
//     res.json(comment);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// // Delete comment (private)
// router.delete('/:id', verifyToken, async (req, res) => {
//   try {
//     await Comment.findByIdAndDelete(req.params.id);
//     res.json({ message: 'Comment deleted' });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// // Get comments by user email
// router.get('/user/:email', verifyToken, async (req, res) => {
//   try {
//     const comments = await Comment.find({ userEmail: req.params.email }).sort({ createdAt: -1 });
//     res.json(comments);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// module.exports = router;