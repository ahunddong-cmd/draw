"use client";

import { useEffect, useState } from "react";

// 브라우저(localStorage)에 마지막으로 입력한 값을 저장해뒀다가
// 다음에 설정 화면을 열 때 기본값으로 불러온다.
export function usePersistedText(key: string) {
  const [value, setValue] = useState("");

  useEffect(() => {
    // localStorage는 서버에 없어 마운트 후에만 읽을 수 있으므로, 최초 1회 초기값을 채운다.
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(saved);
    }
  }, [key]);

  function updateValue(next: string) {
    setValue(next);
    localStorage.setItem(key, next);
  }

  return [value, updateValue] as const;
}
