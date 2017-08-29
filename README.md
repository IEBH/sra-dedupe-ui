SRA-Dedupe-UI
=============
This module is part of the [Bond University Centre for Research in Evidence-Based Practice](https://github.com/CREBP) Systematic Review Assistant suite of tools.

Download
--------

| Filename                                                                                                                            | Platform       | Notes                                                                |
|-------------------------------------------------------------------------------------------------------------------------------------|----------------|----------------------------------------------------------------------|
| [sra-dedupe-linux-amd64.deb](https://github.com/CREBP/sra-dedupe-ui/raw/master/dist/sra-dedupe-linux-amd64.deb)                     | Linux (Debian) | Suitable for installation on any Debian based OS - Ubuntu, Mint etc. |
| [sra-dedupe-linux-x86_64.rpm](https://github.com/CREBP/sra-dedupe-ui/raw/master/dist/sra-dedupe-linux-x86_64.rpm)                   | Linux (Redhat) | Suitable for installation on any Redhat based OS - Fedora, RHEL etc. |
| [sra-dedupe-linux.tar.bz2](https://github.com/CREBP/sra-dedupe-ui/raw/master/dist/sra-dedupe-linux.tar.bz2)                         | Linux          | Generic Tarball                                                      |
| [sra-dedupe-mac.zip](https://github.com/CREBP/sra-dedupe-ui/raw/master/dist/sra-dedupe-mac.zip)                                     | Mac            | Generic zip                                                          |
| [sra-dedupe-ui-0.0.0-x86_64.AppImage](https://github.com/CREBP/sra-dedupe-ui/raw/master/dist/sra-dedupe-ui-0.0.0-x86_64.AppImage)   | Linux          | AppImage installer - most platforms                                  |
| [sra-dedupe-win.exe](https://github.com/CREBP/sra-dedupe-ui/raw/master/dist/sra-dedupe-win.exe)                                     | Windows        | Generic stand alone executable (no install required)                 |
| [sra-dedupe-win-installer.exe](https://github.com/CREBP/sra-dedupe-ui/raw/master/dist/sra-dedupe-win-installer.exe)                 | Windows        | Installable version                                                  |

Development
===========

Building
--------
See the instructions for multi platform building at the at the [electron-builder project](https://github.com/electron-userland/electron-builder/wiki/Multi-Platform-Build#linux).

To rebuild the binary files run `npm run build` (preferably on a Linux machine with Wine@>=1.8.1).

If you're getting a "Module version mismatch. Expected X, got Y" error run `./node_modules/.bin/electron-rebuild`.
