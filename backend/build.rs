// Tells cargo to rebuild when migrations or the bundled SPA change.
fn main() {
    println!("cargo:rerun-if-changed=migrations");
    println!("cargo:rerun-if-changed=../frontend/dist");
}
