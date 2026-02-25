import { Request, Response } from "express";
export declare const register: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const login: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const requestPasswordResetOtp: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const resetPasswordWithOtp: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const updatePassword: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const logout: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const addAddress: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const updateAddress: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const deleteAddress: (req: Request, res: Response, next: import("express").NextFunction) => void;
//# sourceMappingURL=authController.d.ts.map