// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Commande pour cacher la fenêtre (jeu lancé)
#[tauri::command]
fn hide_window(window: tauri::Window) {
    println!("🙈 Masquage de la fenêtre du launcher");
    window.hide().unwrap_or_else(|e| {
        eprintln!("❌ Erreur lors du masquage: {}", e);
    });
}

// Commande pour afficher la fenêtre (retour au launcher)
#[tauri::command]
fn show_window(window: tauri::Window) {
    println!("👁️  Affichage de la fenêtre du launcher");
    
    // Unminimize d'abord si la fenêtre est minimisée
    window.unminimize().unwrap_or_else(|e| {
        eprintln!("⚠️  Erreur lors du unminimize: {}", e);
    });
    
    // Afficher la fenêtre
    window.show().unwrap_or_else(|e| {
        eprintln!("❌ Erreur lors de l'affichage: {}", e);
    });
    
    // Mettre au premier plan et focus
    window.set_focus().unwrap_or_else(|e| {
        eprintln!("❌ Erreur lors de la mise au focus: {}", e);
    });
    
    // Sur Linux, utiliser xdotool pour forcer le focus (plus fiable)
    #[cfg(target_os = "linux")]
    {
        if let Ok(title) = window.title() {
            println!("🔍 Focus via xdotool pour: {}", title);
            // Utiliser xdotool pour activer la fenêtre par nom
            let _ = std::process::Command::new("xdotool")
                .args(["search", "--name", &title, "windowactivate"])
                .spawn();
        }
    }
}

// Commande pour minimiser la fenêtre
#[tauri::command]
fn minimize_window(window: tauri::Window) {
    println!("⬇️  Minimisation de la fenêtre");
    window.minimize().unwrap_or_else(|e| {
        eprintln!("❌ Erreur lors de la minimisation: {}", e);
    });
}

// Commande pour les actions système (poweroff, reboot, logout)
#[tauri::command]
fn system_action(action: String) -> Result<String, String> {
    println!("🔌 Action système: {}", action);
    
    let command = match action.as_str() {
        "poweroff" => "systemctl poweroff",
        "reboot" => "systemctl reboot",
        "logout" => "loginctl terminate-session self",
        _ => return Err(format!("Action inconnue: {}", action)),
    };
    
    // Exécuter la commande système
    std::process::Command::new("sh")
        .arg("-c")
        .arg(command)
        .spawn()
        .map_err(|e| format!("Erreur d'exécution: {}", e))?;
    
    Ok(format!("Action {} lancée", action))
}

fn main() {
    // Démarrer le backend Go en tant que processus séparé (pas sidecar)
    let backend_path = std::env::current_dir()
        .unwrap()
        .parent()
        .unwrap()
        .join("src-tauri/binaries/game-launcher-backend-x86_64-unknown-linux-gnu");
    
    // Vérifier aussi dans le répertoire courant (pour le dev)
    let backend_path = if backend_path.exists() {
        backend_path
    } else {
        std::path::PathBuf::from("./binaries/game-launcher-backend-x86_64-unknown-linux-gnu")
    };
    
    if backend_path.exists() {
        match std::process::Command::new(&backend_path)
            .spawn() {
            Ok(child) => println!("✅ Backend Go lancé (PID: {})", child.id()),
            Err(e) => eprintln!("❌ Erreur lancement backend: {}", e),
        }
    } else {
        eprintln!("⚠️  Backend non trouvé: {:?}", backend_path);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            hide_window,
            show_window,
            minimize_window,
            system_action
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
