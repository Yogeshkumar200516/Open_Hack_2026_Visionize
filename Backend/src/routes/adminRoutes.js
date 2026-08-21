const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth.js');
const adminController = require('../controllers/adminController');

const ensureSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Access denied. Super admin only.' });
  }
  next();
};

// COMPANIES
router.get('/companies', authenticateUser, ensureSuperAdmin, adminController.getCompanies);
router.get('/companies/:id', authenticateUser, ensureSuperAdmin, adminController.getCompanyById);
router.post('/companies', authenticateUser, ensureSuperAdmin, adminController.createCompany);
router.put('/companies/:id', authenticateUser, ensureSuperAdmin, adminController.updateCompany);
router.delete('/companies/:id', authenticateUser, ensureSuperAdmin, adminController.deleteCompany);

// USERS
router.get('/users', authenticateUser, adminController.getUsers);
router.get('/users/:id', authenticateUser, adminController.getUserById);
router.post('/users', authenticateUser, adminController.createUser);
router.put('/users/:id', authenticateUser, adminController.updateUser);
router.delete('/users/:id', authenticateUser, adminController.deleteUser);

module.exports = router;
