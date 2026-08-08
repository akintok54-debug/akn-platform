const User = require("../models/User");
const Company = require("../models/company");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ==========================
// Firma Kaydı
// ==========================
const register = async (req, res) => {
  try {
    const { companyName, name, phone, email, password } = req.body;

    const userExists = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "Bu e-posta zaten kayıtlı.",
      });
    }

    const company = await Company.create({
      companyName,
      phone,
      email: email.trim().toLowerCase(),
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      company: company._id,
      name,
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: "owner",
    });

    res.status(201).json({
      success: true,
      message: "Firma başarıyla oluşturuldu.",
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================
// Giriş
// ==========================
const login = async (req, res) => {
  try {

    const email = req.body.email.trim().toLowerCase();
    const password = req.body.password;

    const user = await User.findOne({ email }).populate("company");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "E-posta veya şifre hatalı.",
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "E-posta veya şifre hatalı.",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        company: user.company._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.json({
      success: true,
      token,
      user,
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  register,
  login,
};