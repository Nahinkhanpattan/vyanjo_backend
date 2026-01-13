const http = require("http");

// Helper to make HTTP requests
function makeRequest(path, method, body, token = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : "";
    const options = {
      hostname: "localhost",
      port: 3000,
      path: path,
      method: method,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length,
      },
    };

    if (token) {
      options.headers["Authorization"] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let responseBody = "";
      res.on("data", (chunk) => (responseBody += chunk));
      res.on("end", () => {
        try {
          const json = responseBody ? JSON.parse(responseBody) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ status: res.statusCode, data: json });
          } else {
            console.error(`Request Failed: ${res.statusCode} ${path}`);
            console.error(JSON.stringify(json, null, 2));
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        } catch (e) {
          console.error("JSON Parse Error:", responseBody);
          reject(e);
        }
      });
    });

    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

// 1. Login to get Token
async function seed() {
  console.log("Authenticating as Admin...");
  try {
    const loginRes = await makeRequest("/api/admin/auth/login", "POST", {
      email: "admin@vyanjo.com",
      password: "admin123",
    });

    const token = loginRes.data.data.token; // Access nested token based on controller conventions
    // Usually res.json({ data: { token: ... } }) or just { token: ... }
    // Checking adminAuthController would confirm, but let's try standard path first.
    // If undefined, I'll log whole response.

    if (!token) {
      console.error("Login successful but no token found in:", loginRes.data);
      return;
    }
    console.log("Authentication successful.");

    // 2. Create Meal Package
    const payload = {
      name: "Standard Plan Variants",
      tier: "REGULAR",
      description:
        "Standard meal plans including a wide range of duration options.",
      defaultContainer: "DISPOSABLE",
      allowsContainerChoice: true,
      allowsDietUpgrade: true,
      allowsCuisineUpgrade: true,
      pricings: [
        // --- VEG ---
        {
          dietType: "VEG",
          cuisineType: "SOUTH_INDIAN",
          durationDays: 1,
          mealsIncluded: ["LUNCH", "DINNER"],
          price: 300,
        },
        {
          dietType: "VEG",
          cuisineType: "SOUTH_INDIAN",
          durationDays: 1,
          mealsIncluded: ["LUNCH", "DINNER"],
          price: 350, // Premium (Wed/Sun)
        },
        {
          dietType: "VEG",
          cuisineType: "SOUTH_INDIAN",
          durationDays: 3,
          mealsIncluded: ["LUNCH", "DINNER"],
          price: 900,
        },
        {
          dietType: "VEG",
          cuisineType: "SOUTH_INDIAN",
          durationDays: 3,
          mealsIncluded: ["LUNCH", "DINNER"],
          price: 1050, // Premium (Wed/Sun)
        },
        {
          dietType: "VEG",
          cuisineType: "SOUTH_INDIAN",
          durationDays: 14,
          mealsIncluded: ["LUNCH", "DINNER"],
          price: 4000,
        },
        {
          dietType: "VEG",
          cuisineType: "SOUTH_INDIAN",
          durationDays: 30,
          mealsIncluded: ["LUNCH", "DINNER"],
          price: 6499,
        },

        // --- NON-VEG ---
        {
          dietType: "NON_VEG",
          cuisineType: "SOUTH_INDIAN",
          durationDays: 1,
          mealsIncluded: ["LUNCH", "DINNER"],
          price: 350,
        },
        {
          dietType: "NON_VEG",
          cuisineType: "SOUTH_INDIAN",
          durationDays: 1,
          mealsIncluded: ["LUNCH", "DINNER"],
          price: 400, // Premium
        },
        {
          dietType: "NON_VEG",
          cuisineType: "SOUTH_INDIAN",
          durationDays: 3,
          mealsIncluded: ["LUNCH", "DINNER"],
          price: 1000,
        },
        {
          dietType: "NON_VEG",
          cuisineType: "SOUTH_INDIAN",
          durationDays: 3,
          mealsIncluded: ["LUNCH", "DINNER"],
          price: 1200, // Premium
        },
        {
          dietType: "NON_VEG",
          cuisineType: "SOUTH_INDIAN",
          durationDays: 14,
          mealsIncluded: ["LUNCH", "DINNER"],
          price: 4500,
        },
        {
          dietType: "NON_VEG",
          cuisineType: "SOUTH_INDIAN",
          durationDays: 30,
          mealsIncluded: ["LUNCH", "DINNER"],
          price: 6999,
        },
      ],
    };

    console.log("Creating Meal Packages...");
    const createRes = await makeRequest(
      "/api/admin/meal-packages",
      "POST",
      payload,
      token
    );
    console.log("Success:", JSON.stringify(createRes.data, null, 2));
  } catch (err) {
    console.error("Script failed:", err.message);
  }
}

seed();
