const { S3Client, ListBucketsCommand, PutObjectCommand, DeleteBucketCommand, DeleteObjectCommand, DeleteObjectsCommand, Create } = require("@aws-sdk/client-s3")
const { Upload } = require('@aws-sdk/lib-storage');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const { AWS_ACCESS_KEY_ID, AWS_ENDPOINT, AWS_SECRET_ACCESS_KEY } = process.env
var _s3;

module.exports = {
    /**
     * Function used to connect to AWS S3 server. 
     * On successfull connection, returns AWS Buckets in the region.
     * @async
     * @function connect
     * @typedef {Object.<string, string, string>} ProcessEnv
     * @property {string} AWS_ACCESS_KEY_ID 
     * @property {string} AWS_ENDPOINT
     * @property {string} AWS_SECRET_ACCESS_KEY
     * 
     * @param ProcessEnv env
     * @returns {Promise<AWS.S3>} A connected S3 client instance. 
     * @throws {Error} If the connection to AWS S3 fails.cted S3Client
    */
    connect: async function (params = {}) {
        try {
            _s3 = new S3Client({
                // logger: console,
                region: params?.region || "us-east-1",
                endpoint: params?.endpoint || AWS_ENDPOINT,
                credentials: {
                    accessKeyId: params?.credentials?.accessKeyId || AWS_ACCESS_KEY_ID,
                    secretAccessKey: params?.credentials?.secretAccessKey || AWS_SECRET_ACCESS_KEY,
                    ...params?.credentials
                },
                forcePathStyle: params?.forcePathStyle !== undefined ? params.forcePathStyle : true,
                retryMode: params?.retryMode || 'standard', // Set retry mode explicitly
                maxAttempts: params?.maxAttempts || 3, // Set max attempts explicitly
                ...params
            });
            const checkConnection = await _s3.send(new ListBucketsCommand({}));
            if (!checkConnection.Buckets || checkConnection.Buckets.length === 0) {
                throw new Error("Connection successful, but no buckets found.");
            }
            console.log("Connection Successful:", { Buckets: checkConnection.Buckets });
            return _s3;
        } catch (error) {
            return console.error(error);
        }
    },

    /**
     * Function returns connected S3Client instance
     * @returns {Promise<AWS.S3>} A connected S3 client instance. 
     */
    getS3: function () {
        return _s3;
    },
    /**
     * Uploads a file to an AWS S3 bucket using the provided upload parameters.
     *
     * @function sendFiles
     *
     * @param {Object} uploadParams - Parameters required for uploading the file to S3.
     * @param {string} uploadParams.Bucket - The name of the S3 bucket where the file will be uploaded.
     * @param {string} uploadParams.Key - The key (file path) under which the file will be stored in the S3 bucket.
     * @param {Buffer|Uint8Array|Blob|string|Readable} uploadParams.Body - The content of the file to upload.
     *
     * @returns {Promise<Object>} Resolves with an object containing the upload status and response data on success:
     * - `{boolean} isUploaded` - Indicates whether the file was successfully uploaded.
     * - `{Object} ...data` - The response data from AWS S3.
     *
     * Rejects with an object containing the upload status and error details on failure:
     * - `{boolean} isUploaded` - Indicates the upload failed.
     * - `{Error|string} error` - The error object or message describing the failure.
     *
     * @throws {Error} Throws an error if `Bucket`, `Key`, or `Body` is missing in the `uploadParams`.
     *
     * @example
     * const uploadParams = {
     *   Bucket: "my-bucket",
     *   Key: "path/to/file.txt",
     *   Body: "File content or stream"
     * };
     *
     * sendFiles(uploadParams)
     *   .then((response) => {
     *     console.log("Upload successful:", response);
     *   })
     *   .catch((error) => {
     *     console.error("Upload failed:", error);
     *   });
    */
    sendFiles: function (uploadParams) {
        return new Promise((resolve, reject) => {
            (async () => {
                try {
                    const { Bucket, Key, Body } = uploadParams;
                    if (Bucket == undefined || Key == undefined || Body == undefined) {
                        reject({
                            isUploaded: false,
                            error: "uploadParamas has missing data"
                        })
                    }
                    // Upload the file to S3
                    return await _s3.send(new PutObjectCommand(uploadParams)).then((data) => resolve({
                        isUploaded: true,
                        ...data
                    }));
                } catch (err) {
                    return reject({
                        isUploaded: false,
                        error: err
                    })
                }
            })
        })
    },
    /**
     * Uploads a file to an AWS S3 bucket using multipart uploads with progress tracking.
     *
     * @function uploadFiles
     *
     * @param {Object} uploadFileParams - Parameters for configuring the multipart upload.
     * @param {Object} uploadFileParams.params - AWS S3 upload parameters (optional overrides).
     * @param {number} [uploadFileParams.queueSize=10] - Number of concurrent parts being uploaded.
     * @param {number} [uploadFileParams.partSize=5242880] - Size of each upload part in bytes (default is 5 MB).
     *
     * @param {function(number): void} uploadProgress - Callback function for upload progress. Receives the upload progress percentage as an argument.
     *
     * @param {Object} uploadParams - Parameters for the S3 object to be uploaded.
     * @param {string} uploadParams.Bucket - The name of the S3 bucket where the file will be uploaded.
     * @param {string} uploadParams.Key - The key (file path) where the file will be stored in the bucket.
     * @param {Buffer|Uint8Array|Blob|string|Readable} uploadParams.Body - The content of the file to upload.
     *
     * @returns {Promise<Object>} Resolves with an object containing:
     * - `{boolean} isUploaded` - Indicates whether the file was successfully uploaded.
     * - `{Object} result` - The result of the upload from AWS S3.
     *
     * Rejects with an object containing:
     * - `{boolean} isUploaded` - Indicates the upload failed.
     * - `{Error} error` - The error object or message describing the failure.
     *
     * @throws {Error} Throws an error if `Bucket`, `Key`, or `Body` is missing in `uploadParams`.
     *
     * @example
     * const uploadFileParams = {
     *   queueSize: 5,
     *   partSize: 10 * 1024 * 1024 // 10 MB
     * };
     *
     * const uploadParams = {
     *   Bucket: "my-bucket",
     *   Key: "path/to/large-file.txt",
     *   Body: "Large file content or stream"
     * };
     *
     * const uploadProgress = (percent) => {
     *   console.log(`Upload progress: ${percent}%`);
     * };
     *
     * uploadFiles(uploadFileParams, uploadProgress, uploadParams)
     *   .then((response) => {
     *     console.log("Upload successful:", response);
     *   })
     *   .catch((error) => {
     *     console.error("Upload failed:", error);
     *   });
    */
    uploadFiles: function (uploadFileParams, uploadProgress, uploadParams) {
        return new Promise((resolve, reject) => {
            (async () => {
                const { Bucket, Key, Body } = uploadParams;
                if (Bucket == undefined || Key == undefined || Body == undefined) {
                    reject({
                        isUploaded: false,
                        error: "uploadParamas has missing data"
                    })
                }
                const upload = new Upload({
                    client: _s3,
                    params: uploadFileParams,
                    queueSize: 10, // Number of concurrent uploads
                    partSize: 5 * 1024 * 1024, // 5 MB
                    ...uploadFileParams
                });
                upload.on('httpUploadProgress', (evt) => {
                    const percent = Math.round((evt.loaded * 100) / parseInt(req.headers['content-length'] || 1, 10));
                    if (typeof uploadProgress === 'function') {
                        return uploadProgress(percent);
                    }
                });
                try {
                    const result = await upload.done()
                    if (result) {
                        return resolve({
                            isUploaded: true,
                            result
                        })
                    }
                } catch (error) {
                    return reject({
                        isUploaded: false,
                        error
                    })
                }
            })
        })
    },
    /**
     * Generates a presigned URL for uploading a file to an S3 bucket.
     *
     * @function getUploadFileURL
     * @param {Object} uploadParams - The parameters required to upload the file.
     * @param {string} uploadParams.Bucket - The name of the S3 bucket.
     * @param {string} uploadParams.Key - The key (path and file name) where the file will be stored in the bucket.
     * @param {Object} [uploadParams.Body] - The optional file content to upload.
     * @param {string} [uploadParams.ContentType] - The MIME type of the file being uploaded.
     * @returns {Promise<Object>} A promise that resolves with an object containing the presigned URL for the upload.
     * @throws {Object} An error object if `Bucket` or `Key` is missing in `uploadParams`.
     * 
     * @example
     * const uploadParams = {
     *     Bucket: 'my-bucket',
     *     Key: 'path/to/myfile.txt',
     *     ContentType: 'text/plain',
     *     Body: 'File content here'
     * };
     * 
     * getUploadFileURL(uploadParams)
     *     .then(response => {
     *         console.log('Presigned URL:', response.presignedUrl);
     *     })
     *     .catch(error => {
     *         console.error('Error generating presigned URL:', error);
     *     });
    */
    getUploadFileURL: function (uploadParams) {
        return new Promise((resolve, reject) => {
            (async () => {
                const { Bucket, Key } = uploadParams;
                if (Bucket == undefined || Key == undefined) {
                    return reject({
                        error: "uploadParamas has missing data"
                    })
                }
                const command = new PutObjectCommand(uploadParams);
                const presignedUrl = await getSignedUrl(_s3, command, { expiresIn: 3600 });
                return resolve({
                    presignedUrl: presignedUrl
                })
            })
        })
    },
    /**
     * Deletes a file from an S3 bucket.
     *
     * @function deleteFileFromBucket
     * @param {Object} deleteParams - The parameters required to delete the file.
     * @param {string} deleteParams.Bucket - The name of the S3 bucket.
     * @param {string} deleteParams.Key - The key (path and file name) of the file to be deleted from the bucket.
     * @returns {Promise<Object>} A promise that resolves with an object indicating the deletion status and additional data.
     * @throws {Object} An error object if `Bucket` or `Key` is missing in `deleteParams` or if the deletion operation fails.
     * 
     * @example
     * const deleteParams = {
     *     Bucket: 'my-bucket',
     *     Key: 'path/to/myfile.txt'
     * };
     * 
     * deleteFileFromBucket(deleteParams)
     *     .then(response => {
     *         console.log('File deleted:', response.isDeleted);
     *     })
     *     .catch(error => {
     *         console.error('Error deleting file:', error);
     *     });
    */
    deleteFileFromBucket: function (deleteParams) {
        return new Promise((resolve, reject) => {
            (async () => {
                const { Bucket, Key } = deleteParams;
                if (Bucket == undefined || Key == undefined) {
                    return reject({
                        isDeleted: false,
                        error: "uploadParamas has missing data"
                    })
                }
                try {
                    return await _s3.send(new DeleteObjectCommand(deleteParams))
                        .then((data) => resolve({
                            isDeleted: true,
                            ...data
                        }));
                } catch (error) {
                    return reject({
                        isDeleted: false,
                        error: error
                    })
                }
            })
        })
    },
    /**
     * Deletes multiple files from an S3 bucket.
     *
     * @function deleteFilesFromBucket
     * @param {Object} deleteParams - The parameters required to delete multiple files.
     * @param {string} deleteParams.Bucket - The name of the S3 bucket.
     * @param {Object} deleteParams.Delete - The deletion parameters.
     * @param {Object[]} deleteParams.Delete.Objects - An array of objects, each containing the key (path and file name) of a file to be deleted.
     * @param {string} deleteParams.Delete.Objects[].Key - The key (path and file name) of the file to be deleted.
     * @returns {Promise<Object>} A promise that resolves with an object indicating the deletion status and additional data.
     * @throws {Object} An error object if `Bucket`, `Delete`, or `Delete.Objects` is missing or if the deletion operation fails.
     * 
     * @example
     * const deleteParams = {
     *     Bucket: 'my-bucket',
     *     Delete: {
     *         Objects: [
     *             { Key: 'path/to/myfile1.txt' },
     *             { Key: 'path/to/myfile2.txt' }
     *         ]
     *     }
     * };
     * 
     * deleteFilesFromBucket(deleteParams)
     *     .then(response => {
     *         console.log('Files deleted:', response.isDeleted);
     *     })
     *     .catch(error => {
     *         console.error('Error deleting files:', error);
     *     });
    */
    deleteFilesFromBucket: function (deleteParams) {
        return new Promise((resolve, reject) => {
            (async () => {
                const { Bucket, Delete } = deleteParams;
                if (Bucket == undefined || Delete == undefined || Delete?.Objects.length == 0) {
                    return reject({
                        isDeleted: false,
                        error: "uploadParamas has missing data"
                    })
                }
                try {
                    return await _s3.send(new DeleteObjectsCommand(deleteParams))
                        .then((data) => resolve({
                            isDeleted: true,
                            ...data
                        }));
                } catch (error) {
                    return reject({
                        isDeleted: false,
                        error: error
                    })
                }
            })
        })
    },
    deleteBucket: async function (deleteParams) {
        const { Bucket } = deleteParams;
        if (!Bucket) {
            throw new Error("deleteParams has missing data: Bucket name is required.");
        }
        try {
            const data = await _s3.send(new DeleteBucketCommand(deleteParams));
            return {
                isDeleted: true,
                ...data,
            };
        } catch (error) {
            console.log(error);
            throw new Error(`Failed to delete bucket: ${error.message}`);
        }
    },
    /**
     * Creates a folder in an S3 bucket.
     *
     * @param {Object} createParams - Parameters for creating the folder.
     * @param {string} createParams.bucketName - The name of the S3 bucket.
     * @param {string} createParams.folderName - The name of the folder to create.
     * @returns {Promise<Object>} Resolves with the S3 PutObject command response.
     * @throws {Error} If bucketName or folderName is missing or if the operation fails.
    */
    createFolderInBucket: function (createParams) {
        return new Promise((resolve, reject) =>
        (async () => {
            const { bucketName, folderName } = createParams;
            if (!bucketName || !folderName) {
                return reject({ error: 'bucketName and folderName are required.' });
            }
            try {
                const command = new PutObjectCommand({
                    Bucket: bucketName,
                    Key: folderKey,
                });
                const result = await _s3.send(command);
                return resolve(result);
            } catch (error) {
                reject(error);
            }
        }))
    }
}