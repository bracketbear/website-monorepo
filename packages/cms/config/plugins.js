module.exports = ({ env }) => {
  const uploadProvider = env('UPLOAD_PROVIDER', 'local')
  const uploadProviderConfig = {
    'aws-s3': {
      provider: 'aws-s3',
      providerOptions: {
        accessKeyId: env('AWS_ACCESS_KEY_ID'),
        secretAccessKey: env('AWS_ACCESS_SECRET'),
        region: env('AWS_REGION'),
        params: {
          ACL: env('AWS_ACL', 'public-read'),
          signedUrlExpires: env('AWS_SIGNED_URL_EXPIRES', 15 * 60),
          Bucket: env('AWS_BUCKET'),
        },
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
    },
  }

  const upload = uploadProvider !== 'local'
    ? { config: uploadProviderConfig[uploadProvider] }
    : undefined
  const plugins = {}

  if (upload) {
    plugins.upload = upload
  }

  return plugins
};
