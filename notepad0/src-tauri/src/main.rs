#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use clap::Parser;
use once_cell::sync::OnceCell;
use std::path::PathBuf;
use tauri::{CustomMenuItem, Menu, MenuItem, Submenu};
use tauri::Manager;

/***
 * @brief コマンドオプション
 */
#[derive(clap::Parser)]
#[clap(version, about, long_about = None)]
struct Cli {
    #[clap(help="[テキストファイル名]")]
    text_file: Option<PathBuf>,
}

static CLI_TEXT_PATH: OnceCell<PathBuf> = OnceCell::new();

/***
 * @brief ui
 */
#[tauri::command]
fn get_cli_text_path() -> PathBuf {
    let text_path = CLI_TEXT_PATH.get().unwrap();
    return text_path.to_path_buf();
}

#[tauri::command]
fn menu_file_exit(window: tauri::Window) {
    window.close().unwrap();
}

#[tauri::command]
fn menu_help_about(window: tauri::Window) {
    let parent_window = window.get_window("main").unwrap();
    tauri::async_runtime::spawn(async move {
        let crate_name = env!("CARGO_CRATE_NAME");
        let pkg_version = env!("CARGO_PKG_VERSION");
        tauri::api::dialog::message(Some(&parent_window), "バージョン情報", format!("{crate_name} {pkg_version}"));
    });
}

/***
 * @brief 主入口点
 */
fn main() -> anyhow::Result<()> {
    /***
     * コマンドオプションの解析
     */
    let cli:Cli = Cli::parse();
    let text_path:PathBuf = if let Some(x) = cli.text_file {
        x
    } else {
        PathBuf::from("")
    };
    CLI_TEXT_PATH.set(text_path.clone()).unwrap();
    /***
     * メニュー構築
     */
    let menu = Menu::new()
        .add_submenu(Submenu::new("ファイル", Menu::new()
            .add_item(CustomMenuItem::new("menu_file_new".to_string(), "新規"))
            .add_item(CustomMenuItem::new("menu_file_open".to_string(), "開く"))
            .add_item(CustomMenuItem::new("menu_file_save".to_string(), "上書き保存"))
            .add_item(CustomMenuItem::new("menu_file_save_as".to_string(), "名前を付けて保存"))
            .add_native_item(MenuItem::Separator)
            .add_item(CustomMenuItem::new("menu_file_exit".to_string(), "終了"))
        ))
        .add_submenu(Submenu::new("編集", Menu::new()
            .add_item(CustomMenuItem::new("menu_edit_cut".to_string(), "切り取り"))
            .add_item(CustomMenuItem::new("menu_edit_copy".to_string(), "コピー"))
            .add_item(CustomMenuItem::new("menu_edit_paste".to_string(), "貼り付け"))
            .add_item(CustomMenuItem::new("menu_edit_delete".to_string(), "削除"))
            .add_native_item(MenuItem::Separator)
            .add_item(CustomMenuItem::new("menu_edit_select_all".to_string(), "すべて選択"))
        ))
        .add_submenu(Submenu::new("ヘルプ", Menu::new()
            .add_item(CustomMenuItem::new("menu_help_about".to_string(), "バージョン情報"))
        ))
    ;
    /***
     * ウインドの構築
     */
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_cli_text_path,
            menu_file_exit,
            menu_help_about,
        ])
        .menu(menu)
        .on_menu_event(|event| {
            let app_handle = event.window().app_handle();
            app_handle.emit_all("back-to-front", event.menu_item_id().to_string()).unwrap();
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
    //
    Ok(())
}
