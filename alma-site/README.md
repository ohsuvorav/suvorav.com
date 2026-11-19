# Alma

Private landing page for Alma. It is not linked from suvorav.com, and it is not meant to be served by GitHub Pages.

The page asks crawlers to stay away (`noindex, nofollow` and `robots.txt`). The host below also sends `X-Robots-Tag: noindex` and requires a password.

## Before the first deploy

1. In DNS for `suvorav.com`, add an A record: `alma` → `138.68.147.90`.
2. Wait until `alma.suvorav.com` resolves to that address.
3. On this Mac, `~/.ssh/config` needs a host named `mirality-droplet` that logs in as root on `138.68.147.90` with a key (the scripts do not prompt for a password).
4. The droplet already runs nginx on Ubuntu. `certbot` should already be installed.

## First run

From the repo root:

```sh
./alma-site/deploy/setup.sh
```

That script:

- copies `alma-site/` to `mirality-droplet:/var/www/alma/`, leaving out `deploy/`
- creates `/etc/nginx/alma.htpasswd` for user `oleg` if that file is missing
- generates the password on the droplet with `openssl rand` and prints it in this terminal once
- writes only the nginx vhost for `alma.suvorav.com` (basic auth on the site, ACME challenges left open, `X-Robots-Tag: noindex`)
- runs `nginx -t` and reloads nginx
- runs certbot for `alma.suvorav.com` when DNS already points at the droplet

Run it again safely. An existing password file and an existing vhost are left alone. If the certificate is already there, certbot is skipped.

If DNS does not point at `138.68.147.90` yet, the script says so and stops before certbot. The files and the HTTP vhost stay in place. Fix DNS, then run the script again.

Optional: `CERTBOT_EMAIL=you@example.com ./alma-site/deploy/setup.sh` registers that address with Let's Encrypt. Without it, certbot is told not to register an email.

## Later updates

From the repo root, after editing the page:

```sh
./alma-site/deploy/update.sh
```

That only rsyncs files. It does not change nginx, the certificate, or the password.

## Do not merge this to the public site

This repository is what GitHub Pages publishes for suvorav.com. Merging `alma-site/` to `main` would make the files available at `https://suvorav.com/alma-site/` even with no link on the home page. Leave the pull request unmerged. Alma is hosted at `https://alma.suvorav.com`.
