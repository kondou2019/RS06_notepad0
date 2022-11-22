import { appWindow } from '@tauri-apps/api/window';
import { exists } from '@tauri-apps/api/fs';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import { message } from '@tauri-apps/api/dialog';
import { open } from '@tauri-apps/api/dialog';
import { readText } from '@tauri-apps/api/clipboard';
import { readTextFile } from '@tauri-apps/api/fs';
import { save } from '@tauri-apps/api/dialog';
import { writeText} from '@tauri-apps/api/clipboard';
import { writeTextFile } from '@tauri-apps/api/fs';

let main_text_path:string = "";

/**
 * @brief ウィンドタイトルの設定
 * @param[in] filePath テキストファイル名
 */
async function setWindowTitle(filePath:string) {
    main_text_path = filePath;
    if (filePath == '') {
        filePath = '無題'
    }
    await appWindow.setTitle(filePath + ' - notepad0');
}

/**
 * @brief テキストファイルをtextareaに表示する
 * @param[in] filePath テキストファイル名
 */
async function openTextFile(filePath:string) {
    const b_exists: boolean = await exists(filePath).catch(() => false);
    if (b_exists == false) {
        await message('File not found\npath='+filePath, { title: 'notepad0', type: 'error' });
        return;
    }
    // ウィンドタイトルをクリア
    await setWindowTitle("");
    // テキストファイルを読む
    const contents:string = await readTextFile(filePath);
    // textareaに表示する
    const editTextarea = <HTMLTextAreaElement>document.querySelector("#edit-textarea");
    editTextarea.value = contents;
    // ウィンドタイトルを更新
    await setWindowTitle(filePath);
}

/*================*/
/* Windowイベント */
/*================*/
window.addEventListener("DOMContentLoaded", () => {
    invoke("get_cli_text_path").then((x: unknown) => {
        const text_path = <string>x;
        //
        if (text_path != "") {
            openTextFile(text_path);
        }
    });
    // rustからのイベント
    menuEvent();
});

/*==================*/
/* メニューイベント */
/*==================*/
async function menuEditCopy() {
    const editTextarea = <HTMLTextAreaElement>document.querySelector("#edit-textarea");
    const selectionStart:number = editTextarea.selectionStart;
    const selectionEnd:number = editTextarea.selectionEnd;
    if (selectionStart === selectionEnd) { // 選択されていない?
        return;
    }
    const text = editTextarea.value.substring(selectionStart,selectionEnd);
    await writeText(text);
}

async function menuEditCut() {
    const editTextarea = <HTMLTextAreaElement>document.querySelector("#edit-textarea");
    const selectionStart:number = editTextarea.selectionStart;
    const selectionEnd:number = editTextarea.selectionEnd;
    if (selectionStart === selectionEnd) { // 選択されていない?
        return;
    }
    const text = editTextarea.value.substring(selectionStart,selectionEnd);
    editTextarea.setRangeText("", selectionStart,selectionEnd);
    await writeText(text);
}

async function menuEditDelete() {
    const editTextarea = <HTMLTextAreaElement>document.querySelector("#edit-textarea");
    const selectionStart:number = editTextarea.selectionStart;
    const selectionEnd:number = editTextarea.selectionEnd;
    if (selectionStart === selectionEnd) { // 選択されていない?
        return;
    }
    editTextarea.setRangeText("", selectionStart,selectionEnd);
}

async function menuEditPaste() {
    const x:string | null = await readText();
    if (x === null) { // クリップボードにテキストが無い?
      return;
    }
    const clipboardText = <string>x;
    console.log(clipboardText);
    //
    const editTextarea = <HTMLTextAreaElement>document.querySelector("#edit-textarea");
    const selectionStart:number = editTextarea.selectionStart;
    const selectionEnd:number = editTextarea.selectionEnd;
    // テキストが選択状態の場合は選択されたテキストを置き換える。
    editTextarea.setRangeText(clipboardText, selectionStart,selectionEnd);
}

async function menuEditSelectAll() {
    const editTextarea = <HTMLTextAreaElement>document.querySelector("#edit-textarea");
    editTextarea.select();
}

async function menuFileNew() {
    const editTextarea = <HTMLTextAreaElement>document.querySelector("#edit-textarea");
    editTextarea.value = "";
    // ウィンドタイトルを更新
    await setWindowTitle("");
}

async function menuFileOpen() {
    const x:null | string | string[] = await open({
      filters: [{
        name: 'Text',
        extensions: ['txt', '*']
      }]
    });
    if (x === null) { // キャンセル?
      return;
    }
    const filePath = <string>x;
    //
    openTextFile(filePath);
}

async function menuFileSave() {
    if (main_text_path == "") {
        await menuFileSaveAs();
        return;
    }
    const editTextarea = <HTMLTextAreaElement>document.querySelector("#edit-textarea");
    writeTextFile(main_text_path, editTextarea.value);
}

async function menuFileSaveAs() {
    const x:string | null = await save({
      filters: [{
        name: 'Text',
        extensions: ['txt', '*']
      }]
    });
    if (x === null) { // キャンセル?
      return;
    }
    const filePath = <string>x;
    // ウィンドタイトルをクリア
    await setWindowTitle("");
    //
    const editTextarea = <HTMLTextAreaElement>document.querySelector("#edit-textarea");
    writeTextFile(filePath, editTextarea.value);
    // ウィンドタイトルを更新
    await setWindowTitle(filePath);
}

async function menuEvent() {
    await listen('back-to-front', event => {
        switch(event.payload) {
        case "menu_edit_copy":
            menuEditCopy();
            break;
        case "menu_edit_cut":
            menuEditCut();
            break;
        case "menu_edit_delete":
            menuEditDelete();
            break;
        case "menu_edit_paste":
            menuEditPaste();
            break;
        case "menu_edit_select_all":
            menuEditSelectAll();
            break;
        case "menu_file_new":
            menuFileNew();
            break;
        case "menu_file_open":
            menuFileOpen();
            break;
        case "menu_file_save":
            menuFileSave();
            break;
        case "menu_file_save_as":
            menuFileSaveAs();
            break;
        default: // rust側で処理
            invoke(<string>event.payload);
            break;
        }
    });
}
