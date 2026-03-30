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
