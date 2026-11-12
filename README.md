# Vision-Saas

CS 651 Exercise SaaS: upload an image and get a list of detected labels from the **Google Cloud Vision API**.

- **Live app:** https://vision-saas.wl.r.appspot.com
- **Wiki (documentation):** https://github.com/Vinanti-Pansari/Vision-Saas/wiki


## What it does


1. The user opens the HTML form and chooses an image (JPG, PNG, GIF, WebP, max 10 MB).
2. The form POSTs the image (`multipart/form-data`) to the Node.js + Express server.
3. The server sends the image to Google Cloud Vision **label detection**.
4. The server returns an HTML page showing the uploaded image and the detected labels, each with a confidence bar and percentage.

## Tech stack

- **Client:** HTML, CSS, JavaScript (`public/index.html`)
- **Server:** Node.js + Express, `multer` for file uploads
- **API:** Google Cloud Vision (`@google-cloud/vision` client library)
- **Hosting:** Google App Engine (Standard)

## Project structure

```
app.yaml            App Engine config (Node.js runtime)
package.json        Dependencies and start script
server.js           Express server, upload route, Vision call, HTML response
public/index.html   Client upload form with image preview
```

## Routes

| Method | Path      | Description                                              |
|--------|-----------|----------------------------------------------------------|
| GET    | `/`       | Upload form (`public/index.html`)                        |
| POST   | `/upload` | Receives field `pic`, returns HTML list of Vision labels |

## Error handling

- No file uploaded: 400 page
- Non-image file or file over 10 MB: 400 page
- Vision API failure: 500 page with the error message

## Run locally

Requires Node.js 20+ and the gcloud CLI.

```
npm install
gcloud auth application-default login
gcloud config set project <YOUR_PROJECT_ID>
gcloud services enable vision.googleapis.com
npm start
```

Open http://localhost:8080

If you get a quota-project error: `gcloud auth application-default set-quota-project <YOUR_PROJECT_ID>`

## Deploy to Google App Engine

Billing must be enabled on the Google Cloud project.

```
gcloud config set project <project-id-here>
gcloud services enable vision.googleapis.com appengine.googleapis.com cloudbuild.googleapis.com
gcloud app create --region=us-west2   # first time only
gcloud app deploy
gcloud app browse
```

Run `gcloud app deploy` from the folder that contains `app.yaml`. On App Engine the client library authenticates automatically with the project's default service account, so no key file is needed.

## Documentation

Full documentation is in the [wiki](https://github.com/Vinanti-Pansari/Vision-Saas/wiki):

- **app:** link to the deployed application
- **demonstration:** before and after screenshots
- **explanation:** code walkthrough and GAE deployment details
- **state of system:** current status and known issues
