'use strict';

const _ = require('lodash');
const OSS = require('ali-oss');
const Core = require('@alicloud/pop-core');
const which = require('which');
const fs = require('fs');
const os = require('os');
const childProcess = require('child_process');

const THUMBNAIL_SIZE = '480x360';

const log = (...args) => {
  if (process.env.NODE_ENV !== 'production') {
    console.debug('>>>>>>> upload oss-apsara-vod <<<<<<<');
    console.debug(...args);
  }
};

const getTmpFilePath = name => `${os.tmpdir()}/${name}`;

module.exports = {
  provider: 'aliyun-oss',
  name: 'Aliyun Web Service OSS',
  auth: {
    accessKeyId: {
      label: 'AccessKeyId token',
      type: 'text'
    },
    accessKeySecret: {
      label: 'AccessKeySecret token',
      type: 'text'
    },
    region: {
      label: 'Region',
      type: 'enum',
      values: [
        "oss-cn-hangzhou",
        "oss-cn-shanghai",
        "oss-cn-qingdao",
        "oss-cn-beijing",
        "oss-cn-zhangjiakou",
        "oss-cn-huhehaote",
        "oss-cn-shenzhen",
        "oss-cn-heyuan",
        "oss-cn-chengdu",
        "oss-cn-hongkong",
        "oss-us-west-1",
        "oss-us-east-1",
        "oss-ap-southeast-1",
        "oss-ap-southeast-2",
        "oss-ap-southeast-3",
        "oss-ap-southeast-5",
        "oss-ap-northeast-1",
        "oss-ap-south-1",
        "oss-eu-central-1",
        "oss-eu-west-1",
        "oss-me-east-1"
      ]
    },
    bucket: {
      label: 'Bucket',
      type: 'text'
    },
    uploadPath: {
      label: 'Upload Path',
      type: 'text'
    },
    baseUrl: {
      label: 'Base URL to access',
      type: 'text'
    },
    autoThumb: {
      label: 'VIDEO FILE ONLY: Automatically generate thumbnails for video (supported format .mp4, thumbnail size 480x360)',
      type: 'enum',
      values: ['no', 'yes']
    },
    timeout: {
      label: 'timeout for oss uploading, unit: seconds',
      type: 'number'
    },
    secure: {
      label: 'Instruct OSS client to use HTTPS or HTTP protocol.',
      type: 'boolean',
    },
  },
  init: (config) => {
    log(config)
    const ossImageClient = new OSS({
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      region: config.ossRegion,
      bucket: config.ossBucket,
      timeout: +(config.ossTimeout * 1000),
      secure: !(config.ossSecure === false),
    });
    const vodClient = new Core({
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      endpoint: `https://vod.${config.vodRegion}.aliyuncs.com`,
      apiVersion: '2017-03-21',
      timeout: +(config.ossTimeout * 1000)
    });

    return {
      upload: (file) => {
        log(file);
        return new Promise((resolve, reject) => {
          // upload file on OSS bucket
          const path = config.uploadPath ? `${config.uploadPath}/` : '';
          const fileName = `${file.hash}${file.ext}`;
          const fullPath = `${path}${fileName}`;

          const fileBuffer = Buffer.from(file.buffer, 'binary');

          const tmpPath = getTmpFilePath(fileName);

          const generateThumbnail = () => {
            which('ffmpeg', (err) => {
              if (!err) {
                fs.writeFileSync(tmpPath, fileBuffer);

                const proc = childProcess.spawn('ffmpeg', [
                  '-hide_banner',
                  '-i', tmpPath,
                  '-ss', '00:00:01',
                  '-vframes', '1',
                  '-s', THUMBNAIL_SIZE,
                  '-c:v', 'png',
                  '-f', 'image2pipe',
                  // pipe:1 means output to std out
                  'pipe:1',
                ]);

                proc.stderr.on('data', function (data) {
                  // log errors from ffmpeg
                  log('stderr: ' + data);
                });

                ossImageClient.putStream(`${path}${file.hash}-${THUMBNAIL_SIZE}.png`, proc.stdout)
                  .then((result) => {
                    // delete tmp file
                    fs.unlinkSync(tmpPath);

                    log('thumbnail generated ok', result);
                  })
                  .catch((err) => {
                    log('thumbnail generation failed', err);
                  });

              } else {
                log('ffmpeg not found, therefore no thumbnails are generated ');
              }
            })
          };

          if (file.ext === ".mp4") {
            // Upload to ApsaraVideo VOD
            if (config.autoThumb === 'yes') {
              log('start generating thumbnail...');
              // automatically generate thumbnails
              generateThumbnail();
            }
            const params = {
              "RegionId": config.vodRegion,
              "Title": file.hash,
              "FileName": fullPath,
              "TemplateGroupId": config.vodTemplateGroupId,
              timeout: +(config.ossTimeout * 1000),
            }
            const requestOption = {
              method: 'POST'
            };
            let videoId = ""
            log("Invoking CreateUploadVideo")
            vodClient.request('CreateUploadVideo', params, requestOption)
            .then(
              result => {
                videoId = result.VideoId
                // Parse base64-encoded values
                let buff = Buffer.from(result.UploadAddress, 'base64');
                const uploadAddress = JSON.parse(buff.toString())
                buff = Buffer.from(result.UploadAuth, 'base64');
                const uploadAuth = JSON.parse(buff.toString())
                log("uploadAddress:", uploadAddress)
                log("uploadAuth:", uploadAuth)
                // Create new OSS client
                const ossVideoClient = new OSS({
                  accessKeyId: uploadAuth.AccessKeyId,
                  accessKeySecret: uploadAuth.AccessKeySecret,
                  stsToken: uploadAuth.SecurityToken,
                  region: uploadAuth.Region,
                  bucket: uploadAddress.Bucket,
                  endpoint: uploadAddress.Endpoint,
                  timeout: +(config.ossTimeout * 1000),
                  secure: !(config.ossSecure === false),
                  refreshSTSToken: async () => {
                    var params = {
                      "RegionId": config.vodRegion,
                      "VideoId": result.VideoId
                    }
                    var requestOption = {
                      method: 'POST'
                    };
                    try {
                      log("Invoking RefreshUploadVideo")
                      const result = await vodClient.request('RefreshUploadVideo', params, requestOption)
                      // Parse base64-encoded values
                      const buff = Buffer.from(result.UploadAuth, 'base64');
                      const uploadAuth = JSON.parse(buff.toString())
                      return uploadAuth
                    } catch(err) {
                      log("RefreshUploadVideo:", err)
                      return null
                    }
                  }
                })

                log("Invoking ossVideoClient.put")
                // Upload video
                ossVideoClient.put(uploadAddress.FileName, fileBuffer)
                .then((result) => {
                  log("ossVideoClient.put result:", result);
                  if (config.baseUrl) {
                    // use http protocol by default, but you can configure it as https protocol
                    // deprecate config.domain, use baseUrl to specify protocol and domain.
                    let baseUrl = config.baseUrl.replace(/\/$/, '');
                    let name = (result.name || '').replace(/^\//, '');
                    file.url = `${baseUrl}/${name}`;
                  } else {
                    file.url = result.url;
                  }
                  file.videoId = videoId
                  // Extract duration in seconds from video
                  const header = Buffer.from("mvhd");
                  const start = fileBuffer.indexOf(header) + 17;
                  const timeScale = fileBuffer.readUInt32BE(start, 4);
                  const duration = fileBuffer.readUInt32BE(start + 4, 4);
                  const audioLength = Math.floor(duration/timeScale * 1000) / 1000;
                  file.seconds = parseFloat(audioLength.toFixed(0))
                  resolve();
                })
                .catch((err) => {
                  log("ossVideoClient.put:", err);
                  reject(err);
                });
              },
              err => {
                log("CreateUploadVideo:", err);
                reject(err);
              }
            )
          } else {
            // Upload to OSS
            ossImageClient.put(fullPath, fileBuffer)
            .then((result) => {
              log(result);
              if (config.baseUrl) {
                // use http protocol by default, but you can configure it as https protocol
                // deprecate config.domain, use baseUrl to specify protocol and domain.
                let baseUrl = config.baseUrl.replace(/\/$/, '');
                let name = (result.name || '').replace(/^\//, '');
                file.url = `${baseUrl}/${name}`;
              } else {
                file.url = result.url;
              }
              resolve();
            })
            .catch((err) => {
              log("ossImageClient.put:", err)
              reject(err);
            });
          }
        });
      },
      delete: (file) => {
        return new Promise((resolve, reject) => {
          if (file.ext === ".mp4") {
            // Delete from ApsaraVideo VOD
            var params = {
              "RegionId": config.vodRegion,
              "VideoIds": file.videoId
            }
            log("deleting", params)
            var requestOption = {
              method: 'POST'
            };
            vodClient.request('DeleteVideo', params, requestOption)
            .then(
              result => resolve(),
              ex => {
                console.log(ex);
                reject(new Error('Video file on deletion error'))
              }
            )
          } else {
            // delete file on OSS bucket
            const path = config.uploadPath ? `${config.uploadPath}/` : '';
            const fullPath = `${path}${file.hash}${file.ext}`;
            ossImageClient.delete(fullPath)
            .then((resp) => {
              log(resp);
              if (resp.res && /2[0-9]{2}/.test(resp.res.statusCode)) {
                // clean up possible existing thumbnails
                log('clean up possible existing thumbnails...');
                ossImageClient.delete(`${path}${file.hash}-${THUMBNAIL_SIZE}.png`)
                  .then((result) => log('thumbnail deleted', result))
                  .catch((err) => log('thumbnail deletion error', err))

                resolve();
              } else {
                reject(new Error('OSS file deletion error'));
              }
            })
            .catch((err) => {
              reject(err);
            })
          }
        });
      }
    };
  }
};
