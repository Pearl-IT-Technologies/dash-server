"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteImage = exports.uploadImage = void 0;
const cloudinary_1 = require("cloudinary");
const asyncHandler_1 = require("../utils/asyncHandler");
const AppError_1 = require("../utils/AppError");
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
exports.uploadImage = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.file) {
        throw new AppError_1.AppError('Please upload an image', 400);
    }
    try {
        const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        const result = await cloudinary_1.v2.uploader.upload(base64Image, {
            folder: 'dashngshop',
            transformation: [
                { width: 800, height: 800, crop: 'fill', quality: 'auto' },
            ],
        });
        res.status(200).json({
            success: true,
            data: {
                url: result.secure_url,
                publicId: result.public_id,
                width: result.width,
                height: result.height,
            },
        });
    }
    catch (error) {
        throw new AppError_1.AppError('Error uploading image', 500);
    }
});
exports.deleteImage = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { publicId } = req.params;
    try {
        await cloudinary_1.v2.uploader.destroy(publicId);
        res.status(200).json({
            success: true,
            message: 'Image deleted successfully',
        });
    }
    catch (error) {
        throw new AppError_1.AppError('Error deleting image', 500);
    }
});
//# sourceMappingURL=uploadController.js.map