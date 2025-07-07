import { Request, Response, NextFunction } from "express";
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                role: string;
            };
        }
    }
}
export declare const protect: (req: Request, res: Response, next: NextFunction) => void;
export declare const restrictTo: (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const optionalAuth: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map