const moment = require("moment-timezone");

const now = moment().tz("Asia/Kolkata");
const tomorrow = now.clone().add(1, "days");
const future = now.clone().add(2, "days");

console.log("Current Time:", now.format());
console.log("Tomorrow:", tomorrow.format("YYYY-MM-DD"));

// Mock Logic Test
const reqDate = tomorrow.clone().startOf("day");
const cutoff = 20; // 8 PM

if (reqDate.isSame(tomorrow, "day")) {
  if (now.hour() >= cutoff) {
    console.log("FAIL: Cannot pause tomorrow after 8 PM");
  } else {
    console.log("PASS: Can pause tomorrow before 8 PM");
  }
}

// Future Date Test
console.log("Future Date:", future.format("YYYY-MM-DD"));
if (future.isAfter(tomorrow)) {
  console.log("PASS: Can pause future date");
}
