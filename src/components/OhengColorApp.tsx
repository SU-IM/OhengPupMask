"use client";

import MaskSilhouette from "./MaskSilhouette";
import React, { useMemo, useState, useEffect } from "react";

// ---------------------------
// 타입 정의
// ---------------------------
type ElementKey = "wood" | "fire" | "earth" | "metal" | "water";
type OhengValues = Record<ElementKey, number>;

// ---------------------------
// 오행 메타데이터
// ---------------------------
export const ELEMENT_META: Record<
  ElementKey,
  { key: ElementKey; nameKo: string; nameEn: string; palette: string[]; obang: string }
> = {
  wood: {
    key: "wood",
    nameKo: "목",
    nameEn: "Wood",
    palette: ["#1B5E20", "#2E7D32", "#4CAF50", "#81C784", "#A5D6A7", "#00BFA5", "#26A69A"],
    obang: "#1E3A8A",
  },
  fire: {
    key: "fire",
    nameKo: "화",
    nameEn: "Fire",
    palette: ["#B71C1C", "#C62828", "#E53935", "#F4511E", "#FF7043", "#FF8A65", "#FFAB91"],
    obang: "#B91C1C",
  },
  earth: {
    key: "earth",
    nameKo: "토",
    nameEn: "Earth",
    palette: ["#3E2723", "#5D4037", "#795548", "#8D6E63", "#A1887F", "#D7CCC8", "#FFF9C4"],
    obang: "#CA8A04",
  },
  metal: {
    key: "metal",
    nameKo: "금",
    nameEn: "Metal",
    palette: ["#FAFAFA", "#E0E0E0", "#BDBDBD", "#9E9E9E", "#757575", "#D4AF37", "#C0C0C0"],
    obang: "#E5E7EB",
  },
  water: {
    key: "water",
    nameKo: "수",
    nameEn: "Water",
    palette: ["#0D47A1", "#1565C0", "#1976D2", "#1E88E5", "#42A5F5", "#90CAF9", "#111827"],
    obang: "#111827",
  },
};

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

function hexToHsl(hex: string) {
  let r = 0,
    g = 0,
    b = 0;
  const h = hex.replace("#", "").toLowerCase();
  if (h.length === 3) {
    r = parseInt(h[0] + h[0], 16);
    g = parseInt(h[1] + h[1], 16);
    b = parseInt(h[2] + h[2], 16);
  } else if (h.length === 6) {
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  }
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let hDeg = 0,
    s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        hDeg = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        hDeg = (b - r) / d + 2;
        break;
      case b:
        hDeg = (r - g) / d + 4;
        break;
    }
    hDeg /= 6;
  }
  return { h: hDeg * 360, s: s * 100, l: l * 100 };
}

// ---------------------------
// 오행 분포 계산 (간이)
// ---------------------------
export function computeOheng(date: Date): OhengValues {
  // 간단한 분포: 연/월/일/시
  const counts: OhengValues = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  // 👉 실제 계산 로직은 필요시 확장
  counts.wood = (date.getFullYear() % 5) + 2;
  counts.fire = (date.getMonth() % 5) + 2;
  counts.earth = (date.getDate() % 5) + 2;
  counts.metal = (date.getHours() % 5) + 2;
  counts.water = 10 - (counts.wood + counts.fire + counts.earth + counts.metal) / 4;
  Object.keys(counts).forEach((k) => {
    const key = k as ElementKey;
    counts[key] = clamp(counts[key], 0, 10);
  });
  return counts;
}

// ---------------------------
// 색상 추천
// ---------------------------
export function recommendMaskColors(values: OhengValues, mode: "modern" | "obang" = "modern") {
  const entries = Object.entries(values) as [ElementKey, number][];
  const sortedAsc = [...entries].sort((a, b) => a[1] - b[1]);
  const sortedDesc = [...entries].sort((a, b) => b[1] - a[1]);

  let pointEl = sortedAsc[0][0];
  let mainEl = sortedDesc[0][0];
  if (mainEl === pointEl && sortedAsc.length > 1) {
    pointEl = sortedAsc[1][0];
  }

  const pickColor = (el: ElementKey) =>
    mode === "obang" ? ELEMENT_META[el].obang : ELEMENT_META[el].palette[0];
  const mainColor = pickColor(mainEl);
  const pointColor = pickColor(pointEl);

  const neutrals = ["#000000", "#111827", "#374151", "#6B7280", "#9CA3AF", "#E5E7EB", "#FFFFFF"];
  const mh = hexToHsl(mainColor);
  const ph = hexToHsl(pointColor);
  const midL = (mh.l + ph.l) / 2;
  let best = neutrals[0],
    bestScore = Infinity;
  for (const n of neutrals) {
    const nh = hexToHsl(n);
    const score = Math.abs(nh.l - midL) + 0.25 * nh.s;
    if (score < bestScore) {
      bestScore = score;
      best = n;
    }
  }

  return { main: mainColor, point: pointColor, support: best, mainEl, pointEl, supportEl: "neutral" };
}

// ---------------------------
// 메인 컴포넌트
// ---------------------------
export default function OhengColorApp() {
  const [values, setValues] = useState<OhengValues>({
    wood: 2,
    fire: 2,
    earth: 2,
    metal: 2,
    water: 2,
  });
  const [mode, setMode] = useState<"modern" | "obang">("modern");
  const [birthDate, setBirthDate] = useState("");
  const [birthHour, setBirthHour] = useState("12");
  const [birthMinute, setBirthMinute] = useState("0");
  const [birthAmPm, setBirthAmPm] = useState("AM");

  const reset = () => {
    setValues({ wood: 2, fire: 2, earth: 2, metal: 2, water: 2 });
    setBirthDate("");
    setBirthHour("12");
    setBirthMinute("0");
    setBirthAmPm("AM");
  };

  useEffect(() => {
    if (!birthDate) return;
    try {
      const parts = birthDate.split("-");
      if (parts.length !== 3) return;
      const yy = parseInt(parts[0], 10),
        mm = parseInt(parts[1], 10),
        dd = parseInt(parts[2], 10);
      if (!yy || !mm || !dd) return;
      const hourNum = normalizeHour(birthHour, birthAmPm);
      const minuteNum = parseInt(birthMinute, 10);
      const d = new Date(yy, mm - 1, dd, hourNum, Number.isNaN(minuteNum) ? 0 : minuteNum);
      if (Number.isNaN(d.getTime())) return;
      setValues(computeOheng(d));
    } catch (e) {
      console.error(e);
    }
  }, [birthDate, birthHour, birthMinute, birthAmPm]);

  const maskColors = useMemo(() => recommendMaskColors(values, mode), [values, mode]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-900 to-slate-800 p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        <header className="mb-4 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-white">오행 기반 퍼스널 마스크 색 추천</h1>
          <div className="flex items-center gap-2">
            <label className="text-white/70 text-xs">모드</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as "modern" | "obang")}
              className="px-2 py-1 rounded bg-white/10 text-white/90 ring-1 ring-white/20 text-xs"
            >
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
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="px-2 py-2 rounded bg-white/10 text-white ring-1 ring-white/20"
              />
              <div className="flex gap-2 items-center">
                <label className="text-white/70 text-xs">시간</label>
                <select
                  value={birthHour}
                  onChange={(e) => setBirthHour(e.target.value)}
                  className="px-2 py-2 rounded bg-white/10 text-white ring-1 ring-white/20"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <span className="text-white/70">:</span>
                <select
                  value={birthMinute}
                  onChange={(e) => setBirthMinute(e.target.value)}
                  className="px-2 py-2 rounded bg-white/10 text-white ring-1 ring-white/20"
                >
                  {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                    <option key={m} value={m}>
                      {m.toString().padStart(2, "0")}
                    </option>
                  ))}
                </select>
                <select
                  value={birthAmPm}
                  onChange={(e) => setBirthAmPm(e.target.value)}
                  className="px-2 py-2 rounded bg-white/10 text-white ring-1 ring-white/20"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={reset}
                className="px-3 py-2 rounded bg-white/10 text-white text-sm ring-1 ring-white/20 hover:bg-white/20"
              >
                초기화
              </button>
            </div>
          </div>
        </div>

        {/* 현재 오행 값 표시 */}
        <div className="mb-4 p-4 rounded-2xl bg-white/5 ring-1 ring-white/10">
          <div className="text-white font-semibold mb-3">현재 오행 값</div>
          <div className="grid grid-cols-5 gap-2 text-center">
            {Object.entries(ELEMENT_META).map(([key, meta]) => (
              <div key={key} className="flex flex-col items-center">
                <div className="text-white/80 text-xs mb-1">{meta.nameKo}</div>
                <div className="text-white text-sm font-medium">{values[key as ElementKey].toFixed(1)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 결과 */}
        <div className="p-4 rounded-2xl bg-white/5 ring-1 ring-white/10">
          <div className="text-white font-semibold mb-3">추천 마스크 컬러</div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full ring-2 ring-white/20 mb-2" style={{ background: maskColors.main }} />
              <div className="text-white text-sm">메인 ({ELEMENT_META[maskColors.mainEl as ElementKey].nameKo})</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full ring-2 ring-white/20 mb-2" style={{ background: maskColors.point }} />
              <div className="text-white text-sm">포인트 ({ELEMENT_META[maskColors.pointEl as ElementKey].nameKo})</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full ring-2 ring-white/20 mb-2" style={{ background: maskColors.support }} />
              <div className="text-white text-sm">보조 (Neutral)</div>
            </div>
          </div>

          {/* 마스크 프리뷰 */}
          <div className="mt-6 p-4 rounded-2xl bg-white/5 ring-1 ring-white/10">
            <div className="text-white font-semibold mb-3">마스크 프리뷰</div>
            <MaskSilhouette main={maskColors.main} point={maskColors.point} support={maskColors.support} />
          </div>
        </div>
      </div>
    </div>
  );
}


