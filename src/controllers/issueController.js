const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.raiseIssue = async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, description } = req.body;

    if (!category || !description) {
      return res.status(400).json({
        error: {
          message: 'Category and description are required',
          code: 'MISSING_FIELDS',
          status: 400
        }
      });
    }

    const issue = await prisma.issue.create({
      data: {
        userId,
        category,
        description,
        status: 'open'
      }
    });

    res.status(201).json({
      data: { issue },
      message: 'Issue raised successfully'
    });
  } catch (error) {
    console.error('Raise Issue Error:', error);
    res.status(500).json({ error: { message: 'Internal Server Error' } });
  }
};

exports.getUserIssues = async (req, res) => {
  try {
    const userId = req.user.id;
    const issues = await prisma.issue.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ data: { issues } });
  } catch (error) {
    console.error('Get User Issues Error:', error);
    res.status(500).json({ error: { message: 'Internal Server Error' } });
  }
};

// Admin Only
exports.getAllIssues = async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;

    const issues = await prisma.issue.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { 
        user: { 
          select: { name: true, phoneNumber: true } 
        } 
      }
    });
    res.json({ data: { issues } });
  } catch (error) {
    console.error('Get All Issues Error:', error);
    res.status(500).json({ error: { message: 'Internal Server Error' } });
  }
};

exports.resolveIssue = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution, status } = req.body; // status could be 'resolved', 'closed', etc.
    const adminId = req.user.id;

    const issue = await prisma.issue.update({
      where: { id },
      data: {
        resolution,
        status: status || 'resolved',
        adminId
      }
    });

    res.json({ data: { issue }, message: 'Issue resolved' });
  } catch (error) {
    console.error('Resolve Issue Error:', error);
    res.status(500).json({ error: { message: 'Internal Server Error' } });
  }
};
