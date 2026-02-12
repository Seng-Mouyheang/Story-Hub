const userModel = require('../models/userModel');
const authService = require('../services/authService');

const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await userModel.findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    const hashedPassword = await authService.hashPassword(password);

    const userId = await userModel.createUser({
      username,
      email,
      password: hashedPassword,
    });

    res.status(201).json({ userId });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userModel.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await authService.comparePassword(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = authService.generateToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed' });
  }
};

module.exports = {
  register,
  login,
};