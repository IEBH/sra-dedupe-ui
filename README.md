SRA-Dedupe-UI
=============
This module is part of the [Bond University Institute for Evidence-Based Healthcare](https://iebh.bond.edu.au) Systematic Review Assistant suite of tools.

Download
--------

| Filename                                                                                                                            | Platform       | Notes                                                                |
|-------------------------------------------------------------------------------------------------------------------------------------|----------------|----------------------------------------------------------------------|
| [sra-dedupe-linux-amd64.deb](https://github.com/IEBH/sra-dedupe-ui/raw/master/dist/sra-dedupe-linux-amd64.deb)                      | Linux (Debian) | Suitable for installation on any Debian based OS - Ubuntu, Mint etc. |
| [sra-dedupe-linux-x86_64.rpm](https://github.com/IEBH/sra-dedupe-ui/raw/master/dist/sra-dedupe-linux-x86_64.rpm)                    | Linux (Redhat) | Suitable for installation on any Redhat based OS - Fedora, RHEL etc. |
| [sra-dedupe-linux.tar.bz2](https://github.com/IEBH/sra-dedupe-ui/raw/master/dist/sra-dedupe-linux.tar.bz2)                          | Linux          | Generic Tarball                                                      |
| sra-dedupe-mac | Mac            | Unfortunately I don't have access to a Mac to compile a version. If you would like to help please contact |
| [sra-dedupe-ui-0.0.0-x86_64.AppImage](https://github.com/IEBH/sra-dedupe-ui/raw/master/dist/sra-dedupe-ui-0.0.0-x86_64.AppImage)    | Linux          | AppImage installer - most platforms                                  |
| [sra-dedupe-win.exe](https://github.com/IEBH/sra-dedupe-ui/raw/master/dist/sra-dedupe-win.exe)                                      | Windows        | Generic stand alone executable (no install required)                 |
| [sra-dedupe-win-installer.exe](https://github.com/IEBH/sra-dedupe-ui/raw/master/dist/sra-dedupe-win-installer.exe)                  | Windows        | Installable version                                                  |



Development
===========

Compiling
---------
See the instructions for multi platform building at the at the [electron-builder project](https://github.com/electron-userland/electron-builder/wiki/Multi-Platform-Build#linux).

Prerequisite install (on a Ubuntu box):

1. Generic installs (on a Ubuntu box) - `sudo apt install alien dpkg-dev debhelper build-essential libopenjp2-tools snapcraft`
2. Wine - See https://wiki.winehq.org/Ubuntu
3. Use gulp to compile everything - `gulp compile` (or `gulp compile:win` etc.)



Debugging
---------
Use `gulp serve` to spin up a Electron shell or `gulp serve serve:debug` to enter debugging mode.


Analysis
--------

1. Install dependencies - `npm i -g webpack-cli webpack-bundle-analyzer`
2. Export profiling information - `webpack-cli --profile --json >stats.json`
3. View profiling display - `webpack-bundle-analyzer stats.json`
