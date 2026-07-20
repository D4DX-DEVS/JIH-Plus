require('dotenv').config({ quiet: true });
const AWS = require('aws-sdk');

const digitalOceanConfig = {
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET,
    endpoint: process.env.DO_SPACES_ENDPOINT,
    cdnEndpoint: process.env.DO_SPACES_CDN_ENDPOINT,
    bucket: process.env.DO_SPACES_BUCKET,
    folder: process.env.DO_SPACES_FOLDER,
    maxFileSize: parseInt(process.env.DO_MAX_FILE_SIZE) || 5242880, // 5MB default
    allowedTypes: {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'image/svg+xml': '.svg',
        
    }
};

// Configure AWS SDK for DigitalOcean Spaces
const spacesEndpoint = new AWS.Endpoint(digitalOceanConfig.endpoint);
const s3 = new AWS.S3({
    endpoint: spacesEndpoint,
    accessKeyId: digitalOceanConfig.accessKeyId,
    secretAccessKey: digitalOceanConfig.secretAccessKey,
    bucket: digitalOceanConfig.bucket,
    s3ForcePathStyle: true,
    signatureVersion: 'v4',
    region: 'blr1'
});

const uploadToDigitalOcean = async (fileBuffer, originalname, mimetype) => {
    try {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(7);
        const extension = digitalOceanConfig.allowedTypes[mimetype];
        
        if (!extension) {
            console.error('Invalid file type:', mimetype);
            console.error('Allowed types:', Object.keys(digitalOceanConfig.allowedTypes));
            throw new Error(`Invalid file type: ${mimetype}. Allowed types: ${Object.keys(digitalOceanConfig.allowedTypes).join(', ')}`);
        }

        const key = `${digitalOceanConfig.folder}/${timestamp}-${randomString}${extension}`;

        const params = {
            Bucket: digitalOceanConfig.bucket,
            Key: key,
            Body: fileBuffer,
            ACL: 'public-read',
            ContentType: mimetype,
            CacheControl: 'public, max-age=31536000' // Cache for 1 year
        };

        console.log('Uploading to DigitalOcean with params:', {
            bucket: params.Bucket,
            key: params.Key,
            contentType: params.ContentType
        });

        const uploadResult = await s3.upload(params).promise();
        console.log('Upload successful:', uploadResult);
        
        // Construct the correct CDN URL
        const cdnUrl = `${digitalOceanConfig.cdnEndpoint}/${params.Key}`;
        console.log('Generated CDN URL:', cdnUrl);
        return cdnUrl;
    } catch (error) {
        console.error('DigitalOcean Upload Error:', error);
        throw error;
    }
};

const deleteFromDigitalOcean = async (fileUrl) => {
    try {
        if (!fileUrl) {
            console.warn('No file URL provided for deletion');
            return;
        }

        // Check if URL is from DigitalOcean Spaces
        const isDigitalOceanUrl = fileUrl.includes('digitaloceanspaces.com');
        if (!isDigitalOceanUrl) {
            console.warn('Not a DigitalOcean Spaces URL:', fileUrl);
            return;
        }

        // Extract the key from the URL
        // The key is everything after the CDN endpoint or after the bucket name
        let key;
        if (fileUrl.includes(digitalOceanConfig.cdnEndpoint)) {
            key = fileUrl.split(digitalOceanConfig.cdnEndpoint + '/')[1];
        } else {
            // Fallback to extracting from bucket URL if CDN endpoint not found
            const bucketUrl = `${digitalOceanConfig.bucket}.${digitalOceanConfig.endpoint}`;
            key = fileUrl.split(bucketUrl + '/')[1];
        }

        if (!key) {
            console.error('Could not extract file key from URL:', fileUrl);
            return;
        }

        console.log('Attempting to delete file with key:', key);
        
        const params = {
            Bucket: digitalOceanConfig.bucket,
            Key: key
        };

        await s3.deleteObject(params).promise();
        console.log('Successfully deleted file with key:', key);
    } catch (error) {
        console.error('DigitalOcean Delete Error:', error);
        // Don't throw the error, just log it
        // This prevents the deletion failure from breaking the main operation
    }
};

module.exports = {
    uploadToDigitalOcean,
    deleteFromDigitalOcean,
    digitalOceanConfig
}; 