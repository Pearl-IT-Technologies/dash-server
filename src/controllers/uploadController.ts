// controllers/uploadController.ts
import { Request, Response } from 'express'
import { v2 as cloudinary } from 'cloudinary'
import { asyncHandler } from '../utils/asyncHandler'
import { AppError } from '../utils/AppError'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// @desc    Upload image to Cloudinary
// @route   POST /api/upload/image
// @access  Private (Admin/Staff)
export const uploadImage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError('Please upload an image', 400)
  }

  try {
    // Convert buffer to base64
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(base64Image, {
      folder: 'dashngshop',
      transformation: [
        { width: 800, height: 800, crop: 'fill', quality: 'auto' },
      ],
    })

    res.status(200).json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
      },
    })
  } catch (error) {
    throw new AppError('Error uploading image', 500)
  }
})

// @desc    Delete image from Cloudinary
// @route   DELETE /api/upload/image/:publicId
// @access  Private (Admin/Staff)
export const deleteImage = asyncHandler(async (req: Request, res: Response) => {
  const { publicId } = req.params

  try {
    await cloudinary.uploader.destroy(publicId as string)

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
    })
  } catch (error) {
    throw new AppError('Error deleting image', 500)
  }
})
