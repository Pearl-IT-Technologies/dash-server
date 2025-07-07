"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const productController_1 = require("../controllers/productController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/', productController_1.getProducts);
router.get('/:id', productController_1.getProduct);
router.get('/categories', productController_1.getProductCategories);
router.use(auth_1.protect);
router.post('/', (0, auth_1.restrictTo)('admin', 'salesrep', 'storekeeper'), productController_1.createProduct);
router.put('/:id', (0, auth_1.restrictTo)('admin', 'salesrep', 'storekeeper'), productController_1.updateProduct);
router.delete('/:id', (0, auth_1.restrictTo)('admin', 'storekeeper'), productController_1.deleteProduct);
router.patch('/:id/stock', (0, auth_1.restrictTo)('admin', 'salesrep', 'storekeeper'), productController_1.updateProductStock);
exports.default = router;
//# sourceMappingURL=products.js.map