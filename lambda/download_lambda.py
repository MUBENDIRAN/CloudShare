import json
import boto3
import os
from datetime import datetime
from botocore.exceptions import ClientError

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

# Get from environment variables (set in Lambda Configuration)
BUCKET_NAME = os.environ.get('BUCKET_NAME')
TABLE_NAME = os.environ.get('TABLE_NAME')

# Configuration
PRESIGNED_URL_EXPIRATION = 3600  # 1 hour (3600 seconds)

def lambda_handler(event, context):
    """Generate presigned URL with proper filename and content type"""
    
    try:
        # Get code from query parameters
        code = event.get('queryStringParameters', {}).get('code', '')
        
        if not code:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'success': False,
                    'message': 'Code parameter is required'
                })
            }
        
        # Look up code in DynamoDB
        table = dynamodb.Table(TABLE_NAME)
        response = table.get_item(Key={'code': code.upper()})
        
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'success': False,
                    'message': 'Invalid code or file not found'
                })
            }
        
        item = response['Item']
        s3_key = item['s3_key']
        filename = item['filename']  # Original filename from upload!
        filetype = item.get('filetype', 'application/octet-stream')
        
        # Check if file has expired
        expiry_time = item.get('expiry_time')
        if expiry_time:
            expiry_dt = datetime.fromisoformat(expiry_time)
            if datetime.now() > expiry_dt:
                return {
                    'statusCode': 410,  # 410 Gone
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'application/json'
                    },
                    'body': json.dumps({
                        'success': False,
                        'message': 'File has expired and is no longer available'
                    })
                }
        
        # Generate presigned URL with proper filename and content type
        presigned_url = s3.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': BUCKET_NAME,
                'Key': s3_key,
                'ResponseContentType': filetype,  # Proper content type!
                'ResponseContentDisposition': f'attachment; filename="{filename}"'  # Original filename!
            },
            ExpiresIn=PRESIGNED_URL_EXPIRATION
        )
        
        # Return success with download URL
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'success': True,
                'url': presigned_url,
                'filename': filename,  # Send filename to frontend
                'filetype': filetype,
                'url_expires_in': PRESIGNED_URL_EXPIRATION,
                'message': f'Download link valid for {PRESIGNED_URL_EXPIRATION // 60} minutes'
            })
        }
        
    except ClientError as e:
        print(f"AWS Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'success': False,
                'message': 'Server error while generating download link'
            })
        }
    except Exception as e:
        print(f"Error: {str(e)}")
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
                'message': 'Server error'
            })
        }