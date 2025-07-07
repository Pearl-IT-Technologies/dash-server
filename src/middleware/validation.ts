// middleware/validation.ts
import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { AppError } from '../utils/AppError'

// Generic validation middleware
export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      })
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        throw new AppError(`Validation failed: ${messages.join(', ')}`, 400)
      }
      next(error)
    }
  }
}

// Product validation schemas
export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
    description: z.string().min(1, 'Description is required').max(2000, 'Description too long'),
    price: z.number().min(0, 'Price must be positive'),
    originalPrice: z.number().min(0, 'Original price must be positive').optional(),
    images: z.array(z.string().url('Invalid image URL')).min(1, 'At least one image is required'),
    category: z.string().min(1, 'Category is required'),
    subcategory: z.string().min(1, 'Subcategory is required'),
    sizes: z.array(z.string()).min(1, 'At least one size is required'),
    colors: z.array(z.string()).min(1, 'At least one color is required'),
    stockCount: z.number().min(0, 'Stock count must be non-negative'),
    features: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    sku: z.string().min(1, 'SKU is required'),
    weight: z.number().min(0, 'Weight must be positive').optional(),
    dimensions: z.object({
      length: z.number().min(0),
      width: z.number().min(0),
      height: z.number().min(0),
    }).optional(),
  }),
})

export const updateProductSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().min(1).max(2000).optional(),
    price: z.number().min(0).optional(),
    originalPrice: z.number().min(0).optional(),
    images: z.array(z.string().url()).optional(),
    category: z.string().optional(),
    subcategory: z.string().optional(),
    sizes: z.array(z.string()).optional(),
    colors: z.array(z.string()).optional(),
    stockCount: z.number().min(0).optional(),
    features: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    isNew: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }),
})

// Order validation schemas
export const createOrderSchema = z.object({
  body: z.object({
    items: z.array(z.object({
      productId: z.string().min(1, 'Product ID is required'),
      quantity: z.number().min(1, 'Quantity must be at least 1'),
      size: z.string().min(1, 'Size is required'),
      color: z.string().min(1, 'Color is required'),
    })).min(1, 'At least one item is required'),
    shippingAddress: z.object({
      firstName: z.string().min(1, 'First name is required'),
      lastName: z.string().min(1, 'Last name is required'),
      email: z.string().email('Valid email is required'),
      phone: z.string().optional(),
      street: z.string().min(1, 'Street address is required'),
      city: z.string().min(1, 'City is required'),
      state: z.string().min(1, 'State is required'),
      zipCode: z.string().min(1, 'ZIP code is required'),
      country: z.string().min(1, 'Country is required'),
    }),
    billingAddress: z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional(),
      street: z.string().min(1),
      city: z.string().min(1),
      state: z.string().min(1),
      zipCode: z.string().min(1),
      country: z.string().min(1),
    }).optional(),
    paymentMethod: z.string().min(1, 'Payment method is required'),
    paymentDetails: z.any().optional(),
  }),
})

// User validation schemas
export const updateUserSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    role: z.enum(['customer', 'staff', 'admin']).optional(),
    isActive: z.boolean().optional(),
  }),
})

// Auth validation schemas
export const registerSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, 'First name is required').max(50),
    lastName: z.string().min(1, 'Last name is required').max(50),
    email: z.string().email('Valid email is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
})

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email is required'),
    password: z.string().min(1, 'Password is required'),
  }),
})