'use strict';

const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { s3 } = require('../clients');
const config = require('../config');

async function uploadToR2(body, key, contentType) {
  await s3.send(
    new PutObjectCommand({
      Bucket: config.r2.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return key;
}

const publicUrlFor = (key) => `${config.r2.publicUrl}/${key}`;

module.exports = { uploadToR2, publicUrlFor };
