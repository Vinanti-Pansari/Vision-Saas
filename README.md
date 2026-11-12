# vision-saas

CS 651 Exercise SaaS: upload an image, get Google Cloud Vision label detection results as an HTML list.

- Client: `public/index.html` (multipart form, field `pic`)
- Server: `server.js` (Node.js + Express + multer + `@google-cloud/vision`), route `POST /upload`
- Deploy: Google App Engine (`app.yaml`)

## Run locally
```
npm install
gcloud auth application-default login
npm start
```
Open http://localhost:8080

## Deploy
```
gcloud services enable vision.googleapis.com appengine.googleapis.com
gcloud app create --region=us-west2   # first time only
gcloud app deploy
gcloud app browse
```
# Vision-Saas
