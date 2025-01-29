const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// Connect to MongoDB Atlas
mongoose.connect('YOUR_MONGODB_ATLAS_URI', { useNewUrlParser: true });

// Define schemas
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  images: [String]
});

const User = mongoose.model('User', userSchema);

app.use(cors());
app.use(express.json());

// Create/Get user
app.post('/api/user', async (req, res) => {
  try {
    const user = await User.create({ username: req.body.username });
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: "Username taken" });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  const users = await User.find({}, 'username');
  res.json(users);
});

// Add image to user
app.post('/api/image', async (req, res) => {
  await User.updateOne(
    { username: req.body.username },
    { $push: { images: req.body.imageUrl } }
  );
  res.sendStatus(200);
});

// Get user images
app.get('/api/images/:username', async (req, res) => {
  const user = await User.findOne({ username: req.params.username });
  res.json(user?.images || []);
});

app.listen(process.env.PORT || 3000);
