const prisma = require("../prisma");

// --- CREATE ---

exports.createState = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name)
      return res.status(400).json({ error: { message: "Name is required" } });

    const state = await prisma.state.create({ data: { name } });
    res.status(201).json({ data: { state }, message: "State created" });
  } catch (error) {
    console.error("Create State Error:", error);
    if (error.code === "P2002")
      return res
        .status(409)
        .json({ error: { message: "State already exists" } });
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.createDistrict = async (req, res) => {
  try {
    const { name, stateId } = req.body;
    if (!name || !stateId)
      return res
        .status(400)
        .json({ error: { message: "Name and StateID are required" } });

    const district = await prisma.district.create({ data: { name, stateId } });
    res.status(201).json({ data: { district }, message: "District created" });
  } catch (error) {
    console.error("Create District Error:", error);
    if (error.code === "P2002")
      return res
        .status(409)
        .json({ error: { message: "District already exists in this state" } });
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.createPincode = async (req, res) => {
  try {
    const { code, districtId } = req.body;
    if (!code || !districtId)
      return res
        .status(400)
        .json({ error: { message: "Code and DistrictID are required" } });

    const pincode = await prisma.pincode.create({ data: { code, districtId } });
    res.status(201).json({ data: { pincode }, message: "Pincode created" });
  } catch (error) {
    console.error("Create Pincode Error:", error);
    if (error.code === "P2002")
      return res
        .status(409)
        .json({ error: { message: "Pincode already exists" } });
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

// --- READ ---

exports.getAllStates = async (req, res) => {
  try {
    const states = await prisma.state.findMany({ orderBy: { name: "asc" } });
    res.json({ data: { states } });
  } catch (error) {
    console.error("Get States Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.getDistrictsByState = async (req, res) => {
  try {
    const { stateId } = req.params;
    const districts = await prisma.district.findMany({
      where: { stateId },
      orderBy: { name: "asc" },
    });
    res.json({ data: { districts } });
  } catch (error) {
    console.error("Get Districts Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.getPincodesByDistrict = async (req, res) => {
  try {
    const { districtId } = req.params;
    const pincodes = await prisma.pincode.findMany({
      where: { districtId },
      orderBy: { code: "asc" },
    });
    res.json({ data: { pincodes } });
  } catch (error) {
    console.error("Get Pincodes Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};
