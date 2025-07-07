import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
export declare const validate: (schema: z.ZodSchema) => (req: Request, res: Response, next: NextFunction) => void;
export declare const createProductSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodString;
        price: z.ZodNumber;
        originalPrice: z.ZodOptional<z.ZodNumber>;
        images: z.ZodArray<z.ZodString, "many">;
        category: z.ZodString;
        subcategory: z.ZodString;
        sizes: z.ZodArray<z.ZodString, "many">;
        colors: z.ZodArray<z.ZodString, "many">;
        stockCount: z.ZodNumber;
        features: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        sku: z.ZodString;
        weight: z.ZodOptional<z.ZodNumber>;
        dimensions: z.ZodOptional<z.ZodObject<{
            length: z.ZodNumber;
            width: z.ZodNumber;
            height: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            length: number;
            width: number;
            height: number;
        }, {
            length: number;
            width: number;
            height: number;
        }>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        description: string;
        price: number;
        images: string[];
        category: string;
        subcategory: string;
        sizes: string[];
        colors: string[];
        stockCount: number;
        sku: string;
        originalPrice?: number | undefined;
        features?: string[] | undefined;
        tags?: string[] | undefined;
        weight?: number | undefined;
        dimensions?: {
            length: number;
            width: number;
            height: number;
        } | undefined;
    }, {
        name: string;
        description: string;
        price: number;
        images: string[];
        category: string;
        subcategory: string;
        sizes: string[];
        colors: string[];
        stockCount: number;
        sku: string;
        originalPrice?: number | undefined;
        features?: string[] | undefined;
        tags?: string[] | undefined;
        weight?: number | undefined;
        dimensions?: {
            length: number;
            width: number;
            height: number;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        name: string;
        description: string;
        price: number;
        images: string[];
        category: string;
        subcategory: string;
        sizes: string[];
        colors: string[];
        stockCount: number;
        sku: string;
        originalPrice?: number | undefined;
        features?: string[] | undefined;
        tags?: string[] | undefined;
        weight?: number | undefined;
        dimensions?: {
            length: number;
            width: number;
            height: number;
        } | undefined;
    };
}, {
    body: {
        name: string;
        description: string;
        price: number;
        images: string[];
        category: string;
        subcategory: string;
        sizes: string[];
        colors: string[];
        stockCount: number;
        sku: string;
        originalPrice?: number | undefined;
        features?: string[] | undefined;
        tags?: string[] | undefined;
        weight?: number | undefined;
        dimensions?: {
            length: number;
            width: number;
            height: number;
        } | undefined;
    };
}>;
export declare const updateProductSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        price: z.ZodOptional<z.ZodNumber>;
        originalPrice: z.ZodOptional<z.ZodNumber>;
        images: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        category: z.ZodOptional<z.ZodString>;
        subcategory: z.ZodOptional<z.ZodString>;
        sizes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        colors: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        stockCount: z.ZodOptional<z.ZodNumber>;
        features: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        isNew: z.ZodOptional<z.ZodBoolean>;
        isFeatured: z.ZodOptional<z.ZodBoolean>;
        isActive: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        isNew?: boolean | undefined;
        name?: string | undefined;
        isActive?: boolean | undefined;
        description?: string | undefined;
        price?: number | undefined;
        originalPrice?: number | undefined;
        images?: string[] | undefined;
        category?: string | undefined;
        subcategory?: string | undefined;
        sizes?: string[] | undefined;
        colors?: string[] | undefined;
        stockCount?: number | undefined;
        features?: string[] | undefined;
        isFeatured?: boolean | undefined;
        tags?: string[] | undefined;
    }, {
        isNew?: boolean | undefined;
        name?: string | undefined;
        isActive?: boolean | undefined;
        description?: string | undefined;
        price?: number | undefined;
        originalPrice?: number | undefined;
        images?: string[] | undefined;
        category?: string | undefined;
        subcategory?: string | undefined;
        sizes?: string[] | undefined;
        colors?: string[] | undefined;
        stockCount?: number | undefined;
        features?: string[] | undefined;
        isFeatured?: boolean | undefined;
        tags?: string[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        isNew?: boolean | undefined;
        name?: string | undefined;
        isActive?: boolean | undefined;
        description?: string | undefined;
        price?: number | undefined;
        originalPrice?: number | undefined;
        images?: string[] | undefined;
        category?: string | undefined;
        subcategory?: string | undefined;
        sizes?: string[] | undefined;
        colors?: string[] | undefined;
        stockCount?: number | undefined;
        features?: string[] | undefined;
        isFeatured?: boolean | undefined;
        tags?: string[] | undefined;
    };
}, {
    body: {
        isNew?: boolean | undefined;
        name?: string | undefined;
        isActive?: boolean | undefined;
        description?: string | undefined;
        price?: number | undefined;
        originalPrice?: number | undefined;
        images?: string[] | undefined;
        category?: string | undefined;
        subcategory?: string | undefined;
        sizes?: string[] | undefined;
        colors?: string[] | undefined;
        stockCount?: number | undefined;
        features?: string[] | undefined;
        isFeatured?: boolean | undefined;
        tags?: string[] | undefined;
    };
}>;
export declare const createOrderSchema: z.ZodObject<{
    body: z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            productId: z.ZodString;
            quantity: z.ZodNumber;
            size: z.ZodString;
            color: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            productId: string;
            quantity: number;
            size: string;
            color: string;
        }, {
            productId: string;
            quantity: number;
            size: string;
            color: string;
        }>, "many">;
        shippingAddress: z.ZodObject<{
            firstName: z.ZodString;
            lastName: z.ZodString;
            email: z.ZodString;
            phone: z.ZodOptional<z.ZodString>;
            street: z.ZodString;
            city: z.ZodString;
            state: z.ZodString;
            zipCode: z.ZodString;
            country: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            street: string;
            city: string;
            state: string;
            zipCode: string;
            country: string;
            firstName: string;
            lastName: string;
            email: string;
            phone?: string | undefined;
        }, {
            street: string;
            city: string;
            state: string;
            zipCode: string;
            country: string;
            firstName: string;
            lastName: string;
            email: string;
            phone?: string | undefined;
        }>;
        billingAddress: z.ZodOptional<z.ZodObject<{
            firstName: z.ZodString;
            lastName: z.ZodString;
            email: z.ZodString;
            phone: z.ZodOptional<z.ZodString>;
            street: z.ZodString;
            city: z.ZodString;
            state: z.ZodString;
            zipCode: z.ZodString;
            country: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            street: string;
            city: string;
            state: string;
            zipCode: string;
            country: string;
            firstName: string;
            lastName: string;
            email: string;
            phone?: string | undefined;
        }, {
            street: string;
            city: string;
            state: string;
            zipCode: string;
            country: string;
            firstName: string;
            lastName: string;
            email: string;
            phone?: string | undefined;
        }>>;
        paymentMethod: z.ZodString;
        paymentDetails: z.ZodOptional<z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        items: {
            productId: string;
            quantity: number;
            size: string;
            color: string;
        }[];
        paymentMethod: string;
        shippingAddress: {
            street: string;
            city: string;
            state: string;
            zipCode: string;
            country: string;
            firstName: string;
            lastName: string;
            email: string;
            phone?: string | undefined;
        };
        paymentDetails?: any;
        billingAddress?: {
            street: string;
            city: string;
            state: string;
            zipCode: string;
            country: string;
            firstName: string;
            lastName: string;
            email: string;
            phone?: string | undefined;
        } | undefined;
    }, {
        items: {
            productId: string;
            quantity: number;
            size: string;
            color: string;
        }[];
        paymentMethod: string;
        shippingAddress: {
            street: string;
            city: string;
            state: string;
            zipCode: string;
            country: string;
            firstName: string;
            lastName: string;
            email: string;
            phone?: string | undefined;
        };
        paymentDetails?: any;
        billingAddress?: {
            street: string;
            city: string;
            state: string;
            zipCode: string;
            country: string;
            firstName: string;
            lastName: string;
            email: string;
            phone?: string | undefined;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        items: {
            productId: string;
            quantity: number;
            size: string;
            color: string;
        }[];
        paymentMethod: string;
        shippingAddress: {
            street: string;
            city: string;
            state: string;
            zipCode: string;
            country: string;
            firstName: string;
            lastName: string;
            email: string;
            phone?: string | undefined;
        };
        paymentDetails?: any;
        billingAddress?: {
            street: string;
            city: string;
            state: string;
            zipCode: string;
            country: string;
            firstName: string;
            lastName: string;
            email: string;
            phone?: string | undefined;
        } | undefined;
    };
}, {
    body: {
        items: {
            productId: string;
            quantity: number;
            size: string;
            color: string;
        }[];
        paymentMethod: string;
        shippingAddress: {
            street: string;
            city: string;
            state: string;
            zipCode: string;
            country: string;
            firstName: string;
            lastName: string;
            email: string;
            phone?: string | undefined;
        };
        paymentDetails?: any;
        billingAddress?: {
            street: string;
            city: string;
            state: string;
            zipCode: string;
            country: string;
            firstName: string;
            lastName: string;
            email: string;
            phone?: string | undefined;
        } | undefined;
    };
}>;
export declare const updateUserSchema: z.ZodObject<{
    body: z.ZodObject<{
        firstName: z.ZodOptional<z.ZodString>;
        lastName: z.ZodOptional<z.ZodString>;
        email: z.ZodOptional<z.ZodString>;
        phone: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodEnum<["customer", "staff", "admin"]>>;
        isActive: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        phone?: string | undefined;
        firstName?: string | undefined;
        lastName?: string | undefined;
        email?: string | undefined;
        role?: "customer" | "admin" | "staff" | undefined;
        isActive?: boolean | undefined;
    }, {
        phone?: string | undefined;
        firstName?: string | undefined;
        lastName?: string | undefined;
        email?: string | undefined;
        role?: "customer" | "admin" | "staff" | undefined;
        isActive?: boolean | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        phone?: string | undefined;
        firstName?: string | undefined;
        lastName?: string | undefined;
        email?: string | undefined;
        role?: "customer" | "admin" | "staff" | undefined;
        isActive?: boolean | undefined;
    };
}, {
    body: {
        phone?: string | undefined;
        firstName?: string | undefined;
        lastName?: string | undefined;
        email?: string | undefined;
        role?: "customer" | "admin" | "staff" | undefined;
        isActive?: boolean | undefined;
    };
}>;
export declare const registerSchema: z.ZodObject<{
    body: z.ZodObject<{
        firstName: z.ZodString;
        lastName: z.ZodString;
        email: z.ZodString;
        password: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        firstName: string;
        lastName: string;
        email: string;
        password: string;
    }, {
        firstName: string;
        lastName: string;
        email: string;
        password: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        firstName: string;
        lastName: string;
        email: string;
        password: string;
    };
}, {
    body: {
        firstName: string;
        lastName: string;
        email: string;
        password: string;
    };
}>;
export declare const loginSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        email: string;
        password: string;
    }, {
        email: string;
        password: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        email: string;
        password: string;
    };
}, {
    body: {
        email: string;
        password: string;
    };
}>;
//# sourceMappingURL=validation.d.ts.map