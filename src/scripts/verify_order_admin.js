const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const adminController = require("../controllers/adminController");
const moment = require("moment-timezone");

// Mock Express Req/Res
const mockReq = (query = {}, params = {}, body = {}) => ({
  query,
  params,
  body,
});

const mockRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.data = data;
    return res;
  };
  return res;
};

async function verify() {
  console.log("--- Starting Verification ---");

  const today = moment().format("YYYY-MM-DD");
  console.log(`Testing for date: ${today}`);

  // 1. Get Order Stats
  console.log("\n1. Testing getOrderStats...");
  const req1 = mockReq({ date: today });
  const res1 = mockRes();
  await adminController.getOrderStats(req1, res1);
  console.log("Stats Response:", JSON.stringify(res1.data, null, 2));

  // 2. Get Users With Orders
  console.log("\n2. Testing getUsersWithOrders...");
  const req2 = mockReq({ date: today });
  const res2 = mockRes();
  await adminController.getUsersWithOrders(req2, res2);
  // Log simplified users
  if (res2.data && res2.data.data && res2.data.data.users) {
    console.log(`Found ${res2.data.data.users.length} users with orders.`);
    if (res2.data.data.users.length > 0) {
      console.log(
        "First User Sample:",
        JSON.stringify(res2.data.data.users[0], null, 2)
      );
      // Store a meal ID for next test
      const mealId = res2.data.data.users[0].meals[0].mealId;

      // 3. Update Meal Status
      if (mealId) {
        console.log(`\n3. Testing updateMealStatus for Meal ID: ${mealId}...`);
        const req3 = mockReq({}, { id: mealId }, { status: "ready" });
        const res3 = mockRes();
        await adminController.updateMealStatus(req3, res3);
        console.log(
          "Update Status Response:",
          JSON.stringify(res3.data, null, 2)
        );
      }

      // 4. Get User Details
      const userId = res2.data.data.users[0].userId;
      console.log(
        `\n4. Testing getUserDeliveryDetails for User ID: ${userId}...`
      );
      const req4 = mockReq({}, { id: userId });
      const res4 = mockRes();
      await adminController.getUserDeliveryDetails(req4, res4);
      console.log(
        "User Details Response (Keys):",
        Object.keys(res4.data.data.user)
      );
    }
  } else {
    console.log(
      "No users found with orders (Are there any active subscriptions for today?)."
    );
  }

  // 5. Daily Earnings
  console.log("\n5. Testing getDailyEarnings...");
  const req5 = mockReq({ date: today });
  const res5 = mockRes();
  await adminController.getDailyEarnings(req5, res5);
  console.log("Earnings Response:", JSON.stringify(res5.data, null, 2));

  console.log("\n--- Verification Complete ---");
  process.exit(0);
}

verify().catch((e) => {
  console.error(e);
  process.exit(1);
});
