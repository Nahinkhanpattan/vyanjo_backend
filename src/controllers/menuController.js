const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const moment = require('moment-timezone');

exports.getCurrentMenu = async (req, res) => {
  try {
    const { diet, cuisine } = req.query;

    if (!diet || !cuisine) {
      return res.status(400).json({
        error: {
          message: 'Diet and Cuisine types are required',
          code: 'MISSING_PARAMS',
          status: 400,
        },
      });
    }

    // Determine current week start date (Assuming Monday is start?)
    // Prompt doesn't specify, but `week_start_date` suggests weekly blocks.
    // I'll assume week starts on Monday or Sunday. Let's use moment to get start of week.
    const today = moment().tz('Asia/Kolkata');
    const weekStart = today.clone().startOf('isoWeek'); // Monday

    const menu = await prisma.weeklyMenu.findUnique({
      where: {
        dietType_cuisineType_weekStartDate: {
          dietType: diet,
          cuisineType: cuisine,
          weekStartDate: weekStart.toDate(),
        },
      },
      include: {
        items: true,
      },
    });

    if (!menu) {
       return res.status(404).json({
        error: {
          message: 'Menu not found for current week',
          code: 'MENU_NOT_FOUND',
          status: 404,
        },
      });
    }

    res.json({
      data: {
        menu,
      },
    });
  } catch (error) {
    console.error('Get Current Menu Error:', error);
    res.status(500).json({
      error: {
        message: 'Internal server error',
        code: 'SERVER_ERROR',
        status: 500,
      },
    });
  }
};

exports.getWeeklyMenu = async (req, res) => {
  try {
    const { date, diet, cuisine } = req.query;

    if (!date || !diet || !cuisine) {
      return res.status(400).json({
        error: {
          message: 'Date, Diet and Cuisine types are required',
          code: 'MISSING_PARAMS',
          status: 400,
        },
      });
    }

    const inputDate = moment(date).tz('Asia/Kolkata');
    const weekStart = inputDate.clone().startOf('isoWeek');

    const menu = await prisma.weeklyMenu.findUnique({
      where: {
        dietType_cuisineType_weekStartDate: {
          dietType: diet,
          cuisineType: cuisine,
          weekStartDate: weekStart.toDate(),
        },
      },
      include: {
        items: true,
      },
    });

    if (!menu) {
       return res.status(404).json({
        error: {
          message: 'Menu not found for specified week',
          code: 'MENU_NOT_FOUND',
          status: 404,
        },
      });
    }

    res.json({
      data: {
        menu,
      },
    });
  } catch (error) {
    console.error('Get Weekly Menu Error:', error);
    res.status(500).json({
      error: {
        message: 'Internal server error',
        code: 'SERVER_ERROR',
        status: 500,
      },
    });
  }
};
