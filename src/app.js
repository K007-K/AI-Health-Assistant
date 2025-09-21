const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const config = require('./config/environment');
const { testConnection } = require('./config/database');
const WebhookController = require('./controllers/webhookController');
const DiseaseMonitoringJobs = require('./jobs/diseaseMonitoringJobs');
const schedulerService = require('./services/schedulerService');

// Initialize Express app
const app = express();
const webhookController = new WebhookController();
const diseaseMonitoringJobs = new DiseaseMonitoringJobs();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      database: dbConnected ? 'connected' : 'disconnected',
      services: {
        whatsapp: config.whatsapp.accessToken ? 'configured' : 'missing',
        gemini: config.gemini.apiKey ? 'configured' : 'missing',
        supabase: config.supabase.url ? 'configured' : 'missing'
      }
    };

    res.status(200).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Root endpoint with bot information
app.get('/', (req, res) => {
  res.json({
    name: config.bot.name,
    version: '1.0.0',
    description: 'Multilingual WhatsApp Healthcare Bot',
    features: [
      'Multilingual support (English, Hindi, Telugu, Tamil, Odia)',
      'AI-powered health guidance',
      'Symptom checking',
      'Preventive healthcare tips',
      'Emergency detection',
      'Conversation memory',
      'Accessibility features'
    ],
    endpoints: {
      health: '/health',
      webhook: '/webhook'
    }
  });
});

// WhatsApp webhook endpoints
app.get('/webhook', (req, res) => {
  webhookController.verifyWebhook(req, res);
});

app.post('/webhook', (req, res) => {
  webhookController.handleWebhook(req, res);
});

// API routes for admin dashboard (future)
app.get('/api/stats', async (req, res) => {
  try {
    // This would require authentication in production
    res.json({
      message: 'Statistics endpoint - authentication required',
      status: 'not_implemented'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual outbreak broadcast trigger (for testing)
app.post('/api/trigger-outbreak-broadcast', async (req, res) => {
  try {
    console.log('🔧 Manual outbreak broadcast triggered via API');
    const result = await schedulerService.triggerManualBroadcast();
    res.json(result);
  } catch (error) {
    console.error('❌ Error in manual outbreak broadcast:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get outbreak scheduler status
app.get('/api/outbreak-status', (req, res) => {
  try {
    const status = schedulerService.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Immediate test alert trigger (for instant testing)
app.post('/api/trigger-test-alert-now', async (req, res) => {
  try {
    console.log('🧪 IMMEDIATE TEST: Triggering test alert broadcast NOW');
    
    // Create and broadcast test alert immediately
    const testAlert = await schedulerService.createTestAlert();
    if (testAlert) {
      const broadcastService = require('./src/services/broadcastService');
      await broadcastService.broadcastNationalAlert(testAlert);
      
      res.json({
        success: true,
        message: 'Test alert broadcast completed immediately',
        alert: {
          alertId: testAlert.alertId,
          title: testAlert.title,
          disease: testAlert.disease,
          severity: testAlert.severity,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      res.json({
        success: false,
        message: 'Failed to create test alert'
      });
    }
  } catch (error) {
    console.error('❌ Error in immediate test alert:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Endpoint ${req.method} ${req.path} not found`
  });
});

// Start server
const PORT = config.port;

async function startServer() {
  try {
    // Test Supabase database connection on startup
    const dbConnected = await testConnection();
    const dbStatus = dbConnected ? '✅ Connected' : '❌ Disconnected';

    app.listen(PORT, async () => {
      console.log(`
====================================
🚀 WhatsApp Healthcare Bot Server
====================================
✅ Server running on port ${PORT}
🌍 Environment: ${config.nodeEnv}
📊 Database: ${dbStatus}
🤖 AI Service: ${config.gemini.apiKey ? 'Connected' : 'Not configured'}
💬 WhatsApp: ${config.whatsapp.accessToken ? 'Connected' : 'Not configured'}
====================================`);

      // Start disease monitoring background jobs
      console.log('\n🦠 Starting disease monitoring system...');
      diseaseMonitoringJobs.startJobs();
      console.log('✅ Disease monitoring system started');

      // Initialize outbreak scheduler
      console.log('\n📅 Initializing outbreak scheduler...');
      schedulerService.initialize();
      console.log('✅ Outbreak scheduler initialized');

      console.log(`
====================================
📋 Available Endpoints:
   GET  /                Health check & bot info
   GET  /health          System health status
   GET  /webhook         WhatsApp webhook verification
   POST /webhook         WhatsApp message handler

🔧 Next Steps:
1. Set up your Supabase database using: node database/setup.js
2. Configure your WhatsApp webhook URL: ${config.nodeEnv === 'production' ? 'https://yourdomain.com' : 'http://localhost:' + PORT}/webhook
3. Test the bot by sending a message to your WhatsApp Business number

💡 Commands:
   - Send 'Hi' to start the bot
   - Use /easy, /long, /audio, /reset for accessibility
   - Type 'menu' anytime to see options
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server gracefully...');
  diseaseMonitoringJobs.stopJobs();
  console.log('✅ Disease monitoring jobs stopped');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server gracefully...');
  diseaseMonitoringJobs.stopJobs();
  console.log('✅ Disease monitoring jobs stopped');
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;