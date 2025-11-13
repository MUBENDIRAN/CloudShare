# CloudShare

CloudShare is a serverless file-sharing service built on AWS, focused on quick, temporary transfers. It uses Lambda, S3, DynamoDB, and a 24-hour TTL cleanup system. Deployment is automated through GitHub Actions.

## How It Works

1. **Upload**  
   The user uploads a file (e.g., `photo.jpg`, 2 MB JPEG).

2. **Code Generation**  
   A Lambda function creates a unique access code such as `AB12CD34`.

3. **Storage in S3**  
   The file is saved to S3 with the correct metadata:  
   - `ContentType: image/jpeg`  
   - `ContentDisposition: filename="photo.jpg"`

4. **Record in DynamoDB**  
   The system stores:  
   - `code: AB12CD34`  
   - `filename: photo.jpg`  
   - `filetype: image/jpeg`  
   - `ttl: <UNIX timestamp 24h from upload>`

5. **Frontend Display**  
   The generated code is shown to the user for 30 seconds.

6. **Receiving**  
   The recipient enters the code on the Receive page.

7. **Presigned URL**  
   A Lambda function returns a presigned download URL containing:  
   - the original filename  
   - the correct content type

8. **Download**  
   The file downloads and opens with the correct file type.

9. **Expiration**  
   After 24 hours:  
   - the S3 object is deleted  
   - the DynamoDB entry expires  
   - the access code becomes invalid

## Tech Stack

- **AWS Lambda** – file upload and download handlers  
- **AWS S3** – file storage  
- **AWS DynamoDB** – metadata + TTL expiration  
- **GitHub Actions** – CI/CD  
- **Frontend** – upload and receive interface

## Purpose

A minimal, secure, temporary file-sharing tool with no accounts and no persistent data.
