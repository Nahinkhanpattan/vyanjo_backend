const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.signup = async (req, res) => {
  try {
    const { email, password, name, phoneNumber } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: { message: "Email and password are required" },
      });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: { message: "Email already registered" } });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phoneNumber,
        role: "USER",
      },
    });

    // Generate Token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.status(201).json({
      data: {
        user: {
          userId: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phoneNumber: user.phoneNumber,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        token,
      },
      message: "User registered successfully",
    });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res
        .status(401)
        .json({ error: { message: "Invalid credentials" } });
    }

    if (!email || !password) {
      return res.status(400).json({
        error: { message: "Email and password are required" },
      });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res
        .status(401)
        .json({ error: { message: "Invalid credentials" } });
    }

    // Generate Token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      data: {
        user: {
          userId: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phoneNumber: user.phoneNumber,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        token,
      },
      message: "Login successful",
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name },
    });

    res.json({
      data: {
        user: {
          userId: updatedUser.id,
          name: updatedUser.name,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
        },
      },
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Profile Update Error:", error);
    res.status(500).json({
      error: {
        message: "Internal server error",
        code: "SERVER_ERROR",
        status: 500,
      },
    });
  }
};
