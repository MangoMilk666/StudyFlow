const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

function signToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), email: user.email },
    process.env.JWT_SECRET || 'secret_key',
    { expiresIn: '24h' }
  )
}

// Register user
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username/email/password required' })
    }

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      username,
      email,
      password: hashedPassword,
    });

    await user.save();
    const token = signToken(user)
    res.status(201).json({
      token,
      user: {
        userId: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email/password required' })
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken(user)

    res.json({
      token,
      user: {
        userId: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update email
exports.updateEmail = async (req, res) => {
  try {
    const userId = req.user?.userId
    const { email } = req.body || {}

    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    if (!email) return res.status(400).json({ error: 'email required' })

    const exists = await User.findOne({ email: String(email).toLowerCase() })
    if (exists && exists._id.toString() !== String(userId)) {
      return res.status(409).json({ error: 'Email already in use' })
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      { email: String(email).toLowerCase() },
      { new: true }
    )

    if (!updated) return res.status(404).json({ error: 'User not found' })

    return res.json({
      user: {
        userId: updated._id,
        username: updated.username,
        email: updated.email,
      },
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
