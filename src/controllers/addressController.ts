import User from '../models/User';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { Request, Response } from 'express';

// @desc    Get user addresses
// @route   GET /api/auth/addresses
// @access  Private
export const getAddresses = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user?.id).select('addresses');
  
  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    success: true,
    data: user.addresses || [],
    count: user.addresses?.length || 0
  });
});

// @desc    Create new address
// @route   POST /api/auth/addresses
// @access  Private
export const createAddress = asyncHandler(async (req: Request, res: Response) => {
  const {
    type,
    street,
    city,
    state,
    zipCode,
    country,
    phone,
    isDefault
  } = req.body;

  // Basic validation
  if (!type || !street || !city || !state || !zipCode || !country) {
    throw new AppError('Please provide all required address fields', 400);
  }

  if (!['billing', 'shipping'].includes(type)) {
    throw new AppError('Address type must be either billing or shipping', 400);
  }

  const user = await User.findById(req.user?.id);
  
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Initialize addresses array if it doesn't exist
  if (!user.addresses) {
    user.addresses = [];
  }

  // If this is the first address or isDefault is true, make it default
  const shouldBeDefault = isDefault || user.addresses.length === 0;

  // If setting as default, remove default from other addresses of the same type
  if (shouldBeDefault) {
    user.addresses.forEach(address => {
      if (address.type === type) {
        address.isDefault = false;
      }
    });
  }

  // Create new address
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

// @desc    Update address
// @route   PUT /api/auth/addresses/:addressId
// @access  Private
export const updateAddress = asyncHandler(async (req: Request, res: Response) => {
  const { addressId } = req.params;
  const {
    type,
    street,
    city,
    state,
    zipCode,
    country,
    phone,
    isDefault
  } = req.body;

  // Basic validation
  if (!type || !street || !city || !state || !zipCode || !country) {
    throw new AppError('Please provide all required address fields', 400);
  }

  if (!['billing', 'shipping'].includes(type)) {
    throw new AppError('Address type must be either billing or shipping', 400);
  }

  const user = await User.findById(req.user?.id);
  
  if (!user || !user.addresses) {
    throw new AppError('User or addresses not found', 404);
  }

  // Find the address to update
  const addressIndex = user.addresses.findIndex(addr => addr._id === addressId);
  
  if (addressIndex === -1) {
    throw new AppError('Address not found', 404);
  }

  // If setting as default, remove default from other addresses of the same type
  if (isDefault) {
    user.addresses.forEach(address => {
      if (address.type === type && address._id !== addressId) {
        address.isDefault = false;
      }
    });
  }

  // Update the address
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

// @desc    Delete address
// @route   DELETE /api/auth/addresses/:addressId
// @access  Private
export const deleteAddress = asyncHandler(async (req: Request, res: Response) => {
  const { addressId } = req.params;

  const user = await User.findById(req.user?.id);
  
  if (!user || !user.addresses) {
    throw new AppError('User or addresses not found', 404);
  }

  // Find the address to delete
  const addressIndex = user.addresses.findIndex(addr => addr._id === addressId);
  
  if (addressIndex === -1) {
    throw new AppError('Address not found', 404);
  }

  const addressToDelete = user.addresses[addressIndex];

  // If deleting a default address, set another address of the same type as default
  if (addressToDelete?.isDefault) {
    const otherAddressOfSameType = user.addresses.find(
      addr => addr.type === addressToDelete.type && addr._id !== addressId
    );
    
    if (otherAddressOfSameType) {
      otherAddressOfSameType.isDefault = true;
    }
  }

  // Remove the address
  user.addresses.splice(addressIndex, 1);
  await user.save();

  res.json({
    success: true,
    message: 'Address deleted successfully',
    data: { deletedAddressId: addressId }
  });
});

// @desc    Set default address
// @route   PUT /api/auth/addresses/:addressId/default
// @access  Private
export const setDefaultAddress = asyncHandler(async (req: Request, res: Response) => {
  const { addressId } = req.params;

  const user = await User.findById(req.user?.id);
  
  if (!user || !user.addresses) {
    throw new AppError('User or addresses not found', 404);
  }

  // Find the address to set as default
  const addressToSetDefault = user.addresses.find(addr => addr._id === addressId);
  
  if (!addressToSetDefault) {
    throw new AppError('Address not found', 404);
  }

  // Remove default from other addresses of the same type
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