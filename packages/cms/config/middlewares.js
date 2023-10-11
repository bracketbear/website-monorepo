module.exports = ({ env }) => {
  // We need to have special security config if we're using AWS S3 vs local uploads
  const bucketUrl = `${env('AWS_BUCKET', 'yourBucketName')}.s3.amazonaws.com`
  const awsSecurityConfig = {
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'connect-src': ["'self'", 'https:'],
        'img-src': [
          "'self'",
          'data:',
          'blob:',
          'market-assets.strapi.io',
          bucketUrl
        ],
        'media-src': [
          "'self'",
          'data:',
          'blob:',
          'market-assets.strapi.io',
          bucketUrl
        ],
        upgradeInsecureRequests: null,
      },
    },
  }

  const securityMiddleware = {
    name: 'strapi::security',
  }

  if (env('UPLOAD_PROVIDER', undefined) === 'aws-s3') {
    securityMiddleware.config = awsSecurityConfig
  }
  securityMiddleware.config = env('UPLOAD_PROVIDER', undefined) === 'aws-s3' ? awsSecurityConfig : undefined

  return [
    'strapi::errors',
    securityMiddleware,
    'strapi::cors',
    'strapi::poweredBy',
    'strapi::logger',
    'strapi::query',
    'strapi::body',
    'strapi::session',
    'strapi::favicon',
    'strapi::public',
  ]
};
