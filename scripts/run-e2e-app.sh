#!/bin/bash
# Wrapper script to launch Pixxiden with proper environment for E2E testing
# This fixes the black screen issue on Wayland/CachyOS

# Keep native Wayland but disable hardware acceleration for WebKit
# This is needed because tauri-driver/WebDriver has issues with GPU rendering

# Disable DMA-BUF renderer (causes black screen on Wayland)
export WEBKIT_DISABLE_DMABUF_RENDERER=1

# Disable compositing mode
export WEBKIT_DISABLE_COMPOSITING_MODE=1

# Force software rendering for Mesa/OpenGL
export LIBGL_ALWAYS_SOFTWARE=1

# Disable GPU compositing in WebKit
export WEBKIT_FORCE_SANDBOX=0

# Run the application
exec "$(dirname "$0")/../src-tauri/target/release/Pixxiden" "$@"
