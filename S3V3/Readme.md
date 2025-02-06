# AWS S3 Utility Module

This module provides utility functions for interacting with AWS S3, including connecting to S3, uploading files, generating pre-signed URLs, and managing buckets and objects. It uses the AWS SDK for JavaScript.

## Features

- Connect to AWS S3 and list buckets.
- Upload files to an S3 bucket.
- Upload large files with multipart uploads and progress tracking.
- Generate pre-signed URLs for secure file upload.
- Delete files and folders from an S3 bucket.
- Create folders in an S3 bucket.

## Prerequisites

- Node.js installed on your system.
- AWS credentials with appropriate permissions to access S3 services.
- Environment variables:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_ENDPOINT` (if applicable)

## Installation

1. Clone or download the repository.
2. Install dependencies:
   ```bash
   npm install @aws-sdk/client-s3 @aws-sdk/lib-storage @aws-sdk/s3-request-presigner
   ```
3. Set the required environment variables in your `.env` file or system environment.

## Usage

### Import the Module

```javascript
const s3Utils = require("./awsS3Config");
```

### Connect to AWS S3

```javascript
(async () => {
  const s3Client = await s3Utils.connect({ region: "us-east-1" });
  if (s3Client) {
    console.log("Connected to S3");
  }
})();
```

### Upload a File

```javascript
const uploadParams = {
  Bucket: "my-bucket",
  Key: "path/to/file.txt",
  Body: "File content or stream",
};

s3Utils
  .sendFiles(uploadParams)
  .then((response) => console.log("Upload successful:", response))
  .catch((error) => console.error("Upload failed:", error));
```

### Upload Large Files with Progress

```javascript
const uploadFileParams = {
  queueSize: 5,
  partSize: 10 * 1024 * 1024, // 10 MB
};

const uploadParams = {
  Bucket: "my-bucket",
  Key: "path/to/large-file.txt",
  Body: "Large file content or stream",
};

s3Utils
  .uploadFiles(uploadFileParams, (progress) => console.log(`Progress: ${progress}%`), uploadParams)
  .then((response) => console.log("Upload successful:", response))
  .catch((error) => console.error("Upload failed:", error));
```

### Generate Pre-Signed URL

```javascript
const uploadParams = {
  Bucket: "my-bucket",
  Key: "path/to/file.txt",
  ContentType: "text/plain",
};

s3Utils
  .getUploadFileURL(uploadParams)
  .then((response) => console.log("Presigned URL:", response.presignedUrl))
  .catch((error) => console.error("Error:", error));
```

### Delete a File

```javascript
const deleteParams = {
  Bucket: "my-bucket",
  Key: "path/to/file.txt",
};

s3Utils
  .deleteFileFromBucket(deleteParams)
  .then((response) => console.log("File deleted:", response))
  .catch((error) => console.error("Error deleting file:", error));
```

### Delete Multiple Files

```javascript
const deleteParams = {
  Bucket: "my-bucket",
  Delete: {
    Objects: [{ Key: "path/to/file1.txt" }, { Key: "path/to/file2.txt" }],
  },
};

s3Utils
  .deleteFilesFromBucket(deleteParams)
  .then((response) => console.log("Files deleted:", response))
  .catch((error) => console.error("Error deleting files:", error));
```

### Create a Folder

```javascript
const createParams = {
  bucketName: "my-bucket",
  folderName: "new-folder/",
};

s3Utils
  .createFolderInBucket(createParams)
  .then((response) => console.log("Folder created:", response))
  .catch((error) => console.error("Error creating folder:", error));
```

## Error Handling

All functions return Promises and handle errors by rejecting with detailed error messages or objects.

## License

This module is open-sourced under the MIT License.
