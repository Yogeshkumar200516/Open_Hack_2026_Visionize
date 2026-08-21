const { billing_address: BillingAddress } = require('../models');

// GET billing addresses for a company
exports.getAddressesByCompanyId = async (req, res) => {
  const { companyId } = req.params;
  try {
    const addresses = await BillingAddress.findAll({
      where: {
        company_id: companyId,
        is_active: true
      }
    });
    res.json(addresses);
  } catch (err) {
    console.error('[BACKEND] GET /billing_address error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST create new billing address for a company
exports.createAddress = async (req, res) => {
  const {
    company_id,
    address_name,
    address,
    cell_no1,
    cell_no2,
    gst_no,
    pan_no,
    account_name,
    bank_name,
    branch_name,
    ifsc_code,
    account_number,
    email,
    website,
  } = req.body;

  if (!company_id || !address_name || !address) {
    return res.status(400).json({ message: 'Required fields missing' });
  }

  try {
    const newAddress = await BillingAddress.create({
      company_id,
      address_name,
      address,
      cell_no1: cell_no1 || null,
      cell_no2: cell_no2 || null,
      gst_no: gst_no || null,
      pan_no: pan_no || null,
      account_name: account_name || null,
      bank_name: bank_name || null,
      branch_name: branch_name || null,
      ifsc_code: ifsc_code || null,
      account_number: account_number || null,
      email: email || null,
      website: website || null,
      is_active: true // default
    });

    // To preserve the exact response structure:
    res.status(201).json({ 
      message: 'Billing address created', 
      billing_address_id: newAddress.billing_address_id 
    });
  } catch (err) {
    console.error('[BACKEND] POST /billing_address error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT update a billing address by id
exports.updateAddress = async (req, res) => {
  const { billingAddressId } = req.params;
  const {
    address_name,
    address,
    cell_no1,
    cell_no2,
    gst_no,
    pan_no,
    account_name,
    bank_name,
    branch_name,
    ifsc_code,
    account_number,
    email,
    website,
    is_active,
  } = req.body;

  try {
    const addressRecord = await BillingAddress.findByPk(billingAddressId);

    if (!addressRecord) {
      return res.status(404).json({ message: 'Billing address not found' });
    }

    // Using COALESCE-like behavior by only updating fields that are provided
    const updateData = {};
    if (address_name !== undefined) updateData.address_name = address_name;
    if (address !== undefined) updateData.address = address;
    if (cell_no1 !== undefined) updateData.cell_no1 = cell_no1;
    if (cell_no2 !== undefined) updateData.cell_no2 = cell_no2;
    if (gst_no !== undefined) updateData.gst_no = gst_no;
    if (pan_no !== undefined) updateData.pan_no = pan_no;
    if (account_name !== undefined) updateData.account_name = account_name;
    if (bank_name !== undefined) updateData.bank_name = bank_name;
    if (branch_name !== undefined) updateData.branch_name = branch_name;
    if (ifsc_code !== undefined) updateData.ifsc_code = ifsc_code;
    if (account_number !== undefined) updateData.account_number = account_number;
    if (email !== undefined) updateData.email = email;
    if (website !== undefined) updateData.website = website;
    if (typeof is_active === 'boolean') updateData.is_active = is_active;

    await addressRecord.update(updateData);

    res.json({ message: 'Billing address updated' });
  } catch (err) {
    console.error('[BACKEND] PUT /billing_address error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE (soft-delete) a billing address by id
exports.deleteAddress = async (req, res) => {
  const { billingAddressId } = req.params;

  try {
    const addressRecord = await BillingAddress.findByPk(billingAddressId);

    if (!addressRecord) {
      return res.status(404).json({ message: 'Billing address not found' });
    }

    // Soft delete
    await addressRecord.update({ is_active: false });

    res.json({ message: 'Billing address deactivated' });
  } catch (err) {
    console.error('[BACKEND] DELETE /billing_address error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
