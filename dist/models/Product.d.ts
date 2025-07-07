import mongoose, { Document } from "mongoose";
export interface IProduct extends Document {
    name: string;
    description: string;
    price: number;
    originalPrice?: number;
    images: string[];
    category: string;
    subcategory: string;
    sizes: string[];
    colors: string[];
    inStock: boolean;
    stockCount: number;
    rating: number;
    reviewCount: number;
    features: string[];
    isNewProduct: boolean;
    isFeatured: boolean;
    isActive: boolean;
    tags: string[];
    sku: string;
    weight?: number;
    dimensions?: {
        length: number;
        width: number;
        height: number;
    };
    seoTitle?: string;
    seoDescription?: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const Product: mongoose.Model<IProduct, {}, {}, {}, mongoose.Document<unknown, {}, IProduct, {}> & IProduct & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default Product;
//# sourceMappingURL=Product.d.ts.map