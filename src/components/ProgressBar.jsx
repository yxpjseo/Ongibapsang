import React, { useMemo } from "react";
import styled from "styled-components";

function ProgressBar({ progress }) {
  const show = !!progress?.total;
  const pct = useMemo(() => {
    if (!show) return 0;
    const v = (progress.step / progress.total) * 100;
    return Math.min(100, Math.max(0, v));
  }, [show, progress?.step, progress?.total]);

  return (
    <Wrapper>
        <Progress
        $show={show}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        >
            <Fill style={{ width: `${pct}%` }} />
        </Progress>
    </Wrapper>
  );
};

export default ProgressBar;

/* ===== styles ===== */
const Wrapper = styled.header`
  position: sticky;
  top: 0;
  z-index: 1000;
  height: 0.4rem;
  display: flex;
  align-items: center;         /* 세로 중앙 */
  justify-content: center;     /* 가로 중앙 */
`;

/* 겹치는 프로그레스바: 헤더의 절대 좌표 상단 */
const Progress = styled.div`
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 0.4rem;
  background: #818181;  /* 트랙 */
  overflow: hidden;
  pointer-events: none;                 /* 클릭 방해 X */

  /* 나타났다/사라졌다 트랜지션 */
  opacity: ${p => (p.$show ? 1 : 0)};
  transform: translateY(${p => (p.$show ? "0" : "-6px")});
  transition: opacity 180ms ease, transform 180ms ease;
`;

/* 채워지는 영역 */
const Fill = styled.div`
  height: 100%;
  background: var(--main-color);
  transition: width 200ms ease;
`;