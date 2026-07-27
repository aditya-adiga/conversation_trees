## Dev environment setup

To start working with existing endpoints locally you should define the following environmental variables inside .env file:

```
RECALL_API_KEY=
NGROK_AUTH_TOKEN=
NEXT_PUBLIC_APP_URL=
```

**RECALL_API_KEY** - Recall ai provides the API to get recordings, transcripts and metadata from video conferencing platforms

**NGROK_AUTH_TOKEN** - ngrok configuration allows to use persistent https connection as required by Recall ai webhook configuration

**NEXT_PUBLIC_APP_URL** -persistent ngrok domain to avoid domain name changes on every restart


### Third party services

To go with a fully functioning application you need to:
1. Install and configure ngrok (https://ngrok.com/use-cases/share-localhost):
    - install ngrok
    - add your auth token
2. Create Recall ai account and configure the webhook endpoint, that should follow the template:
```
https://{your-persistent-ngrok-domain}/api/webhooks/recall/stream
```

## Getting started

1. To start the development server and enable hot reload run: 
    ```
    bun run dev
    ```

    It will automatically start the app and ngrok for you

2. Because the store is held in memory, hot reload will reset its state between requests. To test endpoints with persistent data, disable hot reload by running:

    ```
    bun run build
    ```

    ```
    bun run start
    ```