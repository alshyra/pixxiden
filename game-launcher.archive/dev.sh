#!/bin/bash
# Simple launcher script
source ~/.nvm/nvm.sh
export GDK_BACKEND=x11
export WEBKIT_DISABLE_DMABUF_RENDERER=1
cd "$(dirname "$0")"
npm run dev
