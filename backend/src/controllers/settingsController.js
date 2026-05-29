const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const DEFAULT_SETTINGS = {
  siteName: 'KhoaLuan',
  siteDescription: 'Hệ thống thương mại điện tử thông minh',
  itemsPerPage: 10,
  enableRecommendations: true,
  enableClustering: true,
  autoRunClustering: false,
  clusteringInterval: 7,
  freeShippingThreshold: 500000,
  shippingFee: 30000,
  siteContactEmail: 'cuongphat234@gmail.com',
  siteContactPhone: '0972693691',
  siteContactAddress: 'Ho Chi Minh, Viet Nam',
};

// Helper: load all settings into a flat object
const loadSettings = async () => {
  const rows = await prisma.siteSetting.findMany();
  const dbSettings = {};
  for (const row of rows) {
    try {
      dbSettings[row.key] = JSON.parse(row.value);
    } catch {
      dbSettings[row.key] = row.value;
    }
  }
  return { ...DEFAULT_SETTINGS, ...dbSettings };
};

// Helper: upsert a single setting
const upsertSetting = async (key, value) => {
  const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
  await prisma.siteSetting.upsert({
    where: { key },
    update: { value: stringValue },
    create: { key, value: stringValue },
  });
};

// @desc    Get all settings
// @route   GET /api/settings
// @access  Private/Admin
const getSettings = asyncHandler(async (req, res) => {
  const settings = await loadSettings();
  res.json({ success: true, data: settings });
});

// @desc    Update settings
// @route   PUT /api/settings
// @access  Private/Admin
const updateSettings = asyncHandler(async (req, res) => {
  const allowedKeys = Object.keys(DEFAULT_SETTINGS);

  for (const [key, value] of Object.entries(req.body)) {
    if (!allowedKeys.includes(key)) continue;
    await upsertSetting(key, value);
  }

  const settings = await loadSettings();
  res.json({ success: true, data: settings });
});

module.exports = { getSettings, updateSettings };
