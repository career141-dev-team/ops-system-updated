# Security policy

## Reporting a problem

Please do not open a public issue for a security problem. Use GitHub's
"Report a vulnerability" button on the Security tab of this repository, or email
the owner at the address on the Career 141 website. We aim to answer within
three working days.

## What is, and is not, in this repository

- No keys, tokens or passwords. Every `.env*` file except the `*.example` ones is
  ignored by git. The example files hold names only, never values.
- No real client, candidate or staff data. The screens run on invented data.
- Server addresses are written as `<VPS_IP>`; the real ones are kept privately.

If you find a real secret or real personal data here, report it the same way.

## Contributing safely

- Never commit a `.env` file, a key, or a real person's details.
- Pull requests from forks do not get access to repository secrets.
- Changes go through a branch and a reviewed pull request; nothing deploys on a push.
