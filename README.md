<!--
SPDX-FileCopyrightText: 2026 Bergische Universität Wuppertal
SPDX-FileCopyrightText: 2026 deepsight GmbH

SPDX-License-Identifier: AGPL-3.0-or-later
-->

# TOP Assist Frontend

This repository contains the frontend to the TOP Assist text optimization tool.
It is a [Vue 3](https://vuejs.org/) single-page application written in TypeScript and built with [Vite](https://vite.dev/).

## Setup

This project is [npm](https://docs.npmjs.com/)-managed and requires Node.js 20.19+ or 22.12+ (we use the current LTS, Node.js 24).
Install the dependencies with:

```bash
npm ci
```

The frontend talks to the TOP Assist backend via its `/v1` API.
During development, requests to `/v1` are proxied to `http://localhost:8000`.
Should your backend run elsewhere, create a `.env` file based on our example environment file (`.env.example`) and adjust `API_PROXY_TARGET`.

### Running natively

You may get started by running

```bash
npm run dev
```

which serves the application with hot-reloading on <http://localhost:3000>.
Please note that you will need a running backend for the application to be functional.

### Running in container

The container image builds the application and serves it via nginx, which also proxies `/v1` to a host named `backend`.
It is therefore meant to be run as part of the complete stack defined in the `compose.yml` of the parent directory.
The following documentation uses `podman` as an example but the Docker and podman API surfaces are identical for the use cases described below.

```bash
# Build the actual service image.
podman build -t top-assist-frontend -f Containerfile .

# Launch a complete stack, including backend and database (from the parent directory).
podman compose up -d
```

---

## Development

Before committing, please make sure that the following commands pass:

```bash
# Type-check and build for production.
npm run build

# Lint (with automatic fixes) using ESLint.
npm run lint

# Format the sources using Prettier.
npm run format
```

The sources in `src/` are organised as follows:

- `views/`: pages that are mapped to a route in `router/`
- `components/`: reusable building blocks of those pages
- `api/`: typed client for the backend API
- `assets/`: global styles, icons and logos (bundled and hashed by Vite)

Files in `public/` are served as-is and should only hold assets that need a fixed URL, such as the favicon.

---

## Releases

Releases are made from git tags of the form `vX.Y.Z` (e.g. `v1.2.0`), which are the single source of truth for the version:

- The `version` in `package.json` is not used for releases and stays at `0.0.0`.
- The container image is tagged with the version **without** the `v` prefix, i.e. `v1.2.0` is published as `docker.io/inbap/top-assist-frontend:1.2.0`.

To publish a release, tag the commit and push the tag:

```bash
git tag -a v1.2.0
git push origin v1.2.0
```

The GitLab pipeline (`.gitlab-ci.yml`) then builds the image (with SBOM and provenance attestations and reproducible timestamps) and pushes it to Docker Hub.

### Building images locally

**GitLab builds release tags only.**
Our GitLab hosts have asked us to be mindful of storage and compute, so there are no pipelines for branches or merge requests.
Please build and test images on your own machine instead:

```bash
podman build -f Containerfile -t top-assist-frontend:dev .
```

Should the pipeline be unavailable, a maintainer may publish a release by hand with the same build command CI uses.
Run it from a clean checkout of the release tag, as it pushes straight to Docker Hub:

```bash
TAG=v1.2.0
VERSION="${TAG#v}"
git switch --detach "$TAG"

# One-time: create a builder that supports attestations.
docker buildx create --name attest --driver docker-container

docker buildx build -f Containerfile \
  --builder attest \
  --platform linux/amd64 \
  --sbom=true --provenance=mode=max \
  --build-arg SOURCE_DATE_EPOCH="$(git log -1 --pretty=%ct)" \
  --label org.opencontainers.image.version="$VERSION" \
  --label org.opencontainers.image.revision="$(git rev-parse HEAD)" \
  --label org.opencontainers.image.source="https://git.uni-wuppertal.de/top-assist/frontend" \
  --output type=registry,rewrite-timestamp=true \
  --tag docker.io/inbap/top-assist-frontend:"$VERSION" \
  .
```

---

## Licensing

This project follows the [REUSE specification](https://reuse.software/) so that every file carries machine-readable copyright and license information in [SPDX](https://spdx.dev/) format. The project is licensed under the [AGPL 3.0 or later](LICENSES/AGPL-3.0-or-later.txt); the full license texts are in `LICENSES/`.

The copyright is held jointly by deepsight GmbH and Bergische Universität Wuppertal. Every source file starts with a header like this, written in the comment syntax of the respective file type:

```ts
// SPDX-FileCopyrightText: 2026 Bergische Universität Wuppertal
// SPDX-FileCopyrightText: 2026 deepsight GmbH
//
// SPDX-License-Identifier: AGPL-3.0-or-later
```

Files that cannot contain comments (JSON files and images) are annotated in `REUSE.toml` instead.
Note that the partner logos in `src/assets/logos/` are trademarks of their respective owners and **not** covered by the AGPL; they are annotated accordingly.

We use the [`reuse`](https://github.com/fsfe/reuse-tool) tool to add and check these headers. It can be run via `uvx` without installing it:

```bash
# add the header to new files
uvx reuse annotate \
  --copyright "deepsight GmbH" \
  --copyright "Bergische Universität Wuppertal" \
  --license AGPL-3.0-or-later \
  path/to/new_file.vue

# check that every file in the repository has copyright and license information
uvx reuse lint
```

Please remember to annotate all files with SPDX headers (or add them to `REUSE.toml`) before committing.
