import express from "express";
import {
	register,
	login,
	logout,
	updatePassword,
} from "../controllers/authController";
import { protect } from "../middleware/auth";
import { clearWishlist, getMe, getWishlist, syncWishlist, toggleWishlist, updateAvatar, updateDetails, updatePreferences } from "../controllers/userController";
import { createAddress, deleteAddress, getAddresses, setDefaultAddress, updateAddress } from "../controllers/addressController";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected routes
router.use(protect); // All routes after this middleware are protected

router.get("/me", getMe);
router.get("/logout", logout);
router.put("/update-avatar", updateAvatar);
router.put("/updatedetails", updateDetails);
router.put("/updatepassword", updatePassword);
router.put("/preferences", updatePreferences);

// Address management
router.get("/addresses", getAddresses);
router.post("/addresses", createAddress);
router.delete("/addresses/:addressId", deleteAddress);
router.put("/addresses/:addressId", updateAddress);
router.put('/:addressId/default', setDefaultAddress);

// Wishlist management routes
router.get('/wishlist', getWishlist);
router.post('/wishlist/toggle', toggleWishlist);
router.post('/wishlist/sync', syncWishlist);
router.delete('/wishlist', clearWishlist);


export default router;
