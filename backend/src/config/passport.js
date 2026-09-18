/**
 * Passport.js Configuration — Google OAuth 2.0 Strategy
 *
 * Luồng xác thực:
 * 1. User click "Login with Google" → redirected đến /api/auth/google
 * 2. Backend redirect user đến Google OAuth consent screen
 * 3. User đồng ý → Google redirect về /api/auth/google/callback
 * 4. Passport xử lý callback, tìm/tạo user trong DB
 * 5. Backend redirect về frontend với token trong URL
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { prisma } = require('./database');
const jwt = require('jsonwebtoken');
const logger = require('./logger');

// Hàm tạo JWT access + refresh token (dùng chung với authController)
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
};

// Chỉ kích hoạt Google OAuth nếu có đủ credentials
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn('⚠️  Google OAuth chưa được cấu hình. Bỏ qua Google Strategy.');
} else {
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
      scope: ['profile', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName;
        const avatar = profile.photos?.[0]?.value;

        if (!email) {
          return done(null, false, { message: 'Tài khoản Google không có email' });
        }

        // Tìm user theo googleId trước, sau đó theo email
        let user = await prisma.user.findFirst({
          where: {
            OR: [
              { googleId },
              { email, authProvider: 'google' },
            ],
          },
        });

        if (user) {
          // User đã tồn tại — cập nhật googleId + avatar nếu chưa có
          if (!user.googleId) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                googleId,
                authProvider: 'google',
                avatar: avatar || user.avatar,
              },
            });
          }
        } else {
          // User mới — tạo tài khoản với email từ Google
          // Kiểm tra email đã được dùng bởi local auth chưa
          const existingLocal = await prisma.user.findUnique({
            where: { email },
          });

          if (existingLocal && existingLocal.authProvider === 'local') {
            // Email đã tồn tại với local auth — gắn googleId vào tài khoản đó
            user = await prisma.user.update({
              where: { id: existingLocal.id },
              data: {
                googleId,
                authProvider: 'google',
                avatar: avatar || existingLocal.avatar,
              },
            });
          } else {
            // Tạo user mới
            user = await prisma.user.create({
              data: {
                email,
                name,
                avatar: avatar || null,
                googleId,
                authProvider: 'google',
                password: '', // OAuth user không có password local
                isActive: true,
                role: 'CUSTOMER',
              },
            });
          }
        }

        // Tạo JWT tokens
        const token = generateToken(user.id);
        const refreshJwt = generateRefreshToken(user.id);

        await prisma.user.update({
          where: { id: user.id },
          data: { refreshToken: refreshJwt },
        });

        return done(null, {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            role: user.role,
            isApproved: user.isApproved,
            storeName: user.storeName,
          },
          token,
          refreshToken: refreshJwt,
        });
      } catch (error) {
        logger.error('Google OAuth error:', error);
        return done(error, null);
      }
    }
  )
);

// Serialize: lưu user ID vào session
passport.serializeUser((data, done) => {
  done(null, data.user.id);
});

// Deserialize: lấy user từ DB theo ID
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        isApproved: true,
        isActive: true,
        storeName: true,
      },
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});
}

module.exports = passport;
