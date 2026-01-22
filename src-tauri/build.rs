fn main() {
    // Tauri build
    tauri_build::build();
    
    // Verify that the binaries sidecars exist with the correct suffix
    verify_sidecars();
}

fn verify_sidecars() {
    let target_triple = std::env::var("TARGET").unwrap_or_default();
    let binaries = ["legendary", "nile", "gogdl"];
    
    for binary in binaries {
        let binary_path = format!("binaries/{}-{}", binary, target_triple);
        
        if !std::path::Path::new(&binary_path).exists() {
            eprintln!("ERROR: Sidecar binary not found: {}", binary_path);
            eprintln!("Expected suffix: {}", target_triple);
            eprintln!("Example: legendary-x86_64-unknown-linux-gnu");
            std::process::exit(1);
        }
        
        println!("cargo:rerun-if-changed={}", binary_path);
    }
}
