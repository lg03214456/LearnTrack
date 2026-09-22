import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const WIDTH = 1280;
const HEIGHT = 720;
const BRAND = "#0F5B57";
const BRAND_DEEP = "#073F3C";
const BRAND_SOFT = "#E7F3F1";
const INK = "#10233B";
const MUTED = "#64748B";
const RULE = "#D8E1E7";
const PAPER = "#F7F9FA";
const WHITE = "#FFFFFF";
const AMBER = "#D97706";
const RED = "#DC2626";

const buildDir = path.dirname(fileURLToPath(import.meta.url));
const screensDir = path.join(buildDir, "screens");
const outputPath = path.join(path.dirname(buildDir), "補教紀錄-系統操作手冊.pptx");

const presentation = Presentation.create({ slideSize: { width: WIDTH, height: HEIGHT } });

function shape(slide, { left, top, width, height, fill = "none", line = "none", radius }) {
  return slide.shapes.add({
    geometry: radius ? "roundRect" : "rect",
    position: { left, top, width, height },
    fill,
    line: { style: "solid", fill: line, width: line === "none" ? 0 : 1 },
    ...(radius ? { borderRadius: radius } : {}),
  });
}

function text(slide, value, { left, top, width, height, size = 22, color = INK, bold = false, align = "left" }) {
  const box = slide.shapes.add({
    geometry: "textbox",
    position: { left, top, width, height },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  box.text = value;
  box.text.style = { fontSize: size, color, bold, alignment: align, fontFamily: "Arial" };
  return box;
}

function addHeader(slide, title, eyebrow, page) {
  text(slide, eyebrow, { left: 68, top: 40, width: 620, height: 25, size: 15, color: BRAND, bold: true });
  text(slide, title, { left: 68, top: 73, width: 1050, height: 54, size: 38, color: INK, bold: true });
  shape(slide, { left: 68, top: 139, width: 1144, height: 2, fill: RULE });
  text(slide, String(page).padStart(2, "0"), { left: 1160, top: 45, width: 52, height: 24, size: 16, color: MUTED, align: "right" });
}

function addFooter(slide) {
  text(slide, "補教紀錄 · Progress Hub", { left: 68, top: 678, width: 300, height: 18, size: 12, color: MUTED });
}

async function addScreenshot(slide, fileName, position) {
  const bytes = await fs.readFile(path.join(screensDir, fileName));
  slide.images.add({
    blob: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    contentType: "image/png",
    alt: `補教紀錄系統畫面：${fileName}`,
    fit: "contain",
    position,
    geometry: "roundRect",
    borderRadius: "rounded-xl",
  });
}

function addStep(slide, number, titleValue, detail, top, color = BRAND, left = 88, contentWidth = 430) {
  shape(slide, { left, top, width: 52, height: 52, fill: color, radius: "rounded-xl" });
  text(slide, String(number), { left, top: top + 10, width: 52, height: 28, size: 22, color: WHITE, bold: true, align: "center" });
  text(slide, titleValue, { left: left + 76, top: top - 1, width: contentWidth, height: 32, size: 24, color: INK, bold: true });
  text(slide, detail, { left: left + 76, top: top + 34, width: contentWidth, height: 48, size: 17, color: MUTED });
}

// 1. Cover
{
  const slide = presentation.slides.add();
  slide.background.fill = WHITE;
  shape(slide, { left: 0, top: 0, width: 455, height: HEIGHT, fill: BRAND_DEEP });
  shape(slide, { left: 455, top: 0, width: 12, height: HEIGHT, fill: "#2AA198" });
  text(slide, "補教紀錄", { left: 68, top: 76, width: 310, height: 48, size: 30, color: WHITE, bold: true });
  text(slide, "PROGRESS HUB", { left: 70, top: 128, width: 280, height: 22, size: 15, color: "#BCE4DF", bold: true });
  text(slide, "系統操作手冊", { left: 540, top: 205, width: 610, height: 84, size: 56, color: INK, bold: true });
  text(slide, "從期初設定、每日課堂到學生追蹤", { left: 544, top: 318, width: 590, height: 40, size: 25, color: BRAND });
  text(slide, "現行 Mock 測試版 · 2026", { left: 544, top: 530, width: 420, height: 28, size: 18, color: MUTED });
  text(slide, "適用：Owner／主任／老師", { left: 544, top: 570, width: 420, height: 28, size: 18, color: MUTED });
}

// 2. Concept
{
  const slide = presentation.slides.add(); slide.background.fill = WHITE;
  addHeader(slide, "先理解四個核心資料關係", "01 · 系統概念", 2);
  const items = [
    ["教材範本", "定義教材版本、單元與章節"],
    ["班級與排課", "決定教師、上課日期與成員"],
    ["學生修課", "每位學生獨立指定教材版本"],
    ["每日紀錄", "點名、進度、考卷、成績與評語"],
  ];
  items.forEach(([titleValue, detail], index) => {
    const left = 70 + index * 294;
    text(slide, `0${index + 1}`, { left, top: 192, width: 70, height: 30, size: 18, color: BRAND, bold: true });
    text(slide, titleValue, { left, top: 238, width: 245, height: 38, size: 27, color: INK, bold: true });
    text(slide, detail, { left, top: 291, width: 235, height: 72, size: 18, color: MUTED });
    if (index < 3) {
      shape(slide, { left: left + 250, top: 244, width: 24, height: 2, fill: "#8DB9B5" });
    }
  });
  shape(slide, { left: 70, top: 440, width: 1140, height: 122, fill: BRAND_SOFT, radius: "rounded-xl" });
  text(slide, "關鍵原則", { left: 102, top: 468, width: 160, height: 32, size: 24, color: BRAND_DEEP, bold: true });
  text(slide, "班級不綁死教材版本；同一班可容納不同年級，學生依自己的修課計畫記錄進度。", { left: 278, top: 465, width: 865, height: 56, size: 22, color: INK });
  addFooter(slide);
}

// 3. Roles
{
  const slide = presentation.slides.add(); slide.background.fill = PAPER;
  addHeader(slide, "角色決定可操作範圍，不只決定看見什麼", "02 · 身分與權限", 3);
  const roles = [
    ["Owner", "全機構設定、帳號與角色治理"],
    ["主任", "日常營運、班級與學生管理"],
    ["老師", "被指派班級、點名與學習紀錄"],
    ["學生／家長", "僅本人或已綁定孩子資料"],
  ];
  roles.forEach(([role, detail], index) => {
    const top = 186 + index * 104;
    text(slide, role, { left: 88, top, width: 210, height: 34, size: 26, color: index === 0 ? BRAND : INK, bold: true });
    text(slide, detail, { left: 320, top: top + 2, width: 730, height: 30, size: 19, color: MUTED });
    shape(slide, { left: 88, top: top + 53, width: 1060, height: 1, fill: RULE });
  });
  text(slide, "目前左側的 Mock 身分切換只供流程驗證，不是真實登入。", { left: 88, top: 620, width: 900, height: 30, size: 18, color: AMBER, bold: true });
  addFooter(slide);
}

// 4. Students
{
  const slide = presentation.slides.add(); slide.background.fill = WHITE;
  addHeader(slide, "學生名單是日常查詢的主入口", "03 · 學生名單", 4);
  await addScreenshot(slide, "students.png", { left: 70, top: 170, width: 790, height: 445 });
  text(slide, "主要操作", { left: 905, top: 178, width: 240, height: 34, size: 25, color: BRAND, bold: true });
  text(slide, "1  搜尋姓名或學號\n\n2  依班級、狀態即時篩選\n\n3  點學生進入個人頁\n\n4  管理資料與班級歸屬\n\n5  停課或離班以「封存」保留歷史", { left: 905, top: 232, width: 280, height: 300, size: 19, color: INK });
  addFooter(slide);
}

// 5. Student detail
{
  const slide = presentation.slides.add(); slide.background.fill = WHITE;
  addHeader(slide, "個人頁集中呈現每位學生的完整學習軌跡", "04 · 學生個人頁", 5);
  text(slide, "Menu Bar 四個維度", { left: 70, top: 176, width: 350, height: 35, size: 25, color: BRAND, bold: true });
  text(slide, "個人資料\n課堂紀錄\n考試紀錄\n修課進度", { left: 70, top: 232, width: 240, height: 185, size: 24, color: INK });
  text(slide, "切換頁籤會保留目前捲動位置；網址 tab 也會同步更新，方便重新整理或分享指定頁籤。", { left: 70, top: 458, width: 330, height: 110, size: 18, color: MUTED });
  await addScreenshot(slide, "student-detail.png", { left: 430, top: 170, width: 780, height: 448 });
  addFooter(slide);
}

// 6. Curriculum
{
  const slide = presentation.slides.add(); slide.background.fill = PAPER;
  addHeader(slide, "先用進度總覽找出需要關注的學生", "05 · 全體學生進度", 6);
  await addScreenshot(slide, "progress.png", { left: 70, top: 170, width: 780, height: 445 });
  text(slide, "操作方式", { left: 900, top: 178, width: 260, height: 34, size: 25, color: BRAND, bold: true });
  text(slide, "1  搜尋學生\n\n2  依班級或狀態篩選\n\n3  比較教材完成比例\n\n4  查看最近更新時間\n\n5  點入學生個人頁處理", { left: 900, top: 236, width: 285, height: 300, size: 20, color: INK });
  text(slide, "這一頁用於『找人』與判讀整體狀態；實際更新應在個人修課進度或今日課堂完成。", { left: 900, top: 548, width: 290, height: 82, size: 17, color: MUTED });
  addFooter(slide);
}

// 7. Individual progress operation
{
  const slide = presentation.slides.add(); slide.background.fill = WHITE;
  addHeader(slide, "個人修課進度依教材版本逐項更新", "06 · 個人進度操作", 7);
  await addScreenshot(slide, "student-plans.png", { left: 70, top: 170, width: 760, height: 445 });
  text(slide, "四種狀態", { left: 880, top: 178, width: 250, height: 34, size: 25, color: BRAND, bold: true });
  text(slide, "待進行　尚未開始\n\n進行中　目前正在學習\n\n已完成　納入教材完成率\n\n略過　保留項目但不要求完成", { left: 880, top: 232, width: 320, height: 220, size: 20, color: INK });
  shape(slide, { left: 880, top: 478, width: 300, height: 122, fill: BRAND_SOFT, radius: "rounded-xl" });
  text(slide, "操作原則", { left: 908, top: 500, width: 160, height: 30, size: 22, color: BRAND_DEEP, bold: true });
  text(slide, "更新單一項目後按「更新」；課堂中的頁數或學習位置改用選填備註記錄。", { left: 908, top: 540, width: 245, height: 52, size: 16, color: INK });
  addFooter(slide);
}

// 8. Curriculum
{
  const slide = presentation.slides.add(); slide.background.fill = PAPER;
  addHeader(slide, "教材範本只管理可重複使用的教學結構", "07 · 教材範本庫", 8);
  await addScreenshot(slide, "curriculum.png", { left: 70, top: 174, width: 760, height: 430 });
  text(slide, "建立順序", { left: 880, top: 182, width: 240, height: 32, size: 25, color: BRAND, bold: true });
  text(slide, "範本名稱\n→ 年級／科目／版本\n→ 單元（大標題）\n→ 章節（單元內內容）\n→ 發布版本", { left: 880, top: 238, width: 290, height: 240, size: 22, color: INK });
  text(slide, "講義與考卷分開建立；額外考卷可在課堂紀錄中臨時新增，不必污染教材完成率。", { left: 880, top: 510, width: 300, height: 105, size: 17, color: MUTED });
  addFooter(slide);
}

// 9. Classes
{
  const slide = presentation.slides.add(); slide.background.fill = WHITE;
  addHeader(slide, "班級頁負責成員、教師與固定排課", "08 · 課程班級", 9);
  await addScreenshot(slide, "classes.png", { left: 70, top: 170, width: 780, height: 445 });
  text(slide, "班級可以做什麼？", { left: 900, top: 178, width: 285, height: 34, size: 25, color: BRAND, bold: true });
  text(slide, "• 新增／編輯班級\n\n• 指派教師與負責導師\n\n• 設定每週多個上課時段\n\n• 加入或移出學生\n\n• 查看篩選後學生名單\n\n• 封存已停開班級", { left: 900, top: 236, width: 290, height: 340, size: 19, color: INK });
  addFooter(slide);
}

// 10. Daily class
{
  const slide = presentation.slides.add(); slide.background.fill = WHITE;
  addHeader(slide, "一堂課內完成點名與個別進度登錄", "09 · 今日課堂", 10);
  await addScreenshot(slide, "class-daily.png", { left: 70, top: 170, width: 770, height: 445 });
  text(slide, "建議操作順序", { left: 890, top: 178, width: 270, height: 34, size: 25, color: BRAND, bold: true });
  addStep(slide, 1, "確認日期與學生", "依排課及有效 Enrollment 產生名單", 238, BRAND, 890, 235);
  addStep(slide, 2, "調整出席狀態", "出席、遲到、請假或缺席", 354, BRAND, 890, 235);
  addStep(slide, 3, "填寫個別進度", "選學生教材項目、狀態與選填備註", 470, BRAND, 890, 235);
  text(slide, "最後按「統一更新」一次送出整堂課狀態。", { left: 890, top: 600, width: 300, height: 42, size: 18, color: BRAND_DEEP, bold: true });
  addFooter(slide);
}

// 11. Attendance
{
  const slide = presentation.slides.add(); slide.background.fill = PAPER;
  addHeader(slide, "出缺席頁適合快速處理跨班級點名", "10 · 出缺席", 11);
  await addScreenshot(slide, "attendance.png", { left: 70, top: 170, width: 780, height: 445 });
  text(slide, "操作重點", { left: 900, top: 178, width: 260, height: 34, size: 25, color: BRAND, bold: true });
  text(slide, "選擇日期與班級\n\n預設全體出席\n\n只修改例外學生\n\n確認統計數字\n\n完成後進入今日課堂補進度", { left: 900, top: 240, width: 280, height: 300, size: 21, color: INK });
  addFooter(slide);
}

// 12. Accounts
{
  const slide = presentation.slides.add(); slide.background.fill = WHITE;
  addHeader(slide, "帳號與角色權限屬於低頻管理工作", "11 · 系統治理", 12);
  await addScreenshot(slide, "accounts.png", { left: 70, top: 170, width: 760, height: 430 });
  text(slide, "Owner／主任", { left: 880, top: 182, width: 250, height: 34, size: 25, color: BRAND, bold: true });
  text(slide, "• 建立與停用帳號\n\n• 指派角色\n\n• 檢查功能權限\n\n• 保護最後一位 Owner\n\n• 依組織與班級限制資料範圍", { left: 880, top: 242, width: 300, height: 290, size: 20, color: INK });
  text(slide, "正式版仍需 Supabase Auth + RLS，不能只靠畫面隱藏按鈕。", { left: 880, top: 555, width: 310, height: 70, size: 17, color: RED, bold: true });
  addFooter(slide);
}

// 13. Routine
{
  const slide = presentation.slides.add(); slide.background.fill = WHITE;
  addHeader(slide, "日常操作以『今天要完成什麼』為順序", "12 · 建議工作流程", 13);
  addStep(slide, 1, "進入課程班級", "選擇今天上課的班級與日期", 182);
  addStep(slide, 2, "完成點名", "預設出席，只修改遲到、請假與缺席", 286);
  addStep(slide, 3, "登錄課堂進度", "每位學生依自己的教材版本更新", 390);
  addStep(slide, 4, "補登考卷與評語", "額外考卷獨立記錄，不影響教材完成率", 494);
  shape(slide, { left: 720, top: 194, width: 430, height: 350, fill: BRAND_DEEP, radius: "rounded-xl" });
  text(slide, "完成後可追蹤", { left: 766, top: 240, width: 320, height: 40, size: 27, color: WHITE, bold: true });
  text(slide, "學生個人課堂紀錄\n\n考試成績與修課進度\n\n班級與全校學習指標\n\n家長端可讀取的歷史資料", { left: 766, top: 318, width: 330, height: 210, size: 21, color: "#E4F3F1" });
  addFooter(slide);
}

// 14. Limits
{
  const slide = presentation.slides.add(); slide.background.fill = PAPER;
  addHeader(slide, "公開測試前，先清楚區分 Mock 與正式能力", "13 · 現況與下一步", 14);
  text(slide, "目前可以測試", { left: 80, top: 186, width: 380, height: 40, size: 28, color: BRAND, bold: true });
  text(slide, "介面操作流程\n角色切換與功能可見性\n學生、班級、教材與課堂流程\n假資料下的欄位與互動體驗", { left: 80, top: 252, width: 450, height: 230, size: 21, color: INK });
  shape(slide, { left: 630, top: 178, width: 2, height: 390, fill: RULE });
  text(slide, "尚未適合正式營運", { left: 700, top: 186, width: 420, height: 40, size: 28, color: RED, bold: true });
  text(slide, "真實帳號與登入安全\n真實學生個資\n多人同時修改與永久保存\n資料庫備份、稽核與 RLS", { left: 700, top: 252, width: 430, height: 230, size: 21, color: INK });
  shape(slide, { left: 80, top: 585, width: 1070, height: 64, fill: BRAND_SOFT, radius: "rounded-xl" });
  text(slide, "下一步：確認操作流程 → 串接 Supabase Auth／PostgreSQL／RLS → 再部署公開測試。", { left: 112, top: 603, width: 1010, height: 30, size: 21, color: BRAND_DEEP, bold: true });
  addFooter(slide);
}

await fs.mkdir(path.dirname(outputPath), { recursive: true });
const pptx = await PresentationFile.exportPptx(presentation);
await pptx.save(outputPath);
console.log(outputPath);
