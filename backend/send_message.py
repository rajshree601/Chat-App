import boto3
import json
import uuid
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('ChatMessages')

def lambda_handler(event, context):
    body = json.loads(event['body'])
    message_id = str(uuid.uuid4())
    timestamp = int(datetime.now().timestamp())
    
    item = {
        'MessageID': message_id,
        'Timestamp': timestamp,
        'Message': body['message'],
        'User': body['user']
    }
    
    table.put_item(Item=item)
    
    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'Message sent successfully!', 'MessageID': message_id})
    }