const router  = require('express').Router();
const { body } = require('express-validator');
const ctrl     = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Step 1 — credentials
router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  ctrl.login
);

// Step 2 — OTP verification
router.post('/verify-otp',
  body('user_id').isUUID(),
  body('otp').isLength({ min: 6, max: 6 }),
  ctrl.verifyOtp
);

// Resend OTP
router.post('/resend-otp',
  body('user_id').isUUID(),
  ctrl.resendOtp
);

// Step 3 — select workspace (returns workspace-scoped token)
router.post('/select-workspace',
  authenticate,
  body('workspace_id').isUUID(),
  ctrl.selectWorkspace
);

// Refresh access token
router.post('/refresh', ctrl.refresh);

// Forgot password
router.post('/forgot-password',
  body('email').isEmail().normalizeEmail(),
  ctrl.forgotPassword
);

// Reset password
router.post('/reset-password',
  body('token').notEmpty(),
  body('password').isLength({ min: 8 }),
  ctrl.resetPassword
);

// Logout (revoke refresh token)
router.post('/logout', authenticate, ctrl.logout);

// Validate current token
router.get('/me', authenticate, ctrl.me);

module.exports = router;
