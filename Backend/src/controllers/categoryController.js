const models = require('../models');

const { product_categories: ProductCategory } = models;

exports.getCategories = async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  if (!tenant_id) {
    return res.status(401).json({ error: "Unauthorized: tenant_id missing" });
  }

  try {
    const categories = await ProductCategory.findAll({
      where: { tenant_id },
      order: [['created_at', 'DESC']]
    });
    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
};

exports.addCategory = async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { category_name, is_active = true } = req.body;

  if (!tenant_id) {
    return res.status(401).json({ error: "Unauthorized: tenant_id missing" });
  }

  if (!category_name || !category_name.trim()) {
    return res.status(400).json({ error: "Category name is required" });
  }

  const trimmedName = category_name.trim();

  try {
    const existing = await ProductCategory.findOne({
      where: { tenant_id, category_name: trimmedName }
    });

    if (existing) {
      return res.status(409).json({ error: "Category already exists for this tenant" });
    }

    await ProductCategory.create({
      tenant_id,
      category_name: trimmedName,
      is_active
    });

    res.status(201).json({ message: "Category added successfully" });
  } catch (error) {
    console.error("Error adding category:", error);
    res.status(500).json({ error: "Failed to add category" });
  }
};

exports.editCategory = async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { id } = req.params;
  const { category_name, is_active } = req.body;

  if (!tenant_id) {
    return res.status(401).json({ error: "Unauthorized: tenant_id missing" });
  }

  if (!category_name || !category_name.trim()) {
    return res.status(400).json({ error: "Category name is required" });
  }

  const trimmedName = category_name.trim();

  try {
    const { Op } = require('sequelize');
    const existing = await ProductCategory.findOne({
      where: { 
        tenant_id, 
        category_name: trimmedName, 
        category_id: { [Op.ne]: id } 
      }
    });

    if (existing) {
      return res.status(409).json({ error: "Category already exists for this tenant" });
    }

    const category = await ProductCategory.findOne({
      where: { category_id: id, tenant_id }
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found or unauthorized" });
    }

    await category.update({
      category_name: trimmedName,
      is_active
    });

    res.json({ message: "Category updated successfully" });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ error: "Failed to update category" });
  }
};

exports.toggleStatus = async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { id } = req.params;

  if (!tenant_id) {
    return res.status(401).json({ error: "Unauthorized: tenant_id missing" });
  }

  try {
    const category = await ProductCategory.findOne({
      where: { category_id: id, tenant_id }
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found or unauthorized" });
    }

    const newStatus = !category.is_active;
    await category.update({ is_active: newStatus });

    res.json({ message: `Category ${newStatus ? "activated" : "deactivated"} successfully` });
  } catch (error) {
    console.error("Error toggling status:", error);
    res.status(500).json({ error: "Failed to toggle status" });
  }
};
