# Shenanigans website

A static band website with the record-sleeve design, spinning vinyl, audio samples, upcoming gig, Instagram link and booking form.

## GitHub and Netlify

Keep this repository, including its `dist/assets` folder, in GitHub. Link the GitHub repository to Netlify for automatic publishing from `main`.

Netlify settings:

- Base directory: repository root.
- Build command: leave empty.
- Publish directory: `dist`, already configured in `netlify.toml`.
- Production branch: `main`.

There are no npm dependencies, compilation steps or server functions. The GitHub repository can be private while the Netlify website is public. After connecting the repository, Netlify provides a hosted address. A custom domain can be added to that Netlify project later.

## Updating the site

- Page content, gig and contact form: `dist/index.html`.
- Visual styling: `dist/style.css`.
- Audio playback and page interactions: `dist/player.js`.
- Images, font and sample audio: `dist/assets/`.

Commit and push changes to `main` to update the connected Netlify website. Keep `dist` tracked: it contains the authored website rather than disposable build output.

## Booking emails

The form posts to FormSubmit and is addressed to `jamesmarsland@gmail.com`. Submit a test from the final Netlify address and complete any FormSubmit activation email before relying on booking notifications. The return address follows the domain on which the form is opened. No email API key is stored in this repository.

The site was originally published with ChatGPT Sites. Its `.openai/hosting.json` preserves that project's identity; Netlify publishes only `dist` and does not need that file to serve the site.

## References

- Netlify configuration: https://docs.netlify.com/build/configure-builds/file-based-configuration/
- Netlify deployment workflow: https://docs.netlify.com/deploy/deploy-overview/
- FormSubmit setup: https://formsubmit.co/
