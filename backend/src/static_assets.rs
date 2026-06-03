use axum::{
    body::Body,
    http::{header, Response, StatusCode, Uri},
    response::IntoResponse,
};
use rust_embed::RustEmbed;

#[derive(RustEmbed)]
#[folder = "../frontend/dist/"]
struct Assets;

pub async fn handler(uri: Uri) -> impl IntoResponse {
    let path = uri.path().trim_start_matches('/');
    if let Some(resp) = serve(path) {
        return resp;
    }
    // SPA fallback
    if let Some(resp) = serve("index.html") {
        return resp;
    }
    Response::builder()
        .status(StatusCode::NOT_FOUND)
        .body(Body::from("frontend not bundled — run `npm run build` first"))
        .unwrap()
}

fn serve(path: &str) -> Option<Response<Body>> {
    let asset = Assets::get(path)?;
    let mime = mime_guess::from_path(path).first_or_octet_stream();
    let resp = Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, mime.as_ref())
        .body(Body::from(asset.data.into_owned()))
        .ok()?;
    Some(resp)
}
