module.exports = ({ env }) => ({
  upload: {
    provider: 'oss-apsara-vod',
    providerOptions: {
      accessKeyId: env('OSS_ACCESS_KEY_ID'),
      accessKeySecret: env('OSS_ACCESS_KEY_SECRET'),
      ossRegion: env('OSS_REGION'),
      ossBucket: env('OSS_BUCKET'),
      ossUploadPath: env('OSS_UPLOAD_PATH'),
      ossBaseUrl: env('OSS_BASE_URL'),
      ossTimeout: env('OSS_TIMEOUT'),
      ossSecure: env('OSS_SECURE'), //default to true
      vodRegion: env('VOD_REGION'),
      vodTemplateGroupId: env('VOD_TEMPLATE_GROUP_ID'),
    }
  }
});