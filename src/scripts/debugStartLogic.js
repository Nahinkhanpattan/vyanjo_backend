const moment = require("moment-timezone");

async function testDateLogic() {
  console.log("--- Debugging Start Date Logic ---");

  // Mock "Now" as Jan 22, 2026, say 10:00 AM IST
  // 2026-01-22 10:00 AM IST
  const mockNow = moment.tz(
    "2026-01-22 10:00",
    "YYYY-MM-DD HH:mm",
    "Asia/Kolkata",
  );
  console.log("Mock Now (Verification Time):", mockNow.format());

  const tomorrow = mockNow.clone().add(1, "days").startOf("day");
  console.log("Calculated Tomorrow (Target Start):", tomorrow.format());

  // Scenario 1: Subscription created on Jan 21 (Yesterday)
  // DB usually returns a Date object. Let's simulate that relative to UTC or just pass string.
  const startDateStr = "2026-01-21";
  const originalStart = moment(startDateStr).tz("Asia/Kolkata").startOf("day");
  console.log("\nScenario 1: Original Start was Jan 21 (Yesterday)");
  console.log("Original Start:", originalStart.format());
  console.log(
    `Is Original (${originalStart.format()}) Before Tomorrow (${tomorrow.format()})?`,
    originalStart.isBefore(tomorrow),
  );

  // Scenario 2: Subscription created on Jan 22 (Today)
  const startDateStr2 = "2026-01-22";
  const originalStart2 = moment(startDateStr2)
    .tz("Asia/Kolkata")
    .startOf("day");
  console.log("\nScenario 2: Original Start was Jan 22 (Today)");
  console.log("Original Start:", originalStart2.format());
  console.log(
    `Is Original (${originalStart2.format()}) Before Tomorrow (${tomorrow.format()})?`,
    originalStart2.isBefore(tomorrow),
  );

  // Scenario 3: Subscription meant for Jan 23 (Tomorrow)
  const startDateStr3 = "2026-01-23";
  const originalStart3 = moment(startDateStr3)
    .tz("Asia/Kolkata")
    .startOf("day");
  console.log("\nScenario 3: Original Start was Jan 23 (Tomorrow)");
  console.log("Original Start:", originalStart3.format());
  console.log(
    `Is Original (${originalStart3.format()}) Before Tomorrow (${tomorrow.format()})?`,
    originalStart3.isBefore(tomorrow),
  );
}

testDateLogic();
