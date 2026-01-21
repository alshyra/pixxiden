use gilrs::{Button, Event, EventType, Gilrs};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{Emitter, Window};

/// Gamepad monitor that listens for Guide/PS button presses
/// and emits events to toggle the overlay
pub struct GamepadMonitor {
    running: Arc<AtomicBool>,
}

impl GamepadMonitor {
    pub fn new() -> Self {
        Self {
            running: Arc::new(AtomicBool::new(false)),
        }
    }

    /// Start monitoring gamepad input in a background task
    pub fn start(&self, window: Window) {
        if self.running.load(Ordering::Relaxed) {
            log::warn!("Gamepad monitor already running");
            return;
        }

        self.running.store(true, Ordering::Relaxed);
        let running = self.running.clone();

        std::thread::spawn(move || {
            log::info!("Starting gamepad monitor...");

            // Initialize gilrs
            let mut gilrs = match Gilrs::new() {
                Ok(g) => {
                    log::info!("Gamepad library initialized");
                    g
                }
                Err(e) => {
                    log::error!("Failed to initialize gamepad library: {}", e);
                    return;
                }
            };

            // Log connected gamepads
            for (id, gamepad) in gilrs.gamepads() {
                log::info!(
                    "Gamepad found: {} (id: {:?}, power: {:?})",
                    gamepad.name(),
                    id,
                    gamepad.power_info()
                );
            }

            // Main polling loop
            while running.load(Ordering::Relaxed) {
                // Process all pending events
                while let Some(Event { id, event, .. }) = gilrs.next_event() {
                    match event {
                        EventType::ButtonPressed(button, _) => {
                            log::debug!("Button pressed: {:?} on gamepad {:?}", button, id);

                            // Guide/Mode button = PS button on PlayStation / Xbox button
                            if button == Button::Mode {
                                log::info!("🎮 Guide/PS button pressed! Toggling overlay...");
                                if let Err(e) = window.emit("gamepad-overlay-toggle", ()) {
                                    log::error!("Failed to emit overlay toggle event: {}", e);
                                }
                            }
                        }
                        EventType::Connected => {
                            if let Some(gamepad) = gilrs.connected_gamepad(id) {
                                log::info!("🎮 Gamepad connected: {}", gamepad.name());
                            }
                        }
                        EventType::Disconnected => {
                            log::info!("🎮 Gamepad disconnected: {:?}", id);
                        }
                        _ => {}
                    }
                }

                // Small sleep to avoid busy-waiting
                std::thread::sleep(Duration::from_millis(16)); // ~60fps polling
            }

            log::info!("Gamepad monitor stopped");
        });
    }

    /// Stop the gamepad monitor
    pub fn stop(&self) {
        log::info!("Stopping gamepad monitor...");
        self.running.store(false, Ordering::Relaxed);
    }

    /// Check if the monitor is running
    pub fn is_running(&self) -> bool {
        self.running.load(Ordering::Relaxed)
    }
}

impl Default for GamepadMonitor {
    fn default() -> Self {
        Self::new()
    }
}

impl Drop for GamepadMonitor {
    fn drop(&mut self) {
        self.stop();
    }
}
