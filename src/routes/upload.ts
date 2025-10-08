import express from "express";
import multer from "multer";
import { uploadImage, deleteImage } from "../controllers/uploadController";
import { protect } from "../middleware/auth";

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
	storage,
	limits: {
		fileSize: 5 * 1024 * 1024, // 5MB limit
	},
	fileFilter: (req, file, cb) => {
		if (file.mimetype.startsWith("image/")) {
			cb(null, true);
		} else {
			cb(new Error("Only image files are allowed") as any, false);
		}
	},
});

// All routes are protected
router.use(protect);

router.post("/image", upload.single("image"), uploadImage);
router.delete("/image/:publicId", deleteImage);

export default router;
