import json
import boto3
import os
import uuid
from datetime import datetime

dynamodb = boto3.resource('dynamodb')

# Environment variables
FEEDBACK_TABLE_NAME = os.environ.get('FEEDBACK_TABLE_NAME')

def lambda_handler(event, context):
    """
    Store user feedback in DynamoDB
    """
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        
        rating = body.get('rating', 0)
        feedback_text = body.get('feedback', '')
        timestamp = body.get('timestamp', datetime.utcnow().isoformat())
        
        # Validate input
        if rating == 0 and not feedback_text:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({
                    'success': False,
                    'message': 'Rating or feedback text is required'
                })
            }
        
        # Generate unique feedback ID
        feedback_id = str(uuid.uuid4())
        
        # Store in DynamoDB
        table = dynamodb.Table(FEEDBACK_TABLE_NAME)
        table.put_item(
            Item={
                'feedback_id': feedback_id,
                'rating': rating,
                'feedback': feedback_text,
                'timestamp': timestamp,
                'created_at': datetime.utcnow().isoformat()
            }
        )
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({
                'success': True,
                'message': 'Feedback submitted successfully',
                'feedback_id': feedback_id
            })
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'success': False,
                'message': 'Failed to submit feedback'
            })
        }