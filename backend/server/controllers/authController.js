const userModel = require("../models/userModel");
const revokedTokenModel = require("../models/revokedTokenModel");
const authService = require("../services/authService");

const normalizeEmail = (email) => {
  return String(email || "")
    .trim()
    .toLowerCase();
};

const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    const existingUser = await userModel.findUserByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const hashedPassword = await authService.hashPassword(password);

    const userId = await userModel.createUser({
      username,
      email: normalizedEmail,
      password: hashedPassword,
    });

    res.status(201).json({ userId });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Email already exists" });
    }

    res.status(500).json({ message: "Registration failed" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    const user = await userModel.findUserByEmail(normalizedEmail);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await authService.comparePassword(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
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
  } catch {
    res.status(500).json({ message: "Login failed" });
  }
};

const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = req.authToken || authHeader?.split(" ")[1];

    if (!token) {
      return res.status(200).json({ message: "Logged out successfully" });
    }

    let decoded = req.user;
    if (!decoded) {
      try {
        decoded = authService.verifyToken(token);
      } catch {
        return res.status(200).json({ message: "Logged out successfully" });
      }
    }

    const tokenHash = authService.hashToken(token);
    const expiresAt = decoded.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await revokedTokenModel.revokeToken({
      tokenHash,
      userId: decoded.userId,
      expiresAt,
    });

    return res.status(200).json({ message: "Logged out successfully" });
  } catch {
    return res.status(500).json({ message: "Logout failed" });
  }
};

module.exports = {
  register,
  login,
  logout,
};
