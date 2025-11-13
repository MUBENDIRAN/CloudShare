import json
import boto3
import base64
import random
import string
import os
from datetime import datetime, timedelta
import mimetypes

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

# Get from environment variables (set in Lambda Configuration)
BUCKET_NAME = os.environ.get('BUCKET_NAME')
TABLE_NAME = os.environ.get('TABLE_NAME')

# Configuration
CODE_DISPLAY_DURATION = 30  # Show code for 30 seconds
FILE_EXPIRY_DAYS = 1  # Files deleted after 1 day

def generate_code():
    """Generate 8-character code like 'AB12CD34'"""
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choice(chars) for _ in range(8))

def get_content_type(filename):
    """Get proper content type based on file extension"""
    content_type, _ = mimetypes.guess_type(filename)
    return content_type or 'application/octet-stream'

def lambda_handler(event, context):
    """Handle file upload with proper file type preservation"""
    
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        
        # Get file data
        base64_file = body.get('file', '')
        filename = body.get('filename', 'uploaded-file')
        filetype = body.get('filetype', '')
        filesize = body.get('filesize', 0)
        
        if not base64_file:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'success': False,
                    'message': 'No file provided'
                })
            }
        
        # Check file size (10 MB limit)
        if filesize > 10 * 1024 * 1024:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'success': False,
                    'message': 'File exceeds 10 MB limit'
                })
            }
        
        # Decode base64 to binary
        file_data = base64.b64decode(base64_file)
        
        # Generate unique code and ID
        code = generate_code()
        file_id = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{code}"
        
        # Get proper content type from filename or provided type
        if not filetype or filetype == 'application/octet-stream':
            filetype = get_content_type(filename)
        
        # Save to S3 with proper content type and metadata
        s3_key = f"uploads/{file_id}/{filename}"
        
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=s3_key,
            Body=file_data,
            ContentType=filetype,  # Proper content type!
            ContentDisposition=f'attachment; filename="{filename}"',  # Original filename!
            Metadata={
                'original-filename': filename,
                'upload-time': datetime.now().isoformat(),
                'file-code': code
            }
        )
        
        # Calculate expiry time (1 day from now)
        expiry_time = datetime.now() + timedelta(days=FILE_EXPIRY_DAYS)
        ttl_timestamp = int(expiry_time.timestamp())  # Unix timestamp for DynamoDB TTL
        
        # Save metadata to DynamoDB with TTL
        table = dynamodb.Table(TABLE_NAME)
        table.put_item(
            Item={
                'code': code,
                'file_id': file_id,
                's3_key': s3_key,
                'filename': filename,  # Original filename stored!
                'filetype': filetype,  # File type stored!
                'upload_time': datetime.now().isoformat(),
                'expiry_time': expiry_time.isoformat(),
                'ttl': ttl_timestamp,  # DynamoDB TTL - auto-deletes after 1 day!
                'size': len(file_data),
                'code_display_duration': CODE_DISPLAY_DURATION
            }
        )
        
        # Return success with code and display duration
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'success': True,
                'code': code,
                'filename': filename,
                'display_duration': CODE_DISPLAY_DURATION,  # Tell frontend how long to show
                'expiry_time': expiry_time.isoformat(),
                'message': f'File will be available for {FILE_EXPIRY_DAYS} day(s)'
            })
        }
        
    except Exception as error:
        print(f"Error: {str(error)}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'success': False,
                'message': 'Upload failed. Please try again.'
            })
        }