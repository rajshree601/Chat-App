import boto3
import json

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('ChatMessages')

def lambda_handler(event, context):
    response = table.scan()
    messages = sorted(response['Items'], key=lambda x: x['Timestamp'], reverse=True)
    
    return {
        'statusCode': 200,
        'body': json.dumps(messages)
    }