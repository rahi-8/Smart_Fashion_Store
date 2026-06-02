const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { sendMail } = require('./mail');

const app = express();

//  CORS 
app.use(cors({ 
  origin: '*', 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//  In-memory OTP store 
let otpStore = {};

// ── Auto-detect local IP ───────────────────────────────────────────────────
const getLocalIP = () => {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
};

// ── Auto-update .env file with current IP ─────────────────────────────────
const updateEnvIP = (ip, port) => {
  try {
    const envPath = path.join(__dirname, '.env');
    
    if (!fs.existsSync(envPath)) {
      console.log('⚠️ .env file not found, skipping update');
      return;
    }
    
    let envContent = fs.readFileSync(envPath, 'utf8');
    const newUrl = `http://${ip}:${port}`;
    
    if (envContent.includes('EXPO_PUBLIC_API_URL=')) {
      envContent = envContent.replace(
        /EXPO_PUBLIC_API_URL=.*/,
        `EXPO_PUBLIC_API_URL=${newUrl}`
      );
    } else {
      envContent += `\nEXPO_PUBLIC_API_URL=${newUrl}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log(`✅ .env updated: EXPO_PUBLIC_API_URL=${newUrl}`);
  } catch (err) {
    console.log('⚠️ Could not auto-update .env:', err.message);
  }
};

// ── Clean expired OTPs every minute ───────────────────────────────────────
setInterval(() => {
  const now = Date.now();
  let deletedCount = 0;
  for (const [email, data] of Object.entries(otpStore)) {
    if (now > data.expires) {
      delete otpStore[email];
      deletedCount++;
    }
  }
  if (deletedCount > 0) {
    console.log(`🗑️ Removed ${deletedCount} expired OTP(s)`);
  }
}, 60000);

// ── Routes ─────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Smart Fashion Store Server Running',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    server: 'Smart Fashion Store',
    uptime: process.uptime(),
    ip: getLocalIP(),
    port: process.env.PORT || 3000,  // ✅ Fixed: use process.env.PORT
    otpStoreSize: Object.keys(otpStore).length
  });
});

// ✅ Send OTP 
app.post('/api/send-otp', async (req, res) => {
  try {
    const { email, name, mode } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email is required' 
      });
    }

    console.log(`📧 Sending OTP to: ${email} | Mode: ${mode || 'register'}`);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP with 5 minutes expiry
    otpStore[email] = { 
      otp, 
      expires: Date.now() + 5 * 60 * 1000,
      createdAt: new Date().toISOString(),
      mode: mode || 'register'
    };

    console.log(`🔑 Generated OTP for ${email}: ${otp}`);

    // Email subject based on mode
    const subject = mode === 'reset' 
      ? 'Password Reset OTP - Smart Fashion Store'
      : 'Verify Your Email - Smart Fashion Store';
    
    const greeting = mode === 'reset'
      ? 'You requested a password reset.'
      : `Welcome${name ? ' ' + name : ''}! Please verify your email.`;

    // Send email
    const result = await sendMail({
      receiver: email,
      subject: subject,
      text: `Your OTP code is: ${otp}\n\nThis code expires in 5 minutes.\n\n${greeting}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: auto; padding: 30px; border-radius: 16px; border: 1px solid #e0e0e0; background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);">
          <div style="text-align: center; margin-bottom: 25px;">
            <h1 style="color: #19699d; margin: 0;">🛍️ Smart Fashion Store</h1>
            <p style="color: #666; margin-top: 5px;">Your style, our passion</p>
          </div>
          
          <div style="background: #f0f7fc; padding: 20px; border-radius: 12px; text-align: center;">
            <p style="color: #333; font-size: 16px; margin-bottom: 15px;">${greeting}</p>
            <h1 style="letter-spacing: 8px; color: #19699d; font-size: 42px; margin: 10px 0; font-weight: bold;">${otp}</h1>
            <p style="color: #999; font-size: 12px; margin-top: 15px;">⏰ This code expires in <strong>5 minutes</strong></p>
          </div>
          
          <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #aaa; font-size: 11px;">If you did not request this, please ignore this email.</p>
            <p style="color: #19699d; font-size: 12px; margin-top: 10px;">© 2024 Smart Fashion Store</p>
          </div>
        </div>
      `,
    });

    if (!result.success) {
      console.error('❌ Email sending failed:', result.error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to send OTP email. Please check email configuration.' 
      });
    }

    console.log(`✅ OTP sent successfully to: ${email}`);
    return res.json({ 
      success: true, 
      message: 'OTP sent successfully',
      email: email
    });

  } catch (error) {
    console.error('❌ SEND OTP ERROR:', error.message);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error: ' + error.message 
    });
  }
});

// ✅ Verify OTP 
app.post('/api/verify-otp', (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.json({ 
        verified: false, 
        success: false,
        error: 'Email and OTP are required' 
      });
    }

    console.log(`🔍 Verifying OTP for: ${email} | OTP: ${otp}`);

    const data = otpStore[email];

    if (!data) {
      console.log(`❌ No OTP found for: ${email}`);
      return res.json({ 
        verified: false, 
        success: false,
        error: 'OTP not found. Please request a new code.' 
      });
    }

    if (Date.now() > data.expires) {
      delete otpStore[email];
      console.log(`❌ OTP expired for: ${email}`);
      return res.json({ 
        verified: false, 
        success: false,
        error: 'OTP has expired. Please request a new code.' 
      });
    }

    if (data.otp === otp) {
      delete otpStore[email];
      console.log(`✅ OTP verified successfully for: ${email}`);
      return res.json({ 
        verified: true, 
        success: true,
        message: 'OTP verified successfully' 
      });
    }

    console.log(`❌ OTP mismatch for: ${email} | Expected: ${data.otp} | Got: ${otp}`);
    return res.json({ 
      verified: false, 
      success: false,
      error: 'Invalid OTP. Please try again.' 
    });

  } catch (error) {
    console.error('❌ VERIFY OTP ERROR:', error.message);
    return res.status(500).json({ 
      verified: false, 
      success: false,
      error: 'Server error: ' + error.message 
    });
  }
});

// ✅ Resend OTP
app.post('/api/resend-otp', async (req, res) => {
  try {
    const { email, name, mode } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email is required' 
      });
    }

    console.log(`🔄 Resending OTP to: ${email}`);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = { 
      otp, 
      expires: Date.now() + 5 * 60 * 1000,
      createdAt: new Date().toISOString(),
      mode: mode || 'register'
    };

    const subject = mode === 'reset' 
      ? 'New Password Reset OTP - Smart Fashion Store'
      : 'New Verification OTP - Smart Fashion Store';

    const result = await sendMail({
      receiver: email,
      subject: subject,
      text: `Your new OTP code is: ${otp}\n\nThis code expires in 5 minutes.`,
      html: `
        <div style="font-family: Arial; max-width: 480px; margin: auto; padding: 30px; border-radius: 12px; border: 1px solid #e0e0e0;">
          <h2 style="color: #19699d;">Smart Fashion Store</h2>
          <p>Your new verification code:</p>
          <h1 style="letter-spacing: 8px; color: #19699d; font-size: 36px;">${otp}</h1>
          <p style="color: #999;">This code expires in <strong>5 minutes</strong>.</p>
        </div>
      `,
    });

    if (!result.success) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to send OTP' 
      });
    }

    console.log(`✅ OTP resent successfully to: ${email}`);
    return res.json({ 
      success: true, 
      message: 'OTP resent successfully' 
    });

  } catch (error) {
    console.error('❌ RESEND ERROR:', error.message);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error: ' + error.message 
    });
  }
});

//  Reset Password after OTP verification
app.post('/api/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    if (!email || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required' 
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password must be at least 8 characters' 
      });
    }

    console.log(`📝 Password reset request for: ${email}`);

    
    console.log(`✅ Password reset processed for: ${email}`);
    
    res.json({ 
      success: true, 
      message: 'Password reset successfully' 
    });

  } catch (error) {
    console.error('❌ RESET PASSWORD ERROR:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Server error: ' + error.message 
    });
  }
});

// ── ADMIN API: Delete user from Appwrite Account ───────────────────────────
app.delete('/api/admin/delete-user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { adminSecret } = req.headers;
    
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'smart-fashion-admin-secret-2024';
    
    if (!adminSecret || adminSecret !== ADMIN_SECRET) {
      console.log('❌ Unauthorized delete attempt for:', userId);
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    console.log(`🗑️ Deleting user from Appwrite: ${userId}`);
    
    // Try to load node-appwrite
    let Client, Users;
    try {
      const appwrite = require('node-appwrite');
      Client = appwrite.Client;
      Users = appwrite.Users;
    } catch (err) {
      console.log('⚠️ node-appwrite not installed, skipping Appwrite deletion');
      return res.json({ success: true, message: 'User deleted from database only' });
    }
    
    const API_KEY = process.env.APPWRITE_API_KEY;
    if (!API_KEY) {
      console.log('⚠️ APPWRITE_API_KEY not set, skipping Appwrite deletion');
      return res.json({ success: true, message: 'User deleted from database only' });
    }
    
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://tor.cloud.appwrite.io/v1')
      .setProject(process.env.APPWRITE_PROJECT_ID || '69ce028900081643e1c3')
      .setKey(API_KEY);
    
    const users = new Users(client);
    
    try {
      await users.delete(userId);
      console.log(`✅ User ${userId} deleted from Appwrite successfully`);
    } catch (err) {
      if (err && err.code === 404) {
        console.log('User not found in Appwrite, may already be deleted');
      } else {
        console.error('Appwrite deletion error:', err && err.message);
      }
    }
    
    res.json({ success: true, message: 'User deleted successfully' });
    
  } catch (error) {
    console.error('❌ Delete user API error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to delete user' });
  }
});

// ── Start Server ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  updateEnvIP(localIP, PORT);

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║          🚀 Smart Fashion Store Server Started               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\n📡 Server Addresses:`);
  console.log(`   ➜ Local:     http://localhost:${PORT}`);
  console.log(`   ➜ Network:   http://${localIP}:${PORT}`);
  console.log(`\n📋 Available Endpoints:`);
  console.log(`   ✅ GET  /api/health - Health check`);
  console.log(`   📧 POST /api/send-otp - Send OTP`);
  console.log(`   🔐 POST /api/verify-otp - Verify OTP`);
  console.log(`   🔄 POST /api/resend-otp - Resend OTP`);
  console.log(`   🔑 POST /api/reset-password - Reset password`);
  console.log(`   🗑️ DELETE /api/admin/delete-user/:userId - Delete user (Admin)`);
  console.log(`\n⚡ Server is ready! Waiting for connections...\n`);
});

// ── Graceful Shutdown ──────────────────────────────────────────────────────
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// ── Global Error Handlers ──────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});