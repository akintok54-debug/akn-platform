const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  listItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
} = require("../controllers/masterDataController");

router.use(verifyToken);

router.get("/:resource", listItems);
router.get("/:resource/:id", getItem);
router.post("/:resource", createItem);
router.put("/:resource/:id", updateItem);
router.delete("/:resource/:id", deleteItem);

module.exports = router;
