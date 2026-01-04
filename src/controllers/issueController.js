const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// User: Create Issue
exports.createIssue = async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, description } = req.body;

    if (!category || !description) {
      return res
        .status(400)
        .json({ error: { message: "Category and description are required" } });
    }

    const issue = await prisma.issue.create({
      data: {
        userId,
        category,
        description,
        status: "open",
      },
      include: { user: { select: { name: true, email: true } } },
    });

    res
      .status(201)
      .json({ data: { issue }, message: "Issue reported successfully" });
  } catch (error) {
    console.error("Create Issue Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

// User: Get My Issues
exports.getMyIssues = async (req, res) => {
  try {
    const userId = req.user.id;
    const issues = await prisma.issue.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    if (issues.length === 0) {
      return res.status(404).json({ error: { message: "No issues found" } });
    }
    res.json({ data: { issues } });
  } catch (error) {
    console.error("Get My Issues Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

// Admin: Get All Issues
exports.getAllIssues = async (req, res) => {
  try {
    const issues = await prisma.issue.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true, phoneNumber: true } },
      },
    });
    if (issues.length === 0) {
      return res.status(404).json({ error: { message: "No issues found" } });
    }
    res.json({ data: { issues } });
  } catch (error) {
    console.error("Get All Issues Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

// Admin: Update Issue (Resolve/Close)
exports.updateIssue = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;
    const { status, resolution } = req.body;

    // Validate status status enum if strict, or let it be string
    // Prompt says: 'open', 'resolved', 'closed' or 'in progress'

    const issue = await prisma.issue.update({
      where: { id },
      data: {
        status,
        resolution,
        adminId, // Track who updated it
      },
    });

    res.json({ data: { issue }, message: "Issue updated" });
  } catch (error) {
    console.error("Update Issue Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};
