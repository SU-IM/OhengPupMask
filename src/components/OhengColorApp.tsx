"use client"
import MaskSilhouette from "./MaskSilhouette";
import React, { useMemo, useState, useEffect } from "react";

// =====================================================
// 오행 기반 퍼스널 마스크 색 추천 (최종 확장판)
// =====================================================

// ---------------------------
// 오행 메타데이터 (팔레트 다양화)
// ---------------------------
export const ELEMENT_META = {
    wood: {
        key: "wood", nameKo: "목", nameEn: "Wood",
        palette: ["#1B5E20", "#2E7D32", "#4CAF50", "#81C784", "#A5D6A7", "#00BFA5", "#26A69A"],
        obang: "#1E3A8A"
    },
    fire: {
        key: "fire", nameKo: "화", nameEn: "Fire",
        palette: ["#B71C1C", "#C62828", "#E53935", "#F4511E", "#FF7043", "#FF8A65", "#FFAB91"],
        obang: "#B91C1C"
    },
    earth: {
        key: "earth", nameKo: "토", nameEn: "Earth",
        palette: ["#3E2723", "#5D4037", "#795548", "#8D6E63", "#A1887F", "#D7CCC8", "#FFF9C4"],
        obang: "#CA8A04"
    },
    metal: {
        key: "metal", nameKo: "금", nameEn: "Metal",
        palette: ["#FAFAFA", "#E0E0E0", "#BDBDBD", "#9E9E9E", "#757575", "#D4AF37", "#C0C0C0"],
        obang: "#E5E7EB"
    },
    water: {
        key: "water", nameKo: "수", nameEn: "Water",
        palette: ["#0D47A1", "#1565C0", "#1976D2", "#1E88E5", "#42A5F5", "#90CAF9", "#111827"],
        obang: "#111827"
    },
};

// ---------------------------
// 천간·지지·지장간 → 오행 매핑
// ---------------------------
const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const STEM_TO_ELEMENT: Record<string, string> = {
    "갑": "wood", "을": "wood", "병": "fire", "정": "fire", "무": "earth", "기": "earth",
    "경": "metal", "신": "metal", "임": "water", "계": "water"
};

const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const BRANCH_TO_ELEMENTS: Record<string, { el: string, w: number }[]> = {
    자: [{ el: "water", w: 1 }],
    축: [{ el: "earth", w: 0.5 }, { el: "water", w: 0.3 }, { el: "metal", w: 0.2 }],
    인: [{ el: "wood", w: 0.5 }, { el: "fire", w: 0.3 }, { el: "earth", w: 0.2 }],
    묘: [{ el: "wood", w: 1 }],
    진: [{ el: "earth", w: 0.6 }, { el: "wood", w: 0.2 }, { el: "water", w: 0.2 }],
    사: [{ el: "fire", w: 0.6 }, { el: "metal", w: 0.2 }, { el: "earth", w: 0.2 }],
    오: [{ el: "fire", w: 0.7 }, { el: "earth", w: 0.3 }],
    미: [{ el: "earth", w: 0.6 }, { el: "wood", w: 0.2 }, { el: "fire", w: 0.2 }],
    신: [{ el: "metal", w: 0.7 }, { el: "water", w: 0.3 }],
    유: [{ el: "metal", w: 1 }],
    술: [{ el: "earth", w: 0.6 }, { el: "fire", w: 0.2 }, { el: "metal", w: 0.2 }],
    해: [{ el: "water", w: 0.7 }, { el: "wood", w: 0.3 }]
};

// ---------------------------
// 절기 데이터 (간이 버전)
// ---------------------------
const SOLAR_TERMS = [
    { name: "입춘", month: 2, day: 4, branch: "인" },
    { name: "경칩", month: 3, day: 6, branch: "묘" },
    { name: "청명", month: 4, day: 5, branch: "진" },
    { name: "입하", month: 5, day: 6, branch: "사" },
    { name: "망종", month: 6, day: 6, branch: "오" },
    { name: "소서", month: 7, day: 7, branch: "미" },
    { name: "입추", month: 8, day: 8, branch: "신" },
    { name: "백로", month: 9, day: 8, branch: "유" },
    { name: "한로", month: 10, day: 8, branch: "술" },
    { name: "입동", month: 11, day: 7, branch: "해" },
    { name: "대설", month: 12, day: 7, branch: "자" },
    { name: "소한", month: 1, day: 6, branch: "축" },
];

// ---------------------------
// 보조 유틸
// ---------------------------
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function normalizeHour(h12: string, ampm: string) {
    let h = parseInt(h12, 10);
    if (Number.isNaN(h) || h < 1 || h > 12) h = 12;
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return h;
}

function stringToSeed(str: string) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    }
    return Math.abs(h);
}
function seededRandom(seed: number) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

// ---------------------------
// Date → 간지 변환
// ---------------------------
function getYearStemBranch(year: number) {
    const stemIdx = (year - 4) % 10;
    const branchIdx = (year - 4) % 12;
    return { stem: STEMS[(stemIdx + 10) % 10], branch: BRANCHES[(branchIdx + 12) % 12] };
}

function getMonthBranch(date: Date) {
    let branch = "축"; // 기본값
    for (const term of SOLAR_TERMS) {
        const termDate = new Date(date.getFullYear(), term.month - 1, term.day);
        if (date >= termDate) branch = term.branch;
    }
    return branch;
}

function getDayStemBranch(date: Date) {
    const base = new Date(1984, 1, 2); // 갑자일 기준
    const days = Math.floor((date.getTime() - base.getTime()) / 86400000);
    const stem = STEMS[(days % 10 + 10) % 10];
    const branch = BRANCHES[(days % 12 + 12) % 12];
    return { stem, branch };
}

function getHourBranch(hour: number) {
    return BRANCHES[Math.floor(hour / 2) % 12];
}

// ---------------------------
// 오행 분포 계산
// ---------------------------
export function computeOheng(date: Date) {
    const y = getYearStemBranch(date.getFullYear());
    const m = { stem: "?", branch: getMonthBranch(date) };
    const d = getDayStemBranch(date);
    const h = { stem: "?", branch: getHourBranch(date.getHours()) };

    const counts = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };

    const apply = (stem: string, branch: string, weight: number) => {
        if (stem && STEM_TO_ELEMENT[stem]) counts[STEM_TO_ELEMENT[stem]] += weight;
        if (branch && BRANCH_TO_ELEMENTS[branch]) {
            for (const { el, w } of BRANCH_TO_ELEMENTS[branch]) {
                counts[el] += weight * w;
            }
        }
    };

    apply(y.stem, y.branch, 1);
    apply(m.stem, m.branch, 4);
    apply(d.stem, d.branch, 3);
    apply(h.stem, h.branch, 2);

    Object.keys(counts).forEach(k => counts[k] = clamp(counts[k], 0, 10));
    return counts;
}

// ---------------------------
// 팔레트 기반 색상 추천
// ---------------------------
function pickPaletteColor(el: string, score: number, seedStr: string, mode = "modern") {
    if (mode === "obang") return ELEMENT_META[el].obang;
    const palette = ELEMENT_META[el].palette;
    const seed = stringToSeed(seedStr + el);
    const baseIdx = Math.min(palette.length - 1, Math.floor((score / 10) * palette.length));
    const offset = Math.round((seededRandom(seed) - 0.5) * 2); // -1,0,1
    const finalIdx = Math.max(0, Math.min(palette.length - 1, baseIdx + offset));
    return palette[finalIdx];
}

export function recommendMaskColors(values: any, mode = "modern", seedStr = "") {
    const entries = Object.entries(values);
    const sortedAsc = [...entries].sort((a, b) => a[1] - b[1]);
    const sortedDesc = [...entries].sort((a, b) => b[1] - a[1]);
    let pointEl = sortedAsc[0][0];
    let mainEl = sortedDesc[0][0];
    if (mainEl === pointEl) pointEl = sortedAsc[1] ? sortedAsc[1][0] : pointEl;

    const mainColor = pickPaletteColor(mainEl, values[mainEl], seedStr, mode);
    const pointColor = pickPaletteColor(pointEl, values[pointEl], seedStr, mode);

    const neutrals = ["#000000", "#111827", "#374151", "#6B7280", "#9CA3AF", "#E5E7EB", "#FFFFFF"];
    const seed = stringToSeed(seedStr + "neutral");
    const support = neutrals[Math.floor(seededRandom(seed) * neutrals.length)];

    return { main: mainColor, point: pointColor, support, mainEl, pointEl, supportEl: "neutral" };
}

// ---------------------------
// 메인 컴포넌트
// ---------------------------
export default function OhengColorApp() {
    const [values, setValues] = useState({ wood: 2, fire: 2, earth: 2, metal: 2, water: 2 });
    const [mode, setMode] = useState("modern");
    const [birthDate, setBirthDate] = useState("");
    const [birthHour, setBirthHour] = useState("12");
    const [birthMinute, setBirthMinute] = useState("0");
    const [birthAmPm, setBirthAmPm] = useState("AM");

    const reset = () => {
        setValues({ wood: 2, fire: 2, earth: 2, metal: 2, water: 2 });
        setBirthDate(""); setBirthHour("12"); setBirthMinute("0"); setBirthAmPm("AM");
    };

    useEffect(() => {
        if (!birthDate) return;
        try {
            const parts = birthDate.split("-");
            if (parts.length !== 3) return;
            const yy = parseInt(parts[0], 10), mm = parseInt(parts[1], 10), dd = parseInt(parts[2], 10);
            if (!yy || !mm || !dd) return;
            const hourNum = normalizeHour(birthHour, birthAmPm);
            const minuteNum = parseInt(birthMinute, 10);
            const d = new Date(yy, mm - 1, dd, hourNum, Number.isNaN(minuteNum) ? 0 : minuteNum);
            if (Number.isNaN(d.getTime())) return;
            setValues(computeOheng(d));
        } catch (e) { console.error(e); }
    }, [birthDate, birthHour, birthMinute, birthAmPm]);

    const seedStr = `${birthDate}-${birthHour}-${birthMinute}-${birthAmPm}`;
    const maskColors = useMemo(() => recommendMaskColors(values, mode, seedStr), [values, mode, seedStr]);

    return (
        <div className="min-h-screen w-full bg-gradient-to-b from-slate-900 to-slate-800 p-6 md:p-10">
            <div className="max-w-3xl mx-auto">
                <header className="mb-4 flex items-center justify-between gap-4">
                    <h1 className="text-2xl font-bold text-white">오행 기반 퍼스널 마스크 색 추천</h1>
                    <div className="flex items-center gap-2">
                        <label className="text-white/70 text-xs">모드</label>
                        <select value={mode} onChange={e => setMode(e.target.value)} className="px-2 py-1 rounded bg-white/10 text-white/90 ring-1 ring-white/20 text-xs">
                            <option value="modern">현대 톤</option>
                            <option value="obang">전통 오방색</option>
                        </select>
                    </div>
                </header>

                {/* 입력 */}
                <div className="mb-4 p-4 rounded-2xl bg-white/5 ring-1 ring-white/10">
                    <div className="text-white font-semibold mb-2">생년월일시 입력</div>
                    <div className="grid gap-3 mb-2">
                        <div className="grid sm:grid-cols-2 gap-2">
                            <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="px-2 py-2 rounded bg-white/10 text-white ring-1 ring-white/20" />
                            <div className="flex gap-2 items-center">
                                <label className="text-white/70 text-xs">시간</label>
                                <select value={birthHour} onChange={e => setBirthHour(e.target.value)} className="px-2 py-2 rounded bg-white/10 text-white ring-1 ring-white/20">
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (<option key={h} value={h}>{h}</option>))}
                                </select>
                                <span className="text-white/70">:</span>
                                <select value={birthMinute} onChange={e => setBirthMinute(e.target.value)} className="px-2 py-2 rounded bg-white/10 text-white ring-1 ring-white/20">
                                    {Array.from({ length: 60 }, (_, i) => i).map(m => (<option key={m} value={m}>{m.toString().padStart(2, '0')}</option>))}
                                </select>
                                <select value={birthAmPm} onChange={e => setBirthAmPm(e.target.value)} className="px-2 py-2 rounded bg-white/10 text-white ring-1 ring-white/20">
                                    <option value="AM">AM</option>
                                    <option value="PM">PM</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <button type="button" onClick={reset} className="px-3 py-2 rounded bg-white/10 text-white text-sm ring-1 ring-white/20 hover:bg-white/20">초기화</button>
                        </div>
                    </div>
                    <div className="text-white/50 text-xs">
                        ✨ 절기 기반으로 월지가 계산됩니다<br />
                        ※ 월간(천간)·세부 절기 시간은 단순화 버전
                    </div>
                </div>

                {/* 현재 오행 값 표시 */}
                <div className="mb-4 p-4 rounded-2xl bg-white/5 ring-1 ring-white/10">
                    <div className="text-white font-semibold mb-3">현재 오행 값</div>
                    <div className="grid grid-cols-5 gap-2 text-center">
                        {Object.entries(ELEMENT_META).map(([key, meta]) => (
                            <div key={key} className="flex flex-col items-center">
                                <div className="text-white/80 text-xs mb-1">{meta.nameKo}</div>
                                <div className="text-white text-sm font-medium">{values[key].toFixed(1)}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 결과 */}
                <div className="p-4 rounded-2xl bg-white/5 ring-1 ring-white/10">
                    <div className="text-white font-semibold mb-3">추천 마스크 컬러</div>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 rounded-full ring-2 ring-white/20 mb-2" style={{ background: maskColors.main }}></div>
                            <div className="text-white text-sm">메인 ({ELEMENT_META[maskColors.mainEl].nameKo})</div>
                            <div className="text-white/50 text-xs mt-1">가장 강한 오행 강조</div>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 rounded-full ring-2 ring-white/20 mb-2" style={{ background: maskColors.point }}></div>
                            <div className="text-white text-sm">포인트 ({ELEMENT_META[maskColors.pointEl].nameKo})</div>
                            <div className="text-white/50 text-xs mt-1">부족한 오행 보완</div>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 rounded-full ring-2 ring-white/20 mb-2" style={{ background: maskColors.support }}></div>
                            <div className="text-white text-sm">보조 (Neutral)</div>
                            <div className="text-white/50 text-xs mt-1">개인별 랜덤 뉴트럴</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/5 ring-1 ring-white/10">
                            <div className="text-white font-semibold mb-3">마스크 프리뷰</div>
                            <MaskSilhouette
                                main={maskColors.main}
                                point={maskColors.point}
                                support={maskColors.support}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

