use tauri::menu::{MenuBuilder, SubmenuBuilder};
use tauri::Emitter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let file_menu = SubmenuBuilder::new(app, "File")
                .text("save", "Save")
                .text("open", "Open")
                .separator()
                .quit()
                .build()?;

            let menu = MenuBuilder::new(app)
                .item(&file_menu)
                .build()?;

            app.set_menu(menu)?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            match event.id().as_ref() {
                "save" => { app.emit("menu-save", ()).ok(); }
                "open" => { app.emit("menu-open", ()).ok(); }
                _ => {}
            }
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
