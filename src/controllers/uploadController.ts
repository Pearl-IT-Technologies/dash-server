import { Request, Response } from 'express'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { asyncHandler } from '../utils/asyncHandler'
import { AppError } from '../utils/AppError'
import crypto from 'crypto'
import path from 'path'

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.AWS_S3_BUCKET!
const REGION = process.env.AWS_REGION!

// @desc    Upload image to S3
// @route   POST /api/upload/image
// @access  Private (Admin/Staff)
export const uploadImage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError('Please upload an image', 400)
  }

  try {
    const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg'
    const key = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      }),
    )

    const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`

    res.status(200).json({
      success: true,
      data: {
        url,
        publicId: key,
        width: null,
        height: null,
      },
    })
  } catch (error) {
    console.error('S3 upload error:', error)
    throw new AppError('Error uploading image', 500)
  }
})

// @desc    Delete image from S3
// @route   DELETE /api/upload/image/:publicId
// @access  Private (Admin/Staff)
export const deleteImage = asyncHandler(async (req: Request, res: Response) => {
  const { publicId } = req.params

  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: publicId,
      }),
    )

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
    })
  } catch (error) {
    console.error('S3 delete error:', error)
    throw new AppError('Error deleting image', 500)
  }
})
