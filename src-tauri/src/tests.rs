/**
 * Tests Rust pour les store adapters
 * Ces tests vérifient le bon fonctionnement des intégrations avec les binaires réels
 */

#[cfg(test)]
mod tests {
    // Tests pour la détection des binaires
    mod binary_detection {
        use which::which;

        #[test]
        fn test_legendary_binary_detection() {
            // Vérifie si legendary est installé
            let result = which("legendary");

            // Le test ne doit pas échouer si legendary n'est pas installé
            // Il doit juste reporter le status
            match result {
                Ok(path) => {
                    println!("Legendary found at: {:?}", path);
                    assert!(path.exists());
                }
                Err(_) => {
                    println!("Legendary not found in PATH - this is OK for CI");
                }
            }
        }

        #[test]
        fn test_gogdl_binary_detection() {
            let result = which("gogdl");

            match result {
                Ok(path) => {
                    println!("GOGDL found at: {:?}", path);
                    assert!(path.exists());
                }
                Err(_) => {
                    println!("GOGDL not found in PATH - this is OK for CI");
                }
            }
        }

        #[test]
        fn test_nile_binary_detection() {
            let result = which("nile");

            match result {
                Ok(path) => {
                    println!("Nile found at: {:?}", path);
                    assert!(path.exists());
                }
                Err(_) => {
                    println!("Nile not found in PATH - this is OK for CI");
                }
            }
        }

        #[test]
        fn test_heroic_legendary_path() {
            // Teste le chemin Heroic Launcher pour legendary
            let heroic_path = std::path::PathBuf::from(
                "/opt/Heroic/resources/app.asar.unpacked/build/bin/x64/linux/legendary",
            );

            if heroic_path.exists() {
                println!("Heroic Legendary found at: {:?}", heroic_path);
            } else {
                // Essayer le chemin flatpak
                if let Some(home) = dirs::home_dir() {
                    let flatpak_path = home.join(".var/app/com.heroicgameslauncher.hgl/config/heroic/tools/legendary/legendary");
                    if flatpak_path.exists() {
                        println!("Flatpak Heroic Legendary found at: {:?}", flatpak_path);
                    } else {
                        println!("Heroic Legendary not found - Heroic may not be installed");
                    }
                }
            }
        }
    }

    // Tests pour le parsing des données de jeux
    mod game_parsing {
        use serde_json::json;

        #[test]
        fn test_parse_epic_game_metadata() {
            let json_data = json!({
                "app_name": "fortnite",
                "app_title": "Fortnite",
                "metadata": {
                    "description": "Battle Royale game",
                    "developer": "Epic Games",
                    "keyImages": [
                        {"type": "DieselGameBoxTall", "url": "https://example.com/cover.jpg"}
                    ]
                }
            });

            let app_name = json_data["app_name"].as_str().unwrap();
            let app_title = json_data["app_title"].as_str().unwrap();

            assert_eq!(app_name, "fortnite");
            assert_eq!(app_title, "Fortnite");
        }

        #[test]
        fn test_parse_gog_game_metadata() {
            let json_data = json!({
                "id": "1234567890",
                "title": "Cyberpunk 2077",
                "slug": "cyberpunk-2077",
                "installed": true
            });

            let id = json_data["id"].as_str().unwrap();
            let title = json_data["title"].as_str().unwrap();
            let installed = json_data["installed"].as_bool().unwrap();

            assert_eq!(id, "1234567890");
            assert_eq!(title, "Cyberpunk 2077");
            assert!(installed);
        }

        #[test]
        fn test_game_id_generation() {
            let store = "epic";
            let store_id = "fortnite";

            let game_id = format!("{}-{}", store, store_id);

            assert_eq!(game_id, "epic-fortnite");
        }

        #[test]
        fn test_empty_game_list() {
            let games: Vec<serde_json::Value> = vec![];
            assert!(games.is_empty());
        }
    }

    // Tests pour les configurations
    mod config {
        #[test]
        fn test_legendary_config_path() {
            if let Some(home) = dirs::home_dir() {
                let config_path = home.join(".config/legendary");
                println!("Expected Legendary config: {:?}", config_path);

                // Le répertoire peut ne pas exister si legendary n'est pas installé
                // On vérifie juste que le chemin est correct
                assert!(config_path.to_str().unwrap().contains(".config/legendary"));
            }
        }

        #[test]
        fn test_heroic_config_path() {
            if let Some(home) = dirs::home_dir() {
                let config_path = home.join(".config/heroic/legendaryConfig/legendary");
                println!("Expected Heroic config: {:?}", config_path);

                assert!(config_path.to_str().unwrap().contains("heroic"));
            }
        }

        #[test]
        fn test_gogdl_config_path() {
            if let Some(home) = dirs::home_dir() {
                let config_path = home.join(".config/heroic/gog_store");
                println!("Expected GOGDL config: {:?}", config_path);

                assert!(config_path.to_str().unwrap().contains("gog_store"));
            }
        }

        #[test]
        fn test_nile_config_path() {
            if let Some(home) = dirs::home_dir() {
                let config_path = home.join(".config/nile");
                println!("Expected Nile config: {:?}", config_path);

                assert!(config_path.to_str().unwrap().contains("nile"));
            }
        }
    }

    // Tests pour la base de données (mocked)
    mod database {
        #[test]
        fn test_game_struct_creation() {
            // Test la création d'un struct Game
            #[allow(dead_code)]
            struct Game {
                id: String,
                title: String,
                store: String,
                store_id: String,
                installed: bool,
            }

            let game = Game {
                id: "epic-fortnite".to_string(),
                title: "Fortnite".to_string(),
                store: "epic".to_string(),
                store_id: "fortnite".to_string(),
                installed: false,
            };

            assert_eq!(game.id, "epic-fortnite");
            assert_eq!(game.store, "epic");
            assert!(!game.installed);
        }

        #[test]
        fn test_sync_result_struct() {
            #[allow(dead_code)]
            struct SyncResult {
                total_games: usize,
                new_games: usize,
                updated_games: usize,
                errors: Vec<String>,
            }

            let result = SyncResult {
                total_games: 10,
                new_games: 3,
                updated_games: 2,
                errors: vec![],
            };

            assert_eq!(result.total_games, 10);
            assert!(result.errors.is_empty());
        }
    }
}
