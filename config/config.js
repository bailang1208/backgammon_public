var path = require('path'),
    rootPath = path.normalize(__dirname + '/..'),
    env = process.env.NODE_ENV || 'development';

var config = {
  development: {
    root: rootPath,
    port: process.env.PORT || 3111,
    redisPort: process.env.REDIS_PORT || 6379,
    db: {
      uri: 'mongodb://localhost/casino-game-dev',
        options: {
          useMongoClient: true
        },
        debug: process.env.MONGODB_DEBUG || false
    },
      secure: {
          ssl: false
      },
      app: {
          title: 'Realtime & Real User Casino Game',
          description: 'Real casino game together real users on real time',
          googleAnalyticsTrackingID: process.env.GOOGLE_ANALYTICS_TRACKING_ID || 'GOOGLE_ANALYTICS_TRACKING_ID'
      },
      host: process.env.HOST || '0.0.0.0',
      templateEngine: 'swig',
      // Session Cookie settings
      sessionCookie: {
          // session expiration is set by default to 24 hours
          maxAge: 24 * (60 * 60 * 1000),
          // httpOnly flag makes sure the cookie is only accessed
          // through the HTTP protocol and not JS/browser
          httpOnly: true,
          // secure cookie should be turned to true to provide additional
          // layer of security so that the cookie is set only when working
          // in HTTPS mode.
          secure: false
      },
      // sessionSecret should be changed for security measures and concerns
      sessionSecret: process.env.SESSION_SECRET || 'realcasinogame20171114',
      // sessionKey is set to the generic sessionId key used by PHP applications
      // for obsecurity reasons
      sessionKey: 'sessionId',
      sessionCollection: 'sessions',
      favicon: 'images/favicon.png',
      uploads: {
          profileUpload: {
              dest: './public/profile-photos/', // Profile upload destination path
              limits: {
                  fileSize: 10*1024*1024 // Max file size in bytes (1 MB)
              }
          }
      },
      facebook: {
          clientID: process.env.FACEBOOK_ID || 'APP_ID',
          clientSecret: process.env.FACEBOOK_SECRET || 'APP_SECRET',
          callbackURL: '/api/auth/facebook/callback'
      },
      google: {
          clientID: process.env.GOOGLE_ID || 'APP_ID',
          clientSecret: process.env.GOOGLE_SECRET || 'APP_SECRET',
          callbackURL: '/api/auth/google/callback'
      },
      mailer: {
          from: process.env.MAILER_FROM || 'MAILER_FROM',
          options: {
              service: process.env.MAILER_SERVICE_PROVIDER || 'MAILER_SERVICE_PROVIDER',
              auth: {
                  user: process.env.MAILER_EMAIL_ID || 'MAILER_EMAIL_ID',
                  pass: process.env.MAILER_PASSWORD || 'MAILER_PASSWORD'
              }
          }
      }
  },

  production: {
    root: rootPath,
    port: process.env.PORT || 80,
    redisPort: process.env.REDIS_PORT || 6379,
      db: {
          uri: 'mongodb://localhost/casino-game-prod',
          options: {
              useMongoClient: true
          },
          debug: process.env.MONGODB_DEBUG || false
      },
      secure: {
          ssl: true,
          privateKey: './server/keys/goldcdn/goldgamecdn.com.key',
          certificate: './server/keys/goldcdn/goldgamecdn.com.crt'
      },
      app: {
          title: 'Realtime & Real User Casino Game',
          description: 'Real casino game together real users on real time',
          googleAnalyticsTrackingID: process.env.GOOGLE_ANALYTICS_TRACKING_ID || 'GOOGLE_ANALYTICS_TRACKING_ID'
      },
      host: process.env.HOST || '0.0.0.0',
      templateEngine: 'swig',
      // Session Cookie settings
      sessionCookie: {
          // session expiration is set by default to 24 hours
          maxAge: 24 * (60 * 60 * 1000),
          // httpOnly flag makes sure the cookie is only accessed
          // through the HTTP protocol and not JS/browser
          httpOnly: false,
          // secure cookie should be turned to true to provide additional
          // layer of security so that the cookie is set only when working
          // in HTTPS mode.
          secure: true
      },
      // sessionSecret should be changed for security measures and concerns
      sessionSecret: process.env.SESSION_SECRET || 'realcasinogame20171114',
      // sessionKey is set to the generic sessionId key used by PHP applications
      // for obsecurity reasons
      sessionKey: 'sessionId',
      sessionCollection: 'sessions',
      favicon: 'images/favicon.png',
      uploads: {
          profileUpload: {
              dest: './public/profile-photos/', // Profile upload destination path
              limits: {
                  fileSize: 10*1024*1024 // Max file size in bytes (1 MB)
              }
          }
      },
      facebook: {
          clientID: process.env.FACEBOOK_ID || 'APP_ID',
          clientSecret: process.env.FACEBOOK_SECRET || 'APP_SECRET',
          callbackURL: '/api/auth/facebook/callback'
      },
      google: {
          clientID: process.env.GOOGLE_ID || 'APP_ID',
          clientSecret: process.env.GOOGLE_SECRET || 'APP_SECRET',
          callbackURL: '/api/auth/google/callback'
      },
      mailer: {
          from: process.env.MAILER_FROM || 'MAILER_FROM',
          options: {
              service: process.env.MAILER_SERVICE_PROVIDER || 'MAILER_SERVICE_PROVIDER',
              auth: {
                  user: process.env.MAILER_EMAIL_ID || 'MAILER_EMAIL_ID',
                  pass: process.env.MAILER_PASSWORD || 'MAILER_PASSWORD'
              }
          }
      }
  }
};

module.exports = config[env];
