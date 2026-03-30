const userModel = require("../models/userModel");
const profileModel = require("../models/profileModel");
const revokedTokenModel = require("../models/revokedTokenModel");
const authService = require("../services/authService");
const { normalizeEmail } = require("../utils/email");

/**
 * Register a new user and auto-generate their profile.
 *
 * Flow:
 * 1. Create user with username, email, and hashed password
 * 2. Automatically generate a profile with displayName set to the username
 * 3. User can update displayName later via PUT /api/profile/
 *
 * Note: Username is immutable and cannot be changed after registration.
 * displayName can be changed independently of username via profile update endpoint.
 *
 * @param {Object} req - Express request object with body: { username, email, password }
 * @param {Object} res - Express response object
 */
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

    // Auto-generate profile with displayName set to username.
    // If this fails, rollback user creation so user/profile stay consistent.
    try {
      await profileModel.createProfile(userId.toString(), {
        displayName: username,
      });
    } catch (profileError) {
      try {
        await userModel.deleteUserById(userId);
      } catch (rollbackError) {
        console.error("Failed to rollback user after profile creation error:", {
          userId,
          rollbackError,
        });
      }

      console.error("Profile creation failed for user:", userId, profileError);
      return res.status(500).json({ message: "Registration failed" });
    }

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
