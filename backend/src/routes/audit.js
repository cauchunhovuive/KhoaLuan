const express = require('express');
const router = express.Router();
const { getAuditLogs, createAuditLog } = require('../controllers/auditController');
const { protect, restrictTo } = require('../middleware/auth');

router.get('/', protect, restrictTo('ADMIN'), getAuditLogs);
router.post('/', protect, restrictTo('ADMIN'), createAuditLog);

module.exports = router;
