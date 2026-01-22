fn main() {
    // Tauri build
    tauri_build::build();
    
    // Verify that the binaries sidecars exist with the correct suffix
    verify_sidecars();
}

fn verify_sidecars() {
    let target_triple = std::env::var("TARGET").unwrap_or_default();
    let binaries = ["legendary", "nile", "gogdl"];
    
    let mut missing_count = 0;
    
    for binary in binaries {
        let binary_path = format!("binaries/{}-{}", binary, target_triple);
        
        if !std::path::Path::new(&binary_path).exists() {
            eprintln!("WARNING: Sidecar binary not found: {}", binary_path);
            eprintln!("         Expected suffix: {}", target_triple);
            eprintln!("         Example: legendary-x86_64-unknown-linux-gnu");
            eprintln!("         Run: npm run setup:sidecars");
            missing_count += 1;
        } else {
            println!("cargo:rerun-if-changed={}", binary_path);
        }
    }
    
    if missing_count > 0 {
        eprintln!("");
        eprintln!("WARNING: {} sidecar binaries are missing!", missing_count);
        eprintln!("         Build will continue, but the app may not work correctly.");
        eprintln!("         Run 'npm run setup:sidecars' to download binaries.");
        eprintln!("");
        // Don't fail the build - let it continue with warnings
        // This allows development without all binaries present
    }
}
