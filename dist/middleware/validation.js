"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = exports.registerSchema = exports.updateUserSchema = exports.createOrderSchema = exports.updateProductSchema = exports.createProductSchema = exports.validate = void 0;
const zod_1 = require("zod");
const AppError_1 = require("../utils/AppError");
const validate = (schema) => {
    return (req, res, next) => {
        try {
            schema.parse({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
                throw new AppError_1.AppError(`Validation failed: ${messages.join(', ')}`, 400);
            }
            next(error);
        }
    };
};
exports.validate = validate;
exports.createProductSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Name is required').max(200, 'Name too long'),
        description: zod_1.z.string().min(1, 'Description is required').max(2000, 'Description too long'),
        price: zod_1.z.number().min(0, 'Price must be positive'),
        originalPrice: zod_1.z.number().min(0, 'Original price must be positive').optional(),
        images: zod_1.z.array(zod_1.z.string().url('Invalid image URL')).min(1, 'At least one image is required'),
        category: zod_1.z.string().min(1, 'Category is required'),
        subcategory: zod_1.z.string().min(1, 'Subcategory is required'),
        sizes: zod_1.z.array(zod_1.z.string()).min(1, 'At least one size is required'),
        colors: zod_1.z.array(zod_1.z.string()).min(1, 'At least one color is required'),
        stockCount: zod_1.z.number().min(0, 'Stock count must be non-negative'),
        features: zod_1.z.array(zod_1.z.string()).optional(),
        tags: zod_1.z.array(zod_1.z.string()).optional(),
        sku: zod_1.z.string().min(1, 'SKU is required'),
        weight: zod_1.z.number().min(0, 'Weight must be positive').optional(),
        dimensions: zod_1.z.object({
            length: zod_1.z.number().min(0),
            width: zod_1.z.number().min(0),
            height: zod_1.z.number().min(0),
        }).optional(),
    }),
});
exports.updateProductSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).max(200).optional(),
        description: zod_1.z.string().min(1).max(2000).optional(),
        price: zod_1.z.number().min(0).optional(),
        originalPrice: zod_1.z.number().min(0).optional(),
        images: zod_1.z.array(zod_1.z.string().url()).optional(),
        category: zod_1.z.string().optional(),
        subcategory: zod_1.z.string().optional(),
        sizes: zod_1.z.array(zod_1.z.string()).optional(),
        colors: zod_1.z.array(zod_1.z.string()).optional(),
        stockCount: zod_1.z.number().min(0).optional(),
        features: zod_1.z.array(zod_1.z.string()).optional(),
        tags: zod_1.z.array(zod_1.z.string()).optional(),
        isNew: zod_1.z.boolean().optional(),
        isFeatured: zod_1.z.boolean().optional(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
exports.createOrderSchema = zod_1.z.object({
    body: zod_1.z.object({
        items: zod_1.z.array(zod_1.z.object({
            productId: zod_1.z.string().min(1, 'Product ID is required'),
            quantity: zod_1.z.number().min(1, 'Quantity must be at least 1'),
            size: zod_1.z.string().min(1, 'Size is required'),
            color: zod_1.z.string().min(1, 'Color is required'),
        })).min(1, 'At least one item is required'),
        shippingAddress: zod_1.z.object({
            firstName: zod_1.z.string().min(1, 'First name is required'),
            lastName: zod_1.z.string().min(1, 'Last name is required'),
            email: zod_1.z.string().email('Valid email is required'),
            phone: zod_1.z.string().optional(),
            street: zod_1.z.string().min(1, 'Street address is required'),
            city: zod_1.z.string().min(1, 'City is required'),
            state: zod_1.z.string().min(1, 'State is required'),
            zipCode: zod_1.z.string().min(1, 'ZIP code is required'),
            country: zod_1.z.string().min(1, 'Country is required'),
        }),
        billingAddress: zod_1.z.object({
            firstName: zod_1.z.string().min(1),
            lastName: zod_1.z.string().min(1),
            email: zod_1.z.string().email(),
            phone: zod_1.z.string().optional(),
            street: zod_1.z.string().min(1),
            city: zod_1.z.string().min(1),
            state: zod_1.z.string().min(1),
            zipCode: zod_1.z.string().min(1),
            country: zod_1.z.string().min(1),
        }).optional(),
        paymentMethod: zod_1.z.string().min(1, 'Payment method is required'),
        paymentDetails: zod_1.z.any().optional(),
    }),
});
exports.updateUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        firstName: zod_1.z.string().min(1).max(50).optional(),
        lastName: zod_1.z.string().min(1).max(50).optional(),
        email: zod_1.z.string().email().optional(),
        phone: zod_1.z.string().optional(),
        role: zod_1.z.enum(['customer', 'staff', 'admin']).optional(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
exports.registerSchema = zod_1.z.object({
    body: zod_1.z.object({
        firstName: zod_1.z.string().min(1, 'First name is required').max(50),
        lastName: zod_1.z.string().min(1, 'Last name is required').max(50),
        email: zod_1.z.string().email('Valid email is required'),
        password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    }),
});
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Valid email is required'),
        password: zod_1.z.string().min(1, 'Password is required'),
    }),
});
//# sourceMappingURL=validation.js.map