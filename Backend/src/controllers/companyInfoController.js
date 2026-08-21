const { company_info } = require("../models");
const fs = require("fs");
const path = require("path");

/////////////////////////////////////////////////////////
// GET COMPANY INFO
// GET /api/company/info
/////////////////////////////////////////////////////////

exports.getCompanyInfo = async (req, res) => {
  try {
    // Super admin should not access tenant company info
    if (req.user.role === "super_admin") {
      return res.status(403).json({
        message: "Super admin does not belong to any company."
      });
    }

    const tenantId = req.user.tenant_id;

    if (!tenantId) {
      return res.status(400).json({
        message: "Tenant ID missing for this user"
      });
    }

    const company = await company_info.findOne({
      where: { id: tenantId }
    });

    if (!company) {
      return res.status(404).json({
        message: "Company info not found for this tenant"
      });
    }

    // --- Prepare Base64 logo for robust PDF generation ---
    let logo_base64 = null;
    if (company.company_logo) {
      try {
        // Use path.resolve to get the absolute path, more reliable across environments
        const logoPath = path.resolve(__dirname, "..", "..", "uploads", "logos", company.company_logo);
        
        if (fs.existsSync(logoPath)) {
          const fileData = fs.readFileSync(logoPath);
          const ext = path.extname(company.company_logo).toLowerCase();
          
          // Robust Mime-Type detection (handles .PNG, .JPG etc)
          let mimeType = "image/jpeg";
          if (ext === ".png") mimeType = "image/png";
          else if (ext === ".webp") mimeType = "image/webp";
          else if (ext === ".svg") mimeType = "image/svg+xml";
          else if (ext === ".gif") mimeType = "image/gif";
          
          logo_base64 = `data:${mimeType};base64,${fileData.toString("base64")}`;
        }
      } catch (err) {
        console.error("Failed to read logo file for base64:", err);
      }
    }

    res.json({
      ...company.toJSON(),
      logo_base64
    });

  } catch (error) {
    console.error("Failed to fetch company info:", error);
    res.status(500).json({
      message: "Internal server error"
    });
  }
};

/////////////////////////////////////////////////////////
// ADD COMPANY INFO
// POST /api/company/add
/////////////////////////////////////////////////////////

exports.addCompanyInfo = async (req, res) => {
  try {
    if (req.user.role === "super_admin") {
      return res.status(403).json({
        message: "Super admin cannot create company info here."
      });
    }

    const tenantId = req.user.tenant_id;

    const {
      company_name,
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
      website
    } = req.body;

    const logoFilename = req.file ? req.file.filename : null;

    const existingCompany = await company_info.findOne({
      where: { id: tenantId }
    });

    if (existingCompany) {
      return res.status(400).json({
        message: "Company info already exists. Please use update."
      });
    }

    await company_info.create({
      id: tenantId,
      company_name,
      company_logo: logoFilename,
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
      website
    });

    res.status(201).json({
      message: "Company info added successfully"
    });

  } catch (error) {
    console.error("Error adding company info:", error);
    res.status(500).json({
      message: "Failed to add company info"
    });
  }
};

/////////////////////////////////////////////////////////
// UPDATE COMPANY INFO
// PUT /api/company/update
/////////////////////////////////////////////////////////

exports.updateCompanyInfo = async (req, res) => {
  try {
    if (req.user.role === "super_admin") {
      return res.status(403).json({
        message: "Super admin cannot update company info."
      });
    }

    const tenantId = req.user.tenant_id;

    const {
      company_name,
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
      website
    } = req.body;

    const logoFilename = req.file ? req.file.filename : null;

    const existingCompany = await company_info.findOne({
      where: { id: tenantId }
    });

    if (!existingCompany) {
      return res.status(404).json({
        message: "Company info not found"
      });
    }

    const logoToUse = logoFilename || existingCompany.company_logo;

    await company_info.update(
      {
        company_name,
        company_logo: logoToUse,
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
        website
      },
      {
        where: { id: tenantId }
      }
    );

    res.json({
      message: "Company info updated successfully"
    });

  } catch (error) {
    console.error("Error updating company info:", error);
    res.status(500).json({
      message: "Failed to update company info"
    });
  }
};