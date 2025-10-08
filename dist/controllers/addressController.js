"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setDefaultAddress = exports.deleteAddress = exports.updateAddress = exports.createAddress = exports.getAddresses = void 0;
const User_1 = __importDefault(require("../models/User"));
const AppError_1 = require("../utils/AppError");
const asyncHandler_1 = require("../utils/asyncHandler");
exports.getAddresses = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = await User_1.default.findById(req.user?.id).select('addresses');
    if (!user) {
        throw new AppError_1.AppError('User not found', 404);
    }
    res.json({
        success: true,
        data: user.addresses || [],
        count: user.addresses?.length || 0
    });
});
exports.createAddress = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { type, street, city, state, zipCode, country, phone, isDefault } = req.body;
    if (!type || !street || !city || !state || !zipCode || !country) {
        throw new AppError_1.AppError('Please provide all required address fields', 400);
    }
    if (!['billing', 'shipping'].includes(type)) {
        throw new AppError_1.AppError('Address type must be either billing or shipping', 400);
    }
    const user = await User_1.default.findById(req.user?.id);
    if (!user) {
        throw new AppError_1.AppError('User not found', 404);
    }
    if (!user.addresses) {
        user.addresses = [];
    }
    const shouldBeDefault = isDefault || user.addresses.length === 0;
    if (shouldBeDefault) {
        user.addresses.forEach(address => {
            if (address.type === type) {
                address.isDefault = false;
            }
        });
    }
    const newAddress = {
        type,
        street: street.trim(),
        city: city.trim(),
        state: state.trim(),
        zipCode: zipCode.trim(),
        country: country.trim(),
        phone: phone?.trim(),
        isDefault: shouldBeDefault
    };
    user.addresses.push(newAddress);
    await user.save();
    res.status(201).json({
        success: true,
        message: 'Address created successfully',
        data: newAddress
    });
});
exports.updateAddress = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { addressId } = req.params;
    const { type, street, city, state, zipCode, country, phone, isDefault } = req.body;
    if (!type || !street || !city || !state || !zipCode || !country) {
        throw new AppError_1.AppError('Please provide all required address fields', 400);
    }
    if (!['billing', 'shipping'].includes(type)) {
        throw new AppError_1.AppError('Address type must be either billing or shipping', 400);
    }
    const user = await User_1.default.findById(req.user?.id);
    if (!user || !user.addresses) {
        throw new AppError_1.AppError('User or addresses not found', 404);
    }
    const addressIndex = user.addresses.findIndex(addr => addr._id === addressId);
    if (addressIndex === -1) {
        throw new AppError_1.AppError('Address not found', 404);
    }
    if (isDefault) {
        user.addresses.forEach(address => {
            if (address.type === type && address._id !== addressId) {
                address.isDefault = false;
            }
        });
    }
    user.addresses[addressIndex] = {
        ...user.addresses[addressIndex],
        type,
        street: street.trim(),
        city: city.trim(),
        state: state.trim(),
        zipCode: zipCode.trim(),
        country: country.trim(),
        phone: phone?.trim(),
        isDefault: isDefault || false
    };
    await user.save();
    res.json({
        success: true,
        message: 'Address updated successfully',
        data: user.addresses[addressIndex]
    });
});
exports.deleteAddress = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { addressId } = req.params;
    const user = await User_1.default.findById(req.user?.id);
    if (!user || !user.addresses) {
        throw new AppError_1.AppError('User or addresses not found', 404);
    }
    const addressIndex = user.addresses.findIndex(addr => addr._id === addressId);
    if (addressIndex === -1) {
        throw new AppError_1.AppError('Address not found', 404);
    }
    const addressToDelete = user.addresses[addressIndex];
    if (addressToDelete?.isDefault) {
        const otherAddressOfSameType = user.addresses.find(addr => addr.type === addressToDelete.type && addr._id !== addressId);
        if (otherAddressOfSameType) {
            otherAddressOfSameType.isDefault = true;
        }
    }
    user.addresses.splice(addressIndex, 1);
    await user.save();
    res.json({
        success: true,
        message: 'Address deleted successfully',
        data: { deletedAddressId: addressId }
    });
});
exports.setDefaultAddress = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { addressId } = req.params;
    const user = await User_1.default.findById(req.user?.id);
    if (!user || !user.addresses) {
        throw new AppError_1.AppError('User or addresses not found', 404);
    }
    const addressToSetDefault = user.addresses.find(addr => addr._id === addressId);
    if (!addressToSetDefault) {
        throw new AppError_1.AppError('Address not found', 404);
    }
    user.addresses.forEach(address => {
        if (address.type === addressToSetDefault.type) {
            address.isDefault = address._id === addressId;
        }
    });
    await user.save();
    res.json({
        success: true,
        message: 'Default address updated successfully',
        data: addressToSetDefault
    });
});
//# sourceMappingURL=addressController.js.map